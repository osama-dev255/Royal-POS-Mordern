import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  Package, Printer, Eye, Plus, Save, Share2, ArrowLeft, Trash2, FileText, Users,
  StickyNote, Clock, CheckCircle2, AlertCircle, AlertTriangle, ShieldCheck, Search,
  CalendarDays, ChevronDown, Check, Loader2, Building2
} from "lucide-react";
import {
  getSavedInternalConsumptionNotes,
  deleteInternalConsumptionNote,
  saveInternalConsumptionNote,
  approveInternalConsumptionNote,
  rejectInternalConsumptionNote,
  generateNoteNumber,
  getReasonLabel,
  getPersonTypeLabel,
  InternalConsumptionNoteData,
  InternalConsumptionItem,
  SavedInternalConsumptionNote
} from "@/utils/internalConsumptionUtils";
import { getProducts, Product } from "@/services/databaseService";
import { getGodowns, getZones, getGodownStock, Godown, GodownZone, GodownStock } from "@/services/godownService";
import { formatCurrency } from "@/lib/currency";
import { PrintUtils } from "@/utils/printUtils";
import { toast } from "@/components/ui/use-toast";

interface InternalConsumptionSectionProps {
  onBack: () => void;
  onLogout: () => void;
  username: string;
}

const emptyItem = (): InternalConsumptionItem => ({
  productId: '',
  productName: '',
  quantity: 1,
  unit: 'piece',
  costPrice: 0,
  total: 0,
  godownId: '',
  godownName: '',
  zoneId: '',
  zoneName: ''
});

const emptyForm = (): InternalConsumptionNoteData => ({
  noteNumber: generateNoteNumber(),
  date: new Date().toISOString().split('T')[0],
  takenBy: '',
  personType: 'employee',
  department: '',
  reason: 'consumption',
  items: [emptyItem()],
  totalAmount: 0,
  notes: '',
  damageDescription: '',
  damageDate: new Date().toISOString().split('T')[0],
  recoverable: false,
  disposalMethod: '',
  preparedBy: '',
  preparedDate: new Date().toISOString().split('T')[0],
  status: 'pending'
});

