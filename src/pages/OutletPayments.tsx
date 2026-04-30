import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  CreditCard, 
  Search, 
  ArrowLeft, 
  Calendar,
  User,
  DollarSign,
  CheckCircle,
  Clock,
  Printer,
  Download,
  Share2,
  FileText,
  ChevronDown
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface OutletPaymentsProps {
  onBack: () => void;
  outletId?: string;
}

interface Payment {
  id: string;
  transactionId: string;
  date: string;
  customer: string;
  amount: number;
  method: 'cash' | 'card' | 'mobile' | 'debt';
  status: 'completed' | 'pending' | 'failed';
  description: string;
  type: 'outlet' | 'kilango' | 'other';
}

// Mock data for outlet payments
const generateMockPayments = (outletId: string): Payment[] => [
  {
    id: `pay-${outletId}-1`,
    transactionId: "TXN-2026-001",
    date: "2026-03-13",
    customer: "John Smith",
    amount: 125000,
    method: 'cash',
    status: 'completed',
    description: "Payment for invoice #INV-001",
    type: 'outlet'
  },
  {
    id: `pay-${outletId}-2`,
    transactionId: "TXN-2026-002",
    date: "2026-03-12",
    customer: "Sarah Johnson",
    amount: 89000,
    method: 'card',
    status: 'completed',
    description: "Payment for invoice #INV-002",
    type: 'kilango'
  },
  {
    id: `pay-${outletId}-3`,
    transactionId: "TXN-2026-003",
    date: "2026-03-11",
    customer: "Michael Brown",
    amount: 234000,
    method: 'mobile',
    status: 'pending',
    description: "Payment for invoice #INV-003",
    type: 'outlet'
  },
  {
    id: `pay-${outletId}-4`,
    transactionId: "TXN-2026-004",
    date: "2026-03-10",
    customer: "Emily Davis",
    amount: 56700,
    method: 'debt',
    status: 'pending',
    description: "Debt payment - partial",
    type: 'other'
  },
  {
    id: `pay-${outletId}-5`,
    transactionId: "TXN-2026-005",
    date: "2026-03-09",
    customer: "David Wilson",
    amount: 178000,
    method: 'cash',
    status: 'completed',
    description: "Payment for invoice #INV-005",
    type: 'kilango'
  },
  {
    id: `pay-${outletId}-6`,
    transactionId: "TXN-2026-006",
    date: "2026-03-08",
    customer: "Kilango Investment Ltd",
    amount: 450000,
    method: 'card',
    status: 'pending',
    description: "Monthly franchise fee",
    type: 'kilango'
  },
  {
    id: `pay-${outletId}-7`,
    transactionId: "TXN-2026-007",
    date: "2026-03-07",
    customer: "Supplier ABC",
    amount: 320000,
    method: 'mobile',
    status: 'completed',
    description: "Supplier payment",
    type: 'other'
  }
];

