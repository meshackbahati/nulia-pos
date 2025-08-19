-- First, check if we can modify the transaction_type column
DO $$
BEGIN
  -- Add a default value to the transaction_type column
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'inventory_transactions' AND column_name = 'transaction_type') THEN
    
    -- First, drop any dependent objects that might be causing issues
    DROP TRIGGER IF EXISTS update_inventory_transactions_updated_at ON inventory_transactions;
    DROP FUNCTION IF EXISTS update_modified_column();
    
    -- Add a default value to the column
    EXECUTE 'ALTER TABLE inventory_transactions 
             ALTER COLUMN transaction_type SET DEFAULT ''sale''::transaction_type';
    
    -- Update any existing NULL values to have a default value
    UPDATE inventory_transactions 
    SET transaction_type = 'sale' 
    WHERE transaction_type IS NULL;
    
    -- Make the column NOT NULL if it isn't already
    BEGIN
      EXECUTE 'ALTER TABLE inventory_transactions ALTER COLUMN transaction_type SET NOT NULL';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Column transaction_type is already NOT NULL';
    END;
    
    -- Recreate the update trigger if it existed
    CREATE OR REPLACE FUNCTION update_modified_column() 
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW; 
    END;
    $$ LANGUAGE plpgsql;
    
    CREATE TRIGGER update_inventory_transactions_updated_at
    BEFORE UPDATE ON inventory_transactions
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();
    
  END IF;
END $$;

-- Drop and recreate the create_sale function to be extra safe
DROP FUNCTION IF EXISTS public.create_sale(UUID, NUMERIC, TEXT, JSONB, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.create_sale(
  p_salesperson_id UUID,
  p_total_amount NUMERIC,
  p_payment_method TEXT,
  p_items JSONB,
  p_customer_phone TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) 
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale_id UUID;
  v_receipt_number TEXT;
  item JSONB;
  v_product_quantity INTEGER;
BEGIN
  -- Generate receipt number
  v_receipt_number := 'INV-' || to_char(CURRENT_DATE, 'YYYYMMDD-') || 
                     lpad((COALESCE((
                       SELECT MAX(SUBSTRING(receipt_number, 14)::INT) 
                       FROM sales 
                       WHERE receipt_number LIKE 'INV-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-%'
                     ), 0) + 1)::TEXT, 4, '0');

  -- Insert the sale record
  INSERT INTO sales (
    salesperson_id,
    total_amount,
    currency,
    payment_method,
    receipt_number,
    status,
    customer_phone,
    notes
  ) VALUES (
    p_salesperson_id,
    p_total_amount,
    'KES',
    p_payment_method,
    v_receipt_number,
    'completed',
    p_customer_phone,
    p_notes
  ) RETURNING id INTO v_sale_id;

  -- Process each sale item
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    DECLARE
      v_old_quantity INTEGER;
      v_new_quantity INTEGER;
    BEGIN
      -- Get current quantity for the product
      SELECT quantity INTO v_old_quantity 
      FROM products 
      WHERE id = (item->>'product_id')::UUID
      FOR UPDATE;

      -- Calculate new quantity
      v_new_quantity := v_old_quantity - (item->>'quantity')::INTEGER;

      -- Insert sale item
      INSERT INTO sale_items (
        sale_id,
        product_id,
        quantity,
        unit_price,
        total_price
      ) VALUES (
        v_sale_id,
        (item->>'product_id')::UUID,
        (item->>'quantity')::INTEGER,
        (item->>'unit_price')::NUMERIC,
        (item->>'subtotal')::NUMERIC
      );

      -- Update product quantity
      UPDATE products
      SET 
        quantity = v_new_quantity,
        updated_at = NOW()
      WHERE id = (item->>'product_id')::UUID;

      -- Create inventory transaction record with explicit type casting
      -- Using the column list to ensure we're only setting the fields we want
      INSERT INTO inventory_transactions (
        product_id,
        transaction_type,
        quantity,
        unit_cost,
        reference_id,
        reference_type,
        notes,
        created_by
      ) VALUES (
        (item->>'product_id')::UUID,
        'sale'::transaction_type,
        -((item->>'quantity')::INTEGER),
        (item->>'unit_price')::NUMERIC,
        v_sale_id,
        'sale',
        'Sale transaction: ' || v_receipt_number,
        p_salesperson_id
      );

      -- Check for low stock and log if needed
      IF v_new_quantity <= 0 THEN
        INSERT INTO audit_logs (
          user_id,
          action,
          table_name,
          record_id,
          new_values,
          notes
        ) VALUES (
          p_salesperson_id,
          'low_stock',
          'products',
          (item->>'product_id')::UUID,
          jsonb_build_object('quantity', v_new_quantity, 'product_id', (item->>'product_id')::UUID),
          'Product out of stock after sale'
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Error processing product %: %', (item->>'product_id')::UUID, SQLERRM;
    END;
  END LOOP;

  -- Return success with sale ID and receipt number
  RETURN jsonb_build_object(
    'success', true,
    'sale_id', v_sale_id,
    'receipt_number', v_receipt_number
  );

EXCEPTION WHEN OTHERS THEN
  -- Log the error
  RAISE NOTICE 'Error creating sale: %', SQLERRM;
  
  -- Return error details
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'error_code', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to the appropriate role
GRANT EXECUTE ON FUNCTION public.create_sale(UUID, NUMERIC, TEXT, JSONB, TEXT, TEXT) TO authenticated, anon;
