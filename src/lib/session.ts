import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "pl_session";
const SESSION_DAYS = 30;

function secret(): Uint8Array {
  const raw =
    process.env.SESSION_SECRET ??
    // Dev fallback so the app runs without extra env setup in the sandbox.
    // Production deployments must set SESSION_SECRET (documented in delivery notes).
    "perk-loop-dev-secret-do-not-use-in-production-0123456789";
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
    .setIssuer("perk-loop")
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
    const { payload } = await jwtVerify(token, secret(), { issuer: "perk-loop" });
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
