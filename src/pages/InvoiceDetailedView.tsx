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
  FileText,
  Search,
  Filter,
  BarChart3,
  PieChart,
  Activity
} from "lucide-react";
import { getSavedInvoices, InvoiceData } from "@/utils/invoiceUtils";
import { formatCurrency } from "@/lib/currency";

interface InvoiceDetailedViewProps {
  onBack: () => void;
  onLogout: () => void;
  username: string;
}

export const InvoiceDetailedView = ({ onBack, onLogout, username }: InvoiceDetailedViewProps) => {
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Load invoices
  useEffect(() => {
    const loadInvoices = async () => {
      try {
        setLoading(true);
        const savedInvoices = await getSavedInvoices();
        setInvoices(savedInvoices);
      } catch (error) {
        console.error("Error loading invoices:", error);
      } finally {
        setLoading(false);
      }
    };

    loadInvoices();
  }, []);

  // Filter by date range
  const isInDateRange = (dateString: string) => {
    const date = new Date(dateString);
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    return date >= startDate && date <= endDate;
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesDate = isInDateRange(inv.date);
    const matchesSearch = inv.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
    return matchesDate && matchesSearch && matchesStatus;
  });

  // Calculate statistics
  const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const averageInvoice = filteredInvoices.length > 0 ? totalRevenue / filteredInvoices.length : 0;
  const highestInvoice = Math.max(...filteredInvoices.map(inv => inv.total || 0), 0);
  const lowestInvoice = Math.min(...filteredInvoices.map(inv => inv.total || 0), 0);

  // Status breakdown
  const statusBreakdown = {
    pending: filteredInvoices.filter(inv => inv.status === 'pending').length,
    completed: filteredInvoices.filter(inv => inv.status === 'completed').length,
    refunded: filteredInvoices.filter(inv => inv.status === 'refunded').length,
   cancelled: filteredInvoices.filter(inv => inv.status === 'cancelled').length
  };

  // Top customers
  const customerRevenue = filteredInvoices.reduce((acc, inv) => {
    acc[inv.customer] = (acc[inv.customer] || 0) + (inv.total || 0);
    return acc;
  }, {} as Record<string, number>);

  const topCustomers = Object.entries(customerRevenue)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Export data
  const exportData = () => {
    const headers = ['Invoice Number', 'Customer', 'Date', 'Status', 'Total'];
    const rows = filteredInvoices.map(inv => [
      inv.invoiceNumber,
      inv.customer,
      inv.date,
      inv.status,
      inv.total?.toString() || '0'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoices-detailed-${dateRange.start}-${dateRange.end}.csv`;
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
              <h1 className="text-xl font-bold">Invoice Detailed Analytics</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Welcome, {username}</span>
              <Button variant="outline" size="sm" onClick={onLogout}>Logout</Button>
            </div>
          </div>
        </div>
        <main className="container mx-auto p-4 sm:p-6">
          <div className="flex justify-center items-center h-64">
            <p>Loading invoice data...</p>
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
            <h1 className="text-xl font-bold">Invoice Detailed Analytics</h1>
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
                placeholder="Search customer or invoice..."
                value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={statusFilter}
               onChange={(e) => setStatusFilter(e.target.value)}
                className="border rounded-md px-2 py-1 text-sm"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="refunded">Refunded</option>
                <option value="cancelled">Cancelled</option>
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
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                From {filteredInvoices.length} invoices
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Invoice</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(averageInvoice)}</div>
              <p className="text-xs text-muted-foreground mt-1">Per invoice average</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Highest Invoice</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(highestInvoice)}</div>
              <p className="text-xs text-muted-foreground mt-1">Maximum amount</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lowest Invoice</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(lowestInvoice)}</div>
              <p className="text-xs text-muted-foreground mt-1">Minimum amount</p>
            </CardContent>
          </Card>
        </div>

        {/* Status Breakdown */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              <CardTitle>Status Breakdown</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-orange-600">{statusBreakdown.pending}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">{statusBreakdown.completed}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Refunded</p>
                <p className="text-2xl font-bold text-blue-600">{statusBreakdown.refunded}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Cancelled</p>
                <p className="text-2xl font-bold text-red-600">{statusBreakdown.cancelled}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Customers */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle>Top 5 Customers by Revenue</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topCustomers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No customer data available</p>
              ) : (
                topCustomers.map(([customer, revenue], index) => (
                  <div key={customer} className="flex justify-between items-center p-3 bg-muted/50 rounded">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{customer}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{formatCurrency(revenue)}</p>
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
              <BarChart3 className="h-5 w-5 text-primary" />
              <CardTitle>All Invoices</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Invoice #</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Customer</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-muted-foreground">
                        No invoices found for the selected criteria
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((invoice) => (
                      <tr key={invoice.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4 font-medium">{invoice.invoiceNumber}</td>
                        <td className="py-3 px-4">{invoice.customer}</td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {new Date(invoice.date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={invoice.status === 'completed' ? 'default' : 'secondary'}>
                            {invoice.status}
                          </Badge>
                        </td>
                        <td className="text-right py-3 px-4 font-bold">
                          {formatCurrency(invoice.total)}
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
