import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { ApiErr, audit, handleRoute, requireMembership } from "@/lib/auth-helpers";
import { txnCreateSchema, parseBody } from "@/lib/validation";

const TXN_TTL_MS = 5 * 60 * 1000;

/**
 * POST /api/merchant/qr/txn — auth MERCHANT/STAFF of the outlet's business.
 * Body: { outletId, amountPaise (1000..10_000_000), note? }
 * Creates a one-time transaction QR: token = 32 random bytes (base64url), TTL 5 min.
 * The token is returned exactly once and never stored in audit logs.
 */
export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const body = await parseBody(txnCreateSchema, req);

    const outlet = await db.outlet.findUnique({
      where: { id: body.outletId },
      include: { business: true },
    });
    if (!outlet) throw new ApiErr(404, "Outlet not found.");
    const membership = await requireMembership(outlet.businessId);
    if (outlet.business.status !== "ACTIVE") {
      throw new ApiErr(409, "This business is not active. Contact support.");
    }

    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + TXN_TTL_MS);

    const txn = await db.txnQr.create({
      data: {
        token,
        businessId: outlet.businessId,
        outletId: outlet.id,
        amountPaise: body.amountPaise,
        note: body.note ?? null,
        createdById: membership.userId,
        expiresAt,
      },
    });

    await audit(db, {
      actorType: membership.role === "STAFF" ? "STAFF" : "MERCHANT",
      actorId: membership.userId,
      businessId: outlet.businessId,
      action: "QR_TXN_CREATED",
      entity: "TxnQr",
      entityId: txn.id,
      meta: { outletId: outlet.id, amountPaise: body.amountPaise, expiresAt: expiresAt.toISOString() },
    });

    return NextResponse.json(
      {
        token,
        expiresAt,
        amountPaise: txn.amountPaise,
        businessId: txn.businessId,
        outletId: txn.outletId,
      },
      { status: 201 }
    );
  });
}
