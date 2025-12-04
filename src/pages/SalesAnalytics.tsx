import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  Wallet, 
  ShoppingCart, 
  Users, 
  CreditCard,
  Activity,
  Percent,
  Clock,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  Loader2
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { formatCurrency } from "@/lib/currency";
import { useState, useEffect } from "react";
import { getDailySales, getCategoryPerformance, getProductPerformance } from "@/services/databaseService";

// Define types for our data
type SalesData = {
  name: string;
  sales: number;
  transactions: number;
};

type PaymentData = {
  name: string;
  value: number;
  color: string;
};

type RetentionData = {
  name: string;
  new: number;
  returning: number;
};

type CategoryData = {
  name: string;
  sales: number;
  growth: number;
};

type ProductData = {
  name: string;
  category: string;
  sales: number;
  quantity: number;
  growth: number;
};

// Payment method distribution (mock data as this would come from the database)
const paymentData: PaymentData[] = [
  { name: 'Cash', value: 45, color: '#3b82f6' },
  { name: 'Credit Card', value: 35, color: '#10b981' },
  { name: 'Debit Card', value: 15, color: '#8b5cf6' },
  { name: 'Other', value: 5, color: '#f59e0b' },
];

// Customer retention data (mock data as this would come from the database)
const retentionData: RetentionData[] = [
  { name: 'Week 1', new: 40, returning: 60 },
  { name: 'Week 2', new: 35, returning: 65 },
  { name: 'Week 3', new: 30, returning: 70 },
  { name: 'Week 4', new: 45, returning: 55 },
];

