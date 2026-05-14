-- Diagnostic Query: Verify adjustments columns exist and check data
-- Run this in Supabase SQL Editor to verify the migration worked

-- 1. Check if columns exist
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'outlet_debts' 
AND column_name IN ('adjustments', 'adjustment_reason');

-- 2. Sample data from outlet_debts to see adjustments values
SELECT 
  id,
  invoice_number,
  subtotal,
  tax_amount,
  total_amount,
  adjustments,
  adjustment_reason,
  amount_paid,
  remaining_amount,
  created_at
FROM outlet_debts
ORDER BY created_at DESC
LIMIT 10;

-- 3. Count how many records have non-zero adjustments
SELECT 
  COUNT(*) as total_records,
  COUNT(CASE WHEN adjustments IS NOT NULL AND adjustments != 0 THEN 1 END) as has_adjustments,
  COUNT(CASE WHEN adjustments IS NULL OR adjustments = 0 THEN 1 END) as no_adjustments
FROM outlet_debts;
