import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  BookOpen,
  Scale,
  Plus,
  Search,
  ArrowLeft,
  RefreshCw,
  DollarSign,
  CreditCard,
  Wallet,
  PieChart,
  BarChart3,
  FileText,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Download,
  Printer,
  Share2
} from "lucide-react";
import {
  getChartOfAccounts,
  getGeneralLedgerEntries,
  getTrialBalance,
  getAccountBalanceSummary,
  ChartOfAccount,
  GeneralLedgerEntry,
} from "@/services/chartOfAccountsService";
import { supabase } from "@/lib/supabaseClient";

interface OutletFinanceProps {
  outletId: string;
  outletName: string;
  onBack: () => void;
}

export const OutletFinance = ({ outletId, outletName, onBack }: OutletFinanceProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Chart of Accounts state
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [accountSearch, setAccountSearch] = useState("");
  const [accountTypeFilter, setAccountTypeFilter] = useState<string>("all");
  const [showAddAccount, setShowAddAccount] = useState(false);
  
  // New account form state
  const [newAccount, setNewAccount] = useState({
    account_code: "",
    account_name: "",
    account_type: "asset" as ChartOfAccount['account_type'],
    account_category: "",
    description: ""
  });
  
  // General Ledger state
  const [ledgerEntries, setLedgerEntries] = useState<GeneralLedgerEntry[]>([]);
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [ledgerDateFrom, setLedgerDateFrom] = useState("");
  const [ledgerDateTo, setLedgerDateTo] = useState("");
  
  // Trial Balance state
  const [trialBalance, setTrialBalance] = useState<any[]>([]);
  const [trialBalanceDate, setTrialBalanceDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Account Balance Summary state
  const [balanceSummary, setBalanceSummary] = useState<any[]>([]);
  
  useEffect(() => {
    if (outletId) {
      loadChartData();
      loadLedgerData();
      loadTrialBalance();
      loadBalanceSummary();
    }
  }, [outletId]);

  const loadChartData = async () => {
    if (!outletId) return;
    setLoading(true);
    try {
      const data = await getChartOfAccounts(outletId);
      setAccounts(data);
    } catch (error) {
      console.error('Error loading chart of accounts:', error);
      toast({
        title: "Error",
        description: "Failed to load chart of accounts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadLedgerData = async () => {
    if (!outletId) return;
    setLoading(true);
    try {
      const data = await getGeneralLedgerEntries(
        outletId,
        undefined,
        ledgerDateFrom || undefined,
        ledgerDateTo || undefined
      );
      setLedgerEntries(data);
    } catch (error) {
      console.error('Error loading ledger:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTrialBalance = async () => {
    if (!outletId) return;
    try {
      const data = await getTrialBalance(outletId, trialBalanceDate || undefined);
      setTrialBalance(data);
    } catch (error) {
      console.error('Error loading trial balance:', error);
    }
  };

  const loadBalanceSummary = async () => {
    if (!outletId) return;
    try {
      const data = await getAccountBalanceSummary(outletId);
      setBalanceSummary(data);
    } catch (error) {
      console.error('Error loading balance summary:', error);
    }
  };

  const refreshAll = () => {
    loadChartData();
    loadLedgerData();
    loadTrialBalance();
    loadBalanceSummary();
    toast({
      title: "Refreshed",
      description: "All financial data has been refreshed"
    });
  };

  const handleCreateAccount = async () => {
    if (!newAccount.account_code || !newAccount.account_name || !newAccount.account_category) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .insert([{
          outlet_id: outletId,
          account_code: newAccount.account_code,
          account_name: newAccount.account_name,
          account_type: newAccount.account_type,
          account_category: newAccount.account_category,
          description: newAccount.description || null
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Account created successfully"
      });

      setShowAddAccount(false);
      setNewAccount({
        account_code: "",
        account_name: "",
        account_type: "asset",
        account_category: "",
        description: ""
      });
      loadChartData();
    } catch (error: any) {
      console.error('Error creating account:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create account",
        variant: "destructive"
      });
    }
  };

  // Filter accounts
  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = account.account_name.toLowerCase().includes(accountSearch.toLowerCase()) ||
      account.account_code.includes(accountSearch);
    const matchesType = accountTypeFilter === "all" || account.account_type === accountTypeFilter;
    return matchesSearch && matchesType;
  });

  // Filter ledger entries
  const filteredLedger = ledgerEntries.filter(entry => {
    const matchesSearch = entry.description?.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
      entry.reference_number?.toLowerCase().includes(ledgerSearch.toLowerCase());
    const entryDate = new Date(entry.transaction_date);
    const matchesDateFrom = !ledgerDateFrom || entryDate >= new Date(ledgerDateFrom);
    const matchesDateTo = !ledgerDateTo || entryDate <= new Date(ledgerDateTo + 'T23:59:59');
    return matchesSearch && matchesDateFrom && matchesDateTo;
  });

  // Calculate totals for trial balance
  const totalDebits = trialBalance.reduce((sum, acc) => sum + (acc.total_debit || 0), 0);
  const totalCredits = trialBalance.reduce((sum, acc) => sum + (acc.total_credit || 0), 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  // Calculate quick stats
  const totalAssets = balanceSummary
    .filter(acc => acc.account_type === 'asset')
    .reduce((sum, acc) => sum + (acc.current_balance || 0), 0);
  
  const totalLiabilities = balanceSummary
    .filter(acc => acc.account_type === 'liability')
    .reduce((sum, acc) => sum + (acc.current_balance || 0), 0);
  
  const totalRevenue = balanceSummary
    .filter(acc => acc.account_type === 'revenue')
    .reduce((sum, acc) => sum + (acc.current_balance || 0), 0);
  
  const totalExpenses = balanceSummary
    .filter(acc => acc.account_type === 'expense')
    .reduce((sum, acc) => sum + (acc.current_balance || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Outlet
          </Button>
          <h2 className="text-2xl md:text-3xl font-bold mb-1">Finance Module</h2>
          <p className="text-muted-foreground">
            {outletName} - Comprehensive financial management
          </p>
        </div>
        <Button
          variant="outline"
          onClick={refreshAll}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Total Assets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${totalAssets.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Current assets value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              Total Liabilities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${totalLiabilities.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Current liabilities</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-600" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Revenue earned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wallet className="h-4 w-4 text-orange-600" />
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              ${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Expenses incurred</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="chart-of-accounts" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="chart-of-accounts">
            <BookOpen className="h-4 w-4 mr-2" />
            Chart of Accounts
          </TabsTrigger>
          <TabsTrigger value="general-ledger">
            <FileText className="h-4 w-4 mr-2" />
            General Ledger
          </TabsTrigger>
          <TabsTrigger value="trial-balance">
            <Scale className="h-4 w-4 mr-2" />
            Trial Balance
          </TabsTrigger>
          <TabsTrigger value="balance-summary">
            <PieChart className="h-4 w-4 mr-2" />
            Balance Summary
          </TabsTrigger>
        </TabsList>

        {/* Chart of Accounts Tab */}
        <TabsContent value="chart-of-accounts" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Chart of Accounts</CardTitle>
                  <CardDescription>
                    Manage your financial account structure
                  </CardDescription>
                </div>
                <Button onClick={() => setShowAddAccount(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Account
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search accounts..."
                      value={accountSearch}
                      onChange={(e) => setAccountSearch(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <Select value={accountTypeFilter} onValueChange={setAccountTypeFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="asset">Assets</SelectItem>
                    <SelectItem value="liability">Liabilities</SelectItem>
                    <SelectItem value="equity">Equity</SelectItem>
                    <SelectItem value="revenue">Revenue</SelectItem>
                    <SelectItem value="expense">Expenses</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Account Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAccounts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          No accounts found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAccounts.map((account) => (
                        <TableRow key={account.id}>
                          <TableCell className="font-mono font-medium">
                            {account.account_code}
                          </TableCell>
                          <TableCell className="font-medium">
                            {account.account_name}
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              account.account_type === 'asset' ? 'default' :
                              account.account_type === 'liability' ? 'secondary' :
                              account.account_type === 'equity' ? 'outline' :
                              account.account_type === 'revenue' ? 'default' : 'destructive'
                            }>
                              {account.account_type.charAt(0).toUpperCase() + account.account_type.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>{account.account_category}</TableCell>
                          <TableCell>
                            <Badge variant={account.is_active !== false ? 'default' : 'secondary'}>
                              {account.is_active !== false ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* General Ledger Tab */}
        <TabsContent value="general-ledger" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Ledger</CardTitle>
              <CardDescription>
                All financial transactions with debit/credit tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search transactions..."
                    value={ledgerSearch}
                    onChange={(e) => setLedgerSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <div>
                  <Label>Date From</Label>
                  <Input
                    type="date"
                    value={ledgerDateFrom}
                    onChange={(e) => {
                      setLedgerDateFrom(e.target.value);
                      setTimeout(() => loadLedgerData(), 100);
                    }}
                  />
                </div>
                <div>
                  <Label>Date To</Label>
                  <Input
                    type="date"
                    value={ledgerDateTo}
                    onChange={(e) => {
                      setLedgerDateTo(e.target.value);
                      setTimeout(() => loadLedgerData(), 100);
                    }}
                  />
                </div>
              </div>

              {/* Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLedger.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          No ledger entries found. Transactions will appear here when recorded.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLedger.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>
                            {new Date(entry.transaction_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {entry.reference_number || '-'}
                          </TableCell>
                          <TableCell>{entry.description || '-'}</TableCell>
                          <TableCell className="text-right font-medium text-blue-600">
                            {entry.debit_amount > 0 ? `$${entry.debit_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium text-green-600">
                            {entry.credit_amount > 0 ? `$${entry.credit_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${entry.running_balance?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trial Balance Tab */}
        <TabsContent value="trial-balance" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Trial Balance</CardTitle>
                  <CardDescription>
                    Verify that total debits equal total credits
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label>As of Date:</Label>
                  <Input
                    type="date"
                    value={trialBalanceDate}
                    onChange={(e) => setTrialBalanceDate(e.target.value)}
                    className="w-[180px]"
                  />
                  <Button variant="outline" size="sm" onClick={loadTrialBalance}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Balance Status */}
              <div className={`p-4 rounded-lg mb-4 ${isBalanced ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-center gap-2">
                  {isBalanced ? (
                    <>
                      <Scale className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-800">✓ Books are Balanced</span>
                    </>
                  ) : (
                    <>
                      <Scale className="h-5 w-5 text-red-600" />
                      <span className="font-medium text-red-800">✗ Books are NOT Balanced - Difference: ${(totalDebits - totalCredits).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account Code</TableHead>
                      <TableHead>Account Name</TableHead>
                      <TableHead className="text-right">Total Debits</TableHead>
                      <TableHead className="text-right">Total Credits</TableHead>
                      <TableHead className="text-right">Net Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trialBalance.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          No data available. Record some transactions first.
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {trialBalance.map((acc, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-mono">{acc.account_code}</TableCell>
                            <TableCell>{acc.account_name}</TableCell>
                            <TableCell className="text-right text-blue-600">
                              ${(acc.total_debit || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right text-green-600">
                              ${(acc.total_credit || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right font-bold">
                              ${((acc.total_debit || 0) - (acc.total_credit || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        ))}
                        {/* Totals Row */}
                        <TableRow className="bg-muted font-bold">
                          <TableCell colSpan={2}>TOTALS</TableCell>
                          <TableCell className="text-right text-blue-600">
                            ${totalDebits.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right text-green-600">
                            ${totalCredits.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right">
                            ${(totalDebits - totalCredits).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Balance Summary Tab */}
        <TabsContent value="balance-summary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Account Balance Summary</CardTitle>
              <CardDescription>
                Current balances for all accounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account Code</TableHead>
                      <TableHead>Account Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Current Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {balanceSummary.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8">
                          No data available
                        </TableCell>
                      </TableRow>
                    ) : (
                      balanceSummary.map((acc, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono">{acc.account_code}</TableCell>
                          <TableCell>{acc.account_name}</TableCell>
                          <TableCell>
                            <Badge variant={
                              acc.account_type === 'asset' ? 'default' :
                              acc.account_type === 'liability' ? 'secondary' :
                              acc.account_type === 'equity' ? 'outline' :
                              acc.account_type === 'revenue' ? 'default' : 'destructive'
                            }>
                              {acc.account_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            ${(acc.current_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Account Dialog */}
      <Dialog open={showAddAccount} onOpenChange={setShowAddAccount}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Account</DialogTitle>
            <DialogDescription>
              Create a new account in the chart of accounts for {outletName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Account Code *</Label>
                <Input 
                  placeholder="e.g., 1040" 
                  value={newAccount.account_code}
                  onChange={(e) => setNewAccount({...newAccount, account_code: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Account Name *</Label>
                <Input 
                  placeholder="e.g., Petty Cash" 
                  value={newAccount.account_name}
                  onChange={(e) => setNewAccount({...newAccount, account_name: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Account Type *</Label>
              <Select 
                value={newAccount.account_type} 
                onValueChange={(value) => setNewAccount({...newAccount, account_type: value as ChartOfAccount['account_type']})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asset">Asset</SelectItem>
                  <SelectItem value="liability">Liability</SelectItem>
                  <SelectItem value="equity">Equity</SelectItem>
                  <SelectItem value="revenue">Revenue</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category *</Label>
              <Input 
                placeholder="e.g., Current Assets" 
                value={newAccount.account_category}
                onChange={(e) => setNewAccount({...newAccount, account_category: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input 
                placeholder="Optional description" 
                value={newAccount.description}
                onChange={(e) => setNewAccount({...newAccount, description: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddAccount(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAccount}>
              Create Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
