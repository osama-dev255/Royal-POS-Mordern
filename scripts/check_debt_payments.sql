-- Diagnostic Query: Check if debt payments are being tracked
-- Run this in Supabase SQL Editor

-- 1. Check if outlet_debt_payments table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'outlet_debt_payments';

-- 2. Check the structure of outlet_debt_payments
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'outlet_debt_payments'
ORDER BY ordinal_position;

-- 3. Count payment records
SELECT COUNT(*) as total_payments FROM outlet_debt_payments;

-- 4. Show recent payment records (if any)
SELECT 
  id,
  debt_id,
  amount,
  payment_date,
  payment_method,
  notes,
  created_at
FROM outlet_debt_payments
ORDER BY created_at DESC
LIMIT 10;

-- 5. Check outlet_debts table structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'outlet_debts'
AND column_name IN ('amount_paid', 'remaining_amount', 'payment_status')
ORDER BY ordinal_position;

-- 6. Show debts with payments
SELECT 
  d.id,
  d.invoice_number,
  d.total_amount,
  d.amount_paid,
  d.remaining_amount,
  d.payment_status,
  COUNT(p.id) as payment_count,
  COALESCE(SUM(p.amount), 0) as total_payments_recorded
FROM outlet_debts d
LEFT JOIN outlet_debt_payments p ON d.id = p.debt_id
GROUP BY d.id
HAVING COUNT(p.id) > 0 OR d.amount_paid > 0
ORDER BY d.created_at DESC
LIMIT 20;
