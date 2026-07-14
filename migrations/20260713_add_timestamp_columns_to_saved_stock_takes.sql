-- Migration: Add timestamp column to saved_stock_takes
-- Date: 2026-07-13

-- Add timestamp column to capture exact time of stock take
ALTER TABLE saved_stock_takes ADD COLUMN IF NOT EXISTS stock_take_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add timestamp columns for verification tracking
ALTER TABLE saved_stock_takes ADD COLUMN IF NOT EXISTS counted_by_timestamp TIMESTAMP WITH TIME ZONE;
ALTER TABLE saved_stock_takes ADD COLUMN IF NOT EXISTS verified_by_timestamp TIMESTAMP WITH TIME ZONE;
