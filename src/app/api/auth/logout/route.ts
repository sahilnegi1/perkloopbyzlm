import { NextResponse } from "next/server";
import { destroySession } from "@/lib/session";

/** POST /api/auth/logout — destroys the session cookie. */
export async function POST() {
  await destroySession();
  return NextResponse.json({ ok: true });
}
