-- ============================================
-- Fix: Broaden Customer Ledger Update Trigger
-- Date: 2026-07-21
-- Description: The trigger for updating ledger entries when a debt is edited
--              only fired when total_amount changed. This fix ensures it fires
--              whenever any financially relevant field changes (total_amount,
--              amount_paid, adjustments, shipping, discount_amount, credit_brought_forward).
--              Also fixes getCustomerLedgerBalance to use created_at as tiebreaker.
-- ============================================

-- 1. DROP AND RECREATE THE DEBT LEDGER UPDATE TRIGGER WITH BROADER CONDITION
-- ============================================
DROP TRIGGER IF EXISTS trigger_debt_ledger_update ON outlet_debts;

CREATE TRIGGER trigger_debt_ledger_update
  AFTER UPDATE ON outlet_debts
  FOR EACH ROW
  WHEN (
    NEW.customer_id IS NOT NULL 
    AND (
      OLD.total_amount IS DISTINCT FROM NEW.total_amount
      OR OLD.amount_paid IS DISTINCT FROM NEW.amount_paid
      OR OLD.adjustments IS DISTINCT FROM NEW.adjustments
      OR OLD.shipping_amount IS DISTINCT FROM NEW.shipping_amount
      OR OLD.discount_amount IS DISTINCT FROM NEW.discount_amount
      OR OLD.credit_brought_forward IS DISTINCT FROM NEW.credit_brought_forward
      OR OLD.subtotal IS DISTINCT FROM NEW.subtotal
    )
  )
  EXECUTE FUNCTION trg_update_ledger_entry_for_debt();

-- 2. VERIFY THE TRIGGER IS CREATED
-- ============================================
SELECT 
  trigger_name,
  event_object_table as table_name,
  event_manipulation as event_type,
  action_timing as timing,
  action_condition as condition
FROM information_schema.triggers
WHERE trigger_name = 'trigger_debt_ledger_update';

-- ============================================
-- Migration complete!
-- ============================================
