import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";

/**
 * Production secret bootstrap (audit F01 follow-up).
 *
 * Contract: a deployed environment must NEVER fall back to a value that is
 * derivable from the source code. When an essential secret (session signing
 * key, OTP salt) is absent from the environment, we generate a
 * cryptographically random one and persist it in the database, so it is both
 * unpredictable and stable across serverless cold starts and instances.
 *
 * Preference order for every secret:
 *   1. A real value from the deployment environment (documented in .env.example).
 *   2. A randomly generated value persisted in SystemConfig (bootstrap).
 *   3. If even the database is unreachable → the caller fails closed (503).
 *
 * Callers MUST treat an exception from this function as "auth unavailable",
 * never as "use the dev fallback".
 */

const GENERATED_LENGTH = 48; // bytes → 96 hex chars

/** Read-or-create a persistent random secret under `key`. */
export async function getOrCreateSystemSecret(key: string): Promise<string> {
  const existing = await db.systemConfig.findUnique({ where: { key } });
  if (existing?.value && existing.value.length >= 32) return existing.value;

  const generated = randomBytes(GENERATED_LENGTH).toString("hex");
  // update: {} → if another cold start created the row first, we keep the
  // winner's value; the re-read below guarantees every instance converges on
  // exactly one secret (two instances signing with different keys would
  // invalidate each other's sessions).
  await db.systemConfig.upsert({
    where: { key },
    create: { key, value: generated },
    update: {},
  });
  const persisted = await db.systemConfig.findUniqueOrThrow({ where: { key } });
  if (!persisted.value || persisted.value.length < 32) {
    throw new Error(`System secret "${key}" could not be bootstrapped.`);
  }
  return persisted.value;
}
