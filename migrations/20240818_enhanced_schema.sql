-- Enhanced Supermarket System Schema
-- Migration: 20240818_enhanced_schema

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Barcode Management
CREATE TABLE barcode_formats (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    prefix TEXT,
    pattern TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add barcode format to products
ALTER TABLE products 
ADD COLUMN barcode_format_id INTEGER REFERENCES barcode_formats(id),
ADD COLUMN barcode_data TEXT,
ADD COLUMN sku TEXT UNIQUE,
ADD COLUMN reorder_point INTEGER DEFAULT 10,
ADD COLUMN is_active BOOLEAN DEFAULT true,
ADD COLUMN last_restocked_at TIMESTAMPTZ,
ADD COLUMN supplier_id UUID; -- Will reference suppliers table

-- Suppliers
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    tax_id TEXT,
    payment_terms TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES users(id)
);

-- Add foreign key for supplier in products
ALTER TABLE products 
ADD CONSTRAINT fk_products_supplier 
FOREIGN KEY (supplier_id) REFERENCES suppliers(id);

-- Inventory Transactions
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

CREATE TABLE inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    transaction_type transaction_type NOT NULL,
    quantity INTEGER NOT NULL,
    unit_cost NUMERIC(12, 2),
    total_cost NUMERIC(12, 2) GENERATED ALWAYS AS (COALESCE(unit_cost, 0) * quantity) STORED,
    reference_id UUID, -- Links to sales, purchases, etc.
    reference_type TEXT, -- 'sale', 'purchase_order', 'inventory_count', etc.
    notes TEXT,
    location_id UUID, -- For future multi-location support
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_inventory_transactions_product_id ON inventory_transactions(product_id);
CREATE INDEX idx_inventory_transactions_created_at ON inventory_transactions(created_at);
CREATE INDEX idx_inventory_transactions_reference ON inventory_transactions(reference_type, reference_id);

-- Stock Levels (Materialized View for better performance)
CREATE MATERIALIZED VIEW current_stock_levels AS
SELECT 
    p.id AS product_id,
    p.name AS product_name,
    p.sku,
    p.barcode_data,
    p.quantity AS system_quantity,
    COALESCE(SUM(
        CASE 
            WHEN it.transaction_type IN ('purchase', 'return', 'transfer_in', 'found') THEN it.quantity
            WHEN it.transaction_type IN ('sale', 'adjustment', 'transfer_out', 'damaged', 'expired', 'lost') THEN -it.quantity
            ELSE 0
        END
    ), 0) AS calculated_quantity,
    p.reorder_point,
    p.low_stock_threshold,
    p.supplier_id,
    s.name AS supplier_name,
    p.last_restocked_at
FROM 
    products p
LEFT JOIN 
    inventory_transactions it ON p.id = it.product_id
LEFT JOIN
    suppliers s ON p.supplier_id = s.id
GROUP BY 
    p.id, p.name, p.sku, p.barcode_data, p.quantity, p.reorder_point, 
    p.low_stock_threshold, p.supplier_id, s.name, p.last_restocked_at;

-- Create a function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_current_stock_levels()
RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY current_stock_levels;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to refresh the materialized view when inventory changes
CREATE TRIGGER refresh_stock_levels_trigger
AFTER INSERT OR UPDATE OR DELETE ON inventory_transactions
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_current_stock_levels();

-- Scanner Configurations
CREATE TABLE scanner_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('barcode', 'camera', 'network')),
    config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES users(id)
);

-- Barcode Scanning Logs
CREATE TABLE barcode_scan_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barcode_data TEXT NOT NULL,
    product_id UUID REFERENCES products(id),
    scanner_id UUID REFERENCES scanner_configurations(id),
    user_id UUID REFERENCES users(id),
    location TEXT,
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_barcode_scan_logs_barcode ON barcode_scan_logs(barcode_data);
CREATE INDEX idx_barcode_scan_logs_created_at ON barcode_scan_logs(created_at);

-- Add initial barcode formats
INSERT INTO barcode_formats (name, prefix, pattern, description) VALUES
('EAN-13', '', '^[0-9]{13}$', 'Standard 13-digit barcode format'),
('UPC-A', '', '^[0-9]{12}$', 'Standard 12-digit barcode format'),
('CODE-128', '', '^[A-Za-z0-9]+$', 'High-density linear barcode format'),
('QR-CODE', '', '.*', '2D barcode format for various data types');

-- Create function to generate barcode data
CREATE OR REPLACE FUNCTION generate_barcode_data(product_id UUID, format_id INTEGER)
RETURNS TEXT AS $$
DECLARE
    format_record RECORD;
    prefix TEXT;
    random_part TEXT;
    barcode_data TEXT;
    checksum INTEGER := 0;
    i INTEGER;
    digit INTEGER;
