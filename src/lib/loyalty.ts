import type { LoyaltyProgram, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ApiErr, audit } from "@/lib/auth-helpers";

/**
 * Reward Jar loyalty engine — the ONLY place balances move.
 *
 * Invariants (security spec, treated as law):
 * 1. Accounts are unique per (customerId, businessId). Points of business A can
 *    never be touched by flows of business B — every function here is scoped to
 *    one businessId and every merchant route resolves membership first.
 * 2. Every balance mutation happens inside db.$transaction with a conditional
 *    updateMany guard (status/expiry/balance), so no double-spend, no replay,
 *    no negative balances are possible.
 * 3. The ledger is append-only: one LedgerEntry per movement with balanceAfter.
 */

const STAMP_COOLDOWN_MS = 30 * 60 * 1000; // ≥30 min between stamp-bearing visits
const TXN_MIN_THRESHOLD_PAISE = 10000; // ₹100 — min-1-point threshold

// ─── Program helpers ──────────────────────────────────────────────────────────

export function summarizeProgram(program: LoyaltyProgram) {
  let config: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(program.config) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      config = parsed as Record<string, unknown>;
    }
  } catch {
    config = {};
  }
  return {
    id: program.id,
    name: program.name,
    type: program.type,
    status: program.status,
    config,
    terms: program.terms,
    startsAt: program.startsAt,
    endsAt: program.endsAt,
  };
}

export type ProgramSummary = ReturnType<typeof summarizeProgram>;

/**
 * Points for a transaction amount under a POINTS program:
 *   floor(amountPaise / 10000 × pointsPerRupeePaise)
 * with a minimum of 1 point when the amount is ≥ ₹100 (10000 paise), and zero
 * when the amount is below the program's minSpendPaise (if configured).
 * Defensive: returns 0 on malformed config instead of throwing mid-transaction.
 */
export function pointsForAmount(
  amountPaise: number,
  program: { config: string; minSpendPaise: number | null }
): number {
  if (program.minSpendPaise != null && amountPaise < program.minSpendPaise) return 0;
  let cfg: { pointsPerRupeePaise?: unknown } = {};
  try {
    cfg = JSON.parse(program.config) as { pointsPerRupeePaise?: unknown };
  } catch {
    return 0;
  }
  const rate =
    typeof cfg.pointsPerRupeePaise === "number" && Number.isFinite(cfg.pointsPerRupeePaise)
      ? Math.floor(cfg.pointsPerRupeePaise)
      : 0;
  if (rate < 1) return 0;
  const raw = Math.floor((amountPaise / 10000) * rate);
  if (raw === 0 && amountPaise >= TXN_MIN_THRESHOLD_PAISE) return 1;
  return raw;
}

/** Enforces "one ACTIVE program per type per business". */
export async function assertSingleActiveProgram(
  dbOrTx: Prisma.TransactionClient,
  businessId: string,
  type: string,
  excludeProgramId?: string
): Promise<void> {
  const count = await dbOrTx.loyaltyProgram.count({
    where: {
      businessId,
      type,
      status: "ACTIVE",
      ...(excludeProgramId ? { id: { not: excludeProgramId } } : {}),
    },
  });
  if (count > 0) {
    throw new ApiErr(409, `A ${type} program is already active for this business. Pause it first.`);
  }
}

// ─── One-time transaction QR: atomic confirm + points award ──────────────────

