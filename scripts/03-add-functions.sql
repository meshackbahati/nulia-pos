-- Function to safely update product quantity after sale
CREATE OR REPLACE FUNCTION update_product_quantity(
  product_id UUID,
  quantity_sold INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE products 
  SET 
    quantity = GREATEST(0, quantity - quantity_sold),
    updated_at = NOW()
  WHERE id = product_id;
  
  -- Check if update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product with id % not found', product_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get low stock products
CREATE OR REPLACE FUNCTION get_low_stock_products()
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  category VARCHAR,
  quantity INTEGER,
  low_stock_threshold INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, p.category, p.quantity, p.low_stock_threshold
  FROM products p
  WHERE p.quantity <= p.low_stock_threshold
  ORDER BY p.quantity ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to get sales report by date range
CREATE OR REPLACE FUNCTION get_sales_report(
  start_date DATE,
  end_date DATE,
  salesperson_id UUID DEFAULT NULL
)
RETURNS TABLE (
  sale_date DATE,
  total_sales DECIMAL,
  transaction_count BIGINT,
  avg_sale_amount DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(s.transaction_date) as sale_date,
    SUM(s.total_amount) as total_sales,
    COUNT(*) as transaction_count,
    AVG(s.total_amount) as avg_sale_amount
  FROM sales s
  WHERE DATE(s.transaction_date) BETWEEN start_date AND end_date
    AND (salesperson_id IS NULL OR s.salesperson_id = get_sales_report.salesperson_id)
  GROUP BY DATE(s.transaction_date)
  ORDER BY sale_date DESC;
END;
$$ LANGUAGE plpgsql;
