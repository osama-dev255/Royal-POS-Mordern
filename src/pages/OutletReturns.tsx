import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Undo2,
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Printer,
  Share2,
  Loader2,
  FileText,
  User,
  CheckCircle,
  XCircle,
  RotateCcw,
  ChevronDown,
  PackageCheck,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getOutletCustomerReturnsByOutletId,
  getOutletCustomerReturnItemsByReturnId,
  createOutletCustomerReturn,
  updateOutletCustomerReturn,
  deleteOutletCustomerReturn,
  approveOutletCustomerReturn,
  reviewOutletCustomerReturn,
  getOutletSaleForReturn,
  getOutletCustomers,
  getInventoryProductsByOutlet,
  getOutletCashSalesByOutletId,
  getOutletCardSalesByOutletId,
  getOutletMobileSalesByOutletId,
  getOutletDebtsByOutletId,
  OutletCustomerReturn,
  OutletCustomerReturnItem,
  OutletCustomer,
  OutletCashSale,
  OutletCardSale,
  OutletMobileSale,
  OutletDebt,
  InventoryProduct,
} from "@/services/databaseService";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface OutletReturnsProps {
  onBack: () => void;
  outletId?: string;
}

// UI model for a return row
interface ReturnRecord {
  id: string;
  returnNumber: string;
  date: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  sourceType: string;
  sourceInvoiceNumber?: string;
  reason: string;
  refundMethod: string;
  totalAmount: number;
  status: 'pending' | 'approved' | 'rejected';
  receivedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectedReason?: string;
  notes?: string;
}

// Editable form item
interface FormItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  restock: boolean;
  maxQuantity?: number; // cap for linked mode
}

// Invoice option for the linked-mode source dropdown
interface SourceOption {
  id: string;
  invoiceNumber: string;
  date: string;
  totalAmount: number;
  customerId?: string;
  label: string;
}

