-- ============================================
-- Add Review & Approved By Name to Customer Settlements
-- Date: 2026-08-02
-- Description: Adds review workflow (pre-approval step) and
--              approved_by_name to customer_settlements
-- ============================================

DO $$
BEGIN
  -- Review columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_settlements' 
    AND column_name = 'review_status'
  ) THEN
    ALTER TABLE customer_settlements 
    ADD COLUMN review_status VARCHAR(20) DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'reviewed', 'needs_changes'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_settlements' 
    AND column_name = 'reviewed_by'
  ) THEN
    ALTER TABLE customer_settlements 
    ADD COLUMN reviewed_by TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_settlements' 
    AND column_name = 'review_date'
  ) THEN
    ALTER TABLE customer_settlements 
    ADD COLUMN review_date TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_settlements' 
    AND column_name = 'review_notes'
  ) THEN
    ALTER TABLE customer_settlements 
    ADD COLUMN review_notes TEXT;
  END IF;

  -- Approved by name column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_settlements' 
    AND column_name = 'approved_by_name'
  ) THEN
    ALTER TABLE customer_settlements 
    ADD COLUMN approved_by_name TEXT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_customer_settlements_review_status
ON customer_settlements(review_status);

COMMENT ON COLUMN customer_settlements.review_status IS 'Review status: pending, reviewed, needs_changes';
COMMENT ON COLUMN customer_settlements.reviewed_by IS 'Name of the person who reviewed the settlement';
COMMENT ON COLUMN customer_settlements.review_date IS 'Date when settlement was reviewed';
COMMENT ON COLUMN customer_settlements.review_notes IS 'Notes about the review';
COMMENT ON COLUMN customer_settlements.approved_by_name IS 'Name of the person who approved/rejected the settlement';

-- ============================================
-- Migration complete!
-- ============================================
