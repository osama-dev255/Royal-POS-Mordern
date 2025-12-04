import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Wallet, 
  ShoppingCart, 
  Truck,
  CreditCard,
  Activity,
  Filter,
  Calendar
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { formatCurrency } from "@/lib/currency";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
// Import Supabase database service
import { getPurchaseOrders, getSuppliers, PurchaseOrder, Supplier } from "@/services/databaseService";
import { useToast } from "@/hooks/use-toast";

interface SpendingData {
  name: string;
  amount: number;
  orders: number;
}

interface SupplierSpending {
  name: string;
  amount: number;
  percentage: number;
}

interface SpendingTrend {
  date: string;
  amount: number;
}

export const SpendingAnalytics = ({ username, onBack, onLogout }: { username: string; onBack: () => void; onLogout: () => void }) => {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("month");
  const [statusFilter, setStatusFilter] = useState("all");
  const { toast } = useToast();

  // Load purchase orders and suppliers from Supabase on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        console.log("Loading purchase orders and suppliers data...");
        
        // Load purchase orders
        const purchaseOrdersData = await getPurchaseOrders();
        console.log("Purchase orders data loaded:", purchaseOrdersData.length, "records");
        setPurchaseOrders(purchaseOrdersData);
        
        // Load suppliers
        const suppliersData = await getSuppliers();
        console.log("Suppliers data loaded:", suppliersData.length, "records");
        setSuppliers(suppliersData);
      } catch (error) {
        console.error("Error loading data:", error);
        toast({
          title: "Error",
          description: "Failed to load data: " + (error as Error).message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Filter purchase orders based on date range and status
  const filteredOrders = purchaseOrders.filter(order => {
    // Date filter
    const orderDate = new Date(order.order_date || new Date());
    const now = new Date();
    
    let dateMatch = true;
    if (dateRange === "week") {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      dateMatch = orderDate >= weekAgo;
    } else if (dateRange === "month") {
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      dateMatch = orderDate >= monthAgo;
    } else if (dateRange === "quarter") {
      const quarterAgo = new Date(now);
      quarterAgo.setMonth(quarterAgo.getMonth() - 3);
      dateMatch = orderDate >= quarterAgo;
    }
    
    // Status filter
    const statusMatch = statusFilter === "all" || order.status === statusFilter;
    
    return dateMatch && statusMatch;
  });

  // Calculate spending by category (in this case, by supplier type or category)
  const spendingByCategory: SpendingData[] = (() => {
    // For now, we'll group by supplier as category
    const grouped: Record<string, { amount: number; orders: number }> = {};
    
    filteredOrders.forEach(order => {
      const supplier = suppliers.find(s => s.id === order.supplier_id);
      const supplierName = supplier?.name || 'Unknown Supplier';
      
      if (!grouped[supplierName]) {
        grouped[supplierName] = { amount: 0, orders: 0 };
      }
      
      grouped[supplierName].amount += order.total_amount || 0;
      grouped[supplierName].orders += 1;
    });
    
    return Object.entries(grouped).map(([name, data]) => ({
      name,
      amount: data.amount,
      orders: data.orders
    }));
  })();

  // Calculate supplier spending distribution
  const supplierSpending: SupplierSpending[] = spendingByCategory.map(category => {
    const total = spendingByCategory.reduce((sum, cat) => sum + cat.amount, 0);
    const percentage = total > 0 ? (category.amount / total) * 100 : 0;
    
    return {
      name: category.name,
      amount: category.amount,
      percentage
    };
  });

  // Calculate spending trends
  const spendingTrends: SpendingTrend[] = (() => {
    // Group orders by date
    const grouped: Record<string, number> = {};
    
    filteredOrders.forEach(order => {
      const date = order.order_date?.split('T')[0] || '';
      if (date) {
        if (!grouped[date]) {
          grouped[date] = 0;
        }
        grouped[date] += order.total_amount || 0;
      }
    });
    
    // Convert to array and sort by date
    return Object.entries(grouped)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  })();

  // Refresh data
  const refreshData = async () => {
    try {
      setLoading(true);
      const purchaseOrdersData = await getPurchaseOrders();
      setPurchaseOrders(purchaseOrdersData);
      
      const suppliersData = await getSuppliers();
      setSuppliers(suppliersData);
      
      toast({
        title: "Success",
        description: "Data refreshed successfully",
      });
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast({
        title: "Error",
        description: "Failed to refresh data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="min-h-screen bg-background">
      <Navigation 
        title="Spending Analytics" 
        onBack={onBack}
        onLogout={onLogout} 
        username={username}
      />
      
      <main className="container mx-auto p-6">
        <div className="mb-6">
          <h2 className="text-3xl font-bold">Spending Analytics</h2>
          <p className="text-muted-foreground">Track your purchasing patterns and expenditure</p>
        </div>
        
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-32">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
                <SelectItem value="quarter">Last 90 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="ordered">Ordered</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-2 ml-auto">
            <Button onClick={refreshData} variant="outline">
              Refresh
            </Button>
          </div>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spending</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(filteredOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0))}</div>
              <p className="text-xs text-muted-foreground">+5.2% from last period</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Purchase Orders</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+{filteredOrders.length}</div>
              <p className="text-xs text-muted-foreground">+12.3% from last period</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Order Value</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {filteredOrders.length > 0 
                  ? formatCurrency(filteredOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0) / filteredOrders.length)
                  : formatCurrency(0)}
              </div>
              <p className="text-xs text-muted-foreground">+1.8% from last period</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Suppliers</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+{suppliers.length}</div>
              <p className="text-xs text-muted-foreground">Active suppliers</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Spending Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={spendingTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Line 
                      type="monotone" 
                      dataKey="amount" 
                      name="Spending Amount" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Supplier Spending Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={supplierSpending}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="amount"
                      nameKey="name"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {supplierSpending.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Spending by Category */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Spending by Supplier
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={spendingByCategory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Bar dataKey="amount" name="Spending Amount" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Purchases</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <p>Loading recent purchases...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <Activity className="h-8 w-8 mb-2" />
                <p>No recent purchases found</p>
                <p className="text-sm">Create purchase orders to see recent activity here</p>
                <Button 
                  variant="outline" 
                  className="mt-2"
                  onClick={refreshData}
                >
                  Refresh Data
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.slice(0, 5).map((order) => {
                  const supplier = suppliers.find(s => s.id === order.supplier_id);
                  return (
                    <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{supplier?.name || 'Unknown Supplier'}</div>
                        <div className="text-sm text-muted-foreground">
                          {order.order_date ? new Date(order.order_date).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="font-medium">{formatCurrency(order.total_amount || 0)}</div>
                        <Badge 
                          variant={
                            order.status === "received" ? "default" : 
                            order.status === "ordered" ? "secondary" : 
                            order.status === "draft" ? "outline" : "destructive"
                          }
                        >
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};