-- Migration to create supplier_purchase_notes table
-- For recording purchases on behalf of suppliers without documents
-- Does NOT affect inventory

CREATE TABLE IF NOT EXISTS supplier_purchase_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  purchase_note_number VARCHAR(100) NOT NULL,
  date DATE NOT NULL,
  supplier_name VARCHAR(255),
  supplier_phone VARCHAR(50),
  supplier_email VARCHAR(255),
  supplier_address TEXT,
  business_name VARCHAR(255),
  business_address TEXT,
  business_phone VARCHAR(50),
  business_email VARCHAR(255),
  items JSONB,
  subtotal NUMERIC(15,2) DEFAULT 0,
  tax NUMERIC(15,2) DEFAULT 0,
  discount NUMERIC(15,2) DEFAULT 0,
  total NUMERIC(15,2) DEFAULT 0,
  notes TEXT,
  prepared_by VARCHAR(255),
  prepared_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'cancelled')),
  outlet_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_spn_user_id ON supplier_purchase_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_spn_purchase_note_number ON supplier_purchase_notes(purchase_note_number);
CREATE INDEX IF NOT EXISTS idx_spn_supplier_name ON supplier_purchase_notes(supplier_name);
CREATE INDEX IF NOT EXISTS idx_spn_status ON supplier_purchase_notes(status);
CREATE INDEX IF NOT EXISTS idx_spn_created_at ON supplier_purchase_notes(created_at);

-- Enable Row Level Security
ALTER TABLE supplier_purchase_notes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON supplier_purchase_notes;
DROP POLICY IF EXISTS "Enable insert access for all users" ON supplier_purchase_notes;
DROP POLICY IF EXISTS "Enable update access for all users" ON supplier_purchase_notes;
DROP POLICY IF EXISTS "Enable delete access for all users" ON supplier_purchase_notes;

-- Create permissive policies for development
CREATE POLICY "Enable read access for all users" ON supplier_purchase_notes FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON supplier_purchase_notes FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON supplier_purchase_notes FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON supplier_purchase_notes FOR DELETE USING (true);

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';
