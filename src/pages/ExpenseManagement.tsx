import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Edit, Trash2, Wallet, Calendar, Filter, Tag, Download, Printer, FileSpreadsheet, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import { AutomationService } from "@/services/automationService";
import { ExportUtils } from "@/utils/exportUtils";
import { PrintUtils } from "@/utils/printUtils";
import { ExcelUtils } from "@/utils/excelUtils";
import { getExpenses, createExpense, updateExpense, deleteExpense } from "@/services/databaseService";

interface Expense {
  id?: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  paymentMethod: string;
  receipt?: string;
}

const expenseCategories = [
  "Cost of Goods Sold (COGS)",
  "Salaries & Wages",
  "Rent / Premises",
  "Electricity Charges",
  "Water Charges",
  "Phone Charges",
  "Transport & Fuel",
  "Repairs & Maintenance",
  "Depreciation / Capital Allowances",
  "Marketing & Advertising",
  "Professional Fees",
  "Insurance",
  "Bank Charges & Interest",
  "Licenses & Permits",
  "Office Supplies & Stationery",
  "Security Costs",
  "Training & Staff Development",
  "Travel & Accommodation (Business Trips)",
  "Software & Technology Subscriptions",
  "Internet and Communication",
  "Cleaning & Sanitation",
  "Bad Debts (Unrecoverable Debts)",
  "Membership & Association Fees",
  "Small Tools & Equipment",
  "Donations & Corporate Social Responsibility (CSR)",
  "Bank Loan Processing Fees",
  "Software Licenses & Renewals",
  "Warehouse or Storage Costs",
  "Business interest",
  "Discount allowance",
  "Commission allowance"
];

const paymentMethods = [
  "Cash",
  "Credit Card",
  "Debit Card",
  "Bank Transfer",
  "Check"
];

