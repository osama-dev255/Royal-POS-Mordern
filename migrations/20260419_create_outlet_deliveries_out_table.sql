-- Create outlet_deliveries_out table for tracking outgoing deliveries from outlets
CREATE TABLE IF NOT EXISTS outlet_deliveries_out (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  delivery_note_number VARCHAR(50) NOT NULL UNIQUE,
  delivery_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  destination_outlet VARCHAR(255) NOT NULL,
  destination_address TEXT,
  items_count INTEGER NOT NULL DEFAULT 0,
  total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  payment_method VARCHAR(50) DEFAULT 'credit',
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in-transit', 'delivered', 'cancelled')),
  driver_name VARCHAR(255),
  vehicle_number VARCHAR(100),
  delivery_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_outlet_deliveries_out_outlet_id ON outlet_deliveries_out(outlet_id);
CREATE INDEX idx_outlet_deliveries_out_status ON outlet_deliveries_out(status);
CREATE INDEX idx_outlet_deliveries_out_date ON outlet_deliveries_out(delivery_date);
CREATE INDEX idx_outlet_deliveries_out_destination ON outlet_deliveries_out(destination_outlet);

-- Create items table for delivery line items
CREATE TABLE IF NOT EXISTS outlet_deliveries_out_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_id UUID NOT NULL REFERENCES outlet_deliveries_out(id) ON DELETE CASCADE,
  product_name VARCHAR(255) NOT NULL,
  description TEXT,
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
  delivered_quantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
  unit_cost DECIMAL(15, 2) NOT NULL DEFAULT 0,
  selling_price DECIMAL(15, 2) NOT NULL DEFAULT 0,
  total_cost DECIMAL(15, 2) NOT NULL DEFAULT 0,
  total_price DECIMAL(15, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for items
CREATE INDEX idx_outlet_deliveries_out_items_delivery_id ON outlet_deliveries_out_items(delivery_id);

-- Enable Row Level Security
ALTER TABLE outlet_deliveries_out ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlet_deliveries_out_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for outlet_deliveries_out
CREATE POLICY "Allow authenticated users to view all outgoing deliveries"
  ON outlet_deliveries_out FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert outgoing deliveries"
  ON outlet_deliveries_out FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update outgoing deliveries"
  ON outlet_deliveries_out FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete outgoing deliveries"
  ON outlet_deliveries_out FOR DELETE
  TO authenticated
  USING (true);

-- Create RLS policies for outlet_deliveries_out_items
CREATE POLICY "Allow authenticated users to view all delivery items"
  ON outlet_deliveries_out_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert delivery items"
  ON outlet_deliveries_out_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update delivery items"
  ON outlet_deliveries_out_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete delivery items"
  ON outlet_deliveries_out_items FOR DELETE
  TO authenticated
  USING (true);

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_outlet_deliveries_out_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER trigger_update_outlet_deliveries_out_updated_at
  BEFORE UPDATE ON outlet_deliveries_out
  FOR EACH ROW
  EXECUTE FUNCTION update_outlet_deliveries_out_updated_at();

-- Add comments
COMMENT ON TABLE outlet_deliveries_out IS 'Tracks outgoing deliveries from outlets to other branches';
COMMENT ON TABLE outlet_deliveries_out_items IS 'Line items for outgoing deliveries';
