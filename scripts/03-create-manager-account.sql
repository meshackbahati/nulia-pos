-- Create the manager account with the specified credentials
-- This will be used to create the user in the users table after Supabase auth user is created

INSERT INTO users (email, role, full_name) VALUES 
('bordershop@bordernet.co.ke', 'manager', 'bordershop')
ON CONFLICT (email) DO NOTHING;

-- Update currency support for UGX and KES
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'UGX';

ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'UGX';

-- Update existing products to use UGX pricing
UPDATE products SET 
  price = price * 3700,  -- Convert to UGX (approximate rate)
  currency = 'UGX'
WHERE currency IS NULL OR currency = 'USD';
