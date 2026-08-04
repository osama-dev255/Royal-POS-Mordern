-- Migration: Add suppliers JSONB column to saved_grns
-- This stores the full supplier array including documentUrl/documentName
-- so that the supplier document link is available when viewing saved GRNs.

DO $$
BEGIN
  -- Check if saved_grns table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'saved_grns') THEN

    -- Add suppliers column if it doesn't exist
    IF NOT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_name = 'saved_grns' AND column_name = 'suppliers'
    ) THEN
      ALTER TABLE saved_grns ADD COLUMN suppliers JSONB;
      RAISE NOTICE 'Successfully added suppliers column to saved_grns';
    ELSE
      RAISE NOTICE 'suppliers column already exists in saved_grns';
    END IF;

  ELSE
    RAISE NOTICE 'saved_grns table does not exist, skipping';
  END IF;
END $$;
