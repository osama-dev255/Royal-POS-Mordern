import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Truck, Download, Printer, Eye } from "lucide-react";
import { SavedDeliveriesCard } from "./SavedDeliveriesCard";
import { getSavedDeliveries, deleteDelivery, DeliveryData } from "@/utils/deliveryUtils";
import { PrintUtils } from "@/utils/printUtils";
import { DeliveryDetails } from "./DeliveryDetails";
import { ExportUtils } from "@/utils/exportUtils";

interface SavedDeliveriesSectionProps {
  onBack: () => void;
  onLogout: () => void;
  username: string;
}

export const SavedDeliveriesSection = ({ onBack, onLogout, username }: SavedDeliveriesSectionProps) => {
  const [deliveries, setDeliveries] = useState<DeliveryData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryData | null>(null);

  // Load saved deliveries from localStorage
  useEffect(() => {
    const loadDeliveries = async () => {
      try {
        setLoading(true);
        const savedDeliveries = getSavedDeliveries();
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

  // Filter deliveries based on search term
  const filteredDeliveries = deliveries.filter(delivery => 
    delivery.deliveryNoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    delivery.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    delivery.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

    PrintUtils.printReceipt(transaction);
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

  return (
    <div className="min-h-screen bg-background">
      {selectedDelivery ? (
        <DeliveryDetails
          delivery={selectedDelivery}
          onBack={() => setSelectedDelivery(null)}
          onPrint={() => handlePrintDelivery(selectedDelivery)}
          onDownload={() => handleDownloadDelivery(selectedDelivery)}
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
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search deliveries by number, customer..."
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
                <p>Loading saved deliveries...</p>
              </div>
            ) : filteredDeliveries.length === 0 ? (
              <div className="text-center py-12">
                <Truck className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Saved Deliveries</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? "No deliveries match your search." : "You haven't saved any deliveries yet."}
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
    </div>
  );
};