-- Migration: Add approved/rejected/verified status tracking to supplier_purchase_notes
-- Date: 2026-09-13

-- 1. Add tracking columns
ALTER TABLE supplier_purchase_notes ADD COLUMN IF NOT EXISTS rejected_by VARCHAR(255);
ALTER TABLE supplier_purchase_notes ADD COLUMN IF NOT EXISTS rejected_date DATE;
ALTER TABLE supplier_purchase_notes ADD COLUMN IF NOT EXISTS verified_by VARCHAR(255);
ALTER TABLE supplier_purchase_notes ADD COLUMN IF NOT EXISTS verified_date DATE;

-- 2. Drop old CHECK constraint and replace with expanded set
ALTER TABLE supplier_purchase_notes DROP CONSTRAINT IF EXISTS supplier_purchase_notes_status_check;
ALTER TABLE supplier_purchase_notes ADD CONSTRAINT supplier_purchase_notes_status_check
  CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'verified', 'completed', 'cancelled'));
