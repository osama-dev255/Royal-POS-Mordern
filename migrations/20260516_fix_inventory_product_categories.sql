-- Migration: Fix product categories in inventory_products
-- Date: 2026-05-16
-- Issue: Products created from delivery notes have category='General' instead of actual category
-- Solution: Update trigger to allow category specification and provide manual update capability

-- NOTE: Delivery notes don't store category information in their items JSON
-- Categories must be set manually or inferred from the products table

-- Option 1: If you have a products table with categories, you can sync from there
-- Uncomment and run this if your products table has category information:
/*
UPDATE inventory_products ip
SET category = p.category
FROM products p
WHERE ip.name = p.name
AND p.category IS NOT NULL
AND p.category != ''
AND (ip.category = 'General' OR ip.category IS NULL);
*/

-- Option 2: Manually update categories for common products
-- Update this list with your actual product categories:
/*
UPDATE inventory_products SET category = 'Beverages' WHERE name ILIKE '%water%' OR name ILIKE '%juice%' OR name ILIKE '%soda%';
UPDATE inventory_products SET category = 'Dairy' WHERE name ILIKE '%milk%' OR name ILIKE '%cheese%' OR name ILIKE '%yogurt%';
UPDATE inventory_products SET category = 'Snacks' WHERE name ILIKE '%chips%' OR name ILIKE '%biscuit%' OR name ILIKE '%cracker%';
UPDATE inventory_products SET category = 'Cleaning' WHERE name ILIKE '%soap%' OR name ILIKE '%detergent%' OR name ILIKE '%bleach%';
*/

-- Option 3: Create a mapping table for automatic category assignment
-- Run this to create a category mapping system:
CREATE TABLE IF NOT EXISTS product_category_mapping (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_name_pattern VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_name_pattern)
);

-- Add some example mappings (customize these for your business):
INSERT INTO product_category_mapping (product_name_pattern, category) VALUES
    ('%water%', 'Beverages'),
    ('%milk%', 'Dairy'),
    ('%bread%', 'Bakery'),
    ('%soap%', 'Cleaning'),
    ('%rice%', 'Grains')
ON CONFLICT DO NOTHING;

-- Update inventory products using the mapping table:
UPDATE inventory_products ip
SET category = pcm.category
FROM product_category_mapping pcm
WHERE ip.name ILIKE pcm.product_name_pattern
AND (ip.category = 'General' OR ip.category IS NULL);

-- Step 2: Create an improved trigger function
CREATE OR REPLACE FUNCTION update_inventory_from_delivery()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    item_record RECORD;
    outlet_uuid UUID;
    product_name VARCHAR(255);
    product_sku VARCHAR(100);
    product_category VARCHAR(100);
    item_quantity INTEGER;
    item_unit_cost DECIMAL(12,2);
    item_selling_price DECIMAL(12,2);
    existing_product RECORD;
    delivery_note_num VARCHAR(100);
    mapped_category VARCHAR(100);
BEGIN
    -- Only process if outlet_id is provided
    IF NEW.outlet_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    outlet_uuid := NEW.outlet_id::UUID;
    delivery_note_num := NEW.delivery_note_number;
    
    -- Loop through items in the delivery (items_list is JSONB)
    FOR item_record IN 
        SELECT 
            COALESCE(item->>'description', item->>'name', 'Unknown Product') as name,
            COALESCE(item->>'sku', 'SKU-' || LEFT(MD5(COALESCE(item->>'description', item->>'name', 'unknown')), 6)) as sku,
            COALESCE((item->>'quantity')::INTEGER, (item->>'delivered')::INTEGER, 0) as qty,
            COALESCE((item->>'rate')::DECIMAL(12,2), (item->>'price')::DECIMAL(12,2), 0) as unit_cost,
            COALESCE((item->>'sellingPrice')::DECIMAL(12,2), (item->>'rate')::DECIMAL(12,2), (item->>'price')::DECIMAL(12,2), 0) as selling_price
        FROM jsonb_array_elements(NEW.items_list) as item
    LOOP
        product_name := item_record.name;
        product_sku := item_record.sku;
        item_quantity := item_record.qty;
        item_unit_cost := item_record.unit_cost;
        item_selling_price := item_record.selling_price;
        
        -- Try to fetch category from mapping table
        SELECT pcm.category INTO mapped_category
        FROM product_category_mapping pcm
        WHERE product_name ILIKE pcm.product_name_pattern
        LIMIT 1;
        
        -- Use mapped category if found, otherwise default to 'General'
        product_category := COALESCE(mapped_category, 'General');
        
        -- Check if product already exists for this outlet
        SELECT * INTO existing_product
        FROM inventory_products
        WHERE outlet_id = outlet_uuid AND name = product_name;
        
        IF existing_product IS NULL THEN
            -- Insert new product with category from mapping
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
                FLOOR(item_quantity * 0.2),
                FLOOR(item_quantity * 1.5),
                item_unit_cost,
                item_selling_price,
                delivery_note_num,
                NEW.date
            );
        ELSE
            -- Update existing product (add quantities but preserve existing category unless it's General)
            UPDATE inventory_products
            SET 
                quantity = quantity + item_quantity,
                unit_cost = item_unit_cost,
                selling_price = item_selling_price,
                delivery_note_number = delivery_note_num,
                last_updated = NEW.date,
                category = CASE 
                    WHEN category = 'General' AND product_category != 'General' THEN product_category
                    ELSE category
                END
            WHERE id = existing_product.id;
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Show summary of current categories
SELECT 
    category,
    COUNT(*) as product_count,
    STRING_AGG(DISTINCT name, ', ' ORDER BY name LIMIT 10) as sample_products
FROM inventory_products
GROUP BY category
ORDER BY product_count DESC;
