-- Fix: Update incorrect source_type values in saved_delivery_notes
-- This ensures source_type matches the actual source_outlet_id
-- Date: 2026-04-26

-- Update deliveries that have source_outlet_id but source_type is not 'outlet'
UPDATE saved_delivery_notes 
SET source_type = 'outlet'
WHERE source_outlet_id IS NOT NULL 
  AND (source_type IS NULL OR source_type != 'outlet');

-- Update deliveries that don't have source_outlet_id but source_type is not 'investment'
UPDATE saved_delivery_notes 
SET source_type = 'investment'
WHERE source_outlet_id IS NULL 
  AND (source_type IS NULL OR source_type != 'investment');

-- Verify the fix
SELECT 
    id,
    delivery_note_number,
    customer,
    outlet_id,
    source_type,
    source_outlet_id,
    created_at,
    CASE 
        WHEN source_outlet_id IS NOT NULL AND source_type = 'outlet' THEN '✅ Correct'
        WHEN source_outlet_id IS NULL AND source_type = 'investment' THEN '✅ Correct'
        ELSE '❌ Still incorrect'
    END as status
FROM saved_delivery_notes
WHERE outlet_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 50;