export const ExpenseManagement = ({ username, onBack, onLogout }: { username: string; onBack: () => void; onLogout: () => void }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [newExpense, setNewExpense] = useState<Omit<Expense, "id">>({
    date: new Date().toISOString().split('T')[0],
    category: expenseCategories[0],
    description: "",
    amount: 0,
    paymentMethod: paymentMethods[0]
  });
  const { toast } = useToast();

  // Load expenses from Supabase
  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const expensesData = await getExpenses();
      // Convert Supabase expense format to component format
      const formattedExpenses = expensesData.map(expense => ({
        id: expense.id,
        date: expense.expense_date,
        category: expense.category,
        description: expense.description,
        amount: expense.amount,
        paymentMethod: expense.payment_method,
      }));
      setExpenses(formattedExpenses);
    } catch (error) {
      console.error('Error loading expenses:', error);
      toast({
        title: "Error",
        description: "Failed to load expenses",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async () => {
    if (!newExpense.description || newExpense.amount <= 0) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      // Convert component format to Supabase format
      const expenseData = {
        expense_date: newExpense.date,
        category: newExpense.category,
        description: newExpense.description,
        amount: newExpense.amount,
        payment_method: newExpense.paymentMethod
      };

      const result = await createExpense(expenseData);
      if (result) {
        await loadExpenses(); // Reload expenses to get the new one
        resetForm();
        setIsDialogOpen(false);
        
        toast({
          title: "Success",
          description: "Expense added successfully"
        });
      } else {
        throw new Error("Failed to create expense");
      }
    } catch (error) {
      console.error('Error adding expense:', error);
      toast({
        title: "Error",
        description: "Failed to add expense",
        variant: "destructive"
      });
    }
  };

  const handleUpdateExpense = async () => {
    if (!editingExpense || !editingExpense.description || editingExpense.amount <= 0) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      if (!editingExpense.id) {
        throw new Error("Expense ID is missing");
      }

      // Convert component format to Supabase format
      const expenseData = {
        expense_date: editingExpense.date,
        category: editingExpense.category,
        description: editingExpense.description,
        amount: editingExpense.amount,
        payment_method: editingExpense.paymentMethod
      };

      const result = await updateExpense(editingExpense.id, expenseData);
      if (result) {
        await loadExpenses(); // Reload expenses to get the updated one
        resetForm();
        setIsDialogOpen(false);
        
        toast({
          title: "Success",
          description: "Expense updated successfully"
        });
      } else {
        throw new Error("Failed to update expense");
      }
    } catch (error) {
      console.error('Error updating expense:', error);
      toast({
        title: "Error",
        description: "Failed to update expense",
        variant: "destructive"
      });
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      const result = await deleteExpense(id);
      if (result) {
        await loadExpenses(); // Reload expenses to reflect the deletion
        
        toast({
          title: "Success",
          description: "Expense deleted successfully"
        });
      } else {
        throw new Error("Failed to delete expense");
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast({
        title: "Error",
        description: "Failed to delete expense",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setNewExpense({
      date: new Date().toISOString().split('T')[0],
      category: expenseCategories[0],
      description: "",
      amount: 0,
      paymentMethod: paymentMethods[0]
    });
    setEditingExpense(null);
  };

  const openEditDialog = (expense: Expense) => {
    setEditingExpense(expense);
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  
  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = 
      expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === "all" || expense.category === categoryFilter;
    // Removed status filter since the status field doesn't exist in the database
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navigation 
        title="Expense Management" 
        onBack={onBack}
        onLogout={onLogout} 
        username={username}
      />
      
      <main className="container mx-auto p-6">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold">Expenses</h2>
            <p className="text-muted-foreground">Track and manage business expenses</p>
          </div>
          
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search expenses..."
                className="pl-8 w-full sm:w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-32">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {expenseCategories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button onClick={() => PrintUtils.printSalesReport(expenses)}>
              <Printer className="h-4 w-4 mr-2" />
              Print Report
            </Button>
            
            <Button onClick={() => ExportUtils.exportToCSV(expenses, `expenses_${new Date().toISOString().split('T')[0]}`)}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            
            <Button variant="outline" onClick={() => ExcelUtils.exportToExcel(expenses, `expenses_${new Date().toISOString().split('T')[0]}`)}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openAddDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Expense
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingExpense ? "Edit Expense" : "Add New Expense"}
                  </DialogTitle>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="date">Date *</Label>
                      <Input
                        id="date"
                        type="date"
                        value={editingExpense ? editingExpense.date : newExpense.date}
                        onChange={(e) => 
                          editingExpense 
                            ? setEditingExpense({...editingExpense, date: e.target.value}) 
                            : setNewExpense({...newExpense, date: e.target.value})
                        }
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="amount">Amount *</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-muted-foreground">TZS</span>
                        <Input
                          id="amount"
                          type="number"
                          step="0.01"
                          className="pl-8"
                          value={editingExpense ? editingExpense.amount : newExpense.amount}
                          onChange={(e) => 
                            editingExpense 
                              ? setEditingExpense({...editingExpense, amount: parseFloat(e.target.value) || 0}) 
                              : setNewExpense({...newExpense, amount: parseFloat(e.target.value) || 0})
                          }
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={editingExpense ? editingExpense.category : newExpense.category}
                      onValueChange={(value) => 
                        editingExpense 
                          ? setEditingExpense({...editingExpense, category: value}) 
                          : setNewExpense({...newExpense, category: value})
                      }
                    >
                      <SelectTrigger id="category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {expenseCategories.map(category => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      value={editingExpense ? editingExpense.description : newExpense.description}
                      onChange={(e) => 
                        editingExpense 
                          ? setEditingExpense({...editingExpense, description: e.target.value}) 
                          : setNewExpense({...newExpense, description: e.target.value})
                      }
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="paymentMethod">Payment Method</Label>
                    <Select
                      value={editingExpense ? editingExpense.paymentMethod : newExpense.paymentMethod}
                      onValueChange={(value) => 
                        editingExpense 
                          ? setEditingExpense({...editingExpense, paymentMethod: value}) 
                          : setNewExpense({...newExpense, paymentMethod: value})
                      }
                    >
                      <SelectTrigger id="paymentMethod">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentMethods.map(method => (
                          <SelectItem key={method} value={method}>{method}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={editingExpense ? handleUpdateExpense : handleAddExpense}>
                    {editingExpense ? "Update" : "Add"} Expense
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Expenses</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {expenses.length}
              </div>
              <p className="text-xs text-muted-foreground">Total expenses</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
              <Filter className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{expenseCategories.length}</div>
              <p className="text-xs text-muted-foreground">Expense types</p>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Expense Records
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
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No expenses found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredExpenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>{expense.date}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{expense.category}</Badge>
                        </TableCell>
                        <TableCell>{expense.description}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(expense.amount)}</TableCell>
                        <TableCell>{expense.paymentMethod}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openEditDialog(expense)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => expense.id && handleDeleteExpense(expense.id)}
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