import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { handleRoute, requireCustomer } from "@/lib/auth-helpers";
import { createRedemption } from "@/lib/loyalty";
import { parseBody, redeemSchema } from "@/lib/validation";

/**
 * POST /api/wallet/:businessId/redeem — auth CUSTOMER.
 * Body: { rewardId }. Creates a PENDING Redemption — no balance change yet.
 * Guards: reward active, program ACTIVE, balance ≥ cost, one PENDING per
 * customer+business, per-customer program limit.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ businessId: string }> }) {
  return handleRoute(async () => {
    const user = await requireCustomer();
    const { businessId } = await params;
    const body = await parseBody(redeemSchema, req);

    const redemption = await createRedemption({
      customerId: user.id,
      businessId,
      rewardId: body.rewardId,
    });
    return NextResponse.json({ redemption }, { status: 201 });
  });
}