export const OutletReturns = ({ onBack, outletId }: OutletReturnsProps) => {
  const { toast } = useToast();

  // List state
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // View dialog
  const [selectedReturn, setSelectedReturn] = useState<ReturnRecord | null>(null);
  const [viewItems, setViewItems] = useState<OutletCustomerReturnItem[]>([]);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // New/Edit return dialog
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingReturnId, setEditingReturnId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formMode, setFormMode] = useState<'linked' | 'walk_in'>('linked');
  const [sourceType, setSourceType] = useState<'cash_sale' | 'card_sale' | 'mobile_sale' | 'debt'>('cash_sale');
  const [sourceOptions, setSourceOptions] = useState<SourceOption[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState('');
  const [loadingSource, setLoadingSource] = useState(false);
  const [customers, setCustomers] = useState<OutletCustomer[]>([]);
  const [inventoryProducts, setInventoryProducts] = useState<InventoryProduct[]>([]);
  const [formCustomerId, setFormCustomerId] = useState('');
  const [formCustomerName, setFormCustomerName] = useState('');
  const [formCustomerPhone, setFormCustomerPhone] = useState('');
  const [formReason, setFormReason] = useState('');
  const [formRefundMethod, setFormRefundMethod] = useState<'cash' | 'credit_note'>('cash');
  const [formReceivedBy, setFormReceivedBy] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formItems, setFormItems] = useState<FormItem[]>([]);

  // Approval dialog (name-capture, mirrors Expense/Debt workflows)
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | 'revert'>('approve');
  const [approvalName, setApprovalName] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingApproval, setProcessingApproval] = useState(false);
  const [reviewingReturn, setReviewingReturn] = useState<ReturnRecord | null>(null);

  // ============================================
  // Data loading
  // ============================================
  useEffect(() => {
    if (outletId) {
      fetchReturns();
      getOutletCustomers(outletId).then(setCustomers).catch(() => setCustomers([]));
    }
  }, [outletId]);

  const fetchReturns = async () => {
    if (!outletId) return;
    setLoading(true);
    try {
      const data = await getOutletCustomerReturnsByOutletId(outletId);
      const mapped: ReturnRecord[] = (data || []).map(mapReturnToRecord);
      setReturns(mapped);
    } catch (error) {
      console.error('Error fetching returns:', error);
      toast({
        title: "Error",
        description: "Failed to fetch customer returns",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const mapReturnToRecord = (r: OutletCustomerReturn): ReturnRecord => ({
    id: r.id || '',
    returnNumber: r.return_number,
    date: r.return_date || r.created_at || new Date().toISOString(),
    customerId: r.customer_id || undefined,
    customerName: r.customer_name || undefined,
    customerPhone: r.customer_phone || undefined,
    sourceType: r.source_type,
    sourceInvoiceNumber: r.source_invoice_number || undefined,
    reason: r.reason,
    refundMethod: r.refund_method,
    totalAmount: r.total_amount,
    status: r.status,
    receivedBy: r.received_by || undefined,
    approvedByName: r.approved_by_name || undefined,
    approvedAt: r.approved_at || undefined,
    rejectedReason: r.rejected_reason || undefined,
    notes: r.notes || undefined,
  });

  // ============================================
  // Filtering (local-midnight parsing + end-of-day clamping)
  // ============================================
  const parseLocalDate = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const getFilteredReturns = () => {
    return returns.filter(r => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;

      if (startDate || endDate) {
        const returnDate = new Date(r.date);
        if (startDate) {
          const fromLocal = parseLocalDate(startDate);
          if (returnDate < fromLocal) return false;
        }
        if (endDate) {
          const toLocal = parseLocalDate(endDate);
          toLocal.setHours(23, 59, 59, 999); // include the entire "to" day
          if (returnDate > toLocal) return false;
        }
      }

      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matches =
          (r.returnNumber || '').toLowerCase().includes(searchLower) ||
          (r.customerName || '').toLowerCase().includes(searchLower) ||
          (r.sourceInvoiceNumber || '').toLowerCase().includes(searchLower) ||
          (r.reason || '').toLowerCase().includes(searchLower);
        if (!matches) return false;
      }

      return true;
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  // ============================================
  // New / Edit return dialog
  // ============================================
  const openNewReturnDialog = async () => {
    if (!outletId) return;
    setEditingReturnId(null);
    setFormMode('linked');
    setSourceType('cash_sale');
    setSelectedSourceId('');
    setFormCustomerId('');
    setFormCustomerName('');
    setFormCustomerPhone('');
    setFormReason('');
    setFormRefundMethod('cash');
    setFormReceivedBy('');
    setFormNotes('');
    setFormItems([]);
    setIsFormDialogOpen(true);
    loadSourceOptions('cash_sale');
    if (inventoryProducts.length === 0) {
      getInventoryProductsByOutlet(outletId).then(setInventoryProducts).catch(() => setInventoryProducts([]));
    }
  };

  const openEditReturnDialog = async (r: ReturnRecord) => {
    if (!outletId) return;
    setEditingReturnId(r.id);
    setFormMode(r.sourceType === 'walk_in' ? 'walk_in' : 'linked');
    setSourceType(r.sourceType === 'walk_in' ? 'cash_sale' : (r.sourceType as 'cash_sale' | 'card_sale' | 'mobile_sale' | 'debt'));
    setSelectedSourceId('');
    setFormCustomerId(r.customerId || '');
    setFormCustomerName(r.customerName || '');
    setFormCustomerPhone(r.customerPhone || '');
    setFormReason(r.reason);
    setFormRefundMethod((r.refundMethod as 'cash' | 'credit_note') || 'cash');
    setFormReceivedBy(r.receivedBy || '');
    setFormNotes(r.notes || '');
    setFormItems([]);
    setIsFormDialogOpen(true);
    if (inventoryProducts.length === 0) {
      getInventoryProductsByOutlet(outletId).then(setInventoryProducts).catch(() => setInventoryProducts([]));
    }
    try {
      const items = await getOutletCustomerReturnItemsByReturnId(r.id);
      setFormItems(items.map(i => ({
        productName: i.product_name,
        quantity: i.quantity,
        unitPrice: i.unit_price,
        restock: i.restock !== false,
        maxQuantity: undefined
      })));
    } catch (error) {
      console.error('Error loading return items:', error);
    }
  };

  // Load invoice options for the selected source type
  const loadSourceOptions = async (type: 'cash_sale' | 'card_sale' | 'mobile_sale' | 'debt') => {
    if (!outletId) return;
    setLoadingSource(true);
    setSourceOptions([]);
    try {
      let options: SourceOption[] = [];

      if (type === 'debt') {
        const debts = await getOutletDebtsByOutletId(outletId);
        options = debts
          .filter(d => d.payment_status !== 'cancelled' && d.payment_status !== 'refunded')
          .map((d: OutletDebt) => ({
            id: d.id || '',
            invoiceNumber: d.invoice_number,
            date: d.debt_date || d.created_at || '',
            totalAmount: d.total_amount,
            customerId: d.customer_id,
            label: `${d.invoice_number} (${formatDate(d.debt_date || d.created_at)}) — ${formatCurrency(d.total_amount)}`
          }));
      } else {
        const fetchers: Record<string, () => Promise<(OutletCashSale | OutletCardSale | OutletMobileSale)[]>> = {
          cash_sale: () => getOutletCashSalesByOutletId(outletId),
          card_sale: () => getOutletCardSalesByOutletId(outletId),
          mobile_sale: () => getOutletMobileSalesByOutletId(outletId),
        };
        const sales = await fetchers[type]();
        options = (sales || [])
          .filter(s => (s as OutletCashSale).approval_status !== 'rejected')
          .map(s => ({
            id: s.id || '',
            invoiceNumber: s.invoice_number,
            date: s.sale_date || s.created_at || '',
            totalAmount: s.total_amount,
            customerId: s.customer_id,
            label: `${s.invoice_number} (${formatDate(s.sale_date || s.created_at)}) — ${formatCurrency(s.total_amount)}`
          }));
      }

      setSourceOptions(options);
    } catch (error) {
      console.error('Error loading source invoices:', error);
      toast({ title: "Error", description: "Failed to load invoices", variant: "destructive" });
    } finally {
      setLoadingSource(false);
    }
  };

  // Fetch the selected invoice's items and auto-fill the form
  const handleSelectSource = async (sourceId: string) => {
    setSelectedSourceId(sourceId);
    setFormItems([]);
    if (!outletId || !sourceId) return;

    setLoadingSource(true);
    try {
      const sale = await getOutletSaleForReturn(outletId, sourceType, sourceId);
      if (!sale) {
        toast({ title: "Error", description: "Could not load the selected invoice", variant: "destructive" });
        return;
      }
      // Resolve customer name for display
      if (sale.customer_id) {
        setFormCustomerId(sale.customer_id);
        const customer = customers.find(c => c.id === sale.customer_id);
        setFormCustomerName(customer ? `${customer.first_name} ${customer.last_name}`.trim() : (sale.customer_name || ''));
        setFormCustomerPhone(customer?.phone || '');
      } else {
        setFormCustomerId('');
        setFormCustomerName(sale.customer_name || 'Walk-in customer');
        setFormCustomerPhone('');
      }
      // Auto-fill items with original quantities (user reduces as needed, capped at sold qty)
      setFormItems(sale.items
        .filter(i => i.product_name && i.quantity > 0)
        .map(i => ({
          productName: i.product_name,
          quantity: i.quantity,
          unitPrice: i.unit_price,
          restock: true,
          maxQuantity: i.quantity
        })));
      // Debt-linked returns refund as credit note
      setFormRefundMethod(sourceType === 'debt' ? 'credit_note' : 'cash');
    } catch (error) {
      console.error('Error loading source sale:', error);
      toast({ title: "Error", description: "Failed to load invoice items", variant: "destructive" });
    } finally {
      setLoadingSource(false);
    }
  };

  const addWalkInItem = () => {
    setFormItems([...formItems, { productName: '', quantity: 1, unitPrice: 0, restock: true }]);
  };

  const updateFormItem = (index: number, updates: Partial<FormItem>) => {
    setFormItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const next = { ...item, ...updates };
      if (next.maxQuantity !== undefined && next.quantity > next.maxQuantity) {
        next.quantity = next.maxQuantity;
      }
      if (next.quantity < 0) next.quantity = 0;
      return next;
    }));
  };

  const removeFormItem = (index: number) => {
    setFormItems(prev => prev.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return formItems.reduce((sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0);
  };

  // ============================================
  // Save (create / update)
  // ============================================
  const handleSaveReturn = async () => {
    if (!outletId) return;

    // Validation
    if (formMode === 'linked' && !selectedSourceId && !editingReturnId) {
      toast({ title: "Missing Invoice", description: "Please select the original invoice being returned against", variant: "destructive" });
      return;
    }
    if (!formReason.trim()) {
      toast({ title: "Missing Reason", description: "Return reason is required", variant: "destructive" });
      return;
    }
    const validItems = formItems.filter(i => i.productName.trim() && i.quantity > 0);
    if (validItems.length === 0) {
      toast({ title: "No Items", description: "Add at least one returned item with quantity greater than 0", variant: "destructive" });
      return;
    }
    const invalidQty = formItems.find(i => i.productName.trim() && (i.quantity <= 0 || Number.isNaN(i.quantity)));
    if (invalidQty) {
      toast({ title: "Invalid Quantity", description: `"${invalidQty.productName}" has an invalid quantity`, variant: "destructive" });
      return;
    }
    if (formMode === 'walk_in' && formRefundMethod === 'credit_note' && !formCustomerId) {
      toast({ title: "Customer Required", description: "A credit note needs a registered customer — select a customer or switch refund method to cash", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const itemsPayload = validItems.map(i => ({
        product_name: i.productName.trim(),
        quantity: i.quantity,
        unit_price: i.unitPrice || 0,
        line_total: (i.quantity || 0) * (i.unitPrice || 0),
        restock: i.restock
      }));

      const totalAmount = validItems.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

      // Editable header fields shared by create and update
      const baseFields = {
        outlet_id: outletId,
        customer_id: formCustomerId || null,
        return_date: new Date().toISOString(),
        customer_name: formCustomerName || null,
        customer_phone: formCustomerPhone || null,
        reason: formReason.trim(),
        refund_method: formRefundMethod,
        total_amount: totalAmount,
        received_by: formReceivedBy.trim() || null,
        notes: formNotes.trim() || null
      };

      if (editingReturnId) {
        // Source fields (source_type/source_id/source_invoice_number) are immutable in edit
        // mode — they are omitted from the update so they are never overwritten
        const updated = await updateOutletCustomerReturn(editingReturnId, baseFields, itemsPayload);
        if (!updated) throw new Error('Update failed');
        toast({ title: "Return Updated", description: `${returns.find(r => r.id === editingReturnId)?.returnNumber || 'Return'} updated successfully` });
      } else {
        const opt = formMode === 'linked' ? sourceOptions.find(o => o.id === selectedSourceId) : undefined;
        const returnNumber = `RET-${Date.now()}`;
        const created = await createOutletCustomerReturn(
          {
            ...baseFields,
            return_number: returnNumber,
            source_type: formMode === 'linked' ? sourceType : ('walk_in' as const),
            source_id: formMode === 'linked' ? selectedSourceId : null,
            source_invoice_number: formMode === 'linked' ? (opt?.invoiceNumber || null) : null,
            status: 'pending' as const
          },
          itemsPayload
        );
        if (!created) throw new Error('Create failed');
        toast({ title: "Return Created", description: `${created.return_number || returnNumber} saved as pending approval` });
      }

      setIsFormDialogOpen(false);
      fetchReturns();
    } catch (error) {
      console.error('Error saving return:', error);
      toast({ title: "Save Failed", description: "Could not save the customer return", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // View / Delete
  // ============================================
  const handleView = async (r: ReturnRecord) => {
    setSelectedReturn(r);
    setViewItems([]);
    setIsViewDialogOpen(true);
    try {
      const items = await getOutletCustomerReturnItemsByReturnId(r.id);
      setViewItems(items);
    } catch (error) {
      console.error('Error loading return items:', error);
    }
  };

  const handleDelete = async (r: ReturnRecord) => {
    if (r.status === 'approved') {
      toast({
        title: "Cannot Delete",
        description: "This return is approved — revert it to pending first, then delete",
        variant: "destructive",
      });
      return;
    }
    const confirmed = window.confirm(`Delete return ${r.returnNumber}? This cannot be undone.`);
    if (!confirmed) return;

    const success = await deleteOutletCustomerReturn(r.id);
    if (success) {
      toast({ title: "Return Deleted", description: `${r.returnNumber} was deleted` });
      fetchReturns();
    } else {
      toast({ title: "Delete Failed", description: "Could not delete the return", variant: "destructive" });
    }
  };

  // ============================================
  // Approval workflow (name-capture dialog)
  // ============================================
  const openApprovalDialog = (r: ReturnRecord, action: 'approve' | 'reject' | 'revert') => {
    setReviewingReturn(r);
    setApprovalAction(action);
    setApprovalName('');
    setRejectionReason('');
    setIsApprovalDialogOpen(true);
  };

  const handleStatusBadgeClick = (r: ReturnRecord) => {
    // Clickable badge: pending → approve, approved → reject (revert), rejected → approve
    if (r.status === 'pending') openApprovalDialog(r, 'approve');
    else if (r.status === 'approved') openApprovalDialog(r, 'reject');
    else openApprovalDialog(r, 'approve');
  };

  const handleConfirmApproval = async () => {
    if (!reviewingReturn) return;
    if (approvalAction !== 'revert' && !approvalName.trim()) {
      toast({ title: "Name Required", description: "Please enter your name", variant: "destructive" });
      return;
    }

    setProcessingApproval(true);
    try {
      let success = false;
      if (approvalAction === 'approve') {
        success = await approveOutletCustomerReturn(reviewingReturn.id, approvalName.trim());
        if (success) {
          toast({
            title: "Return Approved",
            description: `${reviewingReturn.returnNumber} approved — stock, ledger and source updates applied`,
          });
        }
      } else if (approvalAction === 'reject') {
        success = await reviewOutletCustomerReturn(reviewingReturn.id, 'reject', approvalName.trim(), rejectionReason.trim() || undefined);
        if (success) {
          toast({
            title: reviewingReturn.status === 'approved' ? "Return Reverted & Rejected" : "Return Rejected",
            description: reviewingReturn.status === 'approved'
              ? `${reviewingReturn.returnNumber} rejected — all approval effects were reversed`
              : `${reviewingReturn.returnNumber} rejected`,
          });
        }
      } else {
        success = await reviewOutletCustomerReturn(reviewingReturn.id, 'revert');
        if (success) {
          toast({ title: "Return Re-opened", description: `${reviewingReturn.returnNumber} moved back to pending` });
        }
      }

      if (!success) {
        toast({ title: "Action Failed", description: "The return could not be updated", variant: "destructive" });
      }

      setIsApprovalDialogOpen(false);
      fetchReturns();
    } catch (error) {
      console.error('Error processing approval:', error);
      toast({ title: "Action Failed", description: "An unexpected error occurred", variant: "destructive" });
    } finally {
      setProcessingApproval(false);
    }
  };

  // ============================================
  // Print (single return note via jsPDF)
  // ============================================
  const handlePrintReturn = (r: ReturnRecord, items: OutletCustomerReturnItem[]) => {
    const doc = new jsPDF();
    const sourceLabel = r.sourceType === 'walk_in'
      ? 'Walk-in Return'
      : `${r.sourceType.replace('_', ' ').toUpperCase()} — ${r.sourceInvoiceNumber || ''}`;

    doc.setFontSize(18);
    doc.text('CUSTOMER RETURN NOTE', 14, 20);
    doc.setFontSize(10);
    doc.text(`Return No: ${r.returnNumber}`, 14, 30);
    doc.text(`Date: ${formatDate(r.date)}`, 14, 36);
    doc.text(`Customer: ${r.customerName || 'Walk-in customer'}${r.customerPhone ? ` (${r.customerPhone})` : ''}`, 14, 42);
    doc.text(`Source: ${sourceLabel}`, 14, 48);
    doc.text(`Reason: ${r.reason}`, 14, 54);
    doc.text(`Refund Method: ${r.refundMethod === 'credit_note' ? 'Credit Note' : 'Cash'}`, 14, 60);

    const tableData = items.map((item, index) => [
      (index + 1).toString(),
      item.product_name,
      item.quantity.toString(),
      item.unit_price.toFixed(2),
      item.restock === false ? 'Damaged' : 'Sellable',
      ((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)
    ]);

    autoTable(doc, {
      startY: 66,
      head: [['#', 'Product', 'Qty', 'Unit Price', 'Condition', 'Line Total']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [220, 38, 38] },
    });

    const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 80;
    doc.setFontSize(12);
    doc.text(`Total Refund: ${formatCurrency(r.totalAmount)}`, 14, finalY + 10);

    doc.setFontSize(10);
    doc.text(`Status: ${r.status.toUpperCase()}`, 14, finalY + 20);
    if (r.receivedBy) doc.text(`Received By: ${r.receivedBy}`, 14, finalY + 26);
    if (r.approvedByName) doc.text(`Approved By: ${r.approvedByName} (${formatDate(r.approvedAt)})`, 14, finalY + 32);
    if (r.rejectedReason) doc.text(`Rejected: ${r.rejectedReason}`, 14, finalY + 38);
    if (r.notes) doc.text(`Notes: ${r.notes}`, 14, finalY + 44);

    doc.setFontSize(8);
    doc.text(`Generated: ${new Date().toLocaleString()} — Royal POS System`, 14, finalY + 54);

    doc.save(`return-${r.returnNumber}.pdf`);
    toast({ title: "Print Ready", description: `Return note ${r.returnNumber} downloaded` });
  };

  // ============================================
  // Share (formatted text per project convention)
  // ============================================
  const buildShareText = (r: ReturnRecord, items: OutletCustomerReturnItem[]) => {
    const sourceLabel = r.sourceType === 'walk_in'
      ? 'Walk-in Return'
      : `${r.sourceType.replace('_', ' ').toUpperCase()} — ${r.sourceInvoiceNumber || ''}`;
    const lines: string[] = [
      'CUSTOMER RETURN NOTE',
      '==========================================',
      `Return No:      ${r.returnNumber}`,
      `Date:           ${formatDate(r.date)}`,
      `Customer:       ${r.customerName || 'Walk-in customer'}${r.customerPhone ? ` (${r.customerPhone})` : ''}`,
      `Source:         ${sourceLabel}`,
      `Reason:         ${r.reason}`,
      `Refund Method:  ${r.refundMethod === 'credit_note' ? 'Credit Note' : 'Cash'}`,
      '------------------------------------------',
      'ITEMS',
    ];
    items.forEach((item, index) => {
      lines.push(`${index + 1}. ${item.product_name}`);
      lines.push(`   Qty: ${item.quantity} @ ${formatCurrency(item.unit_price)} = ${formatCurrency((item.quantity || 0) * (item.unit_price || 0))} (${item.restock === false ? 'Damaged' : 'Sellable'})`);
    });
    lines.push('------------------------------------------');
    lines.push(`TOTAL REFUND:   ${formatCurrency(r.totalAmount)}`);
    lines.push(`Status:         ${r.status.toUpperCase()}`);
    if (r.receivedBy) lines.push(`Received By:    ${r.receivedBy}`);
    if (r.approvedByName) lines.push(`Approved By:    ${r.approvedByName}`);
    if (r.rejectedReason) lines.push(`Rejected:       ${r.rejectedReason}`);
    lines.push('==========================================');
    lines.push('Royal POS System');
    return lines.join('\n');
  };

  const handleShareReturn = async (r: ReturnRecord, items: OutletCustomerReturnItem[]) => {
    const text = buildShareText(r, items);
    try {
      if (navigator.share) {
        await navigator.share({ title: `Customer Return ${r.returnNumber}`, text });
        toast({ title: "Shared", description: "Return note shared" });
      } else {
        await navigator.clipboard.writeText(text);
        toast({ title: "Copied", description: "Return note copied to clipboard" });
      }
    } catch (error: unknown) {
      const err = error as { name?: string };
      if (err?.name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(text);
          toast({ title: "Copied", description: "Sharing not supported — copied to clipboard instead" });
        } catch {
          toast({ title: "Share Failed", description: "Could not share the return note", variant: "destructive" });
        }
      }
    }
  };

  // ============================================
  // Report print (filtered list, mirrors Saved Sales pattern)
  // ============================================
  const handlePrintReport = () => {
    const filtered = getFilteredReturns();
    if (filtered.length === 0) {
      toast({ title: "No Data", description: "No returns to print", variant: "destructive" });
      return;
    }

    const totalAmount = filtered.reduce((sum, r) => sum + r.totalAmount, 0);
    const dateRange = (startDate || endDate) ? `${startDate || 'Start'} to ${endDate || 'End'}` : 'All Time';

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: "Print Failed", description: "Please allow popups", variant: "destructive" });
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Customer Returns Report</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #dc2626; padding-bottom: 20px; }
          .header h1 { font-size: 28px; color: #dc2626; margin-bottom: 10px; }
          .header p { font-size: 14px; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          thead { background: #dc2626; color: white; }
          th { padding: 12px; text-align: left; }
          td { padding: 10px 12px; border-bottom: 1px solid #ddd; }
          tbody tr:nth-child(even) { background: #f8f9fa; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 2px solid #ddd; text-align: center; color: #666; font-size: 12px; }
          @media print { body { padding: 0; } @page { margin: 1cm; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Customer Returns Report</h1>
          <p>Period: ${dateRange}</p>
          <p>Generated: ${new Date().toLocaleString()}</p>
        </div>
        <table>
          <thead><tr><th>Return No</th><th>Date</th><th>Customer</th><th>Source</th><th>Refund</th><th>Total</th><th>Status</th></tr></thead>
          <tbody>
            ${filtered.map(r => `
              <tr>
                <td>${r.returnNumber}</td>
                <td>${formatDate(r.date)}</td>
                <td>${r.customerName || 'Walk-in'}</td>
                <td>${r.sourceType === 'walk_in' ? 'Walk-in' : (r.sourceInvoiceNumber || r.sourceType)}</td>
                <td>${r.refundMethod === 'credit_note' ? 'Credit Note' : 'Cash'}</td>
                <td>${r.totalAmount.toFixed(2)}</td>
                <td>${r.status}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">
          <p>Total Returns: ${filtered.length} | Total Refund Value: ${totalAmount.toFixed(2)}</p>
          <p style="margin-top: 10px;">© ${new Date().getFullYear()} Royal POS System</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    toast({ title: "Print Ready", description: `Report with ${filtered.length} returns ready` });
  };

  // ============================================
  // Helpers for rendering
  // ============================================
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 hover:bg-red-200';
      default: return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
    }
  };

  const getSourceTypeLabel = (sourceType: string) => {
    switch (sourceType) {
      case 'cash_sale': return 'Cash Sale';
      case 'card_sale': return 'Card Sale';
      case 'mobile_sale': return 'Mobile Sale';
      case 'debt': return 'Debt';
      default: return 'Walk-in';
    }
  };

  const filteredReturns = getFilteredReturns();
  const pendingCount = returns.filter(r => r.status === 'pending').length;
  const approvedTotal = returns.filter(r => r.status === 'approved').reduce((sum, r) => sum + r.totalAmount, 0);
  const rejectedCount = returns.filter(r => r.status === 'rejected').length;

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Undo2 className="h-6 w-6" />
              Customer Returns
            </h1>
            <p className="text-muted-foreground">Record and manage goods returned by customers</p>
          </div>
        </div>
        <Button onClick={openNewReturnDialog} className="bg-red-600 hover:bg-red-700">
          <Plus className="h-4 w-4 mr-2" />
          New Return
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Filtered Returns</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredReturns.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Approved Refund Value</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(approvedTotal)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{rejectedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Undo2 className="h-5 w-5" />
            Returns
          </CardTitle>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search returns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-full sm:w-56"
              />
            </div>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full sm:w-36"
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full sm:w-36"
            />
            <Select value={statusFilter} onValueChange={(value: string) => setStatusFilter(value as 'all' | 'pending' | 'approved' | 'rejected')}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handlePrintReport}>
              <Printer className="h-4 w-4 mr-2" />
              Print Report
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredReturns.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Undo2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No customer returns found</p>
              <p className="text-sm mt-1">Click "New Return" to record goods returned by a customer</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Return No</th>
                    <th className="pb-3 pr-4 font-medium">Date</th>
                    <th className="pb-3 pr-4 font-medium">Customer</th>
                    <th className="pb-3 pr-4 font-medium">Source</th>
                    <th className="pb-3 pr-4 font-medium">Refund</th>
                    <th className="pb-3 pr-4 font-medium text-right">Total</th>
                    <th className="pb-3 pr-4 font-medium">Status</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReturns.map((r) => (
                    <tr key={r.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 pr-4 font-medium">{r.returnNumber}</td>
                      <td className="py-3 pr-4 text-sm">{formatDate(r.date)}</td>
                      <td className="py-3 pr-4 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3 text-muted-foreground" />
                          {r.customerName || 'Walk-in'}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-sm">
                        {r.sourceType === 'walk_in' ? (
                          <span className="text-muted-foreground">Walk-in</span>
                        ) : (
                          <div>
                            <div className="text-xs text-muted-foreground">{getSourceTypeLabel(r.sourceType)}</div>
                            <div>{r.sourceInvoiceNumber}</div>
                          </div>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-sm">{r.refundMethod === 'credit_note' ? 'Credit Note' : 'Cash'}</td>
                      <td className="py-3 pr-4 text-right font-semibold">{formatCurrency(r.totalAmount)}</td>
                      <td className="py-3 pr-4">
                        <button
                          type="button"
                          onClick={() => handleStatusBadgeClick(r)}
                          title="Click to approve / reject / revert"
                        >
                          <Badge className={`${getStatusColor(r.status)} cursor-pointer`}>
                            {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                            <ChevronDown className="h-3 w-3 ml-1" />
                          </Badge>
                        </button>
                      </td>
                      <td className="py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(r)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </DropdownMenuItem>
                            {r.status === 'pending' && (
                              <DropdownMenuItem onClick={() => openEditReturnDialog(r)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={async () => {
                              const items = await getOutletCustomerReturnItemsByReturnId(r.id);
                              handlePrintReturn(r, items);
                            }}>
                              <Printer className="h-4 w-4 mr-2" />
                              Print Note
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={async () => {
                              const items = await getOutletCustomerReturnItemsByReturnId(r.id);
                              handleShareReturn(r, items);
                            }}>
                              <Share2 className="h-4 w-4 mr-2" />
                              Share
                            </DropdownMenuItem>
                            {r.status === 'approved' ? (
                              <DropdownMenuItem onClick={() => openApprovalDialog(r, 'revert')}>
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Revert to Pending
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleDelete(r)} className="text-red-600">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {selectedReturn && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>Return {selectedReturn.returnNumber}</span>
                  <Badge className={getStatusColor(selectedReturn.status)}>
                    {selectedReturn.status.charAt(0).toUpperCase() + selectedReturn.status.slice(1)}
                  </Badge>
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <p><span className="text-muted-foreground">Date:</span> {formatDate(selectedReturn.date)}</p>
                  <p><span className="text-muted-foreground">Customer:</span> {selectedReturn.customerName || 'Walk-in customer'}</p>
                  {selectedReturn.customerPhone && (
                    <p><span className="text-muted-foreground">Phone:</span> {selectedReturn.customerPhone}</p>
                  )}
                  <p><span className="text-muted-foreground">Source:</span>{' '}
                    {selectedReturn.sourceType === 'walk_in'
                      ? 'Walk-in Return'
                      : `${getSourceTypeLabel(selectedReturn.sourceType)} — ${selectedReturn.sourceInvoiceNumber}`}
                  </p>
                </div>
                <div className="space-y-2">
                  <p><span className="text-muted-foreground">Reason:</span> {selectedReturn.reason}</p>
                  <p><span className="text-muted-foreground">Refund Method:</span>{' '}
                    {selectedReturn.refundMethod === 'credit_note' ? 'Credit Note' : 'Cash'}
                  </p>
                  {selectedReturn.receivedBy && (
                    <p><span className="text-muted-foreground">Received By:</span> {selectedReturn.receivedBy}</p>
                  )}
                  {selectedReturn.approvedByName && (
                    <p><span className="text-muted-foreground">Approved By:</span> {selectedReturn.approvedByName}</p>
                  )}
                  {selectedReturn.rejectedReason && (
                    <p className="text-red-600"><span className="text-muted-foreground">Rejected:</span> {selectedReturn.rejectedReason}</p>
                  )}
                  {selectedReturn.notes && (
                    <p><span className="text-muted-foreground">Notes:</span> {selectedReturn.notes}</p>
                  )}
                </div>
              </div>
              <div className="mt-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <PackageCheck className="h-4 w-4" />
                  Returned Items
                </h4>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50 text-left">
                        <th className="py-2 px-3 font-medium">Product</th>
                        <th className="py-2 px-3 font-medium text-right">Qty</th>
                        <th className="py-2 px-3 font-medium text-right">Unit Price</th>
                        <th className="py-2 px-3 font-medium">Condition</th>
                        <th className="py-2 px-3 font-medium text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewItems.map((item) => (
                        <tr key={item.id} className="border-b last:border-0">
                          <td className="py-2 px-3">{item.product_name}</td>
                          <td className="py-2 px-3 text-right">{item.quantity}</td>
                          <td className="py-2 px-3 text-right">{formatCurrency(item.unit_price)}</td>
                          <td className="py-2 px-3">
                            <Badge variant={item.restock === false ? 'destructive' : 'secondary'}>
                              {item.restock === false ? 'Damaged' : 'Sellable'}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 text-right font-medium">
                            {formatCurrency((item.quantity || 0) * (item.unit_price || 0))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mt-3">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handlePrintReturn(selectedReturn, viewItems)}>
                      <Printer className="h-4 w-4 mr-1" />
                      Print
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleShareReturn(selectedReturn, viewItems)}>
                      <Share2 className="h-4 w-4 mr-1" />
                      Share
                    </Button>
                  </div>
                  <p className="text-lg font-bold">Total Refund: {formatCurrency(selectedReturn.totalAmount)}</p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* New / Edit Return Dialog */}
      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingReturnId ? 'Edit Return' : 'New Customer Return'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Mode toggle */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={formMode === 'linked' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFormMode('linked')}
                disabled={!!editingReturnId}
              >
                <FileText className="h-4 w-4 mr-1" />
                Linked to Sale
              </Button>
              <Button
                type="button"
                variant={formMode === 'walk_in' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFormMode('walk_in')}
                disabled={!!editingReturnId}
              >
                <User className="h-4 w-4 mr-1" />
                Walk-in Return
              </Button>
            </div>

            {/* Linked mode: source selection */}
            {formMode === 'linked' && !editingReturnId && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border rounded-lg p-4 bg-muted/30">
                <div className="space-y-2">
                  <Label>Original Sale Type <span className="text-red-500">*</span></Label>
                  <Select
                    value={sourceType}
                    onValueChange={(value: string) => {
                      const type = value as 'cash_sale' | 'card_sale' | 'mobile_sale' | 'debt';
                      setSourceType(type);
                      setSelectedSourceId('');
                      setFormItems([]);
                      loadSourceOptions(type);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select sale type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash_sale">Cash Sale</SelectItem>
                      <SelectItem value="card_sale">Card Sale</SelectItem>
                      <SelectItem value="mobile_sale">Mobile Sale</SelectItem>
                      <SelectItem value="debt">Debt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Original Invoice <span className="text-red-500">*</span></Label>
                  <Select value={selectedSourceId} onValueChange={handleSelectSource}>
                    <SelectTrigger>
                      <SelectValue placeholder={loadingSource ? 'Loading invoices...' : 'Select invoice'} />
                    </SelectTrigger>
                    <SelectContent>
                      {sourceOptions.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {formMode === 'linked' && editingReturnId && (
              <div className="text-sm text-muted-foreground border rounded-lg p-4 bg-muted/30">
                Source: {getSourceTypeLabel(sourceType)} — {returns.find(x => x.id === editingReturnId)?.sourceInvoiceNumber || 'Original invoice'}
                <p className="text-xs mt-1">The source invoice cannot be changed when editing. Items below can be adjusted.</p>
              </div>
            )}

            {/* Customer */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Customer</Label>
                {formMode === 'walk_in' ? (
                  <Select
                    value={formCustomerId || 'none'}
                    onValueChange={(value: string) => {
                      if (value === 'none') {
                        setFormCustomerId('');
                        setFormCustomerName('');
                        setFormCustomerPhone('');
                      } else {
                        setFormCustomerId(value);
                        const customer = customers.find(c => c.id === value);
                        if (customer) {
                          setFormCustomerName(`${customer.first_name} ${customer.last_name}`.trim());
                          setFormCustomerPhone(customer.phone || '');
                        }
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Walk-in (no customer)</SelectItem>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id || ''}>
                          {`${c.first_name} ${c.last_name}`.trim()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={formCustomerName} disabled placeholder="Auto-filled from invoice" />
                )}
              </div>
              <div className="space-y-2">
                <Label>Customer Name</Label>
                <Input
                  value={formCustomerName}
                  onChange={(e) => setFormCustomerName(e.target.value)}
                  placeholder={formMode === 'walk_in' ? 'e.g. John Doe' : 'Auto-filled from invoice'}
                  disabled={formMode === 'linked'}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={formCustomerPhone}
                  onChange={(e) => setFormCustomerPhone(e.target.value)}
                  placeholder="e.g. +255 7XX XXX XXX"
                />
              </div>
            </div>

            {/* Items */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <Label>Returned Items <span className="text-red-500">*</span></Label>
                {formMode === 'walk_in' && (
                  <div className="flex items-center gap-2">
                    <Select
                      value=""
                      onValueChange={(value: string) => {
                        const product = inventoryProducts.find(p => p.name === value);
                        if (product) {
                          setFormItems(prev => [...prev, {
                            productName: product.name,
                            quantity: 1,
                            unitPrice: product.selling_price || 0,
                            restock: true
                          }]);
                        }
                      }}
                    >
                      <SelectTrigger className="w-56 h-8 text-xs">
                        <SelectValue placeholder="Add from inventory..." />
                      </SelectTrigger>
                      <SelectContent>
                        {inventoryProducts.map((p) => (
                          <SelectItem key={p.id || p.name} value={p.name}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" size="sm" onClick={addWalkInItem}>
                      <Plus className="h-4 w-4 mr-1" />
                      Custom Item
                    </Button>
                  </div>
                )}
              </div>
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 text-left">
                      <th className="py-2 px-3 font-medium">Product</th>
                      <th className="py-2 px-3 font-medium text-right">Qty</th>
                      <th className="py-2 px-3 font-medium text-right">Unit Price</th>
                      <th className="py-2 px-3 font-medium text-center">Sellable</th>
                      <th className="py-2 px-3 font-medium text-right">Line Total</th>
                      <th className="py-2 px-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formItems.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-muted-foreground">
                          {formMode === 'linked'
                            ? 'Select an invoice to auto-fill the returned items'
                            : 'Add items using the inventory dropdown or "Custom Item"'}
                        </td>
                      </tr>
                    )}
                    {formItems.map((item, index) => (
                      <tr key={index} className="border-b last:border-0">
                        <td className="py-2 px-3">
                          <Input
                            value={item.productName}
                            onChange={(e) => updateFormItem(index, { productName: e.target.value })}
                            disabled={formMode === 'linked'}
                            className="h-8"
                          />
                        </td>
                        <td className="py-2 px-3 w-24 text-right">
                          <Input
                            type="number"
                            min={0}
                            max={item.maxQuantity}
                            value={item.quantity}
                            onChange={(e) => updateFormItem(index, { quantity: Number(e.target.value) })}
                            className="h-8 text-right"
                          />
                          {item.maxQuantity !== undefined && (
                            <p className="text-xs text-muted-foreground mt-0.5">max {item.maxQuantity}</p>
                          )}
                        </td>
                        <td className="py-2 px-3 w-28 text-right">
                          <Input
                            type="number"
                            min={0}
                            value={item.unitPrice}
                            onChange={(e) => updateFormItem(index, { unitPrice: Number(e.target.value) })}
                            disabled={formMode === 'linked'}
                            className="h-8 text-right"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <Checkbox
                            checked={item.restock}
                            onCheckedChange={(checked) => updateFormItem(index, { restock: checked === true })}
                          />
                        </td>
                        <td className="py-2 px-3 text-right font-medium">
                          {formatCurrency((item.quantity || 0) * (item.unitPrice || 0))}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFormItem(index)}
                            className="text-red-600 h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end">
                <p className="text-lg font-bold">Total Refund: {formatCurrency(calculateTotal())}</p>
              </div>
            </div>

            {/* Reason / refund / received by */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="returnReason">Reason for Return <span className="text-red-500">*</span></Label>
                <Input
                  id="returnReason"
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  placeholder="e.g. Damaged goods, wrong item delivered, customer changed mind"
                />
              </div>
              <div className="space-y-2">
                <Label>Refund Method <span className="text-red-500">*</span></Label>
                <Select
                  value={formRefundMethod}
                  onValueChange={(value: string) => setFormRefundMethod(value as 'cash' | 'credit_note')}
                  disabled={sourceType === 'debt' && formMode === 'linked'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select refund method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash Refund</SelectItem>
                    <SelectItem value="credit_note">Credit Note (reduces customer balance)</SelectItem>
                  </SelectContent>
                </Select>
                {sourceType === 'debt' && formMode === 'linked' && (
                  <p className="text-xs text-muted-foreground">
                    Debt-linked returns are refunded as credit notes (reduces what the customer owes).
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="receivedBy">Received By</Label>
                <Input
                  id="receivedBy"
                  value={formReceivedBy}
                  onChange={(e) => setFormReceivedBy(e.target.value)}
                  placeholder="Name of the staff member who received the goods"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="returnNotes">Notes</Label>
                <Textarea
                  id="returnNotes"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Additional notes (optional)"
                  rows={2}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setIsFormDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSaveReturn} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingReturnId ? 'Update Return' : 'Save Return'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Approval Dialog (name capture) */}
      <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
        <DialogContent className="max-w-md">
          {reviewingReturn && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {approvalAction === 'approve' ? (
                    <><CheckCircle className="h-5 w-5 text-green-600" /> Approve Return</>
                  ) : approvalAction === 'reject' ? (
                    <><XCircle className="h-5 w-5 text-red-600" /> Reject Return</>
                  ) : (
                    <><RotateCcw className="h-5 w-5" /> Revert to Pending</>
                  )}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="border rounded-lg p-3 bg-muted/30 space-y-1">
                  <p><span className="text-muted-foreground">Return:</span> {reviewingReturn.returnNumber}</p>
                  <p><span className="text-muted-foreground">Customer:</span> {reviewingReturn.customerName || 'Walk-in'}</p>
                  <p><span className="text-muted-foreground">Total Refund:</span> {formatCurrency(reviewingReturn.totalAmount)}</p>
                  <p><span className="text-muted-foreground">Current Status:</span> {reviewingReturn.status}</p>
                </div>

                {reviewingReturn.status === 'approved' && approvalAction === 'reject' && (
                  <p className="text-xs text-orange-600">
                    This return is already approved. Rejecting it will reverse the stock movements,
                    customer ledger refund entry and the source debt offset.
                  </p>
                )}
                {reviewingReturn.status === 'approved' && approvalAction === 'revert' && (
                  <p className="text-xs text-orange-600">
                    Reverting will reverse all approval effects and move the return back to pending.
                  </p>
                )}
                {reviewingReturn.status === 'rejected' && approvalAction === 'approve' && (
                  <p className="text-xs text-muted-foreground">
                    This return was previously rejected. Approving it will re-apply all stock and ledger effects.
                  </p>
                )}

                {approvalAction !== 'revert' && (
                  <div className="space-y-2">
                    <Label htmlFor="approvalName">
                      {approvalAction === 'approve' ? 'Approved By' : 'Rejected By'} <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="approvalName"
                      value={approvalName}
                      onChange={(e) => setApprovalName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && approvalName.trim() && !processingApproval) {
                          handleConfirmApproval();
                        }
                      }}
                      placeholder="Enter your name"
                    />
                  </div>
                )}
                {approvalAction === 'reject' && (
                  <div className="space-y-2">
                    <Label htmlFor="rejectionReason">Reason for Rejection</Label>
                    <Textarea
                      id="rejectionReason"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Why is this return being rejected? (optional)"
                      rows={2}
                    />
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setIsApprovalDialogOpen(false)} disabled={processingApproval}>
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmApproval}
                  disabled={processingApproval || (approvalAction !== 'revert' && !approvalName.trim())}
                  className={approvalAction === 'reject' ? 'bg-red-600 hover:bg-red-700' : approvalAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
                >
                  {processingApproval && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {approvalAction === 'approve' ? 'Approve' : approvalAction === 'reject' ? 'Reject' : 'Revert to Pending'}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
