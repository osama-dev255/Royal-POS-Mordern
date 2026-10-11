-- One-time data realignment (run manually in the Supabase SQL Editor)
--
-- Problem: products.stock_quantity ("Current Stock") drifted from the godown
-- pool because several warehouse operations updated only one of the two pools.
-- Decision: godown quantities are the physical source of truth.
--
-- Effect: every product WITH warehouse assignments gets its Current Stock reset
-- to the sum of its godown_stock rows. Products with NO godown assignment keep
-- their existing Current Stock (that pool is their only stock record).
--
-- Future drift is prevented in code: godown assignment/removal now syncs
-- Current Stock by the same delta (ProductManagement.tsx, EditProductDialog.tsx).

UPDATE products p
SET stock_quantity = g.total
FROM (
  SELECT product_id, SUM(quantity) AS total
  FROM godown_stock
  GROUP BY product_id
) g
WHERE p.id = g.product_id
  AND p.stock_quantity IS DISTINCT FROM g.total;

-- Verification (optional): rows returned by this query should be zero after the update.
-- SELECT p.id, p.name, p.stock_quantity AS current_stock, g.total AS godown_total
-- FROM products p
-- JOIN (SELECT product_id, SUM(quantity) AS total FROM godown_stock GROUP BY product_id) g
--   ON g.product_id = p.id
-- WHERE p.stock_quantity IS DISTINCT FROM g.total;
