# Delivery Source Tracking Implementation

## Overview
This implementation adds the ability to track and filter deliveries within the "Deliveries In" section based on their source:
- **From Investment**: Deliveries from the main warehouse/investment
- **From Other Outlets**: Deliveries from other branch outlets

## Changes Made

### 1. Database Migration
**File**: `migrations/20260426_add_source_type_to_deliveries.sql`

Added two new columns to the `saved_delivery_notes` table:
- `source_type` (VARCHAR): Indicates the source of the delivery
  - Values: `'investment'` (default) or `'outlet'`
- `source_outlet_id` (UUID): References the source outlet (if source_type is 'outlet')

Created indexes for optimized queries:
- `idx_saved_delivery_notes_source_type`
- `idx_saved_delivery_notes_source_outlet`

### 2. TypeScript Interface Updates
**File**: `src/utils/deliveryUtils.ts`

Updated `DeliveryData` interface to include:
```typescript
sourceType?: 'investment' | 'outlet';
sourceOutletId?: string;
sourceOutletName?: string; // For display purposes
```

### 3. Data Layer Updates
**File**: `src/utils/deliveryUtils.ts`

Updated the following functions to handle the new source fields:
- `saveDelivery()`: Now saves source_type and source_outlet_id
- `getSavedDeliveries()`: Retrieves and maps source fields
- `getDeliveriesByOutletId()`: Includes source information
- `updateDelivery()`: Updates source fields

### 4. UI Updates
**File**: `src/pages/OutletDeliveries.tsx`

#### Added Features:
1. **Source Filter State**: New state variable `sourceFilter` to track selected source type
2. **Source Filter Buttons**: Three buttons appear when "Deliveries In" is selected:
   - **All Sources**: Shows all incoming deliveries
   - **From Investment**: Shows only deliveries from main warehouse
   - **From Other Outlets**: Shows only deliveries from other outlets

3. **Enhanced Filtering Logic**: Updated filter function to respect source type selection
4. **Outlet Name Enrichment**: Automatically resolves source outlet names for display

#### UI Structure:
```
Section Filter Tabs: [All] [Deliveries In] [Deliveries Out]
                                                ↓ (when "Deliveries In" selected)
Source Filter Tabs: [All Sources] [From Investment] [From Other Outlets]
```

### 5. Migration Script
**File**: `scripts/run_source_type_migration.js`

Created a helper script to run the database migration. The script:
- Reads the migration SQL file
- Displays the SQL for manual execution in Supabase SQL Editor
- Provides clear instructions for completion

## How to Use

### Step 1: Run the Database Migration
1. Open your Supabase Dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `migrations/20260426_add_source_type_to_deliveries.sql`
4. Execute the SQL

OR run the migration script:
```bash
node scripts/run_source_type_migration.js
```

### Step 2: Using the New Feature
1. Navigate to **Registered Outlets** → Select an outlet → **Deliveries**
2. Click on the **"Deliveries In"** tab
3. You'll now see three source filter buttons:
   - **All Sources**: Shows all incoming deliveries
   - **From Investment**: Shows deliveries from main warehouse
   - **From Other Outlets**: Shows deliveries from other outlets

4. Click any filter to view only deliveries from that source
5. Each filter shows a count badge with the number of deliveries

### Step 3: Creating Deliveries with Source Information
When creating new deliveries (future enhancement), you can specify:
- `sourceType`: Set to `'investment'` or `'outlet'`
- `sourceOutletId`: If source is another outlet, provide the outlet ID

## Benefits

1. **Better Organization**: Clearly separate deliveries by their source
2. **Improved Tracking**: Know exactly where inventory is coming from
3. **Enhanced Reporting**: Generate reports based on delivery source
4. **Scalability**: Easy to add more source types in the future
5. **Backward Compatible**: Existing deliveries default to 'investment' source

## Database Schema

### saved_delivery_notes Table (Updated)
```sql
source_type VARCHAR(50) DEFAULT 'investment' 
  CHECK (source_type IN ('investment', 'outlet'))
source_outlet_id UUID REFERENCES outlets(id)
```

## Future Enhancements

1. **Delivery Creation UI**: Add source type selection when creating new deliveries
2. **Source Outlet Dropdown**: When source is 'outlet', show dropdown to select source outlet
3. **Advanced Reporting**: Generate reports comparing investment vs outlet deliveries
4. **Transfer History**: Track complete transfer history between outlets
5. **Stock Reconciliation**: Automated reconciliation based on delivery sources

## Testing Checklist

- [x] Database migration created
- [x] TypeScript interfaces updated
- [x] Data layer functions updated
- [x] UI filter buttons added
- [x] Filtering logic implemented
- [x] Outlet name resolution working
- [x] No TypeScript errors
- [ ] Manual testing in development environment
- [ ] Verify migration runs successfully
- [ ] Test with existing delivery data
- [ ] Test creating new deliveries with source information

## Notes

- All existing deliveries will default to `source_type = 'investment'`
- The source filter only appears when "Deliveries In" section is selected
- The implementation is backward compatible and won't break existing functionality
- Indexes ensure query performance remains optimal even with large datasets

## Files Modified

1. `migrations/20260426_add_source_type_to_deliveries.sql` (NEW)
2. `src/utils/deliveryUtils.ts` (MODIFIED)
3. `src/pages/OutletDeliveries.tsx` (MODIFIED)
4. `scripts/run_source_type_migration.js` (NEW)

## Support

If you encounter any issues:
1. Check that the migration has been run successfully
2. Verify the new columns exist in the `saved_delivery_notes` table
3. Check browser console for any JavaScript errors
4. Ensure all TypeScript files compile without errors
