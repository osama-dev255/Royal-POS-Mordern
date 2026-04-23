-- Create outlet_users table to manage user assignments to outlets with roles
CREATE TABLE IF NOT EXISTS outlet_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'cashier' CHECK (role IN ('manager', 'cashier', 'staff', 'admin')),
  is_active BOOLEAN DEFAULT true,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(outlet_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_outlet_users_outlet_id ON outlet_users(outlet_id);
CREATE INDEX IF NOT EXISTS idx_outlet_users_user_id ON outlet_users(user_id);
CREATE INDEX IF NOT EXISTS idx_outlet_users_role ON outlet_users(role);
CREATE INDEX IF NOT EXISTS idx_outlet_users_is_active ON outlet_users(is_active);

-- Add RLS policies
ALTER TABLE outlet_users ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read outlet assignments
CREATE POLICY "Allow authenticated users to read outlet_users" ON outlet_users
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow admins to manage outlet assignments
CREATE POLICY "Allow admins to manage outlet_users" ON outlet_users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );
