# Manual Guide to Remove All RLS Policies

This guide will help you remove all Row Level Security (RLS) policies from your Supabase database manually through the Supabase dashboard.

## Prerequisites

1. Access to your Supabase project dashboard
2. Project credentials (URL and service role key)

## Steps to Remove All RLS Policies

### 1. Access Supabase Dashboard

1. Go to https://app.supabase.com/
2. Log in to your account
3. Select your project

### 2. Navigate to Table Editor

1. In the left sidebar, click on "Table editor"
2. You'll see a list of all your tables

### 3. Remove RLS Policies for Each Table

For each table in your database, follow these steps:

#### Disable RLS on a Table

1. Click on the table name to open its details
2. Click on the "RLS" tab
3. Toggle the "Enable Row Level Security" switch to OFF
4. This will disable RLS for the table

#### Delete Existing Policies (if any)

1. If there are existing policies listed, delete them one by one:
   - Click on the trash can icon next to each policy
   - Confirm deletion when prompted

### 4. Tables to Process

Process the following tables in your database:

1. users
2. access_logs
3. categories
4. products
5. suppliers
6. customers
7. discounts
8. discount_products
9. discount_categories
10. sales
11. sale_items
12. returns
13. return_items
14. damaged_products
15. purchase_orders
16. purchase_order_items
17. expenses
18. debts
19. customer_settlements
20. supplier_settlements
21. inventory_audits
22. reports

### 5. Alternative Method: Using SQL Editor

If you prefer to use SQL commands:

1. In the Supabase dashboard, click on "SQL Editor" in the left sidebar
2. Create a new query
3. Copy and paste the contents of [REMOVE_ALL_RLS.sql](file:///E:/PROJECTS/LOVABLE/bulletproofPOS/Advanced/kilango-Official-POS/kilango-group-officialPOS/REMOVE_ALL_RLS.sql) into the editor
4. Click "Run" to execute the script

This script will:
- Drop all existing policies on all tables
- Disable RLS on all tables

## Verification

To verify that RLS has been removed:

1. Go back to the "Table editor"
2. Check each table's "RLS" tab
3. Confirm that "Enable Row Level Security" is OFF
4. Confirm that no policies are listed

## Next Steps

After removing RLS, your application should have unrestricted access to all tables. You can now start fresh with a new security model if needed.