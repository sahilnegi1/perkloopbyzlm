import net from "node:net";
import tls from "node:tls";

const HOST = "smtp-relay.brevo.com";
const PORT = 587;
const USER = process.env.SMTP_USER ?? "bf5863001@smtp-brevo.com";
const PASS = process.env.SMTP_PASS ?? "";
const FROM = "bhajaannn@gmail.com";

type Conn = { sock: net.Socket; buf: string };

function readReply(c: Conn): Promise<string> {
  return new Promise((res, rej) => {
    const sock = c.sock;
    const onData = (d: Buffer | string) => {
      c.buf += d.toString();
      const lines = c.buf.split("\r\n");
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].length >= 4 && /^\d{3} /.test(lines[i])) {
          c.buf = lines.slice(i + 1).join("\r\n");
          sock.off("data", onData);
          sock.off("error", onErr);
          res(lines[i]);
          return;
        }
      }
    };
    const onErr = (e: Error) => rej(e);
    sock.on("data", onData);
    sock.on("error", onErr);
  });
}

async function cmd(c: Conn, expect: number, send?: string, hide = false): Promise<string> {
  if (send) {
    console.log(`C: ${hide ? send.slice(0, 4) + " ****" : send}`);
    await new Promise<void>((res, rej) =>
      c.sock.write(send + "\r\n", (e) => (e ? rej(e) : res()))
    );
  }
  const reply = await readReply(c);
  console.log(`S: ${reply}`);
  const code = parseInt(reply.slice(0, 3), 10);
  if (code !== expect) {
    console.log(`>>> STOP: got ${code}, wanted ${expect} — Brevo said: ${reply.slice(4)}`);
    process.exit(0);
  }
  return reply;
}

async function main() {
  let sock: net.Socket = net.connect({ host: HOST, port: PORT });
  sock.setTimeout(20000);
  const c: Conn = { sock, buf: "" };
  await new Promise<void>((res, rej) => {
    sock.once("connect", res);
    sock.once("error", rej);
  });
  await cmd(c, 220);
  await cmd(c, 250, "EHLO diag.local");
  await cmd(c, 220, "STARTTLS");
  // upgrade
  const plain = c.sock;
  const secure = tls.connect({ socket: plain, servername: HOST });
  c.sock = secure;
  c.buf = "";
  await new Promise<void>((res, rej) => {
    secure.once("secureConnect", res);
    secure.once("error", rej);
  });
  console.log("-- TLS OK --");
  await cmd(c, 250, "EHLO diag.local");
  await cmd(c, 235, `AUTH PLAIN ${Buffer.from(`\0${USER}\0${PASS}`).toString("base64")}`, true);
  await cmd(c, 250, `MAIL FROM:<${FROM}>`);
  await cmd(c, 250, `RCPT TO:<${FROM}>`);
  console.log(">>> ALL GOOD: auth + sender + recipient accepted by Brevo");
  await cmd(c, 221, "QUIT").catch(() => undefined);
  process.exit(0);
}

main().catch((e) => {
  console.log("ERR:", (e as Error).message);
  process.exit(1);
});
