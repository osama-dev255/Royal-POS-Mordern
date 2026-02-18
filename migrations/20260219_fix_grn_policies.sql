-- Alternative migration to fix GRN RLS policies
-- Use this if the main migration fails

-- First, check if the table exists
DO $$ 
BEGIN
  -- Enable RLS if not already enabled
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'saved_grns') THEN
    ALTER TABLE saved_grns ENABLE ROW LEVEL SECURITY;
    
    -- Drop all existing policies
    DROP POLICY IF EXISTS "Users can view their own saved GRNs" ON saved_grns;
    DROP POLICY IF EXISTS "Users can insert their own saved GRNs" ON saved_grns;
    DROP POLICY IF EXISTS "Users can update their own saved GRNs" ON saved_grns;
    DROP POLICY IF EXISTS "Users can delete their own saved GRNs" ON saved_grns;
    DROP POLICY IF EXISTS "Enable read access for all users" ON saved_grns;
    DROP POLICY IF EXISTS "Enable insert access for all users" ON saved_grns;
    DROP POLICY IF EXISTS "Enable update access for all users" ON saved_grns;
    DROP POLICY IF EXISTS "Enable delete access for all users" ON saved_grns;
    
    -- Create new permissive policies for development
    CREATE POLICY "Enable read access for all users" ON saved_grns FOR SELECT USING (true);
    CREATE POLICY "Enable insert access for all users" ON saved_grns FOR INSERT WITH CHECK (true);
    CREATE POLICY "Enable update access for all users" ON saved_grns FOR UPDATE USING (true);
    CREATE POLICY "Enable delete access for all users" ON saved_grns FOR DELETE USING (true);
    
    RAISE NOTICE 'GRN policies updated successfully';
  ELSE
    RAISE NOTICE 'saved_grns table does not exist. Please run the main migration first.';
  END IF;
END $$;