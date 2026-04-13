-- Migration: Create receipt tables for outlet receipts
-- Date: 2026-04-08
-- Description: Creates tables for commission receipts, other receipts, and customer settlements

-- ==========================================
-- 1. Commission Receipts Table
-- ==========================================
CREATE TABLE IF NOT EXISTS commission_receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  outlet_id UUID NOT NULL,
  invoice_number VARCHAR(100) NOT NULL,
  receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
  customer_name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  payment_method VARCHAR(50),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint separately
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'commission_receipts_outlet_id_fkey'
  ) THEN
    ALTER TABLE commission_receipts 
    ADD CONSTRAINT commission_receipts_outlet_id_fkey 
    FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Index for faster queries
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_commission_receipts_outlet_id') THEN
    CREATE INDEX idx_commission_receipts_outlet_id ON commission_receipts(outlet_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_commission_receipts_date') THEN
    CREATE INDEX idx_commission_receipts_date ON commission_receipts(receipt_date);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_commission_receipts_customer') THEN
    CREATE INDEX idx_commission_receipts_customer ON commission_receipts(customer_name);
  END IF;
END $$;

-- RLS Policies
ALTER TABLE commission_receipts ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage all commission receipts" 
  ON commission_receipts 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Users can view commission receipts for their outlet
CREATE POLICY "Users can view commission receipts" 
  ON commission_receipts 
  FOR SELECT 
  USING (true);

-- Users can insert commission receipts
CREATE POLICY "Users can insert commission receipts" 
  ON commission_receipts 
  FOR INSERT 
  WITH CHECK (true);

-- Users can update their own commission receipts
CREATE POLICY "Users can update commission receipts" 
  ON commission_receipts 
  FOR UPDATE 
  USING (true);

-- Users can delete commission receipts
CREATE POLICY "Users can delete commission receipts" 
  ON commission_receipts 
  FOR DELETE 
  USING (true);

-- ==========================================
-- 2. Other Receipts Table
-- ==========================================
CREATE TABLE IF NOT EXISTS other_receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  outlet_id UUID NOT NULL,
  invoice_number VARCHAR(100) NOT NULL,
  receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  payment_method VARCHAR(50),
  receipt_type VARCHAR(50) DEFAULT 'general',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint separately
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'other_receipts_outlet_id_fkey'
  ) THEN
    ALTER TABLE other_receipts 
    ADD CONSTRAINT other_receipts_outlet_id_fkey 
    FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Index for faster queries
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_other_receipts_outlet_id') THEN
    CREATE INDEX idx_other_receipts_outlet_id ON other_receipts(outlet_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_other_receipts_date') THEN
    CREATE INDEX idx_other_receipts_date ON other_receipts(receipt_date);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_other_receipts_type') THEN
    CREATE INDEX idx_other_receipts_type ON other_receipts(receipt_type);
  END IF;
END $$;

-- RLS Policies
ALTER TABLE other_receipts ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage all other receipts" 
  ON other_receipts 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Users can view other receipts
CREATE POLICY "Users can view other receipts" 
  ON other_receipts 
  FOR SELECT 
  USING (true);

-- Users can insert other receipts
CREATE POLICY "Users can insert other receipts" 
  ON other_receipts 
  FOR INSERT 
  WITH CHECK (true);

-- Users can update other receipts
CREATE POLICY "Users can update other receipts" 
  ON other_receipts 
  FOR UPDATE 
  USING (true);

-- Users can delete other receipts
CREATE POLICY "Users can delete other receipts" 
  ON other_receipts 
  FOR DELETE 
  USING (true);

-- ==========================================
-- 3. Customer Settlements Table
-- ==========================================
-- Check if table exists and has the right structure
DO $$ 
BEGIN
  -- If table doesn't exist, create it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'customer_settlements'
  ) THEN
    CREATE TABLE customer_settlements (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      outlet_id UUID NOT NULL,
      customer_id UUID,
      invoice_number VARCHAR(100) NOT NULL,
      settlement_date DATE NOT NULL DEFAULT CURRENT_DATE,
      customer_name VARCHAR(255) NOT NULL,
      payment_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
      payment_method VARCHAR(50) NOT NULL,
      previous_balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
      new_balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
      notes TEXT,
      created_by UUID,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    RAISE NOTICE 'Created customer_settlements table';
  ELSE
    -- Table exists, check if outlet_id column exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'customer_settlements' AND column_name = 'outlet_id'
    ) THEN
      -- Add outlet_id column
      ALTER TABLE customer_settlements ADD COLUMN outlet_id UUID;
      RAISE NOTICE 'Added outlet_id column to customer_settlements';
    END IF;
  END IF;
END $$;

-- Add foreign key constraints separately
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'customer_settlements_outlet_id_fkey'
  ) THEN
    ALTER TABLE customer_settlements 
    ADD CONSTRAINT customer_settlements_outlet_id_fkey 
    FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added outlet_id foreign key to customer_settlements';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'customer_settlements_customer_id_fkey'
  ) THEN
    ALTER TABLE customer_settlements 
    ADD CONSTRAINT customer_settlements_customer_id_fkey 
    FOREIGN KEY (customer_id) REFERENCES outlet_customers(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added customer_id foreign key to customer_settlements';
  END IF;
END $$;

-- Index for faster queries
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_customer_settlements_outlet_id') THEN
    CREATE INDEX idx_customer_settlements_outlet_id ON customer_settlements(outlet_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_customer_settlements_customer_id') THEN
    CREATE INDEX idx_customer_settlements_customer_id ON customer_settlements(customer_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_customer_settlements_date') THEN
    CREATE INDEX idx_customer_settlements_date ON customer_settlements(settlement_date);
  END IF;
END $$;

-- RLS Policies
ALTER TABLE customer_settlements ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage all customer settlements" 
  ON customer_settlements 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Users can view customer settlements
CREATE POLICY "Users can view customer settlements" 
  ON customer_settlements 
  FOR SELECT 
  USING (true);

-- Users can insert customer settlements
CREATE POLICY "Users can insert customer settlements" 
  ON customer_settlements 
  FOR INSERT 
  WITH CHECK (true);

-- Users can update customer settlements
CREATE POLICY "Users can update customer settlements" 
  ON customer_settlements 
  FOR UPDATE 
  USING (true);

-- Users can delete customer settlements
CREATE POLICY "Users can delete customer settlements" 
  ON customer_settlements 
  FOR DELETE 
  USING (true);

-- ==========================================
-- Success Message
-- ==========================================
DO $$
BEGIN
  RAISE NOTICE '✅ Receipt tables created successfully';
  RAISE NOTICE '  - commission_receipts';
  RAISE NOTICE '  - other_receipts';
  RAISE NOTICE '  - customer_settlements';
END $$;
