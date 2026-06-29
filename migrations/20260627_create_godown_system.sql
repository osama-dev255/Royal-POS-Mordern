-- Godown (Warehouse) Management Schema
-- Migration: 20260627_create_godown_system.sql

-- 1. Godowns Table (Warehouse/Locations)
CREATE TABLE IF NOT EXISTS godowns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  location VARCHAR(255),
  address TEXT,
  manager_name VARCHAR(255),
  manager_phone VARCHAR(50),
  capacity VARCHAR(100), -- e.g., "10000 units", "500 sqm"
  godown_type VARCHAR(50) DEFAULT 'warehouse' CHECK (godown_type IN ('warehouse', 'cold-storage', 'retail', 'distribution', 'factory')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Zones Table (Sections/Areas within each godown)
CREATE TABLE IF NOT EXISTS godown_zones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  godown_id UUID REFERENCES godowns(id) ON DELETE CASCADE,
  zone_name VARCHAR(100) NOT NULL,
  zone_code VARCHAR(50),
  description TEXT,
  zone_type VARCHAR(50) DEFAULT 'general' CHECK (zone_type IN ('general', 'rack', 'shelf', 'cold-room', 'hazardous', 'returns', 'quarantine')),
  rack_number VARCHAR(50),
  shelf_number VARCHAR(50),
  floor_number VARCHAR(50),
  capacity VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'full')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(godown_id, zone_code)
);

-- 3. Godown Stock Table (Track stock per product per godown per zone)
CREATE TABLE IF NOT EXISTS godown_stock (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  godown_id UUID REFERENCES godowns(id) ON DELETE CASCADE,
  zone_id UUID REFERENCES godown_zones(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  reserved_quantity INTEGER NOT NULL DEFAULT 0, -- Reserved for pending orders
  available_quantity INTEGER GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,
  min_stock_level INTEGER DEFAULT 0,
  max_stock_level INTEGER DEFAULT 10000,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, godown_id, zone_id)
);

-- 4. Stock Transfers Table
CREATE TABLE IF NOT EXISTS stock_transfers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transfer_number VARCHAR(50) UNIQUE NOT NULL,
  from_godown_id UUID REFERENCES godowns(id) ON DELETE RESTRICT,
  to_godown_id UUID REFERENCES godowns(id) ON DELETE RESTRICT,
  from_zone_id UUID REFERENCES godown_zones(id) ON DELETE SET NULL,
  to_zone_id UUID REFERENCES godown_zones(id) ON DELETE SET NULL,
  transfer_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'in-transit', 'completed', 'cancelled')),
  requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  completed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approval_date TIMESTAMP WITH TIME ZONE,
  completion_date TIMESTAMP WITH TIME ZONE,
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Stock Transfer Items
CREATE TABLE IF NOT EXISTS stock_transfer_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transfer_id UUID REFERENCES stock_transfers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL,
  transferred_quantity INTEGER NOT NULL DEFAULT 0,
  unit VARCHAR(20),
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_godowns_status ON godowns(status);
CREATE INDEX IF NOT EXISTS idx_godowns_code ON godowns(code);
CREATE INDEX IF NOT EXISTS idx_godown_zones_godown ON godown_zones(godown_id);
CREATE INDEX IF NOT EXISTS idx_godown_zones_status ON godown_zones(status);
CREATE INDEX IF NOT EXISTS idx_godown_stock_product ON godown_stock(product_id);
CREATE INDEX IF NOT EXISTS idx_godown_stock_godown ON godown_stock(godown_id);
CREATE INDEX IF NOT EXISTS idx_godown_stock_zone ON godown_stock(zone_id);
CREATE INDEX IF NOT EXISTS idx_godown_stock_available ON godown_stock(available_quantity);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_status ON stock_transfers(status);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_from_godown ON stock_transfers(from_godown_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_to_godown ON stock_transfers(to_godown_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_date ON stock_transfers(transfer_date);
CREATE INDEX IF NOT EXISTS idx_stock_transfer_items_transfer ON stock_transfer_items(transfer_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfer_items_product ON stock_transfer_items(product_id);

-- Enable Row Level Security
ALTER TABLE godowns ENABLE ROW LEVEL SECURITY;
ALTER TABLE godown_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE godown_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfer_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow all authenticated users for now)
CREATE POLICY "Allow authenticated users to view godowns" ON godowns
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to manage godowns" ON godowns
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to view godown_zones" ON godown_zones
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to manage godown_zones" ON godown_zones
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to view godown_stock" ON godown_stock
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to manage godown_stock" ON godown_stock
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to view stock_transfers" ON stock_transfers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to manage stock_transfers" ON stock_transfers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to view stock_transfer_items" ON stock_transfer_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to manage stock_transfer_items" ON stock_transfer_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Insert sample data
INSERT INTO godowns (name, code, description, location, godown_type, is_default) VALUES
  ('Main Warehouse', 'WH-MAIN', 'Primary storage facility', 'Main Street, City Center', 'warehouse', true),
  ('Cold Storage Unit', 'WH-COLD', 'Temperature-controlled storage', 'Industrial Area', 'cold-storage', false),
  ('Distribution Center', 'WH-DIST', 'Fast-moving goods distribution', 'Highway Junction', 'distribution', false)
ON CONFLICT (code) DO NOTHING;

-- Insert sample zones for Main Warehouse
DO $$
DECLARE
  main_godown_id UUID;
BEGIN
  SELECT id INTO main_godown_id FROM godowns WHERE code = 'WH-MAIN' LIMIT 1;
  
  IF main_godown_id IS NOT NULL THEN
    INSERT INTO godown_zones (godown_id, zone_name, zone_code, zone_type, rack_number) VALUES
      (main_godown_id, 'Zone A - Rack 1', 'ZA-R1', 'rack', 'R1'),
      (main_godown_id, 'Zone A - Rack 2', 'ZA-R2', 'rack', 'R2'),
      (main_godown_id, 'Zone B - Shelf 1', 'ZB-S1', 'shelf', 'S1'),
      (main_godown_id, 'Zone B - Shelf 2', 'ZB-S2', 'shelf', 'S2'),
      (main_godown_id, 'Cold Room', 'ZC-CR', 'cold-room', NULL),
      (main_godown_id, 'Returns Area', 'ZR-RT', 'returns', NULL)
    ON CONFLICT (godown_id, zone_code) DO NOTHING;
  END IF;
END $$;

-- Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_godown_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_godowns_timestamp
  BEFORE UPDATE ON godowns
  FOR EACH ROW
  EXECUTE FUNCTION update_godown_timestamp();

CREATE TRIGGER update_godown_zones_timestamp
  BEFORE UPDATE ON godown_zones
  FOR EACH ROW
  EXECUTE FUNCTION update_godown_timestamp();

CREATE TRIGGER update_godown_stock_timestamp
  BEFORE UPDATE ON godown_stock
  FOR EACH ROW
  EXECUTE FUNCTION update_godown_timestamp();

CREATE TRIGGER update_stock_transfers_timestamp
  BEFORE UPDATE ON stock_transfers
  FOR EACH ROW
  EXECUTE FUNCTION update_godown_timestamp();
