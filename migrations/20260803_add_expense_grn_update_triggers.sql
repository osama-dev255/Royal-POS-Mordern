-- ============================================
-- Add UPDATE/DELETE Triggers for Supplier Ledger
-- Date: 2026-08-03
-- Problem: Editing or deleting expenses/GRNs did not update
--          the supplier ledger, leaving stale entries.
-- Fix:     Add AFTER UPDATE and AFTER DELETE triggers that:
--          - Delete the old ledger entry
--          - Insert a new one if the record still qualifies
--          - Recalculate running balances
-- ============================================

-- 1. TRIGGER FUNCTION: Expense UPDATE
--    Delete old ledger entry, insert new one if still Inventory category
-- ============================================
CREATE OR REPLACE FUNCTION trg_update_ledger_on_expense_update()
RETURNS TRIGGER AS $$
DECLARE
  v_old_supplier_name VARCHAR;
  v_new_supplier_name VARCHAR;
BEGIN
  -- Only handle Inventory/Raw Materials expenses
  v_old_supplier_name := COALESCE(OLD.vendor_name, 'Unknown Supplier');
  v_new_supplier_name := COALESCE(NEW.vendor_name, 'Unknown Supplier');

  -- Delete the old ledger entry for this expense
  DELETE FROM supplier_ledger
  WHERE reference_id = OLD.id
    AND transaction_type = 'inventory_payment';

  -- If the updated expense is still Inventory/Raw Materials, insert new entry
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
      v_new_supplier_name,
      v_new_supplier_name,
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
  END IF;

  -- Recalculate balances for affected suppliers
  -- (both old and new in case vendor_name changed)
  PERFORM recalculate_supplier_ledger_balance(v_old_supplier_name);
  IF v_new_supplier_name != v_old_supplier_name THEN
    PERFORM recalculate_supplier_ledger_balance(v_new_supplier_name);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. TRIGGER FUNCTION: Expense DELETE
--    Delete the ledger entry for this expense
-- ============================================
CREATE OR REPLACE FUNCTION trg_delete_ledger_on_expense_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_supplier_name VARCHAR;
BEGIN
  v_supplier_name := COALESCE(OLD.vendor_name, 'Unknown Supplier');

  -- Delete the ledger entry for this expense
  DELETE FROM supplier_ledger
  WHERE reference_id = OLD.id
    AND transaction_type = 'inventory_payment';

  -- Recalculate balance for this supplier
  PERFORM recalculate_supplier_ledger_balance(v_supplier_name);

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 3. TRIGGER FUNCTION: GRN UPDATE
--    Delete old ledger entry, insert new one with updated data
-- ============================================
CREATE OR REPLACE FUNCTION trg_update_ledger_on_grn_update()
RETURNS TRIGGER AS $$
DECLARE
  v_old_supplier_name VARCHAR;
  v_new_supplier_name VARCHAR;
BEGIN
  v_old_supplier_name := OLD.supplier_name;
  v_new_supplier_name := NEW.supplier_name;

  -- Delete the old ledger entry for this GRN
  DELETE FROM supplier_ledger
  WHERE reference_id = OLD.id
    AND transaction_type = 'grn_received';

  -- Insert new ledger entry with updated data
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
    v_new_supplier_name,
    v_new_supplier_name,
    'grn_received',
    NEW.id,
    NEW.grn_number,
    0,
    COALESCE(NEW.total_amount, 0),
    0,
    COALESCE(NEW.created_at, NOW()),
    'GRN Received - ' || COALESCE(NEW.grn_number, '') || ' from ' || COALESCE(v_new_supplier_name, ''),
    NULL,
    COALESCE(NEW.quality_check_notes, ''),
    auth.uid()
  );

  -- Recalculate balances for affected suppliers
  PERFORM recalculate_supplier_ledger_balance(v_old_supplier_name);
  IF v_new_supplier_name != v_old_supplier_name THEN
    PERFORM recalculate_supplier_ledger_balance(v_new_supplier_name);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. TRIGGER FUNCTION: GRN DELETE
--    Delete the ledger entry for this GRN
-- ============================================
CREATE OR REPLACE FUNCTION trg_delete_ledger_on_grn_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_supplier_name VARCHAR;
BEGIN
  v_supplier_name := OLD.supplier_name;

  -- Delete the ledger entry for this GRN
  DELETE FROM supplier_ledger
  WHERE reference_id = OLD.id
    AND transaction_type = 'grn_received';

  -- Recalculate balance for this supplier
  PERFORM recalculate_supplier_ledger_balance(v_supplier_name);

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 5. CREATE TRIGGERS ON expenses TABLE
-- ============================================
DROP TRIGGER IF EXISTS trigger_expense_update_ledger ON expenses;
CREATE TRIGGER trigger_expense_update_ledger
  AFTER UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION trg_update_ledger_on_expense_update();

DROP TRIGGER IF EXISTS trigger_expense_delete_ledger ON expenses;
CREATE TRIGGER trigger_expense_delete_ledger
  AFTER DELETE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION trg_delete_ledger_on_expense_delete();

-- 6. CREATE TRIGGERS ON saved_grns TABLE
-- ============================================
DROP TRIGGER IF EXISTS trigger_grn_update_ledger ON saved_grns;
CREATE TRIGGER trigger_grn_update_ledger
  AFTER UPDATE ON saved_grns
  FOR EACH ROW
  EXECUTE FUNCTION trg_update_ledger_on_grn_update();

DROP TRIGGER IF EXISTS trigger_grn_delete_ledger ON saved_grns;
CREATE TRIGGER trigger_grn_delete_ledger
  AFTER DELETE ON saved_grns
  FOR EACH ROW
  EXECUTE FUNCTION trg_delete_ledger_on_grn_delete();

-- 7. COMMENTS
-- ============================================
COMMENT ON FUNCTION trg_update_ledger_on_expense_update() IS 'Updates supplier ledger when an inventory expense is edited';
COMMENT ON FUNCTION trg_delete_ledger_on_expense_delete() IS 'Removes supplier ledger entry when an inventory expense is deleted';
COMMENT ON FUNCTION trg_update_ledger_on_grn_update() IS 'Updates supplier ledger when a GRN is edited';
COMMENT ON FUNCTION trg_delete_ledger_on_grn_delete() IS 'Removes supplier ledger entry when a GRN is deleted';
