import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Calendar, 
  Download, 
  TrendingUp, 
  DollarSign,
  Receipt,
  Search,
  Filter,
  BarChart3,
  PieChart,
  Activity,
  Truck
} from "lucide-react";
import { getSavedSalesOrders, SalesOrderData } from "@/utils/salesOrderUtils";
import { formatCurrency } from "@/lib/currency";

interface OrdersDetailedViewProps {
  onBack: () => void;
  onLogout: () => void;
  username: string;
}

export const OrdersDetailedView = ({ onBack, onLogout, username }: OrdersDetailedViewProps) => {
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<SalesOrderData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Load orders
  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);
        const savedOrders = await getSavedSalesOrders();
        setOrders(savedOrders);
      } catch (error) {
        console.error("Error loading orders:", error);
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, []);

  // Filter by date range
  const isInDateRange = (dateString: string) => {
    const date = new Date(dateString);
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    return date >= startDate && date <= endDate;
  };

  const filteredOrders = orders.filter(order => {
    const matchesDate = isInDateRange(order.date);
    const matchesSearch = order.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesDate && matchesSearch && matchesStatus;
  });

  // Calculate statistics
  const totalRevenue = filteredOrders.reduce((sum, order) => sum + (order.total || 0), 0);
  const averageOrder= filteredOrders.length > 0 ? totalRevenue / filteredOrders.length : 0;
  const highestOrder= Math.max(...filteredOrders.map(order => order.total || 0), 0);
  const lowestOrder = Math.min(...filteredOrders.map(order => order.total || 0), 0);
  
  const totalPaid = filteredOrders.reduce((sum, order) => sum + (order.amountPaid || 0), 0);
  const totalOutstanding = totalRevenue - totalPaid;

  // Status breakdown
  const statusBreakdown = {
    pending: filteredOrders.filter(order => order.status === 'pending').length,
    processing: filteredOrders.filter(order => order.status === 'processing').length,
    completed: filteredOrders.filter(order => order.status === 'completed').length,
   cancelled: filteredOrders.filter(order => order.status === 'cancelled').length
  };

  // Top customers
  const customerRevenue = filteredOrders.reduce((acc, order) => {
    acc[order.customer] = (acc[order.customer] || 0) + (order.total || 0);
    return acc;
  }, {} as Record<string, number>);

  const topCustomers = Object.entries(customerRevenue)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Export data
  const exportData = () => {
    const headers = ['Order Number', 'Customer', 'Date', 'Status', 'Total', 'Amount Paid', 'Outstanding'];
    const rows = filteredOrders.map(order => [
      order.orderNumber,
      order.customer,
      order.date,
      order.status,
      order.total?.toString() || '0',
      (order.amountPaid || 0).toString(),
      ((order.total || 0) - (order.amountPaid || 0)).toString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-detailed-${dateRange.start}-${dateRange.end}.csv`;
    a.click();
  window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <h1 className="text-xl font-bold">Orders Detailed Analytics</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Welcome, {username}</span>
              <Button variant="outline" size="sm" onClick={onLogout}>Logout</Button>
            </div>
          </div>
        </div>
        <main className="container mx-auto p-4 sm:p-6">
          <div className="flex justify-center items-center h-64">
            <p>Loading order data...</p>
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
            <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <h1 className="text-xl font-bold">Orders Detailed Analytics</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Welcome, {username}</span>
            <Button variant="outline" size="sm" onClick={onLogout}>Logout</Button>
          </div>
        </div>
      </div>

      <main className="container mx-auto p-4 sm:p-6">
        {/* Filters and Actions */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center">
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
            <div className="flex items-center gap-2 ml-4">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customer or order..."
                value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
                className="border rounded-md px-2 py-1 text-sm"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <Button onClick={exportData} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Data
          </Button>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                From {filteredOrders.length} orders
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Order</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(averageOrder)}</div>
              <p className="text-xs text-muted-foreground mt-1">Per order average</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</div>
              <p className="text-xs text-muted-foreground mt-1">Amount received</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{formatCurrency(totalOutstanding)}</div>
              <p className="text-xs text-muted-foreground mt-1">Amount pending</p>
            </CardContent>
          </Card>
        </div>

        {/* Status Breakdown */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              <CardTitle>Order Status Breakdown</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-orange-600">{statusBreakdown.pending}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Processing</p>
                <p className="text-2xl font-bold text-blue-600">{statusBreakdown.processing}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">{statusBreakdown.completed}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Cancelled</p>
                <p className="text-2xl font-bold text-red-600">{statusBreakdown.cancelled}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Customers */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              <CardTitle>Top 5 Customers by Order Value</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topCustomers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No customer data available</p>
              ) : (
                topCustomers.map(([customer, revenue], index) => (
                  <div key={customer} className="flex justify-between items-center p-3 bg-muted/50 rounded">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{customer}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{formatCurrency(revenue)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Detailed Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <CardTitle>All Orders</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Order #</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Customer</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Total</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Paid</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted-foreground">
                        No orders found for the selected criteria
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => (
                      <tr key={order.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4 font-medium">{order.orderNumber}</td>
                        <td className="py-3 px-4">{order.customer}</td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {new Date(order.date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                            {order.status}
                          </Badge>
                        </td>
                        <td className="text-right py-3 px-4 font-bold">
                          {formatCurrency(order.total)}
                        </td>
                        <td className="text-right py-3 px-4 font-bold text-green-600">
                          {formatCurrency(order.amountPaid || 0)}
                        </td>
                        <td className="text-right py-3 px-4 font-bold text-orange-600">
                          {formatCurrency((order.total || 0) - (order.amountPaid || 0))}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};
