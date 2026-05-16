-- CRITICAL FIX: Drop ALL duplicate inventory triggers
-- There are 5 triggers when there should only be 1!
-- This is causing the double/triple inventory update problem

-- Step 1: Drop ALL existing triggers
DROP TRIGGER IF EXISTS trg_update_inventory_on_delivery ON saved_delivery_notes;
DROP TRIGGER IF EXISTS trg_update_inventory_on_delivery_update ON saved_delivery_notes;
DROP TRIGGER IF EXISTS trigger_update_inventory_from_delivery ON saved_delivery_notes;

-- Step 2: Verify all triggers are gone
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'saved_delivery_notes';

-- This should return ZERO rows

-- Step 3: Create ONE single trigger for INSERT only
-- (We'll handle updates manually or through separate logic)
CREATE TRIGGER trg_update_inventory_from_delivery
    AFTER INSERT ON saved_delivery_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_from_delivery();

-- Step 4: Verify only ONE trigger exists
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'saved_delivery_notes';

-- This should return exactly ONE row:
-- trg_update_inventory_from_delivery | INSERT | AFTER | EXECUTE FUNCTION update_inventory_from_delivery()
