-- Migration: Populate inventory_products from existing delivery data
-- This script extracts inventory products from saved delivery notes

-- First, let's check if we have any deliveries to process
-- The inventory_products will be populated from saved_delivery_notes items

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
-- DROP FUNCTION IF EXISTS populate_inventory_from_deliveries();
