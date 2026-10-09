import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, PackageSearch, Warehouse, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import { getGodowns, getZones, getGodownStock, updateGodownStock, Godown, GodownZone, GodownStock } from "@/services/godownService";
import { addStockToOutletInventory } from "@/services/databaseService";
import { recordStockMovements } from "@/utils/stockMovementUtils";

interface FetchFromWarehouseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  outletId: string;
  outletName?: string;
  onFetched: () => void;
}

// Pseudo zone values for the zone selector
const ZONE_ALL = "all";
const ZONE_NONE = "no-zone";

// Move stock from a godown/zone into an outlet's inventory, then sell it normally.
// Mirrors the delivery-note flow: decrements godown_stock and the general warehouse
// stock (products.stock_quantity), adds to inventory_products and records an OUT movement.
export const FetchFromWarehouseDialog = ({ open, onOpenChange, outletId, outletName, onFetched }: FetchFromWarehouseDialogProps) => {
  const { toast } = useToast();
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [loadingGodowns, setLoadingGodowns] = useState(false);
  const [selectedGodownId, setSelectedGodownId] = useState("");
  const [zones, setZones] = useState<GodownZone[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState(ZONE_ALL);
  const [stockRows, setStockRows] = useState<GodownStock[]>([]);
  const [loadingStock, setLoadingStock] = useState(false);
  const [search, setSearch] = useState("");
  const [qtyInputs, setQtyInputs] = useState<Record<string, string>>({});
  const [fetchingKey, setFetchingKey] = useState<string | null>(null);

  // Unique key per stock row: a product can exist in the same godown at zone level or godown level
  const rowKey = (row: GodownStock) => `${row.product_id}::${row.zone_id || "none"}`;

  // Load godowns when the dialog opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const load = async () => {
      setLoadingGodowns(true);
      try {
        const data = await getGodowns();
        if (!cancelled) {
          setGodowns(data.filter(g => g.status !== "inactive"));
        }
      } catch (error) {
        console.error("Error loading godowns:", error);
        if (!cancelled) {
          toast({ title: "Error", description: "Failed to load godowns", variant: "destructive" });
        }
      } finally {
        if (!cancelled) setLoadingGodowns(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [open, toast]);

  // Reset selections when the dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedGodownId("");
      setSelectedZoneId(ZONE_ALL);
      setStockRows([]);
      setZones([]);
      setSearch("");
      setQtyInputs({});
    }
  }, [open]);

  // Load zones + stock for the selected godown
  useEffect(() => {
    if (!selectedGodownId) {
      setZones([]);
      setStockRows([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoadingStock(true);
      try {
        const [zoneData, stockData] = await Promise.all([
          getZones(selectedGodownId),
          getGodownStock(undefined, selectedGodownId)
        ]);
        if (cancelled) return;
        setZones(zoneData);
        setStockRows(stockData.filter(r => (r.quantity || 0) > 0));
        setQtyInputs({});
      } catch (error) {
        console.error("Error loading godown stock:", error);
        if (!cancelled) {
          setStockRows([]);
          toast({ title: "Error", description: "Failed to load godown stock", variant: "destructive" });
        }
      } finally {
        if (!cancelled) setLoadingStock(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [selectedGodownId, toast]);

  const selectedGodown = godowns.find(g => g.id === selectedGodownId);

  const reloadStock = async () => {
    if (!selectedGodownId) return;
    const stockData = await getGodownStock(undefined, selectedGodownId);
    setStockRows(stockData.filter(r => (r.quantity || 0) > 0));
  };

  const filteredRows = stockRows
    .filter(row => {
      const product = row.products;
      const name = product?.name || "";
      const sku = product?.sku || "";
      const barcode = product?.barcode || "";
      const term = search.trim().toLowerCase();
      if (term && !name.toLowerCase().includes(term) && !sku.toLowerCase().includes(term) && !barcode.toLowerCase().includes(term)) {
        return false;
      }

      // Zone filter: godown-level rows, a specific zone, or everything
      if (selectedZoneId === ZONE_NONE) return !row.zone_id;
      if (selectedZoneId !== ZONE_ALL) return row.zone_id === selectedZoneId;
      return true;
    })
    .sort((a, b) => (a.products?.name || "").localeCompare(b.products?.name || ""));

  const handleFetch = async (row: GodownStock) => {
    const key = rowKey(row);
    const requested = parseInt(qtyInputs[key] ?? "1", 10);
    const available = row.quantity || 0;
    const productName = row.products?.name || "Product";

    if (!requested || requested <= 0) {
      toast({ title: "Invalid quantity", description: "Enter a quantity greater than 0", variant: "destructive" });
      return;
    }
    if (requested > available) {
      toast({ title: "Insufficient stock", description: `${productName} only has ${available} available in this godown location`, variant: "destructive" });
      return;
    }

    setFetchingKey(key);
    try {
      // 1. Decrement the godown stock first so stock is never added to the outlet without leaving the source
      await updateGodownStock(row.product_id, row.godown_id, row.zone_id || null, -requested);

      // 2. Add the fetched quantity into the outlet's inventory
      const added = await addStockToOutletInventory(outletId, {
        name: productName,
        sku: row.products?.sku,
        unit_cost: row.products?.cost_price || 0,
        selling_price: row.products?.selling_price || 0
      }, requested);

      if (!added) {
        // Roll the godown decrement back so stock is never lost on a failed fetch
        await updateGodownStock(row.product_id, row.godown_id, row.zone_id || null, requested);
        toast({ title: "Fetch failed", description: `Could not add ${productName} to the outlet inventory`, variant: "destructive" });
        return;
      }

      // 3. Decrement the general warehouse stock (products.stock_quantity), exactly like a delivery note does
      try {
        const { updateProductStockBasedOnDelivered } = await import("@/utils/consumptionUtils");
        await updateProductStockBasedOnDelivered([{ description: productName, delivered: requested }]);
      } catch (generalStockError) {
        console.warn("Error updating general product stock (non-critical):", generalStockError);
      }

      // 4. Record the warehouse OUT movement so the fetch is visible in the Movement Ledger
      try {
        const reference = `FETCH-${Date.now()}`;
        const godownLabel = selectedGodown?.name || "Godown";
        const zoneLabel = row.godown_zones?.zone_name || "";
        await recordStockMovements([
          {
            product_id: row.product_id,
            product_name: productName,
            outlet_id: outletId,
            godown_id: row.godown_id,
            zone_id: row.zone_id || undefined,
            movement_type: "OUT",
            quantity: requested,
            reference_type: "TRANSFER",
            reference_number: reference,
            unit_cost: row.products?.cost_price || 0,
            notes: `Fetched to outlet ${outletName || outletId} from ${godownLabel}${zoneLabel ? ` / ${zoneLabel}` : ""}`
          }
        ]);
      } catch (movementError) {
        console.warn("Error recording fetch stock movements (non-critical):", movementError);
      }

      // 5. Refresh the local stock list and tell the terminal to reload its products
      toast({ title: "Stock fetched", description: `${requested} x ${productName} added to the outlet inventory` });
      onFetched();
      await reloadStock();
    } catch (error) {
      console.error("Error fetching stock from godown:", error);
      toast({ title: "Fetch failed", description: "An error occurred while fetching stock", variant: "destructive" });
    } finally {
      setFetchingKey(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Warehouse className="h-5 w-5" />
            Fetch from Warehouse
          </DialogTitle>
          <DialogDescription>
            Move stock from a godown/zone into this outlet's inventory, then sell it normally from the terminal.
          </DialogDescription>
        </DialogHeader>

        {/* Source selectors */}
        <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">Source Godown</label>
            <Select
              value={selectedGodownId}
              onValueChange={(value) => {
                setSelectedGodownId(value);
                setSelectedZoneId(ZONE_ALL);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingGodowns ? "Loading godowns..." : "Select godown"} />
              </SelectTrigger>
              <SelectContent>
                {godowns.map(g => (
                  <SelectItem key={g.id} value={g.id as string}>
                    {g.name}{g.location ? ` — ${g.location}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Zone</label>
            <Select value={selectedZoneId} onValueChange={setSelectedZoneId} disabled={!selectedGodownId}>
              <SelectTrigger>
                <SelectValue placeholder="All zones" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ZONE_ALL}>All Zones</SelectItem>
                {zones.map(z => (
                  <SelectItem key={z.id} value={z.id as string}>{z.zone_name}</SelectItem>
                ))}
                <SelectItem value={ZONE_NONE}>Godown Level (No Zone)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Product search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by product name, SKU, or barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            disabled={!selectedGodownId}
          />
        </div>

        {/* Stock list */}
        <div className="flex-1 overflow-y-auto border rounded-md min-h-[220px]">
          {!selectedGodownId ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8">
              <Warehouse className="h-8 w-8 mb-2" />
              <p className="text-sm">Select a source godown to load its products</p>
            </div>
          ) : loadingStock ? (
            <div className="h-full flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8">
              <PackageSearch className="h-8 w-8 mb-2" />
              <p className="text-sm">{search ? "No products match your search" : "No stock found in this godown/zone"}</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredRows.map(row => {
                const key = rowKey(row);
                const available = row.quantity || 0;
                const isFetching = fetchingKey === key;
                return (
                  <div key={key} className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 p-3 hover:bg-accent/50">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{row.products?.name || "Unknown product"}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-xs">
                          {selectedGodown?.name || "Godown"}
                        </Badge>
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs">
                          {row.godown_zones?.zone_name || "Godown Level"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {available} available · Cost {formatCurrency(row.products?.cost_price || 0)} · Sell {formatCurrency(row.products?.selling_price || 0)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Input
                        type="number"
                        min={1}
                        max={available}
                        value={qtyInputs[key] ?? "1"}
                        onChange={(e) => setQtyInputs(prev => ({ ...prev, [key]: e.target.value }))}
                        className="w-20"
                        disabled={isFetching}
                      />
                      <Button size="sm" onClick={() => handleFetch(row)} disabled={isFetching}>
                        {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Fetch"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
