-- Quick fix script to add credit_brought_forward column and set test data
-- Run this in Supabase SQL Editor

-- Step 1: Add the column if it doesn't exist
ALTER TABLE saved_delivery_notes 
ADD COLUMN IF NOT EXISTS credit_brought_forward DECIMAL(15, 2) DEFAULT 0;

-- Step 2: Create index for performance
CREATE INDEX IF NOT EXISTS idx_saved_delivery_notes_credit_brought_forward 
ON saved_delivery_notes(credit_brought_forward) 
WHERE credit_brought_forward > 0;

-- Step 3: Add comment
COMMENT ON COLUMN saved_delivery_notes.credit_brought_forward IS 'Credit amount brought forward from previous deliveries for this customer';

-- Step 4: Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'saved_delivery_notes' 
AND column_name = 'credit_brought_forward';

-- Step 5 (OPTIONAL): Set test credit values for existing deliveries
-- Uncomment the lines below to set test data

-- Set credit for a specific delivery (replace with your delivery note number)
-- UPDATE saved_delivery_notes 
-- SET credit_brought_forward = 50000 
-- WHERE delivery_note_number = 'DN-2024-001';

-- OR set credit for the 5 most recent deliveries
-- UPDATE saved_delivery_notes 
-- SET credit_brought_forward = 25000 
-- WHERE id IN (
--   SELECT id FROM saved_delivery_notes 
--   ORDER BY created_at DESC 
--   LIMIT 5
-- );

-- Step 6: Verify the update
SELECT delivery_note_number, customer, total, credit_brought_forward 
FROM saved_delivery_notes 
WHERE credit_brought_forward > 0 
ORDER BY created_at DESC 
LIMIT 10;
