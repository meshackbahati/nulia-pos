-- This script fixes the "infinite recursion" error in RLS policies
-- by using a SECURITY DEFINER function to check the user's role.

-- Drop the old, faulty manager policies from all tables.
-- The EXISTS clause in these policies was causing recursion.
DROP POLICY IF EXISTS "Managers can view all users" ON public.users;
DROP POLICY IF EXISTS "Managers can manage users" ON public.users;
DROP POLICY IF EXISTS "Allow managers to manage all products" ON public.products;
DROP POLICY IF EXISTS "Allow managers to manage all sales" ON public.sales;

-- Create a SECURITY DEFINER function to check if the current user is a manager.
-- As a SECURITY DEFINER, this function runs with the privileges of the user who
-- created it, bypassing the RLS policies of the calling user. This breaks the recursion.
CREATE OR REPLACE FUNCTION is_manager()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
-- Set a search path to prevent hijacking.
SET search_path = public
AS $$
BEGIN
  -- Check if the currently authenticated user has the 'manager' role in the users table.
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE users.auth_user_id = auth.uid() AND users.role = 'manager'
  );
END;
$$;

-- Grant execute permission on the new function to authenticated users.
GRANT EXECUTE ON FUNCTION is_manager() TO authenticated;


-- === RECREATE POLICIES USING THE NON-RECURSIVE FUNCTION ===

-- Policies for 'users' table
CREATE POLICY "Managers can view all users" ON public.users FOR SELECT USING (is_manager());
CREATE POLICY "Managers can manage users" ON public.users FOR ALL USING (is_manager());

-- Policies for 'products' table
CREATE POLICY "Allow managers to manage all products" ON public.products FOR ALL USING (is_manager());

-- Policies for 'sales' table
CREATE POLICY "Allow managers to manage all sales" ON public.sales FOR ALL USING (is_manager());


DO $$
BEGIN
    RAISE NOTICE 'Recursive RLS policies have been fixed successfully!';
END $$;
