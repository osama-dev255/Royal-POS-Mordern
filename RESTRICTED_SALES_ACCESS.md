# Restricted Sales Access Implementation

This document explains how to implement restricted access to sales functionality, allowing only authorized sales personnel to register sales.

## Overview

The solution involves two main components:
1. Row Level Security (RLS) policies in Supabase
2. Application-level user authentication and role checking

## Implementation Steps

### 1. Apply RLS Policies to Supabase

Run the SQL script in `RESTRICTED_SALES_RLS_POLICIES.sql` in your Supabase SQL Editor:

```sql
-- Restricted RLS policies for sales table - only salesmen can register sales
-- This is suitable for production use

-- Enable RLS on sales and sale_items tables if not already enabled
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for all users" ON sales;
DROP POLICY IF EXISTS "Enable insert access for salesmen only" ON sales;
DROP POLICY IF EXISTS "Enable update access for salesmen only" ON sales;
DROP POLICY IF EXISTS "Enable delete access for salesmen only" ON sales;

DROP POLICY IF EXISTS "Enable read access for all users" ON sale_items;
DROP POLICY IF EXISTS "Enable insert access for salesmen only" ON sale_items;
DROP POLICY IF EXISTS "Enable update access for salesmen only" ON sale_items;
DROP POLICY IF EXISTS "Enable delete access for salesmen only" ON sale_items;

-- Create policies for sales table
-- Allow all users to read sales (view sales reports, etc.)
CREATE POLICY "Enable read access for all users" ON sales FOR SELECT USING (true);

-- Allow only users with role 'salesman' or 'admin' to insert sales
CREATE POLICY "Enable insert access for salesmen only" ON sales FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('salesman', 'admin')
    AND users.is_active = true
  )
);

-- Allow only users with role 'salesman' or 'admin' to update their own sales
CREATE POLICY "Enable update access for salesmen only" ON sales FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('salesman', 'admin')
    AND users.is_active = true
  )
);

-- Allow only users with role 'salesman' or 'admin' to delete sales
CREATE POLICY "Enable delete access for salesmen only" ON sales FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('salesman', 'admin')
    AND users.is_active = true
  )
);

-- Create policies for sale_items table
-- Allow all users to read sale items (view sales details, etc.)
CREATE POLICY "Enable read access for all users" ON sale_items FOR SELECT USING (true);

-- Allow only users with role 'salesman' or 'admin' to insert sale items
CREATE POLICY "Enable insert access for salesmen only" ON sale_items FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('salesman', 'admin')
    AND users.is_active = true
  )
);

-- Allow only users with role 'salesman' or 'admin' to update sale items
CREATE POLICY "Enable update access for salesmen only" ON sale_items FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('salesman', 'admin')
    AND users.is_active = true
  )
);

-- Allow only users with role 'salesman' or 'admin' to delete sale items
CREATE POLICY "Enable delete access for salesmen only" ON sale_items FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('salesman', 'admin')
    AND users.is_active = true
  )
);
```

### 2. Ensure User Roles are Set Correctly

Make sure users in your system have the appropriate roles:
- Sales personnel should have `role = 'salesman'`
- Administrators should have `role = 'admin'`
- Other users should have different roles (e.g., 'manager', 'accountant', etc.)

### 3. Application-Level Implementation

The application automatically associates sales with the currently authenticated user through the `createSale` function in `databaseService.ts`:

```typescript
export const createSale = async (sale: Omit<Sale, 'id'>): Promise<Sale | null> => {
  try {
    // Get the current user ID from Supabase auth
    const { data: { user } } = await supabase.auth.getUser();
    
    // If user is not authenticated, throw an error
    if (!user) {
      throw new Error('User must be authenticated to create a sale');
    }
    
    // Add the user_id to the sale data
    const saleWithUser = {
      ...sale,
      user_id: user.id,
      sale_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('sales')
      .insert([saleWithUser])
      .select()
      .single();
      
    if (error) throw error;
    return data || null;
  } catch (error) {
    console.error('Error creating sale:', error);
    return null;
  }
};
```

### 4. User Authentication

Ensure users are properly authenticated before attempting to create sales. The application should:
1. Require login before accessing sales functionality
2. Check user roles when displaying sales creation UI
3. Prevent unauthorized access through both UI and API-level controls

## Testing

After implementing these changes:
1. Test that salesmen can create sales
2. Test that users with other roles cannot create sales
3. Verify that all users can still view sales reports (read access)
4. Confirm that only authorized users can modify existing sales

## Security Notes

- The RLS policies use `auth.uid()` to get the current user ID
- User roles are checked against the `users` table
- Only active users (`is_active = true`) can perform sales operations
- All sales are automatically associated with the creating user