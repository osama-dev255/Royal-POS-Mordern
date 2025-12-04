import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, 
  TrendingUp, 
  ShoppingCart, 
  Users, 
  Truck,
  RefreshCw,
  BarChart3,
  DollarSign
} from "lucide-react";
import { AutomationService } from "@/services/automationService";
import { formatCurrency } from "@/lib/currency";

interface AutomatedDashboardProps {
  username: string;
  onBack: () => void;
  onLogout: () => void;
}

// Mock data for demonstration
const mockProducts = [
  { id: "1", name: "Wireless Headphones", price: 99.99, stock: 25, barcode: "123456789012" },
  { id: "2", name: "Coffee Maker", price: 79.99, stock: 3, barcode: "234567890123" },
  { id: "3", name: "Running Shoes", price: 129.99, stock: 30, barcode: "345678901234" },
  { id: "4", name: "Smartphone", price: 699.99, stock: 1, barcode: "456789012345" },
  { id: "5", name: "Laptop", price: 1299.99, stock: 8, barcode: "567890123456" },
];

const mockTransactions = [
  { id: "1", date: new Date().toISOString(), total: 150.50, items: [{ id: "1", name: "Wireless Headphones", price: 99.99, quantity: 1 }] },
  { id: "2", date: new Date().toISOString(), total: 79.99, items: [{ id: "2", name: "Coffee Maker", price: 79.99, quantity: 1 }] },
  { id: "3", date: new Date(Date.now() - 86400000).toISOString(), total: 259.98, items: [{ id: "3", name: "Running Shoes", price: 129.99, quantity: 2 }] },
];

const mockCustomers = [
  { id: "1", name: "John Smith", email: "john@example.com", loyaltyPoints: 150, totalSpent: 1250.75 },
  { id: "2", name: "Sarah Johnson", email: "sarah@example.com", loyaltyPoints: 320, totalSpent: 2100.50 },
  { id: "3", name: "Mike Williams", email: "mike@example.com", loyaltyPoints: 75, totalSpent: 420.25 },
];

const mockExpenses = [
  { id: "1", description: "Monthly rent payment", amount: 2500, date: new Date().toISOString() },
  { id: "2", description: "Inventory restocking", amount: 1200, date: new Date().toISOString() },
  { id: "3", description: "Electricity bill", amount: 350, date: new Date().toISOString() },
];

const mockSuppliers = [
  { id: "1", name: "Tech Distributors Inc.", contactPerson: "Robert Chen", status: "active" },
  { id: "2", name: "Global Home Goods", contactPerson: "Maria Garcia", status: "active" },
];

const mockPurchaseOrders = [
  { id: "1", supplierId: "1", total: 5000, status: "received", deliveryDate: new Date().toISOString(), expectedDeliveryDate: new Date().toISOString() },
  { id: "2", supplierId: "2", total: 3000, status: "received", deliveryDate: new Date(Date.now() - 86400000).toISOString(), expectedDeliveryDate: new Date().toISOString() },
];

