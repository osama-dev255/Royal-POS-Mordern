-- Create outlets table for registered business locations
CREATE TABLE IF NOT EXISTS outlets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  manager VARCHAR(255),
  employee_count INTEGER DEFAULT 0,
  product_count INTEGER DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  zip_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'Tanzania',
  opening_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_outlets_status ON outlets(status);
CREATE INDEX IF NOT EXISTS idx_outlets_city ON outlets(city);
CREATE INDEX IF NOT EXISTS idx_outlets_manager ON outlets(manager);

-- Insert sample outlets data
INSERT INTO outlets (name, location, phone, email, manager, employee_count, product_count, status, address, city, state, opening_date) VALUES 
  ('Main Branch', 'Dar es Salaam, Tanzania', '+255 654 321 000', 'main@company.tz', 'John Smith', 12, 245, 'active', '123 Business Street', 'Dar es Salaam', 'Dar es Salaam', '2023-01-15'),
  ('Kigoma Outlet', 'Kigoma, Tanzania', '+255 654 321 001', 'kigoma@company.tz', 'Sarah Johnson', 8, 180, 'active', '456 Lake View Road', 'Kigoma', 'Kigoma', '2023-03-22'),
  ('Arusha Branch', 'Arusha, Tanzania', '+255 654 321 002', 'arusha@company.tz', 'Michael Brown', 6, 150, 'maintenance', '789 Mountain Avenue', 'Arusha', 'Arusha', '2023-05-10'),
  ('Mwanza Outlet', 'Mwanza, Tanzania', '+255 654 321 003', 'mwanza@company.tz', 'Grace Williams', 10, 200, 'active', '321 Lake Road', 'Mwanza', 'Mwanza', '2023-07-18')
ON CONFLICT DO NOTHING;