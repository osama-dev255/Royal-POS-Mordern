-- Create a separate saved_customer_settlements table for better management
-- This table will store saved customer settlements with proper RLS policies

-- Create the saved_customer_settlements table
CREATE TABLE IF NOT EXISTS saved_customer_settlements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20),
  customer_email VARCHAR(255),
  reference_number VARCHAR(100),
  settlement_amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  cashier_name VARCHAR(255),
  previous_balance DECIMAL(10,2) DEFAULT 0.00,
  amount_paid DECIMAL(10,2) DEFAULT 0.00,
  new_balance DECIMAL(10,2) DEFAULT 0.00,
  notes TEXT,
  date DATE NOT NULL,
  time TIME WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_saved_customer_settlements_user_id ON saved_customer_settlements(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_customer_settlements_customer_id ON saved_customer_settlements(customer_id);
CREATE INDEX IF NOT EXISTS idx_saved_customer_settlements_date ON saved_customer_settlements(date);
CREATE INDEX IF NOT EXISTS idx_saved_customer_settlements_reference ON saved_customer_settlements(reference_number);
CREATE INDEX IF NOT EXISTS idx_saved_customer_settlements_status ON saved_customer_settlements(status);

-- Enable Row Level Security (RLS) for the saved_customer_settlements table
ALTER TABLE saved_customer_settlements ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for saved customer settlements
-- Admins can view all saved settlements, others can only view their own
CREATE POLICY select_saved_customer_settlements ON saved_customer_settlements
FOR SELECT TO authenticated
USING (
  -- Admins can see all settlements
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
  OR 
  -- Other users can only see their own settlements
  auth.uid() = user_id
);

-- Users can insert their own saved settlements
CREATE POLICY insert_saved_customer_settlements ON saved_customer_settlements
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admins can update any saved settlement, others can only update their own
CREATE POLICY update_saved_customer_settlements ON saved_customer_settlements
FOR UPDATE TO authenticated
USING (
  -- Admins can update all settlements
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
  OR 
  -- Other users can only update their own settlements
  auth.uid() = user_id
);

-- Admins can delete any saved settlement, others can only delete their own
CREATE POLICY delete_saved_customer_settlements ON saved_customer_settlements
FOR DELETE TO authenticated
USING (
  -- Admins can delete all settlements
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
  OR 
  -- Other users can only delete their own settlements
  auth.uid() = user_id
);