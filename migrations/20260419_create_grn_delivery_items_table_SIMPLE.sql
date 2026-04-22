-- Simplified Migration: Create GRN Delivery Items Table
-- Execute this in Supabase SQL Editor: https://app.supabase.com/project/YOUR_PROJECT/sql

-- Create GRN delivery items table
CREATE TABLE IF NOT EXISTS grn_delivery_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_id UUID NOT NULL,
  outlet_id UUID REFERENCES outlets(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  product_name TEXT,
  quantity NUMERIC(10, 2) NOT NULL DEFAULT 0,
  delivered NUMERIC(10, 2) DEFAULT 0,
  unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  unit_gain NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_gain NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT quantity_positive CHECK (quantity >= 0),
  CONSTRAINT unit_cost_positive CHECK (unit_cost >= 0),
  CONSTRAINT total_cost_positive CHECK (total_cost >= 0),
  CONSTRAINT unit_price_positive CHECK (unit_price >= 0),
  CONSTRAINT total_price_positive CHECK (total_price >= 0)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_grn_delivery_items_delivery_id ON grn_delivery_items(delivery_id);
CREATE INDEX IF NOT EXISTS idx_grn_delivery_items_outlet_id ON grn_delivery_items(outlet_id);
CREATE INDEX IF NOT EXISTS idx_grn_delivery_items_product_name ON grn_delivery_items(product_name);

-- Enable RLS
ALTER TABLE grn_delivery_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow authenticated users to view GRN delivery items" ON grn_delivery_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert GRN delivery items" ON grn_delivery_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update GRN delivery items" ON grn_delivery_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users to delete GRN delivery items" ON grn_delivery_items FOR DELETE TO authenticated USING (true);

-- Auto-calculate function
CREATE OR REPLACE FUNCTION calculate_grn_item_totals()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_cost := NEW.quantity * NEW.unit_cost;
  NEW.total_price := NEW.quantity * NEW.unit_price;
  NEW.unit_gain := NEW.unit_price - NEW.unit_cost;
  NEW.total_gain := NEW.quantity * NEW.unit_gain;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
CREATE TRIGGER trg_calculate_grn_item_totals
  BEFORE INSERT OR UPDATE ON grn_delivery_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_grn_item_totals();
