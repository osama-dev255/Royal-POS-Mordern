-- Migration: Add logistic_details JSON column to saved_grns
-- Date: 2026-07-23
-- Purpose: Store full logistic details (driver phone, transport company, license, etc.)

DO $$
BEGIN
  -- Check if saved_grns table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'saved_grns') THEN
    -- Add logistic_details column if it doesn't exist
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'saved_grns' AND column_name = 'logistic_details'
    ) THEN
      ALTER TABLE saved_grns ADD COLUMN logistic_details JSONB;
      RAISE NOTICE 'Successfully added logistic_details column to saved_grns';
    ELSE
      RAISE NOTICE 'logistic_details column already exists in saved_grns';
    END IF;
  ELSE
    RAISE NOTICE 'saved_grns table does not exist, skipping';
  END IF;
END $$;
