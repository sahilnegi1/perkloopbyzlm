import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ApiErr, handleRoute, requireCustomer } from "@/lib/auth-helpers";
import { rateLimit } from "@/lib/rate-limit";
import { confirmTxnAndAward } from "@/lib/loyalty";

/**
 * POST /api/qr/txn/:token/confirm — auth CUSTOMER. Rate limit: 10/min per user.
 * Atomic: PENDING+not-expired conditional consume (count must be 1) BEFORE any
 * points move; points come only from the business's ACTIVE POINTS program.
 * Replay → 409 · Expired → 410 · Unknown → 404.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  return handleRoute(async () => {
    const user = await requireCustomer();
    const { token } = await params;

    if (!rateLimit(`qr:confirm:${user.id}`, 10, 60 * 1000)) {
      throw new ApiErr(429, "Too many confirmations. Wait a minute and try again.");
    }

    const result = await confirmTxnAndAward({ token, customerId: user.id });
    return NextResponse.json(result);
  });
}
