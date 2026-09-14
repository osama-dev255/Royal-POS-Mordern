# SPN Rejection Status Fix

## Issue
When updating a Supplier Purchase Note status to "rejected" and entering a rejection reason, the system showed the error:
```
Update Failed: invalid input syntax for type date: ""
```

## Root Cause
Two issues were identified:

1. **Empty date strings sent to PostgreSQL**: When updating SPN status, the code sent empty strings (`''`) for date fields that weren't relevant to the new status. PostgreSQL's DATE columns cannot accept empty strings - they require either a valid date or NULL.

2. **Missing rejection reason persistence**: The `rejected_reason` column didn't exist in the `supplier_purchase_notes` table, so rejection reasons weren't being saved to the database.

## Solution

### 1. Database Migration
Created migration `20260914_add_rejected_reason_to_spn.sql`:
```sql
ALTER TABLE supplier_purchase_notes ADD COLUMN IF NOT EXISTS rejected_reason TEXT;
```

**Action Required**: Run this migration in your Supabase SQL Editor.

### 2. Code Changes

#### `src/utils/supplierPurchaseNoteUtils.ts`
- Added `rejectedReason: string` to `SupplierPurchaseNoteData` and `SavedSupplierPurchaseNote` interfaces
- Updated `saveSupplierPurchaseNote` to include `rejected_reason` field
- Updated `getSavedSupplierPurchaseNotes` to read `rejected_reason` from database
- Updated `updateSupplierPurchaseNote` to:
  - Handle `rejectedReason` field
  - Use `null` instead of empty strings for `rejected_date` and `verified_date` when not applicable

#### `src/components/SupplierPurchaseNoteSection.tsx`
- Fixed `handleStatusSave` to use `null` instead of empty strings for date fields:
  ```typescript
  rejectedDate: newStatus === 'rejected' ? new Date().toISOString().split('T')[0] : null,
  verifiedDate: newStatus === 'verified' ? new Date().toISOString().split('T')[0] : null,
  ```
- Added `rejectedReason` to the update payload
- Added rejection reason display in the detail view
- Passed `rejectedReason` to the card component

#### `src/components/SPNStatusDialog.tsx`
- Removed `as any` type casts now that `rejectedReason` is properly typed
- Rejection reason now displays correctly in the current status preview

#### `src/components/SupplierPurchaseNoteCard.tsx`
- Added `rejectedReason?: string` to the interface
- Updated card to display rejection reason: "Rejected by: Name — Reason"

## Testing
1. Run the migration in Supabase SQL Editor
2. Open a Supplier Purchase Note in "Saved Supplier Purchase Notes"
3. Click the status badge to open the "Update SPN Status" dialog
4. Select "Rejected" status
5. Enter a name in "Rejected By" field
6. Enter a reason in "Rejection Reason" field
7. Click "Update Status"
8. Verify the status updates successfully without errors
9. Verify the rejection reason is displayed on the card and in the detail view

## Files Modified
- `migrations/20260914_add_rejected_reason_to_spn.sql` (new)
- `src/utils/supplierPurchaseNoteUtils.ts`
- `src/components/SupplierPurchaseNoteSection.tsx`
- `src/components/SPNStatusDialog.tsx`
- `src/components/SupplierPurchaseNoteCard.tsx`

## Database Schema Change
```sql
ALTER TABLE supplier_purchase_notes ADD COLUMN IF NOT EXISTS rejected_reason TEXT;
```
