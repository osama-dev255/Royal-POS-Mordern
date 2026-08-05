-- ============================================
-- Cash Handover Notes
-- Date: 2026-08-05
-- Description: Records when cash collected from business is handed over
--              to a money agent/courier for banking (supplier payment purposes).
--              Tracks three signatories: prepared_by, handed_over_by, received_by.
-- ============================================

-- 1. CREATE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS cash_handover_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Reference
  reference_number VARCHAR(100) NOT NULL,
  date DATE NOT NULL,

  -- Business Info
  business_name VARCHAR(255),
  business_address TEXT,
  business_phone VARCHAR(50),

  -- Cash Details
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,

  -- Notes
  notes TEXT,

  -- Signatories
  prepared_by VARCHAR(255),
  prepared_date DATE,
  handed_over_by VARCHAR(255),
  handed_over_date DATE,
  received_by VARCHAR(255),
  received_date DATE,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),

  -- Outlet
  outlet_id UUID,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CREATE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_chn_reference_number ON cash_handover_notes(reference_number);
CREATE INDEX IF NOT EXISTS idx_chn_date ON cash_handover_notes(date);
CREATE INDEX IF NOT EXISTS idx_chn_status ON cash_handover_notes(status);
CREATE INDEX IF NOT EXISTS idx_chn_outlet_id ON cash_handover_notes(outlet_id);

-- 3. ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE cash_handover_notes ENABLE ROW LEVEL SECURITY;

-- 4. CREATE RLS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view cash handover notes" ON cash_handover_notes;
CREATE POLICY "Users can view cash handover notes"
  ON cash_handover_notes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert cash handover notes" ON cash_handover_notes;
CREATE POLICY "Authenticated users can insert cash handover notes"
  ON cash_handover_notes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update cash handover notes" ON cash_handover_notes;
CREATE POLICY "Authenticated users can update cash handover notes"
  ON cash_handover_notes FOR UPDATE
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete cash handover notes" ON cash_handover_notes;
CREATE POLICY "Authenticated users can delete cash handover notes"
  ON cash_handover_notes FOR DELETE
  USING (auth.role() = 'authenticated');

-- 5. COMMENTS
-- ============================================
COMMENT ON TABLE cash_handover_notes IS 'Records cash handover events — documents when cash collected from business is handed to a money agent for banking';
COMMENT ON COLUMN cash_handover_notes.reference_number IS 'Auto-generated reference number (e.g., CHN-2026-0001)';
COMMENT ON COLUMN cash_handover_notes.total_amount IS 'Total cash amount being handed over for banking';
COMMENT ON COLUMN cash_handover_notes.prepared_by IS 'Person who prepares the handover document';
COMMENT ON COLUMN cash_handover_notes.handed_over_by IS 'Person who physically hands over the cash';
COMMENT ON COLUMN cash_handover_notes.received_by IS 'The money agent/courier who receives the cash';
COMMENT ON COLUMN cash_handover_notes.status IS 'pending = awaiting signatures; completed = all parties signed';
