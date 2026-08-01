-- ============================================
-- Supplier Ledger Account System
-- Date: 2026-07-30
-- Description: Dedicated ledger table for complete supplier transaction tracking
--              GRN received = CR (we owe supplier)
--              Inventory expense / settlement = DR (we pay supplier)
--              Running balance = CR - DR = Outstanding payable
-- ============================================

-- 1. CREATE SUPPLIER LEDGER TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS supplier_ledger (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id VARCHAR(255),
  supplier_name VARCHAR(255) NOT NULL,

  -- Transaction Details
  transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN (
    'grn_received',       -- CR: stock received from supplier (we owe money)
    'inventory_payment',  -- DR: payment to supplier for inventory stock purchase
    'settlement',         -- DR: manual settlement payment to supplier
    'adjustment',         -- DR or CR: manual adjustment
    'refund'              -- CR: supplier refund / credit note
  )),
  reference_id UUID,     -- ID of the source record (GRN, expense, settlement)
  reference_number VARCHAR(100),  -- GRN #, expense voucher #, settlement ref

  -- Amounts (DR/CR model)
  debit_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,   -- Payments we make to supplier
  credit_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,  -- Goods/value we receive from supplier
  running_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,

  -- Metadata
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  description TEXT,
  payment_method VARCHAR(50),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CREATE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_supplier_ledger_supplier_id ON supplier_ledger(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_ledger_supplier_name ON supplier_ledger(supplier_name);
CREATE INDEX IF NOT EXISTS idx_supplier_ledger_transaction_type ON supplier_ledger(transaction_type);
CREATE INDEX IF NOT EXISTS idx_supplier_ledger_transaction_date ON supplier_ledger(transaction_date);
CREATE INDEX IF NOT EXISTS idx_supplier_ledger_reference ON supplier_ledger(reference_number);

-- 3. CREATE FUNCTION TO RECALCULATE RUNNING BALANCES
-- ============================================
CREATE OR REPLACE FUNCTION recalculate_supplier_ledger_balance(
  p_supplier_id VARCHAR
)
RETURNS VOID AS $$
DECLARE
  v_balance DECIMAL(15,2) := 0;
  v_record RECORD;
BEGIN
  -- Loop through all ledger entries for this supplier in chronological order
  -- Balance = SUM(credit) - SUM(debit) = what we still owe
  FOR v_record IN
    SELECT id, debit_amount, credit_amount
    FROM supplier_ledger
    WHERE supplier_id = p_supplier_id
    ORDER BY transaction_date ASC, created_at ASC
  LOOP
    v_balance := v_balance + v_record.credit_amount - v_record.debit_amount;

    UPDATE supplier_ledger
    SET running_balance = v_balance
    WHERE id = v_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 4. CREATE FUNCTION TO GET SUPPLIER BALANCE
-- ============================================
CREATE OR REPLACE FUNCTION get_supplier_balance(
  p_supplier_id VARCHAR
)
RETURNS DECIMAL(15,2) AS $$
DECLARE
  v_balance DECIMAL(15,2);
BEGIN
  SELECT COALESCE(SUM(credit_amount) - SUM(debit_amount), 0)
  INTO v_balance
  FROM supplier_ledger
  WHERE supplier_id = p_supplier_id;

  RETURN v_balance;
END;
$$ LANGUAGE plpgsql;

-- 5. CREATE TRIGGER FUNCTION FOR GRN RECEIVED (auto CR entry)
-- ============================================
CREATE OR REPLACE FUNCTION trg_create_ledger_entry_for_grn()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert ledger entry: CR = we owe the supplier
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
    COALESCE(NEW.supplier_id, ''),
    NEW.supplier_name,
    'grn_received',
    NEW.id,
    NEW.grn_number,
    0,                                        -- No debit
    COALESCE(NEW.total_amount, 0),            -- CR = total GRN amount
    0,                                        -- Will be recalculated
    COALESCE(NEW.created_at, NOW()),
    'GRN Received - ' || COALESCE(NEW.grn_number, '') || ' from ' || COALESCE(NEW.supplier_name, ''),
    NULL,
    COALESCE(NEW.quality_check_notes, ''),
    auth.uid()
  );

  -- Recalculate running balance for this supplier
  PERFORM recalculate_supplier_ledger_balance(COALESCE(NEW.supplier_id, ''));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. CREATE TRIGGER FUNCTION FOR INVENTORY EXPENSE (auto DR entry)
-- ============================================
CREATE OR REPLACE FUNCTION trg_create_ledger_entry_for_inventory_expense()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create ledger entry for Inventory category expenses (stock purchases)
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
      COALESCE(NEW.vendor_name, 'Unknown Supplier'),  -- Use vendor_name as supplier_id
      COALESCE(NEW.vendor_name, 'Unknown Supplier'),
      'inventory_payment',
      NEW.id,
      COALESCE(NEW.voucher_number, NEW.id::text),
      COALESCE(NEW.amount, 0),            -- DR = expense amount (we pay)
      0,                                  -- No credit
      0,                                  -- Will be recalculated
      COALESCE(NEW.expense_date, NEW.created_at, NOW()),
      'Inventory Payment - ' || COALESCE(NEW.category, '') || ': ' || COALESCE(NEW.description, ''),
      COALESCE(NEW.payment_method, ''),
      COALESCE(NEW.notes, ''),
      auth.uid()
    );

    -- Recalculate running balance for this supplier
    PERFORM recalculate_supplier_ledger_balance(COALESCE(NEW.vendor_name, 'Unknown Supplier'));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. CREATE TRIGGERS
-- ============================================
-- Trigger on saved_grns table
DROP TRIGGER IF EXISTS trigger_grn_ledger_entry ON saved_grns;
CREATE TRIGGER trigger_grn_ledger_entry
  AFTER INSERT ON saved_grns
  FOR EACH ROW
  EXECUTE FUNCTION trg_create_ledger_entry_for_grn();

-- Trigger on expenses table (only for Inventory category)
DROP TRIGGER IF EXISTS trigger_inventory_expense_ledger_entry ON expenses;
CREATE TRIGGER trigger_inventory_expense_ledger_entry
  AFTER INSERT ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION trg_create_ledger_entry_for_inventory_expense();

-- 8. ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE supplier_ledger ENABLE ROW LEVEL SECURITY;

-- 9. CREATE RLS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view supplier ledger" ON supplier_ledger;
CREATE POLICY "Users can view supplier ledger"
  ON supplier_ledger FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert supplier ledger entries" ON supplier_ledger;
CREATE POLICY "Authenticated users can insert supplier ledger entries"
  ON supplier_ledger FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update supplier ledger" ON supplier_ledger;
CREATE POLICY "Authenticated users can update supplier ledger"
  ON supplier_ledger FOR UPDATE
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete supplier ledger" ON supplier_ledger;
CREATE POLICY "Authenticated users can delete supplier ledger"
  ON supplier_ledger FOR DELETE
  USING (auth.role() = 'authenticated');

-- 10. ADD TABLE COMMENTS
-- ============================================
COMMENT ON TABLE supplier_ledger IS 'Supplier accounts payable ledger tracking all GRN received (CR) and inventory payments (DR)';
COMMENT ON COLUMN supplier_ledger.debit_amount IS 'Amount we pay to supplier (reduces what we owe)';
COMMENT ON COLUMN supplier_ledger.credit_amount IS 'Amount we owe supplier for goods received (increases what we owe)';
COMMENT ON COLUMN supplier_ledger.running_balance IS 'Running total of what we owe: SUM(credit) - SUM(debit)';