export async function confirmTxnAndAward(input: { token: string; customerId: string }) {
  const now = new Date();
  return db.$transaction(async (tx) => {
    const txn = await tx.txnQr.findUnique({
      where: { token: input.token },
      include: { business: true, outlet: true },
    });
    if (!txn) throw new ApiErr(404, "This code is invalid.");
    if (txn.status === "CONSUMED") throw new ApiErr(409, "This code has already been used.");
    if (txn.status === "EXPIRED" || txn.expiresAt.getTime() <= now.getTime()) {
      throw new ApiErr(410, "This code has expired. Ask the merchant for a new one.");
    }
    if (txn.business.status !== "ACTIVE") {
      throw new ApiErr(409, "This business is not accepting transactions right now.");
    }

    // ATOMIC consumption: count must be exactly 1 BEFORE any points move.
    const consumed = await tx.txnQr.updateMany({
      where: { id: txn.id, token: txn.token, status: "PENDING", expiresAt: { gt: now } },
      data: { status: "CONSUMED", consumedById: input.customerId, consumedAt: now },
    });
    if (consumed.count !== 1) {
      const fresh = await tx.txnQr.findUnique({ where: { token: input.token } });
      if (fresh?.status === "CONSUMED") throw new ApiErr(409, "This code has already been used.");
      throw new ApiErr(410, "This code has expired. Ask the merchant for a new one.");
    }

    // Account is unique per (customer, business) — other businesses are untouched.
    const account = await tx.loyaltyAccount.upsert({
      where: {
        customerId_businessId: { customerId: input.customerId, businessId: txn.businessId },
      },
      create: { customerId: input.customerId, businessId: txn.businessId },
      update: {},
    });

    // Points come ONLY from this business's ACTIVE POINTS program config.
    const program = await tx.loyaltyProgram.findFirst({
      where: { businessId: txn.businessId, type: "POINTS", status: "ACTIVE" },
    });
    const awarded = program ? pointsForAmount(txn.amountPaise, program) : 0;

    await tx.loyaltyAccount.updateMany({
      where: { id: account.id },
      data: {
        ...(awarded > 0 ? { points: { increment: awarded } } : {}),
        visitCount: { increment: 1 },
        lastVisitAt: now,
      },
    });
    const freshAccount = await tx.loyaltyAccount.findUniqueOrThrow({ where: { id: account.id } });

    if (awarded > 0) {
      await tx.ledgerEntry.create({
        data: {
          accountId: account.id,
          businessId: txn.businessId,
          type: "EARN_POINTS",
          unit: "POINTS",
          delta: awarded,
          balanceAfter: freshAccount.points,
          description: `Purchase of ₹${(txn.amountPaise / 100).toFixed(2)}`,
          refType: "TXN",
          refId: txn.id,
        },
      });
      await audit(tx, {
        actorType: "SYSTEM",
        actorId: input.customerId,
        businessId: txn.businessId,
        action: "POINTS_ISSUED",
        entity: "LoyaltyAccount",
        entityId: account.id,
        meta: { points: awarded, source: "TXN", txnId: txn.id },
      });
    }

    // Visit row is always recorded for transactions (source TXN).
    await tx.visit.create({
      data: {
        customerId: input.customerId,
        businessId: txn.businessId,
        outletId: txn.outletId,
        source: "TXN",
      },
    });

    await audit(tx, {
      actorType: "CUSTOMER",
      actorId: input.customerId,
      businessId: txn.businessId,
      action: "QR_TXN_CONSUMED",
      entity: "TxnQr",
      entityId: txn.id,
      meta: { amountPaise: txn.amountPaise, pointsAwarded: awarded },
    });

    await tx.notification.create({
      data: {
        userId: input.customerId,
        businessId: txn.businessId,
        type: "REWARD_EARNED",
        title:
          awarded > 0
            ? `+${awarded} points at ${txn.business.name}`
            : `Visit recorded at ${txn.business.name}`,
        body:
          awarded > 0
            ? `Your purchase of ₹${(txn.amountPaise / 100).toFixed(2)} earned ${awarded} points.`
            : "Your transaction was recorded.",
      },
    });

    return {
      business: { id: txn.business.id, name: txn.business.name },
      outlet: { id: txn.outlet.id, name: txn.outlet.name },
      amountPaise: txn.amountPaise,
      pointsAwarded: awarded,
      balance: freshAccount.points,
    };
  });
}

// ─── Static outlet QR: visit + stamp award with cooldown ─────────────────────

