# Payroll System Implementation Guide

## Overview
A complete payroll management system has been implemented for the Outlet section of the POS system.

## Files Created/Modified

### 1. Database Migration
**File:** `migrations/20260529_create_payroll_tables.sql`

This migration creates:
- `outlet_employees` table - Employee records for each outlet
- `payroll_records` table - Payroll compensation tracking
- Indexes for performance optimization
- Row Level Security (RLS) policies
- Automatic timestamp update triggers

### 2. Database Service Functions
**File:** `src/services/databaseService.ts` (Modified)

Added functions:
- `getOutletEmployees(outletId)` - Fetch all employees for an outlet
- `createOutletEmployee(employee)` - Add new employee
- `updateOutletEmployee(id, employee)` - Update employee details
- `deleteOutletEmployee(id)` - Remove employee
- `getPayrollRecords(outletId)` - Fetch payroll records with employee names
- `createPayrollRecord(record)` - Create payroll entry
- `updatePayrollRecord(id, record)` - Update payroll record
- `deletePayrollRecord(id)` - Delete payroll record

Added interfaces:
- `OutletEmployee` - Employee data structure
- `PayrollRecord` - Payroll record data structure

### 3. Payroll Page Component
**File:** `src/pages/OutletPayroll.tsx` (New)

Features:
- Employee management (CRUD operations)
- Payroll record creation and management
- Automatic salary calculations
- Allowance tracking (housing, transport, meal, overtime)
- Deduction tracking (tax, social security, health insurance, advances)
- Status workflow (pending → approved → paid)
- Real-time gross/net salary calculations
- Search and filter functionality
- Statistics dashboard

### 4. Navigation Integration
**Files Modified:**
- `src/components/OutletLayout.tsx` - Added Payroll menu item
- `src/pages/Index.tsx` - Added routing for outlet-payroll-* views

## Database Setup Instructions

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `migrations/20260529_create_payroll_tables.sql`
4. Paste and execute the SQL
5. Verify the tables were created in the Table Editor

### Option 2: Using Supabase CLI

```bash
supabase db push
```

### Verification

After running the migration, verify by checking:
1. Tables exist: `outlet_employees`, `payroll_records`
2. Indexes are created
3. RLS policies are active
4. Triggers are in place

## Features

### Employee Management
- Employee code (auto-generated or manual)
- Personal information (name, email, phone)
- Job details (position, department, hire date)
- Base salary configuration
- Active/Inactive status

### Payroll Management
- **Pay Period**: Start and end dates
- **Allowances**:
  - Housing allowance
  - Transport allowance
  - Meal allowance
  - Overtime (hours and pay)
  - Other allowances
- **Deductions**:
  - Tax deduction
  - Social security
  - Health insurance
  - Advance payment
  - Other deductions
- **Automatic Calculations**:
  - Gross Salary = Base + All Allowances
  - Total Deductions = All Deductions
  - Net Salary = Gross - Deductions
- **Status Workflow**:
  - Pending (default)
  - Approved
  - Paid (records payment date)
  - Cancelled

### Dashboard Statistics
- Active employee count
- This month's total payroll
- Pending payroll count
- Paid payroll count

### UI Features
- Tabbed interface (Employees / Payroll Records)
- Search functionality
- Edit and delete actions
- Status badges with icons
- Responsive design
- Loading states
- Toast notifications

## Usage

### Accessing Payroll
1. Navigate to an outlet
2. Click "Payroll" in the sidebar menu
3. Manage employees and payroll records

### Creating an Employee
1. Click "Add Employee" button
2. Fill in employee details
3. Set base salary
4. Click "Create Employee"

### Creating Payroll
1. Click "Create Payroll" button
2. Select employee (auto-fills base salary)
3. Set pay period
4. Add allowances and deductions
5. Review calculated totals
6. Set status (pending/approved/paid)
7. Click "Create Payroll"

### Updating Payroll Status
1. In Payroll Records tab
2. For pending records: Click "Approve"
3. For approved records: Click "Mark Paid"
4. Status updates automatically

## Next Steps

1. **Run the database migration** (see Database Setup Instructions)
2. **Test the feature**:
   - Add a test employee
   - Create a test payroll record
   - Verify calculations
   - Test status workflow
3. **Customize** allowances/deductions as needed
4. **Add reports** (future enhancement)
5. **Export functionality** (future enhancement)

## Troubleshooting

### Tables not showing up
- Ensure migration SQL was executed successfully
- Check Supabase logs for errors
- Verify RLS policies are correct

### Cannot save employee/payroll
- Check browser console for errors
- Verify Supabase connection
- Ensure all required fields are filled

### Calculations incorrect
- Verify all allowance/deduction values are numbers
- Check for null values in form
- Review calculatePayroll() function logic

## Technical Details

### TypeScript Interfaces
```typescript
interface OutletEmployee {
  id?: string;
  outlet_id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  position: string;
  department?: string;
  hire_date: string;
  base_salary: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface PayrollRecord {
  id?: string;
  outlet_id: string;
  employee_id: string;
  pay_period_start: string;
  pay_period_end: string;
  base_salary: number;
  housing_allowance?: number;
  transport_allowance?: number;
  meal_allowance?: number;
  overtime_hours?: number;
  overtime_pay?: number;
  other_allowances?: number;
  tax_deduction?: number;
  social_security?: number;
  health_insurance?: number;
  advance_payment?: number;
  other_deductions?: number;
  gross_salary: number;
  total_deductions: number;
  net_salary: number;
  status?: 'pending' | 'approved' | 'paid' | 'cancelled';
  payment_date?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  employee_name?: string;
}
```

### Database Schema
See `migrations/20260529_create_payroll_tables.sql` for complete schema.

## Support
For issues or questions, check:
1. Browser console for errors
2. Supabase logs for database errors
3. Network tab for API call failures
