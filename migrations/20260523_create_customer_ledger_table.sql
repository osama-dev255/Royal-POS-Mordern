-- ============================================
-- Customer Ledger Account System
-- Date: 2026-05-23
-- Description: Dedicated ledger table for complete customer transaction tracking
-- ============================================

-- 1. CREATE CUSTOMER LEDGER TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS customer_ledger (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES outlet_customers(id) ON DELETE CASCADE,
  
  -- Transaction Details
  transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN (
    'cash_sale', 'card_sale', 'mobile_sale', 'credit_sale',
    'debt_payment', 'settlement', 'adjustment', 'refund'
  )),
  reference_id UUID,  -- ID of the source record (debt, sale, settlement, etc.)
  reference_number VARCHAR(100),  -- Invoice number, receipt number, etc.
  
  -- Amounts
  debit_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  credit_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  running_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  
  -- Metadata
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  description TEXT,
  payment_method VARCHAR(50),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CREATE INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_customer_ledger_outlet ON customer_ledger(outlet_id);
CREATE INDEX IF NOT EXISTS idx_customer_ledger_customer ON customer_ledger(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_ledger_date ON customer_ledger(transaction_date);
CREATE INDEX IF NOT EXISTS idx_customer_ledger_type ON customer_ledger(transaction_type);
CREATE INDEX IF NOT EXISTS idx_customer_ledger_reference ON customer_ledger(reference_id);

-- 3. CREATE TRIGGER FUNCTION FOR CREDIT SALES (OUTLET_DEBTS)
-- ============================================
CREATE OR REPLACE FUNCTION trg_create_ledger_entry_for_debt()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert ledger entry for new credit sale
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
    'credit_sale',
    NEW.id,
    NEW.invoice_number,
    COALESCE(NEW.total_amount, 0),
    0,
    0, -- Will be calculated by trigger
    COALESCE(NEW.debt_date, NEW.created_at, NOW()),
    'Credit Sale - ' || COALESCE(NEW.payment_status, 'Created'),
    'debt',
    COALESCE(NEW.notes, ''),
    auth.uid()
  );
  
  -- Recalculate running balances for this customer
  PERFORM recalculate_customer_ledger_balance(NEW.outlet_id, NEW.customer_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. CREATE TRIGGER FOR CREDIT SALES
-- ============================================
DROP TRIGGER IF EXISTS trigger_debt_ledger_entry ON outlet_debts;
CREATE TRIGGER trigger_debt_ledger_entry
  AFTER INSERT ON outlet_debts
  FOR EACH ROW
  WHEN (NEW.customer_id IS NOT NULL)
  EXECUTE FUNCTION trg_create_ledger_entry_for_debt();

-- 5. CREATE TRIGGER FUNCTION FOR DEBT PAYMENTS
-- ============================================
CREATE OR REPLACE FUNCTION trg_create_ledger_entry_for_debt_payment()
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
  
  -- Insert ledger entry for payment
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
    v_outlet_id,
    v_customer_id,
    'debt_payment',
    NEW.id,
    NEW.reference_number,
    0,
    NEW.amount,
    0, -- Will be calculated by trigger
    COALESCE(NEW.payment_date, NOW()),
    'Payment - ' || COALESCE(NEW.payment_method, 'Cash'),
    NEW.payment_method,
    COALESCE(NEW.notes, ''),
    NEW.created_by
  );
  
  -- Recalculate running balances
  PERFORM recalculate_customer_ledger_balance(v_outlet_id, v_customer_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. CREATE TRIGGER FOR DEBT PAYMENTS
-- ============================================
DROP TRIGGER IF EXISTS trigger_debt_payment_ledger_entry ON outlet_debt_payments;
CREATE TRIGGER trigger_debt_payment_ledger_entry
  AFTER INSERT ON outlet_debt_payments
  FOR EACH ROW
  EXECUTE FUNCTION trg_create_ledger_entry_for_debt_payment();

-- 7. CREATE TRIGGER FUNCTION FOR SETTLEMENTS
-- ============================================
CREATE OR REPLACE FUNCTION trg_create_ledger_entry_for_settlement()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create ledger entry if customer_id exists
  IF NEW.customer_id IS NOT NULL THEN
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
      'settlement',
      NEW.id,
      NEW.invoice_number,
      0,
      NEW.payment_amount,
      0, -- Will be calculated by trigger
      NEW.settlement_date,
      'Settlement - ' || COALESCE(NEW.payment_method, 'Cash'),
      NEW.payment_method,
      COALESCE(NEW.notes, ''),
      NEW.created_by
    );
    
    -- Recalculate running balances
    PERFORM recalculate_customer_ledger_balance(NEW.outlet_id, NEW.customer_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. CREATE TRIGGER FOR SETTLEMENTS
-- ============================================
DROP TRIGGER IF EXISTS trigger_settlement_ledger_entry ON customer_settlements;
CREATE TRIGGER trigger_settlement_ledger_entry
  AFTER INSERT ON customer_settlements
  FOR EACH ROW
  EXECUTE FUNCTION trg_create_ledger_entry_for_settlement();

-- 9. CREATE FUNCTION TO RECALCULATE RUNNING BALANCES
-- ============================================
CREATE OR REPLACE FUNCTION recalculate_customer_ledger_balance(
  p_outlet_id UUID,
  p_customer_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_balance DECIMAL(15,2) := 0;
  v_record RECORD;
BEGIN
  -- Loop through all ledger entries for this customer in chronological order
  FOR v_record IN 
    SELECT id, debit_amount, credit_amount
    FROM customer_ledger
    WHERE outlet_id = p_outlet_id 
      AND customer_id = p_customer_id
    ORDER BY transaction_date ASC, created_at ASC
  LOOP
    v_balance := v_balance + v_record.debit_amount - v_record.credit_amount;
    
    UPDATE customer_ledger
    SET running_balance = v_balance
    WHERE id = v_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 10. ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE customer_ledger ENABLE ROW LEVEL SECURITY;

-- 11. CREATE RLS POLICIES
-- ============================================
-- Allow all authenticated users to view ledger entries
CREATE POLICY "Users can view customer ledger"
  ON customer_ledger
  FOR SELECT
  USING (true);

-- Allow all authenticated users to insert ledger entries (via triggers)
CREATE POLICY "Users can insert customer ledger"
  ON customer_ledger
  FOR INSERT
  WITH CHECK (true);

-- Allow all authenticated users to update ledger entries (for balance recalculation)
CREATE POLICY "Users can update customer ledger"
  ON customer_ledger
  FOR UPDATE
  USING (true);

-- 12. ADD COMMENTS
-- ============================================
COMMENT ON TABLE customer_ledger IS 'Customer transaction ledger with running balances';
COMMENT ON COLUMN customer_ledger.transaction_type IS 'Type of transaction: cash_sale, card_sale, mobile_sale, credit_sale, debt_payment, settlement, adjustment, refund';
COMMENT ON COLUMN customer_ledger.reference_id IS 'ID of the source record (outlet_debts.id, outlet_debt_payments.id, customer_settlements.id, etc.)';
COMMENT ON COLUMN customer_ledger.debit_amount IS 'Amount that increases customer balance (sales)';
COMMENT ON COLUMN customer_ledger.credit_amount IS 'Amount that decreases customer balance (payments, settlements)';
COMMENT ON COLUMN customer_ledger.running_balance IS 'Calculated running balance: SUM(debit - credit)';

-- ============================================
-- Migration complete!
-- ============================================
