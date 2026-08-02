import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, CreditCard, Download, Printer, Eye, Plus, Minus, Trash2, Save, Share2, ArrowLeft } from "lucide-react";
import {
  getSavedSupplierPaymentVouchers,
  deleteSupplierPaymentVoucher,
  saveSupplierPaymentVoucher,
  generateVoucherNumber,
  SavedSupplierPaymentVoucher,
  SupplierPaymentVoucherData,
  LinkedReference,
  PaymentBreakdownEntry
} from "@/utils/supplierPaymentVoucherUtils";
import { getSupplierBalance, getUniqueSuppliers } from "@/utils/supplierLedgerUtils";
import { formatCurrency } from "@/lib/currency";
import { PrintUtils } from "@/utils/printUtils";
import { toast } from "@/components/ui/use-toast";

interface SupplierPaymentVoucherSectionProps {
  onBack: () => void;
  onLogout: () => void;
  username: string;
}

const PAYMENT_METHODS = ["Cash", "Bank Transfer", "Cheque", "Mobile Money", "Other"];

const emptyForm = (): SupplierPaymentVoucherData => ({
  voucherNumber: generateVoucherNumber(),
  date: new Date().toISOString().split('T')[0],
  supplierId: '',
  supplierName: '',
  supplierPhone: '',
  supplierEmail: '',
  supplierAddress: '',
  supplierTin: '',
  businessName: 'KILANGO GROUP LTD',
  businessAddress: '64, Muheza - Tanga - Tanzania',
  businessPhone: '0711 299 266',
  businessTin: '172 - 813 - 364',
  linkageMode: 'lump_sum',
  linkedReferences: [],
  paymentBreakdown: [{ method: 'Cash', amount: 0, reference: '' }],
  totalAmount: 0,
  previousBalance: 0,
  newBalance: 0,
  notes: '',
  preparedBy: '',
  preparedDate: new Date().toISOString().split('T')[0],
  receivedBy: '',
  receivedDate: new Date().toISOString().split('T')[0],
  approvedBy: '',
  approvedDate: new Date().toISOString().split('T')[0],
  status: 'completed'
});

