-- Fix RLS policies for customer_settlements to allow admins to view all settlements
-- This enables admins to see customer settlements created by managers and cashiers

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own customer settlements" ON customer_settlements;
DROP POLICY IF EXISTS "Users can insert their own customer settlements" ON customer_settlements;
DROP POLICY IF EXISTS "Users can update their own customer settlements" ON customer_settlements;
DROP POLICY IF EXISTS "Users can delete their own customer settlements" ON customer_settlements;

-- Create new policy that allows admins to see all settlements
CREATE POLICY select_customer_settlements ON customer_settlements
FOR SELECT TO authenticated
USING (
  -- Admins can see all settlements
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
  OR 
  -- Other users can only see their own settlements or those with null user_id
  (auth.uid() = user_id OR user_id IS NULL)
);

-- Keep insert policy the same - users can only insert their own settlements
CREATE POLICY insert_customer_settlements ON customer_settlements
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Update policy to allow admins to update any settlement
CREATE POLICY update_customer_settlements ON customer_settlements
FOR UPDATE TO authenticated
USING (
  -- Admins can update all settlements
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
  OR 
  -- Other users can only update their own settlements or those with null user_id
  (auth.uid() = user_id OR (user_id IS NULL AND auth.role() = 'authenticated'))
);

-- Delete policy to allow admins to delete any settlement
CREATE POLICY delete_customer_settlements ON customer_settlements
FOR DELETE TO authenticated
USING (
  -- Admins can delete all settlements
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
  OR 
  -- Other users can only delete their own settlements or those with null user_id
  (auth.uid() = user_id OR (user_id IS NULL AND auth.role() = 'authenticated'))
);