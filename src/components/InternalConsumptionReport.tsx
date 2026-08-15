import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Package, FileText, Download, Printer, CalendarDays, AlertTriangle,
  Users, TrendingUp, Filter, Share2, Search, BarChart3
} from "lucide-react";
import {
  getSavedInternalConsumptionNotes,
  getReasonLabel,
  getPersonTypeLabel,
  SavedInternalConsumptionNote
} from "@/utils/internalConsumptionUtils";
import { formatCurrency } from "@/lib/currency";
import { ExportUtils } from "@/utils/exportUtils";
import { PrintUtils } from "@/utils/printUtils";
import { toast } from "@/components/ui/use-toast";

interface InternalConsumptionReportProps {
  onBack: () => void;
}

export const InternalConsumptionReport = ({ onBack }: InternalConsumptionReportProps) => {
  const [notes, setNotes] = useState<SavedInternalConsumptionNote[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [filterPerson, setFilterPerson] = useState('all');
  const [filterPersonType, setFilterPersonType] = useState('all');
  const [filterReason, setFilterReason] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await getSavedInternalConsumptionNotes();
        setNotes(data);
      } catch (e) {
        console.error('Error loading notes for report:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Unique persons for filter
  const uniquePersons = useMemo(() => {
    const set = new Set(notes.map(n => n.takenBy));
    return Array.from(set).sort();
  }, [notes]);

  // Filtered data
  const filtered = useMemo(() => {
    return notes.filter(n => {
      if (n.date < dateFrom || n.date > dateTo) return false;
      if (filterPerson !== 'all' && n.takenBy !== filterPerson) return false;
      if (filterPersonType !== 'all' && n.personType !== filterPersonType) return false;
      if (filterReason !== 'all' && n.reason !== filterReason) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (
          !n.noteNumber.toLowerCase().includes(term) &&
          !n.takenBy.toLowerCase().includes(term) &&
          !n.department.toLowerCase().includes(term) &&
          !getReasonLabel(n.reason).toLowerCase().includes(term)
        ) return false;
      }
      return true;
    });
  }, [notes, dateFrom, dateTo, filterPerson, filterPersonType, filterReason, searchTerm]);

  // Summary calculations
  const summary = useMemo(() => {
    const totalNotes = filtered.length;
    const totalValue = filtered.reduce((sum, n) => sum + (n.totalAmount || 0), 0);
    const damageValue = filtered.filter(n => n.reason === 'damage').reduce((sum, n) => sum + (n.totalAmount || 0), 0);
    const approvedCount = filtered.filter(n => n.status === 'approved').length;
    const pendingCount = filtered.filter(n => n.status === 'pending').length;
    const rejectedCount = filtered.filter(n => n.status === 'rejected').length;

    // By person breakdown
    const byPerson: Record<string, { count: number; value: number }> = {};
    filtered.forEach(n => {
      if (!byPerson[n.takenBy]) byPerson[n.takenBy] = { count: 0, value: 0 };
      byPerson[n.takenBy].count++;
      byPerson[n.takenBy].value += n.totalAmount || 0;
    });

    // By reason breakdown
    const byReason: Record<string, { count: number; value: number }> = {};
    filtered.forEach(n => {
      const label = getReasonLabel(n.reason);
      if (!byReason[label]) byReason[label] = { count: 0, value: 0 };
      byReason[label].count++;
      byReason[label].value += n.totalAmount || 0;
    });

    // By person type breakdown
    const byPersonType: Record<string, { count: number; value: number }> = {};
    filtered.forEach(n => {
      const label = getPersonTypeLabel(n.personType);
      if (!byPersonType[label]) byPersonType[label] = { count: 0, value: 0 };
      byPersonType[label].count++;
      byPersonType[label].value += n.totalAmount || 0;
    });

    return { totalNotes, totalValue, damageValue, approvedCount, pendingCount, rejectedCount, byPerson, byReason, byPersonType };
  }, [filtered]);

  // Export handlers
  const handleExportPDF = () => {
    const html = `<!DOCTYPE html><html><head><title>Internal Consumption Report</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; }
      h1 { font-size: 18px; margin-bottom: 4px; }
      .meta { color: #666; margin-bottom: 20px; font-size: 11px; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 11px; }
      th { background: #f5f5f5; padding: 8px; text-align: left; border-bottom: 2px solid #333; font-size: 10px; text-transform: uppercase; }
      td { padding: 6px 8px; border-bottom: 1px solid #eee; }
      .summary { display: flex; gap: 20px; margin-bottom: 20px; }
      .summary-card { border: 1px solid #ddd; padding: 12px; border-radius: 4px; flex: 1; }
      .summary-label { font-size: 10px; text-transform: uppercase; color: #666; }
      .summary-value { font-size: 20px; font-weight: bold; margin-top: 4px; }
    </style></head><body>
    <h1>Internal Consumption Report</h1>
    <div class="meta">Period: ${dateFrom} to ${dateTo} | Generated: ${new Date().toLocaleDateString()}</div>
    <div class="summary">
      <div class="summary-card"><div class="summary-label">Total Notes</div><div class="summary-value">${summary.totalNotes}</div></div>
      <div class="summary-card"><div class="summary-label">Total Value</div><div class="summary-value">${formatCurrency(summary.totalValue)}</div></div>
      <div class="summary-card"><div class="summary-label">Damage Value</div><div class="summary-value">${formatCurrency(summary.damageValue)}</div></div>
      <div class="summary-card"><div class="summary-label">Approved</div><div class="summary-value">${summary.approvedCount}</div></div>
    </div>
    <table>
      <thead><tr><th>Date</th><th>Note #</th><th>Taken By</th><th>Type</th><th>Reason</th><th>Items</th><th>Value</th><th>Status</th></tr></thead>
      <tbody>${filtered.map(n => `<tr><td>${n.date}</td><td>${n.noteNumber}</td><td>${n.takenBy}</td><td>${getPersonTypeLabel(n.personType)}</td><td>${getReasonLabel(n.reason)}</td><td>${n.items.length}</td><td>${formatCurrency(n.totalAmount)}</td><td>${n.status.toUpperCase()}</td></tr>`).join('')}</tbody>
    </table>
    </body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.focus(); }
  };

  const handleExportExcel = () => {
    const rows = filtered.map(n => ({
      'Date': n.date,
      'Note #': n.noteNumber,
      'Taken By': n.takenBy,
      'Person Type': getPersonTypeLabel(n.personType),
      'Department': n.department || '',
      'Reason': getReasonLabel(n.reason),
      'Items': n.items.length,
      'Total Value': n.totalAmount,
      'Status': n.status,
      'Prepared By': n.preparedBy || '',
      'Approved By': n.approvedBy || ''
    }));
    ExportUtils.exportToXLS(rows, `Internal_Consumption_Report_${dateFrom}_${dateTo}`);
  };

  const handleShare = () => {
    const lines = [
      `INTERNAL CONSUMPTION REPORT`,
      `Period: ${dateFrom} to ${dateTo}`,
      ``,
      `Summary:`,
      `Total Notes: ${summary.totalNotes}`,
      `Total Value: ${formatCurrency(summary.totalValue)}`,
      `Damage Value: ${formatCurrency(summary.damageValue)}`,
      `Approved: ${summary.approvedCount}`,
      `Pending: ${summary.pendingCount}`,
      `Rejected: ${summary.rejectedCount}`,
      ``,
      `By Person:`,
      ...Object.entries(summary.byPerson).map(([name, data]) => `  ${name}: ${data.count} note(s) — ${formatCurrency(data.value)}`),
      ``,
      `By Reason:`,
      ...Object.entries(summary.byReason).map(([reason, data]) => `  ${reason}: ${data.count} note(s) — ${formatCurrency(data.value)}`),
      ``,
      `Details:`,
      ...filtered.map(n => `  ${n.date} | ${n.noteNumber} | ${n.takenBy} | ${getReasonLabel(n.reason)} | ${formatCurrency(n.totalAmount)} | ${n.status}`)
    ];
    const text = lines.join('\n');
    if (navigator.share) {
      navigator.share({ title: 'Internal Consumption Report', text });
    } else {
      navigator.clipboard.writeText(text);
      toast({ title: 'Copied', description: 'Report copied to clipboard' });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p>Loading report data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            Internal Consumption Report
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Analytics and breakdown of all internal consumption by period, person, and reason
          </p>
        </div>
        <Button variant="outline" onClick={onBack}>
          ← Back
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-semibold text-slate-600">Filters</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <label className="text-[10px] font-semibold uppercase text-slate-400">From</label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="mt-1 h-9" />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase text-slate-400">To</label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="mt-1 h-9" />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase text-slate-400">Person</label>
              <Select value={filterPerson} onValueChange={setFilterPerson}>
                <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="All persons" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Persons</SelectItem>
                  {uniquePersons.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase text-slate-400">Person Type</label>
              <Select value={filterPersonType} onValueChange={setFilterPersonType}>
                <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="investor">Investor</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase text-slate-400">Reason</label>
              <Select value={filterReason} onValueChange={setFilterReason}>
                <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reasons</SelectItem>
                  <SelectItem value="consumption">Internal Consumption</SelectItem>
                  <SelectItem value="damage">Damage/Loss</SelectItem>
                  <SelectItem value="benefit">Employee Benefit</SelectItem>
                  <SelectItem value="owner_draw">Owner/Investor Draw</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-3 relative max-w-sm">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              className="pl-9 h-9"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-slate-500">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-100">
              <FileText className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{summary.totalNotes}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Total Notes</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-400">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50">
              <TrendingUp className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-700">{formatCurrency(summary.totalValue)}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Total Value</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-400">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-50">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-red-700">{formatCurrency(summary.damageValue)}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Damage Value</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-400">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50">
              <Package className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-700">{summary.approvedCount}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Approved</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* By Person */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-bold uppercase tracking-wider text-slate-600">By Person</span>
            </div>
            {Object.entries(summary.byPerson).length === 0 ? (
              <p className="text-sm text-muted-foreground">No data</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(summary.byPerson).sort((a, b) => b[1].value - a[1].value).map(([name, data]) => (
                  <div key={name} className="flex justify-between items-center bg-slate-50 rounded-lg px-3 py-2">
                    <div>
                      <div className="text-sm font-medium">{name}</div>
                      <div className="text-[10px] text-slate-400">{data.count} note(s)</div>
                    </div>
                    <div className="text-sm font-bold text-amber-700">{formatCurrency(data.value)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* By Reason */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-bold uppercase tracking-wider text-slate-600">By Reason</span>
            </div>
            {Object.entries(summary.byReason).length === 0 ? (
              <p className="text-sm text-muted-foreground">No data</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(summary.byReason).sort((a, b) => b[1].value - a[1].value).map(([reason, data]) => (
                  <div key={reason} className={`flex justify-between items-center rounded-lg px-3 py-2 ${reason === 'Damage/Loss' ? 'bg-red-50 border border-red-200' : 'bg-slate-50'}`}>
                    <div>
                      <div className="text-sm font-medium">{reason}</div>
                      <div className="text-[10px] text-slate-400">{data.count} note(s)</div>
                    </div>
                    <div className={`text-sm font-bold ${reason === 'Damage/Loss' ? 'text-red-700' : 'text-amber-700'}`}>{formatCurrency(data.value)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* By Person Type */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-bold uppercase tracking-wider text-slate-600">By Person Type</span>
            </div>
            {Object.entries(summary.byPersonType).length === 0 ? (
              <p className="text-sm text-muted-foreground">No data</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(summary.byPersonType).sort((a, b) => b[1].value - a[1].value).map(([type, data]) => (
                  <div key={type} className="flex justify-between items-center bg-slate-50 rounded-lg px-3 py-2">
                    <div>
                      <div className="text-sm font-medium">{type}</div>
                      <div className="text-[10px] text-slate-400">{data.count} note(s)</div>
                    </div>
                    <div className="text-sm font-bold text-amber-700">{formatCurrency(data.value)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Export Actions */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={handleExportPDF}>
          <Download className="h-4 w-4 mr-2" /> Export PDF
        </Button>
        <Button variant="outline" onClick={handleExportExcel}>
          <FileText className="h-4 w-4 mr-2" /> Export Excel
        </Button>
        <Button variant="outline" onClick={handleShare}>
          <Share2 className="h-4 w-4 mr-2" /> Share
        </Button>
      </div>

      {/* Details Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase text-slate-500">Date</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase text-slate-500">Note #</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase text-slate-500">Taken By</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase text-slate-500">Type</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase text-slate-500">Reason</th>
                  <th className="text-center px-4 py-3 text-[10px] font-bold uppercase text-slate-500">Items</th>
                  <th className="text-right px-4 py-3 text-[10px] font-bold uppercase text-slate-500">Value</th>
                  <th className="text-center px-4 py-3 text-[10px] font-bold uppercase text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      No records match the current filters
                    </td>
                  </tr>
                ) : (
                  filtered.map(n => (
                    <tr key={n.id} className="border-b hover:bg-slate-50">
                      <td className="px-4 py-3">{n.date}</td>
                      <td className="px-4 py-3 font-mono font-medium">{n.noteNumber}</td>
                      <td className="px-4 py-3">{n.takenBy}</td>
                      <td className="px-4 py-3 text-xs">{getPersonTypeLabel(n.personType)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          n.reason === 'damage' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {getReasonLabel(n.reason)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">{n.items.length}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatCurrency(n.totalAmount)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          n.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                          n.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {n.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {filtered.length > 0 && (
                <tfoot className="bg-slate-50">
                  <tr>
                    <td colSpan={6} className="px-4 py-3 text-right font-bold text-slate-600">TOTAL ({filtered.length} records)</td>
                    <td className="px-4 py-3 text-right font-extrabold text-amber-700 text-lg">
                      {formatCurrency(filtered.reduce((sum, n) => sum + (n.totalAmount || 0), 0))}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
