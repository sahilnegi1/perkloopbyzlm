import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handleRoute, requireUser } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

/** GET /api/notifications — in-app notifications, newest first (50). */
export async function GET() {
  return handleRoute(async () => {
    const { user } = await requireUser();

    const [notifications, unread] = await Promise.all([
      db.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      db.notification.count({ where: { userId: user.id, readAt: null } }),
    ]);

    return NextResponse.json({ notifications, unread });
  });
}
