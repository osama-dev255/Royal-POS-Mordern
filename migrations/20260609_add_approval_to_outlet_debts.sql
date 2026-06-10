-- ============================================
-- Add Approval Fields to Outlet Debts
-- Date: 2026-06-09
-- Description: Adds approval workflow to outlet debts
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'outlet_debts' 
    AND column_name = 'approval_status'
  ) THEN
    ALTER TABLE outlet_debts 
    ADD COLUMN approval_status VARCHAR(20) DEFAULT 'pending' 
    CHECK (approval_status IN ('pending', 'approved', 'rejected'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'outlet_debts' 
    AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE outlet_debts 
    ADD COLUMN approved_by UUID REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'outlet_debts' 
    AND column_name = 'approval_date'
  ) THEN
    ALTER TABLE outlet_debts 
    ADD COLUMN approval_date TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'outlet_debts' 
    AND column_name = 'approval_notes'
  ) THEN
    ALTER TABLE outlet_debts 
    ADD COLUMN approval_notes TEXT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_outlet_debts_approval_status 
  ON outlet_debts(approval_status);

CREATE INDEX IF NOT EXISTS idx_outlet_debts_approved_by 
  ON outlet_debts(approved_by);

COMMENT ON COLUMN outlet_debts.approval_status IS 'Approval status: pending, approved, rejected';
COMMENT ON COLUMN outlet_debts.approved_by IS 'User ID who approved/rejected the debt';
COMMENT ON COLUMN outlet_debts.approval_date IS 'Date when debt was approved/rejected';
COMMENT ON COLUMN outlet_debts.approval_notes IS 'Notes about the approval/rejection';

-- ============================================
-- Migration complete!
-- ============================================
