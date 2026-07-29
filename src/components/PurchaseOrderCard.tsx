import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";
import { FileText, Calendar, User, Eye, Download, Trash2, Printer, Share2 } from "lucide-react";

interface PurchaseOrder {
  id: string;
  poNumber: string;
  date: string;
  supplierName: string;
  items: number;
  total: number;
  status: "draft" | "completed" | "cancelled";
}

interface PurchaseOrderCardProps {
  order: PurchaseOrder;
  onViewDetails: () => void;
  onPrint: () => void;
  onDownload: () => void;
  onShare: () => void;
  onDelete: () => void;
  className?: string;
}

export const PurchaseOrderCard = ({ 
  order, 
  onViewDetails,
  onPrint,
  onDownload,
  onShare,
  onDelete,
  className 
}: PurchaseOrderCardProps) => {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case "completed": 
        return "default";
      case "cancelled": 
        return "destructive";
      case "draft": 
        return "secondary";
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
              <FileText className="h-5 w-5 text-primary" />
              #{order.poNumber}
            </CardTitle>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <Calendar className="h-4 w-4" />
              {formatDate(order.date)}
            </p>
          </div>
          <Badge variant={getStatusVariant(order.status)}>
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm truncate">{order.supplierName || 'No supplier'}</span>
          </div>
          
          <div className="flex justify-between items-center pt-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{order.items} items</span>
            </div>
            <div className="font-bold">{formatCurrency(order.total)}</div>
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
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={onPrint}
            >
              <Printer className="h-4 w-4 mr-1" />
              Print
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={onShare}
            >
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={onDelete}
              title="Delete Order"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
