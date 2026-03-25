-- Migration: Add sold_quantity column to inventory_products table
-- This enables database-tracked sold quantities instead of localStorage

-- Add sold_quantity column with default 0
ALTER TABLE inventory_products 
ADD COLUMN IF NOT EXISTS sold_quantity INTEGER DEFAULT 0;

-- Add available_quantity as a generated column (quantity - sold_quantity)
-- This ensures the available quantity is always calculated correctly
ALTER TABLE inventory_products 
ADD COLUMN IF NOT EXISTS available_quantity INTEGER GENERATED ALWAYS AS (quantity - sold_quantity) STORED;

-- Create index for faster lookups by outlet
CREATE INDEX IF NOT EXISTS idx_inventory_products_sold_qty 
ON inventory_products(outlet_id, sold_quantity);

-- Create function to update sold quantity when a sale is made
CREATE OR REPLACE FUNCTION increment_sold_quantity(
  p_outlet_id UUID,
  p_product_name TEXT,
  p_quantity INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE inventory_products
  SET 
    sold_quantity = sold_quantity + p_quantity,
    updated_at = NOW()
  WHERE outlet_id = p_outlet_id 
    AND name = p_product_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get available inventory for an outlet
CREATE OR REPLACE FUNCTION get_available_inventory(p_outlet_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  sku TEXT,
  category TEXT,
  quantity INTEGER,
  sold_quantity INTEGER,
  available_quantity INTEGER,
  min_stock INTEGER,
  max_stock INTEGER,
  unit_cost NUMERIC,
  selling_price NUMERIC,
  total_cost NUMERIC,
  total_price NUMERIC,
  status TEXT,
  delivery_note_number TEXT,
  last_updated TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ip.id,
    ip.name,
    ip.sku,
    ip.category,
    ip.quantity,
    ip.sold_quantity,
    ip.available_quantity,
    ip.min_stock,
    ip.max_stock,
    ip.unit_cost,
    ip.selling_price,
    ip.total_cost,
    ip.total_price,
    CASE 
      WHEN ip.available_quantity = 0 THEN 'out-of-stock'
      WHEN ip.available_quantity <= ip.min_stock THEN 'low-stock'
      ELSE 'in-stock'
    END::TEXT as status,
    ip.delivery_note_number,
    ip.last_updated
  FROM inventory_products ip
  WHERE ip.outlet_id = p_outlet_id
  ORDER BY ip.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the totals function to use available_quantity
CREATE OR REPLACE FUNCTION get_inventory_totals(p_outlet_id UUID)
RETURNS TABLE (
  total_inventory_value NUMERIC,
  total_retail_value NUMERIC,
  total_products BIGINT,
  total_quantity BIGINT,
  total_sold BIGINT,
  total_available BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(ip.available_quantity * ip.unit_cost), 0) as total_inventory_value,
    COALESCE(SUM(ip.available_quantity * ip.selling_price), 0) as total_retail_value,
    COUNT(*)::BIGINT as total_products,
    COALESCE(SUM(ip.quantity), 0)::BIGINT as total_quantity,
    COALESCE(SUM(ip.sold_quantity), 0)::BIGINT as total_sold,
    COALESCE(SUM(ip.available_quantity), 0)::BIGINT as total_available
  FROM inventory_products ip
  WHERE ip.outlet_id = p_outlet_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment explaining the columns
COMMENT ON COLUMN inventory_products.sold_quantity IS 'Total quantity sold for this product at this outlet';
COMMENT ON COLUMN inventory_products.available_quantity IS 'Available quantity (quantity - sold_quantity), auto-calculated';
