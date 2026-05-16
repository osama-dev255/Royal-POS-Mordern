-- EMERGENCY FIX: Disable the inventory update trigger
-- This will STOP all automatic inventory updates from delivery notes
-- Run this IMMEDIATELY to stop the double-update problem

-- Option 1: Disable the trigger (keeps it but doesn't fire)
ALTER TABLE saved_delivery_notes DISABLE TRIGGER trg_update_inventory_on_delivery;
ALTER TABLE saved_delivery_notes DISABLE TRIGGER trg_update_inventory_on_delivery_update;

-- Verify triggers are disabled
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'saved_delivery_notes';

-- If the query returns rows, the triggers exist but are now DISABLED
-- They won't fire until you ENABLE them again

COMMENT ON TRIGGER trg_update_inventory_on_delivery ON saved_delivery_notes IS 
'DISABLED - Inventory updates should be done manually or through application logic';

COMMENT ON TRIGGER trg_update_inventory_on_delivery_update ON saved_delivery_notes IS 
'DISABLED - Inventory updates should be done manually or through application logic';
