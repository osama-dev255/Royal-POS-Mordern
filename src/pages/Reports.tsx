import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileText, 
  Printer, 
  Download, 
  BarChart3, 
  Package, 
  Users, 
  Truck, 
  Wallet,
  Calendar,
  FileSpreadsheet
} from "lucide-react";
import { ExportUtils } from '@/utils/exportUtils';
import { PrintUtils } from '@/utils/printUtils';
import { ExcelUtils } from '@/utils/excelUtils';
import { getSavedInvoices } from '@/utils/invoiceUtils';
import { formatCurrency } from '@/lib/currency';

interface ReportsProps {
  username: string;
  onBack: () => void;
  onLogout: () => void;
}

// Mock data for reports
const mockProducts = [
  { id: "1", name: "Wireless Headphones", category: "Electronics", price: 99.99, cost: 45.00, stock: 25, barcode: "123456789012" },
  { id: "2", name: "Coffee Maker", category: "Home & Garden", price: 79.99, cost: 35.00, stock: 15, barcode: "234567890123" },
  { id: "3", name: "Running Shoes", category: "Sports & Outdoors", price: 129.99, cost: 65.00, stock: 30, barcode: "345678901234" },
];

const mockCustomers = [
  { id: "1", name: "John Smith", email: "john@example.com", phone: "(555) 123-4567", loyaltyPoints: 150, totalSpent: 1250.75 },
  { id: "2", name: "Sarah Johnson", email: "sarah@example.com", phone: "(555) 987-6543", loyaltyPoints: 320, totalSpent: 2100.50 },
  { id: "3", name: "Mike Williams", email: "mike@example.com", phone: "(555) 456-7890", loyaltyPoints: 75, totalSpent: 420.25 },
];

const mockSuppliers = [
  { id: "1", name: "Tech Distributors Inc.", contactPerson: "Robert Chen", email: "robert@techdistributors.com", phone: "(555) 123-4567", products: ["Electronics", "Accessories"] },
  { id: "2", name: "Global Home Goods", contactPerson: "Maria Garcia", email: "maria@globalhome.com", phone: "(555) 987-6543", products: ["Home & Garden", "Kitchenware"] },
];

const mockExpenses = [
  { id: "1", date: "2023-05-15", category: "Rent", description: "Monthly office rent", amount: 2500.00, paymentMethod: "Bank Transfer", status: "paid" },
  { id: "2", date: "2023-05-10", category: "Supplies", description: "Office supplies and equipment", amount: 350.75, paymentMethod: "Credit Card", status: "paid" },
];

const mockTransactions = [
  { id: "TXN-001", date: "2023-05-18T14:30:00Z", customer: "John Smith", items: 3, total: 159.97, paymentMethod: "Cash", status: "completed" },
  { id: "TXN-002", date: "2023-05-18T11:15:00Z", customer: "Sarah Johnson", items: 1, total: 699.99, paymentMethod: "Credit Card", status: "completed" },
];

