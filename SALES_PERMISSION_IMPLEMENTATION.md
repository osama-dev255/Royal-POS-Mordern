# Sales Permission Implementation Guide

This document explains how to implement restricted access to sales functionality, allowing only authorized sales personnel to register sales.

## Overview

The implementation consists of three main components:
1. Database-level security using Row Level Security (RLS) policies
2. Application-level user authentication and authorization
3. Utility functions for checking permissions

## 1. Database Security (RLS Policies)

### Apply the RLS Policies

Run the SQL script in `RESTRICTED_SALES_RLS_POLICIES.sql` in your Supabase SQL Editor. This script:

- Enables RLS on the `sales` and `sale_items` tables
- Creates policies that only allow users with roles 'salesman' or 'admin' to create, update, or delete sales
- Allows all users to read sales data (for reporting purposes)

### Key Policy Features

```sql
-- Allow only users with role 'salesman' or 'admin' to insert sales
CREATE POLICY "Enable insert access for salesmen only" ON sales FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('salesman', 'admin')
    AND users.is_active = true
  )
);
```

## 2. Application-Level Implementation

### User Authentication

The application uses Supabase authentication to identify users. The `createSale` function in `databaseService.ts` automatically associates each sale with the currently authenticated user:

```typescript
export const createSale = async (sale: Omit<Sale, 'id'>): Promise<Sale | null> => {
  try {
    // Get the current user ID from Supabase auth
    const { data: { user } } = await supabase.auth.getUser();
    
    // If user is not authenticated, throw an error
    if (!user) {
      throw new Error('Not authorized to create sales');
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

### Permission Checking Utilities

The `salesPermissionUtils.ts` file provides utility functions for checking user permissions:

1. `canCreateSales()` - Checks if the current user can create sales
2. `getCurrentUserRole()` - Gets the current user's role

## 3. Usage in Components

To check if a user can create sales before showing UI elements:

```typescript
import { canCreateSales } from '@/utils/salesPermissionUtils';

// In your component
useEffect(() => {
  const checkPermission = async () => {
    const hasPermission = await canCreateSales();
    if (!hasPermission) {
      // Hide sales creation UI or show error message
    }
  };
  
  checkPermission();
}, []);
```

## 4. User Roles

Ensure your users have the correct roles in the database:
- **salesman** - Can create and manage sales
- **admin** - Can create and manage sales, plus other administrative functions
- Other roles - Cannot create sales (read-only access)

## 5. Testing

After implementation, test the following scenarios:

1. **Authorized User (salesman/admin)**:
   - Should be able to create sales
   - Should be able to view all sales reports

2. **Unauthorized User (other roles)**:
   - Should NOT be able to create sales
   - Should receive appropriate error messages
   - Should still be able to view sales reports

3. **Unauthenticated User**:
   - Should be redirected to login page
   - Should not be able to access sales functionality

## Security Notes

- All sales are automatically associated with the creating user
- RLS policies enforce database-level security
- Application-level checks provide user experience improvements
- User roles are verified both in the application and at the database level
- Only active users (`is_active = true`) can perform sales operations

## Troubleshooting

If you encounter issues:

1. **Check RLS Policies**: Verify that the policies have been applied correctly in Supabase
2. **Verify User Roles**: Ensure users have the correct roles in the database
3. **Check Authentication**: Confirm users are properly logged in
4. **Review Error Messages**: Look at browser console and Supabase logs for detailed error information