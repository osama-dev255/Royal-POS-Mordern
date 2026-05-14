-- Migration: Add debt_payment_amount column to outlet_debts table
-- Date: 2026-05-13
-- Description: Tracks amount paid toward previous debts during a new transaction

-- Add debt_payment_amount column to outlet_debts table
ALTER TABLE outlet_debts 
ADD COLUMN IF NOT EXISTS debt_payment_amount DECIMAL(10,2) DEFAULT 0;

-- Add comment to document the column
COMMENT ON COLUMN outlet_debts.debt_payment_amount IS 'Amount paid toward previous debts during this transaction (separate from amount_paid which is for current debt)';