export const Reports = ({ username, onBack, onLogout }: ReportsProps) => {
  const [dateRange, setDateRange] = useState("this-month");
  const [reportType, setReportType] = useState("sales");
  const [savedInvoices, setSavedInvoices] = useState<any[]>([]);
  const [loadingSavedInvoices, setLoadingSavedInvoices] = useState(false);

  // Helper function to format dates
  const formatDate = (dateValue: string | Date | undefined): string => {
    if (!dateValue) return 'N/A';
    try {
      if (typeof dateValue === 'string') {
        return new Date(dateValue).toLocaleDateString();
      }
      return dateValue.toLocaleDateString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // Load saved invoices when report type is changed to saved-invoices
  useEffect(() => {
    if (reportType === "saved-invoices") {
      setLoadingSavedInvoices(true);
      const loadInvoices = async () => {
        try {
          const invoices = await getSavedInvoices();
          setSavedInvoices(invoices);
        } catch (error) {
          console.error('Error loading saved invoices:', error);
          setSavedInvoices([]);
        } finally {
          setLoadingSavedInvoices(false);
        }
      };
      
      loadInvoices();
    } else {
      // Clear saved invoices when switching away from saved-invoices report
      setSavedInvoices([]);
      setLoadingSavedInvoices(false);
    }
  }, [reportType]);

  // Handle export
  const handleExport = (format: string) => {
    const filename = `report_${reportType}_${new Date().toISOString().split('T')[0]}`;
    
    switch (reportType) {
      case "inventory":
        if (format === "csv") ExportUtils.exportToCSV(mockProducts, filename);
        else if (format === "excel") ExcelUtils.exportToExcel(mockProducts, filename);
        else if (format === "pdf") PrintUtils.printSalesReport(mockProducts);
        break;
      case "customers":
        if (format === "csv") ExportUtils.exportToCSV(mockCustomers, filename);
        else if (format === "excel") ExcelUtils.exportToExcel(mockCustomers, filename);
        else if (format === "pdf") ExportUtils.exportToPDF(mockCustomers, filename, "Customer Report");
        break;
      case "suppliers":
        if (format === "csv") ExportUtils.exportToCSV(mockSuppliers, filename);
        else if (format === "excel") ExcelUtils.exportToExcel(mockSuppliers, filename);
        else if (format === "pdf") ExportUtils.exportToPDF(mockSuppliers, filename, "Supplier Report");
        break;
      case "expenses":
        if (format === "csv") ExportUtils.exportToCSV(mockExpenses, filename);
        else if (format === "excel") ExcelUtils.exportToExcel(mockExpenses, filename);
        else if (format === "pdf") ExportUtils.exportToPDF(mockExpenses, filename, "Expense Report");
        break;
      case "sales":
      default:
        if (format === "csv") ExportUtils.exportToCSV(mockTransactions, filename);
        else if (format === "excel") ExcelUtils.exportToExcel(mockTransactions, filename);
        else if (format === "pdf") PrintUtils.printSalesReport(mockTransactions);
        break;
      case "saved-invoices":
        if (format === "csv") ExportUtils.exportToCSV(savedInvoices, filename);
        else if (format === "excel") ExcelUtils.exportToExcel(savedInvoices, filename);
        else if (format === "pdf") ExportUtils.exportToPDF(savedInvoices, filename, "Saved Invoices Report");
        break;
    }
  };

  // Get report title
  const getReportTitle = () => {
    switch (reportType) {
      case "inventory": return "Inventory Report";
      case "customers": return "Customer Report";
      case "suppliers": return "Supplier Report";
      case "expenses": return "Expense Report";
      case "sales": 
      case "saved-invoices": return "Saved Invoices Report";
      default: return "Sales Report";
    }
  };

  // Render report preview based on selected type
  const renderReportPreview = () => {
    switch (reportType) {
      case "inventory":
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b">
                  <th className="pb-2">Product</th>
                  <th className="pb-2">Category</th>
                  <th className="pb-2 text-right">Price</th>
                  <th className="pb-2 text-right">Stock</th>
                </tr>
              </thead>
              <tbody>
                {mockProducts.map((product) => (
                  <tr key={product.id} className="border-b">
                    <td className="py-2">{product.name}</td>
                    <td className="py-2">{product.category}</td>
                    <td className="py-2 text-right">{formatCurrency(product.price)}</td>
                    <td className="py-2 text-right">{product.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      
      case "customers":
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b">
                  <th className="pb-2">Customer</th>
                  <th className="pb-2">Contact</th>
                  <th className="pb-2 text-right">Loyalty Points</th>
                  <th className="pb-2 text-right">Total Spent</th>
                </tr>
              </thead>
              <tbody>
                {mockCustomers.map((customer) => (
                  <tr key={customer.id} className="border-b">
                    <td className="py-2">{customer.name}</td>
                    <td className="py-2">
                      <div>{customer.email}</div>
                      <div className="text-sm text-muted-foreground">{customer.phone}</div>
                    </td>
                    <td className="py-2 text-right">{customer.loyaltyPoints}</td>
                    <td className="py-2 text-right">{formatCurrency(customer.totalSpent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      
      case "suppliers":
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b">
                  <th className="pb-2">Supplier</th>
                  <th className="pb-2">Contact Person</th>
                  <th className="pb-2">Contact</th>
                  <th className="pb-2">Products</th>
                </tr>
              </thead>
              <tbody>
                {mockSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="border-b">
                    <td className="py-2">{supplier.name}</td>
                    <td className="py-2">{supplier.contactPerson}</td>
                    <td className="py-2">
                      <div>{supplier.email}</div>
                      <div className="text-sm text-muted-foreground">{supplier.phone}</div>
                    </td>
                    <td className="py-2">{supplier.products.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      
      case "expenses":
        const totalExpenses = mockExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        return (
          <div>
            <div className="mb-4 p-4 bg-muted rounded-lg">
              <div className="flex justify-between">
                <span>Total Expenses:</span>
                <span className="font-bold">{formatCurrency(totalExpenses)}</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b">
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Category</th>
                    <th className="pb-2">Description</th>
                    <th className="pb-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {mockExpenses.map((expense) => (
                    <tr key={expense.id} className="border-b">
                      <td className="py-2">{expense.date}</td>
                      <td className="py-2">{expense.category}</td>
                      <td className="py-2">{expense.description}</td>
                      <td className="py-2 text-right font-medium">{formatCurrency(expense.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      
      case "sales":
      default:
        const totalSales = mockTransactions.reduce((sum, transaction) => sum + transaction.total, 0);
        return (
          <div>
            <div className="mb-4 p-4 bg-muted rounded-lg">
              <div className="flex justify-between">
                <span>Total Sales:</span>
                <span className="font-bold">{formatCurrency(totalSales)}</span>
              </div>
              <div className="flex justify-between mt-2">
                <span>Total Transactions:</span>
                <span className="font-bold">{mockTransactions.length}</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b">
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Customer</th>
                    <th className="pb-2">Items</th>
                    <th className="pb-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {mockTransactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b">
                      <td className="py-2">{new Date(transaction.date).toLocaleDateString()}</td>
                      <td className="py-2">{transaction.customer}</td>
                      <td className="py-2">{transaction.items} items</td>
                      <td className="py-2 text-right font-medium">{formatCurrency(transaction.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case "saved-invoices":
        if (loadingSavedInvoices) {
          return (
            <div className="flex justify-center items-center h-64">
              <p>Loading saved invoices...</p>
            </div>
          );
        }
        
        if (savedInvoices.length === 0) {
          return (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Saved Invoices</h3>
              <p className="text-muted-foreground mb-4">
                You haven't saved any invoices yet.
              </p>
              <p className="text-sm text-muted-foreground">
                Invoices are automatically saved when you complete a transaction in the Sales Terminal.
              </p>
            </div>
          );
        }
        
        const totalInvoices = savedInvoices.reduce((sum, invoice) => sum + (invoice.total || 0), 0);
        return (
          <div>
            <div className="mb-4 p-4 bg-muted rounded-lg">
              <div className="flex justify-between">
                <span>Total Invoices:</span>
                <span className="font-bold">{savedInvoices.length}</span>
              </div>
              <div className="flex justify-between mt-2">
                <span>Total Amount:</span>
                <span className="font-bold">{formatCurrency(totalInvoices)}</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b">
                    <th className="pb-2">Invoice #</th>
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Customer</th>
                    <th className="pb-2">Items</th>
                    <th className="pb-2 text-right">Total</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {savedInvoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b">
                      <td className="py-2">#{invoice.invoiceNumber}</td>
                      <td className="py-2">{formatDate(invoice.date)}</td>
                      <td className="py-2">{invoice.customer}</td>
                      <td className="py-2">{invoice.items || 0} items</td>
                      <td className="py-2 text-right font-medium">{formatCurrency(invoice.total || 0)}</td>
                      <td className="py-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          invoice.status === 'completed' ? 'bg-green-100 text-green-800' :
                          invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          invoice.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {invoice.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation 
        title="Reports & Exports" 
        onBack={onBack}
        onLogout={onLogout} 
        username={username}
      />
      
      <main className="container mx-auto p-6">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Reports & Exports</h2>
          <p className="text-muted-foreground">
            Generate and export business reports
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Report Configuration */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Report Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Report Type</label>
                  <Select value={reportType} onValueChange={setReportType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="h-4 w-4" />
                          Sales Report
                        </div>
                      </SelectItem>
                      <SelectItem value="inventory">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          Inventory Report
                        </div>
                      </SelectItem>
                      <SelectItem value="customers">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Customer Report
                        </div>
                      </SelectItem>
                      <SelectItem value="suppliers">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4" />
                          Supplier Report
                        </div>
                      </SelectItem>
                      <SelectItem value="expenses">
                        <div className="flex items-center gap-2">
                          <Wallet className="h-4 w-4" />
                          Expense Report
                        </div>
                      </SelectItem>
                      <SelectItem value="saved-invoices">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Saved Invoices Report
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date Range</label>
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger>
                      <Calendar className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="yesterday">Yesterday</SelectItem>
                      <SelectItem value="this-week">This Week</SelectItem>
                      <SelectItem value="this-month">This Month</SelectItem>
                      <SelectItem value="last-month">Last Month</SelectItem>
                      <SelectItem value="this-year">This Year</SelectItem>
                      <SelectItem value="all-time">All Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="pt-4">
                  <h3 className="font-medium mb-3">Export Options</h3>
                  <div className="flex flex-col gap-3">
                    <Button 
                      onClick={() => handleExport("pdf")}
                      className="w-full"
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Print Report
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => handleExport("csv")}
                      className="w-full"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export as CSV
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => handleExport("excel")}
                      className="w-full"
                    >
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Export as Excel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Report Preview */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  {getReportTitle()} Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg p-4 min-h-[400px]">
                  {renderReportPreview()}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};