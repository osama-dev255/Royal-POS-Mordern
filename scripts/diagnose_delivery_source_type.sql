-- Diagnostic: Check deliveries with incorrect source_type
-- This shows deliveries where source_type doesn't match source_outlet_id

SELECT 
    id,
    delivery_note_number,
    customer,
    outlet_id,
    source_type,
    source_outlet_id,
    created_at,
    CASE 
        WHEN source_outlet_id IS NOT NULL AND source_type != 'outlet' THEN '❌ INCORRECT - Should be outlet'
        WHEN source_outlet_id IS NULL AND source_type != 'investment' THEN '❌ INCORRECT - Should be investment'
        ELSE '✅ Correct'
    END as status
FROM saved_delivery_notes
WHERE outlet_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 50;
