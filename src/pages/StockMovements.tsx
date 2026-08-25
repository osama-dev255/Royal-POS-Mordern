import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, ArrowUpDown, ArrowDown, ArrowUp, Package, Filter, RefreshCw, Loader2, Printer, Download, Share2, FileText, ChevronDown } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { getStockMovements, getStockMovementSummary, getMovedProductNames, StockMovementWithDetails, StockMovementSummary } from "@/utils/stockMovementUtils";
import { getOutlets, Outlet } from "@/services/databaseService";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface StockMovementsProps {
  username?: string;
  onBack?: () => void;
  onLogout?: () => void;
}

const movementTypes = [
  { value: "ALL", label: "All Types" },
  { value: "IN", label: "Stock In (GRN)" },
  { value: "OUT", label: "Stock Out (Delivery)" },
  { value: "TRANSFER_IN", label: "Transfer In" },
  { value: "TRANSFER_OUT", label: "Transfer Out" },
  { value: "SOLD", label: "Sold (POS)" },
  { value: "RETURN", label: "Return" },
  { value: "DAMAGE", label: "Damage" }
];

const getMovementBadge = (type: string) => {
  switch (type) {
    case "IN": return { label: "IN", variant: "default" as const, className: "bg-green-100 text-green-800 border-green-200" };
    case "OUT": return { label: "OUT", variant: "destructive" as const, className: "bg-red-100 text-red-800 border-red-200" };
    case "TRANSFER_IN": return { label: "T-IN", variant: "default" as const, className: "bg-blue-100 text-blue-800 border-blue-200" };
    case "TRANSFER_OUT": return { label: "T-OUT", variant: "default" as const, className: "bg-orange-100 text-orange-800 border-orange-200" };
    case "SOLD": return { label: "SOLD", variant: "secondary" as const, className: "bg-purple-100 text-purple-800 border-purple-200" };
    case "ADJUSTMENT": return { label: "ADJ", variant: "outline" as const, className: "bg-yellow-100 text-yellow-800 border-yellow-200" };
    case "RETURN": return { label: "RET", variant: "default" as const, className: "bg-teal-100 text-teal-800 border-teal-200" };
    case "DAMAGE": return { label: "DMG", variant: "destructive" as const, className: "bg-gray-100 text-gray-800 border-gray-200" };
    default: return { label: type, variant: "outline" as const, className: "" };
  }
};

const getReferenceIcon = (refType: string) => {
  switch (refType) {
    case "GRN": return "📦";
    case "DELIVERY_NOTE": return "🚚";
    case "SALE": return "💰";
    case "STOCK_TAKE": return "📋";
    case "TRANSFER": return "🔄";
    case "ADJUSTMENT": return "⚖️";
    case "RETURN": return "↩️";
    default: return "📄";
  }
};

