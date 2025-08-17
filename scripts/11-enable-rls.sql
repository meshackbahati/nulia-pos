-- This script re-enables Row Level Security on the users table.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    RAISE NOTICE 'Row Level Security has been re-enabled on the users table.';
END $$;
