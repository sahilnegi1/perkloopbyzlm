import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ApiErr, handleRoute, maskPhone, requireMembership, requireMerchant } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Repeat customers: customers with ≥2 visits (real SQL aggregate). */
async function countRepeatCustomers(businessId: string): Promise<number> {
  const rows = await db.$queryRaw<{ customerId: string }[]>`
    SELECT "customerId" FROM "Visit"
    WHERE "businessId" = ${businessId}
    GROUP BY "customerId"
    HAVING COUNT(*) >= 2
  `;
  return rows.length;
}

/**
 * GET /api/merchant/analytics — REAL aggregates only, zeros when empty.
 * Everything is computed from visits, txns, ledger and redemption rows for the
 * caller's own business. Never fabricates numbers.
 */
export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    const businessId = new URL(req.url).searchParams.get("businessId");
    let targetBusinessId: string;

    if (businessId) {
      const membership = await requireMembership(businessId);
      targetBusinessId = membership.businessId;
    } else {
      const { memberships } = await requireMerchant();
      targetBusinessId = memberships[0].businessId;
    }

    const now = Date.now();
    const d7 = new Date(now - 7 * DAY_MS);
    const d30 = new Date(now - 30 * DAY_MS);

    const [
      totalCustomers,
      visits7,
      visits30,
      activeVisitors30,
      activeTxnCustomers30,
      pointsIssued30,
      redemptions30,
      approvedRedemptions30,
      repeatCustomers,
      recentTxns,
    ] = await Promise.all([
      db.loyaltyAccount.count({ where: { businessId: targetBusinessId } }),
      db.visit.count({ where: { businessId: targetBusinessId, createdAt: { gte: d7 } } }),
      db.visit.count({ where: { businessId: targetBusinessId, createdAt: { gte: d30 } } }),
      db.visit.findMany({
        where: { businessId: targetBusinessId, createdAt: { gte: d30 } },
        select: { customerId: true },
        distinct: ["customerId"],
      }),
      db.txnQr.findMany({
        where: { businessId: targetBusinessId, consumedAt: { gte: d30 } },
        select: { consumedById: true },
        distinct: ["consumedById"],
      }),
      db.ledgerEntry.aggregate({
        where: {
          businessId: targetBusinessId,
          unit: "POINTS",
          delta: { gt: 0 },
          createdAt: { gte: d30 },
        },
        _sum: { delta: true },
      }),
      db.redemption.count({ where: { businessId: targetBusinessId, createdAt: { gte: d30 } } }),
      db.redemption.count({
        where: { businessId: targetBusinessId, status: "APPROVED", createdAt: { gte: d30 } },
      }),
      countRepeatCustomers(targetBusinessId),
      db.txnQr.findMany({
        where: { businessId: targetBusinessId },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { outlet: { select: { id: true, name: true } } },
      }),
    ]);

    // Distinct customers active in the last 30 days (visits ∪ consumed txns).
    const activeIds = new Set<string>();
    for (const row of activeVisitors30) activeIds.add(row.customerId);
    for (const row of activeTxnCustomers30) {
      if (row.consumedById) activeIds.add(row.consumedById);
    }

    const consumerIds = [
      ...new Set(recentTxns.map((t) => t.consumedById).filter((v): v is string => Boolean(v))),
    ];
    const consumers = consumerIds.length
      ? await db.user.findMany({
          where: { id: { in: consumerIds } },
          select: { id: true, name: true, phone: true },
        })
      : [];
    const consumerById = new Map(consumers.map((c) => [c.id, c]));

    return NextResponse.json({
      analytics: {
        businessId: targetBusinessId,
        totalCustomers,
        activeCustomers30: activeIds.size,
        visits7,
        visits30,
        pointsIssued30: pointsIssued30._sum.delta ?? 0,
        redemptions30,
        approvedRedemptions30,
        repeatCustomers,
        repeatRate: totalCustomers > 0 ? Number((repeatCustomers / totalCustomers).toFixed(4)) : 0,
        recentTxns: recentTxns.map((t) => {
          const consumer = t.consumedById ? consumerById.get(t.consumedById) : undefined;
          return {
            id: t.id,
            amountPaise: t.amountPaise,
            status: t.status,
            createdAt: t.createdAt,
            consumedAt: t.consumedAt,
            outlet: t.outlet,
            consumedBy: consumer
              ? { name: consumer.name, phone: maskPhone(consumer.phone) }
              : null,
          };
        }),
      },
    });
  });
}
