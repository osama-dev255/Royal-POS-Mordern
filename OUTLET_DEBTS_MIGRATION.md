# Outlet Debts Table Migration Guide

## Overview

This migration creates a dedicated table structure for managing outlet debts, replacing the previous system that stored debts in the `outlet_sales` table with `payment_method = 'debt'`.

## New Database Structure

### 1. **outlet_debts** (Main Debt Records)
Stores the primary debt information for each outlet.

**Key Features:**
- Dedicated debt tracking (separate from sales)
- Due date support for payment tracking
- Automatic remaining amount calculation
- Payment status: `unpaid`, `partial`, `paid`

**Schema:**
```sql
- id: UUID (Primary Key)
- outlet_id: UUID (Required, references outlets)
- customer_id: UUID (references outlet_customers)
- user_id: UUID (references users)
- invoice_number: VARCHAR(50) (Unique)
- debt_date: TIMESTAMP (When debt was created)
- due_date: TIMESTAMP (Expected payment date)
- subtotal: DECIMAL(10,2)
- discount_amount: DECIMAL(10,2)
- tax_amount: DECIMAL(10,2)
- total_amount: DECIMAL(10,2)
- amount_paid: DECIMAL(10,2)
- remaining_amount: DECIMAL(10,2) (auto-calculated)
- payment_status: VARCHAR(20) (unpaid/partial/paid)
- notes: TEXT
- reference_number: VARCHAR(100)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### 2. **outlet_debt_items** (Debt Line Items)
Stores individual items/products in each debt record.

**Schema:**
```sql
- id: UUID (Primary Key)
- debt_id: UUID (Required, references outlet_debts)
- product_id: UUID (references products)
- product_name: VARCHAR(255) (Snapshot of product name)
- quantity: INTEGER
- unit_price: DECIMAL(10,2)
- discount_amount: DECIMAL(10,2)
- total_price: DECIMAL(10,2)
- created_at: TIMESTAMP
```

### 3. **outlet_debt_payments** (Payment History)
Tracks all payments made toward each debt.

**Schema:**
```sql
- id: UUID (Primary Key)
- debt_id: UUID (Required, references outlet_debts)
- payment_date: TIMESTAMP
- amount: DECIMAL(10,2)
- payment_method: VARCHAR(50) (cash/card/mobile/etc.)
- reference_number: VARCHAR(100)
- notes: TEXT
- created_by: UUID (references users)
- created_at: TIMESTAMP
```

## Benefits of New Structure

### ✅ **Better Organization**
- Debts are separated from sales
- Clear data model for receivables
- Easier to query and manage debts

### ✅ **Payment Tracking**
- Complete payment history in `outlet_debt_payments`
- Track multiple partial payments
- Payment method tracking per transaction

### ✅ **Enhanced Features**
- Due date support for collection management
- Remaining amount auto-calculation
- Product name snapshots (even if product is deleted)

### ✅ **Performance**
- Dedicated indexes for debt queries
- Optimized for debt-specific operations
- Better query performance for debt reports

## Migration Steps

### Step 1: Run the Migration
Execute the migration file in your Supabase SQL editor:
```
migrations/20260408_create_outlet_debts_table.sql
```

### Step 2: Migrate Existing Data (Optional)
If you have existing debts in `outlet_sales`, you can migrate them:

```sql
-- Migrate existing debt records from outlet_sales to outlet_debts
INSERT INTO outlet_debts (
  id, outlet_id, customer_id, user_id, invoice_number,
  debt_date, subtotal, discount_amount, tax_amount,
  total_amount, amount_paid, remaining_amount,
  payment_status, notes, reference_number, created_at, updated_at
)
SELECT
  id, outlet_id, customer_id, user_id, invoice_number,
  sale_date, subtotal, discount_amount, tax_amount,
  total_amount, amount_paid, 
  (total_amount - amount_paid) as remaining_amount,
  payment_status, notes, reference_number, created_at, updated_at
FROM outlet_sales
WHERE payment_method = 'debt'
ON CONFLICT (invoice_number) DO NOTHING;

-- Migrate debt items from outlet_sale_items to outlet_debt_items
INSERT INTO outlet_debt_items (
  id, debt_id, product_id, quantity, unit_price,
  discount_amount, total_price, created_at
)
SELECT
  id, sale_id as debt_id, product_id, quantity, unit_price,
  discount_amount, total_price, created_at
FROM outlet_sale_items
WHERE sale_id IN (
  SELECT id FROM outlet_sales WHERE payment_method = 'debt'
)
ON CONFLICT DO NOTHING;
```

### Step 3: Update Application Code
Update the database service and components to use the new tables:

**Old (outlet_sales):**
```typescript
const debts = await getOutletSalesByOutletAndPaymentMethod(outletId, 'debt');
```

**New (outlet_debts):**
```typescript
const debts = await getOutletDebtsByOutlet(outletId);
```

## Next Steps

After running the migration:

1. ✅ Update `databaseService.ts` with new debt functions
2. ✅ Update `OutletSavedDebts.tsx` to use new table
3. ✅ Create debt payment functionality
4. ✅ Add due date tracking features
5. ✅ Implement payment history view
6. ✅ Add debt aging reports

## Rollback Plan

If you need to rollback:

```sql
-- Drop new tables (if needed)
DROP TABLE IF EXISTS outlet_debt_payments;
DROP TABLE IF EXISTS outlet_debt_items;
DROP TABLE IF EXISTS outlet_debts;
```

## Important Notes

⚠️ **Before Migration:**
- Backup your existing data
- Test migration in development first
- Verify all existing debts are migrated correctly

⚠️ **After Migration:**
- Update all code that references debts in outlet_sales
- Test debt creation, editing, and deletion
- Verify payment status updates work correctly
- Test the Saved Debts UI thoroughly

## Support

For questions or issues with this migration, check:
- Supabase dashboard for table structure
- Application logs for errors
- Migration file comments for schema details
