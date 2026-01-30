import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Package, Edit, Trash2, Plus, AlertTriangle, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import { getProducts, createProduct, updateProduct, deleteProduct, getCategories, Product, Category } from "@/services/databaseService";

interface ProductManagementCardProps {
  searchTerm: string;
  refreshTrigger: number;
}

// Define unit of measure options
const unitOfMeasureOptions = [
  { value: "piece", label: "Piece" },
  { value: "kg", label: "Kilogram" },
  { value: "g", label: "Gram" },
  { value: "lb", label: "Pound" },
  { value: "oz", label: "Ounce" },
  { value: "l", label: "Liter" },
  { value: "ml", label: "Milliliter" },
  { value: "gal", label: "Gallon" },
  { value: "box", label: "Box" },
  { value: "pack", label: "Pack" },
  { value: "dozen", label: "Dozen" }
];

export const ProductManagementCard = ({ searchTerm, refreshTrigger }: ProductManagementCardProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProduct, setNewProduct] = useState<Omit<Product, "id" | "created_at" | "updated_at">>({
    name: "",
    category_id: null,
    description: "",
    barcode: "",
    sku: "",
    unit_of_measure: "piece",
    selling_price: 0,
    cost_price: 0,
    wholesale_price: 0,
    stock_quantity: 0,
    min_stock_level: 0,
    max_stock_level: 100,
    is_active: true
  });
  const { toast } = useToast();

  // Load data on mount and when refresh trigger changes
  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  useEffect(() => {
    // Listen for add product dialog event
    const handleOpenDialog = () => {
      resetForm();
      setIsDialogOpen(true);
    };
    
    window.addEventListener('openAddProductDialog', handleOpenDialog);
    return () => window.removeEventListener('openAddProductDialog', handleOpenDialog);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsData, categoriesData] = await Promise.all([
        getProducts(),
        getCategories()
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load products data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async () => {
    if (!newProduct.name || newProduct.selling_price < 0) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const product = await createProduct(newProduct);
      if (product) {
        setProducts([...products, product]);
        resetForm();
        setIsDialogOpen(false);
        toast({
          title: "Success",
          description: "Product added successfully"
        });
      }
    } catch (error) {
      console.error("Error adding product:", error);
      toast({
        title: "Error",
        description: "Failed to add product",
        variant: "destructive"
      });
    }
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct || !editingProduct.id) return;
    
    try {
      const updatedProduct = await updateProduct(editingProduct.id, editingProduct);
      if (updatedProduct) {
        setProducts(products.map(p => p.id === editingProduct.id ? updatedProduct : p));
        resetForm();
        setIsDialogOpen(false);
        toast({
          title: "Success",
          description: "Product updated successfully"
        });
      }
    } catch (error) {
      console.error("Error updating product:", error);
      toast({
        title: "Error",
        description: "Failed to update product",
        variant: "destructive"
      });
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await deleteProduct(id);
      setProducts(products.filter(p => p.id !== id));
      toast({
        title: "Success",
        description: "Product deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting product:", error);
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setNewProduct({
      name: "",
      category_id: null,
      description: "",
      barcode: "",
      sku: "",
      unit_of_measure: "piece",
      selling_price: 0,
      cost_price: 0,
      wholesale_price: 0,
      stock_quantity: 0,
      min_stock_level: 0,
      max_stock_level: 100,
      is_active: true
    });
    setEditingProduct(null);
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  // Filter products based on search term
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (product.barcode && product.barcode.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Calculate statistics
  const totalProducts = products.length;
  const lowStockProducts = products.filter(p => p.stock_quantity <= p.min_stock_level).length;
  const outOfStockProducts = products.filter(p => p.stock_quantity === 0).length;
  const activeProducts = products.filter(p => p.is_active).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Products Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Total Products</div>
              <div className="text-2xl font-bold">{totalProducts}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Active Products</div>
              <div className="text-2xl font-bold text-green-600">{activeProducts}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Low Stock</div>
              <div className="text-2xl font-bold text-yellow-600">{lowStockProducts}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Out of Stock</div>
              <div className="text-2xl font-bold text-red-600">{outOfStockProducts}</div>
            </CardContent>
          </Card>
        </div>

        {/* Products Table */}
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <p>Loading products...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <Package className="h-8 w-8 mb-2" />
            <p>No products found</p>
            <p className="text-sm">Add your first product to get started</p>
            <Button className="mt-2" onClick={openAddDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>SKU/Barcode</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>
                      <div>
                        {product.sku && <div>SKU: {product.sku}</div>}
                        {product.barcode && <div>Barcode: {product.barcode}</div>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {categories.find(c => c.id === product.category_id)?.name || 'Uncategorized'}
                    </TableCell>
                    <TableCell>{formatCurrency(product.selling_price)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{product.stock_quantity}</span>
                        {product.stock_quantity <= product.min_stock_level && product.stock_quantity > 0 && (
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        )}
                        {product.stock_quantity === 0 && (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.is_active ? "default" : "secondary"}>
                        {product.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openEditDialog(product)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleDeleteProduct(product.id!)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Product Form Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? "Edit Product" : "Add New Product"}
              </DialogTitle>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    value={editingProduct ? editingProduct.name : newProduct.name}
                    onChange={(e) => 
                      editingProduct 
                        ? setEditingProduct({...editingProduct, name: e.target.value}) 
                        : setNewProduct({...newProduct, name: e.target.value})
                    }
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={editingProduct ? (editingProduct.category_id || "") : (newProduct.category_id || "")}
                    onValueChange={(value) => 
                      editingProduct 
                        ? setEditingProduct({...editingProduct, category_id: value || null}) 
                        : setNewProduct({...newProduct, category_id: value || null})
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.id || ""}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    value={editingProduct ? editingProduct.sku : newProduct.sku}
                    onChange={(e) => 
                      editingProduct 
                        ? setEditingProduct({...editingProduct, sku: e.target.value}) 
                        : setNewProduct({...newProduct, sku: e.target.value})
                    }
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="barcode">Barcode</Label>
                  <Input
                    id="barcode"
                    value={editingProduct ? editingProduct.barcode : newProduct.barcode}
                    onChange={(e) => 
                      editingProduct 
                        ? setEditingProduct({...editingProduct, barcode: e.target.value}) 
                        : setNewProduct({...newProduct, barcode: e.target.value})
                    }
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="unit">Unit of Measure</Label>
                  <Select
                    value={editingProduct ? editingProduct.unit_of_measure : newProduct.unit_of_measure}
                    onValueChange={(value) => 
                      editingProduct 
                        ? setEditingProduct({...editingProduct, unit_of_measure: value}) 
                        : setNewProduct({...newProduct, unit_of_measure: value})
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {unitOfMeasureOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="cost_price">Cost Price</Label>
                  <Input
                    id="cost_price"
                    type="number"
                    step="0.01"
                    value={editingProduct ? editingProduct.cost_price : newProduct.cost_price}
                    onChange={(e) => 
                      editingProduct 
                        ? setEditingProduct({...editingProduct, cost_price: parseFloat(e.target.value) || 0}) 
                        : setNewProduct({...newProduct, cost_price: parseFloat(e.target.value) || 0})
                    }
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="selling_price">Selling Price *</Label>
                  <Input
                    id="selling_price"
                    type="number"
                    step="0.01"
                    value={editingProduct ? editingProduct.selling_price : newProduct.selling_price}
                    onChange={(e) => 
                      editingProduct 
                        ? setEditingProduct({...editingProduct, selling_price: parseFloat(e.target.value) || 0}) 
                        : setNewProduct({...newProduct, selling_price: parseFloat(e.target.value) || 0})
                    }
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="wholesale_price">Wholesale Price</Label>
                  <Input
                    id="wholesale_price"
                    type="number"
                    step="0.01"
                    value={editingProduct ? editingProduct.wholesale_price : newProduct.wholesale_price}
                    onChange={(e) => 
                      editingProduct 
                        ? setEditingProduct({...editingProduct, wholesale_price: parseFloat(e.target.value) || 0}) 
                        : setNewProduct({...newProduct, wholesale_price: parseFloat(e.target.value) || 0})
                    }
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="stock_quantity">Current Stock</Label>
                  <Input
                    id="stock_quantity"
                    type="number"
                    value={editingProduct ? editingProduct.stock_quantity : newProduct.stock_quantity}
                    onChange={(e) => 
                      editingProduct 
                        ? setEditingProduct({...editingProduct, stock_quantity: parseInt(e.target.value) || 0}) 
                        : setNewProduct({...newProduct, stock_quantity: parseInt(e.target.value) || 0})
                    }
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="min_stock">Min Stock Level</Label>
                  <Input
                    id="min_stock"
                    type="number"
                    value={editingProduct ? editingProduct.min_stock_level : newProduct.min_stock_level}
                    onChange={(e) => 
                      editingProduct 
                        ? setEditingProduct({...editingProduct, min_stock_level: parseInt(e.target.value) || 0}) 
                        : setNewProduct({...newProduct, min_stock_level: parseInt(e.target.value) || 0})
                    }
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="max_stock">Max Stock Level</Label>
                  <Input
                    id="max_stock"
                    type="number"
                    value={editingProduct ? editingProduct.max_stock_level : newProduct.max_stock_level}
                    onChange={(e) => 
                      editingProduct 
                        ? setEditingProduct({...editingProduct, max_stock_level: parseInt(e.target.value) || 0}) 
                        : setNewProduct({...newProduct, max_stock_level: parseInt(e.target.value) || 0})
                    }
                  />
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={editingProduct ? editingProduct.description : newProduct.description}
                  onChange={(e) => 
                    editingProduct 
                      ? setEditingProduct({...editingProduct, description: e.target.value}) 
                      : setNewProduct({...newProduct, description: e.target.value})
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">Active Product</Label>
                <Switch
                  id="is_active"
                  checked={editingProduct ? editingProduct.is_active : newProduct.is_active}
                  onCheckedChange={(checked) => 
                    editingProduct 
                      ? setEditingProduct({...editingProduct, is_active: checked}) 
                      : setNewProduct({...newProduct, is_active: checked})
                  }
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={editingProduct ? handleUpdateProduct : handleAddProduct}>
                {editingProduct ? "Update" : "Add"} Product
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};