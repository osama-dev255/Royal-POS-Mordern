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
import { Search, Plus, Edit, Trash2, Package, Filter, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import { 
  getDamagedProducts, 
  getDamagedProductById, 
  createDamagedProduct, 
  updateDamagedProduct, 
  deleteDamagedProduct,
  getProducts,
  getUsers
} from "@/services/databaseService";

interface DamagedProduct {
  id?: string;
  product_id?: string;
  user_id?: string;
  quantity: number;
  reason?: string;
  date_reported?: string;
  status: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

interface Product {
  id: string;
  name: string;
  barcode?: string;
  sku?: string;
  selling_price: number;
  cost_price: number;
  stock_quantity: number;
}

interface User {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
}

export const DamagedProducts = ({ username, onBack, onLogout }: { username: string; onBack: () => void; onLogout: () => void }) => {
  const [damagedProducts, setDamagedProducts] = useState<DamagedProduct[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDamagedProduct, setEditingDamagedProduct] = useState<DamagedProduct | null>(null);
  const [newDamagedProduct, setNewDamagedProduct] = useState<Omit<DamagedProduct, "id" | "created_at" | "updated_at">>({
    product_id: "",
    user_id: "",
    quantity: 1,
    reason: "",
    date_reported: new Date().toISOString().split('T')[0],
    status: "reported",
    notes: ""
  });
  const { toast } = useToast();

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [damagedData, productsData, usersData] = await Promise.all([
          getDamagedProducts(),
          getProducts(),
          getUsers()
        ]);
        
        setDamagedProducts(damagedData);
        setProducts(productsData);
        setUsers(usersData);
      } catch (error) {
        console.error("Error loading data:", error);
        toast({
          title: "Error",
          description: "Failed to load data",
          variant: "success"
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleAddDamagedProduct = async () => {
    if (!newDamagedProduct.product_id || newDamagedProduct.quantity <= 0) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "success"
      });
      return;
    }

    try {
      const result = await createDamagedProduct({
        ...newDamagedProduct,
        date_reported: new Date().toISOString()
      });
      
      if (result) {
        setDamagedProducts([...damagedProducts, result]);
        resetForm();
        setIsDialogOpen(false);
        
        toast({
          title: "Success",
          description: "Damaged product record created successfully"
        });
      } else {
        throw new Error("Failed to create damaged product record");
      }
    } catch (error) {
      console.error("Error creating damaged product:", error);
      toast({
        title: "Error",
        description: "Failed to create damaged product record",
        variant: "success"
      });
    }
  };

  const handleUpdateDamagedProduct = async () => {
    if (!editingDamagedProduct || !editingDamagedProduct.product_id || editingDamagedProduct.quantity <= 0) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "success"
      });
      return;
    }

    try {
      const result = await updateDamagedProduct(editingDamagedProduct.id!, editingDamagedProduct);
      
      if (result) {
        setDamagedProducts(damagedProducts.map(d => d.id === editingDamagedProduct.id ? result : d));
        resetForm();
        setIsDialogOpen(false);
        
        toast({
          title: "Success",
          description: "Damaged product record updated successfully"
        });
      } else {
        throw new Error("Failed to update damaged product record");
      }
    } catch (error) {
      console.error("Error updating damaged product:", error);
      toast({
        title: "Error",
        description: "Failed to update damaged product record",
        variant: "success"
      });
    }
  };

  const handleDeleteDamagedProduct = async (id: string) => {
    try {
      const result = await deleteDamagedProduct(id);
      
      if (result) {
        setDamagedProducts(damagedProducts.filter(d => d.id !== id));
        toast({
          title: "Success",
          description: "Damaged product record deleted successfully"
        });
      } else {
        throw new Error("Failed to delete damaged product record");
      }
    } catch (error) {
      console.error("Error deleting damaged product:", error);
      toast({
        title: "Error",
        description: "Failed to delete damaged product record",
        variant: "success"
      });
    }
  };

  const resetForm = () => {
    setNewDamagedProduct({
      product_id: "",
      user_id: "",
      quantity: 1,
      reason: "",
      date_reported: new Date().toISOString().split('T')[0],
      status: "reported",
      notes: ""
    });
    setEditingDamagedProduct(null);
  };

  const openEditDialog = (damagedProduct: DamagedProduct) => {
    setEditingDamagedProduct(damagedProduct);
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "resolved": return "bg-green-100 text-green-800";
      case "verified": return "bg-blue-100 text-blue-800";
      case "reported": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const filteredDamagedProducts = damagedProducts.filter(damagedProduct => {
    const matchesSearch = 
      (damagedProduct.reason && damagedProduct.reason.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (damagedProduct.notes && damagedProduct.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || damagedProduct.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const totalDamaged = damagedProducts.reduce((sum, dp) => sum + dp.quantity, 0);
  const resolvedDamaged = damagedProducts.filter(dp => dp.status === "resolved").reduce((sum, dp) => sum + dp.quantity, 0);

  return (
    <div className="min-h-screen bg-background">
      <Navigation 
        title="Damaged Products" 
        onBack={onBack}
        onLogout={onLogout} 
        username={username}
      />
      
      <main className="container mx-auto p-6">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold">Damaged Products</h2>
            <p className="text-muted-foreground">Track and manage damaged inventory items</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAddDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Report Damage
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingDamagedProduct ? "Edit Damaged Product" : "Report Damaged Product"}
                </DialogTitle>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="product" className="text-right">
                    Product *
                  </Label>
                  <Select 
                    value={editingDamagedProduct ? editingDamagedProduct.product_id || newDamagedProduct.product_id || "" : newDamagedProduct.product_id || ""}
                    onValueChange={(value) => editingDamagedProduct 
                      ? setEditingDamagedProduct({...editingDamagedProduct, product_id: value})
                      : setNewDamagedProduct({...newDamagedProduct, product_id: value})
                    }
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map(product => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} (Stock: {product.stock_quantity})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="quantity" className="text-right">
                    Quantity *
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    className="col-span-3"
                    value={editingDamagedProduct ? editingDamagedProduct.quantity : newDamagedProduct.quantity}
                    onChange={(e) => editingDamagedProduct 
                      ? setEditingDamagedProduct({...editingDamagedProduct, quantity: parseInt(e.target.value) || 0})
                      : setNewDamagedProduct({...newDamagedProduct, quantity: parseInt(e.target.value) || 0})
                    }
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="reason" className="text-right">
                    Reason
                  </Label>
                  <Input
                    id="reason"
                    className="col-span-3"
                    value={editingDamagedProduct ? editingDamagedProduct.reason || "" : newDamagedProduct.reason || ""}
                    onChange={(e) => editingDamagedProduct 
                      ? setEditingDamagedProduct({...editingDamagedProduct, reason: e.target.value})
                      : setNewDamagedProduct({...newDamagedProduct, reason: e.target.value})
                    }
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="status" className="text-right">
                    Status
                  </Label>
                  <Select 
                    value={editingDamagedProduct ? editingDamagedProduct.status : newDamagedProduct.status}
                    onValueChange={(value) => editingDamagedProduct 
                      ? setEditingDamagedProduct({...editingDamagedProduct, status: value})
                      : setNewDamagedProduct({...newDamagedProduct, status: value})
                    }
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reported">Reported</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="notes" className="text-right">
                    Notes
                  </Label>
                  <Textarea
                    id="notes"
                    className="col-span-3"
                    value={editingDamagedProduct ? editingDamagedProduct.notes || "" : newDamagedProduct.notes || ""}
                    onChange={(e) => editingDamagedProduct 
                      ? setEditingDamagedProduct({...editingDamagedProduct, notes: e.target.value})
                      : setNewDamagedProduct({...newDamagedProduct, notes: e.target.value})
                    }
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={editingDamagedProduct ? handleUpdateDamagedProduct : handleAddDamagedProduct}>
                  {editingDamagedProduct ? "Update" : "Create"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Damaged Items</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalDamaged}</div>
              <p className="text-xs text-muted-foreground">Items reported as damaged</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved Damages</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{resolvedDamaged}</div>
              <p className="text-xs text-muted-foreground">Damages resolved</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Resolution</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">{totalDamaged - resolvedDamaged}</div>
              <p className="text-xs text-muted-foreground">Awaiting action</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search damaged products..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="reported">Reported</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Damaged Products Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Damaged Products List
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading damaged products...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Date Reported</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDamagedProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No damaged products found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDamagedProducts.map((damagedProduct) => {
                      const product = products.find(p => p.id === damagedProduct.product_id);
                      const user = users.find(u => u.id === damagedProduct.user_id);
                      
                      return (
                        <TableRow key={damagedProduct.id}>
                          <TableCell>
                            <div className="font-medium">{product?.name || "Unknown Product"}</div>
                            <div className="text-sm text-muted-foreground">
                              {product?.barcode && `Barcode: ${product.barcode}`}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{damagedProduct.quantity}</div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs truncate" title={damagedProduct.reason}>
                              {damagedProduct.reason || "-"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {damagedProduct.date_reported 
                                ? new Date(damagedProduct.date_reported).toLocaleDateString() 
                                : "-"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(damagedProduct.status)}>
                              {damagedProduct.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => openEditDialog(damagedProduct)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => damagedProduct.id && handleDeleteDamagedProduct(damagedProduct.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
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