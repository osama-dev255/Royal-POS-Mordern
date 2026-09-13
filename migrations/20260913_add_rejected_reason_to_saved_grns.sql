-- Migration: Add rejected_reason column to saved_grns for tracking rejection justification
-- Date: 2026-09-13

-- Add rejected_reason column
ALTER TABLE saved_grns ADD COLUMN IF NOT EXISTS rejected_reason TEXT;
