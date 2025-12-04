import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Edit, Trash2, Wallet, TrendingUp, TrendingDown, Filter, Download, Printer, FileSpreadsheet, Loader2, Coins } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import { ExportUtils } from "@/utils/exportUtils";
import { PrintUtils } from "@/utils/printUtils";
import { ExcelUtils } from "@/utils/excelUtils";
import { getSales, getExpenses, getCustomerSettlements, getSupplierSettlements } from "@/services/databaseService";

interface MonetaryAsset {
  id?: string;
  type: "income" | "expense" | "receivable" | "payable";
  category: string;
  description: string;
  amount: number;
  date: string;
  status: "pending" | "completed" | "overdue";
  reference?: string;
  notes?: string;
}

export const MonetaryAssets = ({ username, onBack, onLogout }: { username: string; onBack: () => void; onLogout: () => void }) => {
  const [monetaryAssets, setMonetaryAssets] = useState<MonetaryAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MonetaryAsset | null>(null);
  const [newItem, setNewItem] = useState<Omit<MonetaryAsset, "id">>({
    type: "income",
    category: "",
    description: "",
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    status: "pending"
  });
  const { toast } = useToast();

  // Load data from Supabase
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load sales data (income)
      const sales = await getSales();
      const incomeItems: MonetaryAsset[] = sales.map(sale => ({
        id: `income_${sale.id}`,
        type: "income",
        category: "Sales Revenue",
        description: `Sale #${sale.invoice_number || sale.id}`,
        amount: sale.total_amount,
        date: sale.sale_date || new Date().toISOString(),
        status: sale.payment_status === "paid" ? "completed" : "pending",
        reference: sale.invoice_number,
        notes: sale.notes || ""
      }));

      // Load expenses data
      const expenses = await getExpenses();
      const expenseItems: MonetaryAsset[] = expenses.map(expense => ({
        id: `expense_${expense.id}`,
        type: "expense",
        category: expense.category,
        description: expense.description,
        amount: expense.amount,
        date: expense.expense_date || new Date().toISOString(),
        status: "completed",
        reference: expense.receipt_url,
        notes: expense.notes || ""
      }));

      // Load customer settlements (receivables)
      const customerSettlements = await getCustomerSettlements();
      const receivableItems: MonetaryAsset[] = customerSettlements.map(settlement => ({
        id: `receivable_${settlement.id}`,
        type: "receivable",
        category: "Customer Payment",
        description: `Payment from customer`,
        amount: settlement.amount,
        date: settlement.settlement_date || new Date().toISOString(),
        status: "completed",
        reference: settlement.reference_number,
        notes: settlement.notes || ""
      }));

      // Load supplier settlements (payables)
      const supplierSettlements = await getSupplierSettlements();
      const payableItems: MonetaryAsset[] = supplierSettlements.map(settlement => ({
        id: `payable_${settlement.id}`,
        type: "payable",
        category: "Supplier Payment",
        description: `Payment to supplier`,
        amount: settlement.amount,
        date: settlement.settlement_date || new Date().toISOString(),
        status: "completed",
        reference: settlement.reference_number,
        notes: settlement.notes || ""
      }));

      // Combine all monetary assets
      const allAssets = [...incomeItems, ...expenseItems, ...receivableItems, ...payableItems];
      setMonetaryAssets(allAssets);
    } catch (error) {
      console.error('Error loading monetary assets data:', error);
      toast({
        title: "Error",
        description: "Failed to load monetary assets data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItem.description || newItem.amount <= 0) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const newItemWithId: MonetaryAsset = {
        ...newItem,
        id: `manual_${Date.now()}`
      };

      setMonetaryAssets(prev => [...prev, newItemWithId]);
      resetForm();
      setIsDialogOpen(false);
      
      toast({
        title: "Success",
        description: "Monetary asset added successfully"
      });
    } catch (error) {
      console.error('Error adding item:', error);
      toast({
        title: "Error",
        description: "Failed to add item",
        variant: "destructive"
      });
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem || !editingItem.description || editingItem.amount <= 0) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      if (!editingItem.id) {
        throw new Error("Item ID is missing");
      }

      // Update the item in the list
      setMonetaryAssets(prev => 
        prev.map(item => item.id === editingItem.id ? editingItem : item)
      );
      
      resetForm();
      setIsDialogOpen(false);
      
      toast({
        title: "Success",
        description: "Monetary asset updated successfully"
      });
    } catch (error) {
      console.error('Error updating item:', error);
      toast({
        title: "Error",
        description: "Failed to update item",
        variant: "destructive"
      });
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      setMonetaryAssets(prev => prev.filter(item => item.id !== id));
      
      toast({
        title: "Success",
        description: "Monetary asset deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setNewItem({
      type: "income",
      category: "",
      description: "",
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      status: "pending"
    });
    setEditingItem(null);
  };

  const openEditDialog = (item: MonetaryAsset) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const totalIncome = monetaryAssets
    .filter(item => item.type === "income")
    .reduce((sum, item) => sum + item.amount, 0);
    
  const totalExpenses = monetaryAssets
    .filter(item => item.type === "expense")
    .reduce((sum, item) => sum + item.amount, 0);
    
  const totalReceivables = monetaryAssets
    .filter(item => item.type === "receivable")
    .reduce((sum, item) => sum + item.amount, 0);
    
  const totalPayables = monetaryAssets
    .filter(item => item.type === "payable")
    .reduce((sum, item) => sum + item.amount, 0);
    
  const netPosition = totalIncome + totalReceivables - totalExpenses - totalPayables;

  const filteredItems = monetaryAssets.filter(item => {
    const matchesSearch = 
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.reference && item.reference.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = typeFilter === "all" || item.type === typeFilter;
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navigation 
        title="Monetary Assets Management" 
        onBack={onBack}
        onLogout={onLogout} 
        username={username}
      />
      
      <main className="container mx-auto p-6">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold">Monetary Assets</h2>
            <p className="text-muted-foreground">Track financial assets and monetary changes from sales</p>
          </div>
          
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search assets..."
                className="pl-8 w-full sm:w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-32">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="receivable">Receivable</SelectItem>
                <SelectItem value="payable">Payable</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
            
            <Button onClick={() => PrintUtils.printSalesReport(monetaryAssets)}>
              <Printer className="h-4 w-4 mr-2" />
              Print Report
            </Button>
            
            <Button onClick={() => ExportUtils.exportToCSV(monetaryAssets, `monetary_assets_${new Date().toISOString().split('T')[0]}`)}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            
            <Button variant="outline" onClick={() => ExcelUtils.exportToExcel(monetaryAssets, `monetary_assets_${new Date().toISOString().split('T')[0]}`)}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openAddDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Asset
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingItem ? "Edit Asset" : "Add New Asset"}
                  </DialogTitle>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="type">Type *</Label>
                      <Select
                        value={editingItem ? editingItem.type : newItem.type}
                        onValueChange={(value) => 
                          editingItem 
                            ? setEditingItem({...editingItem, type: value as "income" | "expense" | "receivable" | "payable"}) 
                            : setNewItem({...newItem, type: value as "income" | "expense" | "receivable" | "payable"})
                        }
                      >
                        <SelectTrigger id="type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="income">Income</SelectItem>
                          <SelectItem value="expense">Expense</SelectItem>
                          <SelectItem value="receivable">Receivable</SelectItem>
                          <SelectItem value="payable">Payable</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="date">Date *</Label>
                      <Input
                        id="date"
                        type="date"
                        value={editingItem ? editingItem.date : newItem.date}
                        onChange={(e) => 
                          editingItem 
                            ? setEditingItem({...editingItem, date: e.target.value}) 
                            : setNewItem({...newItem, date: e.target.value})
                        }
                      />
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      value={editingItem ? editingItem.category || "" : newItem.category || ""}
                      onChange={(e) => 
                        editingItem 
                          ? setEditingItem({...editingItem, category: e.target.value}) 
                          : setNewItem({...newItem, category: e.target.value})
                      }
                      placeholder="e.g., Sales, Rent, Utilities"
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description *</Label>
                    <Input
                      id="description"
                      value={editingItem ? editingItem.description : newItem.description}
                      onChange={(e) => 
                        editingItem 
                          ? setEditingItem({...editingItem, description: e.target.value}) 
                          : setNewItem({...newItem, description: e.target.value})
                      }
                      placeholder="Description of the asset"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="amount">Amount *</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-muted-foreground">TZS</span>
                        <Input
                          id="amount"
                          type="number"
                          step="0.01"
                          className="pl-8"
                          value={editingItem ? editingItem.amount : newItem.amount}
                          onChange={(e) => 
                            editingItem 
                              ? setEditingItem({...editingItem, amount: parseFloat(e.target.value) || 0}) 
                              : setNewItem({...newItem, amount: parseFloat(e.target.value) || 0})
                          }
                        />
                      </div>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={editingItem ? editingItem.status : newItem.status}
                        onValueChange={(value) => 
                          editingItem 
                            ? setEditingItem({...editingItem, status: value as "pending" | "completed" | "overdue"}) 
                            : setNewItem({...newItem, status: value as "pending" | "completed" | "overdue"})
                        }
                      >
                        <SelectTrigger id="status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="overdue">Overdue</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="reference">Reference</Label>
                    <Input
                      id="reference"
                      value={editingItem ? editingItem.reference || "" : newItem.reference || ""}
                      onChange={(e) => 
                        editingItem 
                          ? setEditingItem({...editingItem, reference: e.target.value}) 
                          : setNewItem({...newItem, reference: e.target.value})
                      }
                      placeholder="Invoice #, Receipt #, etc."
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Input
                      id="notes"
                      value={editingItem ? editingItem.notes || "" : newItem.notes || ""}
                      onChange={(e) => 
                        editingItem 
                          ? setEditingItem({...editingItem, notes: e.target.value}) 
                          : setNewItem({...newItem, notes: e.target.value})
                      }
                      placeholder="Additional details"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={editingItem ? handleUpdateItem : handleAddItem}>
                    {editingItem ? "Update" : "Add"} Asset
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Income</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</div>
              <p className="text-xs text-muted-foreground">Revenue from sales</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</div>
              <p className="text-xs text-muted-foreground">Business expenses</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receivables</CardTitle>
              <Coins className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalReceivables)}</div>
              <p className="text-xs text-muted-foreground">Money owed to you</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Payables</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{formatCurrency(totalPayables)}</div>
              <p className="text-xs text-muted-foreground">Money you owe</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Position</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${netPosition >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(netPosition)}
              </div>
              <p className="text-xs text-muted-foreground">
                {netPosition >= 0 ? "Positive" : "Negative"} cash flow
              </p>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Monetary Assets Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No monetary assets found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Badge variant={
                            item.type === "income" ? "default" : 
                            item.type === "expense" ? "destructive" : 
                            item.type === "receivable" ? "secondary" : "outline"
                          }>
                            {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.category || "N/A"}</TableCell>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className={`font-medium ${
                          item.type === "income" || item.type === "receivable" ? "text-green-600" : "text-red-600"
                        }`}>
                          {item.type === "income" || item.type === "receivable" ? "+" : "-"}
                          {formatCurrency(item.amount)}
                        </TableCell>
                        <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant={
                            item.status === "completed" ? "default" : 
                            item.status === "overdue" ? "destructive" : "secondary"
                          }>
                            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.reference || "N/A"}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openEditDialog(item)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => item.id && handleDeleteItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};