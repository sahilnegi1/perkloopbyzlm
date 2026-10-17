import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ApiErr, handleRoute, requireMembership } from "@/lib/auth-helpers";
import { decideRedemption } from "@/lib/loyalty";
import { decideSchema, parseBody } from "@/lib/validation";

/**
 * POST /api/merchant/redemptions/:id/decide — body { decision: "APPROVED"|"REJECTED" }.
 * Membership is enforced against the redemption's own business. APPROVED is
 * atomic: balance re-checked + conditional decrement (never negative); a second
 * decide hits the PENDING guard → 409.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const { id } = await params;
    const body = await parseBody(decideSchema, req);

    const redemption = await db.redemption.findUnique({ where: { id } });
    if (!redemption) throw new ApiErr(404, "Redemption not found.");

    const membership = await requireMembership(redemption.businessId);

    const updated = await decideRedemption({
      redemptionId: redemption.id,
      businessId: redemption.businessId,
      userId: membership.userId,
      memberRole: membership.role,
      decision: body.decision,
    });

    return NextResponse.json({ redemption: updated });
  });
}
