import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";
import { FileText, Calendar, User, Eye, Download, Trash2, Printer } from "lucide-react";

interface SupplierPurchaseNote {
  id: string;
  purchaseNoteNumber: string;
  date: string;
  supplierName: string;
  items: number;
  total: number;
  status: "draft" | "completed" | "cancelled";
}

interface SupplierPurchaseNoteCardProps {
  note: SupplierPurchaseNote;
  onViewDetails: () => void;
  onPrint: () => void;
  onDownload: () => void;
  onDelete: () => void;
  className?: string;
}

export const SupplierPurchaseNoteCard = ({ 
  note, 
  onViewDetails,
  onPrint,
  onDownload,
  onDelete,
  className 
}: SupplierPurchaseNoteCardProps) => {
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
              #{note.purchaseNoteNumber}
            </CardTitle>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <Calendar className="h-4 w-4" />
              {formatDate(note.date)}
            </p>
          </div>
          <Badge variant={getStatusVariant(note.status)}>
            {note.status.charAt(0).toUpperCase() + note.status.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm truncate">{note.supplierName || 'No supplier'}</span>
          </div>
          
          <div className="flex justify-between items-center pt-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{note.items} items</span>
            </div>
            <div className="font-bold">{formatCurrency(note.total)}</div>
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
              onClick={onDownload}
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={onDelete}
              title="Delete Note"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
