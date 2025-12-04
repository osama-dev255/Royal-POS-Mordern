import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";
import { Receipt, Calendar, User, ShoppingCart, Eye } from "lucide-react";

interface SalesOrderCardProps {
  id: string;
  date: string;
  customer: string;
  items: number;
  total: number;
  paymentMethod: string;
  status: "completed" | "refunded" | "pending" | "cancelled";
  onViewDetails: () => void;
  onPrintReceipt?: () => void;
  className?: string;
}

export const SalesOrderCard = ({ 
  id, 
  date, 
  customer, 
  items, 
  total, 
  paymentMethod, 
  status,
  onViewDetails,
  onPrintReceipt,
  className 
}: SalesOrderCardProps) => {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case "completed": return "default";
      case "refunded": return "destructive";
      case "pending": return "secondary";
      case "cancelled": return "outline";
      default: return "default";
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
              <Receipt className="h-5 w-5 text-primary" />
              Order #{id.substring(0, 8)}
            </CardTitle>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <Calendar className="h-4 w-4" />
              {formatDate(date)}
            </p>
          </div>
          <Badge variant={getStatusVariant(status)}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm truncate">{customer}</span>
          </div>
          
          <div className="flex justify-between items-center pt-2">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{items} items</span>
            </div>
            <div className="font-bold">{formatCurrency(total)}</div>
          </div>
          
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Payment:</span>
            <span className="capitalize">{paymentMethod}</span>
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
            {onPrintReceipt && (
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={onPrintReceipt}
              >
                Print
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};