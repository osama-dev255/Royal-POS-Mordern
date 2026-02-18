-- Migration to create proper saved_grns table schema
-- Run this in Supabase SQL editor

-- Create the saved_grns table if it doesn't exist
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
  status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('draft', 'pending', 'received', 'checked', 'approved', 'completed', 'cancelled')),
  total_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_saved_grns_user_id ON saved_grns(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_grns_grn_number ON saved_grns(grn_number);
CREATE INDEX IF NOT EXISTS idx_saved_grns_supplier_name ON saved_grns(supplier_name);
CREATE INDEX IF NOT EXISTS idx_saved_grns_status ON saved_grns(status);
CREATE INDEX IF NOT EXISTS idx_saved_grns_created_at ON saved_grns(created_at);
CREATE INDEX IF NOT EXISTS idx_saved_grns_po_number ON saved_grns(po_number);

-- Enable Row Level Security
ALTER TABLE saved_grns ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies first
DROP POLICY IF EXISTS "Users can view their own saved GRNs" ON saved_grns;
DROP POLICY IF EXISTS "Users can insert their own saved GRNs" ON saved_grns;
DROP POLICY IF EXISTS "Users can update their own saved GRNs" ON saved_grns;
DROP POLICY IF EXISTS "Users can delete their own saved GRNs" ON saved_grns;
DROP POLICY IF EXISTS "Enable read access for all users" ON saved_grns;
DROP POLICY IF EXISTS "Enable insert access for all users" ON saved_grns;
DROP POLICY IF EXISTS "Enable update access for all users" ON saved_grns;
DROP POLICY IF EXISTS "Enable delete access for all users" ON saved_grns;

-- Create new permissive policies for development
CREATE POLICY "Enable read access for all users" ON saved_grns FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON saved_grns FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON saved_grns FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON saved_grns FOR DELETE USING (true);

-- Add sample data for testing
INSERT INTO saved_grns (
  grn_number, 
  supplier_name, 
  po_number, 
  items, 
  status, 
  total_amount,
  received_date,
  prepared_by
) VALUES 
  ('GRN-001', 'Tech Supplies Inc.', 'PO-1001', 
   '[{"id": "1", "description": "Laptop Computers", "quantity": 10, "delivered": 10, "unitCost": 800, "total": 8000, "unit": "pcs"}]', 
   'completed', 8000, '2026-02-15', 'John Manager'),
  ('GRN-002', 'Office Furniture Co.', 'PO-1002', 
   '[{"id": "2", "description": "Office Chairs", "quantity": 25, "delivered": 25, "unitCost": 150, "total": 3750, "unit": "pcs"}]', 
   'approved', 3750, '2026-02-16', 'Sarah Admin'),
  ('GRN-003', 'Electronics Distributors', 'PO-1003', 
   '[{"id": "3", "description": "Smartphones", "quantity": 50, "delivered": 45, "unitCost": 300, "total": 13500, "unit": "pcs", "damaged": 5}]', 
   'checked', 13500, '2026-02-17', 'Mike Supervisor'),
  ('GRN-004', 'Food Suppliers Ltd.', 'PO-1004', 
   '[{"id": "4", "description": "Coffee Beans", "quantity": 100, "delivered": 100, "unitCost": 12, "total": 1200, "unit": "kg", "expiryDate": "2026-08-15"}]', 
   'pending', 1200, '2026-02-18', 'Lisa Coordinator')
ON CONFLICT DO NOTHING;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';