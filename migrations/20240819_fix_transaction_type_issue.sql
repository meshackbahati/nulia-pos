-- First, drop any dependent objects
DROP TRIGGER IF EXISTS update_inventory_transactions_updated_at ON inventory_transactions;
DROP FUNCTION IF EXISTS update_modified_column();

-- Create the transaction_type enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
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
  END IF;
END $$;

-- Create a temporary table to store the existing data
CREATE TEMP TABLE temp_inventory_transactions AS SELECT * FROM inventory_transactions;

-- Drop the foreign key constraints
ALTER TABLE inventory_transactions DROP CONSTRAINT IF EXISTS inventory_transactions_product_id_fkey;
ALTER TABLE inventory_transactions DROP CONSTRAINT IF EXISTS inventory_transactions_created_by_fkey;

-- Drop the table
DROP TABLE IF EXISTS inventory_transactions CASCADE;

-- Recreate the table with the correct type
CREATE TABLE public.inventory_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  transaction_type transaction_type NOT NULL DEFAULT 'sale'::transaction_type,
  quantity integer NOT NULL,
  unit_cost numeric,
  total_cost numeric GENERATED ALWAYS AS (COALESCE(unit_cost, 0) * quantity) STORED,
  reference_id uuid,
  reference_type text,
  notes text,
  location_id uuid,
  created_by uuid,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT inventory_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_transactions_product_id_fkey FOREIGN KEY (product_id) 
    REFERENCES public.products(id) ON DELETE CASCADE,
  CONSTRAINT inventory_transactions_created_by_fkey FOREIGN KEY (created_by) 
    REFERENCES auth.users(id)
);

-- Recreate the trigger function for updated_at
CREATE OR REPLACE FUNCTION update_modified_column() 
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW; 
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER update_inventory_transactions_updated_at
BEFORE UPDATE ON inventory_transactions
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Recreate the create_sale function
CREATE OR REPLACE FUNCTION public.create_sale(
  p_salesperson_id UUID,
  p_total_amount NUMERIC,
  p_payment_method TEXT,
  p_items JSONB,
  p_customer_phone TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) 
RETURNS JSONB
LANGUAGE plpgsql
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
      v_product_id UUID := (item->>'product_id')::UUID;
      v_quantity INTEGER := (item->>'quantity')::INTEGER;
      v_unit_price NUMERIC := (item->>'unit_price')::NUMERIC;
      v_subtotal NUMERIC := (item->>'subtotal')::NUMERIC;
    BEGIN
      -- Get current quantity for the product
      SELECT quantity INTO v_old_quantity 
      FROM products 
      WHERE id = v_product_id
      FOR UPDATE;

      -- Calculate new quantity
      v_new_quantity := v_old_quantity - v_quantity;

      -- Insert sale item
      INSERT INTO sale_items (
        sale_id,
        product_id,
        quantity,
        unit_price,
        total_price
      ) VALUES (
        v_sale_id,
        v_product_id,
        v_quantity,
        v_unit_price,
        v_subtotal
      );

      -- Update product quantity
      UPDATE products
      SET 
        quantity = v_new_quantity,
        updated_at = NOW()
      WHERE id = v_product_id;

      -- Create inventory transaction record
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
        v_product_id,
        'sale',
        -v_quantity,
        v_unit_price,
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
          v_product_id,
          jsonb_build_object('quantity', v_new_quantity, 'product_id', v_product_id),
          'Product out of stock after sale'
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Error processing product %: %', v_product_id, SQLERRM;
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
$$;

-- Grant execute permission to the appropriate role
GRANT EXECUTE ON FUNCTION public.create_sale(UUID, NUMERIC, TEXT, JSONB, TEXT, TEXT) TO authenticated, anon;

-- Re-insert the data from the temporary table
-- This is commented out as it's better to do this manually in the Supabase SQL editor
-- to verify the data first
/*
INSERT INTO inventory_transactions (
  id, product_id, transaction_type, quantity, unit_cost, 
  reference_id, reference_type, notes, location_id, created_by, 
  created_at, updated_at
)
SELECT 
  id, product_id, 
  CASE 
    WHEN transaction_type::text = 'sale' THEN 'sale'::transaction_type 
    WHEN transaction_type::text = 'purchase' THEN 'purchase'::transaction_type
    ELSE 'adjustment'::transaction_type 
  END,
  quantity, unit_cost, reference_id, reference_type, 
  notes, location_id, created_by, created_at, updated_at
FROM temp_inventory_transactions;

-- Drop the temporary table
DROP TABLE temp_inventory_transactions;
*/

-- Create a function to safely cast text to transaction_type
CREATE OR REPLACE FUNCTION text_to_transaction_type(t text)
RETURNS transaction_type AS $$
BEGIN
  RETURN t::transaction_type;
EXCEPTION WHEN OTHERS THEN
  RETURN 'adjustment'::transaction_type;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
