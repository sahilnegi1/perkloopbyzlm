import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { createSession } from "@/lib/session";
import { audit, ApiErr, handleRoute, maskTarget, publicUser } from "@/lib/auth-helpers";
import { verifyOtp } from "@/lib/otp";
import { otpVerifySchema, parseBody, normalizePhone } from "@/lib/validation";

/**
 * POST /api/auth/otp/verify
 * Body: { channel, target, code, role? }
 * Verifies hash + expiry + attempts (≤5) and atomically consumes the code.
 * Find-or-create User: role param only matters on creation (default CUSTOMER;
 * MERCHANT_OWNER only when explicitly requested). Existing users keep their role.
 * On success sets the httpOnly session cookie and returns { user }.
 */
export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const body = await parseBody(otpVerifySchema, req);
    const target =
      body.channel === "EMAIL" ? body.target.toLowerCase() : normalizePhone(body.target);

    // Lookup BEFORE verification: a LOGIN for a non-existent account fails fast
    // WITHOUT consuming the code, so the same code still works when the user
    // switches to "Register" (UI fallback path). Code validity is never revealed.
    let user =
      body.channel === "EMAIL"
        ? await db.user.findUnique({ where: { email: target } })
        : await db.user.findUnique({ where: { phone: target } });

    if (!user && body.intent !== "REGISTER") {
      throw new ApiErr(
        404,
        body.channel === "EMAIL"
          ? "No account found for this email. Register first."
          : "No account found for this number. Register first."
      );
    }

    await verifyOtp({ channel: body.channel, target, code: body.code });

    // Audit the verification — masked target, NEVER the code.
    await audit(db, {
      actorType: "SYSTEM",
      action: "OTP_VERIFIED",
      entity: "OtpCode",
      meta: { channel: body.channel, target: maskTarget(target) },
    });

    if (!user) {
      const role = body.role === "MERCHANT_OWNER" ? "MERCHANT_OWNER" : "CUSTOMER";
      try {
        user =
          body.channel === "EMAIL"
            ? await db.user.create({ data: { email: target, role } })
            : await db.user.create({ data: { phone: target, role } });
      } catch {
        // Lost a create race — the winner's row is the account.
        user =
          body.channel === "EMAIL"
            ? await db.user.findUnique({ where: { email: target } })
            : await db.user.findUnique({ where: { phone: target } });
        if (!user) throw new Error("Could not create the account. Please try again.");
      }
    }

    await createSession({
      userId: user.id,
      role: user.role as "CUSTOMER" | "MERCHANT_OWNER" | "STAFF",
    });
    return NextResponse.json({ user: publicUser(user) });
  });
}
