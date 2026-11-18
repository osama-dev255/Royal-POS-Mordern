-- Migration: stop the delivery-note trigger from adding outlet stock a second time
--
-- Saving a delivery note for a registered outlet must add the delivered quantities
-- to inventory_products exactly once. saveDelivery() in src/utils/deliveryUtils.ts
-- already does that in JavaScript, but the older trigger chain still exists in the
-- database:
--   20260313_add_delivery_inventory_trigger.sql
--   20260419_fix_inventory_rls_trigger.sql
--   20260426_fix_inventory_rls_trigger_complete.sql
--   20260504_fix_inventory_trigger_status_independence.sql
-- The last one recreated update_inventory_from_delivery() WITHOUT the status guard
-- and attached it AFTER INSERT OR UPDATE, so every new note (and every later edit or
-- status change) added the full delivered quantity again. The visible symptom is that
-- the Products page of a registered outlet shows doubled quantities right after a
-- delivery note is saved.
--
-- Live evidence: inventory_products.last_updated was set to midnight of the delivery
-- date (exactly what the trigger does: last_updated = NEW.date) while updated_at was
-- written a second or two later by the JavaScript sync — both writers ran.
--
-- Fix: drop every trigger on saved_delivery_notes that runs this function, and drop
-- the function itself so it cannot be reattached. JavaScript stays the single writer.

-- 1. Drop every user trigger on saved_delivery_notes that executes the function
DO $$
DECLARE
  trig RECORD;
BEGIN
  FOR trig IN
    SELECT t.tgname
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_proc p ON p.oid = t.tgfoid
    WHERE c.relname = 'saved_delivery_notes'
      AND NOT t.tgisinternal
      AND p.proname = 'update_inventory_from_delivery'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON saved_delivery_notes', trig.tgname);
    RAISE NOTICE 'Dropped inventory trigger % on saved_delivery_notes', trig.tgname;
  END LOOP;
END $$;

-- 2. Belt and braces: drop the historical trigger names even if they were pointed at
--    a different function body.
DROP TRIGGER IF EXISTS trg_update_inventory_on_delivery ON saved_delivery_notes;
DROP TRIGGER IF EXISTS trg_update_inventory_on_delivery_update ON saved_delivery_notes;
DROP TRIGGER IF EXISTS trigger_update_inventory_from_delivery ON saved_delivery_notes;
DROP TRIGGER IF EXISTS trg_update_inventory_from_delivery ON saved_delivery_notes;

-- 3. Drop the now-unused function so no future trigger can be reattached to it.
DROP FUNCTION IF EXISTS update_inventory_from_delivery();

-- 4. Verify: this must return no inventory-related rows. Triggers such as
--    trigger_update_inventory_status live on inventory_products, not here.
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE event_object_table = 'saved_delivery_notes'
ORDER BY trigger_name;

COMMIT;
