-- Migration: Add payment_breakdown column to supplier_purchase_notes
-- Date: 2026-07-30
-- Description: Adds JSONB column for split payment support (cash, bank, credit).
--              Keeps mode_of_payment for backward compatibility.

ALTER TABLE supplier_purchase_notes ADD COLUMN IF NOT EXISTS payment_breakdown JSONB DEFAULT '[]'::jsonb;
