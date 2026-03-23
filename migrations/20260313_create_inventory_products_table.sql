-- Create inventory_products table for outlet-specific inventory management
CREATE TABLE IF NOT EXISTS inventory_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100),
  category VARCHAR(100) DEFAULT 'General',
  quantity INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER DEFAULT 0,
  max_stock INTEGER DEFAULT 0,
  unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  selling_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_value DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  status VARCHAR(20) NOT NULL DEFAULT 'in-stock' CHECK (status IN ('in-stock', 'low-stock', 'out-of-stock')),
  delivery_note_number VARCHAR(100),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique product per outlet by name or SKU
  UNIQUE(outlet_id, name),
  UNIQUE(outlet_id, sku)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_products_outlet_id ON inventory_products(outlet_id);
CREATE INDEX IF NOT EXISTS idx_inventory_products_category ON inventory_products(category);
CREATE INDEX IF NOT EXISTS idx_inventory_products_status ON inventory_products(status);
CREATE INDEX IF NOT EXISTS idx_inventory_products_sku ON inventory_products(sku);

-- Add comment to table
COMMENT ON TABLE inventory_products IS 'Stores inventory products for each registered outlet';
COMMENT ON COLUMN inventory_products.unit_cost IS 'The cost price per unit (purchase price)';
COMMENT ON COLUMN inventory_products.selling_price IS 'The selling price per unit (retail price)';
COMMENT ON COLUMN inventory_products.total_value IS 'Computed as quantity * unit_cost';
COMMENT ON COLUMN inventory_products.min_stock IS 'Minimum stock level before low stock alert';
COMMENT ON COLUMN inventory_products.max_stock IS 'Maximum stock capacity';

-- Create trigger to auto-update status based on quantity
CREATE OR REPLACE FUNCTION update_inventory_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quantity <= 0 THEN
    NEW.status := 'out-of-stock';
  ELSIF NEW.quantity <= NEW.min_stock THEN
    NEW.status := 'low-stock';
  ELSE
    NEW.status := 'in-stock';
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_inventory_status
  BEFORE INSERT OR UPDATE ON inventory_products
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_status();
