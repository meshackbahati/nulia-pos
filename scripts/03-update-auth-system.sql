-- Update users table to support dual authentication
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE users ALTER COLUMN auth_user_id DROP NOT NULL;

-- Update RLS policies for dual auth
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Managers can create users" ON users;

-- New RLS policies for dual auth system
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (
    -- Managers: check via Supabase auth
    (role = 'manager' AND auth_user_id = auth.uid()) OR
    -- Salespersons: allow if authenticated (will be handled in app logic)
    (role = 'salesperson') OR
    -- Managers can view all users
    EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role = 'manager')
  );

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (
    (role = 'manager' AND auth_user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role = 'manager')
  );

CREATE POLICY "Managers can create users" ON users
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role = 'manager')
  );

-- Add index for password lookups
CREATE INDEX IF NOT EXISTS idx_users_email_active ON users(email, is_active) WHERE is_active = true;
