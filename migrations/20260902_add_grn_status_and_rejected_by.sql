-- Migration: Add pending/rejected statuses and rejected_by tracking to saved_grns
-- Date: 2026-09-02

-- 1. Add rejected_by and rejected_date columns
ALTER TABLE saved_grns ADD COLUMN IF NOT EXISTS rejected_by VARCHAR(255);
ALTER TABLE saved_grns ADD COLUMN IF NOT EXISTS rejected_date DATE;

-- 2. Drop the old CHECK constraint and replace with expanded set including 'pending' and 'rejected'
ALTER TABLE saved_grns DROP CONSTRAINT IF EXISTS saved_grns_status_check;
ALTER TABLE saved_grns ADD CONSTRAINT saved_grns_status_check 
  CHECK (status IN ('pending', 'received', 'checked', 'approved', 'completed', 'rejected'));
