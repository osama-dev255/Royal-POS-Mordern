-- Migration to create saved_delivery_in_reports table
-- For recording financial reports of deliveries in with payment tracking
-- Date: 2026-09-02

CREATE TABLE IF NOT EXISTS saved_delivery_in_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  outlet_id UUID NOT NULL,
  report_number VARCHAR(100) NOT NULL,
  report_date DATE NOT NULL,
  -- Financial summary
  total_value NUMERIC(15,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(15,2) NOT NULL DEFAULT 0,
  balance_due NUMERIC(15,2) NOT NULL DEFAULT 0,
  -- Payment details
  payment_date DATE,
  payment_method VARCHAR(50),
  reference_number VARCHAR(150),
  -- Delivery data snapshot (JSONB)
  deliveries JSONB,
  -- Metadata
  prepared_by_name VARCHAR(255),
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sdir_outlet_id ON saved_delivery_in_reports(outlet_id);
CREATE INDEX IF NOT EXISTS idx_sdir_report_number ON saved_delivery_in_reports(report_number);
CREATE INDEX IF NOT EXISTS idx_sdir_report_date ON saved_delivery_in_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_sdir_created_at ON saved_delivery_in_reports(created_at);

-- Enable Row Level Security
ALTER TABLE saved_delivery_in_reports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Enable read access for all users" ON saved_delivery_in_reports;
DROP POLICY IF EXISTS "Enable insert access for all users" ON saved_delivery_in_reports;
DROP POLICY IF EXISTS "Enable update access for all users" ON saved_delivery_in_reports;
DROP POLICY IF EXISTS "Enable delete access for all users" ON saved_delivery_in_reports;

-- Create permissive policies for development
CREATE POLICY "Enable read access for all users" ON saved_delivery_in_reports FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON saved_delivery_in_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON saved_delivery_in_reports FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete access for all users" ON saved_delivery_in_reports FOR DELETE USING (true);
