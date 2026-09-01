-- Migration: Add approval columns to delivery tables
-- Description: Adds approval_status, approved_by_name, approval_notes, and approved_at
--              to saved_delivery_notes and outlet_deliveries_out tables

-- ============================================================
-- 1. saved_delivery_notes
-- ============================================================

-- approval_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_delivery_notes'
    AND column_name = 'approval_status'
  ) THEN
    ALTER TABLE saved_delivery_notes
    ADD COLUMN approval_status VARCHAR(20) DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

-- approved_by_name
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_delivery_notes'
    AND column_name = 'approved_by_name'
  ) THEN
    ALTER TABLE saved_delivery_notes
    ADD COLUMN approved_by_name TEXT;
  END IF;
END $$;

-- approval_notes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_delivery_notes'
    AND column_name = 'approval_notes'
  ) THEN
    ALTER TABLE saved_delivery_notes
    ADD COLUMN approval_notes TEXT;
  END IF;
END $$;

-- approved_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_delivery_notes'
    AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE saved_delivery_notes
    ADD COLUMN approved_at TIMESTAMPTZ;
  END IF;
END $$;

-- ============================================================
-- 2. outlet_deliveries_out
-- ============================================================

-- approval_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'outlet_deliveries_out'
    AND column_name = 'approval_status'
  ) THEN
    ALTER TABLE outlet_deliveries_out
    ADD COLUMN approval_status VARCHAR(20) DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

-- approved_by_name
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'outlet_deliveries_out'
    AND column_name = 'approved_by_name'
  ) THEN
    ALTER TABLE outlet_deliveries_out
    ADD COLUMN approved_by_name TEXT;
  END IF;
END $$;

-- approval_notes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'outlet_deliveries_out'
    AND column_name = 'approval_notes'
  ) THEN
    ALTER TABLE outlet_deliveries_out
    ADD COLUMN approval_notes TEXT;
  END IF;
END $$;

-- approved_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'outlet_deliveries_out'
    AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE outlet_deliveries_out
    ADD COLUMN approved_at TIMESTAMPTZ;
  END IF;
END $$;

-- ============================================================
-- Comments
-- ============================================================
COMMENT ON COLUMN saved_delivery_notes.approval_status IS 'Approval status: pending, approved, or rejected';
COMMENT ON COLUMN saved_delivery_notes.approved_by_name IS 'Name of the person who approved/rejected the delivery';
COMMENT ON COLUMN saved_delivery_notes.approval_notes IS 'Optional notes for the approval/rejection';
COMMENT ON COLUMN saved_delivery_notes.approved_at IS 'Timestamp when the delivery was approved/rejected';

COMMENT ON COLUMN outlet_deliveries_out.approval_status IS 'Approval status: pending, approved, or rejected';
COMMENT ON COLUMN outlet_deliveries_out.approved_by_name IS 'Name of the person who approved/rejected the delivery';
COMMENT ON COLUMN outlet_deliveries_out.approval_notes IS 'Optional notes for the approval/rejection';
COMMENT ON COLUMN outlet_deliveries_out.approved_at IS 'Timestamp when the delivery was approved/rejected';
