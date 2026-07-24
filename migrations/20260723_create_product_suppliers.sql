-- Migration: Create product_suppliers junction table
-- Date: 2026-07-23
-- Purpose: Enable many-to-many relationship between products and suppliers
--          so that a product can come from multiple suppliers

-- Create the junction table
CREATE TABLE IF NOT EXISTS product_suppliers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, supplier_id)
);

-- Enable Row Level Security
ALTER TABLE product_suppliers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-runnability)
DROP POLICY IF EXISTS "Allow public read access on product_suppliers" ON product_suppliers;
DROP POLICY IF EXISTS "Allow authenticated insert on product_suppliers" ON product_suppliers;
DROP POLICY IF EXISTS "Allow authenticated update on product_suppliers" ON product_suppliers;
DROP POLICY IF EXISTS "Allow authenticated delete on product_suppliers" ON product_suppliers;

-- RLS Policies
CREATE POLICY "Allow public read access on product_suppliers"
  ON product_suppliers FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated insert on product_suppliers"
  ON product_suppliers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update on product_suppliers"
  ON product_suppliers FOR UPDATE
  USING (true);

CREATE POLICY "Allow authenticated delete on product_suppliers"
  ON product_suppliers FOR DELETE
  USING (true);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_product_suppliers_product_id ON product_suppliers(product_id);
CREATE INDEX IF NOT EXISTS idx_product_suppliers_supplier_id ON product_suppliers(supplier_id);
