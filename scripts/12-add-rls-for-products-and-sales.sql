-- This script enables RLS and adds policies for the products and sales tables.

-- Enable RLS for products and sales tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Ensure the tables are not publicly accessible by default
ALTER TABLE public.products FORCE ROW LEVEL SECURITY;
ALTER TABLE public.sales FORCE ROW LEVEL SECURITY;

-- Grant base permissions to the authenticated role. RLS policies will then restrict access.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sales TO authenticated;


-- === POLICIES FOR 'products' TABLE ===

-- 1. Allow any authenticated user to view products.
-- This is a business decision. If only certain roles should see products, this would need to be changed.
CREATE POLICY "Allow authenticated users to view products"
ON public.products
FOR SELECT
TO authenticated
USING (true);

-- 2. Allow managers to do anything with products.
CREATE POLICY "Allow managers to manage all products"
ON public.products
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users WHERE users.auth_user_id = auth.uid() AND users.role = 'manager'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users WHERE users.auth_user_id = auth.uid() AND users.role = 'manager'
  )
);


-- === POLICIES FOR 'sales' TABLE ===

-- 1. Allow salespersons to create and view their own sales records.
CREATE POLICY "Allow salespersons to access their own sales"
ON public.sales
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users WHERE users.auth_user_id = auth.uid() AND users.id = salesperson_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users WHERE users.auth_user_id = auth.uid() AND users.id = salesperson_id
  )
);

-- 2. Allow managers to do anything with sales records.
CREATE POLICY "Allow managers to manage all sales"
ON public.sales
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users WHERE users.auth_user_id = auth.uid() AND users.role = 'manager'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users WHERE users.auth_user_id = auth.uid() AND users.role = 'manager'
  )
);

DO $$
BEGIN
    RAISE NOTICE 'RLS policies for products and sales have been created successfully!';
END $$;
