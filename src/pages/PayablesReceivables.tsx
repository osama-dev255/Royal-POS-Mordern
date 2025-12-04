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
import { Search, Plus, Edit, Trash2, Wallet, Users, Truck, FileText, Filter, Download, Printer, FileSpreadsheet, Loader2, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import { ExportUtils } from "@/utils/exportUtils";
import { PrintUtils } from "@/utils/printUtils";
import { ExcelUtils } from "@/utils/excelUtils";
import { 
  getCustomerSettlements, 
  getSupplierSettlements, 
  createCustomerSettlement, 
  createSupplierSettlement, 
  updateCustomerSettlement, 
  updateSupplierSettlement, 
  deleteCustomerSettlement, 
  deleteSupplierSettlement,
  createCustomer,
  createSupplier
} from "@/services/databaseService";
import { getCustomers } from "@/services/databaseService";
import { getSuppliers } from "@/services/databaseService";

interface PayableReceivable {
  id?: string;
  partyId: string;
  partyName: string;
  type: "receivable" | "payable";
  amount: number;
  dueDate?: string;
  status: "pending" | "paid" | "overdue";
  paymentMethod?: string;
  referenceNumber?: string;
  notes?: string;
  createdAt?: string;
}

interface Party {
  id: string;
  name: string;
  type: "customer" | "supplier";
}

export const PayablesReceivables = ({ username, onBack, onLogout }: { username: string; onBack: () => void; onLogout: () => void }) => {
  const [payablesReceivables, setPayablesReceivables] = useState<PayableReceivable[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPartyDialogOpen, setIsPartyDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PayableReceivable | null>(null);
  const [newItem, setNewItem] = useState<Omit<PayableReceivable, "id">>({
    partyId: "",
    partyName: "",
    type: "receivable",
    amount: 0,
    status: "pending",
    paymentMethod: ""
  });
  const [newParty, setNewParty] = useState<{type: "customer" | "supplier", firstName: string, lastName: string, name: string, email: string, phone: string}>({
    type: "customer",
    firstName: "",
    lastName: "",
    name: "",
    email: "",
    phone: ""
  });
  const { toast } = useToast();

  // Load data from Supabase
  useEffect(() => {
    loadData();
    loadParties();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load customer settlements (receivables)
      const customerSettlements = await getCustomerSettlements();
      const receivables = customerSettlements.map(settlement => ({
        id: settlement.id,
        partyId: settlement.customer_id || "",
        partyName: "Customer", // We'll update this with actual customer names
        type: "receivable" as const,
        amount: settlement.amount,
        dueDate: settlement.settlement_date,
        status: "pending" as const, // Simplified for this example
        paymentMethod: settlement.payment_method,
        referenceNumber: settlement.reference_number,
        notes: settlement.notes,
        createdAt: settlement.created_at
      }));

      // Load supplier settlements (payables)
      const supplierSettlements = await getSupplierSettlements();
      const payables = supplierSettlements.map(settlement => ({
        id: settlement.id,
        partyId: settlement.supplier_id || "",
        partyName: "Supplier", // We'll update this with actual supplier names
        type: "payable" as const,
        amount: settlement.amount,
        dueDate: settlement.settlement_date,
        status: "pending" as const, // Simplified for this example
        paymentMethod: settlement.payment_method,
        referenceNumber: settlement.reference_number,
        notes: settlement.notes,
        createdAt: settlement.created_at
      }));

      // Combine payables and receivables
      const combinedData = [...receivables, ...payables];
      setPayablesReceivables(combinedData);
    } catch (error) {
      console.error('Error loading payables & receivables:', error);
      toast({
        title: "Error",
        description: "Failed to load payables & receivables data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadParties = async () => {
    try {
      // Load customers
      const customers = await getCustomers();
      const customerParties: Party[] = customers.map(customer => ({
        id: customer.id || "",
        name: `${customer.first_name} ${customer.last_name}`,
        type: "customer"
      }));

      // Load suppliers
      const suppliers = await getSuppliers();
      const supplierParties: Party[] = suppliers.map(supplier => ({
        id: supplier.id || "",
        name: supplier.name,
        type: "supplier"
      }));

      setParties([...customerParties, ...supplierParties]);
    } catch (error) {
      console.error('Error loading parties:', error);
      toast({
        title: "Error",
        description: "Failed to load customer and supplier data",
        variant: "destructive"
      });
    }
  };

  const handleAddItem = async () => {
    if (!newItem.partyId || newItem.amount <= 0) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      // Get party name
      const party = parties.find(p => p.id === newItem.partyId);
      const partyName = party ? party.name : "";

      if (newItem.type === "receivable") {
        // Create customer settlement
        const settlementData = {
          customer_id: newItem.partyId,
          amount: newItem.amount,
          payment_method: newItem.paymentMethod || "",
          reference_number: newItem.referenceNumber || "",
          notes: newItem.notes || "",
          settlement_date: newItem.dueDate || new Date().toISOString()
        };

        const result = await createCustomerSettlement(settlementData);
        if (result) {
          await loadData(); // Reload data to get the new one
          resetForm();
          setIsDialogOpen(false);
          
          toast({
            title: "Success",
            description: "Receivable added successfully"
          });
        } else {
          throw new Error("Failed to create receivable");
        }
      } else {
        // Create supplier settlement
        const settlementData = {
          supplier_id: newItem.partyId,
          amount: newItem.amount,
          payment_method: newItem.paymentMethod || "",
          reference_number: newItem.referenceNumber || "",
          notes: newItem.notes || "",
          settlement_date: newItem.dueDate || new Date().toISOString()
        };

        const result = await createSupplierSettlement(settlementData);
        if (result) {
          await loadData(); // Reload data to get the new one
          resetForm();
          setIsDialogOpen(false);
          
          toast({
            title: "Success",
            description: "Payable added successfully"
          });
        } else {
          throw new Error("Failed to create payable");
        }
      }
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
    if (!editingItem || !editingItem.partyId || editingItem.amount <= 0) {
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

      if (editingItem.type === "receivable") {
        // Update customer settlement
        const settlementData = {
          customer_id: editingItem.partyId,
          amount: editingItem.amount,
          payment_method: editingItem.paymentMethod || "",
          reference_number: editingItem.referenceNumber || "",
          notes: editingItem.notes || "",
          settlement_date: editingItem.dueDate || new Date().toISOString()
        };

        const result = await updateCustomerSettlement(editingItem.id, settlementData);
        if (result) {
          await loadData(); // Reload data to get the updated one
          resetForm();
          setIsDialogOpen(false);
          
          toast({
            title: "Success",
            description: "Receivable updated successfully"
          });
        } else {
          throw new Error("Failed to update receivable");
        }
      } else {
        // Update supplier settlement
        const settlementData = {
          supplier_id: editingItem.partyId,
          amount: editingItem.amount,
          payment_method: editingItem.paymentMethod || "",
          reference_number: editingItem.referenceNumber || "",
          notes: editingItem.notes || "",
          settlement_date: editingItem.dueDate || new Date().toISOString()
        };

        const result = await updateSupplierSettlement(editingItem.id, settlementData);
        if (result) {
          await loadData(); // Reload data to get the updated one
          resetForm();
          setIsDialogOpen(false);
          
          toast({
            title: "Success",
            description: "Payable updated successfully"
          });
        } else {
          throw new Error("Failed to update payable");
        }
      }
    } catch (error) {
      console.error('Error updating item:', error);
      toast({
        title: "Error",
        description: "Failed to update item",
        variant: "destructive"
      });
    }
  };

  const handleDeleteItem = async (id: string, type: "receivable" | "payable") => {
    try {
      let result = false;
      
      if (type === "receivable") {
        result = await deleteCustomerSettlement(id);
      } else {
        result = await deleteSupplierSettlement(id);
      }

      if (result) {
        await loadData(); // Reload data to reflect the deletion
        
        toast({
          title: "Success",
          description: "Item deleted successfully"
        });
      } else {
        throw new Error("Failed to delete item");
      }
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
      partyId: "",
      partyName: "",
      type: "receivable",
      amount: 0,
      status: "pending",
      paymentMethod: ""
    });
    setEditingItem(null);
  };

  const resetPartyForm = () => {
    setNewParty({
      type: "customer",
      firstName: "",
      lastName: "",
      name: "",
      email: "",
      phone: ""
    });
  };

  const handleCreateParty = async () => {
    try {
      let newPartyId = "";
      let newPartyName = "";

      if (newParty.type === "customer") {
        // Create customer
        const customerData = {
          first_name: newParty.firstName,
          last_name: newParty.lastName,
          email: newParty.email,
          phone: newParty.phone,
          is_active: true
        };

        const result = await createCustomer(customerData);
        if (result && result.id) {
          newPartyId = result.id;
          newPartyName = `${result.first_name} ${result.last_name}`;
        } else {
          throw new Error("Failed to create customer");
        }
      } else {
        // Create supplier
        const supplierData = {
          name: newParty.name,
          contact_person: `${newParty.firstName} ${newParty.lastName}`,
          email: newParty.email,
          phone: newParty.phone,
          is_active: true
        };

        const result = await createSupplier(supplierData);
        if (result && result.id) {
          newPartyId = result.id;
          newPartyName = result.name;
        } else {
          throw new Error("Failed to create supplier");
        }
      }

      // Add new party to the parties list
      const newPartyObj: Party = {
        id: newPartyId,
        name: newPartyName,
        type: newParty.type
      };

      setParties(prev => [...prev, newPartyObj]);

      // If we're in the main dialog, set this as the selected party
      if (isDialogOpen) {
        if (editingItem) {
          setEditingItem({...editingItem, partyId: newPartyId, partyName: newPartyName});
        } else {
          setNewItem({...newItem, partyId: newPartyId, partyName: newPartyName});
        }
      }

      // Close the party dialog and show success message
      setIsPartyDialogOpen(false);
      resetPartyForm();

      toast({
        title: "Success",
        description: `${newParty.type === "customer" ? "Customer" : "Supplier"} created successfully`
      });
    } catch (error) {
      console.error('Error creating party:', error);
      toast({
        title: "Error",
        description: `Failed to create ${newParty.type === "customer" ? "customer" : "supplier"}`,
        variant: "destructive"
      });
    }
  };

  const openEditDialog = (item: PayableReceivable) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openPartyDialog = () => {
    resetPartyForm();
    setIsPartyDialogOpen(true);
  };

  const totalReceivables = payablesReceivables
    .filter(item => item.type === "receivable")
    .reduce((sum, item) => sum + item.amount, 0);
    
  const totalPayables = payablesReceivables
    .filter(item => item.type === "payable")
    .reduce((sum, item) => sum + item.amount, 0);

  const filteredItems = payablesReceivables.filter(item => {
    const matchesSearch = 
      item.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.referenceNumber && item.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = typeFilter === "all" || item.type === typeFilter;
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navigation 
        title="Payables & Receivables Management" 
        onBack={onBack}
        onLogout={onLogout} 
        username={username}
      />
      
      <main className="container mx-auto p-6">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold">Payables & Receivables</h2>
            <p className="text-muted-foreground">Manage accounts payable and receivable</p>
          </div>
          
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
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
                <SelectItem value="receivable">Receivables</SelectItem>
                <SelectItem value="payable">Payables</SelectItem>
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
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
            
            <Button onClick={() => PrintUtils.printSalesReport(payablesReceivables)}>
              <Printer className="h-4 w-4 mr-2" />
              Print Report
            </Button>
            
            <Button onClick={() => ExportUtils.exportToCSV(payablesReceivables, `payables_receivables_${new Date().toISOString().split('T')[0]}`)}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            
            <Button variant="outline" onClick={() => ExcelUtils.exportToExcel(payablesReceivables, `payables_receivables_${new Date().toISOString().split('T')[0]}`)}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
            
            <div className="flex gap-2">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={openAddDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {editingItem ? "Edit Item" : "Add New Item"}
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
                              ? setEditingItem({...editingItem, type: value as "receivable" | "payable"}) 
                              : setNewItem({...newItem, type: value as "receivable" | "payable"})
                          }
                        >
                          <SelectTrigger id="type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="receivable">Receivable</SelectItem>
                            <SelectItem value="payable">Payable</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="party">Party *</Label>
                        <div className="flex gap-2">
                          <Select
                            value={editingItem ? editingItem.partyId : newItem.partyId}
                            onValueChange={(value) => {
                              const party = parties.find(p => p.id === value);
                              const partyName = party ? party.name : "";
                              editingItem 
                                ? setEditingItem({...editingItem, partyId: value, partyName}) 
                                : setNewItem({...newItem, partyId: value, partyName})
                            }}
                          >
                            <SelectTrigger id="party">
                              <SelectValue placeholder="Select party" />
                            </SelectTrigger>
                            <SelectContent>
                              {parties
                                .filter(party => 
                                  !editingItem || 
                                  (editingItem.type === "receivable" && party.type === "customer") || 
                                  (editingItem.type === "payable" && party.type === "supplier")
                                )
                                .map(party => (
                                  <SelectItem 
                                    key={party.id} 
                                    value={party.id}
                                    disabled={
                                      (editingItem && editingItem.type === "receivable" && party.type === "supplier") ||
                                      (editingItem && editingItem.type === "payable" && party.type === "customer")
                                    }
                                  >
                                    {party.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="icon"
                            onClick={openPartyDialog}
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
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
                        <Label htmlFor="dueDate">Due Date</Label>
                        <Input
                          id="dueDate"
                          type="date"
                          value={editingItem ? editingItem.dueDate?.split('T')[0] || "" : newItem.dueDate?.split('T')[0] || ""}
                          onChange={(e) => 
                            editingItem 
                              ? setEditingItem({...editingItem, dueDate: e.target.value}) 
                              : setNewItem({...newItem, dueDate: e.target.value})
                          }
                        />
                      </div>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="paymentMethod">Payment Method</Label>
                      <Input
                        id="paymentMethod"
                        value={editingItem ? editingItem.paymentMethod || "" : newItem.paymentMethod || ""}
                        onChange={(e) => 
                          editingItem 
                            ? setEditingItem({...editingItem, paymentMethod: e.target.value}) 
                            : setNewItem({...newItem, paymentMethod: e.target.value})
                        }
                        placeholder="Cash, Bank Transfer, etc."
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="referenceNumber">Reference Number</Label>
                      <Input
                        id="referenceNumber"
                        value={editingItem ? editingItem.referenceNumber || "" : newItem.referenceNumber || ""}
                        onChange={(e) => 
                          editingItem 
                            ? setEditingItem({...editingItem, referenceNumber: e.target.value}) 
                            : setNewItem({...newItem, referenceNumber: e.target.value})
                        }
                        placeholder="Invoice #, Check #, etc."
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
                      {editingItem ? "Update" : "Add"} Item
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              
              {/* Party Creation Dialog */}
              <Dialog open={isPartyDialogOpen} onOpenChange={setIsPartyDialogOpen}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      Add New Party
                    </DialogTitle>
                  </DialogHeader>
                  
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="partyType">Party Type *</Label>
                      <Select
                        value={newParty.type}
                        onValueChange={(value) => setNewParty({...newParty, type: value as "customer" | "supplier"})}
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
                    
                    {newParty.type === "customer" ? (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="firstName">First Name *</Label>
                            <Input
                              id="firstName"
                              value={newParty.firstName}
                              onChange={(e) => setNewParty({...newParty, firstName: e.target.value})}
                              placeholder="First name"
                            />
                          </div>
                          
                          <div className="grid gap-2">
                            <Label htmlFor="lastName">Last Name *</Label>
                            <Input
                              id="lastName"
                              value={newParty.lastName}
                              onChange={(e) => setNewParty({...newParty, lastName: e.target.value})}
                              placeholder="Last name"
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="grid gap-2">
                        <Label htmlFor="supplierName">Supplier Name *</Label>
                        <Input
                          id="supplierName"
                          value={newParty.name}
                          onChange={(e) => setNewParty({...newParty, name: e.target.value})}
                          placeholder="Supplier name"
                        />
                      </div>
                    )}
                    
                    <div className="grid gap-2">
                      <Label htmlFor="partyEmail">Email</Label>
                      <Input
                        id="partyEmail"
                        type="email"
                        value={newParty.email}
                        onChange={(e) => setNewParty({...newParty, email: e.target.value})}
                        placeholder="Email address"
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="partyPhone">Phone</Label>
                      <Input
                        id="partyPhone"
                        value={newParty.phone}
                        onChange={(e) => setNewParty({...newParty, phone: e.target.value})}
                        placeholder="Phone number"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsPartyDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateParty}>
                      Create Party
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
         
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Receivables</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalReceivables)}</div>
              <p className="text-xs text-muted-foreground">Amount owed to you</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Payables</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalPayables)}</div>
              <p className="text-xs text-muted-foreground">Amount you owe</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Position</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalReceivables - totalPayables)}</div>
              <p className="text-xs text-muted-foreground">
                {totalReceivables >= totalPayables ? "Positive" : "Negative"} cash flow
              </p>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Payables & Receivables Records
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
                    <TableHead>Party</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No items found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.partyName}</TableCell>
                        <TableCell>
                          <Badge variant={item.type === "receivable" ? "default" : "secondary"}>
                            {item.type === "receivable" ? "Receivable" : "Payable"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{formatCurrency(item.amount)}</TableCell>
                        <TableCell>{item.dueDate ? new Date(item.dueDate).toLocaleDateString() : "N/A"}</TableCell>
                        <TableCell>
                          <Badge variant={
                            item.status === "paid" ? "default" : 
                            item.status === "overdue" ? "destructive" : "secondary"
                          }>
                            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.paymentMethod || "N/A"}</TableCell>
                        <TableCell>{item.referenceNumber || "N/A"}</TableCell>
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
                              onClick={() => item.id && handleDeleteItem(item.id, item.type)}
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