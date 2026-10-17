import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleRoute, maskPhone, requireMerchant } from "@/lib/auth-helpers";
import { parseQuery, txnsQuerySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** GET /api/merchant/txns?limit= — recent TxnQr rows for the caller's business(es). */
export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    const { user } = await requireMerchant();
    const query = parseQuery(txnsQuerySchema, req);

    const memberships = await db.businessMember.findMany({ where: { userId: user.id } });
    const businessIds = memberships.map((m) => m.businessId);

    const txns = await db.txnQr.findMany({
      where: { businessId: { in: businessIds } },
      orderBy: { createdAt: "desc" },
      take: query.limit,
      include: { outlet: { select: { id: true, name: true } } },
    });

    // Resolve consuming customers in one query (TxnQr has no relation to User).
    const consumerIds = [...new Set(txns.map((t) => t.consumedById).filter((v): v is string => Boolean(v)))];
    const consumers = consumerIds.length
      ? await db.user.findMany({
          where: { id: { in: consumerIds } },
          select: { id: true, name: true, phone: true },
        })
      : [];
    const consumerById = new Map(consumers.map((c) => [c.id, c]));

    return NextResponse.json({
      txns: txns.map((t) => {
        const consumer = t.consumedById ? consumerById.get(t.consumedById) : undefined;
        return {
          id: t.id,
          amountPaise: t.amountPaise,
          note: t.note,
          status: t.status,
          createdAt: t.createdAt,
          expiresAt: t.expiresAt,
          consumedAt: t.consumedAt,
          outlet: t.outlet,
          consumedBy: consumer
            ? { id: consumer.id, name: consumer.name, phone: maskPhone(consumer.phone) }
            : null,
        };
      }),
    });
  });
}
