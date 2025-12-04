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
import { Search, Plus, Edit, Trash2, Users, Truck, Wallet, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
// Import database service functions
import { getDebts, createDebt, updateDebt, deleteDebt, getCustomers, getSuppliers, Customer as DatabaseCustomer, Supplier as DatabaseSupplier } from "@/services/databaseService";

interface Debt {
  id: string;
  partyId: string;
  partyName: string;
  partyType: "customer" | "supplier";
  amount: number;
  dueDate?: string;
  status: "outstanding" | "paid" | "overdue";
  description: string;
  createdAt: string;
  updatedAt: string;
}

export const DebtManagement = ({ username, onBack, onLogout }: { username: string; onBack: () => void; onLogout: () => void }) => {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [partyTypeFilter, setPartyTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [newDebt, setNewDebt] = useState<Omit<Debt, "id" | "createdAt" | "updatedAt">>({
    partyId: "",
    partyName: "",
    partyType: "customer",
    amount: 0,
    status: "outstanding",
    description: ""
  });
  const { toast } = useToast();

  // Load debts and related data from database on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load debts
        const debtData = await getDebts();
        
        // Load customers and suppliers for name resolution
        const customerData = await getCustomers();
        const supplierData = await getSuppliers();
        
        // Map database debts to UI format
        const mappedDebts = debtData.map(debt => {
          let partyName = "Unknown";
          let partyType: "customer" | "supplier" = "customer";
          
          if (debt.customer_id) {
            const customer = customerData.find(c => c.id === debt.customer_id);
            partyName = customer ? `${customer.first_name} ${customer.last_name}` : "Unknown Customer";
            partyType = "customer";
          } else if (debt.supplier_id) {
            const supplier = supplierData.find(s => s.id === debt.supplier_id);
            partyName = supplier ? supplier.name : "Unknown Supplier";
            partyType = "supplier";
          }
          
          return {
            id: debt.id || '',
            partyId: debt.customer_id || debt.supplier_id || '',
            partyName,
            partyType,
            amount: debt.amount,
            dueDate: debt.due_date || undefined,
            status: debt.status as "outstanding" | "paid" | "overdue",
            description: debt.description || '',
            createdAt: debt.created_at ? new Date(debt.created_at).toISOString().split('T')[0] : '',
            updatedAt: debt.updated_at ? new Date(debt.updated_at).toISOString().split('T')[0] : ''
          };
        });
        
        setDebts(mappedDebts);
      } catch (error) {
        console.error("Error loading data:", error);
        toast({
          title: "Error",
          description: "Failed to load debt records",
          variant: "success",
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleAddDebt = async () => {
    if (!newDebt.partyName || newDebt.amount <= 0) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "success"
      });
      return;
    }

    try {
      // Prepare debt data for database
      const debtData = {
        // For now, we'll just create customer debts since we don't have supplier ID mapping
        customer_id: newDebt.partyType === "customer" ? newDebt.partyId || null : null,
        supplier_id: newDebt.partyType === "supplier" ? newDebt.partyId || null : null,
        debt_type: newDebt.partyType,
        amount: newDebt.amount,
        description: newDebt.description,
        due_date: newDebt.dueDate || null,
        status: newDebt.status
      };

      const createdDebt = await createDebt(debtData);
      
      if (createdDebt) {
        // Map to UI format
        const mappedDebt: Debt = {
          id: createdDebt.id || '',
          partyId: createdDebt.customer_id || createdDebt.supplier_id || '',
          partyName: newDebt.partyName,
          partyType: newDebt.partyType,
          amount: createdDebt.amount,
          dueDate: createdDebt.due_date || undefined,
          status: createdDebt.status as "outstanding" | "paid" | "overdue",
          description: createdDebt.description || '',
          createdAt: createdDebt.created_at ? new Date(createdDebt.created_at).toISOString().split('T')[0] : '',
          updatedAt: createdDebt.updated_at ? new Date(createdDebt.updated_at).toISOString().split('T')[0] : ''
        };

        setDebts([...debts, mappedDebt]);
        resetForm();
        setIsDialogOpen(false);
        
        toast({
          title: "Success",
          description: "Debt record added successfully"
        });
      } else {
        throw new Error("Failed to create debt record");
      }
    } catch (error) {
      console.error("Error creating debt:", error);
      toast({
        title: "Error",
        description: "Failed to add debt record: " + (error as Error).message,
        variant: "success",
      });
    }
  };

  const handleUpdateDebt = async () => {
    if (!editingDebt || !editingDebt.partyName || editingDebt.amount <= 0) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "success"
      });
      return;
    }

    try {
      // Prepare debt data for database
      const debtData = {
        // For now, we'll just update customer debts since we don't have supplier ID mapping
        customer_id: editingDebt.partyType === "customer" ? editingDebt.partyId || null : null,
        supplier_id: editingDebt.partyType === "supplier" ? editingDebt.partyId || null : null,
        debt_type: editingDebt.partyType,
        amount: editingDebt.amount,
        description: editingDebt.description,
        due_date: editingDebt.dueDate || null,
        status: editingDebt.status
      };

      const updatedDebt = await updateDebt(editingDebt.id, debtData);
      
      if (updatedDebt) {
        // Map to UI format
        const mappedDebt: Debt = {
          id: updatedDebt.id || '',
          partyId: updatedDebt.customer_id || updatedDebt.supplier_id || '',
          partyName: editingDebt.partyName,
          partyType: editingDebt.partyType,
          amount: updatedDebt.amount,
          dueDate: updatedDebt.due_date || undefined,
          status: updatedDebt.status as "outstanding" | "paid" | "overdue",
          description: updatedDebt.description || '',
          createdAt: updatedDebt.created_at ? new Date(updatedDebt.created_at).toISOString().split('T')[0] : '',
          updatedAt: updatedDebt.updated_at ? new Date(updatedDebt.updated_at).toISOString().split('T')[0] : ''
        };

        setDebts(debts.map(d => d.id === editingDebt.id ? mappedDebt : d));
        resetForm();
        setIsDialogOpen(false);
        
        toast({
          title: "Success",
          description: "Debt record updated successfully"
        });
      } else {
        throw new Error("Failed to update debt record");
      }
    } catch (error) {
      console.error("Error updating debt:", error);
      toast({
        title: "Error",
        description: "Failed to update debt record: " + (error as Error).message,
        variant: "success",
      });
    }
  };

  const handleDeleteDebt = async (id: string) => {
    try {
      const success = await deleteDebt(id);
      
      if (success) {
        setDebts(debts.filter(d => d.id !== id));
        toast({
          title: "Success",
          description: "Debt record deleted successfully"
        });
      } else {
        throw new Error("Failed to delete debt record");
      }
    } catch (error) {
      console.error("Error deleting debt:", error);
      toast({
        title: "Error",
        description: "Failed to delete debt record: " + (error as Error).message,
        variant: "success",
      });
    }
  };

  const resetForm = () => {
    setNewDebt({
      partyId: "",
      partyName: "",
      partyType: "customer",
      amount: 0,
      status: "outstanding",
      description: ""
    });
    setEditingDebt(null);
  };

  const openEditDialog = (debt: Debt) => {
    setEditingDebt(debt);
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const totalOutstanding = debts
    .filter(d => d.status === "outstanding")
    .reduce((sum, debt) => sum + debt.amount, 0);
    
  const totalOverdue = debts
    .filter(d => d.status === "overdue")
    .reduce((sum, debt) => sum + debt.amount, 0);

  const filteredDebts = debts.filter(debt => {
    const matchesSearch = 
      debt.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      debt.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPartyType = partyTypeFilter === "all" || debt.partyType === partyTypeFilter;
    const matchesStatus = statusFilter === "all" || debt.status === statusFilter;
    
    return matchesSearch && matchesPartyType && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navigation 
        title="Debt Management" 
        onBack={onBack}
        onLogout={onLogout} 
        username={username}
      />
      
      <main className="container mx-auto p-6">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold">Debts</h2>
            <p className="text-muted-foreground">Manage customer and supplier debts</p>
          </div>
          
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search debts..."
                className="pl-8 w-full sm:w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Select value={partyTypeFilter} onValueChange={setPartyTypeFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="customer">Customers</SelectItem>
                <SelectItem value="supplier">Suppliers</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="outstanding">Outstanding</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openAddDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Debt
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingDebt ? "Edit Debt" : "Add New Debt"}
                  </DialogTitle>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="partyType">Party Type *</Label>
                    <Select
                      value={editingDebt ? editingDebt.partyType : newDebt.partyType}
                      onValueChange={(value: "customer" | "supplier") => 
                        editingDebt 
                          ? setEditingDebt({...editingDebt, partyType: value}) 
                          : setNewDebt({...newDebt, partyType: value})
                      }
                    >
                      <SelectTrigger id="partyType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="customer">Customer</SelectItem>
                        <SelectItem value="supplier">Supplier</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="partyName">Party Name *</Label>
                    <Input
                      id="partyName"
                      value={editingDebt ? editingDebt.partyName : newDebt.partyName}
                      onChange={(e) => 
                        editingDebt 
                          ? setEditingDebt({...editingDebt, partyName: e.target.value}) 
                          : setNewDebt({...newDebt, partyName: e.target.value})
                      }
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="amount">Amount *</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                        <Input
                          id="amount"
                          type="number"
                          step="0.01"
                          className="pl-8"
                          value={editingDebt ? editingDebt.amount : newDebt.amount}
                          onChange={(e) => 
                            editingDebt 
                              ? setEditingDebt({...editingDebt, amount: parseFloat(e.target.value) || 0}) 
                              : setNewDebt({...newDebt, amount: parseFloat(e.target.value) || 0})
                          }
                        />
                      </div>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="dueDate">Due Date</Label>
                      <Input
                        id="dueDate"
                        type="date"
                        value={editingDebt ? editingDebt.dueDate || "" : ""}
                        onChange={(e) => 
                          editingDebt 
                            ? setEditingDebt({...editingDebt, dueDate: e.target.value || undefined}) 
                            : null
                        }
                      />
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={editingDebt ? editingDebt.status : newDebt.status}
                      onValueChange={(value: "outstanding" | "paid" | "overdue") => 
                        editingDebt 
                          ? setEditingDebt({...editingDebt, status: value}) 
                          : setNewDebt({...newDebt, status: value})
                      }
                    >
                      <SelectTrigger id="status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="outstanding">Outstanding</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={editingDebt ? editingDebt.description : newDebt.description}
                      onChange={(e) => 
                        editingDebt 
                          ? setEditingDebt({...editingDebt, description: e.target.value}) 
                          : setNewDebt({...newDebt, description: e.target.value})
                      }
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={editingDebt ? handleUpdateDebt : handleAddDebt}>
                    {editingDebt ? "Update" : "Add"} Debt
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
              <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalOutstanding)}</div>
              <p className="text-xs text-muted-foreground">Across all parties</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue Amount</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{formatCurrency(totalOverdue)}</div>
              <p className="text-xs text-muted-foreground">Requires immediate attention</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Records</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{debts.length}</div>
              <p className="text-xs text-muted-foreground">Active debt records</p>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Debt Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading debt records...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Party</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDebts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No debt records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDebts.map((debt) => (
                      <TableRow key={debt.id}>
                        <TableCell>
                          <div className="font-medium">{debt.partyName}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={debt.partyType === "customer" ? "default" : "secondary"}>
                            {debt.partyType === "customer" ? (
                              <Users className="h-3 w-3 mr-1" />
                            ) : (
                              <Truck className="h-3 w-3 mr-1" />
                            )}
                            {debt.partyType}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{debt.description}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(debt.amount)}</TableCell>
                        <TableCell>{debt.dueDate || "N/A"}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              debt.status === "paid" ? "default" : 
                              debt.status === "outstanding" ? "secondary" : "destructive"
                            }
                          >
                            {debt.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openEditDialog(debt)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => handleDeleteDebt(debt.id)}
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