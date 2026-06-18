-- Create expense_categories table for persistent category management
-- Stores custom categories and sub-categories for each outlet

CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL,
  sub_category_name TEXT,
  category_type TEXT DEFAULT 'custom', -- 'predefined' or 'custom'
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  last_used_date TIMESTAMP WITH TIME ZONE,
  created_by TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Ensure unique category + sub_category combinations per outlet
  UNIQUE(outlet_id, category_name, sub_category_name)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_expense_categories_outlet_id ON expense_categories(outlet_id);
CREATE INDEX IF NOT EXISTS idx_expense_categories_name ON expense_categories(category_name);
CREATE INDEX IF NOT EXISTS idx_expense_categories_active ON expense_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_expense_categories_type ON expense_categories(category_type);

-- Enable Row Level Security
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

-- Create policies for expense_categories table
CREATE POLICY "Enable read access for all authenticated users" ON expense_categories
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for all authenticated users" ON expense_categories
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for all authenticated users" ON expense_categories
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" ON expense_categories
  FOR DELETE USING (auth.role() = 'authenticated');

-- Add comments for documentation
COMMENT ON TABLE expense_categories IS 'Stores expense categories and sub-categories for expense tracking';
COMMENT ON COLUMN expense_categories.outlet_id IS 'Links category to specific outlet';
COMMENT ON COLUMN expense_categories.category_type IS 'Type: predefined (system) or custom (user-created)';
COMMENT ON COLUMN expense_categories.usage_count IS 'Number of times this category/sub-category has been used';
COMMENT ON COLUMN expense_categories.last_used_date IS 'When this category was last used in an expense';
