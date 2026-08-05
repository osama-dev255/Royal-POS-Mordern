import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Banknote, Printer, Eye, Plus, Save, Share2, ArrowLeft, Trash2 } from "lucide-react";
import {
  getSavedCashHandoverNotes,
  deleteCashHandoverNote,
  saveCashHandoverNote,
  updateCashHandoverNote,
  generateReferenceNumber,
  CashHandoverNoteData,
  SavedCashHandoverNote
} from "@/utils/cashHandoverUtils";
import { formatCurrency } from "@/lib/currency";
import { PrintUtils } from "@/utils/printUtils";
import { toast } from "@/components/ui/use-toast";

interface CashHandoverNoteSectionProps {
  onBack: () => void;
  onLogout: () => void;
  username: string;
}

const emptyForm = (): CashHandoverNoteData => ({
  referenceNumber: generateReferenceNumber(),
  date: new Date().toISOString().split('T')[0],
  businessName: 'KILANGO GROUP LTD',
  businessAddress: '64, Muheza - Tanga - Tanzania',
  businessPhone: '0711 299 266',
  totalAmount: 0,
  notes: '',
  preparedBy: '',
  preparedDate: new Date().toISOString().split('T')[0],
  handedOverBy: '',
  handedOverDate: new Date().toISOString().split('T')[0],
  receivedBy: '',
  receivedDate: new Date().toISOString().split('T')[0],
  status: 'pending'
});

