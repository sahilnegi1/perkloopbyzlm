import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "pl_session";
const SESSION_DAYS = 30;

function secret(): Uint8Array {
  const raw =
    process.env.SESSION_SECRET ??
    // Dev fallback so the app runs without extra env setup in the sandbox.
    // Production deployments must set SESSION_SECRET (documented in delivery notes).
    "reward-jar-dev-secret-do-not-use-in-production-0123456789";
  if (!process.env.SESSION_SECRET && (process.env.NODE_ENV === "production" || process.env.VERCEL === "1")) {
    // Audit F01: loudly flag the predictable signing secret. Kept as a warning
    // (not a crash) so a misconfigured deploy can't lock every user out — but
    // this must be fixed by setting SESSION_SECRET in the host's env vars.
    console.warn(
      "[security] SESSION_SECRET is not set — falling back to a predictable dev secret. " +
        "Set SESSION_SECRET in the deployment environment before onboarding real users."
    );
  }
  return new TextEncoder().encode(raw);
}

export type SessionPayload = {
  userId: string;
  role: "CUSTOMER" | "MERCHANT_OWNER" | "STAFF";
};

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("reward-jar")
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());

  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { issuer: "reward-jar" });
    if (
      typeof payload.userId !== "string" ||
      (payload.role !== "CUSTOMER" &&
        payload.role !== "MERCHANT_OWNER" &&
        payload.role !== "STAFF")
    ) {
      return null;
    }
    return { userId: payload.userId, role: payload.role };
  } catch {
    return null;
  }
}
