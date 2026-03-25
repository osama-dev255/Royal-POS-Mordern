import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  ClipboardCheck, 
  ArrowLeft, 
  Search,
  Package,
  Save,
  Calculator
} from "lucide-react";
import { getDeliveriesByOutletId, DeliveryData } from "@/utils/deliveryUtils";
import { getAvailableInventoryByOutlet, InventoryProduct } from "@/services/databaseService";
import { useToast } from "@/hooks/use-toast";

interface OutletStockTakeProps {
  onBack: () => void;
  outletId?: string;
}

interface StockItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  originalQuantity: number;
  soldQuantity: number;
  stockRemain: number;
  physicalCount: number;
  discrepancy: number;
}

export const OutletStockTake = ({ onBack, outletId }: OutletStockTakeProps) => {
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadStockData();
  }, [outletId]);

  const loadStockData = async () => {
    if (!outletId) return;
    
    try {
      setLoading(true);
      
      // Load inventory from database with sold quantities
      const dbInventory = await getAvailableInventoryByOutlet(outletId);
      
      // Load physical counts from localStorage
      const physicalCountsKey = `outlet_${outletId}_physical_counts`;
      const physicalCounts: Record<string, number> = JSON.parse(localStorage.getItem(physicalCountsKey) || '{}');
      
      // Convert database inventory to stock items
      const stockItemsList: StockItem[] = dbInventory.map(item => {
        const productId = `${item.outlet_id}-${item.name}`;
        const originalQty = item.quantity;
        const soldQty = item.sold_quantity || 0;
        const availableQty = item.available_quantity || Math.max(0, originalQty - soldQty);
        const physicalCount = physicalCounts[productId] ?? availableQty;
        
        return {
          id: productId,
          name: item.name,
          sku: item.sku || `SKU-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
          category: item.category || 'General',
          originalQuantity: originalQty,
          soldQuantity: soldQty,
          stockRemain: availableQty,
          physicalCount: physicalCount,
          discrepancy: physicalCount - availableQty
        };
      });
      
      setStockItems(stockItemsList);
    } catch (error) {
      console.error("Error loading stock data:", error);
      toast({
        title: "Error",
        description: "Failed to load stock data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePhysicalCountChange = (itemId: string, value: number) => {
    setStockItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const discrepancy = value - item.stockRemain;
        return {
          ...item,
          physicalCount: value,
          discrepancy: discrepancy
        };
      }
      return item;
    }));
  };

  const savePhysicalCounts = () => {
    if (!outletId) return;
    
    const physicalCountsKey = `outlet_${outletId}_physical_counts`;
    const physicalCounts: Record<string, number> = {};
    
    stockItems.forEach(item => {
      physicalCounts[item.id] = item.physicalCount;
    });
    
    localStorage.setItem(physicalCountsKey, JSON.stringify(physicalCounts));
    
    // Update sold quantities based on physical count
    // Formula: Sold = Original - Physical Count
    const soldQuantitiesKey = `outlet_${outletId}_sold_quantities`;
    const soldQuantities: Record<string, number> = {};
    
    stockItems.forEach(item => {
      soldQuantities[item.id] = Math.max(0, item.originalQuantity - item.physicalCount);
    });
    
    localStorage.setItem(soldQuantitiesKey, JSON.stringify(soldQuantities));
    
    toast({
      title: "Stock Take Saved",
      description: "Physical counts have been saved and inventory updated"
    });
    
    // Reload data to reflect changes
    loadStockData();
  };

  const filteredItems = stockItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalDiscrepancy = stockItems.reduce((sum, item) => sum + item.discrepancy, 0);
  const itemsWithDiscrepancy = stockItems.filter(item => item.discrepancy !== 0).length;

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="flex justify-center items-center h-64">
          <ClipboardCheck className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Stock Take</h1>
          <p className="text-muted-foreground">Physical inventory count for this outlet</p>
        </div>
        <Button onClick={savePhysicalCounts}>
          <Save className="h-4 w-4 mr-2" />
          Save Stock Take
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Products</p>
                <p className="text-2xl font-bold">{stockItems.length}</p>
              </div>
              <Package className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Stock</p>
                <p className="text-2xl font-bold">
                  {stockItems.reduce((sum, item) => sum + item.stockRemain, 0)}
                </p>
              </div>
              <Calculator className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Discrepancies</p>
                <p className="text-2xl font-bold">{itemsWithDiscrepancy}</p>
              </div>
              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${totalDiscrepancy !== 0 ? 'bg-yellow-100' : 'bg-green-100'}`}>
                <div className={`h-3 w-3 rounded-full ${totalDiscrepancy !== 0 ? 'bg-yellow-500' : 'bg-green-500'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Net Difference</p>
                <p className={`text-2xl font-bold ${totalDiscrepancy > 0 ? 'text-green-600' : totalDiscrepancy < 0 ? 'text-red-600' : ''}`}>
                  {totalDiscrepancy > 0 ? '+' : ''}{totalDiscrepancy}
                </p>
              </div>
              <ClipboardCheck className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card className="mb-6 bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Calculator className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-800">How Stock Take Works</h3>
              <p className="text-sm text-blue-700 mt-1">
                Enter the physical count for each product. The system will calculate: 
                <strong> Stock Sold = Original Quantity - Physical Count</strong>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products by name, SKU, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Stock Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-3 px-4 font-medium">Product</th>
                  <th className="text-left py-3 px-4 font-medium">SKU</th>
                  <th className="text-left py-3 px-4 font-medium">Category</th>
                  <th className="text-right py-3 px-4 font-medium">Original Qty</th>
                  <th className="text-right py-3 px-4 font-medium">System Stock</th>
                  <th className="text-right py-3 px-4 font-medium">Physical Count</th>
                  <th className="text-right py-3 px-4 font-medium">Discrepancy</th>
                  <th className="text-right py-3 px-4 font-medium">Calculated Sold</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4">
                      <span className="font-medium">{item.name}</span>
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{item.sku}</td>
                    <td className="py-3 px-4">{item.category}</td>
                    <td className="py-3 px-4 text-right">{item.originalQuantity}</td>
                    <td className="py-3 px-4 text-right">{item.stockRemain}</td>
                    <td className="py-3 px-4 text-right">
                      <Input
                        type="number"
                        min="0"
                        value={item.physicalCount}
                        onChange={(e) => handlePhysicalCountChange(item.id, parseInt(e.target.value) || 0)}
                        className="w-24 text-right ml-auto"
                        onFocus={() => setIsEditing(item.id)}
                        onBlur={() => setIsEditing(null)}
                      />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Badge className={
                        item.discrepancy > 0 ? 'bg-green-100 text-green-800' :
                        item.discrepancy < 0 ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }>
                        {item.discrepancy > 0 ? '+' : ''}{item.discrepancy}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold">
                      {item.originalQuantity - item.physicalCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredItems.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No products found</h3>
              <p className="text-muted-foreground">Try adjusting your search terms</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
