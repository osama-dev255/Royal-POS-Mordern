import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardCheck,
  Search,
  Package,
  DollarSign,
  Calendar,
  Eye,
  Trash2,
  Printer,
  Download,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { formatCurrency } from "@/lib/currency";

interface StockTakeItem {
  // Outlet-style fields
  name?: string;
  sku?: string;
  category?: string;
  originalQuantity?: number;
  stockRemain?: number;
  physicalCount?: number;
  physical_count?: number;
  calculatedSold?: number;
  unitCost: number;
  unitPrice?: number;
  totalCost: number;
  totalPrice?: number;
  // Investment-style fields
  product_id?: string;
  product_name?: string;
  godown_id?: string;
  godown_name?: string;
  zone_id?: string;
  zone_name?: string;
  system_qty?: number;
  variance?: number;
}

interface SavedStockTake {
  id: string;
  outlet_id: string | null;
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
  // Investment inventory fields
  godown_id?: string;
  godown_name?: string;
  zone_id?: string;
  zone_name?: string;
  take_type?: string;
  total_system_qty?: number;
  total_physical_count?: number;
  total_variance?: number;
  total_investment_value?: number;
  counted_by?: string;
  batch_godowns?: Array<{id: string; name: string}>;
}

interface SavedStockTakesSectionProps {
  onBack: () => void;
  onLogout: () => void;
  username: string;
}

