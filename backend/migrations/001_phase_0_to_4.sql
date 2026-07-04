-- ============================================================
-- BorderShop Enterprise Migration: Phase 0–4
-- All new tables + columns added to existing tables.
-- Run once after deployment.
-- ============================================================

-- 0. Create extension for UUID generation if not exists
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Phase 0.5: Webhooks
-- ============================================================
CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(512) NOT NULL,
    events JSONB NOT NULL DEFAULT '[]',
    secret TEXT,
    is_active BOOLEAN DEFAULT true,
    last_triggered_at TIMESTAMPTZ,
    failure_count INTEGER DEFAULT 0,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_branch ON webhooks(branch_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_events ON webhooks USING GIN (events);

-- ============================================================
-- Phase 1.1: Waste / Spoilage / Breakage
-- ============================================================
CREATE TABLE IF NOT EXISTS waste (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    quantity DECIMAL(14,4) NOT NULL CHECK (quantity >= 0),
    reason VARCHAR(50) NOT NULL CHECK (reason IN ('spoilage','damage','expired','theft','breakage','other')),
    notes TEXT,
    cost_value DECIMAL(10,2),
    recorded_by UUID NOT NULL REFERENCES users(id),
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_waste_branch ON waste(branch_id);
CREATE INDEX IF NOT EXISTS idx_waste_product ON waste(product_id);
CREATE INDEX IF NOT EXISTS idx_waste_reason ON waste(reason);
CREATE INDEX IF NOT EXISTS idx_waste_recorded_at ON waste(recorded_at);

-- ============================================================
-- Phase 1.2: Tax Rates
-- ============================================================
CREATE TABLE IF NOT EXISTS tax_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    rate DECIMAL(5,2) NOT NULL CHECK (rate >= 0 AND rate <= 100),
    type VARCHAR(20) NOT NULL DEFAULT 'exclusive' CHECK (type IN ('inclusive','exclusive')),
    is_default BOOLEAN DEFAULT false,
    applies_to JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tax_rates_branch ON tax_rates(branch_id);
CREATE INDEX IF NOT EXISTS idx_tax_rates_default ON tax_rates(is_default);

-- Add tax_rate_id to products (nullable)
ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_rate_id UUID REFERENCES tax_rates(id) ON DELETE SET NULL;

-- ============================================================
-- Phase 1.3: Cash Management
-- ============================================================
CREATE TABLE IF NOT EXISTS cash_registers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cash_registers_branch ON cash_registers(branch_id);

CREATE TABLE IF NOT EXISTS cash_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    register_id UUID NOT NULL REFERENCES cash_registers(id) ON DELETE CASCADE,
    opened_by UUID NOT NULL REFERENCES users(id),
    closed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    opening_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
    closing_balance DECIMAL(10,2),
    expected_balance DECIMAL(10,2),
    difference DECIMAL(10,2),
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_cash_sessions_register ON cash_sessions(register_id);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_opened ON cash_sessions(opened_at);

CREATE TABLE IF NOT EXISTS cash_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES cash_sessions(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('sale','expense','payout','topup','adjustment')),
    amount DECIMAL(10,2) NOT NULL,
    reference VARCHAR(255),
    reason TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cash_tx_session ON cash_transactions(session_id);
CREATE INDEX IF NOT EXISTS idx_cash_tx_type ON cash_transactions(type);
CREATE INDEX IF NOT EXISTS idx_cash_tx_created ON cash_transactions(created_at);

-- ============================================================
-- Phase 1.4: Expenses
-- ============================================================
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL CHECK (category IN ('utilities','rent','salaries','supplies','maintenance','transport','marketing','other')),
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    description TEXT,
    paid_by UUID NOT NULL REFERENCES users(id),
    paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    receipt_url VARCHAR(512),
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    currency VARCHAR(3),
    exchange_rate DECIMAL(18,6),
    base_amount DECIMAL(10,2),
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_branch ON expenses(branch_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_paid_at ON expenses(paid_at);

-- ============================================================
-- Phase 2.1: Product Bundles (Composite/Kits)
-- ============================================================
CREATE TABLE IF NOT EXISTS product_bundles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    component_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    component_variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    quantity DECIMAL(14,4) NOT NULL DEFAULT 1 CHECK (quantity >= 0),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bundles_product ON product_bundles(product_id);
CREATE INDEX IF NOT EXISTS idx_bundles_component ON product_bundles(component_product_id);

-- Add bundle fields to products (nullable)
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_bundle BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS tracking_method VARCHAR(20) DEFAULT 'quantity' CHECK (tracking_method IN ('quantity','serial','batch'));

-- ============================================================
-- Phase 2.2: Serial Number Tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS serial_numbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    serial_number VARCHAR(255) NOT NULL,
    batch_number VARCHAR(255),
    expiry_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'in_stock' CHECK (status IN ('in_stock','sold','voided','returned')),
    sale_item_id UUID REFERENCES sale_items(id) ON DELETE SET NULL,
    cost_price DECIMAL(10,2),
    sold_price DECIMAL(10,2),
    received_at TIMESTAMPTZ DEFAULT NOW(),
    sold_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_serials_number ON serial_numbers(serial_number);
CREATE INDEX IF NOT EXISTS idx_serials_product ON serial_numbers(product_id);
CREATE INDEX IF NOT EXISTS idx_serials_branch ON serial_numbers(branch_id);
CREATE INDEX IF NOT EXISTS idx_serials_status ON serial_numbers(status);
CREATE INDEX IF NOT EXISTS idx_serials_batch ON serial_numbers(batch_number);

-- ============================================================
-- Phase 2.3: Multi-Warehouse
-- ============================================================
CREATE TABLE IF NOT EXISTS warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    location TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_warehouses_branch ON warehouses(branch_id);

CREATE TABLE IF NOT EXISTS warehouse_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_zones_warehouse ON warehouse_zones(warehouse_id);

-- Add warehouse fields to inventory (nullable)
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES warehouse_zones(id) ON DELETE SET NULL;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS location_code VARCHAR(100);

-- ============================================================
-- Phase 3.1: Customer CRM
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    id_number VARCHAR(100),
    credit_limit DECIMAL(10,2) DEFAULT 0 CHECK (credit_limit >= 0),
    current_balance DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_branch ON customers(branch_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

CREATE TABLE IF NOT EXISTS customer_deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('deposit','payment','credit','refund')),
    reference_type VARCHAR(20) CHECK (reference_type IN ('sale','manual')),
    reference_id UUID,
    notes TEXT,
    recorded_by UUID NOT NULL REFERENCES users(id),
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deposits_customer ON customer_deposits(customer_id);
CREATE INDEX IF NOT EXISTS idx_deposits_type ON customer_deposits(type);

CREATE TABLE IF NOT EXISTS layaways (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    deposit_amount DECIMAL(10,2) DEFAULT 0,
    balance DECIMAL(10,2) NOT NULL,
    installment_count INTEGER,
    installment_amount DECIMAL(10,2),
    frequency VARCHAR(20) CHECK (frequency IN ('weekly','biweekly','monthly')),
    next_due_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','defaulted','cancelled')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_layaways_branch ON layaways(branch_id);
CREATE INDEX IF NOT EXISTS idx_layaways_customer ON layaways(customer_id);
CREATE INDEX IF NOT EXISTS idx_layaways_status ON layaways(status);

-- Add customer fields to payments (nullable)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS deposit_id UUID REFERENCES customer_deposits(id) ON DELETE SET NULL;

-- ============================================================
-- Phase 3.2: Returns / RMA
-- ============================================================
CREATE TABLE IF NOT EXISTS returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    return_number VARCHAR(100) NOT NULL UNIQUE,
    reason VARCHAR(50) NOT NULL CHECK (reason IN ('defective','wrong_item','customer_decision','expired','damaged','other')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','completed')),
    notes TEXT,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_returns_branch ON returns(branch_id);
CREATE INDEX IF NOT EXISTS idx_returns_sale ON returns(sale_id);
CREATE INDEX IF NOT EXISTS idx_returns_status ON returns(status);

CREATE TABLE IF NOT EXISTS return_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
    sale_item_id UUID NOT NULL REFERENCES sale_items(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    quantity_returned DECIMAL(14,4) NOT NULL CHECK (quantity_returned >= 0),
    refund_amount DECIMAL(10,2) NOT NULL CHECK (refund_amount >= 0),
    restock BOOLEAN DEFAULT true,
    condition VARCHAR(20) DEFAULT 'used' CHECK (condition IN ('new','used','damaged')),
    serial_number_id UUID REFERENCES serial_numbers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_return_items_return ON return_items(return_id);
CREATE INDEX IF NOT EXISTS idx_return_items_sale_item ON return_items(sale_item_id);

-- ============================================================
-- Phase 4.1: Integrations
-- ============================================================
CREATE TABLE IF NOT EXISTS integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('quickbooks','zoho_books','sage','xero','shopify','woocommerce','custom')),
    config JSONB,
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMPTZ,
    sync_direction VARCHAR(20) DEFAULT 'export' CHECK (sync_direction IN ('import','export','bidirectional')),
    sync_frequency VARCHAR(20) DEFAULT 'manual' CHECK (sync_frequency IN ('manual','hourly','daily')),
    last_status VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integrations_branch ON integrations(branch_id);
CREATE INDEX IF NOT EXISTS idx_integrations_provider ON integrations(provider);

-- ============================================================
-- Update timestamps triggers (optional, for updated_at columns)
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    t text;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.columns
             WHERE column_name = 'updated_at'
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
