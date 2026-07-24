import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, FileText, Download, Printer, Eye, EyeOff } from "lucide-react";
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
  const [showSellingPrice, setShowSellingPrice] = useState(true);
  const [showProjectedProfit, setShowProjectedProfit] = useState(true);

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
    PrintUtils.printSupplierPurchaseNoteDetails(note, { showSellingPrice, showProjectedProfit });
  };

  const handleDownloadNote = (note: SavedSupplierPurchaseNote) => {
    // For now, just print (PDF download can be added later)
    handlePrintNote(note);
  };

  return (
    <div className="min-h-screen bg-background">
      {selectedNote ? (
        <div className="min-h-screen bg-white">
          {/* Action Bar */}
          <div className="sticky top-0 z-50 bg-white border-b shadow-sm">
            <div className="container mx-auto px-4 py-3 flex items-center justify-between">
              <Button onClick={() => setSelectedNote(null)} variant="outline" size="sm">
                ← Back to Saved Notes
              </Button>
              <div className="flex gap-2 items-center">
                <Button
                  onClick={() => setShowSellingPrice(!showSellingPrice)}
                  variant={showSellingPrice ? "default" : "outline"}
                  size="sm"
                  className="gap-1.5"
                >
                  {showSellingPrice ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  Selling Price
                </Button>
                <Button
                  onClick={() => setShowProjectedProfit(!showProjectedProfit)}
                  variant={showProjectedProfit ? "default" : "outline"}
                  size="sm"
                  className="gap-1.5"
                >
                  {showProjectedProfit ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  Proj. Profit
                </Button>
                <Button onClick={() => handlePrintNote(selectedNote)} size="sm">
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
                <Button onClick={() => handleDownloadNote(selectedNote)} size="sm" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>
          </div>

          {/* Document Content */}
          <div className="container mx-auto max-w-[850px] py-6 px-0">
            {/* Accent Bar */}
            <div className="h-1 bg-black" />

            {/* Header */}
            <div className="text-center py-3 px-6 border-b-[3px] border-black relative">
              <h1 className="text-2xl font-extrabold uppercase tracking-wide">Supplier Purchase Note</h1>
              <p className="text-sm font-semibold">#{selectedNote.purchaseNoteNumber}</p>
            </div>

            {/* Meta Bar */}
            <div className="bg-gray-50 px-6 py-2 flex justify-between items-center border-b-2 border-gray-200">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase text-gray-600">Date</span>
                <span className="text-xs font-bold">{new Date(selectedNote.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase text-gray-600">Status</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${selectedNote.status === 'completed' ? 'bg-green-100 text-green-800' : selectedNote.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {selectedNote.status.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase text-gray-600">Prepared By</span>
                <span className="text-xs font-bold">{selectedNote.preparedBy || 'N/A'}</span>
              </div>
            </div>

            {/* Party Sections */}
            <div className="px-6 py-3 flex gap-4">
              <div className="flex-1 border rounded overflow-hidden">
                <div className="bg-gray-100 px-3 py-2 text-xs font-bold uppercase tracking-wide">From (Supplier)</div>
                <div className="p-3">
                  <p className="font-bold text-sm border-b-2 border-gray-200 pb-1 mb-1">{selectedNote.supplierName || 'N/A'}</p>
                  {selectedNote.supplierPhone && <p className="text-xs text-gray-700">Phone: {selectedNote.supplierPhone}</p>}
                  {selectedNote.supplierEmail && <p className="text-xs text-gray-700">Email: {selectedNote.supplierEmail}</p>}
                  {selectedNote.supplierAddress && <p className="text-xs text-gray-700">Address: {selectedNote.supplierAddress}</p>}
                </div>
              </div>
              <div className="flex-1 border rounded overflow-hidden">
                <div className="bg-gray-100 px-3 py-2 text-xs font-bold uppercase tracking-wide">To (Business)</div>
                <div className="p-3">
                  <p className="font-bold text-sm border-b-2 border-gray-200 pb-1 mb-1">{selectedNote.businessName || 'N/A'}</p>
                  {selectedNote.businessPhone && <p className="text-xs text-gray-700">Phone: {selectedNote.businessPhone}</p>}
                  {selectedNote.businessEmail && <p className="text-xs text-gray-700">Email: {selectedNote.businessEmail}</p>}
                  {selectedNote.businessAddress && <p className="text-xs text-gray-700">Address: {selectedNote.businessAddress}</p>}
                </div>
              </div>
            </div>

            {/* Info Grid */}
            <div className="px-6 pb-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 p-2 text-center">
                  <div className="text-[10px] font-semibold uppercase text-gray-500">Total Items</div>
                  <div className="text-sm font-extrabold">{selectedNote.items.length}</div>
                </div>
                <div className="bg-gray-50 p-2 text-center">
                  <div className="text-[10px] font-semibold uppercase text-gray-500">Total Quantity</div>
                  <div className="text-sm font-extrabold">{selectedNote.items.reduce((s, i) => s + (i.quantity || 0), 0)}</div>
                </div>
                <div className="bg-gray-50 p-2 text-center">
                  <div className="text-[10px] font-semibold uppercase text-gray-500">Grand Total</div>
                  <div className="text-sm font-extrabold">{formatCurrency(selectedNote.total)}</div>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="px-6 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wide mb-2 flex items-center gap-2">
                <span className="w-[3px] h-3.5 bg-black rounded-sm inline-block" />
                Items Purchased
              </h3>
              <div className="overflow-x-auto border border-gray-300">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b-2 border-gray-300">
                      <th className="text-center px-2 py-2 font-bold uppercase tracking-wider border-r border-gray-200 w-8">#</th>
                      <th className="text-left px-2 py-2 font-bold uppercase tracking-wider border-r border-gray-200">Description</th>
                      <th className="text-center px-2 py-2 font-bold uppercase tracking-wider border-r border-gray-200 w-16">Qty</th>
                      <th className="text-center px-2 py-2 font-bold uppercase tracking-wider border-r border-gray-200 w-16">Unit</th>
                      <th className="text-right px-2 py-2 font-bold uppercase tracking-wider border-r border-gray-200 w-24">Cost Price</th>
                      {showSellingPrice && <th className="text-right px-2 py-2 font-bold uppercase tracking-wider border-r border-gray-200 w-24">Selling Price</th>}
                      <th className="text-right px-2 py-2 font-bold uppercase tracking-wider border-r border-gray-200 w-24">Total</th>
                      {showProjectedProfit && <th className="text-right px-2 py-2 font-bold uppercase tracking-wider w-24">Proj. Profit</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedNote.items.map((item, index) => {
                      const profit = ((item.sellingPrice || 0) - (item.unitPrice || 0)) * (item.quantity || 0);
                      return (
                        <tr key={index} className={index % 2 === 1 ? 'bg-gray-50' : ''}>
                          <td className="text-center px-2 py-2 font-bold border-r border-gray-200 border-b border-gray-200">{String(index + 1).padStart(2, '0')}</td>
                          <td className="px-2 py-2 font-semibold border-r border-gray-200 border-b border-gray-200">{item.description}</td>
                          <td className="text-center px-2 py-2 border-r border-gray-200 border-b border-gray-200">{item.quantity}</td>
                          <td className="text-center px-2 py-2 border-r border-gray-200 border-b border-gray-200">{item.unit || '-'}</td>
                          <td className="text-right px-2 py-2 border-r border-gray-200 border-b border-gray-200">{formatCurrency(item.unitPrice)}</td>
                          {showSellingPrice && <td className="text-right px-2 py-2 border-r border-gray-200 border-b border-gray-200">{formatCurrency(item.sellingPrice || 0)}</td>}
                          <td className="text-right px-2 py-2 font-bold border-r border-gray-200 border-b border-gray-200">{formatCurrency(item.total)}</td>
                          {showProjectedProfit && (
                            <td className={`text-right px-2 py-2 border-b border-gray-200 ${profit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                              {formatCurrency(profit)}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 border-t-2 border-gray-300">
                      <td colSpan={4 + (showSellingPrice ? 1 : 0)} className="text-right px-2 py-2 font-bold uppercase text-[10px] tracking-wide border-r border-gray-200">Subtotal</td>
                      <td className="text-right px-2 py-2 font-bold border-r border-gray-200">{formatCurrency(selectedNote.subtotal)}</td>
                      {showProjectedProfit && (
                        <td className="text-right px-2 py-2 font-bold">
                          {formatCurrency(selectedNote.items.reduce((sum, item) => sum + (((item.sellingPrice || 0) - (item.unitPrice || 0)) * (item.quantity || 0)), 0))}
                        </td>
                      )}
                    </tr>
                    {selectedNote.discount > 0 && (
                      <tr className="bg-gray-100">
                        <td colSpan={4 + (showSellingPrice ? 1 : 0)} className="text-right px-2 py-2 font-bold uppercase text-[10px] tracking-wide border-r border-gray-200">Discount</td>
                        <td className="text-right px-2 py-2 font-bold border-r border-gray-200">{formatCurrency(selectedNote.discount)}</td>
                        {showProjectedProfit && <td className="px-2 py-2 border-gray-200" />}
                      </tr>
                    )}
                    <tr className="bg-gray-200">
                      <td colSpan={4 + (showSellingPrice ? 1 : 0)} className="text-right px-2 py-2 font-extrabold uppercase text-xs tracking-wide border-r border-gray-200">Grand Total</td>
                      <td className="text-right px-2 py-2 font-extrabold text-sm border-r border-gray-200">{formatCurrency(selectedNote.total)}</td>
                      {showProjectedProfit && <td className="px-2 py-2" />}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Notes */}
            {selectedNote.notes && (
              <div className="px-6 pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wide mb-1 flex items-center gap-2">
                  <span className="w-[3px] h-3.5 bg-black rounded-sm inline-block" />
                  Notes
                </h3>
                <p className="text-xs whitespace-pre-line bg-gray-50 p-3 rounded border text-gray-700">{selectedNote.notes}</p>
              </div>
            )}

            {/* Footer */}
            <div className="px-6 pb-6 mt-4">
              <div className="border-t-2 border-gray-300 pt-3 flex justify-between">
                <div className="text-[10px] text-gray-500">
                  Generated on {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
                <div className="text-[10px] text-gray-500">Supplier Purchase Note #{selectedNote.purchaseNoteNumber}</div>
              </div>
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
