-- Migration: Backfill godown/zone/product on existing Delivery Note OUT stock movements
-- Purpose: Repair existing OUT movements that were recorded without godown/zone data
--          (they show dashes in the Movement Ledger). Data is sourced from
--          saved_delivery_notes.items_list (per-item godown/zone) with fallback to the
--          delivery-level source_godown_id/source_zone_id.
-- Date: 2026-08-26

-- Step 1: Backfill godown_id / zone_id on OUT movements that are missing a godown
UPDATE stock_movements sm
SET
  godown_id = COALESCE(sub.item_godown_id, sub.delivery_godown_id),
  zone_id   = CASE
                WHEN sub.item_godown_id IS NOT NULL THEN sub.item_zone_id
                ELSE sub.delivery_zone_id
              END
FROM (
  SELECT
    m.id AS movement_id,
    NULLIF(it.item ->> 'godown_id', '')::uuid AS item_godown_id,
    NULLIF(it.item ->> 'zone_id', '')::uuid   AS item_zone_id,
    dn.source_godown_id AS delivery_godown_id,
    dn.source_zone_id   AS delivery_zone_id
  FROM stock_movements m
  JOIN saved_delivery_notes dn
    ON dn.delivery_note_number = m.reference_number
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(dn.items_list, '[]'::jsonb)) AS it(item)
  WHERE m.reference_type = 'DELIVERY_NOTE'
    AND m.godown_id IS NULL
    AND LOWER(TRIM(it.item ->> 'name')) = LOWER(TRIM(m.product_name))
) sub
WHERE sm.id = sub.movement_id
  AND sm.godown_id IS NULL;

-- Step 2: Backfill product_id on Delivery Note movements missing a product link
-- (matches by exact product name, case-insensitive)
UPDATE stock_movements sm
SET product_id = p.id
FROM products p
WHERE sm.reference_type = 'DELIVERY_NOTE'
  AND sm.product_id IS NULL
  AND LOWER(TRIM(p.name)) = LOWER(TRIM(sm.product_name));
