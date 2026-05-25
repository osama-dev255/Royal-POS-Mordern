-- ============================================
-- Populate Customer Ledger with Historical Data
-- Date: 2026-05-23
-- Description: Migrates existing transactions to the new customer_ledger table
-- ============================================

-- IMPORTANT: Run this AFTER running 20260523_create_customer_ledger_table.sql

-- 1. MIGRATE CREDIT SALES (OUTLET_DEBTS)
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
  created_at
)
SELECT 
  od.outlet_id,
  od.customer_id,
  'credit_sale',
  od.id,
  od.invoice_number,
  COALESCE(od.total_amount, 0),
  0,
  0, -- Will be recalculated
  COALESCE(od.debt_date, od.created_at, NOW()),
  'Credit Sale - ' || COALESCE(od.payment_status, 'Created'),
  'debt',
  COALESCE(od.notes, ''),
  od.created_at
FROM outlet_debts od
WHERE od.customer_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM customer_ledger cl 
    WHERE cl.reference_id = od.id AND cl.transaction_type = 'credit_sale'
  );

-- 2. MIGRATE DEBT PAYMENTS
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
  created_at
)
SELECT 
  od.outlet_id,
  od.customer_id,
  'debt_payment',
  odp.id,
  odp.reference_number,
  0,
  odp.amount,
  0, -- Will be recalculated
  COALESCE(odp.payment_date, odp.created_at, NOW()),
  'Payment - ' || COALESCE(odp.payment_method, 'Cash'),
  odp.payment_method,
  COALESCE(odp.notes, ''),
  odp.created_at
FROM outlet_debt_payments odp
JOIN outlet_debts od ON odp.debt_id = od.id
WHERE od.customer_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM customer_ledger cl 
    WHERE cl.reference_id = odp.id AND cl.transaction_type = 'debt_payment'
  );

-- 3. MIGRATE SETTLEMENTS
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
  created_at
)
SELECT 
  cs.outlet_id,
  cs.customer_id,
  'settlement',
  cs.id,
  cs.invoice_number,
  0,
  cs.payment_amount,
  0, -- Will be recalculated
  cs.settlement_date,
  'Settlement - ' || COALESCE(cs.payment_method, 'Cash'),
  cs.payment_method,
  COALESCE(cs.notes, ''),
  cs.created_at
FROM customer_settlements cs
WHERE cs.customer_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM customer_ledger cl 
    WHERE cl.reference_id = cs.id AND cl.transaction_type = 'settlement'
  );

-- 4. MIGRATE CASH SALES (if customer_id exists)
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
  created_at
)
SELECT 
  ocs.outlet_id,
  ocs.customer_id,
  'cash_sale',
  ocs.id,
  ocs.invoice_number,
  ocs.total_amount,
  0,
  0, -- Will be recalculated
  COALESCE(ocs.sale_date, ocs.created_at, NOW()),
  'Cash Sale - ' || ocs.invoice_number,
  ocs.payment_method,
  COALESCE(ocs.notes, ''),
  ocs.created_at
FROM outlet_cash_sales ocs
WHERE ocs.customer_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM customer_ledger cl 
    WHERE cl.reference_id = ocs.id AND cl.transaction_type = 'cash_sale'
  );

-- 5. MIGRATE CARD SALES (if customer_id exists)
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
  created_at
)
SELECT 
  ocas.outlet_id,
  ocas.customer_id,
  'card_sale',
  ocas.id,
  ocas.invoice_number,
  ocas.total_amount,
  0,
  0, -- Will be recalculated
  COALESCE(ocas.sale_date, ocas.created_at, NOW()),
  'Card Sale - ' || ocas.invoice_number,
  ocas.payment_method,
  COALESCE(ocas.notes, ''),
  ocas.created_at
FROM outlet_card_sales ocas
WHERE ocas.customer_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM customer_ledger cl 
    WHERE cl.reference_id = ocas.id AND cl.transaction_type = 'card_sale'
  );

-- 6. MIGRATE MOBILE SALES (if customer_id exists)
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
  created_at
)
SELECT 
  oms.outlet_id,
  oms.customer_id,
  'mobile_sale',
  oms.id,
  oms.invoice_number,
  oms.total_amount,
  0,
  0, -- Will be recalculated
  COALESCE(oms.sale_date, oms.created_at, NOW()),
  'Mobile Sale - ' || oms.invoice_number,
  oms.payment_method,
  COALESCE(oms.notes, ''),
  oms.created_at
FROM outlet_mobile_sales oms
WHERE oms.customer_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM customer_ledger cl 
    WHERE cl.reference_id = oms.id AND cl.transaction_type = 'mobile_sale'
  );

-- 7. RECALCULATE ALL RUNNING BALANCES
-- ============================================
-- Get unique outlet_id + customer_id combinations and recalculate
DO $$
DECLARE
  v_record RECORD;
BEGIN
  FOR v_record IN 
    SELECT DISTINCT outlet_id, customer_id 
    FROM customer_ledger
    WHERE customer_id IS NOT NULL
  LOOP
    PERFORM recalculate_customer_ledger_balance(v_record.outlet_id, v_record.customer_id);
  END LOOP;
END $$;

-- 8. VERIFICATION QUERIES
-- ============================================
-- Check total ledger entries created
SELECT 
  transaction_type,
  COUNT(*) as count,
  SUM(debit_amount) as total_debits,
  SUM(credit_amount) as total_credits
FROM customer_ledger
GROUP BY transaction_type
ORDER BY transaction_type;

-- Check a specific customer's ledger (replace with actual customer_id)
-- SELECT * FROM customer_ledger 
-- WHERE customer_id = 'YOUR-CUSTOMER-ID'
-- ORDER BY transaction_date ASC;

-- ============================================
-- Migration complete! All historical data has been migrated.
-- ============================================
