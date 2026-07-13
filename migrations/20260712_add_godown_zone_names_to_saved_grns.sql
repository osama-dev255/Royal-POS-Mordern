-- Migration: Add godown/zone name columns to saved_grns
-- These columns store the display names alongside the existing ID columns

DO $$
BEGIN
  -- Check if saved_grns table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'saved_grns') THEN
    -- Add destination_godown_name if not exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'saved_grns' AND column_name = 'destination_godown_name'
    ) THEN
      ALTER TABLE saved_grns ADD COLUMN destination_godown_name VARCHAR(255);
    END IF;

    -- Add destination_zone_name if not exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'saved_grns' AND column_name = 'destination_zone_name'
    ) THEN
      ALTER TABLE saved_grns ADD COLUMN destination_zone_name VARCHAR(255);
    END IF;

    RAISE NOTICE 'Successfully added godown/zone name columns to saved_grns';
  ELSE
    RAISE NOTICE 'saved_grns table does not exist, skipping';
  END IF;
END $$;
