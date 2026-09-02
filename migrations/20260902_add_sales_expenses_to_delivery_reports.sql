-- Migration: Add total_sales_amount and total_expenses to saved_delivery_in_reports
-- Date: 2026-09-02

ALTER TABLE saved_delivery_in_reports ADD COLUMN IF NOT EXISTS total_sales_amount NUMERIC DEFAULT 0;
ALTER TABLE saved_delivery_in_reports ADD COLUMN IF NOT EXISTS total_expenses NUMERIC DEFAULT 0;
