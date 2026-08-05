-- ============================================
-- Add Business Info Columns to Cash Handover Notes
-- Date: 2026-08-05
-- Description: Adds business_name, business_address, business_phone columns
--              to the existing cash_handover_notes table.
-- ============================================

ALTER TABLE cash_handover_notes ADD COLUMN IF NOT EXISTS business_name VARCHAR(255);
ALTER TABLE cash_handover_notes ADD COLUMN IF NOT EXISTS business_address TEXT;
ALTER TABLE cash_handover_notes ADD COLUMN IF NOT EXISTS business_phone VARCHAR(50);

COMMENT ON COLUMN cash_handover_notes.business_name IS 'Name of the business handing over the cash';
COMMENT ON COLUMN cash_handover_notes.business_address IS 'Address of the business';
COMMENT ON COLUMN cash_handover_notes.business_phone IS 'Phone number of the business';
