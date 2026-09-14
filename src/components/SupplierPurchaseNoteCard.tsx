import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";
import { FileText, Calendar, User, Eye, Download, Trash2, Printer, Share2, CheckCircle, XCircle, Clock, ShieldCheck } from "lucide-react";

interface SupplierPurchaseNote {
  id: string;
  purchaseNoteNumber: string;
  date: string;
  supplierName: string;
  items: number;
  total: number;
  status: "draft" | "pending" | "approved" | "rejected" | "verified" | "completed" | "cancelled";
  approvedBy?: string;
  rejectedBy?: string;
  rejectedReason?: string;
  verifiedBy?: string;
}

interface SupplierPurchaseNoteCardProps {
  note: SupplierPurchaseNote;
  onViewDetails: () => void;
  onPrint: () => void;
  onDownload: () => void;
  onShare: () => void;
  onDelete: () => void;
  onStatusClick?: () => void;
  className?: string;
}

export const SupplierPurchaseNoteCard = ({ 
  note, 
  onViewDetails,
  onPrint,
  onDownload,
  onShare,
  onDelete,
  onStatusClick,
  className 
}: SupplierPurchaseNoteCardProps) => {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case "completed":
      case "approved":
      case "verified":
        return "default";
      case "cancelled":
      case "rejected":
        return "destructive";
      case "draft":
      case "pending":
        return "secondary";
      default: 
        return "default";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
      case "approved":
        return <CheckCircle className="h-3 w-3" />;
      case "verified":
        return <ShieldCheck className="h-3 w-3" />;
      case "rejected":
        return <XCircle className="h-3 w-3" />;
      case "pending":
      case "draft":
        return <Clock className="h-3 w-3" />;
      default:
        return null;
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
          <Badge 
            variant={getStatusVariant(note.status)}
            className={onStatusClick ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}
            onClick={onStatusClick}
          >
            <div className="flex items-center gap-1">
              {getStatusIcon(note.status)}
              {note.status.charAt(0).toUpperCase() + note.status.slice(1)}
            </div>
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm truncate">{note.supplierName || 'No supplier'}</span>
          </div>

          {(note.approvedBy || note.rejectedBy || note.verifiedBy) && (
            <p className="text-xs text-muted-foreground">
              {note.status === 'approved' && note.approvedBy && (
                <span>Approved by: <span className="font-medium text-green-600">{note.approvedBy}</span></span>
              )}
              {note.status === 'rejected' && note.rejectedBy && (
                <span>Rejected by: <span className="font-medium text-red-600">{note.rejectedBy}</span>{note.rejectedReason && <span className="italic"> — {note.rejectedReason}</span>}</span>
              )}
              {note.status === 'verified' && note.verifiedBy && (
                <span>Verified by: <span className="font-medium text-blue-600">{note.verifiedBy}</span></span>
              )}
            </p>
          )}
          
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
