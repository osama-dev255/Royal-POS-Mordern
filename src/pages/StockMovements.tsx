import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Search, ArrowUpDown, ArrowDown, ArrowUp, Package, Filter, RefreshCw, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { getStockMovements, getStockMovementSummary, getMovedProductNames, StockMovementWithDetails, StockMovementSummary } from "@/utils/stockMovementUtils";
import { getOutlets, Outlet } from "@/services/databaseService";

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
  { value: "ADJUSTMENT", label: "Adjustment (Stock Take)" },
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

  const totalIn = filteredMovements.filter(m => m.movement_type === 'IN').reduce((sum, m) => sum + Number(m.quantity), 0);
  const totalOut = filteredMovements.filter(m => m.movement_type === 'OUT').reduce((sum, m) => sum + Number(m.quantity), 0);
  const totalSold = filteredMovements.filter(m => m.movement_type === 'SOLD').reduce((sum, m) => sum + Number(m.quantity), 0);
  const totalTransferIn = filteredMovements.filter(m => m.movement_type === 'TRANSFER_IN').reduce((sum, m) => sum + Number(m.quantity), 0);
  const totalTransferOut = filteredMovements.filter(m => m.movement_type === 'TRANSFER_OUT').reduce((sum, m) => sum + Number(m.quantity), 0);
  const totalAdjustment = filteredMovements.filter(m => m.movement_type === 'ADJUSTMENT').reduce((sum, m) => sum + Number(m.quantity), 0);

  return (
    <div className="min-h-screen bg-background">
      <Navigation title="Stock Movements" onBack={onBack} onLogout={onLogout} username={username} />
      <main className="container mx-auto p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-4 text-center">
              <ArrowUpDown className="h-5 w-5 text-yellow-600 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Adjustments</p>
              <p className="text-lg font-bold text-yellow-700">{totalAdjustment}</p>
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
        <div className="flex gap-2">
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
                        <TableHead className="text-xs">Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMovements.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
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
                        <TableHead className="text-xs text-right text-yellow-600">Adj.</TableHead>
                        <TableHead className="text-xs text-right font-bold">Net</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSummaries.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
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
                            <TableCell className="text-xs text-right font-mono text-yellow-600">
                              {summary.total_adjustment !== 0 ? summary.total_adjustment : '0'}
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
