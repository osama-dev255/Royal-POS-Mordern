-- Add sick days and early departure tracking columns to payroll_records
-- This supports the new sick absence policy and early departure penalty system

-- Add new columns for sick leave tracking
ALTER TABLE payroll_records 
ADD COLUMN IF NOT EXISTS days_sick INTEGER DEFAULT 0;

-- Add new columns for early departure tracking
ALTER TABLE payroll_records 
ADD COLUMN IF NOT EXISTS total_early_minutes INTEGER DEFAULT 0;

ALTER TABLE payroll_records 
ADD COLUMN IF NOT EXISTS chargeable_early_minutes INTEGER DEFAULT 0;

ALTER TABLE payroll_records 
ADD COLUMN IF NOT EXISTS early_departure_penalty DECIMAL(10, 2) DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN payroll_records.days_sick IS 'Number of sick days in pay period (first 2 days free)';
COMMENT ON COLUMN payroll_records.total_early_minutes IS 'Total minutes employee left before expected check-out time (18:30)';
COMMENT ON COLUMN payroll_records.chargeable_early_minutes IS 'Billable early departure minutes after 20-minute grace period';
COMMENT ON COLUMN payroll_records.early_departure_penalty IS 'Penalty amount for early departure (TZS 10 per chargeable minute)';

-- Create indexes for reporting
CREATE INDEX IF NOT EXISTS idx_payroll_days_sick ON payroll_records(days_sick);
CREATE INDEX IF NOT EXISTS idx_payroll_early_minutes ON payroll_records(total_early_minutes);
CREATE INDEX IF NOT EXISTS idx_payroll_early_penalty ON payroll_records(early_departure_penalty);
