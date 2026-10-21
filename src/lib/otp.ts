import crypto from "node:crypto";
import { db } from "@/lib/db";
import { ApiErr } from "@/lib/auth-helpers";
import { rateLimit } from "@/lib/rate-limit";
import { sendOtpEmail, sendOtpSms } from "@/lib/delivery";

/**
 * OTP lifecycle. Security contract (docs/API.md + security spec):
 * - Codes stored as sha256(code + target + fixed salt) — NEVER plaintext.
 * - 10-minute expiry, max 5 verify attempts, 60s resend cooldown,
 *   5 requests / 15 min per target, 20 requests / hour per IP.
 * - Codes are never logged and never returned once a provider is configured.
 */

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_SALT = process.env.OTP_SALT ?? "reward-jar-otp-salt-v1";

function hashCode(code: string, target: string): string {
  return crypto.createHash("sha256").update(`${code}${target}${OTP_SALT}`).digest("hex");
}

function newCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

export type OtpChannel = "EMAIL" | "SMS";

export type RequestOtpResult =
  | { delivery: "sent"; devMode: false }
  | { delivery: "dev"; devMode: true; devCode: string };

export async function requestOtp(input: {
  channel: OtpChannel;
  target: string;
  ip: string;
}): Promise<RequestOtpResult> {
  const { channel, target, ip } = input;

  // 20 requests / hour per IP
  if (!rateLimit(`otp:req:ip:${ip}`, 20, 60 * 60 * 1000)) {
    throw new ApiErr(429, "Too many code requests from this device. Try again in an hour.");
  }
  // 5 requests / 15 min per target
  if (!rateLimit(`otp:req:target:${channel}:${target}`, 5, 15 * 60 * 1000)) {
    throw new ApiErr(429, "Too many code requests for this destination. Try again in 15 minutes.");
  }
  // 60s resend cooldown per target+channel (DB-backed so it survives rate-limit restarts)
  const last = await db.otpCode.findFirst({
    where: { target, channel },
    orderBy: { createdAt: "desc" },
  });
  if (last && Date.now() - last.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    const waitSec = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - last.createdAt.getTime())) / 1000);
    throw new ApiErr(429, `Please wait ${waitSec}s before requesting another code.`);
  }

  const code = newCode();
  await db.otpCode.create({
    data: {
      target,
      channel,
      codeHash: hashCode(code, target),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  });

  const result =
    channel === "EMAIL" ? await sendOtpEmail(target, code) : await sendOtpSms(target, code);

  return result;
}

export async function verifyOtp(input: {
  channel: OtpChannel;
  target: string;
  code: string;
}): Promise<void> {
  const { channel, target, code } = input;

  // 10 verifies / 15 min per target
  if (!rateLimit(`otp:verify:target:${channel}:${target}`, 10, 15 * 60 * 1000)) {
    throw new ApiErr(429, "Too many verification attempts. Try again in 15 minutes.");
  }

  const row = await db.otpCode.findFirst({
    where: { target, channel, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!row) throw new ApiErr(400, "No active code for this destination. Request a new one.");
  if (row.attempts >= MAX_ATTEMPTS) {
    throw new ApiErr(400, "Too many incorrect attempts. Request a new code.");
  }
  if (row.expiresAt.getTime() <= Date.now()) {
    throw new ApiErr(400, "This code has expired. Request a new one.");
  }
  if (row.codeHash !== hashCode(code, target)) {
    await db.otpCode.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
    throw new ApiErr(400, "Incorrect code. Please try again.");
  }

  // Atomic consume — a replayed verify can never succeed twice.
  const consumed = await db.otpCode.updateMany({
    where: { id: row.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  if (consumed.count !== 1) {
    throw new ApiErr(409, "This code was already used. Request a new one.");
  }
}