export async function recordVisitAndStamp(input: { customerId: string; outletCode: string }) {
  const now = new Date();
  return db.$transaction(async (tx) => {
    const outlet = await tx.outlet.findUnique({
      where: { code: input.outletCode },
      include: { business: true },
    });
    if (!outlet) throw new ApiErr(404, "This outlet code is not valid.");
    if (outlet.business.status !== "ACTIVE") {
      throw new ApiErr(409, "This business is not accepting check-ins right now.");
    }
    const businessId = outlet.businessId;

    // Cooldown compares against the customer's previous STATIC_QR visit at this
    // business (anti-screenshot re-scan). A TXN purchase does not consume the
    // visit stamp — points and visit stamps are different loyalty mechanics.
    const lastVisit = await tx.visit.findFirst({
      where: { customerId: input.customerId, businessId, source: "STATIC_QR" },
      orderBy: { createdAt: "desc" },
    });
    const visit = await tx.visit.create({
      data: {
        customerId: input.customerId,
        businessId,
        outletId: outlet.id,
        source: "STATIC_QR",
      },
    });

    const account = await tx.loyaltyAccount.upsert({
      where: { customerId_businessId: { customerId: input.customerId, businessId } },
      create: { customerId: input.customerId, businessId, visitCount: 1, lastVisitAt: now },
      update: { visitCount: { increment: 1 }, lastVisitAt: now },
    });

    // Stamp award only for ACTIVE STAMPS (or STARS) programs, with ≥30 min cooldown.
    const stampProgram = await tx.loyaltyProgram.findFirst({
      where: { businessId, type: "STAMPS", status: "ACTIVE" },
    });
    const starsProgram = stampProgram
      ? null
      : await tx.loyaltyProgram.findFirst({
          where: { businessId, type: "STARS", status: "ACTIVE" },
        });
    const visitProgram = stampProgram ?? starsProgram;

    const withinCooldown =
      lastVisit !== null && now.getTime() - lastVisit.createdAt.getTime() < STAMP_COOLDOWN_MS;

    let stampsAwarded = 0;
    let stampsToReward: number | null = null;

    if (visitProgram && !withinCooldown) {
      let perVisit = 1;
      if (starsProgram) {
        let cfg: { starsPerVisit?: unknown; starsToReward?: unknown } = {};
        try {
          cfg = JSON.parse(starsProgram.config) as typeof cfg;
        } catch {
          cfg = {};
        }
        perVisit =
          typeof cfg.starsPerVisit === "number" && cfg.starsPerVisit >= 1
            ? Math.floor(cfg.starsPerVisit)
            : 1;
        stampsToReward =
          typeof cfg.starsToReward === "number" ? Math.floor(cfg.starsToReward) : null;
      } else if (stampProgram) {
        let cfg: { stampsToReward?: unknown } = {};
        try {
          cfg = JSON.parse(stampProgram.config) as typeof cfg;
        } catch {
          cfg = {};
        }
        // stampsPerVisit is fixed at 1 by config validation.
        stampsToReward =
          typeof cfg.stampsToReward === "number" ? Math.floor(cfg.stampsToReward) : null;
      }

      stampsAwarded = perVisit;
      await tx.loyaltyAccount.updateMany({
        where: { id: account.id },
        data: { stamps: { increment: stampsAwarded } },
      });
      const fresh = await tx.loyaltyAccount.findUniqueOrThrow({ where: { id: account.id } });
      await tx.ledgerEntry.create({
        data: {
          accountId: account.id,
          businessId,
          type: "EARN_STAMP",
          unit: "STAMPS",
          delta: stampsAwarded,
          balanceAfter: fresh.stamps,
          description: starsProgram ? "Visit star" : "Visit stamp",
          refType: "VISIT",
          refId: visit.id,
        },
      });
      if (stampsToReward != null && fresh.stamps === stampsToReward) {
        await tx.notification.create({
          data: {
            userId: input.customerId,
            businessId,
            type: "REWARD_EARNED",
            title: `Reward ready at ${outlet.business.name}`,
            body: "You have enough stamps to redeem a reward.",
          },
        });
      }
    }

    await audit(tx, {
      actorType: "CUSTOMER",
      actorId: input.customerId,
      businessId,
      action: "VISIT_RECORDED",
      entity: "Visit",
      entityId: visit.id,
      meta: { outletId: outlet.id, stampsAwarded, cooldownActive: withinCooldown },
    });

    const finalAccount = await tx.loyaltyAccount.findUniqueOrThrow({ where: { id: account.id } });
    const nextStampAt =
      withinCooldown && visitProgram && lastVisit
        ? new Date(lastVisit.createdAt.getTime() + STAMP_COOLDOWN_MS)
        : null;

    return {
      business: { id: outlet.business.id, name: outlet.business.name, isDemo: outlet.business.isDemo },
      outlet: { id: outlet.id, name: outlet.name },
      visitId: visit.id,
      stampsAwarded,
      stamps: finalAccount.stamps,
      stampsToReward,
      cooldownActive: withinCooldown,
      nextStampAt,
    };
  });
}

