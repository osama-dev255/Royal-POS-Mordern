import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { FileText, Download, Printer, Calendar, Filter, Truck, ShoppingCart, Package } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { PrintUtils } from "@/utils/printUtils";
import { ExportUtils } from "@/utils/exportUtils";
// Import Supabase database service
import { getPurchaseOrders, getSuppliers, PurchaseOrder, Supplier } from "@/services/databaseService";
import { useToast } from "@/hooks/use-toast";

interface PurchaseSummary {
  id: string;
  supplier: string;
  orders: number;
  totalAmount: number;
  status: "pending" | "received" | "partially_received";
}

interface PurchaseTrend {
  date: string;
  amount: number;
}

interface SupplierPerformance {
  name: string;
  totalPurchases: number;
  orderCount: number;
}

export const PurchaseReports = ({ username, onBack, onLogout }: { username: string; onBack: () => void; onLogout: () => void }) => {
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

  // Calculate purchase summary by supplier
  const purchaseSummary: PurchaseSummary[] = suppliers.map(supplier => {
    const supplierOrders = filteredOrders.filter(order => order.supplier_id === supplier.id);
    
    const totalAmount = supplierOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
    const orderCount = supplierOrders.length;
    
    // Determine overall status
    let status: "pending" | "received" | "partially_received" = "pending";
    if (supplierOrders.length > 0) {
      const allReceived = supplierOrders.every(order => order.status === "received");
      const anyReceived = supplierOrders.some(order => order.status === "received");
      
      if (allReceived) {
        status = "received";
      } else if (anyReceived) {
        status = "partially_received";
      }
    }
    
    return {
      id: supplier.id || '',
      supplier: supplier.name || 'Unknown Supplier',
      orders: orderCount,
      totalAmount,
      status
    };
  }).filter(summary => summary.orders > 0);

  // Calculate purchase trends
  const purchaseTrends: PurchaseTrend[] = (() => {
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

  // Calculate supplier performance
  const supplierPerformance: SupplierPerformance[] = purchaseSummary.map(summary => ({
    name: summary.supplier,
    totalPurchases: summary.totalAmount,
    orderCount: summary.orders
  }));

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

  // Print purchase report
  const printPurchaseReport = () => {
    PrintUtils.printPurchaseReport(filteredOrders);
  };

  // Export purchase report to CSV
  const exportToCSV = () => {
    ExportUtils.exportToCSV(filteredOrders, `purchase_report_${new Date().toISOString().split('T')[0]}`);
  };

  // Export purchase report to Excel
  const exportToExcel = () => {
    // In a real implementation, we would use ExcelUtils
    toast({
      title: "Export",
      description: "Export to Excel functionality would be implemented here",
    });
  };

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="min-h-screen bg-background">
      <Navigation 
        title="Purchase Reports" 
        onBack={onBack}
        onLogout={onLogout} 
        username={username}
      />
      
      <main className="container mx-auto p-6">
        <div className="mb-6">
          <h2 className="text-3xl font-bold">Purchase Reports</h2>
          <p className="text-muted-foreground">Analyze purchasing trends and supplier performance</p>
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
            
            <Button onClick={printPurchaseReport}>
              <Printer className="h-4 w-4 mr-2" />
              Print Report
            </Button>
            
            <Button onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            
            <Button variant="outline" onClick={exportToExcel}>
              <FileText className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
          </div>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(filteredOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0))}
              </div>
              <p className="text-xs text-muted-foreground">
                {filteredOrders.length} purchase orders
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Suppliers</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {suppliers.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Active suppliers
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Order Value</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {filteredOrders.length > 0 
                  ? formatCurrency(filteredOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0) / filteredOrders.length)
                  : formatCurrency(0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Average purchase amount
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Purchase Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={purchaseTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                    <Bar dataKey="amount" name="Purchase Amount" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Supplier Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={supplierPerformance}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="totalPurchases"
                      nameKey="name"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {supplierPerformance.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Purchase Summary Table */}
        <Card>
          <CardHeader>
            <CardTitle>Supplier Purchase Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <p>Loading purchase summary...</p>
              </div>
            ) : purchaseSummary.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <FileText className="h-8 w-8 mb-2" />
                <p>No purchase data found</p>
                <p className="text-sm">Create purchase orders to see purchase summary here</p>
                <Button 
                  variant="outline" 
                  className="mt-2"
                  onClick={refreshData}
                >
                  Refresh Data
                </Button>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Orders</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseSummary.map((summary) => (
                      <TableRow key={summary.id}>
                        <TableCell className="font-medium">{summary.supplier}</TableCell>
                        <TableCell>{summary.orders}</TableCell>
                        <TableCell>{formatCurrency(summary.totalAmount)}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              summary.status === "received" ? "default" :
                              summary.status === "partially_received" ? "secondary" : "outline"
                            }
                          >
                            {summary.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};