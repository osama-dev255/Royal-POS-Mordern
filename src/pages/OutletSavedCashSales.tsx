import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Banknote,
  Eye,
  Trash2,
  Receipt,
  Calendar,
  User,
  ShoppingCart,
  Printer,
  Loader2,
  X,
  Search,
  Download,
  Share2,
  ChevronDown,
  FileText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getSavedSalesByOutletAndPaymentMethod, deleteSavedSale, SavedSale as DatabaseSavedSale } from "@/services/databaseService";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface OutletSavedCashSalesProps {
  onBack: () => void;
  outletId?: string;
}

interface SavedSale {
  id: string;
  invoiceNumber: string;
  date: string;
  customer: string;
  items: { name: string; quantity: number; price: number }[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  status: string;
}

export const OutletSavedCashSales = ({ onBack, outletId }: OutletSavedCashSalesProps) => {
  const { toast } = useToast();
  const [sales, setSales] = useState<SavedSale[]>([]);
  const [selectedSale, setSelectedSale] = useState<SavedSale | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Date range filter
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Search filter
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchSavedCashSales();
  }, [outletId]);

  // Action handlers
  const handlePrintReport = () => {
    const filteredSales = getFilteredSales();
    if (filteredSales.length === 0) {
      toast({ title: "No Data", description: "No sales to print", variant: "destructive" });
      return;
    }

    const totalAmount = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    const dateRange = (startDate || endDate) ? `${startDate || 'Start'} to ${endDate || 'End'}` : 'All Time';
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: "Print Failed", description: "Please allow popups", variant: "destructive" });
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cash Sales Report</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #27ae60; padding-bottom: 20px; }
          .header h1 { font-size: 28px; color: #27ae60; margin-bottom: 10px; }
          .header p { font-size: 14px; color: #666; }
          .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px; }
          .stat-card { background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #27ae60; }
          .stat-card h3 { font-size: 12px; color: #666; margin-bottom: 5px; text-transform: uppercase; }
          .stat-card p { font-size: 20px; font-weight: bold; color: #27ae60; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          thead { background: #27ae60; color: white; }
          th { padding: 12px; text-align: left; }
          td { padding: 10px 12px; border-bottom: 1px solid #ddd; }
          tbody tr:nth-child(even) { background: #f8f9fa; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 2px solid #ddd; text-align: center; color: #666; font-size: 12px; }
          @media print { body { padding: 0; } @page { margin: 1cm; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Cash Sales Report</h1>
          <p>Period: ${dateRange}</p>
          <p>Generated: ${new Date().toLocaleString()}</p>
        </div>
        <div class="stats">
          <div class="stat-card"><h3>Total Sales</h3><p>${filteredSales.length}</p></div>
          <div class="stat-card"><h3>Total Amount</h3><p>${totalAmount.toFixed(2)}</p></div>
          <div class="stat-card"><h3>Average Sale</h3><p>${(totalAmount / filteredSales.length).toFixed(2)}</p></div>
        </div>
        <table>
          <thead><tr><th>Invoice</th><th>Date</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th></tr></thead>
          <tbody>
            ${filteredSales.map(sale => `
              <tr>
                <td>${sale.invoiceNumber}</td>
                <td>${sale.date}</td>
                <td>${sale.customer || 'Walk-in'}</td>
                <td>${sale.items.length}</td>
                <td>${sale.total.toFixed(2)}</td>
                <td>${sale.status}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">
          <p>Total Sales: ${filteredSales.length} | Total Amount: ${totalAmount.toFixed(2)}</p>
          <p style="margin-top: 10px;">© ${new Date().getFullYear()} Royal POS System</p>
        </div>
        <div style="text-align: center; margin-top: 20px;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #27ae60; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">🖨️ Print Report</button>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    toast({ title: "Print Ready", description: `Report with ${filteredSales.length} sales ready` });
  };

  const handleDownload = () => {
    const filteredSales = getFilteredSales();
    if (filteredSales.length === 0) {
      toast({ title: "No Data", description: "No sales to download", variant: "destructive" });
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Cash Sales Report', 14, 20);
    doc.setFontSize(10);
    const dateRange = (startDate || endDate) ? `${startDate || 'Start'} to ${endDate || 'End'}` : 'All Time';
    doc.text(`Period: ${dateRange}`, 14, 28);
    
    const totalAmount = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    doc.text(`Total Sales: ${filteredSales.length}`, 14, 36);
    doc.text(`Total Amount: ${totalAmount.toFixed(2)}`, 14, 42);
    
    const tableData = filteredSales.map(sale => [
      sale.invoiceNumber, sale.date, sale.customer || 'Walk-in',
      sale.items.length.toString(), sale.total.toFixed(2), sale.status
    ]);
    
    autoTable(doc, {
      startY: 50,
      head: [['Invoice', 'Date', 'Customer', 'Items', 'Total', 'Status']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [39, 174, 96] },
    });
    
    const filename = `cash-sales-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
    toast({ title: "Downloaded", description: `PDF: ${filename}` });
  };

  const handleExportXLS = () => {
    const filteredSales = getFilteredSales();
    if (filteredSales.length === 0) {
      toast({ title: "No Data", description: "No sales to export", variant: "destructive" });
      return;
    }

    const totalAmount = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head><meta charset="UTF-8"><style>td, th { padding: 5px; border: 1px solid #ccc; } th { background: #27ae60; color: white; }</style></head>
      <body><table>
        <tr><td colspan="6" style="font-weight: bold;">Cash Sales Report</td></tr>
        <tr><td colspan="6">Total Sales: ${filteredSales.length} | Total Amount: ${totalAmount.toFixed(2)}</td></tr>
        <tr><th>Invoice</th><th>Date</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th></tr>
    `;
    
    filteredSales.forEach(sale => {
      html += `<tr><td>${sale.invoiceNumber}</td><td>${sale.date}</td><td>${sale.customer || 'Walk-in'}</td><td>${sale.items.length}</td><td>${sale.total.toFixed(2)}</td><td>${sale.status}</td></tr>`;
    });
    
    html += '</table></body></html>';
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filename = `cash-sales-${new Date().toISOString().split('T')[0]}.xls`;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: `Excel: ${filename}` });
  };

  const handleSharePDF = async () => {
    const filteredSales = getFilteredSales();
    if (filteredSales.length === 0) {
      toast({ title: "No Data", description: "No sales to share", variant: "destructive" });
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Cash Sales Report', 14, 20);
    doc.setFontSize(10);
    const dateRange = (startDate || endDate) ? `${startDate || 'Start'} to ${endDate || 'End'}` : 'All Time';
    doc.text(`Period: ${dateRange}`, 14, 28);
    
    const totalAmount = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    doc.text(`Total Sales: ${filteredSales.length}`, 14, 36);
    doc.text(`Total Amount: ${totalAmount.toFixed(2)}`, 14, 42);
    
    const tableData = filteredSales.map(sale => [
      sale.invoiceNumber, sale.date, sale.customer || 'Walk-in',
      sale.items.length.toString(), sale.total.toFixed(2), sale.status
    ]);
    
    autoTable(doc, {
      startY: 50,
      head: [['Invoice', 'Date', 'Customer', 'Items', 'Total', 'Status']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [39, 174, 96] },
    });
    
    const pdfBlob = doc.output('blob');
    const pdfFile = new File([pdfBlob], 'cash-sales-report.pdf', { type: 'application/pdf' });
    
    if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      try {
        await navigator.share({ files: [pdfFile], title: 'Cash Sales Report' });
        toast({ title: "Shared", description: "PDF shared successfully" });
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          doc.save('cash-sales-report.pdf');
          toast({ title: "Downloaded", description: "Sharing failed, PDF downloaded" });
        }
      }
    } else {
      doc.save('cash-sales-report.pdf');
      toast({ title: "Downloaded", description: "Sharing not supported, PDF downloaded" });
    }
  };

  const getFilteredSales = () => {
    return sales.filter(sale => {
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
  };

  const fetchSavedCashSales = async () => {
    if (!outletId) return;
    
    setLoading(true);
    try {
      const data = await getSavedSalesByOutletAndPaymentMethod(outletId, 'cash');
      // Map database format to component format
      const mappedSales: SavedSale[] = data.map((sale: DatabaseSavedSale) => ({
        id: sale.id || '',
        invoiceNumber: sale.invoice_number,
        date: sale.sale_date || sale.created_at || '',
        customer: sale.customer || 'Unknown',
        items: sale.items || [],
        subtotal: sale.subtotal,
        tax: sale.tax,
        total: sale.total,
        paymentMethod: sale.payment_method,
        status: sale.status
      }));
      setSales(mappedSales);
    } catch (error) {
      console.error('Error fetching saved cash sales:', error);
      toast({
        title: "Error",
        description: "Failed to fetch saved cash sales",
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

  const handlePrint = (sale: SavedSale) => {
    // Create a printable receipt
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const itemsHtml = sale.items.map(item => 
        `<tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.name}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${formatCurrency(item.price)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${formatCurrency(item.price * item.quantity)}</td>
        </tr>`
      ).join('');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Receipt - ${sale.invoiceNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 400px; margin: 0 auto; }
            h2 { text-align: center; margin-bottom: 5px; }
            .header { text-align: center; margin-bottom: 20px; }
            .info { margin-bottom: 15px; }
            .info p { margin: 5px 0; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            th { background: #f5f5f5; padding: 8px; text-align: left; }
            .totals { margin-top: 15px; }
            .totals p { margin: 5px 0; display: flex; justify-content: space-between; }
            .total-row { font-weight: bold; font-size: 18px; border-top: 2px solid #000; padding-top: 10px; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            .payment-badge { display: inline-block; padding: 4px 12px; background: #dcfce7; color: #166534; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>SALES RECEIPT</h2>
            <p style="color: #666;">${sale.invoiceNumber}</p>
          </div>
          
          <div class="info">
            <p><strong>Date:</strong> ${sale.date}</p>
            <p><strong>Customer:</strong> ${sale.customer || 'Walk-in Customer'}</p>
            <p><strong>Payment:</strong> <span class="payment-badge">Cash</span></p>
          </div>

          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="totals">
            <p><span>Subtotal:</span><span>${formatCurrency(sale.subtotal)}</span></p>
            <p><span>Tax (18%):</span><span>${formatCurrency(sale.tax)}</span></p>
            <p class="total-row"><span>Total:</span><span>${formatCurrency(sale.total)}</span></p>
          </div>

          <div class="footer">
            <p>Thank you for your purchase!</p>
            <p>Payment Method: Cash</p>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleDelete = async (saleId: string) => {
    try {
      const success = await deleteSavedSale(saleId);
      if (success) {
        const updatedSales = sales.filter(s => s.id !== saleId);
        setSales(updatedSales);
        toast({
          title: "Sale Deleted",
          description: "The cash sale has been removed"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to delete sale record",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error deleting sale:', error);
      toast({
        title: "Error",
        description: "Failed to delete sale record",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Banknote className="h-6 w-6" />
            Saved Cash Sales
          </h1>
          <p className="text-muted-foreground">View and manage saved cash transactions</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {sales.length} Sales
        </Badge>
      </div>

      {/* Sales List */}
      <div className="space-y-4">
        {/* Date Range Filter + Search Bar + Actions - Side by Side */}
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
              <DropdownMenuItem onClick={handlePrintReport}>
                <Printer className="h-4 w-4 mr-2" />
                <span>Print</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                <span>Download</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportXLS}>
                <FileText className="h-4 w-4 mr-2" />
                <span>Export to XLS</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSharePDF}>
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
              <h3 className="text-lg font-medium">Loading Cash Sales...</h3>
              <p className="text-muted-foreground">Fetching cash sales from database</p>
            </CardContent>
          </Card>
        ) : sales.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Banknote className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Saved Cash Sales</h3>
              <p className="text-muted-foreground">Cash transactions will appear here after completion</p>
            </CardContent>
          </Card>
        ) : (
          // Filter sales by date range and search term
          (() => {
            const filteredSales = getFilteredSales();
            
            return filteredSales.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No sales found</h3>
                  <p className="text-muted-foreground">Try adjusting your search or date range</p>
                </CardContent>
              </Card>
            ) : (
              filteredSales.map((sale) => (
            <Card key={sale.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-semibold">{sale.invoiceNumber}</span>
                      <Badge className="bg-green-100 text-green-800">{sale.status}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span>{sale.date}</span>
                      <span className="mx-2">•</span>
                      <span>{sale.customer || 'Walk-in Customer'}</span>
                      <span className="mx-2">•</span>
                      <span>{sale.items.length} items</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">{formatCurrency(sale.total)}</p>
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
          ))
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
              Sale Details
            </DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-4">
              {/* Invoice Info */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Invoice Number</p>
                  <p className="font-semibold">{selectedSale.invoiceNumber}</p>
                </div>
                <Badge className="bg-green-100 text-green-800">{selectedSale.status}</Badge>
              </div>

              {/* Date & Customer */}
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
                    <p className="text-sm font-medium">{selectedSale.customer || 'Walk-in Customer'}</p>
                  </div>
                </div>
              </div>

              {/* Items */}
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

              {/* Totals */}
              <div className="space-y-2 pt-2 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(selectedSale.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax (18%)</span>
                  <span>{formatCurrency(selectedSale.tax)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total</span>
                  <span className="text-green-600">{formatCurrency(selectedSale.total)}</span>
                </div>
              </div>

              {/* Payment Method */}
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium">Payment Method</span>
                <Badge className="bg-green-100 text-green-800">
                  <Banknote className="h-3 w-3 mr-1" />
                  Cash
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
