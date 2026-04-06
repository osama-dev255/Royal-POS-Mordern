-- Migration: Add adjustments columns to sales-related tables
-- Date: 2026-04-04
-- Description: Adds adjustments and adjustment_reason columns to support conditional amount adjustments
-- Also adds amount_received column for payment tracking

-- Add adjustments columns to saved_invoices table
ALTER TABLE saved_invoices 
ADD COLUMN IF NOT EXISTS adjustments DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS adjustment_reason TEXT;

-- Add adjustments columns to saved_sales table (outlet sales)
ALTER TABLE saved_sales 
ADD COLUMN IF NOT EXISTS adjustments DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS adjustment_reason TEXT,
ADD COLUMN IF NOT EXISTS amount_received DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(12,2) DEFAULT 0;

-- Add adjustments columns to outlet_sales table
ALTER TABLE outlet_sales 
ADD COLUMN IF NOT EXISTS adjustments DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS adjustment_reason TEXT,
ADD COLUMN IF NOT EXISTS amount_received DECIMAL(12,2) DEFAULT 0;

-- Add comment to document the columns
COMMENT ON COLUMN saved_invoices.adjustments IS 'Adjustment amount (can be positive or negative) applied to the invoice total';
COMMENT ON COLUMN saved_invoices.adjustment_reason IS 'Required reason when adjustments is non-zero';
COMMENT ON COLUMN saved_sales.adjustments IS 'Adjustment amount (can be positive or negative) applied to the sale total';
COMMENT ON COLUMN saved_sales.adjustment_reason IS 'Required reason when adjustments is non-zero';
COMMENT ON COLUMN saved_sales.amount_received IS 'The amount received from the customer during payment';
COMMENT ON COLUMN saved_sales.amount_paid IS 'The amount paid toward the current transaction (excluding debt payments)';

-- Add product_name column to outlet_sale_items for display purposes
ALTER TABLE outlet_sale_items 
ADD COLUMN IF NOT EXISTS product_name TEXT;

COMMENT ON COLUMN outlet_sale_items.product_name IS 'Product name stored at time of sale for display purposes';

-- Add sale_id column to outlet_debts for linking debts to sales
ALTER TABLE outlet_debts 
ADD COLUMN IF NOT EXISTS sale_id UUID REFERENCES outlet_sales(id) ON DELETE CASCADE;

COMMENT ON COLUMN outlet_debts.sale_id IS 'Reference to the sale that created this debt';

COMMENT ON COLUMN outlet_sales.adjustments IS 'Adjustment amount (can be positive or negative) applied to the sale total';
COMMENT ON COLUMN outlet_sales.adjustment_reason IS 'Required reason when adjustments is non-zero';
COMMENT ON COLUMN outlet_sales.amount_received IS 'The amount received from the customer during payment';
