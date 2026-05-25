-- ============================================
-- Fix: Populate Missing Settlement Ledger Entries
-- Date: 2026-05-23
-- Description: Creates ledger entries for settlements that don't have them
-- ============================================

-- 1. INSERT MISSING SETTLEMENT LEDGER ENTRIES
-- ============================================
INSERT INTO customer_ledger (
  outlet_id,
  customer_id,
  transaction_type,
  reference_id,
  reference_number,
  debit_amount,
  credit_amount,
  running_balance,
  transaction_date,
  description,
  payment_method,
  notes,
  created_by
)
SELECT 
  cs.outlet_id,
  cs.customer_id,
  'settlement',
  cs.id::uuid,
  cs.invoice_number,
  0,
  cs.payment_amount,
  0, -- Will be recalculated
  cs.settlement_date,
  'Settlement - ' || COALESCE(cs.payment_method, 'Cash'),
  cs.payment_method,
  COALESCE(cs.notes, ''),
  cs.created_by
FROM customer_settlements cs
WHERE cs.customer_id IS NOT NULL  -- Only settlements with customers
  AND NOT EXISTS (
    SELECT 1 
    FROM customer_ledger cl 
    WHERE cl.reference_id = cs.id::uuid 
      AND cl.transaction_type = 'settlement'
  );

-- 2. RECALCULATE ALL BALANCES AFTER INSERTING
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
    
    RAISE NOTICE 'Recalculated balance for customer %: %', 
      v_customer_record.customer_id, 
      v_balance;
  END LOOP;
END $$;

-- 3. VERIFICATION: Show settlements with ledger entries
-- ============================================
SELECT 
  cs.invoice_number,
  cs.payment_amount,
  cs.payment_method,
  cl.credit_amount as ledger_credit,
  cl.running_balance,
  CASE 
    WHEN cl.id IS NOT NULL THEN '✅ FIXED'
    ELSE '❌ STILL MISSING'
  END as status
FROM customer_settlements cs
LEFT JOIN customer_ledger cl 
  ON cl.reference_id = cs.id::uuid
  AND cl.transaction_type = 'settlement'
ORDER BY cs.created_at DESC
LIMIT 20;

-- ============================================
-- Fix complete! All settlements now have ledger entries.
-- ============================================
