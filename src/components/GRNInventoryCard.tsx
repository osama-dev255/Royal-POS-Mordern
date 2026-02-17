import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";
import { Package, Calendar, User, Truck, Eye, Download, Trash2, Printer, AlertTriangle } from "lucide-react";

interface GRNItem {
  id?: string;
  description: string;
  quantity: number;
  delivered: number;
  soldout?: number;
  rejectedOut?: number;
  rejectionIn?: number;
  damaged?: number;
  complimentary?: number;
  physicalStock?: number;
  available?: number;
  unit: string;
  originalUnitCost?: number;
  receivingCostPerUnit?: number;
  unitCost?: number;
  totalWithReceivingCost?: number;
  batchNumber?: string;
  expiryDate?: string;
  remarks?: string;
  rate?: number;
}

interface GRNInventoryCardProps {
  grn: {
    id: string;
    name: string;
    grnNumber: string;
    date: string;
    supplier: string;
    items: GRNItem[];
    total: number;
    status: "received" | "checked" | "approved" | "completed" | "pending" | "draft";
    createdAt: string;
  };
  onViewDetails: () => void;
  onPrintGRN: () => void;
  onDownloadGRN: () => void;
  onDeleteGRN: () => void;
  className?: string;
}

export const GRNInventoryCard = ({ 
  grn, 
  onViewDetails,
  onPrintGRN,
  onDownloadGRN,
  onDeleteGRN,
  className 
}: GRNInventoryCardProps) => {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case "completed":
      case "approved": 
        return "default";
      case "checked": 
        return "secondary";
      case "received": 
      case "pending":
        return "outline";
      case "draft":
        return "destructive";
      default: 
        return "default";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Calculate inventory metrics
  const totalItems = grn.items.length;
  const totalDelivered = grn.items.reduce((sum, item) => sum + (item.delivered || 0), 0);
  const totalValue = grn.items.reduce((sum, item) => sum + (item.totalWithReceivingCost || 0), 0);
  const itemsWithIssues = grn.items.filter(item => 
    (item.damaged && item.damaged > 0) || 
    (item.rejectedOut && item.rejectedOut > 0) ||
    (item.expiryDate && new Date(item.expiryDate) < new Date())
  ).length;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-semibold">{grn.name}</CardTitle>
            <p className="text-sm text-muted-foreground">GRN #{grn.grnNumber}</p>
          </div>
          <Badge variant={getStatusVariant(grn.status)}>
            {grn.status.charAt(0).toUpperCase() + grn.status.slice(1)}
          </Badge>
        </div>
        <div className="flex items-center text-sm text-muted-foreground mt-1">
          <Calendar className="h-4 w-4 mr-1" />
          <span>{formatDate(grn.date)}</span>
          <User className="h-4 w-4 ml-3 mr-1" />
          <span>{grn.supplier}</span>
        </div>
      </CardHeader>
      <CardContent>
        {/* Inventory Metrics */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center">
            <Package className="h-4 w-4 text-muted-foreground mr-2" />
            <div>
              <p className="text-sm font-medium">{totalItems} Items</p>
              <p className="text-xs text-muted-foreground">Total products</p>
            </div>
          </div>
          <div className="flex items-center">
            <Truck className="h-4 w-4 text-muted-foreground mr-2" />
            <div>
              <p className="text-sm font-medium">{totalDelivered} Delivered</p>
              <p className="text-xs text-muted-foreground">Units received</p>
            </div>
          </div>
          <div className="flex items-center">
            <Printer className="h-4 w-4 text-muted-foreground mr-2" />
            <div>
              <p className="text-sm font-medium">{formatCurrency(totalValue)}</p>
              <p className="text-xs text-muted-foreground">Total value</p>
            </div>
          </div>
          <div className="flex items-center">
            {itemsWithIssues > 0 ? (
              <>
                <AlertTriangle className="h-4 w-4 text-yellow-500 mr-2" />
                <div>
                  <p className="text-sm font-medium text-yellow-600">{itemsWithIssues} Issues</p>
                  <p className="text-xs text-muted-foreground">Items with problems</p>
                </div>
              </>
            ) : (
              <>
                <Package className="h-4 w-4 text-muted-foreground mr-2" />
                <div>
                  <p className="text-sm font-medium text-green-600">No Issues</p>
                  <p className="text-xs text-muted-foreground">All items OK</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Quick Stats Preview */}
        <div className="mb-4">
          <h4 className="text-sm font-medium mb-2">Item Preview</h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {grn.items.slice(0, 3).map((item, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="truncate max-w-[140px]">{item.description}</span>
                <span className="font-medium">
                  {item.delivered} {item.unit} • {formatCurrency(item.unitCost || 0)}
                </span>
              </div>
            ))}
            {grn.items.length > 3 && (
              <div className="text-xs text-muted-foreground text-center pt-1">
                +{grn.items.length - 3} more items...
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between space-x-2">
          <Button variant="outline" size="sm" onClick={onViewDetails}>
            <Eye className="h-4 w-4 mr-1" />
            View Details
          </Button>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={onPrintGRN}>
              <Printer className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={onDownloadGRN}>
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={onDeleteGRN} className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};