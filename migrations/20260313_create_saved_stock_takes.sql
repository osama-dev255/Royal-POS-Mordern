-- Create saved_stock_takes table
CREATE TABLE IF NOT EXISTS saved_stock_takes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    stock_take_number VARCHAR(50) NOT NULL UNIQUE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_products INTEGER DEFAULT 0,
    total_calculated_sold INTEGER DEFAULT 0,
    total_costs DECIMAL(15,2) DEFAULT 0,
    total_price DECIMAL(15,2) DEFAULT 0,
    potential_earnings DECIMAL(15,2) DEFAULT 0,
    avg_turnover DECIMAL(10,4) DEFAULT 0,
    items JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'completed',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_saved_stock_takes_outlet_id ON saved_stock_takes(outlet_id);
CREATE INDEX IF NOT EXISTS idx_saved_stock_takes_date ON saved_stock_takes(date);
CREATE INDEX IF NOT EXISTS idx_saved_stock_takes_stock_take_number ON saved_stock_takes(stock_take_number);

-- Enable RLS
ALTER TABLE saved_stock_takes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow all users to read saved_stock_takes" ON saved_stock_takes
    FOR SELECT USING (true);

CREATE POLICY "Allow all users to insert saved_stock_takes" ON saved_stock_takes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow all users to update saved_stock_takes" ON saved_stock_takes
    FOR UPDATE USING (true);

CREATE POLICY "Allow all users to delete saved_stock_takes" ON saved_stock_takes
    FOR DELETE USING (true);

-- Add comment
COMMENT ON TABLE saved_stock_takes IS 'Stores saved stock take records for outlets';
