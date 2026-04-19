-- =====================================================
-- MANUAL MIGRATION INSTRUCTIONS
-- =====================================================
-- Run this SQL directly in your Supabase SQL Editor:
-- https://app.supabase.com/project/YOUR_PROJECT/sql
-- =====================================================

-- Add salesman, driver, and truck columns to outlet_debts table
ALTER TABLE outlet_debts
ADD COLUMN IF NOT EXISTS salesman VARCHAR(255),
ADD COLUMN IF NOT EXISTS driver VARCHAR(255),
ADD COLUMN IF NOT EXISTS truck VARCHAR(255);

-- Add comments for documentation
COMMENT ON COLUMN outlet_debts.salesman IS 'Name of the salesman who processed the debt transaction';
COMMENT ON COLUMN outlet_debts.driver IS 'Name of the driver for delivery';
COMMENT ON COLUMN outlet_debts.truck IS 'Truck/vehicle identifier used for delivery';

-- =====================================================
-- VERIFICATION QUERY (run after adding columns)
-- =====================================================
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'outlet_debts' 
-- AND column_name IN ('salesman', 'driver', 'truck');
