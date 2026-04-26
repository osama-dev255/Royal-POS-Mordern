-- Migration: Add source and signature columns to outlet_deliveries_out table
-- This stores the address, business name, and signature info of the source/outlet sending the delivery
-- Date: 2026-04-26

-- Add the source_address column
ALTER TABLE outlet_deliveries_out 
ADD COLUMN IF NOT EXISTS source_address TEXT;

-- Add the source_business_name column
ALTER TABLE outlet_deliveries_out 
ADD COLUMN IF NOT EXISTS source_business_name TEXT;

-- Add signature/authorization columns
ALTER TABLE outlet_deliveries_out 
ADD COLUMN IF NOT EXISTS prepared_by_name TEXT;

ALTER TABLE outlet_deliveries_out 
ADD COLUMN IF NOT EXISTS prepared_by_date DATE;

ALTER TABLE outlet_deliveries_out 
ADD COLUMN IF NOT EXISTS received_by_name TEXT;

ALTER TABLE outlet_deliveries_out 
ADD COLUMN IF NOT EXISTS received_by_date DATE;

-- Add comments to document the columns
COMMENT ON COLUMN outlet_deliveries_out.source_address IS 'Address of the source outlet sending the delivery';
COMMENT ON COLUMN outlet_deliveries_out.source_business_name IS 'Business name of the source outlet sending the delivery';
COMMENT ON COLUMN outlet_deliveries_out.prepared_by_name IS 'Name of person who prepared the delivery';
COMMENT ON COLUMN outlet_deliveries_out.prepared_by_date IS 'Date when delivery was prepared';
COMMENT ON COLUMN outlet_deliveries_out.received_by_name IS 'Name of person who received the delivery';
COMMENT ON COLUMN outlet_deliveries_out.received_by_date IS 'Date when delivery was received';

-- Update existing records with outlet address and name (if possible)
-- This will populate source_address and source_business_name for existing deliveries based on the outlet_id
UPDATE outlet_deliveries_out odo
SET 
    source_address = o.address,
    source_business_name = o.name
FROM outlets o
WHERE odo.outlet_id = o.id
  AND odo.source_address IS NULL;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'outlet_deliveries_out' 
  AND column_name IN ('source_address', 'source_business_name', 'prepared_by_name', 'prepared_by_date', 'received_by_name', 'received_by_date')
ORDER BY column_name;
