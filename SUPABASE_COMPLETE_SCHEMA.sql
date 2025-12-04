-- Complete Supabase Schema for POS System
-- This script creates all necessary tables with proper foreign key relationships

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users and Roles
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE,
  password_hash TEXT,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(20) NOT NULL DEFAULT 'cashier' CHECK (role IN ('admin', 'manager', 'salesman', 'cashier', 'staff')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Access Logs
CREATE TABLE IF NOT EXISTS access_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  description TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Categories
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Products
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  description TEXT,
  barcode VARCHAR(50) UNIQUE,
  sku VARCHAR(50) UNIQUE,
  unit_of_measure VARCHAR(20) DEFAULT 'piece',
  selling_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  cost_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  wholesale_price DECIMAL(10,2) DEFAULT 0.00,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  min_stock_level INTEGER DEFAULT 0,
  max_stock_level INTEGER DEFAULT 10000,
  is_active BOOLEAN DEFAULT true,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  zip_code VARCHAR(20),
  country VARCHAR(100),
  tax_id VARCHAR(50),
  payment_terms VARCHAR(50) DEFAULT 'Net 30',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Customers
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  zip_code VARCHAR(20),
  country VARCHAR(100),
  date_of_birth DATE,
  loyalty_points INTEGER DEFAULT 0,
  credit_limit DECIMAL(10,2) DEFAULT 0.00,
  tax_id VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Discounts
CREATE TABLE IF NOT EXISTS discounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) UNIQUE,
  description TEXT,
  discount_type VARCHAR(20) NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10,2) NOT NULL,
  minimum_order_value DECIMAL(10,2) DEFAULT 0.00,
  maximum_discount_amount DECIMAL(10,2),
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  usage_limit INTEGER,
  used_count INTEGER DEFAULT 0,
  apply_to VARCHAR(20) DEFAULT 'all' CHECK (apply_to IN ('all', 'specific_products', 'specific_categories')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Discount Products (Many-to-Many relationship)
CREATE TABLE IF NOT EXISTS discount_products (
  discount_id UUID REFERENCES discounts(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  PRIMARY KEY (discount_id, product_id)
);

-- 9. Discount Categories (Many-to-Many relationship)
CREATE TABLE IF NOT EXISTS discount_categories (
  discount_id UUID REFERENCES discounts(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (discount_id, category_id)
);

-- 10. Sales
CREATE TABLE IF NOT EXISTS sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  invoice_number VARCHAR(50) UNIQUE,
  sale_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  change_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  payment_method VARCHAR(50) NOT NULL DEFAULT 'cash',
  payment_status VARCHAR(20) NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid', 'partial', 'unpaid', 'refunded')),
  sale_status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (sale_status IN ('completed', 'pending', 'cancelled')),
  notes TEXT,
  reference_number VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Sale Items
CREATE TABLE IF NOT EXISTS sale_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Returns
CREATE TABLE IF NOT EXISTS returns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  return_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reason VARCHAR(255),
  return_status VARCHAR(20) NOT NULL DEFAULT 'processed' CHECK (return_status IN ('requested', 'approved', 'processed', 'rejected')),
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  refund_method VARCHAR(50),
  refund_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Return Items
CREATE TABLE IF NOT EXISTS return_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  return_id UUID REFERENCES returns(id) ON DELETE CASCADE,
  sale_item_id UUID REFERENCES sale_items(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  reason VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. Damaged Products
CREATE TABLE IF NOT EXISTS damaged_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL,
  reason VARCHAR(255),
  date_reported TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) NOT NULL DEFAULT 'reported' CHECK (status IN ('reported', 'verified', 'resolved')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  order_number VARCHAR(50) UNIQUE,
  order_date DATE NOT NULL,
  expected_delivery_date DATE,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ordered', 'received', 'partially_received', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 16. Purchase Order Items
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  quantity_ordered INTEGER NOT NULL DEFAULT 1,
  quantity_received INTEGER NOT NULL DEFAULT 0,
  unit_cost DECIMAL(10,2) NOT NULL,
  total_cost DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 17. Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  expense_date DATE NOT NULL,
  receipt_url TEXT,
  is_business_related BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 18. Debts
CREATE TABLE IF NOT EXISTS debts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  debt_type VARCHAR(20) NOT NULL CHECK (debt_type IN ('customer', 'supplier')),
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  due_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'outstanding' CHECK (status IN ('outstanding', 'paid', 'overdue', 'written_off')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 19. Customer Settlements
CREATE TABLE IF NOT EXISTS customer_settlements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  reference_number VARCHAR(100),
  notes TEXT,
  settlement_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 20. Supplier Settlements
CREATE TABLE IF NOT EXISTS supplier_settlements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  reference_number VARCHAR(100),
  notes TEXT,
  settlement_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 21. Inventory Audits
CREATE TABLE IF NOT EXISTS inventory_audits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  audit_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expected_quantity INTEGER NOT NULL,
  actual_quantity INTEGER NOT NULL,
  difference INTEGER NOT NULL,
  reason VARCHAR(255),
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 22. Reports
CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  report_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  file_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'generated' CHECK (status IN ('generated', 'processing', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_suppliers_email ON suppliers(email);
CREATE INDEX IF NOT EXISTS idx_suppliers_phone ON suppliers(phone);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_user ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(sale_status);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_returns_date ON returns(return_date);
CREATE INDEX IF NOT EXISTS idx_returns_sale ON returns(sale_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_date ON purchase_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_debts_customer ON debts(customer_id);
CREATE INDEX IF NOT EXISTS idx_debts_supplier ON debts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_debts_status ON debts(status);
CREATE INDEX IF NOT EXISTS idx_inventory_audits_date ON inventory_audits(audit_date);
CREATE INDEX IF NOT EXISTS idx_inventory_audits_product ON inventory_audits(product_id);
CREATE INDEX IF NOT EXISTS idx_reports_date ON reports(created_at);
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(report_type);
CREATE INDEX IF NOT EXISTS idx_access_logs_user ON access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_date ON access_logs(created_at);

-- Add asset management tables after the existing tables
-- 23. Assets
CREATE TABLE IF NOT EXISTS assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  purchase_date DATE,
  purchase_price DECIMAL(10,2) NOT NULL,
  current_value DECIMAL(10,2) NOT NULL,
  depreciation_rate DECIMAL(5,2) DEFAULT 0.00,
  estimated_lifespan INTEGER, -- in years
  vat_rate DECIMAL(5,2) DEFAULT NULL, -- VAT rate at time of purchase
  vat_amount DECIMAL(10,2) DEFAULT NULL, -- VAT amount at time of purchase
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'disposed', 'lost')),
  serial_number VARCHAR(100),
  location VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 24. Asset Transactions (purchases, sales, disposals)
CREATE TABLE IF NOT EXISTS asset_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('purchase', 'sale', 'disposal', 'adjustment')),
  transaction_date DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  vat_rate DECIMAL(5,2) DEFAULT NULL, -- VAT rate for this transaction
  vat_amount DECIMAL(10,2) DEFAULT NULL, -- VAT amount for this transaction
  net_amount DECIMAL(10,2) DEFAULT NULL, -- Amount excluding VAT
  description TEXT,
  buyer_seller VARCHAR(255),
  reference_number VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for asset tables
CREATE INDEX IF NOT EXISTS idx_assets_user ON assets(user_id);
CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_asset_transactions_asset ON asset_transactions(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_transactions_user ON asset_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_asset_transactions_type ON asset_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_asset_transactions_date ON asset_transactions(transaction_date);

-- Add VAT and depreciation columns to existing assets table
ALTER TABLE assets 
ADD COLUMN IF NOT EXISTS vat_rate DECIMAL(5,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS vat_amount DECIMAL(10,2) DEFAULT NULL;

-- Add VAT columns to existing asset_transactions table
ALTER TABLE asset_transactions 
ADD COLUMN IF NOT EXISTS vat_rate DECIMAL(5,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS vat_amount DECIMAL(10,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS net_amount DECIMAL(10,2) DEFAULT NULL;

-- Insert sample data for initial setup
INSERT INTO categories (name, description) VALUES 
  ('Electronics', 'Electronic devices and accessories'),
  ('Clothing', 'Apparel and fashion items'),
  ('Food & Beverage', 'Food products and beverages'),
  ('Home & Garden', 'Home improvement and garden supplies'),
  ('Health & Beauty', 'Healthcare and beauty products'),
  ('Sports & Outdoors', 'Sports equipment and outdoor gear'),
  ('Books & Media', 'Books, magazines, and media'),
  ('Toys & Games', 'Toys and games for all ages'),
  ('Automotive', 'Automotive parts and accessories'),
  ('Other', 'Miscellaneous items');

INSERT INTO users (username, email, first_name, last_name, role, is_active) VALUES 
  ('admin', 'admin@pos.com', 'Admin', 'User', 'admin', true),
  ('manager', 'manager@pos.com', 'Manager', 'User', 'manager', true),
  ('cashier1', 'cashier1@pos.com', 'Cashier', 'One', 'cashier', true),
  ('cashier2', 'cashier2@pos.com', 'Cashier', 'Two', 'cashier', true);

-- Insert sample products (using DO block to handle subquery safely)
DO $$
DECLARE
  electronics_id UUID;
  home_garden_id UUID;
  sports_outdoors_id UUID;
BEGIN
  SELECT id INTO electronics_id FROM categories WHERE name = 'Electronics' LIMIT 1;
  SELECT id INTO home_garden_id FROM categories WHERE name = 'Home & Garden' LIMIT 1;
  SELECT id INTO sports_outdoors_id FROM categories WHERE name = 'Sports & Outdoors' LIMIT 1;
  
  INSERT INTO products (name, category_id, barcode, sku, selling_price, cost_price, stock_quantity) VALUES 
    ('Wireless Headphones', electronics_id, '123456789012', 'WH-001', 99.99, 45.00, 25),
    ('Coffee Maker', home_garden_id, '234567890123', 'CM-002', 79.99, 35.00, 15),
    ('Running Shoes', sports_outdoors_id, '345678901234', 'RS-003', 129.99, 65.00, 30);
END $$;

-- Insert sample customers
INSERT INTO customers (first_name, last_name, email, phone) VALUES 
  ('John', 'Smith', 'john@example.com', '(555) 123-4567'),
  ('Sarah', 'Johnson', 'sarah@example.com', '(555) 987-6543'),
  ('Mike', 'Williams', 'mike@example.com', '(555) 456-7890');

-- Insert sample suppliers
INSERT INTO suppliers (name, contact_person, email, phone) VALUES 
  ('Tech Supplies Inc.', 'David Wilson', 'david@techsupplies.com', '(555) 111-2222'),
  ('Home Goods Co.', 'Lisa Anderson', 'lisa@homegoods.com', '(555) 333-4444'),
  ('Sports Equipment Ltd.', 'Mark Thompson', 'mark@sportsequip.com', '(555) 555-6666');