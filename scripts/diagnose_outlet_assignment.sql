-- DIAGNOSTIC SCRIPT: Why can't shimonioutlet@gmail.com be assigned to ABEID & HALIMA LTD?

-- Step 1: Check if the user exists in auth.users
SELECT 
  id,
  email,
  raw_user_meta_data,
  created_at,
  email_confirmed_at,
  last_sign_in_at
FROM auth.users
WHERE email = 'shimonioutlet@gmail.com';

-- Step 2: Check if the outlet exists
SELECT 
  id,
  name,
  location,
  manager,
  status
FROM outlets
WHERE name ILIKE '%ABEID & HALIMA%' OR name ILIKE '%abeid & halima%';

-- Step 3: Check if outlet_users table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'outlet_users'
) as outlet_users_table_exists;

-- Step 4: If table exists, check for existing assignments
SELECT 
  ou.id,
  ou.outlet_id,
  ou.user_id,
  ou.role,
  ou.is_active,
  o.name as outlet_name,
  u.email as user_email
FROM outlet_users ou
JOIN outlets o ON o.id = ou.outlet_id
JOIN auth.users u ON u.id = ou.user_id
WHERE u.email = 'shimonioutlet@gmail.com'
   OR o.name ILIKE '%ABEID & HALIMA%';

-- Step 5: Check for any constraint violations or conflicts
SELECT 
  ou.id,
  ou.outlet_id,
  ou.user_id,
  ou.role,
  ou.is_active,
  o.name as outlet_name
FROM outlet_users ou
JOIN outlets o ON o.id = ou.outlet_id
WHERE (
  ou.user_id = (SELECT id FROM auth.users WHERE email = 'shimonioutlet@gmail.com')
  OR 
  ou.outlet_id = (SELECT id FROM outlets WHERE name ILIKE '%ABEID & HALIMA%')
)
AND ou.is_active = true;

-- Step 6: Check RLS policies on outlet_users table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'outlet_users';

-- Step 7: Check if user has admin role (required by RLS policy to insert)
SELECT 
  id,
  email,
  raw_user_meta_data->>'role' as meta_role,
  raw_user_meta_data
FROM auth.users
WHERE email = 'shimonioutlet@gmail.com';

-- Step 8: Get the exact IDs needed for assignment
SELECT 
  (SELECT id FROM auth.users WHERE email = 'shimonioutlet@gmail.com') as user_id,
  (SELECT id FROM outlets WHERE name ILIKE '%ABEID & HALIMA%') as outlet_id,
  (SELECT name FROM outlets WHERE name ILIKE '%ABEID & HALIMA%') as outlet_name;

-- Step 9: If everything looks good, try the INSERT manually
-- Uncomment and run this after verifying steps 1-8:
/*
INSERT INTO outlet_users (outlet_id, user_id, role, is_active)
VALUES (
  'REPLACE_WITH_OUTLET_ID',
  'REPLACE_WITH_USER_ID',
  'manager',
  true
)
ON CONFLICT (outlet_id, user_id) 
DO UPDATE SET 
  role = 'manager',
  is_active = true,
  updated_at = NOW();
*/

-- Step 10: Verify the assignment after INSERT
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
WHERE u.email = 'shimonioutlet@gmail.com'
  AND o.name ILIKE '%ABEID & HALIMA%';