export const StockMovements = ({ username, onBack, onLogout }: StockMovementsProps) => {
  const [movements, setMovements] = useState<StockMovementWithDetails[]>([]);
  const [summaries, setSummaries] = useState<StockMovementSummary[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [productNames, setProductNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"movements" | "summary">("movements");

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [movementTypeFilter, setMovementTypeFilter] = useState("ALL");
  const [outletFilter, setOutletFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [movementData, summaryData, outletData, names] = await Promise.all([
        getStockMovements({ limit: 500 }),
        getStockMovementSummary(),
        getOutlets(),
        getMovedProductNames()
      ]);
      setMovements(movementData);
      setSummaries(summaryData);
      setOutlets(outletData);
      setProductNames(names);
    } catch (error) {
      console.error("Error loading stock movements:", error);
    }
    setLoading(false);
  };

  const filteredMovements = movements.filter(m => {
    if (searchTerm && !m.product_name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !(m.reference_number || '').toLowerCase().includes(searchTerm.toLowerCase()) &&
        !(m.notes || '').toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (movementTypeFilter !== "ALL" && m.movement_type !== movementTypeFilter) return false;
    if (outletFilter !== "ALL" && m.outlet_id !== outletFilter) return false;
    if (dateFrom && m.created_at && m.created_at < dateFrom) return false;
    if (dateTo && m.created_at && m.created_at > `${dateTo}T23:59:59`) return false;
    return true;
  });

  const filteredSummaries = summaries.filter(s => {
    if (searchTerm && !s.product_name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // ── Export Handlers ────────────────────────────────────────────────────────

  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const data = activeTab === "movements" ? filteredMovements : filteredSummaries;
    
    let tableHtml = '';
    if (activeTab === "movements") {
      const rows = (data as StockMovementWithDetails[]).map(m => `
        <tr>
          <td style="padding:8px;border:1px solid #ddd;">${m.created_at ? new Date(m.created_at).toLocaleString() : '-'}</td>
          <td style="padding:8px;border:1px solid #ddd;">${m.product_name}</td>
          <td style="padding:8px;border:1px solid #ddd;">${m.movement_type}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:right;">${m.movement_type.includes('OUT') || m.movement_type === 'SOLD' || m.movement_type === 'DAMAGE' ? '-' : '+'}${Number(m.quantity).toLocaleString()}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:right;">${formatCurrency(Number(m.unit_cost || 0))}</td>
          <td style="padding:8px;border:1px solid #ddd;">${m.reference_number || '-'}</td>
          <td style="padding:8px;border:1px solid #ddd;">${m.outlet_name || '-'}</td>
        </tr>
      `).join('');
      tableHtml = `
        <table>
          <thead>
            <tr>
              <th>Date/Time</th><th>Product</th><th>Type</th><th style="text-align:right;">Qty</th><th style="text-align:right;">Unit Cost</th><th>Reference</th><th>Outlet</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      `;
    } else {
      const rows = (data as StockMovementSummary[]).map(s => `
        <tr>
          <td style="padding:8px;border:1px solid #ddd;">${s.product_name}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:right;color:#16a34a;">${s.total_in > 0 ? '+' + s.total_in : '0'}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:right;color:#dc2626;">${s.total_out > 0 ? '-' + s.total_out : '0'}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:right;color:#9333ea;">${s.total_sold > 0 ? '-' + s.total_sold : '0'}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:right;color:#2563eb;">${s.total_transfer_in > 0 ? '+' + s.total_transfer_in : '0'}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:right;color:#ea580c;">${s.total_transfer_out > 0 ? '-' + s.total_transfer_out : '0'}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:right;font-weight:bold;">${s.net_movement >= 0 ? '+' : ''}${s.net_movement}</td>
        </tr>
      `).join('');
      tableHtml = `
        <table>
          <thead>
            <tr>
              <th>Product</th><th style="text-align:right;">In</th><th style="text-align:right;">Out</th><th style="text-align:right;">Sold</th><th style="text-align:right;">T-In</th><th style="text-align:right;">T-Out</th><th style="text-align:right;">Net</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      `;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Stock Movements Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { text-align: center; color: #333; }
          .summary { display: flex; justify-content: space-around; margin: 20px 0; }
          .summary-box { padding: 10px 20px; border: 1px solid #ddd; border-radius: 5px; text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
          th { background: #3b82f6; color: white; padding: 10px; text-align: left; }
          @media print { body { padding: 0; } .no-print { display: none; } }
        </style>
      </head>
      <body>
        <h1>Stock Movements Report - ${activeTab === "movements" ? 'Movement Ledger' : 'Product Summary'}</h1>
        <div class="summary">
          <div class="summary-box"><strong>Stock In:</strong> ${totalIn}</div>
          <div class="summary-box"><strong>Stock Out:</strong> ${totalOut}</div>
          <div class="summary-box"><strong>Sold:</strong> ${totalSold}</div>
          <div class="summary-box"><strong>Transfer In:</strong> ${totalTransferIn}</div>
          <div class="summary-box"><strong>Transfer Out:</strong> ${totalTransferOut}</div>
        </div>
        ${tableHtml}
        <div style="margin-top:20px;text-align:center;" class="no-print">
          <button onclick="window.print()" style="padding:10px 20px;background:#3b82f6;color:white;border:none;border-radius:5px;cursor:pointer;">Print</button>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Stock Movements Report', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
    doc.text(`Stock In: ${totalIn} | Out: ${totalOut} | Sold: ${totalSold}`, 14, 34);

    if (activeTab === "movements") {
      const tableData = filteredMovements.map(m => [
        m.created_at ? new Date(m.created_at).toLocaleString() : '-',
        m.product_name,
        m.movement_type,
        `${m.movement_type.includes('OUT') || m.movement_type === 'SOLD' || m.movement_type === 'DAMAGE' ? '-' : '+'}${Number(m.quantity)}`,
        formatCurrency(Number(m.unit_cost || 0)),
        m.reference_number || '-',
        m.outlet_name || '-',
      ]);

      autoTable(doc, {
        startY: 42,
        head: [['Date/Time', 'Product', 'Type', 'Qty', 'Unit Cost', 'Reference', 'Outlet']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 8 },
      });
    } else {
      const tableData = filteredSummaries.map(s => [
        s.product_name,
        s.total_in > 0 ? `+${s.total_in}` : '0',
        s.total_out > 0 ? `-${s.total_out}` : '0',
        s.total_sold > 0 ? `-${s.total_sold}` : '0',
        s.total_transfer_in > 0 ? `+${s.total_transfer_in}` : '0',
        s.total_transfer_out > 0 ? `-${s.total_transfer_out}` : '0',
        `${s.net_movement >= 0 ? '+' : ''}${s.net_movement}`,
      ]);

      autoTable(doc, {
        startY: 42,
        head: [['Product', 'In', 'Out', 'Sold', 'T-In', 'T-Out', 'Net']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 8 },
      });
    }

    doc.save(`Stock_Movements_${activeTab}_${new Date().toISOString().split('T')[0]}.pdf`);
    toast({ title: "Download Started", description: "Downloading stock movements as PDF" });
  };

  const handleExportXLS = () => {
    let csvContent = '';
    
    if (activeTab === "movements") {
      csvContent = "Date/Time,Product,Type,Qty,Unit Cost,Reference,Outlet,Godown,Zone,Notes\n";
      filteredMovements.forEach(m => {
        csvContent += `"${m.created_at ? new Date(m.created_at).toLocaleString() : '-'}","${m.product_name}","${m.movement_type}",${m.movement_type.includes('OUT') || m.movement_type === 'SOLD' || m.movement_type === 'DAMAGE' ? '-' : '+'}${Number(m.quantity)},${Number(m.unit_cost || 0)},"${m.reference_number || '-'}","${m.outlet_name || '-'}","${m.godown_name || '-'}","${m.zone_name || '-'}","${(m.notes || '').replace(/"/g, '""')}"\n`;
      });
    } else {
      csvContent = "Product,In,Out,Sold,T-In,T-Out,Net\n";
      filteredSummaries.forEach(s => {
        csvContent += `"${s.product_name}",${s.total_in},${s.total_out},${s.total_sold},${s.total_transfer_in},${s.total_transfer_out},${s.net_movement}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Stock_Movements_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: "Export Started", description: "Exporting stock movements as CSV" });
  };

  const handleSharePDF = async () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text('Stock Movements Report', 14, 20);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

      if (activeTab === "movements") {
        const tableData = filteredMovements.map(m => [
          m.created_at ? new Date(m.created_at).toLocaleString() : '-',
          m.product_name,
          m.movement_type,
          `${m.movement_type.includes('OUT') || m.movement_type === 'SOLD' || m.movement_type === 'DAMAGE' ? '-' : '+'}${Number(m.quantity)}`,
          formatCurrency(Number(m.unit_cost || 0)),
          m.reference_number || '-',
          m.outlet_name || '-',
        ]);

        autoTable(doc, {
          startY: 36,
          head: [['Date/Time', 'Product', 'Type', 'Qty', 'Unit Cost', 'Reference', 'Outlet']],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [59, 130, 246] },
          styles: { fontSize: 8 },
        });
      } else {
        const tableData = filteredSummaries.map(s => [
          s.product_name,
          s.total_in > 0 ? `+${s.total_in}` : '0',
          s.total_out > 0 ? `-${s.total_out}` : '0',
          s.total_sold > 0 ? `-${s.total_sold}` : '0',
          s.net_movement >= 0 ? `+${s.net_movement}` : `${s.net_movement}`,
        ]);

        autoTable(doc, {
          startY: 36,
          head: [['Product', 'In', 'Out', 'Sold', 'Net']],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [59, 130, 246] },
          styles: { fontSize: 8 },
        });
      }

      const pdfBlob = doc.output('blob');
      const file = new File([pdfBlob], `Stock_Movements_${activeTab}.pdf`, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Stock Movements Report',
          text: `Stock Movements Report - ${activeTab === "movements" ? 'Movement Ledger' : 'Product Summary'}`
        });
        toast({ title: "Shared Successfully", description: "Stock movements report has been shared" });
      } else {
        doc.save(`Stock_Movements_${activeTab}_${new Date().toISOString().split('T')[0]}.pdf`);
        toast({ title: "Downloaded", description: "Sharing not supported. PDF downloaded instead." });
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Share error:', error);
        toast({ title: "Error", description: "Failed to share report", variant: "destructive" });
      }
    }
  };

  const totalIn = filteredMovements.filter(m => m.movement_type === 'IN').reduce((sum, m) => sum + Number(m.quantity), 0);
  const totalOut = filteredMovements.filter(m => m.movement_type === 'OUT').reduce((sum, m) => sum + Number(m.quantity), 0);
  const totalSold = filteredMovements.filter(m => m.movement_type === 'SOLD').reduce((sum, m) => sum + Number(m.quantity), 0);
  const totalTransferIn = filteredMovements.filter(m => m.movement_type === 'TRANSFER_IN').reduce((sum, m) => sum + Number(m.quantity), 0);
  const totalTransferOut = filteredMovements.filter(m => m.movement_type === 'TRANSFER_OUT').reduce((sum, m) => sum + Number(m.quantity), 0);

  return (
    <div className="min-h-screen bg-background">
      <Navigation title="Stock Movements" onBack={onBack} onLogout={onLogout} username={username} />
      <main className="container mx-auto p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4 text-center">
              <ArrowDown className="h-5 w-5 text-green-600 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Stock In</p>
              <p className="text-lg font-bold text-green-700">{totalIn}</p>
            </CardContent>
          </Card>
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4 text-center">
              <ArrowUp className="h-5 w-5 text-red-600 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Stock Out</p>
              <p className="text-lg font-bold text-red-700">{totalOut}</p>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-4 text-center">
              <Package className="h-5 w-5 text-purple-600 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Sold</p>
              <p className="text-lg font-bold text-purple-700">{totalSold}</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4 text-center">
              <ArrowDown className="h-5 w-5 text-blue-600 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Transfer In</p>
              <p className="text-lg font-bold text-blue-700">{totalTransferIn}</p>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-4 text-center">
              <ArrowUp className="h-5 w-5 text-orange-600 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Transfer Out</p>
              <p className="text-lg font-bold text-orange-700">{totalTransferOut}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <Label className="text-xs">Search</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Product name, reference #, notes..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="w-[180px]">
                <Label className="text-xs">Movement Type</Label>
                <Select value={movementTypeFilter} onValueChange={setMovementTypeFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {movementTypes.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-[180px]">
                <Label className="text-xs">Outlet</Label>
                <Select value={outletFilter} onValueChange={setOutletFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Outlets</SelectItem>
                    {outlets.map(o => (
                      <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-[150px]">
                <Label className="text-xs">From</Label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div className="w-[150px]">
                <Label className="text-xs">To</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
              <Button variant="outline" size="sm" onClick={loadData}>
                <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="flex gap-2 items-center">
          <Button
            variant={activeTab === "movements" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("movements")}
          >
            <ArrowUpDown className="h-4 w-4 mr-1" />
            Movement Log ({filteredMovements.length})
          </Button>
          <Button
            variant={activeTab === "summary" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("summary")}
          >
            <Filter className="h-4 w-4 mr-1" />
            Product Summary ({filteredSummaries.length})
          </Button>

          {/* Actions Dropdown */}
          <div className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <FileText className="h-4 w-4 mr-2" />
                  Actions
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handlePrintReport}>
                  <Printer className="h-4 w-4 mr-2" />
                  <span>Print</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadPDF}>
                  <Download className="h-4 w-4 mr-2" />
                  <span>Download .pdf</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportXLS}>
                  <FileText className="h-4 w-4 mr-2" />
                  <span>Export .xls</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSharePDF}>
                  <Share2 className="h-4 w-4 mr-2" />
                  <span>Share</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Movement Log Tab */}
        {activeTab === "movements" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Movement Ledger</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Date/Time</TableHead>
                        <TableHead className="text-xs">Product</TableHead>
                        <TableHead className="text-xs">Type</TableHead>
                        <TableHead className="text-xs text-right">Qty</TableHead>
                        <TableHead className="text-xs text-right">Unit Cost</TableHead>
                        <TableHead className="text-xs">Reference</TableHead>
                        <TableHead className="text-xs">Outlet</TableHead>
                        <TableHead className="text-xs">Godown</TableHead>
                        <TableHead className="text-xs">Zone</TableHead>
                        <TableHead className="text-xs">Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMovements.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                            No stock movements found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredMovements.map(movement => {
                          const badge = getMovementBadge(movement.movement_type);
                          return (
                            <TableRow key={movement.id}>
                              <TableCell className="text-xs whitespace-nowrap">
                                {movement.created_at ? new Date(movement.created_at).toLocaleString() : '-'}
                              </TableCell>
                              <TableCell className="text-xs font-medium">{movement.product_name}</TableCell>
                              <TableCell>
                                <Badge variant={badge.variant} className={`text-[10px] ${badge.className}`}>
                                  {badge.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-right font-mono">
                                {movement.movement_type.includes('OUT') || movement.movement_type === 'SOLD' || movement.movement_type === 'DAMAGE' ? '-' : '+'}
                                {Number(movement.quantity).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-xs text-right font-mono">
                                {formatCurrency(Number(movement.unit_cost || 0))}
                              </TableCell>
                              <TableCell className="text-xs">
                                <span className="mr-1">{getReferenceIcon(movement.reference_type || '')}</span>
                                <span className="font-mono text-[10px]">{movement.reference_number || '-'}</span>
                              </TableCell>
                              <TableCell className="text-xs">{movement.outlet_name || '-'}</TableCell>
                              <TableCell className="text-xs">{movement.godown_name || '-'}</TableCell>
                              <TableCell className="text-xs">{movement.zone_name || '-'}</TableCell>
                              <TableCell className="text-xs max-w-[150px] truncate" title={movement.notes || ''}>
                                {movement.notes || '-'}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Product Summary Tab */}
        {activeTab === "summary" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Product Movement Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Product</TableHead>
                        <TableHead className="text-xs text-right text-green-600">In</TableHead>
                        <TableHead className="text-xs text-right text-red-600">Out</TableHead>
                        <TableHead className="text-xs text-right text-purple-600">Sold</TableHead>
                        <TableHead className="text-xs text-right text-blue-600">T-In</TableHead>
                        <TableHead className="text-xs text-right text-orange-600">T-Out</TableHead>
                        <TableHead className="text-xs text-right font-bold">Net</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSummaries.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            No movement data found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredSummaries.map(summary => (
                          <TableRow key={summary.product_name}>
                            <TableCell className="text-xs font-medium">{summary.product_name}</TableCell>
                            <TableCell className="text-xs text-right font-mono text-green-600">
                              {summary.total_in > 0 ? `+${summary.total_in}` : '0'}
                            </TableCell>
                            <TableCell className="text-xs text-right font-mono text-red-600">
                              {summary.total_out > 0 ? `-${summary.total_out}` : '0'}
                            </TableCell>
                            <TableCell className="text-xs text-right font-mono text-purple-600">
                              {summary.total_sold > 0 ? `-${summary.total_sold}` : '0'}
                            </TableCell>
                            <TableCell className="text-xs text-right font-mono text-blue-600">
                              {summary.total_transfer_in > 0 ? `+${summary.total_transfer_in}` : '0'}
                            </TableCell>
                            <TableCell className="text-xs text-right font-mono text-orange-600">
                              {summary.total_transfer_out > 0 ? `-${summary.total_transfer_out}` : '0'}
                            </TableCell>
                            <TableCell className={`text-xs text-right font-mono font-bold ${summary.net_movement >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                              {summary.net_movement >= 0 ? '+' : ''}{summary.net_movement}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};
