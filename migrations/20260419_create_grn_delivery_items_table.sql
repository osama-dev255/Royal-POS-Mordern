-- Migration: Create GRN Delivery Items Table
-- Date: 2026-04-19
-- Description: Creates a table to store detailed product/items information for Outlet GRN deliveries

-- Create GRN delivery items table
CREATE TABLE IF NOT EXISTS grn_delivery_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_id UUID NOT NULL,
  outlet_id UUID REFERENCES outlets(id) ON DELETE CASCADE,
  
  -- Product Information
  description TEXT NOT NULL,
  product_name TEXT,
  
  -- Quantity
  quantity NUMERIC(10, 2) NOT NULL DEFAULT 0,
  delivered NUMERIC(10, 2) DEFAULT 0,
  
  -- Cost Information
  unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
  
  -- Price Information
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  
  -- Gain Information
  unit_gain NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_gain NUMERIC(12, 2) NOT NULL DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT quantity_positive CHECK (quantity >= 0),
  CONSTRAINT unit_cost_positive CHECK (unit_cost >= 0),
  CONSTRAINT total_cost_positive CHECK (total_cost >= 0),
  CONSTRAINT unit_price_positive CHECK (unit_price >= 0),
  CONSTRAINT total_price_positive CHECK (total_price >= 0)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_grn_delivery_items_delivery_id ON grn_delivery_items(delivery_id);
CREATE INDEX IF NOT EXISTS idx_grn_delivery_items_outlet_id ON grn_delivery_items(outlet_id);
CREATE INDEX IF NOT EXISTS idx_grn_delivery_items_product_name ON grn_delivery_items(product_name);

-- Add comments for documentation
COMMENT ON TABLE grn_delivery_items IS 'Stores detailed product/items information for GRN deliveries';
COMMENT ON COLUMN grn_delivery_items.delivery_id IS 'Reference to the parent delivery';
COMMENT ON COLUMN grn_delivery_items.outlet_id IS 'Reference to the outlet';
COMMENT ON COLUMN grn_delivery_items.description IS 'Product description/name';
COMMENT ON COLUMN grn_delivery_items.quantity IS 'Ordered quantity';
COMMENT ON COLUMN grn_delivery_items.delivered IS 'Actually delivered quantity';
COMMENT ON COLUMN grn_delivery_items.unit_cost IS 'Cost per unit (purchase price)';
COMMENT ON COLUMN grn_delivery_items.total_cost IS 'Total cost (quantity × unit_cost)';
COMMENT ON COLUMN grn_delivery_items.unit_price IS 'Selling price per unit';
COMMENT ON COLUMN grn_delivery_items.total_price IS 'Total selling price (quantity × unit_price)';
COMMENT ON COLUMN grn_delivery_items.unit_gain IS 'Profit per unit (unit_price - unit_cost)';
COMMENT ON COLUMN grn_delivery_items.total_gain IS 'Total profit (quantity × unit_gain)';

-- Enable Row Level Security
ALTER TABLE grn_delivery_items ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
-- Allow authenticated users to view all GRN delivery items
CREATE POLICY "Allow authenticated users to view GRN delivery items"
  ON grn_delivery_items
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert GRN delivery items
CREATE POLICY "Allow authenticated users to insert GRN delivery items"
  ON grn_delivery_items
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update GRN delivery items
CREATE POLICY "Allow authenticated users to update GRN delivery items"
  ON grn_delivery_items
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete GRN delivery items
CREATE POLICY "Allow authenticated users to delete GRN delivery items"
  ON grn_delivery_items
  FOR DELETE
  TO authenticated
  USING (true);

-- Create function to automatically calculate totals
CREATE OR REPLACE FUNCTION calculate_grn_item_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate total_cost
  NEW.total_cost := NEW.quantity * NEW.unit_cost;
  
  -- Calculate total_price
  NEW.total_price := NEW.quantity * NEW.unit_price;
  
  -- Calculate unit_gain
  NEW.unit_gain := NEW.unit_price - NEW.unit_cost;
  
  -- Calculate total_gain
  NEW.total_gain := NEW.quantity * NEW.unit_gain;
  
  -- Update timestamp
  NEW.updated_at := NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-calculate totals before insert or update
CREATE TRIGGER trg_calculate_grn_item_totals
  BEFORE INSERT OR UPDATE ON grn_delivery_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_grn_item_totals();
