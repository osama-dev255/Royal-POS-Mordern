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
  ExternalLink,
  Receipt
} from "lucide-react";
import { getOutlets, getOutletDashboardSnapshot, Outlet, OutletDashboardSnapshot } from "@/services/databaseService";
import { format } from "date-fns";

interface OutletDetailsProps {
  onBack: () => void;
  outletId?: string;
  /** Outlet managers are pinned to one outlet, so the exit to the outlet list is dropped. */
  showBackButton?: boolean;
}

const EMPTY_SNAPSHOT: OutletDashboardSnapshot = {
  todaySales: 0,
  yesterdaySales: 0,
  weeklySales: 0,
  monthlySales: 0,
  salesGrowth: null,
  transactionsToday: 0,
  customerVisitsToday: 0,
  averageTransactionToday: 0,
  dailyBaseline: 0,
  weeklyBaseline: 0,
  monthlyBaseline: 0,
  dailyTargetPercent: 0,
  weeklyTargetPercent: 0,
  monthlyTargetPercent: 0,
  pendingApprovals: 0,
  lowStockItems: 0,
  employeeCount: 0,
  productCount: 0,
  outstandingDebtAmount: 0,
  outstandingDebtCount: 0,
  recentActivity: []
};

export const OutletDetails = ({ onBack, outletId: propOutletId, showBackButton = true }: OutletDetailsProps) => {
  const [outlet, setOutlet] = useState<Outlet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [snapshot, setSnapshot] = useState<OutletDashboardSnapshot>(EMPTY_SNAPSHOT);

  useEffect(() => {
    fetchOutlet();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [propOutletId]);

  const fetchOutlet = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!propOutletId) {
        setError("No outlet ID provided");
        return;
      }
      
      const [allOutlets, dashboardSnapshot] = await Promise.all([
        getOutlets(),
        getOutletDashboardSnapshot(propOutletId)
      ]);
      const foundOutlet = allOutlets.find(o => o.id === propOutletId);
      
      if (foundOutlet) {
        setOutlet(foundOutlet);
        setSnapshot(dashboardSnapshot);
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

  const formatRelativeTime = (iso: string) => {
    const date = new Date(iso);
    const minutes = Math.round((Date.now() - date.getTime()) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    const days = Math.round(hours / 24);
    if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
    return format(date, 'MMM d, yyyy');
  };

  const clampProgress = (value: number) => Math.max(0, Math.min(100, value));

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
        {showBackButton && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onBack}
            className="flex items-center gap-2 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Outlets
          </Button>
        )}

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
                <p className="text-2xl font-bold">{formatCurrency(snapshot.todaySales)}</p>
                {snapshot.salesGrowth === null ? (
                  <p className="text-sm text-muted-foreground">
                    {snapshot.yesterdaySales > 0 ? `vs ${formatCurrency(snapshot.yesterdaySales)} yesterday` : 'No sales yesterday'}
                  </p>
                ) : (
                  <div className={`flex items-center gap-1 text-sm ${snapshot.salesGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {snapshot.salesGrowth >= 0 ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4" />
                    )}
                    <span>{snapshot.salesGrowth >= 0 ? '+' : ''}{snapshot.salesGrowth}%</span>
                    <span className="text-muted-foreground">vs yesterday</span>
                  </div>
                )}
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
                <p className="text-2xl font-bold">{snapshot.transactionsToday}</p>
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
                <p className="text-2xl font-bold">{snapshot.customerVisitsToday}</p>
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
                <p className="text-2xl font-bold">{formatCurrency(snapshot.averageTransactionToday)}</p>
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
                  console.log("View Full Report clicked, navigating to outlet-reports");
                  window.location.hash = `#outlet-reports-${outlet.id}`;
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
                  <p className="text-xl font-bold">{formatCurrency(snapshot.todaySales)}</p>
                  <Progress value={clampProgress(snapshot.dailyTargetPercent)} className="mt-2 h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {snapshot.dailyTargetPercent}% of {formatCurrency(snapshot.dailyBaseline)} 7-day average
                  </p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">This Week</p>
                  <p className="text-xl font-bold">{formatCurrency(snapshot.weeklySales)}</p>
                  <Progress value={clampProgress(snapshot.weeklyTargetPercent)} className="mt-2 h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {snapshot.weeklyTargetPercent}% of {formatCurrency(snapshot.weeklyBaseline)} 4-week average
                  </p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">This Month</p>
                  <p className="text-xl font-bold">{formatCurrency(snapshot.monthlySales)}</p>
                  <Progress value={clampProgress(snapshot.monthlyTargetPercent)} className="mt-2 h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {snapshot.monthlyTargetPercent}% of {formatCurrency(snapshot.monthlyBaseline)} 3-month average
                  </p>
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
                  onClick={() => window.location.hash = `#/outlet-reports-${outlet?.id}`}
                >
                  <FileText className="h-6 w-6" />
                  <span className="text-sm">Reports</span>
                </Button>
                <Button 
                  className="h-auto py-4 flex flex-col items-center gap-2" 
                  variant="outline"
                  onClick={() => window.location.hash = `#/outlet-customers-${outlet?.id}`}
                >
                  <Users className="h-6 w-6" />
                  <span className="text-sm">Customers</span>
                </Button>
                <Button 
                  className="h-auto py-4 flex flex-col items-center gap-2" 
                  variant="outline"
                  onClick={() => window.location.hash = `#/outlet-deliveries-${outlet?.id}`}
                >
                  <Truck className="h-6 w-6" />
                  <span className="text-sm">Deliveries</span>
                </Button>
                <Button 
                  className="h-auto py-4 flex flex-col items-center gap-2" 
                  variant="outline"
                  onClick={() => window.location.hash = `#/outlet-payments-${outlet?.id}`}
                >
                  <CreditCard className="h-6 w-6" />
                  <span className="text-sm">Payments</span>
                </Button>
                <Button 
                  className="h-auto py-4 flex flex-col items-center gap-2" 
                  variant="outline"
                  onClick={() => window.location.hash = `#/outlet-grn-${outlet?.id}`}
                >
                  <PackageCheck className="h-6 w-6" />
                  <span className="text-sm">GRN</span>
                </Button>
                <Button 
                  className="h-auto py-4 flex flex-col items-center gap-2" 
                  variant="outline"
                  onClick={() => window.location.hash = `#/outlet-receipts-${outlet?.id}`}
                >
                  <Receipt className="h-6 w-6" />
                  <span className="text-sm">Receipts</span>
                </Button>
                <Button 
                  className="h-auto py-4 flex flex-col items-center gap-2" 
                  variant="outline"
                  onClick={() => window.location.hash = `#/outlet-settings-${outlet?.id}`}
                >
                  <Settings className="h-6 w-6" />
                  <span className="text-sm">Settings</span>
                </Button>
                <Button 
                  className="h-auto py-4 flex flex-col items-center gap-2" 
                  variant="outline"
                  onClick={() => window.location.hash = `#/outlet-finance/${outlet?.id}`}
                >
                  <DollarSign className="h-6 w-6" />
                  <span className="text-sm">Finance</span>
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.hash = `#/outlet-saved-sales/${outlet.id}`}
              >
                View All
              </Button>
            </CardHeader>
            <CardContent>
              {snapshot.recentActivity.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Activity className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">No activity recorded yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Sales, credit invoices and stock alerts will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {snapshot.recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="p-2 bg-muted rounded-full">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{activity.description}</p>
                        <p className="text-xs text-muted-foreground">{formatRelativeTime(activity.occurredAt)}</p>
                      </div>
                      {activity.amount !== undefined && activity.amount !== null && activity.amount > 0 && (
                        <div className="text-sm font-semibold text-green-600">
                          +{formatCurrency(activity.amount)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
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
                {snapshot.pendingApprovals > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">Pending Approvals</p>
                      <p className="text-xs text-yellow-600">{snapshot.pendingApprovals} transaction{snapshot.pendingApprovals === 1 ? '' : 's'} awaiting approval</p>
                    </div>
                  </div>
                )}
                {snapshot.lowStockItems > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <Package className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="text-sm font-medium text-red-800">Low Stock Alert</p>
                      <p className="text-xs text-red-600">{snapshot.lowStockItems} item{snapshot.lowStockItems === 1 ? '' : 's'} need restocking</p>
                    </div>
                  </div>
                )}
                {snapshot.outstandingDebtCount > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <DollarSign className="h-5 w-5 text-orange-600" />
                    <div>
                      <p className="text-sm font-medium text-orange-800">Outstanding Credit</p>
                      <p className="text-xs text-orange-600">
                        {formatCurrency(snapshot.outstandingDebtAmount)} across {snapshot.outstandingDebtCount} invoice{snapshot.outstandingDebtCount === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>
                )}
                {snapshot.pendingApprovals === 0 && snapshot.lowStockItems === 0 && snapshot.outstandingDebtCount === 0 && (
                  <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-green-800">Nothing Needs Attention</p>
                      <p className="text-xs text-green-600">No pending approvals, stock or credit alerts</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 p-3 bg-muted border border-border rounded-lg">
                  <CheckCircle className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Data Source</p>
                    <p className="text-xs text-muted-foreground">Live outlet sales, stock and staff records</p>
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
                  <p className="text-xl font-bold">{snapshot.employeeCount}</p>
                  <p className="text-xs text-muted-foreground">Staff</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <Package className="h-5 w-5 mx-auto mb-1 text-purple-600" />
                  <p className="text-xl font-bold">{snapshot.productCount}</p>
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
                    <span>Today vs 7-day average</span>
                    <span className="font-medium">{snapshot.dailyTargetPercent}%</span>
                  </div>
                  <Progress value={clampProgress(snapshot.dailyTargetPercent)} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatCurrency(snapshot.todaySales)} of {formatCurrency(snapshot.dailyBaseline)}
                  </p>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>This week vs 4-week average</span>
                    <span className="font-medium">{snapshot.weeklyTargetPercent}%</span>
                  </div>
                  <Progress value={clampProgress(snapshot.weeklyTargetPercent)} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatCurrency(snapshot.weeklySales)} of {formatCurrency(snapshot.weeklyBaseline)}
                  </p>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>This month vs 3-month average</span>
                    <span className="font-medium">{snapshot.monthlyTargetPercent}%</span>
                  </div>
                  <Progress value={clampProgress(snapshot.monthlyTargetPercent)} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatCurrency(snapshot.monthlySales)} of {formatCurrency(snapshot.monthlyBaseline)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
