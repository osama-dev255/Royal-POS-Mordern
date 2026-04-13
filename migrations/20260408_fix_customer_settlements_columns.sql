-- Migration: Fix customer_settlements table - Add all missing columns
-- Date: 2026-04-08
-- Description: Ensures customer_settlements table has all required columns

-- ==========================================
-- Add Missing Columns to customer_settlements
-- ==========================================

-- Add outlet_id if missing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_settlements' AND column_name = 'outlet_id'
  ) THEN
    ALTER TABLE customer_settlements ADD COLUMN outlet_id UUID;
    RAISE NOTICE 'Added outlet_id column';
  END IF;
END $$;

-- Add invoice_number if missing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_settlements' AND column_name = 'invoice_number'
  ) THEN
    ALTER TABLE customer_settlements ADD COLUMN invoice_number VARCHAR(100);
    RAISE NOTICE 'Added invoice_number column';
  END IF;
END $$;

-- Add settlement_date if missing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_settlements' AND column_name = 'settlement_date'
  ) THEN
    ALTER TABLE customer_settlements ADD COLUMN settlement_date DATE DEFAULT CURRENT_DATE;
    RAISE NOTICE 'Added settlement_date column';
  END IF;
END $$;

-- Add customer_name if missing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_settlements' AND column_name = 'customer_name'
  ) THEN
    ALTER TABLE customer_settlements ADD COLUMN customer_name VARCHAR(255);
    RAISE NOTICE 'Added customer_name column';
  END IF;
END $$;

-- Add payment_amount if missing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_settlements' AND column_name = 'payment_amount'
  ) THEN
    ALTER TABLE customer_settlements ADD COLUMN payment_amount DECIMAL(10, 2) DEFAULT 0;
    RAISE NOTICE 'Added payment_amount column';
  END IF;
END $$;

-- Add payment_method if missing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_settlements' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE customer_settlements ADD COLUMN payment_method VARCHAR(50);
    RAISE NOTICE 'Added payment_method column';
  END IF;
END $$;

-- Add previous_balance if missing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_settlements' AND column_name = 'previous_balance'
  ) THEN
    ALTER TABLE customer_settlements ADD COLUMN previous_balance DECIMAL(10, 2) DEFAULT 0;
    RAISE NOTICE 'Added previous_balance column';
  END IF;
END $$;

-- Add new_balance if missing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_settlements' AND column_name = 'new_balance'
  ) THEN
    ALTER TABLE customer_settlements ADD COLUMN new_balance DECIMAL(10, 2) DEFAULT 0;
    RAISE NOTICE 'Added new_balance column';
  END IF;
END $$;

-- Add notes if missing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_settlements' AND column_name = 'notes'
  ) THEN
    ALTER TABLE customer_settlements ADD COLUMN notes TEXT;
    RAISE NOTICE 'Added notes column';
  END IF;
END $$;

-- Add customer_id if missing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_settlements' AND column_name = 'customer_id'
  ) THEN
    ALTER TABLE customer_settlements ADD COLUMN customer_id UUID;
    RAISE NOTICE 'Added customer_id column';
  END IF;
END $$;

-- Add created_by if missing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_settlements' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE customer_settlements ADD COLUMN created_by UUID;
    RAISE NOTICE 'Added created_by column';
  END IF;
END $$;

-- Add created_at if missing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_settlements' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE customer_settlements ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    RAISE NOTICE 'Added created_at column';
  END IF;
END $$;

-- Add updated_at if missing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_settlements' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE customer_settlements ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    RAISE NOTICE 'Added updated_at column';
  END IF;
END $$;

-- ==========================================
-- Add Foreign Key Constraints
-- ==========================================

-- Add outlet_id foreign key
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'customer_settlements_outlet_id_fkey'
  ) THEN
    ALTER TABLE customer_settlements 
    ADD CONSTRAINT customer_settlements_outlet_id_fkey 
    FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added outlet_id foreign key';
  END IF;
END $$;

-- Add customer_id foreign key
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'customer_settlements_customer_id_fkey'
  ) THEN
    ALTER TABLE customer_settlements 
    ADD CONSTRAINT customer_settlements_customer_id_fkey 
    FOREIGN KEY (customer_id) REFERENCES outlet_customers(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added customer_id foreign key';
  END IF;
END $$;

-- ==========================================
-- Add Indexes
-- ==========================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_customer_settlements_outlet_id') THEN
    CREATE INDEX idx_customer_settlements_outlet_id ON customer_settlements(outlet_id);
    RAISE NOTICE 'Added outlet_id index';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_customer_settlements_customer_id') THEN
    CREATE INDEX idx_customer_settlements_customer_id ON customer_settlements(customer_id);
    RAISE NOTICE 'Added customer_id index';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_customer_settlements_date') THEN
    CREATE INDEX idx_customer_settlements_date ON customer_settlements(settlement_date);
    RAISE NOTICE 'Added settlement_date index';
  END IF;
END $$;

-- ==========================================
-- Verify Table Structure
-- ==========================================
DO $$
DECLARE
  col_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO col_count
  FROM information_schema.columns
  WHERE table_name = 'customer_settlements';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ customer_settlements table updated!';
  RAISE NOTICE 'Total columns: %', col_count;
  RAISE NOTICE '========================================';
END $$;

-- Display all columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'customer_settlements'
ORDER BY ordinal_position;
