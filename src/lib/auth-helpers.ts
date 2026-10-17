import { NextResponse } from "next/server";
import type { Prisma, PrismaClient, User } from "@prisma/client";
import { db } from "@/lib/db";
import { getSession, type SessionPayload } from "@/lib/session";
import { errorResponse } from "@/lib/rate-limit";

// ─── Error type ───────────────────────────────────────────────────────────────

/** Thrown anywhere inside a route handler; `handleRoute` converts it to JSON. */
export class ApiErr extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiErr";
  }
}

/** Prisma client or an interactive-transaction client — both share delegate APIs. */
export type DbClient = PrismaClient | Prisma.TransactionClient;

// ─── User shape ───────────────────────────────────────────────────────────────

export function publicUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
  };
}

export type PublicUser = ReturnType<typeof publicUser>;

// ─── Auth guards ──────────────────────────────────────────────────────────────

export async function requireUser(): Promise<{ session: SessionPayload; user: User }> {
  const session = await getSession();
  if (!session) throw new ApiErr(401, "Please sign in to continue.");
  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user) throw new ApiErr(401, "Your session is no longer valid. Please sign in again.");
  return { session, user };
}

/** Customer-only endpoints. Strict per docs/API.md: role must be CUSTOMER. */
export async function requireCustomer(): Promise<User> {
  const { user } = await requireUser();
  if (user.role !== "CUSTOMER") {
    throw new ApiErr(403, "This area is for customer accounts. Sign in with a customer profile.");
  }
  return user;
}

export type MembershipWithBusiness = Prisma.BusinessMemberGetPayload<{ include: { business: true } }>;

/** Any merchant-side surface: must have ≥1 business membership, else 403. */
export async function requireMerchant(): Promise<{ user: User; memberships: MembershipWithBusiness[] }> {
  const { user } = await requireUser();
  const memberships = await db.businessMember.findMany({
    where: { userId: user.id },
    include: { business: true },
    orderBy: { createdAt: "asc" },
  });
  if (memberships.length === 0) {
    throw new ApiErr(403, "No business is linked to this account. Register your business first.");
  }
  return { user, memberships };
}

const MANAGE_ROLES = new Set(["OWNER", "MANAGER"]);

/** Membership for one business; `manage` restricts mutations to OWNER/MANAGER. */
export async function requireMembership(
  businessId: string,
  opts: { manage?: boolean } = {}
): Promise<MembershipWithBusiness> {
  const { user } = await requireUser();
  const membership = await db.businessMember.findFirst({
    where: { userId: user.id, businessId },
    include: { business: true },
  });
  if (!membership) throw new ApiErr(403, "You do not have access to this business.");
  if (opts.manage && !MANAGE_ROLES.has(membership.role)) {
    throw new ApiErr(403, "Only business owners and managers can change these settings.");
  }
  return membership;
}

// ─── Audit log ────────────────────────────────────────────────────────────────

export type AuditEntry = {
  actorType: "CUSTOMER" | "MERCHANT" | "STAFF" | "SYSTEM";
  actorId?: string | null;
  businessId?: string | null;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  meta?: Record<string, unknown> | null;
};

/**
 * Appends an AuditLog row. NEVER put OTP codes, QR tokens, or other secrets in
 * `meta` — it is a JSON string persisted for the audit trail. Safe to call with
 * `db` or an in-transaction `tx` client. Never throws (audit must not break the
 * primary flow).
 */
export async function audit(client: DbClient, entry: AuditEntry): Promise<void> {
  try {
    await client.auditLog.create({
      data: {
        actorType: entry.actorType,
        actorId: entry.actorId ?? null,
        businessId: entry.businessId ?? null,
        action: entry.action,
        entity: entry.entity ?? null,
        entityId: entry.entityId ?? null,
        meta: entry.meta ? JSON.stringify(entry.meta) : null,
      },
    });
  } catch {
    // Audit must never break the primary flow.
  }
}

// ─── Route wrapper ────────────────────────────────────────────────────────────

/** Wraps a handler: ApiErr → { error } JSON; unexpected errors → 500 without internals. */
export function handleRoute(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  return fn().catch((err: unknown) => {
    const { error, status } = errorResponse(err);
    if (status >= 500) console.error("[api]", err);
    return NextResponse.json({ error }, { status });
  });
}

// ─── Request helpers ──────────────────────────────────────────────────────────

export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") ?? "unknown";
}

// ─── PII masking (for logs/merchant views — never for the data owner) ─────────

export function maskTarget(target: string): string {
  if (target.includes("@")) {
    const [local, domain] = target.split("@");
    const head = local && local.length > 0 ? local.slice(0, 1) : "•";
    return `${head}••••@${domain ?? ""}`;
  }
  return `•••••${target.slice(-4)}`;
}

export function maskPhone(phone: string | null | undefined): string | null {
  return phone ? `•••••${phone.slice(-4)}` : null;
}
