import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";
import { Truck, Calendar, User, Package, Eye, Download, Printer } from "lucide-react";

interface DeliveryItem {
  name?: string;
  productName?: string;
  quantity?: number;
  price?: number;
  unit?: string;
}

interface SavedDelivery {
  id: string;
  deliveryNoteNumber: string;
  date: string;
  customer: string;
  items: number;
  total: number;
  subtotal?: number;
  tax?: number;
  discount?: number;
  amountReceived?: number;
  change?: number;
  vehicle: string;
  driver: string;
  status: "completed" | "in-transit" | "pending" | "delivered" | "cancelled";
  outletId?: string;
  itemsList?: DeliveryItem[];
}

interface SavedDeliveriesCardProps {
  delivery: SavedDelivery;
  onViewDetails: () => void;
  onPrintDelivery: () => void;
  onDownloadDelivery: () => void;
  onDeleteDelivery: () => void;
  className?: string;
}

export const SavedDeliveriesCard = ({ 
  delivery, 
  onViewDetails,
  onPrintDelivery,
  onDownloadDelivery,
  onDeleteDelivery,
  className 
}: SavedDeliveriesCardProps) => {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case "completed":
      case "delivered": 
        return "default";
      case "in-transit": 
        return "secondary";
      case "pending": 
        return "outline";
      case "cancelled": 
        return "destructive";
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
              <Truck className="h-5 w-5 text-primary" />
              Delivery #{delivery.deliveryNoteNumber}
            </CardTitle>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <Calendar className="h-4 w-4" />
              {formatDate(delivery.date)}
            </p>
          </div>
          <Badge variant={getStatusVariant(delivery.status)}>
            {delivery.status.charAt(0).toUpperCase() + delivery.status.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm truncate">{delivery.customer}</span>
          </div>
          
          <div className="flex justify-between items-center pt-2">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{delivery.items} items</span>
            </div>
            <div className="font-bold">{formatCurrency(delivery.total)}</div>
          </div>
          
          {/* Items List Display */}
          {delivery.itemsList && delivery.itemsList.length > 0 && (
            <div className="border-t pt-2 mt-2">
              <div className="text-xs font-semibold text-muted-foreground mb-1">Products:</div>
              <div className="space-y-1 max-h-32 overflow-y-auto text-sm">
                {delivery.itemsList.map((item, index) => (
                  <div key={index} className="flex justify-between items-start gap-2 py-1 border-b border-dashed last:border-0">
                    <span className="text-xs flex-1 truncate font-medium text-gray-700">
                      {item.name || item.productName || 'N/A'}
                    </span>
                    <span className="text-xs font-semibold whitespace-nowrap text-primary">
                      {item.quantity || 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {delivery.subtotal !== undefined && delivery.subtotal !== 0 && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Subtotal:</span>
              <span>{formatCurrency(delivery.subtotal)}</span>
            </div>
          )}
          
          {delivery.tax !== undefined && delivery.tax !== 0 && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Tax:</span>
              <span>{formatCurrency(delivery.tax)}</span>
            </div>
          )}
          
          {delivery.discount !== undefined && delivery.discount !== 0 && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Discount:</span>
              <span>-{formatCurrency(delivery.discount)}</span>
            </div>
          )}
          
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Vehicle:</span>
            <span>{delivery.vehicle}</span>
          </div>
          
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Driver:</span>
            <span>{delivery.driver}</span>
          </div>
          
          {delivery.outletId && (
            <div className="flex justify-between items-center text-sm bg-blue-50 p-2 rounded">
              <span className="text-blue-700 font-medium">Outlet:</span>
              <span className="text-blue-700">{delivery.customer}</span>
            </div>
          )}
          
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
              onClick={onPrintDelivery}
            >
              <Printer className="h-4 w-4 mr-1" />
              Print
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={onDownloadDelivery}
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};