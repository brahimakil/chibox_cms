# RBAC + Order Item Master List — Database Changes (Deep Plan)

## 1) What was verified in your current system

From deep scan of **CMS (`chihelo_new_cms`) + backend (`chihelo-backendfolder`)**:

- CMS auth logs in against `ag_users` and stores JWT session.
- CMS currently does **not enforce role permissions**; it only reads `ag_users.user_role`.
- Existing legacy ACL tables already exist: `ag_user_groups`, `ag_roles`, `ag_actions`, `ag_navs_permission`.
- Orders/item data already exists and is rich enough for your required list view:
  - `orders`
  - `order_products` (has `product_name`, `main_image`, `quantity`, `tracking_number`, `r_order_id`)
  - `product_1688_info` (has `shop_url` supplier link)
- Current status logic in CMS uses old numeric order constants (`9,1,2,10,3,4,5,6,7,8`).

So we can introduce RBAC + your warehouse workflow **without breaking existing data** by adding workflow tables and permissions tables, then wiring backend later.

---

## 2) Target roles and behavior (as DB design baseline)

Roles:
1. `buyer`
2. `china_warehouse`
3. `lebanon_warehouse`
4. `super_admin`

Workflow statuses (your requested 7):
1. `processing`
2. `ordered`
3. `shipped_to_wh`
4. `received_to_wh`
5. `shipped_to_leb`
6. `received_to_leb`
7. `delivered_to_customer`

UI permission rules stored in DB:
- **All roles** can access Product Item Master List.
- **Only `lebanon_warehouse` + `super_admin`** can access full current orders page.
- Per-user override supported for special case (user id 3).

---

## 3) SQL changes to run in DBeaver

> Run in order. All SQL is MySQL-compatible.

### 3.1 Create RBAC tables (CMS-specific)

```sql
CREATE TABLE IF NOT EXISTS cms_roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role_key VARCHAR(64) NOT NULL UNIQUE,
  role_name VARCHAR(120) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cms_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  permission_key VARCHAR(120) NOT NULL UNIQUE,
  permission_name VARCHAR(180) NOT NULL,
  permission_scope ENUM('page','api','action','workflow') NOT NULL DEFAULT 'action',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cms_role_permissions (
  role_id INT NOT NULL,
  permission_id INT NOT NULL,
  allowed TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_cms_role_permissions_role
    FOREIGN KEY (role_id) REFERENCES cms_roles(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_cms_role_permissions_permission
    FOREIGN KEY (permission_id) REFERENCES cms_permissions(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS cms_user_roles (
  user_id INT NOT NULL,
  role_id INT NOT NULL,
  is_primary TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id),
  KEY idx_cms_user_roles_user (user_id),
  KEY idx_cms_user_roles_role (role_id),
  CONSTRAINT fk_cms_user_roles_role
    FOREIGN KEY (role_id) REFERENCES cms_roles(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS cms_user_permission_overrides (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  permission_key VARCHAR(120) NOT NULL,
  allowed TINYINT(1) NOT NULL,
  reason VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cms_user_permission_override (user_id, permission_key)
);
```

### 3.2 Create workflow/status tables for order items

```sql
CREATE TABLE IF NOT EXISTS cms_order_item_statuses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  status_key VARCHAR(64) NOT NULL UNIQUE,
  status_label VARCHAR(120) NOT NULL,
  status_order INT NOT NULL,
  customer_bucket ENUM('processing','shipped','delivered') NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cms_order_item_status_transitions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  from_status_id INT NOT NULL,
  to_status_id INT NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cms_order_item_transition (from_status_id, to_status_id),
  CONSTRAINT fk_cms_transition_from
    FOREIGN KEY (from_status_id) REFERENCES cms_order_item_statuses(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_cms_transition_to
    FOREIGN KEY (to_status_id) REFERENCES cms_order_item_statuses(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS cms_role_item_transition_permissions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  role_id INT NOT NULL,
  from_status_id INT NOT NULL,
  to_status_id INT NOT NULL,
  can_transition TINYINT(1) NOT NULL DEFAULT 1,
  requires_tracking_number TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cms_role_transition (role_id, from_status_id, to_status_id),
  CONSTRAINT fk_cms_role_transition_role
    FOREIGN KEY (role_id) REFERENCES cms_roles(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_cms_role_transition_from
    FOREIGN KEY (from_status_id) REFERENCES cms_order_item_statuses(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_cms_role_transition_to
    FOREIGN KEY (to_status_id) REFERENCES cms_order_item_statuses(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS order_product_status_history (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_product_id INT NOT NULL,
  order_id INT NOT NULL,
  from_status_id INT NULL,
  to_status_id INT NOT NULL,
  changed_by_user_id INT NULL,
  tracking_number_snapshot VARCHAR(255) NULL,
  note TEXT NULL,
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ops_history_order_product (order_product_id),
  KEY idx_ops_history_order (order_id),
  KEY idx_ops_history_changed_at (changed_at)
);
```

