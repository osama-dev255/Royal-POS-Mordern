-- Diagnostic: Check all triggers on saved_delivery_notes table
-- Run this in Supabase SQL Editor to see what triggers exist

-- 1. List all triggers on saved_delivery_notes
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'saved_delivery_notes'
ORDER BY trigger_name;

-- 2. Check the trigger function definition
SELECT 
    proname as function_name,
    prosrc as function_source
FROM pg_proc
WHERE proname = 'update_inventory_from_delivery';

-- 3. Check recent delivery notes to see what status was saved
SELECT 
    id,
    delivery_note_number,
    status,
    outlet_id,
    created_at,
    items_list->0 as first_item
FROM saved_delivery_notes
ORDER BY created_at DESC
LIMIT 10;

-- 4. Check inventory_products for AFYA JAR 13L
SELECT 
    id,
    name,
    quantity,
    sold_quantity,
    available_quantity,
    last_updated,
    delivery_note_number
FROM inventory_products
WHERE name = 'AFYA JAR 13L'
ORDER BY last_updated DESC;
