-- ============================================
-- Fix Supplier Ledger Duplicate Suppliers
-- Date: 2026-08-03
-- Problem: Different triggers stored different values in supplier_id
--          (UUID vs vendor_name vs supplier_name), causing the same
--          supplier to appear as multiple entries in the ledger.
-- Fix:     1. Normalize supplier_id = supplier_name for all existing rows
--          2. Switch all DB functions to use supplier_name as the key
--          3. Update triggers to pass supplier_name consistently
--          4. Recalculate running balances after normalization
-- ============================================

-- 1. NORMALIZE EXISTING DATA
--    Set supplier_id = supplier_name so every entry for the same
--    supplier shares the same identifier.
-- ============================================
UPDATE supplier_ledger
SET supplier_id = supplier_name
WHERE supplier_id IS DISTINCT FROM supplier_name;

-- 2. REPLACE recalculate_supplier_ledger_balance
--    Now filters by supplier_name (the canonical key).
--    Must DROP first because PG cannot rename input parameters.
-- ============================================
DROP FUNCTION IF EXISTS recalculate_supplier_ledger_balance(VARCHAR);

CREATE OR REPLACE FUNCTION recalculate_supplier_ledger_balance(
  p_supplier_name VARCHAR
)
RETURNS VOID AS $$
DECLARE
  v_balance DECIMAL(15,2) := 0;
  v_record RECORD;
BEGIN
  FOR v_record IN
    SELECT id, debit_amount, credit_amount
    FROM supplier_ledger
    WHERE supplier_name = p_supplier_name
    ORDER BY transaction_date ASC, created_at ASC
  LOOP
    v_balance := v_balance + v_record.credit_amount - v_record.debit_amount;

    UPDATE supplier_ledger
    SET running_balance = v_balance
    WHERE id = v_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 3. CREATE get_supplier_balance_by_name (used by frontend)
-- ============================================
DROP FUNCTION IF EXISTS get_supplier_balance_by_name(VARCHAR);

CREATE OR REPLACE FUNCTION get_supplier_balance_by_name(
  p_supplier_name VARCHAR
)
RETURNS DECIMAL(15,2) AS $$
DECLARE
  v_balance DECIMAL(15,2);
BEGIN
  SELECT COALESCE(SUM(credit_amount) - SUM(debit_amount), 0)
  INTO v_balance
  FROM supplier_ledger
  WHERE supplier_name = p_supplier_name;

  RETURN v_balance;
END;
$$ LANGUAGE plpgsql;

-- 4. KEEP old get_supplier_balance for backward compat, redirect to name-based
-- ============================================
DROP FUNCTION IF EXISTS get_supplier_balance(VARCHAR);

CREATE OR REPLACE FUNCTION get_supplier_balance(
  p_supplier_id VARCHAR
)
RETURNS DECIMAL(15,2) AS $$
DECLARE
  v_balance DECIMAL(15,2);
BEGIN
  -- Since supplier_id is now normalized to supplier_name, just query by name
  SELECT COALESCE(SUM(credit_amount) - SUM(debit_amount), 0)
  INTO v_balance
  FROM supplier_ledger
  WHERE supplier_name = p_supplier_id;

  RETURN v_balance;
END;
$$ LANGUAGE plpgsql;

-- 5. UPDATE TRIGGER: GRN received (auto CR entry)
--    Pass supplier_name to recalculate function.
-- ============================================
CREATE OR REPLACE FUNCTION trg_create_ledger_entry_for_grn()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO supplier_ledger (
    supplier_id,
    supplier_name,
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
  VALUES (
    NEW.supplier_name,                           -- normalize: supplier_id = supplier_name
    NEW.supplier_name,
    'grn_received',
    NEW.id,
    NEW.grn_number,
    0,
    COALESCE(NEW.total_amount, 0),
    0,
    COALESCE(NEW.created_at, NOW()),
    'GRN Received - ' || COALESCE(NEW.grn_number, '') || ' from ' || COALESCE(NEW.supplier_name, ''),
    NULL,
    COALESCE(NEW.quality_check_notes, ''),
    auth.uid()
  );

  PERFORM recalculate_supplier_ledger_balance(NEW.supplier_name);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. UPDATE TRIGGER: Inventory expense (auto DR entry)
--    Use vendor_name consistently for both supplier_id and supplier_name.
-- ============================================
CREATE OR REPLACE FUNCTION trg_create_ledger_entry_for_inventory_expense()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.category = 'Inventory' OR NEW.category = 'Raw Materials' THEN
    INSERT INTO supplier_ledger (
      supplier_id,
      supplier_name,
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
    VALUES (
      COALESCE(NEW.vendor_name, 'Unknown Supplier'),
      COALESCE(NEW.vendor_name, 'Unknown Supplier'),
      'inventory_payment',
      NEW.id,
      COALESCE(NEW.voucher_number, NEW.id::text),
      COALESCE(NEW.amount, 0),
      0,
      0,
      COALESCE(NEW.expense_date, NEW.created_at, NOW()),
      'Inventory Payment - ' || COALESCE(NEW.category, '') || ': ' || COALESCE(NEW.description, ''),
      COALESCE(NEW.payment_method, ''),
      COALESCE(NEW.notes, ''),
      auth.uid()
    );

    PERFORM recalculate_supplier_ledger_balance(COALESCE(NEW.vendor_name, 'Unknown Supplier'));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. UPDATE TRIGGER: Payment voucher (auto DR entry)
--    Use supplier_name consistently.
-- ============================================
CREATE OR REPLACE FUNCTION trg_create_ledger_entry_for_payment_voucher()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO supplier_ledger (
    supplier_id,
    supplier_name,
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
  VALUES (
    NEW.supplier_name,                           -- normalize: supplier_id = supplier_name
    NEW.supplier_name,
    'settlement',
    NEW.id,
    NEW.voucher_number,
    COALESCE(NEW.total_amount, 0),
    0,
    0,
    COALESCE(NEW.date, NEW.created_at, NOW()),
    'Supplier Payment Voucher - ' || COALESCE(NEW.voucher_number, '') || ' to ' || COALESCE(NEW.supplier_name, ''),
    CASE
      WHEN jsonb_array_length(COALESCE(NEW.payment_breakdown, '[]'::jsonb)) = 1
        THEN (NEW.payment_breakdown->0->>'method')
      ELSE 'Split'
    END,
    COALESCE(NEW.notes, ''),
    auth.uid()
  );

  PERFORM recalculate_supplier_ledger_balance(NEW.supplier_name);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. RECALCULATE ALL RUNNING BALANCES
--    After normalizing supplier_id, recalculate every supplier's
--    running balance so they are correct.
-- ============================================
DO $$
DECLARE
  v_supplier RECORD;
BEGIN
  FOR v_supplier IN
    SELECT DISTINCT supplier_name FROM supplier_ledger WHERE supplier_name IS NOT NULL
  LOOP
    PERFORM recalculate_supplier_ledger_balance(v_supplier.supplier_name);
  END LOOP;
END $$;

-- 9. COMMENTS
-- ============================================
COMMENT ON FUNCTION recalculate_supplier_ledger_balance(VARCHAR) IS 'Recalculates running balances for all ledger entries of a given supplier_name';
COMMENT ON FUNCTION get_supplier_balance_by_name(VARCHAR) IS 'Returns outstanding balance (CR - DR) for a supplier by name';
