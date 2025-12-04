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
import { Search, Plus, Edit, Trash2, RotateCcw, Package, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import { 
  getReturnItems,
  getReturnItemById,
  createReturnItem,
  updateReturnItem,
  deleteReturnItem,
  getProducts,
  getSaleItems
} from "@/services/databaseService";

interface ReturnItem {
  id?: string;
  return_id: string;
  sale_item_id?: string;
  product_id?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  reason?: string;
  created_at?: string;
}

interface Product {
  id: string;
  name: string;
  barcode?: string;
  sku?: string;
  selling_price: number;
}

interface SaleItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export const ReturnItems = ({ username, onBack, onLogout }: { username: string; onBack: () => void; onLogout: () => void }) => {
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReturnItem, setEditingReturnItem] = useState<ReturnItem | null>(null);
  const [newReturnItem, setNewReturnItem] = useState<Omit<ReturnItem, "id" | "created_at">>({
    return_id: "",
    sale_item_id: "",
    product_id: "",
    quantity: 1,
    unit_price: 0,
    total_price: 0,
    reason: ""
  });
  const { toast } = useToast();

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // In a real app, you would fetch return items for a specific return
        // For now, we'll use mock data
        const mockReturnItems: ReturnItem[] = [
          {
            id: "1",
            return_id: "RET-001",
            sale_item_id: "SI-001",
            product_id: "1",
            quantity: 1,
            unit_price: 99.99,
            total_price: 99.99,
            reason: "Defective product",
            created_at: "2023-05-16T10:30:00Z"
          },
          {
            id: "2",
            return_id: "RET-002",
            sale_item_id: "SI-002",
            product_id: "2",
            quantity: 2,
            unit_price: 79.99,
            total_price: 159.98,
            reason: "Wrong item received",
            created_at: "2023-05-17T14:15:00Z"
          }
        ];
        
        // Mock products data
        const mockProducts: Product[] = [
          { id: "1", name: "Wireless Headphones", selling_price: 99.99 },
          { id: "2", name: "Coffee Maker", selling_price: 79.99 },
          { id: "3", name: "Running Shoes", selling_price: 129.99 }
        ];
        
        // Mock sale items data
        const mockSaleItems: SaleItem[] = [
          { id: "SI-001", product_id: "1", quantity: 1, unit_price: 99.99, total_price: 99.99 },
          { id: "SI-002", product_id: "2", quantity: 2, unit_price: 79.99, total_price: 159.98 }
        ];
        
        setReturnItems(mockReturnItems);
        setProducts(mockProducts);
        setSaleItems(mockSaleItems);
      } catch (error) {
        console.error("Error loading data:", error);
        toast({
          title: "Error",
          description: "Failed to load data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleAddReturnItem = () => {
    if (!newReturnItem.return_id || !newReturnItem.product_id || newReturnItem.quantity <= 0) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "destructive"
      });
      return;
    }

    const returnItem: ReturnItem = {
      ...newReturnItem,
      id: Date.now().toString(),
      created_at: new Date().toISOString()
    };

    setReturnItems([...returnItems, returnItem]);
    resetForm();
    setIsDialogOpen(false);
    
    toast({
      title: "Success",
      description: "Return item created successfully"
    });
  };

  const handleUpdateReturnItem = () => {
    if (!editingReturnItem || !editingReturnItem.return_id || !editingReturnItem.product_id || editingReturnItem.quantity <= 0) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "destructive"
      });
      return;
    }

    setReturnItems(returnItems.map(ri => ri.id === editingReturnItem.id ? editingReturnItem : ri));
    resetForm();
    setIsDialogOpen(false);
    
    toast({
      title: "Success",
      description: "Return item updated successfully"
    });
  };

  const handleDeleteReturnItem = (id: string) => {
    setReturnItems(returnItems.filter(ri => ri.id !== id));
    toast({
      title: "Success",
      description: "Return item deleted successfully"
    });
  };

  const resetForm = () => {
    setNewReturnItem({
      return_id: "",
      sale_item_id: "",
      product_id: "",
      quantity: 1,
      unit_price: 0,
      total_price: 0,
      reason: ""
    });
    setEditingReturnItem(null);
  };

  const openEditDialog = (returnItem: ReturnItem) => {
    setEditingReturnItem(returnItem);
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const filteredReturnItems = returnItems.filter(returnItem => {
    const matchesSearch = 
      (returnItem.reason && returnItem.reason.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesSearch;
  });

  const totalReturnedValue = returnItems.reduce((sum, ri) => sum + ri.total_price, 0);

  return (
    <div className="min-h-screen bg-background">
      <Navigation 
        title="Return Items" 
        onBack={onBack}
        onLogout={onLogout} 
        username={username}
      />
      
      <main className="container mx-auto p-6">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold">Return Items</h2>
            <p className="text-muted-foreground">Manage individual items in return transactions</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAddDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Add Return Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingReturnItem ? "Edit Return Item" : "Add Return Item"}
                </DialogTitle>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="return_id" className="text-right">
                    Return ID *
                  </Label>
                  <Input
                    id="return_id"
                    className="col-span-3"
                    value={editingReturnItem ? editingReturnItem.return_id : newReturnItem.return_id}
                    onChange={(e) => editingReturnItem 
                      ? setEditingReturnItem({...editingReturnItem, return_id: e.target.value})
                      : setNewReturnItem({...newReturnItem, return_id: e.target.value})
                    }
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="product" className="text-right">
                    Product *
                  </Label>
                  <Select 
                    value={editingReturnItem ? editingReturnItem.product_id || "" : newReturnItem.product_id || ""}
                    onValueChange={(value) => {
                      const product = products.find(p => p.id === value);
                      const unitPrice = product ? product.selling_price : 0;
                      const quantity = editingReturnItem ? editingReturnItem.quantity : newReturnItem.quantity;
                      const totalPrice = unitPrice * quantity;
                      
                      if (editingReturnItem) {
                        setEditingReturnItem({
                          ...editingReturnItem,
                          product_id: value,
                          unit_price: unitPrice,
                          total_price: totalPrice
                        });
                      } else {
                        setNewReturnItem({
                          ...newReturnItem,
                          product_id: value,
                          unit_price: unitPrice,
                          total_price: totalPrice
                        });
                      }
                    }}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map(product => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
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
                    value={editingReturnItem ? editingReturnItem.quantity : newReturnItem.quantity}
                    onChange={(e) => {
                      const quantity = parseInt(e.target.value) || 0;
                      const unitPrice = editingReturnItem ? editingReturnItem.unit_price : newReturnItem.unit_price;
                      const totalPrice = unitPrice * quantity;
                      
                      if (editingReturnItem) {
                        setEditingReturnItem({
                          ...editingReturnItem,
                          quantity,
                          total_price: totalPrice
                        });
                      } else {
                        setNewReturnItem({
                          ...newReturnItem,
                          quantity,
                          total_price: totalPrice
                        });
                      }
                    }}
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="unit_price" className="text-right">
                    Unit Price
                  </Label>
                  <Input
                    id="unit_price"
                    type="number"
                    step="0.01"
                    className="col-span-3"
                    value={editingReturnItem ? editingReturnItem.unit_price : newReturnItem.unit_price}
                    onChange={(e) => {
                      const unitPrice = parseFloat(e.target.value) || 0;
                      const quantity = editingReturnItem ? editingReturnItem.quantity : newReturnItem.quantity;
                      const totalPrice = unitPrice * quantity;
                      
                      if (editingReturnItem) {
                        setEditingReturnItem({
                          ...editingReturnItem,
                          unit_price: unitPrice,
                          total_price: totalPrice
                        });
                      } else {
                        setNewReturnItem({
                          ...newReturnItem,
                          unit_price: unitPrice,
                          total_price: totalPrice
                        });
                      }
                    }}
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="total_price" className="text-right">
                    Total Price
                  </Label>
                  <Input
                    id="total_price"
                    type="number"
                    step="0.01"
                    className="col-span-3"
                    value={editingReturnItem ? editingReturnItem.total_price : newReturnItem.total_price}
                    readOnly
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="reason" className="text-right">
                    Reason
                  </Label>
                  <Input
                    id="reason"
                    className="col-span-3"
                    value={editingReturnItem ? editingReturnItem.reason || "" : newReturnItem.reason || ""}
                    onChange={(e) => editingReturnItem 
                      ? setEditingReturnItem({...editingReturnItem, reason: e.target.value})
                      : setNewReturnItem({...newReturnItem, reason: e.target.value})
                    }
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={editingReturnItem ? handleUpdateReturnItem : handleAddReturnItem}>
                  {editingReturnItem ? "Update" : "Create"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Return Items</CardTitle>
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{returnItems.length}</div>
              <p className="text-xs text-muted-foreground">Items in returns</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalReturnedValue)}</div>
              <p className="text-xs text-muted-foreground">Total return value</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Item Value</CardTitle>
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {returnItems.length > 0 ? formatCurrency(totalReturnedValue / returnItems.length) : formatCurrency(0)}
              </div>
              <p className="text-xs text-muted-foreground">Average per item</p>
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
                  placeholder="Search return items..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Return Items Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Return Items List
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading return items...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Return ID</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Total Price</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReturnItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No return items found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredReturnItems.map((returnItem) => {
                      const product = products.find(p => p.id === returnItem.product_id);
                      
                      return (
                        <TableRow key={returnItem.id}>
                          <TableCell>
                            <div className="font-medium">{returnItem.return_id}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{product?.name || "Unknown Product"}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{returnItem.quantity}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{formatCurrency(returnItem.unit_price)}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{formatCurrency(returnItem.total_price)}</div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs truncate" title={returnItem.reason}>
                              {returnItem.reason || "-"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => openEditDialog(returnItem)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => returnItem.id && handleDeleteReturnItem(returnItem.id)}
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