-- =====================================================
-- Migration: Add Settlement Tracking Fields
-- Date: 2026-04-19
-- Description: Add cashier, prepared_by, and approved_by to customer_settlements
-- =====================================================
-- INSTRUCTIONS: Copy and paste this entire script into your Supabase SQL Editor and run it
-- =====================================================

-- Add new columns to customer_settlements table
ALTER TABLE customer_settlements
ADD COLUMN IF NOT EXISTS cashier TEXT,
ADD COLUMN IF NOT EXISTS prepared_by TEXT,
ADD COLUMN IF NOT EXISTS approved_by TEXT;

-- Add comments for documentation
COMMENT ON COLUMN customer_settlements.cashier IS 'Name of the cashier who processed the settlement';
COMMENT ON COLUMN customer_settlements.prepared_by IS 'Name of the person who prepared the settlement';
COMMENT ON COLUMN customer_settlements.approved_by IS 'Name of the person who approved the settlement (optional)';

-- Verify the columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'customer_settlements'
AND column_name IN ('cashier', 'prepared_by', 'approved_by')
ORDER BY column_name;
