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
import { getOutletSalesByOutletAndPaymentMethod, OutletSale, getOutletCustomerById, getOutletSaleItemsBySaleId, getOutletCustomers, getOutletDebtsByCustomerId, getOutletDebtsByOutletId, updateOutletDebt, updateOutletSale, createCommissionReceipt, getCommissionReceiptsByOutletId, createOtherReceipt, getOtherReceiptsByOutletId, createOutletCustomerSettlement, getOutletCustomerSettlementsByOutletId } from "@/services/databaseService";
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
  previousBalance?: number;
  newBalance?: number;
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
  
  // Customer Settlement Receipt form
  const [settlementCustomerName, setSettlementCustomerName] = useState('');
  const [settlementCustomerPhone, setSettlementCustomerPhone] = useState('');
  const [settlementCustomerId, setSettlementCustomerId] = useState<string>('');
  const [settlementCustomerBalance, setSettlementCustomerBalance] = useState(0);
  const [settlementInvoiceNumber, setSettlementInvoiceNumber] = useState('');
  const [settlementPreviousBalance, setSettlementPreviousBalance] = useState(0);
  const [settlementPaymentAmount, setSettlementPaymentAmount] = useState(0);
  const [settlementPaymentMethod, setSettlementPaymentMethod] = useState<'cash' | 'card' | 'mobile'>('cash');
  const [settlementDate, setSettlementDate] = useState(new Date().toISOString().split('T')[0]);
  const [settlementNotes, setSettlementNotes] = useState('');
  
  // Customer search state
  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [filteredCustomers, setFilteredCustomers] = useState<any[]>([]);
  
  // Customer settlement statistics
  const [totalCustomerDebt, setTotalCustomerDebt] = useState(0);
  const [totalCustomerPaid, setTotalCustomerPaid] = useState(0);
  
  // Date range filter
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);

  useEffect(() => {
    fetchReceipts();
    loadCustomers();
    // Reset the new form visibility when tab changes or component mounts
    setShowNewForm(false);
  }, [outletId, activeTab]);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('#settlementCustomerSearch')) {
        setShowCustomerDropdown(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);
  
  // Load customers when component mounts or tab changes
  const loadCustomers = async () => {
    if (!outletId) return;
    try {
      const customers = await getOutletCustomers(outletId);
      
      // Fetch actual balance for each customer from outlet_debts
      const customersWithBalances = await Promise.all(
        (customers || []).map(async (customer) => {
          try {
            // getOutletDebtsByCustomerId now only returns outstanding + partial debts
            const debts = await getOutletDebtsByCustomerId(outletId, customer.id || '');
            const totalBalance = debts.reduce((sum, debt) => sum + (debt.amount || 0), 0);
            console.log(`  Customer ${customer.first_name} ${customer.last_name}:`, {
              totalDebts: debts.length,
              balance: totalBalance
            });
            return { ...customer, total_debt: totalBalance };
          } catch (error) {
            console.error(`Error fetching balance for customer ${customer.id}:`, error);
            return { ...customer, total_debt: 0 };
          }
        })
      );
      
      setAllCustomers(customersWithBalances);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };
  
  // Fetch customer balance from outlet_debts
  const fetchCustomerBalance = async (customerId: string) => {
    if (!outletId || !customerId) return;
    try {
      console.log('🔍 Fetching balance for customer:', customerId);
      // getOutletDebtsByCustomerId now only returns outstanding + partial debts
      const debts = await getOutletDebtsByCustomerId(outletId, customerId);
      console.log('  Active debts found:', debts.length);
      const totalBalance = debts.reduce((sum, debt) => sum + (debt.amount || 0), 0);
      console.log('  Total balance:', totalBalance);
      setSettlementCustomerBalance(totalBalance);
      setSettlementPreviousBalance(totalBalance);
    } catch (error) {
      console.error('Error fetching customer balance:', error);
    }
  };

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
      
      // Apply date filter to sales if set
      if (startDate || endDate) {
        allSales = allSales.filter(sale => {
          const saleDate = new Date(sale.sale_date || sale.created_at || '');
          if (startDate && saleDate < new Date(startDate)) return false;
          if (endDate) {
            const endDateTime = new Date(endDate);
            endDateTime.setHours(23, 59, 59, 999);
            if (saleDate > endDateTime) return false;
          }
          return true;
        });
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
      
      // Load commission receipts from database
      const commissionReceipts = await getCommissionReceiptsByOutletId(outletId);
      const commissionReceiptsFormatted = commissionReceipts.map(r => ({
        id: r.id,
        invoiceNumber: r.invoice_number,
        date: r.receipt_date,
        customer: r.customer_name,
        items: [{ name: r.description, quantity: 1, price: r.amount }],
        subtotal: r.amount,
        tax: 0,
        total: r.amount,
        amountPaid: r.amount,
        paymentMethod: r.payment_method || 'cash',
        status: 'paid',
        type: 'commission' as const
      }));
      
      // Load other receipts from database
      const otherReceipts = await getOtherReceiptsByOutletId(outletId);
      const otherReceiptsFormatted = otherReceipts.map(r => ({
        id: r.id,
        invoiceNumber: r.invoice_number,
        date: r.receipt_date,
        customer: r.title,
        items: [{ name: r.description, quantity: 1, price: r.amount }],
        subtotal: r.amount,
        tax: 0,
        total: r.amount,
        amountPaid: r.amount,
        paymentMethod: r.payment_method || 'cash',
        status: 'paid',
        type: 'other' as const
      }));
      
      // Load customer settlement receipts from database
      let customerSettlements = await getOutletCustomerSettlementsByOutletId(outletId);
      
      // Apply date filter to settlements if set
      if (startDate || endDate) {
        customerSettlements = customerSettlements.filter(settlement => {
          const settlementDate = new Date(settlement.settlement_date || '');
          if (startDate && settlementDate < new Date(startDate)) return false;
          if (endDate) {
            const endDateTime = new Date(endDate);
            endDateTime.setHours(23, 59, 59, 999);
            if (settlementDate > endDateTime) return false;
          }
          return true;
        });
      }
      
      console.log('Customer settlements from database:', customerSettlements);
      const customerSettlementsFormatted = customerSettlements.map(s => ({
        id: s.id,
        invoiceNumber: s.invoice_number,
        date: s.settlement_date,
        customer: s.customer_name,
        customerId: s.customer_id,
        items: [{ name: 'Debt Payment', quantity: 1, price: s.payment_amount }],
        subtotal: s.payment_amount,
        tax: 0,
        total: s.payment_amount,
        amountPaid: s.payment_amount,
        paymentMethod: s.payment_method,
        status: 'paid',
        type: 'sales' as const,
        previousBalance: s.previous_balance,
        newBalance: s.new_balance
      }));
      
      // Calculate total paid amount from settlements
      const totalPaid = customerSettlements.reduce((sum, s) => sum + (s.payment_amount || 0), 0);
      setTotalCustomerPaid(totalPaid);
      console.log('Total customer paid (from settlements):', totalPaid);
      
      // Fetch actual outstanding customer debts from outlet_debts table
      const allDebts = await getOutletDebtsByOutletId(outletId);
      // Include both 'outstanding' and 'partial' status debts (both have remaining balance)
      const outstandingDebts = allDebts.filter(debt => 
        debt.status === 'outstanding' || debt.status === 'partial'
      );
      const totalDebt = outstandingDebts.reduce((sum, debt) => sum + (debt.amount || 0), 0);
      setTotalCustomerDebt(totalDebt);
      console.log('Total customer debt (from outlet_debts):', totalDebt, 'Outstanding debts:', outstandingDebts.length, 'All debts:', allDebts.length);
      
      // Combine all receipts
      const allReceipts = [...enrichedSales, ...customerSettlementsFormatted, ...commissionReceiptsFormatted, ...otherReceiptsFormatted];
      
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
      if (!outletId) {
        throw new Error('Outlet ID is missing');
      }
      
      const result = await createCommissionReceipt({
        outlet_id: outletId,
        invoice_number: `COMM-${Date.now()}`,
        receipt_date: commissionDate,
        customer_name: commissionFrom,
        description: commissionDescription,
        amount: commissionAmount,
        payment_method: commissionPaymentMethod,
        notes: commissionNotes
      });
      
      if (!result) {
        throw new Error('Failed to save commission receipt');
      }
      
      toast({
        title: "Success",
        description: "Commission receivable saved to database",
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
      if (!outletId) {
        throw new Error('Outlet ID is missing');
      }
      
      const result = await createOtherReceipt({
        outlet_id: outletId,
        invoice_number: `OTHER-${Date.now()}`,
        receipt_date: otherReceiptDate,
        title: otherReceiptTitle,
        description: otherReceiptDescription,
        amount: otherReceiptAmount,
        payment_method: otherReceiptPaymentMethod,
        receipt_type: 'general',
        notes: otherReceiptNotes
      });
      
      if (!result) {
        throw new Error('Failed to save other receipt');
      }
      
      toast({
        title: "Success",
        description: "Receivable saved to database",
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
  
  // Customer search handler - only show customers with outstanding balances
  const handleCustomerSearch = (query: string) => {
    setCustomerSearchQuery(query);
    setSettlementCustomerName(query);
    
    if (query.trim()) {
      // Filter customers who have outstanding balances AND match the search query
      const filtered = allCustomers.filter(customer => {
        const fullName = `${customer.first_name} ${customer.last_name}`.toLowerCase();
        const phone = (customer.phone || '').toLowerCase();
        const searchLower = query.toLowerCase();
        const hasBalance = (customer.total_debt || 0) > 0;
        
        // Only show customers with outstanding balances
        return hasBalance && (fullName.includes(searchLower) || phone.includes(searchLower));
      });
      setFilteredCustomers(filtered);
      setShowCustomerDropdown(filtered.length > 0);
    } else {
      // When search is empty, show only customers with balances
      const customersWithBalance = allCustomers.filter(customer => 
        (customer.total_debt || 0) > 0
      );
      setFilteredCustomers(customersWithBalance);
      setShowCustomerDropdown(customersWithBalance.length > 0);
    }
  };
  
  // Customer selection handler
  const handleCustomerSelect = async (customer: any) => {
    const fullName = `${customer.first_name} ${customer.last_name}`.trim();
    setSettlementCustomerId(customer.id || '');
    setSettlementCustomerName(fullName);
    setSettlementCustomerPhone(customer.phone || '');
    setCustomerSearchQuery(fullName);
    setShowCustomerDropdown(false);
    
    // Fetch customer's outstanding balance
    await fetchCustomerBalance(customer.id);
  };
  
  // Customer Settlement Receipt save function
  const handleSaveSettlementReceipt = async () => {
    // Validate required fields
    if (!settlementCustomerName) {
      toast({
        title: "Error",
        description: "Customer name is required",
        variant: "destructive",
      });
      return;
    }
    
    if (!settlementPaymentMethod) {
      toast({
        title: "Error",
        description: "Payment method is mandatory",
        variant: "destructive",
      });
      return;
    }
    
    if (settlementPaymentAmount <= 0) {
      toast({
        title: "Error",
        description: "Payment amount must be greater than 0",
        variant: "destructive",
      });
      return;
    }
    
    setSaving(true);
    
    try {
      if (!outletId) {
        throw new Error('Outlet ID is missing');
      }
      
      const newBalance = Math.max(0, settlementPreviousBalance - settlementPaymentAmount);
      
      console.log('💾 Saving settlement to database:', {
        outlet_id: outletId,
        customer_id: settlementCustomerId,
        invoice_number: settlementInvoiceNumber || `SETTLE-${Date.now()}`,
        settlement_date: settlementDate,
        customer_name: settlementCustomerName,
        payment_amount: settlementPaymentAmount,
        payment_method: settlementPaymentMethod,
        previous_balance: settlementPreviousBalance,
        new_balance: newBalance,
        notes: settlementNotes
      });
      
      // Save settlement to database
      const result = await createOutletCustomerSettlement({
        outlet_id: outletId,
        customer_id: settlementCustomerId || undefined,
        invoice_number: settlementInvoiceNumber || `SETTLE-${Date.now()}`,
        settlement_date: settlementDate,
        customer_name: settlementCustomerName,
        payment_amount: settlementPaymentAmount,
        payment_method: settlementPaymentMethod,
        previous_balance: settlementPreviousBalance,
        new_balance: newBalance,
        notes: settlementNotes
      });
      
      if (!result) {
        throw new Error('Failed to save customer settlement');
      }
      
      // IMPORTANT: Update the customer's debt in the database
      if (settlementCustomerId && outletId) {
        console.log('🔄 Updating customer debt in database...');
        console.log('  Customer ID:', settlementCustomerId);
        console.log('  Previous Balance:', settlementPreviousBalance);
        console.log('  Payment Amount:', settlementPaymentAmount);
        console.log('  New Balance:', newBalance);
        
        // Fetch all outstanding debts for this customer
        const outstandingDebts = await getOutletDebtsByCustomerId(outletId, settlementCustomerId);
        
        if (outstandingDebts && outstandingDebts.length > 0) {
          let remainingPayment = settlementPaymentAmount;
          
          // Update each debt record, paying off oldest first
          for (const debt of outstandingDebts) {
            if (remainingPayment <= 0) break;
            
            const currentDebtAmount = debt.amount || 0;
            const paidAmount = debt.paid_amount || 0;
            
            if (remainingPayment >= currentDebtAmount) {
              // Pay off this debt completely
              console.log(`  ✓ Paying off debt ${debt.id} completely (${currentDebtAmount})`);
              await updateOutletDebt(debt.id || '', {
                amount: 0,
                paid_amount: currentDebtAmount + paidAmount,
                status: 'paid',
                updated_at: new Date().toISOString()
              });
              
              // Update the corresponding sale (Saved Debt) if sale_id exists
              if (debt.sale_id) {
                console.log(`    🔄 Updating saved debt sale ${debt.sale_id}`);
                await updateOutletSale(debt.sale_id, {
                  amount_paid: currentDebtAmount + paidAmount,
                  payment_status: 'paid',
                  updated_at: new Date().toISOString()
                });
                console.log(`    ✅ Saved debt sale updated`);
              }
              
              remainingPayment -= currentDebtAmount;
            } else {
              // Partially pay this debt
              console.log(`  ◐ Partially paying debt ${debt.id} (${remainingPayment} of ${currentDebtAmount})`);
              await updateOutletDebt(debt.id || '', {
                amount: currentDebtAmount - remainingPayment,
                paid_amount: paidAmount + remainingPayment,
                status: 'partial',
                updated_at: new Date().toISOString()
              });
              
              // Update the corresponding sale (Saved Debt) if sale_id exists
              if (debt.sale_id) {
                console.log(`    🔄 Updating saved debt sale ${debt.sale_id} (partial)`);
                await updateOutletSale(debt.sale_id, {
                  amount_paid: paidAmount + remainingPayment,
                  payment_status: 'partial',
                  updated_at: new Date().toISOString()
                });
                console.log(`    ✅ Saved debt sale updated (partial)`);
              }
              
              remainingPayment = 0;
            }
          }
          
          console.log('✅ Customer debt updated in database successfully');
        } else {
          console.log('⚠ No outstanding debts found for this customer');
        }
      }
      
      toast({
        title: "Success",
        description: `Customer settlement saved to database. New balance: ${formatCurrency(newBalance)}`,
      });
      
      // Reset form
      setSettlementCustomerName('');
      setSettlementCustomerPhone('');
      setSettlementCustomerId('');
      setSettlementCustomerBalance(0);
      setSettlementInvoiceNumber('');
      setSettlementPreviousBalance(0);
      setSettlementPaymentAmount(0);
      setSettlementPaymentMethod('cash');
      setSettlementDate(new Date().toISOString().split('T')[0]);
      setSettlementNotes('');
      setShowNewForm(false);
      setCustomerSearchQuery('');
      
      // Refresh receipts to show the new settlement
      await fetchReceipts();
      
      // Wait a moment for database to fully update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Reload customers to update their balances
      await loadCustomers();
      
      // If a customer was selected, refresh their specific balance
      if (settlementCustomerId) {
        await fetchCustomerBalance(settlementCustomerId);
        console.log('✅ Refreshed customer balance after settlement');
      }
    } catch (error) {
      console.error('Error saving settlement receipt:', error);
      toast({
        title: "Error",
        description: "Failed to save settlement receipt",
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
            Receivables
          </h1>
          <p className="text-muted-foreground">Manage all outlet receivables</p>
        </div>
      </div>

      {/* Date Range Filter */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filter by Date:</span>
            </div>
            
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Label htmlFor="startDate" className="text-xs whitespace-nowrap">From:</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8"
              />
            </div>
            
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Label htmlFor="endDate" className="text-xs whitespace-nowrap">To:</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-8"
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                variant="outline"
                className="h-8"
              >
                Clear
              </Button>
              <Button 
                size="sm"
                onClick={fetchReceipts}
                className="h-8"
              >
                Apply Filter
              </Button>
            </div>
          </div>
          
          {(startDate || endDate) && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-muted-foreground">
                Showing receivables from 
                {startDate && <span className="font-medium"> {new Date(startDate).toLocaleDateString()}</span>}
                {startDate && endDate && <span> to</span>}
                {endDate && <span className="font-medium"> {new Date(endDate).toLocaleDateString()}</span>}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mb-6">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="sales">Customer Settlements</TabsTrigger>
          <TabsTrigger value="commission">Commission</TabsTrigger>
          <TabsTrigger value="other">Other</TabsTrigger>
        </TabsList>
      </Tabs>
      
      {/* New Receivable Button - Only show in specific tabs, not in 'All' */}
      {!showNewForm && activeTab !== 'all' && (
        <Button 
          onClick={() => setShowNewForm(true)} 
          className="mb-6"
        >
          <Plus className="h-4 w-4 mr-2" />
          New {activeTab === 'sales' ? 'Settlement' : activeTab === 'commission' ? 'Commission' : 'Receivable'}
        </Button>
      )}

      {/* Customer Settlements Summary Cards - Only show in 'sales' tab */}
      {activeTab === 'sales' && !showNewForm && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Customers Owe Card */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">Customers Owe</p>
                  <p className="text-xl font-bold text-orange-600">{formatCurrency(totalCustomerDebt)}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Outstanding customer balances</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 ml-2">
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customers Paid Card */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">Customers Paid</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(totalCustomerPaid)}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Payments received</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 ml-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Customer Settlement Receipt Form */}
      {showNewForm && activeTab === 'sales' && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="h-8 w-1 bg-blue-600 rounded"></div>
              <h2 className="text-xl font-bold">Customer Settlement Receivable</h2>
            </div>
            
            <div className="space-y-6">
              {/* Customer Information Section */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Customer Information
                </h3>
                <div className="space-y-4">
                  {/* Customer Search Dropdown */}
                  <div className="relative">
                    <Label htmlFor="settlementCustomerSearch">Search Customer *</Label>
                    <Input
                      id="settlementCustomerSearch"
                      value={customerSearchQuery}
                      onChange={(e) => handleCustomerSearch(e.target.value)}
                      onFocus={() => {
                        if (filteredCustomers.length > 0) {
                          setShowCustomerDropdown(true);
                        }
                      }}
                      placeholder="Search customers with outstanding balances..."
                      className="mt-1"
                      autoComplete="off"
                    />
                    
                    {/* Customer Dropdown */}
                    {showCustomerDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {/* Header showing count */}
                        <div className="p-2 bg-blue-50 border-b border-blue-200">
                          <p className="text-xs text-blue-700 font-medium">
                            {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''} with outstanding balance
                          </p>
                        </div>
                        
                        {filteredCustomers.map((customer) => {
                          const fullName = `${customer.first_name} ${customer.last_name}`.trim();
                          return (
                            <div
                              key={customer.id}
                              className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                              onClick={() => handleCustomerSelect(customer)}
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">{fullName}</p>
                                  <p className="text-sm text-gray-600">{customer.phone || 'No phone'}</p>
                                </div>
                                <div className="text-right ml-4">
                                  <p className="text-xs text-gray-500">Balance</p>
                                  <p className="text-sm font-semibold text-red-600">
                                    {formatCurrency(customer.total_debt || 0)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  
                  {/* Selected Customer Info */}
                  {settlementCustomerId && (
                    <div className="p-3 bg-white rounded-lg border border-blue-300">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{settlementCustomerName}</p>
                          <p className="text-sm text-gray-600">{settlementCustomerPhone}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Outstanding Balance</p>
                          <p className="text-lg font-bold text-red-600">{formatCurrency(settlementCustomerBalance)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Payment Details Section */}
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h3 className="text-sm font-semibold text-green-900 mb-3 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Payment Details
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="settlementInvoiceNumber">Receipt/Invoice Number (Optional)</Label>
                    <Input
                      id="settlementInvoiceNumber"
                      value={settlementInvoiceNumber}
                      onChange={(e) => setSettlementInvoiceNumber(e.target.value)}
                      placeholder="Auto-generated if empty"
                      className="mt-1"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="settlementPreviousBalance">Previous Balance Outstanding</Label>
                      <Input
                        id="settlementPreviousBalance"
                        type="number"
                        value={settlementPreviousBalance || ''}
                        onChange={(e) => setSettlementPreviousBalance(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Total amount customer owed</p>
                    </div>
                    
                    <div>
                      <Label htmlFor="settlementPaymentAmount">Payment Amount *</Label>
                      <Input
                        id="settlementPaymentAmount"
                        type="number"
                        value={settlementPaymentAmount || ''}
                        onChange={(e) => setSettlementPaymentAmount(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="mt-1"
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">Amount being paid now</p>
                    </div>
                  </div>
                  
                  {/* Balance Summary */}
                  {(settlementPreviousBalance > 0 || settlementPaymentAmount > 0) && (
                    <div className="p-4 bg-white rounded-lg border-2 border-green-300">
                      <h4 className="text-sm font-semibold mb-2">Balance Summary</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Previous Balance:</span>
                          <span className="font-medium text-red-600">{formatCurrency(settlementPreviousBalance)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Payment Amount:</span>
                          <span className="font-medium text-green-600">- {formatCurrency(settlementPaymentAmount)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg pt-2 border-t">
                          <span>Remaining Balance:</span>
                          <span className={settlementPreviousBalance - settlementPaymentAmount <= 0 ? "text-green-600" : "text-orange-600"}>
                            {formatCurrency(Math.max(0, settlementPreviousBalance - settlementPaymentAmount))}
                          </span>
                        </div>
                        {settlementPreviousBalance - settlementPaymentAmount <= 0 && settlementPreviousBalance > 0 && (
                          <div className="text-center text-sm text-green-600 font-semibold mt-2">
                            ✓ Account Settled in Full
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <Label htmlFor="settlementPaymentMethod">Payment Method *</Label>
                    <select
                      id="settlementPaymentMethod"
                      className="w-full p-2 border rounded-md h-9 mt-1"
                      value={settlementPaymentMethod}
                      onChange={(e) => setSettlementPaymentMethod(e.target.value as 'cash' | 'card' | 'mobile')}
                      required
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="mobile">Mobile Money</option>
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">Payment method is mandatory</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="settlementDate">Payment Date</Label>
                    <Input
                      id="settlementDate"
                      type="date"
                      value={settlementDate}
                      onChange={(e) => setSettlementDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
              
              {/* Notes Section */}
              <div>
                <Label htmlFor="settlementNotes">Notes (Optional)</Label>
                <Textarea
                  id="settlementNotes"
                  value={settlementNotes}
                  onChange={(e) => setSettlementNotes(e.target.value)}
                  placeholder="Additional notes about this settlement"
                  className="mt-1"
                />
              </div>
              
              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button 
                  className="flex-1" 
                  onClick={handleSaveSettlementReceipt}
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
                      Save Settlement Receipt
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

      {/* Commission Receipt Form */}
      {showNewForm && activeTab === 'commission' && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold mb-4">New Commission Receivable</h2>
            
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
                      Save Commission Receivable
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

      {/* Other Receivable Form */}
      {showNewForm && activeTab === 'other' && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold mb-4">New Receivable</h2>
            
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
                      Save Receivable
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
              <h3 className="text-lg font-medium">Loading Receivables...</h3>
              <p className="text-muted-foreground">Fetching receivables from database</p>
            </CardContent>
          </Card>
        ) : filteredReceipts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Receivables Found</h3>
              <p className="text-muted-foreground">
                {activeTab === 'all' 
                  ? 'Receivables will appear here once created' 
                  : `No ${activeTab} receivables found`}
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

      {/* View Receivable Dialog */}
      {selectedReceipt && (
        <div className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 ${isViewDialogOpen ? '' : 'hidden'}`}>
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Receivable Details
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
