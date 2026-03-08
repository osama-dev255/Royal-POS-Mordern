import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, Package, FileText, Printer, Download, Edit } from "lucide-react";
import { formatCurrency } from "@/lib/currency";

interface SalesOrderItem {
  id?: string;
  productId?: string;
  productName: string;
  quantity: number;
  unitPrice?: number;
  price?: number;
  total?: number;
  unit?: string;
}

interface SalesOrderDetailsProps {
  id: string;
  orderNumber: string;
  date: string;
  customer: string;
  items: SalesOrderItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  status: "pending" | "completed" | "cancelled";
  notes?: string;
  amountPaid?: number;
  creditBroughtForward?: number;
  amountDue?: number;
  onBack: () => void;
  onPrint?: () => void;
  onDownload?: () => void;
  onEdit?: () => void;
}

export const SalesOrderDetails = ({ 
  id, 
  orderNumber, 
  date, 
  customer, 
  items, 
  subtotal, 
  discount, 
  tax, 
  total, 
  status, 
  notes,
  amountPaid,
  creditBroughtForward,
  amountDue,
  onBack,
  onPrint,
  onDownload,
  onEdit
}: SalesOrderDetailsProps) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString();
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500 hover:bg-green-500";
      case "pending":
        return "bg-yellow-500 hover:bg-yellow-500";
      case "cancelled":
        return "bg-red-500 hover:bg-red-500";
      default:
        return "bg-gray-500 hover:bg-gray-500";
    }
  };

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      alert('Print functionality would be implemented here');
    }
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else {
      alert('Download functionality would be implemented here');
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit();
    } else {
      alert('Edit functionality would be implemented here');
    }
  };

  // Calculate missing financial values
  const calculatedAmountPaid = amountPaid !== undefined ? amountPaid : 0;
  const calculatedCreditBroughtForward = creditBroughtForward !== undefined ? creditBroughtForward : 0;
  const calculatedAmountDue = amountDue !== undefined ? amountDue : (total - calculatedAmountPaid + calculatedCreditBroughtForward);

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <FileText className="h-6 w-6" />
                Sales Order #{orderNumber}
              </CardTitle>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <Calendar className="h-4 w-4" />
                {formatDate(date)} at {formatTime(date)}
              </p>
            </div>
            <Badge className={getStatusVariant(status)}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Information */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer Information
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name:</span>
                  <span>{customer}</span>
                </div>
              </div>
            </div>

            {/* Order Information */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Information
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Items:</span>
                  <span>{items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-semibold">{formatCurrency(total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="capitalize">{status}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Order Notes */}
          {notes && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Notes
              </h3>
              <p className="text-muted-foreground bg-muted p-3 rounded-md">
                {notes}
              </p>
            </div>
          )}

          {/* Items List */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Package className="h-5 w-5" />
              Items
            </h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3">#</th>
                    <th className="text-left p-3">Product</th>
                    <th className="text-right p-3">Quantity</th>
                    <th className="text-left p-3">Unit</th>
                    <th className="text-right p-3">Rate</th>
                    <th className="text-right p-3">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.id || index} className={index % 2 === 0 ? "bg-muted/50" : ""}>
                      <td className="p-3">{index + 1}</td>
                      <td className="p-3">{item.productName}</td>
                      <td className="p-3 text-right">{item.quantity}</td>
                      <td className="p-3">{item.unit || 'pcs'}</td>
                      <td className="p-3 text-right">{formatCurrency(item.unitPrice ?? item.price ?? 0)}</td>
                      <td className="p-3 text-right">{formatCurrency(item.total ?? ((item.price ?? item.unitPrice ?? 0) * item.quantity))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="mt-4 flex justify-end">
              <div className="w-64 space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax:</span>
                  <span>{formatCurrency(tax)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount:</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
                <div className="flex justify-between font-bold pt-2 border-t">
                  <span>Total:</span>
                  <span>{formatCurrency(total)}</span>
                </div>
                
                {/* Payment details */}
                <div className="flex justify-between pt-2 border-t mt-2">
                  <span className="text-muted-foreground">Amount Paid:</span>
                  <span>{formatCurrency(calculatedAmountPaid)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Credit Brought Forward:</span>
                  <span>{formatCurrency(calculatedCreditBroughtForward)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>AMOUNT DUE:</span>
                  <span>{formatCurrency(calculatedAmountDue)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={onBack}>
              Back
            </Button>
            {onEdit && (
              <Button variant="outline" onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            {onPrint && (
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            )}
            {onDownload && (
              <Button variant="outline" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
