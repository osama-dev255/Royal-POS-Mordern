import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Package, AlertTriangle, ArrowUpRight, TrendingDown, Eye, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import { getProducts, getCategories, Product, Category } from "@/services/databaseService";

interface ProductStockMonitorProps {
  searchTerm: string;
  refreshTrigger: number;
}

export const ProductStockMonitor = ({ searchTerm, refreshTrigger }: ProductStockMonitorProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load data on mount and when refresh trigger changes
  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

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
        description: "Failed to load product data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter products based on search term
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (product.barcode && product.barcode.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Calculate statistics
  const totalProducts = products.length;
  const activeProducts = products.filter(p => p.is_active).length;
  const lowStockProducts = products.filter(p => p.stock_quantity > 0 && p.stock_quantity <= p.min_stock_level).length;
  const outOfStockProducts = products.filter(p => p.stock_quantity === 0).length;
  const overStockProducts = products.filter(p => p.stock_quantity > p.max_stock_level).length;
  
  // Calculate total inventory value
  const totalInventoryValue = products.reduce((sum, p) => sum + (p.stock_quantity * p.cost_price), 0);

  // Get stock status badge
  const getStockStatus = (product: Product) => {
    if (product.stock_quantity === 0) {
      return { label: "Out of Stock", variant: "destructive" as const, icon: AlertTriangle };
    }
    if (product.stock_quantity <= product.min_stock_level) {
      return { label: "Low Stock", variant: "destructive" as const, icon: TrendingDown };
    }
    if (product.stock_quantity > product.max_stock_level) {
      return { label: "Over Stock", variant: "secondary" as const, icon: ArrowUpRight };
    }
    return { label: "In Stock", variant: "default" as const, icon: Package };
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Product Stock Monitor
          </CardTitle>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Monitor stock levels and inventory status. For product management, go to Products → Product Management
        </p>
      </CardHeader>
      <CardContent>
        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Total Products</div>
              <div className="text-2xl font-bold">{totalProducts}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Active</div>
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
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Inventory Value</div>
              <div className="text-xl font-bold text-blue-600">{formatCurrency(totalInventoryValue)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Alert Section for Critical Stock */}
        {(lowStockProducts > 0 || outOfStockProducts > 0) && (
          <Card className="mb-6 border-yellow-200 bg-yellow-50 dark:bg-yellow-950">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">Stock Alerts</h3>
              </div>
              <div className="space-y-2">
                {outOfStockProducts > 0 && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    ⚠️ <strong>{outOfStockProducts} products</strong> are out of stock and need immediate attention
                  </p>
                )}
                {lowStockProducts > 0 && (
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    📉 <strong>{lowStockProducts} products</strong> are below minimum stock level
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Products Table - View Only */}
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <p>Loading products...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <Package className="h-8 w-8 mb-2" />
            <p>No products found</p>
            <p className="text-sm">Try adjusting your search term</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name</TableHead>
                  <TableHead>SKU/Barcode</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Selling Price</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Min/Max Levels</TableHead>
                  <TableHead>Stock Status</TableHead>
                  <TableHead>Product Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => {
                  const stockStatus = getStockStatus(product);
                  const StatusIcon = stockStatus.icon;
                  
                  return (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {product.sku && <div>SKU: {product.sku}</div>}
                          {product.barcode && <div className="text-muted-foreground">Barcode: {product.barcode}</div>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {categories.find(c => c.id === product.category_id)?.name || 'Uncategorized'}
                      </TableCell>
                      <TableCell>{formatCurrency(product.selling_price)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{product.stock_quantity}</span>
                          <span className="text-xs text-muted-foreground">{product.unit_of_measure}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>Min: {product.min_stock_level}</div>
                          <div>Max: {product.max_stock_level}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={stockStatus.variant} className="flex items-center gap-1 w-fit">
                          <StatusIcon className="h-3 w-3" />
                          {stockStatus.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={product.is_active ? "default" : "secondary"}>
                          {product.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button 
              variant="outline" 
              className="justify-start"
              onClick={() => window.location.hash = '#/products'}
            >
              <Package className="h-4 w-4 mr-2" />
              Manage Products (Full Editor)
            </Button>
            <Button 
              variant="outline" 
              className="justify-start"
              onClick={() => window.location.hash = '#/inventory-audit'}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Stock Audit
            </Button>
            <Button 
              variant="outline" 
              className="justify-start"
              onClick={() => window.location.hash = '#/damaged-products'}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Report Damaged Items
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
