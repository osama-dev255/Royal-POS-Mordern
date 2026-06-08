-- Diagnostic Query: Check Customer Balance Sources
-- Run this in Supabase SQL Editor to see balance calculation for Osama Abeid

-- Step 1: Find the customer
SELECT id, first_name, last_name, phone, email
FROM outlet_customers
WHERE first_name = 'Osama' AND last_name = 'Abeid';

-- Replace 'CUSTOMER_ID_HERE' with the actual customer ID from above
-- Step 2: Check all debts for this customer
SELECT 
  id,
  outlet_id,
  customer_id,
  total_amount,
  payment_amount,
  remaining_amount,
  payment_status,
  created_at
FROM outlet_debts
WHERE customer_id = 'CUSTOMER_ID_HERE'
ORDER BY created_at DESC;

-- Step 3: Check all settlements for this customer
SELECT 
  id,
  outlet_id,
  customer_id,
  amount,
  payment_amount,
  previous_balance,
  new_balance,
  payment_method,
  settlement_date,
  created_at
FROM customer_settlements
WHERE customer_id = 'CUSTOMER_ID_HERE'
ORDER BY created_at DESC;

-- Step 4: Calculate what the balance SHOULD be
-- Using the MOST RECENT settlement's new_balance
SELECT 
  new_balance as "Balance from Latest Settlement",
  settlement_date as "Settlement Date"
FROM customer_settlements
WHERE customer_id = 'CUSTOMER_ID_HERE'
ORDER BY created_at DESC
LIMIT 1;

-- Step 5: Calculate using debts only (sum of all remaining amounts)
SELECT 
  SUM(remaining_amount) as "Sum of All Debt Remaining Amounts",
  COUNT(*) as "Total Debt Records",
  MAX(created_at) as "Latest Debt Record"
FROM outlet_debts
WHERE customer_id = 'CUSTOMER_ID_HERE';

-- Step 6: Check recent sales with balance_carried_forward
SELECT 
  'cash' as sale_type,
  id,
  customer_id,
  balance_carried_forward,
  total_amount,
  amount_paid,
  sale_date,
  created_at
FROM outlet_cash_sales
WHERE customer_id = 'CUSTOMER_ID_HERE'
UNION ALL
SELECT 
  'card' as sale_type,
  id,
  customer_id,
  balance_carried_forward,
  total_amount,
  amount_paid,
  sale_date,
  created_at
FROM outlet_card_sales
WHERE customer_id = 'CUSTOMER_ID_HERE'
UNION ALL
SELECT 
  'mobile' as sale_type,
  id,
  customer_id,
  balance_carried_forward,
  total_amount,
  amount_paid,
  sale_date,
  created_at
FROM outlet_mobile_sales
WHERE customer_id = 'CUSTOMER_ID_HERE'
ORDER BY created_at DESC
LIMIT 10;
