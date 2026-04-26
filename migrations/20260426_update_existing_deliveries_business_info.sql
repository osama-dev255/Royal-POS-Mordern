-- Migration: Update existing deliveries with default business information
-- This populates business_name and business_address for deliveries that were saved before these fields were added
-- Date: 2026-04-26

-- Update all existing deliveries that have NULL business_name with the default business information
UPDATE saved_delivery_notes 
SET 
    business_name = 'KILANGO INVESTMENT LTD',
    business_address = 'P.O.BOX 64, Muheza - Tanga - Tanzania.'
WHERE 
    business_name IS NULL 
    OR business_name = '';

-- Verify the update
SELECT 
    id, 
    delivery_note_number, 
    business_name, 
    business_address,
    created_at
FROM saved_delivery_notes 
ORDER BY created_at DESC 
LIMIT 10;
