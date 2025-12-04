-- Complete RLS policies fix for all tables
-- This script enables full access for all users on all tables
-- Suitable for development/testing but should be restricted in production

-- First, ensure RLS is enabled on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE damaged_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for all users" ON users;
DROP POLICY IF EXISTS "Enable insert access for all users" ON users;
DROP POLICY IF EXISTS "Enable update access for all users" ON users;
DROP POLICY IF EXISTS "Enable delete access for all users" ON users;

DROP POLICY IF EXISTS "Enable read access for all users" ON access_logs;
DROP POLICY IF EXISTS "Enable insert access for all users" ON access_logs;
DROP POLICY IF EXISTS "Enable update access for all users" ON access_logs;
DROP POLICY IF EXISTS "Enable delete access for all users" ON access_logs;

DROP POLICY IF EXISTS "Enable read access for all users" ON categories;
DROP POLICY IF EXISTS "Enable insert access for all users" ON categories;
DROP POLICY IF EXISTS "Enable update access for all users" ON categories;
DROP POLICY IF EXISTS "Enable delete access for all users" ON categories;

DROP POLICY IF EXISTS "Enable read access for all users" ON products;
DROP POLICY IF EXISTS "Enable insert access for all users" ON products;
DROP POLICY IF EXISTS "Enable update access for all users" ON products;
DROP POLICY IF EXISTS "Enable delete access for all users" ON products;

DROP POLICY IF EXISTS "Enable read access for all users" ON suppliers;
DROP POLICY IF EXISTS "Enable insert access for all users" ON suppliers;
DROP POLICY IF EXISTS "Enable update access for all users" ON suppliers;
DROP POLICY IF EXISTS "Enable delete access for all users" ON suppliers;

DROP POLICY IF EXISTS "Enable read access for all users" ON customers;
DROP POLICY IF EXISTS "Enable insert access for all users" ON customers;
DROP POLICY IF EXISTS "Enable update access for all users" ON customers;
DROP POLICY IF EXISTS "Enable delete access for all users" ON customers;

DROP POLICY IF EXISTS "Enable read access for all users" ON discounts;
DROP POLICY IF EXISTS "Enable insert access for all users" ON discounts;
DROP POLICY IF EXISTS "Enable update access for all users" ON discounts;
DROP POLICY IF EXISTS "Enable delete access for all users" ON discounts;

DROP POLICY IF EXISTS "Enable read access for all users" ON discount_products;
DROP POLICY IF EXISTS "Enable insert access for all users" ON discount_products;
DROP POLICY IF EXISTS "Enable update access for all users" ON discount_products;
DROP POLICY IF EXISTS "Enable delete access for all users" ON discount_products;

DROP POLICY IF EXISTS "Enable read access for all users" ON discount_categories;
DROP POLICY IF EXISTS "Enable insert access for all users" ON discount_categories;
DROP POLICY IF EXISTS "Enable update access for all users" ON discount_categories;
DROP POLICY IF EXISTS "Enable delete access for all users" ON discount_categories;

DROP POLICY IF EXISTS "Enable read access for all users" ON sales;
DROP POLICY IF EXISTS "Enable insert access for all users" ON sales;
DROP POLICY IF EXISTS "Enable update access for all users" ON sales;
DROP POLICY IF EXISTS "Enable delete access for all users" ON sales;

DROP POLICY IF EXISTS "Enable read access for all users" ON sale_items;
DROP POLICY IF EXISTS "Enable insert access for all users" ON sale_items;
DROP POLICY IF EXISTS "Enable update access for all users" ON sale_items;
DROP POLICY IF EXISTS "Enable delete access for all users" ON sale_items;

DROP POLICY IF EXISTS "Enable read access for all users" ON returns;
DROP POLICY IF EXISTS "Enable insert access for all users" ON returns;
DROP POLICY IF EXISTS "Enable update access for all users" ON returns;
DROP POLICY IF EXISTS "Enable delete access for all users" ON returns;

DROP POLICY IF EXISTS "Enable read access for all users" ON return_items;
DROP POLICY IF EXISTS "Enable insert access for all users" ON return_items;
DROP POLICY IF EXISTS "Enable update access for all users" ON return_items;
DROP POLICY IF EXISTS "Enable delete access for all users" ON return_items;

DROP POLICY IF EXISTS "Enable read access for all users" ON damaged_products;
DROP POLICY IF EXISTS "Enable insert access for all users" ON damaged_products;
DROP POLICY IF EXISTS "Enable update access for all users" ON damaged_products;
DROP POLICY IF EXISTS "Enable delete access for all users" ON damaged_products;

DROP POLICY IF EXISTS "Enable read access for all users" ON purchase_orders;
DROP POLICY IF EXISTS "Enable insert access for all users" ON purchase_orders;
DROP POLICY IF EXISTS "Enable update access for all users" ON purchase_orders;
DROP POLICY IF EXISTS "Enable delete access for all users" ON purchase_orders;

DROP POLICY IF EXISTS "Enable read access for all users" ON purchase_order_items;
DROP POLICY IF EXISTS "Enable insert access for all users" ON purchase_order_items;
DROP POLICY IF EXISTS "Enable update access for all users" ON purchase_order_items;
DROP POLICY IF EXISTS "Enable delete access for all users" ON purchase_order_items;

DROP POLICY IF EXISTS "Enable read access for all users" ON expenses;
DROP POLICY IF EXISTS "Enable insert access for all users" ON expenses;
DROP POLICY IF EXISTS "Enable update access for all users" ON expenses;
DROP POLICY IF EXISTS "Enable delete access for all users" ON expenses;

