# Products RLS Policy Fix

## Issue
When trying to create products in the application, you're getting a 403 Forbidden error:
```
POST https://tymfrdglmbnmzureeien.supabase.co/rest/v1/products 403 (Forbidden)
INSERT policy test failed: {code: '42501', details: null, hint: null, message: 'new row violates row-level security policy for table "products"'}
```

This error occurs because Row Level Security (RLS) is enabled on the products table, but no policies are defined to allow INSERT operations.

## Solution
Apply the RLS policies from the `FIX_RLS_POLICIES_COMPLETE.sql` file to your database.

## How to Fix

### Option 1: Run the complete RLS fix script (Recommended)
1. Log in to your Supabase dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of `FIX_RLS_POLICIES_COMPLETE.sql`
4. Run the script

### Option 2: Apply only the products policies
If you only want to fix the products table, run these specific commands in your Supabase SQL Editor:

```sql
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for all users" ON products;
DROP POLICY IF EXISTS "Enable insert access for all users" ON products;
DROP POLICY IF EXISTS "Enable update access for all users" ON products;
DROP POLICY IF EXISTS "Enable delete access for all users" ON products;

-- Create policies for products table
CREATE POLICY "Enable read access for all users" ON products FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON products FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON products FOR DELETE USING (true);
```

## Why This Happens
The error occurs because:
1. RLS is enabled on the products table (`ALTER TABLE products ENABLE ROW LEVEL SECURITY`)
2. No policies are defined to allow INSERT operations
3. When the application tries to create a new product, Supabase blocks the operation due to the missing policies

## Verification
After applying the policies, you should be able to create products without the 403 error.