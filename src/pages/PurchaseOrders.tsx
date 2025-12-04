import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Edit, Trash2, ShoppingCart, Truck, Calendar, X, RefreshCw, Printer, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import { getPurchaseOrders, createPurchaseOrder, updatePurchaseOrder, deletePurchaseOrderWithItems, getSuppliers, getPurchaseOrderItems, createPurchaseOrderItem, updatePurchaseOrderItem, getProducts } from "@/services/databaseService";
import { PrintUtils } from "@/utils/printUtils";

interface PurchaseOrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  orderDate: string;
  expectedDelivery: string;
  status: "draft" | "ordered" | "received" | "cancelled";
  items: PurchaseOrderItem[];
  subtotal: number;
  tax: number;
  total: number;
}

export const PurchaseOrders = ({ username, onBack, onLogout }: { username: string; onBack: () => void; onLogout: () => void }) => {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
  const [viewingPO, setViewingPO] = useState<PurchaseOrder | null>(null);
  const [newPO, setNewPO] = useState<Omit<PurchaseOrder, "id" | "poNumber" | "items" | "subtotal" | "tax" | "total">>({
    supplierId: "",
    supplierName: "",
    orderDate: new Date().toISOString().split('T')[0], // Ensure proper date format
    expectedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Ensure proper date format
    status: "draft"
  });
  // State for managing items in the dialog
  const [poItems, setPoItems] = useState<PurchaseOrderItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<{id: string, name: string, price: number} | null>(null);
  const [itemQuantity, setItemQuantity] = useState(1);
  const { toast } = useToast();

  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string; price: number }[]>([]);

  // Load purchase orders, suppliers, and products from database
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load suppliers
        const supplierData = await getSuppliers();
        const formattedSuppliers = supplierData.map(supplier => ({
          id: supplier.id || '',
          name: supplier.name || 'Unknown Supplier'
        }));
        setSuppliers(formattedSuppliers);
        
        // Load products
        const productData = await getProducts();
        const formattedProducts = productData.map(product => ({
          id: product.id || '',
          name: product.name || 'Unknown Product',
          price: product.cost_price || 0
        }));
        setProducts(formattedProducts);
        
        // Load purchase orders
        const orders = await getPurchaseOrders();
        // Convert database orders to component format
        const formattedOrders = orders.map(order => ({
          id: order.id || '',
          poNumber: order.order_number || `PO-${order.id?.substring(0, 8) || '001'}`,
          supplierId: order.supplier_id || '',
          supplierName: supplierData.find(s => s.id === order.supplier_id)?.name || 'Unknown Supplier',
          orderDate: order.order_date || new Date().toISOString(),
          expectedDelivery: order.expected_delivery_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: (order.status as "draft" | "ordered" | "received" | "cancelled") || "draft",
          items: [], // Will be loaded when needed
          subtotal: 0, // Will be calculated
          tax: 0, // Will be calculated
          total: order.total_amount || 0
        }));
        setPurchaseOrders(formattedOrders);
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

  const handleAddPO = async () => {
    if (!newPO.supplierId || !newPO.supplierName) {
      toast({
        title: "Error",
        description: "Please select a supplier",
        variant: "destructive"
      });
      return;
    }

    try {
      // Create the purchase order
      const poData = {
        supplier_id: newPO.supplierId,
        order_date: newPO.orderDate, // This should be a date string in 'YYYY-MM-DD' format
        expected_delivery_date: newPO.expectedDelivery, // This should be a date string in 'YYYY-MM-DD' format
        status: newPO.status,
        total_amount: 0 // Will be updated after items are added
      };

      const createdPO = await createPurchaseOrder(poData);
      
      if (!createdPO) {
        throw new Error("Failed to create purchase order");
      }

      // Add items to the purchase order
      let totalAmount = 0;
      for (const item of poItems) {
        const itemData = {
          purchase_order_id: createdPO.id!,
          product_id: item.productId,
          quantity_ordered: item.quantity,
          quantity_received: item.quantity,
          unit_cost: item.unitPrice,
          total_cost: item.total
        };
        
        await createPurchaseOrderItem(itemData);
        totalAmount += item.total;
      }

      // Update the purchase order with the correct total amount
      await updatePurchaseOrder(createdPO.id!, { total_amount: totalAmount });

      // Refresh all data
      const supplierData = await getSuppliers();
      const formattedSuppliers = supplierData.map(supplier => ({
        id: supplier.id || '',
        name: supplier.name || 'Unknown Supplier'
      }));
      setSuppliers(formattedSuppliers);
      
      const productData = await getProducts();
      const formattedProducts = productData.map(product => ({
        id: product.id || '',
        name: product.name || 'Unknown Product',
        price: product.cost_price || 0
      }));
      setProducts(formattedProducts);
      
      const orders = await getPurchaseOrders();
      // Convert database orders to component format
      const formattedOrders = orders.map(order => ({
        id: order.id || '',
        poNumber: order.order_number || `PO-${order.id?.substring(0, 8) || '001'}`,
        supplierId: order.supplier_id || '',
        supplierName: supplierData.find(s => s.id === order.supplier_id)?.name || 'Unknown Supplier',
        orderDate: order.order_date || new Date().toISOString().split('T')[0], // Ensure proper date format
        expectedDelivery: order.expected_delivery_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Ensure proper date format
        status: (order.status as "draft" | "ordered" | "received" | "cancelled") || "draft",
        items: [], // Will be loaded when needed
        subtotal: 0, // Will be calculated
        tax: 0, // Will be calculated
        total: order.total_amount || 0
      }));
      setPurchaseOrders(formattedOrders);
      
      resetForm();
      setIsDialogOpen(false);
      
      toast({
        title: "Success",
        description: "Purchase order created successfully"
      });
    } catch (error) {
      console.error("Error creating purchase order:", error);
      toast({
        title: "Error",
        description: "Failed to create purchase order: " + (error as Error).message,
        variant: "destructive"
      });
    }
  };

  const handleUpdatePO = async () => {
    if (!editingPO || !editingPO.supplierId || !editingPO.supplierName) {
      toast({
        title: "Error",
        description: "Please select a supplier",
        variant: "destructive"
      });
      return;
    }

    try {
      // Update the purchase order
      const poData = {
        supplier_id: editingPO.supplierId,
        order_date: editingPO.orderDate, // Ensure proper date format
        expected_delivery_date: editingPO.expectedDelivery, // Ensure proper date format
        status: editingPO.status,
        total_amount: editingPO.total
      };

      const updatedPO = await updatePurchaseOrder(editingPO.id, poData);
      
      if (!updatedPO) {
        throw new Error("Failed to update purchase order");
      }

      // Refresh all data
      const supplierData = await getSuppliers();
      const formattedSuppliers = supplierData.map(supplier => ({
        id: supplier.id || '',
        name: supplier.name || 'Unknown Supplier'
      }));
      setSuppliers(formattedSuppliers);
      
      const productData = await getProducts();
      const formattedProducts = productData.map(product => ({
        id: product.id || '',
        name: product.name || 'Unknown Product',
        price: product.cost_price || 0
      }));
      setProducts(formattedProducts);
      
      const orders = await getPurchaseOrders();
      // Convert database orders to component format
      const formattedOrders = orders.map(order => ({
        id: order.id || '',
        poNumber: order.order_number || `PO-${order.id?.substring(0, 8) || '001'}`,
        supplierId: order.supplier_id || '',
        supplierName: supplierData.find(s => s.id === order.supplier_id)?.name || 'Unknown Supplier',
        orderDate: order.order_date || new Date().toISOString().split('T')[0], // Ensure proper date format
        expectedDelivery: order.expected_delivery_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Ensure proper date format
        status: (order.status as "draft" | "ordered" | "received" | "cancelled") || "draft",
        items: [], // Will be loaded when needed
        subtotal: 0, // Will be calculated
        tax: 0, // Will be calculated
        total: order.total_amount || 0
      }));
      setPurchaseOrders(formattedOrders);
      
      // Load items for the updated PO and show dialog
      const updatedOrder = formattedOrders.find(order => order.id === editingPO.id) || null;
      if (updatedOrder) {
        // Load the purchase order items
        const items = await getPurchaseOrderItems(updatedOrder.id);
        const productData = await getProducts();
        const formattedItems = items.map(item => ({
          id: item.id || '',
          productId: item.product_id || '',
          productName: productData.find(p => p.id === item.product_id)?.name || 'Unknown Product',
          quantity: item.quantity_ordered,
          unitPrice: item.unit_cost,
          total: item.total_cost
        }));
        
        const orderWithItems = {
          ...updatedOrder,
          items: formattedItems
        };
        
        setUpdatedPO(orderWithItems);
        setShowPostUpdateDialog(true);
      }
      
      resetForm();
      setIsDialogOpen(false);
      
      toast({
        title: "Success",
        description: "Purchase order updated successfully"
      });
    } catch (error) {
      console.error("Error updating purchase order:", error);
      toast({
        title: "Error",
        description: "Failed to update purchase order: " + (error as Error).message,
        variant: "destructive"
      });
    }
  };

  const handleDeletePO = async (id: string) => {
    try {
      const success = await deletePurchaseOrderWithItems(id);
      
      if (!success) {
        throw new Error("Failed to delete purchase order");
      }

      // Refresh all data
      const supplierData = await getSuppliers();
      const formattedSuppliers = supplierData.map(supplier => ({
        id: supplier.id || '',
        name: supplier.name || 'Unknown Supplier'
      }));
      setSuppliers(formattedSuppliers);
      
      const productData = await getProducts();
      const formattedProducts = productData.map(product => ({
        id: product.id || '',
        name: product.name || 'Unknown Product',
        price: product.cost_price || 0
      }));
      setProducts(formattedProducts);
      
      const orders = await getPurchaseOrders();
      // Convert database orders to component format
      const formattedOrders = orders.map(order => ({
        id: order.id || '',
        poNumber: order.order_number || `PO-${order.id?.substring(0, 8) || '001'}`,
        supplierId: order.supplier_id || '',
        supplierName: supplierData.find(s => s.id === order.supplier_id)?.name || 'Unknown Supplier',
        orderDate: order.order_date || new Date().toISOString(),
        expectedDelivery: order.expected_delivery_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: (order.status as "draft" | "ordered" | "received" | "cancelled") || "draft",
        items: [], // Will be loaded when needed
        subtotal: 0, // Will be calculated
        tax: 0, // Will be calculated
        total: order.total_amount || 0
      }));
      setPurchaseOrders(formattedOrders);
      
      toast({
        title: "Success",
        description: "Purchase order deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting purchase order:", error);
      toast({
        title: "Error",
        description: "Failed to delete purchase order: " + (error as Error).message,
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setNewPO({
      supplierId: "",
      supplierName: "",
      orderDate: new Date().toISOString().split('T')[0],
      expectedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: "draft"
    });
    setEditingPO(null);
    setViewingPO(null);
    setPoItems([]);
    setSelectedProduct(null);
    setItemQuantity(1);
  };

  const openEditDialog = async (po: PurchaseOrder) => {
    try {
      // Load the purchase order items
      const items = await getPurchaseOrderItems(po.id);
      const productData = await getProducts();
      const formattedItems = items.map(item => ({
        id: item.id || '',
        productId: item.product_id || '',
        productName: productData.find(p => p.id === item.product_id)?.name || 'Unknown Product',
        quantity: item.quantity_ordered,
        unitPrice: item.unit_cost,
        total: item.total_cost
      }));
      
      // Ensure proper date format for editing
      const formattedPO = {
        ...po,
        orderDate: po.orderDate || new Date().toISOString().split('T')[0],
        expectedDelivery: po.expectedDelivery || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };
      
      setEditingPO(formattedPO);
      setPoItems(formattedItems);
      setIsDialogOpen(true);
    } catch (error) {
      console.error("Error loading purchase order items:", error);
      toast({
        title: "Error",
        description: "Failed to load purchase order items",
        variant: "destructive"
      });
    }
  };

  // Add this new function
  const openViewDialog = async (po: PurchaseOrder) => {
    try {
      // Load the purchase order items
      const items = await getPurchaseOrderItems(po.id);
      const productData = await getProducts();
      const formattedItems = items.map(item => ({
        id: item.id || '',
        productId: item.product_id || '',
        productName: productData.find(p => p.id === item.product_id)?.name || 'Unknown Product',
        quantity: item.quantity_ordered,
        unitPrice: item.unit_cost,
        total: item.total_cost
      }));
      
      // Ensure proper date format for viewing
      const formattedPO = {
        ...po,
        orderDate: po.orderDate || new Date().toISOString().split('T')[0],
        expectedDelivery: po.expectedDelivery || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };
      
      setViewingPO({
        ...formattedPO,
        items: formattedItems
      });
      setIsDialogOpen(true);
    } catch (error) {
      console.error("Error loading purchase order items:", error);
      toast({
        title: "Error",
        description: "Failed to load purchase order items",
        variant: "destructive"
      });
    }
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleSupplierChange = (supplierId: string) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    if (supplier) {
      if (editingPO) {
        setEditingPO({
          ...editingPO,
          supplierId,
          supplierName: supplier.name
        });
      } else {
        setNewPO({
          ...newPO,
          supplierId,
          supplierName: supplier.name
        });
      }
    }
  };

  // Add item to the purchase order
  const handleAddItem = () => {
    if (!selectedProduct) {
      toast({
        title: "Error",
        description: "Please select a product",
        variant: "destructive"
      });
      return;
    }

    if (itemQuantity <= 0) {
      toast({
        title: "Error",
        description: "Quantity must be greater than 0",
        variant: "destructive"
      });
      return;
    }

    const newItem: PurchaseOrderItem = {
      id: `item-${Date.now()}`,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      quantity: itemQuantity,
      unitPrice: selectedProduct.price,
      total: selectedProduct.price * itemQuantity
    };

    setPoItems([...poItems, newItem]);
    setSelectedProduct(null);
    setItemQuantity(1);
  };

  // Remove item from the purchase order
  const handleRemoveItem = (itemId: string) => {
    setPoItems(poItems.filter(item => item.id !== itemId));
  };

  const filteredPOs = purchaseOrders.filter(po => {
    const matchesSearch = 
      po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.supplierName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || po.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const [showPostUpdateDialog, setShowPostUpdateDialog] = useState(false);
  const [updatedPO, setUpdatedPO] = useState<PurchaseOrder | null>(null);

  const handlePrintPO = async () => {
    if (updatedPO) {
      // Prepare data for printing
      const poData = {
        orderNumber: updatedPO.poNumber,
        date: updatedPO.orderDate,
        supplier: {
          name: updatedPO.supplierName
        },
        items: updatedPO.items,
        total: updatedPO.total
      };
      
      PrintUtils.printPurchaseOrder(poData);
      setShowPostUpdateDialog(false);
    }
  };

  const handleQuit = () => {
    setShowPostUpdateDialog(false);
    setUpdatedPO(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation 
        title="Purchase Orders" 
        onBack={onBack}
        onLogout={onLogout} 
        username={username}
      />
      
      <main className="container mx-auto p-6">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold">Purchase Orders</h2>
            <p className="text-muted-foreground">Manage supplier orders and inventory replenishment</p>
          </div>
          
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search purchase orders..."
                className="pl-8 w-full sm:w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
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
            
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                resetForm();
              }
            }}>
              <DialogTrigger asChild>
                <Button onClick={openAddDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  New PO
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {viewingPO ? "View Purchase Order" : editingPO ? "Edit Purchase Order" : "Create Purchase Order"}
                  </DialogTitle>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="supplier">Supplier *</Label>
                    <Select
                      value={viewingPO ? viewingPO.supplierId : (editingPO ? editingPO.supplierId : newPO.supplierId)}
                      onValueChange={handleSupplierChange}
                      disabled={!!viewingPO} // Disable in view mode
                    >
                      <SelectTrigger id="supplier">
                        <SelectValue placeholder="Select supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map(supplier => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
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
                        value={viewingPO ? viewingPO.orderDate : (editingPO ? editingPO.orderDate : newPO.orderDate)}
                        onChange={(e) => 
                          viewingPO
                            ? null // Do nothing in view mode
                            : editingPO 
                              ? setEditingPO({...editingPO, orderDate: e.target.value}) 
                              : setNewPO({...newPO, orderDate: e.target.value})
                        }
                        disabled={!!viewingPO} // Disable in view mode
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="expectedDelivery">Expected Delivery</Label>
                      <Input
                        id="expectedDelivery"
                        type="date"
                        value={viewingPO ? viewingPO.expectedDelivery : (editingPO ? editingPO.expectedDelivery : newPO.expectedDelivery)}
                        onChange={(e) => 
                          viewingPO
                            ? null // Do nothing in view mode
                            : editingPO 
                              ? setEditingPO({...editingPO, expectedDelivery: e.target.value}) 
                              : setNewPO({...newPO, expectedDelivery: e.target.value})
                        }
                        disabled={!!viewingPO} // Disable in view mode
                      />
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={viewingPO ? viewingPO.status : (editingPO ? editingPO.status : newPO.status)}
                      onValueChange={(value: "draft" | "ordered" | "received" | "cancelled") => 
                        viewingPO
                          ? null // Do nothing in view mode
                          : editingPO 
                            ? setEditingPO({...editingPO, status: value}) 
                            : setNewPO({...newPO, status: value})
                      }
                      disabled={!!viewingPO} // Disable in view mode
                    >
                      <SelectTrigger id="status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="ordered">Ordered</SelectItem>
                        <SelectItem value="received">Received</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
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
                          disabled={!!viewingPO} // Disable in view mode
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
                          disabled={!!viewingPO} // Disable in view mode
                        />
                      </div>
                      
                      <div className="flex items-end">
                        <Button 
                          onClick={handleAddItem}
                          className="w-full"
                          disabled={!!viewingPO} // Disable in view mode
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Item
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Items List */}
                  {viewingPO ? (
                    // View mode - show items in a read-only format
                    <div className="border rounded-lg p-4">
                      <h3 className="font-medium mb-3">Items</h3>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {viewingPO.items.map((item) => (
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
                          <span>{formatCurrency(viewingPO.items.reduce((sum, item) => sum + item.total, 0))}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Edit/Create mode - show editable items
                    poItems.length > 0 && (
                      <div className="border rounded-lg p-4">
                        <h3 className="font-medium mb-3">Items</h3>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {poItems.map((item) => (
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
                                disabled={!!viewingPO} // Disable in view mode
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span>{formatCurrency(poItems.reduce((sum, item) => sum + item.total, 0))}</span>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
                
                <div className="flex justify-end gap-2">
                  {viewingPO ? (
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
                      <Button onClick={editingPO ? handleUpdatePO : handleAddPO}>
                        {editingPO ? "Update" : "Create"} PO
                      </Button>
                    </>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Purchase Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Expected Delivery</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPOs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No purchase orders found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPOs.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell className="font-medium">{po.poNumber}</TableCell>
                      <TableCell>{po.supplierName}</TableCell>
                      <TableCell>{po.orderDate}</TableCell>
                      <TableCell>{po.expectedDelivery}</TableCell>
                      <TableCell>{po.items.length}</TableCell>
                      <TableCell>{formatCurrency(po.total)}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            po.status === "draft" ? "secondary" :
                            po.status === "ordered" ? "default" :
                            po.status === "received" ? "default" : "destructive"
                          }
                        >
                          {po.status.charAt(0).toUpperCase() + po.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openViewDialog(po)}
                            title="View purchase order"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openEditDialog(po)}
                            title="Edit purchase order"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleDeletePO(po.id)}
                            title="Delete purchase order"
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
      
      {/* Post Update Dialog */}
      <Dialog open={showPostUpdateDialog} onOpenChange={setShowPostUpdateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Purchase Order Updated</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Purchase order has been updated successfully.</p>
            <p>What would you like to do next?</p>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={handleQuit}>
              <X className="h-4 w-4 mr-2" />
              Quit
            </Button>
            <Button onClick={handlePrintPO}>
              <Printer className="h-4 w-4 mr-2" />
              Print PO
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};