import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/* ─── GET /api/notifications ─── */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, Number(sp.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(sp.get("limit")) || 20));
    const skip = (page - 1) * limit;

    const search = sp.get("search")?.trim() || "";
    const type = sp.get("type") || ""; // notification_type filter
    const target = sp.get("target") || ""; // "all" | "single" | ""
    const sort = sp.get("sort") || "created_at";
    const order = sp.get("order") === "asc" ? "asc" : "desc";

    /* ─ Build where clause ─ */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (search) {
      const num = Number(search);
      where.OR = [
        { subject: { contains: search } },
        { body: { contains: search } },
        ...(Number.isFinite(num) ? [{ id: num }, { r_user_id: num }] : []),
      ];
    }

    if (type) where.notification_type = type;

    if (target === "all") where.r_user_id = null;
    else if (target === "single") where.r_user_id = { not: null };

    /* ─ Allowed sort columns ─ */
    const allowedSort: Record<string, string> = {
      created_at: "created_at",
      subject: "subject",
      id: "id",
    };
    const orderBy = { [allowedSort[sort] || "created_at"]: order };

    const [notifications, total] = await Promise.all([
      prisma.notifications.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.notifications.count({ where }),
    ]);

    /* ─ Fetch target user names for single-user notifications ─ */
    const userIds = notifications
      .map((n) => n.r_user_id)
      .filter((id): id is number => id !== null);

    const users =
      userIds.length > 0
        ? await prisma.users.findMany({
            where: { id: { in: userIds } },
            select: { id: true, first_name: true, last_name: true, email: true, main_image: true },
          })
        : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    /* ─ Get reach count for broadcast notifications ─ */
    const broadcastIds = notifications
      .filter((n) => n.r_user_id === null)
      .map((n) => n.id);

    const reachCounts =
      broadcastIds.length > 0
        ? await prisma.users_notifications.groupBy({
            by: ["notification_id"],
            where: { notification_id: { in: broadcastIds } },
            _count: { id: true },
          })
        : [];
    const reachMap = new Map(
      reachCounts.map((r) => [r.notification_id, r._count.id])
    );

    /* ─ Get seen counts for broadcasts ─ */
    const seenCounts =
      broadcastIds.length > 0
        ? await prisma.users_notifications.groupBy({
            by: ["notification_id"],
            where: {
              notification_id: { in: broadcastIds },
              is_seen: 1,
            },
            _count: { id: true },
          })
        : [];
    const seenMap = new Map(
      seenCounts.map((r) => [r.notification_id, r._count.id])
    );

    const enriched = notifications.map((n) => ({
      ...n,
      target_user: n.r_user_id ? userMap.get(n.r_user_id) || null : null,
      reach_count: n.r_user_id === null ? reachMap.get(n.id) || 0 : 1,
      seen_count:
        n.r_user_id === null
          ? seenMap.get(n.id) || 0
          : n.is_seen,
    }));

    /* ─ Stats ─ */
    const [totalAll, totalBroadcast, totalOrder, totalPromo] = await Promise.all([
      prisma.notifications.count(),
      prisma.notifications.count({ where: { r_user_id: null } }),
      prisma.notifications.count({ where: { notification_type: "order" } }),
      prisma.notifications.count({ where: { notification_type: "promo" } }),
    ]);

    return NextResponse.json({
      notifications: enriched,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      stats: { total: totalAll, broadcast: totalBroadcast, order: totalOrder, promo: totalPromo },
    });
  } catch (err) {
    console.error("GET /api/notifications error:", err);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

/* ─── POST /api/notifications (Create + optionally send push) ─── */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      subject,
      body: notifBody,
      notification_type,
      r_user_id, // null = broadcast
      row_id,
      action_url,
      image_url,
      send_push,
    } = body;

    if (!subject || !notifBody) {
      return NextResponse.json({ error: "Subject and body are required" }, { status: 400 });
    }

    /* Create notification record */
    const notification = await prisma.notifications.create({
      data: {
        subject,
        body: notifBody,
        notification_type: notification_type || "general",
        r_user_id: r_user_id || null,
        row_id: row_id || null,
        action_url: action_url || null,
        image_url: image_url || null,
        created_by: 1,
        is_seen: 0,
      },
    });

    /* If broadcast → create users_notifications for all active users */
    if (!r_user_id) {
      const activeUsers = await prisma.users.findMany({
        where: { is_active: true },
        select: { id: true },
      });

      if (activeUsers.length > 0) {
        await prisma.users_notifications.createMany({
          data: activeUsers.map((u) => ({
            r_user_id: u.id,
            notification_id: notification.id,
            is_seen: 0,
          })),
        });
      }
    }

    /* If send_push → forward to backend for FCM delivery */
    if (send_push) {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
        if (r_user_id) {
          /* Single-user: look up FCM token and use raw send-push endpoint
             to avoid the backend creating a duplicate notification record */
          const user = await prisma.users.findUnique({
            where: { id: r_user_id },
            select: { mobile_token: true },
          });
          if (user?.mobile_token) {
            await fetch(`${backendUrl}/v3_0_0-notification/send-push`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fcm_token: user.mobile_token,
                title: subject,
                body: notifBody,
                data: {
                  notification_type: notification_type || "general",
                  target_id: row_id ? String(row_id) : "",
                  action_url: action_url || "",
                  image_url: image_url || "",
                },
              }),
            });
          }
        } else {
          await fetch(`${backendUrl}/v3_0_0-notification/send-push-to-topic`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              topic: "global",
              title: subject,
              body: notifBody,
              data: {
                notification_type: notification_type || "general",
                target_id: row_id ? String(row_id) : "",
                action_url: action_url || "",
                image_url: image_url || "",
              },
            }),
          });
        }
      } catch (pushErr) {
        console.error("Push send failed (notification still created):", pushErr);
      }
    }

    return NextResponse.json({ notification }, { status: 201 });
  } catch (err) {
    console.error("POST /api/notifications error:", err);
    return NextResponse.json({ error: "Failed to create notification" }, { status: 500 });
  }
}
