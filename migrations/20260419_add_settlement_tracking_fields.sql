-- Migration: Add cashier, prepared_by, and approved_by columns to customer_settlements table
-- Date: 2026-04-19
-- Description: Adds tracking fields for customer settlement receipts

-- Add new columns to customer_settlements table
ALTER TABLE customer_settlements
ADD COLUMN IF NOT EXISTS cashier TEXT,
ADD COLUMN IF NOT EXISTS prepared_by TEXT,
ADD COLUMN IF NOT EXISTS approved_by TEXT;

-- Add comments for documentation
COMMENT ON COLUMN customer_settlements.cashier IS 'Name of the cashier who processed the settlement';
COMMENT ON COLUMN customer_settlements.prepared_by IS 'Name of the person who prepared the settlement';
COMMENT ON COLUMN customer_settlements.approved_by IS 'Name of the person who approved the settlement (optional)';
