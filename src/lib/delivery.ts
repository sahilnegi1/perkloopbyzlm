import net from "node:net";
import tls from "node:tls";
import { ApiErr } from "@/lib/auth-helpers";

/**
 * OTP delivery adapters — HONEST by contract:
 * - Provider configured  → attempt real send; on failure THROW (never claim "sent").
 * - Provider NOT configured → return { delivery: "dev", devCode } so the UI can
 *   show the code inside a clearly-labeled DEV MODE banner. Never fake delivery.
 * Codes must NEVER be logged anywhere in this module.
 */

export type DeliveryResult =
  | { delivery: "sent"; devMode: false }
  | { delivery: "dev"; devMode: true; devCode: string };

// ─── Config detection ─────────────────────────────────────────────────────────

export function emailProviderConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY || process.env.SMTP_HOST);
}

export function smsProviderConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      (process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_MESSAGING_SERVICE_SID)
  );
}

// ─── Public entry points ──────────────────────────────────────────────────────

export async function sendOtpEmail(target: string, code: string): Promise<DeliveryResult> {
  if (process.env.RESEND_API_KEY) {
    await sendViaResend(target, otpMail(code));
    return { delivery: "sent", devMode: false };
  }
  if (process.env.SMTP_HOST) {
    await sendViaSmtpEnv(target, otpMail(code));
    return { delivery: "sent", devMode: false };
  }
  return { delivery: "dev", devMode: true, devCode: code };
}

export async function sendOtpSms(target: string, code: string): Promise<DeliveryResult> {
  if (smsProviderConfigured()) {
    await sendViaTwilio(target, code);
    return { delivery: "sent", devMode: false };
  }
  return { delivery: "dev", devMode: true, devCode: code };
}

// ─── Resend (HTTP API) ────────────────────────────────────────────────────────

// ─── Outgoing mail primitives (shared by OTP + welcome) ───────────────────

type Mail = { subject: string; text: string };

const EMAIL_SUBJECT = "Your Reward Jar verification code";

function emailBody(code: string): string {
  return [
    `Your Reward Jar verification code is: ${code}`,
    "",
    "It expires in 10 minutes. If you did not request it, you can ignore this email.",
    "",
    "— Reward Jar",
  ].join("\n");
}

function otpMail(code: string): Mail {
  return { subject: EMAIL_SUBJECT, text: emailBody(code) };
}

async function sendViaResend(target: string, mail: Mail): Promise<void> {
  const from = process.env.SMTP_FROM ?? "Reward Jar <onboarding@resend.dev>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [target],
        subject: mail.subject,
        text: mail.text,
      }),
    });
    if (!res.ok) {
      // Provider rejected — surface an honest failure, never the code.
      throw new ApiErr(502, "Email delivery failed on our side. Please try again in a moment.");
    }
  } catch (err) {
    if (err instanceof ApiErr) throw err;
    throw new ApiErr(502, "Email delivery failed on our side. Please try again in a moment.");
  }
}

// ─── Minimal SMTP client (no external deps) ───────────────────────────────────

type SmtpConn = { socket: net.Socket; buf: string };

function readSmtpReply(conn: SmtpConn): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = conn.socket;
    const cleanup = () => {
      socket.removeListener("data", onData);
      socket.removeListener("error", onError);
      socket.removeListener("close", onClose);
    };
    const fail = (err: Error) => {
      cleanup();
      reject(err);
    };
    const onError = (err: Error) => fail(err);
    const onClose = () => fail(new Error("SMTP connection closed unexpectedly."));
    const onData = (chunk: Buffer | string) => {
      conn.buf += chunk.toString("utf8");
      const lines = conn.buf.split("\r\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Final line of an SMTP reply: "NNN<space>text" (intermediate lines use '-').
        if (line.length >= 4 && /^\d{3} /.test(line)) {
          conn.buf = lines.slice(i + 1).join("\r\n");
          cleanup();
          resolve(lines.slice(0, i + 1).join("\n"));
          return;
        }
      }
    };
    socket.on("data", onData);
    socket.on("error", onError);
    socket.on("close", onClose);
  });
}

async function smtpCommand(conn: SmtpConn, expected: number, command?: string): Promise<string> {
  if (command !== undefined) {
    await new Promise<void>((resolve, reject) => {
      conn.socket.write(`${command}\r\n`, (err) => (err ? reject(err) : resolve()));
    });
  }
  const reply = await readSmtpReply(conn);
  const code = parseInt(reply.slice(0, 3), 10);
  if (code !== expected) {
    throw new Error(`SMTP ${code}: ${reply.slice(4).trim() || reply.trim()}`);
  }
  return reply;
}

async function waitForConnected(socket: net.Socket, secure: boolean): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const onOk = () => {
      socket.removeListener("error", onErr);
      resolve();
    };
    const onErr = (err: Error) => {
      socket.removeListener(secure ? "secureConnect" : "connect", onOk);
      reject(err);
    };
    socket.once(secure ? "secureConnect" : "connect", onOk);
    socket.once("error", onErr);
  });
}

