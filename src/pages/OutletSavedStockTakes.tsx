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
  DollarSign,
  TrendingUp,
  Calendar,
  Eye,
  Trash2,
  BarChart3
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";

interface StockTakeItem {
  name: string;
  sku: string;
  category: string;
  originalQuantity: number;
  stockRemain: number;
  physicalCount: number;
  calculatedSold: number;
  unitCost: number;
  unitPrice: number;
  totalCost: number;
  totalPrice: number;
}

interface SavedStockTake {
  id: string;
  outlet_id: string;
  stock_take_number: string;
  date: string;
  total_products: number;
  total_calculated_sold: number;
  total_costs: number;
  total_price: number;
  potential_earnings: number;
  avg_turnover: number;
  items: StockTakeItem[];
  notes: string;
  status: string;
  created_at: string;
}

interface OutletSavedStockTakesProps {
  onBack: () => void;
  outletId?: string;
}

export const OutletSavedStockTakes = ({ onBack, outletId }: OutletSavedStockTakesProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: ''
  });
  const [stockTakes, setStockTakes] = useState<SavedStockTake[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadStockTakes();
  }, [outletId]);

  const loadStockTakes = async () => {
    if (!outletId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('saved_stock_takes')
        .select('*')
        .eq('outlet_id', outletId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStockTakes(data || []);
    } catch (error) {
      console.error("Error loading stock takes:", error);
      toast({
        title: "Error",
        description: "Failed to load saved stock takes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredStockTakes = stockTakes.filter(stockTake => {
    // Search filter
    const matchesSearch = 
      stockTake.stock_take_number.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Date range filter
    let matchesDateRange = true;
    if (dateRange.start || dateRange.end) {
      const stockTakeDate = new Date(stockTake.date);
      if (dateRange.start) {
        const startDate = new Date(dateRange.start);
        startDate.setHours(0, 0, 0, 0);
        matchesDateRange = matchesDateRange && stockTakeDate >= startDate;
      }
      if (dateRange.end) {
        const endDate = new Date(dateRange.end);
        endDate.setHours(23, 59, 59, 999);
        matchesDateRange = matchesDateRange && stockTakeDate <= endDate;
      }
    }
    
    return matchesSearch && matchesDateRange;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleViewStockTake = (stockTake: SavedStockTake) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const itemsHtml = stockTake.items.map((item: StockTakeItem) => `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${item.name}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${item.sku}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${item.stockRemain}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${item.physicalCount}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${item.calculatedSold}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatCurrency(item.unitCost)}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatCurrency(item.totalCost)}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatCurrency(item.unitPrice)}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatCurrency(item.totalPrice)}</td>
        </tr>
      `).join('');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Stock Take - ${stockTake.stock_take_number}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; }
            .header { margin-bottom: 20px; }
            .info-row { display: flex; gap: 20px; margin-bottom: 10px; }
            .info-label { font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #f5f5f5; padding: 10px; border: 1px solid #ddd; text-align: left; }
            .summary { margin-top: 20px; padding: 15px; background: #f9f9f9; border-radius: 8px; }
            .summary-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Stock Take Report</h1>
            <p style="color: #666;">${stockTake.stock_take_number}</p>
          </div>
          
          <div class="info-row">
            <div><span class="info-label">Date:</span> ${new Date(stockTake.date).toLocaleDateString()}</div>
            <div><span class="info-label">Status:</span> ${stockTake.status}</div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th style="text-align: right;">Available Stock</th>
                <th style="text-align: right;">Physical Count</th>
                <th style="text-align: right;">Calculated Sold</th>
                <th style="text-align: right;">Unit Cost</th>
                <th style="text-align: right;">Total Cost</th>
                <th style="text-align: right;">Unit Price</th>
                <th style="text-align: right;">Total Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          
          <div class="summary">
            <h3>Summary</h3>
            <div class="summary-row"><span>Total Products:</span><span>${stockTake.total_products}</span></div>
            <div class="summary-row"><span>Total Calculated Sold:</span><span>${stockTake.total_calculated_sold}</span></div>
            <div class="summary-row"><span>Total Costs:</span><span>${formatCurrency(stockTake.total_costs)}</span></div>
            <div class="summary-row"><span>Total Price:</span><span>${formatCurrency(stockTake.total_price)}</span></div>
            <div class="summary-row"><span>Potential Earnings:</span><span>${formatCurrency(stockTake.potential_earnings)}</span></div>
            <div class="summary-row"><span>Avg Turnover:</span><span>${stockTake.avg_turnover.toFixed(2)}x</span></div>
          </div>
          
          <div style="margin-top: 20px;">
            <button onclick="window.print()" style="padding: 10px 20px; cursor: pointer;">Print</button>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleDeleteStockTake = async (stockTakeId: string) => {
    if (!confirm("Are you sure you want to delete this stock take record?")) return;

    try {
      const { error } = await supabase
        .from('saved_stock_takes')
        .delete()
        .eq('id', stockTakeId);

      if (error) throw error;
      
      setStockTakes(prev => prev.filter(st => st.id !== stockTakeId));
      toast({
        title: "Success",
        description: "Stock take record deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting stock take:", error);
      toast({
        title: "Error",
        description: "Failed to delete stock take record",
        variant: "destructive"
      });
    }
  };

  // Calculate totals from filtered data
  const totalProducts = filteredStockTakes.reduce((sum, st) => sum + st.total_products, 0);
  const totalCalculatedSold = filteredStockTakes.reduce((sum, st) => sum + st.total_calculated_sold, 0);
  const totalCosts = filteredStockTakes.reduce((sum, st) => sum + st.total_costs, 0);
  const totalPrice = filteredStockTakes.reduce((sum, st) => sum + st.total_price, 0);

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
          <h1 className="text-2xl font-bold">Saved Stock Takes</h1>
          <p className="text-muted-foreground">View and manage saved stock take records</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Records</p>
                <p className="text-2xl font-bold">{filteredStockTakes.length}</p>
              </div>
              <ClipboardCheck className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Products</p>
                <p className="text-2xl font-bold">{totalProducts}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Costs</p>
                <p className="text-2xl font-bold">{formatCurrency(totalCosts)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Price</p>
                <p className="text-2xl font-bold">{formatCurrency(totalPrice)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Date Range */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by stock take number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            
            {/* Date Range Picker */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="px-2 py-1.5 border rounded-md text-sm"
              />
              <span className="text-muted-foreground">to</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="px-2 py-1.5 border rounded-md text-sm"
              />
              {(dateRange.start || dateRange.end) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDateRange({ start: '', end: '' })}
                  className="h-7 px-2"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stock Takes List */}
      {filteredStockTakes.length === 0 ? (
        <div className="text-center py-12">
          <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No stock takes found</h3>
          <p className="text-muted-foreground">Complete a stock take to see records here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredStockTakes.map((stockTake) => (
            <Card key={stockTake.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-primary/10">
                      <ClipboardCheck className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{stockTake.stock_take_number}</h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(stockTake.date).toLocaleDateString()} • {stockTake.total_products} products
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Total Sold</p>
                      <p className="font-bold">{stockTake.total_calculated_sold}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Total Costs</p>
                      <p className="font-bold">{formatCurrency(stockTake.total_costs)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Total Price</p>
                      <p className="font-bold text-green-600">{formatCurrency(stockTake.total_price)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Earnings</p>
                      <p className={`font-bold ${stockTake.potential_earnings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(stockTake.potential_earnings)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewStockTake(stockTake)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteStockTake(stockTake.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
