import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Package, Filter, Download, Upload } from "lucide-react";
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

  // Filter GRNs based on search term and status
  const filteredGRNs = grns.filter(grn => {
    const matchesSearch = 
      grn.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      grn.data.grnNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (typeof grn.data === 'object' && 
       grn.data?.supplierName?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const grnStatus = typeof grn.data === 'object' ? grn.data?.status : 'pending';
    const matchesStatus = statusFilter === "all" || grnStatus === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              GRN Inventory Cards
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
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search GRNs by name, number, or supplier..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="w-full md:w-40">
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
          </div>
        </CardContent>
      </Card>

      {/* GRN Cards Grid */}
      {filteredGRNs.length === 0 ? (
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
          {filteredGRNs.map((grn) => (
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
              Showing <span className="font-medium">{filteredGRNs.length}</span> of{" "}
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