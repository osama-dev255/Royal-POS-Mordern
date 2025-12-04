-- Remove all RLS policies and disable RLS on all tables
-- This script will completely remove Row Level Security from the POS system

-- Drop all existing policies first
-- Products table policies
DROP POLICY IF EXISTS "Enable read access for all users" ON products;
DROP POLICY IF EXISTS "Enable insert access for all users" ON products;
DROP POLICY IF EXISTS "Enable update access for all users" ON products;
DROP POLICY IF EXISTS "Enable delete access for all users" ON products;

-- Categories table policies
DROP POLICY IF EXISTS "Enable read access for all users" ON categories;
DROP POLICY IF EXISTS "Enable insert access for all users" ON categories;
DROP POLICY IF EXISTS "Enable update access for all users" ON categories;
DROP POLICY IF EXISTS "Enable delete access for all users" ON categories;

-- Customers table policies
DROP POLICY IF EXISTS "Enable read access for all users" ON customers;
DROP POLICY IF EXISTS "Enable insert access for all users" ON customers;
DROP POLICY IF EXISTS "Enable update access for all users" ON customers;
DROP POLICY IF EXISTS "Enable delete access for all users" ON customers;

-- Suppliers table policies
DROP POLICY IF EXISTS "Enable read access for all users" ON suppliers;
DROP POLICY IF EXISTS "Enable insert access for all users" ON suppliers;
DROP POLICY IF EXISTS "Enable update access for all users" ON suppliers;
DROP POLICY IF EXISTS "Enable delete access for all users" ON suppliers;

-- Sales table policies
DROP POLICY IF EXISTS "Enable read access for all users" ON sales;
DROP POLICY IF EXISTS "Enable insert access for all users" ON sales;
DROP POLICY IF EXISTS "Enable update access for all users" ON sales;
DROP POLICY IF EXISTS "Enable delete access for all users" ON sales;

-- Sale items table policies
DROP POLICY IF EXISTS "Enable read access for all users" ON sale_items;
DROP POLICY IF EXISTS "Enable insert access for all users" ON sale_items;
DROP POLICY IF EXISTS "Enable update access for all users" ON sale_items;
DROP POLICY IF EXISTS "Enable delete access for all users" ON sale_items;

-- Purchase orders table policies
DROP POLICY IF EXISTS "Enable read access for all users" ON purchase_orders;
DROP POLICY IF EXISTS "Enable insert access for all users" ON purchase_orders;
DROP POLICY IF EXISTS "Enable update access for all users" ON purchase_orders;
DROP POLICY IF EXISTS "Enable delete access for all users" ON purchase_orders;

-- Purchase order items table policies
DROP POLICY IF EXISTS "Enable read access for all users" ON purchase_order_items;
DROP POLICY IF EXISTS "Enable insert access for all users" ON purchase_order_items;
DROP POLICY IF EXISTS "Enable update access for all users" ON purchase_order_items;
DROP POLICY IF EXISTS "Enable delete access for all users" ON purchase_order_items;

-- Expenses table policies
DROP POLICY IF EXISTS "Enable read access for all users" ON expenses;
DROP POLICY IF EXISTS "Enable insert access for all users" ON expenses;
DROP POLICY IF EXISTS "Enable update access for all users" ON expenses;
DROP POLICY IF EXISTS "Enable delete access for all users" ON expenses;

-- Discounts table policies
DROP POLICY IF EXISTS "Enable read access for all users" ON discounts;
DROP POLICY IF EXISTS "Enable insert access for all users" ON discounts;
DROP POLICY IF EXISTS "Enable update access for all users" ON discounts;
DROP POLICY IF EXISTS "Enable delete access for all users" ON discounts;

-- Users table policies
DROP POLICY IF EXISTS "Enable read access for all users" ON users;
DROP POLICY IF EXISTS "Enable insert access for all users" ON users;
DROP POLICY IF EXISTS "Enable update access for all users" ON users;
DROP POLICY IF EXISTS "Enable delete access for all users" ON users;

-- Returns table policies
DROP POLICY IF EXISTS "Enable read access for all users" ON returns;
DROP POLICY IF EXISTS "Enable insert access for all users" ON returns;
DROP POLICY IF EXISTS "Enable update access for all users" ON returns;
DROP POLICY IF EXISTS "Enable delete access for all users" ON returns;

