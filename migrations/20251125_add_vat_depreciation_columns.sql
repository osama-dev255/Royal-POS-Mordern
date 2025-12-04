-- Migration to add VAT and depreciation columns to assets and asset_transactions tables
-- This script should be run in the Supabase SQL editor

-- Add VAT and depreciation columns to existing assets table
ALTER TABLE assets 
ADD COLUMN IF NOT EXISTS vat_rate DECIMAL(5,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS vat_amount DECIMAL(10,2) DEFAULT NULL;

-- Add VAT columns to existing asset_transactions table
ALTER TABLE asset_transactions 
ADD COLUMN IF NOT EXISTS vat_rate DECIMAL(5,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS vat_amount DECIMAL(10,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS net_amount DECIMAL(10,2) DEFAULT NULL;

-- Update the schema cache
NOTIFY pgrst, 'reload schema';