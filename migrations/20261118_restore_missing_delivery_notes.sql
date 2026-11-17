-- Migration: restore delivery notes that were processed but never persisted
--
-- WHY THIS EXISTS
--   `saveDelivery()` in src/utils/deliveryUtils.ts swallowed the INSERT error, so
--   the Delivery Note screen still recorded stock OUT movements, updated GRN /
--   inventory and showed "saved successfully to Saved Deliveries". The note row
--   itself was never written, which is why deliveries (e.g. everything sent to
--   PONGWE INVESTMENT LTD) are missing from Saved Deliveries.
--
--   The stock movements (reference_type = 'DELIVERY_NOTE') kept the product list,
--   quantities, godown / zone, outlet and timestamp, so the notes can be rebuilt.
--
-- SCOPE
--   `only_outlet` = NULL restores every outlet (1,390 notes at the time of writing).
--   Set it to one outlet id to repair a single outlet instead.
--
-- CAVEAT
--   Only the COST value survived (stock_movements.unit_cost / total_cost), so the
--   restored `total`, `subtotal` and item `rate` are cost-based, not the original
--   selling rate. Correct them from the printed note if any of them were credit
--   deliveries.
--
-- SAFETY
--   * Idempotent: a note is restored only when no note with the same number exists
--     for the same outlet.
--   * Application triggers are suspended for the insert, so restoring a note cannot
--     re-add stock to inventory_products (which would double the outlet stock).
--   * Run the REVIEW query first, then the INSERT, inside the same transaction.

BEGIN;

-- Re-runs are safe: the working tables are rebuilt from scratch.
DROP TABLE IF EXISTS _restore_params;
DROP TABLE IF EXISTS _missing_notes;

-- ---------------------------------------------------------------- parameters
CREATE TEMP TABLE _restore_params AS
SELECT NULL::uuid AS only_outlet;                                      -- every outlet
-- SELECT 'bb05c8a4-76da-4e8c-a56d-27c48c320970'::uuid AS only_outlet;  -- PONGWE INVESTMENT LTD only

-- ------------------------------------------------------- candidate rows
CREATE TEMP TABLE _missing_notes AS
WITH movements AS (
  SELECT
    sm.reference_number                                AS note_number,
    sm.created_at::date                                AS note_date,
    MIN(sm.created_at)                                 AS first_movement,
    sm.outlet_id,
    -- uuid has no MIN()/MAX() aggregate, so take the first non-null value
    (array_agg(sm.godown_id)   FILTER (WHERE sm.godown_id   IS NOT NULL))[1] AS godown_id,
    (array_agg(sm.zone_id)     FILTER (WHERE sm.zone_id     IS NOT NULL))[1] AS zone_id,
    (array_agg(sm.business_id) FILTER (WHERE sm.business_id IS NOT NULL))[1] AS business_id,
    (array_agg(sm.created_by)  FILTER (WHERE sm.created_by  IS NOT NULL))[1] AS created_by,
    COUNT(*)                                           AS line_count,
    SUM(COALESCE(sm.total_cost, 0))                    AS total_value,
    jsonb_agg(
      jsonb_build_object(
        'product_id', sm.product_id,
        'name',       sm.product_name,
        'quantity',   sm.quantity,
        'delivered',  sm.quantity,
        'rate',       sm.unit_cost,
        'price',      sm.unit_cost,
        'amount',     sm.total_cost,
        'total',      sm.total_cost,
        'godown_id',  sm.godown_id,
        'zone_id',    sm.zone_id
      )
      ORDER BY sm.product_name
    )                                                  AS items_list
  FROM stock_movements sm
  WHERE sm.reference_type = 'DELIVERY_NOTE'
    AND sm.movement_type  = 'OUT'
    AND sm.reference_number IS NOT NULL
    AND (
      (SELECT only_outlet FROM _restore_params) IS NULL
      OR sm.outlet_id = (SELECT only_outlet FROM _restore_params)
    )
  GROUP BY sm.reference_number, sm.created_at::date, sm.outlet_id
)
SELECT
  m.*,
  o.name                                              AS outlet_name,
  b.name                                              AS business_name,
  -- saved_delivery_notes.user_id has a FK to users, so every candidate must
  -- come FROM users: a movement's created_by can be an auth id with no staff row.
  COALESCE(
    (SELECT u.id FROM users u WHERE u.id = m.created_by),
    (SELECT u.id FROM users u WHERE u.role IN ('admin', 'super_admin') ORDER BY u.id LIMIT 1),
    (SELECT u.id FROM users u ORDER BY u.id LIMIT 1)
  )                                                   AS resolved_user_id
FROM movements m
LEFT JOIN outlets  o ON o.id = m.outlet_id
LEFT JOIN businesses b ON b.id = m.business_id
WHERE NOT EXISTS (
  SELECT 1
  FROM saved_delivery_notes n
  WHERE n.delivery_note_number = m.note_number
    AND n.outlet_id IS NOT DISTINCT FROM m.outlet_id
);

-- ------------------------------------------------------------ REVIEW FIRST
-- Expect ~1,390 rows (~2,000 stock movement lines). A note that was deliberately
-- deleted also shows up here: remove its number from _missing_notes before the
-- INSERT if it should stay deleted.
SELECT
  note_number,
  note_date,
  outlet_name,
  resolved_user_id,
  line_count            AS lines,
  total_value           AS cost_value
FROM _missing_notes
ORDER BY note_date;

-- --------------------------------------------------------------- restore
-- Fail before touching triggers if no staff row can own the restored notes.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM _missing_notes WHERE resolved_user_id IS NULL) THEN
    RAISE EXCEPTION 'No row in users can own the restored notes; add a staff row first.';
  END IF;
END $$;

ALTER TABLE saved_delivery_notes DISABLE TRIGGER USER;

INSERT INTO saved_delivery_notes (
  user_id,
  delivery_note_number,
  date,
  customer,
  items,
  items_list,
  subtotal,
  total,
  tax,
  discount,
  amount_received,
  change,
  payment_method,
  status,
  outlet_id,
  source_type,
  source_godown_id,
  source_zone_id,
  credit_brought_forward,
  business_name,
  business_id,
  delivery_notes,
  approval_status,
  created_at,
  updated_at
)
SELECT
  m.resolved_user_id,
  m.note_number,
  m.note_date,
  COALESCE(m.outlet_name, 'Unknown'),
  m.line_count,
  m.items_list,
  m.total_value,
  m.total_value,
  0,
  0,
  0,
  0,
  'N/A',
  'completed',
  m.outlet_id,
  'investment',
  m.godown_id,
  m.zone_id,
  0,
  m.business_name,
  m.business_id,
  'Restored from the stock movement ledger: the note was delivered and processed but its save failed.',
  'pending',
  m.first_movement,
  m.first_movement
FROM _missing_notes m;

ALTER TABLE saved_delivery_notes ENABLE TRIGGER USER;

-- --------------------------------------------------------------- verify
SELECT delivery_note_number, date, customer, total, status, created_at
FROM saved_delivery_notes
WHERE delivery_note_number IN (SELECT note_number FROM _missing_notes)
ORDER BY date;

-- Keep the rows when everything looks right, otherwise ROLLBACK instead of COMMIT.
COMMIT;
