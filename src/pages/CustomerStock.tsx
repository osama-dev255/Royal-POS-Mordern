import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Edit, Trash2, Package, Users, Filter, Download, Printer, FileSpreadsheet, Loader2, CheckCircle, Clock, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import { ExportUtils } from "@/utils/exportUtils";
import { PrintUtils } from "@/utils/printUtils";
import { ExcelUtils } from "@/utils/excelUtils";
import { getSales, getProducts, getCustomers, updateProductStock } from "@/services/databaseService";

interface CustomerStockItem {
  id?: string;
  customerId: string;
  customerName: string;
  productId: string;
  productName: string;
  quantity: number;
  reservedQuantity: number;
  soldQuantity: number;
  status: "reserved" | "delivered" | "cancelled";
  reservationDate?: string;
  deliveryDate?: string;
  notes?: string;
}

interface Product {
  id: string;
  name: string;
  sku?: string;
  stock_quantity: number;
}

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
}

export const CustomerStock = ({ username, onBack, onLogout }: { username: string; onBack: () => void; onLogout: () => void }) => {
  const [customerStockItems, setCustomerStockItems] = useState<CustomerStockItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CustomerStockItem | null>(null);
  const [newItem, setNewItem] = useState<Omit<CustomerStockItem, "id">>({
    customerId: "",
    customerName: "",
    productId: "",
    productName: "",
    quantity: 0,
    reservedQuantity: 0,
    soldQuantity: 0,
    status: "reserved"
  });
  const { toast } = useToast();

  // Load data from Supabase
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load sales data to extract customer stock information
      const sales = await getSales();
      
      // Load products
      const productsData = await getProducts();
      setProducts(productsData);
      
      // Load customers
      const customersData = await getCustomers();
      setCustomers(customersData);
      
      // For now, we'll create mock data since we don't have a specific customer_stock table
      // In a real implementation, you would have a dedicated table for this
      const mockCustomerStock: CustomerStockItem[] = [
        {
          id: "1",
          customerId: customersData[0]?.id || "",
          customerName: customersData[0] ? `${customersData[0].first_name} ${customersData[0].last_name}` : "Customer 1",
          productId: productsData[0]?.id || "",
          productName: productsData[0]?.name || "Product 1",
          quantity: 5,
          reservedQuantity: 3,
          soldQuantity: 2,
          status: "reserved",
          reservationDate: new Date().toISOString(),
          notes: "Reserved for upcoming project"
        },
        {
          id: "2",
          customerId: customersData[1]?.id || "",
          customerName: customersData[1] ? `${customersData[1].first_name} ${customersData[1].last_name}` : "Customer 2",
          productId: productsData[1]?.id || "",
          productName: productsData[1]?.name || "Product 2",
          quantity: 10,
          reservedQuantity: 0,
          soldQuantity: 10,
          status: "delivered",
          reservationDate: new Date(Date.now() - 86400000).toISOString(),
          deliveryDate: new Date().toISOString(),
          notes: "Delivered last week"
        }
      ];
      
      setCustomerStockItems(mockCustomerStock);
    } catch (error) {
      console.error('Error loading customer stock data:', error);
      toast({
        title: "Error",
        description: "Failed to load customer stock data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItem.customerId || !newItem.productId || newItem.quantity <= 0) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      // In a real implementation, you would save to a customer_stock table
      const customer = customers.find(c => c.id === newItem.customerId);
      const product = products.find(p => p.id === newItem.productId);
      
      const newItemWithId: CustomerStockItem = {
        ...newItem,
        id: `item_${Date.now()}`,
        customerName: customer ? `${customer.first_name} ${customer.last_name}` : newItem.customerName,
        productName: product ? product.name : newItem.productName,
        reservationDate: new Date().toISOString()
      };

      setCustomerStockItems(prev => [...prev, newItemWithId]);
      resetForm();
      setIsDialogOpen(false);
      
      toast({
        title: "Success",
        description: "Customer stock item added successfully"
      });
    } catch (error) {
      console.error('Error adding item:', error);
      toast({
        title: "Error",
        description: "Failed to add item",
        variant: "destructive"
      });
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem || !editingItem.customerId || !editingItem.productId || editingItem.quantity <= 0) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      if (!editingItem.id) {
        throw new Error("Item ID is missing");
      }

      // Update the item in the list
      setCustomerStockItems(prev => 
        prev.map(item => item.id === editingItem.id ? editingItem : item)
      );
      
      resetForm();
      setIsDialogOpen(false);
      
      toast({
        title: "Success",
        description: "Customer stock item updated successfully"
      });
    } catch (error) {
      console.error('Error updating item:', error);
      toast({
        title: "Error",
        description: "Failed to update item",
        variant: "destructive"
      });
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      // In a real implementation, you would delete from the customer_stock table
      setCustomerStockItems(prev => prev.filter(item => item.id !== id));
      
      toast({
        title: "Success",
        description: "Customer stock item deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive"
      });
    }
  };

  const handleDeliverItem = async (id: string) => {
    try {
      setCustomerStockItems(prev => 
        prev.map(item => 
          item.id === id 
            ? { 
                ...item, 
                status: "delivered",
                deliveryDate: new Date().toISOString(),
                reservedQuantity: 0,
                soldQuantity: item.quantity
              } 
            : item
        )
      );
      
      toast({
        title: "Success",
        description: "Item marked as delivered"
      });
    } catch (error) {
      console.error('Error delivering item:', error);
      toast({
        title: "Error",
        description: "Failed to mark item as delivered",
        variant: "destructive"
      });
    }
  };

  const handleCancelItem = async (id: string) => {
    try {
      setCustomerStockItems(prev => 
        prev.map(item => 
          item.id === id 
            ? { 
                ...item, 
                status: "cancelled",
                reservedQuantity: 0
              } 
            : item
        )
      );
      
      toast({
        title: "Success",
        description: "Item marked as cancelled"
      });
    } catch (error) {
      console.error('Error cancelling item:', error);
      toast({
        title: "Error",
        description: "Failed to mark item as cancelled",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setNewItem({
      customerId: "",
      customerName: "",
      productId: "",
      productName: "",
      quantity: 0,
      reservedQuantity: 0,
      soldQuantity: 0,
      status: "reserved"
    });
    setEditingItem(null);
  };

  const openEditDialog = (item: CustomerStockItem) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const totalReserved = customerStockItems
    .filter(item => item.status === "reserved")
    .reduce((sum, item) => sum + item.reservedQuantity, 0);
    
  const totalDelivered = customerStockItems
    .filter(item => item.status === "delivered")
    .reduce((sum, item) => sum + item.soldQuantity, 0);

  const filteredItems = customerStockItems.filter(item => {
    const matchesSearch = 
      item.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.productName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navigation 
        title="Customer Stock Management" 
        onBack={onBack}
        onLogout={onLogout} 
        username={username}
      />
      
      <main className="container mx-auto p-6">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold">Customer Stock</h2>
            <p className="text-muted-foreground">Manage uncollected stock and changes after sales to customer</p>
          </div>
          
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                className="pl-8 w-full sm:w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="reserved">Reserved</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            
            <Button onClick={() => PrintUtils.printSalesReport(customerStockItems)}>
              <Printer className="h-4 w-4 mr-2" />
              Print Report
            </Button>
            
            <Button onClick={() => ExportUtils.exportToCSV(customerStockItems, `customer_stock_${new Date().toISOString().split('T')[0]}`)}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            
            <Button variant="outline" onClick={() => ExcelUtils.exportToExcel(customerStockItems, `customer_stock_${new Date().toISOString().split('T')[0]}`)}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openAddDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Reserve Stock
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingItem ? "Edit Reservation" : "Reserve Customer Stock"}
                  </DialogTitle>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="customer">Customer *</Label>
                    <Select
                      value={editingItem ? editingItem.customerId : newItem.customerId}
                      onValueChange={(value) => {
                        const customer = customers.find(c => c.id === value);
                        const customerName = customer ? `${customer.first_name} ${customer.last_name}` : "";
                        editingItem 
                          ? setEditingItem({...editingItem, customerId: value, customerName}) 
                          : setNewItem({...newItem, customerId: value, customerName})
                      }}
                    >
                      <SelectTrigger id="customer">
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map(customer => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.first_name} {customer.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="product">Product *</Label>
                    <Select
                      value={editingItem ? editingItem.productId : newItem.productId}
                      onValueChange={(value) => {
                        const product = products.find(p => p.id === value);
                        const productName = product ? product.name : "";
                        editingItem 
                          ? setEditingItem({...editingItem, productId: value, productName}) 
                          : setNewItem({...newItem, productId: value, productName})
                      }}
                    >
                      <SelectTrigger id="product">
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map(product => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} (Stock: {product.stock_quantity})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="quantity">Quantity *</Label>
                      <Input
                        id="quantity"
                        type="number"
                        min="1"
                        value={editingItem ? editingItem.quantity : newItem.quantity}
                        onChange={(e) => 
                          editingItem 
                            ? setEditingItem({...editingItem, quantity: parseInt(e.target.value) || 0}) 
                            : setNewItem({...newItem, quantity: parseInt(e.target.value) || 0})
                        }
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={editingItem ? editingItem.status : newItem.status}
                        onValueChange={(value) => 
                          editingItem 
                            ? setEditingItem({...editingItem, status: value as "reserved" | "delivered" | "cancelled"}) 
                            : setNewItem({...newItem, status: value as "reserved" | "delivered" | "cancelled"})
                        }
                      >
                        <SelectTrigger id="status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="reserved">Reserved</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Input
                      id="notes"
                      value={editingItem ? editingItem.notes || "" : newItem.notes || ""}
                      onChange={(e) => 
                        editingItem 
                          ? setEditingItem({...editingItem, notes: e.target.value}) 
                          : setNewItem({...newItem, notes: e.target.value})
                      }
                      placeholder="Additional details"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={editingItem ? handleUpdateItem : handleAddItem}>
                    {editingItem ? "Update" : "Reserve"} Stock
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reserved Stock</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalReserved}</div>
              <p className="text-xs text-muted-foreground">Items reserved for customers</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Delivered Stock</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalDelivered}</div>
              <p className="text-xs text-muted-foreground">Items delivered to customers</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Reservations</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{customerStockItems.length}</div>
              <p className="text-xs text-muted-foreground">Active reservations</p>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Customer Stock Reservations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Reserved</TableHead>
                    <TableHead>Sold</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reservation Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No customer stock reservations found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.customerName}</TableCell>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{item.reservedQuantity}</TableCell>
                        <TableCell>{item.soldQuantity}</TableCell>
                        <TableCell>
                          <Badge variant={
                            item.status === "delivered" ? "default" : 
                            item.status === "cancelled" ? "destructive" : "secondary"
                          }>
                            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {item.reservationDate ? new Date(item.reservationDate).toLocaleDateString() : "N/A"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {item.status === "reserved" && (
                              <>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleDeliverItem(item.id!)}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleCancelItem(item.id!)}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openEditDialog(item)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => item.id && handleDeleteItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};