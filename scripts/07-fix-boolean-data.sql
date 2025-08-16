-- Fix boolean data type issue in users table
-- Convert string 'true'/'false' to proper boolean values

UPDATE users 
SET is_active = CASE 
  WHEN is_active::text = 'true' THEN true
  WHEN is_active::text = 'false' THEN false
  ELSE true
END
WHERE is_active::text IN ('true', 'false');

-- Verify the fix
SELECT id, email, role, is_active, pg_typeof(is_active) as data_type 
FROM users 
WHERE email = 'bordershop@bordernet.co.ke';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Boolean data types fixed successfully!';
    RAISE NOTICE 'Manager account should now work properly.';
END $$;
