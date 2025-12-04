import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Edit, Trash2, Truck, Wallet, Calendar, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";

interface Settlement {
  id: string;
  supplierId: string;
  supplierName: string;
  date: string;
  amount: number;
  paymentMethod: string;
  reference: string;
  poNumber?: string;
  notes?: string;
  status: "completed" | "pending" | "cancelled";
}

const paymentMethods = [
  "Cash",
  "Credit Card",
  "Debit Card",
  "Bank Transfer",
  "Check",
  "Other"
];

export const SupplierSettlements = ({ username, onBack, onLogout }: { username: string; onBack: () => void; onLogout: () => void }) => {
  const [settlements, setSettlements] = useState<Settlement[]>([
    {
      id: "1",
      supplierId: "2",
      supplierName: "Global Home Goods",
      date: "2023-05-10",
      amount: 500.00,
      paymentMethod: "Bank Transfer",
      reference: "SUP-001",
      poNumber: "PO-002",
      notes: "Payment for purchase order",
      status: "completed"
    }
  ]);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSettlement, setEditingSettlement] = useState<Settlement | null>(null);
  const [newSettlement, setNewSettlement] = useState<Omit<Settlement, "id">>({
    supplierId: "",
    supplierName: "",
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    paymentMethod: paymentMethods[0],
    reference: "",
    status: "completed"
  });
  const { toast } = useToast();

  const handleAddSettlement = () => {
    if (!newSettlement.supplierName || newSettlement.amount <= 0) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "destructive"
      });
      return;
    }

    // Generate reference number if not provided
    const reference = newSettlement.reference || `SUP-${String(settlements.length + 1).padStart(3, '0')}`;

    const settlement: Settlement = {
      ...newSettlement,
      id: Date.now().toString(),
      reference
    };

    setSettlements([...settlements, settlement]);
    resetForm();
    setIsDialogOpen(false);
    
    toast({
      title: "Success",
      description: "Supplier settlement recorded successfully"
    });
  };

  const handleUpdateSettlement = () => {
    if (!editingSettlement || !editingSettlement.supplierName || editingSettlement.amount <= 0) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "destructive"
      });
      return;
    }

    setSettlements(settlements.map(s => s.id === editingSettlement.id ? editingSettlement : s));
    resetForm();
    setIsDialogOpen(false);
    
    toast({
      title: "Success",
      description: "Supplier settlement updated successfully"
    });
  };

  const handleDeleteSettlement = (id: string) => {
    setSettlements(settlements.filter(s => s.id !== id));
    toast({
      title: "Success",
      description: "Supplier settlement deleted successfully"
    });
  };

  const resetForm = () => {
    setNewSettlement({
      supplierId: "",
      supplierName: "",
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      paymentMethod: paymentMethods[0],
      reference: "",
      status: "completed"
    });
    setEditingSettlement(null);
  };

  const openEditDialog = (settlement: Settlement) => {
    setEditingSettlement(settlement);
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const totalSettled = settlements.reduce((sum, settlement) => sum + settlement.amount, 0);

  const filteredSettlements = settlements.filter(settlement => {
    const matchesSearch = 
      settlement.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      settlement.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (settlement.poNumber && settlement.poNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || settlement.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navigation 
        title="Supplier Settlements" 
        onBack={onBack}
        onLogout={onLogout} 
        username={username}
      />
      
      <main className="container mx-auto p-6">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold">Supplier Settlements</h2>
            <p className="text-muted-foreground">Manage supplier payments and settlements</p>
          </div>
          
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search settlements..."
                className="pl-8 w-full sm:w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openAddDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Settlement
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingSettlement ? "Edit Settlement" : "Record New Settlement"}
                  </DialogTitle>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="date">Date *</Label>
                      <Input
                        id="date"
                        type="date"
                        value={editingSettlement ? editingSettlement.date : newSettlement.date}
                        onChange={(e) => 
                          editingSettlement 
                            ? setEditingSettlement({...editingSettlement, date: e.target.value}) 
                            : setNewSettlement({...newSettlement, date: e.target.value})
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
                          value={editingSettlement ? editingSettlement.amount : newSettlement.amount}
                          onChange={(e) => 
                            editingSettlement 
                              ? setEditingSettlement({...editingSettlement, amount: parseFloat(e.target.value) || 0}) 
                              : setNewSettlement({...newSettlement, amount: parseFloat(e.target.value) || 0})
                          }
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="supplierName">Supplier Name *</Label>
                    <Input
                      id="supplierName"
                      value={editingSettlement ? editingSettlement.supplierName : newSettlement.supplierName}
                      onChange={(e) => 
                        editingSettlement 
                          ? setEditingSettlement({...editingSettlement, supplierName: e.target.value}) 
                          : setNewSettlement({...newSettlement, supplierName: e.target.value})
                      }
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="poNumber">PO Number</Label>
                    <Input
                      id="poNumber"
                      value={editingSettlement ? editingSettlement.poNumber || "" : newSettlement.poNumber || ""}
                      onChange={(e) => 
                        editingSettlement 
                          ? setEditingSettlement({...editingSettlement, poNumber: e.target.value}) 
                          : setNewSettlement({...newSettlement, poNumber: e.target.value})
                      }
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="reference">Reference</Label>
                    <Input
                      id="reference"
                      value={editingSettlement ? editingSettlement.reference : newSettlement.reference}
                      onChange={(e) => 
                        editingSettlement 
                          ? setEditingSettlement({...editingSettlement, reference: e.target.value}) 
                          : setNewSettlement({...newSettlement, reference: e.target.value})
                      }
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="paymentMethod">Payment Method</Label>
                    <Select
                      value={editingSettlement ? editingSettlement.paymentMethod : newSettlement.paymentMethod}
                      onValueChange={(value) => 
                        editingSettlement 
                          ? setEditingSettlement({...editingSettlement, paymentMethod: value}) 
                          : setNewSettlement({...newSettlement, paymentMethod: value})
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
                  
                  <div className="grid gap-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={editingSettlement ? editingSettlement.status : newSettlement.status}
                      onValueChange={(value: "completed" | "pending" | "cancelled") => 
                        editingSettlement 
                          ? setEditingSettlement({...editingSettlement, status: value}) 
                          : setNewSettlement({...newSettlement, status: value})
                      }
                    >
                      <SelectTrigger id="status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Input
                      id="notes"
                      value={editingSettlement ? editingSettlement.notes || "" : newSettlement.notes || ""}
                      onChange={(e) => 
                        editingSettlement 
                          ? setEditingSettlement({...editingSettlement, notes: e.target.value}) 
                          : setNewSettlement({...newSettlement, notes: e.target.value})
                      }
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={editingSettlement ? handleUpdateSettlement : handleAddSettlement}>
                    {editingSettlement ? "Update" : "Record"} Settlement
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
              <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalSettled)}</div>
              <p className="text-xs text-muted-foreground">To suppliers</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{settlements.length}</div>
              <p className="text-xs text-muted-foreground">Settlement records</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {settlements.filter(s => new Date(s.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}
              </div>
              <p className="text-xs text-muted-foreground">In last 7 days</p>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Settlement Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSettlements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No settlement records found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSettlements.map((settlement) => (
                    <TableRow key={settlement.id}>
                      <TableCell className="font-medium">{settlement.reference}</TableCell>
                      <TableCell>{settlement.date}</TableCell>
                      <TableCell>{settlement.supplierName}</TableCell>
                      <TableCell>{settlement.poNumber || "N/A"}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(settlement.amount)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{settlement.paymentMethod}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            settlement.status === "completed" ? "default" : 
                            settlement.status === "pending" ? "secondary" : "destructive"
                          }
                        >
                          {settlement.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openEditDialog(settlement)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleDeleteSettlement(settlement.id)}
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
          </CardContent>
        </Card>
      </main>
    </div>
  );
};