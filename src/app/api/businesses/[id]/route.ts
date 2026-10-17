import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ApiErr, handleRoute } from "@/lib/auth-helpers";
import { summarizeProgram } from "@/lib/loyalty";

export const dynamic = "force-dynamic";

/**
 * GET /api/businesses/:id — public business profile:
 * business fields + ACTIVE programs (with their ACTIVE rewards) + outlets
 * (no outlet QR codes here — those travel on printed QRs only).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const { id } = await params;
    const business = await db.business.findFirst({
      where: { id, status: "ACTIVE" },
      include: {
        programs: {
          where: { status: "ACTIVE" },
          orderBy: { createdAt: "asc" },
          include: { rewards: { where: { active: true }, orderBy: { cost: "asc" } } },
        },
        outlets: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
      },
    });
    if (!business) throw new ApiErr(404, "Business not found.");

    return NextResponse.json({
      business: {
        id: business.id,
        name: business.name,
        category: business.category,
        description: business.description,
        addressLine: business.addressLine,
        city: business.city,
        state: business.state,
        pincode: business.pincode,
        phone: business.phone,
        logoUrl: business.logoUrl,
        isDemo: business.isDemo,
        feedbackEnabled: business.feedbackEnabled,
      },
      programs: business.programs.map((p) => ({
        ...summarizeProgram(p),
        rewards: p.rewards.map((r) => ({
          id: r.id,
          title: r.title,
          description: r.description,
          cost: r.cost,
          unit: r.unit,
          terms: r.terms,
        })),
      })),
      outlets: business.outlets.map((o) => ({
        id: o.id,
        name: o.name,
        addressLine: o.addressLine,
        isPrimary: o.isPrimary,
      })),
    });
  });
}
