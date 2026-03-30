-- Create outlet_debts table for outlet-specific debts
-- This provides complete isolation between outlet debts and general system debts

CREATE TABLE IF NOT EXISTS outlet_debts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES outlet_customers(id) ON DELETE CASCADE,
  amount DECIMAL(15,2) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'outstanding' CHECK (status IN ('outstanding', 'paid', 'partial')),
  due_date DATE,
  paid_amount DECIMAL(15,2) DEFAULT 0,
  paid_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_outlet_debts_outlet_id ON outlet_debts(outlet_id);
CREATE INDEX IF NOT EXISTS idx_outlet_debts_customer_id ON outlet_debts(customer_id);
CREATE INDEX IF NOT EXISTS idx_outlet_debts_status ON outlet_debts(status);
CREATE INDEX IF NOT EXISTS idx_outlet_debts_due_date ON outlet_debts(due_date);

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view outlet debts" ON outlet_debts;
DROP POLICY IF EXISTS "Users can insert outlet debts" ON outlet_debts;
DROP POLICY IF EXISTS "Users can update outlet debts" ON outlet_debts;
DROP POLICY IF EXISTS "Users can delete outlet debts" ON outlet_debts;

-- Create RLS policies for outlet_debts
CREATE POLICY "Users can view outlet debts" ON outlet_debts
    FOR SELECT USING (true);

CREATE POLICY "Users can insert outlet debts" ON outlet_debts
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update outlet debts" ON outlet_debts
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete outlet debts" ON outlet_debts
    FOR DELETE USING (true);

-- Enable RLS
ALTER TABLE outlet_debts ENABLE ROW LEVEL SECURITY;

-- Add comments
COMMENT ON TABLE outlet_debts IS 'Stores debts specific to each outlet. References outlet_customers, not general customers.';
COMMENT ON COLUMN outlet_debts.outlet_id IS 'The outlet this debt belongs to. Required.';
COMMENT ON COLUMN outlet_debts.customer_id IS 'References outlet_customers table.';