### 3.3 Add workflow fields to existing order tables (non-breaking)

```sql
ALTER TABLE order_products
  ADD COLUMN workflow_status_id INT NULL AFTER status,
  ADD COLUMN workflow_status_updated_at DATETIME NULL AFTER workflow_status_id,
  ADD COLUMN workflow_status_updated_by INT NULL AFTER workflow_status_updated_at,
  ADD KEY idx_order_products_workflow_status (workflow_status_id);

ALTER TABLE orders
  ADD COLUMN workflow_status_id INT NULL AFTER status,
  ADD KEY idx_orders_workflow_status (workflow_status_id);
```

### 3.4 Seed roles

```sql
INSERT INTO cms_roles (role_key, role_name)
VALUES
  ('buyer', 'Buyer'),
  ('china_warehouse', 'China Warehouse'),
  ('lebanon_warehouse', 'Lebanon Warehouse'),
  ('super_admin', 'Super Admin')
ON DUPLICATE KEY UPDATE
  role_name = VALUES(role_name),
  is_active = 1,
  updated_at = CURRENT_TIMESTAMP;
```

### 3.5 Seed permissions

```sql
INSERT INTO cms_permissions (permission_key, permission_name, permission_scope)
VALUES
  ('orders.page.full_access', 'Access full orders page', 'page'),
  ('orders.item_master_list.view', 'View order item master list', 'page'),
  ('orders.item_master_list.group_by_order', 'Group item list by order', 'action'),
  ('orders.item.status.change', 'Change item workflow status', 'workflow'),
  ('orders.item.tracking.update', 'Update item tracking number', 'action')
ON DUPLICATE KEY UPDATE
  permission_name = VALUES(permission_name),
  permission_scope = VALUES(permission_scope);
```

### 3.6 Assign base page permissions per role

```sql
-- Give all roles access to item master list
INSERT INTO cms_role_permissions (role_id, permission_id, allowed)
SELECT r.id, p.id, 1
FROM cms_roles r
JOIN cms_permissions p ON p.permission_key = 'orders.item_master_list.view'
ON DUPLICATE KEY UPDATE allowed = VALUES(allowed);

-- Give all roles ability to group list by order
INSERT INTO cms_role_permissions (role_id, permission_id, allowed)
SELECT r.id, p.id, 1
FROM cms_roles r
JOIN cms_permissions p ON p.permission_key = 'orders.item_master_list.group_by_order'
ON DUPLICATE KEY UPDATE allowed = VALUES(allowed);

-- Full orders page only for lebanon_warehouse + super_admin
INSERT INTO cms_role_permissions (role_id, permission_id, allowed)
SELECT r.id, p.id,
       CASE WHEN r.role_key IN ('lebanon_warehouse','super_admin') THEN 1 ELSE 0 END
FROM cms_roles r
JOIN cms_permissions p ON p.permission_key = 'orders.page.full_access'
ON DUPLICATE KEY UPDATE allowed = VALUES(allowed);

-- Status change + tracking update for operational roles and super_admin
INSERT INTO cms_role_permissions (role_id, permission_id, allowed)
SELECT r.id, p.id,
       CASE WHEN r.role_key IN ('buyer','china_warehouse','lebanon_warehouse','super_admin') THEN 1 ELSE 0 END
FROM cms_roles r
JOIN cms_permissions p ON p.permission_key IN ('orders.item.status.change', 'orders.item.tracking.update')
ON DUPLICATE KEY UPDATE allowed = VALUES(allowed);
```

### 3.7 Seed the 7 workflow statuses

```sql
INSERT INTO cms_order_item_statuses (status_key, status_label, status_order, customer_bucket)
VALUES
  ('processing', 'Processing', 1, 'processing'),
  ('ordered', 'Ordered', 2, 'processing'),
  ('shipped_to_wh', 'Shipped to WH', 3, 'processing'),
  ('received_to_wh', 'Received to WH', 4, 'processing'),
  ('shipped_to_leb', 'Shipped to LEB', 5, 'shipped'),
  ('received_to_leb', 'Received to LEB', 6, 'shipped'),
  ('delivered_to_customer', 'Delivered to Customer', 7, 'delivered')
ON DUPLICATE KEY UPDATE
  status_label = VALUES(status_label),
  status_order = VALUES(status_order),
  customer_bucket = VALUES(customer_bucket),
  is_active = 1;
```

