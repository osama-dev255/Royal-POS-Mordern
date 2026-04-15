import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  ArrowLeft, 
  Smartphone,
  Eye,
  Trash2,
  Receipt,
  Calendar,
  User,
  ShoppingCart,
  Printer,
  Loader2,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getSavedSalesByOutletAndPaymentMethod, deleteSavedSale, SavedSale as DatabaseSavedSale } from "@/services/databaseService";

interface OutletSavedMobileSalesProps {
  onBack: () => void;
  outletId?: string;
}

interface SavedSale {
  id: string;
  invoiceNumber: string;
  date: string;
  customer: string;
  items: { name: string; quantity: number; price: number }[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  status: string;
}

export const OutletSavedMobileSales = ({ onBack, outletId }: OutletSavedMobileSalesProps) => {
  const { toast } = useToast();
  const [sales, setSales] = useState<SavedSale[]>([]);
  const [selectedSale, setSelectedSale] = useState<SavedSale | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Date range filter
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchSavedMobileSales();
  }, [outletId]);

  const fetchSavedMobileSales = async () => {
    if (!outletId) return;
    
    setLoading(true);
    try {
      const data = await getSavedSalesByOutletAndPaymentMethod(outletId, 'mobile');
      // Map database format to component format
      const mappedSales: SavedSale[] = data.map((sale: DatabaseSavedSale) => ({
        id: sale.id || '',
        invoiceNumber: sale.invoice_number,
        date: sale.sale_date || sale.created_at || '',
        customer: sale.customer || 'Unknown',
        items: sale.items || [],
        subtotal: sale.subtotal,
        tax: sale.tax,
        total: sale.total,
        paymentMethod: sale.payment_method,
        status: sale.status
      }));
      setSales(mappedSales);
    } catch (error) {
      console.error('Error fetching saved mobile sales:', error);
      toast({
        title: "Error",
        description: "Failed to fetch saved mobile sales",
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
          <title>Receipt - ${sale.invoiceNumber}</title>
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
            .total-row { font-weight: bold; font-size: 18px; border-top: 2px solid #000; padding-top: 10px; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            .payment-badge { display: inline-block; padding: 4px 12px; background: #f3e8ff; color: #7c3aed; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>SALES RECEIPT</h2>
            <p style="color: #666;">${sale.invoiceNumber}</p>
          </div>
          <div class="info">
            <p><strong>Date:</strong> ${sale.date}</p>
            <p><strong>Customer:</strong> ${sale.customer || 'Walk-in Customer'}</p>
            <p><strong>Payment:</strong> <span class="payment-badge">Mobile Money</span></p>
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
            <p class="total-row"><span>Total:</span><span>${formatCurrency(sale.total)}</span></p>
          </div>
          <div class="footer">
            <p>Thank you for your purchase!</p>
            <p>Payment Method: Mobile Money</p>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleDelete = async (saleId: string) => {
    try {
      const success = await deleteSavedSale(saleId);
      if (success) {
        const updatedSales = sales.filter(s => s.id !== saleId);
        setSales(updatedSales);
        toast({
          title: "Sale Deleted",
          description: "The mobile money sale has been removed"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to delete sale record",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error deleting sale:', error);
      toast({
        title: "Error",
        description: "Failed to delete sale record",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Smartphone className="h-6 w-6" />
            Saved Mobile Money Sales
          </h1>
          <p className="text-muted-foreground">View and manage saved mobile money transactions</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {sales.length} Sales
        </Badge>
      </div>

      <div className="space-y-4">
        {/* Date Range Filter - Right Aligned */}
        <div className="flex justify-end">
          <Card className="w-auto">
            <CardContent className="p-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-8 w-[140px]"
                  placeholder="From"
                />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-8 w-[140px]"
                  placeholder="To"
                />
                {(startDate || endDate) && (
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {loading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="h-12 w-12 mx-auto text-muted-foreground mb-4 animate-spin" />
              <h3 className="text-lg font-medium">Loading Mobile Money Sales...</h3>
              <p className="text-muted-foreground">Fetching mobile money sales from database</p>
            </CardContent>
          </Card>
        ) : sales.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Smartphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Saved Mobile Money Sales</h3>
              <p className="text-muted-foreground">Mobile money transactions will appear here after completion</p>
            </CardContent>
          </Card>
        ) : (
          // Filter sales by date range if set
          (() => {
            const filteredSales = sales.filter(sale => {
              if (!startDate && !endDate) return true;
              
              const saleDate = new Date(sale.date);
              
              if (startDate && saleDate < new Date(startDate)) return false;
              if (endDate) {
                const endDateTime = new Date(endDate);
                endDateTime.setHours(23, 59, 59, 999);
                if (saleDate > endDateTime) return false;
              }
              
              return true;
            });
            
            return filteredSales.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No sales found for selected period</h3>
                  <p className="text-muted-foreground">Try adjusting the date range</p>
                </CardContent>
              </Card>
            ) : (
              filteredSales.map((sale) => (
            <Card key={sale.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-semibold">{sale.invoiceNumber}</span>
                      <Badge className="bg-purple-100 text-purple-800">{sale.status}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span>{sale.date}</span>
                      <span className="mx-2">•</span>
                      <span>{sale.customer || 'Walk-in Customer'}</span>
                      <span className="mx-2">•</span>
                      <span>{sale.items.length} items</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-purple-600">{formatCurrency(sale.total)}</p>
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
          ))
            )
          })()
        )}
      </div>

      {/* View Sale Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Sale Details
            </DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Invoice Number</p>
                  <p className="font-semibold">{selectedSale.invoiceNumber}</p>
                </div>
                <Badge className="bg-purple-100 text-purple-800">{selectedSale.status}</Badge>
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
                    <p className="text-sm font-medium">{selectedSale.customer || 'Walk-in Customer'}</p>
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
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total</span>
                  <span className="text-purple-600">{formatCurrency(selectedSale.total)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <span className="text-sm font-medium">Payment Method</span>
                <Badge className="bg-purple-100 text-purple-800">
                  <Smartphone className="h-3 w-3 mr-1" />
                  Mobile Money
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
