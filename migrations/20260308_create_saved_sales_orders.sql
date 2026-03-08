-- Migration: Add support for Saved Sales Orders
-- Date: 2026-03-08
-- Description: This migration ensures that the sales and sale_items tables 
--              are properly configured to support the Saved Sales Orders feature.

-- =====================================================
-- STEP 1: Ensure sales table has required columns
-- =====================================================

-- Check if sale_status column exists, add if not
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sales' 
    AND column_name = 'sale_status'
  ) THEN
    ALTER TABLE public.sales ADD COLUMN sale_status VARCHAR(20) NOT NULL DEFAULT 'pending';
  END IF;
END $$;

-- Check if items column exists (for tracking item count), add if not
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sales' 
    AND column_name = 'items'
  ) THEN
    ALTER TABLE public.sales ADD COLUMN items INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- =====================================================
-- STEP 2: Ensure sale_items table has required columns
-- =====================================================

-- Check if product_name column exists (for denormalized product data), add if not
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sale_items' 
    AND column_name = 'product_name'
  ) THEN
    ALTER TABLE public.sale_items ADD COLUMN product_name VARCHAR(255);
  END IF;
END $$;

-- Check if unit column exists, add if not
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sale_items' 
    AND column_name = 'unit'
  ) THEN
    ALTER TABLE public.sale_items ADD COLUMN unit VARCHAR(50);
  END IF;
END $$;

-- =====================================================
-- STEP 3: Create indexes for better query performance
-- =====================================================

-- Index on sale_status for filtering pending/completed/cancelled orders
CREATE INDEX IF NOT EXISTS idx_sales_sale_status ON public.sales(sale_status);

-- Index on sale_date for date-based queries
CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON public.sales(sale_date);

-- Composite index for status and date (common query pattern)
CREATE INDEX IF NOT EXISTS idx_sales_status_date ON public.sales(sale_status, sale_date);

-- Index on sale_items for joining with sales
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items(sale_id);

-- =====================================================
-- STEP 4: Update RLS policies (if RLS is enabled)
-- =====================================================

-- Note: This migration assumes RLS policies are already in place from previous migrations.
-- If you're not using RLS, you can skip this step.

-- Ensure authenticated users can read their own sales orders
-- (Admins can read all, regular users can only read their own)

-- =====================================================
-- STEP 5: Add comments to document the feature
-- =====================================================

COMMENT ON TABLE public.sales IS 'Stores sales transactions including pending sales orders and completed sales';
COMMENT ON COLUMN public.sales.sale_status IS 'Status of the sale: pending (order created but not fulfilled), completed (fulfilled), or cancelled';
COMMENT ON COLUMN public.sales.items IS 'Total number of items in this sale';
COMMENT ON TABLE public.sale_items IS 'Individual line items for each sale, linking products to sales';
COMMENT ON COLUMN public.sale_items.product_name IS 'Denormalized product name for historical record';
COMMENT ON COLUMN public.sale_items.unit IS 'Unit of measurement (e.g., pcs, kg, L)';

-- =====================================================
-- Migration Complete
-- =====================================================

-- Display completion message
DO $$
BEGIN
  RAISE NOTICE 'Saved Sales Orders migration completed successfully!';
  RAISE NOTICE 'The sales and sale_items tables are now properly configured.';
END $$;
