-- Test Update: Set adjustments on a recent debt record
-- Run this in Supabase SQL Editor to test if adjustments field works

-- Update the most recent debt record with test adjustments
UPDATE outlet_debts
SET 
  adjustments = 50.00,
  adjustment_reason = 'Test adjustment to verify field works'
WHERE id = (
  SELECT id 
  FROM outlet_debts 
  ORDER BY created_at DESC 
  LIMIT 1
);

-- Verify the update
SELECT 
  id,
  invoice_number,
  adjustments,
  adjustment_reason,
  total_amount
FROM outlet_debts
ORDER BY created_at DESC
LIMIT 1;
