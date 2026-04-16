-- Create dedicated outlet_debts table for better debt management
-- This separates debt tracking from general sales for improved organization

-- Drop existing tables if they exist (to rebuild with new structure)
DROP TABLE IF EXISTS outlet_debt_payments CASCADE;
DROP TABLE IF EXISTS outlet_debt_items CASCADE;
DROP TABLE IF EXISTS outlet_debts CASCADE;

-- Create outlet_debts table
CREATE TABLE outlet_debts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES outlet_customers(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  debt_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  due_date TIMESTAMP WITH TIME ZONE,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  remaining_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'partial', 'unpaid')),
  notes TEXT,
  reference_number VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create outlet_debt_items table for debt line items
CREATE TABLE outlet_debt_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  debt_id UUID NOT NULL REFERENCES outlet_debts(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(255),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create outlet_debt_payments table to track payment history
CREATE TABLE outlet_debt_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  debt_id UUID NOT NULL REFERENCES outlet_debts(id) ON DELETE CASCADE,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'cash',
  reference_number VARCHAR(100),
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_outlet_debts_outlet_id ON outlet_debts(outlet_id);
CREATE INDEX IF NOT EXISTS idx_outlet_debts_customer_id ON outlet_debts(customer_id);
CREATE INDEX IF NOT EXISTS idx_outlet_debts_debt_date ON outlet_debts(debt_date);
CREATE INDEX IF NOT EXISTS idx_outlet_debts_payment_status ON outlet_debts(payment_status);
CREATE INDEX IF NOT EXISTS idx_outlet_debts_invoice_number ON outlet_debts(invoice_number);
CREATE INDEX IF NOT EXISTS idx_outlet_debt_items_debt_id ON outlet_debt_items(debt_id);
CREATE INDEX IF NOT EXISTS idx_outlet_debt_items_product_id ON outlet_debt_items(product_id);
CREATE INDEX IF NOT EXISTS idx_outlet_debt_payments_debt_id ON outlet_debt_payments(debt_id);

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view outlet debts" ON outlet_debts;
DROP POLICY IF EXISTS "Users can insert outlet debts" ON outlet_debts;
DROP POLICY IF EXISTS "Users can update outlet debts" ON outlet_debts;
DROP POLICY IF EXISTS "Users can delete outlet debts" ON outlet_debts;
DROP POLICY IF EXISTS "Users can view outlet debt items" ON outlet_debt_items;
DROP POLICY IF EXISTS "Users can insert outlet debt items" ON outlet_debt_items;
DROP POLICY IF EXISTS "Users can update outlet debt items" ON outlet_debt_items;
DROP POLICY IF EXISTS "Users can delete outlet debt items" ON outlet_debt_items;
DROP POLICY IF EXISTS "Users can view outlet debt payments" ON outlet_debt_payments;
DROP POLICY IF EXISTS "Users can insert outlet debt payments" ON outlet_debt_payments;
DROP POLICY IF EXISTS "Users can update outlet debt payments" ON outlet_debt_payments;
DROP POLICY IF EXISTS "Users can delete outlet debt payments" ON outlet_debt_payments;

-- Create RLS policies for outlet_debts
CREATE POLICY "Users can view outlet debts" ON outlet_debts
    FOR SELECT USING (true);

CREATE POLICY "Users can insert outlet debts" ON outlet_debts
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update outlet debts" ON outlet_debts
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete outlet debts" ON outlet_debts
    FOR DELETE USING (true);

-- Create RLS policies for outlet_debt_items
CREATE POLICY "Users can view outlet debt items" ON outlet_debt_items
    FOR SELECT USING (true);

CREATE POLICY "Users can insert outlet debt items" ON outlet_debt_items
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update outlet debt items" ON outlet_debt_items
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete outlet debt items" ON outlet_debt_items
    FOR DELETE USING (true);

-- Create RLS policies for outlet_debt_payments
CREATE POLICY "Users can view outlet debt payments" ON outlet_debt_payments
    FOR SELECT USING (true);

CREATE POLICY "Users can insert outlet debt payments" ON outlet_debt_payments
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update outlet debt payments" ON outlet_debt_payments
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete outlet debt payments" ON outlet_debt_payments
    FOR DELETE USING (true);

-- Enable RLS on all tables
ALTER TABLE outlet_debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlet_debt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlet_debt_payments ENABLE ROW LEVEL SECURITY;

-- Add comments
COMMENT ON TABLE outlet_debts IS 'Dedicated table for tracking outlet-specific debts and receivables';
COMMENT ON TABLE outlet_debt_items IS 'Line items for each debt record';
COMMENT ON TABLE outlet_debt_payments IS 'Payment history and tracking for debts';
COMMENT ON COLUMN outlet_debts.outlet_id IS 'The outlet this debt belongs to. Required.';
COMMENT ON COLUMN outlet_debts.customer_id IS 'References outlet_customers table for the debtor';
COMMENT ON COLUMN outlet_debts.due_date IS 'Expected payment due date for the debt';
COMMENT ON COLUMN outlet_debts.remaining_amount IS 'Calculated: total_amount - amount_paid';