// ─── Redemptions ──────────────────────────────────────────────────────────────

/** Customer creates a PENDING redemption. No balance change happens here. */
export async function createRedemption(input: {
  customerId: string;
  businessId: string;
  rewardId: string;
}) {
  const reward = await db.reward.findFirst({
    where: { id: input.rewardId, businessId: input.businessId },
    include: { program: true },
  });
  if (!reward) throw new ApiErr(404, "Reward not found for this business.");
  if (!reward.active) throw new ApiErr(400, "This reward is no longer available.");
  if (reward.program.status !== "ACTIVE") {
    throw new ApiErr(400, "This reward's loyalty program is not active right now.");
  }

  if (reward.program.perCustomerLimit != null) {
    const used = await db.redemption.count({
      where: {
        rewardId: reward.id,
        customerId: input.customerId,
        status: { in: ["PENDING", "APPROVED"] },
      },
    });
    if (used >= reward.program.perCustomerLimit) {
      throw new ApiErr(403, "You have reached the redemption limit for this reward.");
    }
  }

  // One PENDING redemption per customer per business.
  const pending = await db.redemption.findFirst({
    where: { customerId: input.customerId, businessId: input.businessId, status: "PENDING" },
  });
  if (pending) {
    throw new ApiErr(
      409,
      "You already have a pending redemption at this business. Wait for it to be decided."
    );
  }

  const account = await db.loyaltyAccount.findUnique({
    where: {
      customerId_businessId: { customerId: input.customerId, businessId: input.businessId },
    },
  });
  if (!account) {
    throw new ApiErr(
      400,
      "Join this business's loyalty program first — scan their QR code to start earning."
    );
  }
  const balance = reward.unit === "POINTS" ? account.points : account.stamps;
  if (balance < reward.cost) {
    throw new ApiErr(
      400,
      `You need ${reward.cost - balance} more ${
        reward.unit === "POINTS" ? "points" : "stamps"
      } for this reward.`
    );
  }

  const redemption = await db.redemption.create({
    data: {
      rewardId: reward.id,
      businessId: input.businessId,
      customerId: input.customerId,
      status: "PENDING",
      cost: reward.cost,
      unit: reward.unit,
    },
  });

  await audit(db, {
    actorType: "CUSTOMER",
    actorId: input.customerId,
    businessId: input.businessId,
    action: "REDEMPTION_CREATED",
    entity: "Redemption",
    entityId: redemption.id,
    meta: { rewardId: reward.id, rewardTitle: reward.title, cost: reward.cost, unit: reward.unit },
  });

  const members = await db.businessMember.findMany({
    where: { businessId: input.businessId, role: { in: ["OWNER", "MANAGER"] } },
  });
  if (members.length > 0) {
    await db.notification.createMany({
      data: members.map((m) => ({
        userId: m.userId,
        businessId: input.businessId,
        type: "REDEMPTION_UPDATE",
        title: "New redemption request",
        body: `A customer wants to redeem "${reward.title}".`,
      })),
    });
  }

  return redemption;
}

/**
 * Merchant decision. APPROVED path is atomic: conditional decrement guard
 * (points/stamps ≥ cost) means the balance can NEVER go negative; a second
 * approve hits the PENDING guard and returns 409.
 */
