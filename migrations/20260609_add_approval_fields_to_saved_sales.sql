-- ============================================
-- Add Approval Fields to Saved Sales
-- Date: 2026-06-09
-- Description: Adds approval workflow to saved sales (cash, card, mobile, debt)
-- ============================================

-- 1. ADD APPROVAL COLUMNS
-- ============================================
DO $$
BEGIN
  -- Add approval_status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'saved_sales' 
    AND column_name = 'approval_status'
  ) THEN
    ALTER TABLE saved_sales 
    ADD COLUMN approval_status VARCHAR(20) DEFAULT 'pending' 
    CHECK (approval_status IN ('pending', 'approved', 'rejected'));
  END IF;

  -- Add approved_by column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'saved_sales' 
    AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE saved_sales 
    ADD COLUMN approved_by UUID REFERENCES auth.users(id);
  END IF;

  -- Add approval_date column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'saved_sales' 
    AND column_name = 'approval_date'
  ) THEN
    ALTER TABLE saved_sales 
    ADD COLUMN approval_date TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Add approval_notes column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'saved_sales' 
    AND column_name = 'approval_notes'
  ) THEN
    ALTER TABLE saved_sales 
    ADD COLUMN approval_notes TEXT;
  END IF;
END $$;

-- 2. CREATE INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_saved_sales_approval_status 
  ON saved_sales(approval_status);

CREATE INDEX IF NOT EXISTS idx_saved_sales_approved_by 
  ON saved_sales(approved_by);

-- 3. ADD COMMENTS
-- ============================================
COMMENT ON COLUMN saved_sales.approval_status IS 'Approval status: pending, approved, rejected';
COMMENT ON COLUMN saved_sales.approved_by IS 'User ID who approved/rejected the sale';
COMMENT ON COLUMN saved_sales.approval_date IS 'Date when sale was approved/rejected';
COMMENT ON COLUMN saved_sales.approval_notes IS 'Notes about the approval/rejection';

-- ============================================
-- Migration complete!
-- ============================================
