import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Building, 
  MapPin, 
  Phone, 
  Mail, 
  Users, 
  Package, 
  ArrowLeft,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  Bell,
  Settings,
  BarChart3,
  FileText,
  Truck,
  AlertTriangle,
  CheckCircle,
  Activity,
  CreditCard,
  UserCheck,
  PackageCheck,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  ExternalLink
} from "lucide-react";
import { getOutlets, Outlet } from "@/services/databaseService";
import { format } from "date-fns";

interface OutletDetailsProps {
  onBack: () => void;
  outletId?: string;
}

interface OutletMetrics {
  todaySales: number;
  weeklySales: number;
  monthlySales: number;
  salesGrowth: number;
  totalTransactions: number;
  pendingOrders: number;
  lowStockItems: number;
  activeEmployees: number;
  customerVisits: number;
  averageTransaction: number;
}

interface RecentActivity {
  id: string;
  type: 'sale' | 'order' | 'delivery' | 'stock' | 'alert';
  description: string;
  time: string;
  amount?: number;
}

export const OutletDetails = ({ onBack, outletId: propOutletId }: OutletDetailsProps) => {
  const [outlet, setOutlet] = useState<Outlet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [metrics, setMetrics] = useState<OutletMetrics>({
    todaySales: 0,
    weeklySales: 0,
    monthlySales: 0,
    salesGrowth: 0,
    totalTransactions: 0,
    pendingOrders: 0,
    lowStockItems: 0,
    activeEmployees: 0,
    customerVisits: 0,
    averageTransaction: 0
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);

  useEffect(() => {
    fetchOutlet();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [propOutletId]);

  useEffect(() => {
    if (outlet) {
      // Simulate loading metrics (in real app, these would come from API)
      setMetrics({
        todaySales: 2456780,
        weeklySales: 15678900,
        monthlySales: 67894500,
        salesGrowth: 12.5,
        totalTransactions: 156,
        pendingOrders: 8,
        lowStockItems: 5,
        activeEmployees: outlet.employee_count || 0,
        customerVisits: 234,
        averageTransaction: 15748
      });

      // Simulate recent activities
      setRecentActivities([
        { id: '1', type: 'sale', description: 'Sale completed - Invoice #INV-2024-001', time: '2 mins ago', amount: 125000 },
        { id: '2', type: 'order', description: 'New order received from John Doe', time: '15 mins ago', amount: 45000 },
        { id: '3', type: 'delivery', description: 'Delivery #DN-2024-089 dispatched', time: '30 mins ago' },
        { id: '4', type: 'stock', description: 'Low stock alert: Product SKU-123', time: '1 hour ago' },
        { id: '5', type: 'sale', description: 'Sale completed - Invoice #INV-2024-002', time: '1 hour ago', amount: 89000 },
        { id: '6', type: 'alert', description: 'Payment pending from Customer ABC', time: '2 hours ago' },
      ]);
    }
  }, [outlet]);

  const fetchOutlet = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!propOutletId) {
        setError("No outlet ID provided");
        return;
      }
      
      const allOutlets = await getOutlets();
      const foundOutlet = allOutlets.find(o => o.id === propOutletId);
      
      if (foundOutlet) {
        setOutlet(foundOutlet);
      } else {
        setError("Outlet not found");
      }
    } catch (err) {
      setError("Failed to fetch outlet details. Please try again.");
      console.error("Error fetching outlet:", err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800 border-green-200";
      case "inactive": return "bg-red-100 text-red-800 border-red-200";
      case "maintenance": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'sale': return <DollarSign className="h-4 w-4 text-green-600" />;
      case 'order': return <ShoppingBag className="h-4 w-4 text-blue-600" />;
      case 'delivery': return <Truck className="h-4 w-4 text-purple-600" />;
      case 'stock': return <Package className="h-4 w-4 text-orange-600" />;
      case 'alert': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
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

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="flex justify-center items-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-1">
              <h3 className="text-red-800 font-medium">Error</h3>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchOutlet} className="ml-4">
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!outlet) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Outlet not found</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Header Section */}
      <div className="mb-6">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onBack}
          className="flex items-center gap-2 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Outlets
        </Button>

        {/* Welcome Banner */}
        <Card className="bg-gradient-to-r from-blue-600 to-blue-800 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 bg-white/20 rounded-lg">
                    <Building className="h-8 w-8" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold">{outlet.name}</h1>
                    <p className="text-blue-100 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {outlet.location}
                    </p>
                  </div>
                </div>
                <p className="text-blue-100 mt-2">
                  Welcome back! Here's what's happening at your outlet today.
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge className={`${getStatusColor(outlet.status)} text-sm px-3 py-1`}>
                  {outlet.status.charAt(0).toUpperCase() + outlet.status.slice(1)}
                </Badge>
                <div className="text-right">
                  <p className="text-2xl font-bold">{format(currentTime, 'HH:mm:ss')}</p>
                  <p className="text-blue-100">{format(currentTime, 'EEEE, MMMM d, yyyy')}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today's Sales</p>
                <p className="text-2xl font-bold">{formatCurrency(metrics.todaySales)}</p>
                <div className="flex items-center gap-1 text-green-600 text-sm">
                  <ArrowUpRight className="h-4 w-4" />
                  <span>+{metrics.salesGrowth}%</span>
                </div>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Transactions</p>
                <p className="text-2xl font-bold">{metrics.totalTransactions}</p>
                <p className="text-sm text-muted-foreground">Today</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <CreditCard className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Customer Visits</p>
                <p className="text-2xl font-bold">{metrics.customerVisits}</p>
                <p className="text-sm text-muted-foreground">Today</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <UserCheck className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Transaction</p>
                <p className="text-2xl font-bold">{formatCurrency(metrics.averageTransaction)}</p>
                <p className="text-sm text-muted-foreground">Per sale</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Sales Overview & Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sales Overview */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Sales Overview
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log("View Full Report clicked, navigating to financial-reports");
                  window.location.hash = "#/financial-reports";
                }}
              >
                View Full Report
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Today</p>
                  <p className="text-xl font-bold">{formatCurrency(metrics.todaySales)}</p>
                  <Progress value={75} className="mt-2 h-2" />
                  <p className="text-xs text-muted-foreground mt-1">75% of daily target</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">This Week</p>
                  <p className="text-xl font-bold">{formatCurrency(metrics.weeklySales)}</p>
                  <Progress value={60} className="mt-2 h-2" />
                  <p className="text-xs text-muted-foreground mt-1">60% of weekly target</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">This Month</p>
                  <p className="text-xl font-bold">{formatCurrency(metrics.monthlySales)}</p>
                  <Progress value={45} className="mt-2 h-2" />
                  <p className="text-xs text-muted-foreground mt-1">45% of monthly target</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button 
                  className="h-auto py-4 flex flex-col items-center gap-2" 
                  variant="outline"
                  onClick={() => {
                    console.log("New Sale button clicked, outlet:", outlet);
                    if (outlet?.id) {
                      console.log("Setting hash to #/outlet-sales/" + outlet.id);
                      window.location.hash = `#/outlet-sales/${outlet.id}`;
                    } else {
                      console.log("No outlet ID found!");
                    }
                  }}
                >
                  <ShoppingBag className="h-6 w-6" />
                  <span className="text-sm">New Sale</span>
                </Button>
                <Button 
                  className="h-auto py-4 flex flex-col items-center gap-2" 
                  variant="outline"
                  onClick={() => {
                    if (outlet?.id) {
                      window.location.hash = `#/outlet-inventory/${outlet.id}`;
                    }
                  }}
                >
                  <Package className="h-6 w-6" />
                  <span className="text-sm">Products</span>
                </Button>
                <Button 
                  className="h-auto py-4 flex flex-col items-center gap-2" 
                  variant="outline"
                  onClick={() => window.location.hash = "#/financial-reports"}
                >
                  <FileText className="h-6 w-6" />
                  <span className="text-sm">Reports</span>
                </Button>
                <Button 
                  className="h-auto py-4 flex flex-col items-center gap-2" 
                  variant="outline"
                  onClick={() => window.location.hash = "#/customers"}
                >
                  <Users className="h-6 w-6" />
                  <span className="text-sm">Customers</span>
                </Button>
                <Button 
                  className="h-auto py-4 flex flex-col items-center gap-2" 
                  variant="outline"
                  onClick={() => window.location.hash = "#/templates"}
                >
                  <Truck className="h-6 w-6" />
                  <span className="text-sm">Deliveries</span>
                </Button>
                <Button 
                  className="h-auto py-4 flex flex-col items-center gap-2" 
                  variant="outline"
                  onClick={() => window.location.hash = "#/customer-settlements"}
                >
                  <CreditCard className="h-6 w-6" />
                  <span className="text-sm">Payments</span>
                </Button>
                <Button 
                  className="h-auto py-4 flex flex-col items-center gap-2" 
                  variant="outline"
                  onClick={() => window.location.hash = "#/grn-inventory-dashboard"}
                >
                  <PackageCheck className="h-6 w-6" />
                  <span className="text-sm">GRN</span>
                </Button>
                <Button 
                  className="h-auto py-4 flex flex-col items-center gap-2" 
                  variant="outline"
                  onClick={() => window.location.hash = "#/settings"}
                >
                  <Settings className="h-6 w-6" />
                  <span className="text-sm">Settings</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <Button variant="ghost" size="sm">View All</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="p-2 bg-muted rounded-full">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                    {activity.amount && (
                      <div className="text-sm font-semibold text-green-600">
                        +{formatCurrency(activity.amount)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Alerts, Info, Stats */}
        <div className="space-y-6">
          {/* Alerts & Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Alerts & Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics.pendingOrders > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">Pending Orders</p>
                      <p className="text-xs text-yellow-600">{metrics.pendingOrders} orders awaiting processing</p>
                    </div>
                  </div>
                )}
                {metrics.lowStockItems > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <Package className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="text-sm font-medium text-red-800">Low Stock Alert</p>
                      <p className="text-xs text-red-600">{metrics.lowStockItems} items need restocking</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-800">System Status</p>
                    <p className="text-xs text-green-600">All systems operational</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Outlet Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Outlet Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm font-medium">{outlet.phone || 'Not Provided'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">{outlet.email || 'Not Provided'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Manager</p>
                  <p className="text-sm font-medium">{outlet.manager || 'Not Assigned'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Opening Date</p>
                  <p className="text-sm font-medium">{outlet.opening_date || 'Not Set'}</p>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <Users className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                  <p className="text-xl font-bold">{outlet.employee_count || 0}</p>
                  <p className="text-xs text-muted-foreground">Employees</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <Package className="h-5 w-5 mx-auto mb-1 text-purple-600" />
                  <p className="text-xl font-bold">{outlet.product_count || 0}</p>
                  <p className="text-xs text-muted-foreground">Products</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Daily Target</span>
                    <span className="font-medium">75%</span>
                  </div>
                  <Progress value={75} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Weekly Target</span>
                    <span className="font-medium">60%</span>
                  </div>
                  <Progress value={60} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Monthly Target</span>
                    <span className="font-medium">45%</span>
                  </div>
                  <Progress value={45} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
