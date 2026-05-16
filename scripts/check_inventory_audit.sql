-- Query the audit trail to see what's updating inventory
-- Run this AFTER saving a delivery note to see what happened

-- 1. Show recent inventory updates (last 20)
SELECT 
    id,
    product_name,
    outlet_id,
    old_quantity,
    new_quantity,
    quantity_change,
    updated_by_trigger,
    trigger_name,
    delivery_note_number,
    update_source,
    created_at,
    context_data
FROM inventory_update_audit
ORDER BY created_at DESC
LIMIT 20;

-- 2. Show updates for AFYA JAR 13L specifically
SELECT 
    id,
    product_name,
    old_quantity,
    new_quantity,
    quantity_change,
    trigger_name,
    delivery_note_number,
    update_source,
    created_at,
    context_data
FROM inventory_update_audit
WHERE product_name LIKE '%AFYA JAR 13L%' 
   OR product_name = 'TRIGGER_FIRED_NO_UPDATE'
   OR product_name = 'TRIGGER_STARTING_UPDATE'
ORDER BY created_at DESC
LIMIT 50;

-- 3. Count how many times each trigger fired
SELECT 
    trigger_name,
    COUNT(*) as fire_count,
    SUM(CASE WHEN quantity_change > 0 THEN 1 ELSE 0 END) as updates_with_increase,
    MIN(created_at) as first_fire,
    MAX(created_at) as last_fire
FROM inventory_update_audit
WHERE trigger_name IS NOT NULL
GROUP BY trigger_name
ORDER BY fire_count DESC;

-- 4. Show all updates in the last hour
SELECT 
    product_name,
    old_quantity,
    new_quantity,
    quantity_change,
    trigger_name,
    delivery_note_number,
    update_source,
    created_at,
    context_data
FROM inventory_update_audit
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- 5. Check for duplicate updates (same delivery note updating same product multiple times)
SELECT 
    delivery_note_number,
    product_name,
    COUNT(*) as update_count,
    SUM(quantity_change) as total_quantity_added,
    STRING_AGG(quantity_change::TEXT, ', ' ORDER BY created_at) as individual_updates
FROM inventory_update_audit
WHERE delivery_note_number IS NOT NULL 
  AND product_name NOT LIKE 'TRIGGER_%'
GROUP BY delivery_note_number, product_name
HAVING COUNT(*) > 1
ORDER BY update_count DESC;
