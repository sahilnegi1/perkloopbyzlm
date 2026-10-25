import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ApiErr, handleRoute, requireCustomer } from "@/lib/auth-helpers";
import { expireStaleRedemptions, summarizeProgram } from "@/lib/loyalty";

export const dynamic = "force-dynamic";

/**
 * GET /api/wallet/:businessId — one loyalty account + ledger (desc, 100) +
 * available rewards with eligibility flags. 404 when the customer has not
 * joined this business yet (UI shows the "join" state).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ businessId: string }> }) {
  return handleRoute(async () => {
    const user = await requireCustomer();
    const { businessId } = await params;

    const business = await db.business.findUnique({ where: { id: businessId } });
    if (!business) throw new ApiErr(404, "Business not found.");

    const account = await db.loyaltyAccount.findUnique({
      where: { customerId_businessId: { customerId: user.id, businessId } },
      include: {
        ledger: { orderBy: { createdAt: "desc" }, take: 100 },
      },
    });
    if (!account) {
      throw new ApiErr(404, "You haven't joined this business's loyalty program yet.");
    }

    const programs = await db.loyaltyProgram.findMany({
      where: { businessId, status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
      include: { rewards: { where: { active: true }, orderBy: { cost: "asc" } } },
    });

    // Review round 2: lapse stale pendings so an abandoned request stops
    // blocking the reward buttons after 24h.
    await expireStaleRedemptions(db, { customerId: user.id, businessId });

    const pendingRedemption = await db.redemption.findFirst({
      where: { customerId: user.id, businessId, status: "PENDING" },
      include: { reward: { select: { id: true, title: true, cost: true, unit: true } } },
    });

    const rewards = programs.flatMap((p) =>
      p.rewards.map((r) => {
        const balance = r.unit === "POINTS" ? account.points : account.stamps;
        return {
          id: r.id,
          title: r.title,
          description: r.description,
          cost: r.cost,
          unit: r.unit,
          terms: r.terms,
          programId: p.id,
          programName: p.name,
          programType: p.type,
          eligible: balance >= r.cost && !pendingRedemption,
        };
      })
    );

    return NextResponse.json({
      business: {
        id: business.id,
        name: business.name,
        category: business.category,
        description: business.description,
        city: business.city,
        logoUrl: business.logoUrl,
        isDemo: business.isDemo,
        feedbackEnabled: business.feedbackEnabled,
      },
      account: {
        points: account.points,
        stamps: account.stamps,
        visitCount: account.visitCount,
        lastVisitAt: account.lastVisitAt,
        createdAt: account.createdAt,
      },
      ledger: account.ledger.map((l) => ({
        id: l.id,
        type: l.type,
        unit: l.unit,
        delta: l.delta,
        balanceAfter: l.balanceAfter,
        description: l.description,
        createdAt: l.createdAt,
      })),
      programs: programs.map(summarizeProgram),
      rewards,
      pendingRedemption: pendingRedemption
        ? {
            id: pendingRedemption.id,
            reward: pendingRedemption.reward,
            cost: pendingRedemption.cost,
            unit: pendingRedemption.unit,
            createdAt: pendingRedemption.createdAt,
          }
        : null,
    });
  });
}
