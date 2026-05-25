-- ============================================
-- Diagnostic: Check Settlement Ledger Entries
-- Date: 2026-05-23
-- Description: Verify if settlements are creating ledger entries
-- ============================================

-- 1. CHECK IF SETTLEMENT TRIGGER EXISTS
-- ============================================
SELECT 
  trigger_name,
  event_object_table as table_name,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_settlement_ledger_entry';

-- 2. CHECK SETTLEMENTS IN DATABASE
-- ============================================
SELECT 
  id,
  outlet_id,
  customer_id,
  invoice_number,
  payment_amount,
  settlement_date,
  payment_method,
  created_at
FROM customer_settlements
ORDER BY created_at DESC
LIMIT 10;

-- 3. CHECK LEDGER ENTRIES FOR SETTLEMENTS
-- ============================================
SELECT 
  id,
  customer_id,
  transaction_type,
  reference_number,
  debit_amount,
  credit_amount,
  running_balance,
  description,
  created_at
FROM customer_ledger
WHERE transaction_type = 'settlement'
ORDER BY created_at DESC
LIMIT 10;

-- 4. CHECK IF SETTLEMENTS HAVE MATCHING LEDGER ENTRIES
-- ============================================
SELECT 
  cs.id as settlement_id,
  cs.invoice_number,
  cs.payment_amount,
  cs.customer_id,
  cl.id as ledger_entry_id,
  cl.credit_amount,
  CASE 
    WHEN cl.id IS NULL THEN '❌ MISSING LEDGER ENTRY'
    ELSE '✅ HAS LEDGER ENTRY'
  END as status
FROM customer_settlements cs
LEFT JOIN customer_ledger cl 
  ON cl.reference_id = cs.id::uuid
  AND cl.transaction_type = 'settlement'
ORDER BY cs.created_at DESC
LIMIT 20;

-- 5. FIND SETTLEMENTS WITHOUT LEDGER ENTRIES (Need to be fixed)
-- ============================================
SELECT 
  cs.id,
  cs.outlet_id,
  cs.customer_id,
  cs.invoice_number,
  cs.payment_amount as amount,
  cs.settlement_date,
  cs.payment_method,
  'INSERT into customer_ledger needed' as action_required
FROM customer_settlements cs
LEFT JOIN customer_ledger cl 
  ON cl.reference_id = cs.id::uuid
  AND cl.transaction_type = 'settlement'
WHERE cl.id IS NULL
ORDER BY cs.created_at DESC;

-- ============================================
-- Run these queries to diagnose the issue!
-- ============================================
