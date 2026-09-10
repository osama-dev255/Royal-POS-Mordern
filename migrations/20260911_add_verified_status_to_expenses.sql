-- Add verification tracking columns to expenses table
-- Allows expenses to be marked as "verified" with the verifier's name and date

-- Add verified_by_name column
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS verified_by_name TEXT;

-- Add verified_date column
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS verified_date TIMESTAMPTZ;

-- Update approval_status CHECK constraint to include 'verified'
-- First drop existing constraint if it exists
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_approval_status_check;

-- Add new constraint with 'verified' included
ALTER TABLE expenses ADD CONSTRAINT expenses_approval_status_check 
  CHECK (approval_status IS NULL OR approval_status IN ('pending', 'approved', 'rejected', 'verified'));
