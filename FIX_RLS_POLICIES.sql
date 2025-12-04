-- Fix RLS policies for all tables to allow anonymous access for a POS system
-- This is suitable for development/testing but should be more restrictive in production

-- Products table policies
DROP POLICY IF EXISTS "Enable read access for all users" ON products;
DROP POLICY IF EXISTS "Enable insert access for all users" ON products;
DROP POLICY IF EXISTS "Enable update access for all users" ON products;
DROP POLICY IF EXISTS "Enable delete access for all users" ON products;

CREATE POLICY "Enable read access for all users" ON products FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON products FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON products FOR DELETE USING (true);

-- Categories table policies
DROP POLICY IF EXISTS "Enable read access for all users" ON categories;
DROP POLICY IF EXISTS "Enable insert access for all users" ON categories;
DROP POLICY IF EXISTS "Enable update access for all users" ON categories;
DROP POLICY IF EXISTS "Enable delete access for all users" ON categories;

CREATE POLICY "Enable read access for all users" ON categories FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON categories FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON categories FOR DELETE USING (true);

-- Customers table policies
DROP POLICY IF EXISTS "Enable read access for all users" ON customers;
DROP POLICY IF EXISTS "Enable insert access for all users" ON customers;
DROP POLICY IF EXISTS "Enable update access for all users" ON customers;
DROP POLICY IF EXISTS "Enable delete access for all users" ON customers;

CREATE POLICY "Enable read access for all users" ON customers FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON customers FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON customers FOR DELETE USING (true);

-- Suppliers table policies
DROP POLICY IF EXISTS "Enable read access for all users" ON suppliers;
DROP POLICY IF EXISTS "Enable insert access for all users" ON suppliers;
DROP POLICY IF EXISTS "Enable update access for all users" ON suppliers;
DROP POLICY IF EXISTS "Enable delete access for all users" ON suppliers;

CREATE POLICY "Enable read access for all users" ON suppliers FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON suppliers FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON suppliers FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON suppliers FOR DELETE USING (true);

-- Sales table policies
DROP POLICY IF EXISTS "Enable read access for all users" ON sales;
DROP POLICY IF EXISTS "Enable insert access for all users" ON sales;
DROP POLICY IF EXISTS "Enable update access for all users" ON sales;
DROP POLICY IF EXISTS "Enable delete access for all users" ON sales;

CREATE POLICY "Enable read access for all users" ON sales FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON sales FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON sales FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON sales FOR DELETE USING (true);

-- Sale items table policies
DROP POLICY IF EXISTS "Enable read access for all users" ON sale_items;
DROP POLICY IF EXISTS "Enable insert access for all users" ON sale_items;
DROP POLICY IF EXISTS "Enable update access for all users" ON sale_items;
DROP POLICY IF EXISTS "Enable delete access for all users" ON sale_items;

CREATE POLICY "Enable read access for all users" ON sale_items FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON sale_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON sale_items FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON sale_items FOR DELETE USING (true);

-- Purchase orders table policies
DROP POLICY IF EXISTS "Enable read access for all users" ON purchase_orders;
DROP POLICY IF EXISTS "Enable insert access for all users" ON purchase_orders;
DROP POLICY IF EXISTS "Enable update access for all users" ON purchase_orders;
DROP POLICY IF EXISTS "Enable delete access for all users" ON purchase_orders;

CREATE POLICY "Enable read access for all users" ON purchase_orders FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON purchase_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON purchase_orders FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON purchase_orders FOR DELETE USING (true);

-- Purchase order items table policies
DROP POLICY IF EXISTS "Enable read access for all users" ON purchase_order_items;
DROP POLICY IF EXISTS "Enable insert access for all users" ON purchase_order_items;
DROP POLICY IF EXISTS "Enable update access for all users" ON purchase_order_items;
DROP POLICY IF EXISTS "Enable delete access for all users" ON purchase_order_items;

CREATE POLICY "Enable read access for all users" ON purchase_order_items FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON purchase_order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON purchase_order_items FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON purchase_order_items FOR DELETE USING (true);

-- Expenses table policies
DROP POLICY IF EXISTS "Enable read access for all users" ON expenses;
DROP POLICY IF EXISTS "Enable insert access for all users" ON expenses;
DROP POLICY IF EXISTS "Enable update access for all users" ON expenses;
DROP POLICY IF EXISTS "Enable delete access for all users" ON expenses;

CREATE POLICY "Enable read access for all users" ON expenses FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON expenses FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON expenses FOR DELETE USING (true);

-- Discounts table policies
DROP POLICY IF EXISTS "Enable read access for all users" ON discounts;
DROP POLICY IF EXISTS "Enable insert access for all users" ON discounts;
DROP POLICY IF EXISTS "Enable update access for all users" ON discounts;
DROP POLICY IF EXISTS "Enable delete access for all users" ON discounts;

CREATE POLICY "Enable read access for all users" ON discounts FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON discounts FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON discounts FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON discounts FOR DELETE USING (true);

