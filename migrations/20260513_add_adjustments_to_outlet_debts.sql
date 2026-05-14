-- Migration: Add adjustments columns to outlet_debts table
-- Date: 2026-05-13
-- Description: Adds adjustments and adjustment_reason columns to outlet_debts for consistency with other sales tables

-- Add adjustments columns to outlet_debts table
ALTER TABLE outlet_debts 
ADD COLUMN IF NOT EXISTS adjustments DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS adjustment_reason TEXT;

-- Add comments to document the columns
COMMENT ON COLUMN outlet_debts.adjustments IS 'Adjustment amount (can be positive or negative) applied to the debt total';
COMMENT ON COLUMN outlet_debts.adjustment_reason IS 'Required reason when adjustments is non-zero';
