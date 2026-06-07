-- Rename previous_balance to balance_carried_forward in outlet sales tables
-- This provides clearer naming consistent with accounting terminology

-- Rename in outlet_cash_sales
ALTER TABLE outlet_cash_sales 
RENAME COLUMN previous_balance TO balance_carried_forward;

-- Rename in outlet_card_sales
ALTER TABLE outlet_card_sales 
RENAME COLUMN previous_balance TO balance_carried_forward;

-- Rename in outlet_mobile_sales
ALTER TABLE outlet_mobile_sales 
RENAME COLUMN previous_balance TO balance_carried_forward;

-- Update comments for documentation
COMMENT ON COLUMN outlet_cash_sales.balance_carried_forward IS 'Customer balance before this transaction (negative=credit, positive=debt)';
COMMENT ON COLUMN outlet_card_sales.balance_carried_forward IS 'Customer balance before this transaction (negative=credit, positive=debt)';
COMMENT ON COLUMN outlet_mobile_sales.balance_carried_forward IS 'Customer balance before this transaction (negative=credit, positive=debt)';
