-- Migration to add voucher_number column to expenses table
-- Links individual expense records to their source expense voucher for PDF attachment lookup
-- Date: 2026-07-26

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS voucher_number VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_expenses_voucher_number ON expenses(voucher_number);
