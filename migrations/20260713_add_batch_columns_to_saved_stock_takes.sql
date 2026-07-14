-- Migration: Add batch_godowns column to saved_stock_takes for multi-godown batch stock takes
-- Date: 2026-07-13

-- Add batch_godowns JSONB column to store list of godowns in a batch stock take
ALTER TABLE saved_stock_takes ADD COLUMN IF NOT EXISTS batch_godowns JSONB;
