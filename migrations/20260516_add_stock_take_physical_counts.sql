-- Migration: Add physical counts tracking for Stock Take
-- Date: 2026-05-16
-- Purpose: Store physical counts in database for audit trail and multi-user support
-- Note: Physical counts are still stored in localStorage for offline support (hybrid approach)

-- Create table for tracking physical counts with audit trail
CREATE TABLE IF NOT EXISTS stock_take_physical_counts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    outlet_id UUID NOT NULL,
    stock_take_number VARCHAR(100) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    product_sku VARCHAR(100),
    physical_count INTEGER NOT NULL DEFAULT 0,
    available_stock INTEGER NOT NULL DEFAULT 0,
    calculated_sold INTEGER NOT NULL DEFAULT 0,
    unit_cost DECIMAL(12,2) DEFAULT 0,
    unit_price DECIMAL(12,2) DEFAULT 0,
    counted_by UUID REFERENCES auth.users(id),
    counted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicate counts for same product in same stock take
    UNIQUE(outlet_id, stock_take_number, product_name)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stock_take_counts_outlet ON stock_take_physical_counts(outlet_id);
CREATE INDEX IF NOT EXISTS idx_stock_take_counts_number ON stock_take_physical_counts(stock_take_number);
CREATE INDEX IF NOT EXISTS idx_stock_take_counts_product ON stock_take_physical_counts(product_name);
CREATE INDEX IF NOT EXISTS idx_stock_take_counts_counted_by ON stock_take_physical_counts(counted_by);
CREATE INDEX IF NOT EXISTS idx_stock_take_counts_counted_at ON stock_take_physical_counts(counted_at);

-- Enable Row Level Security
ALTER TABLE stock_take_physical_counts ENABLE ROW LEVEL SECURITY;

-- Create policies for access control
CREATE POLICY "Enable read access for all users" ON stock_take_physical_counts 
    FOR SELECT USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON stock_take_physical_counts 
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON stock_take_physical_counts 
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Add comments
COMMENT ON TABLE stock_take_physical_counts IS 'Tracks physical inventory counts with full audit trail';
COMMENT ON COLUMN stock_take_physical_counts.counted_by IS 'User who performed the count';
COMMENT ON COLUMN stock_take_physical_counts.counted_at IS 'Timestamp when count was performed';

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
