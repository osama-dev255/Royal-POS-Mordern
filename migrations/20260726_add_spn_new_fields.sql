-- Migration: Add new fields to supplier_purchase_notes table
-- Date: 2026-07-26
-- Description: Adds supplier street address, tax ID, business TIN, signatory fields,
--              mode of payment, destination, and compliance fields

-- Add supplier address and tax ID fields
ALTER TABLE supplier_purchase_notes ADD COLUMN IF NOT EXISTS supplier_street_address TEXT;
ALTER TABLE supplier_purchase_notes ADD COLUMN IF NOT EXISTS supplier_tax_id VARCHAR(100);

-- Add business TIN field
ALTER TABLE supplier_purchase_notes ADD COLUMN IF NOT EXISTS business_tin VARCHAR(100) DEFAULT '172 - 813 - 364';

-- Add signatory fields (delivered by, approved by)
ALTER TABLE supplier_purchase_notes ADD COLUMN IF NOT EXISTS delivered_by VARCHAR(255);
ALTER TABLE supplier_purchase_notes ADD COLUMN IF NOT EXISTS delivered_date DATE;
ALTER TABLE supplier_purchase_notes ADD COLUMN IF NOT EXISTS approved_by VARCHAR(255);
ALTER TABLE supplier_purchase_notes ADD COLUMN IF NOT EXISTS approved_date DATE;

-- Add mode of payment and destination fields
ALTER TABLE supplier_purchase_notes ADD COLUMN IF NOT EXISTS mode_of_payment VARCHAR(50);
ALTER TABLE supplier_purchase_notes ADD COLUMN IF NOT EXISTS destination VARCHAR(255);

-- Add compliance fields
ALTER TABLE supplier_purchase_notes ADD COLUMN IF NOT EXISTS stock_type VARCHAR(20);
ALTER TABLE supplier_purchase_notes ADD COLUMN IF NOT EXISTS receipt_issued BOOLEAN DEFAULT false;
