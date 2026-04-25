-- Add source tracking columns to saved_delivery_notes table
-- This allows tracking whether deliveries come from Investment (main warehouse) or other Outlets

-- Add source_type column to indicate the source of the delivery
-- 'investment' = from main warehouse/investment
-- 'outlet' = from another outlet
ALTER TABLE saved_delivery_notes 
ADD COLUMN IF NOT EXISTS source_type VARCHAR(50) DEFAULT 'investment' CHECK (source_type IN ('investment', 'outlet'));

-- Add source_outlet_id column to track which outlet the delivery came from (if source_type is 'outlet')
ALTER TABLE saved_delivery_notes 
ADD COLUMN IF NOT EXISTS source_outlet_id UUID REFERENCES outlets(id);

-- Create index for faster queries on source_type
CREATE INDEX IF NOT EXISTS idx_saved_delivery_notes_source_type ON saved_delivery_notes(source_type);

-- Create index for faster queries on source_outlet_id
CREATE INDEX IF NOT EXISTS idx_saved_delivery_notes_source_outlet ON saved_delivery_notes(source_outlet_id);

-- Add comments for clarity
COMMENT ON COLUMN saved_delivery_notes.source_type IS 'Source of delivery: investment (main warehouse) or outlet (another branch)';
COMMENT ON COLUMN saved_delivery_notes.source_outlet_id IS 'ID of the source outlet (if source_type is outlet)';
