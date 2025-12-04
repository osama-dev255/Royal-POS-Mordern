import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Edit, Trash2, Percent, Filter, Link } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  getDiscountProducts,
  createDiscountProduct,
  deleteDiscountProduct,
  getProducts,
  getDiscounts
} from "@/services/databaseService";

interface DiscountProduct {
  discount_id: string;
  product_id: string;
}

interface Product {
  id: string;
  name: string;
  barcode?: string;
  sku?: string;
}

interface Discount {
  id: string;
  name: string;
}

export const DiscountProducts = ({ username, onBack, onLogout }: { username: string; onBack: () => void; onLogout: () => void }) => {
  const [discountProducts, setDiscountProducts] = useState<DiscountProduct[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newDiscountProduct, setNewDiscountProduct] = useState<Omit<DiscountProduct, "id">>({
    discount_id: "",
    product_id: ""
  });
  const { toast } = useToast();

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // In a real app, you would fetch this data from the database
        // For now, we'll use mock data
        const mockDiscountProducts: DiscountProduct[] = [
          { discount_id: "1", product_id: "1" },
          { discount_id: "1", product_id: "2" },
          { discount_id: "3", product_id: "3" }
        ];
        
        // Mock products data
        const mockProducts: Product[] = [
          { id: "1", name: "Wireless Headphones", barcode: "123456789012" },
          { id: "2", name: "Coffee Maker", barcode: "234567890123" },
          { id: "3", name: "Running Shoes", barcode: "345678901234" }
        ];
        
        // Mock discounts data
        const mockDiscounts: Discount[] = [
          { id: "1", name: "Summer Sale" },
          { id: "2", name: "New Customer Discount" },
          { id: "3", name: "Clearance Sale" }
        ];
        
        setDiscountProducts(mockDiscountProducts);
        setProducts(mockProducts);
        setDiscounts(mockDiscounts);
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

  const handleAddDiscountProduct = () => {
    if (!newDiscountProduct.discount_id || !newDiscountProduct.product_id) {
      toast({
        title: "Error",
        description: "Please select both discount and product",
        variant: "success"
      });
      return;
    }

    // Check if this combination already exists
    const exists = discountProducts.some(
      dp => dp.discount_id === newDiscountProduct.discount_id && dp.product_id === newDiscountProduct.product_id
    );
    
    if (exists) {
      toast({
        title: "Error",
        description: "This discount-product combination already exists",
        variant: "success"
      });
      return;
    }

    const discountProduct: DiscountProduct = {
      ...newDiscountProduct
    };

    setDiscountProducts([...discountProducts, discountProduct]);
    resetForm();
    setIsDialogOpen(false);
    
    toast({
      title: "Success",
      description: "Discount product link created successfully"
    });
  };

  const handleDeleteDiscountProduct = (discountId: string, productId: string) => {
    setDiscountProducts(discountProducts.filter(
      dp => !(dp.discount_id === discountId && dp.product_id === productId)
    ));
    toast({
      title: "Success",
      description: "Discount product link deleted successfully"
    });
  };

  const resetForm = () => {
    setNewDiscountProduct({
      discount_id: "",
      product_id: ""
    });
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const filteredDiscountProducts = discountProducts.filter(dp => {
    const discount = discounts.find(d => d.id === dp.discount_id);
    const product = products.find(p => p.id === dp.product_id);
    
    const matchesSearch = 
      (discount && discount.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (product && product.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesSearch;
  });

  const getDiscountName = (id: string) => {
    const discount = discounts.find(d => d.id === id);
    return discount ? discount.name : "Unknown Discount";
  };

  const getProductName = (id: string) => {
    const product = products.find(p => p.id === id);
    return product ? product.name : "Unknown Product";
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation 
        title="Discount Products" 
        onBack={onBack}
        onLogout={onLogout} 
        username={username}
      />
      
      <main className="container mx-auto p-6">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold">Discount Products</h2>
            <p className="text-muted-foreground">Manage which products are eligible for discounts</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAddDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Link Discount to Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Link Discount to Product</DialogTitle>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="discount" className="text-right">
                    Discount *
                  </Label>
                  <Select 
                    value={newDiscountProduct.discount_id}
                    onValueChange={(value) => setNewDiscountProduct({...newDiscountProduct, discount_id: value})}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select discount" />
                    </SelectTrigger>
                    <SelectContent>
                      {discounts.map(discount => (
                        <SelectItem key={discount.id} value={discount.id}>
                          {discount.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="product" className="text-right">
                    Product *
                  </Label>
                  <Select 
                    value={newDiscountProduct.product_id}
                    onValueChange={(value) => setNewDiscountProduct({...newDiscountProduct, product_id: value})}
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
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddDiscountProduct}>
                  Link
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Links</CardTitle>
              <Link className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{discountProducts.length}</div>
              <p className="text-xs text-muted-foreground">Discount-product combinations</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unique Discounts</CardTitle>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(discountProducts.map(dp => dp.discount_id)).size}
              </div>
              <p className="text-xs text-muted-foreground">Discounts with products</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unique Products</CardTitle>
              <Filter className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(discountProducts.map(dp => dp.product_id)).size}
              </div>
              <p className="text-xs text-muted-foreground">Products with discounts</p>
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
                  placeholder="Search discounts or products..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Discount Products Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link className="h-5 w-5" />
              Discount-Product Links
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading discount products...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Discount</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDiscountProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        No discount-product links found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDiscountProducts.map((discountProduct, index) => (
                      <TableRow key={`${discountProduct.discount_id}-${discountProduct.product_id}-${index}`}>
                        <TableCell>
                          <div className="font-medium">{getDiscountName(discountProduct.discount_id)}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{getProductName(discountProduct.product_id)}</div>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDeleteDiscountProduct(
                              discountProduct.discount_id, 
                              discountProduct.product_id
                            )}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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