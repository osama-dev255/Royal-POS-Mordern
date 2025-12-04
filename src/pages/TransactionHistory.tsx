import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Receipt, Calendar, Filter, Download, Printer, FileSpreadsheet } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { ExportUtils } from "@/utils/exportUtils";
import { PrintUtils } from "@/utils/printUtils";
import { ExcelUtils } from "@/utils/excelUtils";
// Import Supabase database service
import { getSales, Sale, getCustomers, Customer, getSaleItems } from "@/services/databaseService";
import { useToast } from "@/hooks/use-toast";

interface Transaction {
  id: string;
  date: string;
  customer: string;
  items: number;
  total: number;
  paymentMethod: string;
  status: "completed" | "refunded" | "pending";
}

export const TransactionHistory = ({ username, onBack, onLogout }: { username: string; onBack: () => void; onLogout: () => void }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const { toast } = useToast();

  // Load customers for customer name lookup
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const customerData = await getCustomers();
        setCustomers(customerData);
      } catch (error) {
        console.error("Error loading customers:", error);
      }
    };

    loadCustomers();
  }, []);

  // Load transactions from Supabase on component mount
  useEffect(() => {
    const loadTransactions = async () => {
      try {
        setLoading(true);
        const salesData = await getSales();
        
        // Filter to show only completed transactions
        const completedSales = salesData.filter(sale => 
          sale.sale_status === 'completed'
        );
        
        // Get customer names for display
        const customerMap = new Map<string, string>();
        customers.forEach(customer => {
          if (customer.id) {
            customerMap.set(customer.id, `${customer.first_name} ${customer.last_name}`);
          }
        });
        
        // For each sale, get the actual number of items
        const formattedTransactions = [];
        for (const sale of completedSales) {
          // Get customer name or use default
          let customerName = 'Walk-in Customer';
          if (sale.customer_id) {
            customerName = customerMap.get(sale.customer_id) || 'Unknown Customer';
          }
          
          // Get actual number of items in this sale
          let itemCount = 0;
          try {
            const saleItems = await getSaleItems(sale.id || '');
            itemCount = saleItems.length;
          } catch (error) {
            console.error("Error loading sale items for sale", sale.id, error);
            itemCount = 1; // Default fallback
          }
          
          formattedTransactions.push({
            id: sale.id || '',
            date: sale.sale_date || new Date().toISOString(),
            customer: customerName,
            items: itemCount,
            total: sale.total_amount || 0,
            paymentMethod: sale.payment_method || 'Unknown',
            status: (sale.sale_status as "completed" | "refunded" | "pending") || 'completed'
          });
        }
        
        setTransactions(formattedTransactions);
      } catch (error) {
        console.error("Error loading transactions:", error);
        toast({
          title: "Error",
          description: "Failed to load transactions: " + (error as Error).message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    // Only load transactions if customers are loaded
    if (customers.length > 0) {
      loadTransactions();
    } else {
      // Load transactions after customers are loaded
      const loadCustomersAndTransactions = async () => {
        try {
          setLoading(true);
          const customerData = await getCustomers();
          setCustomers(customerData);
          
          const salesData = await getSales();
          
          // Filter to show only completed transactions
          const completedSales = salesData.filter(sale => 
            sale.sale_status === 'completed'
          );
          
          // Get customer names for display
          const customerMap = new Map<string, string>();
          customerData.forEach(customer => {
            if (customer.id) {
              customerMap.set(customer.id, `${customer.first_name} ${customer.last_name}`);
            }
          });
          
          // For each sale, get the actual number of items
          const formattedTransactions = [];
          for (const sale of completedSales) {
            // Get customer name or use default
            let customerName = 'Walk-in Customer';
            if (sale.customer_id) {
              customerName = customerMap.get(sale.customer_id) || 'Unknown Customer';
            }
            
            // Get actual number of items in this sale
            let itemCount = 0;
            try {
              if (sale.id) {
                const saleItems = await getSaleItems(sale.id);
                itemCount = saleItems.length;
              }
            } catch (error) {
              console.error("Error loading sale items for sale", sale.id, error);
              itemCount = 1; // Default fallback
            }
            
            formattedTransactions.push({
              id: sale.id || '',
              date: sale.sale_date || new Date().toISOString(),
              customer: customerName,
              items: itemCount,
              total: sale.total_amount || 0,
              paymentMethod: sale.payment_method || 'Unknown',
              status: (sale.sale_status as "completed" | "refunded" | "pending") || 'completed'
            });
          }
          
          setTransactions(formattedTransactions);
        } catch (error) {
          console.error("Error loading data:", error);
          toast({
            title: "Error",
            description: "Failed to load data: " + (error as Error).message,
            variant: "destructive",
          });
        } finally {
          setLoading(false);
        }
      };
      
      loadCustomersAndTransactions();
    }
  }, []);

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = 
      (transaction.id && transaction.id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      transaction.customer.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || transaction.status === statusFilter;
    
    // Date filter implementation
    const transactionDate = new Date(transaction.date);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let matchesDate = true;
    if (dateFilter === "today") {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      matchesDate = transactionDate >= today && transactionDate < tomorrow;
    } else if (dateFilter === "week") {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      matchesDate = transactionDate >= weekAgo && transactionDate <= today;
    } else if (dateFilter === "month") {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      matchesDate = transactionDate >= monthAgo && transactionDate <= today;
    }
    
    // Only show completed transactions in transaction history
    const isCompletedTransaction = transaction.status === "completed";
    
    return matchesSearch && matchesStatus && matchesDate && isCompletedTransaction;
  });

  // Refresh transactions
  const refreshTransactions = async () => {
    try {
      setLoading(true);
      const salesData = await getSales();
      
      // Filter to show only completed transactions
      const completedSales = salesData.filter(sale => 
        sale.sale_status === 'completed'
      );
      
      // Get customer names for display
      const customerMap = new Map<string, string>();
      customers.forEach(customer => {
        if (customer.id) {
          customerMap.set(customer.id, `${customer.first_name} ${customer.last_name}`);
        }
      });
      
      // For each sale, get the actual number of items
      const formattedTransactions = [];
      for (const sale of completedSales) {
        // Get customer name or use default
        let customerName = 'Walk-in Customer';
        if (sale.customer_id) {
          customerName = customerMap.get(sale.customer_id) || 'Unknown Customer';
        }
        
        // Get actual number of items in this sale
        let itemCount = 0;
        try {
          if (sale.id) {
            const saleItems = await getSaleItems(sale.id);
            itemCount = saleItems.length;
          }
        } catch (error) {
          console.error("Error loading sale items for sale", sale.id, error);
          itemCount = 1; // Default fallback
        }
        
        formattedTransactions.push({
          id: sale.id || '',
          date: sale.sale_date || new Date().toISOString(),
          customer: customerName,
          items: itemCount,
          total: sale.total_amount || 0,
          paymentMethod: sale.payment_method || 'Unknown',
          status: (sale.sale_status as "completed" | "refunded" | "pending") || 'completed'
        });
      }
      
      setTransactions(formattedTransactions);
      toast({
        title: "Success",
        description: "Transactions refreshed successfully",
      });
    } catch (error) {
      console.error("Error refreshing transactions:", error);
      toast({
        title: "Error",
        description: "Failed to refresh transactions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation 
        title="Transaction History" 
        onBack={onBack}
        onLogout={onLogout} 
        username={username}
      />
      
      <main className="container mx-auto p-6">
        <div className="mb-6">
          <h2 className="text-3xl font-bold">Transactions</h2>
          <p className="text-muted-foreground">View and manage sales transactions</p>
        </div>
        
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by transaction ID or customer..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex gap-2">
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-32">
                    <Calendar className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Dates</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button onClick={refreshTransactions} variant="outline">
                  Refresh
                </Button>
                
                <Button onClick={() => PrintUtils.printSalesReport(filteredTransactions)}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print Report
                </Button>
                
                <Button onClick={() => ExportUtils.exportToCSV(filteredTransactions, `transactions_${new Date().toISOString().split('T')[0]}`)}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                
                <Button variant="outline" onClick={() => ExcelUtils.exportToExcel(filteredTransactions, `transactions_${new Date().toISOString().split('T')[0]}`)}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export Excel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Transaction Records</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <p>Loading transactions...</p>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <Receipt className="h-8 w-8 mb-2" />
                <p>No transactions found</p>
                <p className="text-sm">Process a sale to see transactions here</p>
                <Button 
                  variant="outline" 
                  className="mt-2"
                  onClick={refreshTransactions}
                >
                  Refresh Data
                </Button>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium">{transaction.id ? transaction.id.substring(0, 8) : 'N/A'}</TableCell>
                        <TableCell>{transaction.date ? new Date(transaction.date).toLocaleDateString() : 'N/A'}</TableCell>
                        <TableCell>{transaction.customer}</TableCell>
                        <TableCell>{transaction.items}</TableCell>
                        <TableCell className="text-right">{formatCurrency(transaction.total)}</TableCell>
                        <TableCell>{transaction.paymentMethod}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              transaction.status === "completed" ? "default" :
                              transaction.status === "refunded" ? "destructive" : "secondary"
                            }
                          >
                            {transaction.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};