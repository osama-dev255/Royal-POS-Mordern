-- Diagnostic: Check current RLS state of inventory_products
-- Run this to see what's configured

-- 1. Check if RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'inventory_products';

-- 2. Check all existing policies
SELECT 
  policyname,
  cmd as operation,
  roles,
  qual as using_condition,
  with_check
FROM pg_policies 
WHERE tablename = 'inventory_products'
ORDER BY policyname;

-- 3. Check if trigger function has SECURITY DEFINER
SELECT 
  proname as function_name,
  prosecdef as has_security_definer,
  proconfig as search_path
FROM pg_proc 
WHERE proname LIKE '%inventory%' OR proname LIKE '%delivery%';

-- 4. Check outlet_users table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'outlet_users'
ORDER BY ordinal_position;

-- 5. Test: Can the current user see outlet_users?
SELECT COUNT(*) as outlet_users_count FROM outlet_users;