-- Users table policies
DROP POLICY IF EXISTS "Enable read access for all users" ON users;
DROP POLICY IF EXISTS "Enable insert access for all users" ON users;
DROP POLICY IF EXISTS "Enable update access for all users" ON users;
DROP POLICY IF EXISTS "Enable delete access for all users" ON users;

CREATE POLICY "Enable read access for all users" ON users FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON users FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON users FOR DELETE USING (true);

-- Returns table policies
DROP POLICY IF EXISTS "Enable read access for all users" ON returns;
DROP POLICY IF EXISTS "Enable insert access for all users" ON returns;
DROP POLICY IF EXISTS "Enable update access for all users" ON returns;
DROP POLICY IF EXISTS "Enable delete access for all users" ON returns;

CREATE POLICY "Enable read access for all users" ON returns FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON returns FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON returns FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON returns FOR DELETE USING (true);

-- Return items table policies
DROP POLICY IF EXISTS "Enable read access for all users" ON return_items;
DROP POLICY IF EXISTS "Enable insert access for all users" ON return_items;
DROP POLICY IF EXISTS "Enable update access for all users" ON return_items;
DROP POLICY IF EXISTS "Enable delete access for all users" ON return_items;

CREATE POLICY "Enable read access for all users" ON return_items FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON return_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON return_items FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON return_items FOR DELETE USING (true);

-- Damaged products table policies
DROP POLICY IF EXISTS "Enable read access for all users" ON damaged_products;
DROP POLICY IF EXISTS "Enable insert access for all users" ON damaged_products;
DROP POLICY IF EXISTS "Enable update access for all users" ON damaged_products;
DROP POLICY IF EXISTS "Enable delete access for all users" ON damaged_products;

CREATE POLICY "Enable read access for all users" ON damaged_products FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON damaged_products FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON damaged_products FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON damaged_products FOR DELETE USING (true);

-- Debts table policies
DROP POLICY IF EXISTS "Enable read access for all users" ON debts;
DROP POLICY IF EXISTS "Enable insert access for all users" ON debts;
DROP POLICY IF EXISTS "Enable update access for all users" ON debts;
DROP POLICY IF EXISTS "Enable delete access for all users" ON debts;

CREATE POLICY "Enable read access for all users" ON debts FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON debts FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON debts FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON debts FOR DELETE USING (true);

-- Customer settlements table policies
DROP POLICY IF EXISTS "Enable read access for all users" ON customer_settlements;
DROP POLICY IF EXISTS "Enable insert access for all users" ON customer_settlements;
DROP POLICY IF EXISTS "Enable update access for all users" ON customer_settlements;
DROP POLICY IF EXISTS "Enable delete access for all users" ON customer_settlements;

CREATE POLICY "Enable read access for all users" ON customer_settlements FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON customer_settlements FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON customer_settlements FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON customer_settlements FOR DELETE USING (true);

-- Supplier settlements table policies
DROP POLICY IF EXISTS "Enable read access for all users" ON supplier_settlements;
DROP POLICY IF EXISTS "Enable insert access for all users" ON supplier_settlements;
DROP POLICY IF EXISTS "Enable update access for all users" ON supplier_settlements;
DROP POLICY IF EXISTS "Enable delete access for all users" ON supplier_settlements;

CREATE POLICY "Enable read access for all users" ON supplier_settlements FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON supplier_settlements FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON supplier_settlements FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON supplier_settlements FOR DELETE USING (true);

-- Inventory audits table policies
DROP POLICY IF EXISTS "Enable read access for all users" ON inventory_audits;
DROP POLICY IF EXISTS "Enable insert access for all users" ON inventory_audits;
DROP POLICY IF EXISTS "Enable update access for all users" ON inventory_audits;
DROP POLICY IF EXISTS "Enable delete access for all users" ON inventory_audits;

CREATE POLICY "Enable read access for all users" ON inventory_audits FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON inventory_audits FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON inventory_audits FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON inventory_audits FOR DELETE USING (true);

-- Reports table policies
DROP POLICY IF EXISTS "Enable read access for all users" ON reports;
DROP POLICY IF EXISTS "Enable insert access for all users" ON reports;
DROP POLICY IF EXISTS "Enable update access for all users" ON reports;
DROP POLICY IF EXISTS "Enable delete access for all users" ON reports;

CREATE POLICY "Enable read access for all users" ON reports FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON reports FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON reports FOR DELETE USING (true);

-- Access logs table policies
DROP POLICY IF EXISTS "Enable read access for all users" ON access_logs;
DROP POLICY IF EXISTS "Enable insert access for all users" ON access_logs;
DROP POLICY IF EXISTS "Enable update access for all users" ON access_logs;
DROP POLICY IF EXISTS "Enable delete access for all users" ON access_logs;

CREATE POLICY "Enable read access for all users" ON access_logs FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON access_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON access_logs FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON access_logs FOR DELETE USING (true);