export const OutletPayments = ({ onBack, outletId }: OutletPaymentsProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: ''
  });
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'all' | 'outlet' | 'kilango' | 'other'>('all');
  const [showNewPaymentDialog, setShowNewPaymentDialog] = useState(false);
  const [dueFromDeliveries, setDueFromDeliveries] = useState(0);
  const [loadingDeliveries, setLoadingDeliveries] = useState(true);
  const [newPaymentForm, setNewPaymentForm] = useState({
    transactionId: `PAY-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0')}`,
    date: new Date().toISOString().split('T')[0],
    customer: '',
    amount: 0,
    method: 'cash' as 'cash' | 'card' | 'mobile' | 'debt',
    status: 'completed' as 'completed' | 'pending' | 'failed',
    description: '',
    type: 'outlet' as 'outlet' | 'kilango' | 'other'
  });
  const { toast } = useToast();

  useEffect(() => {
    loadPayments();
    loadDueFromDeliveries();
  }, [outletId]);

  const loadPayments = async () => {
    if (!outletId) {
      setPayments([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // TODO: Replace with actual API call to fetch payments
      const mockData = generateMockPayments(outletId);
      setPayments(mockData);
    } catch (error) {
      console.error("Error loading payments:", error);
      toast({
        title: "Error",
        description: "Failed to load payments. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDueFromDeliveries = async () => {
    if (!outletId) {
      setDueFromDeliveries(0);
      setLoadingDeliveries(false);
      return;
    }

    try {
      setLoadingDeliveries(true);
      // Fetch deliveries from other outlets (source_outlet_id is not null)
      const { data: deliveries, error } = await supabase
        .from('saved_delivery_notes')
        .select('total, status')
        .eq('outlet_id', outletId)
        .not('source_outlet_id', 'is', null);

      if (error) {
        console.error('Error loading deliveries:', error);
        setDueFromDeliveries(0);
      } else {
        // Calculate total amount from deliveries (all deliveries from other outlets are considered due)
        const totalDue = deliveries?.reduce((sum, delivery) => {
          return sum + (delivery.total || 0);
        }, 0) || 0;
        
        setDueFromDeliveries(totalDue);
        console.log('✅ Due from deliveries:', totalDue, 'from', deliveries?.length, 'deliveries');
      }
    } catch (error) {
      console.error('Error loading due from deliveries:', error);
      setDueFromDeliveries(0);
    } finally {
      setLoadingDeliveries(false);
    }
  };

  const handleCreatePayment = async () => {
    if (!newPaymentForm.customer || newPaymentForm.amount <= 0) {
      toast({
        title: "Error",
        description: "Please fill in customer and amount",
        variant: "destructive"
      });
      return;
    }

    try {
      const newPayment: Payment = {
        id: `pay-${Date.now()}`,
        ...newPaymentForm
      };

      setPayments(prev => [newPayment, ...prev]);

      toast({
        title: "Success",
        description: "Payment created successfully"
      });

      // Reset form
      setShowNewPaymentDialog(false);
      setNewPaymentForm({
        transactionId: `PAY-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0')}`,
        date: new Date().toISOString().split('T')[0],
        customer: '',
        amount: 0,
        method: 'cash',
        status: 'completed',
        description: '',
        type: activeSection === 'all' ? 'outlet' : activeSection
      });
    } catch (error: any) {
      console.error("Error creating payment:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create payment",
        variant: "destructive"
      });
    }
  };
  
  const filteredPayments = payments.filter(payment => {
    // Search filter
    const matchesSearch = 
      payment.transactionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status filter
    const matchesStatus = !statusFilter || payment.status === statusFilter;
    
    // Method filter
    const matchesMethod = !methodFilter || payment.method === methodFilter;
    
    // Date range filter
    let matchesDateRange = true;
    if (dateRange.start || dateRange.end) {
      const paymentDate = new Date(payment.date);
      if (dateRange.start) {
        const startDate = new Date(dateRange.start);
        startDate.setHours(0, 0, 0, 0);
        matchesDateRange = matchesDateRange && paymentDate >= startDate;
      }
      if (dateRange.end) {
        const endDate = new Date(dateRange.end);
        endDate.setHours(23, 59, 59, 999);
        matchesDateRange = matchesDateRange && paymentDate <= endDate;
      }
    }

    // Section filter
    const matchesSection = activeSection === 'all' || payment.type === activeSection;
    
    return matchesSearch && matchesStatus && matchesMethod && matchesDateRange && matchesSection;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'cash': return <DollarSign className="h-4 w-4" />;
      case 'card': return <CreditCard className="h-4 w-4" />;
      case 'mobile': return <DollarSign className="h-4 w-4" />;
      case 'debt': return <Clock className="h-4 w-4" />;
      default: return <DollarSign className="h-4 w-4" />;
    }
  };

  // Export Actions
  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const rowsHtml = filteredPayments.map(payment => `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${payment.transactionId}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${new Date(payment.date).toLocaleDateString()}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${payment.customer}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${payment.method}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${payment.status}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatCurrency(payment.amount)}</td>
        </tr>
      `).join('');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Payments Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #f59e0b; color: white; padding: 10px; text-align: left; }
            .total-row { font-weight: bold; background: #f9f9f9; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>Outlet Payments Report</h1>
          <p>Total Payments: ${filteredPayments.length}</p>
          <p>Total Amount: ${formatCurrency(filteredPayments.reduce((sum, p) => sum + p.amount, 0))}</p>
          <table>
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Method</th>
                <th>Status</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
              <tr class="total-row">
                <td colspan="5" style="text-align: right;">Total:</td>
                <td style="text-align: right;">${formatCurrency(filteredPayments.reduce((sum, p) => sum + p.amount, 0))}</td>
              </tr>
            </tbody>
          </table>
          <div style="margin-top: 20px; text-align: center;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">Print</button>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleDownload = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Outlet Payments Report', 14, 20);
    doc.setFontSize(10);
    doc.text(`Total Payments: ${filteredPayments.length}`, 14, 30);
    doc.text(`Total Amount: ${formatCurrency(filteredPayments.reduce((sum, p) => sum + p.amount, 0))}`, 14, 36);
    
    const tableData = filteredPayments.map(payment => [
      payment.transactionId,
      new Date(payment.date).toLocaleDateString(),
      payment.customer,
      payment.method,
      payment.status,
      formatCurrency(payment.amount)
    ]);
    
    autoTable(doc, {
      startY: 45,
      head: [['Transaction ID', 'Date', 'Customer', 'Method', 'Status', 'Amount']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [245, 158, 11] },
    });

    doc.save('Outlet_Payments.pdf');
    toast({
      title: "Download Started",
      description: "Downloading payments report as PDF",
    });
  };

  const handleExportXLS = () => {
    let csvContent = "Transaction ID,Date,Customer,Method,Status,Amount\n";
    filteredPayments.forEach(payment => {
      csvContent += `${payment.transactionId},${payment.date},${payment.customer},${payment.method},${payment.status},${payment.amount}\n`;
    });
    csvContent += `\nTotal,,,,,${filteredPayments.reduce((sum, p) => sum + p.amount, 0)}\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'Outlet_Payments.csv';
    link.click();
    toast({
      title: "Export Started",
      description: "Exporting payments report as CSV",
    });
  };

  const handleSharePDF = async () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text('Outlet Payments Report', 14, 20);
      doc.setFontSize(10);
      doc.text(`Total Payments: ${filteredPayments.length}`, 14, 30);
      
      const tableData = filteredPayments.map(payment => [
        payment.transactionId,
        new Date(payment.date).toLocaleDateString(),
        payment.customer,
        payment.method,
        payment.status,
        formatCurrency(payment.amount)
      ]);
      
      autoTable(doc, {
        startY: 40,
        head: [['Transaction ID', 'Date', 'Customer', 'Method', 'Status', 'Amount']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [245, 158, 11] },
      });

      const pdfBlob = doc.output('blob');
      const file = new File([pdfBlob], 'Outlet_Payments.pdf', { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Outlet Payments Report',
          text: `Payments report with ${filteredPayments.length} transactions`
        });
        toast({
          title: "Shared Successfully",
          description: "Payments report has been shared",
        });
      } else {
        handleDownload();
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Share error:', error);
        handleDownload();
      }
    }
  };

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Outlet Payments</h1>
            <p className="text-muted-foreground">Manage payments for this outlet</p>
          </div>
        </div>
        
        {/* Export Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Export
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handlePrintReport}>
              <Printer className="h-4 w-4 mr-2" />
              <span>Print</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              <span>Download .pdf</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportXLS}>
              <FileText className="h-4 w-4 mr-2" />
              <span>Export .xls</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSharePDF}>
              <Share2 className="h-4 w-4 mr-2" />
              <span>Share .pdf</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Section Tabs */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2 mb-3">
            <Button
              variant={activeSection === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveSection('all')}
              className="flex-1 min-w-[120px]"
            >
              All Payments
            </Button>
            <Button
              variant={activeSection === 'outlet' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveSection('outlet')}
              className="flex-1 min-w-[120px]"
            >
              Outlet Payments
            </Button>
            <Button
              variant={activeSection === 'kilango' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveSection('kilango')}
              className="flex-1 min-w-[150px]"
            >
              Kilango Investment
            </Button>
            <Button
              variant={activeSection === 'other' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveSection('other')}
              className="flex-1 min-w-[120px]"
            >
              Other Payments
            </Button>
          </div>

          {/* Due and Paid Payments Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 pt-3 border-t">
            {/* Amount Due Card */}
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Amount Due</p>
                    <p className="text-2xl font-bold text-yellow-900">
                      {loadingDeliveries ? (
                        <span className="text-lg">Loading...</span>
                      ) : (
                        formatCurrency(dueFromDeliveries)
                      )}
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      From Other Outlets (Deliveries In)
                    </p>
                  </div>
                  <Clock className="h-10 w-10 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            {/* Paid Payments Card */}
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-800">Paid Payments</p>
                    <p className="text-2xl font-bold text-green-900">
                      {formatCurrency(
                        payments
                          .filter(p => p.type === activeSection || activeSection === 'all')
                          .filter(p => p.status === 'completed')
                          .reduce((sum, p) => sum + p.amount, 0)
                      )}
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      {payments.filter(p => p.type === activeSection || activeSection === 'all').filter(p => p.status === 'completed').length} completed transactions
                    </p>
                  </div>
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* New Payment Button - Only show for specific sections */}
          {activeSection !== 'all' && (
            <div className="mt-3 pt-3 border-t">
              <Button
                onClick={() => {
                  setNewPaymentForm(prev => ({
                    ...prev,
                    type: activeSection
                  }));
                  setShowNewPaymentDialog(true);
                }}
                className="bg-green-600 hover:bg-green-700 w-full"
              >
                + New Payment
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Payments</p>
                <p className="text-2xl font-bold">{filteredPayments.length}</p>
              </div>
              <CreditCard className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{filteredPayments.filter(p => p.status === 'completed').length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{filteredPayments.filter(p => p.status === 'pending').length}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(filteredPayments.reduce((sum, p) => sum + p.amount, 0))}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search payments by transaction ID, customer, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm w-full md:w-auto"
            >
              <option value="">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
            
            {/* Method Filter */}
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm w-full md:w-auto"
            >
              <option value="">All Methods</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="mobile">Mobile</option>
              <option value="debt">Debt</option>
            </select>
            
            {/* Date Range Picker */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="px-2 py-1.5 border rounded-md text-sm"
                placeholder="Start Date"
              />
              <span className="text-muted-foreground">to</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="px-2 py-1.5 border rounded-md text-sm"
                placeholder="End Date"
              />
              {(dateRange.start || dateRange.end) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDateRange({ start: '', end: '' })}
                  className="h-7 px-2"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments List */}
      {loading ? (
        <div className="text-center py-12">
          <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4 animate-pulse" />
          <h3 className="text-lg font-medium">Loading payments...</h3>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPayments.map((payment) => (
            <Card key={payment.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{payment.transactionId}</h3>
                      <Badge className={getStatusColor(payment.status)}>
                        {payment.status}
                      </Badge>
                      <Badge variant="outline" className="flex items-center gap-1">
                        {getMethodIcon(payment.method)}
                        {payment.method}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {new Date(payment.date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="h-4 w-4" />
                        {payment.customer}
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      {payment.description}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{formatCurrency(payment.amount)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && filteredPayments.length === 0 && (
        <div className="text-center py-12">
          <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No payments found</h3>
          <p className="text-muted-foreground">
            {searchTerm || statusFilter || methodFilter || dateRange.start || dateRange.end
              ? 'Try adjusting your filters'
              : 'No payments for this outlet yet'}
          </p>
        </div>
      )}

      {/* New Payment Dialog */}
      <Dialog open={showNewPaymentDialog} onOpenChange={setShowNewPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Payment</DialogTitle>
            <DialogDescription>
              Enter the payment details for {activeSection === 'outlet' ? 'Outlet' : activeSection === 'kilango' ? 'Kilango Investment' : 'Other'} payment
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="paymentCustomer">Customer *</Label>
              <Input
                id="paymentCustomer"
                value={newPaymentForm.customer}
                onChange={(e) => setNewPaymentForm(prev => ({ ...prev, customer: e.target.value }))}
                placeholder="Enter customer name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paymentAmount">Amount (TSh) *</Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  min="0"
                  value={newPaymentForm.amount}
                  onChange={(e) => setNewPaymentForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentDate">Date</Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={newPaymentForm.date}
                  onChange={(e) => setNewPaymentForm(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Method</Label>
                <select
                  id="paymentMethod"
                  value={newPaymentForm.method}
                  onChange={(e) => setNewPaymentForm(prev => ({ ...prev, method: e.target.value as any }))}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="mobile">Mobile</option>
                  <option value="debt">Debt</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentStatus">Status</Label>
                <select
                  id="paymentStatus"
                  value={newPaymentForm.status}
                  onChange={(e) => setNewPaymentForm(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentDescription">Description</Label>
              <Input
                id="paymentDescription"
                value={newPaymentForm.description}
                onChange={(e) => setNewPaymentForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Payment description"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewPaymentDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePayment} className="bg-green-600 hover:bg-green-700">
              Create Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
