-- ============================================
-- Customer Ledger - UPDATE Triggers
-- Date: 2026-05-25
-- Description: Automatically update ledger entries when debts/payments are edited
-- ============================================

-- 1. UPDATE TRIGGER FOR CREDIT SALES (OUTLET_DEBTS)
-- ============================================
CREATE OR REPLACE FUNCTION trg_update_ledger_entry_for_debt()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the existing ledger entry when debt is modified
  UPDATE customer_ledger
  SET 
    debit_amount = COALESCE(NEW.total_amount, 0),
    description = 'Credit Sale - ' || COALESCE(NEW.payment_status, 'Updated'),
    reference_number = NEW.invoice_number,
    transaction_date = COALESCE(NEW.debt_date, NEW.created_at, NOW()),
    notes = COALESCE(NEW.notes, ''),
    created_at = NOW()
  WHERE reference_id = NEW.id
    AND transaction_type = 'credit_sale';
  
  -- Recalculate running balances for this customer
  PERFORM recalculate_customer_ledger_balance(NEW.outlet_id, NEW.customer_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop old trigger if exists, then create new one
DROP TRIGGER IF EXISTS trigger_debt_ledger_update ON outlet_debts;
CREATE TRIGGER trigger_debt_ledger_update
  AFTER UPDATE ON outlet_debts
  FOR EACH ROW
  WHEN (NEW.customer_id IS NOT NULL AND OLD.total_amount IS DISTINCT FROM NEW.total_amount)
  EXECUTE FUNCTION trg_update_ledger_entry_for_debt();

-- 2. UPDATE TRIGGER FOR DEBT PAYMENTS
-- ============================================
CREATE OR REPLACE FUNCTION trg_update_ledger_entry_for_debt_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_outlet_id UUID;
  v_customer_id UUID;
BEGIN
  -- Get outlet_id and customer_id from the debt record
  SELECT outlet_id, customer_id 
  INTO v_outlet_id, v_customer_id
  FROM outlet_debts 
  WHERE id = NEW.debt_id;
  
  -- Update the existing ledger entry when payment is modified
  UPDATE customer_ledger
  SET 
    credit_amount = NEW.amount,
    description = 'Payment - ' || COALESCE(NEW.payment_method, 'Cash'),
    reference_number = NEW.reference_number,
    transaction_date = COALESCE(NEW.payment_date, NOW()),
    notes = COALESCE(NEW.notes, ''),
    created_at = NOW()
  WHERE reference_id = NEW.id::uuid
    AND transaction_type = 'debt_payment';
  
  -- Recalculate running balances
  PERFORM recalculate_customer_ledger_balance(v_outlet_id, v_customer_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop old trigger if exists, then create new one
DROP TRIGGER IF EXISTS trigger_debt_payment_ledger_update ON outlet_debt_payments;
CREATE TRIGGER trigger_debt_payment_ledger_update
  AFTER UPDATE ON outlet_debt_payments
  FOR EACH ROW
  WHEN (OLD.amount IS DISTINCT FROM NEW.amount)
  EXECUTE FUNCTION trg_update_ledger_entry_for_debt_payment();

-- 3. UPDATE TRIGGER FOR SETTLEMENTS
-- ============================================
CREATE OR REPLACE FUNCTION trg_update_ledger_entry_for_settlement()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if customer_id exists
  IF NEW.customer_id IS NOT NULL THEN
    -- Update the existing ledger entry when settlement is modified
    UPDATE customer_ledger
    SET 
      credit_amount = NEW.payment_amount,
      description = 'Settlement - ' || COALESCE(NEW.payment_method, 'Cash'),
      reference_number = NEW.invoice_number,
      transaction_date = NEW.settlement_date,
      notes = COALESCE(NEW.notes, ''),
      created_at = NOW()
    WHERE reference_id = NEW.id::uuid
      AND transaction_type = 'settlement';
    
    -- Recalculate running balances
    PERFORM recalculate_customer_ledger_balance(NEW.outlet_id, NEW.customer_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop old trigger if exists, then create new one
DROP TRIGGER IF EXISTS trigger_settlement_ledger_update ON customer_settlements;
CREATE TRIGGER trigger_settlement_ledger_update
  AFTER UPDATE ON customer_settlements
  FOR EACH ROW
  WHEN (NEW.customer_id IS NOT NULL AND OLD.payment_amount IS DISTINCT FROM NEW.payment_amount)
  EXECUTE FUNCTION trg_update_ledger_entry_for_settlement();

-- 4. DELETE TRIGGER FOR CREDIT SALES (When debt is deleted, remove ledger entry)
-- ============================================
CREATE OR REPLACE FUNCTION trg_delete_ledger_entry_for_debt()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete the ledger entry when debt is deleted
  DELETE FROM customer_ledger
  WHERE reference_id = OLD.id
    AND transaction_type = 'credit_sale';
  
  -- Recalculate running balances for this customer
  PERFORM recalculate_customer_ledger_balance(OLD.outlet_id, OLD.customer_id);
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_debt_ledger_delete ON outlet_debts;
CREATE TRIGGER trigger_debt_ledger_delete
  AFTER DELETE ON outlet_debts
  FOR EACH ROW
  WHEN (OLD.customer_id IS NOT NULL)
  EXECUTE FUNCTION trg_delete_ledger_entry_for_debt();

-- 5. DELETE TRIGGER FOR DEBT PAYMENTS (When payment is deleted, remove ledger entry)
-- ============================================
CREATE OR REPLACE FUNCTION trg_delete_ledger_entry_for_debt_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_outlet_id UUID;
  v_customer_id UUID;
BEGIN
  -- Get outlet_id and customer_id from the debt record
  SELECT outlet_id, customer_id 
  INTO v_outlet_id, v_customer_id
  FROM outlet_debts 
  WHERE id = OLD.debt_id;
  
  -- Delete the ledger entry when payment is deleted
  DELETE FROM customer_ledger
  WHERE reference_id = OLD.id::uuid
    AND transaction_type = 'debt_payment';
  
  -- Recalculate running balances
  PERFORM recalculate_customer_ledger_balance(v_outlet_id, v_customer_id);
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_debt_payment_ledger_delete ON outlet_debt_payments;
CREATE TRIGGER trigger_debt_payment_ledger_delete
  AFTER DELETE ON outlet_debt_payments
  FOR EACH ROW
  EXECUTE FUNCTION trg_delete_ledger_entry_for_debt_payment();

-- 6. DELETE TRIGGER FOR SETTLEMENTS (When settlement is deleted, remove ledger entry)
-- ============================================
CREATE OR REPLACE FUNCTION trg_delete_ledger_entry_for_settlement()
RETURNS TRIGGER AS $$
BEGIN
  -- Only delete if customer_id exists
  IF OLD.customer_id IS NOT NULL THEN
    -- Delete the ledger entry when settlement is deleted
    DELETE FROM customer_ledger
    WHERE reference_id = OLD.id::uuid
      AND transaction_type = 'settlement';
    
    -- Recalculate running balances
    PERFORM recalculate_customer_ledger_balance(OLD.outlet_id, OLD.customer_id);
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_settlement_ledger_delete ON customer_settlements;
CREATE TRIGGER trigger_settlement_ledger_delete
  AFTER DELETE ON customer_settlements
  FOR EACH ROW
  WHEN (OLD.customer_id IS NOT NULL)
  EXECUTE FUNCTION trg_delete_ledger_entry_for_settlement();

-- ============================================
-- Migration complete! Ledger now syncs on INSERT, UPDATE, and DELETE
-- ============================================

-- Verification: Check all triggers are created
SELECT 
  trigger_name,
  event_object_table as table_name,
  event_manipulation as event_type,
  action_timing as timing
FROM information_schema.triggers
WHERE trigger_name LIKE '%ledger%'
ORDER BY event_object_table, event_manipulation;
