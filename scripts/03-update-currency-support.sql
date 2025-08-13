-- Add currency support to sales table
ALTER TABLE sales ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'UGX';

-- Update existing sales to have UGX currency
UPDATE sales SET currency = 'UGX' WHERE currency IS NULL;

-- Add index for better performance on currency queries
CREATE INDEX IF NOT EXISTS idx_sales_currency ON sales(currency);
CREATE INDEX IF NOT EXISTS idx_sales_salesperson ON sales(salesperson_id);

-- Create view for salesperson sales summary
CREATE OR REPLACE VIEW salesperson_sales_summary AS
SELECT 
  s.salesperson_id,
  u.full_name as salesperson_name,
  s.currency,
  COUNT(*) as total_transactions,
  SUM(s.total_amount) as total_sales,
  DATE(s.transaction_date) as sale_date
FROM sales s
JOIN users u ON s.salesperson_id = u.id
GROUP BY s.salesperson_id, u.full_name, s.currency, DATE(s.transaction_date)
ORDER BY s.transaction_date DESC;
