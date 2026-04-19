-- Add salesman, driver, and truck columns to outlet_debts table
-- This allows tracking delivery/sales personnel and vehicle information for debt transactions

-- Add new columns to outlet_debts table
ALTER TABLE outlet_debts
ADD COLUMN IF NOT EXISTS salesman VARCHAR(255),
ADD COLUMN IF NOT EXISTS driver VARCHAR(255),
ADD COLUMN IF NOT EXISTS truck VARCHAR(255);

-- Add comments for documentation
COMMENT ON COLUMN outlet_debts.salesman IS 'Name of the salesman who processed the debt transaction';
COMMENT ON COLUMN outlet_debts.driver IS 'Name of the driver for delivery';
COMMENT ON COLUMN outlet_debts.truck IS 'Truck/vehicle identifier used for delivery';
