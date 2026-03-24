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
  total_cost DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  total_price DECIMAL(15,2) GENERATED ALWAYS AS (quantity * selling_price) STORED,
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
COMMENT ON COLUMN inventory_products.total_cost IS 'Computed as quantity * unit_cost (inventory value)';
COMMENT ON COLUMN inventory_products.total_price IS 'Computed as quantity * selling_price (retail value)';
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

-- ============================================
-- POPULATE INVENTORY FROM DELIVERIES
-- ============================================

-- Create a function to populate inventory_products from deliveries
CREATE OR REPLACE FUNCTION populate_inventory_from_deliveries()
RETURNS void AS $$
DECLARE
    delivery_record RECORD;
    item_record RECORD;
    outlet_uuid UUID;
    product_name VARCHAR(255);
    product_sku VARCHAR(100);
    product_category VARCHAR(100);
    item_quantity INTEGER;
    item_unit_cost DECIMAL(12,2);
    delivery_note_num VARCHAR(100);
    existing_product RECORD;
BEGIN
    -- Loop through all delivery notes
    FOR delivery_record IN 
        SELECT id, outlet_id, delivery_note_number, date, items_list
        FROM saved_delivery_notes
        WHERE outlet_id IS NOT NULL
    LOOP
        outlet_uuid := delivery_record.outlet_id::UUID;
        delivery_note_num := delivery_record.delivery_note_number;
        
        -- Loop through items in the delivery (items_list is JSONB)
        FOR item_record IN 
            SELECT 
                COALESCE(item->>'description', item->>'name', 'Unknown Product') as name,
                COALESCE(item->>'sku', 'SKU-' || LEFT(MD5(COALESCE(item->>'description', item->>'name', 'unknown')), 6)) as sku,
                COALESCE(item->>'category', 'General') as category,
                COALESCE((item->>'quantity')::INTEGER, (item->>'delivered')::INTEGER, 0) as qty,
                COALESCE((item->>'rate')::DECIMAL(12,2), (item->>'price')::DECIMAL(12,2), 0) as unit_cost,
                COALESCE((item->>'sellingPrice')::DECIMAL(12,2), (item->>'rate')::DECIMAL(12,2), (item->>'price')::DECIMAL(12,2), 0) as selling_price
            FROM jsonb_array_elements(delivery_record.items_list) as item
        LOOP
            product_name := item_record.name;
            product_sku := item_record.sku;
            product_category := item_record.category;
            item_quantity := item_record.qty;
            item_unit_cost := item_record.unit_cost;
            
            -- Check if product already exists for this outlet
            SELECT * INTO existing_product
            FROM inventory_products
            WHERE outlet_id = outlet_uuid AND name = product_name;
            
            IF existing_product IS NULL THEN
                -- Insert new product
                INSERT INTO inventory_products (
                    outlet_id,
                    name,
                    sku,
                    category,
                    quantity,
                    min_stock,
                    max_stock,
                    unit_cost,
                    selling_price,
                    delivery_note_number,
                    last_updated
                ) VALUES (
                    outlet_uuid,
                    product_name,
                    product_sku,
                    product_category,
                    item_quantity,
                    FLOOR(item_quantity * 0.2), -- 20% min stock
                    FLOOR(item_quantity * 1.5), -- 150% max stock
                    item_unit_cost,
                    item_record.selling_price,
                    delivery_note_num,
                    delivery_record.date
                );
            ELSE
                -- Update existing product (aggregate quantities)
                UPDATE inventory_products
                SET 
                    quantity = quantity + item_quantity,
                    unit_cost = item_unit_cost,
                    delivery_note_number = delivery_note_num,
                    last_updated = delivery_record.date
                WHERE id = existing_product.id;
            END IF;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the function to populate inventory
SELECT populate_inventory_from_deliveries();

-- Clean up the function (optional - remove if you want to keep it for future use)
DROP FUNCTION IF EXISTS populate_inventory_from_deliveries();
