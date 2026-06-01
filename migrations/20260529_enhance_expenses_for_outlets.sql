-- Professional Outlet Expenses Management System
-- Migration Date: 2026-05-29

-- Step 1: Add outlet_id to expenses table
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS outlet_id UUID REFERENCES outlets(id);

-- Step 2: Add approval workflow fields
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS approval_date TIMESTAMP;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS approval_notes TEXT;

-- Step 3: Add advanced expense tracking fields
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS recurring_frequency VARCHAR(20); -- daily, weekly, monthly, yearly
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS vendor_name VARCHAR(255);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS vendor_contact VARCHAR(100);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS tax_deductible BOOLEAN DEFAULT false;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_url TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50); -- cash, card, transfer, mobile
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS tags TEXT[]; -- Array of tags
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS project VARCHAR(100);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS cost_center VARCHAR(100);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS expense_type VARCHAR(50); -- operating, capital, personal
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS cost_classification VARCHAR(20) DEFAULT 'indirect'; -- direct, indirect
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS next_due_date TIMESTAMP; -- For recurring expenses
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS last_processed_date TIMESTAMP; -- Last time recurring was created
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS recurring_end_date TIMESTAMP; -- When to stop recurring
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS occurrence_count INTEGER DEFAULT 0; -- Track number of occurrences
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS parent_expense_id UUID REFERENCES expenses(id); -- Link to original recurring expense
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id); -- Add created_by for RLS

-- Step 4: Create expense budgets table
CREATE TABLE IF NOT EXISTS expense_budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  outlet_id UUID REFERENCES outlets(id) ON DELETE CASCADE,
  category VARCHAR(255) NOT NULL,
  sub_category VARCHAR(255),
  budget_amount DECIMAL(15,2) NOT NULL,
  spent_amount DECIMAL(15,2) DEFAULT 0,
  period VARCHAR(20) NOT NULL, -- monthly, quarterly, yearly
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  alert_threshold DECIMAL(5,2) DEFAULT 80, -- Alert at 80% usage
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Step 5: Create expense approval history table
CREATE TABLE IF NOT EXISTS expense_approval_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL, -- submitted, approved, rejected, revised
  action_by UUID REFERENCES auth.users(id),
  action_date TIMESTAMP DEFAULT NOW(),
  notes TEXT,
  previous_status VARCHAR(20),
  new_status VARCHAR(20)
);

