import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ApiErr, audit, handleRoute, requireCustomer } from "@/lib/auth-helpers";
import { rateLimit } from "@/lib/rate-limit";
import { feedbackSchema, parseBody } from "@/lib/validation";

/**
 * POST /api/feedback — auth CUSTOMER. Body: { businessId, rating 1..5, comment?, tags? }.
 * Guards: business ACTIVE + feedbackEnabled · customer has a visit or loyalty
 * account · one per business per 24h · rate-limited 5/hour per user.
 */
export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const user = await requireCustomer();
    const body = await parseBody(feedbackSchema, req);

    if (!rateLimit(`feedback:${user.id}`, 5, 60 * 60 * 1000)) {
      throw new ApiErr(429, "Too much feedback in one hour. Please try again later.");
    }

    const business = await db.business.findFirst({
      where: { id: body.businessId, status: "ACTIVE" },
    });
    if (!business) throw new ApiErr(404, "Business not found.");
    if (!business.feedbackEnabled) {
      throw new ApiErr(403, "This business is not accepting feedback right now.");
    }

    const [hasAccount, hasVisit] = await Promise.all([
      db.loyaltyAccount.findFirst({
        where: { customerId: user.id, businessId: business.id },
        select: { id: true },
      }),
      db.visit.findFirst({
        where: { customerId: user.id, businessId: business.id },
        select: { id: true },
      }),
    ]);
    if (!hasAccount && !hasVisit) {
      throw new ApiErr(403, "Visit this business or join their program before leaving feedback.");
    }

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = await db.feedback.findFirst({
      where: { customerId: user.id, businessId: business.id, createdAt: { gte: dayAgo } },
      select: { id: true },
    });
    if (recent) {
      throw new ApiErr(409, "You already shared feedback for this business in the last 24 hours.");
    }

    const feedback = await db.feedback.create({
      data: {
        businessId: business.id,
        customerId: user.id,
        rating: body.rating,
        comment: body.comment ?? null,
        tags: body.tags && body.tags.length > 0 ? body.tags.join(",") : null,
      },
    });

    await audit(db, {
      actorType: "CUSTOMER",
      actorId: user.id,
      businessId: business.id,
      action: "FEEDBACK_SUBMITTED",
      entity: "Feedback",
      entityId: feedback.id,
      meta: { rating: feedback.rating },
    });

    return NextResponse.json({ feedback }, { status: 201 });
  });
}
