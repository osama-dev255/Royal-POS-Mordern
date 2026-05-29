# Attendance System Integration with Payroll

## Overview
The attendance tracking system has been integrated into the payroll module. Attendance now automatically affects salary calculations based on presence, absences, lateness, and perfect attendance.

## Database Changes

### New Table: `attendance_records`
Tracks daily attendance for each employee with the following features:

**Fields:**
- `id` - Unique identifier
- `outlet_id` - Outlet reference
- `employee_id` - Employee reference  
- `attendance_date` - Date of attendance
- `status` - Attendance status (present, absent, late, half_day, on_leave, holiday)
- `check_in_time` - Actual check-in time
- `check_out_time` - Actual check-out time
- `expected_check_in` - Expected check-in time (default: 09:00)
- `expected_check_out` - Expected check-out time (default: 17:00)
- `late_minutes` - Minutes late
- `early_departure_minutes` - Minutes left early
- `notes` - Additional notes
- `marked_by` - User who marked attendance

**Constraints:**
- One attendance record per employee per day (UNIQUE constraint)
- Status must be one of: present, absent, late, half_day, on_leave, holiday

### Updated Table: `payroll_records`
Added attendance-related columns:

**New Fields:**
- `working_days` - Total working days in pay period
- `days_present` - Days marked present
- `days_absent` - Days marked absent
- `days_late` - Days marked late
- `days_half_day` - Days marked half day
- `days_on_leave` - Days marked on leave
- `total_late_minutes` - Total minutes late in period
- `per_day_salary` - Calculated per-day salary
- `attendance_deduction` - Deduction for absences/half-days
- `late_penalty` - Penalty for late arrivals
- `perfect_attendance_bonus` - Bonus for perfect attendance

## Migration Required

**File:** `migrations/20260529_add_attendance_to_payroll.sql`

### Setup Instructions:
1. Go to **Supabase Dashboard** → **SQL Editor**
2. Copy contents of migration file
3. Execute the SQL
4. Verify tables and columns created

## Salary Calculation Logic

### Attendance Impact on Salary

#### 1. **Per-Day Salary Calculation**
```typescript
per_day_salary = base_salary / working_days
```
- Working days exclude Sundays by default
- Calculated based on pay period start and end dates

#### 2. **Attendance Deductions**
```typescript
attendance_deduction = (days_absent × per_day_salary) + (days_half_day × per_day_salary × 0.5)
```
- Full day absence: Deducts full day salary
- Half day: Deducts 50% of day salary

#### 3. **Late Penalty**
```typescript
late_penalty = floor(total_late_minutes / 15) × $1
```
- $1 penalty for every 15 minutes late
- Calculated on cumulative late minutes

#### 4. **Perfect Attendance Bonus**
```typescript
perfect_attendance_bonus = $50 (if eligible)
```
**Eligibility Criteria:**
- Zero absences
- Zero late arrivals
- Zero half days
- At least 1 day present

#### 5. **Final Net Salary**
```typescript
gross_salary = base_salary + allowances + perfect_attendance_bonus
total_deductions = taxes + benefits + advances + attendance_deduction + late_penalty
net_salary = gross_salary - total_deductions
```

## Features

### 1. **Attendance Marking**

#### Individual Attendance
- Select employee
- Choose date
- Set status (Present/Absent/Late/Half Day/On Leave/Holiday)
- Record check-in/check-out times
- Log late minutes
- Add notes

#### Bulk Attendance
- Mark all employees present for a specific date
- Mark all employees absent for a specific date
- Quick action buttons in Attendance tab

### 2. **Attendance Tab**
New tab in Payroll Management showing:
- All attendance records
- Filterable by employee/date
- Status badges with icons
- Check-in/out times
- Late minutes tracking
- Edit and delete actions

