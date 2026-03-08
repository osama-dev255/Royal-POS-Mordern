import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, FileText, Calendar } from "lucide-react";
import { SavedSalesOrdersCard } from "./SavedSalesOrdersCard";
import { getSavedSalesOrders, deleteSalesOrder, SalesOrderData, updateSalesOrder } from "@/utils/salesOrderUtils";
import { SalesOrderDetails } from "./SalesOrderDetails";
import { formatCurrency } from "@/lib/currency";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SalesOrderItem {
  id?: string;
  productId?: string;
  productName: string;
  quantity: number;
  unitPrice?: number;
  price?: number;
  total?: number;
  unit?: string;
}

interface SavedSalesOrdersSectionProps {
  onBack: () => void;
  onLogout: () => void;
  username: string;
}

export const SavedSalesOrdersSection = ({ onBack, onLogout, username }: SavedSalesOrdersSectionProps) => {
  const [salesOrders, setSalesOrders] = useState<SalesOrderData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateSearchTerm, setDateSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewingOrder, setViewingOrder] = useState<SalesOrderData | null>(null);
  const [editingOrder, setEditingOrder] = useState<SalesOrderData | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editableItems, setEditableItems] = useState<SalesOrderItem[]>([]);

  // Load saved sales orders from database
  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);
        const savedOrders = await getSavedSalesOrders();
        setSalesOrders(savedOrders);
      } catch (error) {
        console.error("Error loading saved sales orders:", error);
      } finally {
        setLoading(false);
      }
    };

    loadOrders();

    // Listen for storage changes to update orders in real-time
    const handleStorageChange = () => {
      loadOrders();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Filter orders based on search term and date
  const filteredOrders = salesOrders.filter(order => {
    // Text search (order number, customer, ID)
    const matchesText = 
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Date search
    let matchesDate = true;
    if (dateSearchTerm) {
      try {
        const orderDate = new Date(order.date);
        const searchDate = new Date(dateSearchTerm);
        
        matchesDate = 
          orderDate.getDate() === searchDate.getDate() &&
          orderDate.getMonth() === searchDate.getMonth() &&
          orderDate.getFullYear() === searchDate.getFullYear();
      } catch (error) {
        matchesDate = true;
      }
    }
    
    return matchesText && matchesDate;
  });

  const handleDeleteOrder = (orderId: string) => {
    try {
      deleteSalesOrder(orderId);
      setSalesOrders(prev => prev.filter(order => order.id !== orderId));
    } catch (error) {
      console.error("Error deleting sales order:", error);
    }
  };

  const handleViewOrder = (order: SalesOrderData) => {
    setViewingOrder(order);
  };

  const handleEditOrder = (order: SalesOrderData) => {
    setEditingOrder(order);
    setEditableItems([...(order.itemsList || [])]);
    setIsEditModalOpen(true);
  };

  const handleItemChange = (index: number, field: keyof SalesOrderItem, value: any) => {
    const updatedItems = [...editableItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    if ((field === 'unitPrice' || field === 'price' || field === 'quantity') && updatedItems[index]) {
      const item = updatedItems[index];
      const price = field === 'unitPrice' ? value : (field === 'price' ? value : item.quantity);
      const quantity = field === 'quantity' ? value : (item.unitPrice || item.price || 0);
      updatedItems[index] = { 
        ...item, 
        total: (item.unitPrice || item.price || 0) * item.quantity 
      };
    }
    
    setEditableItems(updatedItems);
    
    const newSubtotal = updatedItems.reduce((sum, item) => sum + (item.total || 0), 0);
    if (editingOrder) {
      setEditingOrder({
        ...editingOrder,
        subtotal: newSubtotal
      });
    }
  };

  const addItemRow = () => {
    const newItem: SalesOrderItem = {
      id: `new-${Date.now()}`,
      productName: '',
      quantity: 1,
      unitPrice: 0,
      total: 0,
      unit: ''
    };
    const updatedItems = [...editableItems, newItem];
    setEditableItems(updatedItems);
    
    const newSubtotal = updatedItems.reduce((sum, item) => sum + (item.total || 0), 0);
    if (editingOrder) {
      setEditingOrder({
        ...editingOrder,
        subtotal: newSubtotal
      });
    }
  };

  const removeItem = (index: number) => {
    const updatedItems = [...editableItems];
    updatedItems.splice(index, 1);
    setEditableItems(updatedItems);
    
    const newSubtotal = updatedItems.reduce((sum, item) => sum + (item.total || 0), 0);
    if (editingOrder) {
      setEditingOrder({
        ...editingOrder,
        subtotal: newSubtotal
      });
    }
  };

  const handleSaveEditedOrder = async () => {
    if (!editingOrder) return;
    
    try {
      const calculatedSubtotal = editableItems.reduce((sum, item) => sum + (item.total || 0), 0);
      const tax = editingOrder.tax || 0;
      const discount = editingOrder.discount || 0;
      const total = calculatedSubtotal + tax - discount;
      
      await updateSalesOrder({
        ...editingOrder,
        itemsList: editableItems,
        items: editableItems.length,
        subtotal: calculatedSubtotal,
        total: total
      });
      
      setSalesOrders(prev => 
        prev.map(ord => ord.id === editingOrder.id ? {...editingOrder, itemsList: editableItems, items: editableItems.length, subtotal: calculatedSubtotal, total} : ord)
      );
      
      setIsEditModalOpen(false);
      alert('Sales order updated successfully!');
    } catch (error) {
      console.error('Error updating sales order:', error);
      alert('Error updating sales order. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {viewingOrder ? (
        <div className="container mx-auto p-4 sm:p-6">
          <SalesOrderDetails
            id={viewingOrder.id}
            orderNumber={viewingOrder.orderNumber}
            date={viewingOrder.date}
            customer={viewingOrder.customer}
            items={viewingOrder.itemsList || []}
            subtotal={viewingOrder.subtotal || 0}
            discount={viewingOrder.discount || 0}
            tax={viewingOrder.tax || 0}
            total={viewingOrder.total}
            status={viewingOrder.status as "pending" | "completed" | "cancelled"}
            amountPaid={viewingOrder.amountPaid}
            creditBroughtForward={viewingOrder.creditBroughtForward}
            amountDue={viewingOrder.amountDue}
            onBack={() => setViewingOrder(null)}
            onEdit={() => handleEditOrder(viewingOrder)}
          />
        </div>
      ) : (
        <>
          <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
            <div className="container mx-auto px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={onBack}
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Back
                </button>
                <h1 className="text-xl font-bold">Sales Management</h1>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">Welcome, {username}</span>
                <Button variant="outline" size="sm" onClick={onLogout}>
                  Logout
                </Button>
              </div>
            </div>
          </div>

          <main className="container mx-auto p-4 sm:p-6">
            <div className="mb-8 sm:mb-10">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 flex items-center gap-2">
                    <FileText className="h-8 w-8 text-primary" />
                    Saved Sales Orders
                  </h2>
                  <p className="text-muted-foreground text-sm sm:text-base md:text-lg">
                    View and manage your pending sales orders
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by order number, customer name..."
                      className="pl-10 py-5 text-responsive-base w-64"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="date"
                      placeholder="Search by date..."
                      className="pl-10 py-5 text-responsive-base w-48"
                      value={dateSearchTerm}
                      onChange={(e) => setDateSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <p>Loading sales orders...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Saved Sales Orders</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || dateSearchTerm ? "No orders match your search criteria." : "You haven't saved any sales orders yet."}
                </p>
                <p className="text-sm text-muted-foreground">
                  Sales orders are automatically saved when you create a pending order in the Sales Orders section.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {filteredOrders.map((order) => (
                  <SavedSalesOrdersCard
                    key={order.id}
                    salesOrder={{
                      id: order.id,
                      orderNumber: order.orderNumber,
                      date: order.date,
                      customer: order.customer,
                      items: order.items,
                      total: order.total,
                      status: order.status,
                      itemsList: order.itemsList,
                      subtotal: order.subtotal,
                      tax: order.tax,
                      discount: order.discount,
                      amountPaid: order.amountPaid,
                      creditBroughtForward: order.creditBroughtForward,
                      amountDue: order.amountDue
                    }}
                    onViewDetails={() => handleViewOrder(order)}
                    onDeleteOrder={() => handleDeleteOrder(order.id)}
                  />
                ))}
              </div>
            )}
          </main>
        </>
      )}

      {/* Edit Sales Order Modal */}
      {isEditModalOpen && editingOrder && (
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Sales Order #{editingOrder.orderNumber}</DialogTitle>
              <DialogDescription>
                Modify the order details below and save the changes
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Customer Name</label>
                  <Input 
                    value={editingOrder.customer}
                    readOnly
                    className="bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Order Number</label>
                  <Input 
                    value={editingOrder.orderNumber}
                    readOnly
                    className="bg-gray-100"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Subtotal</label>
                  <Input 
                    type="number"
                    step="0.01"
                    value={editingOrder.subtotal || 0}
                    className="bg-gray-100"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tax</label>
                  <Input 
                    type="number"
                    value={editingOrder.tax || 0}
                    onChange={(e) => setEditingOrder({...editingOrder, tax: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Discount</label>
                  <Input 
                    type="number"
                    value={editingOrder.discount || 0}
                    onChange={(e) => setEditingOrder({...editingOrder, discount: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Total</label>
                  <Input 
                    type="number"
                    value={editingOrder.total}
                    readOnly
                    className="bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select 
                    value={editingOrder.status}
                    onChange={(e) => setEditingOrder({...editingOrder, status: e.target.value as any})}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium">Items</label>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={addItemRow}
                    className="text-xs"
                  >
                    + Add Item
                  </Button>
                </div>
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-2 text-xs sm:text-sm">#</th>
                        <th className="text-left p-2 text-xs sm:text-sm">Product</th>
                        <th className="text-right p-2 text-xs sm:text-sm">Quantity</th>
                        <th className="text-left p-2 text-xs sm:text-sm">Unit</th>
                        <th className="text-right p-2 text-xs sm:text-sm">Rate</th>
                        <th className="text-right p-2 text-xs sm:text-sm">Amount</th>
                        <th className="text-center p-2 text-xs sm:text-sm">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editableItems && editableItems.length > 0 ? (
                        editableItems.map((item, index) => (
                          <tr key={item.id || index} className={index % 2 === 0 ? "bg-muted/50" : ""}>
                            <td className="p-2 text-xs sm:text-sm">{index + 1}</td>
                            <td className="p-2 text-xs sm:text-sm">
                              <Input
                                value={item.productName || ''}
                                onChange={(e) => handleItemChange(index, 'productName', e.target.value)}
                                className="p-1 h-8 text-xs"
                              />
                            </td>
                            <td className="p-2 text-xs sm:text-sm">
                              <Input
                                type="number"
                                value={item.quantity || 0}
                                onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                                className="p-1 h-8 text-xs"
                              />
                            </td>
                            <td className="p-2 text-xs sm:text-sm">
                              <Input
                                value={item.unit || ''}
                                onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                                className="p-1 h-8 text-xs"
                              />
                            </td>
                            <td className="p-2 text-right text-xs sm:text-sm">
                              <Input
                                value={item.unitPrice || item.price || 0}
                                type="number"
                                step="0.01"
                                onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                className="p-1 h-8 text-xs"
                              />
                            </td>
                            <td className="p-2 text-right text-xs sm:text-sm">
                              <Input
                                value={item.total || 0}
                                type="number"
                                readOnly
                                className="p-1 h-8 text-xs bg-gray-100"
                              />
                            </td>
                            <td className="p-2 text-center text-xs sm:text-sm">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => removeItem(index)}
                                className="p-1 h-7 w-7 flex items-center justify-center"
                              >
                                <span className="text-xs">-</span>
                              </Button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="p-2 text-center text-sm text-muted-foreground">No items in this order</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            <DialogFooter className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveEditedOrder}
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
