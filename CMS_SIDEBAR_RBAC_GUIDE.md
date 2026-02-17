# CMS Sidebar & RBAC Implementation Guide

> **Purpose**: This document describes how the CMS sidebar navigation is permission-gated and how to **correctly add a new page/route** with RBAC protection. Follow all 4 steps — skipping any will leave the page either invisible or unprotected.

---

## Architecture Overview

The RBAC system has **3 layers** of enforcement:

| Layer | File(s) | What it does |
|-------|---------|-------------|
| **Database** | `cms_permissions`, `cms_role_permissions` tables | Stores permissions and role→permission assignments |
| **Sidebar (client)** | `src/components/layout/sidebar.tsx`, `src/components/layout/mobile-sidebar.tsx` | Filters nav items based on the user's `permissions[]` from `/api/auth/me` |
| **Middleware (server)** | `src/middleware.ts` → `ROUTE_PERMISSIONS` map | Blocks direct URL access if user lacks the permission (redirects to `/dashboard`) |

### How permission filtering works (sidebar)

```ts
// Both sidebar.tsx and mobile-sidebar.tsx use this pattern:
const filteredNavigation = navigation
  .map((group) => ({
    ...group,
    items: group.items.filter(
      (item) => !item.permission || permissions.includes(item.permission)
    ),
  }))
  .filter((group) => group.items.length > 0);
```

**Key rule**: If `permission` is `null`, the item is **always visible** to every role. Every item MUST have a non-null permission string.

### How the JWT session works

When a user logs in, their permissions are baked into the JWT cookie (`cms_session`). The middleware reads these permissions server-side without a DB call. **Users must re-login** after permission changes to get an updated JWT.

---

## Current Roles & Their Permissions

| Role | `role_key` | Permissions |
|------|-----------|-------------|
| Super Admin | `super_admin` | **ALL** permissions (auto-granted via cross-join) |
| Lebanon Warehouse | `lebanon_warehouse` | `page.dashboard`, `page.orders`, `page.orders.item_master_list`, workflow actions |
| China Warehouse | `china_warehouse` | `page.orders.item_master_list`, workflow actions |
| Buyer | `buyer` | `page.orders.item_master_list`, workflow actions |

---

## How to Add a New Sidebar Route (Step-by-Step)

### Step 1: Create the permission in the database

```sql
-- Replace 'page.your_feature' with your permission key
-- Convention: page.{feature_name} for page access, action.{resource}.{verb} for actions
INSERT INTO cms_permissions (permission_key, permission_name, permission_scope)
VALUES ('page.your_feature', 'Access Your Feature page', 'page')
ON DUPLICATE KEY UPDATE
  permission_name = VALUES(permission_name),
  permission_scope = VALUES(permission_scope);
```

### Step 2: Assign the permission to the appropriate role(s)

```sql
-- For super_admin only:
INSERT INTO cms_role_permissions (role_id, permission_id, allowed)
SELECT r.id, p.id, 1
FROM cms_roles r
JOIN cms_permissions p ON p.permission_key = 'page.your_feature'
WHERE r.role_key = 'super_admin'
ON DUPLICATE KEY UPDATE allowed = 1;

-- For multiple roles (e.g. super_admin + lebanon_warehouse):
INSERT INTO cms_role_permissions (role_id, permission_id, allowed)
SELECT r.id, p.id, 1
FROM cms_roles r
JOIN cms_permissions p ON p.permission_key = 'page.your_feature'
WHERE r.role_key IN ('super_admin', 'lebanon_warehouse')
ON DUPLICATE KEY UPDATE allowed = 1;
```

> **Note**: `super_admin` already has a cross-join grant (`SELECT r.id, p.id, 1 FROM cms_roles r JOIN cms_permissions p ON 1=1 WHERE r.role_key = 'super_admin'`) in `RBAC_FINAL_SQL.sql`, so any newly inserted permission is auto-granted to super_admin. However, for safety and clarity, always explicitly assign it as shown above.