-- Step 6: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_expenses_outlet_id ON expenses(outlet_id);
CREATE INDEX IF NOT EXISTS idx_expenses_approval_status ON expenses(approval_status);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_vendor ON expenses(vendor_name);
CREATE INDEX IF NOT EXISTS idx_expenses_recurring ON expenses(is_recurring, next_due_date) WHERE is_recurring = true;
CREATE INDEX IF NOT EXISTS idx_expenses_parent ON expenses(parent_expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_budgets_outlet ON expense_budgets(outlet_id);
CREATE INDEX IF NOT EXISTS idx_expense_budgets_period ON expense_budgets(period, start_date, end_date);

-- Step 7: Enable Row Level Security
ALTER TABLE expense_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_approval_history ENABLE ROW LEVEL SECURITY;

-- Step 8: Drop existing policies if they exist (for re-runnable migration)
DROP POLICY IF EXISTS "Outlet managers can view their budgets" ON expense_budgets;
DROP POLICY IF EXISTS "Outlet managers can create budgets" ON expense_budgets;
DROP POLICY IF EXISTS "Outlet managers can update their budgets" ON expense_budgets;
DROP POLICY IF EXISTS "Outlet managers can delete their budgets" ON expense_budgets;
DROP POLICY IF EXISTS "Users can view approval history for their outlet expenses" ON expense_approval_history;
DROP POLICY IF EXISTS "Users can create approval history for their outlet expenses" ON expense_approval_history;
DROP POLICY IF EXISTS "Users can create approval history records" ON expense_approval_history;

-- Step 9: RLS Policies for expense_budgets
CREATE POLICY "Outlet managers can view their budgets"
  ON expense_budgets FOR SELECT
  USING (
    outlet_id IN (
      SELECT outlet_id FROM outlet_users 
      WHERE user_id = auth.uid() 
      AND role IN ('manager', 'admin')
    )
  );

CREATE POLICY "Outlet managers can create budgets"
  ON expense_budgets FOR INSERT
  WITH CHECK (
    outlet_id IN (
      SELECT outlet_id FROM outlet_users 
      WHERE user_id = auth.uid() 
      AND role IN ('manager', 'admin')
    )
  );

CREATE POLICY "Outlet managers can update their budgets"
  ON expense_budgets FOR UPDATE
  USING (
    outlet_id IN (
      SELECT outlet_id FROM outlet_users 
      WHERE user_id = auth.uid() 
      AND role IN ('manager', 'admin')
    )
  );

CREATE POLICY "Outlet managers can delete their budgets"
  ON expense_budgets FOR DELETE
  USING (
    outlet_id IN (
      SELECT outlet_id FROM outlet_users 
      WHERE user_id = auth.uid() 
      AND role IN ('manager', 'admin')
    )
  );

-- Step 10: RLS Policies for expense_approval_history
CREATE POLICY "Users can view approval history for their outlet expenses"
  ON expense_approval_history FOR SELECT
  USING (
    expense_id IN (
      SELECT id FROM expenses 
      WHERE outlet_id IN (
        SELECT outlet_id FROM outlet_users 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create approval history records"
  ON expense_approval_history FOR INSERT
  WITH CHECK (true);

-- Step 10: Update expenses RLS policies to include outlet_id
-- Drop existing policies if they exist and recreate with outlet support
DROP POLICY IF EXISTS "Users can view expenses" ON expenses;
DROP POLICY IF EXISTS "Users can create expenses" ON expenses;
DROP POLICY IF EXISTS "Users can update their expenses" ON expenses;
DROP POLICY IF EXISTS "Users can delete their expenses" ON expenses;
DROP POLICY IF EXISTS "Users can view outlet expenses" ON expenses;
DROP POLICY IF EXISTS "Users can create outlet expenses" ON expenses;
DROP POLICY IF EXISTS "Users can update their outlet expenses" ON expenses;
DROP POLICY IF EXISTS "Managers can delete outlet expenses" ON expenses;

CREATE POLICY "Users can view outlet expenses"
  ON expenses FOR SELECT
  USING (
    outlet_id IN (
      SELECT outlet_id FROM outlet_users 
      WHERE user_id = auth.uid()
    )
    OR created_by = auth.uid()
  );

CREATE POLICY "Users can create outlet expenses"
  ON expenses FOR INSERT
  WITH CHECK (
    outlet_id IN (
      SELECT outlet_id FROM outlet_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their outlet expenses"
  ON expenses FOR UPDATE
  USING (
    created_by = auth.uid() 
    OR outlet_id IN (
      SELECT outlet_id FROM outlet_users 
      WHERE user_id = auth.uid() 
      AND role IN ('manager', 'admin')
    )
  );

CREATE POLICY "Managers can delete outlet expenses"
  ON expenses FOR DELETE
  USING (
    outlet_id IN (
      SELECT outlet_id FROM outlet_users 
      WHERE user_id = auth.uid() 
      AND role IN ('manager', 'admin')
    )
  );

-- Step 11: Create function to update budget spent_amount
CREATE OR REPLACE FUNCTION update_budget_spent_amount()
RETURNS TRIGGER AS $$
BEGIN
  -- Update budget spent amount when expense is approved
  IF NEW.approval_status = 'approved' AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.approval_status != 'approved')) THEN
    UPDATE expense_budgets
    SET spent_amount = spent_amount + NEW.amount,
        updated_at = NOW()
    WHERE outlet_id = NEW.outlet_id
      AND category = NEW.category
      AND start_date <= NEW.expense_date
      AND end_date >= NEW.expense_date;
  END IF;
  
  -- Revert budget spent amount when expense is rejected or deleted
  IF (TG_OP = 'UPDATE' AND NEW.approval_status = 'rejected' AND OLD.approval_status = 'approved') 
     OR TG_OP = 'DELETE' THEN
    UPDATE expense_budgets
    SET spent_amount = spent_amount - OLD.amount,
        updated_at = NOW()
    WHERE outlet_id = OLD.outlet_id
      AND category = OLD.category
      AND start_date <= OLD.expense_date
      AND end_date >= OLD.expense_date;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Step 12: Create trigger for automatic budget tracking
DROP TRIGGER IF EXISTS trg_update_budget_spent ON expenses;
CREATE TRIGGER trg_update_budget_spent
  AFTER INSERT OR UPDATE OR DELETE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_budget_spent_amount();

-- Step 13: Create function for budget alert checking
CREATE OR REPLACE FUNCTION check_budget_alerts()
RETURNS TABLE(
  budget_id UUID,
  outlet_id UUID,
  category VARCHAR,
  budget_amount DECIMAL,
  spent_amount DECIMAL,
  usage_percentage DECIMAL,
  alert_message TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    eb.id,
    eb.outlet_id,
    eb.category,
    eb.budget_amount,
    eb.spent_amount,
    ROUND((eb.spent_amount / NULLIF(eb.budget_amount, 0) * 100), 2) as usage_percentage,
    CASE 
      WHEN eb.spent_amount / NULLIF(eb.budget_amount, 0) >= 1 THEN 'Budget exceeded!'
      WHEN eb.spent_amount / NULLIF(eb.budget_amount, 0) >= eb.alert_threshold / 100 THEN 'Approaching budget limit'
      ELSE NULL
    END as alert_message
  FROM expense_budgets eb
  WHERE eb.spent_amount / NULLIF(eb.budget_amount, 0) >= eb.alert_threshold / 100
    AND eb.start_date <= CURRENT_DATE
    AND eb.end_date >= CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Step 14: Function to calculate next due date for recurring expenses
CREATE OR REPLACE FUNCTION calculate_next_due_date(
  current_date TIMESTAMP,
  frequency VARCHAR(20)
) RETURNS TIMESTAMP AS $$
BEGIN
  CASE frequency
    WHEN 'daily' THEN
      RETURN current_date + INTERVAL '1 day';
    WHEN 'weekly' THEN
      RETURN current_date + INTERVAL '1 week';
    WHEN 'bi-weekly' THEN
      RETURN current_date + INTERVAL '2 weeks';
    WHEN 'monthly' THEN
      RETURN current_date + INTERVAL '1 month';
    WHEN 'quarterly' THEN
      RETURN current_date + INTERVAL '3 months';
    WHEN 'semi-annually' THEN
      RETURN current_date + INTERVAL '6 months';
    WHEN 'annually' THEN
      RETURN current_date + INTERVAL '1 year';
    ELSE
      RETURN current_date + INTERVAL '1 month'; -- Default to monthly
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Step 15: Add comments for documentation
COMMENT ON COLUMN expenses.outlet_id IS 'Links expense to specific outlet';
COMMENT ON COLUMN expenses.approval_status IS 'pending, approved, rejected';
COMMENT ON COLUMN expenses.is_recurring IS 'Whether this is a recurring expense';
COMMENT ON COLUMN expenses.tax_deductible IS 'Flag for tax-deductible expenses';
COMMENT ON COLUMN expenses.receipt_url IS 'URL to uploaded receipt image/PDF';
COMMENT ON TABLE expense_budgets IS 'Budget allocation for outlet expense categories';
COMMENT ON TABLE expense_approval_history IS 'Audit trail for expense approval workflow';

-- Migration complete!
-- Verify with: SELECT * FROM check_budget_alerts();
