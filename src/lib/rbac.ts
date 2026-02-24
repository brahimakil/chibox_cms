import { prisma } from "./prisma";

/**
 * Fetch the user's primary role + merged permissions (role perms + user overrides).
 * Returns { roleKey, roleName, permissions[] } ready for JWT.
 */
export async function getUserRoleAndPermissions(userId: number) {
  // 1. Get the user's primary role
  const userRole = await prisma.cms_user_roles.findFirst({
    where: { user_id: userId, is_primary: true },
  });

  if (!userRole) {
    // Fallback: no RBAC row yet — treat as no permissions
    return { roleKey: "none", roleName: "No Role", permissions: [] as string[] };
  }

  const role = await prisma.cms_roles.findUnique({
    where: { id: userRole.role_id },
  });

  if (!role || !role.is_active) {
    return { roleKey: "none", roleName: "No Role", permissions: [] as string[] };
  }

  // 2. Get role-level permissions (allowed = 1)
  const rolePerms = await prisma.cms_role_permissions.findMany({
    where: { role_id: role.id, allowed: true },
  });
  const permIds = rolePerms.map((rp) => rp.permission_id);

  const permissions = permIds.length
    ? await prisma.cms_permissions.findMany({
        where: { id: { in: permIds } },
        select: { permission_key: true },
      })
    : [];

  const permSet = new Set(permissions.map((p) => p.permission_key));

  // 3. Apply per-user overrides
  const overrides = await prisma.cms_user_permission_overrides.findMany({
    where: { user_id: userId },
  });

  for (const ov of overrides) {
    if (ov.allowed === 1) {
      permSet.add(ov.permission_key);
    } else {
      permSet.delete(ov.permission_key);
    }
  }

  return {
    roleKey: role.role_key,
    roleName: role.role_name,
    permissions: Array.from(permSet),
  };
}

/**
 * Check if a session has a specific permission.
 */
export function hasPermission(
  permissions: string[],
  permissionKey: string
): boolean {
  return permissions.includes(permissionKey);
}

/**
 * Check if a session has any of the given permissions.
 */
export function hasAnyPermission(
  permissions: string[],
  permissionKeys: string[]
): boolean {
  return permissionKeys.some((key) => permissions.includes(key));
}

/**
 * Get the allowed workflow transitions for a role on a specific item's current status.
 * Returns list of { toStatusId, toStatusKey, toStatusLabel, requiresTracking }
 */
export async function getAllowedTransitions(roleKey: string, currentStatusId: number) {
  const role = await prisma.cms_roles.findFirst({
    where: { role_key: roleKey, is_active: true },
  });
  if (!role) return [];

  const transitions = await prisma.cms_role_item_transition_permissions.findMany({
    where: {
      role_id: role.id,
      from_status_id: currentStatusId,
      can_transition: true,
    },
  });

  if (!transitions.length) return [];

  const toStatusIds = transitions.map((t) => t.to_status_id);
  const statuses = await prisma.cms_order_item_statuses.findMany({
    where: { id: { in: toStatusIds }, is_active: true },
  });

  const statusMap = new Map(statuses.map((s) => [s.id, s]));

  return transitions
    .filter((t) => statusMap.has(t.to_status_id))
    .map((t) => {
      const s = statusMap.get(t.to_status_id)!;
      return {
        toStatusId: s.id,
        toStatusKey: s.status_key,
        toStatusLabel: s.status_label,
        isTerminal: s.is_terminal === true,
        requiresTracking: !!t.requires_tracking_number,
      };
    });
}

/**
 * After an item status change, check if the whole order should auto-update.
 * Logic:
 *   - If ALL items are cancelled → order status = 5 (cancelled)
 *   - If ALL items are refunded → order status = 6 (refunded)
 *   - If ALL items are terminal (mix of cancelled + refunded) → order status = 5 (cancelled)
 *   - Otherwise: derive order workflow_status from the lowest non-terminal item workflow
 */
export async function deriveOrderStatusFromItems(orderId: number) {
  const items = await prisma.order_products.findMany({
    where: { r_order_id: orderId },
    select: { workflow_status_id: true },
  });

  if (!items.length) return null;

  const statusIds = items
    .map((i) => i.workflow_status_id)
    .filter((id): id is number => id !== null);

  if (!statusIds.length) return null;

  const statuses = await prisma.cms_order_item_statuses.findMany({
    where: { id: { in: statusIds } },
  });
  const statusMap = new Map(statuses.map((s) => [s.id, s]));

  const allTerminal = items.every((i) => {
    const s = i.workflow_status_id ? statusMap.get(i.workflow_status_id) : null;
    return s && s.is_terminal === true;
  });

  if (allTerminal) {
    // Check if all cancelled, all refunded, or mixed
    const allCancelled = items.every((i) => {
      const s = i.workflow_status_id ? statusMap.get(i.workflow_status_id) : null;
      return s?.status_key === "cancelled";
    });
    const allRefunded = items.every((i) => {
      const s = i.workflow_status_id ? statusMap.get(i.workflow_status_id) : null;
      return s?.status_key === "refunded";
    });

    if (allRefunded) {
      // Set order status to 6 (refunded) — tracking uses workflow status_order 91
      await prisma.orders.update({
        where: { id: orderId },
        data: { status: 6, updated_at: new Date() },
      });
      await prisma.order_tracking.create({
        data: { r_order_id: orderId, r_status_id: 91, track_date: new Date() },
      });
      return 6;
    } else {
      // All cancelled, or mix of cancelled+refunded → cancelled
      // tracking uses workflow status_order 90
      await prisma.orders.update({
        where: { id: orderId },
        data: { status: allCancelled ? 5 : 5, updated_at: new Date() },
      });
      await prisma.order_tracking.create({
        data: { r_order_id: orderId, r_status_id: 90, track_date: new Date() },
      });
      return 5;
    }
  }

  // Not all terminal — find the lowest non-terminal item workflow status
  const nonTerminalItems = items.filter((i) => {
    const s = i.workflow_status_id ? statusMap.get(i.workflow_status_id) : null;
    return s && !s.is_terminal;
  });

  if (!nonTerminalItems.length) return null;

  const lowestStatus = nonTerminalItems.reduce((lowest, item) => {
    const s = statusMap.get(item.workflow_status_id!);
    const l = statusMap.get(lowest.workflow_status_id!);
    if (!s || !l) return lowest;
    return s.status_order < l.status_order ? item : lowest;
  });

  const lowestWs = statusMap.get(lowestStatus.workflow_status_id!);
  if (lowestWs) {
    await prisma.orders.update({
      where: { id: orderId },
      data: { workflow_status_id: lowestWs.id, updated_at: new Date() },
    });

    // Create order_tracking entry so the timeline reflects the current state
    await prisma.order_tracking.create({
      data: {
        r_order_id: orderId,
        r_status_id: lowestWs.status_order,
        track_date: new Date(),
      },
    });
  }

  return null; // no legacy status change needed
}
