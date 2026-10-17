/**
 * In-memory sliding-window rate limiter (single-node sandbox; no Redis per project rules).
 * Keyed by arbitrary strings, e.g. `otp:req:ip:1.2.3.4`.
 */

type Bucket = { hits: number[]; };

const buckets = new Map<string, Bucket>();

/** Returns true when allowed; false when the caller exceeded `limit` events in `windowMs`. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { hits: [] };
    buckets.set(key, bucket);
  }
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);
  if (bucket.hits.length >= limit) return false;
  bucket.hits.push(now);
  // Opportunistic cleanup to keep memory bounded.
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (v.hits.every((t) => now - t >= windowMs)) buckets.delete(k);
    }
  }
  return true;
}

export function rateLimitOrThrow(key: string, limit: number, windowMs: number): void {
  if (!rateLimit(key, limit, windowMs)) {
    const err = new Error("Too many requests. Please try again in a bit.") as Error & { status?: number };
    err.status = 429;
    throw err;
  }
}

/** Helper for API routes: converts thrown errors into a JSON response payload. */
export function errorResponse(err: unknown): { error: string; status: number } {
  const e = err as Error & { status?: number; code?: string };
  return {
    error: e?.message ?? "Something went wrong.",
    status: e?.status ?? 500,
  };
}
