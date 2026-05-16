-- Create audit trail to track ALL inventory_updates
-- This will log every time inventory_products.quantity is updated

-- 1. Create audit table
CREATE TABLE IF NOT EXISTS inventory_update_audit (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL,
    product_name VARCHAR(255),
    outlet_id UUID,
    old_quantity INTEGER,
    new_quantity INTEGER,
    quantity_change INTEGER,
    updated_by_trigger BOOLEAN DEFAULT FALSE,
    trigger_name VARCHAR(255),
    delivery_note_number VARCHAR(100),
    update_source TEXT, -- 'database_trigger' or 'javascript_code'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    context_data JSONB -- Additional context about the update
);

-- 2. Create trigger function to audit inventory updates
CREATE OR REPLACE FUNCTION audit_inventory_updates()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if quantity changed
    IF OLD.quantity IS DISTINCT FROM NEW.quantity THEN
        INSERT INTO inventory_update_audit (
            product_id,
            product_name,
            outlet_id,
            old_quantity,
            new_quantity,
            quantity_change,
            created_at
        ) VALUES (
            NEW.id,
            NEW.name,
            NEW.outlet_id,
            OLD.quantity,
            NEW.quantity,
            NEW.quantity - OLD.quantity,
            NOW()
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create trigger on inventory_products table
DROP TRIGGER IF EXISTS trg_audit_inventory_updates ON inventory_products;
CREATE TRIGGER trg_audit_inventory_updates
    AFTER UPDATE ON inventory_products
    FOR EACH ROW
    EXECUTE FUNCTION audit_inventory_updates();

-- 4. Modify the delivery trigger to log when it fires
CREATE OR REPLACE FUNCTION update_inventory_from_delivery()
RETURNS TRIGGER AS $$
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
    
    -- Only update inventory when status is 'delivered'
    IF NEW.status IS NULL OR NEW.status != 'delivered' THEN
        -- Log that trigger fired but didn't update (status not 'delivered')
        INSERT INTO inventory_update_audit (
            product_name,
            outlet_id,
            old_quantity,
            new_quantity,
            quantity_change,
            updated_by_trigger,
            trigger_name,
            delivery_note_number,
            update_source,
            context_data
        ) VALUES (
            'TRIGGER_FIRED_NO_UPDATE',
            NEW.outlet_id,
            0,
            0,
            0,
            TRUE,
            'trg_update_inventory_on_delivery',
            NEW.delivery_note_number,
            'database_trigger',
            jsonb_build_object(
                'status', NEW.status,
                'reason', 'Status is not delivered, exiting early'
            )
        );
        RETURN NEW;
    END IF;
    
    outlet_uuid := NEW.outlet_id::UUID;
    delivery_note_num := NEW.delivery_note_number;
    
    -- Log that trigger is about to update inventory
    INSERT INTO inventory_update_audit (
        product_name,
        outlet_id,
        old_quantity,
        new_quantity,
        quantity_change,
        updated_by_trigger,
        trigger_name,
        delivery_note_number,
        update_source,
        context_data
    ) VALUES (
        'TRIGGER_STARTING_UPDATE',
        outlet_uuid,
        0,
        0,
        0,
        TRUE,
        'trg_update_inventory_on_delivery',
        delivery_note_num,
        'database_trigger',
        jsonb_build_object(
            'status', NEW.status,
            'items_count', jsonb_array_length(NEW.items_list)
        )
    );
    
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

-- Add comment
COMMENT ON TABLE inventory_update_audit IS 'Audit trail for all inventory_products.quantity changes';
