-- Update all currency fields to use KES as default and remove UGX

-- Update products table
ALTER TABLE products 
  ALTER COLUMN currency SET DEFAULT 'KES',
  ALTER COLUMN currency TYPE TEXT,
  DROP CONSTRAINT IF EXISTS products_currency_check,
  ADD CONSTRAINT products_currency_check CHECK (currency = 'KES');

-- Update sales table
ALTER TABLE sales
  ALTER COLUMN currency SET DEFAULT 'KES',
  ALTER COLUMN currency TYPE TEXT,
  DROP CONSTRAINT IF EXISTS sales_currency_check,
  ADD CONSTRAINT sales_currency_check CHECK (currency = 'KES');

-- Update existing records to use KES
UPDATE products SET currency = 'KES' WHERE currency = 'UGX';
UPDATE sales SET currency = 'KES' WHERE currency = 'UGX';

-- Update low stock threshold for products
UPDATE products SET low_stock_threshold = 5 WHERE low_stock_threshold > 5;

-- Create a view for low stock products
CREATE OR REPLACE VIEW low_stock_products AS
SELECT 
  p.id,
  p.name,
  p.barcode,
  p.quantity,
  p.low_stock_threshold,
  p.price,
  p.currency,
  s.name as supplier_name,
  s.contact_person as supplier_contact
FROM 
  products p
  LEFT JOIN suppliers s ON p.supplier_id = s.id
WHERE 
  p.is_active = true 
  AND p.quantity <= p.low_stock_threshold
ORDER BY 
  p.quantity ASC;
