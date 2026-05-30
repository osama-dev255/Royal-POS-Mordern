import { useState, useEffect } from "react";
import jsPDF from 'jspdf';
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
import { Check, ChevronsUpDown, Download, FileText, Printer, Share2, MoreVertical, Eye } from "lucide-react";
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
  getOutletById,
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
  const [outletName, setOutletName] = useState<string>("Outlet");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false);
  const [isPayrollDialogOpen, setIsPayrollDialogOpen] = useState(false);
  const [isAttendanceDialogOpen, setIsAttendanceDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<OutletEmployee | null>(null);
  const [editingPayroll, setEditingPayroll] = useState<PayrollRecord | null>(null);
  const [editingAttendance, setEditingAttendance] = useState<AttendanceRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false); // For view-only payroll dialog
  const { toast } = useToast();

  // Date Range Filters
  const [employeeDateFrom, setEmployeeDateFrom] = useState<string>("");
  const [employeeDateTo, setEmployeeDateTo] = useState<string>("");
  const [attendanceDateFrom, setAttendanceDateFrom] = useState<string>("");
  const [attendanceDateTo, setAttendanceDateTo] = useState<string>("");
  const [payrollDateFrom, setPayrollDateFrom] = useState<string>("");
  const [payrollDateTo, setPayrollDateTo] = useState<string>("");

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
    const data = attendanceRecords.slice(0, 50).map(record => {
      // Calculate late minutes from check_in_time
      let lateMinutes = 0;
      if (record.check_in_time) {
        const [hours, minutes] = record.check_in_time.split(':').map(Number);
        const actualCheckInHours = hours + minutes / 60;
        lateMinutes = Math.round(Math.max(0, (actualCheckInHours - 7.0) * 60));
      }
      
      return {
        'Employee': record.employee_name,
        'Date': new Date(record.attendance_date).toLocaleDateString(),
        'Status': record.status.charAt(0).toUpperCase() + record.status.slice(1).replace('_', ' '),
        'Check In': record.check_in_time || '-',
        'Check Out': record.check_out_time || '-',
        'Late (min)': lateMinutes,
        'Notes': record.notes || '-'
      };
    });
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
            ${records.map(record => {
              // Calculate late minutes from check_in_time
              let lateMinutes = 0;
              if (record.check_in_time) {
                const [hours, minutes] = record.check_in_time.split(':').map(Number);
                const actualCheckInHours = hours + minutes / 60;
                lateMinutes = Math.round(Math.max(0, (actualCheckInHours - 7.0) * 60));
              }
              
              return `
              <tr>
                <td>${record.employee_name}</td>
                <td>${new Date(record.attendance_date).toLocaleDateString()}</td>
                <td>${record.status.charAt(0).toUpperCase() + record.status.slice(1).replace('_', ' ')}</td>
                <td>${record.check_in_time || '-'}</td>
                <td>${record.check_out_time || '-'}</td>
                <td>${lateMinutes}</td>
                <td>${record.notes || '-'}</td>
              </tr>
              `;
            }).join('')}
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
    const data = attendanceRecords.slice(0, 50).map(record => {
      // Calculate late minutes from check_in_time
      let lateMinutes = 0;
      if (record.check_in_time) {
        const [hours, minutes] = record.check_in_time.split(':').map(Number);
        const actualCheckInHours = hours + minutes / 60;
        lateMinutes = Math.round(Math.max(0, (actualCheckInHours - 7.0) * 60));
      }
      
      return {
        'Employee': record.employee_name,
        'Date': new Date(record.attendance_date).toLocaleDateString(),
        'Status': record.status.charAt(0).toUpperCase() + record.status.slice(1).replace('_', ' '),
        'Check In': record.check_in_time || '-',
        'Check Out': record.check_out_time || '-',
        'Late (min)': lateMinutes,
        'Notes': record.notes || '-'
      };
    });
    ExportUtils.exportToXLS(data, 'attendance');
  };

  const shareAttendance = async () => {
    const records = attendanceRecords.slice(0, 50);
    const textData = records.map(record => {
      // Calculate late minutes from check_in_time
      let lateMinutes = 0;
      if (record.check_in_time) {
        const [hours, minutes] = record.check_in_time.split(':').map(Number);
        const actualCheckInHours = hours + minutes / 60;
        lateMinutes = Math.round(Math.max(0, (actualCheckInHours - 7.0) * 60));
      }
      
      return `${record.employee_name} | ${new Date(record.attendance_date).toLocaleDateString()} | ${record.status} | ${record.check_in_time || '-'} | ${record.check_out_time || '-'} | ${lateMinutes} min late`;
    }).join('\n');
    
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
      'Payment Date': record.payment_date ? new Date(record.payment_date).toLocaleDateString() : '-',
      'Attendance Bonus': record.attendance_bonus ? formatTZS(record.attendance_bonus) : 'TZS 0'
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
              <th>Attendance Bonus</th>
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
                <td class="currency">${record.attendance_bonus ? formatTZS(record.attendance_bonus) : 'TZS 0'}</td>
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
      'Attendance Bonus': record.attendance_bonus || 0,
      'Status': record.status?.charAt(0).toUpperCase() + record.status?.slice(1),
      'Payment Date': record.payment_date ? new Date(record.payment_date).toLocaleDateString() : '-'
    }));
    ExportUtils.exportToXLS(data, 'payroll');
  };

  const sharePayroll = async () => {
    const textData = filteredPayroll.map(record => 
      `${record.employee_name} | ${new Date(record.pay_period_start).toLocaleDateString()} to ${new Date(record.pay_period_end).toLocaleDateString()} | Net: ${formatTZS(record.net_salary)} | Bonus: ${record.attendance_bonus ? formatTZS(record.attendance_bonus) : 'TZS 0'} | ${record.status}`
    ).join('\n');
    
    const success = await ExportUtils.shareData(
      'Payroll Records - Royal POS',
      `Payroll Records (${filteredPayroll.length} records):\n\n${textData}`
    );
    if (success) {
      toast({ title: "Success", description: "Payroll data shared successfully" });
    }
  };

  // Individual Payroll Record Actions
  const viewPayrollRecord = (record: PayrollRecord) => {
    // Populate form with record data for viewing
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
      status: record.status || 'pending',
      payment_date: record.payment_date || '',
      notes: record.notes || ''
    });
    setEditingPayroll(record);
    setIsViewMode(true);
    setIsPayrollDialogOpen(true);
  };

  const printIndividualPayroll = (record: PayrollRecord) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payroll Slip - ${record.employee_name}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 10px;
            color: #333;
            line-height: 1.4;
            font-size: 11px;
          }
          .container { max-width: 800px; margin: 0 auto; }
          
          /* Header */
          .header {
            border-bottom: 2px solid #2563eb;
            padding-bottom: 10px;
            margin-bottom: 12px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .company-info h1 {
            font-size: 20px;
            color: #2563eb;
            margin-bottom: 3px;
            font-weight: 700;
          }
          .company-info p {
            font-size: 10px;
            color: #666;
          }
          .payslip-title {
            text-align: right;
          }
          .payslip-title h2 {
            font-size: 24px;
            color: #1e40af;
            margin-bottom: 3px;
            font-weight: 700;
          }
          .payslip-title p {
            font-size: 9px;
            color: #666;
          }
          
          /* Employee Info */
          .employee-info {
            background: #f8fafc;
            padding: 8px 12px;
            border-radius: 6px;
            margin-bottom: 12px;
            border-left: 3px solid #2563eb;
          }
          .employee-info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px;
          }
          .info-item {
            display: flex;
            gap: 8px;
          }
          .info-label {
            font-weight: 600;
            color: #64748b;
            min-width: 110px;
            font-size: 10px;
          }
          .info-value {
            color: #1e293b;
            font-weight: 500;
            font-size: 10px;
          }
          
          /* Tables */
          .section {
            margin-bottom: 10px;
          }
          .section-title {
            font-size: 13px;
            font-weight: 700;
            color: #1e40af;
            margin-bottom: 6px;
            padding-bottom: 3px;
            border-bottom: 2px solid #e2e8f0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
          }
          th {
            background: #f1f5f9;
            padding: 6px 8px;
            text-align: left;
            font-weight: 600;
            color: #475569;
            border-bottom: 2px solid #cbd5e1;
            font-size: 10px;
          }
          td {
            padding: 6px 8px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 10px;
          }
          tr:last-child td {
            border-bottom: none;
          }
          .amount {
            text-align: right;
            font-family: 'Courier New', monospace;
            font-weight: 600;
          }
          .subtotal {
            background: #f8fafc;
            font-weight: 700;
          }
          .subtotal td {
            border-top: 2px solid #cbd5e1;
          }
          
          /* Summary Box */
          .summary-box {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px;
            border-radius: 8px;
            margin: 12px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
            font-size: 11px;
          }
          .summary-row.total {
            border-top: 2px solid rgba(255,255,255,0.3);
            margin-top: 6px;
            padding-top: 8px;
            font-size: 18px;
            font-weight: 700;
          }
          .net-pay-label { text-transform: uppercase; letter-spacing: 0.5px; }
          .net-pay-amount { font-family: 'Courier New', monospace; }
          
          /* Attendance */
          .attendance-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-top: 10px;
          }
          .attendance-item {
            background: #f8fafc;
            padding: 12px;
            border-radius: 6px;
            text-align: center;
            border: 1px solid #e2e8f0;
          }
          .attendance-label {
            font-size: 11px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 5px;
          }
          .attendance-value {
            font-size: 20px;
            font-weight: 700;
            color: #1e293b;
          }
          
          /* Footer */
          .footer {
            margin-top: 20px;
            padding-top: 10px;
            border-top: 2px solid #e2e8f0;
          }
          .signature-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 50px;
            margin-bottom: 10px;
          }
          .signature-item {
            text-align: center;
          }
          .signature-line {
            border-top: 2px solid #333;
            margin-top: 40px;
            padding-top: 8px;
            font-size: 10px;
            color: #64748b;
          }
          .print-date {
            text-align: center;
            font-size: 9px;
            color: #94a3b8;
            margin-top: 10px;
          }
          
          @media print {
            body { margin: 0; }
            .container { max-width: 100%; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Header -->
          <div class="header">
            <div class="company-info">
              <h1>${outletName.toUpperCase()}</h1>
              <p>Employee Payroll System</p>
              <p style="margin-top: 5px;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <div class="payslip-title">
              <h2>PAYSLIP</h2>
              <p>Official Payment Record</p>
              <p style="margin-top: 5px; font-weight: 600; color: #2563eb;">${record.status?.toUpperCase()}</p>
            </div>
          </div>

          <!-- Employee Information -->
          <div class="employee-info">
            <div class="employee-info-grid">
              <div class="info-item">
                <span class="info-label">Employee Name:</span>
                <span class="info-value">${record.employee_name}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Pay Period:</span>
                <span class="info-value">${new Date(record.pay_period_start).toLocaleDateString()} - ${new Date(record.pay_period_end).toLocaleDateString()}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Employee ID:</span>
                <span class="info-value">${record.employee_id}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Payment Date:</span>
                <span class="info-value">${record.payment_date ? new Date(record.payment_date).toLocaleDateString() : 'Pending'}</span>
              </div>
            </div>
          </div>

          <!-- Earnings -->
          <div class="section">
            <div class="section-title">EARNINGS</div>
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th style="text-align: right;">Amount (TZS)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Base Salary</td>
                  <td class="amount">${record.base_salary.toLocaleString()}</td>
                </tr>
                ${record.housing_allowance ? `<tr><td>Housing Allowance</td><td class="amount">${record.housing_allowance.toLocaleString()}</td></tr>` : ''}
                ${record.transport_allowance ? `<tr><td>Transport Allowance</td><td class="amount">${record.transport_allowance.toLocaleString()}</td></tr>` : ''}
                ${record.meal_allowance ? `<tr><td>Meal Allowance</td><td class="amount">${record.meal_allowance.toLocaleString()}</td></tr>` : ''}
                ${record.overtime_pay ? `<tr><td>Overtime Pay</td><td class="amount">${record.overtime_pay.toLocaleString()}</td></tr>` : ''}
                ${record.other_allowances ? `<tr><td>Other Allowances</td><td class="amount">${record.other_allowances.toLocaleString()}</td></tr>` : ''}
                ${record.perfect_attendance_bonus ? `<tr><td>Perfect Attendance Bonus</td><td class="amount">${record.perfect_attendance_bonus.toLocaleString()}</td></tr>` : ''}
                ${record.attendance_bonus ? `<tr><td>Monthly Attendance Bonus (28+ days)</td><td class="amount">${record.attendance_bonus.toLocaleString()}</td></tr>` : ''}
                <tr class="subtotal">
                  <td><strong>GROSS PAY</strong></td>
                  <td class="amount"><strong>${record.gross_salary.toLocaleString()}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Deductions -->
          <div class="section">
            <div class="section-title">DEDUCTIONS</div>
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th style="text-align: right;">Amount (TZS)</th>
                </tr>
              </thead>
              <tbody>
                ${record.tax_deduction ? `<tr><td>Tax Deduction</td><td class="amount">-${record.tax_deduction.toLocaleString()}</td></tr>` : ''}
                ${record.social_security ? `<tr><td>Social Security</td><td class="amount">-${record.social_security.toLocaleString()}</td></tr>` : ''}
                ${record.health_insurance ? `<tr><td>Health Insurance</td><td class="amount">-${record.health_insurance.toLocaleString()}</td></tr>` : ''}
                ${record.advance_payment ? `<tr><td>Advance Payment</td><td class="amount">-${record.advance_payment.toLocaleString()}</td></tr>` : ''}
                ${record.other_deductions ? `<tr><td>Other Deductions</td><td class="amount">-${record.other_deductions.toLocaleString()}</td></tr>` : ''}
                ${record.late_penalty ? `<tr><td>Late Penalty</td><td class="amount">-${record.late_penalty.toLocaleString()}</td></tr>` : ''}
                ${record.early_departure_penalty ? `<tr><td>Early Departure Penalty</td><td class="amount">-${record.early_departure_penalty.toLocaleString()}</td></tr>` : ''}
                ${record.attendance_deduction ? `<tr><td>Attendance Deduction</td><td class="amount">-${record.attendance_deduction.toLocaleString()}</td></tr>` : ''}
                <tr class="subtotal">
                  <td><strong>TOTAL DEDUCTIONS</strong></td>
                  <td class="amount"><strong>-${record.total_deductions.toLocaleString()}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Summary Box -->
          <div class="summary-box">
            <div class="summary-row">
              <span>Gross Pay</span>
              <span>TZS ${record.gross_salary.toLocaleString()}</span>
            </div>
            <div class="summary-row">
              <span>Total Deductions</span>
              <span>- TZS ${record.total_deductions.toLocaleString()}</span>
            </div>
            <div class="summary-row total">
              <span class="net-pay-label">NET PAY</span>
              <span class="net-pay-amount">TZS ${record.net_salary.toLocaleString()}</span>
            </div>
          </div>

          <!-- Footer -->
          <div class="footer">
            <div class="signature-grid">
              <div class="signature-item">
                <div class="signature-line">Authorized Signature</div>
              </div>
              <div class="signature-item">
                <div class="signature-line">Employee Signature</div>
              </div>
            </div>
            <div class="print-date">
              Printed on ${new Date().toLocaleString()} | This is a computer-generated document
            </div>
          </div>
        </div>
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

  const downloadIndividualPayrollPDF = (record: PayrollRecord) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.width;
    const margin = 15;
    let y = 15;

    // Helper function to add text
    const addText = (text: string, x: number, yPos: number, size: number, style: 'normal' | 'bold' = 'normal', color: [number, number, number] = [51, 51, 51]) => {
      doc.setFontSize(size);
      doc.setFont('helvetica', style);
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(text, x, yPos);
    };

    // Helper function to add filled rectangle
    const addRect = (x: number, yPos: number, width: number, height: number, color: [number, number, number]) => {
      doc.setFillColor(color[0], color[1], color[2]);
      doc.rect(x, yPos, width, height, 'F');
    };

    // Helper function to add line
    const addLine = (yPos: number, color: [number, number, number] = [226, 232, 240], thickness: number = 0.5) => {
      doc.setDrawColor(color[0], color[1], color[2]);
      doc.setLineWidth(thickness);
      doc.line(margin, yPos, pageWidth - margin, yPos);
    };

    // Header - Company Name
    addRect(margin, y, pageWidth - 2 * margin, 25, [248, 250, 252]);
    addText(outletName.toUpperCase(), margin + 5, y + 10, 18, 'bold', [37, 99, 235]);
    addText('Employee Payroll System', margin + 5, y + 17, 9, 'normal', [100, 116, 139]);
    
    // PAYSLIP Title (right side)
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 64, 175);
    const payslipText = 'PAYSLIP';
    const payslipWidth = doc.getTextWidth(payslipText);
    doc.text(payslipText, pageWidth - margin - payslipWidth - 5, y + 10);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    const statusText = 'Official Payment Record';
    const statusWidth = doc.getTextWidth(statusText);
    doc.text(statusText, pageWidth - margin - statusWidth - 5, y + 16);
    
    // Status badge
    const status = record.status?.toUpperCase() || 'PENDING';
    let statusColor: [number, number, number] = [245, 158, 11]; // Default orange
    if (status === 'PAID') {
      statusColor = [16, 185, 129]; // Green
    } else if (status === 'APPROVED') {
      statusColor = [59, 130, 246]; // Blue
    }
    addRect(pageWidth - margin - 25, y + 18, 20, 5, statusColor);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    const statusTextWidth = doc.getTextWidth(status);
    doc.text(status, pageWidth - margin - 15 - statusTextWidth / 2, y + 22);
    
    y += 28;

    // Date
    addText(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), margin, y, 9, 'normal', [100, 116, 139]);
    y += 8;

    // Employee Information Box
    addRect(margin, y, pageWidth - 2 * margin, 22, [248, 250, 252]);
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(1);
    doc.line(margin, y, margin, y + 22);
    
    y += 6;
    addText('Employee Name:', margin + 5, y, 8, 'bold', [100, 116, 139]);
    addText(record.employee_name, margin + 35, y, 8, 'normal', [30, 41, 59]);
    
    addText('Pay Period:', pageWidth / 2, y, 8, 'bold', [100, 116, 139]);
    addText(`${new Date(record.pay_period_start).toLocaleDateString()} - ${new Date(record.pay_period_end).toLocaleDateString()}`, pageWidth / 2 + 20, y, 8, 'normal', [30, 41, 59]);
    
    y += 5;
    addText('Employee ID:', margin + 5, y, 8, 'bold', [100, 116, 139]);
    addText(record.employee_id, margin + 35, y, 8, 'normal', [30, 41, 59]);
    
    addText('Payment Date:', pageWidth / 2, y, 8, 'bold', [100, 116, 139]);
    addText(record.payment_date ? new Date(record.payment_date).toLocaleDateString() : 'Pending', pageWidth / 2 + 20, y, 8, 'normal', [30, 41, 59]);
    
    y += 18;

    // Earnings Section
    addText('EARNINGS', margin, y, 11, 'bold', [30, 64, 175]);
    addLine(y + 2, [226, 232, 240], 1);
    y += 7;

    // Earnings Table Header
    addRect(margin, y, pageWidth - 2 * margin, 6, [241, 245, 249]);
    addText('Description', margin + 3, y + 4.5, 8, 'bold', [71, 85, 105]);
    addText('Amount (TZS)', pageWidth - margin - 3, y + 4.5, 8, 'bold', [71, 85, 105]);
    y += 7;

    // Earnings Items
    const addEarningsRow = (desc: string, amount: number, isSubtotal: boolean = false) => {
      if (isSubtotal) {
        addRect(margin, y, pageWidth - 2 * margin, 6, [248, 250, 252]);
        addText(desc, margin + 3, y + 4.5, 8, 'bold', [30, 41, 59]);
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.8);
        doc.line(margin, y, pageWidth - margin, y);
      } else {
        addText(desc, margin + 3, y + 4.5, 8, 'normal', [51, 51, 51]);
      }
      const amountText = amount.toLocaleString();
      const amountWidth = doc.getTextWidth(amountText);
      addText(amountText, pageWidth - margin - 3 - amountWidth, y + 4.5, 8, isSubtotal ? 'bold' : 'normal', [51, 51, 51]);
      y += 6.5;
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(margin, y, pageWidth - margin, y);
    };

    addEarningsRow('Base Salary', record.base_salary);
    if (record.housing_allowance) addEarningsRow('Housing Allowance', record.housing_allowance);
    if (record.transport_allowance) addEarningsRow('Transport Allowance', record.transport_allowance);
    if (record.meal_allowance) addEarningsRow('Meal Allowance', record.meal_allowance);
    if (record.overtime_pay) addEarningsRow('Overtime Pay', record.overtime_pay);
    if (record.other_allowances) addEarningsRow('Other Allowances', record.other_allowances);
    if (record.perfect_attendance_bonus) addEarningsRow('Perfect Attendance Bonus', record.perfect_attendance_bonus);
    if (record.attendance_bonus) addEarningsRow('Monthly Attendance Bonus (28+ days)', record.attendance_bonus);
    addEarningsRow('GROSS PAY', record.gross_salary, true);
    
    y += 3;

    // Deductions Section
    addText('DEDUCTIONS', margin, y, 11, 'bold', [30, 64, 175]);
    addLine(y + 2, [226, 232, 240], 1);
    y += 7;

    // Deductions Table Header
    addRect(margin, y, pageWidth - 2 * margin, 6, [241, 245, 249]);
    addText('Description', margin + 3, y + 4.5, 8, 'bold', [71, 85, 105]);
    addText('Amount (TZS)', pageWidth - margin - 3, y + 4.5, 8, 'bold', [71, 85, 105]);
    y += 7;

    const addDeductionsRow = (desc: string, amount: number, isSubtotal: boolean = false) => {
      if (isSubtotal) {
        addRect(margin, y, pageWidth - 2 * margin, 6, [248, 250, 252]);
        addText(desc, margin + 3, y + 4.5, 8, 'bold', [30, 41, 59]);
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.8);
        doc.line(margin, y, pageWidth - margin, y);
      } else {
        addText(desc, margin + 3, y + 4.5, 8, 'normal', [51, 51, 51]);
      }
      const amountText = `-${amount.toLocaleString()}`;
      const amountWidth = doc.getTextWidth(amountText);
      addText(amountText, pageWidth - margin - 3 - amountWidth, y + 4.5, 8, isSubtotal ? 'bold' : 'normal', [51, 51, 51]);
      y += 6.5;
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(margin, y, pageWidth - margin, y);
    };

    if (record.tax_deduction) addDeductionsRow('Tax Deduction', record.tax_deduction);
    if (record.social_security) addDeductionsRow('Social Security', record.social_security);
    if (record.health_insurance) addDeductionsRow('Health Insurance', record.health_insurance);
    if (record.advance_payment) addDeductionsRow('Advance Payment', record.advance_payment);
    if (record.other_deductions) addDeductionsRow('Other Deductions', record.other_deductions);
    if (record.late_penalty) addDeductionsRow('Late Penalty', record.late_penalty);
    if (record.early_departure_penalty) addDeductionsRow('Early Departure Penalty', record.early_departure_penalty);
    if (record.attendance_deduction) addDeductionsRow('Attendance Deduction', record.attendance_deduction);
    addDeductionsRow('TOTAL DEDUCTIONS', record.total_deductions, true);
    
    y += 5;

    // Net Pay Summary Box
    const boxHeight = 22;
    
    y += 6;
    doc.setTextColor(51, 51, 51);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    addText('Gross Pay', margin + 5, y, 9, 'normal', [51, 51, 51]);
    const grossText = `TZS ${record.gross_salary.toLocaleString()}`;
    const grossWidth = doc.getTextWidth(grossText);
    addText(grossText, pageWidth - margin - 5 - grossWidth, y, 9, 'normal', [51, 51, 51]);
    
    y += 5;
    addText('Total Deductions', margin + 5, y, 9, 'normal', [51, 51, 51]);
    const deductText = `- TZS ${record.total_deductions.toLocaleString()}`;
    const deductWidth = doc.getTextWidth(deductText);
    addText(deductText, pageWidth - margin - 5 - deductWidth, y, 9, 'normal', [51, 51, 51]);
    
    y += 6;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.8);
    doc.line(margin + 5, y, pageWidth - margin - 5, y);
    
    y += 5;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    addText('NET PAY', margin + 5, y, 14, 'bold', [30, 64, 175]);
    const netText = `TZS ${record.net_salary.toLocaleString()}`;
    const netWidth = doc.getTextWidth(netText);
    addText(netText, pageWidth - margin - 5 - netWidth, y, 14, 'bold', [30, 64, 175]);
    
    y += boxHeight - 16;

    // Footer - Signature Lines
    y += 10;
    doc.setDrawColor(51, 51, 51);
    doc.setLineWidth(0.5);
    
    // Authorized Signature
    doc.line(margin + 10, y, margin + 70, y);
    addText('Authorized Signature', margin + 20, y + 5, 8, 'normal', [100, 116, 139]);
    
    // Employee Signature
    doc.line(pageWidth - margin - 70, y, pageWidth - margin - 10, y);
    addText('Employee Signature', pageWidth - margin - 55, y + 5, 8, 'normal', [100, 116, 139]);
    
    y += 12;
    addText(`Printed on ${new Date().toLocaleString()} | This is a computer-generated document`, pageWidth / 2, y, 7, 'normal', [148, 163, 184]);

    // Save PDF
    doc.save(`payroll_${record.employee_name}_${record.pay_period_start}.pdf`);
  };

  const exportIndividualPayrollToXLS = (record: PayrollRecord) => {
    const data = [
      // Header Section
      { 'Section': 'COMPANY', 'Detail': 'DETAIL', 'Amount': outletName.toUpperCase() },
      { 'Section': 'Document Type', 'Detail': '', 'Amount': 'PAYSLIP' },
      { 'Section': 'Generated Date', 'Detail': '', 'Amount': new Date().toLocaleDateString() },
      { 'Section': '', 'Detail': '', 'Amount': '' },
      
      // Employee Information
      { 'Section': 'EMPLOYEE', 'Detail': 'INFORMATION', 'Amount': '' },
      { 'Section': 'Employee Name', 'Detail': '', 'Amount': record.employee_name },
      { 'Section': 'Employee ID', 'Detail': '', 'Amount': record.employee_id },
      { 'Section': 'Pay Period Start', 'Detail': '', 'Amount': new Date(record.pay_period_start).toLocaleDateString() },
      { 'Section': 'Pay Period End', 'Detail': '', 'Amount': new Date(record.pay_period_end).toLocaleDateString() },
      { 'Section': 'Payment Date', 'Detail': '', 'Amount': record.payment_date ? new Date(record.payment_date).toLocaleDateString() : 'Pending' },
      { 'Section': 'Status', 'Detail': '', 'Amount': record.status?.toUpperCase() || 'PENDING' },
      { 'Section': '', 'Detail': '', 'Amount': '' },
      
      // Earnings
      { 'Section': 'EARNINGS', 'Detail': '', 'Amount': '' },
      { 'Section': 'Base Salary', 'Detail': '', 'Amount': record.base_salary },
      { 'Section': 'Housing Allowance', 'Detail': '', 'Amount': record.housing_allowance || 0 },
      { 'Section': 'Transport Allowance', 'Detail': '', 'Amount': record.transport_allowance || 0 },
      { 'Section': 'Meal Allowance', 'Detail': '', 'Amount': record.meal_allowance || 0 },
      { 'Section': 'Overtime Pay', 'Detail': '', 'Amount': record.overtime_pay || 0 },
      { 'Section': 'Other Allowances', 'Detail': '', 'Amount': record.other_allowances || 0 },
      { 'Section': 'Perfect Attendance Bonus', 'Detail': '', 'Amount': record.perfect_attendance_bonus || 0 },
      { 'Section': 'Monthly Attendance Bonus (28+ days)', 'Detail': '', 'Amount': record.attendance_bonus || 0 },
      { 'Section': 'GROSS PAY', 'Detail': '', 'Amount': record.gross_salary },
      { 'Section': '', 'Detail': '', 'Amount': '' },
      
      // Deductions
      { 'Section': 'DEDUCTIONS', 'Detail': '', 'Amount': '' },
      { 'Section': 'Tax Deduction', 'Detail': '', 'Amount': record.tax_deduction || 0 },
      { 'Section': 'Social Security', 'Detail': '', 'Amount': record.social_security || 0 },
      { 'Section': 'Health Insurance', 'Detail': '', 'Amount': record.health_insurance || 0 },
      { 'Section': 'Advance Payment', 'Detail': '', 'Amount': record.advance_payment || 0 },
      { 'Section': 'Other Deductions', 'Detail': '', 'Amount': record.other_deductions || 0 },
      { 'Section': 'Late Penalty', 'Detail': '', 'Amount': record.late_penalty || 0 },
      { 'Section': 'Early Departure Penalty', 'Detail': '', 'Amount': record.early_departure_penalty || 0 },
      { 'Section': 'Attendance Deduction', 'Detail': '', 'Amount': record.attendance_deduction || 0 },
      { 'Section': 'TOTAL DEDUCTIONS', 'Detail': '', 'Amount': record.total_deductions },
      { 'Section': '', 'Detail': '', 'Amount': '' },
      
      // Summary
      { 'Section': 'SUMMARY', 'Detail': '', 'Amount': '' },
      { 'Section': 'Gross Pay', 'Detail': '', 'Amount': record.gross_salary },
      { 'Section': 'Total Deductions', 'Detail': '', 'Amount': record.total_deductions },
      { 'Section': 'NET PAY', 'Detail': '', 'Amount': record.net_salary },
      { 'Section': '', 'Detail': '', 'Amount': '' },
      
      // Attendance (if available)
      { 'Section': 'ATTENDANCE', 'Detail': 'RECORD', 'Amount': '' },
      { 'Section': 'Working Days', 'Detail': '', 'Amount': record.working_days || 0 },
      { 'Section': 'Days Present', 'Detail': '', 'Amount': record.days_present || 0 },
      { 'Section': 'Days Absent', 'Detail': '', 'Amount': record.days_absent || 0 },
      { 'Section': 'Days Late', 'Detail': '', 'Amount': record.days_late || 0 },
      { 'Section': 'Days Half Day', 'Detail': '', 'Amount': record.days_half_day || 0 },
      { 'Section': 'Days on Leave', 'Detail': '', 'Amount': record.days_on_leave || 0 },
      { 'Section': 'Days Sick', 'Detail': '', 'Amount': record.days_sick || 0 },
      { 'Section': 'Total Late Minutes', 'Detail': '', 'Amount': record.total_late_minutes || 0 }
    ];
    ExportUtils.exportToXLS(data, `payroll_${record.employee_name}_${record.pay_period_start}`);
  };

  const shareIndividualPayroll = async (record: PayrollRecord) => {
    const textData = `Payroll Slip - ${record.employee_name}
Period: ${new Date(record.pay_period_start).toLocaleDateString()} - ${new Date(record.pay_period_end).toLocaleDateString()}

Earnings:
- Base Salary: ${formatTZS(record.base_salary)}
- Gross Salary: ${formatTZS(record.gross_salary)}

Deductions:
- Total: ${formatTZS(record.total_deductions)}

Net Salary: ${formatTZS(record.net_salary)}
Status: ${record.status?.toUpperCase()}`;

    const success = await ExportUtils.shareData(
      `Payroll Slip - ${record.employee_name}`,
      textData
    );
    if (success) {
      toast({ title: "Success", description: "Payroll slip shared successfully" });
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
      const [empData, payrollData, attendanceData, outletData] = await Promise.all([
        getOutletEmployees(outletId),
        getPayrollRecords(outletId),
        getAttendanceRecords(outletId),
        // Fetch outlet name
        getOutletById(outletId)
      ]);
      setEmployees(empData);
      setPayrollRecords(payrollData);
      setAttendanceRecords(attendanceData);
      if (outletData) {
        setOutletName(outletData.name || 'Outlet');
      }
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
    setIsViewMode(false); // Reset view mode when opening for edit/create
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

    // Calculate late minutes from check_in_time (expected: 07:00, 30 min grace)
    const expectedCheckIn = 7.0; // 7:00 AM in hours
    const gracePeriodMinutes = 30; // 30 minutes grace period
    const totalLateMinutes = employeeAttendance.reduce((sum, record) => {
      if (!record.check_in_time) return sum;
      const [hours, minutes] = record.check_in_time.split(':').map(Number);
      const actualCheckInHours = hours + minutes / 60;
      const lateMinutes = Math.max(0, (actualCheckInHours - expectedCheckIn) * 60);
      return sum + Math.round(lateMinutes); // Round to avoid floating-point errors
    }, 0);

    // Apply grace period: first 30 minutes free
    const chargeableLateMinutes = Math.max(0, totalLateMinutes - gracePeriodMinutes);

    // Calculate early departure minutes
    const expectedCheckOut = 18.5; // 6:30 PM in hours (18.5)
    const totalEarlyMinutes = employeeAttendance.reduce((sum, record) => {
      if (!record.check_out_time) return sum;
      const [hours, minutes] = record.check_out_time.split(':').map(Number);
      const actualCheckOutHours = hours + minutes / 60;
      const earlyMinutes = Math.max(0, (expectedCheckOut - actualCheckOutHours) * 60);
      return sum + Math.round(earlyMinutes); // Round to avoid floating-point errors
    }, 0);

    // Calculate attendance deductions
    // Regular absence deduction
    const regularAbsenceDeduction = daysAbsent * perDaySalary + (daysHalfDay * perDaySalary * 0.5);
    
    // Sick leave: First 2 days free, then normal rate from 3rd day
    const chargeableSickDays = Math.max(0, daysSick - 2);
    const sickAbsenceDeduction = chargeableSickDays * perDaySalary;
    
    // Total attendance deduction
    const attendanceDeduction = regularAbsenceDeduction + sickAbsenceDeduction;
    
    // Late penalty: TZS 10 per minute late (after 30 min grace)
    const latePenalty = chargeableLateMinutes * 10;
    
    // Early departure penalty: TZS 10 per minute, first 20 minutes free
    const chargeableEarlyMinutes = Math.max(0, totalEarlyMinutes - 20);
    const earlyDeparturePenalty = chargeableEarlyMinutes * 10;
    
    // Perfect attendance bonus (no absences, no chargeable late, no half days, no early departures, sick days allowed up to 2)
    const perfectAttendanceBonus = (daysAbsent === 0 && chargeableLateMinutes === 0 && daysHalfDay === 0 && daysSick <= 2 && chargeableEarlyMinutes === 0 && daysPresent > 0) 
      ? 50 
      : 0;

    // Monthly attendance bonus: TZS 5,000 for 28+ days present
    const attendanceBonus = daysPresent >= 28 ? 5000 : 0;

    const gross = payrollForm.base_salary + 
                  payrollForm.housing_allowance + 
                  payrollForm.transport_allowance + 
                  payrollForm.meal_allowance + 
                  payrollForm.overtime_pay + 
                  payrollForm.other_allowances +
                  perfectAttendanceBonus +
                  attendanceBonus;
    
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
      chargeableLateMinutes,
      totalEarlyMinutes,
      chargeableEarlyMinutes,
      perDaySalary,
      attendanceDeduction,
      latePenalty,
      earlyDeparturePenalty,
      perfectAttendanceBonus,
      attendanceBonus
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
      
      // Debug: Log calculated values to identify floating-point issues
      console.log('Payroll Calculation:', {
        workingDays: payroll.workingDays,
        daysPresent: payroll.daysPresent,
        daysAbsent: payroll.daysAbsent,
        daysLate: payroll.daysLate,
        daysHalfDay: payroll.daysHalfDay,
        daysOnLeave: payroll.daysOnLeave,
        daysSick: payroll.daysSick,
        totalLateMinutes: payroll.totalLateMinutes,
        totalEarlyMinutes: payroll.totalEarlyMinutes,
        chargeableEarlyMinutes: payroll.chargeableEarlyMinutes
      });
      
      // Clean up payrollForm - remove empty strings for optional fields
      const cleanedForm = { ...payrollForm };
      
      // Remove empty string date fields (keep only if they have values)
      if (!cleanedForm.payment_date) delete cleanedForm.payment_date;
      
      const payrollData: PayrollRecord = {
        outlet_id: outletId,
        employee_id: cleanedForm.employee_id,
        pay_period_start: cleanedForm.pay_period_start,
        pay_period_end: cleanedForm.pay_period_end,
        base_salary: cleanedForm.base_salary,
        housing_allowance: cleanedForm.housing_allowance || 0,
        transport_allowance: cleanedForm.transport_allowance || 0,
        meal_allowance: cleanedForm.meal_allowance || 0,
        overtime_hours: cleanedForm.overtime_hours || 0,
        overtime_pay: cleanedForm.overtime_pay || 0,
        other_allowances: cleanedForm.other_allowances || 0,
        tax_deduction: cleanedForm.tax_deduction || 0,
        social_security: cleanedForm.social_security || 0,
        health_insurance: cleanedForm.health_insurance || 0,
        advance_payment: cleanedForm.advance_payment || 0,
        other_deductions: cleanedForm.other_deductions || 0,
        status: cleanedForm.status,
        notes: cleanedForm.notes || undefined,
        gross_salary: payroll.gross,
        total_deductions: payroll.deductions,
        net_salary: payroll.net,
        working_days: Math.round(payroll.workingDays),
        days_present: Math.round(payroll.daysPresent),
        days_absent: Math.round(payroll.daysAbsent),
        days_late: Math.round(payroll.daysLate),
        days_half_day: Math.round(payroll.daysHalfDay),
        days_on_leave: Math.round(payroll.daysOnLeave),
        days_sick: Math.round(payroll.daysSick),
        total_late_minutes: Math.round(payroll.totalLateMinutes),
        total_early_minutes: Math.round(payroll.totalEarlyMinutes),
        chargeable_early_minutes: Math.round(payroll.chargeableEarlyMinutes),
        per_day_salary: payroll.perDaySalary,
        attendance_deduction: payroll.attendanceDeduction,
        late_penalty: payroll.latePenalty,
        early_departure_penalty: payroll.earlyDeparturePenalty,
        perfect_attendance_bonus: payroll.perfectAttendanceBonus,
        attendance_bonus: payroll.attendanceBonus,
        // Only include payment_date if it has a value
        ...(cleanedForm.payment_date && { payment_date: cleanedForm.payment_date })
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
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employee_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.position.toLowerCase().includes(searchTerm.toLowerCase());
    
    const empDate = emp.hire_date ? new Date(emp.hire_date) : null;
    const matchesDateFrom = !employeeDateFrom || (empDate && empDate >= new Date(employeeDateFrom));
    const matchesDateTo = !employeeDateTo || (empDate && empDate <= new Date(employeeDateTo + 'T23:59:59'));
    
    return matchesSearch && matchesDateFrom && matchesDateTo;
  });

  const filteredPayroll = payrollRecords.filter(record => {
    const matchesSearch = record.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.status?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const periodStart = record.pay_period_start ? new Date(record.pay_period_start) : null;
    const periodEnd = record.pay_period_end ? new Date(record.pay_period_end) : null;
    const matchesDateFrom = !payrollDateFrom || (periodStart && periodStart >= new Date(payrollDateFrom));
    const matchesDateTo = !payrollDateTo || (periodEnd && periodEnd <= new Date(payrollDateTo + 'T23:59:59'));
    
    return matchesSearch && matchesDateFrom && matchesDateTo;
  });

  const filteredAttendance = attendanceRecords.filter(record => {
    const attDate = record.attendance_date ? new Date(record.attendance_date) : null;
    const matchesDateFrom = !attendanceDateFrom || (attDate && attDate >= new Date(attendanceDateFrom));
    const matchesDateTo = !attendanceDateTo || (attDate && attDate <= new Date(attendanceDateTo + 'T23:59:59'));
    
    return matchesDateFrom && matchesDateTo;
  });

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
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={employeeDateFrom}
                    onChange={(e) => setEmployeeDateFrom(e.target.value)}
                    className="w-40"
                    placeholder="From Date"
                  />
                  <span className="text-sm text-gray-500">to</span>
                  <Input
                    type="date"
                    value={employeeDateTo}
                    onChange={(e) => setEmployeeDateTo(e.target.value)}
                    className="w-40"
                    placeholder="To Date"
                  />
                  {(employeeDateFrom || employeeDateTo) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEmployeeDateFrom("");
                        setEmployeeDateTo("");
                      }}
                      className="h-9"
                    >
                      Clear
                    </Button>
                  )}
                </div>
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
              </div>
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
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={attendanceDateFrom}
                    onChange={(e) => setAttendanceDateFrom(e.target.value)}
                    className="w-40"
                    placeholder="From Date"
                  />
                  <span className="text-sm text-gray-500">to</span>
                  <Input
                    type="date"
                    value={attendanceDateTo}
                    onChange={(e) => setAttendanceDateTo(e.target.value)}
                    className="w-40"
                    placeholder="To Date"
                  />
                  {(attendanceDateFrom || attendanceDateTo) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setAttendanceDateFrom("");
                        setAttendanceDateTo("");
                      }}
                      className="h-9"
                    >
                      Clear
                    </Button>
                  )}
                </div>
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
            </div>
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
                  {filteredAttendance.slice(0, 50).map((record) => (
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
                        const chargeableMinutes = Math.max(0, lateMinutes - 30);
                        return chargeableMinutes > 0 ? 'text-orange-600' : '';
                      })()}>
                        {(() => {
                          if (!record.check_in_time) return '0 min';
                          const [hours, minutes] = record.check_in_time.split(':').map(Number);
                          const actualCheckInHours = hours + minutes / 60;
                          const lateMinutes = Math.round(Math.max(0, (actualCheckInHours - 7.0) * 60));
                          const chargeableMinutes = Math.max(0, lateMinutes - 30);
                          if (lateMinutes <= 30) {
                            return `${lateMinutes} min (grace)`;
                          }
                          return `${lateMinutes} min (${chargeableMinutes} charged)`;
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
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={payrollDateFrom}
                    onChange={(e) => setPayrollDateFrom(e.target.value)}
                    className="w-40"
                    placeholder="From Date"
                  />
                  <span className="text-sm text-gray-500">to</span>
                  <Input
                    type="date"
                    value={payrollDateTo}
                    onChange={(e) => setPayrollDateTo(e.target.value)}
                    className="w-40"
                    placeholder="To Date"
                  />
                  {(payrollDateFrom || payrollDateTo) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPayrollDateFrom("");
                        setPayrollDateTo("");
                      }}
                      className="h-9"
                    >
                      Clear
                    </Button>
                  )}
                </div>
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
            </div>
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
                          {/* View Button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => viewPayrollRecord(record)}
                            title="View Payroll"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          {/* Status Action Buttons */}
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

                          {/* More Actions Dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleOpenPayrollDialog(record)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => printIndividualPayroll(record)}>
                                <Printer className="h-4 w-4 mr-2" />
                                Print Slip
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => downloadIndividualPayrollPDF(record)}>
                                <FileText className="h-4 w-4 mr-2" />
                                Download PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => exportIndividualPayrollToXLS(record)}>
                                <Download className="h-4 w-4 mr-2" />
                                Export XLS
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => shareIndividualPayroll(record)}>
                                <Share2 className="h-4 w-4 mr-2" />
                                Share
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeletePayroll(record.id!)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
      <Dialog open={isPayrollDialogOpen} onOpenChange={(open) => {
        setIsPayrollDialogOpen(open);
        if (!open) {
          setIsViewMode(false); // Reset view mode when dialog closes
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isViewMode ? "View Payroll Record" : editingPayroll ? "Edit Payroll Record" : "Create Payroll Record"}
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
                  disabled={isViewMode}
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
                  disabled={isViewMode}
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
                  disabled={isViewMode}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Period End *</label>
                <Input
                  type="date"
                  value={payrollForm.pay_period_end}
                  onChange={(e) => setPayrollForm(prev => ({ ...prev, pay_period_end: e.target.value }))}
                  disabled={isViewMode}
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
                    disabled={isViewMode}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Housing Allowance</label>
                  <Input
                    type="number"
                    value={payrollForm.housing_allowance}
                    onChange={(e) => setPayrollForm(prev => ({ ...prev, housing_allowance: parseFloat(e.target.value) || 0 }))}
                    disabled={isViewMode}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Transport Allowance</label>
                  <Input
                    type="number"
                    value={payrollForm.transport_allowance}
                    onChange={(e) => setPayrollForm(prev => ({ ...prev, transport_allowance: parseFloat(e.target.value) || 0 }))}
                    disabled={isViewMode}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Meal Allowance</label>
                  <Input
                    type="number"
                    value={payrollForm.meal_allowance}
                    onChange={(e) => setPayrollForm(prev => ({ ...prev, meal_allowance: parseFloat(e.target.value) || 0 }))}
                    disabled={isViewMode}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Overtime Hours</label>
                  <Input
                    type="number"
                    value={payrollForm.overtime_hours}
                    onChange={(e) => setPayrollForm(prev => ({ ...prev, overtime_hours: parseFloat(e.target.value) || 0 }))}
                    disabled={isViewMode}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Overtime Pay</label>
                  <Input
                    type="number"
                    value={payrollForm.overtime_pay}
                    onChange={(e) => setPayrollForm(prev => ({ ...prev, overtime_pay: parseFloat(e.target.value) || 0 }))}
                    disabled={isViewMode}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Other Allowances</label>
                  <Input
                    type="number"
                    value={payrollForm.other_allowances}
                    onChange={(e) => setPayrollForm(prev => ({ ...prev, other_allowances: parseFloat(e.target.value) || 0 }))}
                    disabled={isViewMode}
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
                    disabled={isViewMode}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Social Security</label>
                  <Input
                    type="number"
                    value={payrollForm.social_security}
                    onChange={(e) => setPayrollForm(prev => ({ ...prev, social_security: parseFloat(e.target.value) || 0 }))}
                    disabled={isViewMode}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Health Insurance</label>
                  <Input
                    type="number"
                    value={payrollForm.health_insurance}
                    onChange={(e) => setPayrollForm(prev => ({ ...prev, health_insurance: parseFloat(e.target.value) || 0 }))}
                    disabled={isViewMode}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Advance Payment</label>
                  <Input
                    type="number"
                    value={payrollForm.advance_payment}
                    onChange={(e) => setPayrollForm(prev => ({ ...prev, advance_payment: parseFloat(e.target.value) || 0 }))}
                    disabled={isViewMode}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Other Deductions</label>
                  <Input
                    type="number"
                    value={payrollForm.other_deductions}
                    onChange={(e) => setPayrollForm(prev => ({ ...prev, other_deductions: parseFloat(e.target.value) || 0 }))}
                    disabled={isViewMode}
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
                  disabled={isViewMode}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <Input
                value={payrollForm.notes}
                onChange={(e) => setPayrollForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes..."
                disabled={isViewMode}
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
                    {payroll.attendanceBonus > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Monthly Attendance Bonus (28+ days):</span>
                        <span>+{formatTZS(payroll.attendanceBonus)}</span>
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
            {!isViewMode && (
              <>
                <Button variant="outline" onClick={() => setIsPayrollDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSavePayroll} disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingPayroll ? "Update" : "Create"} Payroll
                </Button>
              </>
            )}
            {isViewMode && (
              <Button onClick={() => setIsPayrollDialogOpen(false)}>
                Close
              </Button>
            )}
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
