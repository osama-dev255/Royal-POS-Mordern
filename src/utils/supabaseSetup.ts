// This file contains the SQL commands to set up the Supabase database schema
// You can run these commands in the Supabase SQL editor

export const supabaseSchemaSQL = `
-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  stock INTEGER NOT NULL DEFAULT 0,
  barcode VARCHAR(50) UNIQUE,
  sku VARCHAR(50) UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  loyalty_points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sales table
CREATE TABLE IF NOT EXISTS sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id),
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  payment_method VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sale_items table
CREATE TABLE IF NOT EXISTS sale_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create purchase_orders table
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID REFERENCES suppliers(id),
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'cancelled')),
  expected_delivery_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create purchase_order_items table
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_cost DECIMAL(10,2) NOT NULL,
  total_cost DECIMAL(10,2) NOT NULL,
  received_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  category VARCHAR(100) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tax_records table for better tax tracking
CREATE TABLE IF NOT EXISTS tax_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tax_type VARCHAR(50) NOT NULL, -- income_tax, sales_tax, property_tax, etc.
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  taxable_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  tax_rate DECIMAL(5,4) NOT NULL, -- e.g., 0.18 for 18%
  tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'filed')),
  payment_date DATE,
  reference_number VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

-- Enable Row Level Security (RLS) for all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_records ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust as needed for your security requirements)
CREATE POLICY "Enable read access for all users" ON products FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON products FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON products FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON customers FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON customers FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON customers FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON sales FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON sales FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON sales FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON sales FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON sale_items FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON sale_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON sale_items FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON sale_items FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON suppliers FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON suppliers FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON suppliers FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON suppliers FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON purchase_orders FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON purchase_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON purchase_orders FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON purchase_orders FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON purchase_order_items FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON purchase_order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON purchase_order_items FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON purchase_order_items FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON expenses FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON expenses FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON expenses FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON tax_records FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON tax_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON tax_records FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON tax_records FOR DELETE USING (true);
`;