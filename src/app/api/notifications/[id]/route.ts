import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ORDER_STATUS_LABELS: Record<number, string> = {
  0: "Pending",
  1: "Confirmed",
  2: "Processing",
  3: "Shipped",
  4: "Delivered",
  5: "Cancelled",
  6: "Refunded",
  7: "Failed",
  8: "On Hold",
  9: "Pending",
};

/* ─── GET /api/notifications/[id] ─── */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const notifId = Number(id);
    if (!notifId) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const notification = await prisma.notifications.findUnique({
      where: { id: notifId },
    });
    if (!notification)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    /* ─ Parallel queries ─ */
    const [
      targetUser,
      recipientStats,
      recipients,
      relatedEntity,
    ] = await Promise.all([
      /* Target user (if single-user notification) */
      notification.r_user_id
        ? prisma.users.findUnique({
            where: { id: notification.r_user_id },
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
              phone_number: true,
              country_code: true,
              main_image: true,
              device_type: true,
              type: true,
              is_active: true,
              created_at: true,
            },
          })
        : null,

      /* Broadcast recipient stats */
      !notification.r_user_id
        ? prisma.users_notifications
            .groupBy({
              by: ["is_seen"],
              where: { notification_id: notifId },
              _count: { id: true },
            })
            .then((groups) => {
              const total = groups.reduce((s, g) => s + g._count.id, 0);
              const seen =
                groups.find((g) => g.is_seen === 1)?._count.id || 0;
              return { total, seen, unseen: total - seen };
            })
        : null,

      /* Broadcast recipients (first 50) */
      !notification.r_user_id
        ? prisma.users_notifications.findMany({
            where: { notification_id: notifId },
            take: 50,
            orderBy: { id: "desc" },
          })
        : null,

      /* Related entity details based on notification_type */
      getRelatedEntity(notification.notification_type, notification.row_id),
    ]);

    /* Fetch user info for broadcast recipients */
    let recipientUsers: Array<{
      id: number;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
      main_image: string | null;
      is_seen: number;
    }> = [];
    if (recipients && recipients.length > 0) {
      const rUserIds = recipients.map((r) => r.r_user_id);
      const rUsers = await prisma.users.findMany({
        where: { id: { in: rUserIds } },
        select: { id: true, first_name: true, last_name: true, email: true, main_image: true },
      });
      const rUserMap = new Map(rUsers.map((u) => [u.id, u]));
      recipientUsers = recipients.map((r) => ({
        ...(rUserMap.get(r.r_user_id) || {
          id: r.r_user_id,
          first_name: null,
          last_name: null,
          email: null,
          main_image: null,
        }),
        is_seen: r.is_seen,
      }));
    }

    return NextResponse.json({
      notification,
      target_user: targetUser,
      recipient_stats: recipientStats,
      recipients: recipientUsers,
      related_entity: relatedEntity,
    });
  } catch (err) {
    console.error("GET /api/notifications/[id] error:", err);
    return NextResponse.json({ error: "Failed to fetch notification" }, { status: 500 });
  }
}

/* ─── DELETE /api/notifications/[id] ─── */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const notifId = Number(id);
    if (!notifId) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    /* Delete users_notifications first, then notification */
    await prisma.users_notifications.deleteMany({
      where: { notification_id: notifId },
    });
    await prisma.notifications.delete({ where: { id: notifId } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/notifications/[id] error:", err);
    return NextResponse.json({ error: "Failed to delete notification" }, { status: 500 });
  }
}

/* ─── Helper: fetch related entity ─── */
async function getRelatedEntity(
  type: string | null,
  rowId: number | null
): Promise<Record<string, unknown> | null> {
  if (!type || !rowId) return null;

  try {
    switch (type) {
      case "order":
      case "shipping": {
        const order = await prisma.orders.findUnique({
          where: { id: rowId },
          select: {
            id: true,
            r_user_id: true,
            total: true,
            status: true,
            payment_type: true,
            is_paid: true,
            created_at: true,
            address_first_name: true,
            address_last_name: true,
            country: true,
            city: true,
          },
        });
        if (!order) return null;
        return {
          type: "order",
          data: {
            ...order,
            status_label: ORDER_STATUS_LABELS[Number(order.status)] || `Status ${order.status}`,
          },
        };
      }
      case "product": {
        const product = await prisma.product.findUnique({
          where: { id: rowId },
          select: {
            id: true,
            product_name: true,
            product_price: true,
            main_image: true,
            product_code: true,
            show_on_website: true,
          },
        });
        if (!product) return null;
        return { type: "product", data: product };
      }
      case "category": {
        const category = await prisma.category.findUnique({
          where: { id: rowId },
          select: {
            id: true,
            category_name: true,
            main_image: true,
            product_count: true,
            level: true,
          },
        });
        if (!category) return null;
        return { type: "category", data: category };
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}
