import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Receipt, Calendar, Filter, Download, Printer, FileSpreadsheet, Truck, Eye } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { ExportUtils } from "@/utils/exportUtils";
import { PrintUtils } from "@/utils/printUtils";
import { ExcelUtils } from "@/utils/excelUtils";
// Import Supabase database service
import { getPurchaseOrders, PurchaseOrder, getSuppliers, Supplier, getPurchaseOrderItems, getProductById } from "@/services/databaseService";
import { useToast } from "@/hooks/use-toast";

interface PurchaseTransactionItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface PurchaseTransaction {
  id: string;
  date: string;
  supplier: string;
  items: number;
  total: number;
  status: "draft" | "ordered" | "received" | "cancelled";
  orderNumber?: string;
  expectedDelivery?: string;
  notes?: string;
  supplierId?: string;
  transactionItems?: PurchaseTransactionItem[]; // Add this for detailed items
}

// Extended interface for viewing detailed purchase order with items
interface DetailedPurchaseOrder extends PurchaseOrder {
  transactionItems?: PurchaseTransactionItem[];
}

export const PurchaseTransactionHistory = ({ username, onBack, onLogout }: { username: string; onBack: () => void; onLogout: () => void }) => {
  const [transactions, setTransactions] = useState<PurchaseTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [viewingTransaction, setViewingTransaction] = useState<DetailedPurchaseOrder | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const { toast } = useToast();

  // Load suppliers for supplier name lookup
  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        const supplierData = await getSuppliers();
        setSuppliers(supplierData);
      } catch (error) {
        console.error("Error loading suppliers:", error);
      }
    };

    loadSuppliers();
  }, []);

  // Load purchase transactions from Supabase on component mount
  useEffect(() => {
    const loadTransactions = async () => {
      try {
        setLoading(true);
        console.log("Loading purchase orders data...");
        const purchaseOrdersData = await getPurchaseOrders();
        console.log("Purchase orders data loaded:", purchaseOrdersData.length, "records");
        
        // Get supplier names for display
        const supplierMap = new Map<string, string>();
        suppliers.forEach(supplier => {
          if (supplier.id) {
            supplierMap.set(supplier.id, supplier.name || 'Unknown Supplier');
          }
        });
        
        // For each purchase order, get the actual number of items
        const formattedTransactions = [];
        for (const po of purchaseOrdersData) {
          // Get supplier name or use default
          let supplierName = 'Unknown Supplier';
          if (po.supplier_id) {
            supplierName = supplierMap.get(po.supplier_id) || 'Unknown Supplier';
          }
          
          // Get actual number of items in this purchase order
          let itemCount = 0;
          try {
            if (po.id) {
              const poItems = await getPurchaseOrderItems(po.id);
              itemCount = poItems.length;
            }
          } catch (error) {
            console.error("Error loading purchase order items for PO", po.id, error);
            itemCount = 1; // Default fallback
          }
          
          formattedTransactions.push({
            id: po.id || '',
            date: po.order_date || new Date().toISOString(),
            supplier: supplierName,
            items: itemCount,
            total: po.total_amount || 0,
            status: (po.status as "draft" | "ordered" | "received" | "cancelled") || 'draft'
          });
        }
        
        console.log("Formatted purchase transactions:", formattedTransactions);
        setTransactions(formattedTransactions);
      } catch (error) {
        console.error("Error loading purchase transactions:", error);
        toast({
          title: "Error",
          description: "Failed to load purchase transactions: " + (error as Error).message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    // Only load transactions if suppliers are loaded
    if (suppliers.length > 0) {
      loadTransactions();
    } else {
      // Load transactions after suppliers are loaded
      const loadSuppliersAndTransactions = async () => {
        try {
          setLoading(true);
          const supplierData = await getSuppliers();
          setSuppliers(supplierData);
          
          const purchaseOrdersData = await getPurchaseOrders();
          console.log("Purchase orders data loaded:", purchaseOrdersData.length, "records");
          
          // Get supplier names for display
          const supplierMap = new Map<string, string>();
          supplierData.forEach(supplier => {
            if (supplier.id) {
              supplierMap.set(supplier.id, supplier.name || 'Unknown Supplier');
            }
          });
          
          // For For each purchase order, get the actual number of items
          const formattedTransactions = [];
          for (const po of purchaseOrdersData) {
            // Get supplier name or use default
            let supplierName = 'Unknown Supplier';
            if (po.supplier_id) {
              supplierName = supplierMap.get(po.supplier_id) || 'Unknown Supplier';
            }
            
            // Get actual number of items in this purchase order
            let itemCount = 0;
            try {
              if (po.id) {
                const poItems = await getPurchaseOrderItems(po.id);
                itemCount = poItems.length;
              }
            } catch (error) {
              console.error("Error loading purchase order items for PO", po.id, error);
              itemCount = 1; // Default fallback
            }
            
            formattedTransactions.push({
              id: po.id || '',
              date: po.order_date || new Date().toISOString(),
              supplier: supplierName,
              items: itemCount,
              total: po.total_amount || 0,
              status: (po.status as "draft" | "ordered" | "received" | "cancelled") || 'draft'
            });
          }
          
          console.log("Formatted purchase transactions:", formattedTransactions);
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
      
      loadSuppliersAndTransactions();
    }
  }, []);

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = 
      (transaction.id && transaction.id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      transaction.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    
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
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  // Refresh transactions
  const refreshTransactions = async () => {
    try {
      setLoading(true);
      const purchaseOrdersData = await getPurchaseOrders();
      
      // Get supplier names for display
      const supplierMap = new Map<string, string>();
      suppliers.forEach(supplier => {
        if (supplier.id) {
          supplierMap.set(supplier.id, supplier.name || 'Unknown Supplier');
        }
      });
      
      // For each purchase order, get the actual number of items
      const formattedTransactions = [];
      for (const po of purchaseOrdersData) {
        // Get supplier name or use default
        let supplierName = 'Unknown Supplier';
        if (po.supplier_id) {
          supplierName = supplierMap.get(po.supplier_id) || 'Unknown Supplier';
        }
        
        // Get actual number of items in this purchase order
        let itemCount = 0;
        try {
          if (po.id) {
            const poItems = await getPurchaseOrderItems(po.id);
            itemCount = poItems.length;
          }
        } catch (error) {
          console.error("Error loading purchase order items for PO", po.id, error);
          itemCount = 1; // Default fallback
        }
        
        formattedTransactions.push({
          id: po.id || '',
          date: po.order_date || new Date().toISOString(),
          supplier: supplierName,
          items: itemCount,
          total: po.total_amount || 0,
          status: (po.status as "draft" | "ordered" | "received" | "cancelled") || 'draft'
        });
      }
      
      setTransactions(formattedTransactions);
      toast({
        title: "Success",
        description: "Purchase transactions refreshed successfully",
      });
    } catch (error) {
      console.error("Error refreshing purchase transactions:", error);
      toast({
        title: "Error",
        description: "Failed to refresh purchase transactions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Add this new function to handle viewing a transaction
  const handleViewTransaction = async (transactionId: string) => {
    try {
      // Load the purchase order details
      const purchaseOrdersData = await getPurchaseOrders();
      const purchaseOrder = purchaseOrdersData.find(po => po.id === transactionId);
      
      if (purchaseOrder) {
        // Load the purchase order items
        const items = await getPurchaseOrderItems(transactionId);
        
        // Get product details for each item
        const detailedItems: PurchaseTransactionItem[] = [];
        for (const item of items) {
          const product = await getProductById(item.product_id || '');
          detailedItems.push({
            id: item.id || '',
            productId: item.product_id || '',
            productName: product?.name || 'Unknown Product',
            quantity: item.quantity_ordered,
            unitPrice: item.unit_cost,
            totalPrice: item.total_cost
          });
        }
        
        // Create a detailed transaction object
        const detailedTransaction: any = {
          ...purchaseOrder,
          transactionItems: detailedItems
        };
        
        setViewingTransaction(detailedTransaction);
        setIsViewDialogOpen(true);
      } else {
        toast({
          title: "Error",
          description: "Purchase order not found",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error loading purchase order:", error);
      toast({
        title: "Error",
        description: "Failed to load purchase order details",
        variant: "destructive",
      });
    }
  };

  // Add this function to close the view dialog
  const closeViewDialog = () => {
    setIsViewDialogOpen(false);
    setViewingTransaction(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation 
        title="Purchase Transaction History" 
        onBack={onBack}
        onLogout={onLogout} 
        username={username}
      />
      
      <main className="container mx-auto p-6">
        <div className="mb-6">
          <h2 className="text-3xl font-bold">Purchase Transactions</h2>
          <p className="text-muted-foreground">View and manage purchase transactions</p>
        </div>
        
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by transaction ID or supplier..."
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
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="ordered">Ordered</SelectItem>
                    <SelectItem value="received">Received</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button onClick={refreshTransactions} variant="outline">
                  Refresh
                </Button>
                
                <Button onClick={() => PrintUtils.printPurchaseReport(filteredTransactions)}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print Report
                </Button>
                
                <Button onClick={() => ExportUtils.exportToCSV(filteredTransactions, `purchase_transactions_${new Date().toISOString().split('T')[0]}`)}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                
                <Button variant="outline" onClick={() => ExcelUtils.exportToExcel(filteredTransactions, `purchase_transactions_${new Date().toISOString().split('T')[0]}`)}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export Excel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Purchase Transaction Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <p>Loading purchase transactions...</p>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <Receipt className="h-8 w-8 mb-2" />
                <p>No purchase transactions found</p>
                <p className="text-sm">Process a purchase to see transactions here</p>
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
                      <TableHead>Supplier</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium">{transaction.id ? transaction.id.substring(0, 8) : 'N/A'}</TableCell>
                        <TableCell>{transaction.date ? new Date(transaction.date).toLocaleDateString() : 'N/A'}</TableCell>
                        <TableCell>{transaction.supplier}</TableCell>
                        <TableCell>{transaction.items}</TableCell>
                        <TableCell className="text-right">{formatCurrency(transaction.total)}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              transaction.status === "received" ? "default" :
                              transaction.status === "ordered" ? "secondary" :
                              transaction.status === "draft" ? "outline" : "destructive"
                            }
                          >
                            {transaction.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewTransaction(transaction.id)}
                            title="View transaction details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* View Transaction Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={(open) => {
          setIsViewDialogOpen(open);
          if (!open) closeViewDialog();
        }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Purchased Transaction Details</DialogTitle>
            </DialogHeader>
            {viewingTransaction && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Order Number</label>
                    <div className="mt-1 p-2 bg-muted rounded">{viewingTransaction.order_number || 'N/A'}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <div className="mt-1 p-2 bg-muted rounded">
                      <Badge 
                        variant={
                          viewingTransaction.status === "received" ? "default" :
                          viewingTransaction.status === "ordered" ? "secondary" :
                          viewingTransaction.status === "draft" ? "outline" : "destructive"
                        }
                      >
                        {viewingTransaction.status}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Order Date</label>
                    <div className="mt-1 p-2 bg-muted rounded">
                      {viewingTransaction.order_date ? new Date(viewingTransaction.order_date).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Expected Delivery</label>
                    <div className="mt-1 p-2 bg-muted rounded">
                      {viewingTransaction.expected_delivery_date ? new Date(viewingTransaction.expected_delivery_date).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Supplier</label>
                  <div className="mt-1 p-2 bg-muted rounded">
                    {suppliers.find(s => s.id === viewingTransaction.supplier_id)?.name || 'Unknown Supplier'}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Notes</label>
                  <div className="mt-1 p-2 bg-muted rounded min-h-12">
                    {viewingTransaction.notes || 'No notes'}
                  </div>
                </div>
                
                {/* Purchased Items List */}
                <div>
                  <label className="text-sm font-medium">Purchased Items</label>
                  <div className="mt-1 border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead className="text-right">Unit Price</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {viewingTransaction.transactionItems && viewingTransaction.transactionItems.map((item: any) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.productName}</TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.totalPrice)}</TableCell>
                          </TableRow>
                        ))}
                        {(!viewingTransaction.transactionItems || viewingTransaction.transactionItems.length === 0) && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground">
                              No items found for this purchase order
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Total Amount</label>
                  <div className="mt-1 p-2 bg-muted rounded font-bold">
                    {formatCurrency(viewingTransaction.total_amount || 0)}
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button onClick={closeViewDialog}>Close</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};