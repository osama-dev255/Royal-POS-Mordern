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
  verified_by?: string;
  counted_by_date?: string;
  verified_by_date?: string;
  counted_by_timestamp?: string;
  verified_by_timestamp?: string;
  stock_take_timestamp?: string;
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
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const formatTimestamp = (ts?: string) => {
      if (!ts) return '';
      const d = new Date(ts);
      return d.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };
    const formatDate = (d?: string) => {
      if (!d) return '';
      return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };
    const varianceIcon = (v: number) => v < 0 ? '&#9660;' : v > 0 ? '&#9650;' : '&#9644;';
    const varianceLabel = (v: number) => v < 0 ? 'Shortage' : v > 0 ? 'Surplus' : 'Balanced';

    // A4-optimized shared CSS
    const sharedCSS = `
      @page { size: A4; margin: 12mm 15mm; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a202c; font-size: 11px; line-height: 1.4; }
      .container { max-width: 180mm; margin: 0 auto; padding: 0; }
      .header { border-bottom: 2px solid #1a365d; padding-bottom: 10px; margin-bottom: 14px; }
      .header-top { display: flex; justify-content: space-between; align-items: flex-start; }
      .doc-title { font-size: 24px; font-weight: 700; color: #1a365d; letter-spacing: 1px; text-transform: uppercase; }
      .doc-subtitle { font-size: 10px; color: #718096; margin-top: 2px; letter-spacing: 0.5px; }
      .doc-number { font-size: 13px; font-weight: 600; color: #2b6cb0; text-align: right; }
      .doc-date { font-size: 10px; color: #718096; text-align: right; margin-top: 2px; }
      .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 12px; }
      .info-card { background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px 10px; }
      .info-card-label { font-size: 8px; text-transform: uppercase; letter-spacing: 0.8px; color: #a0aec0; font-weight: 600; margin-bottom: 2px; }
      .info-card-value { font-size: 11px; font-weight: 600; color: #2d3748; }
      .items-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 10px; }
      .items-table thead th { background: #1a365d; color: #fff; padding: 5px 8px; text-align: left; font-weight: 600; font-size: 9px; text-transform: uppercase; letter-spacing: 0.4px; }
      .items-table thead th.num { text-align: center; width: 28px; }
      .items-table thead th.right { text-align: right; }
      .items-table tbody td { padding: 4px 8px; border-bottom: 1px solid #e2e8f0; }
      .items-table tbody td.num { text-align: center; color: #a0aec0; font-size: 9px; }
      .items-table tbody td.right { text-align: right; font-variant-numeric: tabular-nums; }
      .items-table tbody tr:nth-child(even) { background: #f7fafc; }
      .godown-header td { background: #ebf4ff !important; font-weight: 700; color: #1a365d; font-size: 10px; padding: 5px 8px; border-bottom: 2px solid #1a365d; text-transform: uppercase; letter-spacing: 0.5px; }
      .variance-neg { color: #e53e3e; font-weight: 600; }
      .variance-pos { color: #38a169; font-weight: 600; }
      .variance-zero { color: #a0aec0; }
      .summary-section { margin-bottom: 12px; }
      .summary-title { font-size: 11px; font-weight: 700; color: #1a365d; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid #e2e8f0; }
      .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
      .summary-card { text-align: center; padding: 8px 4px; border-radius: 4px; border: 1px solid #e2e8f0; background: #fff; }
      .summary-card-value { font-size: 16px; font-weight: 700; color: #1a202c; }
      .summary-card-label { font-size: 8px; text-transform: uppercase; letter-spacing: 0.4px; color: #718096; margin-top: 2px; }
      .variance-status { display: flex; align-items: center; gap: 6px; margin-top: 6px; padding: 5px 10px; border-radius: 4px; font-size: 10px; font-weight: 600; background: #f7fafc; color: #4a5568; border: 1px solid #e2e8f0; }
      .notes-section { margin-bottom: 12px; }
      .notes-box { background: #fff; border: 1px solid #e2e8f0; border-radius: 4px; padding: 8px 12px; min-height: 30px; }
      .notes-box p { font-size: 10px; color: #1a202c; }
      .notes-empty { font-style: italic; color: #a0aec0; }
      .signatures-section { margin-top: 16px; }
      .signatures-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      .sig-block { border: 1px solid #e2e8f0; border-radius: 4px; padding: 10px; background: #f7fafc; }
      .sig-title { font-size: 9px; text-transform: uppercase; letter-spacing: 0.8px; color: #a0aec0; font-weight: 600; margin-bottom: 4px; }
      .sig-line { border-bottom: 1px solid #2d3748; height: 22px; margin-bottom: 4px; }
      .sig-name { font-size: 11px; font-weight: 600; color: #2d3748; }
      .sig-date { font-size: 9px; color: #718096; margin-top: 1px; }
      .footer { margin-top: 16px; padding-top: 8px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 8px; color: #a0aec0; }
      @media print {
        @page { size: A4; margin: 12mm 15mm; }
        body { padding: 0; font-size: 11px; }
        .container { max-width: none; padding: 0; }
        .items-table tbody tr:nth-child(even),
        .items-table thead th,
        .sig-block,
        .godown-header td { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    `;

    if (investment) {
      // INVESTMENT / GODOWN STOCK TAKE
      const totalVariance = stockTake.total_variance ?? 0;

      // Build items HTML - group by godown for batch mode
      let itemsHtml = '';
      if (batch && stockTake.batch_godowns) {
        let globalIdx = 0;
        stockTake.batch_godowns.forEach(g => {
          const godownItems = stockTake.items.filter((item: any) => item.godown_id === g.id || item.godown_name === g.name);
          if (godownItems.length === 0) return;
          const rows = godownItems.map((item: any) => {
            globalIdx++;
            const v = item.variance ?? 0;
            const vClass = v < 0 ? 'variance-neg' : v > 0 ? 'variance-pos' : 'variance-zero';
            return `<tr>
              <td class="num">${globalIdx}</td>
              <td>${item.product_name || item.name || ''}</td>
              <td>${item.zone_name || ''}</td>
              <td class="right">${item.system_qty ?? 0}</td>
              <td class="right">${item.physical_count ?? item.physicalCount ?? 0}</td>
              <td class="right ${vClass}">${v > 0 ? '+' : ''}${v}</td>
            </tr>`;
          }).join('');
          itemsHtml += `<tr class="godown-header"><td colspan="6">&#128230; ${g.name}</td></tr>${rows}`;
        });
      } else {
        itemsHtml = stockTake.items.map((item: any, idx: number) => {
          const v = item.variance ?? 0;
          const vClass = v < 0 ? 'variance-neg' : v > 0 ? 'variance-pos' : 'variance-zero';
          return `<tr>
            <td class="num">${idx + 1}</td>
            <td>${item.product_name || item.name || ''}</td>
            <td>${item.godown_name || stockTake.godown_name || ''}</td>
            <td>${item.zone_name || stockTake.zone_name || ''}</td>
            <td class="right">${item.system_qty ?? 0}</td>
            <td class="right">${item.physical_count ?? item.physicalCount ?? 0}</td>
            <td class="right ${vClass}">${v > 0 ? '+' : ''}${v}</td>
          </tr>`;
        }).join('');
      }

      const title = batch ? 'Batch Physical Stock Take' : 'Physical Stock Take';
      const subtitle = batch ? 'Multi-Godown Inventory Audit & Reconciliation' : 'Inventory Audit & Reconciliation Report';
      const godownList = batch && stockTake.batch_godowns ? stockTake.batch_godowns.map(g => g.name).join(', ') : (stockTake.godown_name || '-');

      printWindow.document.write(`<!DOCTYPE html><html><head><title>${title} - ${stockTake.stock_take_number}</title><style>${sharedCSS}</style></head><body><div class="container">
        <div class="header">
          <div class="header-top">
            <div><div class="doc-title">${title}</div><div class="doc-subtitle">${subtitle}</div></div>
            <div><div class="doc-number">${stockTake.stock_take_number}</div><div class="doc-date">${formatTimestamp(stockTake.stock_take_timestamp) || new Date(stockTake.date).toLocaleDateString()}</div></div>
          </div>
        </div>
        <div class="info-grid">
          ${batch ? `<div class="info-card"><div class="info-card-label">Mode</div><div class="info-card-value">Batch Count</div></div>` : ''}
          <div class="info-card"><div class="info-card-label">${batch ? 'Godowns' : 'Godown'}</div><div class="info-card-value">${godownList}</div></div>
          ${!batch ? `<div class="info-card"><div class="info-card-label">Zone</div><div class="info-card-value">${stockTake.zone_name || '-'}</div></div>` : ''}
          <div class="info-card"><div class="info-card-label">Total Items</div><div class="info-card-value">${stockTake.total_products} Product(s)</div></div>
        </div>
        <table class="items-table">
          <thead><tr>
            <th class="num">#</th><th>Product</th>${batch ? '' : '<th>Godown</th>'}<th>Zone</th>
            <th class="right">System Qty</th><th class="right">Physical Count</th><th class="right">Variance</th>
          </tr></thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <div class="summary-section">
          <div class="summary-title">Summary</div>
          <div class="summary-grid">
            <div class="summary-card"><div class="summary-card-value">${stockTake.total_products}</div><div class="summary-card-label">Products</div></div>
            <div class="summary-card"><div class="summary-card-value">${stockTake.total_system_qty ?? 0}</div><div class="summary-card-label">System Qty</div></div>
            <div class="summary-card"><div class="summary-card-value">${stockTake.total_physical_count ?? 0}</div><div class="summary-card-label">Physical Count</div></div>
            <div class="summary-card"><div class="summary-card-value">${totalVariance > 0 ? '+' : ''}${totalVariance}</div><div class="summary-card-label">Variance</div></div>
          </div>
          <div class="variance-status">${varianceIcon(totalVariance)} Overall Status: ${varianceLabel(totalVariance)} &mdash; ${totalVariance !== 0 ? Math.abs(totalVariance) + ' unit(s) ' + (totalVariance < 0 ? 'short' : 'surplus') : 'All quantities match'}</div>
        </div>
        <div class="notes-section">
          <div class="summary-title">Notes &amp; Observations</div>
          <div class="notes-box">${stockTake.notes ? `<p>${stockTake.notes}</p>` : '<p class="notes-empty">No notes recorded</p>'}</div>
        </div>
        <div class="signatures-section">
          <div class="summary-title">Verification &amp; Approval</div>
          <div class="signatures-grid">
            <div class="sig-block">
              <div class="sig-title">Counted By</div>
              <div class="sig-line"></div>
              <div class="sig-name">${stockTake.counted_by || '________________________'}</div>
              <div class="sig-date">${formatTimestamp(stockTake.counted_by_timestamp) || `Date: ${stockTake.counted_by_date || '________________'}`}</div>
            </div>
            <div class="sig-block">
              <div class="sig-title">Verified By (Manager)</div>
              <div class="sig-line"></div>
              <div class="sig-name">${stockTake.verified_by || '________________________'}</div>
              <div class="sig-date">${formatTimestamp(stockTake.verified_by_timestamp) || `Date: ${stockTake.verified_by_date || '________________'}`}</div>
            </div>
          </div>
        </div>
        <div class="footer">
          <span>Generated: ${today}</span>
          <span>${title} &bull; ${stockTake.stock_take_number}</span>
          <span>Page 1 of 1</span>
        </div>
      </div></body></html>`);
    } else {
      // OUTLET STOCK TAKE (non-investment)
      const itemsHtml = stockTake.items.map((item, idx) => `
        <tr>
          <td class="num">${idx + 1}</td>
          <td>${item.name || ''}</td>
          <td>${item.sku || ''}</td>
          <td class="right">${item.stockRemain ?? 0}</td>
          <td class="right">${item.physicalCount}</td>
          <td class="right">${item.calculatedSold ?? 0}</td>
        </tr>
      `).join('');

      printWindow.document.write(`<!DOCTYPE html><html><head><title>Stock Take - ${stockTake.stock_take_number}</title><style>${sharedCSS}</style></head><body><div class="container">
        <div class="header">
          <div class="header-top">
            <div><div class="doc-title">Stock Take Report</div><div class="doc-subtitle">Outlet Inventory Count</div></div>
            <div><div class="doc-number">${stockTake.stock_take_number}</div><div class="doc-date">${formatTimestamp(stockTake.stock_take_timestamp) || new Date(stockTake.date).toLocaleDateString()}</div></div>
          </div>
        </div>
        <div class="info-grid">
          <div class="info-card"><div class="info-card-label">Status</div><div class="info-card-value">${stockTake.status}</div></div>
          <div class="info-card"><div class="info-card-label">Total Items</div><div class="info-card-value">${stockTake.total_products} Product(s)</div></div>
          <div class="info-card"><div class="info-card-label">Avg Turnover</div><div class="info-card-value">${(stockTake.avg_turnover ?? 0).toFixed(2)}x</div></div>
        </div>
        <table class="items-table">
          <thead><tr>
            <th class="num">#</th><th>Product</th><th>SKU</th>
            <th class="right">Avail. Stock</th><th class="right">Physical Count</th><th class="right">Calc. Sold</th>
          </tr></thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <div class="summary-section">
          <div class="summary-title">Summary</div>
          <div class="summary-grid">
            <div class="summary-card"><div class="summary-card-value">${stockTake.total_products}</div><div class="summary-card-label">Products</div></div>
            <div class="summary-card"><div class="summary-card-value">${stockTake.total_calculated_sold}</div><div class="summary-card-label">Calc. Sold</div></div>
            <div class="summary-card"><div class="summary-card-value">${formatCurrency(stockTake.total_price)}</div><div class="summary-card-label">Total Price</div></div>
            <div class="summary-card"><div class="summary-card-value">${formatCurrency(stockTake.potential_earnings)}</div><div class="summary-card-label">Pot. Earnings</div></div>
          </div>
        </div>
        <div class="notes-section">
          <div class="summary-title">Notes &amp; Observations</div>
          <div class="notes-box">${stockTake.notes ? `<p>${stockTake.notes}</p>` : '<p class="notes-empty">No notes recorded</p>'}</div>
        </div>
        <div class="footer">
          <span>Generated: ${today}</span>
          <span>Stock Take &bull; ${stockTake.stock_take_number}</span>
          <span>Page 1 of 1</span>
        </div>
      </div></body></html>`);
    }

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
                    {selectedStockTake.stock_take_timestamp ? new Date(selectedStockTake.stock_take_timestamp).toLocaleString() : new Date(selectedStockTake.date).toLocaleDateString()} • Status: {selectedStockTake.status}
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
                            {stockTake.stock_take_timestamp ? new Date(stockTake.stock_take_timestamp).toLocaleString() : new Date(stockTake.date).toLocaleDateString()}
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
