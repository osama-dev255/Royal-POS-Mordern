-- Migration to add total_amount column to saved_grns table
-- This script should be run in the Supabase SQL editor

-- Add the total_amount column to the saved_grns table
ALTER TABLE saved_grns ADD COLUMN IF NOT EXISTS total_amount NUMERIC DEFAULT 0;

-- Update existing records to calculate and populate total_amount from items
UPDATE saved_grns 
SET total_amount = (
  SELECT COALESCE(
    (SELECT SUM(
      CASE 
        WHEN jsonb_typeof(items) = 'array' 
        THEN (item->>'totalWithReceivingCost')::NUMERIC 
        ELSE (item->>'total')::NUMERIC 
      END
    )
    FROM jsonb_array_elements(items) AS item),
    0
  )
);

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';