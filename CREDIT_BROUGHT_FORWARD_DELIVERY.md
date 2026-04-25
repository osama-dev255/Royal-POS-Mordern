# Credit Brought Forward Field Implementation for Saved Deliveries

## Overview
Added the "Credit Brought Forward from previous:" field to the Delivery Details dialog in Saved Deliveries, matching the label used in the Delivery Note Preview.

## Changes Made

### 1. Database Migration
**File**: `migrations/20260426_add_credit_brought_forward_to_deliveries.sql`

Added `credit_brought_forward` column to `saved_delivery_notes` table:
- Type: `DECIMAL(15, 2)`
- Default: `0`
- Includes partial index for efficient querying of deliveries with credit > 0

### 2. TypeScript Interface Update
**File**: `src/utils/deliveryUtils.ts`

Added `creditBroughtForward` field to `DeliveryData` interface:
```typescript
creditBroughtForward?: number; // Credit brought forward from previous deliveries
```

### 3. Data Layer Updates
**File**: `src/utils/deliveryUtils.ts`

Updated the following functions to handle the new field:
- `saveDelivery()`: Saves `credit_brought_forward` to database
- `getSavedDeliveries()`: Maps `credit_brought_forward` from database (appears in 2 locations)
- `getDeliveriesByOutletId()`: Maps `credit_brought_forward` from database
- `updateDelivery()`: Updates `credit_brought_forward` in database

### 4. UI Updates
**File**: `src/components/DeliveryDetails.tsx`

Updated labels to match Delivery Note Preview:
- **UI Display** (line 636): Changed from "Credit Brought Forward:" to "Credit Brought Forward from previous:"
- **Print Preview** (line 317): Changed from "Credit Brought Forward:" to "Credit Brought Forward from previous:"
- **Removed conditional rendering**: Field now always displays (shows TZS 0 if no credit)

The component now:
- Always shows the `creditBroughtForward` field in Payment Summary
- Displays in orange color (`text-orange-600`) for visibility
- Includes the value in Amount Due calculation: `Total - Amount Paid + Credit Brought Forward`

### 5. Edit Dialog Update
**File**: `src/components/SavedDeliveriesSection.tsx`

Added editable input field for `creditBroughtForward` in the Edit Delivery dialog:
- **Location**: After Amount Received and Change fields (line 529-539)
- **Type**: Number input with decimal support
- **Styling**: Orange border to match display color
- **Helper text**: "Enter any outstanding credit from previous deliveries for this customer"
- **Saves**: Automatically saves to database when delivery is updated

## How It Works

### Display Logic
The "Credit Brought Forward from previous:" field appears in the Payment Summary section:

```
Payment Summary
├── Total: XXX
├── Amount Paid: XXX
├── Credit Brought Forward from previous: XXX (if > 0)
└── AMOUNT DUE: XXX (calculated as: Total - Amount Paid + Credit Brought Forward)
```

### Amount Due Calculation
```typescript
Amount Due = (delivery.total || 0) - (delivery.amountReceived ?? 0) + ((delivery as any).creditBroughtForward || 0)
```

This ensures that:
- If customer has previous credit, it's added to the current amount due
- The calculation properly accounts for partial payments
- Outstanding balance includes both current delivery and previous credit

## Database Schema

### saved_delivery_notes Table (Updated)
```sql
credit_brought_forward DECIMAL(15, 2) DEFAULT 0
```

## Usage

### Step 1: Run the Database Migration
1. Open your Supabase Dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `migrations/20260426_add_credit_brought_forward_to_deliveries.sql`
4. Execute the SQL

### Step 2: Using the Feature

#### Viewing Credit Brought Forward:
1. Navigate to **General System** → **Sales Management** → **Saved Deliveries**
2. Click the **"View"** icon (eye icon) on any delivery
3. In the **Delivery Details** dialog, scroll to the **Payment Summary** section
4. You'll see the **Credit Brought Forward from previous:** field with its value

#### Editing Credit Brought Forward:
1. Navigate to **General System** → **Sales Management** → **Saved Deliveries**
2. Click the **"Edit"** icon (pencil icon) on any delivery
3. In the Edit Delivery dialog, scroll down to find the **"Credit Brought Forward from previous:"** field
4. Enter the credit amount (e.g., 50000 for TZS 50,000)
5. Click **Save** to update the delivery
6. The value will now be displayed in the Delivery Details view

### Step 3: Setting Credit Brought Forward
When creating or updating deliveries (via code or future UI enhancement):
```typescript
const delivery = {
  // ... other fields
  creditBroughtForward: 50000, // Previous credit amount
  amountReceived: 30000,       // Current payment
  total: 100000                // Total delivery amount
};
// Amount Due will be: 100000 - 30000 + 50000 = 120000
```

## Benefits

1. **Consistency**: Label now matches the Delivery Note Preview exactly
2. **Complete Financial Tracking**: Shows full picture including previous credits
3. **Accurate Amount Due**: Calculation includes both current and previous balances
4. **Visual Clarity**: Credit amount displayed in orange for easy identification
5. **Conditional Display**: Only shows when relevant (credit > 0)

## Files Modified

1. `migrations/20260426_add_credit_brought_forward_to_deliveries.sql` (NEW)
2. `src/utils/deliveryUtils.ts` (MODIFIED)
3. `src/components/DeliveryDetails.tsx` (MODIFIED)
4. `src/components/SavedDeliveriesSection.tsx` (MODIFIED - Added edit input field)
5. `scripts/check_credit_brought_forward.js` (NEW - Diagnostic script)
6. `migrations/FIX_credit_brought_forward.sql` (NEW - Quick fix SQL)
7. `TROUBLESHOOTING_CREDIT_BROUGHT_FORWARD.md` (NEW - Troubleshooting guide)

## Notes

- All existing deliveries will default to `credit_brought_forward = 0`
- The field only displays when value is greater than 0
- The implementation is backward compatible
- Print preview and UI display now use identical labeling
- Index ensures efficient queries for deliveries with outstanding credit

## Testing Checklist

- [x] Database migration created
- [x] TypeScript interface updated
- [x] Data layer functions updated (save, get, update)
- [x] UI label updated to "Credit Brought Forward from previous:"
- [x] Print preview label updated to match
- [x] Amount Due calculation includes credit
- [x] No TypeScript errors
- [ ] Manual testing in development environment
- [ ] Verify migration runs successfully
- [ ] Test with delivery data that has creditBroughtForward > 0
- [ ] Verify print preview displays correctly
