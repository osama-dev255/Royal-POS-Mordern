-- Add attendance_bonus column to payroll_records
-- This tracks the monthly attendance bonus (TZS 5,000 for 28+ days present)

ALTER TABLE payroll_records 
ADD COLUMN IF NOT EXISTS attendance_bonus DECIMAL(10, 2) DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN payroll_records.attendance_bonus IS 'Monthly attendance bonus: TZS 5,000 for employees with 28+ present days';

-- Create index for reporting
CREATE INDEX IF NOT EXISTS idx_payroll_attendance_bonus ON payroll_records(attendance_bonus);
