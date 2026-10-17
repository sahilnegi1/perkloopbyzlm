import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ApiErr, audit, handleRoute, requireMembership, requireUser } from "@/lib/auth-helpers";
import { outletCreateSchema, parseBody } from "@/lib/validation";

/**
 * POST /api/merchant/outlets — add an outlet to one of the caller's businesses.
 * Body: { businessId?, name, addressLine? } — businessId defaults to the
 * caller's sole business; ambiguous when they own several without specifying.
 */
export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const { user } = await requireUser();
    const body = await parseBody(outletCreateSchema, req);

    let businessId = body.businessId;
    if (!businessId) {
      const memberships = await db.businessMember.findMany({ where: { userId: user.id } });
      if (memberships.length === 1) {
        businessId = memberships[0].businessId;
      } else if (memberships.length === 0) {
        throw new ApiErr(403, "No business is linked to this account.");
      } else {
        throw new ApiErr(400, "Specify businessId — this account has multiple businesses.");
      }
    }

    const membership = await requireMembership(businessId, { manage: true });
    const outlet = await db.outlet.create({
      data: {
        businessId: membership.businessId,
        name: body.name,
        addressLine: body.addressLine ?? null,
      },
    });

    await audit(db, {
      actorType: membership.role === "STAFF" ? "STAFF" : "MERCHANT",
      actorId: membership.userId,
      businessId: membership.businessId,
      action: "OUTLET_CREATED",
      entity: "Outlet",
      entityId: outlet.id,
      meta: { name: outlet.name },
    });

    return NextResponse.json({ outlet }, { status: 201 });
  });
}
