import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, 
  Receipt,
  Eye,
  Printer,
  Loader2,
  Calendar,
  User,
  ShoppingCart,
  Plus,
  Trash2,
  Save,
  DollarSign,
  Briefcase,
  Percent,
  FileText,
  TrendingUp
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
  type: 'sales' | 'commission' | 'other';
}

export const OutletReceipts = ({ onBack, outletId }: OutletReceiptsProps) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'all' | 'sales' | 'commission' | 'other'>('all');
  const [showNewForm, setShowNewForm] = useState(false);
  const [receipts, setReceipts] = useState<ReceiptSale[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptSale | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Commission receipt form
  const [commissionFrom, setCommissionFrom] = useState('');
  const [commissionDescription, setCommissionDescription] = useState('');
  const [commissionAmount, setCommissionAmount] = useState(0);
  const [commissionDate, setCommissionDate] = useState(new Date().toISOString().split('T')[0]);
  const [commissionPaymentMethod, setCommissionPaymentMethod] = useState<'cash' | 'card' | 'mobile'>('cash');
  const [commissionNotes, setCommissionNotes] = useState('');
  
  // Other receipt form
  const [otherReceiptTitle, setOtherReceiptTitle] = useState('');
  const [otherReceiptDescription, setOtherReceiptDescription] = useState('');
  const [otherReceiptAmount, setOtherReceiptAmount] = useState(0);
  const [otherReceiptDate, setOtherReceiptDate] = useState(new Date().toISOString().split('T')[0]);
  const [otherReceiptPaymentMethod, setOtherReceiptPaymentMethod] = useState<'cash' | 'card' | 'mobile'>('cash');
  const [otherReceiptNotes, setOtherReceiptNotes] = useState('');

  useEffect(() => {
    fetchReceipts();
  }, [outletId, activeTab]);

  const fetchReceipts = async () => {
    if (!outletId) return;
    
    setLoading(true);
    try {
      // Fetch sales receipts from database
      const allPaymentMethods = ['cash', 'card', 'mobile'];
      let allSales: OutletSale[] = [];
      
      for (const method of allPaymentMethods) {
        const sales = await getOutletSalesByOutletAndPaymentMethod(outletId, method);
        const completedSales = sales.filter(sale => 
          sale.payment_status === 'paid' || sale.sale_status === 'completed'
        );
        allSales = [...allSales, ...completedSales];
      }
      
      // Enrich sales data
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
            status: sale.payment_status,
            type: 'sales' as const
          };
        })
      );
      
      // Load commission receipts from localStorage
      const commissionReceipts = JSON.parse(localStorage.getItem('commission_receipts') || '[]');
      
      // Load other receipts from localStorage
      const otherReceipts = JSON.parse(localStorage.getItem('other_receipts') || '[]');
      
      // Combine all receipts
      const allReceipts = [...enrichedSales, ...commissionReceipts, ...otherReceipts];
      
      // Sort by date (newest first)
      allReceipts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setReceipts(allReceipts);
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

  const handleView = (receipt: ReceiptSale) => {
    setSelectedReceipt(receipt);
    setIsViewDialogOpen(true);
  };

  const handlePrint = (receipt: ReceiptSale) => {
    const transaction = {
      receiptNumber: receipt.invoiceNumber,
      date: receipt.date,
      items: receipt.items,
      subtotal: receipt.subtotal,
      tax: receipt.tax,
      discount: 0,
      shipping: 0,
      adjustments: 0,
      total: receipt.total,
      paymentMethod: receipt.paymentMethod,
      amountPaid: receipt.amountPaid,
      amountReceived: receipt.amountPaid,
      debtPaymentAmount: 0,
      previousDebtBalance: 0,
      change: 0,
      customer: {
        name: receipt.customer,
        phone: '',
        address: '',
        email: ''
      },
      salesman: 'Not Assigned',
      driver: 'Not Assigned',
      dueDate: receipt.date
    };
    
    PrintUtils.printReceipt(transaction);
  };
  
  // Save commission receipt
  const handleSaveCommission = async () => {
    if (!commissionFrom || !commissionDescription || commissionAmount <= 0) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    setSaving(true);
    
    try {
      // TODO: Save to database when commission_receipts table is created
      // For now, store in localStorage as a temporary solution
      const commissionReceipt = {
        id: `COMM-${Date.now()}`,
        invoiceNumber: `COMM-${Date.now()}`,
        date: commissionDate,
        customer: commissionFrom,
        items: [{ name: commissionDescription, quantity: 1, price: commissionAmount }],
        subtotal: commissionAmount,
        tax: 0,
        total: commissionAmount,
        amountPaid: commissionAmount,
        paymentMethod: commissionPaymentMethod,
        status: 'paid',
        type: 'commission' as const,
        notes: commissionNotes
      };
      
      // Save to localStorage
      const existingCommissions = JSON.parse(localStorage.getItem('commission_receipts') || '[]');
      existingCommissions.push(commissionReceipt);
      localStorage.setItem('commission_receipts', JSON.stringify(existingCommissions));
      
      toast({
        title: "Success",
        description: "Commission receipt saved successfully",
      });
      
      // Reset form
      setCommissionFrom('');
      setCommissionDescription('');
      setCommissionAmount(0);
      setCommissionDate(new Date().toISOString().split('T')[0]);
      setCommissionPaymentMethod('cash');
      setCommissionNotes('');
      setShowNewForm(false);
      
      // Refresh receipts list
      await fetchReceipts();
    } catch (error) {
      console.error('Error saving commission receipt:', error);
      toast({
        title: "Error",
        description: "Failed to save commission receipt",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };
  
  // Save other receipt
  const handleSaveOtherReceipt = async () => {
    if (!otherReceiptTitle || !otherReceiptDescription || otherReceiptAmount <= 0) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    setSaving(true);
    
    try {
      // TODO: Save to database when other_receipts table is created
      // For now, store in localStorage as a temporary solution
      const otherReceipt = {
        id: `OTHER-${Date.now()}`,
        invoiceNumber: `OTHER-${Date.now()}`,
        date: otherReceiptDate,
        customer: otherReceiptTitle,
        items: [{ name: otherReceiptDescription, quantity: 1, price: otherReceiptAmount }],
        subtotal: otherReceiptAmount,
        tax: 0,
        total: otherReceiptAmount,
        amountPaid: otherReceiptAmount,
        paymentMethod: otherReceiptPaymentMethod,
        status: 'paid',
        type: 'other' as const,
        notes: otherReceiptNotes
      };
      
      // Save to localStorage
      const existingOthers = JSON.parse(localStorage.getItem('other_receipts') || '[]');
      existingOthers.push(otherReceipt);
      localStorage.setItem('other_receipts', JSON.stringify(existingOthers));
      
      toast({
        title: "Success",
        description: "Receipt saved successfully",
      });
      
      // Reset form
      setOtherReceiptTitle('');
      setOtherReceiptDescription('');
      setOtherReceiptAmount(0);
      setOtherReceiptDate(new Date().toISOString().split('T')[0]);
      setOtherReceiptPaymentMethod('cash');
      setOtherReceiptNotes('');
      setShowNewForm(false);
      
      // Refresh receipts list
      await fetchReceipts();
    } catch (error) {
      console.error('Error saving other receipt:', error);
      toast({
        title: "Error",
        description: "Failed to save receipt",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Filter receipts by type
  const filteredReceipts = activeTab === 'all' 
    ? receipts 
    : receipts.filter(r => r.type === activeTab);

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
          <p className="text-muted-foreground">Manage all outlet receipts</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mb-6">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="commission">Commission</TabsTrigger>
          <TabsTrigger value="other">Other</TabsTrigger>
        </TabsList>
      </Tabs>
      
      {/* New Receipt Button */}
      {!showNewForm && (
        <Button 
          onClick={() => setShowNewForm(true)} 
          className="mb-6"
        >
          <Plus className="h-4 w-4 mr-2" />
          New {activeTab === 'all' ? 'Receipt' : activeTab === 'sales' ? 'Sale' : activeTab === 'commission' ? 'Commission' : 'Receipt'}
        </Button>
      )}

      {/* Commission Receipt Form */}
      {showNewForm && activeTab === 'commission' && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold mb-4">New Commission Receipt</h2>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="commissionFrom">Commission From *</Label>
                <Input
                  id="commissionFrom"
                  value={commissionFrom}
                  onChange={(e) => setCommissionFrom(e.target.value)}
                  placeholder="e.g., Supplier Name, Company"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="commissionDescription">Description *</Label>
                <Textarea
                  id="commissionDescription"
                  value={commissionDescription}
                  onChange={(e) => setCommissionDescription(e.target.value)}
                  placeholder="Describe the commission"
                  className="mt-1"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="commissionAmount">Amount *</Label>
                  <Input
                    id="commissionAmount"
                    type="number"
                    value={commissionAmount || ''}
                    onChange={(e) => setCommissionAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="commissionDate">Date</Label>
                  <Input
                    id="commissionDate"
                    type="date"
                    value={commissionDate}
                    onChange={(e) => setCommissionDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="commissionPaymentMethod">Payment Method</Label>
                <select
                  id="commissionPaymentMethod"
                  className="w-full p-2 border rounded-md h-9 mt-1"
                  value={commissionPaymentMethod}
                  onChange={(e) => setCommissionPaymentMethod(e.target.value as 'cash' | 'card' | 'mobile')}
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="mobile">Mobile</option>
                </select>
              </div>
              
              <div>
                <Label htmlFor="commissionNotes">Notes (Optional)</Label>
                <Textarea
                  id="commissionNotes"
                  value={commissionNotes}
                  onChange={(e) => setCommissionNotes(e.target.value)}
                  placeholder="Additional notes"
                  className="mt-1"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button 
                  className="flex-1" 
                  onClick={handleSaveCommission}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Commission Receipt
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowNewForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Other Receipt Form */}
      {showNewForm && activeTab === 'other' && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold mb-4">New Receipt</h2>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="otherReceiptTitle">Title/From *</Label>
                <Input
                  id="otherReceiptTitle"
                  value={otherReceiptTitle}
                  onChange={(e) => setOtherReceiptTitle(e.target.value)}
                  placeholder="e.g., Refund, Adjustment, Income Source"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="otherReceiptDescription">Description *</Label>
                <Textarea
                  id="otherReceiptDescription"
                  value={otherReceiptDescription}
                  onChange={(e) => setOtherReceiptDescription(e.target.value)}
                  placeholder="Describe this receipt"
                  className="mt-1"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="otherReceiptAmount">Amount *</Label>
                  <Input
                    id="otherReceiptAmount"
                    type="number"
                    value={otherReceiptAmount || ''}
                    onChange={(e) => setOtherReceiptAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="otherReceiptDate">Date</Label>
                  <Input
                    id="otherReceiptDate"
                    type="date"
                    value={otherReceiptDate}
                    onChange={(e) => setOtherReceiptDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="otherReceiptPaymentMethod">Payment Method</Label>
                <select
                  id="otherReceiptPaymentMethod"
                  className="w-full p-2 border rounded-md h-9 mt-1"
                  value={otherReceiptPaymentMethod}
                  onChange={(e) => setOtherReceiptPaymentMethod(e.target.value as 'cash' | 'card' | 'mobile')}
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="mobile">Mobile</option>
                </select>
              </div>
              
              <div>
                <Label htmlFor="otherReceiptNotes">Notes (Optional)</Label>
                <Textarea
                  id="otherReceiptNotes"
                  value={otherReceiptNotes}
                  onChange={(e) => setOtherReceiptNotes(e.target.value)}
                  placeholder="Additional notes"
                  className="mt-1"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button 
                  className="flex-1" 
                  onClick={handleSaveOtherReceipt}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Receipt
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowNewForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
        ) : filteredReceipts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Receipts Found</h3>
              <p className="text-muted-foreground">
                {activeTab === 'all' 
                  ? 'Receipts will appear here once created' 
                  : `No ${activeTab} receipts found`}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredReceipts.map((receipt) => (
            <Card key={receipt.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-semibold">{receipt.invoiceNumber}</span>
                      <Badge className="bg-green-100 text-green-800">{receipt.status}</Badge>
                      <Badge variant="outline" className="capitalize">{receipt.type}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span>{new Date(receipt.date).toLocaleDateString()}</span>
                      <span className="mx-2">•</span>
                      <span>{receipt.customer || 'Walk-in Customer'}</span>
                      <span className="mx-2">•</span>
                      <span>{receipt.items.length} items</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">{formatCurrency(receipt.total)}</p>
                    <div className="flex gap-2 mt-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleView(receipt)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handlePrint(receipt)}
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
      {selectedReceipt && (
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
                {/* Receipt Info */}
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Invoice Number</p>
                    <p className="font-semibold">{selectedReceipt.invoiceNumber}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge className="bg-green-100 text-green-800">{selectedReceipt.status}</Badge>
                    <Badge variant="outline" className="capitalize">{selectedReceipt.type}</Badge>
                  </div>
                </div>

                {/* Date & Customer */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Date</p>
                      <p className="text-sm font-medium">{new Date(selectedReceipt.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Customer</p>
                      <p className="text-sm font-medium">{selectedReceipt.customer || 'Walk-in Customer'}</p>
                    </div>
                  </div>
                </div>

                {/* Items */}
                {selectedReceipt.items.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-medium">Items ({selectedReceipt.items.length})</p>
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
                          {selectedReceipt.items.map((item, index) => (
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
                )}

                {/* Totals */}
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(selectedReceipt.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax (18%)</span>
                    <span>{formatCurrency(selectedReceipt.tax)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>Total</span>
                    <span className="text-green-600">{formatCurrency(selectedReceipt.total)}</span>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium">Payment Method</span>
                  <Badge className="bg-green-100 text-green-800 capitalize">
                    {selectedReceipt.paymentMethod}
                  </Badge>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <Button className="flex-1" onClick={() => handlePrint(selectedReceipt)}>
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
