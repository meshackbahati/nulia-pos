-- ============================================================
-- BorderShop Enterprise Migration: Phase 0–4
-- All new tables + columns added to existing tables.
-- Uses quoted camelCase columns to match existing DB convention.
-- Run once after deployment.
-- ============================================================

-- 0. Create extension for UUID generation if not exists
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Phase 0.5: Webhooks
-- ============================================================
CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "branchId" UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(512) NOT NULL,
    events JSONB NOT NULL DEFAULT '[]',
    secret TEXT,
    "isActive" BOOLEAN DEFAULT true,
    "lastTriggeredAt" TIMESTAMPTZ,
    "failureCount" INTEGER DEFAULT 0,
    "createdBy" UUID NOT NULL REFERENCES users(id),
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_branch ON webhooks("branchId");
CREATE INDEX IF NOT EXISTS idx_webhooks_events ON webhooks USING GIN (events);

-- ============================================================
-- Phase 1.1: Waste / Spoilage / Breakage
-- ============================================================
CREATE TABLE IF NOT EXISTS waste (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "branchId" UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    "productId" UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    "variantId" UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    quantity DECIMAL(14,4) NOT NULL CHECK (quantity >= 0),
    reason VARCHAR(50) NOT NULL CHECK (reason IN ('spoilage','damage','expired','theft','breakage','other')),
    notes TEXT,
    "costValue" DECIMAL(10,2),
    "recordedBy" UUID NOT NULL REFERENCES users(id),
    "recordedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_waste_branch ON waste("branchId");
CREATE INDEX IF NOT EXISTS idx_waste_product ON waste("productId");
CREATE INDEX IF NOT EXISTS idx_waste_reason ON waste(reason);
CREATE INDEX IF NOT EXISTS idx_waste_recorded_at ON waste("recordedAt");

-- ============================================================
-- Phase 1.2: Tax Rates
-- ============================================================
CREATE TABLE IF NOT EXISTS tax_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "branchId" UUID REFERENCES branches(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    rate DECIMAL(5,2) NOT NULL CHECK (rate >= 0 AND rate <= 100),
    type VARCHAR(20) NOT NULL DEFAULT 'exclusive' CHECK (type IN ('inclusive','exclusive')),
    "isDefault" BOOLEAN DEFAULT false,
    "appliesTo" JSONB,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tax_rates_branch ON tax_rates("branchId");
CREATE INDEX IF NOT EXISTS idx_tax_rates_default ON tax_rates("isDefault");

-- Add taxRateId to products (nullable)
ALTER TABLE products ADD COLUMN IF NOT EXISTS "taxRateId" UUID REFERENCES tax_rates(id) ON DELETE SET NULL;

-- ============================================================
-- Phase 1.3: Cash Management
-- ============================================================
CREATE TABLE IF NOT EXISTS cash_registers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "branchId" UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cash_registers_branch ON cash_registers("branchId");

CREATE TABLE IF NOT EXISTS cash_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "registerId" UUID NOT NULL REFERENCES cash_registers(id) ON DELETE CASCADE,
    "openedBy" UUID NOT NULL REFERENCES users(id),
    "closedBy" UUID REFERENCES users(id) ON DELETE SET NULL,
    "openingBalance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "closingBalance" DECIMAL(10,2),
    "expectedBalance" DECIMAL(10,2),
    difference DECIMAL(10,2),
    "openedAt" TIMESTAMPTZ DEFAULT NOW(),
    "closedAt" TIMESTAMPTZ,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_cash_sessions_register ON cash_sessions("registerId");
CREATE INDEX IF NOT EXISTS idx_cash_sessions_opened ON cash_sessions("openedAt");

CREATE TABLE IF NOT EXISTS cash_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "sessionId" UUID NOT NULL REFERENCES cash_sessions(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('sale','expense','payout','topup','adjustment')),
    amount DECIMAL(10,2) NOT NULL,
    reference VARCHAR(255),
    reason TEXT,
    "createdBy" UUID NOT NULL REFERENCES users(id),
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cash_tx_session ON cash_transactions("sessionId");
CREATE INDEX IF NOT EXISTS idx_cash_tx_type ON cash_transactions(type);
CREATE INDEX IF NOT EXISTS idx_cash_tx_created ON cash_transactions("createdAt");

-- ============================================================
-- Phase 1.4: Expenses
-- ============================================================
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "branchId" UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL CHECK (category IN ('utilities','rent','salaries','supplies','maintenance','transport','marketing','other')),
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    description TEXT,
    "paidBy" UUID NOT NULL REFERENCES users(id),
    "paidAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "receiptUrl" VARCHAR(512),
    "approvedBy" UUID REFERENCES users(id) ON DELETE SET NULL,
    currency VARCHAR(3),
    "exchangeRate" DECIMAL(18,6),
    "baseAmount" DECIMAL(10,2),
    "isApproved" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_branch ON expenses("branchId");
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_paid_at ON expenses("paidAt");

-- ============================================================
-- Phase 2.1: Product Bundles (Composite/Kits)
-- ============================================================
CREATE TABLE IF NOT EXISTS product_bundles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "productId" UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    "componentProductId" UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    "componentVariantId" UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    quantity DECIMAL(14,4) NOT NULL DEFAULT 1 CHECK (quantity >= 0),
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bundles_product ON product_bundles("productId");
CREATE INDEX IF NOT EXISTS idx_bundles_component ON product_bundles("componentProductId");

-- Add bundle fields to products (nullable)
ALTER TABLE products ADD COLUMN IF NOT EXISTS "isBundle" BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS "trackingMethod" VARCHAR(20) DEFAULT 'quantity' CHECK ("trackingMethod" IN ('quantity','serial','batch'));

-- ============================================================
-- Phase 2.2: Serial Number Tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS serial_numbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "productId" UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    "branchId" UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    "serialNumber" VARCHAR(255) NOT NULL,
    "batchNumber" VARCHAR(255),
    "expiryDate" DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'in_stock' CHECK (status IN ('in_stock','sold','voided','returned')),
    "saleItemId" UUID REFERENCES sale_items(id) ON DELETE SET NULL,
    "costPrice" DECIMAL(10,2),
    "soldPrice" DECIMAL(10,2),
    "receivedAt" TIMESTAMPTZ DEFAULT NOW(),
    "soldAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_serials_number ON serial_numbers("serialNumber");
CREATE INDEX IF NOT EXISTS idx_serials_product ON serial_numbers("productId");
CREATE INDEX IF NOT EXISTS idx_serials_branch ON serial_numbers("branchId");
CREATE INDEX IF NOT EXISTS idx_serials_status ON serial_numbers(status);
CREATE INDEX IF NOT EXISTS idx_serials_batch ON serial_numbers("batchNumber");

-- ============================================================
-- Phase 2.3: Multi-Warehouse
-- ============================================================
CREATE TABLE IF NOT EXISTS warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "branchId" UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    location TEXT,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_warehouses_branch ON warehouses("branchId");

CREATE TABLE IF NOT EXISTS warehouse_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "warehouseId" UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_zones_warehouse ON warehouse_zones("warehouseId");

-- Add warehouse fields to inventory (nullable)
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS "warehouseId" UUID REFERENCES warehouses(id) ON DELETE SET NULL;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS "zoneId" UUID REFERENCES warehouse_zones(id) ON DELETE SET NULL;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS "locationCode" VARCHAR(100);

-- ============================================================
-- Phase 3.1: Customer CRM
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "branchId" UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    "firstName" VARCHAR(255) NOT NULL,
    "lastName" VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    "idNumber" VARCHAR(100),
    "creditLimit" DECIMAL(10,2) DEFAULT 0 CHECK ("creditLimit" >= 0),
    "currentBalance" DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_branch ON customers("branchId");
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

CREATE TABLE IF NOT EXISTS customer_deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "customerId" UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('deposit','payment','credit','refund')),
    "referenceType" VARCHAR(20) CHECK ("referenceType" IN ('sale','manual')),
    "referenceId" UUID,
    notes TEXT,
    "recordedBy" UUID NOT NULL REFERENCES users(id),
    "recordedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deposits_customer ON customer_deposits("customerId");
CREATE INDEX IF NOT EXISTS idx_deposits_type ON customer_deposits(type);

CREATE TABLE IF NOT EXISTS layaways (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "branchId" UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    "customerId" UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    "saleId" UUID REFERENCES sales(id) ON DELETE SET NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "depositAmount" DECIMAL(10,2) DEFAULT 0,
    balance DECIMAL(10,2) NOT NULL,
    "installmentCount" INTEGER,
    "installmentAmount" DECIMAL(10,2),
    frequency VARCHAR(20) CHECK (frequency IN ('weekly','biweekly','monthly')),
    "nextDueDate" DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','defaulted','cancelled')),
    "startedAt" TIMESTAMPTZ DEFAULT NOW(),
    "completedAt" TIMESTAMPTZ,
    notes TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_layaways_branch ON layaways("branchId");
CREATE INDEX IF NOT EXISTS idx_layaways_customer ON layaways("customerId");
CREATE INDEX IF NOT EXISTS idx_layaways_status ON layaways(status);

-- Add customer fields to payments (nullable)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS "customerId" UUID REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS "depositId" UUID REFERENCES customer_deposits(id) ON DELETE SET NULL;

-- ============================================================
-- Phase 3.2: Returns / RMA
-- ============================================================
CREATE TABLE IF NOT EXISTS returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "branchId" UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    "saleId" UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    "customerId" UUID REFERENCES customers(id) ON DELETE SET NULL,
    "returnNumber" VARCHAR(100) NOT NULL UNIQUE,
    reason VARCHAR(50) NOT NULL CHECK (reason IN ('defective','wrong_item','customer_decision','expired','damaged','other')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','completed')),
    notes TEXT,
    "approvedBy" UUID REFERENCES users(id) ON DELETE SET NULL,
    "createdBy" UUID NOT NULL REFERENCES users(id),
    "processedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_returns_branch ON returns("branchId");
CREATE INDEX IF NOT EXISTS idx_returns_sale ON returns("saleId");
CREATE INDEX IF NOT EXISTS idx_returns_status ON returns(status);

CREATE TABLE IF NOT EXISTS return_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "returnId" UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
    "saleItemId" UUID NOT NULL REFERENCES sale_items(id) ON DELETE CASCADE,
    "productId" UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    "variantId" UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    "quantityReturned" DECIMAL(14,4) NOT NULL CHECK ("quantityReturned" >= 0),
    "refundAmount" DECIMAL(10,2) NOT NULL CHECK ("refundAmount" >= 0),
    restock BOOLEAN DEFAULT true,
    condition VARCHAR(20) DEFAULT 'used' CHECK (condition IN ('new','used','damaged')),
    "serialNumberId" UUID REFERENCES serial_numbers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_return_items_return ON return_items("returnId");
CREATE INDEX IF NOT EXISTS idx_return_items_sale_item ON return_items("saleItemId");

-- ============================================================
-- Phase 4.1: Integrations
-- ============================================================
CREATE TABLE IF NOT EXISTS integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "branchId" UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('quickbooks','shopify','custom')),
    config JSONB,
    "isActive" BOOLEAN DEFAULT true,
    "lastSyncAt" TIMESTAMPTZ,
    "syncDirection" VARCHAR(20) DEFAULT 'export' CHECK ("syncDirection" IN ('import','export','bidirectional')),
    "syncFrequency" VARCHAR(20) DEFAULT 'manual' CHECK ("syncFrequency" IN ('manual','hourly','daily')),
    "lastStatus" VARCHAR(255),
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integrations_branch ON integrations("branchId");
CREATE INDEX IF NOT EXISTS idx_integrations_provider ON integrations(provider);

-- ============================================================
-- Update timestamps triggers
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    t text;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.columns
             WHERE column_name = 'updatedAt'
             AND table_schema = 'public'
             AND (SELECT NOT EXISTS (
                 SELECT 1 FROM information_schema.triggers
                 WHERE trigger_name = 'trg_' || table_name || '_updated_at'
             ))
    LOOP
        EXECUTE format('CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
                       t, t);
    END LOOP;
END;
$$;
