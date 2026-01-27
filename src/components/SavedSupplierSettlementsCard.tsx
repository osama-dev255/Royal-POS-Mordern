import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";
import { CreditCard, Calendar, User, FileText, Eye, Download, Trash2, Printer } from "lucide-react";

interface SavedSupplierSettlement {
  id: string;
  referenceNumber: string;
  date: string;
  supplierName: string;
  supplierPhone?: string;
  supplierEmail?: string;
  amount: number;
  paymentMethod: string;
  status: "completed" | "pending" | "cancelled";
  previousBalance?: number;
  amountPaid?: number;
  newBalance?: number;
}

interface SavedSupplierSettlementsCardProps {
  settlement: SavedSupplierSettlement;
  onViewDetails: () => void;
  onPrintSettlement: () => void;
  onDownloadSettlement: () => void;
  onDeleteSettlement: () => void;
  className?: string;
}

export const SavedSupplierSettlementsCard = ({ 
  settlement, 
  onViewDetails,
  onPrintSettlement,
  onDownloadSettlement,
  onDeleteSettlement,
  className 
}: SavedSupplierSettlementsCardProps) => {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "pending": 
        return "secondary";
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
              <CreditCard className="h-5 w-5 text-primary" />
              Settlement #{settlement.referenceNumber}
            </CardTitle>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <Calendar className="h-4 w-4" />
              {formatDate(settlement.date)}
            </p>
          </div>
          <Badge variant={getStatusVariant(settlement.status)}>
            {settlement.status.charAt(0).toUpperCase() + settlement.status.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm truncate">{settlement.supplierName}</span>
          </div>
          
          <div className="flex justify-between items-center pt-2">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{settlement.paymentMethod}</span>
            </div>
            <div className="font-bold">{formatCurrency(settlement.amount)}</div>
          </div>
          
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Amount Paid:</span>
            <span>{settlement.amountPaid !== undefined ? formatCurrency(settlement.amountPaid) : 'N/A'}</span>
          </div>
          
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">New Balance:</span>
            <span>{settlement.newBalance !== undefined ? formatCurrency(settlement.newBalance) : 'N/A'}</span>
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
              onClick={onPrintSettlement}
            >
              <Printer className="h-4 w-4 mr-1" />
              Print
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={onDownloadSettlement}
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={onDeleteSettlement}
              title="Delete Settlement"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};