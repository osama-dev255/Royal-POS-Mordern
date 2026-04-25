# Troubleshooting: Credit Brought Forward Not Displaying

## Problem
The "Credit Brought Forward from previous:" field is not displaying in Saved Deliveries even though it was added to the database.

## Root Causes & Solutions

### Issue 1: Database Column Doesn't Exist
**Symptom**: You get an error when trying to query `credit_brought_forward`

**Solution**: Run the migration SQL
1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `migrations/FIX_credit_brought_forward.sql`
3. Execute the SQL
4. Verify with this query:
```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'saved_delivery_notes' 
AND column_name = 'credit_brought_forward';
```

### Issue 2: Column Exists But All Values Are 0
**Symptom**: The field exists but shows "TZS 0" for all deliveries

**Solution**: The field IS displaying, but the values are 0. Update existing records:
```sql
-- Update a specific delivery
UPDATE saved_delivery_notes 
SET credit_brought_forward = 50000 
WHERE delivery_note_number = 'YOUR_DELIVERY_NOTE_NUMBER';

-- OR update the 5 most recent deliveries for testing
UPDATE saved_delivery_notes 
SET credit_brought_forward = 25000 
WHERE id IN (
  SELECT id FROM saved_delivery_notes 
  ORDER BY created_at DESC 
  LIMIT 5
);
```

### Issue 3: Field Was Hidden When Value = 0
**Status**: ✅ **FIXED**

The code previously only showed the field when `creditBroughtForward > 0`. This has been updated to always display the field.

**What Changed**:
- **Before**: Conditional rendering - only showed if value > 0
- **After**: Always displays the field (shows TZS 0 if no credit)

**File Modified**: `src/components/DeliveryDetails.tsx` (line 634)

## Quick Fix Steps

### Step 1: Verify Database Column Exists
Run this diagnostic script:
```bash
node scripts/check_credit_brought_forward.js
```

This will tell you:
- ✅ If the column exists
- 📊 How many deliveries have credit > 0
- 💡 SQL commands to update test data

### Step 2: Run Migration (if needed)
If the script says the column doesn't exist:
1. Open Supabase SQL Editor
2. Run: `migrations/FIX_credit_brought_forward.sql`
3. Re-run the diagnostic script to verify

### Step 3: Set Test Data (optional)
To test the feature with actual credit values:
```sql
UPDATE saved_delivery_notes 
SET credit_brought_forward = 50000 
WHERE delivery_note_number = 'DN-2024-0001';  -- Replace with actual note number
```

### Step 4: Refresh the Application
1. Hard refresh your browser (Ctrl + Shift + R or Cmd + Shift + R)
2. Navigate to: General System → Sales Management → Saved Deliveries
3. Click the "View" (eye) icon on any delivery
4. Look for "Credit Brought Forward from previous:" in the Payment Summary section

## Expected Behavior

### After Fix:
The Payment Summary section should show:
```
Payment Summary
├── Total: TZS 100,000
├── Amount Paid: TZS 30,000
├── Credit Brought Forward from previous: TZS 50,000  ← Now visible!
└── AMOUNT DUE: TZS 120,000
```

### Amount Due Calculation:
```
Amount Due = Total - Amount Paid + Credit Brought Forward
           = 100,000 - 30,000 + 50,000
           = 120,000
```

## Verification Checklist

- [ ] Database column `credit_brought_forward` exists in `saved_delivery_notes` table
- [ ] At least one delivery has `credit_brought_forward > 0`
- [ ] Browser cache cleared (hard refresh)
- [ ] Delivery Details dialog shows "Credit Brought Forward from previous:" field
- [ ] Field displays the correct value from database
- [ ] AMOUNT DUE calculation includes the credit value

## Files Involved

1. **Database**: `saved_delivery_notes.credit_brought_forward` column
2. **Interface**: `src/utils/deliveryUtils.ts` - DeliveryData interface
3. **Data Layer**: `src/utils/deliveryUtils.ts` - getSavedDeliveries() function
4. **UI Component**: `src/components/DeliveryDetails.tsx` - Payment Summary section
5. **Diagnostics**: `scripts/check_credit_brought_forward.js`
6. **Migration**: `migrations/FIX_credit_brought_forward.sql`

## Still Not Working?

### Check Browser Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Click "View" on a delivery
4. Look for errors related to `creditBroughtForward`

### Check Network Tab
1. In DevTools, go to Network tab
2. Click "View" on a delivery
3. Check if the Supabase query includes `credit_brought_forward` in the response

### Manual Database Check
```sql
SELECT id, delivery_note_number, customer, total, credit_brought_forward 
FROM saved_delivery_notes 
LIMIT 5;
```

If `credit_brought_forward` column doesn't appear in results, the column wasn't added successfully.

## Common Errors

### Error: "column credit_brought_forward does not exist"
**Fix**: Run the migration SQL (see Step 1 above)

### Error: "NaN" displayed
**Fix**: This happens if the value is not a number. Update with valid number:
```sql
UPDATE saved_delivery_notes 
SET credit_brought_forward = 0 
WHERE credit_brought_forward IS NULL OR credit_brought_forward = 'NaN';
```

### Field Shows "TZS 0" But Should Have Value
**Fix**: The database value is actually 0. Update it:
```sql
UPDATE saved_delivery_notes 
SET credit_brought_forward = 50000 
WHERE delivery_note_number = 'YOUR_NOTE_NUMBER';
```

## Summary

The most likely issue is that **the database migration hasn't been run yet**. Run `migrations/FIX_credit_brought_forward.sql` in Supabase SQL Editor, and the field will start displaying immediately.

The UI has been updated to **always show the field** (even when value is 0), so you can verify it's working correctly.
