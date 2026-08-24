-- ============================================
-- Remove Duplicate "Payment - Reconciled" Ledger Entries
-- Date: 2026-08-24
-- Description: The client-side reconcileCustomerLedgerAfterDebtEdit function
--              previously upserted a debt_payment ledger entry keyed by the
--              DEBT id (reference_id = debt_id) with description =
--              'Payment - Reconciled'. However, the database triggers on
--              outlet_debt_payments already create individual debt_payment
--              entries (keyed by PAYMENT id) for every payment record. Because
--              the reconciliation query matched on reference_id = debt_id, it
--              never found the trigger-created entries (keyed by payment id)
--              and inserted DUPLICATE payment entries — overstating credits
--              and understating customer balances in the Customer Ledger
--              Account. This migration removes those duplicates and
--              recalculates all running balances to restore account truth.
-- ============================================

-- 1. AUDIT: Show the duplicate entries that will be removed
-- ============================================
SELECT
  cl.id,
  cl.outlet_id,
  cl.customer_id,
  cl.reference_id  AS debt_id,
  cl.credit_amount,
  cl.transaction_date,
  cl.created_at
FROM customer_ledger cl
WHERE cl.transaction_type = 'debt_payment'
  AND cl.description = 'Payment - Reconciled'
  AND cl.reference_id IN (SELECT id FROM outlet_debts)
ORDER BY cl.outlet_id, cl.customer_id, cl.transaction_date;

-- 2. DELETE DUPLICATE "Payment - Reconciled" ENTRIES
--    Only remove entries whose reference_id is a debt id (confirming they
--    were created by the reconciliation, not by the per-payment triggers
--    which key on outlet_debt_payments.id).
-- ============================================
DELETE FROM customer_ledger
WHERE transaction_type = 'debt_payment'
  AND description = 'Payment - Reconciled'
  AND reference_id IN (SELECT id FROM outlet_debts);

-- 3. RECALCULATE ALL RUNNING BALANCES
-- ============================================
DO $$
DECLARE
  v_customer_record RECORD;
  v_record RECORD;
  v_balance DECIMAL(15,2);
BEGIN
  FOR v_customer_record IN
    SELECT DISTINCT outlet_id, customer_id
    FROM customer_ledger
    WHERE customer_id IS NOT NULL
    ORDER BY outlet_id, customer_id
  LOOP
    v_balance := 0;
    FOR v_record IN
      SELECT id, debit_amount, credit_amount
      FROM customer_ledger
      WHERE outlet_id = v_customer_record.outlet_id
        AND customer_id = v_customer_record.customer_id
      ORDER BY transaction_date ASC, created_at ASC, id ASC
    LOOP
      v_balance := v_balance + v_record.debit_amount - v_record.credit_amount;
      UPDATE customer_ledger
      SET running_balance = v_balance
      WHERE id = v_record.id;
    END LOOP;
  END LOOP;
END $$;

-- 4. VERIFICATION: Per-customer summary after cleanup
-- ============================================
SELECT
  customer_id,
  COUNT(*)              AS transaction_count,
  SUM(debit_amount)     AS total_debits,
  SUM(credit_amount)    AS total_credits,
  MAX(running_balance)  AS final_balance
FROM customer_ledger
GROUP BY customer_id
ORDER BY final_balance DESC
LIMIT 50;

-- ============================================
-- Migration complete! Duplicate payment entries removed and balances recalculated.
-- ============================================
