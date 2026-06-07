-- Add previous_balance column to outlet cash sales tables
-- This tracks the customer's balance BEFORE the transaction

-- Add to outlet_cash_sales
ALTER TABLE outlet_cash_sales 
ADD COLUMN IF NOT EXISTS previous_balance NUMERIC DEFAULT 0;

-- Add to outlet_card_sales
ALTER TABLE outlet_card_sales 
ADD COLUMN IF NOT EXISTS previous_balance NUMERIC DEFAULT 0;

-- Add to outlet_mobile_sales
ALTER TABLE outlet_mobile_sales 
ADD COLUMN IF NOT EXISTS previous_balance NUMERIC DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN outlet_cash_sales.previous_balance IS 'Customer balance before this transaction (negative=credit, positive=debt)';
COMMENT ON COLUMN outlet_card_sales.previous_balance IS 'Customer balance before this transaction (negative=credit, positive=debt)';
COMMENT ON COLUMN outlet_mobile_sales.previous_balance IS 'Customer balance before this transaction (negative=credit, positive=debt)';
