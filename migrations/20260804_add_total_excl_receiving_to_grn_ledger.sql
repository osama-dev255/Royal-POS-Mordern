-- ============================================
-- Add total_excl_receiving column & update supplier ledger triggers
-- Date: 2026-08-04
-- Problem: CR amount in supplier_ledger included receiving costs,
--          but should only reflect the Total Excl. (base item cost).
-- Fix:     Store total_excl_receiving on saved_grns and use it in
--          all GRN triggers that create/update supplier ledger entries.
-- ============================================

-- 1. ADD COLUMN & BACKFILL
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'saved_grns') THEN

    IF NOT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_name = 'saved_grns' AND column_name = 'total_excl_receiving'
    ) THEN
      ALTER TABLE saved_grns ADD COLUMN total_excl_receiving NUMERIC DEFAULT 0;
      RAISE NOTICE 'Added total_excl_receiving column to saved_grns';
    END IF;

    -- Backfill: compute total_excl_receiving from items JSONB
    UPDATE saved_grns
    SET total_excl_receiving = COALESCE(
      (SELECT SUM(
        COALESCE(
          (elem->>'originalUnitCost')::NUMERIC,
          (elem->>'unitCost')::NUMERIC - COALESCE((elem->>'receivingCostPerUnit')::NUMERIC, 0),
          0
        ) *
        COALESCE(
          (elem->>'delivered')::NUMERIC,
          (elem->>'receivedQuantity')::NUMERIC,
          (elem->>'quantity')::NUMERIC,
          0
        )
      ) FROM jsonb_array_elements(COALESCE(items, '[]'::jsonb)) AS elem),
      0
    )
    WHERE total_excl_receiving IS NULL OR total_excl_receiving = 0;

    RAISE NOTICE 'Backfilled total_excl_receiving from items data';

  END IF;
END $$;

-- 2. UPDATE INSERT TRIGGER (GRN received -> CR entry uses total_excl_receiving)
-- ============================================
CREATE OR REPLACE FUNCTION trg_create_ledger_entry_for_grn()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO supplier_ledger (
    supplier_id,
    supplier_name,
    transaction_type,
    reference_id,
    reference_number,
    debit_amount,
    credit_amount,
    running_balance,
    transaction_date,
    description,
    payment_method,
    notes,
    created_by
  )
  VALUES (
    NEW.supplier_name,
    NEW.supplier_name,
    'grn_received',
    NEW.id,
    NEW.grn_number,
    0,
    COALESCE(NEW.total_excl_receiving, NEW.total_amount, 0),
    0,
    COALESCE(NEW.created_at, NOW()),
    'GRN Received - ' || COALESCE(NEW.grn_number, '') || ' from ' || COALESCE(NEW.supplier_name, ''),
    NULL,
    COALESCE(NEW.quality_check_notes, ''),
    auth.uid()
  );

  PERFORM recalculate_supplier_ledger_balance(NEW.supplier_name);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. UPDATE UPDATE TRIGGER (GRN edited -> re-create ledger entry uses total_excl_receiving)
-- ============================================
CREATE OR REPLACE FUNCTION trg_update_ledger_on_grn_update()
RETURNS TRIGGER AS $$
DECLARE
  v_old_supplier_name VARCHAR;
  v_new_supplier_name VARCHAR;
BEGIN
  v_old_supplier_name := OLD.supplier_name;
  v_new_supplier_name := NEW.supplier_name;

  -- Delete the old ledger entry for this GRN
  DELETE FROM supplier_ledger
  WHERE reference_id = OLD.id
    AND transaction_type = 'grn_received';

  -- Insert new ledger entry with updated data
  INSERT INTO supplier_ledger (
    supplier_id,
    supplier_name,
    transaction_type,
    reference_id,
    reference_number,
    debit_amount,
    credit_amount,
    running_balance,
    transaction_date,
    description,
    payment_method,
    notes,
    created_by
  )
  VALUES (
    v_new_supplier_name,
    v_new_supplier_name,
    'grn_received',
    NEW.id,
    NEW.grn_number,
    0,
    COALESCE(NEW.total_excl_receiving, NEW.total_amount, 0),
    0,
    COALESCE(NEW.created_at, NOW()),
    'GRN Received - ' || COALESCE(NEW.grn_number, '') || ' from ' || COALESCE(v_new_supplier_name, ''),
    NULL,
    COALESCE(NEW.quality_check_notes, ''),
    auth.uid()
  );

  -- Recalculate balances for affected suppliers
  PERFORM recalculate_supplier_ledger_balance(v_old_supplier_name);
  IF v_new_supplier_name != v_old_supplier_name THEN
    PERFORM recalculate_supplier_ledger_balance(v_new_supplier_name);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. FIX EXISTING LEDGER ENTRIES
--    Update CR amounts for existing grn_received entries to use total_excl_receiving
-- ============================================
UPDATE supplier_ledger sl
SET credit_amount = COALESCE(g.total_excl_receiving, g.total_amount, 0)
FROM saved_grns g
WHERE sl.reference_id = g.id
  AND sl.transaction_type = 'grn_received'
  AND sl.credit_amount != COALESCE(g.total_excl_receiving, g.total_amount, 0);

-- Recalculate running balances for all affected suppliers
DO $$
DECLARE
  v_supplier RECORD;
BEGIN
  FOR v_supplier IN
    SELECT DISTINCT supplier_name FROM supplier_ledger WHERE transaction_type = 'grn_received'
  LOOP
    PERFORM recalculate_supplier_ledger_balance(v_supplier.supplier_name);
  END LOOP;
END $$;
