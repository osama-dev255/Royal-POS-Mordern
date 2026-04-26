-- Migration: Fix RLS policies for inventory_products table
-- This allows outlet users to insert/update inventory products for their assigned outlet
-- Date: 2026-04-26

-- First, let's check if RLS is enabled on the table
ALTER TABLE inventory_products ENABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Users can view inventory products" ON inventory_products;
DROP POLICY IF EXISTS "Users can insert inventory products" ON inventory_products;
DROP POLICY IF EXISTS "Users can update inventory products" ON inventory_products;
DROP POLICY IF EXISTS "Users can delete inventory products" ON inventory_products;

-- Create policy for SELECT (view) - Users can view products for their outlet
CREATE POLICY "Users can view inventory products"
ON inventory_products
FOR SELECT
USING (
  -- Admins can view all
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
  OR
  -- Outlet users can view products for their outlet
  outlet_id IN (
    SELECT outlet_id 
    FROM outlet_users 
    WHERE user_id = auth.uid()
  )
);

-- Create policy for INSERT - Users can add products to their outlet
CREATE POLICY "Users can insert inventory products"
ON inventory_products
FOR INSERT
WITH CHECK (
  -- Admins can insert to any outlet
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
  OR
  -- Outlet users can add products to their assigned outlet
  outlet_id IN (
    SELECT outlet_id 
    FROM outlet_users 
    WHERE user_id = auth.uid()
  )
);

-- Create policy for UPDATE - Users can update products in their outlet
CREATE POLICY "Users can update inventory products"
ON inventory_products
FOR UPDATE
USING (
  -- Admins can update all
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
  OR
  -- Outlet users can update products in their outlet
  outlet_id IN (
    SELECT outlet_id 
    FROM outlet_users 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  -- Admins can update to any outlet
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
  OR
  -- Outlet users can only keep products in their outlet
  outlet_id IN (
    SELECT outlet_id 
    FROM outlet_users 
    WHERE user_id = auth.uid()
  )
);

-- Create policy for DELETE - Users can delete products from their outlet
CREATE POLICY "Users can delete inventory products"
ON inventory_products
FOR DELETE
USING (
  -- Admins can delete from all
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
  OR
  -- Outlet users can delete products from their outlet
  outlet_id IN (
    SELECT outlet_id 
    FROM outlet_users 
    WHERE user_id = auth.uid()
  )
);

-- Verify the policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'inventory_products'
ORDER BY policyname;
