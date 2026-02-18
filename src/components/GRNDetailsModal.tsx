import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Package, 
  Calendar, 
  User, 
  Truck, 
  Printer, 
  Download, 
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText
} from "lucide-react";
import { SavedGRN } from "@/utils/grnUtils";
import { formatCurrency } from "@/lib/currency";

interface GRNDetailsModalProps {
  grn: SavedGRN;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPrint: (grn: SavedGRN) => void;
  onDownload: (grn: SavedGRN) => void;
}

export const GRNDetailsModal = ({ 
  grn, 
  open, 
  onOpenChange,
  onPrint,
  onDownload
}: GRNDetailsModalProps) => {
  const [activeTab, setActiveTab] = useState<"details" | "items" | "notes">("details");

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "checked":
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case "received":
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "draft":
        return <FileText className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

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
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const items = Array.isArray(grn.data.items) ? grn.data.items : [];
  const totalItems = items.length;
  const totalQuantity = items.reduce((sum, item) => sum + (item.delivered || item.quantity || 0), 0);
  const totalValue = items.reduce((sum, item) => 
    sum + (item.totalWithReceivingCost || item.total || 0), 0
  );

  const itemsWithIssues = items.filter(item => 
    (item.damaged && item.damaged > 0) || 
    (item.rejectedOut && item.rejectedOut > 0) ||
    (item.rejectionIn && item.rejectionIn > 0) ||
    (item.expiryDate && new Date(item.expiryDate) < new Date())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-2xl">GRN Details</DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-lg font-semibold">
                  {grn.data.grnNumber || `GRN-${grn.id.substring(0, 8)}`}
                </span>
                <Badge variant={getStatusVariant(grn.data.status || "pending")}>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(grn.data.status || "pending")}
                    {grn.data.status?.charAt(0).toUpperCase() + (grn.data.status?.slice(1) || "Pending")}
                  </div>
                </Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onPrint(grn)}>
                <Printer className="h-4 w-4 mr-1" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={() => onDownload(grn)}>
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex border-b">
          <Button
            variant={activeTab === "details" ? "default" : "ghost"}
            className="rounded-none"
            onClick={() => setActiveTab("details")}
          >
            <FileText className="h-4 w-4 mr-2" />
            Details
          </Button>
          <Button
            variant={activeTab === "items" ? "default" : "ghost"}
            className="rounded-none"
            onClick={() => setActiveTab("items")}
          >
            <Package className="h-4 w-4 mr-2" />
            Items ({totalItems})
          </Button>
          <Button
            variant={activeTab === "notes" ? "default" : "ghost"}
            className="rounded-none"
            onClick={() => setActiveTab("notes")}
          >
            <FileText className="h-4 w-4 mr-2" />
            Notes
          </Button>
        </div>

        <ScrollArea className="h-[60vh]">
          {activeTab === "details" && (
            <div className="space-y-6 p-1">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Items Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Total Items:</span>
                        <span className="font-medium">{totalItems}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Total Quantity:</span>
                        <span className="font-medium">{totalQuantity}</span>
                      </div>
                      {itemsWithIssues.length > 0 && (
                        <div className="flex justify-between text-yellow-600">
                          <span className="text-sm">Items with Issues:</span>
                          <span className="font-medium">{itemsWithIssues.length}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Financial Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Total Value:</span>
                        <span className="font-medium">{formatCurrency(totalValue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Status:</span>
                        <Badge variant={getStatusVariant(grn.data.status || "pending")}>
                          {grn.data.status?.charAt(0).toUpperCase() + (grn.data.status?.slice(1) || "Pending")}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Timeline</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Created</p>
                          <p className="text-xs text-muted-foreground">{formatDate(grn.createdAt)}</p>
                        </div>
                      </div>
                      {grn.data.receivedDate && (
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">Received</p>
                            <p className="text-xs text-muted-foreground">{formatDate(grn.data.receivedDate)}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Supplier Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Supplier Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Supplier Details</h4>
                    <div className="space-y-1">
                      <p className="text-sm">
                        <span className="text-muted-foreground">Name:</span>{" "}
                        <span className="font-medium">{grn.data.supplierName || "N/A"}</span>
                      </p>
                      {grn.data.supplierId && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">ID:</span>{" "}
                          <span className="font-medium">{grn.data.supplierId}</span>
                        </p>
                      )}
                      {grn.data.supplierPhone && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Phone:</span>{" "}
                          <span className="font-medium">{grn.data.supplierPhone}</span>
                        </p>
                      )}
                      {grn.data.supplierEmail && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Email:</span>{" "}
                          <span className="font-medium">{grn.data.supplierEmail}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2">Business Information</h4>
                    <div className="space-y-1">
                      <p className="text-sm">
                        <span className="text-muted-foreground">Business Name:</span>{" "}
                        <span className="font-medium">{grn.data.businessName || "N/A"}</span>
                      </p>
                      {grn.data.poNumber && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">PO Number:</span>{" "}
                          <span className="font-medium">{grn.data.poNumber}</span>
                        </p>
                      )}
                      {grn.data.deliveryNoteNumber && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Delivery Note:</span>{" "}
                          <span className="font-medium">{grn.data.deliveryNoteNumber}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Logistics Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Logistics Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Delivery Details</h4>
                    <div className="space-y-1">
                      {grn.data.vehicleNumber && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Vehicle:</span>{" "}
                          <span className="font-medium">{grn.data.vehicleNumber}</span>
                        </p>
                      )}
                      {grn.data.driverName && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Driver:</span>{" "}
                          <span className="font-medium">{grn.data.driverName}</span>
                        </p>
                      )}
                      {grn.data.receivedBy && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Received By:</span>{" "}
                          <span className="font-medium">{grn.data.receivedBy}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2">Status Information</h4>
                    <div className="space-y-1">
                      <p className="text-sm">
                        <span className="text-muted-foreground">Status:</span>{" "}
                        <Badge variant={getStatusVariant(grn.data.status || "pending")}>
                          {grn.data.status?.charAt(0).toUpperCase() + (grn.data.status?.slice(1) || "Pending")}
                        </Badge>
                      </p>
                      {grn.data.preparedBy && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Prepared By:</span>{" "}
                          <span className="font-medium">{grn.data.preparedBy}</span>
                        </p>
                      )}
                      {grn.data.checkedBy && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Checked By:</span>{" "}
                          <span className="font-medium">{grn.data.checkedBy}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "items" && (
            <div className="p-1">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Ordered</TableHead>
                    <TableHead className="text-right">Delivered</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => {
                    const hasIssues = (item.damaged && item.damaged > 0) || 
                                    (item.rejectedOut && item.rejectedOut > 0) ||
                                    (item.rejectionIn && item.rejectionIn > 0);
                    
                    return (
                      <TableRow key={index} className={hasIssues ? "bg-yellow-50" : ""}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.description}</div>
                            {item.batchNumber && (
                              <div className="text-xs text-muted-foreground">
                                Batch: {item.batchNumber}
                              </div>
                            )}
                            {item.expiryDate && (
                              <div className="text-xs text-muted-foreground">
                                Expires: {new Date(item.expiryDate).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{item.quantity || 0}</TableCell>
                        <TableCell className="text-right">{item.delivered || 0}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.receivingCostPerUnit || item.unitCost || 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.totalWithReceivingCost || item.total || 0)}
                        </TableCell>
                        <TableCell>
                          {hasIssues ? (
                            <Badge variant="destructive" className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Issues
                            </Badge>
                          ) : (
                            <Badge variant="default">OK</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              
              {items.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No items found in this GRN</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "notes" && (
            <div className="space-y-6 p-1">
              <Card>
                <CardHeader>
                  <CardTitle>Quality Check Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  {grn.data.qualityCheckNotes ? (
                    <p className="text-sm whitespace-pre-wrap">{grn.data.qualityCheckNotes}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">No quality check notes recorded</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Discrepancies</CardTitle>
                </CardHeader>
                <CardContent>
                  {grn.data.discrepancies ? (
                    <p className="text-sm whitespace-pre-wrap text-yellow-700">{grn.data.discrepancies}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">No discrepancies reported</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Additional Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-1">Quality Check Notes</h4>
                      {grn.data.qualityCheckNotes ? (
                        <p className="text-sm whitespace-pre-wrap">{grn.data.qualityCheckNotes}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground">No quality check notes recorded</p>
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-1">Discrepancies</h4>
                      {grn.data.discrepancies ? (
                        <p className="text-sm whitespace-pre-wrap text-yellow-700">{grn.data.discrepancies}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground">No discrepancies reported</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};