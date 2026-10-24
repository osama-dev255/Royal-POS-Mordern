-- ============================================
-- Petty Cash Book (Registered Outlets -> Expense Management)
-- Date: 2026-10-22
-- Description: Append-only petty cash ledger per outlet.
--   txn_type:
--     'topup'      - money added to the fund (amount > 0)
--     'payment'    - money paid out of the fund (amount > 0; signed negative on read)
--     'adjustment' - opening float / correction entry (amount signed + or -)
--   amount convention: topup/payment rows are stored positive; the running balance
--   treats payments as negative. Adjustment rows carry their direction in the sign.
--   balance_after stores the running balance at the time of the transaction.
--   Corrections VOID a row (is_voided = true) and append a contra 'adjustment'
--   entry; ledger rows are never edited or deleted.
--   A payment may post to the main expenses table (expense_id link).
-- ============================================

-- 1. CREATE OUTLET_PETTY_CASH_TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS outlet_petty_cash_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,

  -- Transaction type and signed amount
  txn_type VARCHAR(20) NOT NULL CHECK (txn_type IN ('topup', 'payment', 'adjustment')),
  amount DECIMAL(15,2) NOT NULL CHECK (
    (txn_type IN ('topup', 'payment') AND amount > 0) OR
    (txn_type = 'adjustment' AND amount <> 0)
  ),
  balance_after DECIMAL(15,2) NOT NULL DEFAULT 0,
  txn_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Details
  description TEXT NOT NULL,
  category VARCHAR(100),
  payee VARCHAR(255),            -- payments: paid to; top-ups: received from
  received_by VARCHAR(255),      -- who physically received/handed the cash
  prepared_by VARCHAR(255),
  reference_number VARCHAR(100),
  receipt_url TEXT,

  -- Link to the main expenses table when a payment was posted to expenses
  expense_id UUID,

  -- Void semantics (append-only: never edit/delete; void + contra entry)
  is_voided BOOLEAN NOT NULL DEFAULT FALSE,
  void_reason TEXT,

  -- Metadata
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CREATE OUTLET_PETTY_CASH_SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS outlet_petty_cash_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  outlet_id UUID NOT NULL UNIQUE REFERENCES outlets(id) ON DELETE CASCADE,
  imprest_limit DECIMAL(15,2) NOT NULL DEFAULT 0,  -- target float; 0 = no limit / no warning
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CREATE INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_petty_cash_txn_outlet_id ON outlet_petty_cash_transactions(outlet_id);
CREATE INDEX IF NOT EXISTS idx_petty_cash_txn_date ON outlet_petty_cash_transactions(txn_date);
CREATE INDEX IF NOT EXISTS idx_petty_cash_txn_type ON outlet_petty_cash_transactions(txn_type);
CREATE INDEX IF NOT EXISTS idx_petty_cash_settings_outlet_id ON outlet_petty_cash_settings(outlet_id);

-- 4. ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE outlet_petty_cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlet_petty_cash_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlet_petty_cash_transactions FORCE ROW LEVEL SECURITY;
ALTER TABLE outlet_petty_cash_settings FORCE ROW LEVEL SECURITY;

-- 5. CREATE RLS POLICIES
-- ============================================
-- Authorization is derived from the authenticated user's outlet assignment
-- (outlet_users) or platform admin role - never from the client-supplied
-- outlet_id alone, so a client cannot read or write another outlet's ledger.
DROP POLICY IF EXISTS "Users can view petty cash transactions" ON outlet_petty_cash_transactions;
DROP POLICY IF EXISTS "Users can insert petty cash transactions" ON outlet_petty_cash_transactions;
DROP POLICY IF EXISTS "Users can update petty cash transactions" ON outlet_petty_cash_transactions;
DROP POLICY IF EXISTS "Users can delete petty cash transactions" ON outlet_petty_cash_transactions;
DROP POLICY IF EXISTS "Users can view petty cash settings" ON outlet_petty_cash_settings;
DROP POLICY IF EXISTS "Users can insert petty cash settings" ON outlet_petty_cash_settings;
DROP POLICY IF EXISTS "Users can update petty cash settings" ON outlet_petty_cash_settings;
DROP POLICY IF EXISTS "Users can delete petty cash settings" ON outlet_petty_cash_settings;

CREATE POLICY "Users can view petty cash transactions" ON outlet_petty_cash_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
    OR outlet_id IN (
      SELECT outlet_id FROM outlet_users
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Users can insert petty cash transactions" ON outlet_petty_cash_transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
    OR outlet_id IN (
      SELECT outlet_id FROM outlet_users
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Users can update petty cash transactions" ON outlet_petty_cash_transactions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
    OR outlet_id IN (
      SELECT outlet_id FROM outlet_users
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
    OR outlet_id IN (
      SELECT outlet_id FROM outlet_users
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Users can delete petty cash transactions" ON outlet_petty_cash_transactions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
    OR outlet_id IN (
      SELECT outlet_id FROM outlet_users
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Users can view petty cash settings" ON outlet_petty_cash_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
    OR outlet_id IN (
      SELECT outlet_id FROM outlet_users
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Users can insert petty cash settings" ON outlet_petty_cash_settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
    OR outlet_id IN (
      SELECT outlet_id FROM outlet_users
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Users can update petty cash settings" ON outlet_petty_cash_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
    OR outlet_id IN (
      SELECT outlet_id FROM outlet_users
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
    OR outlet_id IN (
      SELECT outlet_id FROM outlet_users
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Users can delete petty cash settings" ON outlet_petty_cash_settings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
    OR outlet_id IN (
      SELECT outlet_id FROM outlet_users
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

-- 6. TRIGGER: AUTO-UPDATE updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_petty_cash_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_petty_cash_txn_updated_at ON outlet_petty_cash_transactions;
CREATE TRIGGER trigger_petty_cash_txn_updated_at
  BEFORE UPDATE ON outlet_petty_cash_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_petty_cash_updated_at();

DROP TRIGGER IF EXISTS trigger_petty_cash_settings_updated_at ON outlet_petty_cash_settings;
CREATE TRIGGER trigger_petty_cash_settings_updated_at
  BEFORE UPDATE ON outlet_petty_cash_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_petty_cash_updated_at();

-- 7. ADD COMMENTS
-- ============================================
COMMENT ON TABLE outlet_petty_cash_transactions IS 'Append-only petty cash ledger per outlet: topups add cash, payments remove cash, adjustments are signed corrections; voiding appends a contra entry';
COMMENT ON COLUMN outlet_petty_cash_transactions.amount IS 'Topup/payment rows stored positive (balance treats payments as negative); adjustment rows carry direction in the sign';
COMMENT ON COLUMN outlet_petty_cash_transactions.balance_after IS 'Running petty cash balance immediately after this transaction';
COMMENT ON COLUMN outlet_petty_cash_transactions.expense_id IS 'expenses.id when the payment was posted to the main expenses table';
COMMENT ON COLUMN outlet_petty_cash_transactions.is_voided IS 'TRUE when voided; a contra adjustment entry with reference_number = this row id restores the balance';
COMMENT ON TABLE outlet_petty_cash_settings IS 'Per-outlet petty cash configuration: imprest (target float) limit; 0 disables the low-balance warning';

-- ============================================
-- Migration complete!
-- Run this file in the Supabase SQL Editor.
-- ============================================
