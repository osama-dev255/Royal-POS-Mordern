-- Migration: Add shipping_amount column to outlet_debts table
-- Date: 2026-05-13
-- Description: Adds shipping_amount column to outlet_debts for consistency with other sales tables

-- Add shipping_amount column to outlet_debts table
ALTER TABLE outlet_debts 
ADD COLUMN IF NOT EXISTS shipping_amount DECIMAL(10,2) DEFAULT 0;

-- Add comment to document the column
COMMENT ON COLUMN outlet_debts.shipping_amount IS 'Shipping/delivery charge applied to the debt';
