-- ============================================
-- Internal Consumption Notes
-- Date: 2026-08-15
-- Description: Records when products are taken by internal personnel
--              (employees, managers, investors, owners) for free.
--              Tracks as internal consumption, loss/damage, employee benefit,
--              or owner/investor draw.
-- ============================================

-- 1. CREATE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS saved_internal_consumption_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Reference
  note_number TEXT UNIQUE NOT NULL,
  date DATE NOT NULL,

  -- Person Info
  taken_by VARCHAR(255) NOT NULL,
  person_type VARCHAR(50) NOT NULL CHECK (person_type IN ('employee', 'manager', 'investor', 'owner')),
  department VARCHAR(255),

  -- Reason
  reason VARCHAR(50) NOT NULL CHECK (reason IN ('consumption', 'damage', 'benefit', 'owner_draw', 'other')),

  -- Items (JSONB array of {product_id, name, qty, unit, cost_price, total, godown_id, godown_name, zone_id, zone_name})
  items JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Totals
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,

  -- Notes
  notes TEXT,

  -- Damage Tracking (when reason = 'damage')
  damage_description TEXT,
  damage_date DATE,
  recoverable BOOLEAN DEFAULT false,
  disposal_method VARCHAR(255),

  -- Approval
  prepared_by VARCHAR(255),
  prepared_date DATE,
  approved_by VARCHAR(255),
  approved_date DATE,
  rejection_reason TEXT,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),

  -- Outlet
  outlet_id UUID,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CREATE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_icn_note_number ON saved_internal_consumption_notes(note_number);
CREATE INDEX IF NOT EXISTS idx_icn_date ON saved_internal_consumption_notes(date);
CREATE INDEX IF NOT EXISTS idx_icn_status ON saved_internal_consumption_notes(status);
CREATE INDEX IF NOT EXISTS idx_icn_outlet_id ON saved_internal_consumption_notes(outlet_id);
CREATE INDEX IF NOT EXISTS idx_icn_taken_by ON saved_internal_consumption_notes(taken_by);
CREATE INDEX IF NOT EXISTS idx_icn_reason ON saved_internal_consumption_notes(reason);

-- 3. ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE saved_internal_consumption_notes ENABLE ROW LEVEL SECURITY;

-- 4. CREATE RLS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view internal consumption notes" ON saved_internal_consumption_notes;
CREATE POLICY "Users can view internal consumption notes"
  ON saved_internal_consumption_notes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert internal consumption notes" ON saved_internal_consumption_notes;
CREATE POLICY "Authenticated users can insert internal consumption notes"
  ON saved_internal_consumption_notes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update internal consumption notes" ON saved_internal_consumption_notes;
CREATE POLICY "Authenticated users can update internal consumption notes"
  ON saved_internal_consumption_notes FOR UPDATE
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete internal consumption notes" ON saved_internal_consumption_notes;
CREATE POLICY "Authenticated users can delete internal consumption notes"
  ON saved_internal_consumption_notes FOR DELETE
  USING (auth.role() = 'authenticated');

-- 5. COMMENTS
-- ============================================
COMMENT ON TABLE saved_internal_consumption_notes IS 'Records internal consumption events — documents when products are taken by internal personnel for free';
COMMENT ON COLUMN saved_internal_consumption_notes.note_number IS 'Auto-generated reference number (e.g., ICN-20260815-001)';
COMMENT ON COLUMN saved_internal_consumption_notes.taken_by IS 'Name of the person taking the products';
COMMENT ON COLUMN saved_internal_consumption_notes.person_type IS 'Type of person: employee, manager, investor, or owner';
COMMENT ON COLUMN saved_internal_consumption_notes.reason IS 'Reason for taking: consumption, damage, benefit, owner_draw, or other';
COMMENT ON COLUMN saved_internal_consumption_notes.items IS 'JSONB array of items taken with product details including godown and zone';
COMMENT ON COLUMN saved_internal_consumption_notes.total_amount IS 'Total cost value of all items taken';
COMMENT ON COLUMN saved_internal_consumption_notes.damage_description IS 'Description of damage when reason is damage';
COMMENT ON COLUMN saved_internal_consumption_notes.recoverable IS 'Whether damaged items are recoverable (for insurance)';
COMMENT ON COLUMN saved_internal_consumption_notes.status IS 'pending = awaiting approval; approved = stock deducted; rejected = declined';
