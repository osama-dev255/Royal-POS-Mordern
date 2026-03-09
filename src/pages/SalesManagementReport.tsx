import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  BarChart3, 
  ShoppingCart, 
  Receipt, 
  Package, 
  Users, 
  Wallet, 
  Truck, 
  FileText,
  Calendar,
  Download,
  TrendingUp,
  DollarSign,
  CreditCard,
  ArrowLeft
} from "lucide-react";
import { getSavedInvoices, InvoiceData } from "@/utils/invoiceUtils";
import { getSavedDeliveries, DeliveryData } from "@/utils/deliveryUtils";
import { getSavedSalesOrders, SalesOrderData } from "@/utils/salesOrderUtils";
import { getSavedSettlements, CustomerSettlementData } from "@/utils/customerSettlementUtils";
import { formatCurrency } from "@/lib/currency";

interface SalesManagementReportProps {
  onBack: () => void;
  onLogout: () => void;
  onNavigate?: (section: string, detailed?: boolean) => void;
  username: string;
}

export const SalesManagementReport = ({ onBack, onLogout, username, onNavigate }: SalesManagementReportProps) => {
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryData[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrderData[]>([]);
  const [customerSettlements, setCustomerSettlements] = useState<CustomerSettlementData[]>([]);
  
  // Summary statistics
  // Stats are now calculated as derived values below
  const stats = {
    totalSales: 0,
    totalOrders: 0,
    totalDeliveries: 0,
    totalSettlements: 0,
    pendingOrders: 0,
    pendingDeliveries: 0,
    outstandingDebt: 0,
    averageOrderValue: 0
  };

  // Load all data
  useEffect(() => {
   const loadData = async () => {
      try {
       setLoading(true);
       const [savedInvoices, savedDeliveries, savedOrders, settlements] = await Promise.all([
          getSavedInvoices(),
          getSavedDeliveries(),
          getSavedSalesOrders(),
          getSavedSettlements()
        ]);
        
       setInvoices(savedInvoices);
       setDeliveries(savedDeliveries);
       setSalesOrders(savedOrders);
       setCustomerSettlements(settlements);
      } catch (error) {
       console.error("Error loading data:", error);
      } finally {
       setLoading(false);
      }
    };

    loadData();
  }, []);

  // Filter data by date range
  const isInDateRange = (dateString: string) => {
   const date = new Date(dateString);
   const startDate = new Date(dateRange.start);
   const endDate = new Date(dateRange.end);
    return date >= startDate && date <= endDate;
  };

  const filteredInvoices = invoices.filter(inv => isInDateRange(inv.date));
  const filteredDeliveries = deliveries.filter(del => isInDateRange(del.date));
  const filteredOrders = salesOrders.filter(order => isInDateRange(order.date));
  const filteredSettlements = customerSettlements.filter(sett => isInDateRange(sett.date));

  // Calculate statistics (memoized calculations)
  const totalSales = filteredInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const totalOrders = filteredOrders.length;
  const totalDeliveries = filteredDeliveries.length;
  const totalSettlements = filteredSettlements.reduce((sum, sett) => sum + (sett.settlementAmount || 0), 0);
  
  const pendingOrders = filteredOrders.filter(o => o.status === 'pending').length;
  const pendingDeliveries = filteredDeliveries.filter(d => d.status === 'pending' || d.status === 'in-transit').length;
  
  // Calculate outstanding debt (orders not fully paid)
  const outstandingDebt = filteredOrders
    .filter(o => (o.amountPaid || 0) < (o.total || 0))
    .reduce((sum, order) => sum + ((order.total || 0) - (order.amountPaid || 0)), 0);
  
  const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
  
  // Update stats object (no need for setState here since these are derived values)
  const currentStats = {
    totalSales,
    totalOrders,
    totalDeliveries,
    totalSettlements,
    pendingOrders,
    pendingDeliveries,
    outstandingDebt,
    averageOrderValue
  };

  // Navigate to specific sections
  const handleNavigateToSection = (section: string, detailed: boolean = false) => {
    if (onNavigate) {
    onNavigate(section, detailed);
    } else {
      // Fallback to router navigation if onNavigate is not provided
      if (detailed) {
      switch (section) {
       case 'invoices':
         window.location.href = '/sales/invoices-detailed';
         break;
       case 'orders':
         window.location.href = '/sales/orders-detailed';
         break;
       case 'deliveries':
         window.location.href = '/sales/deliveries-detailed';
         break;
       case 'settlements':
         window.location.href = '/sales/settlements-detailed';
         break;
       }
      } else {
      switch (section) {
       case 'invoices':
         window.location.href = '/sales/saved-invoices';
         break;
       case 'orders':
         window.location.href = '/sales/saved-orders';
         break;
       case 'deliveries':
         window.location.href = '/sales/saved-deliveries';
         break;
       case 'settlements':
         window.location.href = '/sales/saved-customer-settlements';
         break;
       }
      }
    }
  };

  // Export report as CSV
  const exportReport = () => {
   const headers = ['Metric', 'Value'];
   const rows = [
      ['Total Sales', formatCurrency(currentStats.totalSales)],
      ['Total Orders', currentStats.totalOrders.toString()],
      ['Total Deliveries', currentStats.totalDeliveries.toString()],
      ['Total Settlements', formatCurrency(currentStats.totalSettlements)],
      ['Pending Orders', currentStats.pendingOrders.toString()],
      ['Pending Deliveries', currentStats.pendingDeliveries.toString()],
      ['Outstanding Debt', formatCurrency(currentStats.outstandingDebt)],
      ['Average Order Value', formatCurrency(currentStats.averageOrderValue)]
    ];

   const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

   const blob = new Blob([csvContent], { type: 'text/csv' });
   const url = window.URL.createObjectURL(blob);
   const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${dateRange.start}-${dateRange.end}.csv`;
   a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
               onClick={onBack}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <h1 className="text-xl font-bold">Sales Management Report</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Welcome, {username}</span>
              <Button variant="outline" size="sm" onClick={onLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
        <main className="container mx-auto p-4 sm:p-6">
          <div className="flex justify-center items-center h-64">
            <p>Loading report data...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
             onClick={onBack}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <h1 className="text-xl font-bold">Sales Management Report</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Welcome, {username}</span>
            <Button variant="outline" size="sm" onClick={onLogout}>
              Logout
            </Button>
          </div>
        </div>
      </div>

      <main className="container mx-auto p-4 sm:p-6">
        {/* Filters and Actions */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <label className="text-sm font-medium">From:</label>
              <Input
                type="date"
                value={dateRange.start}
               onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-40"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">To:</label>
              <Input
                type="date"
                value={dateRange.end}
               onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-40"
              />
            </div>
          </div>
          <Button onClick={exportReport} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>

        {/* Summary Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(currentStats.totalSales)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                From {filteredInvoices.length} invoices
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentStats.totalOrders}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {currentStats.pendingOrders} pending
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Deliveries</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentStats.totalDeliveries}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {currentStats.pendingDeliveries} in progress
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(currentStats.averageOrderValue)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Per order average
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Sales Invoices Section */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <CardTitle>Sales Invoices</CardTitle>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-sm text-muted-foreground whitespace-nowrap">
                    {filteredInvoices.length} invoices
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                 onClick={() => handleNavigateToSection('invoices', true)}
                    className="h-7 text-xs flex-shrink-0"
                  >
                    Detailed Section
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                 onClick={() => handleNavigateToSection('invoices')}
                    className="h-7 text-xs flex-shrink-0"
                  >
                    View All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {filteredInvoices.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No invoices in this period</p>
                ) : (
                  filteredInvoices.slice(0, 10).map((invoice) => (
                    <div key={invoice.id} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                      <div className="flex-1">
                        <p className="text-sm font-medium">#{invoice.invoiceNumber}</p>
                        <p className="text-xs text-muted-foreground">{invoice.customer}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{formatCurrency(invoice.total)}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(invoice.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {filteredInvoices.length > 10 && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                 Showing 10 of {filteredInvoices.length} invoices
                </p>
              )}
            </CardContent>
          </Card>

          {/* Sales Orders Section */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-primary" />
                  <CardTitle>Sales Orders</CardTitle>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-sm text-muted-foreground whitespace-nowrap">
                    {filteredOrders.length} orders
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                onClick={() => handleNavigateToSection('orders', true)}
                    className="h-7 text-xs flex-shrink-0"
                  >
                    Detailed Section
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                onClick={() => handleNavigateToSection('orders')}
                    className="h-7 text-xs flex-shrink-0"
                  >
                    View All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {filteredOrders.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No orders in this period</p>
                ) : (
                  filteredOrders.slice(0, 10).map((order) => (
                    <div key={order.id} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                      <div className="flex-1">
                        <p className="text-sm font-medium">#{order.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">{order.customer}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{formatCurrency(order.total)}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {order.status}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {filteredOrders.length > 10 && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                 Showing 10 of {filteredOrders.length} orders
                </p>
              )}
            </CardContent>
          </Card>

          {/* Deliveries Section */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" />
                  <CardTitle>Delivery Notes</CardTitle>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-sm text-muted-foreground whitespace-nowrap">
                    {filteredDeliveries.length} deliveries
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
               onClick={() => handleNavigateToSection('deliveries', true)}
                    className="h-7 text-xs flex-shrink-0"
                  >
                    Detailed Section
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
               onClick={() => handleNavigateToSection('deliveries')}
                    className="h-7 text-xs flex-shrink-0"
                  >
                    View All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {filteredDeliveries.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No deliveries in this period</p>
                ) : (
                  filteredDeliveries.slice(0, 10).map((delivery) => (
                    <div key={delivery.id} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                      <div className="flex-1">
                        <p className="text-sm font-medium">#{delivery.deliveryNoteNumber}</p>
                        <p className="text-xs text-muted-foreground">{delivery.customer}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{formatCurrency(delivery.total)}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {delivery.status}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {filteredDeliveries.length > 10 && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                 Showing 10 of {filteredDeliveries.length} deliveries
                </p>
              )}
            </CardContent>
          </Card>

          {/* Customer Settlements Section */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-primary" />
                  <CardTitle>Customer Settlements</CardTitle>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-sm text-muted-foreground whitespace-nowrap">
                    {filteredSettlements.length} settlements
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
            onClick={() => handleNavigateToSection('settlements', true)}
                    className="h-7 text-xs flex-shrink-0"
                  >
                    Detailed Section
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
            onClick={() => handleNavigateToSection('settlements')}
                    className="h-7 text-xs flex-shrink-0"
                  >
                    View All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {filteredSettlements.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No settlements in this period</p>
                ) : (
                  filteredSettlements.slice(0, 10).map((settlement) => (
                    <div key={settlement.id} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                      <div className="flex-1">
                        <p className="text-sm font-medium">#{settlement.referenceNumber}</p>
                        <p className="text-xs text-muted-foreground">{settlement.customerName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{formatCurrency(settlement.settlementAmount)}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(settlement.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {filteredSettlements.length > 10 && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                 Showing 10 of {filteredSettlements.length} settlements
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Financial Summary */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <CardTitle>Financial Summary</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(currentStats.totalSales)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Settlements</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(currentStats.totalSettlements)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Outstanding Debt</p>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(currentStats.outstandingDebt)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Net Position</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(currentStats.totalSales + currentStats.totalSettlements - currentStats.outstandingDebt)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <CardTitle>Key Performance Metrics</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="p-2 bg-blue-100 rounded-full">
                  <ShoppingCart className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Order Completion Rate</p>
                  <p className="text-lg font-semibold">
                    {currentStats.totalOrders > 0 
                      ? Math.round(((currentStats.totalOrders - currentStats.pendingOrders) / currentStats.totalOrders) * 100) 
                      : 0}%
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="p-2 bg-green-100 rounded-full">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Average Transaction</p>
                  <p className="text-lg font-semibold">{formatCurrency(currentStats.averageOrderValue)}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="p-2 bg-purple-100 rounded-full">
                  <CreditCard className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Debt Collection Rate</p>
                  <p className="text-lg font-semibold">
                    {currentStats.totalSales > 0 
                      ? Math.round((currentStats.totalSettlements / currentStats.totalSales) * 100) 
                      : 0}%
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};
