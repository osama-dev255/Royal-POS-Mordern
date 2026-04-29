import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Mail, 
  Calendar as CalendarIcon,
  Search, 
  Download, 
  Filter, 
  Printer, 
  TrendingUp,
  TrendingDown,
  DollarSign,
  X,
  FileText,
  Share2,
  FileSpreadsheet
} from "lucide-react";
import { getOutletDebtsByCustomerId, getOutletDebtPaymentsByDebtId, OutletCustomer, OutletDebt } from "@/services/databaseService";
import { formatCurrency } from "@/lib/currency";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CustomerLedgerProps {
  customer: OutletCustomer;
  outletId: string;
  onBack: () => void;
}

interface LedgerEntry {
  id: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  type: 'sale' | 'payment';
  reference: string;
}

export const CustomerLedger = ({ customer, outletId, onBack }: CustomerLedgerProps) => {
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalDebits, setTotalDebits] = useState(0);
  const [totalCredits, setTotalCredits] = useState(0);
  const [currentBalance, setCurrentBalance] = useState(0);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [filteredEntries, setFilteredEntries] = useState<LedgerEntry[]>([]);

  useEffect(() => {
    loadLedgerData();
  }, [customer.id, outletId]);

  const loadLedgerData = async () => {
    try {
      setLoading(true);
      const entries: LedgerEntry[] = [];

      // Fetch all debts (sales) for this customer
      const debts = await getOutletDebtsByCustomerId(outletId, customer.id!);
      
      // Add debt entries (debits) and fetch payments for each debt
      for (const debt of debts) {
        entries.push({
          id: `debt-${debt.id}`,
          date: new Date(debt.created_at || debt.debt_date || new Date().toISOString()).toLocaleDateString(),
          description: `Sale - ${debt.payment_status || 'Completed'}`,
          debit: debt.total_amount || 0,
          credit: 0,
          balance: 0, // Will calculate after sorting
          type: 'sale',
          reference: debt.id
        });

        // Fetch payments for this debt
        const payments = await getOutletDebtPaymentsByDebtId(debt.id);
        payments.forEach(payment => {
          entries.push({
            id: `payment-${payment.id}`,
            date: new Date(payment.payment_date).toLocaleDateString(),
            description: `Payment - ${payment.payment_method || 'Cash'}`,
            debit: 0,
            credit: payment.amount || 0,
            balance: 0, // Will calculate after sorting
            type: 'payment',
            reference: payment.id
          });
        });
      }

      // Sort by date
      entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Calculate running balance
      let runningBalance = 0;
      entries.forEach(entry => {
        runningBalance += entry.debit - entry.credit;
        entry.balance = runningBalance;
      });

      setLedgerEntries(entries);

      // Calculate totals
      const debits = entries.reduce((sum, entry) => sum + entry.debit, 0);
      const credits = entries.reduce((sum, entry) => sum + entry.credit, 0);
      
      setTotalDebits(debits);
      setTotalCredits(credits);
      setCurrentBalance(runningBalance);

    } catch (error) {
      console.error('Error loading ledger data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter entries based on search term and date range
  useEffect(() => {
    let filtered = [...ledgerEntries];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(entry =>
        entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply date range filter
    if (dateFrom) {
      filtered = filtered.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= dateFrom;
      });
    }

    if (dateTo) {
      // Make end date inclusive (end of day)
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate <= endDate;
      });
    }

    setFilteredEntries(filtered);
  }, [searchTerm, dateFrom, dateTo, ledgerEntries]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Date', 'Description', 'Debit', 'Credit', 'Balance'];
    const csvData = filteredEntries.map(entry => [
      entry.date,
      entry.description,
      entry.debit.toFixed(2),
      entry.credit.toFixed(2),
      entry.balance.toFixed(2)
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${customer.first_name}_${customer.last_name}_ledger_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Export to Excel (XLS)
  const handleExportExcel = () => {
    // Create Excel-compatible HTML table
    const tableContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Customer Ledger</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
      </head>
      <body>
        <h2>Customer Ledger - ${customer.first_name} ${customer.last_name}</h2>
        <table border="1">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Debit (Sales)</th>
              <th>Credit (Payments)</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            ${filteredEntries.map(entry => `
              <tr>
                <td>${entry.date}</td>
                <td>${entry.description}</td>
                <td>${entry.debit > 0 ? entry.debit.toFixed(2) : '-'}</td>
                <td>${entry.credit > 0 ? entry.credit.toFixed(2) : '-'}</td>
                <td>${entry.balance.toFixed(2)} ${entry.balance > 0 ? 'Dr' : entry.balance < 0 ? 'Cr' : ''}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2"><strong>Totals</strong></td>
              <td><strong>${totalDebits.toFixed(2)}</strong></td>
              <td><strong>${totalCredits.toFixed(2)}</strong></td>
              <td><strong>${currentBalance.toFixed(2)} ${currentBalance > 0 ? 'Dr' : currentBalance < 0 ? 'Cr' : ''}</strong></td>
            </tr>
          </tfoot>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([tableContent], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${customer.first_name}_${customer.last_name}_ledger_${new Date().toISOString().split('T')[0]}.xls`;
    link.click();
  };

  // Download as PDF
  const handleDownloadPDF = () => {
    window.print();
  };

  // Share as PDF
  const handleSharePDF = async () => {
    if (navigator.share) {
      try {
        // Create a simple text representation for sharing
        const shareText = `Customer Ledger - ${customer.first_name} ${customer.last_name}\n\n` +
          `Total Debits: ${formatCurrency(totalDebits)}\n` +
          `Total Credits: ${formatCurrency(totalCredits)}\n` +
          `Current Balance: ${formatCurrency(Math.abs(currentBalance))} ${currentBalance > 0 ? '(OWES)' : currentBalance < 0 ? '(CREDIT)' : '(CLEARED)'}\n\n` +
          `Transactions:\n` +
          filteredEntries.map(entry => 
            `${entry.date} - ${entry.description} - Debit: ${entry.debit > 0 ? formatCurrency(entry.debit) : '-'} - Credit: ${entry.credit > 0 ? formatCurrency(entry.credit) : '-'} - Balance: ${formatCurrency(Math.abs(entry.balance))}`
          ).join('\n');

        await navigator.share({
          title: `Customer Ledger - ${customer.first_name} ${customer.last_name}`,
          text: shareText,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback: Copy to clipboard
      const shareText = `Customer Ledger - ${customer.first_name} ${customer.last_name}\n\n` +
        `Total Debits: ${formatCurrency(totalDebits)}\n` +
        `Total Credits: ${formatCurrency(totalCredits)}\n` +
        `Current Balance: ${formatCurrency(Math.abs(currentBalance))}`;
      
      navigator.clipboard.writeText(shareText);
      alert('Ledger summary copied to clipboard!');
    }
  };

  // Print Ledger
  const handlePrint = () => {
    window.print();
  };

  // Clear filters
  const clearFilters = () => {
    setSearchTerm('');
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-TZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading ledger...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Customers
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <User className="h-6 w-6" />
              {customer.first_name} {customer.last_name}
            </h1>
            <p className="text-muted-foreground">Customer Ledger Account</p>
          </div>
        </div>
      </div>

      {/* Customer Info */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {customer.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{customer.phone}</span>
              </div>
            )}
            {customer.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{customer.email}</span>
              </div>
            )}
            {customer.address && (
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span>{customer.address}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Search, Date Range, and Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search Bar */}
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Date Range Picker */}
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={dateFrom ? "default" : "outline"}
                    size="sm"
                    className="w-[140px] justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? dateFrom.toLocaleDateString() : "From Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={dateTo ? "default" : "outline"}
                    size="sm"
                    className="w-[140px] justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? dateTo.toLocaleDateString() : "To Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {(dateFrom || dateTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDateFrom(undefined);
                    setDateTo(undefined);
                  }}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Actions Button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDownloadPDF}>
                  <FileText className="h-4 w-4 mr-2" />
                  Download in .pdf
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSharePDF}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share in .pdf
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportExcel}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export in .xls
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Export to CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print Ledger
                </DropdownMenuItem>
                <DropdownMenuItem onClick={clearFilters}>
                  <Search className="h-4 w-4 mr-2" />
                  Clear Filters
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Debits (Sales)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {formatCurrency(totalDebits)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Credits (Payments)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              {formatCurrency(totalCredits)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold flex items-center gap-2 ${currentBalance > 0 ? 'text-red-600' : currentBalance < 0 ? 'text-green-600' : 'text-gray-600'}`}>
              <DollarSign className="h-5 w-5" />
              {formatCurrency(Math.abs(currentBalance))}
              {currentBalance > 0 && <Badge variant="destructive">OWES</Badge>}
              {currentBalance < 0 && <Badge variant="default">CREDIT</Badge>}
              {currentBalance === 0 && <Badge variant="outline">CLEARED</Badge>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* T-Account Ledger */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ledger Account</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-300">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Description</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Debit (Sales)</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Credit (Payments)</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Balance</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                      {ledgerEntries.length === 0 ? 'No transactions found for this customer' : 'No transactions match your filters'}
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry, index) => (
                    <tr 
                      key={entry.id} 
                      className={`border-b hover:bg-gray-50 ${entry.type === 'sale' ? 'bg-red-50/30' : 'bg-green-50/30'}`}
                    >
                      <td className="px-4 py-3 text-sm">{entry.date}</td>
                      <td className="px-4 py-3 text-sm font-medium">{entry.description}</td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-red-600">
                        {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">
                        {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                      </td>
                      <td className={`px-4 py-3 text-sm text-right font-bold ${entry.balance > 0 ? 'text-red-600' : entry.balance < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                        {formatCurrency(Math.abs(entry.balance))} {entry.balance > 0 ? 'Dr' : entry.balance < 0 ? 'Cr' : ''}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 border-t-2 border-gray-300 font-bold">
                  <td colSpan={2} className="px-4 py-3 text-sm">Totals</td>
                  <td className="px-4 py-3 text-sm text-right text-red-600">{formatCurrency(totalDebits)}</td>
                  <td className="px-4 py-3 text-sm text-right text-green-600">{formatCurrency(totalCredits)}</td>
                  <td className={`px-4 py-3 text-sm text-right ${currentBalance > 0 ? 'text-red-600' : currentBalance < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                    {formatCurrency(Math.abs(currentBalance))} {currentBalance > 0 ? 'Dr' : currentBalance < 0 ? 'Cr' : ''}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
