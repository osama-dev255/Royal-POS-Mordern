-- Migration: Add verification columns to saved_stock_takes
-- Date: 2026-07-13

-- Add verified_by name column
ALTER TABLE saved_stock_takes ADD COLUMN IF NOT EXISTS verified_by VARCHAR(255);

-- Add counted_by_date column
ALTER TABLE saved_stock_takes ADD COLUMN IF NOT EXISTS counted_by_date DATE;

-- Add verified_by_date column
ALTER TABLE saved_stock_takes ADD COLUMN IF NOT EXISTS verified_by_date DATE;
