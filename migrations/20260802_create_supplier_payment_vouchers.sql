-- ============================================
-- Supplier Payment Vouchers
-- Date: 2026-08-02
-- Description: Records when a supplier collects payment for credited transactions.
--              Supports both linked (to specific SPNs/GRNs) and lump-sum modes.
--              On save, creates a DR entry in supplier_ledger to reduce outstanding payable.
-- ============================================

-- 1. CREATE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS supplier_payment_vouchers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Voucher Info
  voucher_number VARCHAR(100) NOT NULL,
  date DATE NOT NULL,

  -- Supplier Info
  supplier_id VARCHAR(255),
  supplier_name VARCHAR(255) NOT NULL,
  supplier_phone VARCHAR(50),
  supplier_email VARCHAR(255),
  supplier_address TEXT,
  supplier_tin VARCHAR(100),

  -- Business Info
  business_name VARCHAR(255),
  business_address TEXT,
  business_phone VARCHAR(50),
  business_tin VARCHAR(100),

  -- Linkage
  linkage_mode VARCHAR(20) NOT NULL DEFAULT 'lump_sum' CHECK (linkage_mode IN ('linked', 'lump_sum')),
  linked_references JSONB DEFAULT '[]'::jsonb,
  -- linked_references: [{ type: 'spn'|'grn', id: uuid, number: string, amount: number }]

  -- Payment
  payment_breakdown JSONB DEFAULT '[]'::jsonb,
  -- payment_breakdown: [{ method: string, amount: number, reference: string }]
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,

  -- Balance tracking
  previous_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  new_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,

  -- Notes
  notes TEXT,

  -- Signatories
  prepared_by VARCHAR(255),
  prepared_date DATE,
  received_by VARCHAR(255),
  received_date DATE,
  approved_by VARCHAR(255),
  approved_date DATE,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled')),

  -- Outlet
  outlet_id UUID,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CREATE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_spv_voucher_number ON supplier_payment_vouchers(voucher_number);
CREATE INDEX IF NOT EXISTS idx_spv_supplier_id ON supplier_payment_vouchers(supplier_id);
CREATE INDEX IF NOT EXISTS idx_spv_supplier_name ON supplier_payment_vouchers(supplier_name);
CREATE INDEX IF NOT EXISTS idx_spv_date ON supplier_payment_vouchers(date);
CREATE INDEX IF NOT EXISTS idx_spv_outlet_id ON supplier_payment_vouchers(outlet_id);

-- 3. ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE supplier_payment_vouchers ENABLE ROW LEVEL SECURITY;

-- 4. CREATE RLS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view supplier payment vouchers" ON supplier_payment_vouchers;
CREATE POLICY "Users can view supplier payment vouchers"
  ON supplier_payment_vouchers FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert supplier payment vouchers" ON supplier_payment_vouchers;
CREATE POLICY "Authenticated users can insert supplier payment vouchers"
  ON supplier_payment_vouchers FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update supplier payment vouchers" ON supplier_payment_vouchers;
CREATE POLICY "Authenticated users can update supplier payment vouchers"
  ON supplier_payment_vouchers FOR UPDATE
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete supplier payment vouchers" ON supplier_payment_vouchers;
CREATE POLICY "Authenticated users can delete supplier payment vouchers"
  ON supplier_payment_vouchers FOR DELETE
  USING (auth.role() = 'authenticated');

-- 5. TRIGGER: Auto-create DR entry in supplier_ledger on voucher insert
-- ============================================
CREATE OR REPLACE FUNCTION trg_create_ledger_entry_for_payment_voucher()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a DR (settlement) entry in supplier_ledger
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
    COALESCE(NEW.supplier_id, NEW.supplier_name),
    NEW.supplier_name,
    'settlement',
    NEW.id,
    NEW.voucher_number,
    COALESCE(NEW.total_amount, 0),            -- DR = payment amount (reduces what we owe)
    0,                                         -- No credit
    0,                                         -- Will be recalculated
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

  -- Recalculate running balance for this supplier
  PERFORM recalculate_supplier_ledger_balance(COALESCE(NEW.supplier_id, NEW.supplier_name));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_payment_voucher_ledger_entry ON supplier_payment_vouchers;
CREATE TRIGGER trigger_payment_voucher_ledger_entry
  AFTER INSERT ON supplier_payment_vouchers
  FOR EACH ROW
  EXECUTE FUNCTION trg_create_ledger_entry_for_payment_voucher();

-- 6. COMMENTS
-- ============================================
COMMENT ON TABLE supplier_payment_vouchers IS 'Records supplier payment collection events — reduces outstanding payable in supplier_ledger';
COMMENT ON COLUMN supplier_payment_vouchers.linkage_mode IS 'linked = tied to specific SPNs/GRNs; lump_sum = general payment';
COMMENT ON COLUMN supplier_payment_vouchers.linked_references IS 'JSON array of { type, id, number, amount } for linked SPNs/GRNs';
COMMENT ON COLUMN supplier_payment_vouchers.payment_breakdown IS 'JSON array of { method, amount, reference } for split payments';
COMMENT ON COLUMN supplier_payment_vouchers.previous_balance IS 'Outstanding payable before this payment';
COMMENT ON COLUMN supplier_payment_vouchers.new_balance IS 'Outstanding payable after this payment (previous - total)';
