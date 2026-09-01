-- Migration: Fix receiving business fields in saved_grns
-- Problem: A bug in handleSaveGRN caused business_name, business_address, business_phone,
-- and business_email to be saved with SUPPLIER data instead of the actual receiving business data.
-- Fix: Restore the correct business details for all existing GRN records.

UPDATE saved_grns
SET
  business_name = 'KILANGO GROUP LTD',
  business_address = '64 Tanganyika Rd.,Muheza,Tanga,Tanzania',
  business_phone = '0711 299 266',
  business_email = 'kilangogroupltd@gmail.com',
  updated_at = NOW()
WHERE
  business_name IS DISTINCT FROM 'KILANGO GROUP LTD'
  OR business_address IS DISTINCT FROM '64 Tanganyika Rd.,Muheza,Tanga,Tanzania'
  OR business_phone IS DISTINCT FROM '0711 299 266'
  OR business_email IS DISTINCT FROM 'kilangogroupltd@gmail.com';
