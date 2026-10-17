import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ApiErr, handleRoute } from "@/lib/auth-helpers";
import { summarizeProgram } from "@/lib/loyalty";

export const dynamic = "force-dynamic";

/**
 * GET /api/outlets/:code — public check-in screen data for a static outlet QR.
 * `code` is the outlet's unique QR code (printed on the physical QR).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  return handleRoute(async () => {
    const { code } = await params;
    const outlet = await db.outlet.findUnique({
      where: { code },
      include: {
        business: {
          include: { programs: { where: { status: "ACTIVE" }, orderBy: { createdAt: "asc" } } },
        },
      },
    });
    if (!outlet || outlet.business.status !== "ACTIVE") {
      throw new ApiErr(404, "This outlet code is not valid.");
    }

    const programs = outlet.business.programs.map(summarizeProgram);
    // Prefer the visit-based program for the check-in screen, else the first ACTIVE one.
    const program =
      programs.find((p) => p.type === "STAMPS") ??
      programs.find((p) => p.type === "STARS") ??
      programs[0] ??
      null;

    return NextResponse.json({
      business: {
        id: outlet.business.id,
        name: outlet.business.name,
        category: outlet.business.category,
        description: outlet.business.description,
        city: outlet.business.city,
        logoUrl: outlet.business.logoUrl,
        isDemo: outlet.business.isDemo,
      },
      outlet: { id: outlet.id, name: outlet.name, addressLine: outlet.addressLine },
      program,
      programs,
    });
  });
}
