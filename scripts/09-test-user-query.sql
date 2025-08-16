-- Test script to verify user data and debug authentication issues
-- Run this in Supabase SQL Editor

-- Check all users in the database
SELECT 'All users:' as info;
SELECT id, auth_user_id, email, full_name, role, is_active, created_at 
FROM users 
ORDER BY created_at DESC;

-- Check specifically for the manager account
SELECT 'Manager account search:' as info;
SELECT id, auth_user_id, email, full_name, role, is_active, 
       pg_typeof(is_active) as is_active_type,
       created_at 
FROM users 
WHERE email = 'bordershop@bordernet.co.ke';

-- Check auth.users table for the Supabase auth user
SELECT 'Supabase auth users:' as info;
SELECT id, email, created_at, email_confirmed_at, last_sign_in_at
FROM auth.users 
WHERE email = 'bordershop@bordernet.co.ke';

-- Check if there's a mismatch between auth_user_id and actual auth.users
SELECT 'Auth ID mismatch check:' as info;
SELECT u.email, u.auth_user_id, au.id as actual_auth_id,
       CASE WHEN u.auth_user_id = au.id THEN 'MATCH' ELSE 'MISMATCH' END as status
FROM users u
LEFT JOIN auth.users au ON au.email = u.email
WHERE u.email = 'bordershop@bordernet.co.ke';

-- Check RLS policies on users table
SELECT 'RLS policies on users table:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'users';
