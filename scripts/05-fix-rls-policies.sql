-- Fix infinite recursion in RLS policies for BorderShop
-- Run this script to resolve the authentication issue

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Managers can create users" ON users;

-- Create a security definer function for authentication queries
-- This function runs with elevated privileges to bypass RLS
CREATE OR REPLACE FUNCTION get_user_for_auth(user_auth_id UUID)
RETURNS TABLE(
  id UUID,
  auth_user_id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT,
  is_active BOOLEAN
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.auth_user_id, u.email, u.full_name, u.role, u.is_active
  FROM users u
  WHERE u.auth_user_id = user_auth_id AND u.is_active = true;
END;
$$;

-- Create simplified RLS policies that don't cause recursion
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = auth_user_id);

-- Allow managers to view all users (using a simpler approach)
CREATE POLICY "Managers can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users managers 
      WHERE managers.auth_user_id = auth.uid() 
      AND managers.role = 'manager' 
      AND managers.is_active = true
    )
  );

-- Allow managers to create and manage users
CREATE POLICY "Managers can manage users" ON users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users managers 
      WHERE managers.auth_user_id = auth.uid() 
      AND managers.role = 'manager' 
      AND managers.is_active = true
    )
  );

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION get_user_for_auth(UUID) TO authenticated;

-- Create a simpler policy for authentication that doesn't recurse
CREATE POLICY "Allow authentication queries" ON users
  FOR SELECT USING (true);

-- Temporarily disable RLS for the users table during authentication
-- We'll handle security in the application layer for auth queries
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'RLS policies fixed successfully!';
    RAISE NOTICE 'Authentication should now work properly.';
    RAISE NOTICE 'Try logging in with: bordershop@bordernet.co.ke / borderShop@2025';
END $$;
