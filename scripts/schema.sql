-- Comprehensive Inventory Management System Schema

-- Drop existing types if they exist
DROP TYPE IF EXISTS transaction_type CASCADE;
DROP TYPE IF EXISTS code_challenge_method CASCADE;
DROP TYPE IF EXISTS factor_type CASCADE;
DROP TYPE IF EXISTS factor_status CASCADE;
DROP TYPE IF EXISTS one_time_token_type CASCADE;
DROP TYPE IF EXISTS aal_level CASCADE;

-- Custom Enumeration Types
CREATE TYPE transaction_type AS ENUM (
    'purchase', 
    'sale', 
    'adjustment', 
    'return', 
    'transfer_in', 
    'transfer_out', 
    'damaged', 
    'expired', 
    'found', 
    'lost'
);

-- Utility Functions for Row Level Security
CREATE OR REPLACE FUNCTION is_current_user_manager() 
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE auth_user_id = auth.uid() 
        AND role = 'manager'
    );
END;
$$;

-- Users Table
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID REFERENCES auth.users(id),
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('manager', 'salesperson')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    password_hash TEXT
);

-- Categories Table
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Barcode Formats Table
CREATE TABLE public.barcode_formats (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    prefix TEXT,
    pattern TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Suppliers Table
CREATE TABLE public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    tax_id TEXT,
    payment_terms TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id)
);

-- Products Table
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    barcode TEXT NOT NULL UNIQUE,
    price NUMERIC NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    category TEXT,
    currency TEXT DEFAULT 'KES' CHECK (currency = 'KES'),
    low_stock_threshold INTEGER DEFAULT 10,
    expiry_date DATE,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    barcode_format_id INTEGER REFERENCES public.barcode_formats(id),
    barcode_data TEXT COMMENT 'The actual barcode value that will be scanned',
    sku TEXT,
    reorder_point INTEGER DEFAULT 10,
    is_active BOOLEAN DEFAULT TRUE,
    last_restocked_at TIMESTAMPTZ,
    supplier_id UUID REFERENCES public.suppliers(id)
);

-- Sales Table
CREATE TABLE public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salesperson_id UUID NOT NULL REFERENCES public.users(id),
    total_amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'KES' CHECK (currency = 'KES'),
    payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'mobile_money')),
    receipt_number TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR DEFAULT 'completed' 
        CHECK (status IN ('pending', 'completed', 'voided', 'refunded')),
    customer_phone TEXT,
    notes TEXT,
    transaction_type transaction_type DEFAULT 'sale'
);

-- Sale Items Table
CREATE TABLE public.sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES public.sales(id),
    product_id UUID REFERENCES public.products(id),
    quantity INTEGER NOT NULL,
    unit_price NUMERIC NOT NULL,
    total_price NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory Transactions Table
CREATE TABLE public.inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id),
    quantity NUMERIC NOT NULL,
    transaction_type transaction_type NOT NULL,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reference_id UUID,
    reference_type TEXT,
    notes TEXT,
    status TEXT DEFAULT 'completed' 
        CHECK (status IN ('pending', 'completed', 'cancelled', 'reversed')),
    unit_cost NUMERIC,
    total_cost NUMERIC GENERATED ALWAYS AS 
        (COALESCE(unit_cost, 0) * COALESCE(quantity, 0)) STORED
);

-- Scanner Configurations Table
CREATE TABLE public.scanner_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('barcode', 'camera', 'network')),
    config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id)
);

-- Barcode Scan Logs Table
CREATE TABLE public.barcode_scan_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barcode_data TEXT NOT NULL,
    product_id UUID REFERENCES public.products(id),
    scanner_id UUID REFERENCES public.scanner_configurations(id),
    user_id UUID REFERENCES auth.users(id),
    location TEXT,
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs Table
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id),
    action TEXT NOT NULL,
    table_name TEXT,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

-- RLS Policies
-- Will be detailed in a separate setup

-- Indexes for Performance
CREATE INDEX idx_products_barcode ON public.products(barcode);
CREATE INDEX idx_sales_salesperson ON public.sales(salesperson_id);
CREATE INDEX idx_inventory_transactions_product ON public.inventory_transactions(product_id);
CREATE INDEX idx_sale_items_sale ON public.sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON public.sale_items(product_id);

-- Triggers for Timestamp Updates
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_product_timestamp
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_suppliers_timestamp
BEFORE UPDATE ON public.suppliers
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- Trigger to manage product quantity after sale
CREATE OR REPLACE FUNCTION update_product_quantity_after_sale()
RETURNS TRIGGER AS $$
DECLARE
    sale_quantity INTEGER;
BEGIN
    -- Reduce product quantity after sale
    sale_quantity := (SELECT quantity FROM public.sale_items WHERE id = NEW.id);
    
    UPDATE public.products 
    SET quantity = quantity - sale_quantity,
        updated_at = NOW()
    WHERE id = NEW.product_id;
    
    -- Log inventory transaction
    INSERT INTO public.inventory_transactions (
        product_id, 
        quantity, 
        transaction_type, 
        created_by,
        reference_id,
        reference_type
    ) VALUES (
        NEW.product_id,
        -sale_quantity,
        'sale',
        (SELECT salesperson_id FROM public.sales WHERE id = NEW.sale_id),
        NEW.sale_id,
        'sale'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER sale_item_quantity_update
AFTER INSERT ON public.sale_items
FOR EACH ROW
EXECUTE FUNCTION update_product_quantity_after_sale();

-- Comments for Documentation
COMMENT ON TABLE public.products IS 'Stores product information including pricing and inventory';
COMMENT ON TABLE public.sales IS 'Tracks all sales transactions';
COMMENT ON TABLE public.sale_items IS 'Individual items within a sales transaction';
COMMENT ON TABLE public.inventory_transactions IS 'Logs all inventory changes';