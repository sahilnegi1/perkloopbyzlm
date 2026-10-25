import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ApiErr, audit, handleRoute, requireMembership, requireMerchant } from "@/lib/auth-helpers";
import { parseBody, parseProgramConfig, programCreateSchema, programUpdateSchema } from "@/lib/validation";
import { assertSingleActiveProgram, dbTx, summarizeProgram } from "@/lib/loyalty";

/**
 * Program types offered at launch (audit F06): every selectable type must pass
 * create → earn → redeem → approve. SERVICE_COUNT / SPEND / CUSTOM_OFFER have
 * no earning implementation yet, so they are rejected at creation with a
 * friendly message instead of silently trapping customers.
 */
const LAUNCH_PROGRAM_TYPES = ["POINTS", "STAMPS"] as const;

/** GET /api/merchant/program?businessId= — programs across the caller's businesses. */
export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    const { memberships } = await requireMerchant();
    const businessId = new URL(req.url).searchParams.get("businessId");
    if (businessId) await requireMembership(businessId);

    const ids = businessId ? [businessId] : memberships.map((m) => m.businessId);
    const programs = await db.loyaltyProgram.findMany({
      where: { businessId: { in: ids } },
      orderBy: { createdAt: "desc" },
      include: { rewards: { orderBy: { cost: "asc" } } },
    });

    return NextResponse.json({
      programs: programs.map((p) => ({ ...summarizeProgram(p), rewards: p.rewards })),
    });
  });
}

/**
 * POST /api/merchant/program — create a program. Config is zod-validated per
 * type; only one ACTIVE program per type per business (409 otherwise).
 */
export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const body = await parseBody(programCreateSchema, req);
    const membership = await requireMembership(body.businessId, { manage: true });

    if (!(LAUNCH_PROGRAM_TYPES as readonly string[]).includes(body.type)) {
      throw new ApiErr(
        400,
        `${body.type.replace("_", " ").toLowerCase()} programs are coming soon. Start with Points or a stamp card.`
      );
    }

    const config = parseProgramConfig(body.type, body.config);
    if (body.startsAt && body.endsAt && body.startsAt > body.endsAt) {
      throw new ApiErr(400, "Program start date must be before its end date.");
    }

    // Audit F03: the one-active-program-per-type rule is enforced inside the
    // same serializable transaction as the create, so two simultaneous
    // requests cannot both activate a program of the same type.
    const program = await dbTx(async (tx) => {
      if (body.status === "ACTIVE") {
        await assertSingleActiveProgram(tx, membership.businessId, body.type);
      }
      const created = await tx.loyaltyProgram.create({
        data: {
          businessId: membership.businessId,
          name: body.name,
          type: body.type,
          config: JSON.stringify(config),
          terms: body.terms ?? null,
          status: body.status,
          startsAt: body.startsAt ?? null,
          endsAt: body.endsAt ?? null,
          perCustomerLimit: body.perCustomerLimit ?? null,
          minSpendPaise: body.minSpendPaise ?? null,
        },
      });
      await audit(tx, {
        actorType: membership.role === "STAFF" ? "STAFF" : "MERCHANT",
        actorId: membership.userId,
        businessId: membership.businessId,
        action: "PROGRAM_CREATED",
        entity: "LoyaltyProgram",
        entityId: created.id,
        meta: { name: created.name, type: created.type, status: created.status },
      });
      return created;
    });

    return NextResponse.json({ program: summarizeProgram(program) }, { status: 201 });
  });
}

/**
 * PUT /api/merchant/program — update a program. Program type is immutable
 * (changing it would corrupt accrued stamps); config re-validated per type.
 *
 * Review round 2 (issue 3): the whole update now runs in ONE serializable
 * transaction. Previously the activation path flipped the status inside a
 * serializable tx but then wrote the remaining fields with a SECOND,
 * non-serializable update — a second status update outside the guard that
 * could interleave with a concurrent activation.
 */
export async function PUT(req: NextRequest) {
  return handleRoute(async () => {
    const body = await parseBody(programUpdateSchema, req);
    const existing = await db.loyaltyProgram.findUnique({ where: { id: body.id } });
    if (!existing) throw new ApiErr(404, "Program not found.");
    const membership = await requireMembership(existing.businessId, { manage: true });

    if (body.type && body.type !== existing.type) {
      throw new ApiErr(400, "Program type cannot be changed. Create a new program instead.");
    }

    let configJson: string | undefined;
    if (body.config !== undefined) {
      const config = parseProgramConfig(existing.type, body.config);
      configJson = JSON.stringify(config);
    }

    const startsAt = body.startsAt ?? existing.startsAt;
    const endsAt = body.endsAt ?? existing.endsAt;
    if (startsAt && endsAt && startsAt > endsAt) {
      throw new ApiErr(400, "Program start date must be before its end date.");
    }

    const program = await dbTx(async (tx) => {
      if (body.status === "ACTIVE" && existing.status !== "ACTIVE") {
        // Audit F03: activation re-checks uniqueness in the same serializable
        // transaction as the write itself.
        await assertSingleActiveProgram(tx, existing.businessId, existing.type, existing.id);
      }
      const updated = await tx.loyaltyProgram.update({
        where: { id: existing.id },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(configJson !== undefined ? { config: configJson } : {}),
          ...(body.terms !== undefined ? { terms: body.terms } : {}),
          ...(body.status !== undefined ? { status: body.status } : {}),
          ...(body.startsAt !== undefined ? { startsAt: body.startsAt } : {}),
          ...(body.endsAt !== undefined ? { endsAt: body.endsAt } : {}),
          ...(body.perCustomerLimit !== undefined ? { perCustomerLimit: body.perCustomerLimit } : {}),
          ...(body.minSpendPaise !== undefined ? { minSpendPaise: body.minSpendPaise } : {}),
        },
      });
      await audit(tx, {
        actorType: membership.role === "STAFF" ? "STAFF" : "MERCHANT",
        actorId: membership.userId,
        businessId: existing.businessId,
        action: "PROGRAM_UPDATED",
        entity: "LoyaltyProgram",
        entityId: updated.id,
        meta: { name: updated.name, type: updated.type, status: updated.status },
      });
      return updated;
    });

    return NextResponse.json({ program: summarizeProgram(program) });
  });
}
