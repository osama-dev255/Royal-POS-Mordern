import { useState, useMemo } from "react";
import { format as formatDate } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Truck, Calendar, CalendarIcon, User, Package, Eye, Printer, Download, Share2,
  Plus, Trash2, X, ChevronDown, ChevronUp, Save, Loader2, FileText,
  ArrowLeft, BarChart3, Edit3, Check,
} from "lucide-react";
import { DeliveryData } from "@/utils/deliveryUtils";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deliveries: DeliveryData[];
  formatCurrency: (amount: number) => string;
  outletName?: string;
}

export const DeliveryInReportEditor = ({ open, onOpenChange, deliveries, formatCurrency, outletName }: Props) => {
  const { toast } = useToast();

  const [editableDeliveries, setEditableDeliveries] = useState<EditableDelivery[]>(() =>
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
    }))
  );

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [manualForm, setManualForm] = useState({ deliveryNoteNumber: '', date: new Date().toISOString().split('T')[0], customer: '', items: [{ name: '', quantity: 0, rate: 0 }] });
  const [isPrinting, setIsPrinting] = useState(false);

  // Date range filter state
  const [reportDateRange, setReportDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [reportDatePreset, setReportDatePreset] = useState<string>('all');
  const [reportCalendarOpen, setReportCalendarOpen] = useState(false);

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
    doc.save(`deliveries-in-report-${new Date().toISOString().split('T')[0]}.pdf`);
    toast({ title: "Downloaded", description: "PDF report saved" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[92vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b sticky top-0 bg-background z-10">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <BarChart3 className="h-6 w-6 text-primary" />
                Deliveries In — Financial Report Editor
              </DialogTitle>
              <DialogDescription className="mt-1">Adjust quantities, prices, add unregistered deliveries, or exclude duplicates before generating the final report.</DialogDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleDownloadPDF}><Download className="h-4 w-4 mr-1" /> PDF</Button>
              <Button variant="outline" size="sm" onClick={handlePrintReport} disabled={isPrinting}>{isPrinting ? <Loader2 className="h-4 w-4 mr-1 animate-spin"/> : <Printer className="h-4 w-4 mr-1"/>}Print</Button>
            </div>
          </div>
        </DialogHeader>

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
            <CardContent className="p-4">
              <div className="flex items-center gap-2 w-full">
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
                  <Popover open={reportCalendarOpen} onOpenChange={setReportCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 whitespace-nowrap">
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
                          if (range?.from) setReportDateRange(prev => ({ ...prev, start: formatDate(range.from!, "yyyy-MM-dd") }));
                          if (range?.to) setReportDateRange(prev => ({ ...prev, end: formatDate(range.to!, "yyyy-MM-dd") }));
                          setReportDatePreset('custom');
                        }}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              {/* Quick Range Presets */}
              <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t">
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
                {(reportDateRange.start || reportDateRange.end) && (
                  <Button variant="ghost" size="sm" onClick={() => handleReportDatePreset('all')} className="h-7 text-xs">
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
            <Button onClick={() => setShowAddDialog(true)}><Plus className="h-4 w-4 mr-1"/>Add Unregistered Delivery</Button>
          </div>

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
                    <CardHeader className="py-2 px-4"><CardTitle className="text-sm">{d.deliveryNoteNumber} — {d.customer}</CardTitle></CardHeader>
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
        </div>

        <DialogFooter className="px-6 py-4 border-t sticky bottom-0 bg-background">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button variant="outline" onClick={handleDownloadPDF}><Download className="h-4 w-4 mr-1"/>Download PDF</Button>
          <Button onClick={handlePrintReport} disabled={isPrinting}>{isPrinting ? <><Loader2 className="h-4 w-4 mr-1 animate-spin"/>Printing...</> : <><Printer className="h-4 w-4 mr-1"/>Print Report</>}</Button>
        </DialogFooter>
      </DialogContent>

      {/* Add Manual Delivery Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="h-5 w-5 text-primary"/>Add Unregistered Delivery</DialogTitle>
            <DialogDescription>Manually add a delivery not in the system for official reporting.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Delivery Note # <span className="text-red-500">*</span></Label><Input value={manualForm.deliveryNoteNumber} onChange={e => setManualForm(p => ({...p, deliveryNoteNumber: e.target.value}))} placeholder="e.g. MAN-001"/></div>
              <div className="space-y-1"><Label>Date</Label><Input type="date" value={manualForm.date} onChange={e => setManualForm(p => ({...p, date: e.target.value}))}/></div>
            </div>
            <div className="space-y-1"><Label>Customer / Source <span className="text-red-500">*</span></Label><Input value={manualForm.customer} onChange={e => setManualForm(p => ({...p, customer: e.target.value}))} placeholder="Source name"/></div>
            <div className="space-y-2">
              <div className="flex items-center justify-between"><Label>Items</Label><Button type="button" variant="outline" size="sm" onClick={() => setManualForm(p => ({...p, items: [...p.items, {name:'',quantity:0,rate:0}]}))}><Plus className="h-3 w-3 mr-1"/>Add Item</Button></div>
              {manualForm.items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input placeholder="Item name" value={item.name} onChange={e => {const it=[...manualForm.items];it[idx]={...item,name:e.target.value};setManualForm(p=>({...p,items:it}));}} className="flex-1"/>
                  <Input type="number" placeholder="Qty" value={item.quantity||''} onChange={e => {const it=[...manualForm.items];it[idx]={...item,quantity:Number(e.target.value)};setManualForm(p=>({...p,items:it}));}} className="w-20" min={0}/>
                  <Input type="number" placeholder="Rate" value={item.rate||''} onChange={e => {const it=[...manualForm.items];it[idx]={...item,rate:Number(e.target.value)};setManualForm(p=>({...p,items:it}));}} className="w-24" min={0}/>
                  {manualForm.items.length > 1 && <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => {const it=manualForm.items.filter((_,i)=>i!==idx);setManualForm(p=>({...p,items:it}));}}><Trash2 className="h-3.5 w-3.5 text-red-500"/></Button>}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddManualDelivery}><Plus className="h-4 w-4 mr-1"/>Add to Report</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};
