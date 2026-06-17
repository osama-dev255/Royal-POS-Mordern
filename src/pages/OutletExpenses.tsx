import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Search,
  Plus,
  Pencil,
  Trash2,
  ArrowLeft,
  Loader2,
  Filter,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  AlertCircle,
  PieChart,
  BarChart3,
  LineChart,
  Receipt,
  Calendar,
  Tag,
  FileText,
  Eye,
  MoreVertical,
  Upload,
  File,
  X,
  Share2,
  ChevronDown,
  Printer
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { ExportUtils } from "@/utils/exportUtils";
import { PrintUtils } from "@/utils/printUtils";
import { ExcelUtils } from "@/utils/excelUtils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  getOutletExpensesFiltered,
  createOutletExpense,
  updateOutletExpense,
  deleteOutletExpense,
  approveOutletExpense,
  getPendingExpenseApprovals,
  getOutletExpenseAnalytics,
  getOutletBudgets,
  createExpenseBudget,
  updateExpenseBudget,
  deleteExpenseBudget,
  getBudgetAlerts,
  getUpcomingRecurringExpenses,
  getOverdueRecurringExpenses,
  createNextRecurringExpense,
  getRecurringExpenseSummary,
  Expense,
  ExpenseBudget,
  ExpenseAnalytics
} from "@/services/databaseService";

interface OutletExpensesProps {
  onBack: () => void;
  outletId?: string;
  outletName?: string;
}

