import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireCustomer, handleRoute } from "@/lib/auth-helpers";
import { recordVisitAndStamp } from "@/lib/loyalty";

/**
 * POST /api/outlets/:code/visit — auth CUSTOMER.
 * Always records the Visit. Awards stamps only when the business has an ACTIVE
 * STAMPS (or STARS) program AND ≥30 min passed since the customer's last visit
 * at this business. Atomic: visit + account + stamp + ledger + audit in one tx.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  return handleRoute(async () => {
    const user = await requireCustomer();
    const { code } = await params;
    const result = await recordVisitAndStamp({ customerId: user.id, outletCode: code });
    return NextResponse.json(result);
  });
}
