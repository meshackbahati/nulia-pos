-- Update RLS policies for sales table to allow sales to be created
-- Migration: 20240819_update_sales_rls_policies

-- Enable RLS on sales table if not already enabled
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.sales;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.sales;

-- Create new policies
-- Allow any authenticated user to insert sales
CREATE POLICY "Enable insert for authenticated users" 
ON public.sales
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Allow users to read their own sales
CREATE POLICY "Enable read access for users based on salesperson_id" 
ON public.sales
FOR SELECT 
TO authenticated
USING (auth.uid() = salesperson_id);

-- Allow managers to read all sales
CREATE POLICY "Enable read access for managers" 
ON public.sales
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_user_meta_data->>'role' = 'manager'
  )
);

-- Allow updates only for managers or the original salesperson
CREATE POLICY "Enable update for managers and sales owners" 
ON public.sales
FOR UPDATE 
TO authenticated
USING (
  auth.uid() = salesperson_id OR
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_user_meta_data->>'role' = 'manager'
  )
);

-- Allow deletes only for managers
CREATE POLICY "Enable delete for managers only" 
ON public.sales
FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_user_meta_data->>'role' = 'manager'
  )
);
