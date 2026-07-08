import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { updateProduct, getCategories, Product, Category } from "@/services/databaseService";
import { getGodowns, getZones, getGodownStock, updateGodownStock, Godown, GodownZone, GodownStock } from "@/services/godownService";
import { Edit3, Warehouse, Plus, Trash2, Package, X } from "lucide-react";

// Extended type that includes joined data from getGodownStock query
interface GodownStockWithDetails extends GodownStock {
  godowns?: { name: string; code?: string };
  godown_zones?: { zone_name: string; zone_code?: string } | null;
}

interface EditProductDialogProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductUpdated?: () => void;
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

export const EditProductDialog = ({ product, open, onOpenChange, onProductUpdated }: EditProductDialogProps) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const { toast } = useToast();

  // Warehouse tab state
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [zones, setZones] = useState<GodownZone[]>([]);
  const [godownStockList, setGodownStockList] = useState<GodownStockWithDetails[]>([]);
  const [selectedGodownId, setSelectedGodownId] = useState<string>("");
  const [selectedZoneId, setSelectedZoneId] = useState<string>("none");
  const [godownQuantity, setGodownQuantity] = useState<number>(0);
  const [loadingGodowns, setLoadingGodowns] = useState(false);
  const [savingGodownStock, setSavingGodownStock] = useState(false);

  const [editProduct, setEditProduct] = useState<Product>({
    id: "",
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

  // Load categories and initialize product data when dialog opens
  useEffect(() => {
    if (open && product) {
      loadCategories();
      loadGodownData();
      // Ensure all values are properly set to avoid null values
      setEditProduct({
        ...product,
        name: product.name || "",
        description: product.description || "",
        barcode: product.barcode || "",
        sku: product.sku || "",
        unit_of_measure: product.unit_of_measure || "piece",
        category_id: product.category_id || null,
        selling_price: product.selling_price || 0,
        cost_price: product.cost_price || 0,
        wholesale_price: product.wholesale_price || 0,
        stock_quantity: product.stock_quantity || 0,
        min_stock_level: product.min_stock_level || 0,
        max_stock_level: product.max_stock_level || 100,
        is_active: product.is_active ?? true
      });
    }
  }, [open, product]);

  // Load categories
  const loadCategories = async () => {
    try {
      const categoriesData = await getCategories();
      setCategories(categoriesData);
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  };

  // Load godowns and existing godown stock for this product
  const loadGodownData = async () => {
    if (!product?.id) return;
    setLoadingGodowns(true);
    try {
      const [godownsData, stockData] = await Promise.all([
        getGodowns(),
        getGodownStock(product.id)
      ]);
      setGodowns(godownsData.filter(g => g.status === 'active'));
      setGodownStockList(stockData as GodownStockWithDetails[]);
    } catch (error) {
      console.error("Error loading godown data:", error);
    } finally {
      setLoadingGodowns(false);
    }
  };

  // Load zones when godown is selected
  useEffect(() => {
    if (selectedGodownId) {
      getZones(selectedGodownId).then(setZones).catch(console.error);
    } else {
      setZones([]);
    }
    setSelectedZoneId("none");
  }, [selectedGodownId]);

  // Save godown stock
  const handleSaveGodownStock = async () => {
    if (!product?.id || !selectedGodownId || godownQuantity <= 0) {
      toast({
        title: "Error",
        description: "Please select a godown and enter a valid quantity",
        variant: "destructive"
      });
      return;
    }

    setSavingGodownStock(true);
    try {
      const zoneId = selectedZoneId === "none" ? null : selectedZoneId;
      
      // Find existing stock record for this product+godown+zone combo
      const existingStock = godownStockList.find(s => 
        s.godown_id === selectedGodownId && 
        (s.zone_id || null) === zoneId
      );

      if (existingStock) {
        // Update: calculate delta
        const currentQty = existingStock.quantity || 0;
        const delta = godownQuantity - currentQty;
        if (delta !== 0) {
          await updateGodownStock(product.id, selectedGodownId, zoneId, delta);
        }
      } else {
        // Create new stock record
        await updateGodownStock(product.id, selectedGodownId, zoneId, godownQuantity);
      }

      toast({
        title: "Success",
        description: "Godown stock updated successfully"
      });

      // Reset form and reload
      setSelectedGodownId("");
      setSelectedZoneId("none");
      setGodownQuantity(0);
      await loadGodownData();
    } catch (error) {
      console.error("Error updating godown stock:", error);
      toast({
        title: "Error",
        description: "Failed to update godown stock",
        variant: "destructive"
      });
    } finally {
      setSavingGodownStock(false);
    }
  };

  // Remove stock from a specific godown/zone
  const handleRemoveGodownStock = async (stock: GodownStock) => {
    if (!product?.id) return;
    try {
      // Set quantity to 0 by subtracting current quantity
      await updateGodownStock(product.id, stock.godown_id, stock.zone_id || null, -(stock.quantity || 0));
      toast({
        title: "Success",
        description: "Stock removed from godown"
      });
      await loadGodownData();
    } catch (error) {
      console.error("Error removing godown stock:", error);
      toast({
        title: "Error",
        description: "Failed to remove godown stock",
        variant: "destructive"
      });
    }
  };

  // Remove zone assignment (move stock from specific zone to "All Zones")
  const handleRemoveZoneFromGodownStock = async (stock: GodownStockWithDetails) => {
    if (!product?.id || !stock.zone_id) return;
    try {
      const qty = stock.quantity || 0;
      // Remove from zone-specific entry
      await updateGodownStock(product.id, stock.godown_id, stock.zone_id, -qty);
      // Add to "All Zones" (null zone) for same godown
      if (qty > 0) {
        await updateGodownStock(product.id, stock.godown_id, null, qty);
      }
      toast({ title: "Success", description: "Zone removed, stock moved to All Zones" });
      await loadGodownData();
    } catch (error) {
      console.error("Error removing zone from godown stock:", error);
      toast({ title: "Error", description: "Failed to remove zone assignment", variant: "destructive" });
    }
  };

  // Get godown name from joined data, fallback to local state
  const getGodownName = (stock: GodownStockWithDetails) => {
    return stock.godowns?.name || godowns.find(g => g.id === stock.godown_id)?.name || "Unknown";
  };

  // Get zone name from joined data, fallback to local state
  const getZoneName = (stock: GodownStockWithDetails) => {
    if (!stock.zone_id) return "All Zones";
    return stock.godown_zones?.zone_name || zones.find(z => z.id === stock.zone_id)?.zone_name || "Unknown Zone";
  };

  const handleUpdateProduct = async () => {
    if (!editProduct.id || !editProduct.name || editProduct.selling_price < 0) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      const updatedProduct = await updateProduct(editProduct.id, editProduct);
      if (updatedProduct) {
        toast({
          title: "Success",
          description: "Product updated successfully"
        });
        onOpenChange(false);
        onProductUpdated?.();
      }
    } catch (error) {
      console.error("Error updating product:", error);
      toast({
        title: "Error",
        description: "Failed to update product",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            Edit Product - {product.name}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={editProduct.name || ""}
                  onChange={(e) => setEditProduct({...editProduct, name: e.target.value})}
                  placeholder="Enter product name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={editProduct.category_id || "no-category"}
                  onValueChange={(value) => setEditProduct({...editProduct, category_id: value === "no-category" ? null : value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-category">No Category</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id || ""}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editProduct.description || ""}
                onChange={(e) => setEditProduct({...editProduct, description: e.target.value})}
                placeholder="Enter product description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="barcode">Barcode</Label>
                <Input
                  id="barcode"
                  value={editProduct.barcode || ""}
                  onChange={(e) => setEditProduct({...editProduct, barcode: e.target.value})}
                  placeholder="Enter barcode"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  value={editProduct.sku || ""}
                  onChange={(e) => setEditProduct({...editProduct, sku: e.target.value})}
                  placeholder="Enter SKU"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="pricing" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cost_price">Cost Price *</Label>
                <Input
                  id="cost_price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editProduct.cost_price || 0}
                  onChange={(e) => setEditProduct({...editProduct, cost_price: parseFloat(e.target.value) || 0})}
                  placeholder="0.00"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="selling_price">Selling Price *</Label>
                <Input
                  id="selling_price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editProduct.selling_price || 0}
                  onChange={(e) => setEditProduct({...editProduct, selling_price: parseFloat(e.target.value) || 0})}
                  placeholder="0.00"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="wholesale_price">Wholesale Price</Label>
                <Input
                  id="wholesale_price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editProduct.wholesale_price || 0}
                  onChange={(e) => setEditProduct({...editProduct, wholesale_price: parseFloat(e.target.value) || 0})}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unit_of_measure">Unit of Measure</Label>
                <Select
                  value={editProduct.unit_of_measure || "piece"}
                  onValueChange={(value) => setEditProduct({...editProduct, unit_of_measure: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {unitOfMeasureOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2 flex items-end">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={!!editProduct.is_active}
                    onCheckedChange={(checked) => setEditProduct({...editProduct, is_active: checked})}
                  />
                  <Label htmlFor="is_active">Active Product</Label>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="inventory" className="space-y-6 mt-4">
            {/* General Stock Section */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Package className="h-4 w-4" />
                General Stock
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stock_quantity">Current Stock *</Label>
                  <Input
                    id="stock_quantity"
                    type="number"
                    min="0"
                    value={editProduct.stock_quantity || 0}
                    onChange={(e) => setEditProduct({...editProduct, stock_quantity: parseInt(e.target.value) || 0})}
                    placeholder="0"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="min_stock_level">Min Stock Level</Label>
                  <Input
                    id="min_stock_level"
                    type="number"
                    min="0"
                    value={editProduct.min_stock_level || 0}
                    onChange={(e) => setEditProduct({...editProduct, min_stock_level: parseInt(e.target.value) || 0})}
                    placeholder="0"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="max_stock_level">Max Stock Level</Label>
                  <Input
                    id="max_stock_level"
                    type="number"
                    min="0"
                    value={editProduct.max_stock_level || 0}
                    onChange={(e) => setEditProduct({...editProduct, max_stock_level: parseInt(e.target.value) || 0})}
                    placeholder="100"
                  />
                </div>
              </div>
            </div>

            {/* Warehouse / Godown Assignment Section */}
            <div className="space-y-4 border-t pt-4">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Warehouse className="h-4 w-4" />
                Warehouse (Godown) Assignment
              </Label>

              {loadingGodowns ? (
                <div className="text-center py-6 text-muted-foreground">Loading warehouse data...</div>
              ) : (
                <>
                  {/* Current godown stock for this product */}
                  <div className="space-y-2">
                    {godownStockList.length === 0 ? (
                      <div className="border rounded-lg p-4 text-center text-muted-foreground text-sm">
                        This product is not assigned to any warehouse yet.
                      </div>
                    ) : (
                      <div className="border rounded-lg divide-y">
                        {godownStockList.map((stock, idx) => (
                          <div key={stock.id || idx} className="flex items-center justify-between p-3">
                            <div className="space-y-0.5">
                              <div className="font-medium text-sm flex items-center gap-2">
                                <Warehouse className="h-3.5 w-3.5 text-muted-foreground" />
                                {getGodownName(stock)}
                                {stock.zone_id && (
                                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                                    {getZoneName(stock)}
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveZoneFromGodownStock(stock)}
                                      className="ml-0.5 text-muted-foreground hover:text-destructive rounded-full"
                                      title="Remove zone assignment"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </Badge>
                                )}
                              </div>
                              {!stock.zone_id && (
                                <div className="text-xs text-muted-foreground">All Zones</div>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge variant={stock.quantity > 0 ? "default" : "secondary"}>
                                {stock.quantity} units
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveGodownStock(stock)}
                                className="text-destructive hover:text-destructive h-7 w-7 p-0"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add/Update godown stock form */}
                  <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                    <Label className="text-sm font-semibold">Assign to Warehouse</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="godown-select" className="text-xs text-muted-foreground">Godown (Warehouse) *</Label>
                        <Select
                          value={selectedGodownId || "none"}
                          onValueChange={(v) => setSelectedGodownId(v === "none" ? "" : v)}
                        >
                          <SelectTrigger id="godown-select">
                            <SelectValue placeholder="Select a godown" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Select a godown...</SelectItem>
                            {godowns.map((g) => (
                              <SelectItem key={g.id} value={g.id!}>
                                {g.name} {g.code ? `(${g.code})` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="zone-select" className="text-xs text-muted-foreground">Zone (Optional)</Label>
                        <Select
                          value={selectedZoneId}
                          onValueChange={setSelectedZoneId}
                          disabled={!selectedGodownId || zones.length === 0}
                        >
                          <SelectTrigger id="zone-select">
                            <SelectValue placeholder={zones.length === 0 ? "No zones available" : "Select a zone"} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">All Zones</SelectItem>
                            {zones.map((z) => (
                              <SelectItem key={z.id} value={z.id!}>
                                {z.zone_name} {z.zone_code ? `(${z.zone_code})` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-end gap-3">
                      <div className="space-y-2 flex-1">
                        <Label htmlFor="godown-qty" className="text-xs text-muted-foreground">Quantity *</Label>
                        <Input
                          id="godown-qty"
                          type="number"
                          min="0"
                          value={godownQuantity}
                          onChange={(e) => setGodownQuantity(parseInt(e.target.value) || 0)}
                          placeholder="Enter quantity"
                        />
                      </div>
                      <Button
                        onClick={handleSaveGodownStock}
                        disabled={savingGodownStock || !selectedGodownId || godownQuantity <= 0}
                        size="sm"
                      >
                        {savingGodownStock ? (
                          "Saving..."
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-1" />
                            Assign
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpdateProduct} disabled={loading}>
            {loading ? "Updating..." : "Update Product"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};