DROP POLICY IF EXISTS "Enable read access for all users" ON debts;
DROP POLICY IF EXISTS "Enable insert access for all users" ON debts;
DROP POLICY IF EXISTS "Enable update access for all users" ON debts;
DROP POLICY IF EXISTS "Enable delete access for all users" ON debts;

DROP POLICY IF EXISTS "Enable read access for all users" ON customer_settlements;
DROP POLICY IF EXISTS "Enable insert access for all users" ON customer_settlements;
DROP POLICY IF EXISTS "Enable update access for all users" ON customer_settlements;
DROP POLICY IF EXISTS "Enable delete access for all users" ON customer_settlements;

DROP POLICY IF EXISTS "Enable read access for all users" ON supplier_settlements;
DROP POLICY IF EXISTS "Enable insert access for all users" ON supplier_settlements;
DROP POLICY IF EXISTS "Enable update access for all users" ON supplier_settlements;
DROP POLICY IF EXISTS "Enable delete access for all users" ON supplier_settlements;

DROP POLICY IF EXISTS "Enable read access for all users" ON inventory_audits;
DROP POLICY IF EXISTS "Enable insert access for all users" ON inventory_audits;
DROP POLICY IF EXISTS "Enable update access for all users" ON inventory_audits;
DROP POLICY IF EXISTS "Enable delete access for all users" ON inventory_audits;

DROP POLICY IF EXISTS "Enable read access for all users" ON reports;
DROP POLICY IF EXISTS "Enable insert access for all users" ON reports;
DROP POLICY IF EXISTS "Enable update access for all users" ON reports;
DROP POLICY IF EXISTS "Enable delete access for all users" ON reports;

-- Create policies for users table
CREATE POLICY "Enable read access for all users" ON users FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON users FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON users FOR DELETE USING (true);

-- Create policies for access_logs table
CREATE POLICY "Enable read access for all users" ON access_logs FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON access_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON access_logs FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON access_logs FOR DELETE USING (true);

-- Create policies for categories table
CREATE POLICY "Enable read access for all users" ON categories FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON categories FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON categories FOR DELETE USING (true);

-- Create policies for products table
CREATE POLICY "Enable read access for all users" ON products FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON products FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON products FOR DELETE USING (true);

-- Create policies for suppliers table
CREATE POLICY "Enable read access for all users" ON suppliers FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON suppliers FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON suppliers FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON suppliers FOR DELETE USING (true);

-- Create policies for customers table
CREATE POLICY "Enable read access for all users" ON customers FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON customers FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON customers FOR DELETE USING (true);

-- Create policies for discounts table
CREATE POLICY "Enable read access for all users" ON discounts FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON discounts FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON discounts FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON discounts FOR DELETE USING (true);

-- Create policies for discount_products table
CREATE POLICY "Enable read access for all users" ON discount_products FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON discount_products FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON discount_products FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON discount_products FOR DELETE USING (true);

-- Create policies for discount_categories table
CREATE POLICY "Enable read access for all users" ON discount_categories FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON discount_categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON discount_categories FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON discount_categories FOR DELETE USING (true);

-- Create policies for sales table
CREATE POLICY "Enable read access for all users" ON sales FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON sales FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON sales FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON sales FOR DELETE USING (true);

-- Create policies for sale_items table
CREATE POLICY "Enable read access for all users" ON sale_items FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON sale_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON sale_items FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON sale_items FOR DELETE USING (true);

-- Create policies for returns table
CREATE POLICY "Enable read access for all users" ON returns FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON returns FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON returns FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON returns FOR DELETE USING (true);

-- Create policies for return_items table
CREATE POLICY "Enable read access for all users" ON return_items FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON return_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON return_items FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON return_items FOR DELETE USING (true);

-- Create policies for damaged_products table
CREATE POLICY "Enable read access for all users" ON damaged_products FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON damaged_products FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON damaged_products FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON damaged_products FOR DELETE USING (true);

-- Create policies for purchase_orders table
CREATE POLICY "Enable read access for all users" ON purchase_orders FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON purchase_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON purchase_orders FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON purchase_orders FOR DELETE USING (true);

-- Create policies for purchase_order_items table
CREATE POLICY "Enable read access for all users" ON purchase_order_items FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON purchase_order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON purchase_order_items FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON purchase_order_items FOR DELETE USING (true);

-- Create policies for expenses table
CREATE POLICY "Enable read access for all users" ON expenses FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON expenses FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON expenses FOR DELETE USING (true);

-- Create policies for debts table
CREATE POLICY "Enable read access for all users" ON debts FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON debts FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON debts FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON debts FOR DELETE USING (true);

-- Create policies for customer_settlements table
CREATE POLICY "Enable read access for all users" ON customer_settlements FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON customer_settlements FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON customer_settlements FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON customer_settlements FOR DELETE USING (true);

-- Create policies for supplier_settlements table
CREATE POLICY "Enable read access for all users" ON supplier_settlements FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON supplier_settlements FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON supplier_settlements FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON supplier_settlements FOR DELETE USING (true);

-- Create policies for inventory_audits table
CREATE POLICY "Enable read access for all users" ON inventory_audits FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON inventory_audits FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON inventory_audits FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON inventory_audits FOR DELETE USING (true);

-- Create policies for reports table
CREATE POLICY "Enable read access for all users" ON reports FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON reports FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON reports FOR DELETE USING (true);