### 3. **Payroll Integration**
When creating/editing payroll:
- Automatically fetches attendance for the pay period
- Calculates working days
- Shows attendance summary
- Displays per-day salary
- Calculates deductions and penalties
- Shows perfect attendance bonus if eligible
- Real-time salary preview with attendance impact

### 4. **Statistics Dashboard**
Updated cards showing:
- Active Employees
- This Month Payroll
- **Present Today** (new)
- **Absent Today** (new)

## Usage Workflow

### Daily Attendance Marking

**Option 1: Bulk Marking (Recommended)**
1. Navigate to Payroll → Attendance tab
2. Click "Mark All Present Today" or "Mark All Absent Today"
3. Confirm the action
4. All active employees marked with selected status

**Option 2: Individual Marking**
1. Navigate to Payroll → Attendance tab
2. Click "Mark Attendance" button
3. Select employee
4. Choose date (defaults to today)
5. Set status
6. Enter check-in/out times if applicable
7. Enter late minutes if late
8. Add notes (optional)
9. Click "Mark Attendance"

### Creating Payroll with Attendance

1. Navigate to Payroll → Payroll Records tab
2. Click "Create Payroll"
3. Select employee
4. Set pay period (start and end dates)
5. Base salary auto-fills from employee record
6. Add allowances and other deductions
7. **Review Attendance Summary section:**
   - Working days calculated
   - Days present/absent/late shown
   - Per-day salary displayed
   - Attendance deductions calculated
   - Late penalties calculated
   - Perfect attendance bonus applied if eligible
8. Review final net salary
9. Save payroll record

## Example Scenarios

### Scenario 1: Perfect Attendance
**Employee:** John Doe
**Base Salary:** $3,000/month
**Working Days:** 26 days
**Attendance:** 26 days present, 0 absent, 0 late

**Calculation:**
- Per-day salary: $3,000 / 26 = $115.38
- Attendance deduction: $0 (no absences)
- Late penalty: $0 (no late arrivals)
- Perfect attendance bonus: $50 ✓
- Gross salary: $3,000 + $50 = $3,050
- Net salary: $3,050 - deductions

### Scenario 2: Absences and Late Arrivals
**Employee:** Jane Smith
**Base Salary:** $2,600/month
**Working Days:** 26 days
**Attendance:** 23 present, 2 absent, 1 late (30 min)

**Calculation:**
- Per-day salary: $2,600 / 26 = $100
- Attendance deduction: (2 × $100) = $200
- Late penalty: floor(30/15) × $1 = $2
- Perfect attendance bonus: $0 (not eligible)
- Gross salary: $2,600
- Total deductions: Other deductions + $200 + $2
- Net salary: Gross - Total deductions

### Scenario 3: Half Days
**Employee:** Bob Johnson
**Base Salary:** $2,800/month
**Working Days:** 26 days
**Attendance:** 24 present, 1 absent, 1 half-day

**Calculation:**
- Per-day salary: $2,800 / 26 = $107.69
- Attendance deduction: (1 × $107.69) + (1 × $107.69 × 0.5) = $161.54
- Perfect attendance bonus: $0 (not eligible)
- Gross salary: $2,800
- Total deductions: Other deductions + $161.54
- Net salary: Gross - Total deductions

## Database Service Functions

### Attendance Functions
```typescript
// Get attendance records with optional filters
getAttendanceRecords(outletId, employeeId?, startDate?, endDate?)

// Create single attendance record
createAttendanceRecord(record: AttendanceRecord)

// Update attendance record
updateAttendanceRecord(id, record)

// Delete attendance record
deleteAttendanceRecord(id)

// Bulk create attendance records
bulkCreateAttendance(records: AttendanceRecord[])
```

### Updated Payroll Functions
Payroll functions now include attendance fields in:
- `createPayrollRecord()`
- `updatePayrollRecord()`
- `getPayrollRecords()` - returns attendance data

## TypeScript Interfaces

