-- Migration: Remove Stock Take entries from stock_movements ledger
-- Purpose: Stock Takes performed in Registered Outlets (Sales Management) should not
--          affect the general Stock Movements ledger. Stock Take data remains fully
--          preserved in saved_stock_takes and stock_take_physical_counts tables.
-- Date: 2026-08-24

-- Remove all existing Stock Take adjustment entries from the stock_movements ledger
DELETE FROM stock_movements WHERE reference_type = 'STOCK_TAKE';

-- Index to support efficient filtering by reference_type
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference_type ON stock_movements(reference_type);
