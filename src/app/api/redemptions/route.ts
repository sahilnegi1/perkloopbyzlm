import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handleRoute, requireCustomer } from "@/lib/auth-helpers";
import { expireStaleRedemptions } from "@/lib/loyalty";

export const dynamic = "force-dynamic";

/** GET /api/redemptions — the customer's redemption history (newest first). */
export async function GET() {
  return handleRoute(async () => {
    const user = await requireCustomer();

    // Review round 2: lapse stale pendings so history reflects reality.
    await expireStaleRedemptions(db, { customerId: user.id });

    const redemptions = await db.redemption.findMany({
      where: { customerId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        reward: { select: { id: true, title: true } },
        business: { select: { id: true, name: true, logoUrl: true, isDemo: true } },
      },
    });

    return NextResponse.json({ redemptions });
  });
}