export const SavedStockTakesSection = ({ onBack, onLogout, username }: SavedStockTakesSectionProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [stockTakes, setStockTakes] = useState<SavedStockTake[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStockTake, setSelectedStockTake] = useState<SavedStockTake | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadStockTakes();
  }, []);

  const loadStockTakes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('saved_stock_takes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStockTakes(data || []);
    } catch (error) {
      console.error("Error loading stock takes:", error);
      toast({
        title: "Error",
        description: "Failed to load saved stock takes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredStockTakes = stockTakes.filter((st) =>
    st.stock_take_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteStockTake = async (stockTakeId: string) => {
    if (!confirm("Are you sure you want to delete this stock take record?")) return;

    try {
      const { error } = await supabase
        .from('saved_stock_takes')
        .delete()
        .eq('id', stockTakeId);

      if (error) throw error;

      setStockTakes((prev) => prev.filter((st) => st.id !== stockTakeId));
      toast({
        title: "Success",
        description: "Stock take record deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting stock take:", error);
      toast({
        title: "Error",
        description: "Failed to delete stock take record",
        variant: "destructive",
      });
    }
  };

  const handleViewStockTake = (stockTake: SavedStockTake) => {
    setSelectedStockTake(stockTake);
  };

  const isInvestmentType = (st: SavedStockTake) => st.take_type === 'investment';
  const isBatchType = (st: SavedStockTake) => st.take_type === 'batch';
  const isGodownStockTake = (st: SavedStockTake) => st.take_type === 'investment' || st.take_type === 'batch';

  const handlePrintStockTake = (stockTake: SavedStockTake) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const investment = isGodownStockTake(stockTake);
    const batch = isBatchType(stockTake);

    const batchGodownsHtml = batch && stockTake.batch_godowns
      ? `<div style="margin-bottom:10px;"><strong>Godowns:</strong> ${stockTake.batch_godowns.map((g: any) => g.name).join(', ')}</div>`
      : '';

    const itemsHtml = stockTake.items.map((item) => {
      if (investment) {
        return `
          <tr>
            <td style="padding:8px;border:1px solid #ddd;">${item.product_name || item.name || ''}</td>
            <td style="padding:8px;border:1px solid #ddd;">${item.godown_name || ''}</td>
            <td style="padding:8px;border:1px solid #ddd;">${item.zone_name || ''}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right;">${item.system_qty ?? 0}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right;">${item.physical_count ?? item.physicalCount ?? 0}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right;color:${(item.variance ?? 0) < 0 ? '#dc2626' : (item.variance ?? 0) > 0 ? '#16a34a' : ''}">${item.variance ?? 0}</td>
          </tr>
        `;
      }
      return `
        <tr>
          <td style="padding:8px;border:1px solid #ddd;">${item.name || ''}</td>
          <td style="padding:8px;border:1px solid #ddd;">${item.sku || ''}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:right;">${item.stockRemain ?? 0}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:right;">${item.physicalCount}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:right;">${item.calculatedSold ?? 0}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:right;">${formatCurrency(item.unitCost)}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:right;">${formatCurrency(item.totalCost)}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:right;">${formatCurrency(item.unitPrice || 0)}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:right;">${formatCurrency(item.totalPrice || 0)}</td>
        </tr>
      `;
    }).join('');

    const headerColumns = investment
      ? '<th>Product</th><th>Godown</th><th>Zone</th><th style="text-align:right;">System Qty</th><th style="text-align:right;">Physical Count</th><th style="text-align:right;">Variance</th>'
      : '<th>Product</th><th>SKU</th><th style="text-align:right;">Available Stock</th><th style="text-align:right;">Physical Count</th><th style="text-align:right;">Calculated Sold</th><th style="text-align:right;">Unit Cost</th><th style="text-align:right;">Total Cost</th><th style="text-align:right;">Unit Price</th><th style="text-align:right;">Total Price</th>';

    const summaryHtml = investment
      ? `
        <div class="summary-row"><span>Total Products:</span><span>${stockTake.total_products}</span></div>
        <div class="summary-row"><span>Total System Qty:</span><span>${stockTake.total_system_qty ?? 0}</span></div>
        <div class="summary-row"><span>Total Physical Count:</span><span>${stockTake.total_physical_count ?? 0}</span></div>
        <div class="summary-row"><span>Total Variance:</span><span style="color:${(stockTake.total_variance ?? 0) < 0 ? '#dc2626' : (stockTake.total_variance ?? 0) > 0 ? '#16a34a' : ''}">${stockTake.total_variance ?? 0}</span></div>
        ${batch ? `<div class="summary-row"><span>Mode:</span><span>Batch (${stockTake.batch_godowns?.length ?? 0} godowns)</span></div>` : ''}
        ${stockTake.godown_name ? `<div class="summary-row"><span>Godown:</span><span>${stockTake.godown_name}</span></div>` : ''}
        ${stockTake.zone_name ? `<div class="summary-row"><span>Zone:</span><span>${stockTake.zone_name}</span></div>` : ''}
      `
      : `
        <div class="summary-row"><span>Total Products:</span><span>${stockTake.total_products}</span></div>
        <div class="summary-row"><span>Total Calculated Sold:</span><span>${stockTake.total_calculated_sold}</span></div>
        <div class="summary-row"><span>Total Costs:</span><span>${formatCurrency(stockTake.total_costs)}</span></div>
        <div class="summary-row"><span>Total Price:</span><span>${formatCurrency(stockTake.total_price)}</span></div>
        <div class="summary-row"><span>Potential Earnings:</span><span>${formatCurrency(stockTake.potential_earnings)}</span></div>
        <div class="summary-row"><span>Avg Turnover:</span><span>${(stockTake.avg_turnover ?? 0).toFixed(2)}x</span></div>
      `;

    const title = batch ? 'Batch Stock Take' : investment ? 'Investment Stock Take' : 'Stock Take Report';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title} - ${stockTake.stock_take_number}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; }
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
        <h1>${title}</h1>
        <p style="color:#666;">${stockTake.stock_take_number}</p>
        ${batchGodownsHtml}
        <div class="info-row">
          <div><span class="info-label">Date:</span> ${new Date(stockTake.date).toLocaleDateString()}</div>
          <div><span class="info-label">Status:</span> ${stockTake.status}</div>
          ${stockTake.counted_by ? `<div><span class="info-label">Counted By:</span> ${stockTake.counted_by}</div>` : ''}
        </div>
        <table>
          <thead><tr>${headerColumns}</tr></thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <div class="summary">
          <h3>Summary</h3>
          ${summaryHtml}
        </div>
        <div style="margin-top:20px;">
          <button onclick="window.print()" style="padding:10px 20px;cursor:pointer;">Print</button>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadStockTake = (stockTake: SavedStockTake) => {
    // Reuse print to generate PDF via browser print dialog
    handlePrintStockTake(stockTake);
  };

  // Summary totals
  const totalProducts = filteredStockTakes.reduce((sum, st) => sum + st.total_products, 0);
  const totalCosts = filteredStockTakes.reduce((sum, st) => sum + st.total_costs, 0);
  const totalPrice = filteredStockTakes.reduce((sum, st) => sum + st.total_price, 0);

  return (
    <div className="min-h-screen bg-background">
      {selectedStockTake ? (
        <div className="container mx-auto p-4 sm:p-6">
          <Button onClick={() => setSelectedStockTake(null)} variant="outline" className="mb-4">
            ← Back to Saved Stock Takes
          </Button>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <ClipboardCheck className="h-6 w-6 text-primary" />
                    {selectedStockTake.stock_take_number}
                  </h2>
                  <p className="text-muted-foreground">
                    {new Date(selectedStockTake.date).toLocaleDateString()} • Status: {selectedStockTake.status}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handlePrintStockTake(selectedStockTake)} variant="outline">
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </Button>
                  <Button onClick={() => handleDownloadStockTake(selectedStockTake)} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
              </div>

              {/* Summary Stats */}
              {isGodownStockTake(selectedStockTake) ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Products</p>
                      <p className="text-xl font-bold">{selectedStockTake.total_products}</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">System Qty</p>
                      <p className="text-xl font-bold">{selectedStockTake.total_system_qty ?? 0}</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Physical Count</p>
                      <p className="text-xl font-bold">{selectedStockTake.total_physical_count ?? 0}</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Variance</p>
                      <p className={`text-xl font-bold ${(selectedStockTake.total_variance ?? 0) < 0 ? 'text-red-600' : (selectedStockTake.total_variance ?? 0) > 0 ? 'text-green-600' : ''}`}>
                        {selectedStockTake.total_variance ?? 0}
                      </p>
                    </div>
                  </div>
                  {isBatchType(selectedStockTake) && selectedStockTake.batch_godowns && (
                    <div className="mb-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm font-semibold text-blue-800 mb-1">Batch Stock Take - {selectedStockTake.batch_godowns.length} Godowns</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedStockTake.batch_godowns.map((g: any) => (
                          <Badge key={g.id} variant="outline" className="text-blue-700 border-blue-300">{g.name}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                    {selectedStockTake.godown_name && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Godown</p>
                        <p className="text-xl font-bold">{selectedStockTake.godown_name}</p>
                      </div>
                    )}
                    {selectedStockTake.zone_name && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Zone</p>
                        <p className="text-xl font-bold">{selectedStockTake.zone_name}</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Products</p>
                    <p className="text-xl font-bold">{selectedStockTake.total_products}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Calculated Sold</p>
                    <p className="text-xl font-bold">{selectedStockTake.total_calculated_sold}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Total Costs</p>
                    <p className="text-xl font-bold">{formatCurrency(selectedStockTake.total_costs)}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Potential Earnings</p>
                    <p className={`text-xl font-bold ${selectedStockTake.potential_earnings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(selectedStockTake.potential_earnings)}
                    </p>
                  </div>
                </div>
              )}

              {/* Items Table */}
              <h3 className="font-semibold text-lg mb-3">{isGodownStockTake(selectedStockTake) ? (isBatchType(selectedStockTake) ? 'Batch Stock Count' : 'Godown Stock Count') : 'Stock Take Items'}</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    {isGodownStockTake(selectedStockTake) ? (
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Godown</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zone</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">System Qty</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Physical Count</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Variance</th>
                      </tr>
                    ) : (
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Available Stock</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Physical Count</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Calculated Sold</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Cost</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Price</th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedStockTake.items.map((item, index) => (
                      isGodownStockTake(selectedStockTake) ? (
                        <tr key={index}>
                          <td className="px-4 py-3 whitespace-nowrap">{item.product_name || item.name || ''}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{item.godown_name || ''}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{item.zone_name || ''}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">{item.system_qty ?? 0}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">{item.physical_count ?? item.physicalCount ?? 0}</td>
                          <td className={`px-4 py-3 whitespace-nowrap text-right ${(item.variance ?? 0) < 0 ? 'text-red-600' : (item.variance ?? 0) > 0 ? 'text-green-600' : ''}`}>{item.variance ?? 0}</td>
                        </tr>
                      ) : (
                        <tr key={index}>
                          <td className="px-4 py-3 whitespace-nowrap">{item.name || ''}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{item.sku || ''}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">{item.stockRemain ?? 0}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">{item.physicalCount}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">{item.calculatedSold ?? 0}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">{formatCurrency(item.unitCost)}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">{formatCurrency(item.totalCost)}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">{formatCurrency(item.unitPrice || 0)}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">{formatCurrency(item.totalPrice || 0)}</td>
                        </tr>
                      )
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedStockTake.notes && (
                <div className="mt-4">
                  <h3 className="font-semibold">Notes</h3>
                  <p className="text-sm text-muted-foreground">{selectedStockTake.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
            <div className="container mx-auto px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={onBack}
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Back
                </button>
                <h1 className="text-xl font-bold">Stock Take Management</h1>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">Welcome, {username}</span>
                <Button variant="outline" size="sm" onClick={onLogout}>
                  Logout
                </Button>
              </div>
            </div>
          </div>

          <main className="container mx-auto p-4 sm:p-6">
            <div className="mb-8 sm:mb-10">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 flex items-center gap-2">
                    <ClipboardCheck className="h-8 w-8 text-primary" />
                    Saved Stock Takes
                  </h2>
                  <p className="text-muted-foreground text-sm sm:text-base md:text-lg">
                    View and manage your saved physical stock take records
                  </p>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by stock take number..."
                      className="pl-10 py-5 text-responsive-base w-64"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Cards */}
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

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <p>Loading saved stock takes...</p>
              </div>
            ) : filteredStockTakes.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardCheck className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Saved Stock Takes</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? "No stock takes match your search." : "You haven't saved any stock takes yet."}
                </p>
                <p className="text-sm text-muted-foreground">
                  Stock takes are saved when you complete a physical stock take from the outlet.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {filteredStockTakes.map((stockTake) => (
                  <Card key={stockTake.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="p-2 rounded-full bg-primary/10 mt-1">
                          <ClipboardCheck className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">{stockTake.stock_take_number}</h3>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(stockTake.date).toLocaleDateString()}
                          </p>
                          <Badge variant={stockTake.status === 'completed' ? 'default' : 'secondary'} className="mt-1 text-xs">
                            {stockTake.status}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                        <div>
                          <span className="text-muted-foreground">Products:</span>
                          <span className="font-medium ml-1">{stockTake.total_products}</span>
                        </div>
                        {isGodownStockTake(stockTake) ? (
                          <>
                            <div>
                              <span className="text-muted-foreground">Variance:</span>
                              <span className={`font-medium ml-1 ${(stockTake.total_variance ?? 0) < 0 ? 'text-red-600' : (stockTake.total_variance ?? 0) > 0 ? 'text-green-600' : ''}`}>{stockTake.total_variance ?? 0}</span>
                            </div>
                            {isBatchType(stockTake) && stockTake.batch_godowns ? (
                              <div className="col-span-2">
                                <span className="text-muted-foreground">Batch:</span>
                                <span className="font-medium ml-1">{stockTake.batch_godowns.length} godowns</span>
                              </div>
                            ) : (
                              stockTake.godown_name && (
                                <div>
                                  <span className="text-muted-foreground">Godown:</span>
                                  <span className="font-medium ml-1">{stockTake.godown_name}</span>
                                </div>
                              )
                            )}
                          </>
                        ) : (
                          <>
                            <div>
                              <span className="text-muted-foreground">Sold:</span>
                              <span className="font-medium ml-1">{stockTake.total_calculated_sold}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Costs:</span>
                              <span className="font-medium ml-1">{formatCurrency(stockTake.total_costs)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Price:</span>
                              <span className="font-medium ml-1 text-green-600">{formatCurrency(stockTake.total_price)}</span>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => handleViewStockTake(stockTake)}>
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handlePrintStockTake(stockTake)}>
                          <Printer className="h-3 w-3" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDeleteStockTake(stockTake.id)} className="text-red-600 hover:text-red-700">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </main>
        </>
      )}
    </div>
  );
};
