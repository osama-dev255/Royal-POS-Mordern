import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Truck, Download, Printer, Eye, Calendar, Edit } from "lucide-react";
import { SavedDeliveriesCard } from "./SavedDeliveriesCard";
import { getSavedDeliveries, deleteDelivery, DeliveryData, updateDelivery } from "@/utils/deliveryUtils";
import { PrintUtils } from "@/utils/printUtils";
import { DeliveryDetails } from "./DeliveryDetails";
import { ExportUtils } from "@/utils/exportUtils";
import { formatCurrency } from "@/lib/currency";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SavedDeliveriesSectionProps {
  onBack: () => void;
  onLogout: () => void;
  username: string;
}

export const SavedDeliveriesSection = ({ onBack, onLogout, username }: SavedDeliveriesSectionProps) => {
  const [deliveries, setDeliveries] = useState<DeliveryData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateSearchTerm, setDateSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryData | null>(null);
  const [editingDelivery, setEditingDelivery] = useState<DeliveryData | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editableItems, setEditableItems] = useState<any[]>([]);

  // Load saved deliveries from database
  useEffect(() => {
    const loadDeliveries = async () => {
      try {
        setLoading(true);
        const savedDeliveries = await getSavedDeliveries();
        setDeliveries(savedDeliveries);
      } catch (error) {
        console.error("Error loading saved deliveries:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDeliveries();

    // Listen for storage changes to update deliveries in real-time
    const handleStorageChange = () => {
      loadDeliveries();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Filter deliveries based on search term and date
  const filteredDeliveries = deliveries.filter(delivery => {
    // Text search (delivery note number, customer, ID)
    const matchesText = 
      delivery.deliveryNoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Date search
    let matchesDate = true;
    if (dateSearchTerm) {
      try {
        // Parse the delivery date
        const deliveryDate = new Date(delivery.date);
        // Parse the search date (supporting various formats)
        const searchDate = new Date(dateSearchTerm);
        
        // Check if dates match (same day)
        matchesDate = 
          deliveryDate.getDate() === searchDate.getDate() &&
          deliveryDate.getMonth() === searchDate.getMonth() &&
          deliveryDate.getFullYear() === searchDate.getFullYear();
      } catch (error) {
        // If date parsing fails, don't filter by date
        matchesDate = true;
      }
    }
    
    return matchesText && matchesDate;
  });

  const handleDeleteDelivery = (deliveryId: string) => {
    try {
      deleteDelivery(deliveryId);
      // Update the state to reflect the deletion
      setDeliveries(prev => prev.filter(delivery => delivery.id !== deliveryId));
    } catch (error) {
      console.error("Error deleting delivery:", error);
    }
  };

  const handleViewDelivery = (delivery: DeliveryData) => {
    setSelectedDelivery(delivery);
  };

  const handlePrintDelivery = (delivery: DeliveryData) => {
    // Create a transaction object for printing
    const transaction = {
      id: delivery.id,
      receiptNumber: delivery.deliveryNoteNumber,
      date: delivery.date,
      items: delivery.itemsList || [],
      subtotal: delivery.subtotal || 0,
      tax: delivery.tax || 0,
      discount: delivery.discount || 0,
      total: delivery.total,
      paymentMethod: delivery.paymentMethod,
      amountReceived: delivery.amountReceived || delivery.total,
      change: delivery.change || 0,
      customer: { name: delivery.customer },
      vehicle: delivery.vehicle,
      driver: delivery.driver,
      deliveryNotes: delivery.deliveryNotes
    };

    PrintUtils.printDeliveryNote(transaction);
  };

  const handleDownloadDelivery = (delivery: DeliveryData) => {
    // Create a transaction object for PDF export
    const transaction = {
      id: delivery.id,
      receiptNumber: delivery.deliveryNoteNumber,
      date: delivery.date,
      items: delivery.itemsList || [],
      subtotal: delivery.subtotal || 0,
      tax: delivery.tax || 0,
      discount: delivery.discount || 0,
      total: delivery.total,
      paymentMethod: delivery.paymentMethod,
      amountReceived: delivery.amountReceived || delivery.total,
      change: delivery.change || 0,
      customer: { name: delivery.customer },
      vehicle: delivery.vehicle,
      driver: delivery.driver,
      deliveryNotes: delivery.deliveryNotes
    };
    
    ExportUtils.exportReceiptAsPDF(transaction, `delivery-${delivery.deliveryNoteNumber}`);
  };

  const handleEditDelivery = (delivery: DeliveryData) => {
    // Open the edit modal with the delivery data
    setEditingDelivery(delivery);
    // Initialize editable items from the delivery
    setEditableItems([...(delivery.itemsList || [])]);
    setIsEditModalOpen(true);
  };

  const handleSaveEditedDelivery = async () => {
    if (!editingDelivery) return;
    
    try {
      // Update the delivery with edited data
      const updatedDelivery: DeliveryData = {
        ...editingDelivery,
        itemsList: editableItems,
        items: editableItems.length,
        subtotal: editableItems.reduce((sum, item) => sum + (item.total || item.price * item.quantity), 0),
        total: editableItems.reduce((sum, item) => sum + (item.total || item.price * item.quantity), 0)
      };
      
      await updateDelivery(updatedDelivery);
      
      // Update the state to reflect the changes
      setDeliveries(prev => prev.map(d => d.id === updatedDelivery.id ? updatedDelivery : d));
      
      // Close the edit modal
      setIsEditModalOpen(false);
      setEditingDelivery(null);
      setEditableItems([]);
      
      alert('Delivery updated successfully!');
    } catch (error) {
      console.error('Error updating delivery:', error);
      alert('Error updating delivery. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {selectedDelivery ? (
        <DeliveryDetails
          delivery={selectedDelivery}
          onBack={() => setSelectedDelivery(null)}
          onPrint={() => handlePrintDelivery(selectedDelivery)}
          onDownload={() => handleDownloadDelivery(selectedDelivery)}
          onEdit={() => handleEditDelivery(selectedDelivery)}
        />
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
                    <Truck className="h-8 w-8 text-primary" />
                    Saved Deliveries
                  </h2>
                  <p className="text-muted-foreground text-sm sm:text-base md:text-lg">
                    View and manage your saved delivery notes from completed transactions
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by delivery note number, customer name..."
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
                <p>Loading saved deliveries...</p>
              </div>
            ) : filteredDeliveries.length === 0 ? (
              <div className="text-center py-12">
                <Truck className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Saved Deliveries</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || dateSearchTerm ? "No deliveries match your search criteria." : "You haven't saved any deliveries yet."}
                </p>
                <p className="text-sm text-muted-foreground">
                  Deliveries are automatically saved when you complete a delivery note in the Templates section.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {filteredDeliveries.map((delivery) => (
                  <SavedDeliveriesCard
                    key={delivery.id}
                    delivery={{
                      id: delivery.id,
                      deliveryNoteNumber: delivery.deliveryNoteNumber,
                      date: delivery.date,
                      customer: delivery.customer,
                      items: delivery.items,
                      total: delivery.total,
                      vehicle: delivery.vehicle,
                      driver: delivery.driver,
                      status: delivery.status
                    }}
                    onViewDetails={() => handleViewDelivery(delivery)}
                    onPrintDelivery={() => handlePrintDelivery(delivery)}
                    onDownloadDelivery={() => handleDownloadDelivery(delivery)}
                    onDeleteDelivery={() => handleDeleteDelivery(delivery.id)}
                  />
                ))}
              </div>
            )}
          </main>
        </>
      )}
      
      {/* Edit Delivery Modal */}
      {isEditModalOpen && editingDelivery && (
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Delivery #{editingDelivery.deliveryNoteNumber}</DialogTitle>
              <DialogDescription>
                Modify the delivery details below and save the changes
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Customer Name</label>
                  <Input 
                    value={editingDelivery.customer}
                    readOnly
                    className="bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Delivery Note Number</label>
                  <Input 
                    value={editingDelivery.deliveryNoteNumber}
                    readOnly
                    className="bg-gray-100"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Vehicle</label>
                  <Input 
                    value={editingDelivery.vehicle || ''}
                    onChange={(e) => setEditingDelivery(prev => prev ? {...prev, vehicle: e.target.value} : null)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Driver</label>
                  <Input 
                    value={editingDelivery.driver || ''}
                    onChange={(e) => setEditingDelivery(prev => prev ? {...prev, driver: e.target.value} : null)}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Delivery Notes</label>
                <Input
                  value={editingDelivery.deliveryNotes || ''}
                  onChange={(e) => setEditingDelivery(prev => prev ? {...prev, deliveryNotes: e.target.value} : null)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Items</label>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-2">Item</th>
                        <th className="text-left p-2">Quantity</th>
                        <th className="text-right p-2">Price</th>
                        <th className="text-right p-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editableItems.map((item, index) => (
                        <tr key={index} className={index % 2 === 0 ? "bg-muted/50" : ""}>
                          <td className="p-2">{item.name || item.productName}</td>
                          <td className="p-2">
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => {
                                const newItems = [...editableItems];
                                newItems[index] = {
                                  ...item,
                                  quantity: parseFloat(e.target.value) || 0
                                };
                                setEditableItems(newItems);
                              }}
                              className="w-20"
                            />
                          </td>
                          <td className="p-2 text-right">
                            <Input
                              type="number"
                              step="0.01"
                              value={item.price || item.unitPrice || 0}
                              onChange={(e) => {
                                const newItems = [...editableItems];
                                const price = parseFloat(e.target.value) || 0;
                                newItems[index] = {
                                  ...item,
                                  price: price,
                                  unitPrice: price,
                                  total: price * (item.quantity || 0)
                                };
                                setEditableItems(newItems);
                              }}
                              className="w-24"
                            />
                          </td>
                          <td className="p-2 text-right">
                            {formatCurrency((item.price || item.unitPrice || 0) * (item.quantity || 0))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="flex justify-end gap-4 pt-4 border-t">
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Total:</div>
                  <div className="text-xl font-bold">
                    {formatCurrency(editableItems.reduce((sum, item) => sum + ((item.price || item.unitPrice || 0) * (item.quantity || 0)), 0))}
                  </div>
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
                onClick={handleSaveEditedDelivery}
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