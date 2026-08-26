-- Add "Added By" tracking column to products
-- Records the name entered by the user when adding a new product
-- from the Product Management page (Investment / General system)

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS added_by TEXT;

COMMENT ON COLUMN products.added_by IS 'Name of the user who added the product (entered in Add New Product dialog)';
