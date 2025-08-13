-- Updated to BorderShop branding and proper auth setup
-- Note: These users need to be created in Supabase Auth dashboard or via signup
-- Insert sample manager user (create these in Supabase Auth first)
INSERT INTO users (email, role, full_name) VALUES 
('manager@bordershop.com', 'manager', 'Store Manager'),
('salesperson1@bordershop.com', 'salesperson', 'John Doe'),
('salesperson2@bordershop.com', 'salesperson', 'Jane Smith')
ON CONFLICT (email) DO NOTHING;

-- Insert sample products with barcodes
INSERT INTO products (name, category, price, quantity, barcode, expiry_date, low_stock_threshold) VALUES 
('Coca Cola 500ml', 'Beverages', 2.50, 100, '1234567890123', '2024-12-31', 20),
('White Bread', 'Bakery', 1.25, 50, '2345678901234', '2024-02-15', 10),
('Milk 1L', 'Dairy', 3.00, 75, '3456789012345', '2024-02-10', 15),
('Bananas (per kg)', 'Fruits', 2.00, 200, '4567890123456', '2024-02-05', 25),
('Rice 2kg', 'Grains', 8.50, 30, '5678901234567', '2024-12-31', 5),
('Chicken Breast (per kg)', 'Meat', 12.00, 40, '6789012345678', '2024-02-03', 8),
('Tomatoes (per kg)', 'Vegetables', 3.50, 80, '7890123456789', '2024-02-08', 15),
('Shampoo 400ml', 'Personal Care', 6.75, 25, '8901234567890', '2025-06-30', 5)
ON CONFLICT (barcode) DO NOTHING;
</sql>
