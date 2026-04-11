import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  ShoppingCart
} from "lucide-react";

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
const generateMockMetrics = (outletId: string): ReportMetric[] => [
  {
    label: "Today's Sales",
    value: "1,250,000",
    change: 12.5,
    icon: <DollarSign className="h-6 w-6" />
  },
  {
    label: "Weekly Sales",
    value: "8,750,000",
    change: 8.2,
    icon: <TrendingUp className="h-6 w-6" />
  },
  {
    label: "Monthly Sales",
    value: "35,000,000",
    change: -2.4,
    icon: <TrendingDown className="h-6 w-6" />
  },
  {
    label: "Total Transactions",
    value: "156",
    change: 15.3,
    icon: <ShoppingBag className="h-6 w-6" />
  }
];

const generateMockSalesData = () => [
  { day: 'Mon', sales: 850000 },
  { day: 'Tue', sales: 920000 },
  { day: 'Wed', sales: 780000 },
  { day: 'Thu', sales: 1050000 },
  { day: 'Fri', sales: 1250000 },
  { day: 'Sat', sales: 1450000 },
  { day: 'Sun', sales: 1100000 }
];

const generateMockTopProducts = () => [
  { name: 'Rice 50kg', sales: 45, revenue: 2250000 },
  { name: 'Cooking Oil 5L', sales: 78, revenue: 1560000 },
  { name: 'Sugar 25kg', sales: 32, revenue: 960000 },
  { name: 'Flour 20kg', sales: 28, revenue: 840000 },
  { name: 'Milk Powder 1kg', sales: 56, revenue: 1680000 }
];

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
  
  const metrics = outletId ? generateMockMetrics(outletId) : [];
  const salesData = generateMockSalesData();
  const topProducts = generateMockTopProducts();
  
  const handleReportClick = (reportId: string) => {
    setSelectedReport(reportId);
    // TODO: Navigate to specific report page or filter view
    console.log(`Navigating to ${reportId} report`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const maxSales = Math.max(...salesData.map(d => d.sales));

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

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {metrics.map((metric, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                  <p className="text-2xl font-bold mt-1">{metric.value}</p>
                  <div className={`flex items-center gap-1 mt-2 text-sm ${
                    metric.change >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {metric.change >= 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    <span>{Math.abs(metric.change)}%</span>
                    <span className="text-muted-foreground">vs last period</span>
                  </div>
                </div>
                <div className="p-2 bg-primary/10 rounded-lg">
                  {metric.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sales Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Sales Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end gap-2">
              {salesData.map((data, index) => (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <div 
                    className="w-full bg-primary/80 rounded-t-md hover:bg-primary transition-colors"
                    style={{ height: `${(data.sales / maxSales) * 200}px` }}
                  />
                  <span className="text-xs text-muted-foreground">{data.day}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-4 pt-4 border-t">
              <div>
                <p className="text-sm text-muted-foreground">Total Sales</p>
                <p className="text-xl font-bold">
                  {formatCurrency(salesData.reduce((sum, d) => sum + d.sales, 0))}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Average Daily</p>
                <p className="text-xl font-bold">
                  {formatCurrency(salesData.reduce((sum, d) => sum + d.sales, 0) / salesData.length)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Best Day</p>
                <p className="text-xl font-bold">{formatCurrency(maxSales)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Top Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground">{product.sales} sold</p>
                  </div>
                  <p className="font-semibold">{formatCurrency(product.revenue)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Unique Customers</p>
                <p className="text-2xl font-bold">89</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <ShoppingBag className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg. Order Value</p>
                <p className="text-2xl font-bold">{formatCurrency(80128)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Package className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Items Sold</p>
                <p className="text-2xl font-bold">239</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
