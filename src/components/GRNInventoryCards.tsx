import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Package, Filter, Download, Upload, Calendar, SortAsc, SortDesc } from "lucide-react";
import { GRNInventoryCard } from "./GRNInventoryCard";
import { SavedGRN } from "@/utils/grnUtils";

interface GRNInventoryCardsProps {
  grns: SavedGRN[];
  onGRNView: (grn: SavedGRN) => void;
  onGRNPrint: (grn: SavedGRN) => void;
  onGRNDownload: (grn: SavedGRN) => void;
  onGRNDelete: (grn: SavedGRN) => void;
}

export const GRNInventoryCards = ({
  grns,
  onGRNView,
  onGRNPrint,
  onGRNDownload,
  onGRNDelete
}: GRNInventoryCardsProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date-desc");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });

  // Filter and sort GRNs
  const filteredAndSortedGRNs = useMemo(() => {
    let result = grns.filter(grn => {
      // Search filter
      const matchesSearch = 
        (grn.name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
        (grn.data?.grnNumber?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
        (grn.data?.supplierName?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
        (grn.data?.poNumber?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
      
      // Status filter
      const grnStatus = grn.data?.status || 'pending';
      const matchesStatus = statusFilter === "all" || grnStatus === statusFilter;
      
      // Date range filter
      let matchesDateRange = true;
      if (dateRange.from || dateRange.to) {
        const grnDate = new Date(grn.createdAt);
        if (dateRange.from && grnDate < new Date(dateRange.from)) matchesDateRange = false;
        if (dateRange.to && grnDate > new Date(dateRange.to)) matchesDateRange = false;
      }
      
      return matchesSearch && matchesStatus && matchesDateRange;
    });

    // Sort results
    result.sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "date-asc":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "value-desc":
          return (b.total || 0) - (a.total || 0);
        case "value-asc":
          return (a.total || 0) - (b.total || 0);
        case "items-desc":
          return (Array.isArray(b.data?.items) ? b.data.items.length : 0) - 
                 (Array.isArray(a.data?.items) ? a.data.items.length : 0);
        case "supplier-asc":
          return (a.data?.supplierName || "").localeCompare(b.data?.supplierName || "");
        default:
          return 0;
      }
    });

    return result;
  }, [grns, searchTerm, statusFilter, sortBy, dateRange]);

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setSortBy("date-desc");
    setDateRange({ from: "", to: "" });
  };

  const hasActiveFilters = searchTerm !== "" || statusFilter !== "all" || sortBy !== "date-desc" || dateRange.from !== "" || dateRange.to !== "";

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              GRN Inventory
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search GRNs by name, number, supplier, or PO..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Advanced Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="checked">Checked</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Date From</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  className="pl-10"
                  value={dateRange.from}
                  onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Date To</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  className="pl-10"
                  value={dateRange.to}
                  onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Sort By</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc" className="flex items-center gap-2">
                    <SortDesc className="h-4 w-4 inline mr-2" />
                    Date (Newest First)
                  </SelectItem>
                  <SelectItem value="date-asc" className="flex items-center gap-2">
                    <SortAsc className="h-4 w-4 inline mr-2" />
                    Date (Oldest First)
                  </SelectItem>
                  <SelectItem value="value-desc">
                    <SortDesc className="h-4 w-4 inline mr-2" />
                    Value (Highest First)
                  </SelectItem>
                  <SelectItem value="value-asc">
                    <SortAsc className="h-4 w-4 inline mr-2" />
                    Value (Lowest First)
                  </SelectItem>
                  <SelectItem value="items-desc">
                    <SortDesc className="h-4 w-4 inline mr-2" />
                    Items (Most First)
                  </SelectItem>
                  <SelectItem value="supplier-asc">
                    <SortAsc className="h-4 w-4 inline mr-2" />
                    Supplier (A-Z)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="text-sm text-muted-foreground">
                {filteredAndSortedGRNs.length} of {grns.length} GRNs displayed
              </div>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear All Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* GRN Cards Grid */}
      {filteredAndSortedGRNs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-1">No GRNs Found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || statusFilter !== "all" 
                ? "No GRNs match your current filters" 
                : "No GRNs have been created yet"}
            </p>
            <Button 
              variant="outline"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
              }}
            >
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedGRNs.map((grn) => (
            <GRNInventoryCard
              key={grn.id}
              grn={{
                id: grn.id,
                name: grn.name,
                grnNumber: grn.data.grnNumber || `GRN-${grn.id.substring(0, 8)}`,
                date: grn.createdAt,
                supplier: grn.data?.supplierName || 'Unknown Supplier',
                items: grn.data?.items || [],
                total: (grn.data?.items?.reduce((sum: number, item: any) => sum + (item.totalWithReceivingCost || 0), 0) || 0),
                status: grn.data?.status === 'cancelled' ? 'pending' : 
                  ['completed', 'pending', 'received', 'checked', 'approved', 'draft'].includes(grn.data?.status) ? 
                  grn.data?.status : 'pending',
                createdAt: grn.createdAt
              }}
              onViewDetails={() => onGRNView(grn)}
              onPrintGRN={() => onGRNPrint(grn)}
              onDownloadGRN={() => onGRNDownload(grn)}
              onDeleteGRN={() => onGRNDelete(grn)}
            />
          ))}
        </div>
      )}

      {/* Results Summary */}
      <Card>
        <CardContent className="py-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium">{filteredAndSortedGRNs.length}</span> of{" "}
              <span className="font-medium">{grns.length}</span> GRNs
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sort by:</span>
              <Select defaultValue="date-desc">
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">Date (Newest First)</SelectItem>
                  <SelectItem value="date-asc">Date (Oldest First)</SelectItem>
                  <SelectItem value="value-desc">Value (Highest First)</SelectItem>
                  <SelectItem value="value-asc">Value (Lowest First)</SelectItem>
                  <SelectItem value="items-desc">Items (Most First)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};