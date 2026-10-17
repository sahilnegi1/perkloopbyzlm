import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handleRoute, requireUser } from "@/lib/auth-helpers";

/** POST /api/notifications/read — marks all of the caller's notifications read. */
export async function POST() {
  return handleRoute(async () => {
    const { user } = await requireUser();
    const result = await db.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
    return NextResponse.json({ updated: result.count });
  });
}
