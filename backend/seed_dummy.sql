-- =====================================================================
-- DUMMY DATA SEED SCRIPT
-- =====================================================================
-- Run this in pgAdmin:
--   1. Open your inventory_db database
--   2. Right-click → Query Tool
--   3. Paste this entire file
--   4. Press F5 (or the ▶ Run button)
--
-- This script is SAFE TO RUN REPEATEDLY:
--   - It uses ON CONFLICT DO NOTHING, so rows that already exist are
--     skipped (no duplicate-key errors, no overwriting your data).
--   - It respects foreign-key order: referenced rows are inserted first.
--
-- Login accounts created (for when we build authentication):
--   admin@inventory.com   / admin123     (role: admin)
--   manager@inventory.com / manager123   (role: manager)
--   staff@inventory.com   / staff123     (role: staff)
-- =====================================================================

-- ── 1. Roles ──────────────────────────────────────────────────────
-- Roles come FIRST because users.role_id points here.
INSERT INTO roles (id, name, description) VALUES
  (1, 'admin',   'Full system access'),
  (2, 'manager', 'Can manage inventory and purchase orders'),
  (3, 'staff',   'Can view and receive stock')
ON CONFLICT (id) DO NOTHING;

-- ── 2. Users ──────────────────────────────────────────────────────
-- The password_hash values below are bcrypt hashes of the plain-text
-- passwords shown next to each email. We never store plain passwords.
INSERT INTO users (id, username, email, password_hash, role_id, created_at, updated_at) VALUES
  (1, 'admin',   'admin@inventory.com',
   '$2b$12$ilhOE88TigG9ENKiO81Qre7B3DL05Yghz9MlLGUJnic7bOcM/jWLO', 1, NOW(), NOW()),
  (2, 'manager', 'manager@inventory.com',
   '$2b$12$ozjAun.jtyEgOq89Rkcdxuj0rAN10gsNe3gTcyO1i2mJ4O/kBTOx.', 2, NOW(), NOW()),
  (3, 'staff',   'staff@inventory.com',
   '$2b$12$pNc0JctuYYHPFgaFc0W9J.Am6sBE9qA8X5t.5F8Y5Q09Hva9SWGsu', 3, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ── 3. Categories ─────────────────────────────────────────────────
-- No foreign keys of its own; products point here.
INSERT INTO categories (id, name, description, created_at) VALUES
  (1, 'Electronics',   'Phones, computers, and accessories', NOW()),
  (2, 'Furniture',     'Office and warehouse furniture',     NOW()),
  (3, 'Office Supplies','Stationery and consumables',         NOW()),
  (4, 'Packaging',     'Boxes, tape, shipping materials',     NOW()),
  (5, 'Tools',         'Hand tools and power tools',          NOW())
ON CONFLICT (id) DO NOTHING;

-- ── 4. Warehouses ─────────────────────────────────────────────────
INSERT INTO warehouses (id, name, location, created_at) VALUES
  (1, 'Bangalore Central', 'Bangalore, Karnataka', NOW()),
  (2, 'Mumbai Hub',        'Mumbai, Maharashtra',  NOW()),
  (3, 'Delhi North',       'New Delhi',            NOW())
ON CONFLICT (id) DO NOTHING;

-- ── 5. Suppliers ──────────────────────────────────────────────────
INSERT INTO suppliers (id, name, email, phone, address, created_at, updated_at) VALUES
  (1, 'TechDist Pvt Ltd',   'sales@techdist.in',  '+91-98765-43210',
   'Electronic City, Bangalore', NOW(), NOW()),
  (2, 'OfficePro Supplies', 'orders@officepro.in','+91-98765-11111',
   'Andheri East, Mumbai',      NOW(), NOW()),
  (3, 'PackMate Industries','info@packmate.in',   '+91-98765-22222',
   'Sarkhej, Ahmedabad',        NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ── 6. Products ───────────────────────────────────────────────────
-- price is NUMERIC(12,2) — exact money values.
-- category_id points to categories; it is nullable per your schema.
INSERT INTO products (id, name, description, sku, price, category_id, created_at, updated_at) VALUES
  (1,  'Wireless Mouse',        'Ergonomic 2.4GHz wireless mouse',   'ELEC-001',  499.00, 1, NOW(), NOW()),
  (2,  'Mechanical Keyboard',  'RGB backlit, blue switches',        'ELEC-002', 2499.00, 1, NOW(), NOW()),
  (3,  'USB-C Hub',             '7-in-1 multiport adapter',          'ELEC-003', 1899.00, 1, NOW(), NOW()),
  (4,  'Office Chair',          'Ergonomic mesh-back chair',         'FURN-001', 8999.00, 2, NOW(), NOW()),
  (5,  'Standing Desk',         'Height-adjustable electric desk',   'FURN-002',24999.00, 2, NOW(), NOW()),
  (6,  'A4 Paper Ream',         '500 sheets, 75 GSM',                'OFFC-001',  250.00, 3, NOW(), NOW()),
  (7,  'Ballpoint Pens (Box)',  'Box of 20 blue pens',               'OFFC-002',  200.00, 3, NOW(), NOW()),
  (8,  'Corrugated Box (Large)','Heavy-duty 45x35x25 cm',            'PACK-001',   45.00, 4, NOW(), NOW()),
  (9,  'Packing Tape Roll',     'Clear 2 inch x 100m',               'PACK-002',   25.00, 4, NOW(), NOW()),
  (10, 'Cordless Drill',        '18V lithium-ion drill kit',         'TOOL-001', 6499.00, 5, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ── 7. Inventory ──────────────────────────────────────────────────
-- Junction of products and warehouses, plus quantity per pair.
-- reorder_level: alert when stock drops to/below this number.
INSERT INTO inventory (id, product_id, warehouse_id, quantity, reorder_level, updated_at) VALUES
  (1,  1, 1, 150,  20, NOW()),  -- Wireless Mouse in Bangalore
  (2,  2, 1,   8,  10, NOW()),  -- Mechanical Keyboard in Bangalore (low)
  (3,  3, 1,  45,  15, NOW()),  -- USB-C Hub in Bangalore
  (4,  4, 1,  12,   5, NOW()),  -- Office Chair in Bangalore
  (5,  5, 1,   2,   3, NOW()),  -- Standing Desk in Bangalore (low)
  (6,  6, 1, 200,  50, NOW()),  -- A4 Paper in Bangalore
  (7,  7, 1,   5,  30, NOW()),  -- Pens in Bangalore (low)
  (8,  8, 1, 500, 100, NOW()),  -- Boxes in Bangalore
  (9,  9, 1, 800, 200, NOW()),  -- Tape in Bangalore
  (10,10, 1,   3,   5, NOW()),  -- Drill in Bangalore (low)
  (11, 1, 2,  75,  20, NOW()),  -- Wireless Mouse in Mumbai
  (12, 2, 2,  25,  10, NOW()),  -- Keyboard in Mumbai
  (13, 6, 2, 100,  50, NOW()),  -- Paper in Mumbai
  (14, 8, 2, 300, 100, NOW()),  -- Boxes in Mumbai
  (15, 3, 3,  30,  15, NOW()),  -- USB-C Hub in Delhi
  (16, 4, 3,  20,   5, NOW()),  -- Chair in Delhi
  (17, 6, 3, 150,  50, NOW()),  -- Paper in Delhi
  (18, 9, 3, 400, 200, NOW())   -- Tape in Delhi
ON CONFLICT (id) DO NOTHING;

-- ── 8. Purchase Orders ────────────────────────────────────────────
-- status: draft / submitted / approved / received / cancelled
-- created_by points to users.id
INSERT INTO purchase_orders (id, supplier_id, created_by, order_date, status, total_amount) VALUES
  (1, 1, 1, NOW() - INTERVAL '10 days', 'received',  24950.00),
  (2, 2, 2, NOW() - INTERVAL '5 days',  'approved',  17998.00),
  (3, 3, 2, NOW() - INTERVAL '2 days',  'submitted',  4500.00),
  (4, 1, 1, NOW() - INTERVAL '1 day',   'draft',      6499.00)
ON CONFLICT (id) DO NOTHING;

-- ── 9. Purchase Order Items ───────────────────────────────────────
-- Each line belongs to one purchase order and references one product.
INSERT INTO purchase_order_items (id, purchase_order_id, product_id, quantity, unit_price) VALUES
  (1, 1, 1, 50,  499.00),   -- PO#1: 50 Wireless Mice
  (2, 2, 6, 40,  250.00),   -- PO#2: 40 A4 Paper reams
  (3, 2, 7, 40,  200.00),   -- PO#2: 40 boxes of pens  (40*200 + 40*250 = 18000, close to total)
  (4, 3, 8, 100,  45.00),   -- PO#3: 100 boxes
  (5, 4, 10, 1, 6499.00)    -- PO#4: 1 drill
ON CONFLICT (id) DO NOTHING;

-- =====================================================================
-- DONE. Verify with these queries:
--   SELECT COUNT(*) FROM products;        -- should be 10
--   SELECT COUNT(*) FROM inventory;       -- should be 18
--   SELECT * FROM roles;                  -- 3 roles
-- =====================================================================
