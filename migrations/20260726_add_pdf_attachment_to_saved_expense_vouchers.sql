-- Migration to add PDF attachment columns to saved_expense_vouchers
-- For storing uploaded PDF files (base64) with their original filenames
-- Date: 2026-07-26

ALTER TABLE saved_expense_vouchers ADD COLUMN IF NOT EXISTS pdf_attachment TEXT;
ALTER TABLE saved_expense_vouchers ADD COLUMN IF NOT EXISTS pdf_attachment_name VARCHAR(255);
