-- Migration: Add delivery details fields to saved_delivery_notes
-- This adds the missing columns to support full delivery editing matching the View Delivery dialog
-- Date: 2026-04-26
-- Based on actual View Delivery display fields

-- Business Information (FROM section - only Name and Address shown in View)
ALTER TABLE saved_delivery_notes 
ADD COLUMN IF NOT EXISTS business_name VARCHAR(255);

ALTER TABLE saved_delivery_notes 
ADD COLUMN IF NOT EXISTS business_address TEXT;

-- Signature Section - Prepared By
ALTER TABLE saved_delivery_notes 
ADD COLUMN IF NOT EXISTS prepared_by_name VARCHAR(255);

ALTER TABLE saved_delivery_notes 
ADD COLUMN IF NOT EXISTS prepared_by_date DATE;

-- Signature Section - Driver Signature
ALTER TABLE saved_delivery_notes 
ADD COLUMN IF NOT EXISTS driver_name VARCHAR(255);

ALTER TABLE saved_delivery_notes 
ADD COLUMN IF NOT EXISTS driver_date DATE;

-- Signature Section - Received By
ALTER TABLE saved_delivery_notes 
ADD COLUMN IF NOT EXISTS received_by_name VARCHAR(255);

ALTER TABLE saved_delivery_notes 
ADD COLUMN IF NOT EXISTS received_by_date DATE;

-- Add comments for documentation
COMMENT ON COLUMN saved_delivery_notes.business_name IS 'Business name (FROM section)';
COMMENT ON COLUMN saved_delivery_notes.business_address IS 'Business address (FROM section)';
COMMENT ON COLUMN saved_delivery_notes.prepared_by_name IS 'Name of person who prepared the delivery';
COMMENT ON COLUMN saved_delivery_notes.prepared_by_date IS 'Date when delivery was prepared';
COMMENT ON COLUMN saved_delivery_notes.driver_name IS 'Driver name for signature section';
COMMENT ON COLUMN saved_delivery_notes.driver_date IS 'Driver signature date';
COMMENT ON COLUMN saved_delivery_notes.received_by_name IS 'Name of person who received the delivery';
COMMENT ON COLUMN saved_delivery_notes.received_by_date IS 'Date when delivery was received';

-- Verify columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'saved_delivery_notes' 
AND column_name IN (
  'business_name', 'business_address',
  'prepared_by_name', 'prepared_by_date', 
  'driver_name', 'driver_date',
  'received_by_name', 'received_by_date'
)
ORDER BY ordinal_position;
