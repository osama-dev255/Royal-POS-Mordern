const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const migrationSQL = `
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
  payment_type VARCHAR(50) NOT NULL DEFAULT 'outlet',
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
DROP POLICY IF EXISTS "Users can view all outlet payments" ON outlet_payments;
CREATE POLICY "Users can view all outlet payments"
  ON outlet_payments FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert outlet payments" ON outlet_payments;
CREATE POLICY "Users can insert outlet payments"
  ON outlet_payments FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update outlet payments" ON outlet_payments;
CREATE POLICY "Users can update outlet payments"
  ON outlet_payments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete outlet payments" ON outlet_payments;
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

DROP TRIGGER IF EXISTS update_outlet_payments_updated_at ON outlet_payments;
CREATE TRIGGER update_outlet_payments_updated_at
  BEFORE UPDATE ON outlet_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_outlet_payments_updated_at();

-- Add comment for documentation
COMMENT ON TABLE outlet_payments IS 'Stores payment records for outlets including outlet payments, kilango investment payments, and other payments';
COMMENT ON COLUMN outlet_payments.payment_type IS 'Payment category: outlet (from other outlets), kilango (from main warehouse/investment), other (miscellaneous)';
COMMENT ON COLUMN outlet_payments.warehouse IS 'Name of the warehouse/outlet making the payment (e.g., Kilango Investment LTD)';
`;

async function runMigration() {
  console.log('🚀 Running outlet_payments table migration...\n');

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      console.error('❌ Migration failed:', error.message);
      console.log('\n💡 Alternative: Run the SQL manually in Supabase Dashboard > SQL Editor');
      console.log('📄 SQL file location: migrations/20260426_create_outlet_payments_table.sql\n');
      process.exit(1);
    }

    console.log('✅ Migration completed successfully!');
    console.log('✅ outlet_payments table created\n');
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.log('\n💡 Please run the migration manually:');
    console.log('1. Go to Supabase Dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy contents from: migrations/20260426_create_outlet_payments_table.sql');
    console.log('4. Click "Run"\n');
  }
}

runMigration();
