import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Package, ChevronDown, ChevronRight, Truck, Link, Unlink, Loader2 } from "lucide-react";
import { getSuppliers, Supplier, getProducts, Product, getProductsBySupplierId, linkProductToSupplier, unlinkProductFromSupplier } from "@/services/databaseService";
import { formatCurrency } from "@/lib/currency";

interface SupplierProductsSectionProps {
  onBack: () => void;
  onLogout: () => void;
  username: string;
}

interface SupplierWithProducts {
  supplier: Supplier;
  products: Product[];
  expanded: boolean;
  loading: boolean;
}

export const SupplierProductsSection = ({ onBack, onLogout, username }: SupplierProductsSectionProps) => {
  const [supplierProducts, setSupplierProducts] = useState<SupplierWithProducts[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [linkingProductId, setLinkingProductId] = useState<string>("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [suppliers, products] = await Promise.all([
        getSuppliers(),
        getProducts()
      ]);
      
      setAllProducts(products);
      
      // Initialize supplier products array
      const supplierWithProducts: SupplierWithProducts[] = suppliers.map(s => ({
        supplier: s,
        products: [],
        expanded: false,
        loading: false
      }));
      
      setSupplierProducts(supplierWithProducts);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = async (index: number) => {
    const item = supplierProducts[index];
    
    if (!item.expanded && item.products.length === 0 && item.supplier.id) {
      // Load products for this supplier
      setSupplierProducts(prev => prev.map((sp, i) => 
        i === index ? { ...sp, loading: true } : sp
      ));
      
      try {
        const products = await getProductsBySupplierId(item.supplier.id!);
        setSupplierProducts(prev => prev.map((sp, i) => 
          i === index ? { ...sp, products, expanded: true, loading: false } : sp
        ));
      } catch (error) {
        console.error("Error loading supplier products:", error);
        setSupplierProducts(prev => prev.map((sp, i) => 
          i === index ? { ...sp, loading: false } : sp
        ));
      }
    } else {
      // Just toggle expanded state
      setSupplierProducts(prev => prev.map((sp, i) => 
        i === index ? { ...sp, expanded: !sp.expanded } : sp
      ));
    }
  };

  const handleLinkProduct = async (supplierId: string, productId: string, supplierIndex: number) => {
    setLinkingProductId(productId);
    try {
      const success = await linkProductToSupplier(productId, supplierId);
      if (success) {
        // Reload products for this supplier
        const products = await getProductsBySupplierId(supplierId);
        setSupplierProducts(prev => prev.map((sp, i) => 
          i === supplierIndex ? { ...sp, products } : sp
        ));
      }
    } catch (error) {
      console.error("Error linking product:", error);
    } finally {
      setLinkingProductId("");
    }
  };

  const handleUnlinkProduct = async (supplierId: string, productId: string, supplierIndex: number) => {
    setLinkingProductId(productId);
    try {
      const success = await unlinkProductFromSupplier(productId, supplierId);
      if (success) {
        // Reload products for this supplier
        const products = await getProductsBySupplierId(supplierId);
        setSupplierProducts(prev => prev.map((sp, i) => 
          i === supplierIndex ? { ...sp, products } : sp
        ));
      }
    } catch (error) {
      console.error("Error unlinking product:", error);
    } finally {
      setLinkingProductId("");
    }
  };

  // Filter suppliers based on search term
  const filteredSupplierProducts = supplierProducts.filter(sp => 
    sp.supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sp.products.some(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Get products not linked to a specific supplier
  const getUnlinkedProducts = (supplierId: string, currentProducts: Product[]) => {
    const linkedProductIds = new Set(currentProducts.map(p => p.id));
    return allProducts.filter(p => !linkedProductIds.has(p.id));
  };

  const totalProducts = allProducts.length;
  const totalSuppliers = supplierProducts.length;
  const totalLinks = supplierProducts.reduce((sum, sp) => sum + sp.products.length, 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">Supplier Products</h2>
          <p className="text-muted-foreground">View and manage products linked to suppliers</p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Total Suppliers</div>
              <div className="text-2xl font-bold">{totalSuppliers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Total Products</div>
              <div className="text-2xl font-bold">{totalProducts}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Product-Supplier Links</div>
              <div className="text-2xl font-bold text-green-600">{totalLinks}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search suppliers or products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Supplier Products List */}
        {loading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p className="text-muted-foreground">Loading supplier products...</p>
            </CardContent>
          </Card>
        ) : filteredSupplierProducts.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-semibold mb-2">No Suppliers Found</p>
              <p className="text-muted-foreground">
                {searchTerm ? "Try a different search term" : "No suppliers registered yet"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredSupplierProducts.map((sp, index) => (
              <Card key={sp.supplier.id}>
                <CardHeader 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleExpand(index)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {sp.expanded ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      )}
                      <Truck className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle className="text-lg">{sp.supplier.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {sp.supplier.contact_person && `Contact: ${sp.supplier.contact_person} • `}
                          {sp.supplier.phone && `Phone: ${sp.supplier.phone}`}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="mr-2">
                      {sp.loading ? "Loading..." : `${sp.products.length} products`}
                    </Badge>
                  </div>
                </CardHeader>
                
                {sp.expanded && (
                  <CardContent className="pt-0">
                    {sp.loading ? (
                      <div className="text-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Loading products...</p>
                      </div>
                    ) : sp.products.length === 0 ? (
                      <div className="text-center py-4">
                        <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mb-3">No products linked to this supplier</p>
                        <p className="text-xs text-muted-foreground">
                          Products can be linked from the Supplier Purchase Note Preview
                        </p>
                      </div>
                    ) : (
                      <div className="border rounded-md overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 border-b">
                            <tr>
                              <th className="text-left p-3 font-medium">Product</th>
                              <th className="text-left p-3 font-medium">Unit</th>
                              <th className="text-right p-3 font-medium">Cost Price</th>
                              <th className="text-right p-3 font-medium">Selling Price</th>
                              <th className="text-center p-3 font-medium">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sp.products.map((product) => (
                              <tr key={product.id} className="border-b hover:bg-gray-50">
                                <td className="p-3">
                                  <div className="font-medium">{product.name}</div>
                                  {product.description && (
                                    <div className="text-xs text-muted-foreground">{product.description}</div>
                                  )}
                                </td>
                                <td className="p-3">{product.unit_of_measure || "-"}</td>
                                <td className="p-3 text-right">{formatCurrency(product.cost_price || 0)}</td>
                                <td className="p-3 text-right">{formatCurrency(product.selling_price || 0)}</td>
                                <td className="p-3 text-center">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleUnlinkProduct(sp.supplier.id!, product.id!, index)}
                                    disabled={linkingProductId === product.id}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    {linkingProductId === product.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <>
                                        <Unlink className="h-4 w-4 mr-1" />
                                        Unlink
                                      </>
                                    )}
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Link New Product Section */}
                    {sp.expanded && !sp.loading && (
                      <div className="mt-4 pt-4 border-t">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Link className="h-4 w-4" />
                          Link Existing Product
                        </h4>
                        <p className="text-xs text-muted-foreground mb-3">
                          Link an existing product to this supplier
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {getUnlinkedProducts(sp.supplier.id!, sp.products).slice(0, 6).map((product) => (
                            <Button
                              key={product.id}
                              variant="outline"
                              size="sm"
                              onClick={() => handleLinkProduct(sp.supplier.id!, product.id!, index)}
                              disabled={linkingProductId === product.id}
                              className="justify-start"
                            >
                              {linkingProductId === product.id ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                              ) : (
                                <Link className="h-4 w-4 mr-1" />
                              )}
                              {product.name}
                            </Button>
                          ))}
                          {getUnlinkedProducts(sp.supplier.id!, sp.products).length > 6 && (
                            <p className="text-xs text-muted-foreground col-span-full">
                              + {getUnlinkedProducts(sp.supplier.id!, sp.products).length - 6} more products available
                            </p>
                          )}
                          {getUnlinkedProducts(sp.supplier.id!, sp.products).length === 0 && (
                            <p className="text-xs text-muted-foreground col-span-full">
                              All products are already linked to this supplier
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