async function sendViaSmtpEnv(target: string, mail: Mail): Promise<void> {
  const host = process.env.SMTP_HOST as string;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const secure = port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM ?? user ?? "hello@rewardjar.indevs.in";

  const socket: net.Socket = secure
    ? tls.connect({ host, port, servername: host })
    : net.connect({ host, port });
  socket.setTimeout(15000);
  const conn: SmtpConn = { socket, buf: "" };

  try {
    await waitForConnected(socket, secure);
    await smtpCommand(conn, 220); // greeting
    const ehlo = await smtpCommand(conn, 250, "EHLO rewardjar.local");

    if (!secure && /[- ]STARTTLS/i.test(ehlo)) {
      await smtpCommand(conn, 220, "STARTTLS");
      const upgraded = tls.connect({ socket, servername: host });
      conn.socket = upgraded;
      conn.buf = "";
      upgraded.setTimeout(15000);
      await waitForConnected(upgraded, true);
      await smtpCommand(conn, 250, "EHLO rewardjar.local");
    }

    if (user && pass) {
      const b64 = Buffer.from(`\u0000${user}\u0000${pass}`).toString("base64");
      await smtpCommand(conn, 235, `AUTH PLAIN ${b64}`);
    }

    await smtpCommand(conn, 250, `MAIL FROM:<${from}>`);
    await smtpCommand(conn, 250, `RCPT TO:<${target}>`);
    await smtpCommand(conn, 354, "DATA");

    const message = [
      `From: Reward Jar <${from}>`,
      `To: <${target}>`,
      `Subject: ${mail.subject}`,
      "MIME-Version: 1.0",
      'Content-Type: text/plain; charset="utf-8"',
      "",
      mail.text,
    ].join("\r\n");
    // Dot-stuffing per RFC 5321 so lines starting with '.' don't end the data early.
    const stuffed = message.replace(/\r\n\./g, "\r\n..");
    await smtpCommand(conn, 250, `${stuffed}\r\n.`);
    await smtpCommand(conn, 221, "QUIT").catch(() => undefined);
  } catch (err) {
    if (err instanceof ApiErr) throw err;
    throw new ApiErr(502, "Email delivery failed on our side. Please try again in a moment.");
  } finally {
    conn.socket.destroy();
  }
}

// ─── Welcome email (post-signup, customer + merchant) ────────────────────────

export type WelcomeInput = { to: string; role: "CUSTOMER" | "MERCHANT_OWNER" | "STAFF" };

function welcomeMail(role: WelcomeInput["role"], handle: string): Mail {
  if (role === "MERCHANT_OWNER") {
    return {
      subject: "Welcome to Reward Jar — your loyalty program awaits",
      text: [
        `Hi ${handle},`,
        "",
        "Your Reward Jar business account is ready.",
        "",
        "From your dashboard you can:",
        "- Launch a punch-card or points program in minutes",
        "- Print the static check-in QR for your counter",
        "- Generate amount QRs and approve reward redemptions",
        "- Track visits, repeat rate and points issued in real time",
        "",
        "Sign in, set up your program, and your customers start earning on their very next visit.",
        "",
        "— Team Reward Jar",
        "Noida & Greater Noida",
      ].join("\n"),
    };
  }
  return {
    subject: "Welcome to Reward Jar — your wallet is ready",
    text: [
      `Hi ${handle},`,
      "",
      "Welcome to Reward Jar — India-first loyalty for local shops.",
      "",
      "Your wallet is ready:",
      "- Collect stamps and points at the cafés, salons and bakeries you already love",
      "- Every business keeps its own separate balance — nothing ever mixes",
      "- Rewards are confirmed by the shop, so every visit counts for real",
      "",
      "Open Reward Jar, scan the counter QR on your next visit, and your first stamp is minutes away.",
      "",
      "— Team Reward Jar",
      "Noida & Greater Noida",
    ].join("\n"),
  };
}

/**
 * Best-effort welcome mail: silent no-op until an email provider is configured,
 * and NEVER throws — account creation must not fail or slow down because of it.
 */
export async function sendWelcomeEmail(input: WelcomeInput): Promise<void> {
  if (!emailProviderConfigured()) return;
  if (!input.to.includes("@")) return; // phone-channel accounts get no welcome mail
  const handle = input.to.split("@")[0] || "there";
  const mail = welcomeMail(input.role, handle);
  try {
    if (process.env.RESEND_API_KEY) {
      await sendViaResend(input.to, mail);
    } else {
      await sendViaSmtpEnv(input.to, mail);
    }
  } catch {
    // Intentionally swallowed — welcome mail is a nice-to-have, not a contract.
  }
}

// ─── Twilio SMS (REST API) ────────────────────────────────────────────────────

async function sendViaTwilio(target: string, code: string): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID as string;
  const authToken = process.env.TWILIO_AUTH_TOKEN as string;
  const from = process.env.TWILIO_FROM_NUMBER;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  const to = target.startsWith("+") ? target : `+91${target}`;

  const body = new URLSearchParams({
    To: to,
    Body: `Your Reward Jar code is ${code}. It expires in 10 minutes. Never share this code.`,
  });
  if (from) body.set("From", from);
  if (messagingServiceSid) body.set("MessagingServiceSid", messagingServiceSid);

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });
    if (!res.ok) {
      throw new ApiErr(502, "SMS delivery failed on our side. Please try again in a moment.");
    }
  } catch (err) {
    if (err instanceof ApiErr) throw err;
    throw new ApiErr(502, "SMS delivery failed on our side. Please try again in a moment.");
  }
}
