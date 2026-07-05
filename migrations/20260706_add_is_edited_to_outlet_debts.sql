-- Add is_edited column to outlet_debts table
-- This tracks whether a debt transaction has been edited after creation

-- Add the column
ALTER TABLE outlet_debts
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE;

-- Add comment
COMMENT ON COLUMN outlet_debts.is_edited IS 'Flag indicating if the debt transaction has been edited after creation';

-- Set default value for existing records
UPDATE outlet_debts SET is_edited = FALSE WHERE is_edited IS NULL;