// KPI Card Component
const KpiCard = ({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  description,
  trend 
}: { 
  title: string; 
  value: string | number; 
  change: number; 
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  trend?: 'up' | 'down';
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <div className="flex items-center mt-1">
        {trend === 'up' ? (
          <ArrowUpRight className="h-4 w-4 text-green-500" />
        ) : (
          <ArrowDownRight className="h-4 w-4 text-red-500" />
        )}
        <p className={`text-xs ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
          {change > 0 ? '+' : ''}{change}% from last period
        </p>
      </div>
      {description && (
        <p className="text-xs text-muted-foreground mt-2">{description}</p>
      )}
    </CardContent>
  </Card>
);

export const SalesAnalytics = ({ username, onBack, onLogout }: { username: string; onBack: () => void; onLogout: () => void }) => {
  const [viewMode, setViewMode] = useState<'category' | 'product'>('category');
  const [dailySales, setDailySales] = useState<SalesData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [productData, setProductData] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Format name for tooltip
  const formatName = (name: string | number): string => {
    if (typeof name === 'string') {
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
    return String(name);
  };

  // Fetch data from the database
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch all required data in parallel
        const [dailySalesData, categoryPerformance, productPerformance] = await Promise.all([
          getDailySales(7), // Last 7 days
          getCategoryPerformance(),
          getProductPerformance(10) // Top 10 products
        ]);
        
        setDailySales(dailySalesData);
        setCategoryData(categoryPerformance);
        setProductData(productPerformance);
      } catch (err) {
        console.error('Error fetching analytics data:', err);
        setError('Failed to load analytics data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Calculate KPIs
  const totalRevenue = dailySales.reduce((sum, day) => sum + day.sales, 0);
  const totalTransactions = dailySales.reduce((sum, day) => sum + day.transactions, 0);
  const avgOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
  
  // Mock data for other KPIs (these would come from the database in a real implementation)
  const activeCustomers = 573;
  const conversionRate = 24.7;
  const customerLifetimeValue = 342.80;
  const avgTransactionTime = "2.4 min";

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="mt-2">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-6 max-w-md">
          <div className="text-red-500 font-bold text-lg mb-2">Error</div>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  // Filter data based on view mode
  const performanceData = viewMode === 'category' ? categoryData : productData;

  return (
    <div className="min-h-screen bg-background">
      <Navigation 
        title="Sales Analytics" 
        onBack={onBack}
        onLogout={onLogout} 
        username={username}
      />
      
      <main className="container mx-auto p-6">
        <div className="mb-6">
          <h2 className="text-3xl font-bold">Sales Analytics</h2>
          <p className="text-muted-foreground">Track your business performance and key metrics</p>
        </div>
        
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <KpiCard 
            title="Total Revenue" 
            value={formatCurrency(totalRevenue)} 
            change={12.5} 
            icon={Wallet}
            description="Gross sales volume"
            trend="up"
          />
          
          <KpiCard 
            title="Transactions" 
            value={`+${totalTransactions}`} 
            change={8.2} 
            icon={CreditCard}
            description="Total completed sales"
            trend="up"
          />
          
          <KpiCard 
            title="Avg. Order Value" 
            value={formatCurrency(avgOrderValue)} 
            change={2.1} 
            icon={ShoppingCart}
            description="Revenue per transaction"
            trend="up"
          />
          
          <KpiCard 
            title="Active Customers" 
            value={`+${activeCustomers}`} 
            change={3.7} 
            icon={Users}
            description="Unique customers this period"
            trend="up"
          />
        </div>
        
        {/* Performance Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Weekly Sales Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailySales}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip 
                      formatter={(value, name) => {
                        if (name === 'sales') return [formatCurrency(Number(value)), 'Sales'];
                        return [value, formatName(name)];
                      }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="sales" fill="#3b82f6" name="Sales ($)" />
                    <Bar yAxisId="right" dataKey="transactions" fill="#10b981" name="Transactions" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Customer Retention
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={retentionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="new" stroke="#3b82f6" name="New Customers" strokeWidth={2} />
                    <Line type="monotone" dataKey="returning" stroke="#10b981" name="Returning Customers" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Additional KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <KpiCard 
            title="Conversion Rate" 
            value={`${conversionRate}%`} 
            change={3.2} 
            icon={Percent}
            description="Visitors to purchasers"
            trend="up"
          />
          
          <KpiCard 
            title="Customer Lifetime Value" 
            value={formatCurrency(customerLifetimeValue)} 
            change={5.1} 
            icon={Users}
            description="Average revenue per customer"
            trend="up"
          />
          
          <KpiCard 
            title="Avg. Transaction Time" 
            value={avgTransactionTime} 
            change={-8.3} 
            icon={Clock}
            description="Time to complete sale"
            trend="down"
          />
        </div>
        
        {/* Category/Product Performance and Payment Methods */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  {viewMode === 'category' ? 'Product Category Performance' : 'Product Performance'}
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant={viewMode === 'category' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setViewMode('category')}
                  >
                    By Category
                  </Button>
                  <Button 
                    variant={viewMode === 'product' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setViewMode('product')}
                  >
                    By Product
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {viewMode === 'category' ? (
                  categoryData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{item.name}</div>
                        <div className="text-sm text-muted-foreground">{formatCurrency(item.sales)} in sales</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${item.growth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {item.growth >= 0 ? '+' : ''}{item.growth.toFixed(1)}%
                        </span>
                        {item.growth >= 0 ? (
                          <ArrowUpRight className="h-4 w-4 text-green-500" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  productData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{item.name}</div>
                        <div className="text-sm text-muted-foreground">{item.category}</div>
                        <div className="text-sm text-muted-foreground">{formatCurrency(item.sales)} in sales</div>
                        <div className="text-sm text-muted-foreground">{item.quantity} units sold</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${item.growth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {item.growth >= 0 ? '+' : ''}{item.growth.toFixed(1)}%
                        </span>
                        {item.growth >= 0 ? (
                          <ArrowUpRight className="h-4 w-4 text-green-500" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                Showing {performanceData.length} {viewMode === 'category' ? 'categories' : 'products'}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Methods
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {paymentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value}%`, 'Percentage']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="text-center p-2 bg-blue-50 rounded">
                  <div className="font-bold text-blue-600">45%</div>
                  <div className="text-xs text-muted-foreground">Cash Payments</div>
                </div>
                <div className="text-center p-2 bg-green-50 rounded">
                  <div className="font-bold text-green-600">35%</div>
                  <div className="text-xs text-muted-foreground">Card Payments</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { id: 1, customer: "John Smith", amount: 129.99, time: "2 minutes ago", status: "completed" },
                { id: 2, customer: "Sarah Johnson", amount: 89.50, time: "15 minutes ago", status: "completed" },
                { id: 3, customer: "Mike Williams", amount: 245.75, time: "1 hour ago", status: "completed" },
                { id: 4, customer: "Emily Davis", amount: 67.25, time: "2 hours ago", status: "refunded" },
                { id: 5, customer: "Robert Brown", amount: 199.99, time: "3 hours ago", status: "completed" },
              ].map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{activity.customer}</div>
                    <div className="text-sm text-muted-foreground">{activity.time}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="font-medium">{formatCurrency(activity.amount)}</div>
                    <Badge 
                      variant={
                        activity.status === "completed" ? "default" : 
                        activity.status === "refunded" ? "destructive" : "outline"
                      }
                    >
                      {activity.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};