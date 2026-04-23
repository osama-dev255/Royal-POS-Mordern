-- Assign user shimonioutlet@gmail.com to Abeid & Halima Outlet as manager
-- This script should be run after creating the outlet_users table

-- Step 1: Find the user ID for shimonioutlet@gmail.com
-- Run this first to get the user ID:
-- SELECT id, email FROM auth.users WHERE email = 'shimonioutlet@gmail.com';

-- Step 2: Find the outlet ID for Abeid & Halima Outlet
-- Run this to get the outlet ID:
-- SELECT id, name FROM outlets WHERE name = 'Abeid & Halima Outlet';

-- Step 3: Insert the assignment (replace the UUIDs with actual values from steps 1 & 2)
-- For now, using the provided IDs:
-- User ID: ae15e6e3-332d-4870-8760-c9f9d9913fca
-- Outlet ID: 354860d7-6a9b-477e-a1ca-0a97cc7b1613

INSERT INTO outlet_users (outlet_id, user_id, role, is_active)
VALUES (
  '354860d7-6a9b-477e-a1ca-0a97cc7b1613',  -- Abeid & Halima Outlet
  'ae15e6e3-332d-4870-8760-c9f9d9913fca',  -- shimonioutlet@gmail.com
  'manager',
  true
)
ON CONFLICT (outlet_id, user_id) 
DO UPDATE SET 
  role = 'manager',
  is_active = true,
  updated_at = NOW();

-- Verify the assignment
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
  AND o.name = 'Abeid & Halima Outlet';
