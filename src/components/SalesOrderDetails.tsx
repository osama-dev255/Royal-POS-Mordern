import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/currency";
import { Receipt, Calendar, User, ShoppingCart, Printer, Mail } from "lucide-react";
import { PrintUtils } from "@/utils/printUtils";
import WhatsAppUtils from "@/utils/whatsappUtils";

interface SalesItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface SalesOrderDetailsProps {
  id: string;
  date: string;
  customer: {
    name: string;
    email?: string;
    phone?: string;
  };
  items: SalesItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: string;
  status: "completed" | "refunded" | "pending" | "cancelled";
  notes?: string;
  onBack: () => void;
  onPrint?: () => void;
  onSendReceipt?: () => void;
}

export const SalesOrderDetails = ({ 
  id, 
  date, 
  customer, 
  items, 
  subtotal, 
  discount, 
  tax, 
  total, 
  paymentMethod, 
  status,
  notes,
  onBack,
  onPrint,
  onSendReceipt
}: SalesOrderDetailsProps) => {
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

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      // Create a transaction object for printing
      const transaction = {
        id,
        date,
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.unitPrice,
          quantity: item.quantity
        })),
        subtotal,
        tax,
        discount,
        total,
        paymentMethod,
        customer: customer.name
      };
      PrintUtils.printReceipt(transaction);
    }
  };

  const handleSendReceipt = () => {
    if (onSendReceipt) {
      onSendReceipt();
    } else {
      // Send WhatsApp message with receipt details
      const message = WhatsAppUtils.generateSalesReceiptMessage(
        id,
        date,
        customer.name,
        items,
        subtotal,
        discount,
        tax,
        total,
        paymentMethod
      );
      
      if (customer.phone) {
        WhatsAppUtils.sendWhatsAppMessage(customer.phone, message);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={onBack}>
          ← Back to Orders
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print Receipt
          </Button>
          {customer.phone && (
            <Button variant="outline" onClick={handleSendReceipt}>
              <Mail className="h-4 w-4 mr-2" />
              Send Receipt
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Receipt className="h-6 w-6 text-primary" />
                Sales Order #{id.substring(0, 8)}
              </CardTitle>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <Calendar className="h-4 w-4" />
                {formatDate(date)}
              </p>
            </div>
            <Badge variant={getStatusVariant(status)} className="self-start sm:self-center">
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Customer Information */}
          <div>
            <h3 className="font-semibold text-lg mb-2">Customer Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {customer.name}
                </p>
              </div>
              {customer.email && (
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{customer.email}</p>
                </div>
              )}
              {customer.phone && (
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{customer.phone}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Order Items */}
          <div>
            <h3 className="font-semibold text-lg mb-2">Order Items</h3>
            <div className="border rounded-lg">
              <div className="grid grid-cols-12 gap-2 p-3 bg-muted font-medium text-sm">
                <div className="col-span-6">Product</div>
                <div className="col-span-2 text-center">Quantity</div>
                <div className="col-span-2 text-right">Price</div>
                <div className="col-span-2 text-right">Total</div>
              </div>
              <div className="divide-y">
                {items.map((item) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 p-3">
                    <div className="col-span-6">
                      <p className="font-medium">{item.name}</p>
                    </div>
                    <div className="col-span-2 text-center">{item.quantity}</div>
                    <div className="col-span-2 text-right">{formatCurrency(item.unitPrice)}</div>
                    <div className="col-span-2 text-right font-medium">{formatCurrency(item.totalPrice)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          {/* Payment Summary */}
          <div>
            <h3 className="font-semibold text-lg mb-2">Payment Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="text-green-600">-{formatCurrency(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax (18%)</span>
                  <span>{formatCurrency(tax)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
              
              <div className="space-y-2 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Payment Method</p>
                  <p className="font-medium capitalize">{paymentMethod}</p>
                </div>
                {notes && (
                  <div>
                    <p className="text-sm text-muted-foreground">Notes</p>
                    <p className="font-medium">{notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};