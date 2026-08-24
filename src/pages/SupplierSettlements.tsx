import { useState, useEffect, useCallback } from "react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Wallet, Calendar, CreditCard, TrendingUp, TrendingDown, ArrowRightLeft, RefreshCw, Printer, Download, Share2, FileText, ChevronDown, Eye, Loader2, Receipt } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import {
  getSupplierLedgerByDateRange,
  getSupplierLedgerSummary,
  getUniqueSuppliers,
  recordSupplierLedgerEntry,
  type SupplierLedgerEntry,
  type SupplierLedgerSummary,
} from "@/utils/supplierLedgerUtils";
import { getSavedGRNById } from "@/utils/grnUtils";
import { getSupplierPaymentVoucherById } from "@/utils/supplierPaymentVoucherUtils";
import { getExpenseById } from "@/services/databaseService";

const paymentMethods = [
  "Cash",
  "Credit Card",
  "Debit Card",
  "Bank Transfer",
  "Check",
  "Other"
];

const transactionTypeLabels: Record<string, string> = {
  grn_received: "GRN Received",
  inventory_payment: "Inventory Payment",
  settlement: "Settlement",
  adjustment: "Adjustment",
  refund: "Refund",
};

const transactionTypeBadgeVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  grn_received: "default",
  inventory_payment: "destructive",
  settlement: "secondary",
  adjustment: "outline",
  refund: "default",
};

