import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handleRoute, requireCustomer } from "@/lib/auth-helpers";
import { summarizeProgram } from "@/lib/loyalty";

export const dynamic = "force-dynamic";

/**
 * GET /api/wallet — all of the customer's loyalty accounts with business info,
 * balances and the currently available (active) rewards per business.
 */
export async function GET() {
  return handleRoute(async () => {
    const user = await requireCustomer();

    const accounts = await db.loyaltyAccount.findMany({
      where: { customerId: user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        business: {
          include: {
            outlets: { where: { isPrimary: true }, take: 1 },
            programs: {
              where: { status: "ACTIVE" },
              include: { rewards: { where: { active: true }, orderBy: { cost: "asc" } } },
            },
          },
        },
      },
    });

    return NextResponse.json({
      accounts: accounts.map((a) => ({
        business: {
          id: a.business.id,
          name: a.business.name,
          category: a.business.category,
          description: a.business.description,
          city: a.business.city,
          logoUrl: a.business.logoUrl,
          isDemo: a.business.isDemo,
        },
        points: a.points,
        stamps: a.stamps,
        visitCount: a.visitCount,
        lastVisitAt: a.lastVisitAt,
        activeRewards: a.business.programs.flatMap((p) =>
          p.rewards.map((r) => ({
            id: r.id,
            title: r.title,
            cost: r.cost,
            unit: r.unit,
            programId: p.id,
            programName: p.name,
            programType: p.type,
          }))
        ),
        programs: a.business.programs.map(summarizeProgram),
      })),
    });
  });
}
