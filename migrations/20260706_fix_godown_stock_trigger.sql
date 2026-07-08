-- Fix: godown_stock uses 'last_updated' not 'updated_at'
-- The shared trigger function references NEW.updated_at which doesn't exist on godown_stock

-- Create a dedicated trigger function for godown_stock
CREATE OR REPLACE FUNCTION update_godown_stock_last_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the old trigger that uses the wrong column
DROP TRIGGER IF EXISTS update_godown_stock_timestamp ON godown_stock;

-- Create the correct trigger
CREATE TRIGGER update_godown_stock_last_updated
  BEFORE UPDATE ON godown_stock
  FOR EACH ROW
  EXECUTE FUNCTION update_godown_stock_last_updated();
