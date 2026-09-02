import { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { format as formatDate } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Truck, CalendarIcon, User, Package, Eye, Printer, Download, Share2,
  Plus, Trash2, X, ChevronDown, ChevronUp, Save, Loader2, FileText,
  ArrowLeft, BarChart3, Edit3, Check, DollarSign, CreditCard, Hash, ClipboardList,
} from "lucide-react";
import { DeliveryData } from "@/utils/deliveryUtils";
import { saveDeliveryInReport, DeliveryReportData } from "@/utils/deliveryReportUtils";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface EditableItem {
  id: string;
  name: string;
  quantity: number;
  rate: number;
  excluded?: boolean;
}

interface EditableDelivery {
  id: string;
  deliveryNoteNumber: string;
  date: string;
  customer: string;
  sourceType: string;
  status: string;
  items: EditableItem[];
  excluded?: boolean;
  isManual?: boolean;
  notes?: string;
  driver?: string;
  preparedByName?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deliveries: DeliveryData[];
  formatCurrency: (amount: number) => string;
  outletName?: string;
  outletId?: string;
  onViewSaved?: () => void;
}

export const DeliveryInReportEditor = ({ open, onOpenChange, deliveries, formatCurrency, outletName, outletId, onViewSaved }: Props) => {
  const { toast } = useToast();
  const portalRef = useRef<HTMLDivElement | null>(null);

  // Create a persistent DOM container for the portal
  useEffect(() => {
    if (!portalRef.current) {
      const container = document.createElement('div');
      container.setAttribute('data-portal', 'delivery-report-editor');
      document.body.appendChild(container);
      portalRef.current = container;
    }
    return () => {
      // Cleanup is handled by the component unmounting
    };
  }, []);

  // Sync editable deliveries when dialog opens
  useEffect(() => {
    if (open && deliveries.length > 0) {
      setEditableDeliveries(
        deliveries.map(d => ({
          id: d.id,
          deliveryNoteNumber: d.deliveryNoteNumber,
          date: d.date,
          customer: d.customer,
          sourceType: d.sourceType || 'investment',
          status: d.status,
          items: (d.itemsList || []).map((item, idx) => ({
            id: `${d.id}-item-${idx}`,
            name: item.description || item.name || 'N/A',
            quantity: item.quantity || item.delivered || 0,
            rate: item.rate || item.price || 0,
            excluded: false,
          })),
          excluded: false,
          isManual: false,
          driver: d.driver || '',
          preparedByName: (d as any).preparedByName || '',
        }))
      );
    }
  }, [open]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const [editableDeliveries, setEditableDeliveries] = useState<EditableDelivery[]>([]);

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [manualForm, setManualForm] = useState({ deliveryNoteNumber: '', date: new Date().toISOString().split('T')[0], customer: '', items: [{ name: '', quantity: 0, rate: 0 }] });
  const [isPrinting, setIsPrinting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Payment details state
  const [paymentDetails, setPaymentDetails] = useState({
    amountPaid: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash',
    referenceNumber: '',
    notes: '',
  });

  // Date range filter state
  const [reportDateRange, setReportDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [reportDatePreset, setReportDatePreset] = useState<string>('all');
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handleReportDatePreset = (preset: string) => {
    setReportDatePreset(preset);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    switch (preset) {
      case 'today':
        setReportDateRange({ start: todayStr, end: todayStr });
        break;
      case 'yesterday': {
        const y = new Date(today);
        y.setDate(y.getDate() - 1);
        setReportDateRange({ start: y.toISOString().split('T')[0], end: y.toISOString().split('T')[0] });
        break;
      }
      case 'last7': {
        const d = new Date(today);
        d.setDate(d.getDate() - 7);
        setReportDateRange({ start: d.toISOString().split('T')[0], end: todayStr });
        break;
      }
      case 'last30': {
        const d = new Date(today);
        d.setDate(d.getDate() - 30);
        setReportDateRange({ start: d.toISOString().split('T')[0], end: todayStr });
        break;
      }
      case 'thisMonth': {
        const first = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        setReportDateRange({ start: first, end: todayStr });
        break;
      }
      case 'lastMonth': {
        const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const last = new Date(today.getFullYear(), today.getMonth(), 0);
        setReportDateRange({ start: first.toISOString().split('T')[0], end: last.toISOString().split('T')[0] });
        break;
      }
      case 'thisYear': {
        const first = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
        setReportDateRange({ start: first, end: todayStr });
        break;
      }
      case 'all':
      default:
        setReportDateRange({ start: '', end: '' });
        break;
    }
  };

  // Filter deliveries by date range
  const dateFilteredDeliveries = useMemo(() => {
    if (!reportDateRange.start && !reportDateRange.end) return editableDeliveries;
    const startDate = reportDateRange.start ? new Date(reportDateRange.start) : null;
    if (startDate) startDate.setHours(0, 0, 0, 0);
    const endDate = reportDateRange.end ? new Date(reportDateRange.end) : null;
    if (endDate) endDate.setHours(23, 59, 59, 999);
    return editableDeliveries.filter(d => {
      if (!d.date) return false;
      const dd = new Date(d.date);
      if (isNaN(dd.getTime())) return false;
      return (!startDate || dd >= startDate) && (!endDate || dd <= endDate);
    });
  }, [editableDeliveries, reportDateRange]);

  const totals = useMemo(() => {
    let totalItems = 0, totalValue = 0, excludedCount = 0, activeCount = 0;
    dateFilteredDeliveries.forEach(d => {
      if (d.excluded) { excludedCount++; return; }
      activeCount++;
      d.items.forEach(item => {
        if (!item.excluded) { totalItems += item.quantity; totalValue += item.quantity * item.rate; }
      });
    });
    return { totalItems, totalValue, excludedCount, activeCount };
  }, [dateFilteredDeliveries]);

  const chartData = useMemo(() => {
    const byDate: Record<string, { date: string; value: number; count: number }> = {};
    dateFilteredDeliveries.filter(d => !d.excluded).forEach(d => {
      const dateKey = d.date?.substring(0, 10) || 'Unknown';
      if (!byDate[dateKey]) byDate[dateKey] = { date: dateKey, value: 0, count: 0 };
      d.items.forEach(item => {
        if (!item.excluded) { byDate[dateKey].value += item.quantity * item.rate; byDate[dateKey].count += item.quantity; }
      });
    });
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  }, [dateFilteredDeliveries]);

  const sourceChartData = useMemo(() => {
    const bySource: Record<string, { source: string; value: number }> = {};
    dateFilteredDeliveries.filter(d => !d.excluded).forEach(d => {
      const src = d.sourceType === 'outlet' ? 'Other Outlets' : 'Investment';
      if (!bySource[src]) bySource[src] = { source: src, value: 0 };
      d.items.forEach(item => { if (!item.excluded) bySource[src].value += item.quantity * item.rate; });
    });
    return Object.values(bySource);
  }, [dateFilteredDeliveries]);

  const toggleExpand = (id: string) => {
    setExpandedRows(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const toggleExcludeDelivery = (id: string) => {
    setEditableDeliveries(prev => prev.map(d => d.id === id ? { ...d, excluded: !d.excluded } : d));
  };

  const toggleExcludeItem = (deliveryId: string, itemId: string) => {
    setEditableDeliveries(prev => prev.map(d =>
      d.id === deliveryId ? { ...d, items: d.items.map(i => i.id === itemId ? { ...i, excluded: !i.excluded } : i) } : d
    ));
  };

  const updateItemField = (deliveryId: string, itemId: string, field: 'quantity' | 'rate', value: number) => {
    setEditableDeliveries(prev => prev.map(d =>
      d.id === deliveryId ? { ...d, items: d.items.map(i => i.id === itemId ? { ...i, [field]: value } : i) } : d
    ));
  };

  const handleAddManualDelivery = () => {
    if (!manualForm.deliveryNoteNumber.trim()) {
      toast({ title: "Error", description: "Delivery note number is required", variant: "destructive" }); return;
    }
    if (!manualForm.customer.trim()) {
      toast({ title: "Error", description: "Customer/Source name is required", variant: "destructive" }); return;
    }
    const validItems = manualForm.items.filter(i => i.name.trim() && i.quantity > 0);
    if (validItems.length === 0) {
      toast({ title: "Error", description: "At least one item with name and quantity is required", variant: "destructive" }); return;
    }
    const newD: EditableDelivery = {
      id: `manual-${Date.now()}`, deliveryNoteNumber: manualForm.deliveryNoteNumber, date: manualForm.date,
      customer: manualForm.customer, sourceType: 'manual', status: 'completed',
      items: validItems.map((item, idx) => ({ id: `manual-${Date.now()}-item-${idx}`, name: item.name, quantity: item.quantity, rate: item.rate, excluded: false })),
      excluded: false, isManual: true,
    };
    setEditableDeliveries(prev => [...prev, newD]);
    setShowAddDialog(false);
    setManualForm({ deliveryNoteNumber: '', date: new Date().toISOString().split('T')[0], customer: '', items: [{ name: '', quantity: 0, rate: 0 }] });
    toast({ title: "Added", description: "Manual delivery added to report" });
  };

  const removeManualDelivery = (id: string) => {
    setEditableDeliveries(prev => prev.filter(d => d.id !== id));
    toast({ title: "Removed", description: "Manual delivery removed from report" });
  };

  const buildReportHTML = () => {
    const active = dateFilteredDeliveries.filter(d => !d.excluded);
    const rows = active.map(d => {
      const ai = d.items.filter(i => !i.excluded);
      const t = ai.reduce((s, i) => s + (i.quantity * i.rate), 0);
      return `<tr><td>${d.deliveryNoteNumber}</td><td>${d.date?.substring(0,10)}</td><td>${d.customer}</td><td>${d.sourceType==='outlet'?'Outlet':d.sourceType==='manual'?'Manual':'Investment'}</td><td style="text-align:right">${formatCurrency(t)}</td><td>${ai.map(i=>`${i.name} (${i.quantity})`).join(', ')}</td></tr>`;
    }).join('');
    const detailRows = active.flatMap(d => d.items.filter(i=>!i.excluded).map(i => `<tr><td>${d.deliveryNoteNumber}</td><td>${i.name}</td><td style="text-align:center">${i.quantity}</td><td style="text-align:right">${formatCurrency(i.rate)}</td><td style="text-align:right">${formatCurrency(i.quantity*i.rate)}</td></tr>`)).join('');
    return { rows, detailRows };
  };

  const handlePrintReport = () => {
    setIsPrinting(true);
    try {
      const pw = window.open('', '_blank');
      if (!pw) { toast({ title: "Error", description: "Allow popups", variant: "destructive" }); return; }
      const { rows, detailRows } = buildReportHTML();
      const dateRangeLabel = (reportDateRange.start || reportDateRange.end) ? ` | Period: ${reportDateRange.start || '...'} to ${reportDateRange.end || '...'}` : '';
      const amtPaid = Number(paymentDetails.amountPaid) || 0;
      const balDue = totals.totalValue - amtPaid;
      const paymentMethodLabel: Record<string, string> = { cash: 'Cash', bank_transfer: 'Bank Transfer', cheque: 'Cheque', mobile_payment: 'Mobile Payment' };
      const paymentSection = (amtPaid > 0 || paymentDetails.referenceNumber) ? `<h2>Payment Summary</h2><table style="max-width:400px;margin-bottom:15px"><tbody><tr><td style="font-weight:bold">Total Value</td><td style="text-align:right">${formatCurrency(totals.totalValue)}</td></tr><tr><td style="font-weight:bold">Amount Paid</td><td style="text-align:right">${formatCurrency(amtPaid)}</td></tr><tr><td style="font-weight:bold;border-top:2px solid #333">Balance Due</td><td style="text-align:right;border-top:2px solid #333;font-weight:bold;color:${balDue > 0 ? '#dc2626' : '#16a34a'}">${formatCurrency(balDue)}</td></tr><tr><td>Payment Date</td><td style="text-align:right">${paymentDetails.paymentDate || '-'}</td></tr><tr><td>Payment Method</td><td style="text-align:right">${paymentMethodLabel[paymentDetails.paymentMethod] || '-'}</td></tr><tr><td>Reference #</td><td style="text-align:right">${paymentDetails.referenceNumber || '-'}</td></tr></tbody></table>` : '';
      const html = `<!DOCTYPE html><html><head><title>Deliveries In Report</title><style>
@media print{@page{size:A4 landscape;margin:12mm}}*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;padding:20px;color:#333;font-size:11px}
.hdr{text-align:center;margin-bottom:25px;border-bottom:3px solid #333;padding-bottom:15px}.hdr h1{font-size:22px;margin-bottom:5px}.hdr p{font-size:12px;color:#666}
.sum{display:flex;justify-content:space-between;margin-bottom:20px;padding:12px;background:#f5f5f5;border-radius:6px}.si{text-align:center}.si .l{font-size:10px;color:#666;text-transform:uppercase}.si .v{font-size:18px;font-weight:bold}
h2{font-size:13px;margin:20px 0 8px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px}
table{width:100%;border-collapse:collapse;margin-bottom:15px}thead{background:#333;color:#fff}th{padding:6px 8px;text-align:left;font-size:9px;text-transform:uppercase}td{padding:5px 8px;border-bottom:1px solid #eee}tbody tr:nth-child(even){background:#fafafa}
.ftr{margin-top:30px;padding-top:15px;border-top:2px solid #333;display:flex;justify-content:space-between}.sl{width:200px;border-top:1px solid #333;padding-top:5px;text-align:center;font-size:10px}
.nc{margin-top:15px;font-size:9px;color:#999;text-align:center}</style></head><body>
<div class="hdr"><h1>DELIVERIES IN &mdash; FINANCIAL REPORT</h1><p>${outletName||'Outlet'} | Generated: ${new Date().toLocaleString()}${dateRangeLabel}</p></div>
<div class="sum"><div class="si"><div class="l">Active</div><div class="v">${totals.activeCount}</div></div><div class="si"><div class="l">Items</div><div class="v">${totals.totalItems.toLocaleString()}</div></div><div class="si"><div class="l">Value</div><div class="v">${formatCurrency(totals.totalValue)}</div></div><div class="si"><div class="l">Excluded</div><div class="v">${totals.excludedCount}</div></div></div>
<h2>Summary by Delivery</h2><table><thead><tr><th>Note #</th><th>Date</th><th>Source</th><th>Type</th><th style="text-align:right">Value</th><th>Items</th></tr></thead><tbody>${rows}</tbody></table>
<h2>Detailed Item Breakdown</h2><table><thead><tr><th>Note #</th><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Rate</th><th style="text-align:right">Amount</th></tr></thead><tbody>${detailRows}</tbody></table>
${paymentSection}
<div class="ftr"><div class="sl">Prepared By</div><div class="sl">Verified By</div><div class="sl">Approved By</div></div>
<div class="nc">System-generated financial report. Manual adjustments may have been applied.</div></body></html>`;
      pw.document.write(html);
      pw.document.close();
      setTimeout(() => pw.print(), 500);
    } finally { setIsPrinting(false); }
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF('l');
    const active = dateFilteredDeliveries.filter(d => !d.excluded);
    const dateRangeLabel = (reportDateRange.start || reportDateRange.end) ? ` | Period: ${reportDateRange.start || '...'} to ${reportDateRange.end || '...'}` : '';
    doc.setFontSize(18); doc.text('DELIVERIES IN - FINANCIAL REPORT', 14, 20);
    doc.setFontSize(9); doc.text(`${outletName||'Outlet'} | Generated: ${new Date().toLocaleString()}${dateRangeLabel}`, 14, 28);
    doc.text(`Active: ${totals.activeCount} | Items: ${totals.totalItems} | Value: ${formatCurrency(totals.totalValue)} | Excluded: ${totals.excludedCount}`, 14, 34);
    const summary = active.map(d => { const ai=d.items.filter(i=>!i.excluded); return [d.deliveryNoteNumber, d.date?.substring(0,10), d.customer, d.sourceType==='outlet'?'Outlet':d.sourceType==='manual'?'Manual':'Investment', formatCurrency(ai.reduce((s,i)=>s+i.quantity*i.rate,0))]; });
    autoTable(doc, { startY:42, head:[['Note #','Date','Source','Type','Value']], body:summary, theme:'striped', headStyles:{fillColor:[51,51,51]}, styles:{fontSize:8} });
    const y1 = (doc as any).lastAutoTable?.finalY || 60;
    const detail = active.flatMap(d => d.items.filter(i=>!i.excluded).map(i => [d.deliveryNoteNumber, i.name, i.quantity.toString(), formatCurrency(i.rate), formatCurrency(i.quantity*i.rate)]));
    autoTable(doc, { startY:y1+10, head:[['Note #','Item','Qty','Rate','Amount']], body:detail, theme:'striped', headStyles:{fillColor:[51,51,51]}, styles:{fontSize:8} });
    // Payment summary in PDF
    const amountPaid = Number(paymentDetails.amountPaid) || 0;
    const balanceDue = totals.totalValue - amountPaid;
    if (amountPaid > 0 || paymentDetails.referenceNumber) {
      const y2 = (doc as any).lastAutoTable?.finalY || y1 + 40;
      autoTable(doc, { startY: y2 + 10, head: [['Payment Summary']], body: [
        ['Total Value', formatCurrency(totals.totalValue)],
        ['Amount Paid', formatCurrency(amountPaid)],
        ['Balance Due', formatCurrency(balanceDue)],
        ['Payment Date', paymentDetails.paymentDate || '-'],
        ['Payment Method', paymentDetails.paymentMethod || '-'],
        ['Reference #', paymentDetails.referenceNumber || '-'],
      ], theme: 'striped', headStyles: { fillColor: [51, 51, 51] }, styles: { fontSize: 8 } });
    }

    doc.save(`deliveries-in-report-${new Date().toISOString().split('T')[0]}.pdf`);
    toast({ title: "Downloaded", description: "PDF report saved" });
  };

  const handleSaveReport = async () => {
    if (!outletId) {
      toast({ title: "Error", description: "Outlet ID is required to save report", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const reportData: DeliveryReportData = {
        outletId,
        reportDate: new Date().toISOString().split('T')[0],
        totalValue: totals.totalValue,
        amountPaid: Number(paymentDetails.amountPaid) || 0,
        paymentDate: paymentDetails.paymentDate,
        paymentMethod: paymentDetails.paymentMethod,
        referenceNumber: paymentDetails.referenceNumber,
        notes: paymentDetails.notes,
        preparedByName: '',
        deliveries: dateFilteredDeliveries.map(d => ({
          id: d.id,
          deliveryNoteNumber: d.deliveryNoteNumber,
          date: d.date,
          customer: d.customer,
          sourceType: d.sourceType,
          status: d.status,
          items: d.items.map(i => ({ id: i.id, name: i.name, quantity: i.quantity, rate: i.rate, excluded: i.excluded })),
          excluded: d.excluded,
          isManual: d.isManual,
          driver: d.driver,
          preparedByName: d.preparedByName,
        })),
      };
      const result = await saveDeliveryInReport(reportData);
      if (result.success) {
        toast({ title: "Saved", description: `Report ${result.reportNumber} saved successfully` });
      } else {
        toast({ title: "Error", description: result.error || "Failed to save report", variant: "destructive" });
      }
    } catch (err) {
      console.error('Error saving report:', err);
      toast({ title: "Error", description: "Failed to save report", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const balanceDue = totals.totalValue - (Number(paymentDetails.amountPaid) || 0);

  if (!open || !portalRef.current) return null;

  return createPortal(
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-[9998] bg-black/80" />
      {/* Content */}
      <div className="fixed inset-x-[2.5vw] top-[4vh] bottom-[4vh] z-[9999] bg-background border rounded-lg overflow-y-auto shadow-lg">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b px-6 pt-5 pb-3 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-semibold">
                <BarChart3 className="h-6 w-6 text-primary" />
                Deliveries In — Financial Report Editor
              </h2>
              <p className="text-sm text-muted-foreground mt-1">Adjust quantities, prices, add unregistered deliveries, or exclude duplicates before generating the final report.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleDownloadPDF}><Download className="h-4 w-4 mr-1" /> PDF</Button>
              <Button variant="outline" size="sm" onClick={handlePrintReport} disabled={isPrinting}>{isPrinting ? <Loader2 className="h-4 w-4 mr-1 animate-spin"/> : <Printer className="h-4 w-4 mr-1"/>}Print</Button>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 space-y-5">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="bg-green-50 border-green-200"><CardContent className="p-3 text-center"><p className="text-xs text-green-600 font-medium">Active Deliveries</p><p className="text-2xl font-bold text-green-700">{totals.activeCount}</p></CardContent></Card>
            <Card className="bg-blue-50 border-blue-200"><CardContent className="p-3 text-center"><p className="text-xs text-blue-600 font-medium">Total Items</p><p className="text-2xl font-bold text-blue-700">{totals.totalItems.toLocaleString()}</p></CardContent></Card>
            <Card className="bg-amber-50 border-amber-200"><CardContent className="p-3 text-center"><p className="text-xs text-amber-600 font-medium">Total Value</p><p className="text-2xl font-bold text-amber-700">{formatCurrency(totals.totalValue)}</p></CardContent></Card>
            <Card className="bg-red-50 border-red-200"><CardContent className="p-3 text-center"><p className="text-xs text-red-600 font-medium">Excluded</p><p className="text-2xl font-bold text-red-700">{totals.excludedCount}</p></CardContent></Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Value by Date</CardTitle></CardHeader>
              <CardContent className="pt-0" style={{height:220}}>
                <ResponsiveContainer width="100%" height="100%"><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}} tickFormatter={v=>formatCurrency(v)}/><Tooltip formatter={(v:number)=>formatCurrency(v)}/><Bar dataKey="value" fill="#3b82f6" radius={[4,4,0,0]} name="Value"/></BarChart></ResponsiveContainer>
              </CardContent>
            </Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Value by Source</CardTitle></CardHeader>
              <CardContent className="pt-0" style={{height:220}}>
                <ResponsiveContainer width="100%" height="100%"><BarChart data={sourceChartData}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="source" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}} tickFormatter={v=>formatCurrency(v)}/><Tooltip formatter={(v:number)=>formatCurrency(v)}/><Legend/><Bar dataKey="value" fill="#10b981" radius={[4,4,0,0]} name="Value"/></BarChart></ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Date Range Picker */}
          <Card className="border">
            <CardContent className="p-4 space-y-3">
              {/* Date Inputs */}
              <div className="flex flex-wrap items-center gap-3">
                <CalendarIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    type="date"
                    value={reportDateRange.start}
                    onChange={(e) => { setReportDateRange(prev => ({ ...prev, start: e.target.value })); setReportDatePreset('custom'); }}
                    className="w-40 h-9"
                  />
                  <span className="text-muted-foreground text-sm">to</span>
                  <Input
                    type="date"
                    value={reportDateRange.end}
                    onChange={(e) => { setReportDateRange(prev => ({ ...prev, end: e.target.value })); setReportDatePreset('custom'); }}
                    className="w-40 h-9"
                  />
                </div>
              </div>
              {/* Quick Range Presets + Calendar Popover */}
              <div className="flex flex-wrap items-center gap-2 pt-3 border-t">
                <span className="text-sm font-medium mr-1">Quick Range:</span>
                {[
                  { key: 'today', label: 'Today' },
                  { key: 'yesterday', label: 'Yesterday' },
                  { key: 'last7', label: 'Last 7 Days' },
                  { key: 'last30', label: 'Last 30 Days' },
                  { key: 'thisMonth', label: 'This Month' },
                  { key: 'lastMonth', label: 'Last Month' },
                  { key: 'thisYear', label: 'This Year' },
                  { key: 'all', label: 'All Time' },
                ].map(preset => (
                  <Button
                    key={preset.key}
                    size="sm"
                    variant={reportDatePreset === preset.key ? 'default' : 'outline'}
                    onClick={() => handleReportDatePreset(preset.key)}
                    className={reportDatePreset === preset.key ? '' : 'text-xs'}
                  >
                    {preset.label}
                  </Button>
                ))}
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 whitespace-nowrap">
                      <CalendarIcon className="h-4 w-4 mr-1" />
                      Calendar
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <CalendarComponent
                      mode="range"
                      selected={{
                        from: reportDateRange.start ? new Date(reportDateRange.start) : undefined,
                        to: reportDateRange.end ? new Date(reportDateRange.end) : undefined,
                      }}
                      onSelect={(range: { from?: Date; to?: Date } | undefined) => {
                        if (range?.from) setReportDateRange(prev => ({ ...prev, start: range.from!.toISOString().split('T')[0] }));
                        if (range?.to) setReportDateRange(prev => ({ ...prev, end: range.to!.toISOString().split('T')[0] }));
                        setReportDatePreset('custom');
                      }}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
                {(reportDateRange.start || reportDateRange.end) && (
                  <Button variant="ghost" size="sm" onClick={() => handleReportDatePreset('all')} className="h-8 text-xs">
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions Bar */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{dateFilteredDeliveries.length} deliveries in range — click to expand, toggle to exclude</p>
            <Button variant={showAddDialog ? "secondary" : "default"} onClick={() => setShowAddDialog(!showAddDialog)}>{showAddDialog ? <><X className="h-4 w-4 mr-1"/>Cancel</> : <><Plus className="h-4 w-4 mr-1"/>Add Unregistered Delivery</>}</Button>
          </div>

          {/* Add Manual Delivery - Inline Form */}
          {showAddDialog && (
            <Card className="border-2 border-dashed border-primary/40 bg-primary/5">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm flex items-center gap-2"><Plus className="h-4 w-4 text-primary"/>Add Unregistered Delivery</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label className="text-xs">Delivery Note # <span className="text-red-500">*</span></Label><Input value={manualForm.deliveryNoteNumber} onChange={e => setManualForm(p => ({...p, deliveryNoteNumber: e.target.value}))} placeholder="e.g. MAN-001" className="h-8"/></div>
                  <div className="space-y-1"><Label className="text-xs">Date</Label><Input type="date" value={manualForm.date} onChange={e => setManualForm(p => ({...p, date: e.target.value}))} className="h-8"/></div>
                </div>
                <div className="space-y-1"><Label className="text-xs">Customer / Source <span className="text-red-500">*</span></Label><Input value={manualForm.customer} onChange={e => setManualForm(p => ({...p, customer: e.target.value}))} placeholder="Source name" className="h-8"/></div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between"><Label className="text-xs">Items</Label><Button type="button" variant="outline" size="sm" className="h-7" onClick={() => setManualForm(p => ({...p, items: [...p.items, {name:'',quantity:0,rate:0}]}))}><Plus className="h-3 w-3 mr-1"/>Add Item</Button></div>
                  {manualForm.items.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Input placeholder="Item name" value={item.name} onChange={e => {const it=[...manualForm.items];it[idx]={...item,name:e.target.value};setManualForm(p=>({...p,items:it}));}} className="flex-1 h-8"/>
                      <Input type="number" placeholder="Qty" value={item.quantity||''} onChange={e => {const it=[...manualForm.items];it[idx]={...item,quantity:Number(e.target.value)};setManualForm(p=>({...p,items:it}));}} className="w-20 h-8" min={0}/>
                      <Input type="number" placeholder="Rate" value={item.rate||''} onChange={e => {const it=[...manualForm.items];it[idx]={...item,rate:Number(e.target.value)};setManualForm(p=>({...p,items:it}));}} className="w-24 h-8" min={0}/>
                      {manualForm.items.length > 1 && <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => {const it=manualForm.items.filter((_,i)=>i!==idx);setManualForm(p=>({...p,items:it}));}}><Trash2 className="h-3.5 w-3.5 text-red-500"/></Button>}
                    </div>
                  ))}
                </div>
                <div className="flex justify-end"><Button type="button" onClick={handleAddManualDelivery}><Plus className="h-4 w-4 mr-1"/>Add to Report</Button></div>
              </CardContent>
            </Card>
          )}

          {/* Editable Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead className="min-w-[120px]">Note #</TableHead>
                  <TableHead className="w-[100px]">Date</TableHead>
                  <TableHead className="min-w-[120px]">Source</TableHead>
                  <TableHead className="w-[90px]">Type</TableHead>
                  <TableHead className="w-[80px] text-center">Items</TableHead>
                  <TableHead className="w-[120px] text-right">Total</TableHead>
                  <TableHead className="w-[100px] text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dateFilteredDeliveries.map(delivery => {
                  const activeItems = delivery.items.filter(i => !i.excluded);
                  const deliveryTotal = activeItems.reduce((s, i) => s + (i.quantity * i.rate), 0);
                  const isExpanded = expandedRows.has(delivery.id);
                  return (
                    <TableRow key={delivery.id} className={delivery.excluded ? 'opacity-40 line-through' : ''}>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => toggleExpand(delivery.id)}>
                          {isExpanded ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">{delivery.deliveryNoteNumber}{delivery.isManual && <Badge variant="outline" className="ml-2 text-xs">Manual</Badge>}</TableCell>
                      <TableCell>{delivery.date?.substring(0,10)}</TableCell>
                      <TableCell>{delivery.customer}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{delivery.sourceType==='outlet'?'Outlet':delivery.sourceType==='manual'?'Manual':'Investment'}</Badge></TableCell>
                      <TableCell className="text-center">{activeItems.length}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(deliveryTotal)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => toggleExcludeDelivery(delivery.id)} title={delivery.excluded?'Include':'Exclude'}>
                            {delivery.excluded ? <Check className="h-3.5 w-3.5 text-green-600"/> : <X className="h-3.5 w-3.5 text-red-500"/>}
                          </Button>
                          {delivery.isManual && <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => removeManualDelivery(delivery.id)} title="Remove"><Trash2 className="h-3.5 w-3.5 text-red-500"/></Button>}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Expanded Item Editor */}
          {expandedRows.size > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Item Details (Expanded Rows)</h3>
              {Array.from(expandedRows).map(dId => {
                const d = editableDeliveries.find(x => x.id === dId);
                if (!d) return null;
                return (
                  <Card key={dId}>
                    <CardHeader className="py-2 px-4">
                      <CardTitle className="text-sm">{d.deliveryNoteNumber} — {d.customer}</CardTitle>
                      {(d.driver || d.preparedByName) && (
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                          {d.preparedByName && (
                            <span className="text-xs text-muted-foreground">Prepared By: <span className="font-medium text-foreground">{d.preparedByName}</span></span>
                          )}
                          {d.driver && (
                            <span className="text-xs text-muted-foreground">Driver: <span className="font-medium text-foreground">{d.driver}</span></span>
                          )}
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader><TableRow><TableHead className="w-[40px]"></TableHead><TableHead>Item</TableHead><TableHead className="w-[120px]">Qty</TableHead><TableHead className="w-[140px]">Rate</TableHead><TableHead className="w-[120px] text-right">Amount</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {d.items.map(item => (
                            <TableRow key={item.id} className={item.excluded ? 'opacity-40 line-through' : ''}>
                              <TableCell><Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => toggleExcludeItem(d.id, item.id)}>{item.excluded ? <Check className="h-3 w-3 text-green-600"/> : <X className="h-3 w-3 text-red-400"/>}</Button></TableCell>
                              <TableCell className="font-medium">{item.name}</TableCell>
                              <TableCell><Input type="number" value={item.quantity} onChange={e => updateItemField(d.id, item.id, 'quantity', Math.max(0, Number(e.target.value)))} className="h-7 text-sm" min={0}/></TableCell>
                              <TableCell><Input type="number" value={item.rate} onChange={e => updateItemField(d.id, item.id, 'rate', Math.max(0, Number(e.target.value)))} className="h-7 text-sm" min={0}/></TableCell>
                              <TableCell className="text-right font-semibold">{formatCurrency(item.quantity * item.rate)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Payment Details */}
          <Card className="border-2 border-emerald-200 bg-emerald-50/30">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2 text-emerald-800"><DollarSign className="h-4 w-4"/>Payment Summary</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-4">
              {/* Financial Summary Row */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Total Value of Deliveries</Label>
                  <div className="text-2xl font-bold text-blue-700">{formatCurrency(totals.totalValue)}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Amount Paid <span className="text-red-500">*</span></Label>
                  <Input
                    type="number"
                    value={paymentDetails.amountPaid}
                    onChange={e => setPaymentDetails(p => ({ ...p, amountPaid: e.target.value }))}
                    className="h-10 text-lg font-bold"
                    placeholder="0.00"
                    min={0}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Balance Due</Label>
                  <div className={`text-2xl font-bold ${balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(balanceDue)}</div>
                </div>
              </div>
              {/* Payment Details Row */}
              <div className="grid grid-cols-3 gap-4 pt-3 border-t">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Payment Date</Label>
                  <Input
                    type="date"
                    value={paymentDetails.paymentDate}
                    onChange={e => setPaymentDetails(p => ({ ...p, paymentDate: e.target.value }))}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Payment Method</Label>
                  <Select value={paymentDetails.paymentMethod} onValueChange={v => setPaymentDetails(p => ({ ...p, paymentMethod: v }))}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select method" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="mobile_payment">Mobile Payment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Reference Number</Label>
                  <Input
                    value={paymentDetails.referenceNumber}
                    onChange={e => setPaymentDetails(p => ({ ...p, referenceNumber: e.target.value }))}
                    className="h-9"
                    placeholder="e.g. TXN-12345"
                  />
                </div>
              </div>
              {/* Notes */}
              <div className="space-y-1 pt-3 border-t">
                <Label className="text-xs font-medium">Notes (optional)</Label>
                <Textarea
                  value={paymentDetails.notes}
                  onChange={e => setPaymentDetails(p => ({ ...p, notes: e.target.value }))}
                  className="min-h-[60px] resize-none"
                  placeholder="Additional notes about this payment..."
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-background border-t px-6 py-4 flex items-center gap-2">
          <Button variant="outline" onClick={handleClose}>Close</Button>
          <div className="flex-1" />
          {onViewSaved && (
            <Button variant="outline" onClick={onViewSaved}><ClipboardList className="h-4 w-4 mr-1"/>View Saved</Button>
          )}
          <Button variant="outline" onClick={handleDownloadPDF}><Download className="h-4 w-4 mr-1"/>Download PDF</Button>
          <Button onClick={handlePrintReport} disabled={isPrinting} variant="outline">{isPrinting ? <><Loader2 className="h-4 w-4 mr-1 animate-spin"/>Printing...</> : <><Printer className="h-4 w-4 mr-1"/>Print</>}</Button>
          <Button onClick={handleSaveReport} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700">{isSaving ? <><Loader2 className="h-4 w-4 mr-1 animate-spin"/>Saving...</> : <><Save className="h-4 w-4 mr-1"/>Save Report</>}</Button>
        </div>
      </div>
    </>,
    portalRef.current
  );
};