BEGIN
    -- Get barcode format details
    SELECT * INTO format_record FROM barcode_formats WHERE id = format_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Barcode format not found';
    END IF;
    
    -- Generate random part based on pattern
    IF format_record.name = 'EAN-13' THEN
        -- Generate 12 random digits (EAN-13 has 12 digits + 1 check digit)
        random_part := lpad(floor(random() * 1000000000000)::TEXT, 12, '0');
        
        -- Calculate EAN-13 check digit
        FOR i IN 1..12 LOOP
            digit := SUBSTRING(random_part, i, 1)::INTEGER;
            IF i % 2 = 0 THEN
                checksum := checksum + digit * 3;
            ELSE
                checksum := checksum + digit;
            END IF;
        END LOOP;
        
        checksum := (10 - (checksum % 10)) % 10;
        barcode_data := random_part || checksum::TEXT;
        
    ELSIF format_record.name = 'UPC-A' THEN
        -- Generate 11 random digits (UPC-A has 11 digits + 1 check digit)
        random_part := lpad(floor(random() * 100000000000)::TEXT, 11, '0');
        
        -- Calculate UPC-A check digit (same as EAN-13 but different weights)
        FOR i IN 1..11 LOOP
            digit := SUBSTRING(random_part, i, 1)::INTEGER;
            IF i % 2 = 1 THEN
                checksum := checksum + digit * 3;
            ELSE
                checksum := checksum + digit;
            END IF;
        END LOOP;
        
        checksum := (10 - (checksum % 10)) % 10;
        barcode_data := random_part || checksum::TEXT;
        
    ELSIF format_record.name = 'CODE-128' THEN
        -- Generate a simple alphanumeric code
        barcode_data := 'PRD' || lpad(product_id::TEXT, 8, '0') || 
                       lpad(floor(random() * 10000)::TEXT, 4, '0');
    ELSE
        -- For other formats, just use a UUID
        barcode_data := gen_random_uuid()::TEXT;
    END IF;
    
    -- Add prefix if specified
    IF format_record.prefix IS NOT NULL THEN
        barcode_data := format_record.prefix || barcode_data;
    END IF;
    
    RETURN barcode_data;
END;
$$ LANGUAGE plpgsql;

-- Create function to update product quantity based on transactions
CREATE OR REPLACE FUNCTION update_product_quantity()
RETURNS TRIGGER AS $$
BEGIN
    -- Update product quantity when inventory transactions are inserted/updated/deleted
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Update the product's quantity based on the transaction type
        IF NEW.transaction_type IN ('purchase', 'return', 'transfer_in', 'found') THEN
            UPDATE products 
            SET quantity = quantity + NEW.quantity,
                last_restocked_at = CASE WHEN NEW.transaction_type = 'purchase' THEN now() ELSE last_restocked_at END
            WHERE id = NEW.product_id;
                
        ELSIF NEW.transaction_type IN ('sale', 'adjustment', 'transfer_out', 'damaged', 'expired', 'lost') THEN
            UPDATE products 
            SET quantity = GREATEST(0, quantity - NEW.quantity)
            WHERE id = NEW.product_id;
        END IF;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        -- If a transaction is deleted, reverse its effect
        IF OLD.transaction_type IN ('purchase', 'return', 'transfer_in', 'found') THEN
            UPDATE products 
            SET quantity = GREATEST(0, quantity - OLD.quantity)
            WHERE id = OLD.product_id;
                
        ELSIF OLD.transaction_type IN ('sale', 'adjustment', 'transfer_out', 'damaged', 'expired', 'lost') THEN
            UPDATE products 
            SET quantity = quantity + OLD.quantity,
                last_restocked_at = CASE WHEN OLD.transaction_type = 'sale' THEN last_restocked_at ELSE now() END
            WHERE id = OLD.product_id;
        END IF;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update product quantity when inventory transactions change
CREATE TRIGGER update_product_quantity_trigger
AFTER INSERT OR UPDATE OR DELETE ON inventory_transactions
FOR EACH ROW
EXECUTE FUNCTION update_product_quantity();

-- Create function to log barcode scans
CREATE OR REPLACE FUNCTION log_barcode_scan()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO barcode_scan_logs (
        barcode_data, 
        product_id, 
        scanner_id, 
        user_id, 
        location, 
        raw_data
    ) VALUES (
        NEW.barcode_data,
        (SELECT id FROM products WHERE barcode_data = NEW.barcode_data LIMIT 1),
        NULL, -- Can be set by application
        NEW.user_id,
        NULL, -- Can be set by application
        to_jsonb(NEW)
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to log barcode scans (this would be called from the application)
-- Note: This is a placeholder - the actual implementation would be in the application code
-- that processes barcode scans

-- Add comments to document the schema
COMMENT ON TABLE products IS 'Stores product information including pricing and inventory';
COMMENT ON COLUMN products.barcode_data IS 'The actual barcode value that will be scanned';
COMMENT ON COLUMN products.low_stock_threshold IS 'Threshold at which low stock alerts are triggered';
COMMENT ON COLUMN products.reorder_point IS 'Stock level at which reorder should be triggered';

COMMENT ON TABLE inventory_transactions IS 'Tracks all inventory movements and adjustments';
COMMENT ON COLUMN inventory_transactions.transaction_type IS 'Type of inventory movement (purchase, sale, adjustment, etc.)';
COMMENT ON COLUMN inventory_transactions.reference_id IS 'ID of the related document (sale, purchase order, etc.)';

COMMENT ON MATERIALIZED VIEW current_stock_levels IS 'Shows current stock levels with calculated quantities';

-- Create a function to get current stock level for a product
CREATE OR REPLACE FUNCTION get_product_stock(p_product_id UUID)
RETURNS INTEGER AS $$
DECLARE
    stock INTEGER;
BEGIN
    SELECT calculated_quantity INTO stock
    FROM current_stock_levels
    WHERE product_id = p_product_id;
    
    RETURN COALESCE(stock, 0);
END;
$$ LANGUAGE plpgsql STABLE;
