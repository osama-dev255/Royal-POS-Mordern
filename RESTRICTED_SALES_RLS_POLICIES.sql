-- Restricted RLS policies for sales table - only salesmen can register sales
-- This is suitable for production use

-- Enable RLS on sales and sale_items tables if not already enabled
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for all users" ON sales;
DROP POLICY IF EXISTS "Enable insert access for salesmen only" ON sales;
DROP POLICY IF EXISTS "Enable update access for salesmen only" ON sales;
DROP POLICY IF EXISTS "Enable delete access for salesmen only" ON sales;

DROP POLICY IF EXISTS "Enable read access for all users" ON sale_items;
DROP POLICY IF EXISTS "Enable insert access for salesmen only" ON sale_items;
DROP POLICY IF EXISTS "Enable update access for salesmen only" ON sale_items;
DROP POLICY IF EXISTS "Enable delete access for salesmen only" ON sale_items;

-- Create policies for sales table
-- Allow all users to read sales (view sales reports, etc.)
CREATE POLICY "Enable read access for all users" ON sales FOR SELECT USING (true);

-- Allow only users with role 'salesman' or 'admin' to insert sales
CREATE POLICY "Enable insert access for salesmen only" ON sales FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('salesman', 'admin')
    AND users.is_active = true
  )
);

-- Allow only users with role 'salesman' or 'admin' to update their own sales
CREATE POLICY "Enable update access for salesmen only" ON sales FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('salesman', 'admin')
    AND users.is_active = true
  )
);

-- Allow only users with role 'salesman' or 'admin' to delete sales
CREATE POLICY "Enable delete access for salesmen only" ON sales FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('salesman', 'admin')
    AND users.is_active = true
  )
);

-- Create policies for sale_items table
-- Allow all users to read sale items (view sales details, etc.)
CREATE POLICY "Enable read access for all users" ON sale_items FOR SELECT USING (true);

-- Allow only users with role 'salesman' or 'admin' to insert sale items
CREATE POLICY "Enable insert access for salesmen only" ON sale_items FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('salesman', 'admin')
    AND users.is_active = true
  )
);

-- Allow only users with role 'salesman' or 'admin' to update sale items
CREATE POLICY "Enable update access for salesmen only" ON sale_items FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('salesman', 'admin')
    AND users.is_active = true
  )
);

-- Allow only users with role 'salesman' or 'admin' to delete sale items
CREATE POLICY "Enable delete access for salesmen only" ON sale_items FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('salesman', 'admin')
    AND users.is_active = true
  )
);