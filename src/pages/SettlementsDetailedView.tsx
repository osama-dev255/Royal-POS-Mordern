import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Calendar, 
  Download, 
  TrendingUp, 
  DollarSign,
  Wallet,
  Search,
  Filter,
  BarChart3,
  PieChart,
  CreditCard,
  Activity
} from "lucide-react";
import { getSavedSettlements, CustomerSettlementData } from "@/utils/customerSettlementUtils";
import { formatCurrency } from "@/lib/currency";

interface SettlementsDetailedViewProps {
  onBack: () => void;
  onLogout: () => void;
  username: string;
}

export const SettlementsDetailedView = ({ onBack, onLogout, username }: SettlementsDetailedViewProps) => {
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(true);
  const [settlements, setSettlements] = useState<CustomerSettlementData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");

  // Load settlements
  useEffect(() => {
    const loadSettlements = async () => {
      try {
        setLoading(true);
        const savedSettlements = await getSavedSettlements();
        setSettlements(savedSettlements);
      } catch (error) {
        console.error("Error loading settlements:", error);
      } finally {
        setLoading(false);
      }
    };

    loadSettlements();
  }, []);

  // Filter by date range
  const isInDateRange = (dateString: string) => {
    const date = new Date(dateString);
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    return date >= startDate && date <= endDate;
  };

  const filteredSettlements = settlements.filter(sett => {
    const matchesDate = isInDateRange(sett.date);
    const matchesSearch = sett.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sett.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPayment = paymentMethodFilter === "all" || sett.paymentMethod === paymentMethodFilter;
    return matchesDate && matchesSearch && matchesPayment;
  });

  // Calculate statistics
  const totalSettled = filteredSettlements.reduce((sum, sett) => sum + (sett.settlementAmount || 0), 0);
  const averageSettlement = filteredSettlements.length > 0 ? totalSettled / filteredSettlements.length : 0;
  const highestSettlement = Math.max(...filteredSettlements.map(sett => sett.settlementAmount || 0), 0);
  const lowestSettlement= Math.min(...filteredSettlements.map(sett => sett.settlementAmount || 0), 0);

  // Payment method breakdown
  const paymentMethodBreakdown = {
   cash: filteredSettlements.filter(s => s.paymentMethod === 'cash').length,
   card: filteredSettlements.filter(s => s.paymentMethod === 'card').length,
    bank_transfer: filteredSettlements.filter(s => s.paymentMethod === 'bank_transfer').length,
    other: filteredSettlements.filter(s => s.paymentMethod === 'other').length
  };

  const paymentMethodAmounts = {
   cash: filteredSettlements.filter(s => s.paymentMethod === 'cash').reduce((sum, s) => sum + (s.settlementAmount || 0), 0),
   card: filteredSettlements.filter(s => s.paymentMethod === 'card').reduce((sum, s) => sum + (s.settlementAmount || 0), 0),
    bank_transfer: filteredSettlements.filter(s => s.paymentMethod === 'bank_transfer').reduce((sum, s) => sum + (s.settlementAmount || 0), 0),
   other: filteredSettlements.filter(s => s.paymentMethod === 'other').reduce((sum, s) => sum + (s.settlementAmount || 0), 0)
  };

  // Top customers
  const customerSettlements = filteredSettlements.reduce((acc, sett) => {
    acc[sett.customerName] = (acc[sett.customerName] || 0) + (sett.settlementAmount || 0);
    return acc;
  }, {} as Record<string, number>);

  const topCustomers = Object.entries(customerSettlements)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Export data
  const exportData = () => {
    const headers = ['Reference #', 'Customer', 'Date', 'Payment Method', 'Settlement Amount'];
    const rows = filteredSettlements.map(sett => [
      sett.referenceNumber,
      sett.customerName,
      sett.date,
      sett.paymentMethod,
      sett.settlementAmount?.toString() || '0'
    ]);

    const csvContent= [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
   a.href = url;
   a.download = `settlements-detailed-${dateRange.start}-${dateRange.end}.csv`;
    a.click();
  window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <h1 className="text-xl font-bold">Settlements Detailed Analytics</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Welcome, {username}</span>
              <Button variant="outline" size="sm" onClick={onLogout}>Logout</Button>
            </div>
          </div>
        </div>
        <main className="container mx-auto p-4 sm:p-6">
          <div className="flex justify-center items-center h-64">
            <p>Loading settlement data...</p>
          </div>
        </main>
      </div>
    );
  }

 return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <h1 className="text-xl font-bold">Settlements Detailed Analytics</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Welcome, {username}</span>
            <Button variant="outline" size="sm" onClick={onLogout}>Logout</Button>
          </div>
        </div>
      </div>

      <main className="container mx-auto p-4 sm:p-6">
        {/* Filters and Actions */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
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
            <div className="flex items-center gap-2 ml-4">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customer or reference..."
                value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={paymentMethodFilter}
            onChange={(e) => setPaymentMethodFilter(e.target.value)}
                className="border rounded-md px-2 py-1 text-sm"
              >
                <option value="all">All Payment Methods</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <Button onClick={exportData} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Data
          </Button>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Settled</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalSettled)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                From {filteredSettlements.length} settlements
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Settlement</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(averageSettlement)}</div>
              <p className="text-xs text-muted-foreground mt-1">Per settlement average</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Highest Settlement</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(highestSettlement)}</div>
              <p className="text-xs text-muted-foreground mt-1">Maximum amount settled</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lowest Settlement</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(lowestSettlement)}</div>
              <p className="text-xs text-muted-foreground mt-1">Minimum amount settled</p>
            </CardContent>
          </Card>
        </div>

        {/* Payment Method Breakdown */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              <CardTitle>Payment Method Breakdown</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Cash</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(paymentMethodAmounts.cash)}</p>
                <p className="text-xs text-muted-foreground">{paymentMethodBreakdown.cash} transactions</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Card</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(paymentMethodAmounts.card)}</p>
                <p className="text-xs text-muted-foreground">{paymentMethodBreakdown.card} transactions</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Bank Transfer</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(paymentMethodAmounts.bank_transfer)}</p>
                <p className="text-xs text-muted-foreground">{paymentMethodBreakdown.bank_transfer} transactions</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Other</p>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(paymentMethodAmounts.other)}</p>
                <p className="text-xs text-muted-foreground">{paymentMethodBreakdown.other} transactions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Customers */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <CardTitle>Top 5 Customers by Settlement Amount</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topCustomers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No customer data available</p>
              ) : (
                topCustomers.map(([customer, amount], index) => (
                  <div key={customer} className="flex justify-between items-center p-3 bg-muted/50 rounded">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                        {index +1}
                      </div>
                      <div>
                        <p className="font-medium">{customer}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{formatCurrency(amount)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Detailed Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              <CardTitle>All Settlements</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Reference #</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Customer</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Payment Method</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSettlements.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-muted-foreground">
                        No settlements found for the selected criteria
                      </td>
                    </tr>
                  ) : (
                    filteredSettlements.map((settlement) => (
                      <tr key={settlement.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4 font-medium">{settlement.referenceNumber}</td>
                        <td className="py-3 px-4">{settlement.customerName}</td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {new Date(settlement.date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline">
                            {settlement.paymentMethod.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="text-right py-3 px-4 font-bold">
                          {formatCurrency(settlement.settlementAmount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};
