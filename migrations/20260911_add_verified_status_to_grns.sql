-- Migration: Add 'verified' status and verified_by tracking to saved_grns
-- Date: 2026-09-11

-- 1. Add verified_by and verified_date columns
ALTER TABLE saved_grns ADD COLUMN IF NOT EXISTS verified_by VARCHAR(255);
ALTER TABLE saved_grns ADD COLUMN IF NOT EXISTS verified_date DATE;

-- 2. Drop the old CHECK constraint and replace with expanded set including 'verified'
ALTER TABLE saved_grns DROP CONSTRAINT IF EXISTS saved_grns_status_check;
ALTER TABLE saved_grns ADD CONSTRAINT saved_grns_status_check 
  CHECK (status IN ('pending', 'received', 'checked', 'approved', 'completed', 'rejected', 'verified'));
