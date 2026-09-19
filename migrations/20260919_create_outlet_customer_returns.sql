-- ============================================
-- Customer Returns Module (Registered Outlets -> Sales Management)
-- Date: 2026-09-19
-- Description: Tables for tracking goods returned by customers to the business.
--   A return may be linked to an original sale/debt (source_id/source_invoice_number)
--   or recorded as a walk-in return (source_type = 'walk_in').
--   Returns follow the approval workflow: pending -> approved/rejected,
--   with revert allowed (approved <-> rejected).
--   On approval with refund_method = 'credit_note':
--     - a customer_ledger 'refund' credit entry is created (trigger),
--     - the source debt's remaining_amount is offset (trigger).
--   On revert from approved, both effects are automatically reversed (trigger).
-- ============================================

-- 1. CREATE OUTLET_CUSTOMER_RETURNS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS outlet_customer_returns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES outlet_customers(id) ON DELETE SET NULL,

  -- Return details
  return_number VARCHAR(50) UNIQUE NOT NULL,
  return_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Customer info (denormalized for display/print, like outlet_debts)
  customer_name VARCHAR(255),
  customer_phone VARCHAR(50),

  -- Source sale linkage (nullable for walk-in returns)
  source_type VARCHAR(20) NOT NULL DEFAULT 'walk_in' CHECK (source_type IN (
    'cash_sale', 'card_sale', 'mobile_sale', 'debt', 'walk_in'
  )),
  source_id UUID,  -- ID of the original sale/debt (no FK: spans multiple tables)
  source_invoice_number VARCHAR(50),

  -- Reason & refund
  reason TEXT NOT NULL,
  refund_method VARCHAR(20) NOT NULL DEFAULT 'cash' CHECK (refund_method IN ('cash', 'credit_note')),
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,

  -- Approval workflow
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  received_by VARCHAR(255),
  approved_by_name VARCHAR(255),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_reason TEXT,

  -- Metadata
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CREATE OUTLET_CUSTOMER_RETURN_ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS outlet_customer_return_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  return_id UUID NOT NULL REFERENCES outlet_customer_returns(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(255) NOT NULL,
  quantity NUMERIC(12,2) NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  line_total DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  restock BOOLEAN NOT NULL DEFAULT TRUE,  -- TRUE = sellable (RETURN movement), FALSE = damaged/unsellable (DAMAGE movement)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. CREATE INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_outlet_customer_returns_outlet_id ON outlet_customer_returns(outlet_id);
CREATE INDEX IF NOT EXISTS idx_outlet_customer_returns_customer_id ON outlet_customer_returns(customer_id);
CREATE INDEX IF NOT EXISTS idx_outlet_customer_returns_return_date ON outlet_customer_returns(return_date);
CREATE INDEX IF NOT EXISTS idx_outlet_customer_returns_status ON outlet_customer_returns(status);
CREATE INDEX IF NOT EXISTS idx_outlet_customer_returns_source_invoice ON outlet_customer_returns(source_invoice_number);
CREATE INDEX IF NOT EXISTS idx_outlet_customer_return_items_return_id ON outlet_customer_return_items(return_id);
CREATE INDEX IF NOT EXISTS idx_outlet_customer_return_items_product_id ON outlet_customer_return_items(product_id);

-- 4. TRIGGER: SYNC CUSTOMER LEDGER + DEBT OFFSET ON APPROVAL / REVERT
-- ============================================
-- Idempotent: re-approval after revert does not duplicate the ledger entry.
-- Revert (approved -> pending/rejected) removes the ledger entry and
-- restores the source debt's remaining_amount and payment_status.
CREATE OR REPLACE FUNCTION trg_sync_ledger_and_debt_for_return()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND NEW.refund_method = 'credit_note' AND NEW.customer_id IS NOT NULL THEN
    -- Create the customer_ledger refund (credit) entry if it does not exist yet
    IF NOT EXISTS (
      SELECT 1 FROM customer_ledger
      WHERE reference_id = NEW.id AND transaction_type = 'refund'
    ) THEN
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
      VALUES (
        NEW.outlet_id,
        NEW.customer_id,
        'refund',
        NEW.id,
        NEW.return_number,
        0,
        NEW.total_amount,
        0, -- Will be calculated by recalculate trigger
        COALESCE(NEW.return_date, NEW.created_at, NOW()),
        'Customer Return - ' || COALESCE(NEW.source_invoice_number, 'Walk-in'),
        'credit_note',
        COALESCE(NEW.reason, ''),
        auth.uid()
      );
    END IF;

    -- Offset the source debt's remaining amount (credit note reduces what the customer owes)
    IF NEW.source_type = 'debt' AND NEW.source_id IS NOT NULL THEN
      UPDATE outlet_debts
      SET remaining_amount = remaining_amount - NEW.total_amount,
          payment_status = CASE
            WHEN (remaining_amount - NEW.total_amount) <= 0 THEN 'refunded'
            WHEN amount_paid > 0 THEN 'partial'
            ELSE 'unpaid'
          END,
          updated_at = NOW()
      WHERE id = NEW.source_id
        AND payment_status NOT IN ('cancelled', 'refunded')
        AND (remaining_amount - NEW.total_amount) <> remaining_amount;
    END IF;

    PERFORM recalculate_customer_ledger_balance(NEW.outlet_id, NEW.customer_id);

  ELSIF OLD.status = 'approved' AND NEW.status <> 'approved' THEN
    -- Revert: remove the refund ledger entry if present
    DELETE FROM customer_ledger
    WHERE reference_id = NEW.id AND transaction_type = 'refund';

    -- Revert: restore the source debt's remaining amount if it was offset
    IF OLD.source_type = 'debt' AND OLD.source_id IS NOT NULL AND OLD.refund_method = 'credit_note' THEN
      UPDATE outlet_debts
      SET remaining_amount = remaining_amount + OLD.total_amount,
          payment_status = CASE
            WHEN (remaining_amount + OLD.total_amount) <= 0 THEN 'paid'
            WHEN amount_paid > 0 THEN 'partial'
            ELSE 'unpaid'
          END,
          updated_at = NOW()
      WHERE id = OLD.source_id
        AND payment_status NOT IN ('cancelled');
    END IF;

    IF NEW.customer_id IS NOT NULL THEN
      PERFORM recalculate_customer_ledger_balance(NEW.outlet_id, NEW.customer_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_return_ledger_debt_sync ON outlet_customer_returns;
CREATE TRIGGER trigger_return_ledger_debt_sync
  AFTER UPDATE OF status ON outlet_customer_returns
  FOR EACH ROW
  EXECUTE FUNCTION trg_sync_ledger_and_debt_for_return();

-- 5. ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE outlet_customer_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlet_customer_return_items ENABLE ROW LEVEL SECURITY;

-- 6. CREATE RLS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view customer returns" ON outlet_customer_returns;
DROP POLICY IF EXISTS "Users can insert customer returns" ON outlet_customer_returns;
DROP POLICY IF EXISTS "Users can update customer returns" ON outlet_customer_returns;
DROP POLICY IF EXISTS "Users can delete customer returns" ON outlet_customer_returns;
DROP POLICY IF EXISTS "Users can view customer return items" ON outlet_customer_return_items;
DROP POLICY IF EXISTS "Users can insert customer return items" ON outlet_customer_return_items;
DROP POLICY IF EXISTS "Users can update customer return items" ON outlet_customer_return_items;
DROP POLICY IF EXISTS "Users can delete customer return items" ON outlet_customer_return_items;

CREATE POLICY "Users can view customer returns" ON outlet_customer_returns
  FOR SELECT USING (true);

CREATE POLICY "Users can insert customer returns" ON outlet_customer_returns
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update customer returns" ON outlet_customer_returns
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete customer returns" ON outlet_customer_returns
  FOR DELETE USING (true);

CREATE POLICY "Users can view customer return items" ON outlet_customer_return_items
  FOR SELECT USING (true);

CREATE POLICY "Users can insert customer return items" ON outlet_customer_return_items
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update customer return items" ON outlet_customer_return_items
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete customer return items" ON outlet_customer_return_items
  FOR DELETE USING (true);

-- 7. ADD COMMENTS
-- ============================================
COMMENT ON TABLE outlet_customer_returns IS 'Customer returns: goods returned by customers, linked to a sale/debt or walk-in, with approval workflow';
COMMENT ON COLUMN outlet_customer_returns.source_type IS 'Type of the original transaction: cash_sale, card_sale, mobile_sale, debt, or walk_in (no source)';
COMMENT ON COLUMN outlet_customer_returns.source_id IS 'ID of the original sale/debt record (outlet_cash_sales.id, outlet_card_sales.id, outlet_mobile_sales.id or outlet_debts.id)';
COMMENT ON COLUMN outlet_customer_returns.refund_method IS 'How the refund value is given back: cash (physical payout) or credit_note (reduces customer ledger balance)';
COMMENT ON COLUMN outlet_customer_returns.total_amount IS 'Total refund value of the returned goods';
COMMENT ON COLUMN outlet_customer_return_items.restock IS 'TRUE = goods are sellable and re-enter available stock (RETURN movement); FALSE = damaged/unsellable (DAMAGE movement, no restock)';

-- ============================================
-- Migration complete!
-- Run this file in the Supabase SQL Editor.
-- ============================================
