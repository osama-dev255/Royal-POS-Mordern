-- ============================================
-- Add Derived Status View to Supplier Ledger
-- Date: 2026-09-17
-- Description: No schema changes needed — ledger entry statuses
--              are derived at the frontend from their source documents:
--              • grn_received       → saved_grns.status
--              • inventory_payment  → expenses.approval_status
--              • settlement         → supplier_payment_vouchers.status
--              • adjustment / refund → N/A (manual entries)
--
-- This migration is intentionally empty. It exists as a marker
-- so the migration history reflects the feature addition.
-- ============================================

SELECT 1;