export const AutomatedDashboard = ({ username, onBack, onLogout }: AutomatedDashboardProps) => {
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [reorderSuggestions, setReorderSuggestions] = useState<any[]>([]);
  const [discountSuggestions, setDiscountSuggestions] = useState<any[]>([]);
  const [dailyReport, setDailyReport] = useState<any>(null);
  const [customerSegments, setCustomerSegments] = useState<any[]>([]);
  const [categorizedExpenses, setCategorizedExpenses] = useState<any[]>([]);
  const [supplierPerformance, setSupplierPerformance] = useState<any[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toLocaleTimeString());

  // Initialize and refresh data
  const refreshData = () => {
    // Automated inventory management
    const lowStock = AutomationService.checkLowStock(mockProducts);
    setLowStockItems(lowStock);
    
    // Automated reorder suggestions
    const reorders = AutomationService.suggestReorders(lowStock);
    setReorderSuggestions(reorders);
    
    // Automated discount suggestions
    const discounts = AutomationService.suggestDiscounts(mockProducts);
    setDiscountSuggestions(discounts);
    
    // Automated financial reporting
    const report = AutomationService.generateDailyReport(mockTransactions);
    setDailyReport(report);
    
    // Automated customer segmentation
    const segments = AutomationService.segmentCustomers(mockCustomers);
    setCustomerSegments(segments);
    
    // Automated expense categorization
    const expenses = AutomationService.categorizeExpenses(mockExpenses);
    setCategorizedExpenses(expenses);
    
    // Automated supplier performance tracking
    const performance = AutomationService.trackSupplierPerformance(mockSuppliers, mockPurchaseOrders);
    setSupplierPerformance(performance);
    
    setLastUpdated(new Date().toLocaleTimeString());
  };

  // Refresh data on component mount
  useEffect(() => {
    refreshData();
    
    // Set up automatic refresh every 5 minutes
    const interval = setInterval(refreshData, 300000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navigation 
        title="Automated Dashboard" 
        onBack={onBack}
        onLogout={onLogout} 
        username={username}
      />
      
      <main className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold">Automated Business Insights</h2>
            <p className="text-muted-foreground">
              Real-time automated analysis and recommendations
            </p>
          </div>
          <Button onClick={refreshData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </div>
        
        <div className="mb-4 text-sm text-muted-foreground">
          Last updated: {lastUpdated}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Inventory Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="mr-2 h-5 w-5 text-yellow-500" />
                Low Stock Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lowStockItems.length === 0 ? (
                <p className="text-muted-foreground">No low stock items</p>
              ) : (
                <div className="space-y-3">
                  {lowStockItems.map(item => (
                    <div key={item.id} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-muted-foreground">Barcode: {item.barcode}</div>
                      </div>
                      <Badge variant="destructive">{item.stock} in stock</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Reorder Suggestions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ShoppingCart className="mr-2 h-5 w-5" />
                Reorder Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reorderSuggestions.length === 0 ? (
                <p className="text-muted-foreground">No reorder suggestions</p>
              ) : (
                <div className="space-y-3">
                  {reorderSuggestions.map(suggestion => (
                    <div key={suggestion.productId} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{suggestion.productName}</div>
                        <div className="text-sm text-muted-foreground">
                          Current: {suggestion.currentStock} | Suggested: {suggestion.suggestedOrderQuantity}
                        </div>
                      </div>
                      <Button size="sm">Order</Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Discount Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="mr-2 h-5 w-5" />
                Discount Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {discountSuggestions.length === 0 ? (
                <p className="text-muted-foreground">No discount recommendations</p>
              ) : (
                <div className="space-y-3">
                  {discountSuggestions.map(discount => (
                    <div key={discount.productId} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{discount.productName}</div>
                      </div>
                      <Badge>{discount.suggestedDiscount}% OFF</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Daily Financial Report */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="mr-2 h-5 w-5" />
                Daily Financial Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dailyReport ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-primary/10 rounded-lg">
                      <div className="text-2xl font-bold">{formatCurrency(dailyReport.totalSales)}</div>
                      <div className="text-sm text-muted-foreground">Total Sales</div>
                    </div>
                    <div className="text-center p-3 bg-primary/10 rounded-lg">
                      <div className="text-2xl font-bold">{dailyReport.totalTransactions}</div>
                      <div className="text-sm text-muted-foreground">Transactions</div>
                    </div>
                    <div className="text-center p-3 bg-primary/10 rounded-lg">
                      <div className="text-2xl font-bold">{formatCurrency(dailyReport.averageTransaction)}</div>
                      <div className="text-sm text-muted-foreground">Avg. Sale</div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Top Selling Products</h4>
                    <div className="space-y-2">
                      {dailyReport.topProducts.map((product: any, index: number) => (
                        <div key={product.id} className="flex justify-between">
                          <div>
                            <span className="font-medium">#{index + 1}</span> {product.name}
                          </div>
                          <div>{product.quantity} sold</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Loading report...</p>
              )}
            </CardContent>
          </Card>
          
          {/* Customer Segmentation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5" />
                Customer Segmentation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {customerSegments.map(customer => (
                  <div key={customer.id} className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{customer.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatCurrency(customer.totalSpent)} spent
                      </div>
                    </div>
                    <Badge 
                      variant={customer.segment === 'Gold' ? 'default' : customer.segment === 'Silver' ? 'secondary' : 'outline'}
                    >
                      {customer.segment}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Expense Categorization */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="mr-2 h-5 w-5" />
                Expense Categorization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {categorizedExpenses.map(expense => (
                  <div key={expense.id} className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{expense.description}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(expense.date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div>{formatCurrency(expense.amount)}</div>
                      <div className="text-sm text-muted-foreground">{expense.category}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Supplier Performance */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Truck className="mr-2 h-5 w-5" />
                Supplier Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {supplierPerformance.map(supplier => (
                  <div key={supplier.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-medium">{supplier.name}</div>
                        <div className="text-sm text-muted-foreground">{supplier.contactPerson}</div>
                      </div>
                      <Badge variant={supplier.status === 'active' ? 'default' : 'secondary'}>
                        {supplier.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-2 bg-primary/10 rounded">
                        <div className="text-lg font-bold">{supplier.performance.totalOrders}</div>
                        <div className="text-xs text-muted-foreground">Total Orders</div>
                      </div>
                      <div className="text-center p-2 bg-primary/10 rounded">
                        <div className="text-lg font-bold">
                          {supplier.performance.onTimeDeliveryRate.toFixed(1)}%
                        </div>
                        <div className="text-xs text-muted-foreground">On-Time Delivery</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};