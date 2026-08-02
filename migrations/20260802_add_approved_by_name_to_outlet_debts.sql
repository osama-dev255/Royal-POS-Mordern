-- ============================================
-- Add Approved By Name to Outlet Debts
-- Date: 2026-08-02
-- Description: Adds approved_by_name text column to store
--              the name of the person who approved/rejected
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'outlet_debts' 
    AND column_name = 'approved_by_name'
  ) THEN
    ALTER TABLE outlet_debts 
    ADD COLUMN approved_by_name TEXT;
  END IF;
END $$;

COMMENT ON COLUMN outlet_debts.approved_by_name IS 'Name of the person who approved/rejected the debt';

-- ============================================
-- Migration complete!
-- ============================================
