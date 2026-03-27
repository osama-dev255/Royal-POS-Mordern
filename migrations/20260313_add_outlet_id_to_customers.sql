-- Add outlet_id to customers table for outlet-specific customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS outlet_id UUID REFERENCES outlets(id) ON DELETE CASCADE;

-- Add missing columns that the application expects
ALTER TABLE customers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS district_ward TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(15,2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tax_id TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create index for faster queries by outlet
CREATE INDEX IF NOT EXISTS idx_customers_outlet_id ON customers(outlet_id);

-- Drop existing policies if they exist (to avoid duplicate policy error)
DROP POLICY IF EXISTS "Users can view customers from any outlet" ON customers;
DROP POLICY IF EXISTS "Users can insert customers to any outlet" ON customers;
DROP POLICY IF EXISTS "Users can update customers from any outlet" ON customers;
DROP POLICY IF EXISTS "Users can delete customers from any outlet" ON customers;

-- Update RLS policies to allow outlet-based access
CREATE POLICY "Users can view customers from any outlet" ON customers
    FOR SELECT USING (true);

CREATE POLICY "Users can insert customers to any outlet" ON customers
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update customers from any outlet" ON customers
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete customers from any outlet" ON customers
    FOR DELETE USING (true);

-- Add comment
COMMENT ON COLUMN customers.outlet_id IS 'The outlet this customer belongs to. NULL means global customer available to all outlets.';