export const InternalConsumptionSection = ({ onBack, onLogout, username }: InternalConsumptionSectionProps) => {
  // View state
  const [view, setView] = useState<'list' | 'form' | 'detail'>('list');

  // List state
  const [notes, setNotes] = useState<SavedInternalConsumptionNote[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState<SavedInternalConsumptionNote | null>(null);

  // Form state
  const [form, setForm] = useState<InternalConsumptionNoteData>(emptyForm());
  const [saving, setSaving] = useState(false);

  // Product data
  const [products, setProducts] = useState<Product[]>([]);
  const [productOpen, setProductOpen] = useState<Record<number, boolean>>({});

  // Godown & Zone data
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [zones, setZones] = useState<GodownZone[]>([]);
  const [godownOpen, setGodownOpen] = useState<Record<number, boolean>>({});
  const [zoneOpen, setZoneOpen] = useState<Record<number, boolean>>({});

  // Available stock per item row (filtered by godown/zone)
  const [availableStock, setAvailableStock] = useState<Record<number, GodownStock[]>>({});

  // Approval dialog
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [approvalName, setApprovalName] = useState('');
  const [rejectionName, setRejectionName] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvingNote, setApprovingNote] = useState<SavedInternalConsumptionNote | null>(null);

  // Load notes
  const loadNotes = async () => {
    try {
      setLoading(true);
      const data = await getSavedInternalConsumptionNotes();
      setNotes(data);
    } catch (e) {
      console.error('Error loading internal consumption notes:', e);
    } finally {
      setLoading(false);
    }
  };

  // Load products
  const loadProducts = async () => {
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (e) {
      console.error('Error loading products:', e);
    }
  };

  // Load godowns
  const loadGodowns = async () => {
    try {
      const data = await getGodowns();
      setGodowns(data.filter(g => g.status === 'active'));
    } catch (e) {
      console.error('Error loading godowns:', e);
    }
  };

  // Load zones for a godown
  const loadZones = async (godownId: string) => {
    try {
      const data = await getZones(godownId);
      setZones(data.filter(z => z.status === 'active'));
    } catch (e) {
      console.error('Error loading zones:', e);
    }
  };

  // Load available stock for a godown (optionally filtered by zone)
  const loadAvailableStock = async (godownId: string, zoneId?: string) => {
    try {
      const stock = await getGodownStock(undefined, godownId);
      // Filter by zone if specified, and only show items with available quantity
      const filtered = stock.filter(s => {
        if (s.available_quantity !== undefined && s.available_quantity <= 0) return false;
        if (zoneId && s.zone_id !== zoneId) return false;
        return true;
      });
      return filtered;
    } catch (e) {
      console.error('Error loading available stock:', e);
      return [];
    }
  };

  useEffect(() => { loadNotes(); loadProducts(); loadGodowns(); }, []);

  // Filtered notes
  const filtered = notes.filter(n =>
    n.noteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.takenBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getReasonLabel(n.reason).toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ── Form handlers ──────────────────────────────────────────────────────────

  const handleFieldChange = (field: keyof InternalConsumptionNoteData, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (index: number, field: keyof InternalConsumptionItem, value: any) => {
    setForm(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };

      // Auto-calculate total when qty or costPrice changes
      if (field === 'quantity' || field === 'costPrice') {
        newItems[index].total = newItems[index].quantity * newItems[index].costPrice;
      }

      // Auto-fill unit and costPrice when product is selected
      if (field === 'productName') {
        const product = products.find(p => p.name === value);
        if (product) {
          newItems[index].productId = product.id || '';
          newItems[index].unit = product.unit_of_measure || 'piece';
          newItems[index].costPrice = product.cost_price || 0;
          newItems[index].total = newItems[index].quantity * (product.cost_price || 0);
        }
      }

      // Recalculate total amount
      const totalAmount = newItems.reduce((sum, item) => sum + (item.total || 0), 0);
      return { ...prev, items: newItems, totalAmount };
    });
  };

  const addItem = () => {
    setForm(prev => ({ ...prev, items: [...prev.items, emptyItem()] }));
  };

  const removeItem = (index: number) => {
    if (form.items.length <= 1) return;
    setForm(prev => {
      const newItems = prev.items.filter((_, i) => i !== index);
      const totalAmount = newItems.reduce((sum, item) => sum + (item.total || 0), 0);
      return { ...prev, items: newItems, totalAmount };
    });
  };

  const toggleProductOpen = (index: number) => {
    setProductOpen(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const toggleGodownOpen = (index: number) => {
    setGodownOpen(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const toggleZoneOpen = (index: number) => {
    setZoneOpen(prev => ({ ...prev, [index]: !prev[index] }));
  };

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    // Validation
    if (!form.takenBy) {
      toast({ title: 'Validation', description: 'Taken By is required', variant: 'destructive' });
      return;
    }
    if (!form.items.length || form.items.every(i => !i.productName)) {
      toast({ title: 'Validation', description: 'At least one item is required', variant: 'destructive' });
      return;
    }
    // Validate godown and zone for each item
    for (let i = 0; i < form.items.length; i++) {
      const item = form.items[i];
      if (item.productName && !item.godownName) {
        toast({ title: 'Validation', description: `Godown is required for item ${i + 1}`, variant: 'destructive' });
        return;
      }
      if (item.godownName && !item.zoneName) {
        toast({ title: 'Validation', description: `Zone is required for item ${i + 1}`, variant: 'destructive' });
        return;
      }
    }
    if (form.reason === 'damage' && !form.damageDescription) {
      toast({ title: 'Validation', description: 'Damage description is required when reason is Damage/Loss', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const result = await saveInternalConsumptionNote(form);
      if (result.success) {
        toast({ title: 'Success', description: 'Internal Consumption Note saved successfully' });
        setForm(emptyForm());
        setView('list');
        loadNotes();
      } else {
        toast({ title: 'Error', description: result.error || 'Failed to save note', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to save internal consumption note', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ── Approve / Reject ───────────────────────────────────────────────────────

  const handleApprove = async () => {
    if (!approvingNote) return;
    if (!approvalName) {
      toast({ title: 'Validation', description: 'Approver name is required', variant: 'destructive' });
      return;
    }
    try {
      const result = await approveInternalConsumptionNote(approvingNote.id, approvalName);
      if (result.success) {
        toast({ title: 'Approved', description: 'Note approved and stock deducted successfully' });
        setShowApproveDialog(false);
        setApprovalName('');
        setApprovingNote(null);
        loadNotes();
        if (selectedNote?.id === approvingNote.id) {
          const updated = await getSavedInternalConsumptionNotes();
          const found = updated.find(n => n.id === approvingNote!.id);
          if (found) setSelectedNote(found);
        }
      } else {
        toast({ title: 'Error', description: result.error || 'Failed to approve', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to approve note', variant: 'destructive' });
    }
  };

  const handleReject = async () => {
    if (!approvingNote) return;
    if (!rejectionName) {
      toast({ title: 'Validation', description: 'Rejector name is required', variant: 'destructive' });
      return;
    }
    try {
      const result = await rejectInternalConsumptionNote(approvingNote.id, rejectionName, rejectionReason);
      if (result.success) {
        toast({ title: 'Rejected', description: 'Note has been rejected' });
        setShowRejectDialog(false);
        setRejectionName('');
        setRejectionReason('');
        setApprovingNote(null);
        loadNotes();
      } else {
        toast({ title: 'Error', description: result.error || 'Failed to reject', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to reject note', variant: 'destructive' });
    }
  };

  // ── Detail actions ─────────────────────────────────────────────────────────

  const handlePrint = (n: SavedInternalConsumptionNote) => {
    PrintUtils.printInternalConsumptionNote(n);
  };

  const handleShare = (n: SavedInternalConsumptionNote) => {
    const lines = [
      `INTERNAL CONSUMPTION NOTE`,
      `Note #: ${n.noteNumber}`,
      `Date: ${n.date}`,
      ``,
      `Taken By: ${n.takenBy}`,
      `Person Type: ${getPersonTypeLabel(n.personType)}`,
      n.department ? `Department: ${n.department}` : '',
      `Reason: ${getReasonLabel(n.reason)}`,
      ``,
      `Items:`,
      ...n.items.map((item, i) => `  ${i + 1}. ${item.productName} x${item.quantity} ${item.unit} — ${formatCurrency(item.total)}`),
      ``,
      `Total Value: ${formatCurrency(n.totalAmount)}`,
      ``,
      n.reason === 'damage' ? `Damage Description: ${n.damageDescription}` : '',
      n.reason === 'damage' && n.disposalMethod ? `Disposal Method: ${n.disposalMethod}` : '',
      ``,
      `Prepared By: ${n.preparedBy || 'N/A'}`,
      n.approvedBy ? `Approved By: ${n.approvedBy}` : '',
      ``,
      `Status: ${n.status.toUpperCase()}`,
      n.notes ? `\nNotes: ${n.notes}` : ''
    ].filter(Boolean);

    const text = lines.join('\n');

    if (navigator.share) {
      navigator.share({ title: `Internal Consumption ${n.noteNumber}`, text });
    } else {
      navigator.clipboard.writeText(text);
      toast({ title: 'Copied', description: 'Note details copied to clipboard' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this internal consumption note?')) return;
    try {
      const result = await deleteInternalConsumptionNote(id);
      if (result.success) {
        toast({ title: 'Deleted', description: 'Note deleted successfully' });
        setNotes(prev => prev.filter(n => n.id !== id));
        if (selectedNote?.id === id) {
          setSelectedNote(null);
          setView('list');
        }
      } else {
        toast({ title: 'Error', description: result.error || 'Failed to delete', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to delete note', variant: 'destructive' });
    }
  };

  // ── Render: Detail View ────────────────────────────────────────────────────

  if (view === 'detail' && selectedNote) {
    const n = selectedNote;
    const statusConfig = {
      approved: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: CheckCircle2 },
      rejected: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: AlertCircle },
      pending:  { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: Clock },
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
              <>
                <Button variant="outline" className="text-emerald-600 border-emerald-300 hover:bg-emerald-50" onClick={() => { setApprovingNote(n); setShowApproveDialog(true); }}>
                  <ShieldCheck className="h-4 w-4 mr-2" /> Approve & Deduct Stock
                </Button>
                <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" onClick={() => { setApprovingNote(n); setShowRejectDialog(true); }}>
                  <AlertCircle className="h-4 w-4 mr-2" /> Reject
                </Button>
              </>
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
                <h2 className="text-lg font-bold tracking-wide">INTERNAL CONSUMPTION NOTE</h2>
                <p className="text-slate-300 text-sm mt-1">{n.noteNumber}</p>
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border}`}>
                <StatusIcon className="h-3.5 w-3.5" />
                {n.status.toUpperCase()}
              </div>
            </div>
          </div>

          <CardContent className="p-6 space-y-6">
            {/* Total Value & Date */}
            <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-6 py-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-amber-600">Total Value</div>
                <div className="text-3xl font-extrabold text-amber-700 mt-1">{formatCurrency(n.totalAmount)}</div>
              </div>
              <div className="text-right">
                <div className="text-xs font-semibold uppercase tracking-wider text-amber-600">Date</div>
                <div className="text-sm font-medium text-slate-700 mt-1 flex items-center gap-1.5 justify-end">
                  <CalendarDays className="h-4 w-4 text-amber-600" />
                  {n.date}
                </div>
              </div>
            </div>

            {/* Person Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                <Users className="h-3.5 w-3.5" /> Person Information
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 rounded-lg p-4 border">
                <div>
                  <div className="text-[10px] font-semibold uppercase text-slate-400">Taken By</div>
                  <div className="text-sm font-medium mt-0.5">{n.takenBy || '—'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase text-slate-400">Person Type</div>
                  <div className="text-sm font-medium mt-0.5">{getPersonTypeLabel(n.personType)}</div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase text-slate-400">Department</div>
                  <div className="text-sm font-medium mt-0.5">{n.department || '—'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase text-slate-400">Reason</div>
                  <div className="text-sm font-medium mt-0.5">{getReasonLabel(n.reason)}</div>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                <Package className="h-3.5 w-3.5" /> Items Taken
              </div>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-left px-3 py-2 text-[10px] font-bold uppercase text-slate-500">#</th>
                      <th className="text-left px-3 py-2 text-[10px] font-bold uppercase text-slate-500">Product</th>
                      <th className="text-left px-3 py-2 text-[10px] font-bold uppercase text-slate-500">Godown</th>
                      <th className="text-left px-3 py-2 text-[10px] font-bold uppercase text-slate-500">Zone</th>
                      <th className="text-right px-3 py-2 text-[10px] font-bold uppercase text-slate-500">Qty</th>
                      <th className="text-left px-3 py-2 text-[10px] font-bold uppercase text-slate-500">Unit</th>
                      <th className="text-right px-3 py-2 text-[10px] font-bold uppercase text-slate-500">Cost Price</th>
                      <th className="text-right px-3 py-2 text-[10px] font-bold uppercase text-slate-500">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {n.items.map((item: any, i: number) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                        <td className="px-3 py-2 font-medium">{item.productName}</td>
                        <td className="px-3 py-2">{item.godownName || '—'}</td>
                        <td className="px-3 py-2">{item.zoneName || '—'}</td>
                        <td className="px-3 py-2 text-right">{item.quantity}</td>
                        <td className="px-3 py-2">{item.unit}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(item.costPrice)}</td>
                        <td className="px-3 py-2 text-right font-semibold">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50">
                    <tr>
                      <td colSpan={7} className="px-3 py-2 text-right font-bold text-slate-600">TOTAL</td>
                      <td className="px-3 py-2 text-right font-extrabold text-amber-700">{formatCurrency(n.totalAmount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Damage Details */}
            {n.reason === 'damage' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-500">
                  <AlertTriangle className="h-3.5 w-3.5" /> Damage Details
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] font-semibold uppercase text-red-400">Description</div>
                      <div className="text-sm font-medium mt-0.5">{n.damageDescription || '—'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold uppercase text-red-400">Damage Date</div>
                      <div className="text-sm font-medium mt-0.5">{n.damageDate || '—'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold uppercase text-red-400">Recoverable</div>
                      <div className="text-sm font-medium mt-0.5">{n.recoverable ? 'Yes' : 'No'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold uppercase text-red-400">Disposal Method</div>
                      <div className="text-sm font-medium mt-0.5">{n.disposalMethod || '—'}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            {n.notes && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <StickyNote className="h-3.5 w-3.5" /> Notes
                </div>
                <div className="bg-slate-50 border rounded-lg p-3 text-sm whitespace-pre-line">{n.notes}</div>
              </div>
            )}

            {/* Approval Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                <ShieldCheck className="h-3.5 w-3.5" /> Approval
              </div>
              <div className="grid grid-cols-3 gap-3 bg-slate-50 rounded-lg p-4 border">
                <div>
                  <div className="text-[10px] font-semibold uppercase text-slate-400">Prepared By</div>
                  <div className="text-sm font-medium mt-0.5">{n.preparedBy || '—'}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{n.preparedDate || '—'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase text-slate-400">Approved By</div>
                  <div className="text-sm font-medium mt-0.5">{n.approvedBy || '—'}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{n.approvedDate || '—'}</div>
                </div>
                {n.status === 'rejected' && (
                  <div>
                    <div className="text-[10px] font-semibold uppercase text-red-400">Rejection Reason</div>
                    <div className="text-sm font-medium mt-0.5 text-red-600">{n.rejectionReason || '—'}</div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Render: Form View ──────────────────────────────────────────────────────

  if (view === 'form') {
    const isDamage = form.reason === 'damage';

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={() => setView('list')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Notes
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {saving ? 'Saving...' : 'Save Note'}
          </Button>
        </div>

        <Card className="overflow-hidden">
          {/* Form Header */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4 text-white">
            <h2 className="text-lg font-bold tracking-wide">NEW INTERNAL CONSUMPTION NOTE</h2>
            <p className="text-slate-300 text-xs mt-0.5">Record products taken by internal personnel for free</p>
          </div>

          <CardContent className="p-6 space-y-6">
            {/* Reference & Person Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 border-b pb-2">
                <Users className="h-4 w-4 text-slate-400" /> Person & Reference
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Note Number</label>
                  <Input value={form.noteNumber} onChange={e => handleFieldChange('noteNumber', e.target.value)} className="mt-1 font-mono" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Date <span className="text-red-500">*</span></label>
                  <Input type="date" value={form.date} onChange={e => handleFieldChange('date', e.target.value)} className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Taken By <span className="text-red-500">*</span></label>
                  <Input value={form.takenBy} onChange={e => handleFieldChange('takenBy', e.target.value)} className="mt-1" placeholder="Person name" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Person Type <span className="text-red-500">*</span></label>
                  <Select value={form.personType} onValueChange={v => handleFieldChange('personType', v)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="investor">Investor</SelectItem>
                      <SelectItem value="owner">Owner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Department</label>
                  <Input value={form.department} onChange={e => handleFieldChange('department', e.target.value)} className="mt-1" placeholder="Optional" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Reason <span className="text-red-500">*</span></label>
                  <Select value={form.reason} onValueChange={v => handleFieldChange('reason', v)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="consumption">Internal Consumption</SelectItem>
                      <SelectItem value="damage">Damage/Loss</SelectItem>
                      <SelectItem value="benefit">Employee Benefit</SelectItem>
                      <SelectItem value="owner_draw">Owner/Investor Draw</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Items Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <Package className="h-4 w-4 text-slate-400" /> Items
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-3 w-3 mr-1" /> Add Item
                </Button>
              </div>

              <div className="space-y-3">
                {form.items.map((item, index) => {
                  const rowStock = availableStock[index] || [];
                  return (
                    <div key={index} className="bg-slate-50 border rounded-lg p-3 space-y-2">
                      {/* Row 1: Godown + Zone */}
                      <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                        {/* Godown */}
                        <div className="relative">
                          <label className="text-[10px] font-semibold uppercase text-slate-400">Godown <span className="text-red-500">*</span></label>
                          <div className="mt-1">
                            <Button
                              variant="outline"
                              className="w-full justify-between text-left font-normal h-9 text-sm"
                              onClick={() => toggleGodownOpen(index)}
                            >
                              {item.godownName || "Select godown..."}
                              <ChevronDown className="ml-2 h-3 w-3 opacity-50" />
                            </Button>
                            {godownOpen[index] && (
                              <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-auto">
                                <div className="border-t">
                                  {godowns.map(g => (
                                    <div
                                      key={g.id}
                                      className={`px-3 py-2 text-sm cursor-pointer hover:bg-slate-100 ${item.godownName === g.name ? 'bg-slate-100 font-medium' : ''}`}
                                      onClick={async () => {
                                        // Set godown
                                        setForm(prev => {
                                          const newItems = [...prev.items];
                                          newItems[index] = { ...newItems[index], godownId: g.id || '', godownName: g.name, zoneId: '', zoneName: '', productId: '', productName: '', quantity: 1, unit: 'piece', costPrice: 0, total: 0 };
                                          const totalAmount = newItems.reduce((sum, it) => sum + (it.total || 0), 0);
                                          return { ...prev, items: newItems, totalAmount };
                                        });
                                        setGodownOpen(prev => ({ ...prev, [index]: false }));
                                        // Load zones and available stock for this godown
                                        await loadZones(g.id || '');
                                        const stock = await loadAvailableStock(g.id || '');
                                        setAvailableStock(prev => ({ ...prev, [index]: stock }));
                                      }}
                                    >
                                      {g.name}
                                      {g.code && <span className="text-xs text-slate-400 ml-2">({g.code})</span>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Zone */}
                        <div className="relative">
                          <label className="text-[10px] font-semibold uppercase text-slate-400">Zone <span className="text-red-500">*</span></label>
                          <div className="mt-1">
                            <Button
                              variant="outline"
                              className="w-full justify-between text-left font-normal h-9 text-sm"
                              onClick={() => toggleZoneOpen(index)}
                              disabled={!item.godownId}
                            >
                              {item.zoneName || (item.godownId ? "Select zone..." : "Select godown first")}
                              <ChevronDown className="ml-2 h-3 w-3 opacity-50" />
                            </Button>
                            {zoneOpen[index] && item.godownId && (
                              <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-auto">
                                <div className="border-t">
                                  {zones.map(z => (
                                    <div
                                      key={z.id}
                                      className={`px-3 py-2 text-sm cursor-pointer hover:bg-slate-100 ${item.zoneName === z.zone_name ? 'bg-slate-100 font-medium' : ''}`}
                                      onClick={async () => {
                                        // Set zone and filter products
                                        setForm(prev => {
                                          const newItems = [...prev.items];
                                          newItems[index] = { ...newItems[index], zoneId: z.id || '', zoneName: z.zone_name, productId: '', productName: '', quantity: 1, unit: 'piece', costPrice: 0, total: 0 };
                                          const totalAmount = newItems.reduce((sum, it) => sum + (it.total || 0), 0);
                                          return { ...prev, items: newItems, totalAmount };
                                        });
                                        setZoneOpen(prev => ({ ...prev, [index]: false }));
                                        // Filter stock to this zone
                                        const stock = await loadAvailableStock(item.godownId!, z.id || '');
                                        setAvailableStock(prev => ({ ...prev, [index]: stock }));
                                      }}
                                    >
                                      {z.zone_name}
                                      {z.zone_code && <span className="text-xs text-slate-400 ml-2">({z.zone_code})</span>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Remove button */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          disabled={form.items.length <= 1}
                          className="h-9 w-9 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Row 2: Product + Qty + Unit + Cost + Total */}
                      <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-end">
                        {/* Product (from available stock) */}
                        <div className="relative">
                          <label className="text-[10px] font-semibold uppercase text-slate-400">Product <span className="text-red-500">*</span></label>
                          <div className="mt-1">
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={productOpen[index]}
                              className="w-full justify-between text-left font-normal h-9 text-sm"
                              onClick={() => toggleProductOpen(index)}
                              disabled={!item.zoneId}
                            >
                              {item.productName || (item.zoneId ? "Select product..." : "Select zone first")}
                              <ChevronDown className="ml-2 h-3 w-3 opacity-50" />
                            </Button>
                            {productOpen[index] && item.zoneId && (
                              <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-56 overflow-auto">
                                {rowStock.length === 0 ? (
                                  <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                                    {item.zoneName ? 'No products available in this zone' : 'No products available in this godown'}
                                  </div>
                                ) : (
                                  <div className="border-t">
                                    {rowStock.map((s, si) => (
                                      <div
                                        key={si}
                                        className={`px-3 py-2 text-sm cursor-pointer hover:bg-slate-100 flex justify-between items-center ${item.productName === s.products?.name ? 'bg-slate-100 font-medium' : ''}`}
                                        onClick={() => {
                                          const product = products.find(p => p.name === s.products?.name);
                                          setForm(prev => {
                                            const newItems = [...prev.items];
                                            newItems[index] = {
                                              ...newItems[index],
                                              productId: s.product_id || '',
                                              productName: s.products?.name || '',
                                              unit: product?.unit_of_measure || 'piece',
                                              costPrice: product?.cost_price || 0,
                                              quantity: 1,
                                              total: product?.cost_price || 0
                                            };
                                            const totalAmount = newItems.reduce((sum, it) => sum + (it.total || 0), 0);
                                            return { ...prev, items: newItems, totalAmount };
                                          });
                                          setProductOpen(prev => ({ ...prev, [index]: false }));
                                        }}
                                      >
                                        <span>{s.products?.name || 'Unknown'}</span>
                                        <span className="text-xs text-emerald-600 font-medium ml-2">
                                          Stock: {s.available_quantity ?? s.quantity ?? 0}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Qty */}
                        <div>
                          <label className="text-[10px] font-semibold uppercase text-slate-400">Qty</label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={e => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                            className="mt-1 w-20 h-9 text-sm"
                          />
                        </div>

                        {/* Unit */}
                        <div>
                          <label className="text-[10px] font-semibold uppercase text-slate-400">Unit</label>
                          <Input value={item.unit} readOnly className="mt-1 w-20 h-9 text-sm bg-slate-100" />
                        </div>

                        {/* Cost Price */}
                        <div>
                          <label className="text-[10px] font-semibold uppercase text-slate-400">Cost Price</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.costPrice}
                            onChange={e => handleItemChange(index, 'costPrice', parseFloat(e.target.value) || 0)}
                            className="mt-1 w-28 h-9 text-sm"
                          />
                        </div>

                        {/* Total */}
                        <div>
                          <label className="text-[10px] font-semibold uppercase text-slate-400">Total</label>
                          <div className="mt-1 w-28 h-9 flex items-center px-3 bg-amber-50 border border-amber-200 rounded-md text-sm font-bold text-amber-700">
                            {formatCurrency(item.total)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary */}
              <div className="flex justify-end">
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-6 py-3 flex items-center gap-4">
                  <div className="text-sm text-amber-600">
                    <span className="font-semibold">{form.items.length}</span> item(s)
                  </div>
                  <div className="border-l border-amber-300 pl-4">
                    <div className="text-xs font-semibold uppercase text-amber-500">Total Value</div>
                    <div className="text-xl font-extrabold text-amber-700">{formatCurrency(form.totalAmount)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Damage Details (conditional) */}
            {isDamage && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-500 border-b pb-2">
                  <AlertTriangle className="h-4 w-4 text-red-400" /> Damage Details
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-slate-600">Damage Description <span className="text-red-500">*</span></label>
                    <textarea
                      value={form.damageDescription}
                      onChange={e => handleFieldChange('damageDescription', e.target.value)}
                      className="w-full p-3 border rounded-lg text-sm h-20 resize-none mt-1 focus:outline-none focus:ring-2 focus:ring-red-300"
                      placeholder="Describe how the damage occurred..."
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Damage Date</label>
                    <Input type="date" value={form.damageDate} onChange={e => handleFieldChange('damageDate', e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Disposal Method</label>
                    <Select value={form.disposalMethod || 'none'} onValueChange={v => handleFieldChange('disposalMethod', v === 'none' ? '' : v)}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select method" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Select method</SelectItem>
                        <SelectItem value="discarded">Discarded</SelectItem>
                        <SelectItem value="returned_supplier">Returned to Supplier</SelectItem>
                        <SelectItem value="recycled">Recycled</SelectItem>
                        <SelectItem value="donated">Donated</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="recoverable"
                    checked={form.recoverable || false}
                    onChange={e => handleFieldChange('recoverable', e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <label htmlFor="recoverable" className="text-sm font-medium text-slate-600">Recoverable (for insurance tracking)</label>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 border-b pb-2">
                <StickyNote className="h-4 w-4 text-slate-400" /> Additional Notes
              </div>
              <textarea
                value={form.notes}
                onChange={e => handleFieldChange('notes', e.target.value)}
                className="w-full p-3 border rounded-lg text-sm h-20 resize-none focus:outline-none focus:ring-2 focus:ring-slate-300"
                placeholder="Any additional notes about this consumption..."
              />
            </div>

            {/* Prepared By */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 border-b pb-2">
                <ShieldCheck className="h-4 w-4 text-slate-400" /> Prepared By
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Name</label>
                  <Input value={form.preparedBy} onChange={e => handleFieldChange('preparedBy', e.target.value)} className="mt-1" placeholder="Your name" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Date</label>
                  <Input type="date" value={form.preparedDate} onChange={e => handleFieldChange('preparedDate', e.target.value)} className="mt-1" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Render: List View (default) ────────────────────────────────────────────

  const totalValue = notes.reduce((sum, n) => sum + (n.totalAmount || 0), 0);
  const pendingCount = notes.filter(n => n.status === 'pending').length;
  const approvedCount = notes.filter(n => n.status === 'approved').length;
  const damageValue = notes.filter(n => n.reason === 'damage').reduce((sum, n) => sum + (n.totalAmount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Package className="h-8 w-8 text-primary" />
            Internal Consumption Notes
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Track products taken by internal personnel for free
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
              <div className="text-2xl font-bold text-emerald-600">{approvedCount}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Approved</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50">
              <Package className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-700">{formatCurrency(totalValue)}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Total Value</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Damage value card */}
      {damageValue > 0 && (
        <Card className="border-l-4 border-l-red-400 bg-red-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-red-700">{formatCurrency(damageValue)}</div>
              <div className="text-xs text-red-500 uppercase tracking-wider">Total Damage Value</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by note #, person, department, reason..."
          className="pl-10"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p>Loading internal consumption notes...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Internal Consumption Notes</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm ? "No notes match your search." : "You haven't created any internal consumption notes yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(n => {
            const borderColor = n.status === 'approved' ? 'border-l-emerald-500' : n.status === 'rejected' ? 'border-l-red-500' : 'border-l-amber-400';
            const reasonColor = n.reason === 'damage' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700';
            return (
              <Card key={n.id} className={`hover:shadow-md transition-shadow border-l-4 ${borderColor}`}>
                <CardContent className="p-4 space-y-3">
                  {/* Top: Note # + Status */}
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-sm font-mono">{n.noteNumber}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <CalendarDays className="h-3 w-3" /> {n.date}
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      n.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                      n.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {n.status.toUpperCase()}
                    </span>
                  </div>

                  {/* Person + Reason */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{n.takenBy}</span>
                    <span className="text-[10px] text-slate-400">({getPersonTypeLabel(n.personType)})</span>
                  </div>
                  <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${reasonColor}`}>
                    {getReasonLabel(n.reason)}
                  </span>

                  {/* Value */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex justify-between items-center">
                    <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Total Value</span>
                    <span className="text-lg font-extrabold text-amber-700">{formatCurrency(n.totalAmount)}</span>
                  </div>

                  {/* Items count */}
                  <div className="text-xs text-slate-500">
                    {n.items.length} item(s) taken
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

      {/* Approve Dialog */}
      {showApproveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" /> Approve & Deduct Stock
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              This will deduct the listed products from inventory and record stock movements.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600">Approved By (Name) <span className="text-red-500">*</span></label>
                <Input value={approvalName} onChange={e => setApprovalName(e.target.value)} className="mt-1" placeholder="Approver name" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => { setShowApproveDialog(false); setApprovingNote(null); }}>Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleApprove}>
                <CheckCircle2 className="h-4 w-4 mr-2" /> Approve
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Dialog */}
      {showRejectDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" /> Reject Note
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              This note will be rejected and stock will NOT be deducted.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600">Rejected By (Name) <span className="text-red-500">*</span></label>
                <Input value={rejectionName} onChange={e => setRejectionName(e.target.value)} className="mt-1" placeholder="Your name" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Reason for Rejection</label>
                <textarea
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  className="w-full p-3 border rounded-lg text-sm h-20 resize-none mt-1 focus:outline-none focus:ring-2 focus:ring-red-300"
                  placeholder="Why is this note being rejected?"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => { setShowRejectDialog(false); setApprovingNote(null); }}>Cancel</Button>
              <Button variant="destructive" onClick={handleReject}>
                <AlertCircle className="h-4 w-4 mr-2" /> Reject
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
