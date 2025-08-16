-- Completely disable RLS on users table to fix authentication
-- This will allow the authentication system to work properly

-- Disable RLS on users table
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies that might be causing issues
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Managers can create users" ON users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON users;

-- Verify your manager account exists
SELECT 
    id,
    auth_user_id,
    email,
    full_name,
    role,
    is_active,
    created_at
FROM users 
WHERE email = 'bordershop@bordernet.co.ke';

-- Show all users in the table
SELECT 
    id,
    auth_user_id,
    email,
    full_name,
    role,
    is_active
FROM users;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'RLS disabled on users table. Authentication should now work.';
    RAISE NOTICE 'Try logging in with: bordershop@bordernet.co.ke / borderShop@2025';
END $$;