export async function decideRedemption(input: {
  redemptionId: string;
  businessId: string;
  userId: string;
  memberRole: string;
  decision: "APPROVED" | "REJECTED";
}) {
  const now = new Date();
  const actorType = input.memberRole === "STAFF" ? ("STAFF" as const) : ("MERCHANT" as const);

  if (input.decision === "REJECTED") {
    const res = await db.redemption.updateMany({
      where: { id: input.redemptionId, businessId: input.businessId, status: "PENDING" },
      data: { status: "REJECTED", decidedAt: now, decidedById: input.userId },
    });
    if (res.count !== 1) {
      const existing = await db.redemption.findFirst({
        where: { id: input.redemptionId, businessId: input.businessId },
      });
      if (!existing) throw new ApiErr(404, "Redemption not found for your business.");
      throw new ApiErr(409, "This redemption was already decided.");
    }
    const final = await db.redemption.findUniqueOrThrow({
      where: { id: input.redemptionId },
      include: { reward: true, business: true },
    });
    await audit(db, {
      actorType,
      actorId: input.userId,
      businessId: input.businessId,
      action: "REDEMPTION_REJECTED",
      entity: "Redemption",
      entityId: final.id,
      meta: { rewardTitle: final.reward.title, cost: final.cost, unit: final.unit },
    });
    await db.notification.create({
      data: {
        userId: final.customerId,
        businessId: input.businessId,
        type: "REDEMPTION_UPDATE",
        title: `Redemption rejected at ${final.business.name}`,
        body: `"${final.reward.title}" was not approved. Your balance is unchanged.`,
      },
    });
    return final;
  }

  return db.$transaction(async (tx) => {
    const redemption = await tx.redemption.findFirst({
      where: { id: input.redemptionId, businessId: input.businessId },
      include: { reward: true, business: true },
    });
    if (!redemption) throw new ApiErr(404, "Redemption not found for your business.");
    if (redemption.status !== "PENDING") {
      throw new ApiErr(409, "This redemption was already decided.");
    }

    const account = await tx.loyaltyAccount.findUnique({
      where: {
        customerId_businessId: { customerId: redemption.customerId, businessId: input.businessId },
      },
    });
    if (!account) throw new ApiErr(409, "This customer has no loyalty account at your business.");

    // Conditional decrement: guard balance ≥ cost, so it can never go negative.
    const dec =
      redemption.unit === "POINTS"
        ? await tx.loyaltyAccount.updateMany({
            where: { id: account.id, points: { gte: redemption.cost } },
            data: { points: { decrement: redemption.cost } },
          })
        : await tx.loyaltyAccount.updateMany({
            where: { id: account.id, stamps: { gte: redemption.cost } },
            data: { stamps: { decrement: redemption.cost } },
          });
    if (dec.count !== 1) {
      throw new ApiErr(409, "Customer balance is no longer enough for this redemption.");
    }

    const fresh = await tx.loyaltyAccount.findUniqueOrThrow({ where: { id: account.id } });
    await tx.ledgerEntry.create({
      data: {
        accountId: account.id,
        businessId: input.businessId,
        type: "REDEEM",
        unit: redemption.unit,
        delta: -redemption.cost,
        balanceAfter: redemption.unit === "POINTS" ? fresh.points : fresh.stamps,
        description: `Redeemed: ${redemption.reward.title}`,
        refType: "REDEMPTION",
        refId: redemption.id,
      },
    });

    // PENDING guard → double-approve returns 409 and rolls everything back.
    const upd = await tx.redemption.updateMany({
      where: { id: redemption.id, status: "PENDING" },
      data: { status: "APPROVED", decidedAt: now, decidedById: input.userId },
    });
    if (upd.count !== 1) throw new ApiErr(409, "This redemption was already decided.");

    await audit(tx, {
      actorType,
      actorId: input.userId,
      businessId: input.businessId,
      action: "REDEMPTION_APPROVED",
      entity: "Redemption",
      entityId: redemption.id,
      meta: { rewardTitle: redemption.reward.title, cost: redemption.cost, unit: redemption.unit },
    });
    await tx.notification.create({
      data: {
        userId: redemption.customerId,
        businessId: input.businessId,
        type: "REDEMPTION_UPDATE",
        title: `Reward approved at ${redemption.business.name}`,
        body: `Show the confirmation screen to claim "${redemption.reward.title}".`,
      },
    });

    return tx.redemption.findUniqueOrThrow({ where: { id: redemption.id } });
  });
}
