import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { publicUser } from "@/lib/auth-helpers";

/** GET /api/me → { user: {...} | null } — 200 with null when signed out. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ user: null });
  const user = await db.user.findUnique({ where: { id: session.userId } });
  return NextResponse.json({ user: user ? publicUser(user) : null });
}
