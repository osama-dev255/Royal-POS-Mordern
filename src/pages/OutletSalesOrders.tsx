import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from "@/components/ui/dialog";
import { 
  Search, 
  Filter, 
  Eye, 
  FileText, 
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Download,
  Printer,
  Plus,
  X,
  Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SalesOrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface SalesOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  orderDate: string;
  deliveryDate: string;
  status: "pending" | "processing" | "completed" | "cancelled";
  paymentStatus: "unpaid" | "partial" | "paid";
  items: SalesOrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  notes: string;
}

interface OutletSalesOrdersProps {
  outletId: string;
  onBack: () => void;
}

export const OutletSalesOrders = ({ outletId, onBack }: OutletSalesOrdersProps) => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  
  // New order form state
  const [newOrder, setNewOrder] = useState({
    customerName: "",
    orderDate: new Date().toISOString().split('T')[0],
    deliveryDate: "",
    status: "pending" as const,
    paymentStatus: "unpaid" as const,
    notes: ""
  });
  const [orderItems, setOrderItems] = useState<SalesOrderItem[]>([]);
  const [newItem, setNewItem] = useState({
    productName: "",
    quantity: 1,
    unitPrice: 0
  });

  // Mock data for demonstration
  useEffect(() => {
    const loadMockData = () => {
      setLoading(true);
      
      const mockOrders: SalesOrder[] = [
        {
          id: "1",
          orderNumber: "SO-2026-001",
          customerName: "John Doe Enterprises",
          orderDate: "2026-05-25T10:30:00",
          deliveryDate: "2026-05-28T14:00:00",
          status: "pending",
          paymentStatus: "unpaid",
          items: [
            { id: "1", productName: "Premium Coffee Beans 1kg", quantity: 50, unitPrice: 25000, total: 1250000 },
            { id: "2", productName: "Organic Tea Bags (100pcs)", quantity: 30, unitPrice: 15000, total: 450000 },
          ],
          subtotal: 1700000,
          tax: 306000,
          discount: 50000,
          total: 1956000,
          notes: "Deliver before 2 PM"
        },
        {
          id: "2",
          orderNumber: "SO-2026-002",
          customerName: "Sarah Johnson Ltd",
          orderDate: "2026-05-24T14:15:00",
          deliveryDate: "2026-05-27T10:00:00",
          status: "processing",
          paymentStatus: "partial",
          items: [
            { id: "3", productName: "Chocolate Assortment Box", quantity: 100, unitPrice: 35000, total: 3500000 },
            { id: "4", productName: "Gift Wrapping Paper (roll)", quantity: 50, unitPrice: 8000, total: 400000 },
          ],
          subtotal: 3900000,
          tax: 702000,
          discount: 100000,
          total: 4502000,
          notes: "Customer paid 50% advance"
        },
        {
          id: "3",
          orderNumber: "SO-2026-003",
          customerName: "Michael Brown & Co",
          orderDate: "2026-05-23T09:00:00",
          deliveryDate: "2026-05-26T16:00:00",
          status: "completed",
          paymentStatus: "paid",
          items: [
            { id: "5", productName: "Luxury Pen Set", quantity: 25, unitPrice: 45000, total: 1125000 },
            { id: "6", productName: "Leather Notebook", quantity: 40, unitPrice: 28000, total: 1120000 },
          ],
          subtotal: 2245000,
          tax: 404100,
          discount: 0,
          total: 2649100,
          notes: ""
        },
        {
          id: "4",
          orderNumber: "SO-2026-004",
          customerName: "Emily Davis Retail",
          orderDate: "2026-05-22T11:45:00",
          deliveryDate: "2026-05-25T12:00:00",
          status: "cancelled",
          paymentStatus: "unpaid",
          items: [
            { id: "7", productName: "Wireless Mouse", quantity: 60, unitPrice: 18000, total: 1080000 },
            { id: "8", productName: "USB Keyboard", quantity: 60, unitPrice: 32000, total: 1920000 },
          ],
          subtotal: 3000000,
          tax: 540000,
          discount: 150000,
          total: 3390000,
          notes: "Customer requested cancellation"
        },
        {
          id: "5",
          orderNumber: "SO-2026-005",
          customerName: "David Wilson Stores",
          orderDate: "2026-05-26T08:30:00",
          deliveryDate: "2026-05-29T09:00:00",
          status: "pending",
          paymentStatus: "unpaid",
          items: [
            { id: "9", productName: "Stainless Water Bottle", quantity: 200, unitPrice: 12000, total: 2400000 },
            { id: "10", productName: "Insulated Lunch Box", quantity: 150, unitPrice: 22000, total: 3300000 },
          ],
          subtotal: 5700000,
          tax: 1026000,
          discount: 200000,
          total: 6526000,
          notes: "Bulk order - priority delivery"
        },
        {
          id: "6",
          orderNumber: "SO-2026-006",
          customerName: "Lisa Anderson Corp",
          orderDate: "2026-05-21T15:20:00",
          deliveryDate: "2026-05-24T11:00:00",
          status: "completed",
          paymentStatus: "paid",
          items: [
            { id: "11", productName: "Desk Organizer Set", quantity: 80, unitPrice: 15000, total: 1200000 },
            { id: "12", productName: "LED Desk Lamp", quantity: 40, unitPrice: 55000, total: 2200000 },
          ],
          subtotal: 3400000,
          tax: 612000,
          discount: 100000,
          total: 3912000,
          notes: ""
        },
        {
          id: "7",
          orderNumber: "SO-2026-007",
          customerName: "Robert Taylor Inc",
          orderDate: "2026-05-20T13:00:00",
          deliveryDate: "2026-05-23T15:00:00",
          status: "processing",
          paymentStatus: "partial",
          items: [
            { id: "13", productName: "Office Chair Ergonomic", quantity: 20, unitPrice: 185000, total: 3700000 },
            { id: "14", productName: "Standing Desk Converter", quantity: 15, unitPrice: 125000, total: 1875000 },
          ],
          subtotal: 5575000,
          tax: 1003500,
          discount: 300000,
          total: 6278500,
          notes: "30% deposit received"
        },
        {
          id: "8",
          orderNumber: "SO-2026-008",
          customerName: "Jennifer Martinez LLC",
          orderDate: "2026-05-27T07:45:00",
          deliveryDate: "2026-05-30T10:00:00",
          status: "pending",
          paymentStatus: "unpaid",
          items: [
            { id: "15", productName: "Whiteboard Markers (set of 12)", quantity: 100, unitPrice: 9000, total: 900000 },
            { id: "16", productName: "Magnetic Whiteboard 90x60", quantity: 30, unitPrice: 75000, total: 2250000 },
          ],
          subtotal: 3150000,
          tax: 567000,
          discount: 0,
          total: 3717000,
          notes: "School order - tax exempt"
        },
      ];

      setOrders(mockOrders);
      setLoading(false);
    };

    loadMockData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "processing":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "unpaid":
        return "bg-red-100 text-red-800";
      case "partial":
        return "bg-orange-100 text-orange-800";
      case "paid":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "processing":
        return <AlertCircle className="h-4 w-4" />;
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      case "cancelled":
        return <XCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const filteredOrders = orders.filter(order => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        order.orderNumber.toLowerCase().includes(searchLower) ||
        order.customerName.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Status filter
    if (statusFilter !== "all" && order.status !== statusFilter) {
      return false;
    }

    // Payment filter
    if (paymentFilter !== "all" && order.paymentStatus !== paymentFilter) {
      return false;
    }

    // Date range filter
    if (dateRange.start || dateRange.end) {
      const orderDate = new Date(order.orderDate);
      if (dateRange.start && orderDate < new Date(dateRange.start)) return false;
      if (dateRange.end) {
        const endDate = new Date(dateRange.end);
        endDate.setHours(23, 59, 59, 999);
        if (orderDate > endDate) return false;
      }
    }

    return true;
  });

  const calculateStats = () => {
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status === "pending").length;
    const processingOrders = orders.filter(o => o.status === "processing").length;
    const completedOrders = orders.filter(o => o.status === "completed").length;
    const totalValue = orders.reduce((sum, order) => sum + order.total, 0);
    const pendingValue = orders.filter(o => o.status === "pending").reduce((sum, order) => sum + order.total, 0);

    return {
      totalOrders,
      pendingOrders,
      processingOrders,
      completedOrders,
      totalValue,
      pendingValue
    };
  };

  const handleViewOrder = (order: SalesOrder) => {
    setSelectedOrder(order);
    setIsViewDialogOpen(true);
  };

  const handleAddItem = () => {
    if (!newItem.productName || newItem.quantity <= 0 || newItem.unitPrice <= 0) {
      toast({
        title: "Error",
        description: "Please fill in all item fields correctly",
        variant: "destructive"
      });
      return;
    }

    const item: SalesOrderItem = {
      id: Date.now().toString(),
      productName: newItem.productName,
      quantity: newItem.quantity,
      unitPrice: newItem.unitPrice,
      total: newItem.quantity * newItem.unitPrice
    };

    setOrderItems([...orderItems, item]);
    setNewItem({ productName: "", quantity: 1, unitPrice: 0 });
    toast({
      title: "Item Added",
      description: `${item.productName} added to order`
    });
  };

  const handleRemoveItem = (itemId: string) => {
    setOrderItems(orderItems.filter(item => item.id !== itemId));
  };

  const handleCreateOrder = () => {
    if (!newOrder.customerName) {
      toast({
        title: "Error",
        description: "Please enter customer name",
        variant: "destructive"
      });
      return;
    }

    if (orderItems.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one item",
        variant: "destructive"
      });
      return;
    }

    if (!newOrder.deliveryDate) {
      toast({
        title: "Error",
        description: "Please select delivery date",
        variant: "destructive"
      });
      return;
    }

    const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * 0.18;
    const discount = 0;
    const total = subtotal + tax - discount;

    const order: SalesOrder = {
      id: Date.now().toString(),
      orderNumber: `SO-2026-${String(orders.length + 1).padStart(3, '0')}`,
      customerName: newOrder.customerName,
      orderDate: new Date(newOrder.orderDate).toISOString(),
      deliveryDate: new Date(newOrder.deliveryDate).toISOString(),
      status: newOrder.status,
      paymentStatus: newOrder.paymentStatus,
      items: orderItems,
      subtotal,
      tax,
      discount,
      total,
      notes: newOrder.notes
    };

    setOrders([order, ...orders]);
    
    // Reset form
    setNewOrder({
      customerName: "",
      orderDate: new Date().toISOString().split('T')[0],
      deliveryDate: "",
      status: "pending",
      paymentStatus: "unpaid",
      notes: ""
    });
    setOrderItems([]);
    setIsCreateDialogOpen(false);

    toast({
      title: "Order Created",
      description: `Sales order ${order.orderNumber} has been created successfully`
    });
  };

  const handlePrintOrder = (order: SalesOrder) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Print Failed",
        description: "Please allow popups to print",
        variant: "destructive"
      });
      return;
    }

    const itemsHtml = order.items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.productName}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">${formatCurrency(item.unitPrice)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">${formatCurrency(item.total)}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Sales Order - ${order.orderNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 30px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #3b82f6; padding-bottom: 20px; }
          .header h1 { font-size: 28px; color: #3b82f6; margin-bottom: 5px; }
          .header p { font-size: 14px; color: #666; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
          .info-section { background: #f8f9fa; padding: 15px; border-radius: 8px; }
          .info-section h3 { font-size: 14px; color: #666; margin-bottom: 10px; text-transform: uppercase; }
          .info-section p { font-size: 14px; margin-bottom: 5px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          thead { background: #3b82f6; color: white; }
          th { padding: 12px; text-align: left; }
          td { padding: 10px; }
          .totals { margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; }
          .totals p { display: flex; justify-content: space-between; margin-bottom: 8px; }
          .total-row { font-weight: bold; font-size: 18px; border-top: 2px solid #333; padding-top: 10px; }
          .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
          @media print { body { padding: 0; } @page { margin: 1cm; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>SALES ORDER</h1>
          <p>Order Number: ${order.orderNumber}</p>
        </div>
        
        <div class="info-grid">
          <div class="info-section">
            <h3>Customer Information</h3>
            <p><strong>Customer:</strong> ${order.customerName}</p>
            <p><strong>Order Date:</strong> ${new Date(order.orderDate).toLocaleDateString()}</p>
            <p><strong>Delivery Date:</strong> ${new Date(order.deliveryDate).toLocaleDateString()}</p>
          </div>
          <div class="info-section">
            <h3>Order Status</h3>
            <p><strong>Status:</strong> ${order.status.toUpperCase()}</p>
            <p><strong>Payment:</strong> ${order.paymentStatus.toUpperCase()}</p>
            <p><strong>Items:</strong> ${order.items.length}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Unit Price</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="totals">
          <p><span>Subtotal:</span><span>${formatCurrency(order.subtotal)}</span></p>
          <p><span>Tax (18%):</span><span>${formatCurrency(order.tax)}</span></p>
          ${order.discount > 0 ? `<p><span>Discount:</span><span>-${formatCurrency(order.discount)}</span></p>` : ''}
          <p class="total-row"><span>Total Amount:</span><span>${formatCurrency(order.total)}</span></p>
        </div>

        ${order.notes ? `<div style="margin-top: 20px; padding: 15px; background: #fff3cd; border-left: 4px solid #ffc107;"><strong>Notes:</strong> ${order.notes}</div>` : ''}

        <div class="footer">
          <p>Thank you for your business!</p>
          <p>Generated: ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading sales orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Sales Orders</h1>
            <p className="text-muted-foreground mt-1">Manage and track all sales orders</p>
          </div>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          New Sales Order
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">{formatCurrency(stats.totalValue)} total value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingOrders}</div>
            <p className="text-xs text-muted-foreground">{formatCurrency(stats.pendingValue)} pending value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <AlertCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.processingOrders}</div>
            <p className="text-xs text-muted-foreground">Orders being prepared</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completedOrders}</div>
            <p className="text-xs text-muted-foreground">Successfully delivered</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-10 px-3 border rounded-md bg-background"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="w-full h-10 px-3 border rounded-md bg-background"
              >
                <option value="all">All Payments</option>
                <option value="unpaid">Unpaid</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                placeholder="Start date"
              />
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                placeholder="End date"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Orders List</CardTitle>
          <p className="text-sm text-muted-foreground">
            Showing {filteredOrders.length} of {orders.length} orders
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Delivery Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.orderNumber}</TableCell>
                  <TableCell>{order.customerName}</TableCell>
                  <TableCell>{new Date(order.orderDate).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(order.deliveryDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(order.status)}>
                      {getStatusIcon(order.status)}
                      <span className="ml-1 capitalize">{order.status}</span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getPaymentStatusColor(order.paymentStatus)}>
                      {order.paymentStatus.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(order.total)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewOrder(order)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePrintOrder(order)}
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredOrders.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No orders found</p>
              <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Order Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Sales Order Details
            </DialogTitle>
            <DialogDescription>
              Order #{selectedOrder?.orderNumber}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground">CUSTOMER</h3>
                  <p className="text-lg font-medium">{selectedOrder.customerName}</p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground">ORDER STATUS</h3>
                  <Badge className={getStatusColor(selectedOrder.status)}>
                    {getStatusIcon(selectedOrder.status)}
                    <span className="ml-1 capitalize">{selectedOrder.status}</span>
                  </Badge>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground">ORDER DATE</h3>
                  <p className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {new Date(selectedOrder.orderDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground">DELIVERY DATE</h3>
                  <p className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {new Date(selectedOrder.deliveryDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground">PAYMENT STATUS</h3>
                  <Badge className={getPaymentStatusColor(selectedOrder.paymentStatus)}>
                    {selectedOrder.paymentStatus.toUpperCase()}
                  </Badge>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Order Items
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOrder.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(item.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Totals */}
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(selectedOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax (18%)</span>
                  <span>{formatCurrency(selectedOrder.tax)}</span>
                </div>
                {selectedOrder.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="text-red-600">-{formatCurrency(selectedOrder.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total</span>
                  <span className="text-blue-600">{formatCurrency(selectedOrder.total)}</span>
                </div>
              </div>

              {/* Notes */}
              {selectedOrder.notes && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                  <p className="font-medium text-yellow-800">Notes</p>
                  <p className="text-sm text-yellow-700 mt-1">{selectedOrder.notes}</p>
                </div>
              )}

              {/* Actions */}
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => handlePrintOrder(selectedOrder)}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print Order
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create New Order Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Create New Sales Order
            </DialogTitle>
            <DialogDescription>
              Fill in the order details and add items
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Order Details */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Order Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Customer Name *</Label>
                  <Input
                    id="customerName"
                    value={newOrder.customerName}
                    onChange={(e) => setNewOrder({ ...newOrder, customerName: e.target.value })}
                    placeholder="Enter customer name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orderDate">Order Date</Label>
                  <Input
                    id="orderDate"
                    type="date"
                    value={newOrder.orderDate}
                    onChange={(e) => setNewOrder({ ...newOrder, orderDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deliveryDate">Delivery Date *</Label>
                  <Input
                    id="deliveryDate"
                    type="date"
                    value={newOrder.deliveryDate}
                    onChange={(e) => setNewOrder({ ...newOrder, deliveryDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Order Status</Label>
                  <Select
                    value={newOrder.status}
                    onValueChange={(value) => setNewOrder({ ...newOrder, status: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentStatus">Payment Status</Label>
                  <Select
                    value={newOrder.paymentStatus}
                    onValueChange={(value) => setNewOrder({ ...newOrder, paymentStatus: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={newOrder.notes}
                  onChange={(e) => setNewOrder({ ...newOrder, notes: e.target.value })}
                  placeholder="Additional notes or instructions"
                />
              </div>
            </div>

            {/* Add Items */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Order Items</h3>
              <div className="grid grid-cols-12 gap-3 items-end">
                <div className="col-span-5 space-y-2">
                  <Label>Product Name</Label>
                  <Input
                    value={newItem.productName}
                    onChange={(e) => setNewItem({ ...newItem, productName: e.target.value })}
                    placeholder="Enter product name"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="col-span-3 space-y-2">
                  <Label>Unit Price</Label>
                  <Input
                    type="number"
                    min="0"
                    value={newItem.unitPrice}
                    onChange={(e) => setNewItem({ ...newItem, unitPrice: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                </div>
                <div className="col-span-2">
                  <Button onClick={handleAddItem} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
              </div>

              {/* Items List */}
              {orderItems.length > 0 && (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-center">Qty</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.productName}</TableCell>
                          <TableCell className="text-center">{item.quantity}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(item.total)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {orderItems.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No items added yet</p>
                </div>
              )}
            </div>

            {/* Order Summary */}
            {orderItems.length > 0 && (
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal ({orderItems.length} items)</span>
                  <span>{formatCurrency(orderItems.reduce((sum, item) => sum + item.total, 0))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax (18%)</span>
                  <span>{formatCurrency(orderItems.reduce((sum, item) => sum + item.total, 0) * 0.18)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total Amount</span>
                  <span className="text-blue-600">
                    {formatCurrency(orderItems.reduce((sum, item) => sum + item.total, 0) * 1.18)}
                  </span>
                </div>
              </div>
            )}

            {/* Actions */}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateOrder} className="bg-blue-600 hover:bg-blue-700">
                <CheckCircle className="h-4 w-4 mr-2" />
                Create Order
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
