-- Migration: Add customer_name and credit_brought_forward columns to outlet_debts table
-- Date: 2026-05-16
-- Description: Stores customer name directly and tracks credit brought forward from previous debts

-- Add customer_name column to store customer name at time of debt creation
ALTER TABLE outlet_debts 
ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);

-- Add credit_brought_forward column to track previous balance
ALTER TABLE outlet_debts 
ADD COLUMN IF NOT EXISTS credit_brought_forward DECIMAL(10,2) DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN outlet_debts.customer_name IS 'Customer name stored at time of debt creation for display purposes';
COMMENT ON COLUMN outlet_debts.credit_brought_forward IS 'Previous balance from customer earlier debts (credit brought forward)';

-- Update existing records with customer names from customer_id
UPDATE outlet_debts d
SET customer_name = CONCAT(c.first_name, ' ', c.last_name)
FROM outlet_customers c
WHERE d.customer_id = c.id
AND d.customer_name IS NULL;

-- Verify the columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'outlet_debts'
AND column_name IN ('customer_name', 'credit_brought_forward')
ORDER BY ordinal_position;
