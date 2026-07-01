-- Create vendor_types table for expense management
-- Allows users to define custom vendor types per outlet

CREATE TABLE IF NOT EXISTS vendor_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  type_name TEXT NOT NULL,
  type_key TEXT NOT NULL, -- snake_case key for the type (e.g. 'service_provider')
  is_default BOOLEAN DEFAULT false, -- true for predefined types
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(outlet_id, type_key)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_vendor_types_outlet_id ON vendor_types(outlet_id);
CREATE INDEX IF NOT EXISTS idx_vendor_types_active ON vendor_types(is_active);

-- Enable Row Level Security
ALTER TABLE vendor_types ENABLE ROW LEVEL SECURITY;

-- Create policies for vendor_types table
CREATE POLICY "Enable read access for all authenticated users" ON vendor_types
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for all authenticated users" ON vendor_types
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for all authenticated users" ON vendor_types
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" ON vendor_types
  FOR DELETE USING (auth.role() = 'authenticated');

-- Add comments for documentation
COMMENT ON TABLE vendor_types IS 'Stores vendor type definitions per outlet for expense management';
COMMENT ON COLUMN vendor_types.outlet_id IS 'Links vendor type to specific outlet';
COMMENT ON COLUMN vendor_types.type_name IS 'Display name of the vendor type (e.g. "Service Provider")';
COMMENT ON COLUMN vendor_types.type_key IS 'Machine-readable key (e.g. "service_provider")';
COMMENT ON COLUMN vendor_types.is_default IS 'True for predefined system types that cannot be deleted';
