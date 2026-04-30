-- Create outlet_payments table
CREATE TABLE IF NOT EXISTS outlet_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  transaction_id VARCHAR(50) UNIQUE NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  warehouse VARCHAR(255),
  amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  payment_method VARCHAR(50) NOT NULL DEFAULT 'cash',
  status VARCHAR(50) NOT NULL DEFAULT 'completed',
  description TEXT,
  payment_type VARCHAR(50) NOT NULL DEFAULT 'outlet', -- 'outlet', 'kilango', 'other'
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_outlet_payments_outlet_id ON outlet_payments(outlet_id);
CREATE INDEX IF NOT EXISTS idx_outlet_payments_type ON outlet_payments(payment_type);
CREATE INDEX IF NOT EXISTS idx_outlet_payments_status ON outlet_payments(status);
CREATE INDEX IF NOT EXISTS idx_outlet_payments_date ON outlet_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_outlet_payments_transaction_id ON outlet_payments(transaction_id);

-- Enable Row Level Security
ALTER TABLE outlet_payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow authenticated users to view all payments
CREATE POLICY "Users can view all outlet payments"
  ON outlet_payments FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert payments
CREATE POLICY "Users can insert outlet payments"
  ON outlet_payments FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update payments
CREATE POLICY "Users can update outlet payments"
  ON outlet_payments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete payments
CREATE POLICY "Users can delete outlet payments"
  ON outlet_payments FOR DELETE
  TO authenticated
  USING (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_outlet_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_outlet_payments_updated_at
  BEFORE UPDATE ON outlet_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_outlet_payments_updated_at();

-- Add comment for documentation
COMMENT ON TABLE outlet_payments IS 'Stores payment records for outlets including outlet payments, kilango investment payments, and other payments';
COMMENT ON COLUMN outlet_payments.payment_type IS 'Payment category: outlet (from other outlets), kilango (from main warehouse/investment), other (miscellaneous)';
COMMENT ON COLUMN outlet_payments.warehouse IS 'Name of the warehouse/outlet making the payment (e.g., Kilango Investment LTD)';
