import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Package, Download, Printer, Eye } from "lucide-react";
import { SavedGRNsCard } from "./SavedGRNsCard";
import { getSavedGRNs, deleteGRN, SavedGRN as SavedGRNType } from "@/utils/grnUtils";
import { PrintUtils } from "@/utils/printUtils";
import { ExportUtils } from "@/utils/exportUtils";
import { formatCurrency } from "@/lib/currency";

interface SavedGRNsSectionProps {
  onBack: () => void;
  onLogout: () => void;
  username: string;
}

export const SavedGRNsSection = ({ onBack, onLogout, username }: SavedGRNsSectionProps) => {
  const [grns, setGrns] = useState<SavedGRNType[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedGRN, setSelectedGRN] = useState<SavedGRNType | null>(null);

  // Function to distribute receiving costs among items based on quantity
  const distributeReceivingCosts = (items: any[], receivingCosts: Array<{ description: string; amount: number }>) => {
    // Calculate total quantity of all items
    const totalQuantity = items.reduce((sum, item) => sum + item.delivered, 0);
    
    if (totalQuantity === 0) {
      return items.map(item => ({
        ...item,
        receivingCostPerUnit: 0,
        totalWithReceivingCost: item.unitCost ? item.unitCost * item.delivered : 0
      }));
    }
    
    // Calculate total receiving costs
    const totalReceivingCosts = receivingCosts.reduce((sum, cost) => sum + Number(cost.amount || 0), 0);
    
    // Calculate cost per unit based on total quantity
    const costPerUnit = totalReceivingCosts / totalQuantity;
    
    // Update each item with receiving cost per unit and total cost with receiving costs
    return items.map(item => {
      const receivingCostPerUnit = costPerUnit;
      const unitCostWithReceiving = (item.unitCost || 0) + receivingCostPerUnit;
      const totalWithReceivingCost = unitCostWithReceiving * item.delivered;
      
      return {
        ...item,
        receivingCostPerUnit,
        totalWithReceivingCost,
        unitCost: unitCostWithReceiving
      };
    });
  };

  // Load saved GRNs from database
  useEffect(() => {
    const loadGRNs = async () => {
      try {
        setLoading(true);
        const savedGRNs = await getSavedGRNs();
        setGrns(savedGRNs);
      } catch (error) {
        console.error("Error loading saved GRNs:", error);
      } finally {
        setLoading(false);
      }
    };

    loadGRNs();

    // Listen for custom GRN save events to update GRNs in real-time
    const handleGRNSaved = (event: CustomEvent) => {
      const { grns } = event.detail;
      setGrns(grns);
    };

    window.addEventListener('grnSaved', handleGRNSaved as EventListener);
    return () => window.removeEventListener('grnSaved', handleGRNSaved as EventListener);
  }, []);

  // Filter GRNs based on search term
  const filteredGRNs = grns.filter(grn => 
    grn.data.grnNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    grn.data.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    grn.data.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    grn.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteGRN = (grnId: string) => {
    try {
      deleteGRN(grnId);
      // Update the state to reflect the deletion
      setGrns(prev => prev.filter(grn => grn.id !== grnId));
    } catch (error) {
      console.error("Error deleting GRN:", error);
    }
  };

  const handleViewGRN = (grn: SavedGRNType) => {
    setSelectedGRN(grn);
  };

  const handlePrintGRN = (grn: SavedGRNType) => {
    // Create a transaction object for printing
    const transaction = {
      id: grn.id,
      receiptNumber: grn.data.grnNumber,
      date: grn.data.date,
      items: grn.data.items.map(item => ({
        name: item.description,
        quantity: item.delivered,
        unit: item.unit,
        price: item.unitCost || 0,
        total: item.totalWithReceivingCost || 0
      })),
      subtotal: grn.data.items.reduce((sum, item) => sum + (item.totalWithReceivingCost || 0), 0),
      tax: 0, // GRNs typically don't have tax separately
      discount: 0,
      total: grn.data.items.reduce((sum, item) => sum + (item.totalWithReceivingCost || 0), 0),
      paymentMethod: "N/A",
      amountReceived: grn.data.items.reduce((sum, item) => sum + (item.totalWithReceivingCost || 0), 0),
      change: 0,
      customer: { name: grn.data.supplierName },
      supplier: { name: grn.data.supplierName },
      poNumber: grn.data.poNumber,
      deliveryNoteNumber: grn.data.deliveryNoteNumber,
      vehicle: grn.data.vehicleNumber,
      driver: grn.data.driverName,
      receivedBy: grn.data.receivedBy
    };

    // For now, use printPurchaseReceipt as a fallback since there's no printGRN method
    PrintUtils.printPurchaseReceipt(transaction);
  };

  const handleDownloadGRN = (grn: SavedGRNType) => {
    // Create a transaction object for PDF export
    const transaction = {
      id: grn.id,
      receiptNumber: grn.data.grnNumber,
      date: grn.data.date,
      items: grn.data.items.map(item => ({
        name: item.description,
        quantity: item.delivered,
        unit: item.unit,
        price: item.unitCost || 0,
        total: item.totalWithReceivingCost || 0
      })),
      subtotal: grn.data.items.reduce((sum, item) => sum + (item.totalWithReceivingCost || 0), 0),
      tax: 0, // GRNs typically don't have tax separately
      discount: 0,
      total: grn.data.items.reduce((sum, item) => sum + (item.totalWithReceivingCost || 0), 0),
      paymentMethod: "N/A",
      amountReceived: grn.data.items.reduce((sum, item) => sum + (item.totalWithReceivingCost || 0), 0),
      change: 0,
      customer: { name: grn.data.supplierName },
      supplier: { name: grn.data.supplierName },
      poNumber: grn.data.poNumber,
      deliveryNoteNumber: grn.data.deliveryNoteNumber,
      vehicle: grn.data.vehicleNumber,
      driver: grn.data.driverName,
      receivedBy: grn.data.receivedBy
    };
    
    ExportUtils.exportGRNAsPDF(transaction, `grn-${grn.data.grnNumber}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {selectedGRN ? (
        <div className="container mx-auto p-4 sm:p-6">
          <Button onClick={() => setSelectedGRN(null)} variant="outline" className="mb-4">
            ← Back to Saved GRNs
          </Button>
          <Card>
            <CardHeader>
              <CardTitle>GRN Details: {selectedGRN.data.grnNumber}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold">Supplier Information</h3>
                  <p>Supplier: {selectedGRN.data.supplierName}</p>
                  <p>PO Number: {selectedGRN.data.poNumber}</p>
                  <p>Date: {new Date(selectedGRN.data.date).toLocaleDateString()}</p>
                  <p>Status: {selectedGRN.data.status}</p>
                </div>
                <div>
                  <h3 className="font-semibold">Delivery Information</h3>
                  <p>Delivery Note: {selectedGRN.data.deliveryNoteNumber}</p>
                  <p>Vehicle: {selectedGRN.data.vehicleNumber}</p>
                  <p>Driver: {selectedGRN.data.driverName}</p>
                  <p>Received By: {selectedGRN.data.receivedBy}</p>
                </div>
              </div>
              <div className="mt-4">
                <h3 className="font-semibold">Items Received</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ordered</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Received</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Soldout</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rejected Out</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rejection In</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Damaged</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Complimentary</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Available</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Original Unit Cost</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receiving Cost Per Unit</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">New Unit Cost</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cost with Receiving</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch #</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {distributeReceivingCosts(selectedGRN.data.items, selectedGRN.data.receivingCosts).map((item, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap">{item.description}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{item.quantity}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{item.delivered}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{item.soldout || 0}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{item.rejectedOut || 0}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{item.rejectionIn || 0}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{item.damaged || 0}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{item.complimentary || 0}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{item.available || (item.delivered - (item.soldout || 0) - (item.rejectedOut || 0) + (item.rejectionIn || 0) - (item.damaged || 0) - (item.complimentary || 0))}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{item.unit}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{formatCurrency(item.unitCost - (item.receivingCostPerUnit || 0))}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{formatCurrency(item.receivingCostPerUnit || 0)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{formatCurrency(item.unitCost)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{formatCurrency(item.totalWithReceivingCost || (item.delivered * (item.unitCost || 0)))}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{item.batchNumber || ''}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{item.expiryDate || ''}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{item.remarks || ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button onClick={() => handlePrintGRN(selectedGRN)}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print GRN
                </Button>
                <Button onClick={() => handleDownloadGRN(selectedGRN)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </CardContent>
          </Card>
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
                <h1 className="text-xl font-bold">Purchase Management</h1>
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
                    <Package className="h-8 w-8 text-primary" />
                    Saved Goods Received Notes
                  </h2>
                  <p className="text-muted-foreground text-sm sm:text-base md:text-lg">
                    View and manage your saved Goods Received Notes from completed transactions
                  </p>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search GRNs by number, supplier, PO..."
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
                <p>Loading saved Goods Received Notes...</p>
              </div>
            ) : filteredGRNs.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Saved Goods Received Notes</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? "No GRNs match your search." : "You haven't saved any Goods Received Notes yet."}
                </p>
                <p className="text-sm text-muted-foreground">
                  GRNs are automatically saved when you complete a Goods Received Note in the Templates section.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {filteredGRNs.map((grn) => (
                  <SavedGRNsCard
                    key={grn.id}
                    grn={{
                      id: grn.id,
                      name: grn.name,
                      grnNumber: grn.data.grnNumber,
                      date: grn.data.date,
                      supplier: grn.data.supplierName,
                      items: grn.data.items.length,
                      total: grn.total,
                      poNumber: grn.data.poNumber,
                      status: grn.data.status === "pending" || grn.data.status === "cancelled" ? "received" : (grn.data.status || "received")
                    }}
                    onViewDetails={() => handleViewGRN(grn)}
                    onPrintGRN={() => handlePrintGRN(grn)}
                    onDownloadGRN={() => handleDownloadGRN(grn)}
                    onDeleteGRN={() => handleDeleteGRN(grn.id)}
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