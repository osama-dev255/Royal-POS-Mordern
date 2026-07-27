-- Migration: Add zone_id column to stock_movements table
-- Purpose: Track which zone within a godown the movement relates to
-- Date: 2026-07-27

ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES godown_zones(id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_zone ON stock_movements(zone_id);
