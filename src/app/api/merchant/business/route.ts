import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { createSession } from "@/lib/session";
import { ApiErr, audit, handleRoute, publicUser, requireMembership, requireUser } from "@/lib/auth-helpers";
import { businessCreateSchema, businessUpdateSchema, parseBody } from "@/lib/validation";

/** GET /api/merchant/business — caller's business(es) + outlets + programs + rewards. */
export async function GET() {
  return handleRoute(async () => {
    const { user } = await requireUser();
    const memberships = await db.businessMember.findMany({
      where: { userId: user.id },
      include: {
        business: {
          include: {
            outlets: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
            programs: {
              orderBy: { createdAt: "asc" },
              include: { rewards: { orderBy: { createdAt: "asc" } } },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const businesses = memberships.map((m) => m.business);
    return NextResponse.json({
      // Convenience for single-business owners; multi-business UIs use `businesses`.
      business: businesses[0] ?? null,
      businesses,
    });
  });
}

/**
 * POST /api/merchant/business — register a business.
 * Creates Business + primary Outlet + OWNER membership; upgrades a CUSTOMER
 * account to MERCHANT_OWNER and re-issues the session cookie.
 */
export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const { user } = await requireUser();
    const body = await parseBody(businessCreateSchema, req);

    // Audit F09: the merchant shell has no business selector yet, so a second
    // business would create inconsistent scope (settings, outlets, programs).
    // One business per owner for the pilot — explicit, friendly rejection.
    const existingCount = await db.businessMember.count({ where: { userId: user.id } });
    if (existingCount > 0) {
      throw new ApiErr(
        409,
        "Your account already runs a business. Running multiple businesses isn't supported yet."
      );
    }

    const business = await db.business.create({
      data: {
        name: body.name,
        category: body.category,
        description: body.description ?? null,
        addressLine: body.addressLine ?? null,
        city: body.city ?? null,
        state: body.state ?? null,
        pincode: body.pincode ?? null,
        phone: body.phone ? body.phone : null,
        logoUrl: body.logoUrl ?? null,
        coverUrl: body.coverUrl ?? null,
        members: { create: { userId: user.id, role: "OWNER" } },
        outlets: { create: { name: `${body.name} — Main`, isPrimary: true } },
      },
      include: { outlets: true },
    });

    if (user.role === "CUSTOMER") {
      await db.user.update({ where: { id: user.id }, data: { role: "MERCHANT_OWNER" } });
      // Refresh the cookie so the new role travels with the session.
      await createSession({ userId: user.id, role: "MERCHANT_OWNER" });
    }

    await audit(db, {
      actorType: "MERCHANT",
      actorId: user.id,
      businessId: business.id,
      action: "BUSINESS_CREATED",
      entity: "Business",
      entityId: business.id,
      meta: { name: business.name, category: business.category },
    });

    return NextResponse.json({ business, user: publicUser({ ...user, role: "MERCHANT_OWNER" }) }, { status: 201 });
  });
}

/** PUT /api/merchant/business — update own business fields (OWNER/MANAGER). */
export async function PUT(req: NextRequest) {
  return handleRoute(async () => {
    const body = await parseBody(businessUpdateSchema, req);
    const membership = await requireMembership(body.id, { manage: true });

    const { id, ...fields } = body;
    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) data[key] = key === "phone" ? (value === "" ? null : value) : value;
    }

    const business = await db.business.update({ where: { id }, data, include: { outlets: true } });

    await audit(db, {
      actorType: membership.role === "STAFF" ? "STAFF" : "MERCHANT",
      actorId: membership.userId,
      businessId: business.id,
      action: "BUSINESS_UPDATED",
      entity: "Business",
      entityId: business.id,
      meta: { fields: Object.keys(data) },
    });

    return NextResponse.json({ business });
  });
}
