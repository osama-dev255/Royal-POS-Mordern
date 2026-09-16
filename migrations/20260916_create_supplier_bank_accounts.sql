-- Create supplier_bank_accounts table for multiple bank accounts per supplier
CREATE TABLE IF NOT EXISTS supplier_bank_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  bank_name VARCHAR(255) NOT NULL,
  account_number VARCHAR(100) NOT NULL,
  account_name VARCHAR(255),
  branch VARCHAR(255),
  swift_code VARCHAR(50),
  iban VARCHAR(100),
  account_type VARCHAR(50) DEFAULT 'checking',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups by supplier
CREATE INDEX IF NOT EXISTS idx_supplier_bank_accounts_supplier_id ON supplier_bank_accounts(supplier_id);

-- RLS policies
ALTER TABLE supplier_bank_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON supplier_bank_accounts;
DROP POLICY IF EXISTS "Enable insert access for all users" ON supplier_bank_accounts;
DROP POLICY IF EXISTS "Enable update access for all users" ON supplier_bank_accounts;
DROP POLICY IF EXISTS "Enable delete access for all users" ON supplier_bank_accounts;

CREATE POLICY "Enable read access for all users" ON supplier_bank_accounts FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON supplier_bank_accounts FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON supplier_bank_accounts FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON supplier_bank_accounts FOR DELETE USING (true);
