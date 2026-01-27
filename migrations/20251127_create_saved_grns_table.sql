-- Migration to create the saved_grns table for storing Goods Received Notes
-- This script should be run in the Supabase SQL editor

-- Create the saved_grns table
CREATE TABLE IF NOT EXISTS saved_grns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  grn_number VARCHAR(100) NOT NULL,
  supplier_name VARCHAR(255) NOT NULL,
  supplier_id VARCHAR(100),
  supplier_phone VARCHAR(20),
  supplier_email VARCHAR(255),
  supplier_address TEXT,
  business_name VARCHAR(255),
  business_address TEXT,
  business_phone VARCHAR(20),
  business_email VARCHAR(255),
  business_stock_type VARCHAR(20),
  is_vatable BOOLEAN DEFAULT false,
  supplier_tin_number VARCHAR(100),
  po_number VARCHAR(100),
  delivery_note_number VARCHAR(100),
  vehicle_number VARCHAR(100),
  driver_name VARCHAR(255),
  received_by VARCHAR(255),
  received_location VARCHAR(255),
  items JSONB,
  receiving_costs JSONB,
  quality_check_notes TEXT,
  discrepancies TEXT,
  prepared_by VARCHAR(255),
  prepared_date DATE,
  checked_by VARCHAR(255),
  checked_date DATE,
  approved_by VARCHAR(255),
  approved_date DATE,
  received_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('received', 'checked', 'approved', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_saved_grns_user_id ON saved_grns(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_grns_grn_number ON saved_grns(grn_number);
CREATE INDEX IF NOT EXISTS idx_saved_grns_supplier_name ON saved_grns(supplier_name);
CREATE INDEX IF NOT EXISTS idx_saved_grns_date ON saved_grns(created_at);
CREATE INDEX IF NOT EXISTS idx_saved_grns_status ON saved_grns(status);

-- Enable Row Level Security (RLS) for the saved_grns table
ALTER TABLE saved_grns ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for saved_grns
CREATE POLICY "Users can view their own saved GRNs" ON saved_grns
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own saved GRNs" ON saved_grns
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own saved GRNs" ON saved_grns
FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR (user_id IS NULL AND auth.role() = 'authenticated'));

CREATE POLICY "Users can delete their own saved GRNs" ON saved_grns
FOR DELETE TO authenticated
USING (auth.uid() = user_id OR (user_id IS NULL AND auth.role() = 'authenticated'));

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';
