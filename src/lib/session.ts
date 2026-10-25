import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { ApiErr } from "@/lib/api-error";
import { getOrCreateSystemSecret } from "@/lib/system-secret";
import { isProduction } from "@/lib/env";

const COOKIE_NAME = "pl_session";
const SESSION_DAYS = 30;

/**
 * Audit F01 (follow-up, review round 2): the session signing secret must never
 * be predictable. The old code logged a warning and then STILL signed sessions
 * with a source-embedded fallback in production — a warning does not close a
 * P0. The contract is now:
 *
 *  1. SESSION_SECRET set (≠ dev placeholder, ≥32 chars) → used everywhere.
 *  2. Sandbox/dev (not production) → dev fallback allowed so the app runs
 *     without extra env setup. UNREACHABLE on any deployed host.
 *  3. Production without a usable env secret → a cryptographically random
 *     secret is generated once and persisted in SystemConfig (stable across
 *     cold starts). Nothing about it is derivable from the source.
 *  4. Production and even the DB is unavailable → auth fails CLOSED with 503.
 *     Authentication refuses to operate rather than degrade to a guessable key.
 */

const DEV_FALLBACK = "reward-jar-dev-secret-do-not-use-in-production-0123456789";
const MIN_SECRET_LENGTH = 32;

let cachedKey: Uint8Array | null = null;

async function sessionKey(): Promise<Uint8Array> {
  if (cachedKey) return cachedKey;

  const envSecret = process.env.SESSION_SECRET?.trim();
  const usableEnvSecret =
    envSecret && envSecret !== DEV_FALLBACK && envSecret.length >= MIN_SECRET_LENGTH;

  if (usableEnvSecret) {
    cachedKey = new TextEncoder().encode(envSecret);
    return cachedKey;
  }

  if (!isProduction()) {
    // Dev/sandbox convenience ONLY — guarded by isProduction() above.
    cachedKey = new TextEncoder().encode(envSecret ?? DEV_FALLBACK);
    return cachedKey;
  }

  if (envSecret === DEV_FALLBACK) {
    console.error(
      "[security] SESSION_SECRET is set to the public dev placeholder in production — " +
        "ignoring it and bootstrapping a random secret instead."
    );
  } else {
    console.error(
      "[security] SESSION_SECRET is not configured in production — bootstrapping a " +
        "random signing secret and persisting it in the database. Set SESSION_SECRET " +
        "in the deployment environment to take precedence."
    );
  }

  try {
    const bootstrapped = await getOrCreateSystemSecret("session_secret");
    cachedKey = new TextEncoder().encode(bootstrapped);
    return cachedKey;
  } catch (err) {
    // Fail closed: without a real secret we refuse to sign or verify sessions.
    console.error("[security] Session signing key is unavailable — auth is disabled.", err);
    throw new ApiErr(
      503,
      "Service is temporarily unavailable. Please try again in a moment."
    );
  }
}

export type SessionPayload = {
  userId: string;
  role: "CUSTOMER" | "MERCHANT_OWNER" | "STAFF";
};

export async function createSession(payload: SessionPayload): Promise<void> {
  const key = await sessionKey(); // may throw 503 → login refuses to operate
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("reward-jar")
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(key);

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

  // Resolve the key OUTSIDE the try/catch: a misconfigured deployment must
  // surface as 503 (fail closed), not silently as "not signed in".
  const key = await sessionKey();

  try {
    const { payload } = await jwtVerify(token, key, { issuer: "reward-jar" });
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
