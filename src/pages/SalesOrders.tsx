import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { SalesOrderCard } from "@/components/SalesOrderCard";
import { SalesOrderDetails } from "@/components/SalesOrderDetails";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Calendar, Receipt, Plus, Edit, Trash2, Eye, X } from "lucide-react";
import { getSales, getCustomers, getSaleItemsWithProducts, createSale, updateSale, deleteSale, Customer, Sale, Product, getProducts, createSaleItem } from "@/services/databaseService";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";

interface SalesOrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface SalesOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  orderDate: string;
  status: "pending" | "completed" | "cancelled";
  items: SalesOrderItem[];
  subtotal: number;
  tax: number;
  total: number;
}

export const SalesOrders = ({ username, onBack, onLogout }: { username: string; onBack: () => void; onLogout: () => void }) => {
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSO, setEditingSO] = useState<SalesOrder | null>(null);
  const [viewingSO, setViewingSO] = useState<SalesOrder | null>(null);
  const [newSO, setNewSO] = useState<Omit<SalesOrder, "id" | "orderNumber" | "items" | "subtotal" | "tax" | "total">>({
    customerId: "",
    customerName: "",
    orderDate: new Date().toISOString().split('T')[0],
    status: "pending"
  });
  // State for managing items in the dialog
  const [soItems, setSoItems] = useState<SalesOrderItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<{id: string, name: string, price: number} | null>(null);
  const [itemQuantity, setItemQuantity] = useState(1);
  const { toast } = useToast();

  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string; price: number }[]>([]);

  // Load sales orders, customers, and products from database
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load customers
        const customerData = await getCustomers();
        const formattedCustomers = customerData.map(customer => ({
          id: customer.id || '',
          name: `${customer.first_name} ${customer.last_name}`
        }));
        setCustomers(formattedCustomers);
        
        // Load products
        const productData = await getProducts();
        const formattedProducts = productData.map(product => ({
          id: product.id || '',
          name: product.name || 'Unknown Product',
          price: product.selling_price || 0
        }));
        setProducts(formattedProducts);
        
        // Load sales orders
        const orders = await getSales();
        // Convert database orders to component format
        const formattedOrders = orders.map(order => ({
          id: order.id || '',
          orderNumber: order.invoice_number || `SO-${order.id?.substring(0, 8) || '001'}`,
          customerId: order.customer_id || '',
          customerName: customerData.find(c => c.id === order.customer_id) ? 
            `${customerData.find(c => c.id === order.customer_id)?.first_name} ${customerData.find(c => c.id === order.customer_id)?.last_name}` : 
            'Walk-in Customer',
          orderDate: order.sale_date || new Date().toISOString(),
          status: (order.sale_status as "pending" | "completed" | "cancelled") || "pending",
          items: [], // Will be loaded when needed
          subtotal: 0, // Will be calculated
          tax: 0, // Will be calculated
          total: order.total_amount || 0
        }));
        setSalesOrders(formattedOrders);
      } catch (error) {
        console.error("Error loading data:", error);
        toast({
          title: "Error",
          description: "Failed to load data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleAddSO = async () => {
    if (!newSO.customerId || !newSO.customerName) {
      toast({
        title: "Error",
        description: "Please select a customer",
        variant: "destructive"
      });
      return;
    }

    try {
      // Calculate totals
      const subtotal = soItems.reduce((sum, item) => sum + item.total, 0);
      const tax = subtotal * 0.18; // 18% tax
      const total = subtotal + tax;

      // Create the sales order
      const soData = {
        customer_id: newSO.customerId,
        sale_date: newSO.orderDate,
        subtotal: subtotal,
        tax_amount: tax,
        total_amount: total,
        discount_amount: 0,
        amount_paid: 0, // No payment for pending orders
        change_amount: 0,
        payment_method: "cash",
        payment_status: "unpaid", // Pending orders are unpaid
        sale_status: newSO.status,
        notes: ""
      };

      const createdSO = await createSale(soData);
      
      if (!createdSO) {
        throw new Error("Failed to create sales order");
      }

      // Add items to the sales order
      for (const item of soItems) {
        const itemData = {
          sale_id: createdSO.id!,
          product_id: item.productId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          discount_amount: 0,
          tax_amount: item.unitPrice * 0.18 * item.quantity, // 18% tax
          total_price: item.total
        };
        
        await createSaleItem(itemData);
      }

      // Refresh all data
      const customerData = await getCustomers();
      const formattedCustomers = customerData.map(customer => ({
        id: customer.id || '',
        name: `${customer.first_name} ${customer.last_name}`
      }));
      setCustomers(formattedCustomers);
      
      const productData = await getProducts();
      const formattedProducts = productData.map(product => ({
        id: product.id || '',
        name: product.name || 'Unknown Product',
        price: product.selling_price || 0
      }));
      setProducts(formattedProducts);
      
      const orders = await getSales();
      // Convert database orders to component format
      const formattedOrders = orders.map(order => ({
        id: order.id || '',
        orderNumber: order.invoice_number || `SO-${order.id?.substring(0, 8) || '001'}`,
        customerId: order.customer_id || '',
        customerName: customerData.find(c => c.id === order.customer_id) ? 
          `${customerData.find(c => c.id === order.customer_id)?.first_name} ${customerData.find(c => c.id === order.customer_id)?.last_name}` : 
          'Walk-in Customer',
        orderDate: order.sale_date || new Date().toISOString(),
        status: (order.sale_status as "pending" | "completed" | "cancelled") || "pending",
        items: [], // Will be loaded when needed
        subtotal: 0, // Will be calculated
        tax: 0, // Will be calculated
        total: order.total_amount || 0
      }));
      setSalesOrders(formattedOrders);
      
      resetForm();
      setIsDialogOpen(false);
      
      toast({
        title: "Success",
        description: "Sales order created successfully"
      });
    } catch (error) {
      console.error("Error creating sales order:", error);
      toast({
        title: "Error",
        description: "Failed to create sales order: " + (error as Error).message,
        variant: "destructive"
      });
    }
  };

  const handleUpdateSO = async () => {
    if (!editingSO || !editingSO.customerId || !editingSO.customerName) {
      toast({
        title: "Error",
        description: "Please select a customer",
        variant: "destructive"
      });
      return;
    }

    try {
      // Calculate totals
      const subtotal = soItems.reduce((sum, item) => sum + item.total, 0);
      const tax = subtotal * 0.18; // 18% tax
      const total = subtotal + tax;

      // Update the sales order
      const soData = {
        customer_id: editingSO.customerId,
        sale_date: editingSO.orderDate,
        subtotal: subtotal,
        tax_amount: tax,
        total_amount: total,
        discount_amount: 0,
        amount_paid: editingSO.status === "completed" ? total : 0, // Payment only when completed
        change_amount: 0,
        payment_method: "cash",
        payment_status: editingSO.status === "completed" ? "paid" : "unpaid",
        sale_status: editingSO.status,
        notes: "",
        updated_at: new Date().toISOString()
      };

      const updatedSO = await updateSale(editingSO.id, soData);
      
      if (!updatedSO) {
        throw new Error("Failed to update sales order");
      }

      // Refresh all data
      const customerData = await getCustomers();
      const formattedCustomers = customerData.map(customer => ({
        id: customer.id || '',
        name: `${customer.first_name} ${customer.last_name}`
      }));
      setCustomers(formattedCustomers);
      
      const productData = await getProducts();
      const formattedProducts = productData.map(product => ({
        id: product.id || '',
        name: product.name || 'Unknown Product',
        price: product.selling_price || 0
      }));
      setProducts(formattedProducts);
      
      const orders = await getSales();
      // Convert database orders to component format
      const formattedOrders = orders.map(order => ({
        id: order.id || '',
        orderNumber: order.invoice_number || `SO-${order.id?.substring(0, 8) || '001'}`,
        customerId: order.customer_id || '',
        customerName: customerData.find(c => c.id === order.customer_id) ? 
          `${customerData.find(c => c.id === order.customer_id)?.first_name} ${customerData.find(c => c.id === order.customer_id)?.last_name}` : 
          'Walk-in Customer',
        orderDate: order.sale_date || new Date().toISOString(),
        status: (order.sale_status as "pending" | "completed" | "cancelled") || "pending",
        items: [], // Will be loaded when needed
        subtotal: 0, // Will be calculated
        tax: 0, // Will be calculated
        total: order.total_amount || 0
      }));
      setSalesOrders(formattedOrders);
      
      resetForm();
      setIsDialogOpen(false);
      
      toast({
        title: "Success",
        description: "Sales order updated successfully"
      });
    } catch (error) {
      console.error("Error updating sales order:", error);
      toast({
        title: "Error",
        description: "Failed to update sales order: " + (error as Error).message,
        variant: "destructive"
      });
    }
  };

  const handleDeleteSO = async (id: string) => {
    try {
      const success = await deleteSale(id);
      
      if (!success) {
        throw new Error("Failed to delete sales order");
      }

      // Refresh all data
      const customerData = await getCustomers();
      const formattedCustomers = customerData.map(customer => ({
        id: customer.id || '',
        name: `${customer.first_name} ${customer.last_name}`
      }));
      setCustomers(formattedCustomers);
      
      const productData = await getProducts();
      const formattedProducts = productData.map(product => ({
        id: product.id || '',
        name: product.name || 'Unknown Product',
        price: product.selling_price || 0
      }));
      setProducts(formattedProducts);
      
      const orders = await getSales();
      // Convert database orders to component format
      const formattedOrders = orders.map(order => ({
        id: order.id || '',
        orderNumber: order.invoice_number || `SO-${order.id?.substring(0, 8) || '001'}`,
        customerId: order.customer_id || '',
        customerName: customerData.find(c => c.id === order.customer_id) ? 
          `${customerData.find(c => c.id === order.customer_id)?.first_name} ${customerData.find(c => c.id === order.customer_id)?.last_name}` : 
          'Walk-in Customer',
        orderDate: order.sale_date || new Date().toISOString(),
        status: (order.sale_status as "pending" | "completed" | "cancelled") || "pending",
        items: [], // Will be loaded when needed
        subtotal: 0, // Will be calculated
        tax: 0, // Will be calculated
        total: order.total_amount || 0
      }));
      setSalesOrders(formattedOrders);
      
      toast({
        title: "Success",
        description: "Sales order deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting sales order:", error);
      toast({
        title: "Error",
        description: "Failed to delete sales order: " + (error as Error).message,
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setNewSO({
      customerId: "",
      customerName: "",
      orderDate: new Date().toISOString().split('T')[0],
      status: "pending"
    });
    setEditingSO(null);
    setViewingSO(null);
    setSoItems([]);
    setSelectedProduct(null);
    setItemQuantity(1);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = async (so: SalesOrder) => {
    try {
      // Load the sales order items
      const items = await getSaleItemsWithProducts(so.id);
      const productData = await getProducts();
      const formattedItems = items.map(item => ({
        id: item.id || '',
        productId: item.product_id || '',
        productName: item.product?.name || 'Unknown Product',
        quantity: item.quantity || 0,
        unitPrice: item.unit_price || 0,
        total: item.total_price || 0
      }));
      
      const formattedSO = {
        ...so,
        orderDate: so.orderDate || new Date().toISOString().split('T')[0],
        items: formattedItems
      };
      
      setEditingSO(formattedSO);
      setSoItems(formattedItems);
      setIsDialogOpen(true);
    } catch (error) {
      console.error("Error loading sales order items:", error);
      toast({
        title: "Error",
        description: "Failed to load sales order items",
        variant: "destructive"
      });
    }
  };

  const openViewDialog = async (so: SalesOrder) => {
    try {
      // Load the sales order items
      const items = await getSaleItemsWithProducts(so.id);
      const productData = await getProducts();
      const formattedItems = items.map(item => ({
        id: item.id || '',
        productId: item.product_id || '',
        productName: item.product?.name || 'Unknown Product',
        quantity: item.quantity || 0,
        unitPrice: item.unit_price || 0,
        total: item.total_price || 0
      }));
      
      const formattedSO = {
        ...so,
        orderDate: so.orderDate || new Date().toISOString().split('T')[0],
        items: formattedItems
      };
      
      setViewingSO(formattedSO);
      setIsDialogOpen(true);
    } catch (error) {
      console.error("Error loading sales order items:", error);
      toast({
        title: "Error",
        description: "Failed to load sales order items",
        variant: "destructive"
      });
    }
  };

  const handleCustomerChange = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      if (viewingSO) return; // Do nothing in view mode
      else if (editingSO) 
        setEditingSO({...editingSO, customerId, customerName: customer.name});
      else 
        setNewSO({...newSO, customerId, customerName: customer.name});
    }
  };

  const handleAddItem = () => {
    if (!selectedProduct || viewingSO) return; // Do nothing in view mode
    
    const newItem: SalesOrderItem = {
      id: Date.now().toString(), // Temporary ID
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      quantity: itemQuantity,
      unitPrice: selectedProduct.price,
      total: selectedProduct.price * itemQuantity
    };
    
    setSoItems([...soItems, newItem]);
    setSelectedProduct(null);
    setItemQuantity(1);
  };

  const handleRemoveItem = (itemId: string) => {
    if (viewingSO) return; // Do nothing in view mode
    setSoItems(soItems.filter(item => item.id !== itemId));
  };

  const filteredSalesOrders = salesOrders.filter(so => {
    const matchesSearch = 
      so.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      so.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || so.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation 
          title="Sales Orders" 
          onBack={onBack}
          onLogout={onLogout} 
          username={username}
        />
        <main className="container mx-auto p-6">
          <div className="flex justify-center items-center h-64">
            <p>Loading sales orders...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation 
        title="Sales Orders" 
        onBack={onBack}
        onLogout={onLogout} 
        username={username}
      />
      
      <main className="container mx-auto p-6">
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold">Sales Orders</h2>
              <p className="text-muted-foreground">Manage and view all sales orders</p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openAddDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Sales Order
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {viewingSO ? "View Sales Order" : editingSO ? "Edit Sales Order" : "Create Sales Order"}
                  </DialogTitle>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="customer">Customer *</Label>
                    <Select
                      value={viewingSO ? viewingSO.customerId : (editingSO ? editingSO.customerId : newSO.customerId)}
                      onValueChange={handleCustomerChange}
                      disabled={!!viewingSO} // Disable in view mode
                    >
                      <SelectTrigger id="customer">
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="walk-in">Walk-in Customer</SelectItem>
                        {customers.map(customer => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="orderDate">Order Date</Label>
                      <Input
                        id="orderDate"
                        type="date"
                        value={viewingSO ? viewingSO.orderDate : (editingSO ? editingSO.orderDate : newSO.orderDate)}
                        onChange={(e) => 
                          viewingSO
                            ? null // Do nothing in view mode
                            : editingSO 
                              ? setEditingSO({...editingSO, orderDate: e.target.value}) 
                              : setNewSO({...newSO, orderDate: e.target.value})
                        }
                        disabled={!!viewingSO} // Disable in view mode
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={viewingSO ? viewingSO.status : (editingSO ? editingSO.status : newSO.status)}
                        onValueChange={(value: "pending" | "completed" | "cancelled") => 
                          viewingSO
                            ? null // Do nothing in view mode
                            : editingSO 
                              ? setEditingSO({...editingSO, status: value}) 
                              : setNewSO({...newSO, status: value})
                        }
                        disabled={!!viewingSO} // Disable in view mode
                      >
                        <SelectTrigger id="status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending Approval</SelectItem>
                          <SelectItem value="completed">Approved</SelectItem>
                          <SelectItem value="cancelled">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* Add Item Section */}
                  <div className="border rounded-lg p-4">
                    <h3 className="font-medium mb-3">Add Items</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                      <div className="md:col-span-2">
                        <Label htmlFor="product">Product</Label>
                        <Select
                          value={selectedProduct?.id || ""}
                          onValueChange={(value) => {
                            const product = products.find(p => p.id === value);
                            if (product) {
                              setSelectedProduct(product);
                            }
                          }}
                          disabled={!!viewingSO} // Disable in view mode
                        >
                          <SelectTrigger id="product">
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map(product => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name} - {formatCurrency(product.price)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="quantity">Quantity</Label>
                        <Input
                          id="quantity"
                          type="number"
                          min="1"
                          value={itemQuantity}
                          onChange={(e) => setItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                          disabled={!!viewingSO} // Disable in view mode
                        />
                      </div>
                      
                      <div className="flex items-end">
                        <Button 
                          onClick={handleAddItem}
                          className="w-full"
                          disabled={!!viewingSO} // Disable in view mode
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Item
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Items List */}
                  {viewingSO ? (
                    // View mode - show items in a read-only format
                    <div className="border rounded-lg p-4">
                      <h3 className="font-medium mb-3">Items</h3>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {viewingSO.items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-2 border rounded">
                            <div>
                              <div className="font-medium">{item.productName}</div>
                              <div className="text-sm text-muted-foreground">
                                {item.quantity} × {formatCurrency(item.unitPrice)} = {formatCurrency(item.total)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span>{formatCurrency(viewingSO.items.reduce((sum, item) => sum + item.total, 0))}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tax (18%):</span>
                          <span>{formatCurrency(viewingSO.items.reduce((sum, item) => sum + item.total, 0) * 0.18)}</span>
                        </div>
                        <div className="flex justify-between font-bold">
                          <span>Total:</span>
                          <span>{formatCurrency(viewingSO.items.reduce((sum, item) => sum + item.total, 0) * 1.18)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Edit/Create mode - show editable items
                    soItems.length > 0 && (
                      <div className="border rounded-lg p-4">
                        <h3 className="font-medium mb-3">Items</h3>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {soItems.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-2 border rounded">
                              <div>
                                <div className="font-medium">{item.productName}</div>
                                <div className="text-sm text-muted-foreground">
                                  {item.quantity} × {formatCurrency(item.unitPrice)} = {formatCurrency(item.total)}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveItem(item.id)}
                                disabled={!!viewingSO} // Disable in view mode
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span>{formatCurrency(soItems.reduce((sum, item) => sum + item.total, 0))}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Tax (18%):</span>
                            <span>{formatCurrency(soItems.reduce((sum, item) => sum + item.total, 0) * 0.18)}</span>
                          </div>
                          <div className="flex justify-between font-bold">
                            <span>Total:</span>
                            <span>{formatCurrency(soItems.reduce((sum, item) => sum + item.total, 0) * 1.18)}</span>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
                
                <div className="flex justify-end gap-2">
                  {viewingSO ? (
                    // View mode - only show close button
                    <Button onClick={() => setIsDialogOpen(false)}>
                      Close
                    </Button>
                  ) : (
                    // Edit/Create mode - show full buttons
                    <>
                      <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={editingSO ? handleUpdateSO : handleAddSO}>
                        {editingSO ? "Update" : "Create"} Sales Order
                      </Button>
                    </>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by order number or customer..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending Approval</SelectItem>
                    <SelectItem value="completed">Approved</SelectItem>
                    <SelectItem value="cancelled">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Sales Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSalesOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No sales orders found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSalesOrders.map((so) => (
                    <TableRow key={so.id}>
                      <TableCell className="font-medium">{so.orderNumber}</TableCell>
                      <TableCell>{so.customerName}</TableCell>
                      <TableCell>{so.orderDate}</TableCell>
                      <TableCell>{so.items.length}</TableCell>
                      <TableCell>{formatCurrency(so.total)}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            so.status === "pending" ? "secondary" :
                            so.status === "completed" ? "default" : "destructive"
                          }
                        >
                          {so.status === "pending" ? "Pending Approval" : 
                           so.status === "completed" ? "Approved" : "Rejected"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openViewDialog(so)}
                            title="View sales order"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openEditDialog(so)}
                            title="Edit sales order"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleDeleteSO(so.id)}
                            title="Delete sales order"
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
          </CardContent>
        </Card>
      </main>
    </div>
  );
};