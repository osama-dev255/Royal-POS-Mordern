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
import { Search, Plus, Wallet, Calendar, CreditCard, TrendingUp, TrendingDown, ArrowRightLeft, RefreshCw } from "lucide-react";
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
  }>({
    supplier_name: "",
    supplier_id: "",
    amount: 0,
    paymentMethod: paymentMethods[0],
    reference_number: "",
    notes: "",
    date: new Date().toISOString().split('T')[0],
    transaction_type: "settlement",
  });

  const { toast } = useToast();

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

    const result = await recordSupplierLedgerEntry({
      supplier_id: newEntry.supplier_id || newEntry.supplier_name,
      supplier_name: newEntry.supplier_name,
      transaction_type: newEntry.transaction_type,
      reference_number: newEntry.reference_number || `STL-${Date.now()}`,
      debit_amount: newEntry.transaction_type === 'settlement' || newEntry.transaction_type === 'inventory_payment' ? newEntry.amount : 0,
      credit_amount: newEntry.transaction_type === 'adjustment' || newEntry.transaction_type === 'refund' ? newEntry.amount : 0,
      transaction_date: new Date(newEntry.date).toISOString(),
      description: `${transactionTypeLabels[newEntry.transaction_type]} - ${newEntry.supplier_name}`,
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
                        {Number(entry.debit_amount) > 0 ? formatCurrency(entry.debit_amount) : '-'}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${Number(entry.credit_amount) > 0 ? 'text-green-600' : ''}`}>
                        {Number(entry.credit_amount) > 0 ? formatCurrency(entry.credit_amount) : '-'}
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
      </main>
    </div>
  );
};