export const CashHandoverNoteSection = ({ onBack, onLogout, username }: CashHandoverNoteSectionProps) => {
  // View state
  const [view, setView] = useState<'list' | 'form' | 'detail'>('list');

  // List state
  const [notes, setNotes] = useState<SavedCashHandoverNote[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState<SavedCashHandoverNote | null>(null);

  // Form state
  const [form, setForm] = useState<CashHandoverNoteData>(emptyForm());
  const [saving, setSaving] = useState(false);

  // Load notes
  const loadNotes = async () => {
    try {
      setLoading(true);
      const data = await getSavedCashHandoverNotes();
      setNotes(data);
    } catch (e) {
      console.error('Error loading cash handover notes:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadNotes(); }, []);

  // Filtered notes
  const filtered = notes.filter(n =>
    n.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.preparedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.handedOverBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.receivedBy.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ── Form handlers ──────────────────────────────────────────────────────────

  const handleFieldChange = (field: keyof CashHandoverNoteData, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // Auto-complete status when all signatories are filled
  useEffect(() => {
    if (form.preparedBy && form.handedOverBy && form.receivedBy) {
      setForm(prev => ({ ...prev, status: 'completed' }));
    }
  }, [form.preparedBy, form.handedOverBy, form.receivedBy]);

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    // Validation
    if (form.totalAmount <= 0) {
      toast({ title: 'Validation', description: 'Total cash amount must be greater than zero', variant: 'destructive' });
      return;
    }
    if (!form.preparedBy) {
      toast({ title: 'Validation', description: 'Prepared By is required', variant: 'destructive' });
      return;
    }
    if (!form.handedOverBy) {
      toast({ title: 'Validation', description: 'Handed Over By is required', variant: 'destructive' });
      return;
    }
    if (!form.receivedBy) {
      toast({ title: 'Validation', description: 'Received By (Agent) is required', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const result = await saveCashHandoverNote(form);
      if (result.success) {
        toast({ title: 'Success', description: 'Cash Handover Note saved successfully' });
        setForm(emptyForm());
        setView('list');
        loadNotes();
      } else {
        toast({ title: 'Error', description: result.error || 'Failed to save note', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to save cash handover note', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ── Mark as completed ──────────────────────────────────────────────────────

  const handleMarkCompleted = async (note: SavedCashHandoverNote) => {
    try {
      const result = await updateCashHandoverNote(note.id, { status: 'completed' });
      if (result.success) {
        toast({ title: 'Success', description: 'Note marked as completed' });
        loadNotes();
        if (selectedNote?.id === note.id) {
          setSelectedNote({ ...note, status: 'completed' });
        }
      } else {
        toast({ title: 'Error', description: result.error || 'Failed to update', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    }
  };

  // ── Detail actions ─────────────────────────────────────────────────────────

  const handlePrint = (n: SavedCashHandoverNote) => {
    PrintUtils.printCashHandoverNote(n);
  };

  const handleShare = (n: SavedCashHandoverNote) => {
    const lines = [
      `CASH HANDOVER NOTE`,
      `Reference #: ${n.referenceNumber}`,
      `Date: ${n.date}`,
      ``,
      `Business: ${n.businessName || 'N/A'}`,
      n.businessAddress ? `Address: ${n.businessAddress}` : '',
      n.businessPhone ? `Phone: ${n.businessPhone}` : '',
      ``,
      `Total Cash Amount: ${formatCurrency(n.totalAmount)}`,
      ``,
      `Prepared By: ${n.preparedBy || 'N/A'}`,
      `Date: ${n.preparedDate || 'N/A'}`,
      ``,
      `Handed Over By: ${n.handedOverBy || 'N/A'}`,
      `Date: ${n.handedOverDate || 'N/A'}`,
      ``,
      `Received By (Agent): ${n.receivedBy || 'N/A'}`,
      `Date: ${n.receivedDate || 'N/A'}`,
      ``,
      `Status: ${n.status.toUpperCase()}`,
      n.notes ? `\nNotes: ${n.notes}` : ''
    ].filter(Boolean);

    const text = lines.join('\n');

    if (navigator.share) {
      navigator.share({ title: `Cash Handover ${n.referenceNumber}`, text });
    } else {
      navigator.clipboard.writeText(text);
      toast({ title: 'Copied', description: 'Cash handover details copied to clipboard' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this cash handover note?')) return;
    try {
      const result = await deleteCashHandoverNote(id);
      if (result.success) {
        toast({ title: 'Deleted', description: 'Cash handover note deleted successfully' });
        setNotes(prev => prev.filter(n => n.id !== id));
        if (selectedNote?.id === id) {
          setSelectedNote(null);
          setView('list');
        }
      } else {
        toast({ title: 'Error', description: result.error || 'Failed to delete', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to delete cash handover note', variant: 'destructive' });
    }
  };

  // ── Render: Detail View ────────────────────────────────────────────────────

  if (view === 'detail' && selectedNote) {
    const n = selectedNote;
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={() => { setSelectedNote(null); setView('list'); }}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Notes
          </Button>
          <div className="flex gap-2">
            {n.status === 'pending' && (
              <Button variant="outline" onClick={() => handleMarkCompleted(n)}>
                Mark Completed
              </Button>
            )}
            <Button onClick={() => handlePrint(n)}><Printer className="h-4 w-4 mr-2" /> Print</Button>
            <Button variant="outline" onClick={() => handleShare(n)}><Share2 className="h-4 w-4 mr-2" /> Share</Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              <div className="text-2xl font-bold">CASH HANDOVER NOTE</div>
              <p className="text-sm text-muted-foreground">{n.referenceNumber}</p>
              <div className={`inline-block mt-2 text-xs font-bold px-3 py-1 rounded ${n.status === 'completed' ? 'bg-green-100 text-green-700' : n.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                {n.status.toUpperCase()}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Business Info */}
            <div className="border rounded-lg p-4 space-y-3">
              <h3 className="font-bold text-sm">Business Information</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold">Business Name</label>
                  <Input value={n.businessName} readOnly className="mt-1 bg-gray-50" />
                </div>
                <div>
                  <label className="text-xs font-bold">Phone</label>
                  <Input value={n.businessPhone} readOnly className="mt-1 bg-gray-50" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold">Address</label>
                <Input value={n.businessAddress} readOnly className="mt-1 bg-gray-50" />
              </div>
            </div>

            {/* Cash Details */}
            <div className="border rounded-lg p-4 bg-green-50 border-green-200">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold uppercase tracking-wide">Total Cash Amount</span>
                <span className="text-2xl font-bold text-green-700">{formatCurrency(n.totalAmount)}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">Date: {n.date}</div>
            </div>

            {n.notes && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide mb-1">Notes</h3>
                <p className="text-sm whitespace-pre-line bg-gray-50 p-3 rounded border">{n.notes}</p>
              </div>
            )}

            {/* Signatories */}
            <div className="grid grid-cols-3 gap-4 border-t pt-4">
              <div>
                <div className="text-xs font-bold uppercase text-muted-foreground">Prepared By</div>
                <p className="text-sm font-medium">{n.preparedBy || '-'}</p>
                <p className="text-xs text-muted-foreground">{n.preparedDate || '-'}</p>
              </div>
              <div>
                <div className="text-xs font-bold uppercase text-muted-foreground">Handed Over By</div>
                <p className="text-sm font-medium">{n.handedOverBy || '-'}</p>
                <p className="text-xs text-muted-foreground">{n.handedOverDate || '-'}</p>
              </div>
              <div>
                <div className="text-xs font-bold uppercase text-muted-foreground">Received By (Agent)</div>
                <p className="text-sm font-medium">{n.receivedBy || '-'}</p>
                <p className="text-xs text-muted-foreground">{n.receivedDate || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Render: Form View ──────────────────────────────────────────────────────

  if (view === 'form') {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={() => setView('list')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Notes
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Note'}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>New Cash Handover Note</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Business Info */}
            <div className="border rounded-lg p-4 space-y-3">
              <h3 className="font-bold text-sm">Business Information</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold">Business Name</label>
                  <Input value={form.businessName} onChange={e => handleFieldChange('businessName', e.target.value)} className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold">Phone</label>
                  <Input value={form.businessPhone} onChange={e => handleFieldChange('businessPhone', e.target.value)} className="mt-1" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold">Address</label>
                <Input value={form.businessAddress} onChange={e => handleFieldChange('businessAddress', e.target.value)} className="mt-1" />
              </div>
            </div>

            {/* Reference & Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold">Reference Number</label>
                <Input value={form.referenceNumber} onChange={e => handleFieldChange('referenceNumber', e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-bold">Date <span className="text-red-500">*</span></label>
                <Input type="date" value={form.date} onChange={e => handleFieldChange('date', e.target.value)} className="mt-1" />
              </div>
            </div>

            {/* Cash Amount */}
            <div className="border rounded-lg p-4">
              <h3 className="font-bold text-sm mb-3">Cash Details</h3>
              <div>
                <label className="text-xs font-bold">Total Cash Amount <span className="text-red-500">*</span></label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={form.totalAmount || ''}
                  onChange={e => handleFieldChange('totalAmount', parseFloat(e.target.value) || 0)}
                  className="mt-1 text-lg font-bold"
                />
                <p className="text-xs text-muted-foreground mt-1">Amount being handed over for banking</p>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-bold">Notes</label>
              <textarea
                value={form.notes}
                onChange={e => handleFieldChange('notes', e.target.value)}
                className="w-full p-2 border rounded text-sm h-20 mt-1"
                placeholder="Additional notes..."
              />
            </div>

            {/* Signatories */}
            <div className="border-t pt-4">
              <h3 className="font-bold text-sm mb-3">Authorization & Signatures</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold">Prepared By <span className="text-red-500">*</span></label>
                  <Input value={form.preparedBy} onChange={e => handleFieldChange('preparedBy', e.target.value)} className="h-8 text-sm" placeholder="Name" />
                  <Input type="date" value={form.preparedDate} onChange={e => handleFieldChange('preparedDate', e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold">Handed Over By <span className="text-red-500">*</span></label>
                  <Input value={form.handedOverBy} onChange={e => handleFieldChange('handedOverBy', e.target.value)} className="h-8 text-sm" placeholder="Name" />
                  <Input type="date" value={form.handedOverDate} onChange={e => handleFieldChange('handedOverDate', e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold">Received By (Agent) <span className="text-red-500">*</span></label>
                  <Input value={form.receivedBy} onChange={e => handleFieldChange('receivedBy', e.target.value)} className="h-8 text-sm" placeholder="Agent name" />
                  <Input type="date" value={form.receivedDate} onChange={e => handleFieldChange('receivedDate', e.target.value)} className="h-8 text-sm" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Render: List View (default) ────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Banknote className="h-8 w-8 text-primary" />
            Cash Handover Notes
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Record when cash collected from business is handed to an agent for banking
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { setForm(emptyForm()); setView('form'); }}>
            <Plus className="h-4 w-4 mr-2" /> New Note
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by reference # or name..."
          className="pl-10"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p>Loading cash handover notes...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Banknote className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Cash Handover Notes</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm ? "No notes match your search." : "You haven't created any cash handover notes yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(n => (
            <Card key={n.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-sm">{n.referenceNumber}</div>
                    <div className="text-xs text-muted-foreground">{n.date}</div>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${n.status === 'completed' ? 'bg-green-100 text-green-700' : n.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                    {n.status.toUpperCase()}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cash Amount:</span>
                  <span className="font-bold text-green-600">{formatCurrency(n.totalAmount)}</span>
                </div>

                <div className="text-xs space-y-1">
                  <div><strong>Prepared:</strong> {n.preparedBy || '-'}</div>
                  <div><strong>Handed:</strong> {n.handedOverBy || '-'}</div>
                  <div><strong>Agent:</strong> {n.receivedBy || '-'}</div>
                </div>

                <div className="flex gap-1 pt-2 border-t">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => { setSelectedNote(n); setView('detail'); }}>
                    <Eye className="h-3 w-3 mr-1" /> View
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handlePrint(n)}>
                    <Printer className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleShare(n)}>
                    <Share2 className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDelete(n.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
