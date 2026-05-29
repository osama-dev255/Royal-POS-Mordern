-- Add 'sick' status to attendance_records
-- This allows tracking sick absences separately from regular absences

-- Update the CHECK constraint to include 'sick' status
ALTER TABLE attendance_records 
DROP CONSTRAINT IF EXISTS attendance_records_status_check;

ALTER TABLE attendance_records 
ADD CONSTRAINT attendance_records_status_check 
CHECK (status IN ('present', 'absent', 'late', 'half_day', 'on_leave', 'holiday', 'sick'));
