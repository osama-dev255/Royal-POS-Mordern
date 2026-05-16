-- Disable the single remaining inventory trigger
-- This stops database-triggered inventory updates
-- JavaScript code in deliveryUtils.ts will handle inventory updates instead

ALTER TABLE saved_delivery_notes DISABLE TRIGGER trg_update_inventory_from_delivery;

-- Verify it's disabled
SELECT 
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'saved_delivery_notes'
  AND trigger_name = 'trg_update_inventory_from_delivery';

-- The trigger still exists but won't fire until you run:
-- ALTER TABLE saved_delivery_notes ENABLE TRIGGER trg_update_inventory_from_delivery;
