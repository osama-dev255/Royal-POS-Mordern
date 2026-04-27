-- Migration: Add source tracking columns to saved_delivery_notes table
-- This ensures deliveries can be properly categorized as "From Investment" or "From Other Outlets"
-- Date: 2026-04-26

-- Add source_outlet_id column (stores the ID of the outlet that sent this delivery)
ALTER TABLE saved_delivery_notes 
ADD COLUMN IF NOT EXISTS source_outlet_id UUID REFERENCES outlets(id);

-- Add source_type column (categorizes delivery source)
ALTER TABLE saved_delivery_notes 
ADD COLUMN IF NOT EXISTS source_type TEXT CHECK (source_type IN ('investment', 'outlet'));

-- Add source_business_name column (business name of source outlet)
ALTER TABLE saved_delivery_notes 
ADD COLUMN IF NOT EXISTS source_business_name TEXT;

-- Add source_address column (address of source outlet)
ALTER TABLE saved_delivery_notes 
ADD COLUMN IF NOT EXISTS source_address TEXT;

-- Add comments to document the columns
COMMENT ON COLUMN saved_delivery_notes.source_outlet_id IS 'ID of the outlet that sent this delivery (for inter-outlet transfers)';
COMMENT ON COLUMN saved_delivery_notes.source_type IS 'Type of source: "investment" from company warehouse, "outlet" from another outlet';
COMMENT ON COLUMN saved_delivery_notes.source_business_name IS 'Business name of the source outlet';
COMMENT ON COLUMN saved_delivery_notes.source_address IS 'Address of the source outlet';

-- Create index for faster filtering by source_type
CREATE INDEX IF NOT EXISTS idx_saved_delivery_notes_source_type 
ON saved_delivery_notes(source_type);

-- Create index for faster filtering by source_outlet_id
CREATE INDEX IF NOT EXISTS idx_saved_delivery_notes_source_outlet 
ON saved_delivery_notes(source_outlet_id);

-- Update existing records: if source_outlet_id exists, set source_type to 'outlet'
UPDATE saved_delivery_notes 
SET source_type = 'outlet'
WHERE source_outlet_id IS NOT NULL 
  AND source_type IS NULL;

-- Update existing records: if no source_outlet_id, set source_type to 'investment'
UPDATE saved_delivery_notes 
SET source_type = 'investment'
WHERE source_outlet_id IS NULL 
  AND source_type IS NULL;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'saved_delivery_notes' 
  AND column_name IN ('source_outlet_id', 'source_type', 'source_business_name', 'source_address')
ORDER BY column_name;

-- Show sample data with categorization
SELECT 
    delivery_note_number,
    customer,
    source_type,
    source_outlet_id,
    CASE 
        WHEN source_outlet_id IS NOT NULL AND source_type = 'outlet' THEN '✅ From Other Outlets'
        WHEN source_outlet_id IS NULL AND source_type = 'investment' THEN '✅ From Investment'
        ELSE '❌ Needs attention'
    END as categorization_status
FROM saved_delivery_notes
WHERE outlet_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
