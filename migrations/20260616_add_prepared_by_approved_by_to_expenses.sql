-- Add prepared_by_name and approved_by_name columns to expenses table
-- This enables tracking of who created and who approved expense transactions
-- Using _name suffix to distinguish from UUID foreign key columns

-- Add prepared_by_name column (person who created the expense)
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS prepared_by_name TEXT;

-- Add approved_by_name column (person who approved the expense)
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS approved_by_name TEXT;

-- Add comments for documentation
COMMENT ON COLUMN expenses.prepared_by_name IS 'Name of the person who created/recorded this expense';
COMMENT ON COLUMN expenses.approved_by_name IS 'Name of the person who authorized/approved this expense';
