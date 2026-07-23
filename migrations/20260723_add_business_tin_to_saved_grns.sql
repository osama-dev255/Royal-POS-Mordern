-- Migration: Add business_tin column to saved_grns
-- Date: 2026-07-23
-- Purpose: Store the Business TIN number separately for print retrieval

DO $$
BEGIN
  -- Check if saved_grns table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'saved_grns') THEN
    -- Add business_tin column if it doesn't exist
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'saved_grns' AND column_name = 'business_tin'
    ) THEN
      ALTER TABLE saved_grns ADD COLUMN business_tin VARCHAR(255);
      RAISE NOTICE 'Successfully added business_tin column to saved_grns';
    ELSE
      RAISE NOTICE 'business_tin column already exists in saved_grns';
    END IF;
  ELSE
    RAISE NOTICE 'saved_grns table does not exist, skipping';
  END IF;
END $$;
