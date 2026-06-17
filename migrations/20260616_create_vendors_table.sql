-- Create vendors table for expense management
-- Stores vendor information for reuse in expense transactions

CREATE TABLE IF NOT EXISTS vendors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  vendor_name TEXT NOT NULL,
  vendor_contact TEXT,
  vendor_email TEXT,
  vendor_address TEXT,
  vendor_type TEXT, -- supplier, service_provider, contractor, utility, other
  is_active BOOLEAN DEFAULT true,
  total_transactions INTEGER DEFAULT 0,
  total_amount_spent DECIMAL(10, 2) DEFAULT 0.00,
  last_transaction_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_vendors_outlet_id ON vendors(outlet_id);
CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors(vendor_name);
CREATE INDEX IF NOT EXISTS idx_vendors_active ON vendors(is_active);

-- Enable Row Level Security
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

-- Create policies for vendors table
CREATE POLICY "Enable read access for all authenticated users" ON vendors
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for all authenticated users" ON vendors
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for all authenticated users" ON vendors
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" ON vendors
  FOR DELETE USING (auth.role() = 'authenticated');

-- Add comments for documentation
COMMENT ON TABLE vendors IS 'Stores vendor/supplier information for expense tracking';
COMMENT ON COLUMN vendors.outlet_id IS 'Links vendor to specific outlet';
COMMENT ON COLUMN vendors.vendor_type IS 'Type of vendor: supplier, service_provider, contractor, utility, other';
COMMENT ON COLUMN vendors.total_transactions IS 'Total number of expense transactions with this vendor';
COMMENT ON COLUMN vendors.total_amount_spent IS 'Total amount spent with this vendor';
