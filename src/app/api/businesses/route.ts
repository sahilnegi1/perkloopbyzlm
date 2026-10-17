import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleRoute } from "@/lib/auth-helpers";
import { businessesQuerySchema, parseQuery } from "@/lib/validation";
import { summarizeProgram } from "@/lib/loyalty";

export const dynamic = "force-dynamic";

/**
 * GET /api/businesses?category=&q=
 * ACTIVE businesses + their ACTIVE program summary + primary outlet city.
 * Public — no customer data. isDemo included so the UI can badge demo rows.
 */
export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    const query = parseQuery(businessesQuerySchema, req);

    const where: { status: string; category?: string } = { status: "ACTIVE" };
    if (query.category) where.category = query.category;

    const businesses = await db.business.findMany({
      where,
      include: {
        programs: { where: { status: "ACTIVE" }, orderBy: { createdAt: "asc" } },
        outlets: { where: { isPrimary: true }, take: 1 },
      },
      orderBy: { name: "asc" },
    });

    // SQLite `contains` is case-sensitive; do the free-text match here instead.
    const needle = query.q?.toLowerCase();
    const filtered = needle
      ? businesses.filter((b) =>
          [b.name, b.city ?? "", b.description ?? ""].some((t) => t.toLowerCase().includes(needle))
        )
      : businesses;

    return NextResponse.json({
      businesses: filtered.map((b) => ({
        id: b.id,
        name: b.name,
        category: b.category,
        description: b.description,
        city: b.city,
        addressLine: b.addressLine,
        logoUrl: b.logoUrl,
        isDemo: b.isDemo,
        programs: b.programs.map(summarizeProgram),
        primaryOutlet: b.outlets[0]
          ? { id: b.outlets[0].id, name: b.outlets[0].name, city: b.city }
          : null,
      })),
    });
  });
}
