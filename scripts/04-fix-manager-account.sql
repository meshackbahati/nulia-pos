-- Fix manager account linking
-- This script ensures the manager account is properly linked between auth.users and users table

-- First, let's check if the auth user exists and get their ID
DO $$
DECLARE
    auth_user_uuid UUID;
    existing_user_id UUID;
BEGIN
    -- Get the auth user ID for the manager email
    SELECT id INTO auth_user_uuid 
    FROM auth.users 
    WHERE email = 'bordershop@bordernet.co.ke';
    
    IF auth_user_uuid IS NULL THEN
        RAISE NOTICE 'Auth user not found. You need to create the user in Supabase Auth first.';
        RAISE NOTICE 'Go to Supabase Dashboard -> Authentication -> Users -> Add User';
        RAISE NOTICE 'Email: bordershop@bordernet.co.ke';
        RAISE NOTICE 'Password: borderShop@2025';
    ELSE
        RAISE NOTICE 'Found auth user with ID: %', auth_user_uuid;
        
        -- Check if user profile exists
        SELECT id INTO existing_user_id 
        FROM users 
        WHERE email = 'bordershop@bordernet.co.ke';
        
        IF existing_user_id IS NULL THEN
            -- Create new user profile
            INSERT INTO users (auth_user_id, email, full_name, role, is_active)
            VALUES (auth_user_uuid, 'bordershop@bordernet.co.ke', 'bordershop', 'manager', true);
            RAISE NOTICE 'Created new user profile for manager';
        ELSE
            -- Update existing user profile
            UPDATE users 
            SET auth_user_id = auth_user_uuid,
                role = 'manager',
                is_active = true,
                updated_at = NOW()
            WHERE email = 'bordershop@bordernet.co.ke';
            RAISE NOTICE 'Updated existing user profile for manager';
        END IF;
        
        RAISE NOTICE 'Manager account setup completed successfully!';
    END IF;
END $$;

-- Verify the setup
SELECT 
    u.id as user_id,
    u.email,
    u.full_name,
    u.role,
    u.is_active,
    u.auth_user_id,
    au.email as auth_email,
    au.created_at as auth_created_at
FROM users u
LEFT JOIN auth.users au ON u.auth_user_id = au.id
WHERE u.email = 'bordershop@bordernet.co.ke';
