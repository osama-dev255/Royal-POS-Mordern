import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  TrendingUp,
  X,
  Edit,
  Search,
  Share2,
  Mail,
  MessageCircle,
  Download,
  Copy
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { getOutletSalesByOutletAndPaymentMethod, OutletSale, getOutletCustomerById, getOutletSaleItemsBySaleId, getOutletCustomers, getOutletDebtsByCustomerId, getOutletDebtsByOutletId, updateOutletDebt, updateOutletSale, createCommissionReceipt, getCommissionReceiptsByOutletId, createOtherReceipt, getOtherReceiptsByOutletId, createOutletCustomerSettlement, getOutletCustomerSettlementsByOutletId, updateOutletCustomerSettlement } from "@/services/databaseService";
import { PrintUtils } from "@/utils/printUtils";
import WhatsAppUtils from "@/utils/whatsappUtils";
import jsPDF from "jspdf";

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
  notes?: string;
  cashier?: string;
  preparedBy?: string;
  approvedBy?: string;
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
  const [searchTerm, setSearchTerm] = useState("");
  
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
  const [settlementCashier, setSettlementCashier] = useState('');
  const [settlementPreparedBy, setSettlementPreparedBy] = useState('');
  const [settlementApprovedBy, setSettlementApprovedBy] = useState('');
  
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
  
  // Edit settlement state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSettlement, setEditingSettlement] = useState<ReceiptSale | null>(null);
  const [editPaymentAmount, setEditPaymentAmount] = useState(0);
  const [editPaymentMethod, setEditPaymentMethod] = useState<'cash' | 'card' | 'mobile'>('cash');
  const [editDate, setEditDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editCashier, setEditCashier] = useState('');
  const [editPreparedBy, setEditPreparedBy] = useState('');
  const [editApprovedBy, setEditApprovedBy] = useState('');
  
  // Share dialog state
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareReceipt, setShareReceipt] = useState<ReceiptSale | null>(null);

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
            const totalBalance = debts.reduce((sum, debt) => sum + (debt.remaining_amount || 0), 0);
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
      const totalBalance = debts.reduce((sum, debt) => sum + (debt.remaining_amount || 0), 0);
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
      // Receivables should only show debts and payment receipts, not cash/card/mobile sales
      // Sales are shown in their respective "Saved Cash Sales", "Saved Card Sales", "Saved Mobile Money Sales" pages
      const enrichedSales: any[] = []; // Empty - no sales in receivables
      
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
      const customerSettlements = await getOutletCustomerSettlementsByOutletId(outletId);
      
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
        newBalance: s.new_balance,
        notes: s.notes,
        cashier: s.cashier,
        preparedBy: s.prepared_by,
        approvedBy: s.approved_by
      }));
      
      // Calculate total paid amount from settlements
      const totalPaid = customerSettlements.reduce((sum, s) => sum + (s.payment_amount || 0), 0);
      setTotalCustomerPaid(totalPaid);
      console.log('Total customer paid (from settlements):', totalPaid);
      
      // Fetch actual outstanding customer debts from outlet_debts table
      const allDebts = await getOutletDebtsByOutletId(outletId);
      // Include both 'unpaid' and 'partial' status debts (both have remaining balance)
      const outstandingDebts = allDebts.filter(debt => 
        debt.payment_status === 'unpaid' || debt.payment_status === 'partial'
      );
      const totalDebt = outstandingDebts.reduce((sum, debt) => sum + (debt.remaining_amount || 0), 0);
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
    // Check if this is a customer settlement
    if (receipt.type === 'sales' && receipt.previousBalance !== undefined) {
      // Use professional settlement receipt format
      const transaction = {
        receiptNumber: receipt.invoiceNumber,
        date: receipt.date,
        customer: {
          name: receipt.customer
        },
        paymentMethod: receipt.paymentMethod,
        amountPaid: receipt.amountPaid,
        debtPaymentAmount: receipt.amountPaid,
        previousDebtBalance: receipt.previousBalance || 0,
        newBalance: receipt.newBalance || 0,
        cashier: receipt.cashier,
        preparedBy: receipt.preparedBy,
        approvedBy: receipt.approvedBy
      };
      
      PrintUtils.printSettlementReceipt(transaction);
    } else {
      // Use regular receipt format for other types
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
    }
  };
  
  // Handle share settlement - opens dialog with sharing options
  const handleShareSettlement = (receipt: ReceiptSale) => {
    if (receipt.type !== 'sales' || receipt.previousBalance === undefined) {
      toast({
        title: "Error",
        description: "Share is only available for customer settlements",
        variant: "destructive",
      });
      return;
    }
    
    setShareReceipt(receipt);
    setShareDialogOpen(true);
  };
  
  // Handle share receipt for commission and other types
  const handleShareReceipt = (receipt: ReceiptSale) => {
    setShareReceipt(receipt);
    setShareDialogOpen(true);
  };
  
  // Share via WhatsApp
  const shareViaWhatsApp = () => {
    if (!shareReceipt) return;
    
    const newBalance = (shareReceipt.previousBalance || 0) - shareReceipt.amountPaid;
    const formattedDate = new Date(shareReceipt.date).toLocaleDateString('en-TZ');
    const formattedPreviousBalance = formatCurrency(shareReceipt.previousBalance || 0);
    const formattedAmountPaid = formatCurrency(shareReceipt.amountPaid);
    const formattedNewBalance = formatCurrency(newBalance);
    
    const message = `💰 *PAYMENT SETTLEMENT* 💰\n\n` +
      `Receipt: ${shareReceipt.invoiceNumber}\n` +
      `Date: ${formattedDate}\n` +
      `Customer: ${shareReceipt.customer}\n\n` +
      `Previous Balance: ${formattedPreviousBalance}\n` +
      `Amount Paid: ${formattedAmountPaid}\n` +
      `New Balance: ${formattedNewBalance}\n\n` +
      `Payment Method: ${shareReceipt.paymentMethod}\n` +
      (shareReceipt.cashier ? `Cashier: ${shareReceipt.cashier}\n` : '') +
      (shareReceipt.preparedBy ? `Prepared By: ${shareReceipt.preparedBy}\n` : '') +
      `\nThank you for your payment!`;
    
    WhatsAppUtils.sendWhatsAppMessage('', message);
    setShareDialogOpen(false);
    toast({
      title: "Success",
      description: "WhatsApp opened with settlement details",
    });
  };
  
  // Share via Email
  const shareViaEmail = () => {
    if (!shareReceipt) return;
    
    const newBalance = (shareReceipt.previousBalance || 0) - shareReceipt.amountPaid;
    const subject = `Payment Settlement - ${shareReceipt.invoiceNumber}`;
    const body = `PAYMENT SETTLEMENT RECEIPT\n\n` +
      `Receipt Number: ${shareReceipt.invoiceNumber}\n` +
      `Date: ${new Date(shareReceipt.date).toLocaleDateString()}\n` +
      `Customer: ${shareReceipt.customer}\n\n` +
      `Previous Balance: ${formatCurrency(shareReceipt.previousBalance || 0)}\n` +
      `Amount Paid: ${formatCurrency(shareReceipt.amountPaid)}\n` +
      `New Balance: ${formatCurrency(newBalance)}\n\n` +
      `Payment Method: ${shareReceipt.paymentMethod}\n` +
      (shareReceipt.cashier ? `Cashier: ${shareReceipt.cashier}\n` : '') +
      (shareReceipt.preparedBy ? `Prepared By: ${shareReceipt.preparedBy}\n` : '') +
      (shareReceipt.approvedBy ? `Approved By: ${shareReceipt.approvedBy}\n` : '') +
      `\nThank you for your payment!`;
    
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setShareDialogOpen(false);
    toast({
      title: "Success",
      description: "Email client opened with settlement details",
    });
  };
  
  // Download as PDF
  const downloadAsPDF = () => {
    if (!shareReceipt) return;
    
    PrintUtils.printCustomerSettlementMobile({
      id: shareReceipt.id,
      receiptNumber: shareReceipt.invoiceNumber,
      date: shareReceipt.date,
      customer: {
        name: shareReceipt.customer
      },
      paymentMethod: shareReceipt.paymentMethod,
      amountPaid: shareReceipt.amountPaid,
      previousBalance: shareReceipt.previousBalance || 0,
      newBalance: (shareReceipt.previousBalance || 0) - shareReceipt.amountPaid,
      cashier: shareReceipt.cashier,
      preparedBy: shareReceipt.preparedBy,
      approvedBy: shareReceipt.approvedBy,
      notes: shareReceipt.notes
    });
    
    setShareDialogOpen(false);
    toast({
      title: "Success",
      description: "PDF opened in new window. Use Save as PDF to download.",
    });
  };
  
  // Copy to clipboard
  const copyToClipboard = () => {
    if (!shareReceipt) return;
    
    const newBalance = (shareReceipt.previousBalance || 0) - shareReceipt.amountPaid;
    const text = `Payment Settlement\n` +
      `Receipt: ${shareReceipt.invoiceNumber}\n` +
      `Date: ${new Date(shareReceipt.date).toLocaleDateString()}\n` +
      `Customer: ${shareReceipt.customer}\n` +
      `Previous Balance: ${formatCurrency(shareReceipt.previousBalance || 0)}\n` +
      `Amount Paid: ${formatCurrency(shareReceipt.amountPaid)}\n` +
      `New Balance: ${formatCurrency(newBalance)}`;
    
    navigator.clipboard.writeText(text).then(() => {
      setShareDialogOpen(false);
      toast({
        title: "Success",
        description: "Settlement details copied to clipboard",
      });
    }).catch(() => {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    });
  };
  
  // Use native share API (mobile devices) - shares PDF file matching print format
  const useNativeShare = async () => {
    if (!shareReceipt) return;
    
    const newBalance = (shareReceipt.previousBalance || 0) - shareReceipt.amountPaid;
    
    if (navigator.share) {
      try {
        // Generate PDF matching the exact print format
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        
        // Get business info
        const businessName = localStorage.getItem('businessName') || 'KILANGO GROUP LTD';
        const businessAddress = localStorage.getItem('businessAddress') || 'P Box 64, Tanganyika Street, Muheza - Tanga';
        const businessPhone = localStorage.getItem('businessPhone') || '0717 058 266';
        
        let yPosition = 15;
        
        // Centered Header
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(businessName, pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 7;
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(businessAddress, pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 5;
        
        doc.text(`Tel: ${businessPhone}`, pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 12;
        
        // Divider line
        doc.setLineWidth(0.3);
        doc.line(15, yPosition, pageWidth - 15, yPosition);
        yPosition += 8;
        
        // Receipt No and Date/Time section
        const receiptDate = new Date(shareReceipt.date);
        const dateStr = receiptDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const timeStr = receiptDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        
        // Left column - Receipt No
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('RECEIPT NO', 20, yPosition);
        yPosition += 5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(shareReceipt.invoiceNumber, 20, yPosition);
        
        // Right column - Date & Time
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('DATE & TIME', pageWidth - 20, yPosition, { align: 'right' });
        yPosition += 5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(dateStr, pageWidth - 20, yPosition, { align: 'right' });
        yPosition += 5;
        doc.text(timeStr, pageWidth - 20, yPosition, { align: 'right' });
        yPosition += 10;
        
        // Settled By section
        doc.setLineWidth(0.3);
        doc.line(15, yPosition, pageWidth - 15, yPosition);
        yPosition += 6;
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('SETTLED BY', 20, yPosition);
        yPosition += 6;
        doc.setFontSize(12);
        doc.text(shareReceipt.customer, 20, yPosition);
        yPosition += 10;
        
        // Payment Details header
        doc.setLineWidth(0.3);
        doc.line(15, yPosition, pageWidth - 15, yPosition);
        yPosition += 7;
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('PAYMENT DETAILS', pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 8;
        
        // Payment Mode
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('Payment Mode', 20, yPosition);
        yPosition += 6;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(String(shareReceipt.paymentMethod).toUpperCase(), 20, yPosition);
        yPosition += 12;
        
        // Account Summary section
        doc.setLineWidth(0.3);
        doc.line(15, yPosition, pageWidth - 15, yPosition);
        yPosition += 7;
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('ACCOUNT SUMMARY', pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 8;
        
        // Opening Balance
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('Opening Balance', 20, yPosition);
        yPosition += 6;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(formatCurrency(shareReceipt.previousBalance || 0), 20, yPosition);
        yPosition += 8;
        
        // Payment Received
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('Payment Received', 20, yPosition);
        yPosition += 6;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(formatCurrency(shareReceipt.amountPaid), 20, yPosition);
        yPosition += 8;
        
        // Closing Balance
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('Closing Balance', 20, yPosition);
        yPosition += 6;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(formatCurrency(newBalance), 20, yPosition);
        yPosition += 12;
        
        // Authorization section
        doc.setLineWidth(0.3);
        doc.line(15, yPosition, pageWidth - 15, yPosition);
        yPosition += 7;
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('AUTHORIZATION', pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 10;
        
        // Three columns for authorization
        const colWidth = (pageWidth - 40) / 3;
        
        // Cashier
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('CASHIER', 20, yPosition);
        yPosition += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(shareReceipt.cashier || 'Not Assigned', 20, yPosition);
        
        // Prepared By
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('PREPARED BY', 20 + colWidth, yPosition);
        yPosition += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(shareReceipt.preparedBy || 'Not Assigned', 20 + colWidth, yPosition);
        
        // Approved By
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('APPROVED BY', 20 + colWidth * 2, yPosition);
        yPosition += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(shareReceipt.approvedBy || '_________________', 20 + colWidth * 2, yPosition);
        yPosition += 15;
        
        // Payment Status
        doc.setLineWidth(0.3);
        doc.line(15, yPosition, pageWidth - 15, yPosition);
        yPosition += 8;
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('PAYMENT', 20, yPosition);
        
        const statusText = newBalance === 0 ? 'FULLY SETTLED' : (shareReceipt.amountPaid > 0 && newBalance > 0 ? 'PARTIAL PAYMENT' : 'PENDING');
        doc.text('STATEMENT', pageWidth / 2, yPosition, { align: 'center' });
        
        doc.setFontSize(12);
        doc.text(statusText, pageWidth - 20, yPosition, { align: 'right' });
        yPosition += 15;
        
        // Footer
        doc.setLineWidth(0.3);
        doc.line(15, yPosition, pageWidth - 15, yPosition);
        yPosition += 8;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('THANK YOU FOR YOUR PAYMENT', pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 6;
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('This is a computer-generated statement', pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 4;
        doc.text('and does not require signature', pageWidth / 2, yPosition, { align: 'center' });
        
        // Generate PDF blob
        const pdfBlob = doc.output('blob');
        const pdfFile = new File([pdfBlob], `settlement-${shareReceipt.invoiceNumber}.pdf`, { 
          type: 'application/pdf' 
        });
        
        // Check if we can share files
        if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
          await navigator.share({
            files: [pdfFile],
            title: `Payment Settlement - ${shareReceipt.invoiceNumber}`,
            text: `Payment Settlement for ${shareReceipt.customer}`
          });
        } else {
          // Fallback to downloading if can't share files
          doc.save(`settlement-${shareReceipt.invoiceNumber}.pdf`);
          toast({
            title: "Downloaded",
            description: "PDF downloaded (file sharing not supported)",
          });
          setShareDialogOpen(false);
          return;
        }
        
        setShareDialogOpen(false);
        toast({
          title: "Success",
          description: "PDF shared successfully",
        });
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Error sharing PDF:', error);
          toast({
            title: "Error",
            description: "Failed to share PDF",
            variant: "destructive",
          });
        }
      }
    }
  };
  
  // Handle edit settlement
  const handleEditSettlement = (receipt: ReceiptSale) => {
    setEditingSettlement(receipt);
    setEditPaymentAmount(receipt.amountPaid);
    setEditPaymentMethod(receipt.paymentMethod as 'cash' | 'card' | 'mobile');
    setEditDate(receipt.date.split('T')[0]);
    setEditNotes(receipt.notes || '');
    setEditCashier(receipt.cashier || '');
    setEditPreparedBy(receipt.preparedBy || '');
    setEditApprovedBy(receipt.approvedBy || '');
    setIsEditDialogOpen(true);
  };
  
  // Save edited settlement
  const handleSaveEditedSettlement = async () => {
    if (!editingSettlement) return;
    
    if (editPaymentAmount <= 0) {
      toast({
        title: "Error",
        description: "Payment amount must be greater than 0",
        variant: "destructive",
      });
      return;
    }
    
    if (!editCashier.trim()) {
      toast({
        title: "Error",
        description: "Cashier is required",
        variant: "destructive",
      });
      return;
    }
    
    if (!editPreparedBy.trim()) {
      toast({
        title: "Error",
        description: "Prepared By is required",
        variant: "destructive",
      });
      return;
    }
    
    setSaving(true);
    
    try {
      const newBalance = (editingSettlement.previousBalance || 0) - editPaymentAmount;
      
      // Update the settlement in database
      const result = await updateOutletCustomerSettlement(editingSettlement.id, {
        payment_amount: editPaymentAmount,
        payment_method: editPaymentMethod,
        settlement_date: editDate,
        new_balance: newBalance,
        notes: editNotes || undefined,
        cashier: editCashier || undefined,
        prepared_by: editPreparedBy || undefined,
        approved_by: editApprovedBy || undefined
      });
      
      if (!result) {
        throw new Error('Failed to update customer settlement');
      }
      
      // IMPORTANT: Recalculate the customer's debt in the database
      if (editingSettlement.customerId && outletId) {
        console.log('🔄 Recalculating customer debt after edit...');
        console.log('  Customer ID:', editingSettlement.customerId);
        console.log('  Old Payment:', editingSettlement.amountPaid);
        console.log('  New Payment:', editPaymentAmount);
        
        // Get the difference in payment
        const paymentDiff = editPaymentAmount - editingSettlement.amountPaid;
        
        // Fetch all outstanding debts for this customer (including paid ones to recalculate)
        const { data: allDebts } = await supabase
          .from('outlet_debts')
          .select('*')
          .eq('outlet_id', outletId)
          .eq('customer_id', editingSettlement.customerId);
        
        if (allDebts && allDebts.length > 0) {
          // Calculate total paid across all debts
          const totalDebt = allDebts.reduce((sum, debt) => sum + (debt.total_amount || 0), 0);
          const totalPaid = allDebts.reduce((sum, debt) => sum + (debt.amount_paid || 0), 0);
          
          // Calculate new total paid with the edited payment
          const newTotalPaid = totalPaid + paymentDiff;
          
          // Distribute the new payment across debts proportionally
          let remainingToDistribute = newTotalPaid;
          
          for (const debt of allDebts) {
            const debtTotal = debt.total_amount || 0;
            const proportion = debtTotal / totalDebt;
            const allocatedPayment = Math.min(remainingToDistribute, debtTotal * proportion);
            
            const newPaid = Math.min(allocatedPayment, debtTotal);
            const newRemaining = debtTotal - newPaid;
            const newStatus = newRemaining > 0 ? (newPaid > 0 ? 'partial' : 'unpaid') : 'paid';
            
            await updateOutletDebt(debt.id || '', {
              amount_paid: newPaid,
              remaining_amount: newRemaining,
              payment_status: newStatus,
              updated_at: new Date().toISOString()
            });
            
            remainingToDistribute -= allocatedPayment;
            
            if (remainingToDistribute <= 0) break;
          }
          
          console.log('✅ Customer debt recalculated successfully');
        }
      }
      
      toast({
        title: "Success",
        description: `Customer settlement updated successfully. New balance: ${formatCurrency(newBalance)}`,
      });
      
      // Reset edit form
      setIsEditDialogOpen(false);
      setEditingSettlement(null);
      
      // Refresh receipts to show the updated settlement
      await fetchReceipts();
      
      // Reload customers to update their balances
      await loadCustomers();
    } catch (error) {
      console.error('Error updating settlement:', error);
      toast({
        title: "Error",
        description: "Failed to update customer settlement",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
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
    
    if (!settlementCashier.trim()) {
      toast({
        title: "Error",
        description: "Cashier is required",
        variant: "destructive",
      });
      return;
    }
    
    if (!settlementPreparedBy.trim()) {
      toast({
        title: "Error",
        description: "Prepared By is required",
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
        notes: settlementNotes,
        cashier: settlementCashier,
        prepared_by: settlementPreparedBy,
        approved_by: settlementApprovedBy
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
        notes: settlementNotes,
        cashier: settlementCashier || undefined,
        prepared_by: settlementPreparedBy || undefined,
        approved_by: settlementApprovedBy || undefined
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
            
            const currentDebtAmount = debt.remaining_amount || 0;
            const totalAmount = debt.total_amount || 0;
            const alreadyPaid = debt.amount_paid || 0;
            
            if (remainingPayment >= currentDebtAmount) {
              // Pay off this debt completely
              console.log(`  ✓ Paying off debt ${debt.id} completely (${currentDebtAmount})`);
              await updateOutletDebt(debt.id || '', {
                amount_paid: totalAmount,
                remaining_amount: 0,
                payment_status: 'paid',
                updated_at: new Date().toISOString()
              });
              
              remainingPayment -= currentDebtAmount;
            } else {
              // Partially pay this debt
              console.log(`  ◐ Partially paying debt ${debt.id} (${remainingPayment} of ${currentDebtAmount})`);
              const newRemainingAmount = currentDebtAmount - remainingPayment;
              const newAmountPaid = alreadyPaid + remainingPayment;
              const newPaymentStatus = newRemainingAmount > 0 ? 'partial' : 'paid';
              
              await updateOutletDebt(debt.id || '', {
                amount_paid: newAmountPaid,
                remaining_amount: newRemainingAmount,
                payment_status: newPaymentStatus,
                updated_at: new Date().toISOString()
              });
              
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

  // Filter receipts by type, search term, and date range
  const filteredReceipts = receipts.filter(receipt => {
    const matchesType = activeTab === 'all' || receipt.type === activeTab;
    
    const matchesSearch = 
      !searchTerm || 
      receipt.customer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Apply date range filter
    let matchesDate = true;
    if (startDate || endDate) {
      const receiptDate = new Date(receipt.date);
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (receiptDate < start) matchesDate = false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (receiptDate > end) matchesDate = false;
      }
    }
    
    return matchesType && matchesSearch && matchesDate;
  });

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

      {/* Search Bar Tab - Receivables Layout */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Receivables</h1>
          <p className="text-muted-foreground">Manage all outlet receivables</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search settlements by name..."
              className="pl-8 w-full sm:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Date Range Filter Toggle */}
          <Button 
            variant={showDateFilter ? "default" : "outline"} 
            size="sm"
            onClick={() => setShowDateFilter(!showDateFilter)}
            className="gap-2"
          >
            <Calendar className="h-4 w-4" />
            {showDateFilter ? "Hide Dates" : "Filter Dates"}
          </Button>
          
          {/* Date Range Inputs */}
          {showDateFilter && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-36"
                />
              </div>
              <span className="text-sm text-muted-foreground">to</span>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-36"
                />
              </div>
              {(startDate || endDate) && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => { setStartDate(''); setEndDate(''); }}
                  className="h-8 px-2"
                  title="Clear dates"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
          
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value as any)}
            className="pl-8 pr-3 py-2 border border-input bg-background rounded-md text-sm w-full sm:w-40"
          >
            <option value="all">All</option>
            <option value="sales">Customer Settlements</option>
            <option value="commission">Commission</option>
            <option value="other">Other</option>
          </select>
          
          {!showNewForm && activeTab !== 'all' && (
            <Button 
              onClick={() => setShowNewForm(true)} 
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Settlement
            </Button>
          )}
        </div>
      </div>

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Customers Owe Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Customers Owe</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalCustomerDebt)}</div>
              <p className="text-xs text-muted-foreground">Outstanding customer balances</p>
            </CardContent>
          </Card>

          {/* Customers Paid Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Customers Paid</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalCustomerPaid)}</div>
              <p className="text-xs text-muted-foreground">Amount received from customers</p>
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
                        disabled
                        className="mt-1 bg-muted cursor-not-allowed"
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
                            {formatCurrency(settlementPreviousBalance - settlementPaymentAmount)}
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
              
              {/* Cashier, Prepared By, Approved By Fields */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="settlementCashier">Cashier *</Label>
                  <Input
                    id="settlementCashier"
                    value={settlementCashier}
                    onChange={(e) => setSettlementCashier(e.target.value)}
                    placeholder="Cashier name"
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="settlementPreparedBy">Prepared By *</Label>
                  <Input
                    id="settlementPreparedBy"
                    value={settlementPreparedBy}
                    onChange={(e) => setSettlementPreparedBy(e.target.value)}
                    placeholder="Prepared by"
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="settlementApprovedBy">Approved By</Label>
                  <Input
                    id="settlementApprovedBy"
                    value={settlementApprovedBy}
                    onChange={(e) => setSettlementApprovedBy(e.target.value)}
                    placeholder="Approved by (Optional)"
                    className="mt-1"
                  />
                </div>
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
                      {receipt.type === 'sales' && receipt.previousBalance !== undefined && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleShareSettlement(receipt)}
                          title="Share Settlement"
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                      )}
                      {receipt.type === 'sales' && receipt.previousBalance !== undefined && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleEditSettlement(receipt)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      )}
                      {(receipt.type === 'commission' || receipt.type === 'other') && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleShareReceipt(receipt)}
                          title="Share Receipt"
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                      )}
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
                    <Badge variant="outline" className="capitalize">
                      {selectedReceipt.type === 'sales' && selectedReceipt.previousBalance !== undefined ? 'Customer Settlement' : selectedReceipt.type}
                    </Badge>
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

                {/* Settlement-specific fields */}
                {selectedReceipt.type === 'sales' && selectedReceipt.previousBalance !== undefined && (
                  <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                    <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Settlement Details
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-blue-700">Previous Balance:</span>
                        <span className="text-lg font-bold text-blue-900">
                          {formatCurrency(selectedReceipt.previousBalance || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-green-700">Amount Paid:</span>
                        <span className="text-lg font-bold text-green-600">
                          -{formatCurrency(selectedReceipt.amountPaid)}
                        </span>
                      </div>
                      <div className="border-t-2 border-blue-300 pt-3 flex justify-between items-center">
                        <span className="text-base font-bold text-blue-900">New Balance:</span>
                        <span className="text-2xl font-bold text-blue-900">
                          {formatCurrency((selectedReceipt.previousBalance || 0) - (selectedReceipt.amountPaid || 0))}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Items - Only show for non-settlement types */}
                {selectedReceipt.type !== 'sales' && selectedReceipt.items.length > 0 && (
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

                {/* Totals - Only show for non-settlement types */}
                {selectedReceipt.type !== 'sales' && (
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
                )}

                {/* Payment Method - Only show for non-settlement types */}
                {selectedReceipt.type !== 'sales' && (
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium">Payment Method</span>
                    <Badge className="bg-green-100 text-green-800 capitalize">
                      {selectedReceipt.paymentMethod}
                    </Badge>
                  </div>
                )}

                {/* Payment Method for Settlements */}
                {selectedReceipt.type === 'sales' && selectedReceipt.previousBalance !== undefined && (
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border-2 border-blue-200">
                    <span className="text-sm font-medium text-blue-900">Payment Method</span>
                    <Badge className="bg-blue-900 text-white capitalize text-sm">
                      {selectedReceipt.paymentMethod}
                    </Badge>
                  </div>
                )}

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
      
      {/* Edit Settlement Dialog */}
      {isEditDialogOpen && editingSettlement && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Edit className="h-5 w-5" />
                  Edit Customer Settlement
                </h2>
                <Button variant="outline" size="icon" onClick={() => setIsEditDialogOpen(false)}>
                  <span className="text-xl">×</span>
                </Button>
              </div>
              
              <div className="space-y-4">
                {/* Settlement Info */}
                <div className="p-3 bg-muted rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Invoice Number</p>
                      <p className="font-semibold">{editingSettlement.invoiceNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Customer</p>
                      <p className="font-semibold">{editingSettlement.customer}</p>
                    </div>
                  </div>
                </div>

                {/* Settlement Details */}
                <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                  <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Settlement Details
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-blue-700">Previous Balance:</span>
                      <span className="text-lg font-bold text-blue-900">
                        {formatCurrency(editingSettlement.previousBalance || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Editable Fields */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="editPaymentAmount">Payment Amount *</Label>
                    <Input
                      id="editPaymentAmount"
                      type="number"
                      value={editPaymentAmount || ''}
                      onChange={(e) => setEditPaymentAmount(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="mt-1"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="editPaymentMethod">Payment Method *</Label>
                    <select
                      id="editPaymentMethod"
                      className="w-full p-2 border rounded-md h-9 mt-1"
                      value={editPaymentMethod}
                      onChange={(e) => setEditPaymentMethod(e.target.value as 'cash' | 'card' | 'mobile')}
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="mobile">Mobile</option>
                    </select>
                  </div>
                  
                  <div>
                    <Label htmlFor="editDate">Settlement Date</Label>
                    <Input
                      id="editDate"
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="editNotes">Notes (Optional)</Label>
                    <Textarea
                      id="editNotes"
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="Additional notes about this settlement"
                      className="mt-1"
                    />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="editCashier">Cashier *</Label>
                      <Input
                        id="editCashier"
                        value={editCashier}
                        onChange={(e) => setEditCashier(e.target.value)}
                        placeholder="Cashier name"
                        className="mt-1"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="editPreparedBy">Prepared By *</Label>
                      <Input
                        id="editPreparedBy"
                        value={editPreparedBy}
                        onChange={(e) => setEditPreparedBy(e.target.value)}
                        placeholder="Prepared by"
                        className="mt-1"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="editApprovedBy">Approved By</Label>
                      <Input
                        id="editApprovedBy"
                        value={editApprovedBy}
                        onChange={(e) => setEditApprovedBy(e.target.value)}
                        placeholder="Approved by (Optional)"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                {/* New Balance Preview */}
                <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-green-900">New Balance:</span>
                    <span className="text-2xl font-bold text-green-700">
                      {formatCurrency((editingSettlement.previousBalance || 0) - editPaymentAmount)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button 
                    className="flex-1" 
                    onClick={handleSaveEditedSettlement}
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
                        Save Changes
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setIsEditDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Share Dialog */}
      {shareDialogOpen && shareReceipt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full m-4 shadow-xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Share2 className="h-5 w-5" />
                  Share {shareReceipt.type === 'sales' && shareReceipt.previousBalance !== undefined ? 'Settlement' : 'Receipt'}
                </h2>
                <Button variant="outline" size="icon" onClick={() => setShareDialogOpen(false)}>
                  <span className="text-xl">×</span>
                </Button>
              </div>
              
              {/* Receipt Info */}
              <div className="p-4 bg-muted rounded-lg mb-4">
                <p className="text-sm font-semibold">{shareReceipt.invoiceNumber}</p>
                <p className="text-sm text-muted-foreground">{shareReceipt.customer}</p>
                <p className="text-lg font-bold text-green-600 mt-2">{formatCurrency(shareReceipt.total)}</p>
              </div>
              
              {/* Share Options */}
              <div className="space-y-3">
                {(shareReceipt.type === 'sales' && shareReceipt.previousBalance !== undefined) && (
                  <Button 
                    className="w-full justify-start gap-3" 
                    variant="outline"
                    onClick={shareViaWhatsApp}
                  >
                    <MessageCircle className="h-5 w-5 text-green-600" />
                    <div className="text-left">
                      <div className="font-semibold">WhatsApp</div>
                      <div className="text-xs text-muted-foreground">Share via WhatsApp message</div>
                    </div>
                  </Button>
                )}
                
                <Button 
                  className="w-full justify-start gap-3" 
                  variant="outline"
                  onClick={shareViaEmail}
                >
                  <Mail className="h-5 w-5 text-blue-600" />
                  <div className="text-left">
                    <div className="font-semibold">Email</div>
                    <div className="text-xs text-muted-foreground">Send via email client</div>
                  </div>
                </Button>
                
                <Button 
                  className="w-full justify-start gap-3" 
                  variant="outline"
                  onClick={downloadAsPDF}
                >
                  <Download className="h-5 w-5 text-red-600" />
                  <div className="text-left">
                    <div className="font-semibold">Download PDF</div>
                    <div className="text-xs text-muted-foreground">Open PDF for downloading</div>
                  </div>
                </Button>
                
                <Button 
                  className="w-full justify-start gap-3" 
                  variant="outline"
                  onClick={copyToClipboard}
                >
                  <Copy className="h-5 w-5 text-gray-600" />
                  <div className="text-left">
                    <div className="font-semibold">Copy to Clipboard</div>
                    <div className="text-xs text-muted-foreground">Copy text details</div>
                  </div>
                </Button>
                
                {navigator.share && (
                  <Button 
                    className="w-full justify-start gap-3" 
                    variant="outline"
                    onClick={useNativeShare}
                  >
                    <Share2 className="h-5 w-5 text-purple-600" />
                    <div className="text-left">
                      <div className="font-semibold">Share...</div>
                      <div className="text-xs text-muted-foreground">Use device sharing options</div>
                    </div>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
