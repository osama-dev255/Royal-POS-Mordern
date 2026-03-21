import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Building, 
  Package, 
  Search,
  ArrowLeft,
  Plus,
  Minus,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Boxes,
  DollarSign,
  RefreshCw,
  Filter,
  Grid3X3,
  List,
  ExternalLink,
  Truck,
  Pencil
} from "lucide-react";
import { getOutlets, Outlet } from "@/services/databaseService";
import { getDeliveriesByOutletId, DeliveryData } from "@/utils/deliveryUtils";

interface OutletInventoryProps {
  onBack: () => void;
  outletId?: string;
}

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  minStock: number;
  maxStock: number;
  unitPrice: number;
  sellingPrice: number;
  totalValue: number;
  status: 'in-stock' | 'low-stock' | 'out-of-stock';
  lastUpdated: string;
  deliveryNoteNumber?: string;
}

interface InventoryStats {
  totalProducts: number;
  totalValue: number;
  lowStockItems: number;
  outOfStockItems: number;
  categories: number;
  avgTurnover: number;
  totalDeliveries: number;
}

export const OutletInventory = ({ onBack, outletId: propOutletId }: OutletInventoryProps) => {
  const [outlet, setOutlet] = useState<Outlet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [deliveries, setDeliveries] = useState<DeliveryData[]>([]);
  
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    quantity: 0,
    unitCost: 0,
    sellingPrice: 0
  });

  const [stats, setStats] = useState<InventoryStats>({
    totalProducts: 0,
    totalValue: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    categories: 0,
    avgTurnover: 0,
    totalDeliveries: 0
  });

  // Helper functions for persisting selling prices to localStorage
  const getSavedPricesKey = (outletId: string) => `outlet_${outletId}_selling_prices`;
  const getSoldQuantitiesKey = (outletId: string) => `outlet_${outletId}_sold_quantities`;
  
  const loadSavedSellingPrices = (outletId: string): Record<string, number> => {
    try {
      const key = getSavedPricesKey(outletId);
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error("Error loading saved selling prices:", error);
      return {};
    }
  };
  
  const loadSoldQuantities = (outletId: string): Record<string, number> => {
    try {
      const key = getSoldQuantitiesKey(outletId);
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error("Error loading sold quantities:", error);
      return {};
    }
  };
  
  const saveSellingPrice = (outletId: string, productId: string, price: number) => {
    try {
      const key = getSavedPricesKey(outletId);
      const savedPrices = loadSavedSellingPrices(outletId);
      savedPrices[productId] = price;
      localStorage.setItem(key, JSON.stringify(savedPrices));
    } catch (error) {
      console.error("Error saving selling price:", error);
    }
  };

  useEffect(() => {
    fetchOutletAndInventory();
  }, [propOutletId]);

  useEffect(() => {
    calculateStats();
  }, [inventory]);

  const fetchOutletAndInventory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!propOutletId) {
        setError("No outlet ID provided");
        return;
      }
      
      // Fetch outlet details
      const allOutlets = await getOutlets();
      const foundOutlet = allOutlets.find(o => o.id === propOutletId);
      
      if (foundOutlet) {
        setOutlet(foundOutlet);
      } else {
        setError("Outlet not found");
        return;
      }
      
      // Fetch deliveries for this outlet
      const outletDeliveries = await getDeliveriesByOutletId(propOutletId);
      setDeliveries(outletDeliveries);
      
      // Process deliveries into inventory items
      const inventoryMap = new Map<string, InventoryItem>();
      
      outletDeliveries.forEach(delivery => {
        if (delivery.itemsList && Array.isArray(delivery.itemsList)) {
          delivery.itemsList.forEach((item: any) => {
            const itemName = item.description || item.name || 'Unknown Product';
            const existingItem = inventoryMap.get(itemName);
            
            if (existingItem) {
              // Aggregate quantities for same product
              existingItem.quantity += item.quantity || item.delivered || 0;
              existingItem.totalValue = existingItem.quantity * existingItem.unitPrice;
              existingItem.lastUpdated = delivery.date;
              existingItem.deliveryNoteNumber = delivery.deliveryNoteNumber;
            } else {
              // Create new inventory item
              const quantity = item.quantity || item.delivered || 0;
              const unitPrice = item.rate || item.price || 0;
              const minStock = Math.floor(quantity * 0.2); // 20% of quantity as min stock
              const maxStock = Math.floor(quantity * 1.5); // 150% of quantity as max stock
              
              inventoryMap.set(itemName, {
                id: `${delivery.id}-${itemName}`,
                name: itemName,
                sku: item.sku || `SKU-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
                category: item.category || 'General',
                quantity: quantity,
                minStock: minStock,
                maxStock: maxStock,
                unitPrice: unitPrice,
                sellingPrice: unitPrice , // 30% markup for selling price
                totalValue: quantity * unitPrice,
                status: quantity > minStock ? 'in-stock' : quantity > 0 ? 'low-stock' : 'out-of-stock',
                lastUpdated: delivery.date,
                deliveryNoteNumber: delivery.deliveryNoteNumber
              });
            }
          });
        }
      });
      
      // Convert map to array and update status
      const inventoryArray = Array.from(inventoryMap.values()).map(item => ({
        ...item,
        status: (item.quantity > item.minStock ? 'in-stock' : 
                item.quantity > 0 ? 'low-stock' : 'out-of-stock') as 'in-stock' | 'low-stock' | 'out-of-stock'
      }));
      
      // Apply saved selling prices and sold quantities from localStorage
      const savedPrices = loadSavedSellingPrices(propOutletId);
      const soldQuantities = loadSoldQuantities(propOutletId);
      const inventoryWithSavedPrices = inventoryArray.map(item => {
        const soldQty = soldQuantities[item.id] || 0;
        const availableQuantity = Math.max(0, item.quantity - soldQty);
        const newStatus = availableQuantity > item.minStock ? 'in-stock' : availableQuantity > 0 ? 'low-stock' : 'out-of-stock';
        
        return {
          ...item,
          sellingPrice: savedPrices[item.id] !== undefined ? savedPrices[item.id] : item.sellingPrice,
          quantity: availableQuantity,
          status: newStatus as 'in-stock' | 'low-stock' | 'out-of-stock'
        };
      });
      
      setInventory(inventoryWithSavedPrices);
    } catch (err) {
      setError("Failed to fetch outlet inventory. Please try again.");
      console.error("Error fetching outlet inventory:", err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const totalValue = inventory.reduce((sum, item) => sum + item.totalValue, 0);
    const lowStock = inventory.filter(item => item.status === 'low-stock').length;
    const outOfStock = inventory.filter(item => item.status === 'out-of-stock').length;
    const categories = new Set(inventory.map(item => item.category)).size;
    
    setStats({
      totalProducts: inventory.length,
      totalValue,
      lowStockItems: lowStock,
      outOfStockItems: outOfStock,
      categories,
      avgTurnover: 4.2,
      totalDeliveries: deliveries.length
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in-stock': return 'bg-green-100 text-green-800 border-green-200';
      case 'low-stock': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'out-of-stock': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStockProgress = (quantity: number, maxStock: number) => {
    return Math.min((quantity / maxStock) * 100, 100);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...new Set(inventory.map(item => item.category))];

  const handleEditClick = (item: InventoryItem) => {
    setEditingItem(item);
    setEditForm({
      quantity: item.quantity,
      unitCost: item.unitPrice,
      sellingPrice: item.sellingPrice
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingItem || !propOutletId) return;
    
    // Save to localStorage
    saveSellingPrice(propOutletId, editingItem.id, editForm.sellingPrice);
    
    setInventory(prev => prev.map(item => {
      if (item.id === editingItem.id) {
        return {
          ...item,
          sellingPrice: editForm.sellingPrice
        };
      }
      return item;
    }));
    
    setIsEditDialogOpen(false);
    setEditingItem(null);
  };

  const handleCloseEdit = () => {
    setIsEditDialogOpen(false);
    setEditingItem(null);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="flex justify-center items-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-1">
              <h3 className="text-red-800 font-medium">Error</h3>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchOutletAndInventory} className="ml-4">
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!outlet) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Outlet not found</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onBack}
          className="flex items-center gap-2 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Outlets
        </Button>

        <Card className="bg-gradient-to-r from-purple-600 to-purple-800 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 rounded-lg">
                  <Building className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">{outlet.name}</h1>
                  <p className="text-purple-100 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Inventory Management
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="bg-white text-purple-700 hover:bg-purple-50">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
                <Button variant="outline" className="border-white text-white hover:bg-white/20" onClick={() => {
                  if (outlet?.id) {
                    window.location.hash = `#/outlet/${outlet.id}`;
                  }
                }}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Full Dashboard
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Products</p>
                <p className="text-2xl font-bold">{stats.totalProducts}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-full">
                <Boxes className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inventory Value</p>
                <p className="text-xl font-bold">{formatCurrency(stats.totalValue)}</p>
              </div>
              <div className="p-2 bg-green-100 rounded-full">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Low Stock</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.lowStockItems}</p>
              </div>
              <div className="p-2 bg-yellow-100 rounded-full">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Out of Stock</p>
                <p className="text-2xl font-bold text-red-600">{stats.outOfStockItems}</p>
              </div>
              <div className="p-2 bg-red-100 rounded-full">
                <Package className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Categories</p>
                <p className="text-2xl font-bold">{stats.categories}</p>
              </div>
              <div className="p-2 bg-purple-100 rounded-full">
                <Grid3X3 className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Turnover</p>
                <p className="text-2xl font-bold">{stats.avgTurnover}x</p>
              </div>
              <div className="p-2 bg-orange-100 rounded-full">
                <TrendingUp className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products by name or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? 'All Categories' : cat}
                  </option>
                ))}
              </select>
              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-none rounded-l-md"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-none rounded-r-md"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredInventory.map((item) => (
            <Card key={item.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{item.sku}</p>
                  </div>
                  <Badge className={getStatusColor(item.status)}>
                    {item.status.replace('-', ' ')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Category:</span>
                    <span className="font-medium">{item.category}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Unit Cost:</span>
                    <span className="font-medium">{formatCurrency(item.unitPrice)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Cost:</span>
                    <span className="font-semibold">{formatCurrency(item.totalValue)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Unit Price:</span>
                    <span className="font-medium">{formatCurrency(item.sellingPrice)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Price:</span>
                    <span className="font-semibold">{formatCurrency(item.sellingPrice * item.quantity)}</span>
                  </div>
                  <div className="pt-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Stock Level</span>
                      <span className="font-medium">{item.quantity} / {item.maxStock}</span>
                    </div>
                    <Progress 
                      value={getStockProgress(item.quantity, item.maxStock)} 
                      className="h-2"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleEditClick(item)}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-3 px-4 font-medium">Product</th>
                    <th className="text-left py-3 px-4 font-medium">SKU</th>
                    <th className="text-left py-3 px-4 font-medium">Category</th>
                    <th className="text-left py-3 px-4 font-medium">Quantity</th>
                    <th className="text-left py-3 px-4 font-medium">Unit Cost</th>
                    <th className="text-left py-3 px-4 font-medium">Total Cost</th>
                    <th className="text-left py-3 px-4 font-medium">Unit Price</th>
                    <th className="text-left py-3 px-4 font-medium">Total Price</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div className="font-medium">{item.name}</div>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{item.sku}</td>
                      <td className="py-3 px-4">{item.category}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.quantity}</span>
                          <Progress 
                            value={getStockProgress(item.quantity, item.maxStock)} 
                            className="w-20 h-2"
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4">{formatCurrency(item.unitPrice)}</td>
                      <td className="py-3 px-4 font-semibold">{formatCurrency(item.totalValue)}</td>
                      <td className="py-3 px-4">{formatCurrency(item.sellingPrice)}</td>
                      <td className="py-3 px-4 font-semibold">{formatCurrency(item.sellingPrice * item.quantity)}</td>
                      <td className="py-3 px-4">
                        <Badge className={getStatusColor(item.status)}>
                          {item.status.replace('-', ' ')}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditClick(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              {editingItem?.name} ({editingItem?.sku})
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-muted-foreground">
                Quantity
              </Label>
              <div className="col-span-3 py-2 px-3 bg-muted rounded-md text-sm">
                {editForm.quantity}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-muted-foreground">
                Unit Cost
              </Label>
              <div className="col-span-3 py-2 px-3 bg-muted rounded-md text-sm">
                {formatCurrency(editForm.unitCost)}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sellingPrice" className="text-right">
                Selling Price
              </Label>
              <Input
                id="sellingPrice"
                type="number"
                value={editForm.sellingPrice}
                onChange={(e) => setEditForm({ ...editForm, sellingPrice: parseFloat(e.target.value) || 0 })}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseEdit}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
