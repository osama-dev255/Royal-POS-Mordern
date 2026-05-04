-- Script to verify current inventory trigger function

-- Check if the function exists
SELECT proname, prosecdef, proconfig 
FROM pg_proc 
WHERE proname = 'update_inventory_from_delivery';

-- Check if trigger exists on saved_delivery_notes
SELECT tgname, tgtype, tgenabled 
FROM pg_trigger 
WHERE tgrelid = 'saved_delivery_notes'::regclass;

-- Show current function definition
SELECT pg_get_functiondef('update_inventory_from_delivery'::regproc);

-- List all migrations that have been applied (if using Supabase migrations table)
SELECT * FROM supabase_migrations ORDER BY version DESC LIMIT 10;

-- Alternative: Check for the status condition in the function
SELECT 
  CASE 
    WHEN pg_get_functiondef('update_inventory_from_delivery'::regproc) LIKE '%status != ''delivered''' THEN 'STATUS CONDITION PRESENT'
    ELSE 'NO STATUS CONDITION'
  END as status_check;