-- Return items table policies
DROP POLICY IF EXISTS "Enable read access for all users" ON return_items;
DROP POLICY IF EXISTS "Enable insert access for all users" ON return_items;
DROP POLICY IF EXISTS "Enable update access for all users" ON return_items;
DROP POLICY IF EXISTS "Enable delete access for all users" ON return_items;

-- Damaged products table policies
DROP POLICY IF EXISTS "Enable read access for all users" ON damaged_products;
DROP POLICY IF EXISTS "Enable insert access for all users" ON damaged_products;
DROP POLICY IF EXISTS "Enable update access for all users" ON damaged_products;
DROP POLICY IF EXISTS "Enable delete access for all users" ON damaged_products;

-- Debts table policies
DROP POLICY IF EXISTS "Enable read access for all users" ON debts;
DROP POLICY IF EXISTS "Enable insert access for all users" ON debts;
DROP POLICY IF EXISTS "Enable update access for all users" ON debts;
DROP POLICY IF EXISTS "Enable delete access for all users" ON debts;

-- Customer settlements table policies
DROP POLICY IF EXISTS "Enable read access for all users" ON customer_settlements;
DROP POLICY IF EXISTS "Enable insert access for all users" ON customer_settlements;
DROP POLICY IF EXISTS "Enable update access for all users" ON customer_settlements;
DROP POLICY IF EXISTS "Enable delete access for all users" ON customer_settlements;

-- Supplier settlements table policies
DROP POLICY IF EXISTS "Enable read access for all users" ON supplier_settlements;
DROP POLICY IF EXISTS "Enable insert access for all users" ON supplier_settlements;
DROP POLICY IF EXISTS "Enable update access for all users" ON supplier_settlements;
DROP POLICY IF EXISTS "Enable delete access for all users" ON supplier_settlements;

-- Inventory audits table policies
DROP POLICY IF EXISTS "Enable read access for all users" ON inventory_audits;
DROP POLICY IF EXISTS "Enable insert access for all users" ON inventory_audits;
DROP POLICY IF EXISTS "Enable update access for all users" ON inventory_audits;
DROP POLICY IF EXISTS "Enable delete access for all users" ON inventory_audits;

-- Reports table policies
DROP POLICY IF EXISTS "Enable read access for all users" ON reports;
DROP POLICY IF EXISTS "Enable insert access for all users" ON reports;
DROP POLICY IF EXISTS "Enable update access for all users" ON reports;
DROP POLICY IF EXISTS "Enable delete access for all users" ON reports;

-- Access logs table policies
DROP POLICY IF EXISTS "Enable read access for all users" ON access_logs;
DROP POLICY IF EXISTS "Enable insert access for all users" ON access_logs;
DROP POLICY IF EXISTS "Enable update access for all users" ON access_logs;
DROP POLICY IF EXISTS "Enable delete access for all users" ON access_logs;

-- Discount products table policies
DROP POLICY IF EXISTS "Enable read access for all users" ON discount_products;
DROP POLICY IF EXISTS "Enable insert access for all users" ON discount_products;
DROP POLICY IF EXISTS "Enable update access for all users" ON discount_products;
DROP POLICY IF EXISTS "Enable delete access for all users" ON discount_products;

-- Discount categories table policies
DROP POLICY IF EXISTS "Enable read access for all users" ON discount_categories;
DROP POLICY IF EXISTS "Enable insert access for all users" ON discount_categories;
DROP POLICY IF EXISTS "Enable update access for all users" ON discount_categories;
DROP POLICY IF EXISTS "Enable delete access for all users" ON discount_categories;

-- Disable RLS on all tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE access_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE discounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE discount_products DISABLE ROW LEVEL SECURITY;
ALTER TABLE discount_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE returns DISABLE ROW LEVEL SECURITY;
ALTER TABLE return_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE damaged_products DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE debts DISABLE ROW LEVEL SECURITY;
ALTER TABLE customer_settlements DISABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_settlements DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_audits DISABLE ROW LEVEL SECURITY;
ALTER TABLE reports DISABLE ROW LEVEL SECURITY;