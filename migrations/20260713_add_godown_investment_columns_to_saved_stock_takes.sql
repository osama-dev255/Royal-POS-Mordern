-- Add godown/zone investment inventory columns to saved_stock_takes
ALTER TABLE saved_stock_takes ADD COLUMN IF NOT EXISTS godown_id UUID;
ALTER TABLE saved_stock_takes ADD COLUMN IF NOT EXISTS godown_name VARCHAR(255);
ALTER TABLE saved_stock_takes ADD COLUMN IF NOT EXISTS zone_id UUID;
ALTER TABLE saved_stock_takes ADD COLUMN IF NOT EXISTS zone_name VARCHAR(255);
ALTER TABLE saved_stock_takes ADD COLUMN IF NOT EXISTS take_type VARCHAR(20) DEFAULT 'outlet';
ALTER TABLE saved_stock_takes ADD COLUMN IF NOT EXISTS total_system_qty INTEGER DEFAULT 0;
ALTER TABLE saved_stock_takes ADD COLUMN IF NOT EXISTS total_physical_count INTEGER DEFAULT 0;
ALTER TABLE saved_stock_takes ADD COLUMN IF NOT EXISTS total_variance INTEGER DEFAULT 0;
ALTER TABLE saved_stock_takes ADD COLUMN IF NOT EXISTS total_investment_value DECIMAL(15,2) DEFAULT 0;
ALTER TABLE saved_stock_takes ADD COLUMN IF NOT EXISTS counted_by VARCHAR(255);

-- Make outlet_id nullable for investment stock takes (no outlet)
ALTER TABLE saved_stock_takes ALTER COLUMN outlet_id DROP NOT NULL;

-- Add index for godown filtering
CREATE INDEX IF NOT EXISTS idx_saved_stock_takes_godown_id ON saved_stock_takes(godown_id);
CREATE INDEX IF NOT EXISTS idx_saved_stock_takes_take_type ON saved_stock_takes(take_type);

COMMENT ON COLUMN saved_stock_takes.take_type IS 'outlet or investment (godown/zone)';
