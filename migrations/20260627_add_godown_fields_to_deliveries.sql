-- Migration: Add Godown Fields to Delivery Notes and GRNs
-- Date: 2026-06-27
-- Purpose: Integrate godown system with delivery notes and GRN workflows

-- Add godown columns to saved_delivery_notes table
ALTER TABLE saved_delivery_notes
ADD COLUMN IF NOT EXISTS source_godown_id UUID REFERENCES godowns(id),
ADD COLUMN IF NOT EXISTS source_zone_id UUID REFERENCES godown_zones(id),
ADD COLUMN IF NOT EXISTS destination_godown_id UUID REFERENCES godowns(id),
ADD COLUMN IF NOT EXISTS destination_zone_id UUID REFERENCES godown_zones(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_delivery_source_godown ON saved_delivery_notes(source_godown_id);
CREATE INDEX IF NOT EXISTS idx_delivery_destination_godown ON saved_delivery_notes(destination_godown_id);
CREATE INDEX IF NOT EXISTS idx_delivery_source_zone ON saved_delivery_notes(source_zone_id);
CREATE INDEX IF NOT EXISTS idx_delivery_destination_zone ON saved_delivery_notes(destination_zone_id);

-- Add godown columns to saved_grns table
-- First check if table exists (it might be using a different name)
DO $$
BEGIN
  -- Check if saved_grns table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'saved_grns') THEN
    ALTER TABLE saved_grns
    ADD COLUMN IF NOT EXISTS destination_godown_id UUID REFERENCES godowns(id),
    ADD COLUMN IF NOT EXISTS destination_zone_id UUID REFERENCES godown_zones(id);
    
    CREATE INDEX IF NOT EXISTS idx_grn_destination_godown ON saved_grns(destination_godown_id);
    CREATE INDEX IF NOT EXISTS idx_grn_destination_zone ON saved_grns(destination_zone_id);
    
    RAISE NOTICE 'Updated saved_grns table with godown columns';
  ELSE
    RAISE NOTICE 'saved_grns table does not exist, skipping';
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN saved_delivery_notes.source_godown_id IS 'Source godown for outgoing deliveries (when sourceType=investment)';
COMMENT ON COLUMN saved_delivery_notes.source_zone_id IS 'Source zone within the godown';
COMMENT ON COLUMN saved_delivery_notes.destination_godown_id IS 'Destination godown (if delivering to another godown)';
COMMENT ON COLUMN saved_delivery_notes.destination_zone_id IS 'Destination zone within the godown';
COMMENT ON COLUMN saved_grns.destination_godown_id IS 'Destination godown where goods are received';
COMMENT ON COLUMN saved_grns.destination_zone_id IS 'Destination zone within the godown';

-- Update existing records: set sourceType to 'investment' where it's NULL
UPDATE saved_delivery_notes 
SET source_type = 'investment' 
WHERE source_type IS NULL;
