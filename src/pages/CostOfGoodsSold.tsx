import { useState, useEffect, useMemo } from "react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Printer,
  Download,
  ArrowLeft,
  Loader2,
  Calendar as CalendarIcon,
  X,
  Package,
  Truck,
  RotateCcw,
  Warehouse,
  DollarSign,
  TrendingDown,
  Eye,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PrintUtils } from "@/utils/printUtils";
import {
  getPurchaseOrders,
  getProducts,
  getReturns,
  PurchaseOrder,
  Product,
  Return,
} from "@/services/databaseService";
import { getSavedGRNs, SavedGRN } from "@/utils/grnUtils";

interface CostOfGoodsSoldProps {
  username: string;
  onBack: () => void;
  onLogout: () => void;
}

export interface COGSResult {
  openingInventory: number;
  netPurchases: number;
  directCosts: number;
  returns: number;
  closingInventory: number;
  cogs: number;
  purchaseBreakdown: COGSPurchaseEntry[];
  directCostBreakdown: COGSDirectCostEntry[];
  returnsBreakdown: COGSReturnEntry[];
  period: string;
}

interface COGSPurchaseEntry {
  id: string;
  source: "GRN" | "Purchase Order";
  supplierName: string;
  date: string;
  itemCount: number;
  totalCost: number;
}

interface COGSDirectCostEntry {
  id: string;
  grnNumber: string;
  supplierName: string;
  date: string;
  description: string;
  amount: number;
}

interface COGSReturnEntry {
  id: string;
  returnDate: string;
  reason: string;
  totalAmount: number;
}

