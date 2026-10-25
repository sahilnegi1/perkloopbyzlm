import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleRoute, maskPhone, requireMerchant } from "@/lib/auth-helpers";
import { merchantRedemptionsQuerySchema, parseQuery } from "@/lib/validation";
import { expireStaleRedemptions } from "@/lib/loyalty";

export const dynamic = "force-dynamic";

/** GET /api/merchant/redemptions?status= — queue for the caller's business(es). */
export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    const { user } = await requireMerchant();
    const query = parseQuery(merchantRedemptionsQuerySchema, req);

    const memberships = await db.businessMember.findMany({ where: { userId: user.id } });
    const businessIds = memberships.map((m) => m.businessId);

    // Review round 2: lapse stale pendings so the queue shows the truth.
    await expireStaleRedemptions(db, { businessIdIn: businessIds });

    const redemptions = await db.redemption.findMany({
      where: {
        businessId: { in: businessIds },
        ...(query.status ? { status: query.status } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        reward: { select: { id: true, title: true, cost: true, unit: true } },
        business: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true, phone: true } },
      },
    });

    return NextResponse.json({
      redemptions: redemptions.map((r) => ({
        id: r.id,
        status: r.status,
        cost: r.cost,
        unit: r.unit,
        createdAt: r.createdAt,
        decidedAt: r.decidedAt,
        reward: r.reward,
        business: r.business,
        customer: { id: r.customer.id, name: r.customer.name, phone: maskPhone(r.customer.phone) },
      })),
    });
  });
}
