import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  ArrowLeft, 
  FileText,
  Eye,
  Trash2,
  Receipt,
  Calendar,
  User,
  ShoppingCart,
  Printer,
  Loader2,
  Edit,
  Save,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getOutletSalesByOutletAndPaymentMethod, deleteOutletSale, updateOutletSale, OutletSale, getOutletCustomerById, getOutletSaleItemsBySaleId, getOutletDebtsBySaleId, deleteOutletDebt, deleteOutletSaleItemsBySaleId, createOutletSaleItem, getInventoryProductsByOutlet, InventoryProduct } from "@/services/databaseService";
import { PrintUtils } from "@/utils/printUtils";

interface OutletSavedDebtsProps {
  onBack: () => void;
  outletId?: string;
}

interface SavedSale {
  id: string;
  invoiceNumber: string;
  date: string;
  customer: string;
  customerId?: string;
  items: { name: string; quantity: number; price: number }[];
  subtotal: number;
  tax: number;
  total: number;
  amountPaid?: number;
  amountReceived?: number;
  paymentMethod: string;
  status: string;
  creditBroughtForward?: number;
  adjustments?: number;
  adjustmentReason?: string;
}

export const OutletSavedDebts = ({ onBack, outletId }: OutletSavedDebtsProps) => {
  const { toast } = useToast();
  const [sales, setSales] = useState<SavedSale[]>([]);
  const [selectedSale, setSelectedSale] = useState<SavedSale | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<SavedSale>>({});
  const [inventoryProducts, setInventoryProducts] = useState<InventoryProduct[]>([]);
  const [itemSearchTerms, setItemSearchTerms] = useState<Record<number, string>>({});
  const [showItemDropdown, setShowItemDropdown] = useState<Record<number, boolean>>({});

  useEffect(() => {
    fetchSavedDebts();
    fetchInventoryProducts();
  }, [outletId]);

  const fetchInventoryProducts = async () => {
    if (!outletId) return;
    try {
      const products = await getInventoryProductsByOutlet(outletId);
      setInventoryProducts(products);
    } catch (error) {
      console.error('Error fetching inventory products:', error);
    }
  };

  const fetchSavedDebts = async () => {
    if (!outletId) return;
    
    setLoading(true);
    try {
      // Fetch from outlet_sales table which has accurate payment data
      const data = await getOutletSalesByOutletAndPaymentMethod(outletId, 'debt');
      
      // Enrich data with customer names and item counts
      const enrichedSales = await Promise.all(
        data.map(async (sale: OutletSale) => {
          // Fetch customer name if customer_id exists
          let customerName = 'Walk-in Customer';
          if (sale.customer_id) {
            const customer = await getOutletCustomerById(sale.customer_id);
            if (customer) {
              customerName = `${customer.first_name} ${customer.last_name}`.trim();
            }
          }
          
          // Fetch items for this sale
          const saleItems = await getOutletSaleItemsBySaleId(sale.id || '');
          
          // Use product_name from the sale item (stored at time of sale)
          const itemsWithNames = saleItems.map((item) => ({
            name: item.product_name || 'Unknown Product',
            quantity: item.quantity,
            price: item.unit_price
          }));
          
          return {
            id: sale.id || '',
            invoiceNumber: sale.invoice_number || '',
            date: sale.sale_date || sale.created_at || '',
            customer: customerName,
            customerId: sale.customer_id,
            items: itemsWithNames,
            subtotal: sale.subtotal,
            tax: sale.tax_amount,
            total: sale.total_amount,
            amountPaid: sale.amount_paid || 0,
            amountReceived: sale.amount_received || 0,
            paymentMethod: sale.payment_method,
            status: sale.payment_status,
            creditBroughtForward: sale.credit_brought_forward || 0,
            adjustments: sale.adjustments || 0,
            adjustmentReason: sale.adjustment_reason
          };
        })
      );
      
      setSales(enrichedSales);
    } catch (error) {
      console.error('Error fetching saved debts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch saved debts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

  const handleView = (sale: SavedSale) => {
    setSelectedSale(sale);
    setIsViewDialogOpen(true);
  };

  const handleEdit = (sale: SavedSale) => {
    setSelectedSale(sale);
    setEditFormData({
      customer: sale.customer,
      subtotal: sale.subtotal,
      tax: sale.tax,
      creditBroughtForward: sale.creditBroughtForward,
      adjustments: sale.adjustments,
      adjustmentReason: sale.adjustmentReason,
      total: sale.total,
      amountPaid: sale.amountPaid,
      status: sale.status,
      items: [...sale.items] // Clone items for editing
    });
    setIsEditDialogOpen(true);
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    setEditFormData(prev => {
      const newItems = [...(prev.items || [])];
      newItems[index] = { ...newItems[index], [field]: value };
      
      // Recalculate total if quantity or price changed
      if (field === 'quantity' || field === 'price') {
        const newTotal = newItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
        return { ...prev, items: newItems, total: newTotal };
      }
      
      return { ...prev, items: newItems };
    });
  };

  const handleAddItem = () => {
    setEditFormData(prev => ({
      ...prev,
      items: [...(prev.items || []), { name: '', quantity: 1, price: 0 }]
    }));
  };

  const handleRemoveItem = (index: number) => {
    setEditFormData(prev => {
      const newItems = (prev.items || []).filter((_, i) => i !== index);
      const newTotal = newItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
      return { ...prev, items: newItems, total: newTotal };
    });
  };

  const getFilteredProducts = (searchTerm: string) => {
    if (!searchTerm) return inventoryProducts.slice(0, 10);
    return inventoryProducts
      .filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      .slice(0, 10);
  };

  const handleProductSelect = (index: number, product: InventoryProduct) => {
    setEditFormData(prev => {
      const newItems = [...(prev.items || [])];
      newItems[index] = { 
        ...newItems[index], 
        name: product.name, 
        price: product.selling_price || 0 
      };
      const newTotal = newItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
      return { ...prev, items: newItems, total: newTotal };
    });
    setItemSearchTerms(prev => ({ ...prev, [index]: '' }));
    setShowItemDropdown(prev => ({ ...prev, [index]: false }));
  };

  const handleItemSearchChange = (index: number, value: string) => {
    setItemSearchTerms(prev => ({ ...prev, [index]: value }));
    handleItemChange(index, 'name', value);
    setShowItemDropdown(prev => ({ ...prev, [index]: true }));
  };

  const handleUpdate = async () => {
    if (!selectedSale || !selectedSale.id) return;
    
    try {
      // Update the sale record with all fields
      const updatedSale = await updateOutletSale(selectedSale.id, {
        subtotal: editFormData.subtotal,
        tax_amount: editFormData.tax,
        credit_brought_forward: editFormData.creditBroughtForward,
        adjustments: editFormData.adjustments,
        adjustment_reason: editFormData.adjustmentReason,
        total_amount: editFormData.total,
        amount_paid: editFormData.amountPaid,
        payment_status: editFormData.status
      });
      
      if (updatedSale) {
        // Delete existing items and recreate them
        await deleteOutletSaleItemsBySaleId(selectedSale.id);
        
        // Create new items
        for (const item of (editFormData.items || [])) {
          await createOutletSaleItem({
            sale_id: selectedSale.id,
            product_name: item.name,
            quantity: item.quantity,
            unit_price: item.price,
            discount_amount: 0,
            total_price: item.quantity * item.price
          });
        }
        
        toast({
          title: "Success",
          description: "Debt record updated successfully"
        });
        setIsEditDialogOpen(false);
        fetchSavedDebts(); // Refresh the list
      } else {
        toast({
          title: "Error",
          description: "Failed to update debt record",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error updating debt:', error);
      toast({
        title: "Error",
        description: "An error occurred while updating",
        variant: "destructive"
      });
    }
  };

  const handlePrint = (sale: SavedSale) => {
    // Create transaction object that matches PrintUtils.printDebtInvoice expectations
    const transaction = {
      receiptNumber: sale.invoiceNumber,
      date: sale.date,
      items: sale.items,
      subtotal: sale.subtotal,
      tax: sale.tax,
      discount: 0,
      shipping: 0,
      adjustments: sale.adjustments || 0,
      adjustmentReason: sale.adjustmentReason,
      total: sale.total,
      paymentMethod: 'debt',
      amountPaid: sale.amountPaid || 0,
      amountReceived: sale.amountReceived || 0,
      debtPaymentAmount: 0,
      previousDebtBalance: sale.creditBroughtForward || 0,
      change: 0,
      customer: {
        name: sale.customer,
        phone: '',
        address: '',
        email: ''
      },
      salesman: 'Not Assigned',
      driver: 'Not Assigned',
      dueDate: sale.date // Use sale date as due date if not specified
    };
    
    PrintUtils.printDebtInvoice(transaction);
  };

  const handleDelete = async (saleId: string) => {
    console.log('handleDelete called with saleId:', saleId);
    try {
      // First, find and delete any associated debt records
      const debts = await getOutletDebtsBySaleId(saleId);
      console.log('Found debts to delete:', debts);
      
      for (const debt of debts) {
        if (debt.id) {
          await deleteOutletDebt(debt.id);
          console.log('Deleted debt:', debt.id);
        }
      }
      
      // Then delete the sale
      const success = await deleteOutletSale(saleId);
      console.log('deleteOutletSale result:', success);
      
      if (success) {
        const updatedSales = sales.filter(s => s.id !== saleId);
        setSales(updatedSales);
        toast({
          title: "Debt Deleted",
          description: `The debt record and ${debts.length} associated debt entries have been removed`
        });
        // Refresh the list to ensure sync with database
        await fetchSavedDebts();
      } else {
        toast({
          title: "Error",
          description: "Failed to delete debt record",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error deleting debt:', error);
      toast({
        title: "Error",
        description: "Failed to delete debt record",
        variant: "destructive"
      });
    }
  };

  const totalDebt = sales.reduce((sum, sale) => sum + sale.total, 0);

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Saved Debts
          </h1>
          <p className="text-muted-foreground">View and manage debt transactions</p>
        </div>
        <div className="text-right">
          <Badge variant="outline" className="text-lg px-4 py-2">
            {sales.length} Debts
          </Badge>
          <p className="text-sm text-muted-foreground mt-1">Total: {formatCurrency(totalDebt)}</p>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="h-12 w-12 mx-auto text-muted-foreground mb-4 animate-spin" />
              <h3 className="text-lg font-medium">Loading Debts...</h3>
              <p className="text-muted-foreground">Fetching debt records from database</p>
            </CardContent>
          </Card>
        ) : sales.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Saved Debts</h3>
              <p className="text-muted-foreground">Debt transactions will appear here after completion</p>
            </CardContent>
          </Card>
        ) : (
          sales.map((sale) => {
                // Calculate payment status
                const amountPaid = sale.amountPaid || 0;
                const total = sale.total || 0;
                const remaining = total - amountPaid;
                
                let statusBadge;
                if (amountPaid === 0) {
                  statusBadge = <Badge className="bg-red-100 text-red-800">Unpaid</Badge>;
                } else if (amountPaid > total) {
                  statusBadge = <Badge className="bg-blue-100 text-blue-800">Overpaid</Badge>;
                } else if (remaining === 0) {
                  statusBadge = <Badge className="bg-green-100 text-green-800">Paid</Badge>;
                } else {
                  statusBadge = <Badge className="bg-yellow-100 text-yellow-800">Partial</Badge>;
                }
                
                return (
            <Card key={sale.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-semibold">{sale.invoiceNumber}</span>
                      {statusBadge}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span>{sale.date}</span>
                      <span className="mx-2">•</span>
                      <span className="font-medium text-red-600">{sale.customer || 'Unknown Customer'}</span>
                      <span className="mx-2">•</span>
                      <span>{sale.items.length} items</span>
                    </div>
                    <div className="text-sm mt-1">
                      <span className="text-muted-foreground">Paid: {formatCurrency(amountPaid)}</span>
                      <span className="mx-2">•</span>
                      <span className={remaining > 0 ? 'text-red-600' : 'text-green-600'}>
                        {remaining > 0 ? `Due: ${formatCurrency(remaining)}` : 'Fully Paid'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-red-600">{formatCurrency(sale.total)}</p>
                    <div className="flex gap-2 mt-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleView(sale)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleEdit(sale)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handlePrint(sale)}
                      >
                        <Printer className="h-4 w-4 mr-1" />
                        Print
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleDelete(sale.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );})
        )}
      </div>

      {/* View Sale Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Transaction Details
            </DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-4">
              {/* Payment Reality Banner */}
              {(() => {
                const amountPaid = selectedSale.amountPaid || 0;
                const total = selectedSale.total || 0;
                const remaining = total - amountPaid;
                
                if (amountPaid === 0) {
                  return (
                    <div className="p-3 bg-red-100 border border-red-300 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-red-800">UNPAID - Full Debt</span>
                        <Badge className="bg-red-600 text-white">Outstanding</Badge>
                      </div>
                      <p className="text-sm text-red-700 mt-1">No payment received</p>
                    </div>
                  );
                } else if (amountPaid > total) {
                  const overpayment = amountPaid - total;
                  return (
                    <div className="p-3 bg-blue-100 border border-blue-300 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-blue-800">OVERPAID</span>
                        <Badge className="bg-blue-600 text-white">Credit</Badge>
                      </div>
                      <p className="text-sm text-blue-700 mt-1">
                        Paid: {formatCurrency(amountPaid)} / Overpayment: {formatCurrency(overpayment)}
                      </p>
                    </div>
                  );
                } else if (remaining === 0) {
                  return (
                    <div className="p-3 bg-green-100 border border-green-300 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-green-800">FULLY PAID</span>
                        <Badge className="bg-green-600 text-white">Completed</Badge>
                      </div>
                      <p className="text-sm text-green-700 mt-1">Payment completed</p>
                    </div>
                  );
                } else {
                  return (
                    <div className="p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-yellow-800">PARTIALLY PAID</span>
                        <Badge className="bg-yellow-600 text-white">Partial</Badge>
                      </div>
                      <p className="text-sm text-yellow-700 mt-1">
                        Paid: {formatCurrency(amountPaid)} / Remaining: {formatCurrency(remaining)}
                      </p>
                    </div>
                  );
                }
              })()}

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Invoice Number</p>
                  <p className="font-semibold">{selectedSale.invoiceNumber}</p>
                </div>
                <Badge className={selectedSale.amountPaid && selectedSale.amountPaid >= selectedSale.total ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {selectedSale.amountPaid && selectedSale.amountPaid >= selectedSale.total ? 'Paid' : selectedSale.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="text-sm font-medium">{selectedSale.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Customer</p>
                    <p className="text-sm font-medium text-red-600">{selectedSale.customer || 'Unknown Customer'}</p>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Items ({selectedSale.items.length})</p>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left py-2 px-3">Item</th>
                        <th className="text-right py-2 px-3">Qty</th>
                        <th className="text-right py-2 px-3">Price</th>
                        <th className="text-right py-2 px-3">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSale.items.map((item, index) => (
                        <tr key={index} className="border-t">
                          <td className="py-2 px-3">{item.name}</td>
                          <td className="text-right py-2 px-3">{item.quantity}</td>
                          <td className="text-right py-2 px-3">{formatCurrency(item.price)}</td>
                          <td className="text-right py-2 px-3">{formatCurrency(item.price * item.quantity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(selectedSale.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax (18%)</span>
                  <span>{formatCurrency(selectedSale.tax)}</span>
                </div>
                {selectedSale.creditBroughtForward > 0 && (
                  <div className="flex justify-between text-sm text-orange-600">
                    <span>Credit Brought Forward</span>
                    <span>{formatCurrency(selectedSale.creditBroughtForward)}</span>
                  </div>
                )}
                {selectedSale.adjustments !== 0 && (
                  <div className="flex justify-between text-sm text-blue-600">
                    <span>Adjustments {selectedSale.adjustmentReason && `(${selectedSale.adjustmentReason})`}</span>
                    <span>{formatCurrency(selectedSale.adjustments)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total Amount</span>
                  <span>{formatCurrency(selectedSale.total)}</span>
                </div>
                
                {/* Payment Breakdown */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg space-y-2">
                  <p className="font-medium text-sm text-gray-700">Payment Breakdown</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Amount Paid</span>
                    <span className="font-medium text-green-600">{formatCurrency(selectedSale.amountPaid || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {selectedSale.amountPaid > selectedSale.total ? 'Credit Balance' : 'Remaining Balance'}
                    </span>
                    <span className={
                      selectedSale.amountPaid > selectedSale.total ? 'font-medium text-blue-600' :
                      selectedSale.total - (selectedSale.amountPaid || 0) > 0 ? 'font-medium text-red-600' : 
                      'font-medium text-green-600'
                    }>
                      {selectedSale.amountPaid > selectedSale.total 
                        ? formatCurrency(selectedSale.amountPaid - selectedSale.total)
                        : formatCurrency(Math.max(0, selectedSale.total - (selectedSale.amountPaid || 0)))
                      }
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">Payment Method</span>
                <Badge className={selectedSale.amountPaid && selectedSale.amountPaid >= selectedSale.total ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  <FileText className="h-3 w-3 mr-1" />
                  {selectedSale.amountPaid && selectedSale.amountPaid >= selectedSale.total ? 'Paid (was Debt)' : 'Debt'}
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Debt Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Debt Record
            </DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Invoice Number</p>
                <p className="font-semibold">{selectedSale.invoiceNumber}</p>
              </div>
              
              <div>
                <Label htmlFor="editCustomer">Customer</Label>
                <Input
                  id="editCustomer"
                  value={editFormData.customer || ''}
                  onChange={(e) => setEditFormData({...editFormData, customer: e.target.value})}
                />
              </div>
              
              {/* Editable Items Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Items</Label>
                  <Button type="button" size="sm" variant="outline" onClick={handleAddItem}>
                    + Add Item
                  </Button>
                </div>
                <div className="border rounded-lg overflow-visible">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left py-3 px-3">Item Name</th>
                        <th className="text-right py-3 px-3 w-24">Qty</th>
                        <th className="text-right py-3 px-3 w-32">Price</th>
                        <th className="text-right py-3 px-3 w-32">Total</th>
                        <th className="text-center py-3 px-3 w-12"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(editFormData.items || []).map((item, index) => (
                        <tr key={index} className="border-t">
                          <td className="py-2 px-3 relative">
                            <Input
                              value={item.name}
                              onChange={(e) => handleItemSearchChange(index, e.target.value)}
                              onFocus={() => setShowItemDropdown(prev => ({ ...prev, [index]: true }))}
                              onBlur={(e) => {
                                // Delay to allow click on dropdown items
                                setTimeout(() => {
                                  setShowItemDropdown(prev => ({ ...prev, [index]: false }));
                                }, 200);
                              }}
                              className="h-9"
                              placeholder="Type to search items..."
                            />
                            {showItemDropdown[index] && (
                              <div className="absolute z-[100] top-full left-0 w-80 mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                                {getFilteredProducts(itemSearchTerms[index] || item.name).length > 0 ? (
                                  getFilteredProducts(itemSearchTerms[index] || item.name).map((product) => (
                                    <div
                                      key={product.id}
                                      className="flex items-center justify-between p-2 hover:bg-accent cursor-pointer text-sm border-b last:border-0"
                                      onMouseDown={(e) => e.preventDefault()}
                                      onClick={() => handleProductSelect(index, product)}
                                    >
                                      <div>
                                        <p className="font-medium">{product.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                          Stock: {product.available_quantity ?? product.quantity} | {formatCurrency(product.selling_price)}
                                        </p>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="p-3 text-sm text-muted-foreground text-center">
                                    No products found
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                              className="h-9 text-right"
                              min="1"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <Input
                              type="number"
                              value={item.price}
                              onChange={(e) => handleItemChange(index, 'price', parseFloat(e.target.value) || 0)}
                              className="h-9 text-right"
                              min="0"
                            />
                          </td>
                          <td className="py-2 px-3 text-right font-medium">
                            {formatCurrency(item.quantity * item.price)}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-500 hover:bg-red-50"
                              onClick={() => handleRemoveItem(index)}
                            >
                              ×
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Subtotal, Tax, Credit, Adjustments - 4 columns */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="editSubtotal">Subtotal</Label>
                  <Input
                    id="editSubtotal"
                    type="number"
                    value={editFormData.subtotal || 0}
                    onChange={(e) => setEditFormData({...editFormData, subtotal: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label htmlFor="editTax">Tax (18%)</Label>
                  <Input
                    id="editTax"
                    type="number"
                    value={editFormData.tax || 0}
                    onChange={(e) => setEditFormData({...editFormData, tax: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label htmlFor="editCredit">Credit B/F</Label>
                  <Input
                    id="editCredit"
                    type="number"
                    value={editFormData.creditBroughtForward || 0}
                    onChange={(e) => setEditFormData({...editFormData, creditBroughtForward: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label htmlFor="editAdjustments">Adjustments</Label>
                  <Input
                    id="editAdjustments"
                    type="number"
                    value={editFormData.adjustments || 0}
                    onChange={(e) => setEditFormData({...editFormData, adjustments: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>
              
              {editFormData.adjustments !== 0 && (
                <div>
                  <Label htmlFor="editAdjustmentReason">Adjustment Reason</Label>
                  <Input
                    id="editAdjustmentReason"
                    value={editFormData.adjustmentReason || ''}
                    onChange={(e) => setEditFormData({...editFormData, adjustmentReason: e.target.value})}
                    placeholder="Reason for adjustment"
                  />
                </div>
              )}
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="editTotal">Total Amount</Label>
                  <Input
                    id="editTotal"
                    type="number"
                    value={editFormData.total || 0}
                    onChange={(e) => setEditFormData({...editFormData, total: parseFloat(e.target.value) || 0})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="editAmountPaid">Amount Paid</Label>
                  <Input
                    id="editAmountPaid"
                    type="number"
                    value={editFormData.amountPaid || 0}
                    onChange={(e) => setEditFormData({...editFormData, amountPaid: parseFloat(e.target.value) || 0})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="editStatus">Status</Label>
                  <select
                    id="editStatus"
                    className="w-full p-2 border rounded-md h-9"
                    value={editFormData.status || 'outstanding'}
                    onChange={(e) => setEditFormData({...editFormData, status: e.target.value})}
                  >
                    <option value="outstanding">Outstanding</option>
                    <option value="partial">Partial</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              </div>
              
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span>Remaining Balance:</span>
                  <span className="font-semibold">
                    {formatCurrency((editFormData.total || 0) - (editFormData.amountPaid || 0))}
                  </span>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button onClick={handleUpdate}>
                  <Save className="h-4 w-4 mr-1" />
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
