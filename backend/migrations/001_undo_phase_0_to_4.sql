-- Undo Phase 0–4 migration (camelCase quoted version)
-- Run this BEFORE applying the corrected migration

-- Drop new columns from existing tables
ALTER TABLE products DROP COLUMN IF EXISTS "taxRateId";
ALTER TABLE products DROP COLUMN IF EXISTS "isBundle";
ALTER TABLE products DROP COLUMN IF EXISTS "trackingMethod";

ALTER TABLE inventory DROP COLUMN IF EXISTS "warehouseId";
ALTER TABLE inventory DROP COLUMN IF EXISTS "zoneId";
ALTER TABLE inventory DROP COLUMN IF EXISTS "locationCode";

ALTER TABLE payments DROP COLUMN IF EXISTS "customerId";
ALTER TABLE payments DROP COLUMN IF EXISTS "depositId";

-- Drop new tables (order matters for FK constraints)
DROP TABLE IF EXISTS return_items CASCADE;
DROP TABLE IF EXISTS returns CASCADE;
DROP TABLE IF EXISTS layaways CASCADE;
DROP TABLE IF EXISTS customer_deposits CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS warehouse_zones CASCADE;
DROP TABLE IF EXISTS warehouses CASCADE;
DROP TABLE IF EXISTS serial_numbers CASCADE;
DROP TABLE IF EXISTS product_bundles CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS cash_transactions CASCADE;
DROP TABLE IF EXISTS cash_sessions CASCADE;
DROP TABLE IF EXISTS cash_registers CASCADE;
DROP TABLE IF EXISTS tax_rates CASCADE;
DROP TABLE IF EXISTS waste CASCADE;
DROP TABLE IF EXISTS webhooks CASCADE;
DROP TABLE IF EXISTS integrations CASCADE;
