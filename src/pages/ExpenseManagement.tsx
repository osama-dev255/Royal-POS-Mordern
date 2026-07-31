import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Edit, Trash2, Wallet, Calendar, Filter, Tag, Download, Printer, FileSpreadsheet, Loader2, Share2, ChevronDown, FileText, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import { AutomationService } from "@/services/automationService";
import { ExportUtils } from "@/utils/exportUtils";
import { PrintUtils } from "@/utils/printUtils";
import { ExcelUtils } from "@/utils/excelUtils";
import { getExpenses, createExpense, updateExpense, deleteExpense } from "@/services/databaseService";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Expense {
  id?: string;
  date: string;
  category: string;
  subCategory?: string;
  description: string;
  amount: number;
  paymentMethod: string;
  vendorName?: string;
  expenseType?: string;
  costClassification?: string;
  taxDeductible?: boolean;
  notes?: string;
  preparedByName?: string;
  voucherNumber?: string;
  receipt?: string;
}

const expenseCategories = [
  "Operating Expenses",
  "Utilities",
  "Rent & Lease",
  "Salaries & Wages",
  "Marketing & Advertising",
  "Transportation",
  "Maintenance & Repairs",
  "Office Supplies",
  "Insurance",
  "Professional Services",
  "Travel & Entertainment",
  "Technology & Software",
  "Raw Materials",
  "Inventory",
  "Withdrawal",
  "Tax & Statutory Obligations",
  "Miscellaneous"
];

const expenseSubCategories: Record<string, string[]> = {
  "Operating Expenses": ["Office Rent", "Warehouse Rent", "Equipment Lease", "Cleaning Services", "Security Services", "General Operations", "Packaging Materials"],
  "Utilities": ["Electricity", "Water Bill", "Internet", "Phone", "Gas", "Sewer"],
  "Rent & Lease": ["Office Space", "Warehouse", "Equipment Lease", "Vehicle Lease", "Storage Unit"],
  "Salaries & Wages": ["Base Salary", "Overtime Pay", "Bonuses", "Commissions", "Benefits", "Payroll Taxes", "Employee Advance", "Casual Labor"],
  "Marketing & Advertising": ["Social Media Ads", "Print Materials", "Billboard", "Radio/TV Ads", "Promotional Events", "Digital Marketing", "Branding"],
  "Transportation": ["Fuel", "Vehicle Maintenance", "Delivery Fees", "Freight-In / Carriage-In", "Parking", "Tolls", "Public Transport", "Vehicle Insurance"],
  "Maintenance & Repairs": ["Building Repair", "Equipment Repair", "Plumbing", "Electrical", "HVAC", "Painting", "General Maintenance"],
  "Office Supplies": ["Paper & Printing", "Stationery", "Ink & Toner", "Folders & Files", "Desk Accessories", "Breakroom Supplies"],
  "Insurance": ["Property Insurance", "Liability Insurance", "Health Insurance", "Vehicle Insurance", "Workers Compensation", "Business Insurance"],
  "Professional Services": ["Legal Fees", "Accounting", "Consulting", "IT Services", "HR Services", "Marketing Agency"],
  "Travel & Entertainment": ["Flight Tickets", "Hotel Accommodation", "Meals", "Client Entertainment", "Conference Fees", "Transportation"],
  "Technology & Software": ["Software Licenses", "Hardware", "Cloud Services", "IT Support", "Website Hosting", "Security Software"],
  "Raw Materials": ["Direct Materials", "Packaging Materials", "Components", "Supplies", "Wholesale Goods"],
  "Inventory": ["Stock Purchase", "Inventory Adjustment", "Shrinkage", "Returns", "Warehouse Costs"],
  "Withdrawal": ["Owner Withdrawal", "Partner Withdrawal", "Dividend Payment", "Capital Draw", "Personal Use"],
  "Tax & Statutory Obligations": ["VAT Payable", "VAT on Inputs (Claimable)", "Corporate Tax Installment", "PAYE Payable", "SDL (Skills & Development Levy)", "WCF (Workers Compensation Fund)", "Withholding Tax (WHT)", "Penalties & Late Filing Fees"],
  "Miscellaneous": ["Bank Fees", "Miscellaneous Expenses", "Donations", "Subscriptions", "Memberships"]
};