export const OutletExpenses = ({ onBack, outletId, outletName }: OutletExpensesProps) => {
  const [activeTab, setActiveTab] = useState<"dashboard" | "expenses" | "budgets" | "approvals" | "recurring">("dashboard");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<ExpenseBudget[]>([]);
  const [analytics, setAnalytics] = useState<ExpenseAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingBudget, setEditingBudget] = useState<ExpenseBudget | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [pendingApprovals, setPendingApprovals] = useState<Expense[]>([]);
  const [budgetAlerts, setBudgetAlerts] = useState<any[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [customSubCategories, setCustomSubCategories] = useState<Record<string, string[]>>({});
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false);
  const [isAddSubCategoryDialogOpen, setIsAddSubCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newSubCategoryName, setNewSubCategoryName] = useState("");
  
  // Recurring expense states
  const [upcomingRecurring, setUpcomingRecurring] = useState<Expense[]>([]);
  const [overdueRecurring, setOverdueRecurring] = useState<Expense[]>([]);
  const [recurringSummary, setRecurringSummary] = useState<{
    total_recurring: number;
    upcoming_7_days: number;
    upcoming_30_days: number;
    overdue: number;
    monthly_total: number;
  } | null>(null);

  const { toast } = useToast();

  // Predefined sub-categories for each main category
  const predefinedSubCategories: Record<string, string[]> = {
    "Operating Expenses": ["Office Rent", "Warehouse Rent", "Equipment Lease", "Cleaning Services", "Security Services", "General Operations"],
    "Utilities": ["Electricity", "Water Bill", "Internet", "Phone", "Gas", "Sewer"],
    "Rent & Lease": ["Office Space", "Warehouse", "Equipment Lease", "Vehicle Lease", "Storage Unit"],
    "Salaries & Wages": ["Base Salary", "Overtime Pay", "Bonuses", "Commissions", "Benefits", "Payroll Taxes"],
    "Marketing & Advertising": ["Social Media Ads", "Print Materials", "Billboard", "Radio/TV Ads", "Promotional Events", "Digital Marketing", "Branding"],
    "Transportation": ["Fuel", "Vehicle Maintenance", "Delivery Fees", "Parking", "Tolls", "Public Transport", "Vehicle Insurance"],
    "Maintenance & Repairs": ["Building Repair", "Equipment Repair", "Plumbing", "Electrical", "HVAC", "Painting", "General Maintenance"],
    "Office Supplies": ["Paper & Printing", "Stationery", "Ink & Toner", "Folders & Files", "Desk Accessories", "Breakroom Supplies"],
    "Insurance": ["Property Insurance", "Liability Insurance", "Health Insurance", "Vehicle Insurance", "Workers Compensation", "Business Insurance"],
    "Professional Services": ["Legal Fees", "Accounting", "Consulting", "IT Services", "HR Services", "Marketing Agency"],
    "Travel & Entertainment": ["Flight Tickets", "Hotel Accommodation", "Meals", "Client Entertainment", "Conference Fees", "Transportation"],
    "Technology & Software": ["Software Licenses", "Hardware", "Cloud Services", "IT Support", "Website Hosting", "Security Software"],
    "Raw Materials": ["Direct Materials", "Packaging Materials", "Components", "Supplies", "Wholesale Goods"],
    "Inventory": ["Stock Purchase", "Inventory Adjustment", "Shrinkage", "Returns", "Warehouse Costs"],
    "Withdrawal": ["Owner Withdrawal", "Partner Withdrawal", "Dividend Payment", "Capital Draw", "Personal Use"],
    "Miscellaneous": ["Bank Fees", "Miscellaneous Expenses", "Donations", "Subscriptions", "Memberships"]
  };

  const expenseCategories = [
    ...Object.keys(predefinedSubCategories),
    ...customCategories
  ];

  const paymentMethods = ["cash", "card", "bank_transfer", "mobile_money", "cheque"];

  const expenseForm = {
    category: "",
    sub_category: "",
    description: "",
    amount: 0,
    payment_method: "cash",
    expense_date: new Date().toISOString().split('T')[0],
    vendor_name: "",
    vendor_contact: "",
    tax_deductible: false,
    expense_type: "operating",
    cost_classification: "indirect",
    is_recurring: false,
    recurring_frequency: "monthly",
    next_due_date: "",
    recurring_end_date: "",
    department: "",
    notes: "",
    receipt_url: "",
    tags: [] as string[]
  };

  const [expenseData, setExpenseData] = useState(expenseForm);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const budgetForm = {
    category: "",
    sub_category: "",
    budget_amount: 0,
    period: "monthly" as "monthly" | "quarterly" | "yearly",
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    alert_threshold: 80
  };

  const [budgetData, setBudgetData] = useState(budgetForm);

  useEffect(() => {
    if (outletId) {
      loadData();
    }
  }, [outletId]);

  const loadData = async () => {
    if (!outletId) return;
    
    setLoading(true);
    try {
      const [expensesData, analyticsData, budgetsData, alertsData, pendingData, upcomingData, overdueData, summaryData] = await Promise.all([
        getOutletExpensesFiltered(outletId),
        getOutletExpenseAnalytics(outletId, 'month'),
        getOutletBudgets(outletId),
        getBudgetAlerts(outletId),
        getPendingExpenseApprovals(outletId),
        getUpcomingRecurringExpenses(outletId, 30),
        getOverdueRecurringExpenses(outletId),
        getRecurringExpenseSummary(outletId)
      ]);
      
      setExpenses(expensesData);
      setAnalytics(analyticsData);
      setBudgets(budgetsData);
      setBudgetAlerts(alertsData);
      setPendingApprovals(pendingData);
      setUpcomingRecurring(upcomingData);
      setOverdueRecurring(overdueData);
      setRecurringSummary(summaryData);
    } catch (error) {
      console.error('Error loading expenses data:', error);
      toast({
        title: "Error",
        description: "Failed to load expenses data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExpense = async () => {
    if (!outletId || !expenseData.category || !expenseData.amount) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const expense = {
      outlet_id: outletId,
      ...expenseData,
      approval_status: 'pending' as const
    };

    const result = await createOutletExpense(expense);
    if (result) {
      toast({ title: "Success", description: "Expense created successfully" });
      setIsExpenseDialogOpen(false);
      setExpenseData(expenseForm);
      loadData();
    } else {
      toast({ title: "Error", description: "Failed to create expense", variant: "destructive" });
    }
  };

  const handleUpdateExpense = async () => {
    if (!editingExpense?.id) return;

    const result = await updateOutletExpense(editingExpense.id, expenseData);
    if (result) {
      toast({ title: "Success", description: "Expense updated successfully" });
      setIsExpenseDialogOpen(false);
      setEditingExpense(null);
      setExpenseData(expenseForm);
      loadData();
    } else {
      toast({ title: "Error", description: "Failed to update expense", variant: "destructive" });
    }
  };

  const handleViewExpense = (expense: Expense) => {
    setViewingExpense(expense);
    setIsViewDialogOpen(true);
  };

  const handleViewReceipt = async (receiptUrl: string) => {
    try {
      const { supabase } = await import('@/lib/supabaseClient');
      
      // Check if it's a file path (private bucket) or full URL (public bucket)
      if (receiptUrl.startsWith('http')) {
        // Already a full URL (public bucket)
        window.open(receiptUrl, '_blank');
      } else {
        // It's a file path, generate signed URL
        const { data, error } = await supabase.storage
          .from('expense-receipts')
          .createSignedUrl(receiptUrl, 3600); // 1 hour expiry
        
        if (error) throw error;
        
        if (data?.signedUrl) {
          window.open(data.signedUrl, '_blank');
        }
      }
    } catch (error: any) {
      console.error('Error viewing receipt:', error);
      toast({
        title: "Error",
        description: "Failed to load receipt. The file may have been deleted or moved.",
        variant: "destructive"
      });
    }
  };

  const handlePrintExpense = (expense: Expense) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ 
        title: "Error", 
        description: "Please allow pop-ups to print", 
        variant: "destructive" 
      });
      return;
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Expense - ${expense.category}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
            .header { margin-bottom: 20px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
            .info-item { background: #f3f4f6; padding: 10px; border-radius: 5px; }
            .label { font-weight: bold; color: #666; font-size: 0.9em; }
            .value { font-size: 1.1em; margin-top: 5px; }
            .amount { font-size: 1.5em; color: #3b82f6; font-weight: bold; }
            .section { margin-bottom: 20px; }
            .section-title { font-weight: bold; color: #333; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Expense Details</h1>
            <p>Generated: ${new Date().toLocaleString()}</p>
          </div>
          
          <div class="info-grid">
            <div class="info-item">
              <div class="label">Date</div>
              <div class="value">${new Date(expense.expense_date).toLocaleDateString()}</div>
            </div>
            <div class="info-item">
              <div class="label">Amount</div>
              <div class="amount">${formatTZS(expense.amount)}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Category & Description</div>
            <p><strong>Category:</strong> ${expense.category}${expense.sub_category ? ` - ${expense.sub_category}` : ''}</p>
            <p><strong>Description:</strong> ${expense.description || 'N/A'}</p>
          </div>

          <div class="section">
            <div class="section-title">Payment & Status</div>
            <p><strong>Payment Method:</strong> ${expense.payment_method?.replace('_', ' ') || 'N/A'}</p>
            <p><strong>Status:</strong> ${(expense.approval_status || 'pending').toUpperCase()}</p>
          </div>

          ${expense.vendor_name ? `
          <div class="section">
            <div class="section-title">Vendor Information</div>
            <p><strong>Vendor Name:</strong> ${expense.vendor_name}</p>
            ${expense.vendor_contact ? `<p><strong>Vendor Contact:</strong> ${expense.vendor_contact}</p>` : ''}
          </div>
          ` : ''}

          ${expense.notes ? `
          <div class="section">
            <div class="section-title">Notes</div>
            <p>${expense.notes}</p>
          </div>
          ` : ''}
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

  const handleDownloadExpensePDF = (expense: Expense) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Expense Details', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
    
    const expenseData = [
      ['Date', new Date(expense.expense_date).toLocaleDateString()],
      ['Category', expense.category + (expense.sub_category ? ` - ${expense.sub_category}` : '')],
      ['Description', expense.description || 'N/A'],
      ['Amount', formatTZS(expense.amount)],
      ['Payment Method', expense.payment_method?.replace('_', ' ') || 'N/A'],
      ['Status', (expense.approval_status || 'pending').toUpperCase()]
    ];

    if (expense.vendor_name) {
      expenseData.push(['Vendor Name', expense.vendor_name]);
    }
    if (expense.vendor_contact) {
      expenseData.push(['Vendor Contact', expense.vendor_contact]);
    }
    if (expense.department) {
      expenseData.push(['Department', expense.department]);
    }
    if (expense.notes) {
      expenseData.push(['Notes', expense.notes]);
    }
    
    autoTable(doc, {
      startY: 35,
      body: expenseData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { cellWidth: 120 }
      }
    });
    
    const filename = `expense_${expense.category}_${new Date(expense.expense_date).toISOString().split('T')[0]}`;
    doc.save(`${filename}.pdf`);
    
    toast({
      title: "Downloaded",
      description: `PDF: ${filename}.pdf`
    });
  };

  const handleExportExpenseCSV = (expense: Expense) => {
    const headers = ['Date', 'Category', 'Sub-Category', 'Description', 'Amount', 'Payment Method', 'Status', 'Vendor Name', 'Vendor Contact', 'Department', 'Notes'];
    
    const rows = [
      new Date(expense.expense_date).toLocaleDateString(),
      expense.category,
      expense.sub_category || '',
      expense.description || '',
      expense.amount.toString(),
      expense.payment_method?.replace('_', ' ') || '',
      expense.approval_status || 'pending',
      expense.vendor_name || '',
      expense.vendor_contact || '',
      expense.department || '',
      expense.notes || ''
    ];
    
    const csvContent = [headers.join(','), rows.map(r => `"${r}"`).join(',')].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    const filename = `expense_${expense.category}_${new Date(expense.expense_date).toISOString().split('T')[0]}`;
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Exported",
      description: `CSV: ${filename}.csv`
    });
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;

    const result = await deleteOutletExpense(id);
    if (result) {
      toast({ title: "Success", description: "Expense deleted successfully" });
      loadData();
    } else {
      toast({ title: "Error", description: "Failed to delete expense", variant: "destructive" });
    }
  };

  const handleCreateNextRecurring = async (parentExpense: Expense) => {
    try {
      const newExpense = await createNextRecurringExpense(parentExpense);
      
      if (newExpense) {
        toast({ 
          title: "Success", 
          description: `Next occurrence created successfully! Occurrence #${newExpense.occurrence_count || 1}` 
        });
        loadData();
      } else {
        toast({ 
          title: "Error", 
          description: "Failed to create next recurring expense", 
          variant: "destructive" 
        });
      }
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create recurring expense", 
        variant: "destructive" 
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid File Type",
        description: "Only PDF files are allowed",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "File size must be less than 10MB",
        variant: "destructive"
      });
      return;
    }

    setUploadingFile(true);
    setUploadProgress(0);

    try {
      // Import supabase client
      const { supabase } = await import('@/lib/supabaseClient');

      // Create file path: outlet_id/year/month/timestamp_filename.pdf
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const timestamp = now.getTime();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${outletId}/${year}/${month}/${timestamp}_${sanitizedFileName}`;

      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from('expense-receipts')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          onUploadProgress: (progress) => {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            setUploadProgress(percent);
          }
        });

      if (error) throw error;

      // For private buckets, we need to store the file path and generate signed URL on demand
      // Store the file path instead of public URL
      setExpenseData(prev => ({ ...prev, receipt_url: filePath }));
      setUploadedFileName(file.name);
      
      toast({
        title: "Upload Successful",
        description: `${file.name} uploaded successfully`
      });
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload file",
        variant: "destructive"
      });
    } finally {
      setUploadingFile(false);
      setUploadProgress(0);
    }
  };

  const handleRemoveFile = () => {
    setExpenseData(prev => ({ ...prev, receipt_url: "" }));
    setUploadedFileName("");
    toast({
      title: "File Removed",
      description: "Receipt file has been removed"
    });
  };

  const handleViewFile = async () => {
    if (expenseData.receipt_url) {
      try {
        const { supabase } = await import('@/lib/supabaseClient');
        
        // Check if it's a file path (private bucket) or full URL (public bucket)
        if (expenseData.receipt_url.startsWith('http')) {
          // Already a full URL (public bucket)
          window.open(expenseData.receipt_url, '_blank');
        } else {
          // It's a file path, generate signed URL
          const { data, error } = await supabase.storage
            .from('expense-receipts')
            .createSignedUrl(expenseData.receipt_url, 3600); // 1 hour expiry
          
          if (error) throw error;
          
          if (data?.signedUrl) {
            window.open(data.signedUrl, '_blank');
          }
        }
      } catch (error: any) {
        console.error('Error generating signed URL:', error);
        toast({
          title: "Error",
          description: "Failed to open receipt file",
          variant: "destructive"
        });
      }
    }
  };

  const handleApproveExpense = async (id: string, status: 'approved' | 'rejected') => {
    try {
      // Get current authenticated user
      const { supabase } = await import('@/lib/supabaseClient');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({ 
          title: "Authentication Error", 
          description: "You must be logged in to approve expenses", 
          variant: "destructive" 
        });
        return;
      }

      const result = await approveOutletExpense(id, status, user.id);
      if (result) {
        toast({ 
          title: "Success", 
          description: `Expense ${status} successfully` 
        });
        loadData();
      } else {
        toast({ title: "Error", description: `Failed to ${status} expense`, variant: "destructive" });
      }
    } catch (error: any) {
      console.error('Error in handleApproveExpense:', error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to approve expense", 
        variant: "destructive" 
      });
    }
  };

  const handleCreateBudget = async () => {
    if (!outletId || !budgetData.category || !budgetData.budget_amount) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const budget = {
      outlet_id: outletId,
      ...budgetData
    };

    const result = await createExpenseBudget(budget);
    if (result) {
      toast({ title: "Success", description: "Budget created successfully" });
      setIsBudgetDialogOpen(false);
      setBudgetData(budgetForm);
      loadData();
    } else {
      toast({ title: "Error", description: "Failed to create budget", variant: "destructive" });
    }
  };

  const handleUpdateBudget = async () => {
    if (!editingBudget?.id) return;

    const result = await updateExpenseBudget(editingBudget.id, budgetData);
    if (result) {
      toast({ title: "Success", description: "Budget updated successfully" });
      setIsBudgetDialogOpen(false);
      setEditingBudget(null);
      setBudgetData(budgetForm);
      loadData();
    } else {
      toast({ title: "Error", description: "Failed to update budget", variant: "destructive" });
    }
  };

  const handleDeleteBudget = async (id: string) => {
    if (!confirm("Are you sure you want to delete this budget?")) return;

    const result = await deleteExpenseBudget(id);
    if (result) {
      toast({ title: "Success", description: "Budget deleted successfully" });
      loadData();
    } else {
      toast({ title: "Error", description: "Failed to delete budget", variant: "destructive" });
    }
  };

  // Handle adding new category
  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      toast({ title: "Validation Error", description: "Please enter a category name", variant: "destructive" });
      return;
    }
    
    const trimmedName = newCategoryName.trim();
    if (expenseCategories.includes(trimmedName)) {
      toast({ title: "Duplicate", description: "Category already exists", variant: "destructive" });
      return;
    }
    
    setCustomCategories([...customCategories, trimmedName]);
    setCustomSubCategories({ ...customSubCategories, [trimmedName]: [] });
    setNewCategoryName("");
    setIsAddCategoryDialogOpen(false);
    
    // Auto-select the new category
    setExpenseData(prev => ({ ...prev, category: trimmedName }));
    
    toast({ title: "Success", description: `Category "${trimmedName}" added` });
  };

  // Handle adding new sub-category
  const handleAddSubCategory = () => {
    if (!newSubCategoryName.trim()) {
      toast({ title: "Validation Error", description: "Please enter a sub-category name", variant: "destructive" });
      return;
    }
    
    if (!expenseData.category) {
      toast({ title: "Validation Error", description: "Please select a category first", variant: "destructive" });
      return;
    }
    
    const trimmedName = newSubCategoryName.trim();
    const existingSubs = [
      ...(predefinedSubCategories[expenseData.category] || []),
      ...(customSubCategories[expenseData.category] || [])
    ];
    
    if (existingSubs.includes(trimmedName)) {
      toast({ title: "Duplicate", description: "Sub-category already exists", variant: "destructive" });
      return;
    }
    
    const currentCustom = customSubCategories[expenseData.category] || [];
    setCustomSubCategories({
      ...customSubCategories,
      [expenseData.category]: [...currentCustom, trimmedName]
    });
    setNewSubCategoryName("");
    setIsAddSubCategoryDialogOpen(false);
    
    // Auto-select the new sub-category
    setExpenseData(prev => ({ ...prev, sub_category: trimmedName }));
    
    toast({ title: "Success", description: `Sub-category "${trimmedName}" added` });
  };

  // Get sub-categories for selected category
  const getSubCategories = (category: string): string[] => {
    const predefined = predefinedSubCategories[category] || [];
    const custom = customSubCategories[category] || [];
    return [...predefined, ...custom];
  };

  // Auto-determine expense type based on category and sub-category
  const getAutoExpenseType = (category: string, subCategory: string = ''): 'operating' | 'capital' | 'personal' => {
    // Capital expense indicators (long-term assets)
    const capitalKeywords = ['purchase', 'equipment', 'hardware', 'vehicle', 'building', 'property', 'machinery'];
    
    // Check sub-category first (more specific)
    if (subCategory) {
      const subLower = subCategory.toLowerCase();
      if (capitalKeywords.some(keyword => subLower.includes(keyword))) {
        return 'capital';
      }
      
      // Specific sub-category mappings
      if (category === 'Technology & Software' && subCategory === 'Hardware') return 'capital';
      if (category === 'Transportation' && (subCategory.includes('Vehicle') || subCategory.includes('Purchase'))) return 'capital';
      if (category === 'Raw Materials' && subCategory.includes('Equipment')) return 'capital';
    }
    
    // Category-based defaults
    const capitalCategories = ['Raw Materials', 'Inventory'];
    if (capitalCategories.includes(category)) {
      // These could be either, default to operating but check for capital keywords
      return 'operating';
    }
    
    // Withdrawal category is always personal (not tax-deductible)
    if (category === 'Withdrawal') {
      return 'personal';
    }
    
    // Most categories are operating expenses by default
    return 'operating';
  };

  // Auto-determine cost classification (direct vs indirect)
  const getAutoCostClassification = (category: string, subCategory: string = ''): 'direct' | 'indirect' => {
    // Direct cost categories (tied to production/revenue generation)
    const directCategories = ['Raw Materials', 'Inventory'];
    
    // Direct cost keywords in sub-category
    const directKeywords = ['material', 'product', 'delivery', 'shipping', 'commission', 'packaging', 'manufacturing'];
    
    // Check sub-category first (more specific)
    if (subCategory) {
      const subLower = subCategory.toLowerCase();
      if (directKeywords.some(keyword => subLower.includes(keyword))) {
        return 'direct';
      }
      
      // Specific mappings
      if (category === 'Salaries & Wages' && (subCategory.includes('Production') || subCategory.includes('Direct'))) return 'direct';
      if (category === 'Transportation' && (subCategory.includes('Delivery') || subCategory.includes('Shipping'))) return 'direct';
    }
    
    // Category-based defaults
    if (directCategories.includes(category)) {
      return 'direct';
    }
    
    // Withdrawal is indirect (not tied to production)
    if (category === 'Withdrawal') {
      return 'indirect';
    }
    
    // Most categories are indirect (overhead) by default
    return 'indirect';
  };

  const formatTZS = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredExpenses = expenses.filter(exp => {
    const matchesSearch = !searchTerm || 
      exp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exp.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exp.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = filterCategory === 'all' || exp.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || exp.approval_status === filterStatus;
    const matchesPayment = filterPaymentMethod === 'all' || exp.payment_method === filterPaymentMethod;
    
    const expDate = new Date(exp.expense_date);
    const matchesDateFrom = !dateFrom || expDate >= new Date(dateFrom);
    const matchesDateTo = !dateTo || expDate <= new Date(dateTo + 'T23:59:59');

    return matchesSearch && matchesCategory && matchesStatus && matchesPayment && matchesDateFrom && matchesDateTo;
  });

  const exportToPDF = () => {
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
      Date: new Date(exp.expense_date).toLocaleDateString(),
      Category: exp.category,
      Description: exp.description,
      Amount: exp.amount,
      Payment: exp.payment_method,
      Vendor: exp.vendor_name || '-',
      Status: exp.approval_status || 'pending'
    }));
    
    // Add summary rows
    data.push({
      Date: '',
      Category: '',
      Description: '',
      Amount: 0,
      Payment: '',
      Vendor: '',
      Status: ''
    });
    data.push({
      Date: '',
      Category: 'SUMMARY',
      Description: `Total Expenses: ${filteredExpenses.length}`,
      Amount: totalAmount,
      Payment: '',
      Vendor: `Generated: ${new Date().toLocaleString()}`,
      Status: ''
    });
    
    ExportUtils.exportToPDF(data, `expenses_${outletName || 'outlet'}_${new Date().toISOString().split('T')[0]}`, 'Expense Report');
  };

  const exportToXLS = () => {
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
      Date: new Date(exp.expense_date).toLocaleDateString(),
      Category: exp.category,
      'Sub-Category': exp.sub_category || '-',
      Description: exp.description,
      Amount: exp.amount,
      'Payment Method': exp.payment_method,
      Vendor: exp.vendor_name || '-',
      'Tax Deductible': exp.tax_deductible ? 'Yes' : 'No',
      Status: exp.approval_status || 'pending',
      Notes: exp.notes || '-'
    }));
    
    // Add summary rows
    data.push({
      Date: '',
      Category: '',
      'Sub-Category': '',
      Description: '',
      Amount: 0,
      'Payment Method': '',
      Vendor: '',
      'Tax Deductible': '',
      Status: '',
      Notes: ''
    });
    data.push({
      Date: '',
      Category: 'SUMMARY',
      'Sub-Category': '',
      Description: `Total Expenses: ${filteredExpenses.length}`,
      Amount: totalAmount,
      'Payment Method': '',
      Vendor: `Generated: ${new Date().toLocaleString()}`,
      'Tax Deductible': '',
      Status: '',
      Notes: ''
    });
    
    const filename = `expenses_${outletName || 'outlet'}_${new Date().toISOString().split('T')[0]}`;
    ExcelUtils.exportToExcel(data, filename);
    
    toast({
      title: "Export Successful",
      description: `CSV file downloaded: ${filename}.csv`
    });
  };

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
          <title>Expense Report - ${outletName || 'Outlet'}</title>
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
            <h1>Expense Report - ${outletName || 'Outlet'}</h1>
            <p>Generated: ${new Date().toLocaleString()}</p>
          </div>
          
          <div class="summary">
            <div class="summary-item">
              <span class="summary-label">Total Expenses: </span>
              <span class="summary-value">${filteredExpenses.length}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Total Amount: </span>
              <span class="summary-value">${totalAmount.toFixed(2)}</span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th>Payment</th>
                <th>Vendor</th>
                <th class="amount">Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredExpenses.map(exp => `
                <tr>
                  <td>${new Date(exp.expense_date).toLocaleDateString()}</td>
                  <td>${exp.category}</td>
                  <td>${exp.description}</td>
                  <td>${exp.payment_method}</td>
                  <td>${exp.vendor_name || '-'}</td>
                  <td class="amount">${exp.amount.toFixed(2)}</td>
                  <td>${exp.approval_status || 'pending'}</td>
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
    doc.text(`Expense Report - ${outletName || 'Outlet'}`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
    
    const totalAmount = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    doc.text(`Total Expenses: ${filteredExpenses.length}`, 14, 36);
    doc.text(`Total Amount: ${totalAmount.toFixed(2)}`, 14, 42);
    
    const tableData = filteredExpenses.map(exp => [
      new Date(exp.expense_date).toLocaleDateString(),
      exp.category,
      exp.description,
      exp.amount.toFixed(2),
      exp.payment_method,
      exp.vendor_name || '-',
      exp.approval_status || 'pending'
    ]);
    
    autoTable(doc, {
      startY: 50,
      head: [['Date', 'Category', 'Description', 'Amount', 'Payment', 'Vendor', 'Status']],
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Expense Management</h1>
            <p className="text-muted-foreground">{outletName}</p>
          </div>
        </div>
        <div className="flex gap-2">
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
              <DropdownMenuItem onClick={exportToPDF}>
                <Download className="h-4 w-4 mr-2" />
                <span>Download .pdf</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToXLS}>
                <FileText className="h-4 w-4 mr-2" />
                <span>Export .csv</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSharePDF}>
                <Share2 className="h-4 w-4 mr-2" />
                <span>Share</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => {
            setEditingExpense(null);
            setExpenseData(expenseForm);
            setIsExpenseDialogOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="budgets">Budgets</TabsTrigger>
          <TabsTrigger value="approvals">
            Approvals
            {pendingApprovals.length > 0 && (
              <Badge variant="destructive" className="ml-2">{pendingApprovals.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="recurring">
            Recurring
            {(overdueRecurring.length > 0 || (recurringSummary?.upcoming_7_days || 0) > 0) && (
              <Badge variant={overdueRecurring.length > 0 ? "destructive" : "default"} className="ml-2">
                {overdueRecurring.length > 0 ? overdueRecurring.length : recurringSummary?.upcoming_7_days}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatTZS(analytics?.total_expenses || 0)}</div>
                <p className="text-xs text-muted-foreground">
                  {analytics?.month_over_month_change && analytics.month_over_month_change > 0 ? (
                    <span className="text-red-600 flex items-center">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      +{analytics.month_over_month_change.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-green-600 flex items-center">
                      <TrendingDown className="h-3 w-3 mr-1" />
                      {analytics?.month_over_month_change?.toFixed(1) || 0}%
                    </span>
                  )}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Daily Average</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatTZS(analytics?.daily_average || 0)}</div>
                <p className="text-xs text-muted-foreground">Per day this month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Budget Utilization</CardTitle>
                <PieChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.budget_utilization?.toFixed(1) || 0}%</div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className={`h-2 rounded-full ${(analytics?.budget_utilization || 0) > 90 ? 'bg-red-600' : (analytics?.budget_utilization || 0) > 70 ? 'bg-yellow-600' : 'bg-green-600'}`}
                    style={{ width: `${Math.min(analytics?.budget_utilization || 0, 100)}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingApprovals.length}</div>
                <p className="text-xs text-muted-foreground">Requires attention</p>
              </CardContent>
            </Card>
          </div>

          {/* Budget Alerts */}
          {budgetAlerts.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-5 w-5" />
                  Budget Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {budgetAlerts.map((alert, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-white rounded">
                      <span className="font-medium">{alert.category}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm">
                          {formatTZS(alert.spent_amount)} / {formatTZS(alert.budget_amount)}
                        </span>
                        <Badge variant={alert.usage_percentage > 100 ? "destructive" : "default"}>
                          {alert.usage_percentage.toFixed(1)}%
                        </Badge>
                        <span className="text-sm text-red-600 font-medium">{alert.alert_message}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top Categories */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Expenses by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(analytics?.by_category || {})
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 8)
                    .map(([category, amount]) => (
                      <div key={category} className="flex items-center justify-between">
                        <span className="text-sm">{category}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${(amount / (analytics?.total_expenses || 1)) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-24 text-right">
                            {formatTZS(amount)}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Vendors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics?.top_vendors?.slice(0, 8).map((vendor, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">#{idx + 1}</span>
                        <span className="text-sm">{vendor.vendor_name}</span>
                      </div>
                      <span className="text-sm font-medium">{formatTZS(vendor.total)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search expenses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {expenseCategories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterPaymentMethod} onValueChange={setFilterPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Payment Method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    {paymentMethods.map(method => (
                      <SelectItem key={method} value={method}>{method.replace('_', ' ').toUpperCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expenses Table */}
          <Card>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{new Date(expense.expense_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{expense.category}</div>
                          {expense.sub_category && (
                            <div className="text-xs text-muted-foreground">{expense.sub_category}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{expense.description}</TableCell>
                      <TableCell>{expense.vendor_name || '-'}</TableCell>
                      <TableCell className="text-right font-medium">{formatTZS(expense.amount)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {expense.payment_method?.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(expense.approval_status || 'pending')}>
                          {expense.approval_status?.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleViewExpense(expense)}
                            title="View Expense Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setEditingExpense(expense);
                              setExpenseData({
                                category: expense.category || "",
                                sub_category: expense.sub_category || "",
                                description: expense.description || "",
                                amount: expense.amount || 0,
                                payment_method: expense.payment_method || "cash",
                                expense_date: expense.expense_date?.split('T')[0] || new Date().toISOString().split('T')[0],
                                vendor_name: expense.vendor_name || "",
                                vendor_contact: expense.vendor_contact || "",
                                tax_deductible: expense.tax_deductible || false,
                                expense_type: expense.expense_type || "operating",
                                cost_classification: expense.cost_classification || "indirect",
                                is_recurring: expense.is_recurring || false,
                                recurring_frequency: expense.recurring_frequency || "monthly",
                                next_due_date: expense.next_due_date?.split('T')[0] || "",
                                recurring_end_date: expense.recurring_end_date?.split('T')[0] || "",
                                department: expense.department || "",
                                notes: expense.notes || "",
                                receipt_url: expense.receipt_url || "",
                                tags: expense.tags || []
                              });
                              // Set uploaded file name if receipt exists
                              if (expense.receipt_url) {
                                const urlParts = expense.receipt_url.split('/');
                                const fileName = urlParts[urlParts.length - 1];
                                setUploadedFileName(fileName ? decodeURIComponent(fileName).replace(/^[0-9]+_/, '') : 'Receipt uploaded');
                              } else {
                                setUploadedFileName("");
                              }
                              setIsExpenseDialogOpen(true);
                            }}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePrintExpense(expense)}>
                              <Printer className="h-4 w-4 mr-2" />
                              Print
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExportExpenseCSV(expense)}>
                              <FileText className="h-4 w-4 mr-2" />
                              Export CSV
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownloadExpensePDF(expense)}>
                              <Download className="h-4 w-4 mr-2" />
                              Download PDF
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredExpenses.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No expenses found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Budgets Tab */}
        <TabsContent value="budgets" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => {
              setEditingBudget(null);
              setBudgetData(budgetForm);
              setIsBudgetDialogOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Budget
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {budgets.map((budget) => {
              const utilization = budget.budget_amount > 0 ? ((budget.spent_amount || 0) / budget.budget_amount) * 100 : 0;
              return (
                <Card key={budget.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{budget.category}</CardTitle>
                    {budget.sub_category && (
                      <p className="text-sm text-muted-foreground">{budget.sub_category}</p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Spent</span>
                        <span className="font-medium">{formatTZS(budget.spent_amount || 0)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Budget</span>
                        <span className="font-medium">{formatTZS(budget.budget_amount)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className={`h-3 rounded-full ${utilization > 90 ? 'bg-red-600' : utilization > 70 ? 'bg-yellow-600' : 'bg-green-600'}`}
                          style={{ width: `${Math.min(utilization, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Utilization</span>
                        <span className={`font-bold ${utilization > 90 ? 'text-red-600' : utilization > 70 ? 'text-yellow-600' : 'text-green-600'}`}>
                          {utilization.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setEditingBudget(budget);
                          setBudgetData({
                            category: budget.category,
                            sub_category: budget.sub_category || "",
                            budget_amount: budget.budget_amount,
                            period: budget.period as any,
                            start_date: budget.start_date,
                            end_date: budget.end_date,
                            alert_threshold: budget.alert_threshold || 80
                          });
                          setIsBudgetDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600"
                        onClick={() => handleDeleteBudget(budget.id!)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {budgets.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <PieChart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No budgets created yet</p>
                <Button className="mt-4" onClick={() => setIsBudgetDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Budget
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Approvals Tab */}
        <TabsContent value="approvals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Approvals</CardTitle>
              <p className="text-sm text-muted-foreground">
                {pendingApprovals.length} expense(s) awaiting your approval
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingApprovals.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{new Date(expense.expense_date).toLocaleDateString()}</TableCell>
                      <TableCell>{expense.category}</TableCell>
                      <TableCell className="max-w-xs truncate">{expense.description}</TableCell>
                      <TableCell>{expense.vendor_name || '-'}</TableCell>
                      <TableCell className="text-right font-medium">{formatTZS(expense.amount)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleApproveExpense(expense.id!, 'approved')}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600"
                            onClick={() => handleApproveExpense(expense.id!, 'rejected')}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {pendingApprovals.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
                  <p>All expenses have been reviewed</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recurring Expenses Tab */}
        <TabsContent value="recurring" className="space-y-6">
          {/* Recurring Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Recurring</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{recurringSummary?.total_recurring || 0}</div>
                <p className="text-xs text-muted-foreground">Active recurring expenses</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Due in 7 Days</CardTitle>
                <Clock className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{recurringSummary?.upcoming_7_days || 0}</div>
                <p className="text-xs text-muted-foreground">Upcoming this week</p>
              </CardContent>
            </Card>

            <Card className={overdueRecurring.length > 0 ? "border-red-200 bg-red-50" : ""}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                <AlertCircle className={"h-4 w-4 " + (overdueRecurring.length > 0 ? "text-red-500" : "text-muted-foreground")} />
              </CardHeader>
              <CardContent>
                <div className={"text-2xl font-bold " + (overdueRecurring.length > 0 ? "text-red-600" : "")}>
                  {recurringSummary?.overdue || 0}
                </div>
                <p className="text-xs text-muted-foreground">Past due date</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Total</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatTZS(recurringSummary?.monthly_total || 0)}</div>
                <p className="text-xs text-muted-foreground">Normalized monthly cost</p>
              </CardContent>
            </Card>
          </div>

          {/* Overdue Alerts */}
          {overdueRecurring.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-5 w-5" />
                  Overdue Recurring Expenses
                </CardTitle>
                <CardDescription className="text-red-600">
                  {overdueRecurring.length} expense(s) need immediate attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {overdueRecurring.slice(0, 5).map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200">
                      <div className="flex-1">
                        <div className="font-medium">{expense.category}{expense.sub_category && <span className="text-muted-foreground"> - {expense.sub_category}</span>}</div>
                        <div className="text-sm text-muted-foreground">{expense.description}</div>
                        <div className="text-xs text-red-600 mt-1">
                          Due: {expense.next_due_date ? new Date(expense.next_due_date).toLocaleDateString() : 'N/A'}
                          {expense.occurrence_count && expense.occurrence_count > 0 && ` • Occurrence #${expense.occurrence_count + 1}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="font-bold">{formatTZS(expense.amount)}</div>
                          <Badge variant="outline" className="text-xs mt-1">
                            {expense.recurring_frequency}
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleCreateNextRecurring(expense)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Create Now
                        </Button>
                      </div>
                    </div>
                  ))}
                  {overdueRecurring.length > 5 && (
                    <p className="text-sm text-muted-foreground text-center">
                      And {overdueRecurring.length - 5} more overdue expenses...
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upcoming Recurring Expenses */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Recurring Expenses
              </CardTitle>
              <CardDescription>
                Recurring expenses due in the next 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingRecurring.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-lg font-medium">No upcoming recurring expenses</p>
                  <p className="text-sm">Create a recurring expense to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingRecurring.map((expense) => {
                    const dueDate = expense.next_due_date ? new Date(expense.next_due_date) : null;
                    const daysUntilDue = dueDate ? Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;
                    
                    return (
                      <div key={expense.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border hover:bg-muted/50 transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="font-medium">{expense.category}</div>
                            {expense.sub_category && (
                              <Badge variant="outline" className="text-xs">{expense.sub_category}</Badge>
                            )}
                            {daysUntilDue !== null && daysUntilDue <= 3 && (
                              <Badge variant="destructive" className="text-xs">Due Soon</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">{expense.description}</div>
                          {expense.vendor_name && (
                            <div className="text-xs text-muted-foreground mt-1">Vendor: {expense.vendor_name}</div>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Due: {dueDate?.toLocaleDateString()}
                            </span>
                            {daysUntilDue !== null && (
                              <span className={daysUntilDue <= 3 ? "text-red-600 font-medium" : ""}>
                                {daysUntilDue === 0 ? 'Today' : daysUntilDue === 1 ? 'Tomorrow' : `In ${daysUntilDue} days`}
                              </span>
                            )}
                            <span>•</span>
                            <span>{expense.recurring_frequency}</span>
                            {expense.occurrence_count && expense.occurrence_count > 0 && (
                              <>
                                <span>•</span>
                                <span>Occurrence #{expense.occurrence_count + 1}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="font-bold text-lg">{formatTZS(expense.amount)}</div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCreateNextRecurring(expense)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Create Expense
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Expense Dialog */}
      <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{editingExpense ? 'Edit Expense' : 'Create Expense'}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-1">
            <div className="grid grid-cols-2 gap-4 py-4">
            <div>
              <label className="text-sm font-medium">Category *</label>
              <Select value={expenseData.category} onValueChange={(v) => {
                if (v === '__add_new__') {
                  setIsAddCategoryDialogOpen(true);
                } else {
                  // Auto-set expense type and cost classification based on category
                  const autoType = getAutoExpenseType(v, '');
                  const autoCostClass = getAutoCostClassification(v, '');
                  const taxDeductible = autoType === 'personal' ? false : true;
                  setExpenseData(prev => ({ 
                    ...prev, 
                    category: v, 
                    sub_category: '',
                    expense_type: autoType,
                    cost_classification: autoCostClass,
                    tax_deductible: taxDeductible
                  }));
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                  <SelectItem value="__add_new__" className="text-blue-600 font-medium">
                    + Add New Category
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Sub-Category</label>
              <Select value={expenseData.sub_category} onValueChange={(v) => {
                if (v === '__add_new__') {
                  setIsAddSubCategoryDialogOpen(true);
                } else {
                  // Re-evaluate expense type and cost classification based on category + sub-category
                  const autoType = getAutoExpenseType(expenseData.category, v);
                  const autoCostClass = getAutoCostClassification(expenseData.category, v);
                  const taxDeductible = autoType === 'personal' ? false : true;
                  setExpenseData(prev => ({ 
                    ...prev, 
                    sub_category: v,
                    expense_type: autoType,
                    cost_classification: autoCostClass,
                    tax_deductible: taxDeductible
                  }));
                }
              }} disabled={!expenseData.category}>
                <SelectTrigger>
                  <SelectValue placeholder={expenseData.category ? "Select sub-category" : "Select category first"} />
                </SelectTrigger>
                <SelectContent>
                  {expenseData.category && getSubCategories(expenseData.category).map(sub => (
                    <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                  ))}
                  {expenseData.category && (
                    <SelectItem value="__add_new__" className="text-blue-600 font-medium">
                      + Add New Sub-Category
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">Description *</label>
              <Input
                value={expenseData.description}
                onChange={(e) => setExpenseData(prev => ({ ...prev, description: e.target.value }))}
                placeholder={
                  expenseData.category === 'Transportation' ? 'e.g., Fuel for delivery truck - Dar es Salaam route' :
                  expenseData.category === 'Utilities' ? 'e.g., Monthly electricity bill - March 2026' :
                  expenseData.category === 'Office Supplies' ? 'e.g., Reordered A4 paper and printer toner for office' :
                  expenseData.category === 'Maintenance & Repairs' ? 'e.g., Emergency AC repair for server room' :
                  expenseData.category === 'Marketing & Advertising' ? 'e.g., Facebook ad campaign for product launch' :
                  'e.g., Specific details about what this expense was for and why'
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                {expenseData.description.length > 0 
                  ? `${expenseData.description.length} characters - Be specific and include business purpose`
                  : 'Include what, why, and any reference numbers (invoices, receipts, etc.)'}
              </p>
            </div>
            
            {/* Document Upload Section */}
            <div className="col-span-2">
              <label className="text-sm font-medium">Receipt/Invoice (PDF)</label>
              {!expenseData.receipt_url ? (
                <div className="mt-2">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-muted-foreground/30 rounded-lg cursor-pointer bg-muted/20 hover:bg-muted/40 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      {uploadingFile ? (
                        <>
                          <Loader2 className="h-8 w-8 text-muted-foreground animate-spin mb-2" />
                          <p className="text-sm text-muted-foreground">Uploading...</p>
                          <div className="w-48 bg-muted rounded-full h-2 mt-2">
                            <div 
                              className="bg-primary h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{uploadProgress}%</p>
                        </>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">PDF only (MAX. 10MB)</p>
                        </>
                      )}
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,application/pdf"
                      onChange={handleFileUpload}
                      disabled={uploadingFile}
                    />
                  </label>
                </div>
              ) : (
                <div className="mt-2 p-4 border rounded-lg bg-green-50 border-green-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <File className="h-8 w-8 text-green-600" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-green-900 truncate">
                          {uploadedFileName || 'Receipt uploaded'}
                        </p>
                        <p className="text-xs text-green-700">PDF Document</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleViewFile}
                        className="border-green-300 hover:bg-green-100"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleRemoveFile}
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Upload supporting documents for approval (receipts, invoices, etc.)
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Amount *</label>
              <Input
                type="number"
                value={expenseData.amount}
                onChange={(e) => setExpenseData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Payment Method</label>
              <Select value={expenseData.payment_method} onValueChange={(v) => setExpenseData(prev => ({ ...prev, payment_method: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map(method => (
                    <SelectItem key={method} value={method}>{method.replace('_', ' ').toUpperCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Expense Date</label>
              <Input
                type="date"
                value={expenseData.expense_date}
                onChange={(e) => setExpenseData(prev => ({ ...prev, expense_date: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Vendor Name</label>
              <Input
                value={expenseData.vendor_name}
                onChange={(e) => setExpenseData(prev => ({ ...prev, vendor_name: e.target.value }))}
                placeholder="Vendor/Payee"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Vendor Contact</label>
              <Input
                value={expenseData.vendor_contact}
                onChange={(e) => setExpenseData(prev => ({ ...prev, vendor_contact: e.target.value }))}
                placeholder="Phone/Email"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="text-sm font-medium">Expense Type</label>
                <span className="text-xs text-blue-600 font-medium">
                  (Auto-detected from Category)
                </span>
                <div className="group relative">
                  <div className="h-4 w-4 rounded-full bg-muted text-muted-foreground text-xs flex items-center justify-center cursor-help">
                    ?
                  </div>
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-72 p-3 bg-popover text-popover-foreground rounded-lg shadow-lg border z-50">
                    <p className="text-xs font-semibold mb-1">Operating</p>
                    <p className="text-xs text-muted-foreground mb-2">Day-to-day business costs (rent, utilities, supplies). 100% tax-deductible.</p>
                    <p className="text-xs font-semibold mb-1">Capital</p>
                    <p className="text-xs text-muted-foreground mb-2">Long-term assets (equipment, vehicles). Depreciated over time.</p>
                    <p className="text-xs font-semibold mb-1">Personal</p>
                    <p className="text-xs text-muted-foreground">Non-business expenses. Not tax-deductible.</p>
                  </div>
                </div>
              </div>
              <Select value={expenseData.expense_type} onValueChange={(v) => {
                // Auto-set tax deductible based on expense type
                const taxDeductible = v === 'personal' ? false : true;
                setExpenseData(prev => ({ 
                  ...prev, 
                  expense_type: v,
                  tax_deductible: taxDeductible
                }));
                
                // Also update auto-indicator text
                if (v === 'personal') {
                  setExpenseData(prev => ({ ...prev, cost_classification: 'indirect' }));
                }
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operating">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">Operating</span>
                      <span className="text-xs text-muted-foreground">Day-to-day costs (rent, utilities, supplies)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="capital">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">Capital</span>
                      <span className="text-xs text-muted-foreground">Long-term assets (equipment, vehicles)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="personal">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">Personal</span>
                      <span className="text-xs text-muted-foreground">Non-business expenses (not deductible)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {expenseData.expense_type === 'operating' && '✓ Fully tax-deductible in current year'}
                {expenseData.expense_type === 'capital' && '⏱ Depreciated over asset useful life'}
                {expenseData.expense_type === 'personal' && '⚠ Not tax-deductible'}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="text-sm font-medium">Cost Classification</label>
                <span className="text-xs text-blue-600 font-medium">
                  (Auto-detected from Category)
                </span>
                <div className="group relative">
                  <div className="h-4 w-4 rounded-full bg-muted text-muted-foreground text-xs flex items-center justify-center cursor-help">
                    ?
                  </div>
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-72 p-3 bg-popover text-popover-foreground rounded-lg shadow-lg border z-50">
                    <p className="text-xs font-semibold mb-1">Direct Costs</p>
                    <p className="text-xs text-muted-foreground mb-2">Tied to production/revenue (materials, direct labor, delivery). Used to calculate gross profit.</p>
                    <p className="text-xs font-semibold mb-1">Indirect Costs</p>
                    <p className="text-xs text-muted-foreground">Business overhead (rent, utilities, admin). Deducted from gross profit to get net profit.</p>
                  </div>
                </div>
              </div>
              <Select value={expenseData.cost_classification} onValueChange={(v) => setExpenseData(prev => ({ ...prev, cost_classification: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">Direct</span>
                      <span className="text-xs text-muted-foreground">Production/revenue-related costs</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="indirect">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">Indirect</span>
                      <span className="text-xs text-muted-foreground">Business overhead/operational costs</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {expenseData.cost_classification === 'direct' 
                  ? '📊 Subtracted from revenue to calculate Gross Profit'
                  : '📈 Subtracted from Gross Profit to calculate Net Profit'}
              </p>
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">Notes</label>
              <Input
                value={expenseData.notes}
                onChange={(e) => setExpenseData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes..."
              />
            </div>
            <div className="col-span-2">
              <div className={`flex items-start gap-2 p-3 rounded-lg border transition-colors ${
                expenseData.tax_deductible ? 'bg-green-50 border-green-200' : 'bg-muted/50 border'
              }`}>
                <input
                  type="checkbox"
                  id="taxDeductible"
                  checked={expenseData.tax_deductible}
                  onChange={(e) => setExpenseData(prev => ({ ...prev, tax_deductible: e.target.checked }))}
                  className="h-4 w-4 mt-0.5"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <label htmlFor="taxDeductible" className="text-sm font-medium cursor-pointer">Tax Deductible</label>
                    <span className="text-xs text-blue-600 font-medium">
                      (Auto-set based on Category, Type & Classification)
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {expenseData.tax_deductible 
                      ? '✓ This expense will be included in tax-deductible totals'
                      : expenseData.expense_type === 'personal'
                        ? '⚠ Personal expenses are not tax-deductible'
                        : 'Check if this expense can be deducted from taxable income'}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Recurring Expense Section */}
            <div className="col-span-2 mt-4 pt-4 border-t">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4" />
                <label className="text-sm font-semibold">Recurring Expense Settings</label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isRecurring"
                    checked={expenseData.is_recurring || false}
                    onChange={(e) => setExpenseData(prev => ({ 
                      ...prev, 
                      is_recurring: e.target.checked,
                      next_due_date: e.target.checked ? prev.expense_date : undefined
                    }))}
                    className="h-4 w-4"
                  />
                  <label htmlFor="isRecurring" className="text-sm font-medium cursor-pointer">
                    This is a recurring expense
                  </label>
                </div>
                
                {expenseData.is_recurring && (
                  <>
                    <div>
                      <label className="text-sm font-medium">Frequency *</label>
                      <Select 
                        value={expenseData.recurring_frequency || 'monthly'} 
                        onValueChange={(v) => setExpenseData(prev => ({ ...prev, recurring_frequency: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="bi-weekly">Bi-Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="semi-annually">Semi-Annually</SelectItem>
                          <SelectItem value="annually">Annually</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Next Due Date</label>
                      <Input
                        type="date"
                        value={expenseData.next_due_date?.split('T')[0] || expenseData.expense_date}
                        onChange={(e) => setExpenseData(prev => ({ ...prev, next_due_date: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        When the next occurrence should be created
                      </p>
                    </div>
                    
                    <div className="col-span-2">
                      <label className="text-sm font-medium">End Date (Optional)</label>
                      <Input
                        type="date"
                        value={expenseData.recurring_end_date?.split('T')[0] || ''}
                        onChange={(e) => setExpenseData(prev => ({ ...prev, recurring_end_date: e.target.value || undefined }))}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Leave empty for indefinite recurring, or set an end date
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          </div>
          <DialogFooter className="flex-shrink-0">
            <Button variant="outline" onClick={() => setIsExpenseDialogOpen(false)}>Cancel</Button>
            <Button onClick={editingExpense ? handleUpdateExpense : handleCreateExpense}>
              {editingExpense ? 'Update' : 'Create'} Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Budget Dialog */}
      <Dialog open={isBudgetDialogOpen} onOpenChange={setIsBudgetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBudget ? 'Edit Budget' : 'Create Budget'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <label className="text-sm font-medium">Category *</label>
              <Select value={budgetData.category} onValueChange={(v) => {
                if (v === '__add_new__') {
                  setIsAddCategoryDialogOpen(true);
                } else {
                  setBudgetData(prev => ({ ...prev, category: v, sub_category: '' }));
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                  <SelectItem value="__add_new__" className="text-blue-600 font-medium">
                    + Add New Category
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Sub-Category</label>
              <Select value={budgetData.sub_category} onValueChange={(v) => {
                if (v === '__add_new__') {
                  setIsAddSubCategoryDialogOpen(true);
                } else {
                  setBudgetData(prev => ({ ...prev, sub_category: v }));
                }
              }} disabled={!budgetData.category}>
                <SelectTrigger>
                  <SelectValue placeholder={budgetData.category ? "Select sub-category" : "Select category first"} />
                </SelectTrigger>
                <SelectContent>
                  {budgetData.category && getSubCategories(budgetData.category).map(sub => (
                    <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                  ))}
                  {budgetData.category && (
                    <SelectItem value="__add_new__" className="text-blue-600 font-medium">
                      + Add New Sub-Category
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Budget Amount *</label>
              <Input
                type="number"
                value={budgetData.budget_amount}
                onChange={(e) => setBudgetData(prev => ({ ...prev, budget_amount: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Period</label>
              <Select value={budgetData.period} onValueChange={(v) => setBudgetData(prev => ({ ...prev, period: v as any }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={budgetData.start_date}
                  onChange={(e) => setBudgetData(prev => ({ ...prev, start_date: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="date"
                  value={budgetData.end_date}
                  onChange={(e) => setBudgetData(prev => ({ ...prev, end_date: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Alert Threshold (%)</label>
              <Input
                type="number"
                value={budgetData.alert_threshold}
                onChange={(e) => setBudgetData(prev => ({ ...prev, alert_threshold: parseInt(e.target.value) || 80 }))}
                min={50}
                max={100}
              />
              <p className="text-xs text-muted-foreground mt-1">Alert when spending reaches this percentage</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBudgetDialogOpen(false)}>Cancel</Button>
            <Button onClick={editingBudget ? handleUpdateBudget : handleCreateBudget}>
              {editingBudget ? 'Update' : 'Create'} Budget
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add New Category Dialog */}
      <Dialog open={isAddCategoryDialogOpen} onOpenChange={setIsAddCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">Category Name *</label>
            <Input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="e.g., Vehicle Expenses, Training"
              onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-2">
              Enter a descriptive name for the new expense category
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddCategoryDialogOpen(false);
              setNewCategoryName("");
            }}>Cancel</Button>
            <Button onClick={handleAddCategory}>Add Category</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add New Sub-Category Dialog */}
      <Dialog open={isAddSubCategoryDialogOpen} onOpenChange={setIsAddSubCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Sub-Category</DialogTitle>
            <p className="text-sm text-muted-foreground">
              For category: <span className="font-medium text-foreground">{expenseData.category}</span>
            </p>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">Sub-Category Name *</label>
            <Input
              value={newSubCategoryName}
              onChange={(e) => setNewSubCategoryName(e.target.value)}
              placeholder={`e.g., Specific expense type under ${expenseData.category}`}
              onKeyPress={(e) => e.key === 'Enter' && handleAddSubCategory()}
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-2">
              Enter a specific sub-type for better expense tracking
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddSubCategoryDialogOpen(false);
              setNewSubCategoryName("");
            }}>Cancel</Button>
            <Button onClick={handleAddSubCategory}>Add Sub-Category</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Expense Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Expense Details
            </DialogTitle>
          </DialogHeader>
          {viewingExpense && (
            <div className="space-y-6 py-4">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground">Date</label>
                    <p className="font-medium">{new Date(viewingExpense.expense_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Amount</label>
                    <p className="font-medium text-lg">{formatTZS(viewingExpense.amount)}</p>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Category</label>
                  <div className="mt-1">
                    <Badge variant="secondary">{viewingExpense.category}</Badge>
                    {viewingExpense.sub_category && (
                      <Badge variant="outline" className="ml-2">{viewingExpense.sub_category}</Badge>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Description</label>
                  <p className="mt-1 text-sm">{viewingExpense.description || 'N/A'}</p>
                </div>
              </div>

              {/* Payment & Status */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Payment & Status</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground">Payment Method</label>
                    <p className="font-medium">{viewingExpense.payment_method?.replace('_', ' ') || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Status</label>
                    <div className="mt-1">
                      <Badge className={getStatusColor(viewingExpense.approval_status || 'pending')}>
                        {viewingExpense.approval_status?.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Vendor Information */}
              {(viewingExpense.vendor_name || viewingExpense.vendor_contact) && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Vendor Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {viewingExpense.vendor_name && (
                      <div>
                        <label className="text-xs text-muted-foreground">Vendor Name</label>
                        <p className="font-medium">{viewingExpense.vendor_name}</p>
                      </div>
                    )}
                    {viewingExpense.vendor_contact && (
                      <div>
                        <label className="text-xs text-muted-foreground">Vendor Contact</label>
                        <p className="font-medium">{viewingExpense.vendor_contact}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Classification */}
              {(viewingExpense.expense_type || viewingExpense.cost_classification || viewingExpense.department) && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Classification</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {viewingExpense.expense_type && (
                      <div>
                        <label className="text-xs text-muted-foreground">Expense Type</label>
                        <p className="font-medium capitalize">{viewingExpense.expense_type}</p>
                      </div>
                    )}
                    {viewingExpense.cost_classification && (
                      <div>
                        <label className="text-xs text-muted-foreground">Cost Classification</label>
                        <p className="font-medium capitalize">{viewingExpense.cost_classification}</p>
                      </div>
                    )}
                    {viewingExpense.department && (
                      <div>
                        <label className="text-xs text-muted-foreground">Department</label>
                        <p className="font-medium">{viewingExpense.department}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Recurring Information */}
              {viewingExpense.is_recurring && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Recurring Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-muted-foreground">Frequency</label>
                      <p className="font-medium capitalize">{viewingExpense.recurring_frequency}</p>
                    </div>
                    {viewingExpense.next_due_date && (
                      <div>
                        <label className="text-xs text-muted-foreground">Next Due Date</label>
                        <p className="font-medium">{new Date(viewingExpense.next_due_date).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Additional Information */}
              {viewingExpense.notes && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Notes</h3>
                  <p className="text-sm bg-muted p-3 rounded-md">{viewingExpense.notes}</p>
                </div>
              )}

              {/* Tags */}
              {viewingExpense.tags && viewingExpense.tags.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {viewingExpense.tags.map((tag, index) => (
                      <Badge key={index} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Tax Information */}
              {viewingExpense.tax_deductible && (
                <div className="space-y-2">
                  <Badge variant="default" className="bg-green-600">
                    Tax Deductible
                  </Badge>
                </div>
              )}

              {/* Receipt */}
              {viewingExpense.receipt_url && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Receipt</h3>
                  <button 
                    onClick={() => handleViewReceipt(viewingExpense.receipt_url!)}
                    className="text-sm text-primary hover:underline flex items-center gap-2 cursor-pointer"
                  >
                    <FileText className="h-4 w-4" />
                    View Receipt
                  </button>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
