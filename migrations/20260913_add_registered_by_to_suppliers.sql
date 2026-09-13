-- Migration: Add registered_by tracking to suppliers table
-- Date: 2026-09-13

-- Add column to track who registered the supplier
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS registered_by VARCHAR(255);
