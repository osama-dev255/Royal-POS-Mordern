import { useState, useEffect, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, FileText, Download, Printer, Edit } from "lucide-react";
import { SavedInvoicesCard } from "./SavedInvoicesCard";
import { getSavedInvoices, deleteInvoice, InvoiceData, updateInvoice } from "@/utils/invoiceUtils";
import { PrintUtils } from "@/utils/printUtils";
import { InvoiceDetails } from "@/components/InvoiceDetails";
import { ExportUtils } from "@/utils/exportUtils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface InvoiceItem {
  id?: string;
  name: string;
  description?: string;
  quantity: number;
  rate?: number;
  amount?: number;
  price?: number;  // For backward compatibility
  unit?: string;
}

interface SavedInvoicesSectionProps {
  onBack: () => void;
  onLogout: () => void;
  username: string;
}

export const SavedInvoicesSection = ({ onBack, onLogout, username }: SavedInvoicesSectionProps) => {
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewingInvoice, setViewingInvoice] = useState<InvoiceData | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<InvoiceData | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editableItems, setEditableItems] = useState<InvoiceItem[]>([]);

  // Load saved invoices from database
  useEffect(() => {
    const loadInvoices = async () => {
      try {
        setLoading(true);
        const savedInvoices = await getSavedInvoices();
        setInvoices(savedInvoices);
      } catch (error) {
        console.error("Error loading saved invoices:", error);
      } finally {
        setLoading(false);
      }
    };

    loadInvoices();

    // Listen for storage changes to update invoices in real-time
    const handleStorageChange = () => {
      loadInvoices();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Filter invoices based on search term
  const filteredInvoices = invoices.filter(invoice => 
    invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteInvoice = (invoiceId: string) => {
    try {
      deleteInvoice(invoiceId);
      // Update the state to reflect the deletion
      setInvoices(prev => prev.filter(invoice => invoice.id !== invoiceId));
    } catch (error) {
      console.error("Error deleting invoice:", error);
    }
  };

  const handlePrintInvoice = (invoice: InvoiceData) => {
    // Pass the invoice object directly to the new print function
    PrintUtils.printSavedInvoice(invoice);
  };

  const handleDownloadInvoice = (invoice: InvoiceData) => {
    // Create a transaction object for PDF export
    const transaction = {
      id: invoice.id,
      receiptNumber: invoice.invoiceNumber,
      date: invoice.date,
      items: invoice.itemsList || [],
      subtotal: invoice.subtotal || 0,
      tax: invoice.tax || 0,
      discount: invoice.discount || 0,
      total: invoice.total,
      paymentMethod: invoice.paymentMethod,
      amountReceived: invoice.amountReceived || invoice.total,
      change: invoice.change || 0,
      customer: { name: invoice.customer }
    };

    // Export the invoice as PDF
    ExportUtils.exportReceiptAsPDF(transaction, `Invoice_${invoice.invoiceNumber}`);
  };

  const handleViewInvoice = (invoice: InvoiceData) => {
    setViewingInvoice(invoice);
  };

  const handleEditInvoice = (invoice: InvoiceData) => {
    // Open the edit modal with the invoice data
    setEditingInvoice(invoice);
    // Initialize editable items from the invoice
    setEditableItems([...(invoice.itemsList || [])]);
    setIsEditModalOpen(true);
  };

  // Handle changes to an item in the editable items list
  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const updatedItems = [...editableItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // If rate or quantity changes, recalculate the amount
    if ((field === 'rate' || field === 'price' || field === 'quantity') && updatedItems[index]) {
      const item = updatedItems[index];
      const rate = item.rate || item.price || 0;
      const quantity = item.quantity || 0;
      updatedItems[index] = { ...item, amount: rate * quantity };
    }
    
    setEditableItems(updatedItems);
    
    // Recalculate subtotal based on updated items
    const newSubtotal = updatedItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    if (editingInvoice) {
      setEditingInvoice({
        ...editingInvoice,
        subtotal: newSubtotal
      });
    }
  };

  // Add a new empty item row
  const addItemRow = () => {
    const newItem: InvoiceItem = {
      id: `new-${Date.now()}`,
      name: '',
      description: '',
      quantity: 1,
      rate: 0,
      amount: 0,
      unit: ''
    };
    const updatedItems = [...editableItems, newItem];
    setEditableItems(updatedItems);
    
    // Recalculate subtotal based on updated items
    const newSubtotal = updatedItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    if (editingInvoice) {
      setEditingInvoice({
        ...editingInvoice,
        subtotal: newSubtotal
      });
    }
  };

  // Remove an item by index
  const removeItem = (index: number) => {
    const updatedItems = [...editableItems];
    updatedItems.splice(index, 1);
    setEditableItems(updatedItems);
    
    // Recalculate subtotal based on updated items
    const newSubtotal = updatedItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    if (editingInvoice) {
      setEditingInvoice({
        ...editingInvoice,
        subtotal: newSubtotal
      });
    }
  };

  const handleSaveEditedInvoice = async () => {
    if (!editingInvoice) return;
    
    try {
      // Calculate subtotal based on editable items
      const calculatedSubtotal = editableItems.reduce((sum, item) => {
        return sum + (item.amount || 0);
      }, 0);
      
      // Calculate total based on calculated subtotal, tax, and discount
      const calculatedTotal = calculatedSubtotal + (editingInvoice.tax || 0) - (editingInvoice.discount || 0);
      
      // Calculate amount due: Total - Amount Paid + Credit Brought Forward
      const amountDue = calculatedTotal - (editingInvoice.amountPaid !== undefined ? editingInvoice.amountPaid : 0) + (editingInvoice.creditBroughtForward !== undefined ? editingInvoice.creditBroughtForward : 0);
      
      // Update the invoice in the database with the new items list
      await updateInvoice({
        ...editingInvoice,
        itemsList: editableItems,
        items: editableItems.length,
        subtotal: calculatedSubtotal,
        total: calculatedTotal,
        amountDue: amountDue
      });
      
      // Update the local state
      setInvoices(prev => 
        prev.map(inv => inv.id === editingInvoice.id ? {...editingInvoice, itemsList: editableItems, items: editableItems.length, subtotal: calculatedSubtotal, total: calculatedTotal, amountDue: amountDue} : inv)
      );
      
      // Close the modal
      setIsEditModalOpen(false);
      
      // Show success message
      alert('Invoice updated successfully!');
    } catch (error) {
      console.error('Error updating invoice:', error);
      alert('Error updating invoice. Please try again.');
    }
  };


  return (
    <div className="min-h-screen bg-background">
      {/* Edit Invoice Modal */}
      {isEditModalOpen && editingInvoice && (
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Invoice #{editingInvoice.invoiceNumber}</DialogTitle>
              <DialogDescription>
                Modify the invoice details below and save the changes
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Customer Name</label>
                  <Input 
                    value={editingInvoice.customer}
                    readOnly
                    className="bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Invoice Number</label>
                  <Input 
                    value={editingInvoice.invoiceNumber}
                    readOnly
                    className="bg-gray-100"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <Input 
                    type="date"
                    value={editingInvoice.date.split('T')[0]}
                    readOnly
                    className="bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Payment Method</label>
                  <Input 
                    value={editingInvoice.paymentMethod}
                    onChange={(e) => setEditingInvoice({...editingInvoice, paymentMethod: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Subtotal</label>
                  <Input 
                    type="number"
                    step="0.01"
                    value={editingInvoice.subtotal || 0}
                    className="bg-gray-100"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tax</label>
                  <Input 
                    type="number"
                    value={editingInvoice.tax || 0}
                    onChange={(e) => setEditingInvoice({...editingInvoice, tax: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Discount</label>
                  <Input 
                    type="number"
                    value={editingInvoice.discount || 0}
                    onChange={(e) => setEditingInvoice({...editingInvoice, discount: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Total</label>
                  <Input 
                    type="number"
                    value={editingInvoice.total}
                    readOnly
                    className="bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Amount Received</label>
                  <Input 
                    type="number"
                    value={editingInvoice.amountReceived || 0}
                    onChange={(e) => setEditingInvoice({...editingInvoice, amountReceived: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Change</label>
                  <Input 
                    type="number"
                    value={editingInvoice.change || 0}
                    onChange={(e) => setEditingInvoice({...editingInvoice, change: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select 
                  value={editingInvoice.status}
                  onChange={(e) => setEditingInvoice({...editingInvoice, status: e.target.value as any})}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Business Name</label>
                <Input 
                  value={editingInvoice.businessName || ""}
                  onChange={(e) => setEditingInvoice({...editingInvoice, businessName: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Business Address</label>
                  <Input 
                    value={editingInvoice.businessAddress || ""}
                    onChange={(e) => setEditingInvoice({...editingInvoice, businessAddress: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Business Phone</label>
                  <Input 
                    value={editingInvoice.businessPhone || ""}
                    onChange={(e) => setEditingInvoice({...editingInvoice, businessPhone: e.target.value})}
                  />
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
                        <th className="text-left p-2 text-xs sm:text-sm">Description</th>
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
                                value={item.name || ''}
                                onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                                className="p-1 h-8 text-xs"
                              />
                            </td>
                            <td className="p-2 text-xs sm:text-sm">
                              <Input
                                value={item.quantity || 0}
                                type="number"
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
                            <td className="p-2 text-xs sm:text-sm">
                              <Input
                                value={item.rate || item.price || 0}
                                type="number"
                                step="0.01"
                                onChange={(e) => handleItemChange(index, 'rate', parseFloat(e.target.value) || 0)}
                                className="p-1 h-8 text-xs"
                              />
                            </td>
                            <td className="p-2 text-xs sm:text-sm">
                              <Input
                                value={item.amount || 0}
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
                          <td colSpan={7} className="p-2 text-center text-sm text-muted-foreground">No items in this invoice</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-lg font-semibold">Financial Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Subtotal</label>
                  <Input 
                    type="number"
                    step="0.01"
                    value={editingInvoice.subtotal || 0}
                    onChange={(e) => setEditingInvoice({...editingInvoice, subtotal: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tax</label>
                  <Input 
                    type="number"
                    step="0.01"
                    value={editingInvoice.tax || 0}
                    onChange={(e) => setEditingInvoice({...editingInvoice, tax: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Discount</label>
                  <Input 
                    type="number"
                    step="0.01"
                    value={editingInvoice.discount || 0}
                    onChange={(e) => setEditingInvoice({...editingInvoice, discount: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Total</label>
                  <Input 
                    type="number"
                    step="0.01"
                    value={editingInvoice.total}
                    className="bg-gray-100"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Amount Paid</label>
                  <Input 
                    type="number"
                    step="0.01"
                    value={editingInvoice.amountPaid || 0}
                    onChange={(e) => setEditingInvoice({...editingInvoice, amountPaid: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Credit Brought Forward</label>
                  <Input 
                    type="number"
                    step="0.01"
                    value={editingInvoice.creditBroughtForward || 0}
                    onChange={(e) => setEditingInvoice({...editingInvoice, creditBroughtForward: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">AMOUNT DUE</label>
                  <Input 
                    type="number"
                    step="0.01"
                    value={editingInvoice.amountDue || 0}
                    className="bg-gray-100 font-bold"
                    readOnly
                  />
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
                onClick={handleSaveEditedInvoice}
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Render invoice details view if viewing an invoice */}
      {viewingInvoice ? (
        <div className="container mx-auto p-4 sm:p-6">
          <InvoiceDetails
            id={viewingInvoice.id}
            invoiceNumber={viewingInvoice.invoiceNumber}
            date={viewingInvoice.date}
            customer={viewingInvoice.customer}
            items={viewingInvoice.itemsList || []}
            subtotal={viewingInvoice.subtotal || 0}
            discount={viewingInvoice.discount || 0}
            tax={viewingInvoice.tax || 0}
            total={viewingInvoice.total}
            paymentMethod={viewingInvoice.paymentMethod}
            status={viewingInvoice.status as "completed" | "pending" | "cancelled" | "refunded"}
            amountReceived={viewingInvoice.amountReceived !== undefined ? viewingInvoice.amountReceived : viewingInvoice.total}
            change={viewingInvoice.change !== undefined ? viewingInvoice.change : 0}
            amountPaid={viewingInvoice.amountPaid}
            creditBroughtForward={viewingInvoice.creditBroughtForward}
            amountDue={viewingInvoice.amountDue}
            businessName={viewingInvoice.businessName}
            businessAddress={viewingInvoice.businessAddress}
            businessPhone={viewingInvoice.businessPhone}
            onBack={() => setViewingInvoice(null)}
            onPrint={() => handlePrintInvoice(viewingInvoice)}
            onDownload={() => handleDownloadInvoice(viewingInvoice)}
            onEdit={() => handleEditInvoice(viewingInvoice)}
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
                    Saved Invoices
                  </h2>
                  <p className="text-muted-foreground text-sm sm:text-base md:text-lg">
                    View and manage your saved invoices from completed transactions
                  </p>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search invoices by number, customer..."
                      className="pl-10 py-5 text-responsive-base w-64"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <p>Loading saved invoices...</p>
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Saved Invoices</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? "No invoices match your search." : "You haven't saved any invoices yet."}
                </p>
                <p className="text-sm text-muted-foreground">
                  Invoices are automatically saved when you complete a transaction in the Sales Terminal.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {filteredInvoices.map((invoice) => (
                  <SavedInvoicesCard
                    key={invoice.id}
                    invoice={{
                      id: invoice.id,
                      invoiceNumber: invoice.invoiceNumber,
                      date: invoice.date,
                      customer: invoice.customer,
                      items: invoice.items,
                      total: invoice.total,
                      paymentMethod: invoice.paymentMethod,
                      status: invoice.status,
                      itemsList: invoice.itemsList,
                      subtotal: invoice.subtotal,
                      tax: invoice.tax,
                      discount: invoice.discount,
                      amountReceived: invoice.amountReceived,
                      change: invoice.change,
                      amountPaid: invoice.amountPaid,
                      creditBroughtForward: invoice.creditBroughtForward,
                      amountDue: invoice.amountDue
                    }}
                    onViewDetails={() => handleViewInvoice(invoice)}
                    onPrintInvoice={() => handlePrintInvoice(invoice)}
                    onDownloadInvoice={() => handleDownloadInvoice(invoice)}
                    onDeleteInvoice={() => handleDeleteInvoice(invoice.id)}
                  />
                ))}
              </div>
            )}
          </main>
        </>
      )}
    </div>
  );
};