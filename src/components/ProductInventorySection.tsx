import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Package, AlertTriangle, TrendingUp, TrendingDown, Filter } from "lucide-react";
import { getProducts, Product } from "@/services/databaseService";
import { formatCurrency } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";

interface ProductInventorySectionProps {
  searchTerm?: string;
  onProductSelect?: (product: Product) => void;
}

export const ProductInventorySection = ({ 
  searchTerm = "", 
  onProductSelect 
}: ProductInventorySectionProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<"all" | "in-stock" | "low-stock" | "out-of-stock">("all");
  const [sortBy, setSortBy] = useState<"name" | "stock" | "value" | "category">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const { toast } = useToast();

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await getProducts();
      setProducts(data);
    } catch (error) {
      console.error("Error loading products:", error);
      toast({
        title: "Error",
        description: "Failed to load product inventory",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort products
  const filteredAndSortedProducts = useMemo(() => {
    let result = products.filter(product => {
      // Search filter
      const matchesSearch = 
        product.name.toLowerCase().includes(localSearchTerm.toLowerCase()) ||
        (product.barcode && product.barcode.includes(localSearchTerm)) ||
        (product.sku && product.sku.toLowerCase().includes(localSearchTerm.toLowerCase()));
      
      // Stock filter
      const stockLevel = product.stock_quantity;
      const minLevel = product.min_stock_level || 10;
      const matchesStock = stockFilter === "all" ||
        (stockFilter === "in-stock" && stockLevel > 0 && stockLevel >= minLevel) ||
        (stockFilter === "low-stock" && stockLevel > 0 && stockLevel < minLevel) ||
        (stockFilter === "out-of-stock" && stockLevel === 0);
      
      // Category filter
      const matchesCategory = categoryFilter === "all" || product.category_id === categoryFilter;
      
      return matchesSearch && matchesStock && matchesCategory;
    });

    // Sort results
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "stock":
          comparison = a.stock_quantity - b.stock_quantity;
          break;
        case "value":
          comparison = (a.selling_price * a.stock_quantity) - (b.selling_price * b.stock_quantity);
          break;
        case "category":
          // This would need category names, simplified for now
          comparison = (a.category_id || "").localeCompare(b.category_id || "");
          break;
      }
      
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [products, localSearchTerm, stockFilter, categoryFilter, sortBy, sortOrder]);

  // Calculate inventory statistics
  const totalProducts = products.length;
  const totalStockValue = products.reduce((sum, product) => 
    sum + (product.selling_price * product.stock_quantity), 0
  );
  const lowStockItems = products.filter(p => 
    p.stock_quantity > 0 && p.stock_quantity < (p.min_stock_level || 10)
  ).length;
  const outOfStockItems = products.filter(p => p.stock_quantity === 0).length;

  const handleRefresh = () => {
    loadProducts();
    toast({
      title: "Refreshed",
      description: "Product inventory data updated"
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center h-32">
          <p>Loading product inventory...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Inventory Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground">Active inventory items</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalStockValue)}</div>
            <p className="text-xs text-muted-foreground">Total stock value</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{lowStockItems}</div>
            <p className="text-xs text-muted-foreground">Items below minimum</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{outOfStockItems}</div>
            <p className="text-xs text-muted-foreground">Items unavailable</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Product Inventory</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <Filter className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products by name, barcode, or SKU..."
              className="pl-10"
              value={localSearchTerm}
              onChange={(e) => setLocalSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Stock Status</label>
              <Select value={stockFilter} onValueChange={(value: any) => setStockFilter(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by stock status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stock Levels</SelectItem>
                  <SelectItem value="in-stock">In Stock</SelectItem>
                  <SelectItem value="low-stock">Low Stock</SelectItem>
                  <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Sort By</label>
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="stock">Stock Quantity</SelectItem>
                  <SelectItem value="value">Inventory Value</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Order</label>
              <Select value={sortOrder} onValueChange={(value: any) => setSortOrder(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascending</SelectItem>
                  <SelectItem value="desc">Descending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          {filteredAndSortedProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mb-4" />
              <h3 className="text-lg font-medium mb-1">No Products Found</h3>
              <p className="text-center mb-4">
                {localSearchTerm || stockFilter !== "all" 
                  ? "No products match your current filters" 
                  : "No products in inventory"}
              </p>
              <Button 
                variant="outline"
                onClick={() => {
                  setLocalSearchTerm("");
                  setStockFilter("all");
                }}
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU/Barcode</TableHead>
                    <TableHead className="text-right">Current Stock</TableHead>
                    <TableHead className="text-right">Min Level</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedProducts.map((product) => {
                    const stockLevel = product.stock_quantity;
                    const minLevel = product.min_stock_level || 10;
                    const isLowStock = stockLevel > 0 && stockLevel < minLevel;
                    const isOutOfStock = stockLevel === 0;
                    const totalValue = product.selling_price * stockLevel;
                    
                    return (
                      <TableRow 
                        key={product.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => onProductSelect?.(product)}
                      >
                        <TableCell className="font-medium">
                          <div>
                            <div>{product.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {product.description?.substring(0, 50)}{product.description && product.description.length > 50 ? '...' : ''}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {product.sku && <div>SKU: {product.sku}</div>}
                            {product.barcode && <div>Barcode: {product.barcode}</div>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className={`font-medium ${isOutOfStock ? 'text-red-600' : isLowStock ? 'text-yellow-600' : 'text-green-600'}`}>
                            {stockLevel}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {minLevel}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(product.selling_price)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(totalValue)}
                        </TableCell>
                        <TableCell>
                          {isOutOfStock ? (
                            <Badge variant="destructive">Out of Stock</Badge>
                          ) : isLowStock ? (
                            <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Low Stock
                            </Badge>
                          ) : (
                            <Badge variant="default">In Stock</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="text-sm text-muted-foreground text-center">
        Showing {filteredAndSortedProducts.length} of {totalProducts} products
      </div>
    </div>
  );
};