```typescript
interface AttendanceRecord {
  id?: string;
  outlet_id: string;
  employee_id: string;
  attendance_date: string;
  status: 'present' | 'absent' | 'late' | 'half_day' | 'on_leave' | 'holiday';
  check_in_time?: string;
  check_out_time?: string;
  expected_check_in?: string;
  expected_check_out?: string;
  late_minutes?: number;
  early_departure_minutes?: number;
  notes?: string;
  marked_by?: string;
  created_at?: string;
  updated_at?: string;
  employee_name?: string; // For display
}

interface PayrollRecord {
  // ... existing fields ...
  // Attendance tracking
  working_days?: number;
  days_present?: number;
  days_absent?: number;
  days_late?: number;
  days_half_day?: number;
  days_on_leave?: number;
  total_late_minutes?: number;
  per_day_salary?: number;
  attendance_deduction?: number;
  late_penalty?: number;
  perfect_attendance_bonus?: number;
}
```

## Customization Options

### Adjust Working Days Calculation
Edit `calculateWorkingDays()` function in `OutletPayroll.tsx`:
```typescript
// Currently excludes Sundays (dayOfWeek !== 0)
// To exclude Saturdays too:
if (dayOfWeek !== 0 && dayOfWeek !== 6) {
  days++;
}
```

### Adjust Late Penalty Rate
Edit `calculatePayroll()` function:
```typescript
// Current: $1 per 15 minutes
const latePenalty = Math.floor(totalLateMinutes / 15) * 1;

// Change to $2 per 10 minutes:
const latePenalty = Math.floor(totalLateMinutes / 10) * 2;
```

### Adjust Perfect Attendance Bonus
Edit `calculatePayroll()` function:
```typescript
// Current: $50 bonus
const perfectAttendanceBonus = (conditions) ? 50 : 0;

// Change to $100:
const perfectAttendanceBonus = (conditions) ? 100 : 0;
```

### Adjust Half-Day Deduction Rate
Edit `calculatePayroll()` function:
```typescript
// Current: 50% deduction
const attendanceDeduction = daysAbsent * perDaySalary + 
                           (daysHalfDay * perDaySalary * 0.5);

// Change to 40% deduction:
const attendanceDeduction = daysAbsent * perDaySalary + 
                           (daysHalfDay * perDaySalary * 0.4);
```

## Troubleshooting

### Attendance not affecting salary
1. Verify attendance records exist for the pay period
2. Check that employee_id matches
3. Ensure pay period dates are correct
4. Verify migration was run successfully

### Working days calculation incorrect
1. Check `calculateWorkingDays()` function
2. Adjust excluded days based on business needs
3. Verify pay period start and end dates

### Perfect attendance bonus not showing
1. Check eligibility: no absences, no late, no half-days
2. Verify at least 1 day is marked present
3. Check calculation logic in `calculatePayroll()`

### Bulk attendance not working
1. Ensure employees are marked as active
2. Check for duplicate attendance records (unique constraint)
3. Verify outlet_id is correct

## Best Practices

1. **Mark attendance daily** - Don't let it pile up
2. **Use bulk marking** for regular days when everyone is present
3. **Review attendance** before creating payroll
4. **Double-check** late minutes and half-day records
5. **Use notes field** to document special circumstances
6. **Audit regularly** - Check attendance records for accuracy
7. **Train managers** on proper attendance marking procedures

## Future Enhancements

Potential improvements:
- [ ] Attendance calendar view
- [ ] Automated check-in/check-out integration
- [ ] Overtime calculation based on check-out times
- [ ] Attendance reports and analytics
- [ ] Export attendance to CSV/PDF
- [ ] SMS/Email notifications for absences
- [ ] Mobile app for self check-in
- [ ] Biometric integration
- [ ] Shift management
- [ ] Leave balance tracking

## Support

For issues or questions:
1. Check browser console for errors
2. Verify database migration completed
3. Check Supabase logs
4. Review Network tab for API failures
5. Ensure all required fields are filled
