import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  ArrowLeft, 
  FileText,
  Eye,
  Trash2,
  Receipt,
  Calendar,
  User,
  ShoppingCart,
  Printer,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getOutletSalesByOutletAndPaymentMethod, deleteOutletSale, OutletSale, getOutletCustomerById, getOutletSaleItemsBySaleId } from "@/services/databaseService";

interface OutletSavedDebtsProps {
  onBack: () => void;
  outletId?: string;
}

interface SavedSale {
  id: string;
  invoiceNumber: string;
  date: string;
  customer: string;
  customerId?: string;
  items: { name: string; quantity: number; price: number }[];
  subtotal: number;
  tax: number;
  total: number;
  amountPaid?: number;
  amountReceived?: number;
  paymentMethod: string;
  status: string;
  creditBroughtForward?: number;
  adjustments?: number;
  adjustmentReason?: string;
}

export const OutletSavedDebts = ({ onBack, outletId }: OutletSavedDebtsProps) => {
  const { toast } = useToast();
  const [sales, setSales] = useState<SavedSale[]>([]);
  const [selectedSale, setSelectedSale] = useState<SavedSale | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSavedDebts();
  }, [outletId]);

  const fetchSavedDebts = async () => {
    if (!outletId) return;
    
    setLoading(true);
    try {
      // Fetch from outlet_sales table which has accurate payment data
      const data = await getOutletSalesByOutletAndPaymentMethod(outletId, 'debt');
      
      // Enrich data with customer names and item counts
      const enrichedSales = await Promise.all(
        data.map(async (sale: OutletSale) => {
          // Fetch customer name if customer_id exists
          let customerName = 'Walk-in Customer';
          if (sale.customer_id) {
            const customer = await getOutletCustomerById(sale.customer_id);
            if (customer) {
              customerName = `${customer.first_name} ${customer.last_name}`.trim();
            }
          }
          
          // Fetch item count for this sale
          const saleItems = await getOutletSaleItemsBySaleId(sale.id || '');
          
          return {
            id: sale.id || '',
            invoiceNumber: sale.invoice_number || '',
            date: sale.sale_date || sale.created_at || '',
            customer: customerName,
            customerId: sale.customer_id,
            items: saleItems.map(item => ({
              name: '', // Not needed for card view
              quantity: item.quantity,
              price: item.unit_price
            })),
            subtotal: sale.subtotal,
            tax: sale.tax_amount,
            total: sale.total_amount,
            amountPaid: sale.amount_paid || 0,
            amountReceived: sale.amount_received || 0,
            paymentMethod: sale.payment_method,
            status: sale.payment_status,
            creditBroughtForward: sale.credit_brought_forward || 0,
            adjustments: sale.adjustments || 0,
            adjustmentReason: sale.adjustment_reason
          };
        })
      );
      
      setSales(enrichedSales);
    } catch (error) {
      console.error('Error fetching saved debts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch saved debts",
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

  const handleView = (sale: SavedSale) => {
    setSelectedSale(sale);
    setIsViewDialogOpen(true);
  };

  const handlePrint = (sale: SavedSale) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const itemsHtml = sale.items.map(item => 
        `<tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.name}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${formatCurrency(item.price)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${formatCurrency(item.price * item.quantity)}</td>
        </tr>`
      ).join('');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Debt Invoice - ${sale.invoiceNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 400px; margin: 0 auto; }
            h2 { text-align: center; margin-bottom: 5px; }
            .header { text-align: center; margin-bottom: 20px; }
            .info { margin-bottom: 15px; }
            .info p { margin: 5px 0; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            th { background: #f5f5f5; padding: 8px; text-align: left; }
            .totals { margin-top: 15px; }
            .totals p { margin: 5px 0; display: flex; justify-content: space-between; }
            .total-row { font-weight: bold; font-size: 18px; border-top: 2px solid #000; padding-top: 10px; color: #dc2626; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            .payment-badge { display: inline-block; padding: 4px 12px; background: #fee2e2; color: #dc2626; border-radius: 4px; }
            .warning { background: #fef2f2; border: 1px solid #fecaca; padding: 10px; margin: 15px 0; border-radius: 4px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>DEBT INVOICE</h2>
            <p style="color: #666;">${sale.invoiceNumber}</p>
          </div>
          <div class="info">
            <p><strong>Date:</strong> ${sale.date}</p>
            <p><strong>Customer:</strong> ${sale.customer || 'Unknown Customer'}</p>
            <p><strong>Payment:</strong> <span class="payment-badge">Debt</span></p>
          </div>
          <div class="warning">
            <strong>OUTSTANDING BALANCE</strong>
          </div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <div class="totals">
            <p><span>Subtotal:</span><span>${formatCurrency(sale.subtotal)}</span></p>
            <p><span>Tax (18%):</span><span>${formatCurrency(sale.tax)}</span></p>
            <p class="total-row"><span>Total Debt:</span><span>${formatCurrency(sale.total)}</span></p>
          </div>
          <div class="footer">
            <p>Please settle this debt at your earliest convenience.</p>
            <p>Status: Outstanding</p>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleDelete = async (saleId: string) => {
    console.log('handleDelete called with saleId:', saleId);
    try {
      const success = await deleteOutletSale(saleId);
      console.log('deleteSavedSale result:', success);
      if (success) {
        const updatedSales = sales.filter(s => s.id !== saleId);
        setSales(updatedSales);
        toast({
          title: "Debt Deleted",
          description: "The debt record has been removed"
        });
        // Refresh the list to ensure sync with database
        await fetchSavedDebts();
      } else {
        toast({
          title: "Error",
          description: "Failed to delete debt record",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error deleting debt:', error);
      toast({
        title: "Error",
        description: "Failed to delete debt record",
        variant: "destructive"
      });
    }
  };

  const totalDebt = sales.reduce((sum, sale) => sum + sale.total, 0);

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Saved Debts
          </h1>
          <p className="text-muted-foreground">View and manage debt transactions</p>
        </div>
        <div className="text-right">
          <Badge variant="outline" className="text-lg px-4 py-2">
            {sales.length} Debts
          </Badge>
          <p className="text-sm text-muted-foreground mt-1">Total: {formatCurrency(totalDebt)}</p>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="h-12 w-12 mx-auto text-muted-foreground mb-4 animate-spin" />
              <h3 className="text-lg font-medium">Loading Debts...</h3>
              <p className="text-muted-foreground">Fetching debt records from database</p>
            </CardContent>
          </Card>
        ) : sales.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Saved Debts</h3>
              <p className="text-muted-foreground">Debt transactions will appear here after completion</p>
            </CardContent>
          </Card>
        ) : (
          sales.map((sale) => {
                // Calculate payment status
                const amountPaid = sale.amountPaid || 0;
                const total = sale.total || 0;
                const remaining = total - amountPaid;
                
                let statusBadge;
                if (amountPaid === 0) {
                  statusBadge = <Badge className="bg-red-100 text-red-800">Unpaid</Badge>;
                } else if (amountPaid > total) {
                  statusBadge = <Badge className="bg-blue-100 text-blue-800">Overpaid</Badge>;
                } else if (remaining === 0) {
                  statusBadge = <Badge className="bg-green-100 text-green-800">Paid</Badge>;
                } else {
                  statusBadge = <Badge className="bg-yellow-100 text-yellow-800">Partial</Badge>;
                }
                
                return (
            <Card key={sale.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-semibold">{sale.invoiceNumber}</span>
                      {statusBadge}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span>{sale.date}</span>
                      <span className="mx-2">•</span>
                      <span className="font-medium text-red-600">{sale.customer || 'Unknown Customer'}</span>
                      <span className="mx-2">•</span>
                      <span>{sale.items.length} items</span>
                    </div>
                    <div className="text-sm mt-1">
                      <span className="text-muted-foreground">Paid: {formatCurrency(amountPaid)}</span>
                      <span className="mx-2">•</span>
                      <span className={remaining > 0 ? 'text-red-600' : 'text-green-600'}>
                        {remaining > 0 ? `Due: ${formatCurrency(remaining)}` : 'Fully Paid'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-red-600">{formatCurrency(sale.total)}</p>
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
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleDelete(sale.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );})
        )}
      </div>

      {/* View Sale Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Transaction Details
            </DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-4">
              {/* Payment Reality Banner */}
              {(() => {
                const amountPaid = selectedSale.amountPaid || 0;
                const total = selectedSale.total || 0;
                const remaining = total - amountPaid;
                
                if (amountPaid === 0) {
                  return (
                    <div className="p-3 bg-red-100 border border-red-300 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-red-800">UNPAID - Full Debt</span>
                        <Badge className="bg-red-600 text-white">Outstanding</Badge>
                      </div>
                      <p className="text-sm text-red-700 mt-1">No payment received</p>
                    </div>
                  );
                } else if (amountPaid > total) {
                  const overpayment = amountPaid - total;
                  return (
                    <div className="p-3 bg-blue-100 border border-blue-300 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-blue-800">OVERPAID</span>
                        <Badge className="bg-blue-600 text-white">Credit</Badge>
                      </div>
                      <p className="text-sm text-blue-700 mt-1">
                        Paid: {formatCurrency(amountPaid)} / Overpayment: {formatCurrency(overpayment)}
                      </p>
                    </div>
                  );
                } else if (remaining === 0) {
                  return (
                    <div className="p-3 bg-green-100 border border-green-300 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-green-800">FULLY PAID</span>
                        <Badge className="bg-green-600 text-white">Completed</Badge>
                      </div>
                      <p className="text-sm text-green-700 mt-1">Payment completed</p>
                    </div>
                  );
                } else {
                  return (
                    <div className="p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-yellow-800">PARTIALLY PAID</span>
                        <Badge className="bg-yellow-600 text-white">Partial</Badge>
                      </div>
                      <p className="text-sm text-yellow-700 mt-1">
                        Paid: {formatCurrency(amountPaid)} / Remaining: {formatCurrency(remaining)}
                      </p>
                    </div>
                  );
                }
              })()}

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Invoice Number</p>
                  <p className="font-semibold">{selectedSale.invoiceNumber}</p>
                </div>
                <Badge className={selectedSale.amountPaid && selectedSale.amountPaid >= selectedSale.total ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {selectedSale.amountPaid && selectedSale.amountPaid >= selectedSale.total ? 'Paid' : selectedSale.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="text-sm font-medium">{selectedSale.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Customer</p>
                    <p className="text-sm font-medium text-red-600">{selectedSale.customer || 'Unknown Customer'}</p>
                  </div>
                </div>
              </div>

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

              <div className="space-y-2 pt-2 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(selectedSale.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax (18%)</span>
                  <span>{formatCurrency(selectedSale.tax)}</span>
                </div>
                {selectedSale.creditBroughtForward > 0 && (
                  <div className="flex justify-between text-sm text-orange-600">
                    <span>Credit Brought Forward</span>
                    <span>{formatCurrency(selectedSale.creditBroughtForward)}</span>
                  </div>
                )}
                {selectedSale.adjustments !== 0 && (
                  <div className="flex justify-between text-sm text-blue-600">
                    <span>Adjustments {selectedSale.adjustmentReason && `(${selectedSale.adjustmentReason})`}</span>
                    <span>{formatCurrency(selectedSale.adjustments)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total Amount</span>
                  <span>{formatCurrency(selectedSale.total)}</span>
                </div>
                
                {/* Payment Breakdown */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg space-y-2">
                  <p className="font-medium text-sm text-gray-700">Payment Breakdown</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Amount Paid</span>
                    <span className="font-medium text-green-600">{formatCurrency(selectedSale.amountPaid || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {selectedSale.amountPaid > selectedSale.total ? 'Credit Balance' : 'Remaining Balance'}
                    </span>
                    <span className={
                      selectedSale.amountPaid > selectedSale.total ? 'font-medium text-blue-600' :
                      selectedSale.total - (selectedSale.amountPaid || 0) > 0 ? 'font-medium text-red-600' : 
                      'font-medium text-green-600'
                    }>
                      {selectedSale.amountPaid > selectedSale.total 
                        ? formatCurrency(selectedSale.amountPaid - selectedSale.total)
                        : formatCurrency(Math.max(0, selectedSale.total - (selectedSale.amountPaid || 0)))
                      }
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">Payment Method</span>
                <Badge className={selectedSale.amountPaid && selectedSale.amountPaid >= selectedSale.total ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  <FileText className="h-3 w-3 mr-1" />
                  {selectedSale.amountPaid && selectedSale.amountPaid >= selectedSale.total ? 'Paid (was Debt)' : 'Debt'}
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
