import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { handleRoute, getClientIp } from "@/lib/auth-helpers";
import { requestOtp } from "@/lib/otp";
import { otpRequestSchema, parseBody, normalizePhone } from "@/lib/validation";

/**
 * POST /api/auth/otp/request
 * Body: { channel: "EMAIL"|"SMS", target, intent: "LOGIN"|"REGISTER", role? }
 * Rate limits: 5/15min per target, 20/hr per IP, 60s resend cooldown.
 * Provider configured → { delivery: "sent" } (code NEVER returned).
 * Provider missing → honest dev mode { delivery: "dev", devMode: true, devCode }.
 */
export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const body = await parseBody(otpRequestSchema, req);
    const target =
      body.channel === "EMAIL" ? body.target.toLowerCase() : normalizePhone(body.target);

    const result = await requestOtp({ channel: body.channel, target, ip: getClientIp(req) });

    if (result.delivery === "dev") {
      return NextResponse.json({ delivery: "dev", devMode: true, devCode: result.devCode });
    }
    return NextResponse.json({ delivery: "sent", devMode: false });
  });
}