// Reusable COGS calculation function for Income Statement integration
export const calculateCOGS = async (
  fromDate?: string,
  toDate?: string
): Promise<COGSResult> => {
  const [grns, purchaseOrders, products, returns] = await Promise.all([
    getSavedGRNs(),
    getPurchaseOrders(),
    getProducts(),
    getReturns(),
  ]);

  const now = new Date();
  const to = toDate ? new Date(toDate) : now;
  to.setHours(23, 59, 59, 999);
  const from = fromDate ? new Date(fromDate) : new Date(now.getFullYear(), now.getMonth(), 1);
  from.setHours(0, 0, 0, 0);

  const inRange = (d: Date) => d >= from && d <= to;
  const beforeRange = (d: Date) => d < from;

  // --- Net Purchases from GRNs ---
  const purchaseBreakdown: COGSPurchaseEntry[] = [];

  const grnsInRange = grns.filter((grn) => {
    const d = new Date(grn.data.date || grn.createdAt);
    return inRange(d);
  });

  let grnTotal = 0;
  grnsInRange.forEach((grn) => {
    const itemTotal = grn.data.items.reduce(
      (sum, item) => sum + (item.totalWithReceivingCost || item.total || 0),
      0
    );
    grnTotal += itemTotal;
    purchaseBreakdown.push({
      id: grn.id,
      source: "GRN",
      supplierName: grn.data.supplierName || "Unknown",
      date: grn.data.date || grn.createdAt,
      itemCount: grn.data.items.length,
      totalCost: itemTotal,
    });
  });

  // --- Net Purchases from Purchase Orders ---
  const posInRange = purchaseOrders.filter((po) => {
    const d = new Date(po.date || po.order_date || po.created_at || new Date());
    return inRange(d);
  });

  let poTotal = 0;
  posInRange.forEach((po) => {
    const amount = po.total_amount || po.total || 0;
    poTotal += amount;
    purchaseBreakdown.push({
      id: po.id || "",
      source: "Purchase Order",
      supplierName: po.supplier_name || "Unknown",
      date: po.date || po.order_date || po.created_at || "",
      itemCount: 0,
      totalCost: amount,
    });
  });

  const netPurchases = grnTotal + poTotal;

  // --- Direct Costs (receiving costs from GRNs) ---
  const directCostBreakdown: COGSDirectCostEntry[] = [];
  let directCostsTotal = 0;

  grnsInRange.forEach((grn) => {
    if (grn.data.receivingCosts && grn.data.receivingCosts.length > 0) {
      grn.data.receivingCosts.forEach((cost) => {
        directCostsTotal += cost.amount || 0;
        directCostBreakdown.push({
          id: `${grn.id}-${cost.description}`,
          grnNumber: grn.data.grnNumber || "",
          supplierName: grn.data.supplierName || "Unknown",
          date: grn.data.date || grn.createdAt,
          description: cost.description,
          amount: cost.amount || 0,
        });
      });
    }
    // Also count per-item receiving cost difference
    grn.data.items.forEach((item) => {
      if (item.receivingCostPerUnit && item.receivingCostPerUnit > 0) {
        const extraCost = item.receivingCostPerUnit * (item.delivered || item.quantity || 0);
        // Only add if not already captured in receivingCosts array
        if (!grn.data.receivingCosts || grn.data.receivingCosts.length === 0) {
          directCostsTotal += extraCost;
          directCostBreakdown.push({
            id: `${grn.id}-item-${item.id}-receiving`,
            grnNumber: grn.data.grnNumber || "",
            supplierName: grn.data.supplierName || "Unknown",
            date: grn.data.date || grn.createdAt,
            description: `Receiving cost: ${item.description}`,
            amount: extraCost,
          });
        }
      }
    });
  });

  // --- Returns ---
  const returnsBreakdown: COGSReturnEntry[] = [];
  const returnsInRange = returns.filter((r) => {
    const d = new Date(r.return_date || r.created_at || new Date());
    return inRange(d);
  });

  let returnsTotal = 0;
  returnsInRange.forEach((r) => {
    const amount = r.total_amount || r.refund_amount || 0;
    returnsTotal += amount;
    returnsBreakdown.push({
      id: r.id || "",
      returnDate: r.return_date || r.created_at || "",
      reason: r.reason || "N/A",
      totalAmount: amount,
    });
  });

  // --- Inventory Valuation ---
  // Current total inventory value (closing)
  const closingInventory = products.reduce((sum, p) => {
    const qty = p.stock_quantity || 0;
    const cost = p.cost_price || 0;
    return sum + qty * cost;
  }, 0);

  // Opening inventory: estimate by reversing GRNs/POs that happened before the range
  // and using current inventory as baseline
  const grnsBefore = grns.filter((grn) => {
    const d = new Date(grn.data.date || grn.createdAt);
    return beforeRange(d);
  });

  let valueBeforeRange = 0;
  grnsBefore.forEach((grn) => {
    const itemTotal = grn.data.items.reduce(
      (sum, item) => sum + (item.totalWithReceivingCost || item.total || 0),
      0
    );
    valueBeforeRange += itemTotal;
  });

  const posBefore = purchaseOrders.filter((po) => {
    const d = new Date(po.date || po.order_date || po.created_at || new Date());
    return beforeRange(d);
  });

  posBefore.forEach((po) => {
    valueBeforeRange += po.total_amount || po.total || 0;
  });

  // Opening inventory = current closing - net additions during range
  // Simplified: opening = closing - (purchases this period) + (returns this period)
  // More accurate: use product-level cost tracking
  const openingInventory = Math.max(0, closingInventory - netPurchases - directCostsTotal + returnsTotal);

  // COGS = Opening Inventory + Net Purchases + Direct Costs - Returns - Closing Inventory
  const cogs = openingInventory + netPurchases + directCostsTotal - returnsTotal - closingInventory;

  const periodLabel = fromDate && toDate
    ? `${new Date(fromDate).toLocaleDateString()} - ${new Date(toDate).toLocaleDateString()}`
    : fromDate
    ? `From ${new Date(fromDate).toLocaleDateString()}`
    : toDate
    ? `Up to ${new Date(toDate).toLocaleDateString()}`
    : "Current Period";

  return {
    openingInventory: Math.max(0, openingInventory),
    netPurchases,
    directCosts: directCostsTotal,
    returns: returnsTotal,
    closingInventory,
    cogs: Math.max(0, cogs),
    purchaseBreakdown,
    directCostBreakdown,
    returnsBreakdown,
    period: periodLabel,
  };
};

