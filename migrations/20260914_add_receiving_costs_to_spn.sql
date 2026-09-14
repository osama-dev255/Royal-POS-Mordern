-- Add receiving_costs column to supplier_purchase_notes table
-- Stores an array of {id, description, amount} as JSON

ALTER TABLE supplier_purchase_notes
ADD COLUMN IF NOT EXISTS receiving_costs JSONB DEFAULT '[]'::jsonb;

-- Backfill existing rows with empty array
UPDATE supplier_purchase_notes
SET receiving_costs = '[]'::jsonb
WHERE receiving_costs IS NULL;

COMMENT ON COLUMN supplier_purchase_notes.receiving_costs IS 'Array of receiving cost objects: [{id, description, amount}]';
