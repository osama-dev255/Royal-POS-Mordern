import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Banknote, Printer, Eye, Plus, Save, Share2, ArrowLeft, Trash2, Building2, FileText, Users, StickyNote, Clock, CheckCircle2, AlertCircle, ChevronRight, CalendarDays } from "lucide-react";
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
  agentClaimNote: '',
  agentOwedNote: '',
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
    if (!form.preparedBy) {
      toast({ title: 'Validation', description: 'Prepared By is required', variant: 'destructive' });
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
    const statusConfig = {
      completed: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: CheckCircle2 },
      cancelled: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: AlertCircle },
      pending:   { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: Clock },
    }[n.status] || { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: Clock };
    const StatusIcon = statusConfig.icon;

    return (
      <div className="space-y-4">
        {/* Top Bar */}
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={() => { setSelectedNote(null); setView('list'); }}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Notes
          </Button>
          <div className="flex gap-2">
            {n.status === 'pending' && (
              <Button variant="outline" onClick={() => handleMarkCompleted(n)}>
                <CheckCircle2 className="h-4 w-4 mr-2" /> Mark Completed
              </Button>
            )}
            <Button onClick={() => handlePrint(n)}><Printer className="h-4 w-4 mr-2" /> Print</Button>
            <Button variant="outline" onClick={() => handleShare(n)}><Share2 className="h-4 w-4 mr-2" /> Share</Button>
          </div>
        </div>

        {/* Header Card */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-5 text-white">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-bold tracking-wide">CASH HANDOVER NOTE</h2>
                <p className="text-slate-300 text-sm mt-1">{n.referenceNumber}</p>
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border}`}>
                <StatusIcon className="h-3.5 w-3.5" />
                {n.status.toUpperCase()}
              </div>
            </div>
          </div>

          <CardContent className="p-6 space-y-6">
            {/* Amount & Date */}
            <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-6 py-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Total Cash Amount</div>
                <div className="text-3xl font-extrabold text-emerald-700 mt-1">{formatCurrency(n.totalAmount)}</div>
              </div>
              <div className="text-right">
                <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Handover Date</div>
                <div className="text-sm font-medium text-slate-700 mt-1 flex items-center gap-1.5 justify-end">
                  <CalendarDays className="h-4 w-4 text-emerald-600" />
                  {n.date}
                </div>
              </div>
            </div>

            {/* Business Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                <Building2 className="h-3.5 w-3.5" /> Business Information
              </div>
              <div className="grid grid-cols-3 gap-3 bg-slate-50 rounded-lg p-4 border">
                <div>
                  <div className="text-[10px] font-semibold uppercase text-slate-400">Business Name</div>
                  <div className="text-sm font-medium mt-0.5">{n.businessName || '—'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase text-slate-400">Phone</div>
                  <div className="text-sm font-medium mt-0.5">{n.businessPhone || '—'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase text-slate-400">Address</div>
                  <div className="text-sm font-medium mt-0.5">{n.businessAddress || '—'}</div>
                </div>
              </div>
            </div>

            {/* Agent Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                <Users className="h-3.5 w-3.5" /> Agent Information
              </div>
              <div className="grid grid-cols-3 gap-3 bg-slate-50 rounded-lg p-4 border">
                <div>
                  <div className="text-[10px] font-semibold uppercase text-slate-400">Agent Name</div>
                  <div className="text-sm font-medium mt-0.5">{n.receivedBy || '—'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase text-slate-400">Phone</div>
                  <div className="text-sm font-medium mt-0.5">{n.businessPhone || '—'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase text-slate-400">Received Date</div>
                  <div className="text-sm font-medium mt-0.5">{n.receivedDate || '—'}</div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {n.notes && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <StickyNote className="h-3.5 w-3.5" /> Notes
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm whitespace-pre-line">{n.notes}</div>
              </div>
            )}

            {/* Signatories — Visual Flow */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                <Users className="h-3.5 w-3.5" /> Authorization & Signatures
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-start gap-0">
                {/* Prepared By */}
                <div className="bg-slate-50 border rounded-lg p-3 text-center">
                  <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Prepared By</div>
                  <div className="text-sm font-semibold mt-1">{n.preparedBy || '—'}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{n.preparedDate || '—'}</div>
                </div>
                <div className="flex items-center justify-center px-2 pt-4">
                  <ChevronRight className="h-5 w-5 text-slate-300" />
                </div>
                {/* Handed Over By */}
                <div className="bg-slate-50 border rounded-lg p-3 text-center">
                  <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Handed Over By</div>
                  <div className="text-sm font-semibold mt-1">{n.handedOverBy || '—'}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{n.handedOverDate || '—'}</div>
                </div>
                <div className="flex items-center justify-center px-2 pt-4">
                  <ChevronRight className="h-5 w-5 text-slate-300" />
                </div>
                {/* Received By */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
                  <div className="text-[10px] font-bold uppercase text-emerald-500 tracking-wider">Received By (Agent)</div>
                  <div className="text-sm font-semibold mt-1 text-emerald-700">{n.receivedBy || '—'}</div>
                  <div className="text-[11px] text-emerald-600 mt-0.5">{n.receivedDate || '—'}</div>
                </div>
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

        <Card className="overflow-hidden">
          {/* Form Header */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4 text-white">
            <h2 className="text-lg font-bold tracking-wide">NEW CASH HANDOVER NOTE</h2>
            <p className="text-slate-300 text-xs mt-0.5">Record cash collected from business handed to an agent for banking</p>
          </div>

          <CardContent className="p-6 space-y-6">
            {/* Business Info Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 border-b pb-2">
                <Building2 className="h-4 w-4 text-slate-400" /> Business Information
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Business Name</label>
                  <Input value={form.businessName} onChange={e => handleFieldChange('businessName', e.target.value)} className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Phone</label>
                  <Input value={form.businessPhone} onChange={e => handleFieldChange('businessPhone', e.target.value)} className="mt-1" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Address</label>
                <Input value={form.businessAddress} onChange={e => handleFieldChange('businessAddress', e.target.value)} className="mt-1" />
              </div>
            </div>

            {/* Agent Info Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 border-b pb-2">
                <Users className="h-4 w-4 text-slate-400" /> Agent Information
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Agent Name</label>
                  <Input value={form.receivedBy} onChange={e => handleFieldChange('receivedBy', e.target.value)} className="mt-1" placeholder="Enter agent name" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Received Date</label>
                  <Input type="date" value={form.receivedDate} onChange={e => handleFieldChange('receivedDate', e.target.value)} className="mt-1" />
                </div>
              </div>
            </div>

            {/* Reference & Date Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 border-b pb-2">
                <FileText className="h-4 w-4 text-slate-400" /> Reference & Date
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Reference Number</label>
                  <Input value={form.referenceNumber} onChange={e => handleFieldChange('referenceNumber', e.target.value)} className="mt-1 font-mono" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Date <span className="text-red-500">*</span></label>
                  <Input type="date" value={form.date} onChange={e => handleFieldChange('date', e.target.value)} className="mt-1" />
                </div>
              </div>
            </div>

            {/* Cash Amount Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 border-b pb-2">
                <Banknote className="h-4 w-4 text-slate-400" /> Cash Details
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <label className="text-xs font-semibold text-emerald-700">Total Cash Amount</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={form.totalAmount || ''}
                  onChange={e => handleFieldChange('totalAmount', parseFloat(e.target.value) || 0)}
                  className="mt-1 text-2xl font-extrabold text-emerald-700 border-emerald-300 bg-white"
                />
                <p className="text-xs text-emerald-600 mt-1.5">Amount being handed over for banking</p>
              </div>
            </div>

            {/* Agent Reconciliation Notes */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 border-b pb-2">
                <Banknote className="h-4 w-4 text-slate-400" /> Pesa za Wakala
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Pesa Anayodai Wakala</label>
                  <textarea
                    value={form.agentClaimNote}
                    onChange={e => handleFieldChange('agentClaimNote', e.target.value)}
                    className="w-full p-3 border rounded-lg text-sm h-20 resize-none mt-1 focus:outline-none focus:ring-2 focus:ring-slate-300"
                    placeholder="Pesa anazodai wakala..."
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Pesa Anayodaiwa Wakala</label>
                  <textarea
                    value={form.agentOwedNote}
                    onChange={e => handleFieldChange('agentOwedNote', e.target.value)}
                    className="w-full p-3 border rounded-lg text-sm h-20 resize-none mt-1 focus:outline-none focus:ring-2 focus:ring-slate-300"
                    placeholder="Pesa anazodaiwa wakala..."
                  />
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 border-b pb-2">
                <StickyNote className="h-4 w-4 text-slate-400" /> Additional Notes
              </div>
              <textarea
                value={form.notes}
                onChange={e => handleFieldChange('notes', e.target.value)}
                className="w-full p-3 border rounded-lg text-sm h-20 resize-none focus:outline-none focus:ring-2 focus:ring-slate-300"
                placeholder="Any additional notes about this handover..."
              />
            </div>

            {/* Signatories Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 border-b pb-2">
                <Users className="h-4 w-4 text-slate-400" /> Authorization & Signatures
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 border rounded-lg p-3 space-y-2">
                  <label className="text-xs font-bold text-slate-600">Prepared By <span className="text-red-500">*</span></label>
                  <Input value={form.preparedBy} onChange={e => handleFieldChange('preparedBy', e.target.value)} className="h-8 text-sm" placeholder="Name" />
                  <Input type="date" value={form.preparedDate} onChange={e => handleFieldChange('preparedDate', e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="bg-slate-50 border rounded-lg p-3 space-y-2">
                  <label className="text-xs font-bold text-slate-600">Handed Over By</label>
                  <Input value={form.handedOverBy} onChange={e => handleFieldChange('handedOverBy', e.target.value)} className="h-8 text-sm" placeholder="Name" />
                  <Input type="date" value={form.handedOverDate} onChange={e => handleFieldChange('handedOverDate', e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-2">
                  <label className="text-xs font-bold text-emerald-700">Received By (Agent) <span className="text-red-500">*</span></label>
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

  const totalCash = notes.reduce((sum, n) => sum + (n.totalAmount || 0), 0);
  const pendingCount = notes.filter(n => n.status === 'pending').length;
  const completedCount = notes.filter(n => n.status === 'completed').length;

  return (
    <div className="space-y-6">
      {/* Header */}
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
        <Button onClick={() => { setForm(emptyForm()); setView('form'); }}>
          <Plus className="h-4 w-4 mr-2" /> New Note
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-slate-500">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-100">
              <FileText className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{notes.length}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Total Notes</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-400">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-600">{pendingCount}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Pending</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-400">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-600">{completedCount}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Completed</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50">
              <Banknote className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-700">{formatCurrency(totalCash)}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Total Cash</div>
            </div>
          </CardContent>
        </Card>
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
          {filtered.map(n => {
            const borderColor = n.status === 'completed' ? 'border-l-emerald-500' : n.status === 'cancelled' ? 'border-l-red-500' : 'border-l-amber-400';
            return (
              <Card key={n.id} className={`hover:shadow-md transition-shadow border-l-4 ${borderColor}`}>
                <CardContent className="p-4 space-y-3">
                  {/* Top: Ref + Status */}
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-sm font-mono">{n.referenceNumber}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <CalendarDays className="h-3 w-3" /> {n.date}
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      n.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                      n.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {n.status.toUpperCase()}
                    </span>
                  </div>

                  {/* Amount */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex justify-between items-center">
                    <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Cash Amount</span>
                    <span className="text-lg font-extrabold text-emerald-700">{formatCurrency(n.totalAmount)}</span>
                  </div>

                  {/* Signatory Flow */}
                  <div className="flex items-center gap-1 text-[11px] text-slate-500">
                    <div className="flex-1 bg-slate-50 rounded px-2 py-1 text-center truncate">
                      <span className="font-semibold text-slate-700">{n.preparedBy || '—'}</span>
                    </div>
                    <ChevronRight className="h-3 w-3 text-slate-300 flex-shrink-0" />
                    <div className="flex-1 bg-slate-50 rounded px-2 py-1 text-center truncate">
                      <span className="font-semibold text-slate-700">{n.handedOverBy || '—'}</span>
                    </div>
                    <ChevronRight className="h-3 w-3 text-slate-300 flex-shrink-0" />
                    <div className="flex-1 bg-emerald-50 rounded px-2 py-1 text-center truncate border border-emerald-200">
                      <span className="font-semibold text-emerald-700">{n.receivedBy || '—'}</span>
                    </div>
                  </div>

                  {/* Actions */}
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
                    <Button size="sm" variant="outline" onClick={() => handleDelete(n.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
