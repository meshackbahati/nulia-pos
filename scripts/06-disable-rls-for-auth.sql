-- Completely disable RLS on users table to fix infinite recursion
-- This is necessary for authentication queries to work properly
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies that were causing recursion
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Managers can create users" ON users;

-- Create a simple function to check if current user is manager
-- This runs without RLS restrictions
CREATE OR REPLACE FUNCTION is_current_user_manager()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE auth_user_id = auth.uid() 
    AND role = 'manager' 
    AND is_active = true
  );
$$;

-- Re-enable RLS but with simpler, non-recursive policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Simple policy: users can see their own record or if they're a manager
CREATE POLICY "users_select_policy" ON users
  FOR SELECT USING (
    auth_user_id = auth.uid() OR is_current_user_manager()
  );

-- Only managers can insert new users
CREATE POLICY "users_insert_policy" ON users
  FOR INSERT WITH CHECK (is_current_user_manager());

-- Users can update their own record, managers can update any
CREATE POLICY "users_update_policy" ON users
  FOR UPDATE USING (
    auth_user_id = auth.uid() OR is_current_user_manager()
  );

-- Only managers can delete users
CREATE POLICY "users_delete_policy" ON users
  FOR DELETE USING (is_current_user_manager());

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION is_current_user_manager() TO authenticated;
GRANT EXECUTE ON FUNCTION is_current_user_manager() TO anon;

-- Success message
SELECT 'RLS policies fixed - infinite recursion resolved' as status;