### 3.8 Seed allowed global transitions

```sql
INSERT INTO cms_order_item_status_transitions (from_status_id, to_status_id, is_active)
SELECT s1.id, s2.id, 1
FROM cms_order_item_statuses s1
JOIN cms_order_item_statuses s2
  ON (
      (s1.status_key = 'processing' AND s2.status_key = 'ordered') OR
      (s1.status_key = 'ordered' AND s2.status_key = 'shipped_to_wh') OR
      (s1.status_key = 'shipped_to_wh' AND s2.status_key = 'received_to_wh') OR
      (s1.status_key = 'received_to_wh' AND s2.status_key = 'shipped_to_leb') OR
      (s1.status_key = 'shipped_to_leb' AND s2.status_key = 'received_to_leb') OR
      (s1.status_key = 'received_to_leb' AND s2.status_key = 'delivered_to_customer')
  )
ON DUPLICATE KEY UPDATE is_active = 1;
```

### 3.9 Seed role-specific transition permissions

```sql
-- Buyer: processing->ordered, ordered->shipped_to_wh (tracking required on shipped_to_wh)
INSERT INTO cms_role_item_transition_permissions
(role_id, from_status_id, to_status_id, can_transition, requires_tracking_number)
SELECT r.id, fs.id, ts.id, 1,
       CASE WHEN ts.status_key = 'shipped_to_wh' THEN 1 ELSE 0 END
FROM cms_roles r
JOIN cms_order_item_statuses fs ON fs.status_key IN ('processing','ordered')
JOIN cms_order_item_statuses ts
  ON ( (fs.status_key='processing' AND ts.status_key='ordered')
    OR (fs.status_key='ordered' AND ts.status_key='shipped_to_wh') )
WHERE r.role_key = 'buyer'
ON DUPLICATE KEY UPDATE
  can_transition = VALUES(can_transition),
  requires_tracking_number = VALUES(requires_tracking_number);

-- China warehouse: shipped_to_wh->received_to_wh, received_to_wh->shipped_to_leb
INSERT INTO cms_role_item_transition_permissions
(role_id, from_status_id, to_status_id, can_transition, requires_tracking_number)
SELECT r.id, fs.id, ts.id, 1, 0
FROM cms_roles r
JOIN cms_order_item_statuses fs ON fs.status_key IN ('shipped_to_wh','received_to_wh')
JOIN cms_order_item_statuses ts
  ON ( (fs.status_key='shipped_to_wh' AND ts.status_key='received_to_wh')
    OR (fs.status_key='received_to_wh' AND ts.status_key='shipped_to_leb') )
WHERE r.role_key = 'china_warehouse'
ON DUPLICATE KEY UPDATE can_transition = VALUES(can_transition);

-- Lebanon warehouse: shipped_to_leb->received_to_leb, received_to_leb->delivered_to_customer
INSERT INTO cms_role_item_transition_permissions
(role_id, from_status_id, to_status_id, can_transition, requires_tracking_number)
SELECT r.id, fs.id, ts.id, 1, 0
FROM cms_roles r
JOIN cms_order_item_statuses fs ON fs.status_key IN ('shipped_to_leb','received_to_leb')
JOIN cms_order_item_statuses ts
  ON ( (fs.status_key='shipped_to_leb' AND ts.status_key='received_to_leb')
    OR (fs.status_key='received_to_leb' AND ts.status_key='delivered_to_customer') )
WHERE r.role_key = 'lebanon_warehouse'
ON DUPLICATE KEY UPDATE can_transition = VALUES(can_transition);

-- Super admin: all active transitions
INSERT INTO cms_role_item_transition_permissions
(role_id, from_status_id, to_status_id, can_transition, requires_tracking_number)
SELECT r.id, t.from_status_id, t.to_status_id, 1, 0
FROM cms_roles r
JOIN cms_order_item_status_transitions t ON t.is_active = 1
WHERE r.role_key = 'super_admin'
ON DUPLICATE KEY UPDATE can_transition = VALUES(can_transition);
```

### 3.10 Map existing CMS users into new RBAC table

> This does not touch existing `ag_users.user_role`; it adds mapping for new CMS RBAC.

