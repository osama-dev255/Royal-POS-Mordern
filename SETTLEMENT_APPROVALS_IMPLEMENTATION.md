# Settlement Approvals Feature Implementation

## Overview
Added an **Approvals** section to the Receivables page (OutletReceipts.tsx) to manage customer settlement approvals, similar to the expense approval workflow in the Expenses page.

## Changes Made

### 1. Database Migration
**File:** `migrations/20260608_add_approval_fields_to_customer_settlements.sql`

Added approval workflow columns to `customer_settlements` table:
- `approval_status` - VARCHAR(20): 'pending', 'approved', or 'rejected' (default: 'pending')
- `approved_by` - UUID: Reference to auth.users (who approved/rejected)
- `approval_date` - TIMESTAMP: When the approval action occurred
- `approval_notes` - TEXT: Optional notes about the approval/rejection

Created indexes for performance:
- `idx_customer_settlements_approval_status`
- `idx_customer_settlements_approved_by`

### 2. Database Service Functions
**File:** `src/services/databaseService.ts`

#### Updated Interface:
```typescript
export interface OutletCustomerSettlement {
  // ... existing fields
  approval_status?: 'pending' | 'approved' | 'rejected';
  approval_date?: string;
  approval_notes?: string;
}
```

#### New Functions:
1. **`approveOutletCustomerSettlement(settlementId, status, approvedBy, notes?)`**
   - Updates settlement approval status
   - Records who approved and when
   - Returns boolean success status

2. **`getPendingSettlementApprovals(outletId)`**
   - Fetches all settlements with 'pending' status
   - Orders by settlement_date (newest first)
   - Returns array of OutletCustomerSettlement

### 3. Receivables Page Updates
**File:** `src/pages/OutletReceipts.tsx`

#### New Imports:
- Icons: `CheckCircle`, `XCircle`, `Clock` from lucide-react
- Functions: `getPendingSettlementApprovals`, `approveOutletCustomerSettlement`, `OutletCustomerSettlement`

#### New State Variables:
```typescript
const [activeTab, setActiveTab] = useState<'all' | 'sales' | 'commission' | 'other' | 'approvals'>('all');
const [pendingApprovals, setPendingApprovals] = useState<OutletCustomerSettlement[]>([]);
```

#### New Functions:
1. **`loadPendingApprovals()`**
   - Fetches pending settlements for the outlet
   - Updates pendingApprovals state

2. **`handleApproveSettlement(settlementId, status)`**
   - Gets authenticated user
   - Calls approveOutletCustomerSettlement
   - Shows toast notification
   - Reloads data after approval

#### UI Changes:

1. **Updated Tabs:**
   - Changed grid from 4 to 5 columns
   - Added "Approvals" tab with badge showing count of pending approvals
   - Badge uses destructive variant (red) for visibility

2. **Updated Dropdown Select:**
   - Added "Approvals" option with count indicator

3. **Approvals Tab Content:**
   - Card header with Clock icon and title
   - Shows count of pending settlements
   - Empty state with CheckCircle icon when no pending approvals
   - List of pending settlements showing:
     - Invoice number
     - Payment method badge
     - Customer name
     - Date and notes
     - Previous balance, payment amount, new balance
     - Approve button (green)
     - Reject button (red outline)

4. **Auto-refresh:**
   - Pending approvals loaded automatically when fetchReceipts() is called
   - Data refreshes after approve/reject action

## How It Works

1. **Creating Settlements:**
   - New customer settlements are automatically created with `approval_status = 'pending'`
   - They appear in the Approvals tab immediately after creation
   - System requires approval before the settlement is considered final

2. **Editing Settlements:**
   - When a settlement is edited, it automatically resets to `approval_status = 'pending'`
   - Previous approval date and notes are cleared
   - Requires re-approval to ensure changes are reviewed

3. **Viewing Pending Approvals:**
   - Navigate to Receivables page
   - Click "Approvals" tab
   - See all pending settlements with full details

3. **Approving/Rejecting:**
   - Click "Approve" button → Settlement status changes to 'approved'
   - Click "Reject" button → Settlement status changes to 'rejected'
   - System records who performed the action and when
   - Settlement removed from pending list
   - Toast notification confirms the action

4. **Editing Settlements:**
   - Edit button available on settlement cards
   - Changes reset approval status to 'pending'
   - Requires re-approval after modifications

5. **Badge Indicator:**
   - Red badge on Approvals tab shows count of pending items
   - Updates automatically when approvals are processed

## Next Steps

To complete the implementation, you need to:

1. **Run the Migration:**
   ```bash
   # In Supabase SQL Editor, run:
   migrations/20260608_add_approval_fields_to_customer_settlements.sql
   ```

2. **Test the Feature:**
   - Create a new customer settlement
   - Verify it appears in Approvals tab
   - Approve/reject and verify it updates correctly
   - Check that badge count updates

3. **Optional Enhancements:**
   - Add filter by date range in Approvals tab
   - Add search functionality for pending approvals
   - Add bulk approve/reject functionality
   - Send notifications when settlements are approved/rejected
   - Add approval history tracking (separate table)
   - Require approval notes for rejections

## Files Modified

1. `migrations/20260608_add_approval_fields_to_customer_settlements.sql` (NEW)
2. `src/services/databaseService.ts` (MODIFIED)
3. `src/pages/OutletReceipts.tsx` (MODIFIED)

## Benefits

- ✅ Automatic approval workflow for all new customer settlements
- ✅ Clear visibility of pending approvals with badge
- ✅ Quick approve/reject actions
- ✅ Audit trail (who approved, when, notes)
- ✅ Consistent with expense approval pattern
- ✅ Auto-refresh after actions
- ✅ Responsive design with proper icons and colors
- ✅ Edit resets approval status for re-approval
- ✅ Ensures all settlements are reviewed before finalization
