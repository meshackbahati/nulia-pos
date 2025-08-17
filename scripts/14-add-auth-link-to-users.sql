-- This script adds the auth_user_id to the users table to link it
-- to the Supabase auth system. This is critical for RLS policies.

-- Add the column to the users table.
-- It references auth.users(id) and will be set to NULL for existing users
-- who might not have an auth entry (e.g., salespersons created before this change).
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create an index for performance on the new column.
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);

-- After running this, you may need to manually update existing manager records
-- to link them to their corresponding auth.users entry.
-- For example:
-- UPDATE public.users
-- SET auth_user_id = (SELECT id FROM auth.users WHERE email = 'bordershop@bordernet.co.ke')
-- WHERE email = 'bordershop@bordernet.co.ke';

DO $$
BEGIN
    RAISE NOTICE 'auth_user_id column added to users table successfully!';
    RAISE NOTICE 'Manual data update may be required for existing users.';
END $$;
