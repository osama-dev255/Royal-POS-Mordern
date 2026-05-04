-- Simple script to verify current inventory trigger function

-- Check if the function exists
SELECT proname, prosecdef, proconfig 
FROM pg_proc 
WHERE proname = 'update_inventory_from_delivery';

-- Check if trigger exists on saved_delivery_notes
SELECT tgname, tgtype, tgenabled 
FROM pg_trigger 
WHERE tgrelid = 'saved_delivery_notes'::regclass;

-- Show current function definition (simplified)
SELECT pg_get_functiondef('update_inventory_from_delivery'::regproc) as function_definition;

-- Check for status condition in function definition
SELECT 
  CASE 
    WHEN pg_get_functiondef('update_inventory_from_delivery'::regproc) ~ 'status.*!=.*''delivered''' THEN 'STATUS CONDITION PRESENT'
    ELSE 'NO STATUS CONDITION'
  END as status_check;