import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, CreditCard, Download, Printer, Eye } from "lucide-react";
import { SavedSupplierSettlementsCard } from "./SavedSupplierSettlementsCard";
import { 
  getSavedSupplierSettlements, 
  deleteSupplierSettlement, 
  SupplierSettlementData 
} from "@/utils/supplierSettlementUtils";
import { ExportUtils } from "@/utils/exportUtils";
import { formatCurrency } from "@/lib/currency";

interface SavedSupplierSettlementsSectionProps {
  onBack: () => void;
  onLogout: () => void;
  username: string;
}

interface DisplaySettlement {
  id: string;
  referenceNumber: string;
  date: string;
  supplierName: string;
  supplierPhone?: string;
  supplierEmail?: string;
  amount: number;
  paymentMethod: string;
  status: "completed" | "pending" | "cancelled";
  previousBalance?: number;
  amountPaid?: number;
  newBalance?: number;
}

export const SavedSupplierSettlementsSection = ({ onBack, onLogout, username }: SavedSupplierSettlementsSectionProps) => {
  const [settlements, setSettlements] = useState<SupplierSettlementData[]>([]);
  const [displaySettlements, setDisplaySettlements] = useState<DisplaySettlement[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedSettlement, setSelectedSettlement] = useState<SupplierSettlementData | null>(null);

  // Load saved settlements from localStorage
  useEffect(() => {
    const loadSettlements = () => {
      try {
        setLoading(true);
        const savedSettlements = getSavedSupplierSettlements();
        setSettlements(savedSettlements);
        
        // Convert to display format
        const display = savedSettlements.map(s => ({
          id: s.id || Date.now().toString(),
          referenceNumber: s.referenceNumber,
          date: s.date,
          supplierName: s.supplierName,
          supplierPhone: s.supplierPhone,
          supplierEmail: s.supplierEmail,
          amount: s.settlementAmount,
          paymentMethod: s.paymentMethod,
          status: s.status || "completed",
          previousBalance: s.previousBalance,
          amountPaid: s.amountPaid,
          newBalance: s.newBalance
        }));
        setDisplaySettlements(display);
      } catch (error) {
        console.error("Error loading saved settlements:", error);
      } finally {
        setLoading(false);
      }
    };

    loadSettlements();

    // Listen for storage changes to update settlements in real-time
    const handleStorageChange = () => {
      loadSettlements();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Filter settlements based on search term
  const filteredSettlements = displaySettlements.filter(s => 
    s.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.paymentMethod.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteSettlement = (settlementId: string) => {
    try {
      deleteSupplierSettlement(settlementId);
      // Update the state to reflect the deletion
      setSettlements(prev => prev.filter(s => s.id !== settlementId));
      setDisplaySettlements(prev => prev.filter(s => s.id !== settlementId));
    } catch (error) {
      console.error("Error deleting settlement:", error);
    }
  };

  const handleViewSettlement = (settlement: DisplaySettlement) => {
    const originalSettlement = settlements.find(s => s.id === settlement.id) || null;
    setSelectedSettlement(originalSettlement);
  };

  const handlePrintSettlement = (settlement: DisplaySettlement) => {
    const originalSettlement = settlements.find(s => s.id === settlement.id);
    if (originalSettlement) {
      ExportUtils.exportSupplierSettlementAsPDF(originalSettlement, `settlement-${settlement.referenceNumber}`);
    }
  };

  const handleDownloadSettlement = (settlement: DisplaySettlement) => {
    const originalSettlement = settlements.find(s => s.id === settlement.id);
    if (originalSettlement) {
      ExportUtils.exportSupplierSettlementAsPDF(originalSettlement, `settlement-${settlement.referenceNumber}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {selectedSettlement ? (
        <div className="container mx-auto p-4 sm:p-6">
          <Button onClick={() => setSelectedSettlement(null)} variant="outline" className="mb-4">
            ← Back to Saved Settlements
          </Button>
          <Card>
            <CardHeader>
              <CardTitle>Settlement Details: {selectedSettlement.referenceNumber}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold">Supplier Information</h3>
                  <p>Supplier: {selectedSettlement.supplierName}</p>
                  {selectedSettlement.supplierPhone && (
                    <p>Phone: {selectedSettlement.supplierPhone}</p>
                  )}
                  {selectedSettlement.supplierEmail && (
                    <p>Email: {selectedSettlement.supplierEmail}</p>
                  )}
                  {selectedSettlement.poNumber && (
                    <p>PO #: {selectedSettlement.poNumber}</p>
                  )}
                  <p>Date: {new Date(selectedSettlement.date).toLocaleDateString()}</p>
                  <p>Status: {selectedSettlement.status || "completed"}</p>
                </div>
                <div>
                  <h3 className="font-semibold">Payment Details</h3>
                  <p>Reference: {selectedSettlement.referenceNumber}</p>
                  <p>Payment Method: {selectedSettlement.paymentMethod}</p>
                  {selectedSettlement.previousBalance !== undefined && (
                    <p>Previous Balance: {formatCurrency(selectedSettlement.previousBalance)}</p>
                  )}
                  {selectedSettlement.amountPaid !== undefined && (
                    <p>Amount Paid: {formatCurrency(selectedSettlement.amountPaid)}</p>
                  )}
                  {selectedSettlement.newBalance !== undefined && (
                    <p>New Balance: {formatCurrency(selectedSettlement.newBalance)}</p>
                  )}
                </div>
              </div>
              {selectedSettlement.notes && (
                <div className="mt-4">
                  <h3 className="font-semibold">Notes</h3>
                  <p>{selectedSettlement.notes}</p>
                </div>
              )}
              <div className="mt-4">
                <h3 className="font-semibold">Total Settlement</h3>
                <p className="text-xl font-bold">
                  {formatCurrency(selectedSettlement.settlementAmount)}
                </p>
              </div>
              <div className="mt-4 flex gap-2">
                <Button onClick={() => {
                  const settlementToPrint = filteredSettlements.find(s => s.id === selectedSettlement.id);
                  if (settlementToPrint) {
                    handlePrintSettlement(settlementToPrint);
                  }
                }}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print Settlement
                </Button>
                <Button onClick={() => {
                  const settlementToDownload = filteredSettlements.find(s => s.id === selectedSettlement.id);
                  if (settlementToDownload) {
                    handleDownloadSettlement(settlementToDownload);
                  }
                }}>
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
                    <CreditCard className="h-8 w-8 text-primary" />
                    Saved Supplier Settlements
                  </h2>
                  <p className="text-muted-foreground text-sm sm:text-base md:text-lg">
                    View and manage your saved supplier settlements from completed transactions
                  </p>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search settlements by number, supplier, method..."
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
                <p>Loading saved supplier settlements...</p>
              </div>
            ) : filteredSettlements.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Saved Supplier Settlements</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? "No settlements match your search." : "You haven't saved any supplier settlements yet."}
                </p>
                <p className="text-sm text-muted-foreground">
                  Settlements are automatically saved when you complete a supplier settlement in the Supplier Settlements section.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {filteredSettlements.map((settlement) => (
                  <SavedSupplierSettlementsCard
                    key={settlement.id}
                    settlement={settlement}
                    onViewDetails={() => handleViewSettlement(settlement)}
                    onPrintSettlement={() => handlePrintSettlement(settlement)}
                    onDownloadSettlement={() => handleDownloadSettlement(settlement)}
                    onDeleteSettlement={() => handleDeleteSettlement(settlement.id)}
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