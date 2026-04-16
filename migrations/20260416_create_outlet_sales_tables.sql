-- Migration: Create dedicated tables for Saved Sales by payment method
-- Date: 2026-04-16
-- Purpose: Replace shared saved_sales table with dedicated tables for each payment method
-- Benefits: Better performance, easier querying, dedicated features per payment type

-- ============================================
-- 1. DROP EXISTING TABLES (if rebuilding)
-- ============================================
-- Uncomment these lines if you need to rebuild the tables:
-- DROP TABLE IF EXISTS outlet_mobile_sale_items CASCADE;
-- DROP TABLE IF EXISTS outlet_card_sale_items CASCADE;
-- DROP TABLE IF EXISTS outlet_cash_sale_items CASCADE;
-- DROP TABLE IF EXISTS outlet_mobile_sales CASCADE;
-- DROP TABLE IF EXISTS outlet_card_sales CASCADE;
-- DROP TABLE IF EXISTS outlet_cash_sales CASCADE;

-- ============================================
-- 2. CREATE outlet_cash_sales TABLE
-- ============================================
CREATE TABLE outlet_cash_sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES outlet_customers(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  sale_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  change_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  payment_method VARCHAR(20) NOT NULL DEFAULT 'cash',
  notes TEXT,
  reference_number VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. CREATE outlet_cash_sale_items TABLE
-- ============================================
CREATE TABLE outlet_cash_sale_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES outlet_cash_sales(id) ON DELETE CASCADE,
  product_id UUID,
  product_name VARCHAR(255),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. CREATE outlet_card_sales TABLE
-- ============================================
CREATE TABLE outlet_card_sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES outlet_customers(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  sale_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  card_type VARCHAR(50), -- 'visa', 'mastercard', 'amex', etc.
  card_last_four VARCHAR(4),
  transaction_id VARCHAR(100),
  payment_method VARCHAR(20) NOT NULL DEFAULT 'card',
  notes TEXT,
  reference_number VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 5. CREATE outlet_card_sale_items TABLE
-- ============================================
CREATE TABLE outlet_card_sale_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES outlet_card_sales(id) ON DELETE CASCADE,
  product_id UUID,
  product_name VARCHAR(255),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 6. CREATE outlet_mobile_sales TABLE
-- ============================================
CREATE TABLE outlet_mobile_sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES outlet_customers(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  sale_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  mobile_provider VARCHAR(50), -- 'M-Pesa', 'Tigo Pesa', 'Airtel Money', etc.
  mobile_number VARCHAR(20),
  transaction_id VARCHAR(100),
  payment_method VARCHAR(20) NOT NULL DEFAULT 'mobile',
  notes TEXT,
  reference_number VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 7. CREATE outlet_mobile_sale_items TABLE
-- ============================================
CREATE TABLE outlet_mobile_sale_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES outlet_mobile_sales(id) ON DELETE CASCADE,
  product_id UUID,
  product_name VARCHAR(255),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 8. CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Cash Sales Indexes
CREATE INDEX idx_outlet_cash_sales_outlet_id ON outlet_cash_sales(outlet_id);
CREATE INDEX idx_outlet_cash_sales_customer_id ON outlet_cash_sales(customer_id);
CREATE INDEX idx_outlet_cash_sales_invoice ON outlet_cash_sales(invoice_number);
CREATE INDEX idx_outlet_cash_sales_date ON outlet_cash_sales(sale_date DESC);
CREATE INDEX idx_outlet_cash_sales_created ON outlet_cash_sales(created_at DESC);

-- Cash Sale Items Indexes
CREATE INDEX idx_outlet_cash_sale_items_sale_id ON outlet_cash_sale_items(sale_id);
CREATE INDEX idx_outlet_cash_sale_items_product ON outlet_cash_sale_items(product_id);

-- Card Sales Indexes
CREATE INDEX idx_outlet_card_sales_outlet_id ON outlet_card_sales(outlet_id);
CREATE INDEX idx_outlet_card_sales_customer_id ON outlet_card_sales(customer_id);
CREATE INDEX idx_outlet_card_sales_invoice ON outlet_card_sales(invoice_number);
CREATE INDEX idx_outlet_card_sales_date ON outlet_card_sales(sale_date DESC);
CREATE INDEX idx_outlet_card_sales_created ON outlet_card_sales(created_at DESC);
CREATE INDEX idx_outlet_card_sales_transaction ON outlet_card_sales(transaction_id);

-- Card Sale Items Indexes
CREATE INDEX idx_outlet_card_sale_items_sale_id ON outlet_card_sale_items(sale_id);
CREATE INDEX idx_outlet_card_sale_items_product ON outlet_card_sale_items(product_id);

-- Mobile Sales Indexes
CREATE INDEX idx_outlet_mobile_sales_outlet_id ON outlet_mobile_sales(outlet_id);
CREATE INDEX idx_outlet_mobile_sales_customer_id ON outlet_mobile_sales(customer_id);
CREATE INDEX idx_outlet_mobile_sales_invoice ON outlet_mobile_sales(invoice_number);
CREATE INDEX idx_outlet_mobile_sales_date ON outlet_mobile_sales(sale_date DESC);
CREATE INDEX idx_outlet_mobile_sales_created ON outlet_mobile_sales(created_at DESC);
CREATE INDEX idx_outlet_mobile_sales_transaction ON outlet_mobile_sales(transaction_id);

-- Mobile Sale Items Indexes
CREATE INDEX idx_outlet_mobile_sale_items_sale_id ON outlet_mobile_sale_items(sale_id);
CREATE INDEX idx_outlet_mobile_sale_items_product ON outlet_mobile_sale_items(product_id);

-- ============================================
-- 9. ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE outlet_cash_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlet_cash_sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlet_card_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlet_card_sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlet_mobile_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlet_mobile_sale_items ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 10. CREATE RLS POLICIES (Allow all for now)
-- ============================================

-- Cash Sales Policies
CREATE POLICY "Enable all access for outlet_cash_sales" ON outlet_cash_sales FOR ALL USING (true);
CREATE POLICY "Enable all access for outlet_cash_sale_items" ON outlet_cash_sale_items FOR ALL USING (true);

-- Card Sales Policies
CREATE POLICY "Enable all access for outlet_card_sales" ON outlet_card_sales FOR ALL USING (true);
CREATE POLICY "Enable all access for outlet_card_sale_items" ON outlet_card_sale_items FOR ALL USING (true);

-- Mobile Sales Policies
CREATE POLICY "Enable all access for outlet_mobile_sales" ON outlet_mobile_sales FOR ALL USING (true);
CREATE POLICY "Enable all access for outlet_mobile_sale_items" ON outlet_mobile_sale_items FOR ALL USING (true);

-- ============================================
-- 11. ADD COMMENTS
-- ============================================
COMMENT ON TABLE outlet_cash_sales IS 'Stores cash payment sales transactions';
COMMENT ON TABLE outlet_card_sales IS 'Stores card payment sales transactions';
COMMENT ON TABLE outlet_mobile_sales IS 'Stores mobile money payment sales transactions';

COMMENT ON COLUMN outlet_card_sales.card_type IS 'Type of card used (visa, mastercard, amex, etc.)';
COMMENT ON COLUMN outlet_card_sales.card_last_four IS 'Last 4 digits of card number';
COMMENT ON COLUMN outlet_card_sales.transaction_id IS 'Payment gateway transaction ID';

COMMENT ON COLUMN outlet_mobile_sales.mobile_provider IS 'Mobile money provider (M-Pesa, Tigo Pesa, Airtel Money, etc.)';
COMMENT ON COLUMN outlet_mobile_sales.mobile_number IS 'Customer mobile number';
COMMENT ON COLUMN outlet_mobile_sales.transaction_id IS 'Mobile money transaction ID';

-- Migration complete!
