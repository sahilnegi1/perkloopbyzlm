/**
 * Environment detection — leaf module (no project imports) so that session,
 * delivery and auth-helpers can share it without import cycles.
 */

/** Production = deployed environment (Vercel or NODE_ENV=production). */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
}
