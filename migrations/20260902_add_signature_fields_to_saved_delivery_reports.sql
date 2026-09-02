-- Add signature fields to saved_delivery_in_reports table
-- Date: 2026-09-02

-- Add checked_by_name column
ALTER TABLE saved_delivery_in_reports
ADD COLUMN IF NOT EXISTS checked_by_name TEXT;

-- Add verified_by_name column
ALTER TABLE saved_delivery_in_reports
ADD COLUMN IF NOT EXISTS verified_by_name TEXT;

-- Add approved_by_name column
ALTER TABLE saved_delivery_in_reports
ADD COLUMN IF NOT EXISTS approved_by_name TEXT;

-- Add comments for documentation
COMMENT ON COLUMN saved_delivery_in_reports.checked_by_name IS 'Name of person who checked the report';
COMMENT ON COLUMN saved_delivery_in_reports.verified_by_name IS 'Name of person who verified the report';
COMMENT ON COLUMN saved_delivery_in_reports.approved_by_name IS 'Name of person who approved the report';