### Step 3: Add the item to both sidebar navigation arrays

**File: `src/components/layout/sidebar.tsx`**

Find the appropriate group (Main, Marketing, People, Communication, AI Features) or create a new one. Add:

```ts
{
  title: "Your Feature",
  href: "/dashboard/your-feature",
  icon: SomeIcon,                    // from lucide-react
  permission: "page.your_feature",   // MUST match the DB permission_key
},
```

**File: `src/components/layout/mobile-sidebar.tsx`**

Add the identical entry in the same group:

```ts
{ title: "Your Feature", href: "/dashboard/your-feature", icon: SomeIcon, permission: "page.your_feature" },
```

> **CRITICAL**: The `permission` field must **never be `null`** unless the page should be visible to every authenticated user regardless of role.

### Step 4: Add middleware route protection

**File: `src/middleware.ts`**

Add the route to the `ROUTE_PERMISSIONS` map:

```ts
const ROUTE_PERMISSIONS: Record<string, string> = {
  "/dashboard/tryon-prompts": "page.tryon_prompts",
  "/dashboard/your-feature": "page.your_feature",   // ← add this
};
```

This prevents users from accessing the page by typing the URL directly, even if the sidebar item is hidden.

---

## DB Schema Reference

### `cms_permissions`
| Column | Type | Notes |
|--------|------|-------|
| `id` | int (PK, auto-inc) | |
| `permission_key` | varchar, unique | e.g. `page.products`, `action.orders.item.cancel` |
| `permission_name` | varchar | Human-readable label |
| `permission_scope` | varchar | `page`, `action`, or `workflow` |

### `cms_role_permissions`
| Column | Type | Notes |
|--------|------|-------|
| `id` | int (PK, auto-inc) | |
| `role_id` | int (FK → `cms_roles.id`) | |
| `permission_id` | int (FK → `cms_permissions.id`) | |
| `allowed` | tinyint | `1` = granted |

### `cms_roles`
| Column | Type | Notes |
|--------|------|-------|
| `id` | int (PK, auto-inc) | |
| `role_key` | varchar, unique | `super_admin`, `buyer`, `china_warehouse`, `lebanon_warehouse` |
| `role_name` | varchar | Display name |

---

## Existing Permission Keys

| Permission Key | Description |
|---------------|-------------|
| `page.dashboard` | Access Dashboard |
| `page.orders` | Access full orders page |
| `page.orders.item_master_list` | View order item master list |
| `page.products` | Access products page |
| `page.categories` | Access categories page |
| `page.banners` | Access banners page |
| `page.splash_ads` | Access splash ads page |
| `page.coupons` | Access coupons page |
| `page.flash_sales` | Access flash sales page |
| `page.customers` | Access customers page |
| `page.cms_users` | Access CMS users page |
| `page.notifications` | Access notifications page |
| `page.tryon_prompts` | Access AI Try-On prompts page |
| `action.orders.item.status.change` | Change item workflow status |
| `action.orders.item.tracking` | Update item tracking number |
| `action.orders.item.cancel` | Cancel an order item |
| `action.orders.item.refund` | Refund an order item |

---

## Checklist for New Route

- [ ] Permission key inserted into `cms_permissions` table
- [ ] Permission assigned to correct role(s) in `cms_role_permissions`
- [ ] Item added to `navigation` array in `sidebar.tsx` with correct `permission` string
- [ ] Item added to `navigation` array in `mobile-sidebar.tsx` with same `permission` string
- [ ] Route added to `ROUTE_PERMISSIONS` in `middleware.ts`
- [ ] Icon imported from `lucide-react` in both sidebar files
- [ ] Page component created at `src/app/dashboard/your-feature/page.tsx`
- [ ] Tested with super_admin (should see it) and non-admin role (should NOT see it)
- [ ] Users re-logged-in to refresh JWT after permission changes