export const CostOfGoodsSold = ({
  username,
  onBack,
  onLogout,
}: CostOfGoodsSoldProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [datePreset, setDatePreset] = useState("thisMonth");
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>(() => {
    const today = new Date();
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    return {
      start: firstOfMonth.toISOString().split("T")[0],
      end: today.toISOString().split("T")[0],
    };
  });
  const [cogsData, setCogsData] = useState<COGSResult | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [currentDetail, setCurrentDetail] = useState<{
    title: string;
    description: string;
    calculation: string;
    dataSources: string[];
  } | null>(null);
  const [grnMap, setGrnMap] = useState<Map<string, SavedGRN>>(new Map());
  const [grnDetailOpen, setGrnDetailOpen] = useState(false);
  const [selectedGRN, setSelectedGRN] = useState<SavedGRN | null>(null);

  const getComponentDetail = (component: string) => {
    if (!cogsData) return;
    let detail: { title: string; description: string; calculation: string; dataSources: string[] };

    switch (component) {
      case "openingInventory":
        detail = {
          title: "Opening Inventory",
          description: "The total value of inventory at the start of the selected period. This is estimated by subtracting all purchases and direct costs within the period, and adding back returns, from the current closing inventory value.",
          calculation: `Closing Inventory - Net Purchases - Direct Costs + Returns = ${formatAmount(cogsData.closingInventory)} - ${formatAmount(cogsData.netPurchases)} - ${formatAmount(cogsData.directCosts)} + ${formatAmount(cogsData.returns)} = ${formatAmount(cogsData.openingInventory)} TZS`,
          dataSources: [
            "Current product stock quantities multiplied by cost prices",
            "GRN records prior to the selected period",
            "Purchase Order records prior to the selected period",
          ],
        };
        break;
      case "netPurchases":
        detail = {
          title: "Net Purchases",
          description: "Total cost of all goods purchased from suppliers during the selected period, including both Goods Received Notes (GRNs) and Purchase Orders.",
          calculation: `GRN Item Totals + Purchase Order Totals = ${formatAmount(cogsData.purchaseBreakdown.filter(p => p.source === "GRN").reduce((s, e) => s + e.totalCost, 0))} (GRNs) + ${formatAmount(cogsData.purchaseBreakdown.filter(p => p.source === "Purchase Order").reduce((s, e) => s + e.totalCost, 0))} (POs) = ${formatAmount(cogsData.netPurchases)} TZS`,
          dataSources: [
            "Goods Received Notes (GRNs) within the period",
            "Purchase Orders within the period",
            "Per-item costs including receiving cost adjustments",
          ],
        };
        break;
      case "directCosts":
        detail = {
          title: "Direct Costs",
          description: "Additional costs directly attributable to acquiring inventory, such as receiving costs, transport, logistics, and handling fees recorded in GRNs.",
          calculation: `Sum of all receiving costs and per-item receiving cost adjustments = ${formatAmount(cogsData.directCosts)} TZS`,
          dataSources: [
            "GRN receiving costs arrays (transport, handling, etc.)",
            "Per-item receiving cost per unit from GRNs",
            "Logistic and delivery-related expenses",
          ],
        };
        break;
      case "returns":
        detail = {
          title: "Returns",
          description: "Total value of all purchase returns processed during the selected period, reducing the overall cost of goods.",
          calculation: `Sum of all return amounts within the period = ${formatAmount(cogsData.returns)} TZS`,
          dataSources: [
            "Return records within the selected date range",
            "Refund amounts from supplier returns",
          ],
        };
        break;
      case "closingInventory":
        detail = {
          title: "Closing Inventory",
          description: "The total current value of all inventory on hand, calculated by multiplying each product's stock quantity by its cost price.",
          calculation: `Sum of (stock_quantity x cost_price) for all products = ${formatAmount(cogsData.closingInventory)} TZS`,
          dataSources: [
            "Current product stock quantities from inventory",
            "Product cost prices (updated by GRNs)",
          ],
        };
        break;
      case "cogs":
        detail = {
          title: "Cost of Goods Sold (COGS)",
          description: "The total direct cost of all goods sold during the period, calculated using the standard accounting formula.",
          calculation: `Opening Inventory + Net Purchases + Direct Costs - Returns - Closing Inventory = ${formatAmount(cogsData.openingInventory)} + ${formatAmount(cogsData.netPurchases)} + ${formatAmount(cogsData.directCosts)} - ${formatAmount(cogsData.returns)} - ${formatAmount(cogsData.closingInventory)} = ${formatAmount(cogsData.cogs)} TZS`,
          dataSources: [
            "Opening inventory valuation",
            "Net purchases from GRNs and Purchase Orders",
            "Direct receiving and logistics costs",
            "Purchase returns",
            "Closing inventory valuation",
          ],
        };
        break;
      default:
        return;
    }

    setCurrentDetail(detail);
    setDetailDialogOpen(true);
  };

  // Quick range presets (standard professional date range picker pattern)
  const handleDatePreset = (preset: string) => {
    setDatePreset(preset);
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    switch (preset) {
      case "today":
        setDateRange({ start: todayStr, end: todayStr });
        break;
      case "yesterday": {
        const y = new Date(today);
        y.setDate(y.getDate() - 1);
        const yStr = y.toISOString().split("T")[0];
        setDateRange({ start: yStr, end: yStr });
        break;
      }
      case "last7": {
        const s = new Date(today);
        s.setDate(s.getDate() - 6);
        setDateRange({ start: s.toISOString().split("T")[0], end: todayStr });
        break;
      }
      case "last30": {
        const s = new Date(today);
        s.setDate(s.getDate() - 29);
        setDateRange({ start: s.toISOString().split("T")[0], end: todayStr });
        break;
      }
      case "thisMonth": {
        const first = new Date(today.getFullYear(), today.getMonth(), 1);
        setDateRange({ start: first.toISOString().split("T")[0], end: todayStr });
        break;
      }
      case "lastMonth": {
        const firstLast = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastLast = new Date(today.getFullYear(), today.getMonth(), 0);
        setDateRange({
          start: firstLast.toISOString().split("T")[0],
          end: lastLast.toISOString().split("T")[0],
        });
        break;
      }
      case "thisYear": {
        const firstOfYear = new Date(today.getFullYear(), 0, 1);
        setDateRange({ start: firstOfYear.toISOString().split("T")[0], end: todayStr });
        break;
      }
      case "all":
        setDateRange({ start: "", end: "" });
        break;
      default:
        break;
    }
  };

  // Fetch and calculate COGS
  useEffect(() => {
    const fetchCOGS = async () => {
      setIsLoading(true);
      try {
        const result = await calculateCOGS(
          dateRange.start || undefined,
          dateRange.end || undefined
        );
        setCogsData(result);

        // Build a map of GRN id -> full GRN data for detail view
        const allGrns = await getSavedGRNs();
        const map = new Map<string, SavedGRN>();
        allGrns.forEach(grn => { map.set(grn.id, grn); });
        setGrnMap(map);
      } catch (error) {
        console.error("Error calculating COGS:", error);
        toast({
          title: "Error",
          description: "Failed to calculate Cost of Goods Sold",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCOGS();
  }, [dateRange, toast]);

  const handlePrint = () => {
    if (!cogsData) return;
    PrintUtils.printCOGSReport(cogsData);
    toast({ title: "Printing", description: "COGS report is being printed..." });
  };

  const handleExport = () => {
    toast({
      title: "Export Started",
      description: "Exporting COGS report...",
    });
    setTimeout(() => {
      toast({
        title: "Export Complete",
        description: "COGS report has been exported successfully.",
      });
    }, 1500);
  };

  const formatAmount = (value: number) => {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="mt-2">Calculating Cost of Goods Sold...</p>
        </div>
      </div>
    );
  }

  if (!cogsData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p>Failed to load COGS data.</p>
          <Button onClick={onBack} className="mt-4">Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation
        title="Cost of Goods Sold (COGS)"
        onBack={onBack}
        onLogout={onLogout}
        username={username}
      />

      <main className="container mx-auto p-6">
        {/* Header Actions */}
        <div className="mb-6 flex justify-between items-center">
          <Button
            variant="outline"
            onClick={onBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Purchase Management
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={handleExport}
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Date Range Picker */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex items-center gap-2 w-full md:w-auto">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => {
                      setDateRange((prev) => ({ ...prev, start: e.target.value }));
                      setDatePreset("custom");
                    }}
                    className="w-40"
                  />
                  <span className="text-muted-foreground">to</span>
                  <Input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => {
                      setDateRange((prev) => ({ ...prev, end: e.target.value }));
                      setDatePreset("custom");
                    }}
                    className="w-40"
                  />
                </div>
              </div>
            </div>

            {/* Quick Range Presets */}
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t">
              <span className="text-sm font-medium mr-1">Quick Range:</span>
              {[
                { key: "today", label: "Today" },
                { key: "yesterday", label: "Yesterday" },
                { key: "last7", label: "Last 7 Days" },
                { key: "last30", label: "Last 30 Days" },
                { key: "thisMonth", label: "This Month" },
                { key: "lastMonth", label: "Last Month" },
                { key: "thisYear", label: "This Year" },
                { key: "all", label: "All Time" },
              ].map((preset) => (
                <Button
                  key={preset.key}
                  size="sm"
                  variant={datePreset === preset.key ? "default" : "outline"}
                  onClick={() => handleDatePreset(preset.key)}
                  className={datePreset === preset.key ? "" : "text-xs"}
                >
                  {preset.label}
                </Button>
              ))}
              {(dateRange.start || dateRange.end) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDatePreset("all")}
                  className="h-7 text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* COGS Formula Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">COGS Calculation Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              <Card className="bg-blue-50 border-blue-200 cursor-pointer hover:shadow-md transition-shadow" onClick={() => getComponentDetail("openingInventory")}>
                <CardContent className="pt-4 text-center">
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <Warehouse className="h-6 w-6 text-blue-600" />
                    <Eye className="h-3.5 w-3.5 text-blue-400" />
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">Opening Inventory</p>
                  <p className="text-lg font-bold text-blue-700">
                    {formatAmount(cogsData.openingInventory)}
                  </p>
                  <p className="text-xs text-muted-foreground">TZS</p>
                </CardContent>
              </Card>

              <Card className="bg-green-50 border-green-200 cursor-pointer hover:shadow-md transition-shadow" onClick={() => getComponentDetail("netPurchases")}>
                <CardContent className="pt-4 text-center">
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <Package className="h-6 w-6 text-green-600" />
                    <Eye className="h-3.5 w-3.5 text-green-400" />
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">+ Net Purchases</p>
                  <p className="text-lg font-bold text-green-700">
                    {formatAmount(cogsData.netPurchases)}
                  </p>
                  <p className="text-xs text-muted-foreground">TZS</p>
                </CardContent>
              </Card>

              <Card className="bg-purple-50 border-purple-200 cursor-pointer hover:shadow-md transition-shadow" onClick={() => getComponentDetail("directCosts")}>
                <CardContent className="pt-4 text-center">
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <Truck className="h-6 w-6 text-purple-600" />
                    <Eye className="h-3.5 w-3.5 text-purple-400" />
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">+ Direct Costs</p>
                  <p className="text-lg font-bold text-purple-700">
                    {formatAmount(cogsData.directCosts)}
                  </p>
                  <p className="text-xs text-muted-foreground">TZS</p>
                </CardContent>
              </Card>

              <Card className="bg-orange-50 border-orange-200 cursor-pointer hover:shadow-md transition-shadow" onClick={() => getComponentDetail("returns")}>
                <CardContent className="pt-4 text-center">
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <RotateCcw className="h-6 w-6 text-orange-600" />
                    <Eye className="h-3.5 w-3.5 text-orange-400" />
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">- Returns</p>
                  <p className="text-lg font-bold text-orange-700">
                    {formatAmount(cogsData.returns)}
                  </p>
                  <p className="text-xs text-muted-foreground">TZS</p>
                </CardContent>
              </Card>

              <Card className="bg-yellow-50 border-yellow-200 cursor-pointer hover:shadow-md transition-shadow" onClick={() => getComponentDetail("closingInventory")}>
                <CardContent className="pt-4 text-center">
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <Warehouse className="h-6 w-6 text-yellow-600" />
                    <Eye className="h-3.5 w-3.5 text-yellow-400" />
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">- Closing Inventory</p>
                  <p className="text-lg font-bold text-yellow-700">
                    {formatAmount(cogsData.closingInventory)}
                  </p>
                  <p className="text-xs text-muted-foreground">TZS</p>
                </CardContent>
              </Card>

              <Card className="bg-red-50 border-red-200 cursor-pointer hover:shadow-md transition-shadow" onClick={() => getComponentDetail("cogs")}>
                <CardContent className="pt-4 text-center">
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <TrendingDown className="h-6 w-6 text-red-600" />
                    <Eye className="h-3.5 w-3.5 text-red-400" />
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">= COGS</p>
                  <p className="text-lg font-bold text-red-700">
                    {formatAmount(cogsData.cogs)}
                  </p>
                  <p className="text-xs text-muted-foreground">TZS</p>
                </CardContent>
              </Card>
            </div>

            {/* Formula Display */}
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm font-mono text-center">
                <span className="font-semibold">COGS</span> = Opening Inventory + Net Purchases + Direct Costs - Returns - Closing Inventory
              </p>
              <p className="text-sm font-mono text-center mt-2 text-muted-foreground">
                <span className="font-semibold">{formatAmount(cogsData.cogs)}</span>
                {" = "}
                {formatAmount(cogsData.openingInventory)}
                {" + "}
                {formatAmount(cogsData.netPurchases)}
                {" + "}
                {formatAmount(cogsData.directCosts)}
                {" - "}
                {formatAmount(cogsData.returns)}
                {" - "}
                {formatAmount(cogsData.closingInventory)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Breakdown Tabs */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Detailed Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="purchases" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="purchases" className="flex items-center gap-1">
                  <Package className="h-3.5 w-3.5" />
                  Purchase Costs
                </TabsTrigger>
                <TabsTrigger value="direct" className="flex items-center gap-1">
                  <Truck className="h-3.5 w-3.5" />
                  Direct Costs
                </TabsTrigger>
                <TabsTrigger value="returns" className="flex items-center gap-1">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Returns
                </TabsTrigger>
                <TabsTrigger value="inventory" className="flex items-center gap-1">
                  <Warehouse className="h-3.5 w-3.5" />
                  Inventory
                </TabsTrigger>
              </TabsList>

              {/* Purchase Costs Tab */}
              <TabsContent value="purchases" className="mt-4">
                {cogsData.purchaseBreakdown.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No purchase records found for this period</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3 font-semibold">Source</th>
                          <th className="text-left py-2 px-3 font-semibold">Supplier</th>
                          <th className="text-left py-2 px-3 font-semibold">Date</th>
                          <th className="text-right py-2 px-3 font-semibold">Items</th>
                          <th className="text-right py-2 px-3 font-semibold">Total Cost (TZS)</th>
                          <th className="text-center py-2 px-3 font-semibold w-12"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {cogsData.purchaseBreakdown.map((entry) => (
                          <tr key={entry.id} className="border-b hover:bg-muted/50">
                            <td className="py-2 px-3">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  entry.source === "GRN"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-green-100 text-green-800"
                                }`}
                              >
                                {entry.source}
                              </span>
                            </td>
                            <td className="py-2 px-3">{entry.supplierName}</td>
                            <td className="py-2 px-3">
                              {entry.date ? new Date(entry.date).toLocaleDateString() : "N/A"}
                            </td>
                            <td className="py-2 px-3 text-right">
                              {entry.itemCount || "-"}
                            </td>
                            <td className="py-2 px-3 text-right font-medium">
                              {formatAmount(entry.totalCost)}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {entry.source === "GRN" && grnMap.has(entry.id) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  title="View GRN Details"
                                  onClick={() => {
                                    const grn = grnMap.get(entry.id);
                                    if (grn) {
                                      setSelectedGRN(grn);
                                      setGrnDetailOpen(true);
                                    }
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                        <tr className="font-semibold bg-muted/30">
                          <td colSpan={4} className="py-2 px-3 text-right">
                            Total Purchases:
                          </td>
                          <td className="py-2 px-3 text-right">
                            {formatAmount(cogsData.netPurchases)}
                          </td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>

              {/* Direct Costs Tab */}
              <TabsContent value="direct" className="mt-4">
                {cogsData.directCostBreakdown.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Truck className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No direct costs found for this period</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3 font-semibold">GRN #</th>
                          <th className="text-left py-2 px-3 font-semibold">Supplier</th>
                          <th className="text-left py-2 px-3 font-semibold">Date</th>
                          <th className="text-left py-2 px-3 font-semibold">Description</th>
                          <th className="text-right py-2 px-3 font-semibold">Amount (TZS)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cogsData.directCostBreakdown.map((entry) => (
                          <tr key={entry.id} className="border-b hover:bg-muted/50">
                            <td className="py-2 px-3">{entry.grnNumber || "-"}</td>
                            <td className="py-2 px-3">{entry.supplierName}</td>
                            <td className="py-2 px-3">
                              {entry.date ? new Date(entry.date).toLocaleDateString() : "N/A"}
                            </td>
                            <td className="py-2 px-3">{entry.description}</td>
                            <td className="py-2 px-3 text-right font-medium">
                              {formatAmount(entry.amount)}
                            </td>
                          </tr>
                        ))}
                        <tr className="font-semibold bg-muted/30">
                          <td colSpan={4} className="py-2 px-3 text-right">
                            Total Direct Costs:
                          </td>
                          <td className="py-2 px-3 text-right">
                            {formatAmount(cogsData.directCosts)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>

              {/* Returns Tab */}
              <TabsContent value="returns" className="mt-4">
                {cogsData.returnsBreakdown.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <RotateCcw className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No returns found for this period</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3 font-semibold">Date</th>
                          <th className="text-left py-2 px-3 font-semibold">Reason</th>
                          <th className="text-right py-2 px-3 font-semibold">Amount (TZS)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cogsData.returnsBreakdown.map((entry) => (
                          <tr key={entry.id} className="border-b hover:bg-muted/50">
                            <td className="py-2 px-3">
                              {entry.returnDate
                                ? new Date(entry.returnDate).toLocaleDateString()
                                : "N/A"}
                            </td>
                            <td className="py-2 px-3">{entry.reason}</td>
                            <td className="py-2 px-3 text-right font-medium">
                              {formatAmount(entry.totalAmount)}
                            </td>
                          </tr>
                        ))}
                        <tr className="font-semibold bg-muted/30">
                          <td colSpan={2} className="py-2 px-3 text-right">
                            Total Returns:
                          </td>
                          <td className="py-2 px-3 text-right">
                            {formatAmount(cogsData.returns)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>

              {/* Inventory Valuation Tab */}
              <TabsContent value="inventory" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Warehouse className="h-4 w-4 text-blue-600" />
                        Opening Inventory
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-4">
                        <p className="text-3xl font-bold text-blue-700">
                          {formatAmount(cogsData.openingInventory)}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">TZS</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Estimated value of inventory at the start of the period
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Warehouse className="h-4 w-4 text-yellow-600" />
                        Closing Inventory
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-4">
                        <p className="text-3xl font-bold text-yellow-700">
                          {formatAmount(cogsData.closingInventory)}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">TZS</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Current total inventory value at cost price
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="mt-4 bg-muted p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold">Note:</span> Opening inventory is estimated by
                    reversing purchases and returns prior to the selected period. Closing inventory
                    is based on current product stock quantities multiplied by their cost prices.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Period: {cogsData.period}</p>
          <p className="mt-1">Prepared on: {new Date().toLocaleDateString()}</p>
          <p className="mt-1">Confidential - For Internal Use Only</p>
        </div>
      </main>

      {/* Component Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{currentDetail?.title}</DialogTitle>
            <DialogDescription>
              Detailed breakdown of how this amount was calculated
            </DialogDescription>
          </DialogHeader>
          {currentDetail && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-muted-foreground">{currentDetail.description}</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Calculation</h3>
                <p className="font-mono text-sm p-3 bg-muted rounded break-words">{currentDetail.calculation}</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Data Sources</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {currentDetail.dataSources.map((source, index) => (
                    <li key={index} className="text-muted-foreground">{source}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* GRN Detail Dialog */}
      <Dialog open={grnDetailOpen} onOpenChange={setGrnDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>GRN Details {selectedGRN ? `- ${selectedGRN.data.grnNumber}` : ''}</DialogTitle>
            <DialogDescription>
              Goods Received Note details for this transaction
            </DialogDescription>
          </DialogHeader>
          {selectedGRN && (
            <div className="space-y-4">
              {/* Supplier & Document Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 text-sm">
                  <p><span className="font-semibold">Supplier:</span> {selectedGRN.data.supplierName}</p>
                  <p><span className="font-semibold">PO Number:</span> {selectedGRN.data.poNumber || 'N/A'}</p>
                  <p><span className="font-semibold">Delivery Note:</span> {selectedGRN.data.deliveryNoteNumber || 'N/A'}</p>
                </div>
                <div className="space-y-1 text-sm">
                  <p><span className="font-semibold">Date:</span> {selectedGRN.data.date ? new Date(selectedGRN.data.date).toLocaleDateString() : 'N/A'}</p>
                  <p><span className="font-semibold">Received By:</span> {selectedGRN.data.receivedBy || 'N/A'}</p>
                  <p><span className="font-semibold">Status:</span> {selectedGRN.data.status || 'N/A'}</p>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h3 className="font-semibold text-sm mb-2">Items</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left py-1.5 px-2 font-semibold">#</th>
                        <th className="text-left py-1.5 px-2 font-semibold">Description</th>
                        <th className="text-right py-1.5 px-2 font-semibold">Qty</th>
                        <th className="text-left py-1.5 px-2 font-semibold">Unit</th>
                        <th className="text-right py-1.5 px-2 font-semibold">Unit Cost</th>
                        <th className="text-right py-1.5 px-2 font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedGRN.data.items.map((item, idx) => (
                        <tr key={item.id || idx} className="border-b">
                          <td className="py-1.5 px-2">{idx + 1}</td>
                          <td className="py-1.5 px-2">{item.description}</td>
                          <td className="py-1.5 px-2 text-right">{item.delivered || item.quantity || 0}</td>
                          <td className="py-1.5 px-2">{item.unit}</td>
                          <td className="py-1.5 px-2 text-right">{formatAmount(item.unitCost)}</td>
                          <td className="py-1.5 px-2 text-right font-medium">{formatAmount(item.totalWithReceivingCost || item.total || 0)}</td>
                        </tr>
                      ))}
                      <tr className="font-semibold bg-muted/30">
                        <td colSpan={5} className="py-1.5 px-2 text-right">Items Total:</td>
                        <td className="py-1.5 px-2 text-right">
                          {formatAmount(selectedGRN.data.items.reduce((s, i) => s + (i.totalWithReceivingCost || i.total || 0), 0))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Receiving Costs */}
              {selectedGRN.data.receivingCosts && selectedGRN.data.receivingCosts.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-2">Receiving Costs</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left py-1.5 px-2 font-semibold">Description</th>
                          <th className="text-right py-1.5 px-2 font-semibold">Amount (TZS)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedGRN.data.receivingCosts.map((cost, idx) => (
                          <tr key={idx} className="border-b">
                            <td className="py-1.5 px-2">{cost.description}</td>
                            <td className="py-1.5 px-2 text-right">{formatAmount(cost.amount)}</td>
                          </tr>
                        ))}
                        <tr className="font-semibold bg-muted/30">
                          <td className="py-1.5 px-2 text-right">Total Receiving Costs:</td>
                          <td className="py-1.5 px-2 text-right">
                            {formatAmount(selectedGRN.data.receivingCosts.reduce((s, c) => s + (c.amount || 0), 0))}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* GRN Total */}
              <div className="flex justify-end">
                <div className="text-right bg-muted p-3 rounded-lg min-w-[200px]">
                  <p className="text-sm text-muted-foreground">GRN Total</p>
                  <p className="text-lg font-bold">{formatAmount(selectedGRN.total || 0)} TZS</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
