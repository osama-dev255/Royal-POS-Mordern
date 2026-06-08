-- Migration: Add balance_carried_forward column to outlet sales tables
-- Date: 2026-06-08
-- Purpose: Track customer balance before each transaction (negative=credit, positive=debt)
-- This provides consistent naming across all outlet sales tables

-- Add balance_carried_forward to outlet_sales (general table for debt sales)
ALTER TABLE outlet_sales 
ADD COLUMN IF NOT EXISTS balance_carried_forward DECIMAL(10,2) DEFAULT 0.00;

-- Add balance_carried_forward to outlet_cash_sales
ALTER TABLE outlet_cash_sales 
ADD COLUMN IF NOT EXISTS balance_carried_forward DECIMAL(10,2) DEFAULT 0.00;

-- Add balance_carried_forward to outlet_card_sales
ALTER TABLE outlet_card_sales 
ADD COLUMN IF NOT EXISTS balance_carried_forward DECIMAL(10,2) DEFAULT 0.00;

-- Add balance_carried_forward to outlet_mobile_sales
ALTER TABLE outlet_mobile_sales 
ADD COLUMN IF NOT EXISTS balance_carried_forward DECIMAL(10,2) DEFAULT 0.00;

-- Add comments for documentation
COMMENT ON COLUMN outlet_sales.balance_carried_forward IS 'Customer balance before this transaction (negative=credit, positive=debt)';
COMMENT ON COLUMN outlet_cash_sales.balance_carried_forward IS 'Customer balance before this transaction (negative=credit, positive=debt)';
COMMENT ON COLUMN outlet_card_sales.balance_carried_forward IS 'Customer balance before this transaction (negative=credit, positive=debt)';
COMMENT ON COLUMN outlet_mobile_sales.balance_carried_forward IS 'Customer balance before this transaction (negative=credit, positive=debt)';
