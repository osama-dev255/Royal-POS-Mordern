-- Check how user osamaabeid61@gmail.com is assigned to KILANGO GROUP LTD outlet

-- Step 1: Check the outlet's manager field
SELECT 
  id,
  name,
  manager,
  email,
  phone,
  status
FROM outlets
WHERE name = 'KILANGO GROUP LTD';

-- Step 2: Check if user exists in auth.users
SELECT 
  id,
  email,
  raw_user_meta_data,
  created_at,
  last_sign_in_at
FROM auth.users
WHERE email = 'osamaabeid61@gmail.com';

-- Step 3: Check if outlet_users table exists and has assignments
SELECT 
  ou.id,
  o.name as outlet_name,
  u.email as user_email,
  ou.role,
  ou.is_active,
  ou.created_at
FROM outlet_users ou
JOIN outlets o ON o.id = ou.outlet_id
JOIN auth.users u ON u.id = ou.user_id
WHERE u.email = 'osamaabeid61@gmail.com'
  AND o.name = 'KILANGO GROUP LTD';

-- Step 4: Check all outlet assignments for this user (if outlet_users table exists)
SELECT 
  ou.id,
  o.name as outlet_name,
  o.location as outlet_location,
  ou.role,
  ou.is_active,
  ou.created_at
FROM outlet_users ou
JOIN outlets o ON o.id = ou.outlet_id
JOIN auth.users u ON u.id = ou.user_id
WHERE u.email = 'osamaabeid61@gmail.com'
ORDER BY ou.created_at DESC;

-- Step 5: Alternative - Check if user metadata contains outlet info
SELECT 
  id,
  email,
  raw_user_meta_data->>'outlet_id' as outlet_id,
  raw_user_meta_data->>'outlet_name' as outlet_name,
  raw_user_meta_data->>'role' as role
FROM auth.users
WHERE email = 'osamaabeid61@gmail.com';
