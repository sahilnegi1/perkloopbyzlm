import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ApiErr, handleRoute, requireCustomer } from "@/lib/auth-helpers";
import { pointsForAmount } from "@/lib/loyalty";

export const dynamic = "force-dynamic";

/**
 * GET /api/qr/txn/:token — auth CUSTOMER. Preview BEFORE confirming.
 * Never consumes the token. 404 unknown · 409 already used · 410 expired.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  return handleRoute(async () => {
    await requireCustomer();
    const { token } = await params;

    const txn = await db.txnQr.findUnique({
      where: { token },
      include: { business: true, outlet: true },
    });
    if (!txn) throw new ApiErr(404, "This code is invalid.");
    if (txn.status === "CONSUMED") throw new ApiErr(409, "This code has already been used.");
    if (txn.status === "EXPIRED" || txn.expiresAt.getTime() <= Date.now()) {
      throw new ApiErr(410, "This code has expired. Ask the merchant for a new one.");
    }
    if (txn.business.status !== "ACTIVE") {
      throw new ApiErr(409, "This business is not accepting transactions right now.");
    }

    const program = await db.loyaltyProgram.findFirst({
      where: { businessId: txn.businessId, type: "POINTS", status: "ACTIVE" },
    });
    const estimatedPoints = program ? pointsForAmount(txn.amountPaise, program) : 0;

    return NextResponse.json({
      business: {
        id: txn.business.id,
        name: txn.business.name,
        category: txn.business.category,
        logoUrl: txn.business.logoUrl,
        isDemo: txn.business.isDemo,
      },
      outlet: { id: txn.outlet.id, name: txn.outlet.name },
      amountPaise: txn.amountPaise,
      note: txn.note,
      expiresAt: txn.expiresAt,
      estimatedPoints,
    });
  });
}
