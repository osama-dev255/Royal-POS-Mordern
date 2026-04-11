import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  BarChart3, 
  ArrowLeft, 
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  Users,
  Package,
  Warehouse,
  Receipt,
  CreditCard,
  Truck,
  FileSpreadsheet,
  ShoppingCart,
  Search,
  Printer,
  Download,
  AlertTriangle,
  CheckCircle,
  XCircle
} from "lucide-react";
import { getAvailableInventoryByOutlet, InventoryProduct, getOutletSalesByOutletId, getOutletSaleItemsBySaleId, OutletSale, OutletSaleItem } from "@/services/databaseService";
import { useToast } from "@/hooks/use-toast";

interface OutletReportsProps {
  onBack: () => void;
  outletId?: string;
}

interface ReportMetric {
  label: string;
  value: string;
  change: number;
  icon: React.ReactNode;
}

interface ReportCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
}

// Mock data for outlet reports
// Report navigation cards data
const reportCards: ReportCard[] = [
  {
    id: 'inventory',
    title: 'Inventory Report',
    description: 'Stock levels, movements & valuation',
    icon: <Warehouse className="h-8 w-8" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  {
    id: 'sales',
    title: 'Sales Report',
    description: 'Revenue, transactions & trends',
    icon: <BarChart3 className="h-8 w-8" />,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  {
    id: 'payments',
    title: 'Payments Report',
    description: 'Payment methods & reconciliation',
    icon: <CreditCard className="h-8 w-8" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  },
  {
    id: 'deliveries',
    title: 'Deliveries Report',
    description: 'Delivery status & tracking',
    icon: <Truck className="h-8 w-8" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  },
  {
    id: 'receipts',
    title: 'Receipts Report',
    description: 'Transaction receipts & records',
    icon: <Receipt className="h-8 w-8" />,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200'
  },
  {
    id: 'grn',
    title: 'GRN Report',
    description: 'Goods received notes & stock-in',
    icon: <FileSpreadsheet className="h-8 w-8" />,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200'
  }
];

export const OutletReports = ({ onBack, outletId }: OutletReportsProps) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedReport, setSelectedReport] = useState<string>('');
  const [inventoryData, setInventoryData] = useState<InventoryProduct[]>([]);
  const [salesData, setSalesData] = useState<OutletSale[]>([]);
  const [saleItems, setSaleItems] = useState<OutletSaleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  
  const handleReportClick = (reportId: string) => {
    setSelectedReport(reportId);
    console.log(`Navigating to ${reportId} report`);
    
    // Load data based on selected report
    if (reportId === 'inventory' && outletId) {
      loadInventoryData();
    } else if (reportId === 'sales' && outletId) {
      loadSalesData();
    }
  };
  
  const loadSalesData = async () => {
    if (!outletId) return;
    
    setLoading(true);
    try {
      // Fetch all sales for the outlet
      const sales = await getOutletSalesByOutletId(outletId);
      setSalesData(sales);
      
      // Fetch all sale items
      const allItems: OutletSaleItem[] = [];
      for (const sale of sales) {
        if (sale.id) {
          const items = await getOutletSaleItemsBySaleId(sale.id);
          allItems.push(...items);
        }
      }
      setSaleItems(allItems);
    } catch (error) {
      console.error('Error loading sales data:', error);
      toast({
        title: "Error",
        description: "Failed to load sales data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const loadInventoryData = async () => {
    if (!outletId) return;
    setLoading(true);
    try {
      const data = await getAvailableInventoryByOutlet(outletId);
      setInventoryData(data || []);
    } catch (error) {
      console.error('Error loading inventory data:', error);
      toast({
        title: "Error",
        description: "Failed to load inventory data",
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
  
  // Inventory report helpers
  const filteredInventory = inventoryData.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  const inventoryStats = {
    totalItems: inventoryData.length,
    totalValue: inventoryData.reduce((sum, item) => sum + ((item.unit_cost || 0) * (item.quantity || 0)), 0),
    totalSellingValue: inventoryData.reduce((sum, item) => sum + ((item.selling_price || 0) * (item.quantity || 0)), 0),
    inStock: inventoryData.filter(item => item.status === 'in-stock').length,
    lowStock: inventoryData.filter(item => item.status === 'low-stock').length,
    outOfStock: inventoryData.filter(item => item.status === 'out-of-stock').length
  };
  
  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'in-stock':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100"><CheckCircle className="h-3 w-3 mr-1" /> In Stock</Badge>;
      case 'low-stock':
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100"><AlertTriangle className="h-3 w-3 mr-1" /> Low Stock</Badge>;
      case 'out-of-stock':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100"><XCircle className="h-3 w-3 mr-1" /> Out of Stock</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };
  
  const printInventoryReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    // Category breakdown
    const categoryData = Object.entries(
      filteredInventory.reduce((acc, item) => {
        const category = item.category || 'Uncategorized';
        if (!acc[category]) {
          acc[category] = { count: 0, quantity: 0, value: 0 };
        }
        acc[category].count += 1;
        acc[category].quantity += item.quantity || 0;
        acc[category].value += (item.unit_cost || 0) * (item.quantity || 0);
        return acc;
      }, {} as Record<string, { count: number; quantity: number; value: number }>)
    );
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Inventory Overview Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #2563eb; margin-bottom: 5px; }
          h2 { color: #374151; margin-top: 30px; margin-bottom: 10px; }
          .stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 15px; margin: 20px 0; }
          .stat { padding: 15px; background: #f3f4f6; border-radius: 8px; text-align: center; }
          .stat-value { font-size: 24px; font-weight: bold; color: #2563eb; }
          .stat-label { font-size: 12px; color: #6b7280; margin-top: 5px; }
          .category-item { display: flex; justify-content: space-between; padding: 10px; background: #f9fafb; margin: 5px 0; border-radius: 4px; }
          .status-bar { background: #e5e7eb; height: 20px; border-radius: 10px; margin: 5px 0 15px 0; }
          .status-fill { height: 100%; border-radius: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #2563eb; color: white; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <h1>Inventory Overview Report</h1>
        <p style="color: #6b7280;">Generated: ${new Date().toLocaleString()}</p>
        
        <div class="stats">
          <div class="stat"><div class="stat-value">${inventoryStats.totalItems}</div><div class="stat-label">Total Items</div></div>
          <div class="stat"><div class="stat-value">${formatCurrency(inventoryStats.totalValue)}</div><div class="stat-label">Total Cost Value</div></div>
          <div class="stat"><div class="stat-value">${formatCurrency(inventoryStats.totalSellingValue)}</div><div class="stat-label">Total Selling Value</div></div>
          <div class="stat"><div class="stat-value" style="color: #16a34a;">${inventoryStats.inStock}</div><div class="stat-label">In Stock</div></div>
          <div class="stat"><div class="stat-value" style="color: #ca8a04;">${inventoryStats.lowStock}</div><div class="stat-label">Low Stock</div></div>
        </div>
        
        <h2>Inventory by Category</h2>
        ${categoryData.map(([category, data]) => `
          <div class="category-item">
            <div><strong>${category}</strong><br><small>${data.count} products</small></div>
            <div style="text-align: right;"><strong>${data.quantity} units</strong><br><small>${formatCurrency(data.value)}</small></div>
          </div>
        `).join('')}
        
        <h2>Stock Status Distribution</h2>
        <div style="margin: 10px 0;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span>In Stock: ${inventoryStats.inStock} items</span>
            <span>${inventoryStats.totalItems > 0 ? Math.round((inventoryStats.inStock / inventoryStats.totalItems) * 100) : 0}%</span>
          </div>
          <div class="status-bar"><div class="status-fill" style="width: ${inventoryStats.totalItems > 0 ? (inventoryStats.inStock / inventoryStats.totalItems) * 100 : 0}%; background: #22c55e;"></div></div>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span>Low Stock: ${inventoryStats.lowStock} items</span>
            <span>${inventoryStats.totalItems > 0 ? Math.round((inventoryStats.lowStock / inventoryStats.totalItems) * 100) : 0}%</span>
          </div>
          <div class="status-bar"><div class="status-fill" style="width: ${inventoryStats.totalItems > 0 ? (inventoryStats.lowStock / inventoryStats.totalItems) * 100 : 0}%; background: #eab308;"></div></div>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span>Out of Stock: ${inventoryStats.outOfStock} items</span>
            <span>${inventoryStats.totalItems > 0 ? Math.round((inventoryStats.outOfStock / inventoryStats.totalItems) * 100) : 0}%</span>
          </div>
          <div class="status-bar"><div class="status-fill" style="width: ${inventoryStats.totalItems > 0 ? (inventoryStats.outOfStock / inventoryStats.totalItems) * 100 : 0}%; background: #ef4444;"></div></div>
        </div>
        
        <h2>Top 5 Most Valuable Items</h2>
        <table>
          <thead>
            <tr><th>#</th><th>Product</th><th>Quantity</th><th>Unit Cost</th><th>Total Value</th></tr>
          </thead>
          <tbody>
            ${filteredInventory
              .sort((a, b) => ((b.unit_cost || 0) * (b.quantity || 0)) - ((a.unit_cost || 0) * (a.quantity || 0)))
              .slice(0, 5)
              .map((item, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${item.name}</td>
                  <td>${item.quantity || 0}</td>
                  <td>${formatCurrency(item.unit_cost || 0)}</td>
                  <td>${formatCurrency((item.unit_cost || 0) * (item.quantity || 0))}</td>
                </tr>
              `).join('')}
          </tbody>
        </table>
        
        ${inventoryStats.lowStock > 0 ? `
          <h2>Low Stock Alerts</h2>
          <table>
            <thead>
              <tr><th>Product</th><th>Category</th><th>Remaining</th></tr>
            </thead>
            <tbody>
              ${filteredInventory
                .filter(item => item.status === 'low-stock')
                .slice(0, 5)
                .map(item => `
                  <tr>
                    <td>${item.name}</td>
                    <td>${item.category || 'Uncategorized'}</td>
                    <td>${item.quantity} units</td>
                  </tr>
                `).join('')}
            </tbody>
          </table>
        ` : ''}
      </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Outlet Reports</h1>
          <p className="text-muted-foreground">View sales and performance reports for this outlet</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={selectedPeriod === 'daily' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedPeriod('daily')}
          >
            Daily
          </Button>
          <Button 
            variant={selectedPeriod === 'weekly' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedPeriod('weekly')}
          >
            Weekly
          </Button>
          <Button 
            variant={selectedPeriod === 'monthly' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedPeriod('monthly')}
          >
            Monthly
          </Button>
        </div>
      </div>

      {/* Report Navigation Cards */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 text-muted-foreground">Quick Access Reports</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {reportCards.map((card) => (
            <Card 
              key={card.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 border-2 ${
                selectedReport === card.id 
                  ? `${card.borderColor} shadow-md` 
                  : 'border-transparent hover:border-gray-200'
              }`}
              onClick={() => handleReportClick(card.id)}
            >
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center gap-3">
                  <div className={`p-3 rounded-xl ${card.bgColor} ${card.color} transition-transform duration-200 hover:scale-110`}>
                    {card.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-gray-900">{card.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Inventory Report Section */}
      {selectedReport === 'inventory' && (
        <div className="mb-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Warehouse className="h-6 w-6 text-blue-600" />
                  Inventory Report
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={printInventoryReport}>
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </Button>
                  <Button variant="outline" size="sm" onClick={loadInventoryData}>
                    <Download className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Inventory Stats */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Total Items</p>
                    <p className="text-2xl font-bold">{inventoryStats.totalItems}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Cost Value</p>
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(inventoryStats.totalValue)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Selling Value</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(inventoryStats.totalSellingValue)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">In Stock</p>
                    <p className="text-2xl font-bold text-green-600">{inventoryStats.inStock}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Low Stock</p>
                    <p className="text-2xl font-bold text-yellow-600">{inventoryStats.lowStock}</p>
                  </CardContent>
                </Card>
              </div>
              
              {/* Search */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by product name, category, or SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              {/* Inventory Overview */}
              {loading ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Loading inventory data...</p>
                </div>
              ) : filteredInventory.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No inventory items found</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Category Breakdown */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Inventory by Category</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Object.entries(
                          filteredInventory.reduce((acc, item) => {
                            const category = item.category || 'Uncategorized';
                            if (!acc[category]) {
                              acc[category] = { count: 0, quantity: 0, value: 0 };
                            }
                            acc[category].count += 1;
                            acc[category].quantity += item.quantity || 0;
                            acc[category].value += (item.unit_cost || 0) * (item.quantity || 0);
                            return acc;
                          }, {} as Record<string, { count: number; quantity: number; value: number }>)
                        ).map(([category, data], index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <p className="font-medium">{category}</p>
                              <p className="text-sm text-muted-foreground">{data.count} products</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">{data.quantity} units</p>
                              <p className="text-sm text-blue-600">{formatCurrency(data.value)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Stock Status and Top Valuable Items Side by Side */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Stock Status Distribution */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Stock Status Overview</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-green-500"></div>
                              <span className="text-sm font-medium">In Stock</span>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">{inventoryStats.inStock} items</p>
                              <p className="text-xs text-muted-foreground">
                                {inventoryStats.totalItems > 0 ? Math.round((inventoryStats.inStock / inventoryStats.totalItems) * 100) : 0}% of inventory
                              </p>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full transition-all" 
                              style={{ width: `${inventoryStats.totalItems > 0 ? (inventoryStats.inStock / inventoryStats.totalItems) * 100 : 0}%` }}
                            />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                              <span className="text-sm font-medium">Low Stock</span>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">{inventoryStats.lowStock} items</p>
                              <p className="text-xs text-muted-foreground">
                                {inventoryStats.totalItems > 0 ? Math.round((inventoryStats.lowStock / inventoryStats.totalItems) * 100) : 0}% of inventory
                              </p>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-yellow-500 h-2 rounded-full transition-all" 
                              style={{ width: `${inventoryStats.totalItems > 0 ? (inventoryStats.lowStock / inventoryStats.totalItems) * 100 : 0}%` }}
                            />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-red-500"></div>
                              <span className="text-sm font-medium">Out of Stock</span>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">{inventoryStats.outOfStock} items</p>
                              <p className="text-xs text-muted-foreground">
                                {inventoryStats.totalItems > 0 ? Math.round((inventoryStats.outOfStock / inventoryStats.totalItems) * 100) : 0}% of inventory
                              </p>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-red-500 h-2 rounded-full transition-all" 
                              style={{ width: `${inventoryStats.totalItems > 0 ? (inventoryStats.outOfStock / inventoryStats.totalItems) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Top 5 Most Valuable Items */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Top 5 Most Valuable Items</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {filteredInventory
                            .sort((a, b) => ((b.unit_cost || 0) * (b.quantity || 0)) - ((a.unit_cost || 0) * (a.quantity || 0)))
                            .slice(0, 5)
                            .map((item, index) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                                    {index + 1}
                                  </div>
                                  <div>
                                    <p className="font-medium text-sm">{item.name}</p>
                                    <p className="text-xs text-muted-foreground">{item.quantity} units × {formatCurrency(item.unit_cost || 0)}</p>
                                  </div>
                                </div>
                                <p className="font-semibold text-blue-600">
                                  {formatCurrency((item.unit_cost || 0) * (item.quantity || 0))}
                                </p>
                              </div>
                            ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* Low Stock Alerts */}
                  {inventoryStats.lowStock > 0 && (
                    <Card className="border-yellow-200 bg-yellow-50">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-yellow-600" />
                          Low Stock Alerts
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {filteredInventory
                            .filter(item => item.status === 'low-stock')
                            .slice(0, 5)
                            .map((item, index) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-white rounded">
                                <div>
                                  <p className="font-medium text-sm">{item.name}</p>
                                  <p className="text-xs text-muted-foreground">{item.category || 'Uncategorized'}</p>
                                </div>
                                <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
                                  {item.quantity} remaining
                                </Badge>
                              </div>
                            ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sales Report Section */}
      {selectedReport === 'sales' && (
        <div className="mb-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-6 w-6 text-green-600" />
                  Sales Report
                </CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant={selectedPeriod === 'daily' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedPeriod('daily')}
                  >
                    Daily
                  </Button>
                  <Button 
                    variant={selectedPeriod === 'weekly' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedPeriod('weekly')}
                  >
                    Weekly
                  </Button>
                  <Button 
                    variant={selectedPeriod === 'monthly' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedPeriod('monthly')}
                  >
                    Monthly
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-muted-foreground">Loading sales data...</p>
                </div>
              ) : salesData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <ShoppingBag className="h-16 w-16 text-gray-300 mb-4" />
                  <p className="text-lg font-medium text-gray-500">No sales data found</p>
                  <p className="text-sm text-muted-foreground mt-2">Sales transactions will appear here</p>
                </div>
              ) : (
                <>
                  {/* Calculate metrics from real data */}
                  {(() => {
                    const now = new Date();
                    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                    
                    const todaySales = salesData.filter(s => new Date(s.sale_date) >= today);
                    const weekSales = salesData.filter(s => new Date(s.sale_date) >= weekAgo);
                    const monthSales = salesData.filter(s => new Date(s.sale_date) >= monthAgo);
                    
                    const todayRevenue = todaySales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
                    const weekRevenue = weekSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
                    const monthRevenue = monthSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
                    const totalRevenue = salesData.reduce((sum, s) => sum + (s.total_amount || 0), 0);
                    
                    // Calculate product performance from sale items
                    const productMap = saleItems.reduce((acc, item) => {
                      const productName = item.product_name || 'Unknown Product';
                      if (!acc[productName]) {
                        acc[productName] = { name: productName, quantity: 0, revenue: 0 };
                      }
                      acc[productName].quantity += item.quantity || 0;
                      acc[productName].revenue += (item.quantity || 0) * (item.unit_price || 0);
                      return acc;
                    }, {} as Record<string, { name: string; quantity: number; revenue: number }>);
                    
                    const topProducts = Object.values(productMap)
                      .sort((a, b) => b.revenue - a.revenue)
                      .slice(0, 5);
                    
                    // Calculate daily sales for chart (last 7 days)
                    const dailySales = Array.from({ length: 7 }, (_, i) => {
                      const date = new Date(today.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
                      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
                      const daySales = salesData.filter(s => {
                        const saleDate = new Date(s.sale_date);
                        return saleDate >= date && saleDate < nextDate;
                      });
                      const dayRevenue = daySales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
                      return {
                        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
                        sales: dayRevenue,
                        count: daySales.length
                      };
                    });
                    
                    const maxDailySales = Math.max(...dailySales.map(d => d.sales), 1);
                    
                    return (
                      <>
                        {/* Sales Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                          <Card>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="text-sm text-muted-foreground">Today's Sales</p>
                                  <p className="text-2xl font-bold mt-1">{formatCurrency(todayRevenue)}</p>
                                  <p className="text-xs text-muted-foreground mt-2">{todaySales.length} transactions</p>
                                </div>
                                <div className="p-2 bg-green-100 rounded-lg">
                                  <DollarSign className="h-5 w-5 text-green-600" />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                          
                          <Card>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="text-sm text-muted-foreground">Weekly Sales</p>
                                  <p className="text-2xl font-bold mt-1">{formatCurrency(weekRevenue)}</p>
                                  <p className="text-xs text-muted-foreground mt-2">{weekSales.length} transactions</p>
                                </div>
                                <div className="p-2 bg-blue-100 rounded-lg">
                                  <ShoppingBag className="h-5 w-5 text-blue-600" />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                          
                          <Card>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="text-sm text-muted-foreground">Monthly Sales</p>
                                  <p className="text-2xl font-bold mt-1">{formatCurrency(monthRevenue)}</p>
                                  <p className="text-xs text-muted-foreground mt-2">{monthSales.length} transactions</p>
                                </div>
                                <div className="p-2 bg-purple-100 rounded-lg">
                                  <BarChart3 className="h-5 w-5 text-purple-600" />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                          
                          <Card>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="text-sm text-muted-foreground">Total Transactions</p>
                                  <p className="text-2xl font-bold mt-1">{salesData.length}</p>
                                  <p className="text-xs text-muted-foreground mt-2">{formatCurrency(totalRevenue)} total</p>
                                </div>
                                <div className="p-2 bg-orange-100 rounded-lg">
                                  <CreditCard className="h-5 w-5 text-orange-600" />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                        
                        {/* Sales Chart and Top Products Side by Side */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                          {/* Sales Chart - Takes 2/3 width */}
                          <Card className="lg:col-span-2">
                            <CardHeader>
                              <CardTitle className="text-lg">Sales Overview (Last 7 Days)</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="h-64 flex items-end gap-2">
                                {dailySales.map((data, index) => (
                                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                                    <div 
                                      className="w-full bg-green-600/80 rounded-t-md hover:bg-green-600 transition-colors"
                                      style={{ height: `${(data.sales / maxDailySales) * 200}px` }}
                                    />
                                    <span className="text-xs text-muted-foreground">{data.day}</span>
                                    <span className="text-xs font-medium">{formatCurrency(data.sales)}</span>
                                  </div>
                                ))}
                              </div>
                              <div className="flex justify-between mt-4 pt-4 border-t">
                                <div>
                                  <p className="text-sm text-muted-foreground">Total Sales</p>
                                  <p className="text-xl font-bold">
                                    {formatCurrency(dailySales.reduce((sum, d) => sum + d.sales, 0))}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Average Daily</p>
                                  <p className="text-xl font-bold">
                                    {formatCurrency(dailySales.reduce((sum, d) => sum + d.sales, 0) / dailySales.length)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Best Day</p>
                                  <p className="text-xl font-bold">{formatCurrency(Math.max(...dailySales.map(d => d.sales)))}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                          
                          {/* Top Products - Takes 1/3 width */}
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg flex items-center gap-2">
                                <Package className="h-5 w-5" />
                                Top Products
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              {topProducts.length > 0 ? (
                                <div className="space-y-4">
                                  {topProducts.map((product, index) => (
                                    <div key={index} className="flex items-center justify-between">
                                      <div>
                                        <p className="font-medium text-sm">{product.name}</p>
                                        <p className="text-xs text-muted-foreground">{product.quantity} sold</p>
                                      </div>
                                      <p className="font-semibold text-green-600 text-sm">{formatCurrency(product.revenue)}</p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">No products sold yet</p>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      </>
                    );
                  })()}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Default View - Show when no specific report is selected */}
      {selectedReport === '' && (
        <div className="flex flex-col items-center justify-center py-20">
          <BarChart3 className="h-20 w-20 text-gray-300 mb-4" />
          <h2 className="text-2xl font-bold text-gray-700 mb-2">Welcome to Outlet Reports</h2>
          <p className="text-muted-foreground text-center max-w-md">
            Select a report from the navigation cards above to view detailed analytics and insights.
          </p>
        </div>
      )}
    </div>
  );
};
