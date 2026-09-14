-- Migration: Add rejected_reason column to supplier_purchase_notes
-- Date: 2026-09-14

-- Add rejected_reason column for tracking rejection justification
ALTER TABLE supplier_purchase_notes ADD COLUMN IF NOT EXISTS rejected_reason TEXT;
