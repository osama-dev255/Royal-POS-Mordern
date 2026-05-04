-- Migration: Remove status dependency from inventory_products trigger
-- Issue: The trigger function update_inventory_from_delivery() only updates inventory when status is 'delivered'
-- Solution: Remove the status check to make inventory updates status-independent

-- Drop and recreate the function without status check
CREATE OR REPLACE FUNCTION update_inventory_from_delivery()
RETURNS TRIGGER 
SECURITY DEFINER  -- This allows the function to bypass RLS policies
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
            COALESCE(item->>'category', 'General') as category,
            COALESCE((item->>'quantity')::INTEGER, (item->>'delivered')::INTEGER, 0) as qty,
            COALESCE((item->>'rate')::DECIMAL(12,2), (item->>'price')::DECIMAL(12,2), 0) as unit_cost,
            COALESCE((item->>'sellingPrice')::DECIMAL(12,2), (item->>'rate')::DECIMAL(12,2), (item->>'price')::DECIMAL(12,2), 0) as selling_price
        FROM jsonb_array_elements(NEW.items_list) as item
    LOOP
        product_name := item_record.name;
        product_sku := item_record.sku;
        product_category := item_record.category;
        item_quantity := item_record.qty;
        item_unit_cost := item_record.unit_cost;
        item_selling_price := item_record.selling_price;
        
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
                FLOOR(item_quantity * 0.2),
                FLOOR(item_quantity * 1.5),
                item_unit_cost,
                item_selling_price,
                delivery_note_num,
                NEW.date
            );
        ELSE
            -- Update existing product (add quantities)
            UPDATE inventory_products
            SET 
                quantity = quantity + item_quantity,
                unit_cost = item_unit_cost,
                selling_price = item_selling_price,
                delivery_note_number = delivery_note_num,
                last_updated = NEW.date
            WHERE id = existing_product.id;
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Verify the function has SECURITY DEFINER
COMMENT ON FUNCTION update_inventory_from_delivery() IS 
'Automatically updates inventory_products when a delivery note is saved. Adds quantities to existing products or creates new ones. Runs with SECURITY DEFINER to bypass RLS policies.';

-- Ensure the trigger is attached to the table
DROP TRIGGER IF EXISTS trigger_update_inventory_from_delivery ON saved_delivery_notes;
CREATE TRIGGER trigger_update_inventory_from_delivery
    AFTER INSERT OR UPDATE ON saved_delivery_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_from_delivery();