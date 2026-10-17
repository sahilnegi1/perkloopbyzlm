import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handleRoute, requireCustomer } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

/** GET /api/redemptions — the customer's redemption history (newest first). */
export async function GET() {
  return handleRoute(async () => {
    const user = await requireCustomer();

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
