import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, Calendar, User, Package, MapPin, Phone, Mail, FileText, Printer, Download } from "lucide-react";
import { DeliveryData } from "@/utils/deliveryUtils";
import { formatCurrency } from "@/lib/currency";
import { ExportUtils } from "@/utils/exportUtils";

interface DeliveryDetailsProps {
  delivery: DeliveryData;
  onBack: () => void;
  onView?: () => void;
  onPrint?: () => void;
  onDownload?: () => void;
}

export const DeliveryDetails = ({ 
  delivery, 
  onBack,
  onPrint,
  onDownload
}: DeliveryDetailsProps) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      // Create a transaction object for printing
      const transaction = {
        id: delivery.id,
        receiptNumber: delivery.deliveryNoteNumber,
        date: delivery.date,
        items: delivery.itemsList || [],
        subtotal: delivery.subtotal || 0,
        tax: delivery.tax || 0,
        discount: delivery.discount || 0,
        total: delivery.total,
        paymentMethod: delivery.paymentMethod,
        amountReceived: delivery.amountReceived || delivery.total,
        change: delivery.change || 0,
        customer: { name: delivery.customer },
        vehicle: delivery.vehicle,
        driver: delivery.driver,
        deliveryNotes: delivery.deliveryNotes
      };
      
      // Use PrintUtils for printing
      import("@/utils/printUtils").then(({ PrintUtils }) => {
        PrintUtils.printReceipt(transaction);
      });
    }
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else {
      // Create a transaction object for PDF export
      const transaction = {
        id: delivery.id,
        receiptNumber: delivery.deliveryNoteNumber,
        date: delivery.date,
        items: delivery.itemsList || [],
        subtotal: delivery.subtotal || 0,
        tax: delivery.tax || 0,
        discount: delivery.discount || 0,
        total: delivery.total,
        paymentMethod: delivery.paymentMethod,
        amountReceived: delivery.amountReceived || delivery.total,
        change: delivery.change || 0,
        customer: { name: delivery.customer },
        vehicle: delivery.vehicle,
        driver: delivery.driver,
        deliveryNotes: delivery.deliveryNotes
      };
      
      ExportUtils.exportReceiptAsPDF(transaction, `delivery-${delivery.deliveryNoteNumber}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back
            </button>
            <h1 className="text-xl font-bold">Delivery Details</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      </div>

      <main className="container mx-auto p-4 sm:p-6">
        <Card className="max-w-4xl mx-auto">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Truck className="h-6 w-6 text-primary" />
                  Delivery #{delivery.deliveryNoteNumber}
                </CardTitle>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(delivery.date)}
                </p>
              </div>
              <Badge 
                className={`${
                  delivery.status === 'completed' || delivery.status === 'delivered' 
                    ? 'bg-green-500 hover:bg-green-500' 
                    : delivery.status === 'in-transit' 
                      ? 'bg-blue-500 hover:bg-blue-500' 
                      : delivery.status === 'pending' 
                        ? 'bg-yellow-500 hover:bg-yellow-500' 
                        : 'bg-red-500 hover:bg-red-500'
                }`}
              >
                {delivery.status.charAt(0).toUpperCase() + delivery.status.slice(1)}
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
                    <span>{delivery.customer}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Items:</span>
                    <span>{delivery.items}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total:</span>
                    <span className="font-semibold">{formatCurrency(delivery.total)}</span>
                  </div>
                </div>
              </div>

              {/* Delivery Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Delivery Information
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vehicle:</span>
                    <span>{delivery.vehicle || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Driver:</span>
                    <span>{delivery.driver || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment Method:</span>
                    <span>{delivery.paymentMethod || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Delivery Details */}
            {delivery.deliveryNotes && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Delivery Notes
                </h3>
                <p className="text-muted-foreground bg-muted p-3 rounded-md">
                  {delivery.deliveryNotes}
                </p>
              </div>
            )}

            {/* Items List */}
            {delivery.itemsList && delivery.itemsList.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">Items</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3">Product</th>
                        <th className="text-right p-3">Quantity</th>
                        <th className="text-right p-3">Price</th>
                        <th className="text-right p-3">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {delivery.itemsList.map((item: any, index: number) => (
                        <tr key={index} className={index % 2 === 0 ? "bg-muted/50" : ""}>
                          <td className="p-3">{item.name || item.productName}</td>
                          <td className="p-3 text-right">{item.quantity}</td>
                          <td className="p-3 text-right">{formatCurrency(item.price)}</td>
                          <td className="p-3 text-right">{formatCurrency(item.total || item.price * item.quantity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="mt-4 flex justify-end">
                  <div className="w-64 space-y-1">
                    {delivery.subtotal !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal:</span>
                        <span>{formatCurrency(delivery.subtotal)}</span>
                      </div>
                    )}
                    {delivery.tax !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tax:</span>
                        <span>{formatCurrency(delivery.tax)}</span>
                      </div>
                    )}
                    {delivery.discount !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Discount:</span>
                        <span>-{formatCurrency(delivery.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold pt-2 border-t">
                      <span>Total:</span>
                      <span>{formatCurrency(delivery.total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};