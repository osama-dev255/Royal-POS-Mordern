-- Migration: Create stock_movements ledger table
-- Purpose: Central transaction log for every stock change in the system
-- Date: 2026-07-26

CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    outlet_id UUID REFERENCES outlets(id) ON DELETE SET NULL,
    godown_id UUID REFERENCES godowns(id) ON DELETE SET NULL,
    
    -- Movement classification
    movement_type VARCHAR(50) NOT NULL CHECK (movement_type IN (
        'IN',              -- Stock received (GRN)
        'OUT',             -- Stock sent out (Delivery Note)
        'TRANSFER_IN',     -- Received from another outlet
        'TRANSFER_OUT',    -- Sent to another outlet
        'SOLD',            -- Sold via POS
        'ADJUSTMENT',      -- Manual adjustment (Stock Take)
        'RETURN',          -- Customer return
        'DAMAGE'           -- Damaged/lost stock
    )),
    
    -- Quantity (always positive, direction determined by movement_type)
    quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
    
    -- Source document reference
    reference_type VARCHAR(50) CHECK (reference_type IN (
        'GRN', 'DELIVERY_NOTE', 'SALE', 'STOCK_TAKE', 'ADJUSTMENT', 'TRANSFER', 'RETURN'
    )),
    reference_id UUID,
    reference_number VARCHAR(255),
    
    -- Cost tracking
    unit_cost NUMERIC(12, 2) DEFAULT 0,
    total_cost NUMERIC(15, 2) DEFAULT 0,
    
    -- Context
    notes TEXT DEFAULT '',
    batch_number VARCHAR(255),
    
    -- Audit
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_name ON stock_movements(product_name);
CREATE INDEX IF NOT EXISTS idx_stock_movements_outlet ON stock_movements(outlet_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_godown ON stock_movements(godown_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON stock_movements(created_at);

-- Helper function: Get movements for a product
CREATE OR REPLACE FUNCTION get_product_movements(
    p_product_id UUID DEFAULT NULL,
    p_product_name VARCHAR DEFAULT NULL,
    p_outlet_id UUID DEFAULT NULL,
    p_movement_type VARCHAR DEFAULT NULL,
    p_date_from DATE DEFAULT NULL,
    p_date_to DATE DEFAULT NULL,
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
    id UUID,
    product_name VARCHAR,
    movement_type VARCHAR,
    quantity NUMERIC,
    unit_cost NUMERIC,
    total_cost NUMERIC,
    reference_type VARCHAR,
    reference_number VARCHAR,
    outlet_name TEXT,
    godown_name TEXT,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sm.id,
        sm.product_name,
        sm.movement_type,
        sm.quantity,
        sm.unit_cost,
        sm.total_cost,
        sm.reference_type,
        sm.reference_number,
        o.name as outlet_name,
        g.name as godown_name,
        sm.notes,
        sm.created_by,
        sm.created_at
    FROM stock_movements sm
    LEFT JOIN outlets o ON sm.outlet_id = o.id
    LEFT JOIN godowns g ON sm.godown_id = g.id
    WHERE 
        (p_product_id IS NULL OR sm.product_id = p_product_id)
        AND (p_product_name IS NULL OR sm.product_name ILIKE '%' || p_product_name || '%')
        AND (p_outlet_id IS NULL OR sm.outlet_id = p_outlet_id)
        AND (p_movement_type IS NULL OR sm.movement_type = p_movement_type)
        AND (p_date_from IS NULL OR sm.created_at >= p_date_from::TIMESTAMPTZ)
        AND (p_date_to IS NULL OR sm.created_at <= (p_date_to + INTERVAL '1 day')::TIMESTAMPTZ)
    ORDER BY sm.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Get stock summary for a product (total in, out, current)
CREATE OR REPLACE FUNCTION get_stock_movement_summary(
    p_product_id UUID DEFAULT NULL,
    p_outlet_id UUID DEFAULT NULL
)
RETURNS TABLE (
    product_name VARCHAR,
    total_in NUMERIC,
    total_out NUMERIC,
    total_sold NUMERIC,
    total_adjustment NUMERIC,
    total_transfer_in NUMERIC,
    total_transfer_out NUMERIC,
    net_movement NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sm.product_name,
        COALESCE(SUM(CASE WHEN sm.movement_type = 'IN' THEN sm.quantity ELSE 0 END), 0) as total_in,
        COALESCE(SUM(CASE WHEN sm.movement_type = 'OUT' THEN sm.quantity ELSE 0 END), 0) as total_out,
        COALESCE(SUM(CASE WHEN sm.movement_type = 'SOLD' THEN sm.quantity ELSE 0 END), 0) as total_sold,
        COALESCE(SUM(CASE WHEN sm.movement_type = 'ADJUSTMENT' THEN sm.quantity ELSE 0 END), 0) as total_adjustment,
        COALESCE(SUM(CASE WHEN sm.movement_type = 'TRANSFER_IN' THEN sm.quantity ELSE 0 END), 0) as total_transfer_in,
        COALESCE(SUM(CASE WHEN sm.movement_type = 'TRANSFER_OUT' THEN sm.quantity ELSE 0 END), 0) as total_transfer_out,
        COALESCE(SUM(CASE 
            WHEN sm.movement_type IN ('IN', 'TRANSFER_IN', 'RETURN') THEN sm.quantity
            WHEN sm.movement_type IN ('OUT', 'SOLD', 'TRANSFER_OUT', 'DAMAGE') THEN -sm.quantity
            WHEN sm.movement_type = 'ADJUSTMENT' THEN sm.quantity
            ELSE 0
        END), 0) as net_movement
    FROM stock_movements sm
    WHERE 
        (p_product_id IS NULL OR sm.product_id = p_product_id)
        AND (p_outlet_id IS NULL OR sm.outlet_id = p_outlet_id)
    GROUP BY sm.product_name
    ORDER BY sm.product_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE stock_movements IS 'Central ledger logging every stock movement for full audit trail and traceability';
