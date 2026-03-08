# Admin Delete Sales Order with Password Confirmation

## Overview
This feature allows only **admin users** to delete sales orders after confirming with their password. This adds an extra layer of security to prevent unauthorized deletions.

## Implementation Details

### Files Modified
- **`src/pages/SalesOrders.tsx`** - Main sales orders management page

### Key Features

#### 1. **Role-Based Access Control**
- Only users with `admin` role can delete sales orders
- Non-admin users will see an error message when attempting to delete
- Role is checked when component mounts using `getCurrentUserRole()`

#### 2. **Password Confirmation Dialog**
When an admin clicks the delete button:
- A confirmation dialog appears
- Admin must enter their password
- Password is verified against Supabase authentication
- Only after successful verification, the deletion proceeds

#### 3. **Security Flow**
```
User clicks Delete → Check if admin → Show password dialog → 
Verify password → Delete order → Show success message
```

### Code Changes

#### 1. **Imports Added**
```typescript
import { getCurrentUser, signIn } from "@/services/authService";
import { getCurrentUserRole } from "@/utils/salesPermissionUtils";
import { Lock } from "lucide-react"; // For dialog icon
import { DialogDescription } from "@/components/ui/dialog";
```

#### 2. **State Variables Added**
```typescript
const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
const [deletePassword, setDeletePassword] = useState('');
const [passwordError, setPasswordError] = useState('');
const [userRole, setUserRole] = useState<string | null>(null);
const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
```

#### 3. **Delete Handler Functions**

**`handleDeleteSO(id: string)`**
- Checks if user is admin
- Shows password confirmation dialog
- Stores the order ID to be deleted

**`handleConfirmDelete()`**
- Validates password is entered
- Gets current user's email
- Verifies password using `signIn()`
- On success, deletes the order
- Refreshes the data list
- Shows appropriate toast messages

#### 4. **Password Confirmation Dialog UI**
```tsx
<Dialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        <Lock className="h-5 w-5 text-destructive" />
        Confirm Deletion
      </DialogTitle>
      <DialogDescription>
        This action cannot be undone. Please enter your password to confirm deletion.
      </DialogDescription>
    </DialogHeader>
    <Input 
      type="password" 
      placeholder="Enter your password"
      value={deletePassword}
      onChange={(e) => setDeletePassword(e.target.value)}
    />
    <DialogFooter>
      <Button variant="outline" onClick={/* cancel */}>Cancel</Button>
      <Button variant="destructive" onClick={/* confirm */}>Delete Order</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

## User Experience

### For Admin Users:
1. Click the **Delete** (trash) icon on any sales order
2. Password confirmation dialog appears
3. Enter your admin password
4. Click "Delete Order" button
5. Order is deleted if password is correct
6. Success toast message appears

### For Non-Admin Users:
1. Click the **Delete** (trash) icon
2. Error toast appears: "Only admins can delete sales orders"
3. No deletion occurs

## Error Handling

### Password Validation Errors:
- **Empty password**: "Password is required"
- **Incorrect password**: "Incorrect password. Please try again."
- **Authentication error**: "Authentication error. Please log in again."
- **General error**: "Authentication failed. Please try again."

### Deletion Errors:
- Database errors are caught and displayed
- Toast notifications show error details
- Data remains unchanged if deletion fails

## Security Considerations

1. **Password Verification**: Uses Supabase `signIn()` to verify credentials
2. **Role Check**: Validates admin role before showing dialog
3. **No Password Storage**: Password is never stored, only used for auth
4. **Session Validation**: Checks current user session before deletion
5. **Error Messages**: Generic messages to prevent information leakage

## Testing Checklist

- [ ] Admin can delete with correct password
- [ ] Admin cannot delete with incorrect password
- [ ] Non-admin users cannot delete at all
- [ ] Password field is secure (type="password")
- [ ] Enter key submits the password
- [ ] Cancel button closes dialog without deletion
- [ ] Success message appears after deletion
- [ ] Error messages display correctly
- [ ] Data refreshes after successful deletion
- [ ] Dialog resets state when closed

## Similar Implementations

This pattern is already used in:
- **`SavedSalesOrdersCard.tsx`** - Saved sales orders deletion
- **`SavedInvoicesCard.tsx`** - Saved invoices deletion

The implementation follows the same security pattern for consistency.

## Future Enhancements

1. **Audit Logging**: Log who deleted what order and when
2. **Soft Delete**: Mark as deleted instead of permanent removal
3. **Batch Delete**: Allow multiple deletions with one password entry
4. **Timeout**: Auto-close dialog after period of inactivity
5. **Rate Limiting**: Prevent brute force password attempts

## Related Documentation

- **SAVED_SALES_ORDERS_FEATURE.md** - Saved sales orders feature
- **SALES_ORDERS_CRUD.md** - Sales orders CRUD operations
- **STAFF_ACCESS_CONTROL.md** - User roles and permissions

## Support

For issues or questions about this feature:
1. Check browser console for errors
2. Verify user has admin role in database
3. Ensure Supabase authentication is working
4. Review RLS policies for sales table
