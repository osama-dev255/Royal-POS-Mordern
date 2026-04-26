-- Migration: Add source_address and source_business_name columns to outlet_deliveries_out table
-- This stores the address and business name of the source/outlet sending the delivery
-- Date: 2026-04-26

-- Add the source_address column
ALTER TABLE outlet_deliveries_out 
ADD COLUMN IF NOT EXISTS source_address TEXT;

-- Add the source_business_name column
ALTER TABLE outlet_deliveries_out 
ADD COLUMN IF NOT EXISTS source_business_name TEXT;

-- Add comments to document the columns
COMMENT ON COLUMN outlet_deliveries_out.source_address IS 'Address of the source outlet sending the delivery';
COMMENT ON COLUMN outlet_deliveries_out.source_business_name IS 'Business name of the source outlet sending the delivery';

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
  AND column_name IN ('source_address', 'source_business_name')
ORDER BY column_name;
