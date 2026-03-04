import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, HandCoins, Download, Printer, Edit, Calendar } from "lucide-react";
import { SavedCustomerSettlementsCard } from "./SavedCustomerSettlementsCard";
import { 
  getSavedSettlements, 
  deleteCustomerSettlement, 
  updateCustomerSettlement,
  CustomerSettlementData as SavedCustomerSettlementData 
} from "@/utils/customerSettlementUtils";
import { PrintUtils } from "@/utils/printUtils";
import { ExportUtils } from "@/utils/exportUtils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SavedCustomerSettlementsSectionProps {
  onBack: () => void;
  onLogout: () => void;
  username: string;
}

export const SavedCustomerSettlementsSection = ({ onBack, onLogout, username }: SavedCustomerSettlementsSectionProps) => {
  const [settlements, setSettlements] = useState<SavedCustomerSettlementData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateSearchTerm, setDateSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewingSettlement, setViewingSettlement] = useState<SavedCustomerSettlementData | null>(null);
  const [editingSettlement, setEditingSettlement] = useState<SavedCustomerSettlementData | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Load saved settlements from database
  useEffect(() => {
    const loadSettlements = async () => {
      try {
        setLoading(true);
        const savedSettlements = await getSavedSettlements();
        setSettlements(savedSettlements);
      } catch (error) {
        console.error("Error loading settlements:", error);
        setSettlements([]);
      } finally {
        setLoading(false);
      }
    };
      
    loadSettlements();
      
    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'savedSettlements') {
        loadSettlements();
      }
    };
      
    // Listen for manual refresh events
    const handleRefresh = () => {
      loadSettlements();
    };
      
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('refreshSettlements', handleRefresh);
      
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('refreshSettlements', handleRefresh);
    };
  }, []);

  // Filter settlements based on search term and date
  const filteredSettlements = settlements.filter(settlement => {
    // Text search (reference number, customer name, ID)
    const matchesText = 
      settlement.referenceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      settlement.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      settlement.id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Date search
    let matchesDate = true;
    if (dateSearchTerm) {
      try {
        // Parse the settlement date
        const settlementDate = new Date(settlement.date);
        // Parse the search date (supporting various formats)
        const searchDate = new Date(dateSearchTerm);
        
        // Check if dates match (same day)
        matchesDate = 
          settlementDate.getDate() === searchDate.getDate() &&
          settlementDate.getMonth() === searchDate.getMonth() &&
          settlementDate.getFullYear() === searchDate.getFullYear();
      } catch (error) {
        // If date parsing fails, don't filter by date
        matchesDate = true;
      }
    }
    
    return matchesText && matchesDate;
  });

  const handleDeleteSettlement = (settlementId: string) => {
    try {
      deleteCustomerSettlement(settlementId);
      // The state will be updated automatically via the refreshSettlements event listener
    } catch (error) {
      console.error("Error deleting settlement:", error);
    }
  };

  const handlePrintSettlement = (settlement: SavedCustomerSettlementData) => {
    // Create a settlement object for printing
    const settlementToPrint = {
      id: settlement.id,
      referenceNumber: settlement.referenceNumber,
      date: settlement.date,
      customerName: settlement.customerName,
      settlementAmount: settlement.settlementAmount,
      paymentMethod: settlement.paymentMethod,
      cashierName: settlement.cashierName,
      previousBalance: settlement.previousBalance,
      amountPaid: settlement.amountPaid,
      newBalance: settlement.newBalance,
      notes: settlement.notes,
      status: settlement.status,
      time: settlement.time,
      customerPhone: settlement.customerPhone,
      customerEmail: settlement.customerEmail
    };

    // Using PrintUtils to print the settlement
    PrintUtils.printCustomerSettlement(settlementToPrint);
  };

  const handleDownloadSettlement = (settlement: SavedCustomerSettlementData) => {
    // Create a settlement object for PDF export
    const settlementToExport = {
      id: settlement.id,
      referenceNumber: settlement.referenceNumber,
      date: settlement.date,
      customerName: settlement.customerName,
      settlementAmount: settlement.settlementAmount,
      paymentMethod: settlement.paymentMethod,
      cashierName: settlement.cashierName,
      previousBalance: settlement.previousBalance,
      amountPaid: settlement.amountPaid,
      newBalance: settlement.newBalance,
      notes: settlement.notes,
      status: settlement.status,
      time: settlement.time,
      customerPhone: settlement.customerPhone,
      customerEmail: settlement.customerEmail
    };

    // Export the settlement as PDF
    ExportUtils.exportCustomerSettlementAsPDF(settlementToExport, `Customer-Settlement-${settlement.referenceNumber}`);
  };

  const handleViewSettlement = (settlement: SavedCustomerSettlementData) => {
    setViewingSettlement(settlement);
  };

  const handleEditSettlement = (settlement: SavedCustomerSettlementData) => {
    setEditingSettlement(settlement);
    setIsEditModalOpen(true);
  };

  const handleSaveEditedSettlement = async () => {
    if (!editingSettlement) return;
    
    try {
      await updateCustomerSettlement(editingSettlement);
      
      // Update the local state
      setSettlements(prev => 
        prev.map(s => s.id === editingSettlement.id ? editingSettlement : s)
      );
      
      // Close the modal
      setIsEditModalOpen(false);
      setEditingSettlement(null);
      
      alert('Settlement updated successfully!');
    } catch (error) {
      console.error('Error updating settlement:', error);
      alert('Error updating settlement. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Render settlement details view if viewing a settlement */}
      {viewingSettlement ? (
        <div className="container mx-auto p-4 sm:p-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Settlement Details</h2>
              <Button variant="outline" onClick={() => setViewingSettlement(null)}>
                Back to Settlements
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Settlement Information</h3>
                <div className="space-y-2">
                  <p><span className="font-medium">Reference:</span> {viewingSettlement.referenceNumber}</p>
                  <p><span className="font-medium">Date:</span> {viewingSettlement.date}</p>
                  <p><span className="font-medium">Time:</span> {viewingSettlement.time}</p>
                  <p><span className="font-medium">Status:</span> {viewingSettlement.status || 'completed'}</p>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">Customer Information</h3>
                <div className="space-y-2">
                  <p><span className="font-medium">Name:</span> {viewingSettlement.customerName}</p>
                  <p><span className="font-medium">Phone:</span> {viewingSettlement.customerPhone}</p>
                  <p><span className="font-medium">Email:</span> {viewingSettlement.customerEmail}</p>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">Financial Details</h3>
                <div className="space-y-2">
                  <p><span className="font-medium">Previous Balance:</span> {viewingSettlement.previousBalance?.toLocaleString()}</p>
                  <p><span className="font-medium">Amount Paid:</span> {viewingSettlement.amountPaid?.toLocaleString()}</p>
                  <p><span className="font-medium">New Balance:</span> {viewingSettlement.newBalance?.toLocaleString()}</p>
                  <p><span className="font-medium">Total Settlement:</span> {viewingSettlement.settlementAmount?.toLocaleString()}</p>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">Transaction Details</h3>
                <div className="space-y-2">
                  <p><span className="font-medium">Payment Method:</span> {viewingSettlement.paymentMethod}</p>
                  <p><span className="font-medium">Processed By:</span> {viewingSettlement.cashierName}</p>
                  <p><span className="font-medium">Notes:</span> {viewingSettlement.notes || 'None'}</p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <Button variant="outline" onClick={() => handleEditSettlement(viewingSettlement)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button variant="outline" onClick={() => handlePrintSettlement(viewingSettlement)}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" onClick={() => handleDownloadSettlement(viewingSettlement)}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
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
                <h1 className="text-xl font-bold">Customer Settlements</h1>
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
                    <HandCoins className="h-8 w-8 text-primary" />
                    Saved Customer Settlements
                  </h2>
                  <p className="text-muted-foreground text-sm sm:text-base md:text-lg">
                    View and manage your saved customer settlements from completed transactions
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search settlements by reference, customer..."
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
                <p>Loading saved settlements...</p>
              </div>
            ) : filteredSettlements.length === 0 ? (
              <div className="text-center py-12">
                <HandCoins className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Saved Settlements</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? "No settlements match your search." : "You haven't saved any settlements yet."}
                </p>
                <p className="text-sm text-muted-foreground">
                  Settlements are automatically saved when you complete a customer settlement transaction.
                </p>
                {settlements.length > 0 && filteredSettlements.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Showing {settlements.length} total settlement(s), but none match your search "{searchTerm}".
                  </p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {filteredSettlements.map((settlement) => {
                  return (
                  <SavedCustomerSettlementsCard
                    key={settlement.id}
                    settlement={{
                      id: settlement.id,
                      reference: settlement.referenceNumber, // Fixed: was incorrectly mapped
                      date: settlement.date,
                      customerName: settlement.customerName,
                      amount: settlement.settlementAmount, // Fixed: was incorrectly mapped
                      paymentMethod: settlement.paymentMethod,
                      status: settlement.status || "completed",
                      previousBalance: settlement.previousBalance,
                      newBalance: settlement.newBalance,
                      processedBy: settlement.cashierName, // Fixed: was incorrectly mapped
                      notes: settlement.notes
                    }}
                    onViewDetails={() => handleViewSettlement(settlement)}
                    onPrintSettlement={() => handlePrintSettlement(settlement)}
                    onDownloadSettlement={() => handleDownloadSettlement(settlement)}
                    onDeleteSettlement={() => handleDeleteSettlement(settlement.id)}
                  />
                  )})}
                  
                  {/* Show message if no valid settlements after filtering */}
                  {filteredSettlements.length > 0 && filteredSettlements.every(s => !s.id || !s.customerName) && (
                    <div className="col-span-full text-center py-8">
                      <p className="text-muted-foreground">No valid settlements to display</p>
                    </div>
                  )}
              </div>
            )}
          </main>
        </>
      )}
      
      {/* Edit Settlement Modal */}
      {isEditModalOpen && editingSettlement && (
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Settlement #{editingSettlement.referenceNumber}</DialogTitle>
              <DialogDescription>
                Modify the settlement details below and save the changes
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Customer Name</label>
                  <Input 
                    value={editingSettlement.customerName || ''}
                    onChange={(e) => setEditingSettlement({...editingSettlement, customerName: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Reference Number</label>
                  <Input 
                    value={editingSettlement.referenceNumber || ''}
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
                    value={editingSettlement.date?.split('T')[0] || ''}
                    onChange={(e) => setEditingSettlement({...editingSettlement, date: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Time</label>
                  <Input 
                    value={editingSettlement.time || ''}
                    onChange={(e) => setEditingSettlement({...editingSettlement, time: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Previous Balance</label>
                  <Input 
                    type="number"
                    step="0.01"
                    value={editingSettlement.previousBalance || 0}
                    onChange={(e) => setEditingSettlement({...editingSettlement, previousBalance: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Amount Paid</label>
                  <Input 
                    type="number"
                    step="0.01"
                    value={editingSettlement.amountPaid || 0}
                    onChange={(e) => setEditingSettlement({...editingSettlement, amountPaid: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">New Balance</label>
                  <Input 
                    type="number"
                    step="0.01"
                    value={editingSettlement.newBalance || 0}
                    onChange={(e) => setEditingSettlement({...editingSettlement, newBalance: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Settlement Amount</label>
                  <Input 
                    type="number"
                    step="0.01"
                    value={editingSettlement.settlementAmount || 0}
                    onChange={(e) => setEditingSettlement({...editingSettlement, settlementAmount: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Payment Method</label>
                  <select
                    value={editingSettlement.paymentMethod || 'cash'}
                    onChange={(e) => setEditingSettlement({...editingSettlement, paymentMethod: e.target.value})}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="mpesa">M-Pesa</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={editingSettlement.notes || ''}
                  onChange={(e) => setEditingSettlement({...editingSettlement, notes: e.target.value})}
                  className="w-full p-2 border rounded-md min-h-[80px]"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={editingSettlement.status || 'completed'}
                  onChange={(e) => setEditingSettlement({...editingSettlement, status: e.target.value as any})}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
            
            <DialogFooter className="flex gap-2 mt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveEditedSettlement}
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