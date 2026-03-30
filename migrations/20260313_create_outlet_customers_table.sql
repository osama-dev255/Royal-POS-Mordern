-- Create outlet_customers table for outlet-specific customer management
-- This provides complete isolation between outlet customers and general system customers

CREATE TABLE IF NOT EXISTS outlet_customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  district_ward TEXT,
  state TEXT,
  loyalty_points INTEGER DEFAULT 0,
  credit_limit DECIMAL(15,2) DEFAULT 0,
  tax_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_outlet_customers_outlet_id ON outlet_customers(outlet_id);
CREATE INDEX IF NOT EXISTS idx_outlet_customers_email ON outlet_customers(email);
CREATE INDEX IF NOT EXISTS idx_outlet_customers_phone ON outlet_customers(phone);
CREATE INDEX IF NOT EXISTS idx_outlet_customers_name ON outlet_customers(last_name, first_name);

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view outlet customers" ON outlet_customers;
DROP POLICY IF EXISTS "Users can insert outlet customers" ON outlet_customers;
DROP POLICY IF EXISTS "Users can update outlet customers" ON outlet_customers;
DROP POLICY IF EXISTS "Users can delete outlet customers" ON outlet_customers;

-- Create RLS policies for outlet_customers
CREATE POLICY "Users can view outlet customers" ON outlet_customers
    FOR SELECT USING (true);

CREATE POLICY "Users can insert outlet customers" ON outlet_customers
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update outlet customers" ON outlet_customers
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete outlet customers" ON outlet_customers
    FOR DELETE USING (true);

-- Enable RLS on outlet_customers table
ALTER TABLE outlet_customers ENABLE ROW LEVEL SECURITY;

-- Add comments
COMMENT ON TABLE outlet_customers IS 'Stores customers specific to each outlet. Completely isolated from general system customers.';
COMMENT ON COLUMN outlet_customers.outlet_id IS 'The outlet this customer belongs to. Required - no NULL values allowed.';
