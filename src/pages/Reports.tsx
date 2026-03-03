import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  FileSpreadsheet,
  TruckIcon,
  AlertTriangle,
  TrendingUp
} from "lucide-react";
import { ExportUtils } from '@/utils/exportUtils';
import { PrintUtils } from '@/utils/printUtils';
import { ExcelUtils } from '@/utils/excelUtils';
import { getSavedInvoices } from "@/utils/invoiceUtils";
import { getSavedSettlements } from "@/utils/customerSettlementUtils";
import { getSavedDeliveries } from '@/utils/deliveryUtils';
import { getProducts, getInventoryStats } from '@/services/databaseService';
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
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [useCustomDates, setUseCustomDates] = useState(false);
  const [reportType, setReportType] = useState("sales");
  const [savedInvoices, setSavedInvoices] = useState<any[]>([]);
  const [savedSettlements, setSavedSettlements] = useState<any[]>([]);
  const [savedDeliveries, setSavedDeliveries] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [inventoryStats, setInventoryStats] = useState({
    totalProducts: 0,
    totalValue: 0,
    lowStockItems: 0,
    outOfStockItems: 0
  });
  const [loadingSavedInvoices, setLoadingSavedInvoices] = useState(false);
  const [loadingSavedSettlements, setLoadingSavedSettlements] = useState(false);
  const [loadingSavedDeliveries, setLoadingSavedDeliveries] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

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

  // Helper function to check if a date falls within the selected date range
  const isDateInRange = (dateValue: string | Date | undefined): boolean => {
    if (!dateValue) return false;
    
    try {
      const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      // If using custom dates, check against custom range
      if (useCustomDates && customStartDate && customEndDate) {
        const startDate = new Date(customStartDate);
        const endDate = new Date(customEndDate);
        // Set end date to end of day
        endDate.setHours(23, 59, 59, 999);
        return date >= startDate && date <= endDate;
      }
      
      switch (dateRange) {
        case "today":
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          return date >= today && date < tomorrow;
          
        case "yesterday":
          const yesterdayStart = new Date(today);
          yesterdayStart.setDate(yesterdayStart.getDate() - 1);
          const todayStart = new Date(today);
          return date >= yesterdayStart && date < todayStart;
          
        case "this-week":
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return date >= weekAgo && date <= today;
          
        case "this-month":
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          return date >= monthStart && date <= today;
          
        case "last-month":
          const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          return date >= lastMonthStart && date < thisMonthStart;
          
        case "this-year":
          const yearStart = new Date(now.getFullYear(), 0, 1);
          return date >= yearStart && date <= today;
          
        case "all-time":
          return true;
          
        default:
          return true;
      }
    } catch (error) {
      console.error('Error parsing date:', error);
      return false;
    }
  };

  // Filter data based on date range
  const filterDataByDateRange = (data: any[], dateField: string = 'date'): any[] => {
    if (dateRange === "all-time") return data;
    return data.filter(item => isDateInRange(item[dateField]));
  };

  // Load saved data when report type is changed
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
    } else if (reportType === "saved-customer-settlements") {
      setLoadingSavedSettlements(true);
      const loadSettlements = async () => {
        try {
          const settlements = await getSavedSettlements();
          setSavedSettlements(settlements);
        } catch (error) {
          console.error('Error loading saved settlements:', error);
          setSavedSettlements([]);
        } finally {
          setLoadingSavedSettlements(false);
        }
      };
      
      loadSettlements();
    } else if (reportType === "saved-deliveries") {
      setLoadingSavedDeliveries(true);
      const loadDeliveries = async () => {
        try {
          const deliveries = await getSavedDeliveries();
          setSavedDeliveries(deliveries);
        } catch (error) {
          console.error('Error loading saved deliveries:', error);
          setSavedDeliveries([]);
        } finally {
          setLoadingSavedDeliveries(false);
        }
      };
      
      loadDeliveries();
    } else if (reportType === "inventory") {
      setLoadingProducts(true);
      const loadInventoryData = async () => {
        try {
          // Load products
          const fetchedProducts = await getProducts();
          setProducts(fetchedProducts);
          
          // Load inventory statistics
          const stats = await getInventoryStats();
          setInventoryStats(stats);
        } catch (error) {
          console.error('Error loading inventory data:', error);
          setProducts([]);
          setInventoryStats({
            totalProducts: 0,
            totalValue: 0,
            lowStockItems: 0,
            outOfStockItems: 0
          });
        } finally {
          setLoadingProducts(false);
        }
      };
      
      loadInventoryData();
    } else {
      // Clear saved data when switching away from these reports
      setSavedInvoices([]);
      setLoadingSavedInvoices(false);
      setSavedSettlements([]);
      setLoadingSavedSettlements(false);
      setSavedDeliveries([]);
      setLoadingSavedDeliveries(false);
      setProducts([]);
      setInventoryStats({
        totalProducts: 0,
        totalValue: 0,
        lowStockItems: 0,
        outOfStockItems: 0
      });
      setLoadingProducts(false);
    }
  }, [reportType]);

  // Handle export
  const handleExport = (format: string) => {
    const filename = `report_${reportType}_${dateRange}_${new Date().toISOString().split('T')[0]}`;
    
    switch (reportType) {
      case "inventory":
        // Inventory doesn't have dates, export all data
        const inventoryExportData = products.map((product: any) => ({
          productName: product.name,
          category: product.category_id || 'N/A',
          sku: product.sku || 'N/A',
          barcode: product.barcode || 'N/A',
          currentStock: product.stock_quantity,
          minStockLevel: product.min_stock_level || 0,
          maxStockLevel: product.max_stock_level || 0,
          unitOfMeasure: product.unit_of_measure || 'piece',
          costPrice: product.cost_price,
          sellingPrice: product.selling_price,
          wholesalePrice: product.wholesale_price || 0,
          totalValue: product.selling_price * product.stock_quantity,
          status: product.is_active ? 'Active' : 'Inactive'
        }));
        if (format === "csv") ExportUtils.exportToCSV(inventoryExportData, filename);
        else if (format === "excel") ExcelUtils.exportToExcel(inventoryExportData, filename);
        else if (format === "pdf") ExportUtils.exportToPDF(inventoryExportData, filename, 'Inventory Report');
        break;
      case "customers":
        // Customers don't have dates, export all data
        if (format === "csv") ExportUtils.exportToCSV(mockCustomers, filename);
        else if (format === "excel") ExcelUtils.exportToExcel(mockCustomers, filename);
        else if (format === "pdf") ExportUtils.exportToPDF(mockCustomers, filename, "Customer Report");
        break;
      case "suppliers":
        // Suppliers don't have dates, export all data
        if (format === "csv") ExportUtils.exportToCSV(mockSuppliers, filename);
        else if (format === "excel") ExcelUtils.exportToExcel(mockSuppliers, filename);
        else if (format === "pdf") ExportUtils.exportToPDF(mockSuppliers, filename, "Supplier Report");
        break;
      case "expenses":
        const filteredExpenses = filterDataByDateRange(mockExpenses, 'date');
        if (format === "csv") ExportUtils.exportToCSV(filteredExpenses, filename);
        else if (format === "excel") ExcelUtils.exportToExcel(filteredExpenses, filename);
        else if (format === "pdf") ExportUtils.exportToPDF(filteredExpenses, filename, "Expense Report");
        break;
      case "sales":
      default:
        const filteredTransactions = filterDataByDateRange(mockTransactions, 'date');
        if (format === "csv") ExportUtils.exportToCSV(filteredTransactions, filename);
        else if (format === "excel") ExcelUtils.exportToExcel(filteredTransactions, filename);
        else if (format === "pdf") ExportUtils.exportToPDF(filteredTransactions, filename, 'Sales Report');
        break;
      case "saved-invoices":
        const filteredSavedInvoices = filterDataByDateRange(savedInvoices, 'date');
        if (format === "csv") ExportUtils.exportToCSV(filteredSavedInvoices, filename);
        else if (format === "excel") ExcelUtils.exportToExcel(filteredSavedInvoices, filename);
        else if (format === "pdf") ExportUtils.exportToPDF(filteredSavedInvoices, filename, "Saved Invoices Report");
        break;
      case "saved-customer-settlements":
        const filteredSavedSettlements = filterDataByDateRange(savedSettlements, 'date');
        if (format === "csv") ExportUtils.exportToCSV(filteredSavedSettlements, filename);
        else if (format === "excel") ExcelUtils.exportToExcel(filteredSavedSettlements, filename);
        else if (format === "pdf") ExportUtils.exportToPDF(filteredSavedSettlements, filename, "Saved Customer Settlements Report");
        break;
      case "saved-deliveries":
        const filteredSavedDeliveriesForExport = filterDataByDateRange(savedDeliveries, 'date');
        // Transform data for export to ensure consistent field names
        const exportData = filteredSavedDeliveriesForExport.map((delivery: any) => ({
          deliveryNoteNumber: delivery.deliveryNoteNumber || 'N/A',
          date: formatDate(delivery.date),
          customer: delivery.customer || 'N/A',
          items: delivery.items || 0,
          total: delivery.total || 0,
          vehicle: delivery.vehicle || 'N/A',
          driver: delivery.driver || 'N/A',
          status: delivery.status || 'N/A',
          paymentMethod: delivery.paymentMethod || 'N/A'
        }));
        if (format === "csv") ExportUtils.exportToCSV(exportData, filename);
        else if (format === "excel") ExcelUtils.exportToExcel(exportData, filename);
        else if (format === "pdf") ExportUtils.exportToPDF(exportData, filename, "Saved Deliveries Report");
        break;
    }
  };

  // Handle print report
  const handlePrint = () => {
    try {
      let reportData: any = {};
        
      switch (reportType) {
        case "inventory":
          // Inventory doesn't have dates, print all data
          const inventoryPrintData = products.map((product: any) => ({
            productName: product.name,
            category: product.category_id || 'N/A',
            sku: product.sku || 'N/A',
            barcode: product.barcode || 'N/A',
            currentStock: product.stock_quantity,
            minStockLevel: product.min_stock_level || 0,
            unitOfMeasure: product.unit_of_measure || 'piece',
            costPrice: formatCurrency(product.cost_price),
            sellingPrice: formatCurrency(product.selling_price),
            wholesalePrice: formatCurrency(product.wholesale_price || 0),
            totalValue: formatCurrency(product.selling_price * product.stock_quantity),
            status: product.is_active ? 'Active' : 'Inactive'
          }));
          reportData = {
            title: "Inventory Report",
            period: `As of ${new Date().toLocaleDateString()}`,
            data: inventoryPrintData,
            summary: {
              totalProducts: inventoryStats.totalProducts,
              totalValue: formatCurrency(inventoryStats.totalValue),
              lowStockItems: inventoryStats.lowStockItems,
              outOfStockItems: inventoryStats.outOfStockItems
            }
          };
          break;
        case "customers":
          // Customers don't have dates, print all data
          reportData = {
            title: "Customer Report",
            period: `As of ${new Date().toLocaleDateString()}`,
            data: mockCustomers.map((customer: any) => ({
              customerName: customer.name,
              email: customer.email,
              phone: customer.phone,
              loyaltyPoints: customer.loyaltyPoints,
              totalSpent: formatCurrency(customer.totalSpent)
            }))
          };
          break;
        case "suppliers":
          // Suppliers don't have dates, print all data
          reportData = {
            title: "Supplier Report",
            period: `As of ${new Date().toLocaleDateString()}`,
            data: mockSuppliers.map((supplier: any) => ({
              supplierName: supplier.name,
              contactPerson: supplier.contactPerson,
              email: supplier.email,
              phone: supplier.phone,
              products: supplier.products.join(', ')
            }))
          };
          break;
        case "expenses":
          const filteredExpenses = filterDataByDateRange(mockExpenses, 'date');
          reportData = {
            title: "Expense Report",
            period: `${dateRange} (${new Date().toLocaleDateString()})`,
            data: filteredExpenses.map((expense: any) => ({
              date: expense.date,
              category: expense.category,
              description: expense.description,
              amount: formatCurrency(expense.amount),
              amountRaw: expense.amount, // Raw value for calculations
              paymentMethod: expense.paymentMethod,
              status: expense.status
            }))
          };
          break;
        case "sales":
        default:
          const filteredTransactions = filterDataByDateRange(mockTransactions, 'date');
          reportData = {
            title: "Sales Report",
            period: `${dateRange} (${new Date().toLocaleDateString()})`,
            data: filteredTransactions.map((transaction: any) => ({
              transactionId: transaction.id || 'N/A',
              date: transaction.date ? new Date(transaction.date).toLocaleDateString() : 'N/A',
              customer: transaction.customer || 'N/A',
              items: transaction.items || 0,
              total: formatCurrency(transaction.total || 0),
              totalRaw: transaction.total || 0, // Raw value for calculations
              paymentMethod: transaction.paymentMethod || 'N/A',
              status: transaction.status || 'N/A'
            }))
          };
          break;
        case "saved-invoices":
          const filteredSavedInvoices = filterDataByDateRange(savedInvoices, 'date');
          console.log('Saved Invoices Data:', filteredSavedInvoices);
          reportData = {
            title: "Saved Invoices Report",
            period: `${dateRange} (${new Date().toLocaleDateString()})`,
            data: filteredSavedInvoices.map((invoice: any) => ({
              invoiceNumber: invoice.invoiceNumber || 'N/A',
              date: formatDate(invoice.date),
              customer: invoice.customer || 'N/A',
              items: invoice.items || invoice.itemsList?.length || 0,
              total: formatCurrency(invoice.total || invoice.amountDue || 0),
              totalRaw: invoice.total || invoice.amountDue || 0, // Raw value for calculations
              status: invoice.status || 'N/A'
            }))
          };
          console.log('Formatted Report Data:', reportData);
          break;
        case "saved-customer-settlements":
          const filteredSavedSettlements = filterDataByDateRange(savedSettlements, 'date');
          reportData = {
            title: "Saved Customer Settlements Report",
            period: `${dateRange} (${new Date().toLocaleDateString()})`,
            data: filteredSavedSettlements.map((settlement: any) => ({
              reference: settlement.referenceNumber,
              date: formatDate(settlement.date),
              customer: settlement.customerName,
              previousBalance: settlement.previousBalance !== undefined ? formatCurrency(settlement.previousBalance) : 'N/A',
              previousBalanceRaw: settlement.previousBalance, // Raw value for calculations
              amountPaid: formatCurrency(settlement.settlementAmount),
              amountPaidRaw: settlement.settlementAmount, // Raw value for calculations
              newBalance: settlement.newBalance !== undefined ? formatCurrency(settlement.newBalance) : 'N/A',
              newBalanceRaw: settlement.newBalance, // Raw value for calculations
              paymentMethod: settlement.paymentMethod,
              status: settlement.status || 'completed'
            }))
          };
          break;
        case "saved-deliveries":
          const filteredSavedDeliveriesForPrint = filterDataByDateRange(savedDeliveries, 'date');
          console.log('Saved Deliveries Data for Print:', filteredSavedDeliveriesForPrint);
          reportData = {
            title: "Saved Deliveries Report",
            period: `${dateRange} (${new Date().toLocaleDateString()})`,
            data: filteredSavedDeliveriesForPrint.map((delivery: any) => ({
              deliveryNoteNumber: delivery.deliveryNoteNumber || 'N/A',
              date: formatDate(delivery.date),
              customer: delivery.customer || 'N/A',
              items: delivery.items || delivery.itemsList?.length || 0,
              total: formatCurrency(delivery.total || 0),
              totalRaw: delivery.total || 0, // Raw value for calculations
              vehicle: delivery.vehicle || 'N/A',
              driver: delivery.driver || 'N/A',
              status: delivery.status || 'N/A',
              paymentMethod: delivery.paymentMethod || 'N/A'
            }))
          };
          console.log('Formatted Saved Deliveries Report Data:', reportData);
          break;
      }
        
      // Validate that we have data to print
      if (!reportData.data || reportData.data.length === 0) {
        console.warn(`No data available to print for report type: ${reportType}`);
        // Create a default message if no data
        reportData = {
          title: reportData.title || `${getReportTitle()} - No Data`,
          period: reportData.period || `As of ${new Date().toLocaleDateString()}`,
          data: [{ message: 'No data available for the selected date range' }]
        };
      }
        
      // Use PrintUtils to print the report
      PrintUtils.printFinancialReport(reportData);
    } catch (error) {
      console.error('Error in handlePrint:', error);
      alert('There was an error generating the report. Please try again.');
    }
  };

  // Get report title
  const getReportTitle = () => {
    switch (reportType) {
      case "inventory": return "Inventory Report";
      case "customers": return "Customer Report";
      case "suppliers": return "Supplier Report";
      case "expenses": return "Expense Report";
      case "sales": return "Sales Report";
      case "saved-invoices": return "Saved Invoices Report";
      case "saved-customer-settlements": return "Saved Customer Settlements Report";
      case "saved-deliveries": return "Saved Deliveries Report";
      default: return "Sales Report";
    }
  };

  // Render report preview based on selected type
  const renderReportPreview = () => {
    switch (reportType) {
      case "inventory":
        if (loadingProducts) {
          return (
            <div className="flex justify-center items-center h-64">
              <p>Loading inventory data...</p>
            </div>
          );
        }
        
        if (products.length === 0) {
          return (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Inventory Data Found</h3>
              <p className="text-muted-foreground mb-4">
                No products found in the inventory.
              </p>
              <p className="text-sm text-muted-foreground">
                Add products to your inventory to generate reports.
              </p>
            </div>
          );
        }
        
        // Calculate additional statistics
        const totalInventoryValue = products.reduce((sum, product) => sum + (product.selling_price * product.stock_quantity), 0);
        const totalCostValue = products.reduce((sum, product) => sum + (product.cost_price * product.stock_quantity), 0);
        const potentialProfit = totalInventoryValue - totalCostValue;
        
        return (
          <div>
            {/* Inventory Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{inventoryStats.totalProducts}</div>
                  <p className="text-xs text-muted-foreground">Active inventory items</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(totalInventoryValue)}</div>
                  <p className="text-xs text-muted-foreground">Based on selling prices</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{inventoryStats.lowStockItems}</div>
                  <p className="text-xs text-muted-foreground">Below minimum level</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{inventoryStats.outOfStockItems}</div>
                  <p className="text-xs text-muted-foreground">Zero quantity items</p>
                </CardContent>
              </Card>
            </div>
            
            {/* Potential Profit */}
            <div className="mb-6 p-4 bg-muted rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Potential Profit (if all sold):</span>
                <span className="text-xl font-bold text-green-600">{formatCurrency(potentialProfit)}</span>
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Based on current inventory levels and selling prices
              </div>
            </div>
            
            {/* Inventory Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b">
                    <th className="pb-2">Product</th>
                    <th className="pb-2">SKU</th>
                    <th className="pb-2">Category</th>
                    <th className="pb-2">Current Stock</th>
                    <th className="pb-2">Min Stock</th>
                    <th className="pb-2 text-right">Cost Price</th>
                    <th className="pb-2 text-right">Selling Price</th>
                    <th className="pb-2 text-right">Total Value</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => {
                    const isLowStock = product.stock_quantity <= (product.min_stock_level || 10);
                    const isOutOfStock = product.stock_quantity === 0;
                    const totalValue = product.selling_price * product.stock_quantity;
                    
                    return (
                      <tr key={product.id} className="border-b">
                        <td className="py-2">
                          <div className="font-medium">{product.name}</div>
                          <div className="text-sm text-muted-foreground">{product.barcode || 'No barcode'}</div>
                        </td>
                        <td className="py-2">{product.sku || 'N/A'}</td>
                        <td className="py-2">{product.category_id || 'N/A'}</td>
                        <td className="py-2">
                          <span className={`font-medium ${
                            isOutOfStock ? 'text-red-600' : 
                            isLowStock ? 'text-yellow-600' : 
                            'text-green-600'
                          }`}>
                            {product.stock_quantity} {product.unit_of_measure || 'pieces'}
                          </span>
                        </td>
                        <td className="py-2">{product.min_stock_level || 0}</td>
                        <td className="py-2 text-right">{formatCurrency(product.cost_price)}</td>
                        <td className="py-2 text-right">{formatCurrency(product.selling_price)}</td>
                        <td className="py-2 text-right font-medium">{formatCurrency(totalValue)}</td>
                        <td className="py-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            product.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {product.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      
      case "customers":
        // Customers don't typically have dates, so show all data
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
        // Suppliers don't typically have dates, so show all data
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
        const filteredExpenses = filterDataByDateRange(mockExpenses, 'date');
        const totalFilteredExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        return (
          <div>
            <div className="mb-4 p-4 bg-muted rounded-lg">
              <div className="flex justify-between">
                <span>Total Expenses ({dateRange}):</span>
                <span className="font-bold">{formatCurrency(totalFilteredExpenses)}</span>
              </div>
              <div className="flex justify-between mt-2">
                <span>Number of Expenses:</span>
                <span className="font-bold">{filteredExpenses.length}</span>
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
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-muted-foreground">
                        No expenses found for the selected date range
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((expense) => (
                      <tr key={expense.id} className="border-b">
                        <td className="py-2">{expense.date}</td>
                        <td className="py-2">{expense.category}</td>
                        <td className="py-2">{expense.description}</td>
                        <td className="py-2 text-right font-medium">{formatCurrency(expense.amount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      
      case "sales":
      default:
        const filteredTransactions = filterDataByDateRange(mockTransactions, 'date');
        const totalFilteredSales = filteredTransactions.reduce((sum, transaction) => sum + transaction.total, 0);
        return (
          <div>
            <div className="mb-4 p-4 bg-muted rounded-lg">
              <div className="flex justify-between">
                <span>Total Sales ({dateRange}):</span>
                <span className="font-bold">{formatCurrency(totalFilteredSales)}</span>
              </div>
              <div className="flex justify-between mt-2">
                <span>Total Transactions:</span>
                <span className="font-bold">{filteredTransactions.length}</span>
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
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-muted-foreground">
                        No sales found for the selected date range
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((transaction) => (
                      <tr key={transaction.id} className="border-b">
                        <td className="py-2">{new Date(transaction.date).toLocaleDateString()}</td>
                        <td className="py-2">{transaction.customer}</td>
                        <td className="py-2">{transaction.items} items</td>
                        <td className="py-2 text-right font-medium">{formatCurrency(transaction.total)}</td>
                      </tr>
                    ))
                  )}
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
        
        // Apply date filtering to saved invoices
        const filteredSavedInvoices = filterDataByDateRange(savedInvoices, 'date');
        
        if (filteredSavedInvoices.length === 0) {
          return (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Saved Invoices Found</h3>
              <p className="text-muted-foreground mb-4">
                No invoices found for the selected date range.
              </p>
              <p className="text-sm text-muted-foreground">
                Try selecting a different date range or check if you have saved invoices.
              </p>
            </div>
          );
        }
        
        const totalFilteredInvoices = filteredSavedInvoices.reduce((sum, invoice) => sum + (invoice.total || 0), 0);
        return (
          <div>
            <div className="mb-4 p-4 bg-muted rounded-lg">
              <div className="flex justify-between">
                <span>Total Invoices ({dateRange}):</span>
                <span className="font-bold">{filteredSavedInvoices.length}</span>
              </div>
              <div className="flex justify-between mt-2">
                <span>Total Amount:</span>
                <span className="font-bold">{formatCurrency(totalFilteredInvoices)}</span>
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
                  {filteredSavedInvoices.map((invoice) => (
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
      case "saved-customer-settlements":
        if (loadingSavedSettlements) {
          return (
            <div className="flex justify-center items-center h-64">
              <p>Loading saved customer settlements...</p>
            </div>
          );
        }
        
        // Apply date filtering to saved settlements
        const filteredSavedSettlements = filterDataByDateRange(savedSettlements, 'date');
        
        if (filteredSavedSettlements.length === 0) {
          return (
            <div className="text-center py-12">
              <Wallet className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Saved Customer Settlements Found</h3>
              <p className="text-muted-foreground mb-4">
                No customer settlements found for the selected date range.
              </p>
              <p className="text-sm text-muted-foreground">
                Try selecting a different date range or check if you have saved settlements.
              </p>
            </div>
          );
        }
        
        const totalFilteredSettlements = filteredSavedSettlements.reduce((sum, settlement) => sum + (settlement.settlementAmount || 0), 0);
        return (
          <div>
            <div className="mb-4 p-4 bg-muted rounded-lg">
              <div className="flex justify-between">
                <span>Total Settlements ({dateRange}):</span>
                <span className="font-bold">{filteredSavedSettlements.length}</span>
              </div>
              <div className="flex justify-between mt-2">
                <span>Total Amount:</span>
                <span className="font-bold">{formatCurrency(totalFilteredSettlements)}</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b">
                    <th className="pb-2">Reference</th>
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Customer</th>
                    <th className="pb-2">Previous Balance</th>
                    <th className="pb-2 text-right">Amount Paid</th>
                    <th className="pb-2">New Balance</th>
                    <th className="pb-2">Payment Method</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSavedSettlements.map((settlement) => (
                    <tr key={settlement.id} className="border-b">
                      <td className="py-2">{settlement.referenceNumber}</td>
                      <td className="py-2">{formatDate(settlement.date)}</td>
                      <td className="py-2">{settlement.customerName}</td>
                      <td className="py-2">{settlement.previousBalance !== undefined ? formatCurrency(settlement.previousBalance) : 'N/A'}</td>
                      <td className="py-2 text-right font-medium">{formatCurrency(settlement.settlementAmount)}</td>
                      <td className="py-2">{settlement.newBalance !== undefined ? formatCurrency(settlement.newBalance) : 'N/A'}</td>
                      <td className="py-2">
                        <span className="px-2 py-1 rounded-full text-xs bg-secondary text-secondary-foreground">
                          {settlement.paymentMethod}
                        </span>
                      </td>
                      <td className="py-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          settlement.status === 'completed' ? 'bg-green-100 text-green-800' :
                          settlement.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          settlement.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {settlement.status || 'completed'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case "saved-deliveries":
        if (loadingSavedDeliveries) {
          return (
            <div className="flex justify-center items-center h-64">
              <p>Loading saved deliveries...</p>
            </div>
          );
        }
        
        // Apply date filtering to saved deliveries
        const filteredSavedDeliveriesPreview = filterDataByDateRange(savedDeliveries, 'date');
        
        if (filteredSavedDeliveriesPreview.length === 0) {
          return (
            <div className="text-center py-12">
              <TruckIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Saved Deliveries Found</h3>
              <p className="text-muted-foreground mb-4">
                No deliveries found for the selected date range.
              </p>
              <p className="text-sm text-muted-foreground">
                Try selecting a different date range or check if you have saved deliveries.
              </p>
            </div>
          );
        }
        
        const totalFilteredDeliveries = filteredSavedDeliveriesPreview.reduce((sum, delivery) => sum + (delivery.total || 0), 0);
        return (
          <div>
            <div className="mb-4 p-4 bg-muted rounded-lg">
              <div className="flex justify-between">
                <span>Total Deliveries ({dateRange}):</span>
                <span className="font-bold">{filteredSavedDeliveriesPreview.length}</span>
              </div>
              <div className="flex justify-between mt-2">
                <span>Total Amount:</span>
                <span className="font-bold">{formatCurrency(totalFilteredDeliveries)}</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b">
                    <th className="pb-2">Delivery Note #</th>
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Customer</th>
                    <th className="pb-2">Items</th>
                    <th className="pb-2 text-right">Total</th>
                    <th className="pb-2">Vehicle</th>
                    <th className="pb-2">Driver</th>
                    <th className="pb-2">Payment Method</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSavedDeliveriesPreview.map((delivery) => (
                    <tr key={delivery.id} className="border-b">
                      <td className="py-2 font-medium">{delivery.deliveryNoteNumber || 'N/A'}</td>
                      <td className="py-2">{formatDate(delivery.date)}</td>
                      <td className="py-2">{delivery.customer || 'N/A'}</td>
                      <td className="py-2">{delivery.items || 0} items</td>
                      <td className="py-2 text-right font-bold">{formatCurrency(delivery.total || 0)}</td>
                      <td className="py-2">{delivery.vehicle || 'N/A'}</td>
                      <td className="py-2">{delivery.driver || 'N/A'}</td>
                      <td className="py-2">
                        <span className="px-2 py-1 rounded-full text-xs bg-secondary text-secondary-foreground">
                          {delivery.paymentMethod || 'N/A'}
                        </span>
                      </td>
                      <td className="py-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          delivery.status === 'completed' || delivery.status === 'delivered' ? 'bg-green-100 text-green-800' :
                          delivery.status === 'in-transit' ? 'bg-blue-100 text-blue-800' :
                          delivery.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          delivery.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {delivery.status || 'completed'}
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
                      <SelectItem value="saved-customer-settlements">
                        <div className="flex items-center gap-2">
                          <Wallet className="h-4 w-4" />
                          Saved Customer Settlements Report
                        </div>
                      </SelectItem>
                      <SelectItem value="saved-deliveries">
                        <div className="flex items-center gap-2">
                          <TruckIcon className="h-4 w-4" />
                          Saved Deliveries Report
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date Range</label>
                  <Select value={dateRange} onValueChange={(value) => {
                    setDateRange(value);
                    if (value !== "custom") {
                      setUseCustomDates(false);
                    }
                  }}>
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
                      <SelectItem value="custom">Custom Date Range</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {dateRange === "custom" && (
                    <div className="mt-4 space-y-4 p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="useCustomDates"
                          checked={useCustomDates}
                          onCheckedChange={(checked) => setUseCustomDates(checked as boolean)}
                        />
                        <label
                          htmlFor="useCustomDates"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Enable custom date range
                        </label>
                      </div>
                      
                      {useCustomDates && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="startDate" className="text-sm font-medium">
                              Start Date
                            </Label>
                            <div className="relative">
                              <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="startDate"
                                type="date"
                                className="pl-10"
                                value={customStartDate}
                                onChange={(e) => setCustomStartDate(e.target.value)}
                                max={customEndDate || new Date().toISOString().split('T')[0]}
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="endDate" className="text-sm font-medium">
                              End Date
                            </Label>
                            <div className="relative">
                              <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="endDate"
                                type="date"
                                className="pl-10"
                                value={customEndDate}
                                onChange={(e) => setCustomEndDate(e.target.value)}
                                min={customStartDate}
                                max={new Date().toISOString().split('T')[0]}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="pt-4">
                  <h3 className="font-medium mb-3">Export Options</h3>
                  <div className="flex flex-col gap-3">
                    <Button 
                      onClick={handlePrint}
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