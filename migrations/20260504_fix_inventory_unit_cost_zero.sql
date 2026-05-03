-- Migration: Fix existing inventory_products with unit_cost = 0
-- This updates inventory products that have unit_cost = 0 by extracting costs from their delivery notes
-- Date: 2026-05-04

DO $$
DECLARE
    delivery_record RECORD;
    item_record RECORD;
    product_record RECORD;
BEGIN
    -- Loop through inventory products with unit_cost = 0
    FOR product_record IN 
        SELECT ip.id, ip.name, ip.outlet_id, ip.delivery_note_number
        FROM inventory_products ip
        WHERE ip.unit_cost = 0
          AND ip.delivery_note_number IS NOT NULL
    LOOP
        -- Find the corresponding delivery note
        FOR delivery_record IN 
            SELECT id, outlet_id, delivery_note_number, items_list
            FROM saved_delivery_notes
            WHERE delivery_note_number = product_record.delivery_note_number
              AND outlet_id = product_record.outlet_id
            LIMIT 1
        LOOP
            -- Extract cost from items_list JSONB
            FOR item_record IN 
                SELECT 
                    COALESCE(item->>'description', item->>'name') as name,
                    COALESCE((item->>'rate')::DECIMAL, (item->>'price')::DECIMAL, (item->>'unit_cost')::DECIMAL, 0) as unit_cost
                FROM jsonb_array_elements(delivery_record.items_list) AS item
                WHERE COALESCE(item->>'description', item->>'name') = product_record.name
            LOOP
                IF item_record.unit_cost > 0 THEN
                    UPDATE inventory_products 
                    SET unit_cost = item_record.unit_cost,
                        updated_at = NOW()
                    WHERE id = product_record.id;
                    EXIT;
                END IF;
            END LOOP;
        END LOOP;
    END LOOP;
END $$;

-- Verify the fix
SELECT 
    COUNT(*) as products_with_zero_cost,
    COUNT(CASE WHEN unit_cost > 0 THEN 1 END) as products_with_positive_cost
FROM inventory_products;

-- Optional: Add index for better performance on unit_cost queries
CREATE INDEX IF NOT EXISTS idx_inventory_products_unit_cost ON inventory_products(unit_cost);