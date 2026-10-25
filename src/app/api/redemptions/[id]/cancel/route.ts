import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { audit, handleRoute, requireCustomer } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

/**
 * POST /api/redemptions/[id]/cancel — customer withdraws their own PENDING
 * redemption (audit F12: a pending request used to trap the customer until the
 * merchant decided). Balance is untouched (nothing is deducted at request
 * time); the merchant keeps an audit trail of the withdrawal.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleRoute(async () => {
    const { id } = await params;
    const user = await requireCustomer();

    // Conditional update: only the owner can cancel, and only while PENDING.
    const res = await db.redemption.updateMany({
      where: { id, customerId: user.id, status: "PENDING" },
      data: { status: "REJECTED", decidedAt: new Date(), decidedById: user.id },
    });
    if (res.count !== 1) {
      const existing = await db.redemption.findUnique({ where: { id } });
      if (!existing || existing.customerId !== user.id) {
        return NextResponse.json({ error: "Redemption not found." }, { status: 404 });
      }
      return NextResponse.json(
        { error: "This request was already decided — it can't be withdrawn." },
        { status: 409 }
      );
    }

    const redemption = await db.redemption.findUniqueOrThrow({
      where: { id },
      include: { reward: true },
    });

    await audit(db, {
      actorType: "CUSTOMER",
      actorId: user.id,
      businessId: redemption.businessId,
      action: "REDEMPTION_CANCELED",
      entity: "Redemption",
      entityId: redemption.id,
      meta: { rewardTitle: redemption.reward.title, cost: redemption.cost, unit: redemption.unit },
    });

    // Let the shop know the request was withdrawn (keeps their queue honest).
    const members = await db.businessMember.findMany({
      where: { businessId: redemption.businessId, role: { in: ["OWNER", "MANAGER"] } },
    });
    if (members.length > 0) {
      await db.notification.createMany({
        data: members.map((m) => ({
          userId: m.userId,
          businessId: redemption.businessId,
          type: "REDEMPTION_UPDATE",
          title: "Redemption withdrawn",
          body: `The customer withdrew their request for "${redemption.reward.title}".`,
        })),
      });
    }

    return NextResponse.json({ ok: true, status: redemption.status });
  });
}
