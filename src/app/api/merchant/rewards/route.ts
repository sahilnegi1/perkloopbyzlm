import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ApiErr, audit, handleRoute, requireMembership, requireMerchant } from "@/lib/auth-helpers";
import { parseBody, rewardCreateSchema, rewardUpdateSchema } from "@/lib/validation";

/** GET /api/merchant/rewards?programId= — rewards across the caller's businesses. */
export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    const { memberships } = await requireMerchant();
    const programId = new URL(req.url).searchParams.get("programId");
    if (programId) {
      const program = await db.loyaltyProgram.findUnique({ where: { id: programId } });
      if (!program) throw new ApiErr(404, "Program not found.");
      await requireMembership(program.businessId);
    }

    const businessIds = memberships.map((m) => m.businessId);
    const rewards = await db.reward.findMany({
      where: {
        businessId: { in: businessIds },
        ...(programId ? { programId } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: { program: { select: { id: true, name: true, type: true, status: true } } },
    });
    return NextResponse.json({ rewards });
  });
}

/** POST /api/merchant/rewards — create a reward on one of the caller's programs. */
export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const body = await parseBody(rewardCreateSchema, req);
    const program = await db.loyaltyProgram.findUnique({ where: { id: body.programId } });
    if (!program) throw new ApiErr(404, "Program not found.");
    const membership = await requireMembership(program.businessId, { manage: true });

    const reward = await db.reward.create({
      data: {
        businessId: program.businessId,
        programId: program.id,
        title: body.title,
        description: body.description ?? null,
        cost: body.cost,
        unit: body.unit,
        terms: body.terms ?? null,
        active: body.active ?? true,
      },
    });

    await audit(db, {
      actorType: membership.role === "STAFF" ? "STAFF" : "MERCHANT",
      actorId: membership.userId,
      businessId: program.businessId,
      action: "REWARD_CREATED",
      entity: "Reward",
      entityId: reward.id,
      meta: { title: reward.title, cost: reward.cost, unit: reward.unit, programId: program.id },
    });

    return NextResponse.json({ reward }, { status: 201 });
  });
}

/** PUT /api/merchant/rewards — update one of the caller's rewards. */
export async function PUT(req: NextRequest) {
  return handleRoute(async () => {
    const body = await parseBody(rewardUpdateSchema, req);
    const existing = await db.reward.findUnique({ where: { id: body.id } });
    if (!existing) throw new ApiErr(404, "Reward not found.");
    const membership = await requireMembership(existing.businessId, { manage: true });

    const { id, ...fields } = body;
    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) data[key] = value;
    }

    const reward = await db.reward.update({ where: { id }, data });

    await audit(db, {
      actorType: membership.role === "STAFF" ? "STAFF" : "MERCHANT",
      actorId: membership.userId,
      businessId: existing.businessId,
      action: "REWARD_UPDATED",
      entity: "Reward",
      entityId: reward.id,
      meta: { title: reward.title, fields: Object.keys(data) },
    });

    return NextResponse.json({ reward });
  });
}

/**
 * DELETE /api/merchant/rewards?id= — hard-deletes when no redemptions reference
 * the reward; otherwise deactivates (history must stay intact).
 */
export async function DELETE(req: NextRequest) {
  return handleRoute(async () => {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) throw new ApiErr(400, "id: Reward id is required.");
    const existing = await db.reward.findUnique({ where: { id } });
    if (!existing) throw new ApiErr(404, "Reward not found.");
    const membership = await requireMembership(existing.businessId, { manage: true });

    const used = await db.redemption.count({ where: { rewardId: existing.id } });
    if (used > 0) {
      const reward = await db.reward.update({
        where: { id: existing.id },
        data: { active: false },
      });
      await audit(db, {
        actorType: membership.role === "STAFF" ? "STAFF" : "MERCHANT",
        actorId: membership.userId,
        businessId: existing.businessId,
        action: "REWARD_UPDATED",
        entity: "Reward",
        entityId: reward.id,
        meta: { title: reward.title, deactivated: true, reason: "has redemptions" },
      });
      return NextResponse.json({ reward, deactivated: true });
    }

    await db.reward.delete({ where: { id: existing.id } });
    await audit(db, {
      actorType: membership.role === "STAFF" ? "STAFF" : "MERCHANT",
      actorId: membership.userId,
      businessId: existing.businessId,
      action: "REWARD_DELETED",
      entity: "Reward",
      entityId: existing.id,
      meta: { title: existing.title },
    });
    return NextResponse.json({ ok: true, deactivated: false });
  });
}
