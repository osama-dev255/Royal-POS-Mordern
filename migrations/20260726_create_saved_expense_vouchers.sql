-- Migration to create saved_expense_vouchers table
-- For recording expense vouchers with vendor info, purpose, and line items
-- Date: 2026-07-26

CREATE TABLE IF NOT EXISTS saved_expense_vouchers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  voucher_number VARCHAR(100) NOT NULL,
  date DATE NOT NULL,
  -- Vendor / Source fields
  vendor_name VARCHAR(255),
  vendor_contact VARCHAR(100),
  vendor_address TEXT,
  vendor_tin VARCHAR(100),
  vendor_email VARCHAR(255),
  -- Purpose
  purpose TEXT,
  -- Items (stored as JSONB)
  items JSONB,
  total_amount NUMERIC(15,2) DEFAULT 0,
  notes TEXT,
  -- Signatures
  prepared_by_name VARCHAR(255),
  prepared_by_signature TEXT,
  submitted_by_name VARCHAR(255),
  submitted_by_signature TEXT,
  approved_by_name VARCHAR(255),
  approved_by_signature TEXT,
  signature_date DATE,
  approved_date DATE,
  -- Metadata
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'cancelled')),
  outlet_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sev_user_id ON saved_expense_vouchers(user_id);
CREATE INDEX IF NOT EXISTS idx_sev_voucher_number ON saved_expense_vouchers(voucher_number);
CREATE INDEX IF NOT EXISTS idx_sev_vendor_name ON saved_expense_vouchers(vendor_name);
CREATE INDEX IF NOT EXISTS idx_sev_status ON saved_expense_vouchers(status);
CREATE INDEX IF NOT EXISTS idx_sev_created_at ON saved_expense_vouchers(created_at);

-- Enable Row Level Security
ALTER TABLE saved_expense_vouchers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Enable read access for all users" ON saved_expense_vouchers;
DROP POLICY IF EXISTS "Enable insert access for all users" ON saved_expense_vouchers;
DROP POLICY IF EXISTS "Enable update access for all users" ON saved_expense_vouchers;
DROP POLICY IF EXISTS "Enable delete access for all users" ON saved_expense_vouchers;

-- Create permissive policies for development
CREATE POLICY "Enable read access for all users" ON saved_expense_vouchers FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON saved_expense_vouchers FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON saved_expense_vouchers FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete access for all users" ON saved_expense_vouchers FOR DELETE USING (true);
