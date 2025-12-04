import { useState } from "react";
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
import { Search, Plus, Edit, Trash2, RotateCcw, Package, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ReturnItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Return {
  id: string;
  returnNumber: string;
  date: string;
  customerId?: string;
  customerName?: string;
  transactionId?: string;
  reason: string;
  returnType: "return" | "damage";
  status: "pending" | "processed" | "refunded";
  items: ReturnItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
}

export const ReturnsManagement = ({ username, onBack, onLogout }: { username: string; onBack: () => void; onLogout: () => void }) => {
  const [returns, setReturns] = useState<Return[]>([
    {
      id: "1",
      returnNumber: "RET-001",
      date: "2023-05-16",
      customerId: "1",
      customerName: "John Smith",
      transactionId: "TXN-001",
      reason: "Defective product",
      returnType: "return",
      status: "processed",
      items: [
        {
          id: "1-1",
          productId: "1",
          productName: "Wireless Headphones",
          quantity: 1,
          unitPrice: 99.99,
          total: 99.99
        }
      ],
      subtotal: 99.99,
      tax: 8.00,
      total: 107.99,
      notes: "Customer returned defective headphones"
    },
    {
      id: "2",
      returnNumber: "DAM-001",
      date: "2023-05-14",
      reason: "Damaged during shipping",
      returnType: "damage",
      status: "pending",
      items: [
        {
          id: "2-1",
          productId: "4",
          productName: "Smartphone",
          quantity: 1,
          unitPrice: 699.99,
          total: 699.99
        }
      ],
      subtotal: 699.99,
      tax: 56.00,
      total: 755.99
    }
  ]);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReturn, setEditingReturn] = useState<Return | null>(null);
  const [newReturn, setNewReturn] = useState<Omit<Return, "id" | "returnNumber" | "items" | "subtotal" | "tax" | "total">>({
    date: new Date().toISOString().split('T')[0],
    reason: "",
    returnType: "return",
    status: "pending"
  });
  const { toast } = useToast();

  const handleAddReturn = () => {
    if (!newReturn.reason) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "destructive"
      });
      return;
    }

    const returnNumber = `${newReturn.returnType === "return" ? "RET" : "DAM"}-${String(returns.length + 1).padStart(3, '0')}`;
    
    const returnRecord: Return = {
      ...newReturn,
      id: Date.now().toString(),
      returnNumber,
      items: [],
      subtotal: 0,
      tax: 0,
      total: 0
    };

    setReturns([...returns, returnRecord]);
    resetForm();
    setIsDialogOpen(false);
    
    toast({
      title: "Success",
      description: "Return record created successfully"
    });
  };

  const handleUpdateReturn = () => {
    if (!editingReturn || !editingReturn.reason) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "destructive"
      });
      return;
    }

    setReturns(returns.map(r => r.id === editingReturn.id ? editingReturn : r));
    resetForm();
    setIsDialogOpen(false);
    
    toast({
      title: "Success",
      description: "Return record updated successfully"
    });
  };

  const handleDeleteReturn = (id: string) => {
    setReturns(returns.filter(r => r.id !== id));
    toast({
      title: "Success",
      description: "Return record deleted successfully"
    });
  };

  const resetForm = () => {
    setNewReturn({
      date: new Date().toISOString().split('T')[0],
      reason: "",
      returnType: "return",
      status: "pending"
    });
    setEditingReturn(null);
  };

  const openEditDialog = (returnRecord: Return) => {
    setEditingReturn(returnRecord);
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const filteredReturns = returns.filter(returnRecord => {
    const matchesSearch = 
      returnRecord.returnNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (returnRecord.customerName && returnRecord.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      returnRecord.reason.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === "all" || returnRecord.returnType === typeFilter;
    const matchesStatus = statusFilter === "all" || returnRecord.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navigation 
        title="Returns & Damaged Products" 
        onBack={onBack}
        onLogout={onLogout} 
        username={username}
      />
      
      <main className="container mx-auto p-6">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold">Returns & Damages</h2>
            <p className="text-muted-foreground">Manage product returns and damaged inventory</p>
          </div>
          
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search returns..."
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
                <SelectItem value="return">Returns</SelectItem>
                <SelectItem value="damage">Damages</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processed">Processed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openAddDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Record
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingReturn ? "Edit Return/Damage" : "Create New Record"}
                  </DialogTitle>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="date">Date *</Label>
                      <Input
                        id="date"
                        type="date"
                        value={editingReturn ? editingReturn.date : newReturn.date}
                        onChange={(e) => 
                          editingReturn 
                            ? setEditingReturn({...editingReturn, date: e.target.value}) 
                            : setNewReturn({...newReturn, date: e.target.value})
                        }
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="returnType">Type *</Label>
                      <Select
                        value={editingReturn ? editingReturn.returnType : newReturn.returnType}
                        onValueChange={(value: "return" | "damage") => 
                          editingReturn 
                            ? setEditingReturn({...editingReturn, returnType: value}) 
                            : setNewReturn({...newReturn, returnType: value})
                        }
                      >
                        <SelectTrigger id="returnType">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="return">Customer Return</SelectItem>
                          <SelectItem value="damage">Damaged Product</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="reason">Reason *</Label>
                    <Textarea
                      id="reason"
                      value={editingReturn ? editingReturn.reason : newReturn.reason}
                      onChange={(e) => 
                        editingReturn 
                          ? setEditingReturn({...editingReturn, reason: e.target.value}) 
                          : setNewReturn({...newReturn, reason: e.target.value})
                      }
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={editingReturn ? editingReturn.status : newReturn.status}
                      onValueChange={(value: "pending" | "processed" | "refunded") => 
                        editingReturn 
                          ? setEditingReturn({...editingReturn, status: value}) 
                          : setNewReturn({...newReturn, status: value})
                      }
                    >
                      <SelectTrigger id="status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="processed">Processed</SelectItem>
                        <SelectItem value="refunded">Refunded</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={editingReturn ? editingReturn.notes || "" : ""}
                      onChange={(e) => 
                        editingReturn 
                          ? setEditingReturn({...editingReturn, notes: e.target.value}) 
                          : null
                      }
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={editingReturn ? handleUpdateReturn : handleAddReturn}>
                    {editingReturn ? "Update" : "Create"} Record
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Return & Damage Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Record #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReturns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No return records found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReturns.map((returnRecord) => (
                    <TableRow key={returnRecord.id}>
                      <TableCell className="font-medium">{returnRecord.returnNumber}</TableCell>
                      <TableCell>{returnRecord.date}</TableCell>
                      <TableCell>{returnRecord.customerName || "N/A"}</TableCell>
                      <TableCell>
                        <Badge variant={returnRecord.returnType === "return" ? "default" : "destructive"}>
                          {returnRecord.returnType === "return" ? "Return" : "Damage"}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{returnRecord.reason}</TableCell>
                      <TableCell>{returnRecord.items.length}</TableCell>
                      <TableCell className="font-medium">${returnRecord.total.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            returnRecord.status === "processed" ? "default" : 
                            returnRecord.status === "pending" ? "secondary" : "destructive"
                          }
                        >
                          {returnRecord.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openEditDialog(returnRecord)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleDeleteReturn(returnRecord.id)}
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