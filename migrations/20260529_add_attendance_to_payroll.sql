-- Add attendance tracking to payroll system
-- Migration: 20260529_add_attendance_to_payroll.sql

-- 1. Create attendance_records table
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES outlet_employees(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  
  -- Attendance status
  status VARCHAR(50) NOT NULL CHECK (status IN ('present', 'absent', 'late', 'half_day', 'on_leave', 'holiday')),
  
  -- Time tracking
  check_in_time TIME,
  check_out_time TIME,
  expected_check_in TIME DEFAULT '09:00:00',
  expected_check_out TIME DEFAULT '17:00:00',
  
  -- Late/Early tracking
  late_minutes INTEGER DEFAULT 0,
  early_departure_minutes INTEGER DEFAULT 0,
  
  -- Notes
  notes TEXT,
  marked_by UUID, -- User who marked attendance
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one attendance record per employee per day
  UNIQUE(employee_id, attendance_date)
);

-- 2. Add attendance-related columns to payroll_records
ALTER TABLE payroll_records 
ADD COLUMN IF NOT EXISTS working_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS days_present INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS days_absent INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS days_late INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS days_half_day INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS days_on_leave INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_late_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS per_day_salary DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS attendance_deduction DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS late_penalty DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS perfect_attendance_bonus DECIMAL(10, 2) DEFAULT 0;

-- 3. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_attendance_outlet_id ON attendance_records(outlet_id);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_id ON attendance_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance_records(status);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance_records(employee_id, attendance_date);

-- 4. Enable Row Level Security
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for attendance_records
CREATE POLICY "Allow authenticated users to view attendance"
  ON attendance_records FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert attendance"
  ON attendance_records FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update attendance"
  ON attendance_records FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete attendance"
  ON attendance_records FOR DELETE
  TO authenticated
  USING (true);

-- 6. Create trigger to automatically update updated_at
CREATE TRIGGER update_attendance_records_timestamp
  BEFORE UPDATE ON attendance_records
  FOR EACH ROW
  EXECUTE FUNCTION update_payroll_timestamp();

-- 7. Add comments
COMMENT ON TABLE attendance_records IS 'Daily attendance tracking for outlet employees';
COMMENT ON COLUMN attendance_records.status IS 'Attendance status: present, absent, late, half_day, on_leave, holiday';
COMMENT ON COLUMN payroll_records.attendance_deduction IS 'Salary deduction based on absences';
COMMENT ON COLUMN payroll_records.late_penalty IS 'Penalty for late arrivals';
COMMENT ON COLUMN payroll_records.perfect_attendance_bonus IS 'Bonus for perfect attendance';
