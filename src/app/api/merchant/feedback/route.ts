import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handleRoute, maskPhone, requireMerchant } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

/** GET /api/merchant/feedback — feedback for the caller's business(es), newest first. */
export async function GET() {
  return handleRoute(async () => {
    const { user } = await requireMerchant();

    const memberships = await db.businessMember.findMany({ where: { userId: user.id } });
    const businessIds = memberships.map((m) => m.businessId);

    const feedback = await db.feedback.findMany({
      where: { businessId: { in: businessIds } },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        business: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true, phone: true } },
      },
    });

    return NextResponse.json({
      feedback: feedback.map((f) => ({
        id: f.id,
        rating: f.rating,
        comment: f.comment,
        tags: f.tags ? f.tags.split(",").filter(Boolean) : [],
        createdAt: f.createdAt,
        business: f.business,
        customer: { id: f.customer.id, name: f.customer.name, phone: maskPhone(f.customer.phone) },
      })),
      average:
        feedback.length > 0
          ? Number((feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length).toFixed(2))
          : null,
    });
  });
}
