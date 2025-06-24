-- Users
INSERT INTO Users (name, username, password, role)
VALUES
  ('Alice Master', 'alice', 'hashed_pw', 'master'),
  ('Bob Employee', 'bob', 'hashed_pw', 'employee');

-- Locations
INSERT INTO Locations (name, factory_id)
VALUES
  ('Main Warehouse', NULL),
  ('Assembly Unit', NULL);

-- Subcategories
INSERT INTO Subcategories (name)
VALUES
  ('Metals'),
  ('Casing'),
  ('Electronics');

-- Products
-- Get required foreign keys first (in your code, or manually lookup)
-- Assuming IDs:
-- Subcategories: Metals = 1, Casing = 2, Electronics = 3
-- Locations: Main = 1, Assembly = 2

INSERT INTO Products (subcategory_id, name, unit, source_type, category, min_stock_threshold, location_id)
VALUES
  (1, 'Steel Rod', 'kg', 'trading', 'raw', 100, 1),     -- Raw Trading product
  (2, 'Motor Shell', 'pcs', 'manufacturing', 'semi', 20, 2), -- Semi-finished
  (3, 'Fan Assembly', 'pcs', 'manufacturing', 'finished', 10, 2); -- Final product

-- ProductFormula (Fan Assembly made from 1x Motor Shell + 3 kg Steel Rod)
-- Assume: Steel Rod = id 1, Motor Shell = id 2, Fan Assembly = id 3

INSERT INTO ProductFormula (product_id, component_id, quantity)
VALUES
  (3, 2, 1),  -- 1x Motor Shell
  (3, 1, 3);  -- 3 kg Steel Rod

-- Inventory Entries (Ledger)
-- Assume: Bob Employee = id 2
-- Products: Steel Rod = 1, Motor Shell = 2, Fan Assembly = 3
-- Locations: Main = 1, Assembly = 2

INSERT INTO InventoryEntries (product_id, quantity, entry_type, user_id, location_id)
VALUES
  (1, 200, 'manual_in', 2, 1),         -- Bob added 200 kg of Steel Rod
  (2, 10, 'manufacturing_in', 2, 2),   -- Bob added 10 Motor Shells
  (3, 5, 'manufacturing_in', 2, 2);    -- Bob added 5 Fan Assemblies

-- Audit Logs
-- Assume: Alice Master = id 1

INSERT INTO AuditLogs (action, user_id, entity_type, entity_id)
VALUES
  ('Created product Fan Assembly', 1, 'product', 3);
