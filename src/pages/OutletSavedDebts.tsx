import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
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
  ArrowLeft, 
  FileText,
  Eye,
  Trash2,
  Receipt,
  Calendar,
  User,
  ShoppingCart,
  Printer,
  Loader2,
  Edit,
  Save,
  X,
  Search,
  Download,
  Share2,
  ChevronDown
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getOutletDebtsByOutletId, deleteOutletDebt, updateOutletDebt, OutletDebt, getOutletCustomerById, getOutletDebtItemsByDebtId, deleteOutletDebtItem, createOutletDebtItem, getInventoryProductsByOutlet, InventoryProduct, incrementSoldQuantity } from "@/services/databaseService";
import { PrintUtils } from "@/utils/printUtils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface OutletSavedDebtsProps {
  onBack: () => void;
  outletId?: string;
}

interface SavedSale {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate?: string;
  customer: string;
  customerId?: string;
  items: { name: string; quantity: number; price: number }[];
  subtotal: number;
  tax: number;
  total: number;
  amountPaid?: number;
  remainingAmount?: number;
  paymentMethod: string;
  status: string;
  creditBroughtForward?: number;
  adjustments?: number;
  adjustmentReason?: string;
  isEdited?: boolean; // Flag to track if transaction has been edited
}

export const OutletSavedDebts = ({ onBack, outletId }: OutletSavedDebtsProps) => {
  const { toast } = useToast();
  const [sales, setSales] = useState<SavedSale[]>([]);
  const [selectedSale, setSelectedSale] = useState<SavedSale | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<SavedSale>>({});
  const [inventoryProducts, setInventoryProducts] = useState<InventoryProduct[]>([]);
  const [itemSearchTerms, setItemSearchTerms] = useState<Record<number, string>>({});
  const [showItemDropdown, setShowItemDropdown] = useState<Record<number, boolean>>({});
  
  // Date range filter
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Search filter
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchSavedDebts();
    fetchInventoryProducts();
  }, [outletId]);

  // Action handlers
  const handlePrintDebts = () => {
    // Get filtered sales
    const filteredSales = sales.filter(sale => {
      if (startDate || endDate) {
        const saleDate = new Date(sale.date);
        if (startDate && saleDate < new Date(startDate)) return false;
        if (endDate) {
          const endDateTime = new Date(endDate);
          endDateTime.setHours(23, 59, 59, 999);
          if (saleDate > endDateTime) return false;
        }
      }
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const customerName = (sale.customer || '').toLowerCase();
        const invoiceNumber = (sale.invoiceNumber || '').toLowerCase();
        if (!customerName.includes(searchLower) && !invoiceNumber.includes(searchLower)) {
          return false;
        }
      }
      return true;
    });

    if (filteredSales.length === 0) {
      toast({
        title: "No Data",
        description: "No debts to print with current filters",
        variant: "destructive",
      });
      return;
    }

    // Calculate statistics
    const totalAmount = filteredSales.reduce((sum, sale) => sum + (sale.total || 0), 0);
    const totalPaid = filteredSales.reduce((sum, sale) => sum + (sale.amountPaid || 0), 0);
    const totalRemaining = totalAmount - totalPaid;
    
    // Generate printable HTML
    const dateRange = (startDate || endDate) 
      ? `${startDate || 'Start'} to ${endDate || 'End'}`
      : 'All Time';
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Print Failed",
        description: "Please allow popups to print",
        variant: "destructive",
      });
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Saved Debts Report</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            color: #333;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #2980b9;
            padding-bottom: 20px;
          }
          .header h1 {
            font-size: 28px;
            color: #2980b9;
            margin-bottom: 10px;
          }
          .header p {
            font-size: 14px;
            color: #666;
          }
          .stats {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-bottom: 30px;
          }
          .stat-card {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #2980b9;
          }
          .stat-card h3 {
            font-size: 12px;
            color: #666;
            margin-bottom: 5px;
            text-transform: uppercase;
          }
          .stat-card p {
            font-size: 20px;
            font-weight: bold;
            color: #2980b9;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          thead {
            background: #2980b9;
            color: white;
          }
          th {
            padding: 12px;
            text-align: left;
            font-weight: 600;
          }
          td {
            padding: 10px 12px;
            border-bottom: 1px solid #ddd;
          }
          tbody tr:nth-child(even) {
            background: #f8f9fa;
          }
          tbody tr:hover {
            background: #e3f2fd;
          }
          .status-unpaid {
            background: #fee;
            color: #c33;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
          }
          .status-partial {
            background: #ffeaa7;
            color: #d68910;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
          }
          .status-paid {
            background: #d4edda;
            color: #155724;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #ddd;
            text-align: center;
            color: #666;
            font-size: 12px;
          }
          @media print {
            body {
              padding: 0;
            }
            .no-print {
              display: none;
            }
            @page {
              margin: 1cm;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Saved Debts Report</h1>
          <p>Period: ${dateRange}</p>
          <p>Generated: ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="stats">
          <div class="stat-card">
            <h3>Total Debts</h3>
            <p>${filteredSales.length}</p>
          </div>
          <div class="stat-card">
            <h3>Total Amount</h3>
            <p>${totalAmount.toFixed(2)}</p>
          </div>
          <div class="stat-card">
            <h3>Total Paid</h3>
            <p>${totalPaid.toFixed(2)}</p>
          </div>
          <div class="stat-card">
            <h3>Total Remaining</h3>
            <p>${totalRemaining.toFixed(2)}</p>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Remaining</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${filteredSales.map(sale => {
              const remaining = sale.total - (sale.amountPaid || 0);
              const status = sale.amountPaid === 0 ? 'Unpaid' : 
                            (sale.amountPaid || 0) >= sale.total ? 'Paid' : 'Partial';
              const statusClass = status === 'Unpaid' ? 'status-unpaid' : 
                                 status === 'Partial' ? 'status-partial' : 'status-paid';
              return `
                <tr>
                  <td>${sale.invoiceNumber}</td>
                  <td>${sale.date}</td>
                  <td>${sale.customer || 'Walk-in Customer'}</td>
                  <td>${sale.total.toFixed(2)}</td>
                  <td>${(sale.amountPaid || 0).toFixed(2)}</td>
                  <td>${remaining.toFixed(2)}</td>
                  <td><span class="${statusClass}">${status}</span></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          <p>Total Debts: ${filteredSales.length} | Total Amount: ${totalAmount.toFixed(2)} | Total Paid: ${totalPaid.toFixed(2)} | Total Remaining: ${totalRemaining.toFixed(2)}</p>
          <p style="margin-top: 10px;">© ${new Date().getFullYear()} Royal POS System</p>
        </div>
        
        <div class="no-print" style="text-align: center; margin-top: 20px;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #2980b9; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">
            🖨️ Print Report
          </button>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    toast({
      title: "Print Ready",
      description: `Report with ${filteredSales.length} debts ready to print`,
    });
  };

  const handleDownload = () => {
    // Get filtered sales
    const filteredSales = sales.filter(sale => {
      if (startDate || endDate) {
        const saleDate = new Date(sale.date);
        if (startDate && saleDate < new Date(startDate)) return false;
        if (endDate) {
          const endDateTime = new Date(endDate);
          endDateTime.setHours(23, 59, 59, 999);
          if (saleDate > endDateTime) return false;
        }
      }
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const customerName = (sale.customer || '').toLowerCase();
        const invoiceNumber = (sale.invoiceNumber || '').toLowerCase();
        if (!customerName.includes(searchLower) && !invoiceNumber.includes(searchLower)) {
          return false;
        }
      }
      return true;
    });

    if (filteredSales.length === 0) {
      toast({
        title: "No Data",
        description: "No debts to download with current filters",
        variant: "destructive",
      });
      return;
    }

    // Generate PDF using jsPDF
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.text('Saved Debts Report', 14, 20);
    
    // Date range
    doc.setFontSize(10);
    const dateRange = (startDate || endDate) 
      ? `Period: ${startDate || 'Start'} to ${endDate || 'End'}`
      : 'All Time';
    doc.text(dateRange, 14, 28);
    
    // Stats
    const totalAmount = filteredSales.reduce((sum, sale) => sum + (sale.total || 0), 0);
    const totalPaid = filteredSales.reduce((sum, sale) => sum + (sale.amountPaid || 0), 0);
    const totalRemaining = totalAmount - totalPaid;
    
    doc.text(`Total Debts: ${filteredSales.length}`, 14, 36);
    doc.text(`Total Amount: ${totalAmount.toFixed(2)}`, 14, 42);
    doc.text(`Total Paid: ${totalPaid.toFixed(2)}`, 14, 48);
    doc.text(`Total Remaining: ${totalRemaining.toFixed(2)}`, 14, 54);
    
    // Table
    const tableData = filteredSales.map(sale => [
      sale.invoiceNumber,
      sale.date,
      sale.customer || 'Walk-in Customer',
      sale.total.toFixed(2),
      (sale.amountPaid || 0).toFixed(2),
      (sale.total - (sale.amountPaid || 0)).toFixed(2),
      sale.amountPaid === 0 ? 'Unpaid' : 
        (sale.amountPaid || 0) >= sale.total ? 'Paid' : 'Partial'
    ]);
    
    autoTable(doc, {
      startY: 60,
      head: [['Invoice', 'Date', 'Customer', 'Total', 'Paid', 'Remaining', 'Status']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] },
    });
    
    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    doc.setFontSize(10);
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    }
    
    // Save
    const filename = `saved-debts-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
    
    toast({
      title: "Download Started",
      description: `PDF downloaded: ${filename}`,
    });
  };

  const handleExportXLS = () => {
    // Get filtered sales
    const filteredSales = sales.filter(sale => {
      if (startDate || endDate) {
        const saleDate = new Date(sale.date);
        if (startDate && saleDate < new Date(startDate)) return false;
        if (endDate) {
          const endDateTime = new Date(endDate);
          endDateTime.setHours(23, 59, 59, 999);
          if (saleDate > endDateTime) return false;
        }
      }
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const customerName = (sale.customer || '').toLowerCase();
        const invoiceNumber = (sale.invoiceNumber || '').toLowerCase();
        if (!customerName.includes(searchLower) && !invoiceNumber.includes(searchLower)) {
          return false;
        }
      }
      return true;
    });

    if (filteredSales.length === 0) {
      toast({
        title: "No Data",
        description: "No debts to export with current filters",
        variant: "destructive",
      });
      return;
    }

    // Generate Excel-compatible HTML table
    const totalAmount = filteredSales.reduce((sum, sale) => sum + (sale.total || 0), 0);
    const totalPaid = filteredSales.reduce((sum, sale) => sum + (sale.amountPaid || 0), 0);
    const totalRemaining = totalAmount - totalPaid;
    
    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head>
        <meta charset="UTF-8">
        <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
        <x:Name>Saved Debts</x:Name>
        <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
        </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
        <style>
          td, th { padding: 5px; border: 1px solid #ccc; }
          th { background-color: #2980b9; color: white; }
          .header { font-size: 16px; font-weight: bold; }
          .stat { font-size: 12px; }
        </style>
      </head>
      <body>
        <table>
          <tr><td class="header" colspan="7">Saved Debts Report</td></tr>
          <tr><td class="stat" colspan="7">${(startDate || endDate) ? `Period: ${startDate || 'Start'} to ${endDate || 'End'}` : 'All Time'}</td></tr>
          <tr><td class="stat" colspan="7">Total Debts: ${filteredSales.length} | Total Amount: ${totalAmount.toFixed(2)} | Total Paid: ${totalPaid.toFixed(2)} | Total Remaining: ${totalRemaining.toFixed(2)}</td></tr>
          <tr><th>Invoice</th><th>Date</th><th>Customer</th><th>Total</th><th>Paid</th><th>Remaining</th><th>Status</th></tr>
    `;
    
    filteredSales.forEach(sale => {
      const remaining = sale.total - (sale.amountPaid || 0);
      const status = sale.amountPaid === 0 ? 'Unpaid' : 
                     (sale.amountPaid || 0) >= sale.total ? 'Paid' : 'Partial';
      html += `<tr>
        <td>${sale.invoiceNumber}</td>
        <td>${sale.date}</td>
        <td>${sale.customer || 'Walk-in Customer'}</td>
        <td>${sale.total.toFixed(2)}</td>
        <td>${(sale.amountPaid || 0).toFixed(2)}</td>
        <td>${remaining.toFixed(2)}</td>
        <td>${status}</td>
      </tr>`;
    });
    
    html += '</table></body></html>';
    
    // Download as XLS
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filename = `saved-debts-${new Date().toISOString().split('T')[0]}.xls`;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Export Complete",
      description: `Excel file downloaded: ${filename}`,
    });
  };

  const handleSharePDF = async () => {
    // Get filtered sales
    const filteredSales = sales.filter(sale => {
      if (startDate || endDate) {
        const saleDate = new Date(sale.date);
        if (startDate && saleDate < new Date(startDate)) return false;
        if (endDate) {
          const endDateTime = new Date(endDate);
          endDateTime.setHours(23, 59, 59, 999);
          if (saleDate > endDateTime) return false;
        }
      }
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const customerName = (sale.customer || '').toLowerCase();
        const invoiceNumber = (sale.invoiceNumber || '').toLowerCase();
        if (!customerName.includes(searchLower) && !invoiceNumber.includes(searchLower)) {
          return false;
        }
      }
      return true;
    });

    if (filteredSales.length === 0) {
      toast({
        title: "No Data",
        description: "No debts to share with current filters",
        variant: "destructive",
      });
      return;
    }

    // Generate PDF
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Saved Debts Report', 14, 20);
    
    doc.setFontSize(10);
    const dateRange = (startDate || endDate) 
      ? `Period: ${startDate || 'Start'} to ${endDate || 'End'}`
      : 'All Time';
    doc.text(dateRange, 14, 28);
    
    const totalAmount = filteredSales.reduce((sum, sale) => sum + (sale.total || 0), 0);
    const totalPaid = filteredSales.reduce((sum, sale) => sum + (sale.amountPaid || 0), 0);
    const totalRemaining = totalAmount - totalPaid;
    
    doc.text(`Total Debts: ${filteredSales.length}`, 14, 36);
    doc.text(`Total Amount: ${totalAmount.toFixed(2)}`, 14, 42);
    doc.text(`Total Paid: ${totalPaid.toFixed(2)}`, 14, 48);
    doc.text(`Total Remaining: ${totalRemaining.toFixed(2)}`, 14, 54);
    
    const tableData = filteredSales.map(sale => [
      sale.invoiceNumber,
      sale.date,
      sale.customer || 'Walk-in Customer',
      sale.total.toFixed(2),
      (sale.amountPaid || 0).toFixed(2),
      (sale.total - (sale.amountPaid || 0)).toFixed(2),
      sale.amountPaid === 0 ? 'Unpaid' : 
        (sale.amountPaid || 0) >= sale.total ? 'Paid' : 'Partial'
    ]);
    
    autoTable(doc, {
      startY: 60,
      head: [['Invoice', 'Date', 'Customer', 'Total', 'Paid', 'Remaining', 'Status']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] },
    });
    
    // Generate PDF blob
    const pdfBlob = doc.output('blob');
    const pdfFile = new File([pdfBlob], 'saved-debts-report.pdf', { type: 'application/pdf' });
    
    // Try to share
    if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      try {
        await navigator.share({
          files: [pdfFile],
          title: 'Saved Debts Report',
          text: `Saved Debts Report - ${filteredSales.length} transactions`,
        });
        toast({
          title: "Shared Successfully",
          description: "PDF shared via native share dialog",
        });
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          // Fallback to download
          doc.save('saved-debts-report.pdf');
          toast({
            title: "Downloaded Instead",
            description: "Sharing failed, PDF downloaded instead",
          });
        }
      }
    } else {
      // Fallback to download
      doc.save('saved-debts-report.pdf');
      toast({
        title: "Downloaded",
        description: "Sharing not supported, PDF downloaded instead",
      });
    }
  };

  const fetchInventoryProducts = async () => {
    if (!outletId) return;
    try {
      const products = await getInventoryProductsByOutlet(outletId);
      setInventoryProducts(products);
    } catch (error) {
      console.error('Error fetching inventory products:', error);
    }
  };

  const fetchSavedDebts = async () => {
    if (!outletId) return;
    
    setLoading(true);
    try {
      // Fetch from outlet_debts table
      const data = await getOutletDebtsByOutletId(outletId);
      
      console.log('📊 Fetched saved debts:', data.length);
      console.log('  Debts by payment_status:', {
        unpaid: data.filter(d => d.payment_status === 'unpaid').length,
        partial: data.filter(d => d.payment_status === 'partial').length,
        paid: data.filter(d => d.payment_status === 'paid').length,
      });
      
      // Enrich data with customer names and item counts
      const enrichedSales = await Promise.all(
        data.map(async (debt: OutletDebt) => {
          // Fetch customer name if customer_id exists
          let customerName = 'Walk-in Customer';
          if (debt.customer_id) {
            const customer = await getOutletCustomerById(debt.customer_id);
            if (customer) {
              customerName = `${customer.first_name} ${customer.last_name}`.trim();
            }
          }
          
          // Fetch items for this debt
          const debtItems = await getOutletDebtItemsByDebtId(debt.id || '');
          
          // Use product_name from the debt item (stored at time of debt creation)
          const itemsWithNames = debtItems.map((item) => ({
            name: item.product_name || 'Unknown Product',
            quantity: item.quantity,
            price: item.unit_price
          }));
          
          return {
            id: debt.id || '',
            invoiceNumber: debt.invoice_number || '',
            date: debt.debt_date || debt.created_at || '',
            dueDate: debt.due_date,
            customer: customerName,
            customerId: debt.customer_id,
            items: itemsWithNames,
            subtotal: debt.subtotal,
            tax: debt.tax_amount,
            total: debt.total_amount,
            amountPaid: debt.amount_paid || 0,
            remainingAmount: debt.remaining_amount,
            paymentMethod: 'debt',
            status: debt.payment_status,
            creditBroughtForward: 0,
            adjustments: 0
          };
        })
      );
      
      setSales(enrichedSales);
    } catch (error) {
      console.error('Error fetching saved debts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch saved debts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleView = (sale: SavedSale) => {
    setSelectedSale(sale);
    setIsViewDialogOpen(true);
  };

  const handleEdit = (sale: SavedSale) => {
    setSelectedSale(sale);
    setEditFormData({
      customer: sale.customer,
      subtotal: sale.subtotal,
      tax: sale.tax,
      creditBroughtForward: sale.creditBroughtForward,
      adjustments: sale.adjustments,
      adjustmentReason: sale.adjustmentReason,
      total: sale.total,
      amountPaid: sale.amountPaid,
      status: sale.status,
      items: [...sale.items] // Clone items for editing
    });
    setIsEditDialogOpen(true);
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    setEditFormData(prev => {
      const newItems = [...(prev.items || [])];
      newItems[index] = { ...newItems[index], [field]: value };
      
      // Recalculate subtotal, tax, total, and remainingAmount if quantity or price changed
      if (field === 'quantity' || field === 'price') {
        const newSubtotal = newItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
        const newTax = newSubtotal * 0.18; // 18% tax
        const adjustments = prev.adjustments || 0;
        const newTotal = newSubtotal + newTax + adjustments; // Include adjustments
        const amountPaid = prev.amountPaid || 0;
        const remainingBalance = newTotal - amountPaid;
        return { 
          ...prev, 
          items: newItems, 
          subtotal: newSubtotal,
          tax: newTax,
          total: newTotal,
          remainingAmount: remainingBalance
        };
      }
      
      return { ...prev, items: newItems };
    });
  };

  const handleAddItem = () => {
    setEditFormData(prev => ({
      ...prev,
      items: [...(prev.items || []), { name: '', quantity: 1, price: 0 }]
    }));
  };

  const handleRemoveItem = (index: number) => {
    setEditFormData(prev => {
      const newItems = (prev.items || []).filter((_, i) => i !== index);
      const newSubtotal = newItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
      const newTax = newSubtotal * 0.18; // 18% tax
      const adjustments = prev.adjustments || 0;
      const newTotal = newSubtotal + newTax + adjustments; // Include adjustments
      const amountPaid = prev.amountPaid || 0;
      const remainingBalance = newTotal - amountPaid;
      return { 
        ...prev, 
        items: newItems, 
        subtotal: newSubtotal,
        tax: newTax,
        total: newTotal,
        remainingAmount: remainingBalance
      };
    });
  };

  const getFilteredProducts = (searchTerm: string) => {
    if (!searchTerm) return inventoryProducts.slice(0, 10);
    return inventoryProducts
      .filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      .slice(0, 10);
  };

  const handleProductSelect = (index: number, product: InventoryProduct) => {
    setEditFormData(prev => {
      const newItems = [...(prev.items || [])];
      newItems[index] = { 
        ...newItems[index], 
        name: product.name, 
        price: product.selling_price || 0 
      };
      const newSubtotal = newItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
      const newTax = newSubtotal * 0.18; // 18% tax
      const adjustments = prev.adjustments || 0;
      const newTotal = newSubtotal + newTax + adjustments; // Include adjustments
      const amountPaid = prev.amountPaid || 0;
      const remainingBalance = newTotal - amountPaid;
      return { 
        ...prev, 
        items: newItems, 
        subtotal: newSubtotal,
        tax: newTax,
        total: newTotal,
        remainingAmount: remainingBalance
      };
    });
    setItemSearchTerms(prev => ({ ...prev, [index]: '' }));
    setShowItemDropdown(prev => ({ ...prev, [index]: false }));
  };

  const handleItemSearchChange = (index: number, value: string) => {
    setItemSearchTerms(prev => ({ ...prev, [index]: value }));
    handleItemChange(index, 'name', value);
    setShowItemDropdown(prev => ({ ...prev, [index]: true }));
  };

  const handleUpdate = async () => {
    if (!selectedSale || !selectedSale.id) {
      console.error('❌ No sale selected for update');
      return;
    }
    
    if (!outletId) {
      console.error('❌ No outlet ID available for inventory update');
      return;
    }
    
    try {
      console.log('💾 Starting debt record update...', selectedSale.id);
      console.log('📝 Update form data:', editFormData);
      
      // Step 1: Get the OLD items before deletion to reverse their sold quantities
      console.log('📋 Fetching existing debt items to reverse inventory...');
      const oldItems = await getOutletDebtItemsByDebtId(selectedSale.id);
      console.log(`  Found ${oldItems.length} existing items`);
      
      // Step 2: Reverse the old sold quantities (subtract old quantities from inventory)
      console.log('🔄 Reversing old inventory sold quantities...');
      for (const oldItem of oldItems) {
        console.log(`  - Reversing: ${oldItem.product_name}, qty: ${oldItem.quantity}`);
        // Subtract by adding negative quantity
        await incrementSoldQuantity(outletId, oldItem.product_name || '', -oldItem.quantity);
      }
      console.log('✅ Old inventory quantities reversed');
      
      // Step 3: Update the debt record with all fields
      // Map status to valid payment_status values: unpaid, partial, paid
      const validPaymentStatus = editFormData.status === 'outstanding' ? 'unpaid' : editFormData.status;
      
      const updatedDebt = await updateOutletDebt(selectedSale.id, {
        subtotal: editFormData.subtotal,
        tax_amount: editFormData.tax,
        total_amount: editFormData.total,
        amount_paid: editFormData.amountPaid,
        remaining_amount: (editFormData.total || 0) - (editFormData.amountPaid || 0),
        payment_status: validPaymentStatus
      });
      
      if (updatedDebt) {
        console.log('✅ Debt record updated successfully');
        
        // Step 4: Delete existing items
        console.log('🗑️ Deleting existing debt items...');
        for (const oldItem of oldItems) {
          if (oldItem.id) {
            await deleteOutletDebtItem(oldItem.id);
          }
        }
        
        // Step 5: Create new items and update inventory
        console.log('➕ Creating new debt items and updating inventory...', editFormData.items?.length || 0, 'items');
        for (const item of (editFormData.items || [])) {
          const itemTotal = item.quantity * item.price;
          console.log(`  - Creating item: ${item.name}, qty: ${item.quantity}, price: ${item.price}, total: ${itemTotal}`);
          
          await createOutletDebtItem({
            debt_id: selectedSale.id,
            product_name: item.name,
            quantity: item.quantity,
            unit_price: item.price,
            discount_amount: 0,
            total_price: itemTotal
          });
          
          // Update inventory sold quantity for the new item
          console.log(`  📦 Updating inventory for: ${item.name}, qty: ${item.quantity}`);
          const inventoryUpdated = await incrementSoldQuantity(outletId, item.name, item.quantity);
          if (inventoryUpdated) {
            console.log(`    ✅ Inventory updated for ${item.name}`);
          } else {
            console.warn(`    ⚠️ Failed to update inventory for ${item.name} - product may not exist in inventory`);
          }
        }
        
        console.log('✅ All items created and inventory updated successfully');
        
        // Mark the debt as edited
        const editedSale = {
          ...selectedSale,
          ...editFormData,
          isEdited: true
        };
        setSelectedSale(editedSale);
        
        toast({
          title: "Success",
          description: "Debt record updated successfully and inventory recalculated"
        });
        setIsEditDialogOpen(false);
        fetchSavedDebts(); // Refresh the list
        fetchInventoryProducts(); // Refresh inventory products
      } else {
        console.error('❌ updateOutletDebt returned null');
        toast({
          title: "Error",
          description: "Failed to update debt record - database returned null",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('❌ Error updating debt:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: "Error",
        description: `Failed to update debt record: ${errorMessage}`,
        variant: "destructive"
      });
    }
  };

  const handlePrint = (sale: SavedSale) => {
    // Create transaction object that matches PrintUtils.printDebtInvoice expectations
    const transaction = {
      receiptNumber: sale.invoiceNumber,
      date: sale.date,
      items: sale.items,
      subtotal: sale.subtotal,
      tax: sale.tax,
      discount: 0,
      shipping: 0,
      adjustments: sale.adjustments || 0,
      adjustmentReason: sale.adjustmentReason,
      total: sale.total,
      paymentMethod: 'debt',
      amountPaid: sale.amountPaid || 0,
      remainingAmount: sale.remainingAmount || 0,
      debtPaymentAmount: 0,
      previousDebtBalance: sale.creditBroughtForward || 0,
      change: 0,
      customer: {
        name: sale.customer,
        phone: '',
        address: '',
        email: ''
      },
      salesman: 'Not Assigned',
      driver: 'Not Assigned',
      dueDate: sale.date, // Use sale date as due date if not specified
      isEdited: sale.isEdited || false // Pass the edited flag
    };
    
    PrintUtils.printDebtInvoice(transaction);
  };

  const handleDelete = async (debtId: string) => {
    console.log('handleDelete called with debtId:', debtId);
    try {
      // Step 1: Get the debt items before deletion to reverse inventory
      console.log('📋 Fetching debt items to reverse inventory...');
      const debtItems = await getOutletDebtItemsByDebtId(debtId);
      console.log(`  Found ${debtItems.length} items`);
      
      // Step 2: Reverse the sold quantities (subtract from inventory)
      console.log('🔄 Reversing inventory sold quantities...');
      let reversedCount = 0;
      for (const item of debtItems) {
        console.log(`  - Reversing: ${item.product_name}, qty: ${item.quantity}`);
        // Subtract by adding negative quantity
        const success = await incrementSoldQuantity(outletId, item.product_name || '', -item.quantity);
        if (success) {
          reversedCount++;
          console.log(`    ✅ Reversed ${item.product_name}`);
        } else {
          console.warn(`    ⚠️ Failed to reverse ${item.product_name} - product may not exist in inventory`);
        }
      }
      console.log(`✅ Reversed ${reversedCount}/${debtItems.length} items`);
      
      // Step 3: Delete the debt (cascade will delete items and payments)
      console.log('🗑️ Deleting debt record...');
      const success = await deleteOutletDebt(debtId);
      console.log('deleteOutletDebt result:', success);
      
      if (success) {
        const updatedSales = sales.filter(s => s.id !== debtId);
        setSales(updatedSales);
        toast({
          title: "Debt Deleted",
          description: `The debt record and ${debtItems.length} items have been removed, ${reversedCount} inventory items updated`
        });
        // Refresh the list to ensure sync with database
        await fetchSavedDebts();
        await fetchInventoryProducts(); // Refresh inventory products
      } else {
        toast({
          title: "Error",
          description: "Failed to delete debt record",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error deleting debt:', error);
      toast({
        title: "Error",
        description: "Failed to delete debt record",
        variant: "destructive"
      });
    }
  };

  // Calculate filtered sales for header statistics
  const filteredSales = sales.filter(sale => {
    // Date range filter
    if (startDate || endDate) {
      const saleDate = new Date(sale.date);
      if (startDate && saleDate < new Date(startDate)) return false;
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        if (saleDate > endDateTime) return false;
      }
    }
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const customerName = (sale.customer || '').toLowerCase();
      const invoiceNumber = (sale.invoiceNumber || '').toLowerCase();
      if (!customerName.includes(searchLower) && !invoiceNumber.includes(searchLower)) {
        return false;
      }
    }
    return true;
  });
  
  const totalDebt = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
  const totalPaid = filteredSales.reduce((sum, sale) => sum + (sale.amountPaid || 0), 0);
  const totalRemaining = totalDebt - totalPaid;

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Saved Debts
          </h1>
          <p className="text-muted-foreground">View and manage debt transactions</p>
        </div>
        <div className="text-right">
          <Badge variant="outline" className="text-lg px-4 py-2">
            {filteredSales.length} Debts
          </Badge>
          <div className="mt-2 space-y-1">
            <p className="text-sm text-muted-foreground">Total: {formatCurrency(totalDebt)}</p>
            <p className="text-xs text-green-600">Paid: {formatCurrency(totalPaid)}</p>
            <p className="text-xs text-red-600">Remaining: {formatCurrency(totalRemaining)}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Date Range Filter + Search Bar - Side by Side */}
        <div className="flex gap-4 items-center">
          {/* Date Range Filter - Right Aligned */}
          <div className="flex justify-end flex-1">
            <Card className="w-auto">
              <CardContent className="p-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-8 w-[140px]"
                    placeholder="From"
                  />
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-8 w-[140px]"
                    placeholder="To"
                  />
                  {(startDate || endDate) && (
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => {
                        setStartDate('');
                        setEndDate('');
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Search Bar */}
          <div className="relative w-[300px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name or invoice..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-8"
            />
          </div>
          
          {/* Action Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-2">
                <span>Actions</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => handlePrintDebts()}>
                <Printer className="h-4 w-4 mr-2" />
                <span>Print</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownload()}>
                <Download className="h-4 w-4 mr-2" />
                <span>Download</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportXLS()}>
                <FileText className="h-4 w-4 mr-2" />
                <span>Export to XLS</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSharePDF()}>
                <Share2 className="h-4 w-4 mr-2" />
                <span>Share as PDF</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {loading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="h-12 w-12 mx-auto text-muted-foreground mb-4 animate-spin" />
              <h3 className="text-lg font-medium">Loading Debts...</h3>
              <p className="text-muted-foreground">Fetching debt records from database</p>
            </CardContent>
          </Card>
        ) : sales.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Saved Debts</h3>
              <p className="text-muted-foreground">Debt transactions will appear here after completion</p>
            </CardContent>
          </Card>
        ) : (
          // Filter sales by date range and search term
          (() => {
            const filteredSales = sales.filter(sale => {
              // Date range filter
              if (startDate || endDate) {
                const saleDate = new Date(sale.date);
                
                if (startDate && saleDate < new Date(startDate)) return false;
                if (endDate) {
                  const endDateTime = new Date(endDate);
                  endDateTime.setHours(23, 59, 59, 999);
                  if (saleDate > endDateTime) return false;
                }
              }
              
              // Search filter
              if (searchTerm) {
                const searchLower = searchTerm.toLowerCase();
                const customerName = (sale.customer || '').toLowerCase();
                const invoiceNumber = (sale.invoiceNumber || '').toLowerCase();
                
                if (!customerName.includes(searchLower) && !invoiceNumber.includes(searchLower)) {
                  return false;
                }
              }
              
              return true;
            });
            
            return filteredSales.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No debts found</h3>
                  <p className="text-muted-foreground">Try adjusting your search or date range</p>
                </CardContent>
              </Card>
            ) : (
              filteredSales.map((sale) => {
                // Calculate payment status
                const amountPaid = sale.amountPaid || 0;
                const total = sale.total || 0;
                const remaining = total - amountPaid;
                
                let statusBadge;
                if (amountPaid === 0) {
                  statusBadge = <Badge className="bg-red-100 text-red-800">Unpaid</Badge>;
                } else if (amountPaid > total) {
                  statusBadge = <Badge className="bg-blue-100 text-blue-800">Overpaid</Badge>;
                } else if (remaining === 0) {
                  statusBadge = <Badge className="bg-green-100 text-green-800">Paid</Badge>;
                } else {
                  statusBadge = <Badge className="bg-yellow-100 text-yellow-800">Partial</Badge>;
                }
                
                return (
            <Card key={sale.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-semibold">{sale.invoiceNumber}</span>
                      {statusBadge}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span>{sale.date}</span>
                      <span className="mx-2">•</span>
                      <span className="font-medium text-red-600">{sale.customer || 'Unknown Customer'}</span>
                      <span className="mx-2">•</span>
                      <span>{sale.items.length} items</span>
                    </div>
                    <div className="text-sm mt-1">
                      <span className="text-muted-foreground">Paid: {formatCurrency(amountPaid)}</span>
                      <span className="mx-2">•</span>
                      <span className={remaining > 0 ? 'text-red-600' : 'text-green-600'}>
                        {remaining > 0 ? `Due: ${formatCurrency(remaining)}` : 'Fully Paid'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-red-600">{formatCurrency(sale.total)}</p>
                    <div className="flex gap-2 mt-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleView(sale)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleEdit(sale)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handlePrint(sale)}
                      >
                        <Printer className="h-4 w-4 mr-1" />
                        Print
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleDelete(sale.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );})
            )
          })()
        )}
      </div>

      {/* View Sale Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Transaction Details
            </DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-4">
              {/* Payment Reality Banner */}
              {(() => {
                const amountPaid = selectedSale.amountPaid || 0;
                const total = selectedSale.total || 0;
                const remaining = total - amountPaid;
                
                if (amountPaid === 0) {
                  return (
                    <div className="p-3 bg-red-100 border border-red-300 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-red-800">UNPAID - Full Debt</span>
                        <Badge className="bg-red-600 text-white">Outstanding</Badge>
                      </div>
                      <p className="text-sm text-red-700 mt-1">No payment received</p>
                    </div>
                  );
                } else if (amountPaid > total) {
                  const overpayment = amountPaid - total;
                  return (
                    <div className="p-3 bg-blue-100 border border-blue-300 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-blue-800">OVERPAID</span>
                        <Badge className="bg-blue-600 text-white">Credit</Badge>
                      </div>
                      <p className="text-sm text-blue-700 mt-1">
                        Paid: {formatCurrency(amountPaid)} / Overpayment: {formatCurrency(overpayment)}
                      </p>
                    </div>
                  );
                } else if (remaining === 0) {
                  return (
                    <div className="p-3 bg-green-100 border border-green-300 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-green-800">FULLY PAID</span>
                        <Badge className="bg-green-600 text-white">Completed</Badge>
                      </div>
                      <p className="text-sm text-green-700 mt-1">Payment completed</p>
                    </div>
                  );
                } else {
                  return (
                    <div className="p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-yellow-800">PARTIALLY PAID</span>
                        <Badge className="bg-yellow-600 text-white">Partial</Badge>
                      </div>
                      <p className="text-sm text-yellow-700 mt-1">
                        Paid: {formatCurrency(amountPaid)} / Remaining: {formatCurrency(remaining)}
                      </p>
                    </div>
                  );
                }
              })()}

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Invoice Number</p>
                  <p className="font-semibold">{selectedSale.invoiceNumber}</p>
                </div>
                <Badge className={
                  selectedSale.amountPaid === 0 ? 'bg-red-100 text-red-800' :
                  selectedSale.amountPaid >= selectedSale.total ? 'bg-green-100 text-green-800' :
                  'bg-yellow-100 text-yellow-800'
                }>
                  {selectedSale.amountPaid === 0 ? 'Unpaid' :
                   selectedSale.amountPaid >= selectedSale.total ? 'Paid' : 'Partial'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="text-sm font-medium">{selectedSale.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Customer</p>
                    <p className="text-sm font-medium text-red-600">{selectedSale.customer || 'Unknown Customer'}</p>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Items ({selectedSale.items.length})</p>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left py-2 px-3">Item</th>
                        <th className="text-right py-2 px-3">Qty</th>
                        <th className="text-right py-2 px-3">Price</th>
                        <th className="text-right py-2 px-3">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSale.items.map((item, index) => (
                        <tr key={index} className="border-t">
                          <td className="py-2 px-3">{item.name}</td>
                          <td className="text-right py-2 px-3">{item.quantity}</td>
                          <td className="text-right py-2 px-3">{formatCurrency(item.price)}</td>
                          <td className="text-right py-2 px-3">{formatCurrency(item.price * item.quantity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(selectedSale.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax (18%)</span>
                  <span>{formatCurrency(selectedSale.tax)}</span>
                </div>
                {selectedSale.creditBroughtForward > 0 && (
                  <div className="flex justify-between text-sm text-orange-600">
                    <span>Credit Brought Forward</span>
                    <span>{formatCurrency(selectedSale.creditBroughtForward)}</span>
                  </div>
                )}
                {selectedSale.adjustments !== 0 && (
                  <div className="flex justify-between text-sm text-blue-600">
                    <span>Adjustments {selectedSale.adjustmentReason && `(${selectedSale.adjustmentReason})`}</span>
                    <span>{formatCurrency(selectedSale.adjustments)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total Amount</span>
                  <span>{formatCurrency(selectedSale.total)}</span>
                </div>
                
                {/* Payment Breakdown */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg space-y-2">
                  <p className="font-medium text-sm text-gray-700">Payment Breakdown</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Amount Paid</span>
                    <span className="font-medium text-green-600">{formatCurrency(selectedSale.amountPaid || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {selectedSale.amountPaid > selectedSale.total ? 'Credit Balance' : 'Remaining Balance'}
                    </span>
                    <span className={
                      selectedSale.amountPaid > selectedSale.total ? 'font-medium text-blue-600' :
                      selectedSale.total - (selectedSale.amountPaid || 0) > 0 ? 'font-medium text-red-600' : 
                      'font-medium text-green-600'
                    }>
                      {selectedSale.amountPaid > selectedSale.total 
                        ? formatCurrency(selectedSale.amountPaid - selectedSale.total)
                        : formatCurrency(Math.max(0, selectedSale.total - (selectedSale.amountPaid || 0)))
                      }
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">Payment Method</span>
                <Badge className={
                  selectedSale.amountPaid === 0 ? 'bg-red-100 text-red-800' :
                  selectedSale.amountPaid >= selectedSale.total ? 'bg-green-100 text-green-800' :
                  'bg-yellow-100 text-yellow-800'
                }>
                  <FileText className="h-3 w-3 mr-1" />
                  {selectedSale.amountPaid === 0 ? 'Unpaid Debt' :
                   selectedSale.amountPaid >= selectedSale.total ? 'Paid (was Debt)' : 'Partial Payment'}
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Debt Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Debt Record
            </DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Invoice Number</p>
                <p className="font-semibold">{selectedSale.invoiceNumber}</p>
              </div>
              
              <div>
                <Label htmlFor="editCustomer">Customer</Label>
                <Input
                  id="editCustomer"
                  value={editFormData.customer || ''}
                  onChange={(e) => setEditFormData({...editFormData, customer: e.target.value})}
                />
              </div>
              
              {/* Editable Items Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Items</Label>
                  <Button type="button" size="sm" variant="outline" onClick={handleAddItem}>
                    + Add Item
                  </Button>
                </div>
                <div className="border rounded-lg overflow-visible">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left py-3 px-3">Item Name</th>
                        <th className="text-right py-3 px-3 w-24">Qty</th>
                        <th className="text-right py-3 px-3 w-32">Price</th>
                        <th className="text-right py-3 px-3 w-32">Total</th>
                        <th className="text-center py-3 px-3 w-12"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(editFormData.items || []).map((item, index) => (
                        <tr key={index} className="border-t">
                          <td className="py-2 px-3 relative">
                            <Input
                              value={item.name}
                              onChange={(e) => handleItemSearchChange(index, e.target.value)}
                              onFocus={() => setShowItemDropdown(prev => ({ ...prev, [index]: true }))}
                              onBlur={(e) => {
                                // Delay to allow click on dropdown items
                                setTimeout(() => {
                                  setShowItemDropdown(prev => ({ ...prev, [index]: false }));
                                }, 200);
                              }}
                              className="h-9"
                              placeholder="Type to search items..."
                            />
                            {showItemDropdown[index] && (
                              <div className="absolute z-[100] top-full left-0 w-80 mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                                {getFilteredProducts(itemSearchTerms[index] || item.name).length > 0 ? (
                                  getFilteredProducts(itemSearchTerms[index] || item.name).map((product) => (
                                    <div
                                      key={product.id}
                                      className="flex items-center justify-between p-2 hover:bg-accent cursor-pointer text-sm border-b last:border-0"
                                      onMouseDown={(e) => e.preventDefault()}
                                      onClick={() => handleProductSelect(index, product)}
                                    >
                                      <div>
                                        <p className="font-medium">{product.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                          Stock: {product.available_quantity ?? product.quantity} | {formatCurrency(product.selling_price)}
                                        </p>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="p-3 text-sm text-muted-foreground text-center">
                                    No products found
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                              className="h-9 text-right"
                              min="1"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <Input
                              type="number"
                              value={item.price}
                              onChange={(e) => handleItemChange(index, 'price', parseFloat(e.target.value) || 0)}
                              className="h-9 text-right"
                              min="0"
                            />
                          </td>
                          <td className="py-2 px-3 text-right font-medium">
                            {formatCurrency(item.quantity * item.price)}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-500 hover:bg-red-50"
                              onClick={() => handleRemoveItem(index)}
                            >
                              ×
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Subtotal, Tax, Adjustments - 3 columns */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="editSubtotal">Subtotal</Label>
                  <Input
                    id="editSubtotal"
                    type="number"
                    value={editFormData.subtotal || 0}
                    readOnly
                    className="bg-muted cursor-not-allowed"
                  />
                </div>
                <div>
                  <Label htmlFor="editTax">Tax (18%)</Label>
                  <Input
                    id="editTax"
                    type="number"
                    value={editFormData.tax || 0}
                    readOnly
                    className="bg-muted cursor-not-allowed"
                  />
                </div>
                <div>
                  <Label htmlFor="editAdjustments">Adjustments</Label>
                  <Input
                    id="editAdjustments"
                    type="number"
                    value={editFormData.adjustments || 0}
                    onChange={(e) => {
                      const adjustmentsValue = parseFloat(e.target.value) || 0;
                      const newTotal = editFormData.subtotal + editFormData.tax + adjustmentsValue;
                      const remainingBalance = newTotal - (editFormData.amountPaid || 0);
                      setEditFormData({
                        ...editFormData, 
                        adjustments: adjustmentsValue,
                        total: newTotal,
                        remainingAmount: remainingBalance
                      });
                    }}
                  />
                </div>
              </div>
              
              {editFormData.adjustments !== 0 && (
                <div>
                  <Label htmlFor="editAdjustmentReason">Adjustment Reason</Label>
                  <Input
                    id="editAdjustmentReason"
                    value={editFormData.adjustmentReason || ''}
                    onChange={(e) => setEditFormData({...editFormData, adjustmentReason: e.target.value})}
                    placeholder="Reason for adjustment"
                  />
                </div>
              )}
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="editTotal">Total Amount</Label>
                  <Input
                    id="editTotal"
                    type="number"
                    value={editFormData.total || 0}
                    readOnly
                    className="bg-muted cursor-not-allowed"
                  />
                </div>
                
                <div>
                  <Label htmlFor="editAmountPaid">Amount Paid</Label>
                  <Input
                    id="editAmountPaid"
                    type="number"
                    value={editFormData.amountPaid || 0}
                    onChange={(e) => {
                      const amountPaidValue = parseFloat(e.target.value) || 0;
                      const remainingBalance = (editFormData.total || 0) - amountPaidValue;
                      setEditFormData({
                        ...editFormData,
                        amountPaid: amountPaidValue,
                        remainingAmount: remainingBalance
                      });
                    }}
                  />
                </div>
                
                <div>
                  <Label htmlFor="editStatus">Status</Label>
                  <select
                    id="editStatus"
                    className="w-full p-2 border rounded-md h-9"
                    value={editFormData.status || 'unpaid'}
                    onChange={(e) => setEditFormData({...editFormData, status: e.target.value})}
                  >
                    <option value="unpaid">Unpaid</option>
                    <option value="partial">Partial</option>
                    <option value="paid">Paid</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </div>
              </div>
              
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span>Remaining Balance:</span>
                  <span className="font-semibold">
                    {formatCurrency((editFormData.total || 0) - (editFormData.amountPaid || 0))}
                  </span>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button onClick={handleUpdate}>
                  <Save className="h-4 w-4 mr-1" />
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
