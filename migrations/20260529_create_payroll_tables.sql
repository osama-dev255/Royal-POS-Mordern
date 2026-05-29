-- Create payroll tables for outlet employee management
-- Migration: 20260529_create_payroll_tables.sql

-- 1. Create outlet_employees table
CREATE TABLE IF NOT EXISTS outlet_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  employee_code VARCHAR(50) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  position VARCHAR(100) NOT NULL,
  department VARCHAR(100),
  hire_date DATE NOT NULL,
  base_salary DECIMAL(10, 2) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create payroll_records table
CREATE TABLE IF NOT EXISTS payroll_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES outlet_employees(id) ON DELETE CASCADE,
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  base_salary DECIMAL(10, 2) NOT NULL DEFAULT 0,
  
  -- Allowances
  housing_allowance DECIMAL(10, 2) DEFAULT 0,
  transport_allowance DECIMAL(10, 2) DEFAULT 0,
  meal_allowance DECIMAL(10, 2) DEFAULT 0,
  overtime_hours DECIMAL(10, 2) DEFAULT 0,
  overtime_pay DECIMAL(10, 2) DEFAULT 0,
  other_allowances DECIMAL(10, 2) DEFAULT 0,
  
  -- Deductions
  tax_deduction DECIMAL(10, 2) DEFAULT 0,
  social_security DECIMAL(10, 2) DEFAULT 0,
  health_insurance DECIMAL(10, 2) DEFAULT 0,
  advance_payment DECIMAL(10, 2) DEFAULT 0,
  other_deductions DECIMAL(10, 2) DEFAULT 0,
  
  -- Totals
  gross_salary DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_deductions DECIMAL(10, 2) NOT NULL DEFAULT 0,
  net_salary DECIMAL(10, 2) NOT NULL DEFAULT 0,
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  payment_date DATE,
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_outlet_employees_outlet_id ON outlet_employees(outlet_id);
CREATE INDEX IF NOT EXISTS idx_outlet_employees_active ON outlet_employees(is_active);
CREATE INDEX IF NOT EXISTS idx_payroll_records_outlet_id ON payroll_records(outlet_id);
CREATE INDEX IF NOT EXISTS idx_payroll_records_employee_id ON payroll_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_records_status ON payroll_records(status);
CREATE INDEX IF NOT EXISTS idx_payroll_records_pay_period ON payroll_records(pay_period_start, pay_period_end);

-- 4. Enable Row Level Security
ALTER TABLE outlet_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_records ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for outlet_employees
CREATE POLICY "Allow authenticated users to view employees"
  ON outlet_employees FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert employees"
  ON outlet_employees FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update employees"
  ON outlet_employees FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete employees"
  ON outlet_employees FOR DELETE
  TO authenticated
  USING (true);

-- 6. Create RLS policies for payroll_records
CREATE POLICY "Allow authenticated users to view payroll records"
  ON payroll_records FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert payroll records"
  ON payroll_records FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update payroll records"
  ON payroll_records FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete payroll records"
  ON payroll_records FOR DELETE
  TO authenticated
  USING (true);

-- 7. Create trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_payroll_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_outlet_employees_timestamp
  BEFORE UPDATE ON outlet_employees
  FOR EACH ROW
  EXECUTE FUNCTION update_payroll_timestamp();

CREATE TRIGGER update_payroll_records_timestamp
  BEFORE UPDATE ON payroll_records
  FOR EACH ROW
  EXECUTE FUNCTION update_payroll_timestamp();

-- 8. Add comments
COMMENT ON TABLE outlet_employees IS 'Employee records for each outlet';
COMMENT ON TABLE payroll_records IS 'Payroll records tracking employee compensation';
COMMENT ON COLUMN payroll_records.status IS 'Payment status: pending, approved, paid, cancelled';
