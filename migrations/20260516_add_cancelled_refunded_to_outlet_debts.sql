-- Migration: Add 'cancelled' and 'refunded' to outlet_debts payment_status
-- This allows debt records to be marked as cancelled or refunded

-- Step 1: Drop the existing CHECK constraint
ALTER TABLE outlet_debts 
DROP CONSTRAINT IF EXISTS outlet_debts_payment_status_check;

-- Step 2: Add new CHECK constraint with all status values
ALTER TABLE outlet_debts 
ADD CONSTRAINT outlet_debts_payment_status_check 
CHECK (payment_status IN ('paid', 'partial', 'unpaid', 'cancelled', 'refunded'));

-- Step 3: Verify the constraint was added
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'outlet_debts'::regclass
  AND contype = 'c';

-- Expected result: 
-- outlet_debts_payment_status_check | CHECK ((payment_status = ANY (ARRAY['paid'::character varying, 'partial'::character varying, 'unpaid'::character varying, 'cancelled'::character varying, 'refunded'::character varying])))

COMMENT ON CONSTRAINT outlet_debts_payment_status_check ON outlet_debts IS 
'Valid payment statuses: paid, partial, unpaid, cancelled, refunded';
