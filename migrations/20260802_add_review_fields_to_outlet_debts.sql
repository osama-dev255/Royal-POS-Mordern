-- ============================================
-- Add Review Fields to Outlet Debts
-- Date: 2026-08-02
-- Description: Adds review workflow (pre-approval step) to outlet debts
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'outlet_debts' 
    AND column_name = 'review_status'
  ) THEN
    ALTER TABLE outlet_debts 
    ADD COLUMN review_status VARCHAR(20) DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'reviewed', 'needs_changes'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'outlet_debts' 
    AND column_name = 'reviewed_by'
  ) THEN
    ALTER TABLE outlet_debts 
    ADD COLUMN reviewed_by TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'outlet_debts' 
    AND column_name = 'review_date'
  ) THEN
    ALTER TABLE outlet_debts 
    ADD COLUMN review_date TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'outlet_debts' 
    AND column_name = 'review_notes'
  ) THEN
    ALTER TABLE outlet_debts 
    ADD COLUMN review_notes TEXT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_outlet_debts_review_status
ON outlet_debts(review_status);

CREATE INDEX IF NOT EXISTS idx_outlet_debts_reviewed_by 
  ON outlet_debts(reviewed_by);

COMMENT ON COLUMN outlet_debts.review_status IS 'Review status: pending, reviewed, needs_changes';
COMMENT ON COLUMN outlet_debts.reviewed_by IS 'Name of the person who reviewed the debt';
COMMENT ON COLUMN outlet_debts.review_date IS 'Date when debt was reviewed';
COMMENT ON COLUMN outlet_debts.review_notes IS 'Notes about the review';

-- ============================================
-- Migration complete!
-- ============================================