export const SupplierPaymentVoucherSection = ({ onBack, onLogout, username }: SupplierPaymentVoucherSectionProps) => {
  // View state
  const [view, setView] = useState<'list' | 'form' | 'detail'>('list');

  // List state
  const [vouchers, setVouchers] = useState<SavedSupplierPaymentVoucher[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedVoucher, setSelectedVoucher] = useState<SavedSupplierPaymentVoucher | null>(null);

  // Form state
  const [form, setForm] = useState<SupplierPaymentVoucherData>(emptyForm());
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([]);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierBalance, setSupplierBalance] = useState(0);
  const [saving, setSaving] = useState(false);

  // Load suppliers from Supplier Ledger only
  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        const ledgerSuppliers = await getUniqueSuppliers();
        setSuppliers(ledgerSuppliers);
      } catch (e) {
        console.error('Error loading suppliers from ledger:', e);
      }
    };
    loadSuppliers();
  }, []);

  // Load vouchers
  const loadVouchers = async () => {
    try {
      setLoading(true);
      const data = await getSavedSupplierPaymentVouchers();
      setVouchers(data);
    } catch (e) {
      console.error('Error loading vouchers:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadVouchers(); }, []);

  // Fetch supplier balance when supplier changes
  useEffect(() => {
    if (form.supplierId) {
      getSupplierBalance(form.supplierId).then(bal => {
        setSupplierBalance(bal);
        setForm(prev => ({ ...prev, previousBalance: bal, newBalance: bal - prev.totalAmount }));
      });
    }
  }, [form.supplierId]);

  // Recalculate new balance when total changes
  useEffect(() => {
    setForm(prev => ({ ...prev, newBalance: prev.previousBalance - prev.totalAmount }));
  }, [form.totalAmount]);

  // Recalculate total from payment breakdown
  useEffect(() => {
    const total = form.paymentBreakdown.reduce((sum, p) => sum + (p.amount || 0), 0);
    setForm(prev => ({ ...prev, totalAmount: total, newBalance: prev.previousBalance - total }));
  }, [form.paymentBreakdown]);

  // Filtered vouchers
  const filtered = vouchers.filter(v =>
    v.voucherNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.supplierName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filtered suppliers
  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(supplierSearch.toLowerCase())
  );

  // ── Form handlers ──────────────────────────────────────────────────────────

  const handleFieldChange = (field: keyof SupplierPaymentVoucherData, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSelectSupplier = (supplier: { id: string; name: string }) => {
    setSupplierSearch(supplier.name);
    setForm(prev => ({
      ...prev,
      supplierId: supplier.id,
      supplierName: supplier.name,
    }));
  };

  const handleAddPaymentRow = () => {
    setForm(prev => ({
      ...prev,
      paymentBreakdown: [...prev.paymentBreakdown, { method: 'Cash', amount: 0, reference: '' }]
    }));
  };

  const handleRemovePaymentRow = (index: number) => {
    setForm(prev => ({
      ...prev,
      paymentBreakdown: prev.paymentBreakdown.filter((_, i) => i !== index)
    }));
  };

  const handlePaymentRowChange = (index: number, field: keyof PaymentBreakdownEntry, value: any) => {
    setForm(prev => {
      const updated = [...prev.paymentBreakdown];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, paymentBreakdown: updated };
    });
  };

  const handleAddLinkedRef = () => {
    setForm(prev => ({
      ...prev,
      linkedReferences: [...prev.linkedReferences, { type: 'spn', id: '', number: '', amount: 0 }]
    }));
  };

  const handleRemoveLinkedRef = (index: number) => {
    setForm(prev => ({
      ...prev,
      linkedReferences: prev.linkedReferences.filter((_, i) => i !== index)
    }));
  };

  const handleLinkedRefChange = (index: number, field: keyof LinkedReference, value: any) => {
    setForm(prev => {
      const updated = [...prev.linkedReferences];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, linkedReferences: updated };
    });
  };

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    // Validation
    if (!form.supplierName) {
      toast({ title: 'Validation', description: 'Supplier name is required', variant: 'destructive' });
      return;
    }
    if (form.totalAmount <= 0) {
      toast({ title: 'Validation', description: 'Total payment amount must be greater than zero', variant: 'destructive' });
      return;
    }
    if (!form.preparedBy) {
      toast({ title: 'Validation', description: 'Prepared By is required', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const result = await saveSupplierPaymentVoucher(form);
      if (result.success) {
        toast({ title: 'Success', description: 'Supplier Payment Voucher saved successfully' });
        setForm(emptyForm());
        setSupplierSearch('');
        setSupplierBalance(0);
        setView('list');
        loadVouchers();
      } else {
        toast({ title: 'Error', description: result.error || 'Failed to save voucher', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to save voucher', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ── Detail actions ─────────────────────────────────────────────────────────

  const handlePrint = (v: SavedSupplierPaymentVoucher) => {
    PrintUtils.printSupplierPaymentVoucher(v);
  };

  const handleShare = (v: SavedSupplierPaymentVoucher) => {
    const lines = [
      `SUPPLIER PAYMENT VOUCHER`,
      `Voucher #: ${v.voucherNumber}`,
      `Date: ${v.date}`,
      ``,
      `Supplier: ${v.supplierName}`,
      `Phone: ${v.supplierPhone || 'N/A'}`,
      ``,
      `Previous Balance: ${formatCurrency(v.previousBalance)}`,
      `Amount Paid: ${formatCurrency(v.totalAmount)}`,
      `New Balance: ${formatCurrency(v.newBalance)}`,
      ``,
      `Payment Breakdown:`,
      ...v.paymentBreakdown.map(p => `  ${p.method}: ${formatCurrency(p.amount)}${p.reference ? ' (Ref: ' + p.reference + ')' : ''}`),
      ``,
      v.linkageMode === 'linked' && v.linkedReferences.length > 0 ? `Linked References:` : '',
      ...(v.linkageMode === 'linked' ? v.linkedReferences.map(r => `  ${r.type.toUpperCase()} #${r.number}: ${formatCurrency(r.amount)}`) : []),
      ``,
      `Prepared By: ${v.preparedBy || 'N/A'}`,
      `Received By: ${v.receivedBy || 'N/A'}`,
      `Approved By: ${v.approvedBy || 'N/A'}`,
      v.notes ? `\nNotes: ${v.notes}` : ''
    ].filter(Boolean);

    const text = lines.join('\n');

    if (navigator.share) {
      navigator.share({ title: `Payment Voucher ${v.voucherNumber}`, text });
    } else {
      navigator.clipboard.writeText(text);
      toast({ title: 'Copied', description: 'Voucher details copied to clipboard' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this voucher?')) return;
    try {
      const result = await deleteSupplierPaymentVoucher(id);
      if (result.success) {
        toast({ title: 'Deleted', description: 'Voucher deleted successfully' });
        setVouchers(prev => prev.filter(v => v.id !== id));
        if (selectedVoucher?.id === id) {
          setSelectedVoucher(null);
          setView('list');
        }
      } else {
        toast({ title: 'Error', description: result.error || 'Failed to delete', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to delete voucher', variant: 'destructive' });
    }
  };

  // ── Render: Detail View ────────────────────────────────────────────────────

  if (view === 'detail' && selectedVoucher) {
    const v = selectedVoucher;
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={() => { setSelectedVoucher(null); setView('list'); }}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Vouchers
          </Button>
          <div className="flex gap-2">
            <Button onClick={() => handlePrint(v)}><Printer className="h-4 w-4 mr-2" /> Print</Button>
            <Button variant="outline" onClick={() => handleShare(v)}><Share2 className="h-4 w-4 mr-2" /> Share</Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              <div className="text-2xl font-bold">SUPPLIER PAYMENT VOUCHER</div>
              <p className="text-sm text-muted-foreground">{v.voucherNumber}</p>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Header info */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide mb-2">Supplier Information</h3>
                <p className="text-sm"><strong>Name:</strong> {v.supplierName}</p>
                {v.supplierPhone && <p className="text-sm"><strong>Phone:</strong> {v.supplierPhone}</p>}
                {v.supplierEmail && <p className="text-sm"><strong>Email:</strong> {v.supplierEmail}</p>}
                {v.supplierAddress && <p className="text-sm"><strong>Address:</strong> {v.supplierAddress}</p>}
                {v.supplierTin && <p className="text-sm"><strong>TIN:</strong> {v.supplierTin}</p>}
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide mb-2">Business Information</h3>
                <p className="text-sm"><strong>Name:</strong> {v.businessName}</p>
                {v.businessAddress && <p className="text-sm"><strong>Address:</strong> {v.businessAddress}</p>}
                {v.businessPhone && <p className="text-sm"><strong>Phone:</strong> {v.businessPhone}</p>}
                {v.businessTin && <p className="text-sm"><strong>TIN:</strong> {v.businessTin}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="border rounded p-3">
                <div className="text-xs font-bold uppercase text-muted-foreground">Previous Balance</div>
                <div className="text-lg font-bold text-red-600">{formatCurrency(v.previousBalance)}</div>
              </div>
              <div className="border rounded p-3">
                <div className="text-xs font-bold uppercase text-muted-foreground">Amount Paid</div>
                <div className="text-lg font-bold text-green-600">{formatCurrency(v.totalAmount)}</div>
              </div>
            </div>
            <div className="border rounded p-3 bg-gray-50">
              <div className="text-xs font-bold uppercase text-muted-foreground">New Balance</div>
              <div className={`text-xl font-bold ${v.newBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(v.newBalance)}
              </div>
            </div>

            {/* Payment Breakdown */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide mb-2">Payment Breakdown</h3>
              <table className="w-full text-sm border">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left p-2 border">Method</th>
                    <th className="text-right p-2 border">Amount</th>
                    <th className="text-left p-2 border">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {v.paymentBreakdown.map((p, i) => (
                    <tr key={i}>
                      <td className="p-2 border">{p.method}</td>
                      <td className="p-2 border text-right">{formatCurrency(p.amount)}</td>
                      <td className="p-2 border">{p.reference || '-'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-bold bg-gray-50">
                    <td className="p-2 border">Total</td>
                    <td className="p-2 border text-right">{formatCurrency(v.totalAmount)}</td>
                    <td className="p-2 border"></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Linked References */}
            {v.linkageMode === 'linked' && v.linkedReferences.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide mb-2">Linked References</h3>
                <table className="w-full text-sm border">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="text-left p-2 border">Type</th>
                      <th className="text-left p-2 border">Number</th>
                      <th className="text-right p-2 border">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {v.linkedReferences.map((r, i) => (
                      <tr key={i}>
                        <td className="p-2 border uppercase">{r.type}</td>
                        <td className="p-2 border">{r.number}</td>
                        <td className="p-2 border text-right">{formatCurrency(r.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {v.notes && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide mb-1">Notes</h3>
                <p className="text-sm whitespace-pre-line bg-gray-50 p-3 rounded border">{v.notes}</p>
              </div>
            )}

            {/* Signatories */}
            <div className="grid grid-cols-3 gap-4 border-t pt-4">
              <div>
                <div className="text-xs font-bold uppercase text-muted-foreground">Prepared By</div>
                <p className="text-sm font-medium">{v.preparedBy || '-'}</p>
                <p className="text-xs text-muted-foreground">{v.preparedDate || '-'}</p>
              </div>
              <div>
                <div className="text-xs font-bold uppercase text-muted-foreground">Received By</div>
                <p className="text-sm font-medium">{v.receivedBy || '-'}</p>
                <p className="text-xs text-muted-foreground">{v.receivedDate || '-'}</p>
              </div>
              <div>
                <div className="text-xs font-bold uppercase text-muted-foreground">Approved By</div>
                <p className="text-sm font-medium">{v.approvedBy || '-'}</p>
                <p className="text-xs text-muted-foreground">{v.approvedDate || '-'}</p>
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
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Vouchers
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Voucher'}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>New Supplier Payment Voucher</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Voucher Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold">Voucher Number</label>
                <Input value={form.voucherNumber} onChange={e => handleFieldChange('voucherNumber', e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-bold">Date <span className="text-red-500">*</span></label>
                <Input type="date" value={form.date} onChange={e => handleFieldChange('date', e.target.value)} className="mt-1" />
              </div>
            </div>

            {/* Supplier */}
            <div className="border rounded-lg p-4 space-y-3">
              <h3 className="font-bold text-sm">Supplier Information</h3>
              <div className="relative">
                <label className="text-xs font-bold">Supplier Name <span className="text-red-500">*</span></label>
                <Input
                  value={supplierSearch}
                  onChange={e => { setSupplierSearch(e.target.value); handleFieldChange('supplierName', e.target.value); }}
                  placeholder="Type to search supplier..."
                  className="mt-1"
                />
                {supplierSearch && filteredSuppliers.length > 0 && form.supplierName !== filteredSuppliers.find(s => s.name === supplierSearch)?.name && (
                  <div className="absolute z-10 w-full bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto mt-1">
                    {filteredSuppliers.map(s => (
                      <div key={s.id} className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm" onClick={() => handleSelectSupplier(s)}>
                        {s.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold">Phone</label>
                  <Input value={form.supplierPhone} onChange={e => handleFieldChange('supplierPhone', e.target.value)} className="mt-1" readOnly />
                </div>
                <div>
                  <label className="text-xs font-bold">TIN</label>
                  <Input value={form.supplierTin} onChange={e => handleFieldChange('supplierTin', e.target.value)} className="mt-1" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold">Address</label>
                <Input value={form.supplierAddress} onChange={e => handleFieldChange('supplierAddress', e.target.value)} className="mt-1" readOnly />
              </div>
            </div>

            {/* Outstanding Balance */}
            {form.supplierName && (
              <div className="border rounded-lg p-4 bg-amber-50 border-amber-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold">Outstanding Balance (from Ledger):</span>
                  <span className={`text-lg font-bold ${supplierBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(supplierBalance)}
                  </span>
                </div>
              </div>
            )}

            {/* Linkage Mode */}
            <div className="border rounded-lg p-4 space-y-3">
              <h3 className="font-bold text-sm">Linkage Mode</h3>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="linkageMode" value="lump_sum" checked={form.linkageMode === 'lump_sum'} onChange={() => handleFieldChange('linkageMode', 'lump_sum')} />
                  <span className="text-sm">Lump Sum Payment</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="linkageMode" value="linked" checked={form.linkageMode === 'linked'} onChange={() => handleFieldChange('linkageMode', 'linked')} />
                  <span className="text-sm">Link to Specific SPNs/GRNs</span>
                </label>
              </div>

              {form.linkageMode === 'linked' && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold">Linked References</label>
                    <Button type="button" variant="outline" size="sm" onClick={handleAddLinkedRef}>
                      <Plus className="h-3 w-3 mr-1" /> Add
                    </Button>
                  </div>
                  {form.linkedReferences.map((ref, i) => (
                    <div key={i} className="flex gap-2 items-end">
                      <div className="w-24">
                        <Select value={ref.type} onValueChange={v => handleLinkedRefChange(i, 'type', v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="spn">SPN</SelectItem>
                            <SelectItem value="grn">GRN</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1">
                        <Input placeholder="Reference #" value={ref.number} onChange={e => handleLinkedRefChange(i, 'number', e.target.value)} className="h-8 text-xs" />
                      </div>
                      <div className="w-32">
                        <Input type="number" step="0.01" placeholder="Amount" value={ref.amount || ''} onChange={e => handleLinkedRefChange(i, 'amount', parseFloat(e.target.value) || 0)} className="h-8 text-xs" />
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveLinkedRef(i)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payment Breakdown */}
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-sm">Payment Breakdown <span className="text-red-500">*</span></h3>
                <Button type="button" variant="outline" size="sm" onClick={handleAddPaymentRow}>
                  <Plus className="h-3 w-3 mr-1" /> Add Method
                </Button>
              </div>
              {form.paymentBreakdown.map((p, i) => (
                <div key={i} className="flex gap-2 items-end">
                  <div className="w-40">
                    <Select value={p.method} onValueChange={v => handlePaymentRowChange(i, 'method', v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Input type="number" step="0.01" placeholder="Amount" value={p.amount || ''} onChange={e => handlePaymentRowChange(i, 'amount', parseFloat(e.target.value) || 0)} className="h-8 text-xs" />
                  </div>
                  <div className="flex-1">
                    <Input placeholder="Reference / Cheque #" value={p.reference} onChange={e => handlePaymentRowChange(i, 'reference', e.target.value)} className="h-8 text-xs" />
                  </div>
                  {form.paymentBreakdown.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => handleRemovePaymentRow(i)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
              <div className="flex justify-end">
                <div className="text-sm font-bold">Total: {formatCurrency(form.totalAmount)}</div>
              </div>
            </div>

            {/* Balance Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="border rounded p-3">
                <div className="text-xs font-bold uppercase text-muted-foreground">Previous Balance</div>
                <div className="text-lg font-bold text-red-600">{formatCurrency(form.previousBalance)}</div>
              </div>
              <div className="border rounded p-3">
                <div className="text-xs font-bold uppercase text-muted-foreground">Amount Paid</div>
                <div className="text-lg font-bold text-green-600">{formatCurrency(form.totalAmount)}</div>
              </div>
              <div className="border rounded p-3 bg-gray-50">
                <div className="text-xs font-bold uppercase text-muted-foreground">New Balance</div>
                <div className={`text-lg font-bold ${form.newBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(form.newBalance)}
                </div>
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
            <div className="grid grid-cols-3 gap-4 border-t pt-4">
              <div className="space-y-2">
                <label className="text-xs font-bold">Prepared By <span className="text-red-500">*</span></label>
                <Input value={form.preparedBy} onChange={e => handleFieldChange('preparedBy', e.target.value)} className="h-8 text-sm" />
                <Input type="date" value={form.preparedDate} onChange={e => handleFieldChange('preparedDate', e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold">Received By <span className="text-red-500">*</span></label>
                <Input value={form.receivedBy} onChange={e => handleFieldChange('receivedBy', e.target.value)} className="h-8 text-sm" placeholder="Supplier / agent name" />
                <Input type="date" value={form.receivedDate} onChange={e => handleFieldChange('receivedDate', e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold">Approved By</label>
                <Input value={form.approvedBy} onChange={e => handleFieldChange('approvedBy', e.target.value)} className="h-8 text-sm" />
                <Input type="date" value={form.approvedDate} onChange={e => handleFieldChange('approvedDate', e.target.value)} className="h-8 text-sm" />
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
            <CreditCard className="h-8 w-8 text-primary" />
            Supplier Payment Vouchers
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Record when a supplier collects payment for credited transactions
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { setForm(emptyForm()); setSupplierSearch(''); setSupplierBalance(0); setView('form'); }}>
            <Plus className="h-4 w-4 mr-2" /> New Voucher
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by voucher # or supplier..."
          className="pl-10"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p>Loading vouchers...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <CreditCard className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Payment Vouchers</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm ? "No vouchers match your search." : "You haven't created any payment vouchers yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(v => (
            <Card key={v.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-sm">{v.voucherNumber}</div>
                    <div className="text-xs text-muted-foreground">{v.date}</div>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${v.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {v.status.toUpperCase()}
                  </span>
                </div>

                <div>
                  <div className="text-sm font-medium">{v.supplierName}</div>
                  {v.supplierPhone && <div className="text-xs text-muted-foreground">{v.supplierPhone}</div>}
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount Paid:</span>
                  <span className="font-bold text-green-600">{formatCurrency(v.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">New Balance:</span>
                  <span className={`font-bold ${v.newBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(v.newBalance)}
                  </span>
                </div>

                <div className="flex gap-1 pt-2 border-t">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => { setSelectedVoucher(v); setView('detail'); }}>
                    <Eye className="h-3 w-3 mr-1" /> View
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handlePrint(v)}>
                    <Printer className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleShare(v)}>
                    <Share2 className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDelete(v.id)}>
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
