import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, ChevronsUpDown, Download, FileText, Printer, Share2, MoreVertical } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  DollarSign,
  Search,
  Plus,
  Pencil,
  Trash2,
  ArrowLeft,
  Loader2,
  TrendingUp,
  TrendingDown,
  Wallet,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  UserCheck,
  UserX,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ExportUtils } from "@/utils/exportUtils";
import {
  getOutletEmployees,
  createOutletEmployee,
  updateOutletEmployee,
  deleteOutletEmployee,
  getPayrollRecords,
  createPayrollRecord,
  updatePayrollRecord,
  deletePayrollRecord,
  getAttendanceRecords,
  createAttendanceRecord,
  updateAttendanceRecord,
  deleteAttendanceRecord,
  bulkCreateAttendance,
  OutletEmployee,
  PayrollRecord,
  AttendanceRecord
} from "@/services/databaseService";

interface OutletPayrollProps {
  onBack: () => void;
  outletId?: string;
}

export const OutletPayroll = ({ onBack, outletId }: OutletPayrollProps) => {
  const [activeTab, setActiveTab] = useState<"employees" | "payroll" | "attendance">("employees");
  const [employees, setEmployees] = useState<OutletEmployee[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false);
  const [isPayrollDialogOpen, setIsPayrollDialogOpen] = useState(false);
  const [isAttendanceDialogOpen, setIsAttendanceDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<OutletEmployee | null>(null);
  const [editingPayroll, setEditingPayroll] = useState<PayrollRecord | null>(null);
  const [editingAttendance, setEditingAttendance] = useState<AttendanceRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Helper function to format currency in TZS with thousand separators
  const formatTZS = (amount: number): string => {
    return `TZS ${amount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`;
  };

  // Export Functions
  const printEmployees = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Employee List</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .header { margin-bottom: 10px; color: #666; font-size: 14px; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <h1>Employee List</h1>
        <div class="header">Generated: ${new Date().toLocaleString()} | Total: ${filteredEmployees.length} employees</div>
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Position</th>
              <th>Department</th>
              <th>Base Salary</th>
              <th>Hire Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${filteredEmployees.map(emp => `
              <tr>
                <td>${emp.employee_code}</td>
                <td>${emp.first_name} ${emp.last_name}</td>
                <td>${emp.position}</td>
                <td>${emp.department || '-'}</td>
                <td>${formatTZS(emp.base_salary)}</td>
                <td>${new Date(emp.hire_date).toLocaleDateString()}</td>
                <td>${emp.is_active ? 'Active' : 'Inactive'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const exportEmployeesToPDF = () => {
    const data = filteredEmployees.map(emp => ({
      'Employee Code': emp.employee_code,
      'Name': `${emp.first_name} ${emp.last_name}`,
      'Position': emp.position,
      'Department': emp.department || '-',
      'Base Salary': formatTZS(emp.base_salary),
      'Hire Date': new Date(emp.hire_date).toLocaleDateString(),
      'Status': emp.is_active ? 'Active' : 'Inactive'
    }));
    ExportUtils.exportToPDF(data, 'employees', 'Employee List');
  };

  const exportEmployeesToXLS = () => {
    const data = filteredEmployees.map(emp => ({
      'Employee Code': emp.employee_code,
      'Name': `${emp.first_name} ${emp.last_name}`,
      'Position': emp.position,
      'Department': emp.department || '-',
      'Base Salary': emp.base_salary,
      'Hire Date': new Date(emp.hire_date).toLocaleDateString(),
      'Status': emp.is_active ? 'Active' : 'Inactive'
    }));
    ExportUtils.exportToXLS(data, 'employees');
  };

  const shareEmployees = async () => {
    const textData = filteredEmployees.map(emp => 
      `${emp.employee_code} | ${emp.first_name} ${emp.last_name} | ${emp.position} | ${formatTZS(emp.base_salary)}`
    ).join('\n');
    
    const success = await ExportUtils.shareData(
      'Employee List - Royal POS',
      `Employee List (${filteredEmployees.length} employees):\n\n${textData}`
    );
    if (success) {
      toast({ title: "Success", description: "Employee data shared successfully" });
    }
  };

  const exportAttendanceToPDF = () => {
    const data = attendanceRecords.slice(0, 50).map(record => ({
      'Employee': record.employee_name,
      'Date': new Date(record.attendance_date).toLocaleDateString(),
      'Status': record.status.charAt(0).toUpperCase() + record.status.slice(1).replace('_', ' '),
      'Check In': record.check_in_time || '-',
      'Check Out': record.check_out_time || '-',
      'Late (min)': record.late_minutes || 0,
      'Notes': record.notes || '-'
    }));
    ExportUtils.exportToPDF(data, 'attendance', 'Attendance Records');
  };

  const printAttendance = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const records = attendanceRecords.slice(0, 50);
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Attendance Records</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .header { margin-bottom: 10px; color: #666; font-size: 14px; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <h1>Attendance Records</h1>
        <div class="header">Generated: ${new Date().toLocaleString()} | Total: ${records.length} records</div>
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Date</th>
              <th>Status</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Late (min)</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${records.map(record => `
              <tr>
                <td>${record.employee_name}</td>
                <td>${new Date(record.attendance_date).toLocaleDateString()}</td>
                <td>${record.status.charAt(0).toUpperCase() + record.status.slice(1).replace('_', ' ')}</td>
                <td>${record.check_in_time || '-'}</td>
                <td>${record.check_out_time || '-'}</td>
                <td>${record.late_minutes || 0}</td>
                <td>${record.notes || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const exportAttendanceToXLS = () => {
    const data = attendanceRecords.slice(0, 50).map(record => ({
      'Employee': record.employee_name,
      'Date': new Date(record.attendance_date).toLocaleDateString(),
      'Status': record.status.charAt(0).toUpperCase() + record.status.slice(1).replace('_', ' '),
      'Check In': record.check_in_time || '-',
      'Check Out': record.check_out_time || '-',
      'Late (min)': record.late_minutes || 0,
      'Notes': record.notes || '-'
    }));
    ExportUtils.exportToXLS(data, 'attendance');
  };

  const shareAttendance = async () => {
    const records = attendanceRecords.slice(0, 50);
    const textData = records.map(record => 
      `${record.employee_name} | ${new Date(record.attendance_date).toLocaleDateString()} | ${record.status} | ${record.check_in_time || '-'} | ${record.check_out_time || '-'}`
    ).join('\n');
    
    const success = await ExportUtils.shareData(
      'Attendance Records - Royal POS',
      `Attendance Records (${records.length} records):\n\n${textData}`
    );
    if (success) {
      toast({ title: "Success", description: "Attendance data shared successfully" });
    }
  };

  const exportPayrollToPDF = () => {
    const data = filteredPayroll.map(record => ({
      'Employee': record.employee_name,
      'Period': `${new Date(record.pay_period_start).toLocaleDateString()} - ${new Date(record.pay_period_end).toLocaleDateString()}`,
      'Gross Salary': formatTZS(record.gross_salary),
      'Deductions': formatTZS(record.total_deductions),
      'Net Salary': formatTZS(record.net_salary),
      'Status': record.status?.charAt(0).toUpperCase() + record.status?.slice(1),
      'Payment Date': record.payment_date ? new Date(record.payment_date).toLocaleDateString() : '-'
    }));
    ExportUtils.exportToPDF(data, 'payroll', 'Payroll Records');
  };

  const printPayroll = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payroll Records</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .header { margin-bottom: 10px; color: #666; font-size: 14px; }
          .currency { text-align: right; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <h1>Payroll Records</h1>
        <div class="header">Generated: ${new Date().toLocaleString()} | Total: ${filteredPayroll.length} records</div>
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Period</th>
              <th>Gross Salary</th>
              <th>Deductions</th>
              <th>Net Salary</th>
              <th>Status</th>
              <th>Payment Date</th>
            </tr>
          </thead>
          <tbody>
            ${filteredPayroll.map(record => `
              <tr>
                <td>${record.employee_name}</td>
                <td>${new Date(record.pay_period_start).toLocaleDateString()} - ${new Date(record.pay_period_end).toLocaleDateString()}</td>
                <td class="currency">${formatTZS(record.gross_salary)}</td>
                <td class="currency">${formatTZS(record.total_deductions)}</td>
                <td class="currency">${formatTZS(record.net_salary)}</td>
                <td>${record.status?.charAt(0).toUpperCase() + record.status?.slice(1)}</td>
                <td>${record.payment_date ? new Date(record.payment_date).toLocaleDateString() : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const exportPayrollToXLS = () => {
    const data = filteredPayroll.map(record => ({
      'Employee': record.employee_name,
      'Period': `${new Date(record.pay_period_start).toLocaleDateString()} - ${new Date(record.pay_period_end).toLocaleDateString()}`,
      'Gross Salary': record.gross_salary,
      'Deductions': record.total_deductions,
      'Net Salary': record.net_salary,
      'Status': record.status?.charAt(0).toUpperCase() + record.status?.slice(1),
      'Payment Date': record.payment_date ? new Date(record.payment_date).toLocaleDateString() : '-'
    }));
    ExportUtils.exportToXLS(data, 'payroll');
  };

  const sharePayroll = async () => {
    const textData = filteredPayroll.map(record => 
      `${record.employee_name} | ${new Date(record.pay_period_start).toLocaleDateString()} to ${new Date(record.pay_period_end).toLocaleDateString()} | Net: ${formatTZS(record.net_salary)} | ${record.status}`
    ).join('\n');
    
    const success = await ExportUtils.shareData(
      'Payroll Records - Royal POS',
      `Payroll Records (${filteredPayroll.length} records):\n\n${textData}`
    );
    if (success) {
      toast({ title: "Success", description: "Payroll data shared successfully" });
    }
  };

  // Position and Department handlers
  const handleAddPosition = () => {
    if (newPosition.trim()) {
      const position = newPosition.trim();
      if (!positions.includes(position)) {
        setPositions(prev => [...prev, position].sort());
        setEmployeeForm(prev => ({ ...prev, position }));
        setNewPosition("");
        setIsAddingPosition(false);
        setPositionOpen(false);
        toast({
          title: "Success",
          description: `Position "${position}" added successfully`
        });
      } else {
        toast({
          title: "Warning",
          description: "Position already exists",
          variant: "destructive"
        });
      }
    }
  };

  const handleAddDepartment = () => {
    if (newDepartment.trim()) {
      const department = newDepartment.trim();
      if (!departments.includes(department)) {
        setDepartments(prev => [...prev, department].sort());
        setEmployeeForm(prev => ({ ...prev, department }));
        setNewDepartment("");
        setIsAddingDepartment(false);
        setDepartmentOpen(false);
        toast({
          title: "Success",
          description: `Department "${department}" added successfully`
        });
      } else {
        toast({
          title: "Warning",
          description: "Department already exists",
          variant: "destructive"
        });
      }
    }
  };

  // Position and Department dropdown state
  const [positions, setPositions] = useState([
    "Sales Associate",
    "Cashier",
    "Store Manager",
    "Assistant Manager",
    "Inventory Clerk",
    "Customer Service Representative",
    "Stock Clerk",
    "Delivery Driver",
    "Accountant",
    "HR Manager",
    "Supervisor"
  ]);
  const [departments, setDepartments] = useState([
    "Sales",
    "Customer Service",
    "Inventory",
    "Accounting",
    "Human Resources",
    "Marketing",
    "Operations",
    "Delivery",
    "Management"
  ]);
  const [positionOpen, setPositionOpen] = useState(false);
  const [departmentOpen, setDepartmentOpen] = useState(false);
  const [isAddingPosition, setIsAddingPosition] = useState(false);
  const [isAddingDepartment, setIsAddingDepartment] = useState(false);
  const [newPosition, setNewPosition] = useState("");
  const [newDepartment, setNewDepartment] = useState("");

  // Employee form state
  const [employeeForm, setEmployeeForm] = useState({
    employee_code: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    position: "",
    department: "",
    hire_date: "",
    base_salary: 0
  });

  // Payroll form state
  const [payrollForm, setPayrollForm] = useState({
    employee_id: "",
    pay_period_start: "",
    pay_period_end: "",
    base_salary: 0,
    housing_allowance: 0,
    transport_allowance: 0,
    meal_allowance: 0,
    overtime_hours: 0,
    overtime_pay: 0,
    other_allowances: 0,
    tax_deduction: 0,
    social_security: 0,
    health_insurance: 0,
    advance_payment: 0,
    other_deductions: 0,
    status: "pending" as 'pending' | 'approved' | 'paid' | 'cancelled',
    payment_date: "",
    notes: ""
  });

  // Attendance form state
  const [attendanceForm, setAttendanceForm] = useState({
    employee_id: "",
    attendance_date: new Date().toISOString().split('T')[0],
    status: "present" as 'present' | 'absent' | 'late' | 'half_day' | 'on_leave' | 'holiday' | 'sick',
    check_in_time: "07:00",
    check_out_time: "18:30",
    late_minutes: 0,
    early_departure_minutes: 0,
    notes: ""
  });

  // Load data on mount
  useEffect(() => {
    if (outletId) {
      loadData();
    }
  }, [outletId]);

  const loadData = async () => {
    if (!outletId) return;
    
    setLoading(true);
    try {
      const [empData, payrollData, attendanceData] = await Promise.all([
        getOutletEmployees(outletId),
        getPayrollRecords(outletId),
        getAttendanceRecords(outletId)
      ]);
      setEmployees(empData);
      setPayrollRecords(payrollData);
      setAttendanceRecords(attendanceData);
    } catch (error) {
      console.error('Error loading payroll data:', error);
      toast({
        title: "Error",
        description: "Failed to load payroll data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Employee management
  const handleOpenEmployeeDialog = (employee?: OutletEmployee) => {
    if (employee) {
      setEditingEmployee(employee);
      setEmployeeForm({
        employee_code: employee.employee_code,
        first_name: employee.first_name,
        last_name: employee.last_name,
        email: employee.email || "",
        phone: employee.phone || "",
        position: employee.position,
        department: employee.department || "",
        hire_date: employee.hire_date,
        base_salary: employee.base_salary
      });
    } else {
      setEditingEmployee(null);
      setEmployeeForm({
        employee_code: `EMP-${Date.now().toString().slice(-6)}`,
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        position: "",
        department: "",
        hire_date: new Date().toISOString().split('T')[0],
        base_salary: 0
      });
    }
    setIsEmployeeDialogOpen(true);
  };

  const handleSaveEmployee = async () => {
    if (!outletId) return;
    
    if (!employeeForm.first_name || !employeeForm.last_name || !employeeForm.position) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const employeeData = {
        ...employeeForm,
        outlet_id: outletId,
        is_active: true
      };

      if (editingEmployee?.id) {
        const result = await updateOutletEmployee(editingEmployee.id, employeeData);
        if (result) {
          toast({
            title: "Success",
            description: "Employee updated successfully"
          });
        }
      } else {
        const result = await createOutletEmployee(employeeData);
        if (result) {
          toast({
            title: "Success",
            description: "Employee added successfully"
          });
        }
      }

      setIsEmployeeDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Error saving employee:', error);
      toast({
        title: "Error",
        description: "Failed to save employee",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm("Are you sure you want to delete this employee?")) return;

    try {
      const success = await deleteOutletEmployee(id);
      if (success) {
        toast({
          title: "Success",
          description: "Employee deleted successfully"
        });
        loadData();
      }
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast({
        title: "Error",
        description: "Failed to delete employee",
        variant: "destructive"
      });
    }
  };

  // Payroll management
  const handleOpenPayrollDialog = (record?: PayrollRecord) => {
    if (record) {
      setEditingPayroll(record);
      setPayrollForm({
        employee_id: record.employee_id,
        pay_period_start: record.pay_period_start,
        pay_period_end: record.pay_period_end,
        base_salary: record.base_salary,
        housing_allowance: record.housing_allowance || 0,
        transport_allowance: record.transport_allowance || 0,
        meal_allowance: record.meal_allowance || 0,
        overtime_hours: record.overtime_hours || 0,
        overtime_pay: record.overtime_pay || 0,
        other_allowances: record.other_allowances || 0,
        tax_deduction: record.tax_deduction || 0,
        social_security: record.social_security || 0,
        health_insurance: record.health_insurance || 0,
        advance_payment: record.advance_payment || 0,
        other_deductions: record.other_deductions || 0,
        status: record.status || "pending",
        payment_date: record.payment_date || "",
        notes: record.notes || ""
      });
    } else {
      setEditingPayroll(null);
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      setPayrollForm({
        employee_id: "",
        pay_period_start: startOfMonth.toISOString().split('T')[0],
        pay_period_end: endOfMonth.toISOString().split('T')[0],
        base_salary: 0,
        housing_allowance: 0,
        transport_allowance: 0,
        meal_allowance: 0,
        overtime_hours: 0,
        overtime_pay: 0,
        other_allowances: 0,
        tax_deduction: 0,
        social_security: 0,
        health_insurance: 0,
        advance_payment: 0,
        other_deductions: 0,
        status: "pending",
        payment_date: "",
        notes: ""
      });
    }
    setIsPayrollDialogOpen(true);
  };

  const handleEmployeeSelect = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    if (employee) {
      setPayrollForm(prev => ({
        ...prev,
        employee_id: employeeId,
        base_salary: employee.base_salary
      }));
    }
  };

  const calculatePayroll = () => {
    // Calculate attendance-based adjustments
    const workingDays = payrollForm.pay_period_start && payrollForm.pay_period_end 
      ? calculateWorkingDays(payrollForm.pay_period_start, payrollForm.pay_period_end)
      : 0;
    
    const perDaySalary = workingDays > 0 ? payrollForm.base_salary / workingDays : 0;
    
    // Get attendance data for this employee and period
    const employeeAttendance = attendanceRecords.filter(record => 
      record.employee_id === payrollForm.employee_id &&
      record.attendance_date >= payrollForm.pay_period_start &&
      record.attendance_date <= payrollForm.pay_period_end
    );

    const daysPresent = employeeAttendance.filter(r => r.status === 'present').length;
    const daysAbsent = employeeAttendance.filter(r => r.status === 'absent').length;
    const daysLate = employeeAttendance.filter(r => r.status === 'late').length;
    const daysHalfDay = employeeAttendance.filter(r => r.status === 'half_day').length;
    const daysOnLeave = employeeAttendance.filter(r => r.status === 'on_leave').length;
    const daysSick = employeeAttendance.filter(r => r.status === 'sick').length;

    // Calculate late minutes from check_in_time (expected: 07:00)
    const expectedCheckIn = 7.0; // 7:00 AM in hours
    const totalLateMinutes = employeeAttendance.reduce((sum, record) => {
      if (!record.check_in_time) return sum;
      const [hours, minutes] = record.check_in_time.split(':').map(Number);
      const actualCheckInHours = hours + minutes / 60;
      const lateMinutes = Math.max(0, (actualCheckInHours - expectedCheckIn) * 60);
      return sum + lateMinutes;
    }, 0);

    // Calculate early departure minutes
    const expectedCheckOut = 18.5; // 6:30 PM in hours (18.5)
    const totalEarlyMinutes = employeeAttendance.reduce((sum, record) => {
      if (!record.check_out_time) return sum;
      const [hours, minutes] = record.check_out_time.split(':').map(Number);
      const actualCheckOutHours = hours + minutes / 60;
      const earlyMinutes = Math.max(0, (expectedCheckOut - actualCheckOutHours) * 60);
      return sum + earlyMinutes;
    }, 0);

    // Calculate attendance deductions
    // Regular absence deduction
    const regularAbsenceDeduction = daysAbsent * perDaySalary + (daysHalfDay * perDaySalary * 0.5);
    
    // Sick leave: First 2 days free, then normal rate from 3rd day
    const chargeableSickDays = Math.max(0, daysSick - 2);
    const sickAbsenceDeduction = chargeableSickDays * perDaySalary;
    
    // Total attendance deduction
    const attendanceDeduction = regularAbsenceDeduction + sickAbsenceDeduction;
    
    // Late penalty: TZS 10 per minute late
    const latePenalty = totalLateMinutes * 10;
    
    // Early departure penalty: TZS 10 per minute, first 20 minutes free
    const chargeableEarlyMinutes = Math.max(0, totalEarlyMinutes - 20);
    const earlyDeparturePenalty = chargeableEarlyMinutes * 10;
    
    // Perfect attendance bonus (no absences, no late, no half days, no early departures, sick days allowed up to 2)
    const perfectAttendanceBonus = (daysAbsent === 0 && daysLate === 0 && daysHalfDay === 0 && daysSick <= 2 && chargeableEarlyMinutes === 0 && daysPresent > 0) 
      ? 50 
      : 0;

    const gross = payrollForm.base_salary + 
                  payrollForm.housing_allowance + 
                  payrollForm.transport_allowance + 
                  payrollForm.meal_allowance + 
                  payrollForm.overtime_pay + 
                  payrollForm.other_allowances +
                  perfectAttendanceBonus;
    
    const deductions = payrollForm.tax_deduction + 
                       payrollForm.social_security + 
                       payrollForm.health_insurance + 
                       payrollForm.advance_payment + 
                       payrollForm.other_deductions +
                       attendanceDeduction +
                       latePenalty +
                       earlyDeparturePenalty;
    
    const net = gross - deductions;
    
    return { 
      gross, 
      deductions, 
      net,
      workingDays,
      daysPresent,
      daysAbsent,
      daysLate,
      daysHalfDay,
      daysOnLeave,
      daysSick,
      totalLateMinutes,
      totalEarlyMinutes,
      chargeableEarlyMinutes,
      perDaySalary,
      attendanceDeduction,
      latePenalty,
      earlyDeparturePenalty,
      perfectAttendanceBonus
    };
  };

  const calculateWorkingDays = (startDate: string, endDate: string): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let days = 0;
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      // Count ALL calendar days (including Sundays)
      days++;
    }
    
    return days;
  };

  const handleSavePayroll = async () => {
    if (!outletId) return;
    
    if (!payrollForm.employee_id || !payrollForm.pay_period_start || !payrollForm.pay_period_end) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const payroll = calculatePayroll();
      
      const payrollData: PayrollRecord = {
        ...payrollForm,
        outlet_id: outletId,
        gross_salary: payroll.gross,
        total_deductions: payroll.deductions,
        net_salary: payroll.net,
        working_days: payroll.workingDays,
        days_present: payroll.daysPresent,
        days_absent: payroll.daysAbsent,
        days_late: payroll.daysLate,
        days_half_day: payroll.daysHalfDay,
        days_on_leave: payroll.daysOnLeave,
        days_sick: payroll.daysSick,
        total_late_minutes: payroll.totalLateMinutes,
        total_early_minutes: payroll.totalEarlyMinutes,
        chargeable_early_minutes: payroll.chargeableEarlyMinutes,
        per_day_salary: payroll.perDaySalary,
        attendance_deduction: payroll.attendanceDeduction,
        late_penalty: payroll.latePenalty,
        early_departure_penalty: payroll.earlyDeparturePenalty,
        perfect_attendance_bonus: payroll.perfectAttendanceBonus
      };

      if (editingPayroll?.id) {
        const result = await updatePayrollRecord(editingPayroll.id, payrollData);
        if (result) {
          toast({
            title: "Success",
            description: "Payroll record updated successfully"
          });
        }
      } else {
        const result = await createPayrollRecord(payrollData);
        if (result) {
          toast({
            title: "Success",
            description: "Payroll record created successfully"
          });
        }
      }

      setIsPayrollDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Error saving payroll:', error);
      toast({
        title: "Error",
        description: "Failed to save payroll record",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePayroll = async (id: string) => {
    if (!confirm("Are you sure you want to delete this payroll record?")) return;

    try {
      const success = await deletePayrollRecord(id);
      if (success) {
        toast({
          title: "Success",
          description: "Payroll record deleted successfully"
        });
        loadData();
      }
    } catch (error) {
      console.error('Error deleting payroll:', error);
      toast({
        title: "Error",
        description: "Failed to delete payroll record",
        variant: "destructive"
      });
    }
  };

  const handleUpdatePayrollStatus = async (id: string, status: 'pending' | 'approved' | 'paid' | 'cancelled') => {
    try {
      const updateData: Partial<PayrollRecord> = { status };
      if (status === 'paid') {
        updateData.payment_date = new Date().toISOString().split('T')[0];
      }
      
      const result = await updatePayrollRecord(id, updateData);
      if (result) {
        toast({
          title: "Success",
          description: `Payroll status updated to ${status}`
        });
        loadData();
      }
    } catch (error) {
      console.error('Error updating payroll status:', error);
      toast({
        title: "Error",
        description: "Failed to update payroll status",
        variant: "destructive"
      });
    }
  };

  // Attendance management
  const handleOpenAttendanceDialog = (record?: AttendanceRecord) => {
    if (record) {
      setEditingAttendance(record);
      setAttendanceForm({
        employee_id: record.employee_id,
        attendance_date: record.attendance_date,
        status: record.status,
        check_in_time: record.check_in_time || "07:00",
        check_out_time: record.check_out_time || "18:30",
        late_minutes: record.late_minutes || 0,
        early_departure_minutes: record.early_departure_minutes || 0,
        notes: record.notes || ""
      });
    } else {
      setEditingAttendance(null);
      setAttendanceForm({
        employee_id: "",
        attendance_date: new Date().toISOString().split('T')[0],
        status: "present",
        check_in_time: "07:00",
        check_out_time: "18:30",
        late_minutes: 0,
        early_departure_minutes: 0,
        notes: ""
      });
    }
    setIsAttendanceDialogOpen(true);
  };

  const handleSaveAttendance = async () => {
    if (!outletId) return;
    
    if (!attendanceForm.employee_id || !attendanceForm.attendance_date) {
      toast({
        title: "Validation Error",
        description: "Please select employee and date",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const attendanceData: AttendanceRecord = {
        ...attendanceForm,
        outlet_id: outletId
      };

      if (editingAttendance?.id) {
        const result = await updateAttendanceRecord(editingAttendance.id, attendanceData);
        if (result) {
          toast({
            title: "Success",
            description: "Attendance record updated successfully"
          });
        }
      } else {
        const result = await createAttendanceRecord(attendanceData);
        if (result) {
          toast({
            title: "Success",
            description: "Attendance record created successfully"
          });
        }
      }

      setIsAttendanceDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Error saving attendance:', error);
      toast({
        title: "Error",
        description: "Failed to save attendance record",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAttendance = async (id: string) => {
    if (!confirm("Are you sure you want to delete this attendance record?")) return;

    try {
      const success = await deleteAttendanceRecord(id);
      if (success) {
        toast({
          title: "Success",
          description: "Attendance record deleted successfully"
        });
        loadData();
      }
    } catch (error) {
      console.error('Error deleting attendance:', error);
      toast({
        title: "Error",
        description: "Failed to delete attendance record",
        variant: "destructive"
      });
    }
  };

  const handleMarkBulkAttendance = async (date: string, status: 'present' | 'absent' | 'late' | 'half_day' | 'on_leave' | 'holiday') => {
    if (!outletId || !confirm(`Mark all active employees as ${status} for ${date}?`)) return;

    setIsSaving(true);
    try {
      const records: AttendanceRecord[] = employees
        .filter(emp => emp.is_active)
        .map(emp => ({
          outlet_id: outletId,
          employee_id: emp.id!,
          attendance_date: date,
          status,
          check_in_time: status === 'present' || status === 'late' ? '07:00' : undefined,
          check_out_time: status === 'present' ? '18:30' : undefined,
          late_minutes: 0 // Will be auto-calculated from check_in_time
        }));

      const success = await bulkCreateAttendance(records);
      if (success) {
        toast({
          title: "Success",
          description: `Marked ${records.length} employees as ${status}`
        });
        loadData();
      }
    } catch (error) {
      console.error('Error bulk marking attendance:', error);
      toast({
        title: "Error",
        description: "Failed to mark bulk attendance",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Filtered data
  const filteredEmployees = employees.filter(emp => 
    emp.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employee_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPayroll = payrollRecords.filter(record => 
    record.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.status?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Statistics
  const totalEmployees = employees.filter(e => e.is_active).length;
  const totalPayrollThisMonth = payrollRecords
    .filter(r => {
      const now = new Date();
      const start = new Date(r.pay_period_start);
      return start.getMonth() === now.getMonth() && start.getFullYear() === now.getFullYear();
    })
    .reduce((sum, r) => sum + r.net_salary, 0);
  const pendingPayroll = payrollRecords.filter(r => r.status === 'pending').length;
  const paidPayroll = payrollRecords.filter(r => r.status === 'paid').length;
  
  // Attendance statistics for current month
  const currentMonthAttendance = attendanceRecords.filter(record => {
    const now = new Date();
    const attDate = new Date(record.attendance_date);
    return attDate.getMonth() === now.getMonth() && attDate.getFullYear() === now.getFullYear();
  });
  const presentToday = currentMonthAttendance.filter(r => r.status === 'present').length;
  const absentToday = currentMonthAttendance.filter(r => r.status === 'absent').length;

  const payroll = calculatePayroll();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Payroll Management</h1>
            <p className="text-muted-foreground">Manage employee payroll and compensation</p>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmployees}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month Payroll</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTZS(totalPayrollThisMonth)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present Today</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{presentToday}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Absent Today</CardTitle>
            <UserX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{absentToday}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "employees" | "payroll" | "attendance")}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="employees" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Employees
            </TabsTrigger>
            <TabsTrigger value="attendance" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Attendance
            </TabsTrigger>
            <TabsTrigger value="payroll" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Payroll Records
            </TabsTrigger>
          </TabsList>

          <Button 
            onClick={() => {
              if (activeTab === "employees") handleOpenEmployeeDialog();
              else if (activeTab === "payroll") handleOpenPayrollDialog();
              else handleOpenAttendanceDialog();
            }}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            {activeTab === "employees" ? "Add Employee" : activeTab === "payroll" ? "Create Payroll" : "Mark Attendance"}
          </Button>
        </div>

        <Input
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mt-4"
        />

        {/* Employees Tab */}
        <TabsContent value="employees" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold">Employee Actions</CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <MoreVertical className="h-4 w-4" />
                    Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={printEmployees}>
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportEmployeesToPDF}>
                    <FileText className="h-4 w-4 mr-2" />
                    Download PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportEmployeesToXLS}>
                    <Download className="h-4 w-4 mr-2" />
                    Export XLS
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={shareEmployees}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Base Salary</TableHead>
                    <TableHead>Hire Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">{employee.employee_code}</TableCell>
                      <TableCell>{employee.first_name} {employee.last_name}</TableCell>
                      <TableCell>{employee.position}</TableCell>
                      <TableCell>{employee.department || "-"}</TableCell>
                      <TableCell>{formatTZS(employee.base_salary)}</TableCell>
                      <TableCell>{new Date(employee.hire_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={employee.is_active ? "default" : "secondary"}>
                          {employee.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEmployeeDialog(employee)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteEmployee(employee.id!)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="mt-4">
          <div className="mb-4 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleMarkBulkAttendance(new Date().toISOString().split('T')[0], 'present')}
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Mark All Present Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleMarkBulkAttendance(new Date().toISOString().split('T')[0], 'absent')}
            >
              <UserX className="h-4 w-4 mr-2" />
              Mark All Absent Today
            </Button>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold">Attendance Actions</CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <MoreVertical className="h-4 w-4" />
                    Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={printAttendance}>
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportAttendanceToPDF}>
                    <FileText className="h-4 w-4 mr-2" />
                    Download PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportAttendanceToXLS}>
                    <Download className="h-4 w-4 mr-2" />
                    Export XLS
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={shareAttendance}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Late (min)</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceRecords.slice(0, 50).map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.employee_name}</TableCell>
                      <TableCell>{new Date(record.attendance_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            record.status === 'present' ? 'default' :
                            record.status === 'absent' ? 'destructive' :
                            record.status === 'late' ? 'secondary' :
                            record.status === 'half_day' ? 'outline' :
                            'outline'
                          }
                        >
                          {record.status === 'present' && <UserCheck className="h-3 w-3 mr-1" />}
                          {record.status === 'absent' && <UserX className="h-3 w-3 mr-1" />}
                          {record.status === 'late' && <Clock className="h-3 w-3 mr-1" />}
                          {record.status === 'sick' && <AlertCircle className="h-3 w-3 mr-1" />}
                          {record.status.charAt(0).toUpperCase() + record.status.slice(1).replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>{record.check_in_time || '-'}</TableCell>
                      <TableCell>{record.check_out_time || '-'}</TableCell>
                      <TableCell className={(() => {
                        if (!record.check_in_time) return '';
                        const [hours, minutes] = record.check_in_time.split(':').map(Number);
                        const actualCheckInHours = hours + minutes / 60;
                        const lateMinutes = Math.max(0, (actualCheckInHours - 7.0) * 60);
                        return lateMinutes > 0 ? 'text-orange-600' : '';
                      })()}>
                        {(() => {
                          if (!record.check_in_time) return '0 min';
                          const [hours, minutes] = record.check_in_time.split(':').map(Number);
                          const actualCheckInHours = hours + minutes / 60;
                          const lateMinutes = Math.round(Math.max(0, (actualCheckInHours - 7.0) * 60));
                          return `${lateMinutes} min`;
                        })()}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{record.notes || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenAttendanceDialog(record)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteAttendance(record.id!)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payroll Tab */}
        <TabsContent value="payroll" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold">Payroll Actions</CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <MoreVertical className="h-4 w-4" />
                    Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={printPayroll}>
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportPayrollToPDF}>
                    <FileText className="h-4 w-4 mr-2" />
                    Download PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportPayrollToXLS}>
                    <Download className="h-4 w-4 mr-2" />
                    Export XLS
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={sharePayroll}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Gross</TableHead>
                    <TableHead>Deductions</TableHead>
                    <TableHead>Net Salary</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayroll.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.employee_name}</TableCell>
                      <TableCell>
                        {new Date(record.pay_period_start).toLocaleDateString()} - {new Date(record.pay_period_end).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-green-600">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {formatTZS(record.gross_salary)}
                        </div>
                      </TableCell>
                      <TableCell className="text-red-600">
                        <div className="flex items-center gap-1">
                          <TrendingDown className="h-3 w-3" />
                          {formatTZS(record.total_deductions)}
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-lg">
                        {formatTZS(record.net_salary)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            record.status === 'paid' ? 'default' :
                            record.status === 'approved' ? 'secondary' :
                            record.status === 'cancelled' ? 'destructive' :
                            'outline'
                          }
                        >
                          {record.status === 'paid' && <CheckCircle className="h-3 w-3 mr-1" />}
                          {record.status === 'cancelled' && <XCircle className="h-3 w-3 mr-1" />}
                          {record.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                          {record.status?.charAt(0).toUpperCase() + record.status?.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {record.payment_date ? new Date(record.payment_date).toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {record.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUpdatePayrollStatus(record.id!, 'approved')}
                            >
                              Approve
                            </Button>
                          )}
                          {record.status === 'approved' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUpdatePayrollStatus(record.id!, 'paid')}
                            >
                              Mark Paid
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenPayrollDialog(record)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeletePayroll(record.id!)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Employee Dialog */}
      <Dialog open={isEmployeeDialogOpen} onOpenChange={setIsEmployeeDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingEmployee ? "Edit Employee" : "Add New Employee"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div>
              <label className="text-sm font-medium">Employee Code *</label>
              <Input
                value={employeeForm.employee_code}
                onChange={(e) => setEmployeeForm(prev => ({ ...prev, employee_code: e.target.value }))}
                placeholder="EMP-001"
              />
            </div>
            <div>
              <label className="text-sm font-medium">First Name *</label>
              <Input
                value={employeeForm.first_name}
                onChange={(e) => setEmployeeForm(prev => ({ ...prev, first_name: e.target.value }))}
                placeholder="John"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Last Name *</label>
              <Input
                value={employeeForm.last_name}
                onChange={(e) => setEmployeeForm(prev => ({ ...prev, last_name: e.target.value }))}
                placeholder="Doe"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={employeeForm.email}
                onChange={(e) => setEmployeeForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="john@example.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Phone</label>
              <Input
                value={employeeForm.phone}
                onChange={(e) => setEmployeeForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+1234567890"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Position *</label>
              <Popover open={positionOpen} onOpenChange={setPositionOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={positionOpen}
                    className="w-full justify-between"
                  >
                    {employeeForm.position || "Select position..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput 
                      placeholder="Search position..." 
                      className="h-9"
                    />
                    <CommandList>
                      <CommandEmpty>
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={() => setIsAddingPosition(true)}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add new position
                        </Button>
                      </CommandEmpty>
                      <CommandGroup>
                        {positions.map((pos) => (
                          <CommandItem
                            key={pos}
                            value={pos}
                            onSelect={(currentValue) => {
                              setEmployeeForm(prev => ({ ...prev, position: currentValue }));
                              setPositionOpen(false);
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                employeeForm.position === pos ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            {pos}
                          </CommandItem>
                        ))}
                        <CommandItem
                          value="+add"
                          onSelect={() => setIsAddingPosition(true)}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add new position
                        </CommandItem>
                      </CommandGroup>
                    </CommandList>
                  </Command>
                  {isAddingPosition && (
                    <div className="border-t p-3 space-y-2">
                      <Input
                        placeholder="Enter new position..."
                        value={newPosition}
                        onChange={(e) => setNewPosition(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAddPosition();
                          } else if (e.key === 'Escape') {
                            setIsAddingPosition(false);
                            setNewPosition("");
                          }
                        }}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleAddPosition}>
                          Add
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setIsAddingPosition(false);
                            setNewPosition("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="text-sm font-medium">Department</label>
              <Popover open={departmentOpen} onOpenChange={setDepartmentOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={departmentOpen}
                    className="w-full justify-between"
                  >
                    {employeeForm.department || "Select department..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput 
                      placeholder="Search department..." 
                      className="h-9"
                    />
                    <CommandList>
                      <CommandEmpty>
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={() => setIsAddingDepartment(true)}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add new department
                        </Button>
                      </CommandEmpty>
                      <CommandGroup>
                        {departments.map((dept) => (
                          <CommandItem
                            key={dept}
                            value={dept}
                            onSelect={(currentValue) => {
                              setEmployeeForm(prev => ({ ...prev, department: currentValue }));
                              setDepartmentOpen(false);
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                employeeForm.department === dept ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            {dept}
                          </CommandItem>
                        ))}
                        <CommandItem
                          value="+add"
                          onSelect={() => setIsAddingDepartment(true)}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add new department
                        </CommandItem>
                      </CommandGroup>
                    </CommandList>
                  </Command>
                  {isAddingDepartment && (
                    <div className="border-t p-3 space-y-2">
                      <Input
                        placeholder="Enter new department..."
                        value={newDepartment}
                        onChange={(e) => setNewDepartment(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAddDepartment();
                          } else if (e.key === 'Escape') {
                            setIsAddingDepartment(false);
                            setNewDepartment("");
                          }
                        }}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleAddDepartment}>
                          Add
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setIsAddingDepartment(false);
                            setNewDepartment("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="text-sm font-medium">Hire Date *</label>
              <Input
                type="date"
                value={employeeForm.hire_date}
                onChange={(e) => setEmployeeForm(prev => ({ ...prev, hire_date: e.target.value }))}
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">Base Salary *</label>
              <Input
                type="number"
                value={employeeForm.base_salary}
                onChange={(e) => setEmployeeForm(prev => ({ ...prev, base_salary: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEmployeeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEmployee} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingEmployee ? "Update" : "Create"} Employee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payroll Dialog */}
      <Dialog open={isPayrollDialogOpen} onOpenChange={setIsPayrollDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPayroll ? "Edit Payroll Record" : "Create Payroll Record"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Employee Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Employee *</label>
                <Select
                  value={payrollForm.employee_id}
                  onValueChange={handleEmployeeSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.filter(e => e.is_active).map(emp => (
                      <SelectItem key={emp.id} value={emp.id!}>
                        {emp.first_name} {emp.last_name} - {emp.position}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={payrollForm.status}
                  onValueChange={(v) => setPayrollForm(prev => ({ ...prev, status: v as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Pay Period */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Period Start *</label>
                <Input
                  type="date"
                  value={payrollForm.pay_period_start}
                  onChange={(e) => setPayrollForm(prev => ({ ...prev, pay_period_start: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Period End *</label>
                <Input
                  type="date"
                  value={payrollForm.pay_period_end}
                  onChange={(e) => setPayrollForm(prev => ({ ...prev, pay_period_end: e.target.value }))}
                />
              </div>
            </div>

            {/* Allowances */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                Allowances
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Base Salary</label>
                  <Input
                    type="number"
                    value={payrollForm.base_salary}
                    onChange={(e) => setPayrollForm(prev => ({ ...prev, base_salary: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Housing Allowance</label>
                  <Input
                    type="number"
                    value={payrollForm.housing_allowance}
                    onChange={(e) => setPayrollForm(prev => ({ ...prev, housing_allowance: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Transport Allowance</label>
                  <Input
                    type="number"
                    value={payrollForm.transport_allowance}
                    onChange={(e) => setPayrollForm(prev => ({ ...prev, transport_allowance: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Meal Allowance</label>
                  <Input
                    type="number"
                    value={payrollForm.meal_allowance}
                    onChange={(e) => setPayrollForm(prev => ({ ...prev, meal_allowance: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Overtime Hours</label>
                  <Input
                    type="number"
                    value={payrollForm.overtime_hours}
                    onChange={(e) => setPayrollForm(prev => ({ ...prev, overtime_hours: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Overtime Pay</label>
                  <Input
                    type="number"
                    value={payrollForm.overtime_pay}
                    onChange={(e) => setPayrollForm(prev => ({ ...prev, overtime_pay: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Other Allowances</label>
                  <Input
                    type="number"
                    value={payrollForm.other_allowances}
                    onChange={(e) => setPayrollForm(prev => ({ ...prev, other_allowances: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-600" />
                Deductions
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Tax Deduction</label>
                  <Input
                    type="number"
                    value={payrollForm.tax_deduction}
                    onChange={(e) => setPayrollForm(prev => ({ ...prev, tax_deduction: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Social Security</label>
                  <Input
                    type="number"
                    value={payrollForm.social_security}
                    onChange={(e) => setPayrollForm(prev => ({ ...prev, social_security: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Health Insurance</label>
                  <Input
                    type="number"
                    value={payrollForm.health_insurance}
                    onChange={(e) => setPayrollForm(prev => ({ ...prev, health_insurance: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Advance Payment</label>
                  <Input
                    type="number"
                    value={payrollForm.advance_payment}
                    onChange={(e) => setPayrollForm(prev => ({ ...prev, advance_payment: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Other Deductions</label>
                  <Input
                    type="number"
                    value={payrollForm.other_deductions}
                    onChange={(e) => setPayrollForm(prev => ({ ...prev, other_deductions: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>
            </div>

            {/* Payment Date & Notes */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Payment Date</label>
                <Input
                  type="date"
                  value={payrollForm.payment_date}
                  onChange={(e) => setPayrollForm(prev => ({ ...prev, payment_date: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <Input
                value={payrollForm.notes}
                onChange={(e) => setPayrollForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes..."
              />
            </div>

            {/* Summary */}
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {/* Attendance Summary */}
                  {payrollForm.employee_id && payrollForm.pay_period_start && payrollForm.pay_period_end && (
                    <div className="border-b pb-4">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Attendance Summary
                      </h4>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Working Days:</span>
                          <span className="font-medium">{payroll.workingDays}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Present:</span>
                          <span className="font-medium text-green-600">{payroll.daysPresent}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Absent:</span>
                          <span className="font-medium text-red-600">{payroll.daysAbsent}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Sick:</span>
                          <span className="font-medium text-orange-600">{payroll.daysSick}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Late:</span>
                          <span className="font-medium text-orange-600">{payroll.daysLate}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Half Day:</span>
                          <span className="font-medium">{payroll.daysHalfDay}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Late Minutes:</span>
                          <span className="font-medium text-orange-600">{payroll.totalLateMinutes} min</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Early Departure:</span>
                          <span className="font-medium text-red-600">{payroll.totalEarlyMinutes} min</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Salary Breakdown */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Base Salary:</span>
                      <span className="font-semibold">{formatTZS(payrollForm.base_salary)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Per Day Salary:</span>
                      <span>{formatTZS(payroll.perDaySalary)}</span>
                    </div>
                    {payroll.perfectAttendanceBonus > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Perfect Attendance Bonus:</span>
                        <span>+{formatTZS(payroll.perfectAttendanceBonus)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Gross Salary:</span>
                      <span className="font-semibold text-green-600">{formatTZS(payroll.gross)}</span>
                    </div>
                    {payroll.attendanceDeduction > 0 && (
                      <div className="flex justify-between text-red-600 text-sm">
                        <span>Absence Deduction:</span>
                        <span>-{formatTZS(payroll.attendanceDeduction)}</span>
                      </div>
                    )}
                    {payroll.daysSick > 2 && (
                      <div className="flex justify-between text-orange-600 text-xs">
                        <span>Sick Days (Chargeable):</span>
                        <span>{Math.max(0, payroll.daysSick - 2)} days</span>
                      </div>
                    )}
                    {payroll.latePenalty > 0 && (
                      <div className="flex justify-between text-red-600 text-sm">
                        <span>Late Penalty:</span>
                        <span>-{formatTZS(payroll.latePenalty)}</span>
                      </div>
                    )}
                    {payroll.earlyDeparturePenalty > 0 && (
                      <div className="flex justify-between text-red-600 text-sm">
                        <span>Early Departure Penalty:</span>
                        <span>-{formatTZS(payroll.earlyDeparturePenalty)}</span>
                      </div>
                    )}
                    {payroll.chargeableEarlyMinutes > 0 && (
                      <div className="flex justify-between text-red-600 text-xs">
                        <span>Early Minutes (Chargeable):</span>
                        <span>{payroll.chargeableEarlyMinutes} min (20 min free)</span>
                      </div>
                    )}
                    <div className="flex justify-between text-red-600">
                      <span>Total Deductions:</span>
                      <span>-{formatTZS(payroll.deductions)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Net Salary:</span>
                      <span>{formatTZS(payroll.net)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPayrollDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePayroll} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingPayroll ? "Update" : "Create"} Payroll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attendance Dialog */}
      <Dialog open={isAttendanceDialogOpen} onOpenChange={setIsAttendanceDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingAttendance ? "Edit Attendance" : "Mark Attendance"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div>
              <label className="text-sm font-medium">Employee *</label>
              <Select
                value={attendanceForm.employee_id}
                onValueChange={(value) => setAttendanceForm(prev => ({ ...prev, employee_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.filter(e => e.is_active).map(emp => (
                    <SelectItem key={emp.id} value={emp.id!}>
                      {emp.first_name} {emp.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Date *</label>
              <Input
                type="date"
                value={attendanceForm.attendance_date}
                onChange={(e) => setAttendanceForm(prev => ({ ...prev, attendance_date: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Status *</label>
              <Select
                value={attendanceForm.status}
                onValueChange={(value) => setAttendanceForm(prev => ({ ...prev, status: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="half_day">Half Day</SelectItem>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                  <SelectItem value="sick">Sick</SelectItem>
                  <SelectItem value="holiday">Holiday</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Check In Time</label>
              <Input
                type="time"
                value={attendanceForm.check_in_time}
                onChange={(e) => setAttendanceForm(prev => ({ ...prev, check_in_time: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Check Out Time</label>
              <Input
                type="time"
                value={attendanceForm.check_out_time}
                onChange={(e) => setAttendanceForm(prev => ({ ...prev, check_out_time: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Late (minutes)</label>
              <Input
                type="number"
                value={attendanceForm.late_minutes}
                onChange={(e) => setAttendanceForm(prev => ({ ...prev, late_minutes: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">Notes</label>
              <Input
                value={attendanceForm.notes}
                onChange={(e) => setAttendanceForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAttendanceDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAttendance} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingAttendance ? "Update" : "Mark"} Attendance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
