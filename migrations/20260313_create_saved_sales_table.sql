-- Create saved_sales table for outlet-specific saved sales
CREATE TABLE IF NOT EXISTS saved_sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  outlet_id UUID REFERENCES outlets(id) ON DELETE CASCADE,
  invoice_number VARCHAR(100) NOT NULL,
  customer VARCHAR(255),
  customer_id UUID REFERENCES outlet_customers(id) ON DELETE SET NULL,
  items JSONB NOT NULL DEFAULT '[]',
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  tax DECIMAL(15,2) NOT NULL DEFAULT 0,
  discount DECIMAL(15,2) NOT NULL DEFAULT 0,
  shipping DECIMAL(15,2) NOT NULL DEFAULT 0,
  credit_brought_forward DECIMAL(15,2) NOT NULL DEFAULT 0,
  total DECIMAL(15,2) NOT NULL DEFAULT 0,
  payment_method VARCHAR(50) NOT NULL DEFAULT 'cash',
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  sale_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_saved_sales_outlet_id ON saved_sales(outlet_id);
CREATE INDEX IF NOT EXISTS idx_saved_sales_customer_id ON saved_sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_saved_sales_status ON saved_sales(status);
CREATE INDEX IF NOT EXISTS idx_saved_sales_payment_method ON saved_sales(payment_method);
CREATE INDEX IF NOT EXISTS idx_saved_sales_sale_date ON saved_sales(sale_date);

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view saved sales from any outlet" ON saved_sales;
DROP POLICY IF EXISTS "Users can insert saved sales to any outlet" ON saved_sales;
DROP POLICY IF EXISTS "Users can update saved sales from any outlet" ON saved_sales;
DROP POLICY IF EXISTS "Users can delete saved sales from any outlet" ON saved_sales;

-- Update RLS policies to allow outlet-based access
CREATE POLICY "Users can view saved sales from any outlet" ON saved_sales
    FOR SELECT USING (true);

CREATE POLICY "Users can insert saved sales to any outlet" ON saved_sales
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update saved sales from any outlet" ON saved_sales
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete saved sales from any outlet" ON saved_sales
    FOR DELETE USING (true);

-- Add comments
COMMENT ON TABLE saved_sales IS 'Stores outlet-specific saved sales transactions';
COMMENT ON COLUMN saved_sales.outlet_id IS 'The outlet this saved sale belongs to';
COMMENT ON COLUMN saved_sales.items IS 'JSON array of sale items with name, quantity, price';
COMMENT ON COLUMN saved_sales.payment_method IS 'Payment method: cash, card, mobile, debt';
COMMENT ON COLUMN saved_sales.status IS 'Sale status: pending, completed, cancelled';
