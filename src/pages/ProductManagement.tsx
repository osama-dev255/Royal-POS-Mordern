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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Edit, Trash2, Package, Scan, AlertTriangle, TrendingUp, ShoppingCart, FileBarChart, Filter, SortAsc, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import { ExportImportManager } from "@/components/ExportImportManager";
// Import Supabase database service
import { getProducts, createProduct, updateProduct, deleteProduct, getCategories, Product, Category } from "@/services/databaseService";

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

// Helper function to generate a unique ID for categories with null/empty IDs
const getCategoryId = (category: Category): string => {
  if (category.id && category.id.trim() !== "") {
    return category.id;
  }
  // Generate a unique ID based on the category name if ID is missing
  return `category-${category.name.replace(/\s+/g, '-').toLowerCase()}`;
};

export const ProductManagement = ({ username, onBack, onLogout }: { username: string; onBack: () => void; onLogout: () => void }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewOnlyMode, setViewOnlyMode] = useState(false);
  const [activeTab, setActiveTab] = useState("inventory");
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
  const [sortBy, setSortBy] = useState<"name" | "price" | "stock" | "category">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [filterStock, setFilterStock] = useState<"all" | "in-stock" | "low-stock" | "out-of-stock">("all");
  const { toast } = useToast();

  // Load products and categories from Supabase on component mount
  useEffect(() => {
    console.log("ProductManagement: Component mounted, loading data...");
    Promise.all([loadProducts(), loadCategories()]);
  }, []);

  const loadProducts = async () => {
    try {
      console.log("ProductManagement: Loading products...");
      setLoading(true);
      setError(null);
      const data = await getProducts();
      console.log("ProductManagement: Products loaded:", data.length);
      console.log("ProductManagement: Sample products:", data.slice(0, 3));
      setProducts(data);
    } catch (error) {
      console.error("ProductManagement: Error loading products:", error);
      setError("Failed to load products: " + (error as Error).message);
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      console.log("ProductManagement: Loading categories...");
      const data = await getCategories();
      console.log("ProductManagement: Categories loaded:", data.length);
      console.log("ProductManagement: Sample categories:", data.slice(0, 3));
      setCategories(data);
    } catch (error) {
      console.error("ProductManagement: Error loading categories:", error);
      setError("Failed to load categories: " + (error as Error).message);
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive"
      });
    }
  };

  const handleAddProduct = async () => {
    if (!newProduct.name || newProduct.selling_price < 0) {
      toast({
        title: "Error",
        description: "Please fill in required fields (product name and price must be valid)",
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
      } else {
        throw new Error("Failed to create product");
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

  // Handle product import
  const handleImportProducts = async (importedProducts: any[]) => {
    try {
      const results = [];
      
      for (const importedProduct of importedProducts) {
        // Check if product already exists by barcode
        const existingProduct = products.find(p => p.barcode === importedProduct.barcode);
        
        if (existingProduct && existingProduct.id) {
          // Update existing product
          const updatedProduct = await updateProduct(existingProduct.id, {
            ...existingProduct,
            ...importedProduct,
            selling_price: Number(importedProduct.selling_price) || existingProduct.selling_price,
            cost_price: Number(importedProduct.cost_price) || existingProduct.cost_price,
            stock_quantity: Number(importedProduct.stock_quantity) || existingProduct.stock_quantity
          });
          
          if (updatedProduct) {
            results.push(updatedProduct);
          }
        } else {
          // Add new product
          const newProductData = {
            ...importedProduct,
            selling_price: Number(importedProduct.selling_price) || 0,
            cost_price: Number(importedProduct.cost_price) || 0,
            stock_quantity: Number(importedProduct.stock_quantity) || 0
          };
          
          const createdProduct = await createProduct(newProductData);
          if (createdProduct) {
            results.push(createdProduct);
          }
        }
      }
      
      // Refresh products list
      await loadProducts();
      
      toast({
        title: "Import Successful",
        description: `Successfully imported/updated ${results.length} products`
      });
    } catch (error) {
      console.error("Error importing products:", error);
      toast({
        title: "Import Failed",
        description: "Failed to import products",
        variant: "destructive"
      });
    }
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct || !editingProduct.name || editingProduct.selling_price < 0) {
      toast({
        title: "Error",
        description: "Please fill in required fields (product name and price must be valid)",
        variant: "destructive"
      });
      return;
    }

    try {
      if (editingProduct.id) {
        const updatedProduct = await updateProduct(editingProduct.id, editingProduct);
        if (updatedProduct) {
          setProducts(products.map(p => p.id === editingProduct.id ? updatedProduct : p));
          resetForm();
          setIsDialogOpen(false);
          
          toast({
            title: "Success",
            description: "Product updated successfully"
          });
        } else {
          throw new Error("Failed to update product");
        }
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
      // Show confirmation dialog
      if (!window.confirm("Are you sure you want to delete this product? This action cannot be undone.")) {
        return;
      }
      
      const success = await deleteProduct(id);
      if (success) {
        setProducts(products.filter(p => p.id !== id));
        toast({
          title: "Success",
          description: "Product deleted successfully"
        });
      } else {
        throw new Error("Failed to delete product");
      }
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
    setViewOnlyMode(false);
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setViewOnlyMode(false);
    setIsDialogOpen(true);
  };

  const openViewDialog = (product: Product) => {
    setEditingProduct(product);
    setViewOnlyMode(true);
    setIsDialogOpen(true);
  };

  // Filter products based on search term and filters
  const filteredProducts = products.filter(product => {
    // Search term filter
    const matchesSearch = 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.category_id && categories.find(c => getCategoryId(c) === product.category_id)?.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (product.barcode && product.barcode.includes(searchTerm)) ||
      (product.sku && product.sku.includes(searchTerm));
    
    // Category filter
    const matchesCategory = !filterCategory || filterCategory === "all" || product.category_id === filterCategory;
    
    // Status filter
    const matchesStatus = filterStatus === "all" || 
      (filterStatus === "active" && product.is_active) || 
      (filterStatus === "inactive" && !product.is_active);
    
    // Stock filter
    const stockLevel = product.stock_quantity;
    const minLevel = product.min_stock_level || 10;
    const matchesStock = filterStock === "all" ||
      (filterStock === "in-stock" && stockLevel > 0 && stockLevel >= minLevel) ||
      (filterStock === "low-stock" && stockLevel > 0 && stockLevel < minLevel) ||
      (filterStock === "out-of-stock" && stockLevel === 0);
  
    const result = matchesSearch && matchesCategory && matchesStatus && matchesStock;
    
    return result;
  }).sort((a, b) => {
    // Sorting logic
    if (sortBy === "name") {
      return sortOrder === "asc" 
        ? (a.name || "").localeCompare(b.name || "") 
        : (b.name || "").localeCompare(a.name || "");
    } else if (sortBy === "price") {
      return sortOrder === "asc" 
        ? a.selling_price - b.selling_price 
        : b.selling_price - a.selling_price;
    } else if (sortBy === "stock") {
      return sortOrder === "asc" 
        ? a.stock_quantity - b.stock_quantity 
        : b.stock_quantity - a.stock_quantity;
    } else if (sortBy === "category") {
      const categoryA = categories.find(c => getCategoryId(c) === a.category_id)?.name || "";
      const categoryB = categories.find(c => getCategoryId(c) === b.category_id)?.name || "";
      return sortOrder === "asc" 
        ? categoryA.localeCompare(categoryB) 
        : categoryB.localeCompare(categoryA);
    }
    return 0;
  });

  // Calculate inventory statistics
  const totalProducts = products.length;
  const lowStockItems = products.filter(p => p.stock_quantity < (p.min_stock_level || 10)).length;
  const outOfStockItems = products.filter(p => p.stock_quantity === 0).length;
  const totalInventoryValue = products.reduce((sum, product) => sum + (product.selling_price * product.stock_quantity), 0);
  const totalCostValue = products.reduce((sum, product) => sum + (product.cost_price * product.stock_quantity), 0);
  const potentialProfit = totalInventoryValue - totalCostValue;

  // Log products for debugging
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Products updated:', products.length);
      if (products.length > 0) {
        console.log('First product:', products[0]);
      }
    }
  }, [products]);

  // Debug logging for filtered products
  useEffect(() => {
    console.log("ProductManagement: Products state updated:", products.length);
    console.log("ProductManagement: Filtered products:", filteredProducts.length);
    console.log("ProductManagement: Current filters:", { filterCategory, filterStatus, filterStock, searchTerm });
    if (products.length > 0 && filteredProducts.length === 0) {
      console.log("ProductManagement: All products are being filtered out!");
      console.log("ProductManagement: Sample product:", products[0]);
    }
  }, [products, filteredProducts, filterCategory, filterStatus, filterStock, searchTerm]);

  const handleToggleProductStatus = async (product: Product) => {
    try {
      if (!product.id) return;
      
      const updatedProduct = await updateProduct(product.id, {
        is_active: !product.is_active,
        updated_at: new Date().toISOString()
      });
      
      if (updatedProduct) {
        setProducts(products.map(p => p.id === product.id ? updatedProduct : p));
        toast({
          title: "Success",
          description: `Product ${updatedProduct.is_active ? 'activated' : 'deactivated'} successfully`
        });
      } else {
        throw new Error("Failed to update product status");
      }
    } catch (error) {
      console.error("Error toggling product status:", error);
      toast({
        title: "Error",
        description: "Failed to update product status",
        variant: "destructive"
      });
    }
  };

  // Add sample products for testing
  const addSampleProducts = async () => {
    try {
      const sampleProducts = [
        {
          name: "Sample Product 1",
          description: "This is a sample product for testing",
          barcode: "1234567890123",
          sku: "SAMPLE-001",
          unit_of_measure: "piece",
          selling_price: 29.99,
          cost_price: 15.00,
          wholesale_price: 24.99,
          stock_quantity: 50,
          min_stock_level: 10,
          max_stock_level: 100,
          is_active: true
        },
        {
          name: "Sample Product 2",
          description: "Another sample product for testing",
          barcode: "1234567890124",
          sku: "SAMPLE-002",
          unit_of_measure: "piece",
          selling_price: 49.99,
          cost_price: 25.00,
          wholesale_price: 39.99,
          stock_quantity: 25,
          min_stock_level: 5,
          max_stock_level: 50,
          is_active: true
        },
        {
          name: "Low Stock Product",
          description: "This product has low stock",
          barcode: "1234567890125",
          sku: "SAMPLE-003",
          unit_of_measure: "piece",
          selling_price: 19.99,
          cost_price: 10.00,
          wholesale_price: 15.99,
          stock_quantity: 3,
          min_stock_level: 10,
          max_stock_level: 30,
          is_active: true
        }
      ];

      const createdProducts = [];
      for (const productData of sampleProducts) {
        const product = await createProduct(productData);
        if (product) {
          createdProducts.push(product);
        }
      }

      if (createdProducts.length > 0) {
        // Refresh the products list
        await loadProducts();
        toast({
          title: "Success",
          description: `Added ${createdProducts.length} sample products`
        });
      } else {
        toast({
          title: "Info",
          description: "No sample products were added"
        });
      }
    } catch (error) {
      console.error("Error adding sample products:", error);
      toast({
        title: "Error",
        description: "Failed to add sample products",
        variant: "destructive"
      });
    }
  };

  const handleQuickStockUpdate = async (product: Product, newQuantity: number) => {
    try {
      if (!product.id) return;
      
      const updatedProduct = await updateProduct(product.id, {
        stock_quantity: newQuantity,
        updated_at: new Date().toISOString()
      });
      
      if (updatedProduct) {
        setProducts(products.map(p => p.id === product.id ? updatedProduct : p));
        toast({
          title: "Success",
          description: "Stock quantity updated successfully"
        });
      } else {
        throw new Error("Failed to update stock quantity");
      }
    } catch (error) {
      console.error("Error updating stock quantity:", error);
      toast({
        title: "Error",
        description: "Failed to update stock quantity",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation title="Product Management" username={username} onBack={onBack} onLogout={onLogout} />
      
      <div className="container mx-auto py-6 space-y-6">
        {/* Error Display */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Product Management</h1>
            <p className="text-muted-foreground">Manage your inventory and product catalog</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={loadProducts} title="Refresh products">
                <span className="sr-only">Refresh</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-refresh-cw">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                  <path d="M21 3v5h-5"/>
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                  <path d="M8 16H3v5"/>
                </svg>
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) resetForm();
              }}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {viewOnlyMode ? "Product Details" : (editingProduct ? "Edit Product" : "Add New Product")}
                    </DialogTitle>
                  </DialogHeader>
                  <Tabs defaultValue="basic" className="w-full" value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="basic">Basic Info</TabsTrigger>
                      <TabsTrigger value="pricing">Pricing</TabsTrigger>
                      <TabsTrigger value="inventory">Inventory</TabsTrigger>
                    </TabsList>
                    <TabsContent value="basic" className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Product Name *</Label>
                          <Input
                            id="name"
                            value={editingProduct ? editingProduct.name : newProduct.name}
                            onChange={(e) => 
                              editingProduct && !viewOnlyMode
                                ? setEditingProduct({...editingProduct, name: e.target.value})
                                : !viewOnlyMode && setNewProduct({...newProduct, name: e.target.value})
                            }
                            placeholder="Enter product name"
                            readOnly={viewOnlyMode}
                            className={viewOnlyMode ? "bg-muted" : ""}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="category">Category</Label>
                          {viewOnlyMode ? (
                            <div className="p-2 bg-muted rounded">
                              {editingProduct?.category_id 
                                ? categories.find(c => getCategoryId(c) === editingProduct.category_id)?.name || "Uncategorized"
                                : "Uncategorized"}
                            </div>
                          ) : (
                            <Select
                              value={editingProduct ? (editingProduct.category_id || "none") : (newProduct.category_id || "none")}
                              onValueChange={(value) => 
                                editingProduct
                                  ? setEditingProduct({...editingProduct, category_id: value === "none" ? null : value})
                                  : setNewProduct({...newProduct, category_id: value === "none" ? null : value})
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No Category</SelectItem>
                                {categories.map((category) => {
                                  const categoryId = getCategoryId(category);
                                  return (
                                    <SelectItem 
                                      key={categoryId} 
                                      value={categoryId}
                                    >
                                      {category.name}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="barcode">Barcode</Label>
                          <Input
                            id="barcode"
                            value={editingProduct ? (editingProduct.barcode || "") : (newProduct.barcode || "")}
                            onChange={(e) => 
                              editingProduct && !viewOnlyMode
                                ? setEditingProduct({...editingProduct, barcode: e.target.value})
                                : !viewOnlyMode && setNewProduct({...newProduct, barcode: e.target.value})
                            }
                            placeholder="Enter barcode"
                            readOnly={viewOnlyMode}
                            className={viewOnlyMode ? "bg-muted" : ""}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="sku">SKU</Label>
                          <Input
                            id="sku"
                            value={editingProduct ? (editingProduct.sku || "") : (newProduct.sku || "")}
                            onChange={(e) => 
                              editingProduct && !viewOnlyMode
                                ? setEditingProduct({...editingProduct, sku: e.target.value})
                                : !viewOnlyMode && setNewProduct({...newProduct, sku: e.target.value})
                            }
                            placeholder="Enter SKU"
                            readOnly={viewOnlyMode}
                            className={viewOnlyMode ? "bg-muted" : ""}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={editingProduct ? (editingProduct.description || "") : (newProduct.description || "")}
                          onChange={(e) => 
                            editingProduct && !viewOnlyMode
                              ? setEditingProduct({...editingProduct, description: e.target.value})
                              : !viewOnlyMode && setNewProduct({...newProduct, description: e.target.value})
                          }
                          placeholder="Enter product description"
                          readOnly={viewOnlyMode}
                          className={viewOnlyMode ? "bg-muted" : ""}
                        />
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="pricing" className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="cost_price">Cost Price *</Label>
                          <Input
                            id="cost_price"
                            type="number"
                            step="0.01"
                            min="0"
                            value={editingProduct ? editingProduct.cost_price : newProduct.cost_price}
                            onChange={(e) => 
                              editingProduct && !viewOnlyMode
                                ? setEditingProduct({...editingProduct, cost_price: parseFloat(e.target.value) || 0})
                                : !viewOnlyMode && setNewProduct({...newProduct, cost_price: parseFloat(e.target.value) || 0})
                            }
                            placeholder="0.00"
                            readOnly={viewOnlyMode}
                            className={viewOnlyMode ? "bg-muted" : ""}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="selling_price">Selling Price *</Label>
                          <Input
                            id="selling_price"
                            type="number"
                            step="0.01"
                            min="0"
                            value={editingProduct ? editingProduct.selling_price : newProduct.selling_price}
                            onChange={(e) => 
                              editingProduct && !viewOnlyMode
                                ? setEditingProduct({...editingProduct, selling_price: parseFloat(e.target.value) || 0})
                                : !viewOnlyMode && setNewProduct({...newProduct, selling_price: parseFloat(e.target.value) || 0})
                            }
                            placeholder="0.00"
                            readOnly={viewOnlyMode}
                            className={viewOnlyMode ? "bg-muted" : ""}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="wholesale_price">Wholesale Price</Label>
                          <Input
                            id="wholesale_price"
                            type="number"
                            step="0.01"
                            min="0"
                            value={editingProduct ? (editingProduct.wholesale_price || 0) : (newProduct.wholesale_price || 0)}
                            onChange={(e) => 
                              editingProduct && !viewOnlyMode
                                ? setEditingProduct({...editingProduct, wholesale_price: parseFloat(e.target.value) || 0})
                                : !viewOnlyMode && setNewProduct({...newProduct, wholesale_price: parseFloat(e.target.value) || 0})
                            }
                            placeholder="0.00"
                            readOnly={viewOnlyMode}
                            className={viewOnlyMode ? "bg-muted" : ""}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="unit_of_measure">Unit of Measure</Label>
                          {viewOnlyMode ? (
                            <div className="p-2 bg-muted rounded">
                              {unitOfMeasureOptions.find(u => u.value === (editingProduct?.unit_of_measure || "piece"))?.label || "Piece"}
                            </div>
                          ) : (
                            <Select
                              value={editingProduct ? (editingProduct.unit_of_measure || "piece") : (newProduct.unit_of_measure || "piece")}
                              onValueChange={(value) => 
                                editingProduct
                                  ? setEditingProduct({...editingProduct, unit_of_measure: value})
                                  : setNewProduct({...newProduct, unit_of_measure: value})
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select unit" />
                              </SelectTrigger>
                              <SelectContent>
                                {unitOfMeasureOptions.map((unit) => (
                                  <SelectItem key={unit.value} value={unit.value}>
                                    {unit.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                        <div className="space-y-2 flex items-end">
                          {viewOnlyMode ? (
                            <div className="flex items-center space-x-2">
                              <div className={`w-2 h-2 rounded-full ${editingProduct?.is_active ? "bg-green-500" : "bg-gray-500"}`}></div>
                              <Label>{editingProduct?.is_active ? "Active" : "Inactive"}</Label>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="is_active"
                                checked={editingProduct ? (editingProduct.is_active !== false) : (newProduct.is_active !== false)}
                                onCheckedChange={(checked) => 
                                  editingProduct
                                    ? setEditingProduct({...editingProduct, is_active: checked})
                                    : setNewProduct({...newProduct, is_active: checked})
                                }
                              />
                              <Label htmlFor="is_active">Active Product</Label>
                            </div>
                          )}
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="inventory" className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="stock_quantity">Current Stock *</Label>
                          <Input
                            id="stock_quantity"
                            type="number"
                            min="0"
                            value={editingProduct ? editingProduct.stock_quantity : newProduct.stock_quantity}
                            onChange={(e) => 
                              editingProduct && !viewOnlyMode
                                ? setEditingProduct({...editingProduct, stock_quantity: parseInt(e.target.value) || 0})
                                : !viewOnlyMode && setNewProduct({...newProduct, stock_quantity: parseInt(e.target.value) || 0})
                            }
                            placeholder="0"
                            readOnly={viewOnlyMode}
                            className={viewOnlyMode ? "bg-muted" : ""}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="min_stock_level">Min Stock Level</Label>
                          <Input
                            id="min_stock_level"
                            type="number"
                            min="0"
                            value={editingProduct ? (editingProduct.min_stock_level || 0) : (newProduct.min_stock_level || 0)}
                            onChange={(e) => 
                              editingProduct && !viewOnlyMode
                                ? setEditingProduct({...editingProduct, min_stock_level: parseInt(e.target.value) || 0})
                                : !viewOnlyMode && setNewProduct({...newProduct, min_stock_level: parseInt(e.target.value) || 0})
                            }
                            placeholder="0"
                            readOnly={viewOnlyMode}
                            className={viewOnlyMode ? "bg-muted" : ""}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="max_stock_level">Max Stock Level</Label>
                          <Input
                            id="max_stock_level"
                            type="number"
                            min="0"
                            value={editingProduct ? (editingProduct.max_stock_level || 0) : (newProduct.max_stock_level || 0)}
                            onChange={(e) => 
                              editingProduct && !viewOnlyMode
                                ? setEditingProduct({...editingProduct, max_stock_level: parseInt(e.target.value) || 0})
                                : !viewOnlyMode && setNewProduct({...newProduct, max_stock_level: parseInt(e.target.value) || 0})
                            }
                            placeholder="0"
                            readOnly={viewOnlyMode}
                            className={viewOnlyMode ? "bg-muted" : ""}
                          />
                        </div>
                      </div>
                      
                      {viewOnlyMode && editingProduct && (
                        <div className="pt-4 border-t">
                          <h4 className="font-medium mb-2">Product Metadata</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Created:</span>{" "}
                              {editingProduct.created_at ? new Date(editingProduct.created_at).toLocaleString() : "N/A"}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Last Updated:</span>{" "}
                              {editingProduct.updated_at ? new Date(editingProduct.updated_at).toLocaleString() : "N/A"}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Product ID:</span>{" "}
                              <span className="font-mono text-xs">{editingProduct.id}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                  {!viewOnlyMode && (
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={editingProduct ? handleUpdateProduct : handleAddProduct}>
                        {editingProduct ? "Update Product" : "Add Product"}
                      </Button>
                    </div>
                  )}
                  {viewOnlyMode && (
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Close
                      </Button>
                      <Button onClick={() => {
                        setViewOnlyMode(false);
                        setActiveTab("basic");
                      }}>
                        Edit Product
                      </Button>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Inventory Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalProducts}</div>
              <p className="text-xs text-muted-foreground">Active products in inventory</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{lowStockItems}</div>
              <p className="text-xs text-muted-foreground">Items below min level</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{outOfStockItems}</div>
              <p className="text-xs text-muted-foreground">Items with zero stock</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalInventoryValue)}</div>
              <p className="text-xs text-muted-foreground">Based on selling prices</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Potential Profit</CardTitle>
              <FileBarChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(potentialProfit)}</div>
              <p className="text-xs text-muted-foreground">If all items sold</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Sorting */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters and Sorting
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={filterCategory || "all"} onValueChange={(value) => setFilterCategory(value === "all" ? null : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => {
                      const categoryId = getCategoryId(category);
                      return (
                        <SelectItem 
                          key={categoryId} 
                          value={categoryId}
                        >
                          {category.name}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Stock Level</Label>
                <Select value={filterStock} onValueChange={(value) => setFilterStock(value as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Stock Levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stock Levels</SelectItem>
                    <SelectItem value="in-stock">In Stock</SelectItem>
                    <SelectItem value="low-stock">Low Stock</SelectItem>
                    <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Sort By</Label>
                <div className="flex gap-2">
                  <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sort By" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="price">Price</SelectItem>
                      <SelectItem value="stock">Stock</SelectItem>
                      <SelectItem value="category">Category</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  >
                    <SortAsc className={`h-4 w-4 ${sortOrder === "desc" ? "rotate-180" : ""}`} />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card>
          <CardHeader>
            <CardTitle>Product Inventory</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <p>Loading products...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-32 text-red-500">
                <AlertTriangle className="h-8 w-8 mb-2" />
                <p>Error loading products</p>
                <p className="text-sm">{error}</p>
                <Button 
                  variant="outline" 
                  className="mt-2"
                  onClick={() => {
                    setError(null);
                    loadProducts();
                  }}
                >
                  Retry
                </Button>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <Package className="h-8 w-8 mb-2" />
                <p>No products found</p>
                <p className="text-sm">Add your first product to get started</p>
                <div className="mt-2 text-xs text-center text-muted-foreground">
                  <p>Current filters may be hiding products</p>
                  <p>Try clearing filters or adding a new product</p>
                </div>
                <div className="flex flex-wrap gap-2 mt-2 justify-center">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      // Clear all filters
                      setFilterCategory(null);
                      setFilterStatus("all");
                      setFilterStock("all");
                      setSearchTerm("");
                    }}
                  >
                    Clear Filters
                  </Button>
                  <Button 
                    variant="default" 
                    onClick={() => {
                      resetForm();
                      setIsDialogOpen(true);
                    }}
                  >
                    Add Product
                  </Button>
                  <Button 
                    variant="secondary" 
                    onClick={addSampleProducts}
                  >
                    Add Sample Products
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {product.barcode && `Barcode: ${product.barcode}`}
                              {product.sku && `SKU: ${product.sku}`}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {product.category_id 
                              ? categories.find(c => getCategoryId(c) === product.category_id)?.name || "Uncategorized"
                              : "Uncategorized"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(product.selling_price)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(product.cost_price)}</TableCell>
                        <TableCell className="text-right">
                          <Badge 
                            variant={
                              product.stock_quantity === 0 ? "destructive" : 
                              product.stock_quantity < (product.min_stock_level || 10) ? "outline" : 
                              "default"
                            }
                          >
                            {product.stock_quantity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={product.is_active ? "default" : "secondary"}>
                            {product.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openViewDialog(product)}
                              title="View product details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleProductStatus(product)}
                              title={product.is_active ? "Deactivate product" : "Activate product"}
                            >
                              {product.is_active ? "Deactivate" : "Activate"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(product)}
                              title="Edit product"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {/* <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDuplicateProduct(product)}
                              title="Duplicate product"
                            >
                              <span className="text-xs">Duplicate</span>
                            </Button> */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => product.id && handleDeleteProduct(product.id)}
                              title="Delete product"
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
            
            {/* Debug Information - Only shown in development */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-4 p-4 bg-muted rounded-md">
                <h4 className="font-medium mb-2">Debug Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total Products:</span> {products.length}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Filtered Products:</span> {filteredProducts.length}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Loading:</span> {loading ? 'Yes' : 'No'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Error:</span> {error ? 'Yes' : 'No'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Search Term:</span> "{searchTerm}"
                  </div>
                  <div>
                    <span className="text-muted-foreground">Category Filter:</span> {filterCategory || 'None'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status Filter:</span> {filterStatus}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Stock Filter:</span> {filterStock}
                  </div>
                </div>
                
                {products.length > 0 && filteredProducts.length === 0 && (
                  <div className="mt-3 p-2 bg-yellow-100 rounded">
                    <p className="text-sm font-medium text-yellow-800">Warning: All products are being filtered out!</p>
                    <p className="text-xs text-yellow-700">Check your filters above.</p>
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      className="mt-2"
                      onClick={() => {
                        // Clear all filters
                        setFilterCategory(null);
                        setFilterStatus("all");
                        setFilterStock("all");
                        setSearchTerm("");
                      }}
                    >
                      Clear All Filters
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Export/Import Manager - Moved below product inventory as requested */}
        <Card>
          <CardHeader>
            <CardTitle>Import/Export Products</CardTitle>
          </CardHeader>
          <CardContent>
            <ExportImportManager 
              data={products}
              onImport={handleImportProducts}
              dataType="products"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};