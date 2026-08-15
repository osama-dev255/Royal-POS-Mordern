-- Migration: Add INTERNAL_CONSUMPTION to stock_movements reference_type CHECK constraint
-- Purpose: Allow Internal Consumption Notes to record stock movements in the audit ledger
-- Date: 2026-08-15

-- Drop the existing CHECK constraint on reference_type
ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS stock_movements_reference_type_check;

-- Re-create the constraint with INTERNAL_CONSUMPTION included
ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_reference_type_check
    CHECK (reference_type IN (
        'GRN',
        'DELIVERY_NOTE',
        'SALE',
        'STOCK_TAKE',
        'ADJUSTMENT',
        'TRANSFER',
        'RETURN',
        'INTERNAL_CONSUMPTION'
    ));
