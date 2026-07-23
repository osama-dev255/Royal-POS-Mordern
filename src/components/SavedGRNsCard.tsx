import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";
import { Package, Calendar, User, Truck, Eye, Download, Trash2, Printer, Pencil } from "lucide-react";

interface SavedGRN {
  id: string;
  name: string;
  grnNumber: string;
  date: string;
  supplier: string;
  items: number;
  total: number;
  poNumber: string;
  status: "received" | "checked" | "approved" | "completed";
}

interface SavedGRNsCardProps {
  grn: SavedGRN;
  onViewDetails: () => void;
  onPrintGRN: () => void;
  onDownloadGRN: () => void;
  onDeleteGRN: () => void;
  onEditGRN?: () => void;
  className?: string;
}

export const SavedGRNsCard = ({ 
  grn, 
  onViewDetails,
  onPrintGRN,
  onDownloadGRN,
  onDeleteGRN,
  onEditGRN,
  className 
}: SavedGRNsCardProps) => {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case "completed":
      case "approved": 
        return "default";
      case "checked": 
        return "secondary";
      case "received": 
        return "outline";
      default: 
        return "default";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Card className={`hover:shadow-md transition-shadow ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              GRN #{grn.grnNumber}
            </CardTitle>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <Calendar className="h-4 w-4" />
              {formatDate(grn.date)}
            </p>
          </div>
          <Badge variant={getStatusVariant(grn.status)}>
            {grn.status.charAt(0).toUpperCase() + grn.status.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm truncate">{grn.supplier}</span>
          </div>
          
          <div className="flex justify-between items-center pt-2">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{grn.items} items</span>
            </div>
            <div className="font-bold">{formatCurrency(grn.total)}</div>
          </div>
          
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">PO:</span>
            <span>{grn.poNumber}</span>
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={onViewDetails}
            >
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
            {onEditGRN && (
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={onEditGRN}
              >
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={onPrintGRN}
            >
              <Printer className="h-4 w-4 mr-1" />
              Print
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={onDownloadGRN}
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={onDeleteGRN}
              title="Delete GRN"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};