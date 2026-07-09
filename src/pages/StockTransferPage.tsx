// Stock Transfer Page - Complete Implementation
// Allows users to transfer inventory between godowns with searchable product selection

import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  ArrowRightLeft,
  Package,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  Search,
  Plus,
  Trash2,
  Eye,
  Printer,
  X,
  Calendar,
} from "lucide-react";
import {
  getGodowns,
  getZones,
  getStockTransfers,
  createStockTransfer,
  generateTransferNumber,
  updateGodownStock,
  Godown,
  GodownZone,
  StockTransfer,
  StockTransferItem,
} from "@/services/godownService";
import { supabase } from "@/lib/supabaseClient";

interface Product {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  unit?: string;
}

interface SearchResultItem {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  unit?: string;
  godown_name: string;
  zone_name: string;
  available_stock: number;
}

interface TransferItem {
  product_id: string;
  product_name: string;
  sku?: string;
  available_stock: number;
  quantity: number;
  unit?: string;
  remarks?: string;
  godown_name?: string;
  zone_name?: string;
}

interface StockTransferPageProps {
  username: string;
  onBack: () => void;
  onLogout: () => void;
}

export const StockTransferPage = ({ username, onBack, onLogout }: StockTransferPageProps) => {
  // State for transfers list
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // State for new transfer dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [transferNumber, setTransferNumber] = useState("");
  const [fromGodownId, setFromGodownId] = useState("");
  const [toGodownId, setToGodownId] = useState("");
  const [fromZoneId, setFromZoneId] = useState("");
  const [toZoneId, setToZoneId] = useState("");
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split("T")[0]);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  // State for godowns and zones
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [fromZones, setFromZones] = useState<GodownZone[]>([]);
  const [toZones, setToZones] = useState<GodownZone[]>([]);

  // State for product search and selection
  const [productSearch, setProductSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [transferItems, setTransferItems] = useState<TransferItem[]>([]);
  const [searching, setSearching] = useState(false);

  // State for details dialog
  const [selectedTransfer, setSelectedTransfer] = useState<StockTransfer | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  // Statistics
  const stats = {
    total: transfers.length,
    pending: transfers.filter(t => t.status === "pending").length,
    completedToday: transfers.filter(t => {
      if (t.status !== "completed" || !t.completion_date) return false;
      const today = new Date().toISOString().split("T")[0];
      return t.completion_date.startsWith(today);
    }).length,
    inTransit: transfers.filter(t => t.status === "in-transit").length,
  };

  // Load transfers and godowns on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [transfersData, godownsData] = await Promise.all([
        getStockTransfers(),
        getGodowns(),
      ]);
      setTransfers(transfersData || []);
      setGodowns(godownsData || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  // Load zones when godown changes
  useEffect(() => {
    const loadZones = async () => {
      if (fromGodownId) {
        const zones = await getZones(fromGodownId);
        setFromZones(zones);
      } else {
        setFromZones([]);
      }
    };
    loadZones();
  }, [fromGodownId]);

  useEffect(() => {
    const loadZones = async () => {
      if (toGodownId) {
        const zones = await getZones(toGodownId);
        setToZones(zones);
      } else {
        setToZones([]);
      }
    };
    loadZones();
  }, [toGodownId]);

  // Generate transfer number when dialog opens
  useEffect(() => {
    if (isDialogOpen) {
      loadTransferNumber();
      resetForm();
    }
  }, [isDialogOpen]);

  const loadTransferNumber = async () => {
    const number = await generateTransferNumber();
    setTransferNumber(number);
  };

  const resetForm = () => {
    setFromGodownId("");
    setToGodownId("");
    setFromZoneId("");
    setToZoneId("");
    setTransferDate(new Date().toISOString().split("T")[0]);
    setReason("");
    setNotes("");
    setTransferItems([]);
    setProductSearch("");
    setSearchResults([]);
  };

  // Search products - query godown_stock to show products with their godown/zone locations
  useEffect(() => {
    const searchProducts = async () => {
      if (!productSearch || productSearch.length < 2) {
        setSearchResults([]);
        return;
      }

      setSearching(true);
      try {
        if (fromGodownId) {
          // Query godown_stock to get products with their location in the selected godown
          const { data: stockData, error } = await supabase
            .from("godown_stock")
            .select(`
              product_id,
              quantity,
              zone_id,
              products!inner (id, name, sku, barcode, unit),
              godowns!inner (name),
              godown_zones (zone_name)
            `)
            .eq("godown_id", fromGodownId)
            .gt("quantity", 0)
            .or(`products.name.ilike.%${productSearch}%,products.sku.ilike.%${productSearch}%,products.barcode.ilike.%${productSearch}%`)
            .limit(20);

          if (error) throw error;

          const results: SearchResultItem[] = (stockData || []).map((stock: any) => ({
            id: stock.products.id,
            name: stock.products.name,
            sku: stock.products.sku,
            barcode: stock.products.barcode,
            unit: stock.products.unit,
            godown_name: stock.godowns?.name || "",
            zone_name: stock.godown_zones?.zone_name || "Godown Level",
            available_stock: stock.quantity,
          }));

          setSearchResults(results);
        } else {
          // No source godown selected - search products table with general stock info
          const { data, error } = await supabase
            .from("products")
            .select("id, name, sku, barcode, unit")
            .or(`name.ilike.%${productSearch}%,sku.ilike.%${productSearch}%,barcode.ilike.%${productSearch}%`)
            .limit(10);

          if (error) throw error;

          const results: SearchResultItem[] = (data || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            barcode: p.barcode,
            unit: p.unit,
            godown_name: "",
            zone_name: "",
            available_stock: 0,
          }));

          setSearchResults(results);
        }
      } catch (error) {
        console.error("Error searching products:", error);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchProducts, 300);
    return () => clearTimeout(debounceTimer);
  }, [productSearch, fromGodownId]);

  // Add product to transfer
  const addProduct = (result: SearchResultItem) => {
    // Check if already added
    if (transferItems.find(item => item.product_id === result.id)) {
      toast.error("Product already added");
      return;
    }

    setTransferItems([
      ...transferItems,
      {
        product_id: result.id,
        product_name: result.name,
        sku: result.sku,
        available_stock: result.available_stock,
        quantity: 1,
        unit: result.unit,
        remarks: "",
        godown_name: result.godown_name,
        zone_name: result.zone_name,
      },
    ]);
    
    setProductSearch("");
    setSearchResults([]);
  };

  // Remove product from transfer
  const removeProduct = (productId: string) => {
    setTransferItems(transferItems.filter(item => item.product_id !== productId));
  };

  // Update transfer item quantity
  const updateItemQuantity = (productId: string, quantity: number) => {
    setTransferItems(
      transferItems.map(item =>
        item.product_id === productId
          ? { ...item, quantity: Math.max(0, quantity) }
          : item
      )
    );
  };

  // Update transfer item remarks
  const updateItemRemarks = (productId: string, remarks: string) => {
    setTransferItems(
      transferItems.map(item =>
        item.product_id === productId ? { ...item, remarks } : item
      )
    );
  };

  // Validate and create transfer
  const handleCreateTransfer = async () => {
    // Validation
    if (!fromGodownId || !toGodownId) {
      toast.error("Please select source and destination godowns");
      return;
    }

    if (fromGodownId === toGodownId) {
      toast.error("Source and destination godowns must be different");
      return;
    }

    if (transferItems.length === 0) {
      toast.error("Please add at least one product");
      return;
    }

    // Validate quantities
    for (const item of transferItems) {
      if (item.quantity <= 0) {
        toast.error(`Quantity must be greater than 0 for ${item.product_name}`);
        return;
      }

      if (item.quantity > item.available_stock) {
        toast.error(
          `Insufficient stock for ${item.product_name}. Available: ${item.available_stock}`
        );
        return;
      }
    }

    try {
      // Create transfer record
      const transferData = {
        transfer_number: transferNumber,
        from_godown_id: fromGodownId,
        to_godown_id: toGodownId,
        from_zone_id: fromZoneId === "no-zone" ? null : fromZoneId,
        to_zone_id: toZoneId === "no-zone" ? null : toZoneId,
        transfer_date: transferDate,
        status: "completed" as const,
        requested_by: username,
        completed_by: username,
        reason: reason || undefined,
        notes: notes || undefined,
      };

      const items = transferItems.map(item => ({
        transfer_id: "", // Will be set by service
        product_id: item.product_id,
        quantity: item.quantity,
        transferred_quantity: 0,
        unit: item.unit,
        remarks: item.remarks,
      }));

      const transfer = await createStockTransfer(transferData, items);

      if (!transfer) {
        toast.error("Failed to create transfer");
        return;
      }

      // Update stock: Decrease from source
      for (const item of transferItems) {
        await updateGodownStock(
          item.product_id,
          fromGodownId,
          fromZoneId === "no-zone" ? null : fromZoneId,
          -item.quantity
        );
      }

      // Update stock: Increase in destination
      for (const item of transferItems) {
        await updateGodownStock(
          item.product_id,
          toGodownId,
          toZoneId === "no-zone" ? null : toZoneId,
          item.quantity
        );
      }

      toast.success(`Transfer ${transferNumber} completed successfully`);
      setIsDialogOpen(false);
      loadData();
    } catch (error: any) {
      console.error("Error creating transfer:", error);
      toast.error(error.message || "Failed to create transfer");
    }
  };

  // View transfer details
  const viewDetails = async (transfer: StockTransfer) => {
    setSelectedTransfer(transfer);
    setIsDetailsDialogOpen(true);
  };

  // Filter transfers
  const filteredTransfers = transfers.filter(transfer => {
    const matchesSearch =
      transfer.transfer_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (transfer.from_godown as any)?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (transfer.to_godown as any)?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || transfer.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "in-transit":
        return "bg-blue-100 text-blue-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation title="Stock Transfer Management" onBack={onBack} onLogout={onLogout} username={username} />
      
      <main className="container mx-auto p-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ArrowRightLeft className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Transfers</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <ArrowDownLeft className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Completed Today</p>
                  <p className="text-2xl font-bold">{stats.completedToday}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <ArrowUpRight className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">In Transit</p>
                  <p className="text-2xl font-bold">{stats.inTransit}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by transfer number or godown..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="in-transit">In Transit</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Transfer
          </Button>
        </div>

        {/* Transfers Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transfer Number</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredTransfers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    No transfers found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransfers.map((transfer) => (
                  <TableRow key={transfer.id}>
                    <TableCell className="font-medium">{transfer.transfer_number}</TableCell>
                    <TableCell>
                      {(transfer.from_godown as any)?.name || transfer.from_godown_id}
                    </TableCell>
                    <TableCell>
                      {(transfer.to_godown as any)?.name || transfer.to_godown_id}
                    </TableCell>
                    <TableCell>{formatDate(transfer.transfer_date)}</TableCell>
                    <TableCell>{(transfer.stock_transfer_items as any)?.length || 0}</TableCell>
                    <TableCell>
                      {(transfer.stock_transfer_items as any)?.reduce(
                        (sum: number, item: any) => sum + item.quantity,
                        0
                      ) || 0}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(transfer.status || "pending")}>
                        {transfer.status || "pending"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewDetails(transfer)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </main>

      {/* New Transfer Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Stock Transfer</DialogTitle>
            <DialogDescription>
              Transfer inventory from one godown to another
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Transfer Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Transfer Number</Label>
                <Input value={transferNumber} disabled className="mt-1" />
              </div>
              <div>
                <Label>Transfer Date</Label>
                <Input
                  type="date"
                  value={transferDate}
                  onChange={(e) => setTransferDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Source and Destination */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <Label>From Godown *</Label>
                  <Select value={fromGodownId} onValueChange={setFromGodownId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select source godown" />
                    </SelectTrigger>
                    <SelectContent>
                      {godowns
                        .filter((g) => g.status === "active")
                        .map((godown) => (
                          <SelectItem key={godown.id} value={godown.id!}>
                            {godown.name} ({godown.code})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>From Zone (Optional)</Label>
                  <Select value={fromZoneId} onValueChange={setFromZoneId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select zone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no-zone">All Zones</SelectItem>
                      {fromZones.map((zone) => (
                        <SelectItem key={zone.id} value={zone.id!}>
                          {zone.zone_name} ({zone.zone_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>To Godown *</Label>
                  <Select value={toGodownId} onValueChange={setToGodownId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select destination godown" />
                    </SelectTrigger>
                    <SelectContent>
                      {godowns
                        .filter((g) => g.status === "active")
                        .map((godown) => (
                          <SelectItem key={godown.id} value={godown.id!}>
                            {godown.name} ({godown.code})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>To Zone (Optional)</Label>
                  <Select value={toZoneId} onValueChange={setToZoneId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select zone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no-zone">All Zones</SelectItem>
                      {toZones.map((zone) => (
                        <SelectItem key={zone.id} value={zone.id!}>
                          {zone.zone_name} ({zone.zone_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Reason and Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Reason</Label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason for transfer..."
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes..."
                  className="mt-1"
                />
              </div>
            </div>

            {/* Product Search */}
            <div className="space-y-4">
              <div>
                <Label>Add Products</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by product name, SKU, or barcode..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="mt-2 border rounded-lg max-h-60 overflow-y-auto">
                    {searchResults.map((product, idx) => (
                      <div
                        key={`${product.id}-${idx}`}
                        className="flex items-center justify-between p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                        onClick={() => addProduct(product)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{product.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-muted-foreground">
                              {product.sku || product.barcode || "No SKU"}
                            </span>
                            {product.godown_name && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                                {product.godown_name}
                              </span>
                            )}
                            {product.zone_name && (
                              <span className="text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded">
                                {product.zone_name}
                              </span>
                            )}
                            {product.available_stock > 0 && (
                              <span className="text-xs font-semibold text-muted-foreground">
                                Qty: {product.available_stock}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button size="sm" variant="outline" className="ml-2 shrink-0">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                {fromGodownId && searchResults.length === 0 && productSearch.length >= 2 && !searching && (
                  <p className="text-sm text-muted-foreground mt-2">
                    No products with stock found in the selected source godown.
                  </p>
                )}
                {!fromGodownId && searchResults.length === 0 && productSearch.length >= 2 && !searching && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Select a Source Godown to see product availability.
                  </p>
                )}
              </div>

              {/* Selected Products Table */}
              {transferItems.length > 0 && (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Godown</TableHead>
                        <TableHead>Zone</TableHead>
                        <TableHead>Available</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Remarks</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transferItems.map((item) => (
                        <TableRow key={item.product_id}>
                          <TableCell className="font-medium">{item.product_name}</TableCell>
                          <TableCell>{item.godown_name || "-"}</TableCell>
                          <TableCell>{item.zone_name || "-"}</TableCell>
                          <TableCell>{item.available_stock}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) =>
                                updateItemQuantity(item.product_id, parseInt(e.target.value) || 0)
                              }
                              className="w-24"
                              min={0}
                              max={item.available_stock}
                            />
                          </TableCell>
                          <TableCell>{item.unit || "pcs"}</TableCell>
                          <TableCell>
                            <Input
                              value={item.remarks || ""}
                              onChange={(e) => updateItemRemarks(item.product_id, e.target.value)}
                              placeholder="Optional"
                              className="w-32"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeProduct(item.product_id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTransfer}>
              Create & Execute Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transfer Details</DialogTitle>
            <DialogDescription>
              {selectedTransfer?.transfer_number}
            </DialogDescription>
          </DialogHeader>

          {selectedTransfer && (
            <div className="space-y-6 py-4">
              {/* Transfer Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <Badge className={`mt-1 ${getStatusColor(selectedTransfer.status || "pending")}`}>
                    {selectedTransfer.status || "pending"}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Date</Label>
                  <p className="mt-1">{formatDate(selectedTransfer.transfer_date)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">From</Label>
                  <p className="mt-1 font-medium">
                    {(selectedTransfer.from_godown as any)?.name || selectedTransfer.from_godown_id}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">To</Label>
                  <p className="mt-1 font-medium">
                    {(selectedTransfer.to_godown as any)?.name || selectedTransfer.to_godown_id}
                  </p>
                </div>
              </div>

              {/* Items */}
              {selectedTransfer.stock_transfer_items && (
                <div>
                  <Label className="text-muted-foreground">Transferred Items</Label>
                  <div className="border rounded-lg mt-1">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Unit</TableHead>
                          <TableHead>Remarks</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(selectedTransfer.stock_transfer_items as any[]).map((item: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              {item.products?.name || item.product_id}
                            </TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{item.unit || "pcs"}</TableCell>
                            <TableCell>{item.remarks || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Reason and Notes */}
              {selectedTransfer.reason && (
                <div>
                  <Label className="text-muted-foreground">Reason</Label>
                  <p className="mt-1">{selectedTransfer.reason}</p>
                </div>
              )}

              {selectedTransfer.notes && (
                <div>
                  <Label className="text-muted-foreground">Notes</Label>
                  <p className="mt-1">{selectedTransfer.notes}</p>
                </div>
              )}

              {/* Timeline */}
              <div>
                <Label className="text-muted-foreground">Timeline</Label>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Created: {formatDate(selectedTransfer.created_at || "")}
                    </span>
                  </div>
                  {selectedTransfer.completion_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-green-600" />
                      <span className="text-sm">
                        Completed: {formatDate(selectedTransfer.completion_date)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
              Close
            </Button>
            <Button>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