export const SupplierSettlements = ({ username, onBack, onLogout }: { username: string; onBack: () => void; onLogout: () => void }) => {
  const [ledgerEntries, setLedgerEntries] = useState<SupplierLedgerEntry[]>([]);
  const [supplierSummaries, setSupplierSummaries] = useState<SupplierLedgerSummary[]>([]);
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateRange, setDateRange] = useState({
    start: '2020-01-01',
    end: '2099-12-31'
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newEntry, setNewEntry] = useState<{
    supplier_name: string;
    supplier_id: string;
    amount: number;
    paymentMethod: string;
    reference_number: string;
    notes: string;
    date: string;
    transaction_type: 'settlement' | 'inventory_payment' | 'adjustment' | 'refund';
    adjustment_direction: 'debit' | 'credit';
  }>({
    supplier_name: "",
    supplier_id: "",
    amount: 0,
    paymentMethod: paymentMethods[0],
    reference_number: "",
    notes: "",
    date: new Date().toISOString().split('T')[0],
    transaction_type: "settlement",
    adjustment_direction: "debit",
  });

  const { toast } = useToast();

  // View transaction dialog state
  const [viewEntry, setViewEntry] = useState<SupplierLedgerEntry | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [transactionDetails, setTransactionDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // ── Data Fetching ──────────────────────────────────────────────────────────

  const fetchLedger = useCallback(async () => {
    setLoading(true);
    try {
      const [entries, summaries, uniqueSuppliers] = await Promise.all([
        getSupplierLedgerByDateRange(dateRange.start, dateRange.end, supplierFilter !== "all" ? supplierFilter : undefined),
        getSupplierLedgerSummary(),
        getUniqueSuppliers(),
      ]);
      setLedgerEntries(entries);
      setSupplierSummaries(summaries);
      setSuppliers(uniqueSuppliers);
    } catch (error) {
      console.error('Error fetching ledger data:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange.start, dateRange.end, supplierFilter]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  // Listen for supplier ledger updates from other components (GRN save, expense save)
  useEffect(() => {
    const handleLedgerUpdate = () => {
      fetchLedger();
    };
    window.addEventListener('supplierLedgerUpdated', handleLedgerUpdate);
    return () => window.removeEventListener('supplierLedgerUpdated', handleLedgerUpdate);
  }, [fetchLedger]);

  // ── Filtered Entries ───────────────────────────────────────────────────────

  const filteredEntries = ledgerEntries.filter(entry => {
    const matchesSearch = !searchTerm ||
      (entry.reference_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entry.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entry.supplier_name || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === "all" || entry.transaction_type === typeFilter;

    return matchesSearch && matchesType;
  });

  // ── Totals ─────────────────────────────────────────────────────────────────

  const totalCredit = filteredEntries.reduce((sum, e) => sum + (Number(e.credit_amount) || 0), 0);
  const totalDebit = filteredEntries.reduce((sum, e) => sum + (Number(e.debit_amount) || 0), 0);
  const outstandingBalance = totalCredit - totalDebit;

  // Open the view dialog and fetch the underlying transaction record
  const handleViewTransaction = async (entry: SupplierLedgerEntry) => {
    setViewEntry(entry);
    setIsViewDialogOpen(true);
    setTransactionDetails(null);
    setLoadingDetails(true);

    try {
      if (!entry.reference_id) {
        setLoadingDetails(false);
        return;
      }

      switch (entry.transaction_type) {
        case 'grn_received': {
          const grn = await getSavedGRNById(entry.reference_id);
          setTransactionDetails(grn);
          break;
        }
        case 'inventory_payment': {
          const expense = await getExpenseById(entry.reference_id);
          setTransactionDetails(expense);
          break;
        }
        case 'settlement': {
          const voucher = await getSupplierPaymentVoucherById(entry.reference_id);
          setTransactionDetails(voucher);
          break;
        }
        default:
          // adjustment, refund — no underlying record to fetch
          break;
      }
    } catch (error) {
      console.error('Error fetching transaction details:', error);
      toast({
        title: "Error",
        description: "Failed to load transaction details",
        variant: "destructive"
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  // ── Export Handlers ────────────────────────────────────────────────────────

  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rowsHtml = filteredEntries.map(entry => `
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">${new Date(entry.transaction_date).toLocaleDateString()}</td>
        <td style="padding:8px;border:1px solid #ddd;">${entry.reference_number || '-'}</td>
        <td style="padding:8px;border:1px solid #ddd;">${entry.description || '-'}</td>
        <td style="padding:8px;border:1px solid #ddd;">${entry.supplier_name}</td>
        <td style="padding:8px;border:1px solid #ddd;">${transactionTypeLabels[entry.transaction_type] || entry.transaction_type}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">${Number(entry.debit_amount) > 0 ? formatCurrency(entry.debit_amount) : '-'}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">${Number(entry.credit_amount) > 0 ? formatCurrency(entry.credit_amount) : '-'}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;font-weight:bold;">${formatCurrency(Math.abs(Number(entry.running_balance) || 0))}${Number(entry.running_balance) >= 0 ? ' CR' : ' DR'}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Supplier Ledger Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { text-align: center; color: #333; }
          .summary { display: flex; justify-content: space-between; margin: 20px 0; }
          .summary-box { padding: 10px 20px; border: 1px solid #ddd; border-radius: 5px; text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
          th { background: #f59e0b; color: white; padding: 10px; text-align: left; }
          .total-row { font-weight: bold; background: #f9f9f9; }
          @media print { body { padding: 0; } .no-print { display: none; } }
        </style>
      </head>
      <body>
        <h1>Supplier Ledger (DR / CR)</h1>
        <div class="summary">
          <div class="summary-box"><strong>Total Payable (CR):</strong> ${formatCurrency(totalCredit)}</div>
          <div class="summary-box"><strong>Total Paid (DR):</strong> ${formatCurrency(totalDebit)}</div>
          <div class="summary-box"><strong>Outstanding:</strong> ${formatCurrency(Math.abs(outstandingBalance))}${outstandingBalance >= 0 ? ' CR' : ' DR'}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th><th>Reference</th><th>Description</th><th>Supplier</th><th>Type</th>
              <th style="text-align:right;">Debit (DR)</th><th style="text-align:right;">Credit (CR)</th><th style="text-align:right;">Balance</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
            <tr class="total-row">
              <td colspan="5" style="text-align:right;padding:8px;border:1px solid #ddd;">TOTALS</td>
              <td style="padding:8px;border:1px solid #ddd;text-align:right;color:#dc2626;">${formatCurrency(totalDebit)}</td>
              <td style="padding:8px;border:1px solid #ddd;text-align:right;color:#16a34a;">${formatCurrency(totalCredit)}</td>
              <td style="padding:8px;border:1px solid #ddd;text-align:right;font-weight:bold;">${formatCurrency(Math.abs(outstandingBalance))}${outstandingBalance >= 0 ? ' CR' : ' DR'}</td>
            </tr>
          </tbody>
        </table>
        <div style="margin-top:20px;text-align:center;" class="no-print">
          <button onclick="window.print()" style="padding:10px 20px;background:#f59e0b;color:white;border:none;border-radius:5px;cursor:pointer;">Print</button>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Supplier Ledger (DR / CR)', 14, 20);
    doc.setFontSize(10);
    doc.text(`Total Payable (CR): ${formatCurrency(totalCredit)}`, 14, 30);
    doc.text(`Total Paid (DR): ${formatCurrency(totalDebit)}`, 14, 36);
    doc.text(`Outstanding: ${formatCurrency(Math.abs(outstandingBalance))}${outstandingBalance >= 0 ? ' CR' : ' DR'}`, 14, 42);

    const tableData = filteredEntries.map(entry => [
      new Date(entry.transaction_date).toLocaleDateString(),
      entry.reference_number || '-',
      entry.supplier_name,
      transactionTypeLabels[entry.transaction_type] || entry.transaction_type,
      Number(entry.debit_amount) > 0 ? formatCurrency(entry.debit_amount) : '-',
      Number(entry.credit_amount) > 0 ? formatCurrency(entry.credit_amount) : '-',
      `${formatCurrency(Math.abs(Number(entry.running_balance) || 0))}${Number(entry.running_balance) >= 0 ? ' CR' : ' DR'}`,
    ]);

    autoTable(doc, {
      startY: 50,
      head: [['Date', 'Reference', 'Supplier', 'Type', 'Debit (DR)', 'Credit (CR)', 'Balance']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [245, 158, 11] },
    });

    doc.save('Supplier_Ledger_Report.pdf');
    toast({ title: "Download Started", description: "Downloading supplier ledger as PDF" });
  };

  const handleExportXLS = () => {
    let csvContent = "Date,Reference,Description,Supplier,Type,Debit (DR),Credit (CR),Balance\n";
    filteredEntries.forEach(entry => {
      csvContent += `${new Date(entry.transaction_date).toLocaleDateString()},${entry.reference_number || '-'},"${(entry.description || '').replace(/"/g, '""')}",${entry.supplier_name},${transactionTypeLabels[entry.transaction_type] || entry.transaction_type},${Number(entry.debit_amount) || 0},${Number(entry.credit_amount) || 0},${Number(entry.running_balance) || 0}\n`;
    });
    csvContent += `\nTOTALS,,,,,${totalDebit},${totalCredit},${outstandingBalance}\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'Supplier_Ledger_Report.csv';
    link.click();
    toast({ title: "Export Started", description: "Exporting supplier ledger as CSV" });
  };

  const handleSharePDF = async () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text('Supplier Ledger (DR / CR)', 14, 20);
      doc.setFontSize(10);
      doc.text(`Total Payable (CR): ${formatCurrency(totalCredit)}`, 14, 30);
      doc.text(`Total Paid (DR): ${formatCurrency(totalDebit)}`, 14, 36);
      doc.text(`Outstanding: ${formatCurrency(Math.abs(outstandingBalance))}${outstandingBalance >= 0 ? ' CR' : ' DR'}`, 14, 42);

      const tableData = filteredEntries.map(entry => [
        new Date(entry.transaction_date).toLocaleDateString(),
        entry.reference_number || '-',
        entry.supplier_name,
        transactionTypeLabels[entry.transaction_type] || entry.transaction_type,
        Number(entry.debit_amount) > 0 ? formatCurrency(entry.debit_amount) : '-',
        Number(entry.credit_amount) > 0 ? formatCurrency(entry.credit_amount) : '-',
        `${formatCurrency(Math.abs(Number(entry.running_balance) || 0))}${Number(entry.running_balance) >= 0 ? ' CR' : ' DR'}`,
      ]);

      autoTable(doc, {
        startY: 50,
        head: [['Date', 'Reference', 'Supplier', 'Type', 'Debit (DR)', 'Credit (CR)', 'Balance']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [245, 158, 11] },
      });

      const pdfBlob = doc.output('blob');
      const file = new File([pdfBlob], 'Supplier_Ledger_Report.pdf', { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Supplier Ledger Report',
          text: `Supplier Ledger with ${filteredEntries.length} entries`
        });
        toast({ title: "Shared Successfully", description: "Supplier ledger has been shared" });
      } else {
        handleDownloadPDF();
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Share error:', error);
        handleDownloadPDF();
      }
    }
  };

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleRecordSettlement = async () => {
    if (!newEntry.supplier_name || newEntry.amount <= 0) {
      toast({
        title: "Error",
        description: "Please fill in supplier name and amount",
        variant: "destructive"
      });
      return;
    }

    const isDR = newEntry.transaction_type === 'settlement'
      || newEntry.transaction_type === 'inventory_payment'
      || (newEntry.transaction_type === 'adjustment' && newEntry.adjustment_direction === 'debit');
    const isCR = !isDR;

    const result = await recordSupplierLedgerEntry({
      supplier_id: newEntry.supplier_id || newEntry.supplier_name,
      supplier_name: newEntry.supplier_name,
      transaction_type: newEntry.transaction_type,
      reference_number: newEntry.reference_number || `STL-${Date.now()}`,
      debit_amount: isDR ? newEntry.amount : 0,
      credit_amount: isCR ? newEntry.amount : 0,
      transaction_date: new Date(newEntry.date).toISOString(),
      description: `${transactionTypeLabels[newEntry.transaction_type]}${newEntry.transaction_type === 'adjustment' ? (newEntry.adjustment_direction === 'debit' ? ' (DR)' : ' (CR)') : ''} - ${newEntry.supplier_name}`,
      payment_method: newEntry.paymentMethod,
      notes: newEntry.notes,
    });

    if (result) {
      toast({
        title: "Success",
        description: "Supplier ledger entry recorded successfully"
      });
      resetForm();
      setIsDialogOpen(false);
      fetchLedger();
    } else {
      toast({
        title: "Error",
        description: "Failed to record ledger entry. Please try again.",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setNewEntry({
      supplier_name: "",
      supplier_id: "",
      amount: 0,
      paymentMethod: paymentMethods[0],
      reference_number: "",
      notes: "",
      date: new Date().toISOString().split('T')[0],
      transaction_type: "settlement",
      adjustment_direction: "debit",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation
        title="Supplier Settlements"
        onBack={onBack}
        onLogout={onLogout}
        username={username}
      />

      <main className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold">Supplier Ledger (DR / CR)</h2>
            <p className="text-muted-foreground">Track supplier payables: GRN received (CR) and inventory payments (DR)</p>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {/* Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <FileText className="h-4 w-4 mr-2" />
                  Actions
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handlePrintReport}>
                  <Printer className="h-4 w-4 mr-2" />
                  <span>Print</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportXLS}>
                  <FileText className="h-4 w-4 mr-2" />
                  <span>Export .xls</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadPDF}>
                  <Download className="h-4 w-4 mr-2" />
                  <span>Download .pdf</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSharePDF}>
                  <Share2 className="h-4 w-4 mr-2" />
                  <span>Share</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" size="sm" onClick={fetchLedger}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>

            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Record Entry
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Record Supplier Ledger Entry</DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="transaction_type">Transaction Type *</Label>
                    <Select
                      value={newEntry.transaction_type}
                      onValueChange={(value: any) => setNewEntry({ ...newEntry, transaction_type: value })}
                    >
                      <SelectTrigger id="transaction_type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="settlement">Settlement (DR - Pay Supplier)</SelectItem>
                        <SelectItem value="inventory_payment">Inventory Payment (DR)</SelectItem>
                        <SelectItem value="adjustment">Adjustment (DR or CR)</SelectItem>
                        <SelectItem value="refund">Refund (CR)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {newEntry.transaction_type === 'adjustment' && (
                    <div className="grid gap-2">
                      <Label>Adjustment Direction *</Label>
                      <Select
                        value={newEntry.adjustment_direction}
                        onValueChange={(value: any) => setNewEntry({ ...newEntry, adjustment_direction: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="debit">DR — Debit (reduces what we owe)</SelectItem>
                          <SelectItem value="credit">CR — Credit (increases what we owe)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {newEntry.adjustment_direction === 'debit'
                          ? 'Use DR to decrease the outstanding balance (e.g. discount received, debt forgiven).'
                          : 'Use CR to increase the outstanding balance (e.g. additional charges, price correction).'}
                      </p>
                    </div>
                  )}

                  <div className="grid gap-2">
                    <Label htmlFor="supplier_name">Supplier Name *</Label>
                    <Input
                      id="supplier_name"
                      value={newEntry.supplier_name}
                      onChange={(e) => {
                        const name = e.target.value;
                        const match = suppliers.find(s => s.name === name);
                        setNewEntry({ ...newEntry, supplier_name: name, supplier_id: match?.id || name });
                      }}
                      placeholder="Type supplier name..."
                      list="supplier-names"
                    />
                    <datalist id="supplier-names">
                      {suppliers.map(s => <option key={s.id} value={s.name} />)}
                    </datalist>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="date">Date *</Label>
                      <Input
                        id="date"
                        type="date"
                        value={newEntry.date}
                        onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="amount">Amount *</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">TZS</span>
                        <Input
                          id="amount"
                          type="number"
                          step="0.01"
                          className="pl-8"
                          value={newEntry.amount}
                          onChange={(e) => setNewEntry({ ...newEntry, amount: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="reference_number">Reference Number</Label>
                    <Input
                      id="reference_number"
                      value={newEntry.reference_number}
                      onChange={(e) => setNewEntry({ ...newEntry, reference_number: e.target.value })}
                      placeholder="e.g. GRN-001, EXP-V001"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="payment_method">Payment Method</Label>
                    <Select
                      value={newEntry.paymentMethod}
                      onValueChange={(value) => setNewEntry({ ...newEntry, paymentMethod: value })}
                    >
                      <SelectTrigger id="payment_method">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentMethods.map(method => (
                          <SelectItem key={method} value={method}>{method}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Input
                      id="notes"
                      value={newEntry.notes}
                      onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })}
                      placeholder="Optional notes..."
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleRecordSettlement}>
                    Record Entry
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters Bar */}
        <Card className="mb-6">
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="w-40"
                />
              </div>
              <span className="text-muted-foreground">to</span>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="w-40"
                />
              </div>

              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search reference, description..."
                  className="pl-8 w-full sm:w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Suppliers</SelectItem>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="grn_received">GRN Received</SelectItem>
                  <SelectItem value="inventory_payment">Inventory Payment</SelectItem>
                  <SelectItem value="settlement">Settlement</SelectItem>
                  <SelectItem value="adjustment">Adjustment</SelectItem>
                  <SelectItem value="refund">Refund</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Payable (CR)</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totalCredit)}</div>
              <p className="text-xs text-muted-foreground">Goods received from suppliers</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Paid (DR)</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(totalDebit)}</div>
              <p className="text-xs text-muted-foreground">Payments to suppliers</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
              <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${outstandingBalance >= 0 ? 'text-orange-600' : 'text-green-600'}`}>
                {formatCurrency(Math.abs(outstandingBalance))}
              </div>
              <p className="text-xs text-muted-foreground">
                {outstandingBalance >= 0 ? 'We owe suppliers' : 'Suppliers owe us'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Supplier Summary Breakdown */}
        {supplierSummaries.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Supplier Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-right">Total CR (Owed)</TableHead>
                    <TableHead className="text-right">Total DR (Paid)</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-center">Entries</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplierSummaries.map((s, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{s.supplier_name}</TableCell>
                      <TableCell className="text-right text-green-600 font-medium">{formatCurrency(s.total_credit)}</TableCell>
                      <TableCell className="text-right text-red-600 font-medium">{formatCurrency(s.total_debit)}</TableCell>
                      <TableCell className={`text-right font-bold ${s.balance >= 0 ? 'text-orange-600' : 'text-green-600'}`}>
                        {formatCurrency(Math.abs(s.balance))}
                        {s.balance >= 0 ? ' CR' : ' DR'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{s.entry_count}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* DR/CR Ledger Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Supplier Ledger Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Debit (DR)</TableHead>
                  <TableHead className="text-right">Credit (CR)</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Loading ledger entries...
                    </TableCell>
                  </TableRow>
                ) : filteredEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No ledger entries found. GRN receipts and inventory payments will appear here automatically.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(entry.transaction_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-medium">{entry.reference_number || '-'}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={entry.description || ''}>
                        {entry.description || '-'}
                      </TableCell>
                      <TableCell>{entry.supplier_name}</TableCell>
                      <TableCell>
                        <Badge variant={transactionTypeBadgeVariant[entry.transaction_type] || "outline"}>
                          {transactionTypeLabels[entry.transaction_type] || entry.transaction_type}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-medium ${Number(entry.debit_amount) > 0 ? 'text-red-600' : ''}`}>
                        {Number(entry.debit_amount) > 0 ? (
                          <div className="flex items-center justify-end gap-1">
                            <span>{formatCurrency(entry.debit_amount)}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-blue-600 hover:text-blue-800"
                              onClick={() => handleViewTransaction(entry)}
                              title="View transaction"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${Number(entry.credit_amount) > 0 ? 'text-green-600' : ''}`}>
                        {Number(entry.credit_amount) > 0 ? (
                          <div className="flex items-center justify-end gap-1">
                            <span>{formatCurrency(entry.credit_amount)}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-blue-600 hover:text-blue-800"
                              onClick={() => handleViewTransaction(entry)}
                              title="View transaction"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell className={`text-right font-bold ${Number(entry.running_balance) >= 0 ? 'text-orange-600' : 'text-green-600'}`}>
                        {formatCurrency(Math.abs(Number(entry.running_balance) || 0))}
                        {Number(entry.running_balance) >= 0 ? ' CR' : ' DR'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>

              {/* Totals Row */}
              {filteredEntries.length > 0 && (
                <tfoot>
                  <TableRow className="border-t-2 font-bold bg-muted/50">
                    <TableCell colSpan={5}>TOTALS</TableCell>
                    <TableCell className="text-right text-red-600">{formatCurrency(totalDebit)}</TableCell>
                    <TableCell className="text-right text-green-600">{formatCurrency(totalCredit)}</TableCell>
                    <TableCell className={`text-right ${outstandingBalance >= 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      {formatCurrency(Math.abs(outstandingBalance))}
                      {outstandingBalance >= 0 ? ' CR' : ' DR'}
                    </TableCell>
                  </TableRow>
                </tfoot>
              )}
            </Table>
          </CardContent>
        </Card>
        {/* View Transaction Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Transaction Details
              </DialogTitle>
            </DialogHeader>

            {loadingDetails ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : viewEntry ? (
              <div className="space-y-4">
                {/* Ledger Entry Summary */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Transaction Type</p>
                    <Badge variant={transactionTypeBadgeVariant[viewEntry.transaction_type] || "outline"}>
                      {transactionTypeLabels[viewEntry.transaction_type] || viewEntry.transaction_type}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-medium">{new Date(viewEntry.transaction_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Supplier</p>
                    <p className="font-medium">{viewEntry.supplier_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Reference No.</p>
                    <p className="font-medium">{viewEntry.reference_number || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Debit (DR)</p>
                    <p className="font-medium text-red-600">{Number(viewEntry.debit_amount) > 0 ? formatCurrency(viewEntry.debit_amount) : '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Credit (CR)</p>
                    <p className="font-medium text-green-600">{Number(viewEntry.credit_amount) > 0 ? formatCurrency(viewEntry.credit_amount) : '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Payment Method</p>
                    <p className="font-medium">{viewEntry.payment_method || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Running Balance</p>
                    <p className={`font-bold ${Number(viewEntry.running_balance) >= 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      {formatCurrency(Math.abs(Number(viewEntry.running_balance) || 0))}
                      {Number(viewEntry.running_balance) >= 0 ? ' CR' : ' DR'}
                    </p>
                  </div>
                </div>

                {/* Type-specific Source Document */}
                {transactionDetails && (
                  <div className="border rounded-lg p-4 space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Receipt className="h-4 w-4" />
                      Source Document — {transactionTypeLabels[viewEntry.transaction_type]}
                    </h4>

                    {/* GRN Received */}
                    {viewEntry.transaction_type === 'grn_received' && transactionDetails && (
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">GRN Number</p>
                          <p className="font-medium">{transactionDetails.grn_number || transactionDetails.name || '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">GRN Date</p>
                          <p className="font-medium">{transactionDetails.date ? new Date(transactionDetails.date).toLocaleDateString() : '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Supplier</p>
                          <p className="font-medium">{transactionDetails.supplier_name || '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Supplier TIN</p>
                          <p className="font-medium">{transactionDetails.supplier_tin_number || transactionDetails.supplier_tin || '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">PO Number</p>
                          <p className="font-medium">{transactionDetails.po_number || '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Delivery Note No.</p>
                          <p className="font-medium">{transactionDetails.delivery_note_number || '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Vehicle Number</p>
                          <p className="font-medium">{transactionDetails.vehicle_number || '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Driver Name</p>
                          <p className="font-medium">{transactionDetails.driver_name || '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Received By</p>
                          <p className="font-medium">{transactionDetails.received_by || '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Status</p>
                          <p className="font-medium">{transactionDetails.status || '-'}</p>
                        </div>
                        {transactionDetails.total != null && (
                          <div className="col-span-2">
                            <p className="text-muted-foreground">Total Amount</p>
                            <p className="font-bold text-lg text-green-600">{formatCurrency(transactionDetails.total)}</p>
                          </div>
                        )}
                        {Array.isArray(transactionDetails.items) && transactionDetails.items.length > 0 && (
                          <div className="col-span-2">
                            <p className="text-muted-foreground mb-1">Items ({transactionDetails.items.length})</p>
                            <div className="border rounded max-h-40 overflow-y-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Qty</TableHead>
                                    <TableHead className="text-right">Unit Cost</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {transactionDetails.items.map((item: any, idx: number) => (
                                    <TableRow key={idx}>
                                      <TableCell className="text-xs">{item.description || item.productName || '-'}</TableCell>
                                      <TableCell className="text-xs text-right">{item.quantity ?? '-'}</TableCell>
                                      <TableCell className="text-xs text-right">{item.unitCost != null ? formatCurrency(item.unitCost) : '-'}</TableCell>
                                      <TableCell className="text-xs text-right">{item.total != null ? formatCurrency(item.total) : '-'}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Inventory Payment (Expense) */}
                    {viewEntry.transaction_type === 'inventory_payment' && transactionDetails && (
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Category</p>
                          <p className="font-medium">{transactionDetails.category || '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Sub-Category</p>
                          <p className="font-medium">{transactionDetails.sub_category || '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Amount</p>
                          <p className="font-bold text-red-600">{formatCurrency(transactionDetails.amount ?? 0)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Payment Method</p>
                          <p className="font-medium">{transactionDetails.payment_method || '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Expense Date</p>
                          <p className="font-medium">{transactionDetails.expense_date ? new Date(transactionDetails.expense_date).toLocaleDateString() : '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Vendor</p>
                          <p className="font-medium">{transactionDetails.vendor_name || '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Approval Status</p>
                          <p className="font-medium">{transactionDetails.approval_status || '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Prepared By</p>
                          <p className="font-medium">{transactionDetails.prepared_by_name || '-'}</p>
                        </div>
                        {transactionDetails.description && (
                          <div className="col-span-2">
                            <p className="text-muted-foreground">Description</p>
                            <p className="text-sm">{transactionDetails.description}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Settlement (Supplier Payment Voucher) */}
                    {viewEntry.transaction_type === 'settlement' && transactionDetails && (
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Voucher Number</p>
                          <p className="font-medium">{transactionDetails.voucher_number || '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Voucher Date</p>
                          <p className="font-medium">{transactionDetails.date ? new Date(transactionDetails.date).toLocaleDateString() : '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Supplier</p>
                          <p className="font-medium">{transactionDetails.supplier_name || '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Supplier TIN</p>
                          <p className="font-medium">{transactionDetails.supplier_tin || '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Linkage Mode</p>
                          <p className="font-medium capitalize">{transactionDetails.linkage_mode || '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Status</p>
                          <p className="font-medium capitalize">{transactionDetails.status || '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total Amount</p>
                          <p className="font-bold text-red-600">{formatCurrency(transactionDetails.total_amount ?? 0)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Previous Balance</p>
                          <p className="font-medium">{formatCurrency(transactionDetails.previous_balance ?? 0)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">New Balance</p>
                          <p className="font-medium">{formatCurrency(transactionDetails.new_balance ?? 0)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Prepared By</p>
                          <p className="font-medium">{transactionDetails.prepared_by || '-'}</p>
                        </div>
                        {Array.isArray(transactionDetails.payment_breakdown) && transactionDetails.payment_breakdown.length > 0 && (
                          <div className="col-span-2">
                            <p className="text-muted-foreground mb-1">Payment Breakdown</p>
                            <div className="border rounded">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Method</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead>Reference</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {transactionDetails.payment_breakdown.map((pb: any, idx: number) => (
                                    <TableRow key={idx}>
                                      <TableCell className="text-xs">{pb.method || '-'}</TableCell>
                                      <TableCell className="text-xs text-right">{formatCurrency(pb.amount ?? 0)}</TableCell>
                                      <TableCell className="text-xs">{pb.reference || '-'}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Ledger Description & Notes */}
                {viewEntry.description && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Ledger Description</p>
                    <p className="text-sm bg-muted/30 p-2 rounded">{viewEntry.description}</p>
                  </div>
                )}
                {viewEntry.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm bg-muted/30 p-2 rounded">{viewEntry.notes}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No transaction data available.</p>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};