```sql
INSERT INTO cms_user_roles (user_id, role_id, is_primary)
SELECT u.user_id,
       r.id,
       1
FROM ag_users u
JOIN cms_roles r
  ON (
      (u.user_role = 1 AND r.role_key = 'super_admin') OR
      (u.user_role = 2 AND r.role_key = 'buyer') OR
      (u.user_role = 3 AND r.role_key = 'china_warehouse') OR
      (u.user_role = 4 AND r.role_key = 'lebanon_warehouse')
     )
ON DUPLICATE KEY UPDATE
  role_id = VALUES(role_id),
  is_primary = 1,
  updated_at = CURRENT_TIMESTAMP;
```

### 3.11 Special per-user override for user 3

```sql
INSERT INTO cms_user_permission_overrides (user_id, permission_key, allowed, reason)
VALUES (3, 'orders.page.full_access', 1, 'Requested special access to full orders page')
ON DUPLICATE KEY UPDATE
  allowed = VALUES(allowed),
  reason = VALUES(reason),
  updated_at = CURRENT_TIMESTAMP;
```

### 3.12 Backfill workflow status from current `order_products.status`

> Safe starter mapping until backend logic is switched.

```sql
UPDATE order_products op
JOIN cms_order_item_statuses s
  ON (
      (op.status IN (9,1,2) AND s.status_key = 'processing') OR
      (op.status = 10 AND s.status_key = 'ordered') OR
      (op.status = 3 AND s.status_key = 'shipped_to_leb') OR
      (op.status = 4 AND s.status_key = 'delivered_to_customer')
     )
SET op.workflow_status_id = s.id,
    op.workflow_status_updated_at = NOW()
WHERE op.workflow_status_id IS NULL;
```

### 3.13 Master Item List view (critical requirement)

```sql
CREATE OR REPLACE VIEW v_cms_order_item_master_list AS
SELECT
  op.id AS order_item_id,
  op.r_order_id AS main_order_id,
  op.r_product_id AS product_id,
  op.product_name,
  COALESCE(op.variation_image, op.main_image) AS image_url,
  op.quantity,
  p1688.shop_url AS supplier_link,
  op.tracking_number,
  ws.status_key AS workflow_status_key,
  ws.status_label AS workflow_status_label,
  ws.status_order AS workflow_status_order,
  o.created_at AS order_created_at
FROM order_products op
JOIN orders o ON o.id = op.r_order_id
LEFT JOIN product_1688_info p1688 ON p1688.product_id = op.r_product_id
LEFT JOIN cms_order_item_statuses ws ON ws.id = op.workflow_status_id;
```

---

## 4) Why these DB changes are enough for your requested UX

- Your critical table/list requirement is covered by `v_cms_order_item_master_list`.
- Grouping by order in UI is supported by `main_order_id` + `workflow_status_order` sorting.
- Role access to list vs full order page is controlled by `cms_permissions` + `cms_role_permissions` + per-user override.
- Role-based status transitions are fully configurable in DB (no hardcode needed later).
- Item status audit trail is ready via `order_product_status_history`.

---

## 5) Recommended validations right after SQL

```sql
-- Roles seeded?
SELECT * FROM cms_roles;

-- Permissions matrix?
SELECT r.role_key, p.permission_key, rp.allowed
FROM cms_role_permissions rp
JOIN cms_roles r ON r.id = rp.role_id
JOIN cms_permissions p ON p.id = rp.permission_id
ORDER BY r.role_key, p.permission_key;

-- Transition permissions?
SELECT r.role_key, fs.status_key AS from_status, ts.status_key AS to_status, tp.requires_tracking_number
FROM cms_role_item_transition_permissions tp
JOIN cms_roles r ON r.id = tp.role_id
JOIN cms_order_item_statuses fs ON fs.id = tp.from_status_id
JOIN cms_order_item_statuses ts ON ts.id = tp.to_status_id
ORDER BY r.role_key, fs.status_order;

-- Master list works?
SELECT * FROM v_cms_order_item_master_list ORDER BY main_order_id DESC, order_item_id ASC LIMIT 100;
```

---

## 6) Open confirmations before backend coding (important)

1. Confirm final mapping of old `ag_users.user_role` values to new roles (I assumed 1=super_admin, 2=buyer, 3=china_warehouse, 4=lebanon_warehouse).
2. Confirm if **only user id 3** needs special full-orders-page access, or this should be role-level for all `lebanon_warehouse` users.
3. Confirm if cancelled/refunded items should remain outside the new 7-step workflow or if you want extra statuses added.

Once you confirm these 3 points, backend implementation can start immediately with no DB redesign.
