import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, FileText, Download, Printer, Eye } from "lucide-react";
import { SupplierPurchaseNoteCard } from "./SupplierPurchaseNoteCard";
import { getSavedSupplierPurchaseNotes, deleteSupplierPurchaseNote, SavedSupplierPurchaseNote } from "@/utils/supplierPurchaseNoteUtils";
import { PrintUtils } from "@/utils/printUtils";
import { formatCurrency } from "@/lib/currency";

interface SupplierPurchaseNoteSectionProps {
  onBack: () => void;
  onLogout: () => void;
  username: string;
}

export const SupplierPurchaseNoteSection = ({ onBack, onLogout, username }: SupplierPurchaseNoteSectionProps) => {
  const [notes, setNotes] = useState<SavedSupplierPurchaseNote[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState<SavedSupplierPurchaseNote | null>(null);

  // Load saved supplier purchase notes from database
  useEffect(() => {
    const loadNotes = async () => {
      try {
        setLoading(true);
        const savedNotes = await getSavedSupplierPurchaseNotes();
        setNotes(savedNotes);
      } catch (error) {
        console.error("Error loading saved supplier purchase notes:", error);
      } finally {
        setLoading(false);
      }
    };

    loadNotes();

    // Listen for custom save events to update notes in real-time
    const handleNoteSaved = (event: CustomEvent) => {
      const { notes: updatedNotes } = event.detail;
      setNotes(updatedNotes);
    };

    window.addEventListener('supplierPurchaseNoteSaved', handleNoteSaved as EventListener);
    return () => window.removeEventListener('supplierPurchaseNoteSaved', handleNoteSaved as EventListener);
  }, []);

  // Filter notes based on search term
  const filteredNotes = notes.filter(note => 
    note.purchaseNoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteNote = async (noteId: string) => {
    try {
      const result = await deleteSupplierPurchaseNote(noteId);
      if (result.success) {
        setNotes(prev => prev.filter(note => note.id !== noteId));
      }
    } catch (error) {
      console.error("Error deleting supplier purchase note:", error);
    }
  };

  const handleViewNote = (note: SavedSupplierPurchaseNote) => {
    setSelectedNote(note);
  };

  const handlePrintNote = (note: SavedSupplierPurchaseNote) => {
    PrintUtils.printSupplierPurchaseNoteDetails(note);
  };

  const handleDownloadNote = (note: SavedSupplierPurchaseNote) => {
    // For now, just print (PDF download can be added later)
    handlePrintNote(note);
  };

  return (
    <div className="min-h-screen bg-background">
      {selectedNote ? (
        <div className="container mx-auto p-4 sm:p-6">
          <div className="flex gap-2 mb-4">
            <Button onClick={() => setSelectedNote(null)} variant="outline">
              ← Back to Saved Notes
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Supplier Purchase Note: #{selectedNote.purchaseNoteNumber}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold">Supplier Information</h3>
                  <p>Supplier: {selectedNote.supplierName || 'N/A'}</p>
                  <p>Phone: {selectedNote.supplierPhone || 'N/A'}</p>
                  <p>Email: {selectedNote.supplierEmail || 'N/A'}</p>
                  <p>Address: {selectedNote.supplierAddress || 'N/A'}</p>
                </div>
                <div>
                  <h3 className="font-semibold">Business Information</h3>
                  <p>Business: {selectedNote.businessName || 'N/A'}</p>
                  <p>Phone: {selectedNote.businessPhone || 'N/A'}</p>
                  <p>Email: {selectedNote.businessEmail || 'N/A'}</p>
                  <p>Address: {selectedNote.businessAddress || 'N/A'}</p>
                </div>
                <div>
                  <h3 className="font-semibold">Note Details</h3>
                  <p>Date: {new Date(selectedNote.date).toLocaleDateString()}</p>
                  <p>Status: {selectedNote.status}</p>
                  <p>Prepared By: {selectedNote.preparedBy || 'N/A'}</p>
                </div>
              </div>
              <div className="mt-4">
                <h3 className="font-semibold">Items</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedNote.items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap">{item.description}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{item.quantity}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{item.unit}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{formatCurrency(item.unitPrice)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={4} className="px-6 py-3 text-right font-semibold">Subtotal:</td>
                        <td className="px-6 py-3">{formatCurrency(selectedNote.subtotal)}</td>
                      </tr>
                      {selectedNote.tax > 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-3 text-right font-semibold">Tax:</td>
                          <td className="px-6 py-3">{formatCurrency(selectedNote.tax)}</td>
                        </tr>
                      )}
                      {selectedNote.discount > 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-3 text-right font-semibold">Discount:</td>
                          <td className="px-6 py-3">{formatCurrency(selectedNote.discount)}</td>
                        </tr>
                      )}
                      <tr>
                        <td colSpan={4} className="px-6 py-3 text-right font-bold">Total:</td>
                        <td className="px-6 py-3 font-bold">{formatCurrency(selectedNote.total)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
              {selectedNote.notes && (
                <div className="mt-4">
                  <h3 className="font-semibold">Notes</h3>
                  <p className="text-sm whitespace-pre-line">{selectedNote.notes}</p>
                </div>
              )}
              <div className="mt-4 flex gap-2">
                <Button onClick={() => handlePrintNote(selectedNote)}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print Note
                </Button>
                <Button onClick={() => handleDownloadNote(selectedNote)}>
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
                <h1 className="text-xl font-bold">Supplier Purchase Notes</h1>
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
                    Saved Supplier Purchase Notes
                  </h2>
                  <p className="text-muted-foreground text-sm sm:text-base md:text-lg">
                    View and manage purchase notes created on behalf of suppliers
                  </p>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by number, supplier..."
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
                <p>Loading saved supplier purchase notes...</p>
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Saved Supplier Purchase Notes</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? "No notes match your search." : "You haven't created any supplier purchase notes yet."}
                </p>
                <p className="text-sm text-muted-foreground">
                  Supplier Purchase Notes are saved when you create a purchase on behalf of a supplier.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {filteredNotes.map((note) => (
                  <SupplierPurchaseNoteCard
                    key={note.id}
                    note={{
                      id: note.id,
                      purchaseNoteNumber: note.purchaseNoteNumber,
                      date: note.date,
                      supplierName: note.supplierName,
                      items: note.items.length,
                      total: note.total,
                      status: note.status
                    }}
                    onViewDetails={() => handleViewNote(note)}
                    onPrint={() => handlePrintNote(note)}
                    onDownload={() => handleDownloadNote(note)}
                    onDelete={() => handleDeleteNote(note.id)}
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
