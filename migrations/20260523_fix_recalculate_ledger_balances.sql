-- ============================================
-- Fix: Recalculate All Customer Ledger Balances
-- Date: 2026-05-23
-- Description: Fixes incorrect running_balance values in customer_ledger table
-- ============================================

-- 1. RESET ALL RUNNING BALANCES TO 0
-- ============================================
UPDATE customer_ledger
SET running_balance = 0;

-- 2. RECALCULATE ALL BALANCES CORRECTLY
-- ============================================
DO $$
DECLARE
  v_record RECORD;
  v_customer_record RECORD;
  v_balance DECIMAL(15,2);
BEGIN
  -- Get all unique customer combinations
  FOR v_customer_record IN 
    SELECT DISTINCT outlet_id, customer_id
    FROM customer_ledger
    WHERE customer_id IS NOT NULL
    ORDER BY outlet_id, customer_id
  LOOP
    v_balance := 0;
    
    -- Process each customer's transactions in chronological order
    FOR v_record IN 
      SELECT id, debit_amount, credit_amount
      FROM customer_ledger
      WHERE outlet_id = v_customer_record.outlet_id
        AND customer_id = v_customer_record.customer_id
      ORDER BY transaction_date ASC, created_at ASC, id ASC
    LOOP
      -- Calculate running balance: debit adds, credit subtracts
      v_balance := v_balance + v_record.debit_amount - v_record.credit_amount;
      
      -- Update the running balance for this entry
      UPDATE customer_ledger
      SET running_balance = v_balance
      WHERE id = v_record.id;
    END LOOP;
    
    RAISE NOTICE 'Recalculated balance for outlet %, customer %: %', 
      v_customer_record.outlet_id, 
      v_customer_record.customer_id, 
      v_balance;
  END LOOP;
END $$;

-- 3. VERIFICATION QUERY
-- ============================================
-- Show sample of corrected balances
SELECT 
  customer_id,
  COUNT(*) as transaction_count,
  SUM(debit_amount) as total_debits,
  SUM(credit_amount) as total_credits,
  MAX(running_balance) as final_balance
FROM customer_ledger
GROUP BY customer_id
ORDER BY final_balance DESC
LIMIT 20;

-- ============================================
-- Fix complete! All running balances have been recalculated.
-- ============================================
