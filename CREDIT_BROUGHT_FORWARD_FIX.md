# Credit Brought Forward - Issue Fixed ✅

## Problem
User was entering a value in "Credit Brought Forward from previous:" field but the system was showing 0.00

## Root Cause
The field was **display-only** in the Delivery Details view. There was no way for users to **input or edit** the value through the UI.

## Solution Applied

### ✅ Added Editable Input Field
**File**: `src/components/SavedDeliveriesSection.tsx` (lines 529-539)

Added an input field in the **Edit Delivery** dialog that allows users to enter the credit brought forward amount.

### What Changed:

#### Before:
- Field only displayed in Delivery Details (view-only)
- No way to input or edit the value
- Always showed 0.00 because database had no value

#### After:
- **Editable input field** in Edit Delivery dialog
- Orange border styling to match display color
- Helper text: "Enter any outstanding credit from previous deliveries for this customer"
- Automatically saves to database when delivery is updated
- Value immediately reflects in Delivery Details view

## How to Use

### Step 1: Run Database Migration (if not done yet)
```sql
-- Run this in Supabase SQL Editor
-- File: migrations/FIX_credit_brought_forward.sql

ALTER TABLE saved_delivery_notes 
ADD COLUMN IF NOT EXISTS credit_brought_forward DECIMAL(15, 2) DEFAULT 0;
```

### Step 2: Edit a Delivery to Set Credit
1. Go to **General System** → **Sales Management** → **Saved Deliveries**
2. Find the delivery you want to edit
3. Click the **Edit** icon (pencil) ✏️
4. Scroll down to find **"Credit Brought Forward from previous:"** field
5. Enter the credit amount (e.g., `50000` for TZS 50,000)
6. Click **Save**

### Step 3: View the Updated Value
1. Click the **View** icon (eye) 👁️ on the same delivery
2. Scroll to **Payment Summary** section
3. You'll now see:
   ```
   Payment Summary
   ├── Total: TZS 100,000
   ├── Amount Paid: TZS 30,000
   ├── Credit Brought Forward from previous: TZS 50,000  ← Your entered value!
   └── AMOUNT DUE: TZS 120,000
   ```

## Files Modified

1. ✅ `src/components/SavedDeliveriesSection.tsx` - Added editable input field
2. ✅ `src/components/DeliveryDetails.tsx` - Always display field (even when 0)
3. ✅ `src/utils/deliveryUtils.ts` - Already had database mapping

## Testing

### Test Scenario 1: Set Credit Value
1. Edit a delivery
2. Set "Credit Brought Forward from previous:" to 50000
3. Save
4. View the delivery
5. ✅ Should show TZS 50,000 in orange

### Test Scenario 2: Amount Due Calculation
1. Set:
   - Total: 100,000
   - Amount Paid: 30,000
   - Credit Brought Forward: 50,000
2. ✅ Amount Due should be: 120,000 (100,000 - 30,000 + 50,000)

### Test Scenario 3: Zero Credit
1. Edit a delivery
2. Set "Credit Brought Forward from previous:" to 0
3. Save and view
4. ✅ Should show TZS 0

## Important Notes

- The field **always displays** in Delivery Details (even when 0)
- Values are stored in database as `DECIMAL(15, 2)`
- Orange color coding helps identify the field easily
- Helper text guides users on what to enter
- Automatically included in Amount Due calculation

## Still Not Working?

### Check 1: Database Column Exists
Run in Supabase SQL Editor:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'saved_delivery_notes' 
AND column_name = 'credit_brought_forward';
```
Should return: `credit_brought_forward | numeric`

### Check 2: Value Saved in Database
```sql
SELECT delivery_note_number, credit_brought_forward 
FROM saved_delivery_notes 
WHERE credit_brought_forward > 0;
```

### Check 3: Browser Cache
- Hard refresh: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
- Clear browser cache if needed

## Summary

The issue is now **completely fixed**. Users can:
- ✅ **Input** credit values in Edit Delivery dialog
- ✅ **View** credit values in Delivery Details
- ✅ **Save** to database
- ✅ See correct **Amount Due** calculation

All that's needed is to run the database migration (if not already done), then the feature works end-to-end!
