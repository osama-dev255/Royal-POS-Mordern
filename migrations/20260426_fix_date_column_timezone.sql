-- Migration: Fix date column type to avoid timezone issues
-- This ensures the date column stores dates without timezone conversion
-- Date: 2026-04-26

-- Check current column type
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'saved_delivery_notes' 
  AND column_name = 'date';

-- If the column is timestamp or timestamptz, we need to convert it to DATE
-- This will preserve the date without timezone conversion

-- Step 1: Create a temporary column
ALTER TABLE saved_delivery_notes 
ADD COLUMN IF NOT EXISTS date_new DATE;

-- Step 2: Copy data from old column to new column (extracting just the date part)
UPDATE saved_delivery_notes 
SET date_new = date::DATE
WHERE date IS NOT NULL;

-- Step 3: Drop the old column
ALTER TABLE saved_delivery_notes 
DROP COLUMN IF EXISTS date CASCADE;

-- Step 4: Rename the new column to date
ALTER TABLE saved_delivery_notes 
RENAME COLUMN date_new TO date;

-- Step 5: Add comment to document the column
COMMENT ON COLUMN saved_delivery_notes.date IS 'Delivery date (stored as DATE without timezone to avoid conversion issues)';

-- Verify the change
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'saved_delivery_notes' 
  AND column_name = 'date';

-- Show sample dates to verify they're correct
SELECT 
    delivery_note_number,
    date,
    CASE 
        WHEN date = CURRENT_DATE THEN '✅ Today'
        WHEN date = CURRENT_DATE - 1 THEN '❌ Yesterday (WRONG!)'
        WHEN date = CURRENT_DATE + 1 THEN '❌ Tomorrow (WRONG!)'
        ELSE 'Other date'
    END as date_check
FROM saved_delivery_notes
WHERE date IS NOT NULL
ORDER BY date DESC
LIMIT 10;
