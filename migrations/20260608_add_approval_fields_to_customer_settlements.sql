-- ============================================
-- Add Approval Fields to Customer Settlements
-- Date: 2026-06-08
-- Description: Adds approval workflow to customer settlements
-- ============================================

-- 1. ADD APPROVAL COLUMNS
-- ============================================
DO $$
BEGIN
  -- Add approval_status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_settlements' 
    AND column_name = 'approval_status'
  ) THEN
    ALTER TABLE customer_settlements 
    ADD COLUMN approval_status VARCHAR(20) DEFAULT 'pending' 
    CHECK (approval_status IN ('pending', 'approved', 'rejected'));
  END IF;

  -- Add approved_by column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_settlements' 
    AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE customer_settlements 
    ADD COLUMN approved_by UUID REFERENCES auth.users(id);
  END IF;

  -- Add approval_date column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_settlements' 
    AND column_name = 'approval_date'
  ) THEN
    ALTER TABLE customer_settlements 
    ADD COLUMN approval_date TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Add approval_notes column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_settlements' 
    AND column_name = 'approval_notes'
  ) THEN
    ALTER TABLE customer_settlements 
    ADD COLUMN approval_notes TEXT;
  END IF;
END $$;

-- 2. CREATE INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_customer_settlements_approval_status 
  ON customer_settlements(approval_status);

CREATE INDEX IF NOT EXISTS idx_customer_settlements_approved_by 
  ON customer_settlements(approved_by);

-- 3. ADD COMMENTS
-- ============================================
COMMENT ON COLUMN customer_settlements.approval_status IS 'Approval status: pending, approved, rejected';
COMMENT ON COLUMN customer_settlements.approved_by IS 'User ID who approved/rejected the settlement';
COMMENT ON COLUMN customer_settlements.approval_date IS 'Date when settlement was approved/rejected';
COMMENT ON COLUMN customer_settlements.approval_notes IS 'Notes about the approval/rejection';

-- ============================================
-- Migration complete!
-- ============================================
