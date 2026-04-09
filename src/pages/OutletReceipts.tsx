import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Receipt,
  Eye,
  Printer,
  Loader2,
  Calendar,
  User,
  ShoppingCart
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getOutletSalesByOutletAndPaymentMethod, OutletSale, getOutletCustomerById, getOutletSaleItemsBySaleId } from "@/services/databaseService";
import { PrintUtils } from "@/utils/printUtils";

interface OutletReceiptsProps {
  onBack: () => void;
  outletId?: string;
}

interface ReceiptSale {
  id: string;
  invoiceNumber: string;
  date: string;
  customer: string;
  customerId?: string;
  items: { name: string; quantity: number; price: number }[];
  subtotal: number;
  tax: number;
  total: number;
  amountPaid: number;
  paymentMethod: string;
  status: string;
}

export const OutletReceipts = ({ onBack, outletId }: OutletReceiptsProps) => {
  const { toast } = useToast();
  const [sales, setSales] = useState<ReceiptSale[]>([]);
  const [selectedSale, setSelectedSale] = useState<ReceiptSale | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReceipts();
  }, [outletId]);

  const fetchReceipts = async () => {
    if (!outletId) return;
    
    setLoading(true);
    try {
      // Fetch all completed sales (receipts)
      const allPaymentMethods = ['cash', 'card', 'mobile'];
      let allSales: OutletSale[] = [];
      
      for (const method of allPaymentMethods) {
        const sales = await getOutletSalesByOutletAndPaymentMethod(outletId, method);
        // Filter only completed/paid sales
        const completedSales = sales.filter(sale => 
          sale.payment_status === 'paid' || sale.sale_status === 'completed'
        );
        allSales = [...allSales, ...completedSales];
      }
      
      // Enrich data with customer names and items
      const enrichedSales = await Promise.all(
        allSales.map(async (sale: OutletSale) => {
          let customerName = 'Walk-in Customer';
          if (sale.customer_id) {
            const customer = await getOutletCustomerById(sale.customer_id);
            if (customer) {
              customerName = `${customer.first_name} ${customer.last_name}`.trim();
            }
          }
          
          const saleItems = await getOutletSaleItemsBySaleId(sale.id || '');
          const itemsWithNames = saleItems.map((item) => ({
            name: item.product_name || 'Unknown Product',
            quantity: item.quantity,
            price: item.unit_price
          }));
          
          return {
            id: sale.id || '',
            invoiceNumber: sale.invoice_number || '',
            date: sale.sale_date || sale.created_at || '',
            customer: customerName,
            customerId: sale.customer_id,
            items: itemsWithNames,
            subtotal: sale.subtotal,
            tax: sale.tax_amount,
            total: sale.total_amount,
            amountPaid: sale.amount_paid || 0,
            paymentMethod: sale.payment_method,
            status: sale.payment_status
          };
        })
      );
      
      // Sort by date (newest first)
      enrichedSales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setSales(enrichedSales);
    } catch (error) {
      console.error('Error fetching receipts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch receipts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleView = (sale: ReceiptSale) => {
    setSelectedSale(sale);
    setIsViewDialogOpen(true);
  };

  const handlePrint = (sale: ReceiptSale) => {
    const transaction = {
      receiptNumber: sale.invoiceNumber,
      date: sale.date,
      items: sale.items,
      subtotal: sale.subtotal,
      tax: sale.tax,
      discount: 0,
      shipping: 0,
      adjustments: 0,
      total: sale.total,
      paymentMethod: sale.paymentMethod,
      amountPaid: sale.amountPaid,
      amountReceived: sale.amountPaid,
      debtPaymentAmount: 0,
      previousDebtBalance: 0,
      change: 0,
      customer: {
        name: sale.customer,
        phone: '',
        address: '',
        email: ''
      },
      salesman: 'Not Assigned',
      driver: 'Not Assigned',
      dueDate: sale.date
    };
    
    PrintUtils.printInvoice(transaction);
  };

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Receipt className="h-6 w-6" />
            Receipts
          </h1>
          <p className="text-muted-foreground">View and print completed sales receipts</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {sales.length} Receipts
        </Badge>
      </div>

      {/* Receipts List */}
      <div className="space-y-4">
        {loading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="h-12 w-12 mx-auto text-muted-foreground mb-4 animate-spin" />
              <h3 className="text-lg font-medium">Loading Receipts...</h3>
              <p className="text-muted-foreground">Fetching receipts from database</p>
            </CardContent>
          </Card>
        ) : sales.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Receipts Found</h3>
              <p className="text-muted-foreground">Completed sales receipts will appear here</p>
            </CardContent>
          </Card>
        ) : (
          sales.map((sale) => (
            <Card key={sale.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-semibold">{sale.invoiceNumber}</span>
                      <Badge className="bg-green-100 text-green-800">{sale.status}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span>{new Date(sale.date).toLocaleDateString()}</span>
                      <span className="mx-2">•</span>
                      <span>{sale.customer || 'Walk-in Customer'}</span>
                      <span className="mx-2">•</span>
                      <span>{sale.items.length} items</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">{formatCurrency(sale.total)}</p>
                    <div className="flex gap-2 mt-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleView(sale)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handlePrint(sale)}
                      >
                        <Printer className="h-4 w-4 mr-1" />
                        Print
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* View Receipt Dialog */}
      {selectedSale && (
        <div className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 ${isViewDialogOpen ? '' : 'hidden'}`}>
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Receipt Details
                </h2>
                <Button variant="outline" size="icon" onClick={() => setIsViewDialogOpen(false)}>
                  <span className="text-xl">×</span>
                </Button>
              </div>
              
              <div className="space-y-4">
                {/* Invoice Info */}
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Invoice Number</p>
                    <p className="font-semibold">{selectedSale.invoiceNumber}</p>
                  </div>
                  <Badge className="bg-green-100 text-green-800">{selectedSale.status}</Badge>
                </div>

                {/* Date & Customer */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Date</p>
                      <p className="text-sm font-medium">{new Date(selectedSale.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Customer</p>
                      <p className="text-sm font-medium">{selectedSale.customer || 'Walk-in Customer'}</p>
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">Items ({selectedSale.items.length})</p>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left py-2 px-3">Item</th>
                          <th className="text-right py-2 px-3">Qty</th>
                          <th className="text-right py-2 px-3">Price</th>
                          <th className="text-right py-2 px-3">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSale.items.map((item, index) => (
                          <tr key={index} className="border-t">
                            <td className="py-2 px-3">{item.name}</td>
                            <td className="text-right py-2 px-3">{item.quantity}</td>
                            <td className="text-right py-2 px-3">{formatCurrency(item.price)}</td>
                            <td className="text-right py-2 px-3">{formatCurrency(item.price * item.quantity)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Totals */}
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(selectedSale.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax (18%)</span>
                    <span>{formatCurrency(selectedSale.tax)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>Total</span>
                    <span className="text-green-600">{formatCurrency(selectedSale.total)}</span>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium">Payment Method</span>
                  <Badge className="bg-green-100 text-green-800 capitalize">
                    {selectedSale.paymentMethod}
                  </Badge>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <Button className="flex-1" onClick={() => handlePrint(selectedSale)}>
                    <Printer className="h-4 w-4 mr-2" />
                    Print Receipt
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => setIsViewDialogOpen(false)}>
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