const expenseTypes = ["Operating", "Capital", "Personal"];
const costClassifications = ["Direct", "Indirect"];

const paymentMethods = [
  "Cash",
  "Credit Card",
  "Debit Card",
  "Bank Transfer",
  "Check"
];

export const ExpenseManagement = ({ username, onBack, onLogout }: { username: string; onBack: () => void; onLogout: () => void }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateRange, setDateRange] = useState({
    start: '2020-01-01',
    end: '2099-12-31'
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [viewExpense, setViewExpense] = useState<Expense | null>(null);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [newExpense, setNewExpense] = useState<Omit<Expense, "id">>({
    date: new Date().toISOString().split('T')[0],
    category: expenseCategories[0],
    subCategory: "",
    description: "",
    amount: 0,
    paymentMethod: paymentMethods[0],
    vendorName: "",
    expenseType: expenseTypes[0],
    costClassification: costClassifications[0],
    taxDeductible: false,
    notes: "",
    preparedByName: username || ""
  });
  const { toast } = useToast();

  // Load expenses from Supabase
  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const expensesData = await getExpenses();
      // Convert Supabase expense format to component format
      const formattedExpenses = expensesData.map(expense => ({
        id: expense.id,
        date: expense.expense_date,
        category: expense.category,
        subCategory: expense.sub_category || '',
        description: expense.description,
        amount: expense.amount,
        paymentMethod: expense.payment_method,
        vendorName: expense.vendor_name || '',
        expenseType: expense.expense_type || '',
        costClassification: expense.cost_classification || '',
        taxDeductible: expense.tax_deductible || false,
        notes: expense.notes || '',
        preparedByName: expense.prepared_by_name || '',
        voucherNumber: expense.voucher_number || '',
      }));
      setExpenses(formattedExpenses);
    } catch (error) {
      console.error('Error loading expenses:', error);
      toast({
        title: "Error",
        description: "Failed to load expenses",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async () => {
    if (!newExpense.description || newExpense.amount <= 0) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      // Convert component format to Supabase format
      const expenseData = {
        expense_date: newExpense.date,
        category: newExpense.category,
        sub_category: newExpense.subCategory || '',
        description: newExpense.description,
        amount: newExpense.amount,
        payment_method: newExpense.paymentMethod,
        vendor_name: newExpense.vendorName || '',
        expense_type: newExpense.expenseType || '',
        cost_classification: newExpense.costClassification || '',
        tax_deductible: newExpense.taxDeductible || false,
        notes: newExpense.notes || '',
        prepared_by_name: newExpense.preparedByName || username || ''
      };

      const result = await createExpense(expenseData);
      if (result) {
        await loadExpenses(); // Reload expenses to get the new one
        resetForm();
        setIsDialogOpen(false);
        
        toast({
          title: "Success",
          description: "Expense added successfully"
        });
      } else {
        throw new Error("Failed to create expense");
      }
    } catch (error) {
      console.error('Error adding expense:', error);
      toast({
        title: "Error",
        description: "Failed to add expense",
        variant: "destructive"
      });
    }
  };

  const handleUpdateExpense = async () => {
    if (!editingExpense || !editingExpense.description || editingExpense.amount <= 0) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      if (!editingExpense.id) {
        throw new Error("Expense ID is missing");
      }

      // Convert component format to Supabase format
      const expenseData = {
        expense_date: editingExpense.date,
        category: editingExpense.category,
        sub_category: editingExpense.subCategory || '',
        description: editingExpense.description,
        amount: editingExpense.amount,
        payment_method: editingExpense.paymentMethod,
        vendor_name: editingExpense.vendorName || '',
        expense_type: editingExpense.expenseType || '',
        cost_classification: editingExpense.costClassification || '',
        tax_deductible: editingExpense.taxDeductible || false,
        notes: editingExpense.notes || '',
        prepared_by_name: editingExpense.preparedByName || ''
      };

      const result = await updateExpense(editingExpense.id, expenseData);
      if (result) {
        await loadExpenses(); // Reload expenses to get the updated one
        resetForm();
        setIsDialogOpen(false);
        
        toast({
          title: "Success",
          description: "Expense updated successfully"
        });
      } else {
        throw new Error("Failed to update expense");
      }
    } catch (error) {
      console.error('Error updating expense:', error);
      toast({
        title: "Error",
        description: "Failed to update expense",
        variant: "destructive"
      });
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      const result = await deleteExpense(id);
      if (result) {
        await loadExpenses(); // Reload expenses to reflect the deletion
        
        toast({
          title: "Success",
          description: "Expense deleted successfully"
        });
      } else {
        throw new Error("Failed to delete expense");
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast({
        title: "Error",
        description: "Failed to delete expense",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setNewExpense({
      date: new Date().toISOString().split('T')[0],
      category: expenseCategories[0],
      subCategory: "",
      description: "",
      amount: 0,
      paymentMethod: paymentMethods[0],
      vendorName: "",
      expenseType: expenseTypes[0],
      costClassification: costClassifications[0],
      taxDeductible: false,
      notes: "",
      preparedByName: username || ""
    });
    setEditingExpense(null);
  };

  const openEditDialog = (expense: Expense) => {
    setEditingExpense(expense);
    setIsDialogOpen(true);
  };

  // Fetch PDF attachment from saved_expense_vouchers by voucher_number
  const fetchVoucherPdfAttachment = async (voucherNumber: string): Promise<{ pdfAttachment?: string; pdfAttachmentName?: string }> => {
    if (!voucherNumber) return {};
    try {
      const { getSavedExpenseVouchers } = await import('@/utils/expenseVoucherUtils');
      const vouchers = await getSavedExpenseVouchers();
      const voucher = vouchers.find(v => v.id === voucherNumber || v.voucher_number === voucherNumber);
      if (voucher) {
        return {
          pdfAttachment: voucher.pdf_attachment || undefined,
          pdfAttachmentName: voucher.pdf_attachment_name || undefined
        };
      }
    } catch (err) {
      console.error('Error fetching voucher PDF attachment:', err);
    }
    return {};
  };

  // Map expense record to ExpenseVoucherData format for consistent print/export
  const mapExpenseToVoucherData = (expense: Expense, pdfAttachment?: string, pdfAttachmentName?: string) => ({
    voucherNumber: expense.id?.slice(0, 8) || '',
    date: expense.date,
    submittedBy: expense.vendorName || '',
    employeeId: '',
    department: '',
    items: [{
      id: expense.id || '1',
      description: expense.description,
      category: expense.category,
      subCategory: expense.subCategory || '',
      amount: expense.amount,
      date: expense.date,
      vendorName: expense.vendorName || '',
      paymentMethod: expense.paymentMethod,
      expenseType: expense.expenseType || '',
      costClassification: expense.costClassification || '',
      taxDeductible: expense.taxDeductible || false
    }],
    totalAmount: expense.amount,
    purpose: expense.notes || '',
    approvedBy: '',
    approvedDate: '',
    notes: expense.notes || '',
    preparedByName: expense.preparedByName || '',
    pdfAttachment: pdfAttachment || '',
    pdfAttachmentName: pdfAttachmentName || ''
  });

  // Per-row action handlers — matching Expense Voucher Preview
  const handlePrintExpense = async (expense: Expense) => {
    const { pdfAttachment, pdfAttachmentName } = await fetchVoucherPdfAttachment(expense.voucherNumber || '');
    PrintUtils.printExpenseVoucher(mapExpenseToVoucherData(expense, pdfAttachment, pdfAttachmentName));
  };

  const handleDownloadExpensePDF = (expense: Expense) => {
    const voucherData = mapExpenseToVoucherData(expense);
    const items = voucherData.items;
    const exportData = items.map((item, idx) => ({
      '#': idx + 1,
      'Description': item.description || '',
      'Category': item.category || '',
      'Sub-Category': item.subCategory || '',
      'Vendor': item.vendorName || '',
      'Payment Method': item.paymentMethod || '',
      'Expense Type': item.expenseType || '',
      'Cost Classification': item.costClassification || '',
      'Tax Deductible': item.taxDeductible ? 'Yes' : 'No',
      'Amount': item.amount || 0
    }));
    ExportUtils.exportToPDF(exportData, `expense_${expense.category}_${expense.date}`, `Expense - ${expense.category}`);
    toast({ title: "Downloaded", description: "Expense PDF saved" });
  };

  const handleExportExpenseXLS = (expense: Expense) => {
    const voucherData = mapExpenseToVoucherData(expense);
    const items = voucherData.items;
    const exportData = items.map((item, idx) => ({
      '#': idx + 1,
      'Description': item.description || '',
      'Category': item.category || '',
      'Sub-Category': item.subCategory || '',
      'Vendor': item.vendorName || '',
      'Payment Method': item.paymentMethod || '',
      'Expense Type': item.expenseType || '',
      'Cost Classification': item.costClassification || '',
      'Tax Deductible': item.taxDeductible ? 'Yes' : 'No',
      'Amount': item.amount || 0
    }));
    const filename = `expense_${expense.category}_${expense.date}`;
    ExcelUtils.exportToExcel(exportData, filename);
    toast({ title: "Exported", description: `XLS: ${filename}.xlsx` });
  };

  const handleShareExpense = async (expense: Expense) => {
    const voucherData = mapExpenseToVoucherData(expense);
    const items = voucherData.items;
    const totalAmount = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const pad = (s: string, w: number) => s.padEnd(w, ' ').slice(0, w);
    const header = `${pad('#', 3)}${pad('Description', 25)}${pad('Category', 15)}${pad('Amount', 12)}`;
    const separator = '-'.repeat(55);
    const rows = items.map((item, idx) =>
      `${pad(String(idx + 1), 3)}${pad((item.description || '').slice(0, 24), 25)}${pad((item.category || '').slice(0, 14), 15)}${pad(formatCurrency(item.amount || 0), 12)}`
    ).join('\n');
    const shareText = [
      `EXPENSE RECORD`,
      `Date: ${expense.date}`,
      `Category: ${expense.category}`,
      `Sub-Category: ${expense.subCategory || '-'}`,
      `Vendor: ${expense.vendorName || '-'}`,
      `Expense Type: ${expense.expenseType || '-'}`,
      `Cost Classification: ${expense.costClassification || '-'}`,
      `Tax Deductible: ${expense.taxDeductible ? 'Yes' : 'No'}`,
      `Prepared By: ${expense.preparedByName || '-'}`,
      '',
      header,
      separator,
      rows,
      separator,
      `TOTAL: ${formatCurrency(totalAmount)}`,
    ].join('\n');
    if (navigator.share) {
      try { await navigator.share({ title: `Expense - ${expense.category}`, text: shareText }); } catch { /* cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        toast({ title: 'Copied', description: 'Expense details copied to clipboard' });
      } catch {
        toast({ title: 'Copy failed', description: 'Could not copy to clipboard', variant: 'destructive' });
      }
    }
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  
  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = 
      expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === "all" || expense.category === categoryFilter;

    // Date range filter
    let matchesDate = true;
    if (dateRange.start || dateRange.end) {
      const expDate = new Date(expense.date);
      if (dateRange.start && expDate < new Date(dateRange.start)) matchesDate = false;
      if (dateRange.end && expDate > new Date(dateRange.end + 'T23:59:59')) matchesDate = false;
    }
    
    return matchesSearch && matchesCategory && matchesDate;
  });

  // Action button handlers
  const handlePrintReport = () => {
    if (filteredExpenses.length === 0) {
      toast({ 
        title: "No Data", 
        description: "No expenses to print", 
        variant: "destructive" 
      });
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ 
        title: "Error", 
        description: "Please allow pop-ups to print", 
        variant: "destructive" 
      });
      return;
    }

    const totalAmount = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Expense Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
            .header { margin-bottom: 20px; }
            .summary { background: #f3f4f6; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
            .summary-item { display: inline-block; margin-right: 30px; }
            .summary-label { font-weight: bold; color: #666; }
            .summary-value { font-size: 1.2em; color: #3b82f6; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #3b82f6; color: white; padding: 10px; text-align: left; }
            td { padding: 8px 10px; border-bottom: 1px solid #ddd; }
            tr:nth-child(even) { background: #f9fafb; }
            .amount { text-align: right; font-weight: bold; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Expense Report</h1>
            <p>Generated: ${new Date().toLocaleString()}</p>
          </div>
          
          <div class="summary">
            <div class="summary-item">
              <span class="summary-label">Total Expenses: </span>
              <span class="summary-value">${filteredExpenses.length}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Total Amount: </span>
              <span class="summary-value">${formatCurrency(totalAmount)}</span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Sub-Category</th>
                <th>Description</th>
                <th>Vendor</th>
                <th>Payment Method</th>
                <th>Expense Type</th>
                <th class="amount">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${filteredExpenses.map(exp => `
                <tr>
                  <td>${exp.date}</td>
                  <td>${exp.category}</td>
                  <td>${exp.subCategory || '-'}</td>
                  <td>${exp.description}</td>
                  <td>${exp.vendorName || '-'}</td>
                  <td>${exp.paymentMethod}</td>
                  <td>${exp.expenseType || '-'}</td>
                  <td class="amount">${formatCurrency(exp.amount)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
    
    toast({ 
      title: "Print Ready", 
      description: "Print dialog opened" 
    });
  };

  const handleDownloadPDF = () => {
    if (filteredExpenses.length === 0) {
      toast({ 
        title: "No Data", 
        description: "No expenses to export", 
        variant: "destructive" 
      });
      return;
    }

    const totalAmount = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    // Map expenses to data rows
    const data = filteredExpenses.map(exp => ({
      Date: exp.date,
      Category: exp.category,
      'Sub-Category': exp.subCategory || '',
      Description: exp.description,
      Vendor: exp.vendorName || '',
      Amount: exp.amount,
      'Payment Method': exp.paymentMethod,
      'Expense Type': exp.expenseType || '',
      'Cost Classification': exp.costClassification || '',
      'Tax Deductible': exp.taxDeductible ? 'Yes' : 'No'
    }));
    
    // Add summary rows
    data.push({
      Date: '',
      Category: '',
      'Sub-Category': '',
      Description: '',
      Vendor: '',
      Amount: 0,
      'Payment Method': '',
      'Expense Type': '',
      'Cost Classification': '',
      'Tax Deductible': ''
    });
    data.push({
      Date: '',
      Category: 'SUMMARY',
      'Sub-Category': '',
      Description: `Total Expenses: ${filteredExpenses.length}`,
      Vendor: '',
      Amount: totalAmount,
      'Payment Method': `Generated: ${new Date().toLocaleString()}`,
      'Expense Type': '',
      'Cost Classification': '',
      'Tax Deductible': ''
    });
    
    const filename = `expenses_${new Date().toISOString().split('T')[0]}`;
    ExportUtils.exportToPDF(data, filename, "Expense Report");
    toast({
      title: "Downloaded",
      description: `PDF: ${filename}.pdf`
    });
  };

  const handleExportXLS = () => {
    if (filteredExpenses.length === 0) {
      toast({ 
        title: "No Data", 
        description: "No expenses to export", 
        variant: "destructive" 
      });
      return;
    }

    const totalAmount = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    // Map expenses to data rows
    const data = filteredExpenses.map(exp => ({
      Date: exp.date,
      Category: exp.category,
      'Sub-Category': exp.subCategory || '',
      Description: exp.description,
      Vendor: exp.vendorName || '',
      Amount: exp.amount,
      'Payment Method': exp.paymentMethod,
      'Expense Type': exp.expenseType || '',
      'Cost Classification': exp.costClassification || '',
      'Tax Deductible': exp.taxDeductible ? 'Yes' : 'No'
    }));
    
    // Add summary rows
    data.push({
      Date: '',
      Category: '',
      'Sub-Category': '',
      Description: '',
      Vendor: '',
      Amount: 0,
      'Payment Method': '',
      'Expense Type': '',
      'Cost Classification': '',
      'Tax Deductible': ''
    });
    data.push({
      Date: '',
      Category: 'SUMMARY',
      'Sub-Category': '',
      Description: `Total Expenses: ${filteredExpenses.length}`,
      Vendor: '',
      Amount: totalAmount,
      'Payment Method': `Generated: ${new Date().toLocaleString()}`,
      'Expense Type': '',
      'Cost Classification': '',
      'Tax Deductible': ''
    });
    
    const filename = `expenses_${new Date().toISOString().split('T')[0]}`;
    ExcelUtils.exportToExcel(data, filename);
    toast({
      title: "Exported",
      description: `CSV: ${filename}.csv`
    });
  };

  const handleSharePDF = async () => {
    if (filteredExpenses.length === 0) {
      toast({ 
        title: "No Data", 
        description: "No expenses to share", 
        variant: "destructive" 
      });
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Expense Report', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
    
    const totalAmount = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    doc.text(`Total Expenses: ${filteredExpenses.length}`, 14, 36);
    doc.text(`Total Amount: ${formatCurrency(totalAmount)}`, 14, 42);
    
    const tableData = filteredExpenses.map(exp => [
      exp.date,
      exp.category,
      exp.subCategory || '-',
      exp.description,
      exp.vendorName || '-',
      formatCurrency(exp.amount),
      exp.paymentMethod,
      exp.expenseType || '-'
    ]);
    
    autoTable(doc, {
      startY: 50,
      head: [['Date', 'Category', 'Sub-Category', 'Description', 'Vendor', 'Amount', 'Payment Method', 'Expense Type']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
    });
    
    const pdfBlob = doc.output('blob');
    
    // Try to use File constructor if available
    let pdfFile: File | null = null;
    try {
      pdfFile = new File([pdfBlob], 'expense-report.pdf', { type: 'application/pdf' });
    } catch (error) {
      // File constructor not supported
      console.log('File constructor not available');
    }
    
    // Only try to share if File constructor worked
    if (pdfFile && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      try {
        await navigator.share({ files: [pdfFile], title: 'Expense Report' });
        toast({ title: "Shared", description: "PDF shared successfully" });
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          doc.save('expense-report.pdf');
          toast({ title: "Downloaded", description: "Sharing failed, PDF downloaded" });
        }
      }
    } else {
      doc.save('expense-report.pdf');
      toast({ title: "Downloaded", description: "Sharing not supported, PDF downloaded" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation 
        title="Expense Management" 
        onBack={onBack}
        onLogout={onLogout} 
        username={username}
      />
      
      <main className="container mx-auto p-6">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold">Expenses</h2>
            <p className="text-muted-foreground">Track and manage business expenses</p>
          </div>
          
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-40"
              />
            </div>
            <span className="text-muted-foreground">to</span>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-40"
              />
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search expenses..."
                className="pl-8 w-full sm:w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-32">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {expenseCategories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Action Button Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-2">
                  <span>Actions</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handlePrintReport}>
                  <Printer className="h-4 w-4 mr-2" />
                  <span>Print .pdf</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadPDF}>
                  <Download className="h-4 w-4 mr-2" />
                  <span>Download .pdf</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportXLS}>
                  <FileText className="h-4 w-4 mr-2" />
                  <span>Export .csv</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSharePDF}>
                  <Share2 className="h-4 w-4 mr-2" />
                  <span>Share</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openAddDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Expense
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingExpense ? "Edit Expense" : "Add New Expense"}
                  </DialogTitle>
                </DialogHeader>
                
                <div className="grid gap-3 py-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="date">Date *</Label>
                      <Input
                        id="date"
                        type="date"
                        value={editingExpense ? editingExpense.date : newExpense.date}
                        onChange={(e) => 
                          editingExpense 
                            ? setEditingExpense({...editingExpense, date: e.target.value}) 
                            : setNewExpense({...newExpense, date: e.target.value})
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="amount">Amount *</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-muted-foreground">TZS</span>
                        <Input
                          id="amount"
                          type="number"
                          step="0.01"
                          className="pl-8"
                          value={editingExpense ? editingExpense.amount : newExpense.amount}
                          onChange={(e) => 
                            editingExpense 
                              ? setEditingExpense({...editingExpense, amount: parseFloat(e.target.value) || 0}) 
                              : setNewExpense({...newExpense, amount: parseFloat(e.target.value) || 0})
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="category">Category *</Label>
                      <Select
                        value={editingExpense ? editingExpense.category : newExpense.category}
                        onValueChange={(value) => {
                          if (editingExpense) {
                            setEditingExpense({...editingExpense, category: value, subCategory: ''});
                          } else {
                            setNewExpense({...newExpense, category: value, subCategory: ''});
                          }
                        }}
                      >
                        <SelectTrigger id="category"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {expenseCategories.map(category => (
                            <SelectItem key={category} value={category}>{category}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="subCategory">Sub-Category</Label>
                      <Select
                        value={editingExpense ? (editingExpense.subCategory || '') : (newExpense.subCategory || '')}
                        onValueChange={(value) => 
                          editingExpense 
                            ? setEditingExpense({...editingExpense, subCategory: value}) 
                            : setNewExpense({...newExpense, subCategory: value})
                        }
                      >
                        <SelectTrigger id="subCategory"><SelectValue placeholder="Select sub-category" /></SelectTrigger>
                        <SelectContent>
                          {(expenseSubCategories[editingExpense ? editingExpense.category : newExpense.category] || []).map(sc => (
                            <SelectItem key={sc} value={sc}>{sc}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      value={editingExpense ? editingExpense.description : newExpense.description}
                      onChange={(e) => 
                        editingExpense 
                          ? setEditingExpense({...editingExpense, description: e.target.value}) 
                          : setNewExpense({...newExpense, description: e.target.value})
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="paymentMethod">Payment Method</Label>
                      <Select
                        value={editingExpense ? editingExpense.paymentMethod : newExpense.paymentMethod}
                        onValueChange={(value) => 
                          editingExpense 
                            ? setEditingExpense({...editingExpense, paymentMethod: value}) 
                            : setNewExpense({...newExpense, paymentMethod: value})
                        }
                      >
                        <SelectTrigger id="paymentMethod"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {paymentMethods.map(method => (
                            <SelectItem key={method} value={method}>{method}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="vendorName">Vendor Name</Label>
                      <Input
                        id="vendorName"
                        value={editingExpense ? (editingExpense.vendorName || '') : (newExpense.vendorName || '')}
                        onChange={(e) => 
                          editingExpense 
                            ? setEditingExpense({...editingExpense, vendorName: e.target.value}) 
                            : setNewExpense({...newExpense, vendorName: e.target.value})
                        }
                        placeholder="Vendor / Supplier"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="expenseType">Expense Type</Label>
                      <Select
                        value={editingExpense ? (editingExpense.expenseType || expenseTypes[0]) : newExpense.expenseType}
                        onValueChange={(value) => 
                          editingExpense 
                            ? setEditingExpense({...editingExpense, expenseType: value}) 
                            : setNewExpense({...newExpense, expenseType: value})
                        }
                      >
                        <SelectTrigger id="expenseType"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {expenseTypes.map(et => (
                            <SelectItem key={et} value={et}>{et}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="costClassification">Cost Classification</Label>
                      <Select
                        value={editingExpense ? (editingExpense.costClassification || costClassifications[0]) : newExpense.costClassification}
                        onValueChange={(value) => 
                          editingExpense 
                            ? setEditingExpense({...editingExpense, costClassification: value}) 
                            : setNewExpense({...newExpense, costClassification: value})
                        }
                      >
                        <SelectTrigger id="costClassification"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {costClassifications.map(cc => (
                            <SelectItem key={cc} value={cc}>{cc}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 pt-4">
                      <input
                        type="checkbox"
                        id="taxDeductible"
                        checked={editingExpense ? (editingExpense.taxDeductible || false) : (newExpense.taxDeductible || false)}
                        onChange={(e) => 
                          editingExpense 
                            ? setEditingExpense({...editingExpense, taxDeductible: e.target.checked}) 
                            : setNewExpense({...newExpense, taxDeductible: e.target.checked})
                        }
                        className="h-4 w-4"
                      />
                      <Label htmlFor="taxDeductible" className="text-sm">Tax Deductible</Label>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="preparedByName">Prepared By</Label>
                      <Input
                        id="preparedByName"
                        value={editingExpense ? (editingExpense.preparedByName || '') : (newExpense.preparedByName || '')}
                        onChange={(e) => 
                          editingExpense 
                            ? setEditingExpense({...editingExpense, preparedByName: e.target.value}) 
                            : setNewExpense({...newExpense, preparedByName: e.target.value})
                        }
                        placeholder="Name"
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={editingExpense ? (editingExpense.notes || '') : (newExpense.notes || '')}
                      onChange={(e) => 
                        editingExpense 
                          ? setEditingExpense({...editingExpense, notes: e.target.value}) 
                          : setNewExpense({...newExpense, notes: e.target.value})
                      }
                      placeholder="Additional notes..."
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={editingExpense ? handleUpdateExpense : handleAddExpense}>
                    {editingExpense ? "Update" : "Add"} Expense
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Expenses</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {expenses.length}
              </div>
              <p className="text-xs text-muted-foreground">Total expenses</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
              <Filter className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{expenseCategories.length}</div>
              <p className="text-xs text-muted-foreground">Expense types</p>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Expense Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Sub-Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Expense Type</TableHead>
                    <TableHead>Tax Ded.</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        No expenses found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredExpenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell className="text-xs">{expense.date}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">{expense.category}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">{expense.subCategory || '-'}</TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate">{expense.description}</TableCell>
                        <TableCell className="text-xs">{expense.vendorName || '-'}</TableCell>
                        <TableCell className="font-medium text-xs">{formatCurrency(expense.amount)}</TableCell>
                        <TableCell className="text-xs">{expense.paymentMethod}</TableCell>
                        <TableCell className="text-xs">{expense.expenseType || '-'}</TableCell>
                        <TableCell className="text-xs">{expense.taxDeductible ? 'Yes' : 'No'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setViewExpense(expense); setIsViewDialogOpen(true); }}
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(expense)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handlePrintExpense(expense)}>
                                <Printer className="h-4 w-4 mr-2" />
                                Print
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDownloadExpensePDF(expense)}>
                                <Download className="h-4 w-4 mr-2" />
                                Download PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleExportExpenseXLS(expense)}>
                                <FileText className="h-4 w-4 mr-2" />
                                Export XLS
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleShareExpense(expense)}>
                                <Share2 className="h-4 w-4 mr-2" />
                                Share
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => expense.id && handleDeleteExpense(expense.id)} className="text-red-600">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* View Expense Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Expense Details
              </DialogTitle>
            </DialogHeader>
            {viewExpense && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Date</Label>
                    <p className="text-sm mt-1">{viewExpense.date}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Amount</Label>
                    <p className="text-sm mt-1 font-semibold">{formatCurrency(viewExpense.amount)}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Category</Label>
                    <p className="text-sm mt-1">{viewExpense.category}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Sub-Category</Label>
                    <p className="text-sm mt-1">{viewExpense.subCategory || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Vendor</Label>
                    <p className="text-sm mt-1">{viewExpense.vendorName || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Payment Method</Label>
                    <p className="text-sm mt-1">{viewExpense.paymentMethod}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Expense Type</Label>
                    <p className="text-sm mt-1">{viewExpense.expenseType || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Cost Classification</Label>
                    <p className="text-sm mt-1">{viewExpense.costClassification || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Tax Deductible</Label>
                    <p className="text-sm mt-1">{viewExpense.taxDeductible ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Prepared By</Label>
                    <p className="text-sm mt-1">{viewExpense.preparedByName || '-'}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Description</Label>
                  <p className="text-sm mt-1">{viewExpense.description || '-'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Notes</Label>
                  <p className="text-sm mt-1">{viewExpense.notes || '-'}</p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};