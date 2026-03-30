-- Create outlet_sales table for outlet-specific sales
-- This provides complete isolation between outlet sales and general system sales

CREATE TABLE IF NOT EXISTS outlet_sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES outlet_customers(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  invoice_number VARCHAR(50) UNIQUE,
  sale_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  shipping_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  credit_brought_forward DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  change_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  payment_method VARCHAR(50) NOT NULL DEFAULT 'cash',
  payment_status VARCHAR(20) NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid', 'partial', 'unpaid', 'refunded')),
  sale_status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (sale_status IN ('completed', 'pending', 'cancelled')),
  notes TEXT,
  reference_number VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create outlet_sale_items table for outlet-specific sale items
CREATE TABLE IF NOT EXISTS outlet_sale_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES outlet_sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_outlet_sales_outlet_id ON outlet_sales(outlet_id);
CREATE INDEX IF NOT EXISTS idx_outlet_sales_customer_id ON outlet_sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_outlet_sales_sale_date ON outlet_sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_outlet_sales_payment_method ON outlet_sales(payment_method);
CREATE INDEX IF NOT EXISTS idx_outlet_sales_invoice_number ON outlet_sales(invoice_number);
CREATE INDEX IF NOT EXISTS idx_outlet_sale_items_sale_id ON outlet_sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_outlet_sale_items_product_id ON outlet_sale_items(product_id);

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view outlet sales" ON outlet_sales;
DROP POLICY IF EXISTS "Users can insert outlet sales" ON outlet_sales;
DROP POLICY IF EXISTS "Users can update outlet sales" ON outlet_sales;
DROP POLICY IF EXISTS "Users can delete outlet sales" ON outlet_sales;
DROP POLICY IF EXISTS "Users can view outlet sale items" ON outlet_sale_items;
DROP POLICY IF EXISTS "Users can insert outlet sale items" ON outlet_sale_items;
DROP POLICY IF EXISTS "Users can update outlet sale items" ON outlet_sale_items;
DROP POLICY IF EXISTS "Users can delete outlet sale items" ON outlet_sale_items;

-- Create RLS policies for outlet_sales
CREATE POLICY "Users can view outlet sales" ON outlet_sales
    FOR SELECT USING (true);

CREATE POLICY "Users can insert outlet sales" ON outlet_sales
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update outlet sales" ON outlet_sales
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete outlet sales" ON outlet_sales
    FOR DELETE USING (true);

-- Create RLS policies for outlet_sale_items
CREATE POLICY "Users can view outlet sale items" ON outlet_sale_items
    FOR SELECT USING (true);

CREATE POLICY "Users can insert outlet sale items" ON outlet_sale_items
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update outlet sale items" ON outlet_sale_items
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete outlet sale items" ON outlet_sale_items
    FOR DELETE USING (true);

-- Enable RLS on both tables
ALTER TABLE outlet_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlet_sale_items ENABLE ROW LEVEL SECURITY;

-- Add comments
COMMENT ON TABLE outlet_sales IS 'Stores sales specific to each outlet. Completely isolated from general system sales.';
COMMENT ON TABLE outlet_sale_items IS 'Stores sale items for outlet-specific sales.';
COMMENT ON COLUMN outlet_sales.outlet_id IS 'The outlet this sale belongs to. Required - no NULL values allowed.';
COMMENT ON COLUMN outlet_sales.customer_id IS 'References outlet_customers table, not the general customers table.';
