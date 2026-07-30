import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, FileText, Download, Printer, Eye, EyeOff, Calendar, Share2, Trash2 } from "lucide-react";
import { PurchaseOrderCard } from "./PurchaseOrderCard";
import { getSavedPurchaseOrders, deletePurchaseOrder, SavedPurchaseOrder } from "@/utils/purchaseOrderUtils";
import { formatCurrency } from "@/lib/currency";
import { toast } from "@/components/ui/use-toast";

interface PurchaseOrderSectionProps {
  onBack: () => void;
  onLogout: () => void;
  username: string;
}

export const PurchaseOrderSection = ({ onBack, onLogout, username }: PurchaseOrderSectionProps) => {
  const [orders, setOrders] = useState<SavedPurchaseOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<SavedPurchaseOrder | null>(null);
  const [printFontSize, setPrintFontSize] = useState(11);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);
        console.log('[PO Section] Loading purchase orders from Supabase...');
        const savedOrders = await getSavedPurchaseOrders();
        console.log('[PO Section] Loaded orders:', savedOrders.length, savedOrders);
        setOrders(savedOrders);
      } catch (error) {
        console.error('[PO Section] Error loading purchase orders:', error);
      } finally {
        setLoading(false);
      }
    };
    loadOrders();

    const handleOrderSaved = (event: CustomEvent) => {
      const { orders: updatedOrders } = event.detail;
      setOrders(updatedOrders);
    };
    window.addEventListener('purchaseOrderSaved', handleOrderSaved as EventListener);
    return () => window.removeEventListener('purchaseOrderSaved', handleOrderSaved as EventListener);
  }, []);

  const isInDateRange = (dateString: string) => {
    const date = new Date(dateString);
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    return date >= startDate && date <= endDate;
  };

  const filteredOrders = orders.filter(order => {
    const matchesDate = isInDateRange(order.date);
    const matchesSearch = order.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDate && matchesSearch;
  });

  const handleDeleteOrder = async (orderId: string) => {
    try {
      const result = await deletePurchaseOrder(orderId);
      if (result.success) {
        setOrders(prev => prev.filter(o => o.id !== orderId));
        toast({ title: "Deleted", description: "Purchase order deleted successfully" });
      }
    } catch (error) {
      console.error("Error deleting purchase order:", error);
    }
  };

  const handlePrintOrder = (order: SavedPurchaseOrder) => {
    const data = order.data || order;
    const items = Array.isArray(data.items) ? data.items : [];
    const subtotal = data.subtotal || items.reduce((sum: number, item: any) => sum + (item.total || 0), 0);
    const total = data.total || subtotal + (data.tax || 0) + (data.shipping || 0) - (data.discount || 0);
    const fmtCurrencyLocal = (amount: number) => {
      const businessCurrency = localStorage.getItem('businessCurrency') || 'TSh';
      return `${businessCurrency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const itemsRows = items.map((item: any, index: number) => `
      <tr>
        <td style="text-align:center;padding:6px 8px;border:1px solid #d1d5db;font-weight:700;">${String(index + 1).padStart(2, '0')}</td>
        <td style="padding:6px 8px;border:1px solid #d1d5db;font-weight:600;">${item.description || ''}</td>
        <td style="text-align:center;padding:6px 8px;border:1px solid #d1d5db;">${item.quantity || 0}</td>
        <td style="text-align:center;padding:6px 8px;border:1px solid #d1d5db;">${item.unit || '-'}</td>
        <td style="text-align:right;padding:6px 8px;border:1px solid #d1d5db;">${fmtCurrencyLocal(item.unitPrice || 0)}</td>
        <td style="text-align:right;padding:6px 8px;border:1px solid #d1d5db;font-weight:700;">${fmtCurrencyLocal(item.total || 0)}</td>
      </tr>
    `).join('');

    const totalQty = items.reduce((s: number, i: any) => s + (i.quantity || 0), 0);

    const html = `<!DOCTYPE html>
<html><head><title>Purchase Order - ${data.poNumber || ''}</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  @media print { @page { margin: 0.2in; size: A4; } body { margin: 0; padding: 0; } }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; max-width: 850px; margin: 0 auto; padding: 0; font-size: ${printFontSize}px; color: #000; line-height: 1.5; background: #fff; }
</style></head><body>
  <div style="text-align:center;padding:12px 24px;border-bottom:3px solid #000;">
    <h1 style="font-size:${printFontSize + 8}px;font-weight:800;letter-spacing:1px;text-transform:uppercase;">PURCHASE ORDER</h1>
    <p style="font-size:${printFontSize}px;font-weight:600;">#${data.poNumber || ''}</p>
    <p style="font-size:${printFontSize - 2}px;font-weight:700;text-transform:uppercase;border:1px solid #000;display:inline-block;padding:2px 8px;margin-top:4px;">Original Copy</p>
  </div>
  <div style="background:#f8fafc;padding:8px 24px;display:flex;justify-content:space-between;border-bottom:2px solid #e2e8f0;font-size:${printFontSize}px;">
    <div><span style="font-weight:600;text-transform:uppercase;font-size:${printFontSize - 2}px;">Date:</span> <strong>${new Date(data.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></div>
    <div><span style="font-weight:600;text-transform:uppercase;font-size:${printFontSize - 2}px;">Status:</span> <strong>${(data.status || 'completed').toUpperCase()}</strong></div>
  </div>
  <div style="padding:12px 24px;display:flex;gap:16px;">
    <div style="flex:1;border:1px solid #d1d5db;border-radius:4px;overflow:hidden;">
      <div style="background:#e5e7eb;padding:8px 12px;font-weight:700;text-transform:uppercase;font-size:${printFontSize}px;">FROM (Business)</div>
      <div style="padding:10px 12px;">
        <div style="font-weight:700;font-size:${printFontSize}px;border-bottom:2px solid #e2e8f0;padding-bottom:4px;margin-bottom:4px;">${data.businessName || 'N/A'}</div>
        ${data.businessAddress ? `<div style="font-size:${printFontSize}px;margin:2px 0;">${data.businessAddress}</div>` : ''}
        ${data.businessPhone ? `<div style="font-size:${printFontSize}px;margin:2px 0;">Phone: ${data.businessPhone}</div>` : ''}
        ${data.businessEmail ? `<div style="font-size:${printFontSize}px;margin:2px 0;">Email: ${data.businessEmail}</div>` : ''}
      </div>
    </div>
    <div style="flex:1;border:1px solid #d1d5db;border-radius:4px;overflow:hidden;">
      <div style="background:#e5e7eb;padding:8px 12px;font-weight:700;text-transform:uppercase;font-size:${printFontSize}px;">TO (Supplier)</div>
      <div style="padding:10px 12px;">
        <div style="font-weight:700;font-size:${printFontSize}px;border-bottom:2px solid #e2e8f0;padding-bottom:4px;margin-bottom:4px;">${data.supplierName || 'N/A'}</div>
        ${data.supplierAddress ? `<div style="font-size:${printFontSize}px;margin:2px 0;">${data.supplierAddress}</div>` : ''}
        ${data.supplierPhone ? `<div style="font-size:${printFontSize}px;margin:2px 0;">Phone: ${data.supplierPhone}</div>` : ''}
        ${data.supplierEmail ? `<div style="font-size:${printFontSize}px;margin:2px 0;">Email: ${data.supplierEmail}</div>` : ''}
      </div>
    </div>
  </div>
  <div style="padding:0 24px 8px;display:grid;grid-template-columns:repeat(4,1fr);gap:10px;">
    <div style="background:#f8fafc;padding:8px;text-align:center;"><div style="font-size:${printFontSize - 2}px;font-weight:600;text-transform:uppercase;">Date</div><div style="font-weight:800;">${new Date(data.date).toLocaleDateString()}</div></div>
    ${data.expectedDelivery ? `<div style="background:#f8fafc;padding:8px;text-align:center;"><div style="font-size:${printFontSize - 2}px;font-weight:600;text-transform:uppercase;">Required By</div><div style="font-weight:800;">${data.expectedDelivery}</div></div>` : ''}
    <div style="background:#f8fafc;padding:8px;text-align:center;"><div style="font-size:${printFontSize - 2}px;font-weight:600;text-transform:uppercase;">Payment Terms</div><div style="font-weight:800;">${data.paymentTerms || '—'}</div></div>
    <div style="background:#f8fafc;padding:8px;text-align:center;"><div style="font-size:${printFontSize - 2}px;font-weight:600;text-transform:uppercase;">Ship Via</div><div style="font-weight:800;">${data.deliveryInstructions || '—'}</div></div>
  </div>
  <div style="padding:0 24px 8px;">
    <table style="width:100%;border-collapse:collapse;font-size:${printFontSize}px;border:1px solid #d1d5db;">
      <thead><tr style="background:#f9fafb;">
        <th style="padding:8px;border:1px solid #d1d5db;text-align:center;font-weight:700;text-transform:uppercase;">#</th>
        <th style="padding:8px;border:1px solid #d1d5db;text-align:left;font-weight:700;text-transform:uppercase;">Description</th>
        <th style="padding:8px;border:1px solid #d1d5db;text-align:center;font-weight:700;text-transform:uppercase;">Qty</th>
        <th style="padding:8px;border:1px solid #d1d5db;text-align:center;font-weight:700;text-transform:uppercase;">Unit</th>
        <th style="padding:8px;border:1px solid #d1d5db;text-align:right;font-weight:700;text-transform:uppercase;">Unit Price</th>
        <th style="padding:8px;border:1px solid #d1d5db;text-align:right;font-weight:700;text-transform:uppercase;">Total</th>
      </tr></thead>
      <tbody>${itemsRows}</tbody>
      <tfoot>
        <tr style="background:#f3f4f6;"><td colspan="2" style="padding:8px;text-align:right;font-weight:700;border:1px solid #d1d5db;">SUBTOTAL</td><td colspan="3" style="border:1px solid #d1d5db;"></td><td style="padding:8px;text-align:right;font-weight:700;border:1px solid #d1d5db;">${fmtCurrencyLocal(subtotal)}</td></tr>
        ${data.tax ? `<tr style="background:#f3f4f6;"><td colspan="2" style="padding:8px;text-align:right;font-weight:700;border:1px solid #d1d5db;">TAX</td><td colspan="3" style="border:1px solid #d1d5db;"></td><td style="padding:8px;text-align:right;font-weight:700;border:1px solid #d1d5db;">${fmtCurrencyLocal(data.tax)}</td></tr>` : ''}
        ${data.discount ? `<tr style="background:#f3f4f6;"><td colspan="2" style="padding:8px;text-align:right;font-weight:700;border:1px solid #d1d5db;">DISCOUNT</td><td colspan="3" style="border:1px solid #d1d5db;"></td><td style="padding:8px;text-align:right;font-weight:700;border:1px solid #d1d5db;">-${fmtCurrencyLocal(data.discount)}</td></tr>` : ''}
        ${data.shipping ? `<tr style="background:#f3f4f6;"><td colspan="2" style="padding:8px;text-align:right;font-weight:700;border:1px solid #d1d5db;">SHIPPING</td><td colspan="3" style="border:1px solid #d1d5db;"></td><td style="padding:8px;text-align:right;font-weight:700;border:1px solid #d1d5db;">${fmtCurrencyLocal(data.shipping)}</td></tr>` : ''}
        <tr style="background:#e5e7eb;"><td colspan="2" style="padding:8px;text-align:right;font-weight:800;border:1px solid #d1d5db;text-transform:uppercase;">TOTAL</td><td colspan="3" style="border:1px solid #d1d5db;"></td><td style="padding:8px;text-align:right;font-weight:800;border:1px solid #d1d5db;">${fmtCurrencyLocal(total)}</td></tr>
      </tfoot>
    </table>
  </div>
  ${data.notes ? `<div style="padding:0 24px 8px;"><div style="font-weight:700;text-transform:uppercase;margin-bottom:4px;font-size:${printFontSize}px;">Special Instructions</div><div style="background:#f8fafc;padding:10px 12px;border:1px solid #d1d5db;border-radius:4px;font-size:${printFontSize}px;white-space:pre-line;">${data.notes}</div></div>` : ''}
  <div style="padding:0 24px 8px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
    <div style="border:1px solid #d1d5db;border-radius:4px;padding:10px;text-align:center;">
      <div style="font-weight:700;text-transform:uppercase;border-bottom:2px solid #e2e8f0;padding-bottom:4px;margin-bottom:8px;font-size:${printFontSize}px;">Requested By</div>
      <div style="font-size:${printFontSize}px;"><div style="color:#666;text-transform:uppercase;font-size:${printFontSize - 2}px;">Name</div><div style="font-weight:600;">${data.requestedBy || '—'}</div></div>
    </div>
    <div style="border:1px solid #d1d5db;border-radius:4px;padding:10px;text-align:center;">
      <div style="font-weight:700;text-transform:uppercase;border-bottom:2px solid #e2e8f0;padding-bottom:4px;margin-bottom:8px;font-size:${printFontSize}px;">Approved By</div>
      <div style="font-size:${printFontSize}px;"><div style="color:#666;text-transform:uppercase;font-size:${printFontSize - 2}px;">Name</div><div style="font-weight:600;">${data.approvedBy || '—'}</div></div>
    </div>
    <div style="border:1px solid #d1d5db;border-radius:4px;padding:10px;text-align:center;">
      <div style="font-weight:700;text-transform:uppercase;border-bottom:2px solid #e2e8f0;padding-bottom:4px;margin-bottom:8px;font-size:${printFontSize}px;">Date</div>
      <div style="font-size:${printFontSize}px;"><div style="color:#666;text-transform:uppercase;font-size:${printFontSize - 2}px;">Authorization</div><div style="font-weight:600;">${data.authorizationDate ? new Date(data.authorizationDate).toLocaleDateString() : '—'}</div></div>
    </div>
  </div>
  <div style="padding:6px 24px;border-top:3px solid #000;margin-top:8px;display:flex;justify-content:space-between;font-size:${printFontSize}px;">
    <div style="font-weight:700;">Thank you for your business!</div>
    <div style="opacity:0.8;">Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
  </div>
  <script>window.onload = function() { window.print(); }</script>
</body></html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
  };

  const handleShareOrder = async (order: SavedPurchaseOrder) => {
    try {
      const data = order.data || order;
      const items = Array.isArray(data.items) ? data.items : [];
      const subtotal = data.subtotal || items.reduce((sum: number, item: any) => sum + (item.total || 0), 0);
      const total = data.total || subtotal + (data.tax || 0) + (data.shipping || 0) - (data.discount || 0);
      const fmtCurrencyLocal = (amount: number) => {
        const businessCurrency = localStorage.getItem('businessCurrency') || 'TSh';
        return `${businessCurrency} ${amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      };

      const lines: string[] = [];
      lines.push('═══════════════════════════════════');
      lines.push('   PURCHASE ORDER');
      lines.push(`   #${data.poNumber}`);
      lines.push('═══════════════════════════════════');
      lines.push('');
      lines.push(`Date: ${new Date(data.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`);
      lines.push(`Status: ${(data.status || 'completed').toUpperCase()}`);
      lines.push('');
      lines.push('─── FROM (Business) ───');
      lines.push(`  ${data.businessName || 'N/A'}`);
      if (data.businessAddress) lines.push(`  ${data.businessAddress}`);
      if (data.businessPhone) lines.push(`  Phone: ${data.businessPhone}`);
      if (data.businessEmail) lines.push(`  Email: ${data.businessEmail}`);
      lines.push('');
      lines.push('─── TO (Supplier) ───');
      lines.push(`  ${data.supplierName || 'N/A'}`);
      if (data.supplierAddress) lines.push(`  ${data.supplierAddress}`);
      if (data.supplierPhone) lines.push(`  Phone: ${data.supplierPhone}`);
      if (data.supplierEmail) lines.push(`  Email: ${data.supplierEmail}`);
      lines.push('');
      if (data.paymentTerms || data.deliveryInstructions) {
        lines.push('─── DETAILS ───');
        if (data.paymentTerms) lines.push(`  Payment Terms: ${data.paymentTerms}`);
        if (data.deliveryInstructions) lines.push(`  Ship Via: ${data.deliveryInstructions}`);
        if (data.expectedDelivery) lines.push(`  Required By: ${data.expectedDelivery}`);
        lines.push('');
      }
      lines.push('─── ITEMS ───');
      items.forEach((item: any, index: number) => {
        lines.push(`  ${String(index + 1).padStart(2, '0')}. ${item.description || 'Item'} | Qty: ${item.quantity} ${item.unit || ''} | ${fmtCurrencyLocal(item.unitPrice || 0)} ea | ${fmtCurrencyLocal(item.total || 0)}`);
      });
      lines.push('');
      lines.push('─── SUMMARY ───');
      lines.push(`  Subtotal:  ${fmtCurrencyLocal(subtotal)}`);
      if (data.tax) lines.push(`  Tax:       ${fmtCurrencyLocal(data.tax)}`);
      if (data.discount) lines.push(`  Discount: -${fmtCurrencyLocal(data.discount)}`);
      if (data.shipping) lines.push(`  Shipping:  ${fmtCurrencyLocal(data.shipping)}`);
      lines.push(`  TOTAL:     ${fmtCurrencyLocal(total)}`);
      lines.push('');
      lines.push('─── AUTHORIZATION ───');
      lines.push(`  Requested By: ${data.requestedBy || '—'}`);
      lines.push(`  Approved By: ${data.approvedBy || '—'}`);
      if (data.authorizationDate) lines.push(`  Date: ${new Date(data.authorizationDate).toLocaleDateString()}`);
      if (data.notes) {
        lines.push('');
        lines.push('─── NOTES ───');
        lines.push(`  ${data.notes}`);
      }
      lines.push('');
      lines.push('───────────────────────────────────');
      lines.push(`${data.businessName || ''} ${data.businessPhone ? '| ' + data.businessPhone : ''}`);

      const messageText = lines.join('\n');
      const shareData: { title: string; text: string } = {
        title: `Purchase Order #${data.poNumber}`,
        text: messageText
      };

      if (navigator.share) {
        try {
          await navigator.share(shareData);
          toast({ title: "Shared", description: "Purchase order shared successfully" });
        } catch (error: any) {
          if (error.name !== 'AbortError') {
            try { await navigator.clipboard.writeText(messageText); toast({ title: "Copied", description: "Order details copied to clipboard" }); } catch { toast({ title: "Error", description: "Failed to share", variant: "destructive" }); }
          }
        }
      } else {
        try { await navigator.clipboard.writeText(messageText); toast({ title: "Copied", description: "Order details copied to clipboard" }); } catch { toast({ title: "Info", description: "Sharing not supported on this device" }); }
      }
    } catch (error) {
      console.error('Error sharing purchase order:', error);
      toast({ title: "Error", description: "Failed to share the order", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {selectedOrder ? (
        <div className="min-h-screen bg-white">
          {/* Action Bar */}
          <div className="sticky top-0 z-50 bg-white border-b shadow-sm">
            <div className="container mx-auto px-4 py-3 flex items-center justify-between">
              <Button onClick={() => setSelectedOrder(null)} variant="outline" size="sm">
                ← Back to Saved Orders
              </Button>
              <div className="flex gap-2 items-center">
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-medium">Font:</label>
                  <select
                    value={printFontSize}
                    onChange={(e) => setPrintFontSize(Number(e.target.value))}
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                  >
                    {[8,9,10,11,12,14,16,18,20].map(s => <option key={s} value={s}>{s}px</option>)}
                  </select>
                </div>
                <Button onClick={() => handlePrintOrder(selectedOrder)} size="sm">
                  <Printer className="h-4 w-4 mr-2" /> Print
                </Button>
                <Button onClick={() => handleShareOrder(selectedOrder)} size="sm" variant="outline">
                  <Share2 className="h-4 w-4 mr-2" /> Share
                </Button>
              </div>
            </div>
          </div>

          {/* Document Content */}
          <div className="container mx-auto max-w-[850px] py-6 px-0">
            <div className="h-1 bg-black" />
            <div className="text-center py-3 px-6 border-b-[3px] border-black">
              <h1 className="text-2xl font-extrabold uppercase tracking-wide">Purchase Order</h1>
              <p className="text-sm font-semibold">#{selectedOrder.poNumber}</p>
              <p className="text-[10px] font-bold uppercase tracking-wide mt-1 border border-black inline-block px-2 py-0.5 rounded">Original Copy</p>
            </div>

            {/* Meta Bar */}
            <div className="bg-gray-50 px-6 py-2 flex justify-between items-center border-b-2 border-gray-200">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase text-gray-600">Date</span>
                <span className="text-xs font-bold">{new Date(selectedOrder.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase text-gray-600">Status</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${selectedOrder.status === 'completed' ? 'bg-green-100 text-green-800' : selectedOrder.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {selectedOrder.status.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Party Sections */}
            <div className="px-6 py-3 flex gap-4">
              <div className="flex-1 border rounded overflow-hidden">
                <div className="bg-gray-100 px-3 py-2 text-xs font-bold uppercase tracking-wide">From (Business)</div>
                <div className="p-3">
                  <p className="font-bold text-sm border-b-2 border-gray-200 pb-1 mb-1">{selectedOrder.businessName || 'N/A'}</p>
                  {selectedOrder.businessAddress && <p className="text-xs text-gray-700">{selectedOrder.businessAddress}</p>}
                  {selectedOrder.businessPhone && <p className="text-xs text-gray-700">Phone: {selectedOrder.businessPhone}</p>}
                  {selectedOrder.businessEmail && <p className="text-xs text-gray-700">Email: {selectedOrder.businessEmail}</p>}
                </div>
              </div>
              <div className="flex-1 border rounded overflow-hidden">
                <div className="bg-gray-100 px-3 py-2 text-xs font-bold uppercase tracking-wide">To (Supplier)</div>
                <div className="p-3">
                  <p className="font-bold text-sm border-b-2 border-gray-200 pb-1 mb-1">{selectedOrder.supplierName || 'N/A'}</p>
                  {selectedOrder.supplierAddress && <p className="text-xs text-gray-700">{selectedOrder.supplierAddress}</p>}
                  {selectedOrder.supplierPhone && <p className="text-xs text-gray-700">Phone: {selectedOrder.supplierPhone}</p>}
                  {selectedOrder.supplierEmail && <p className="text-xs text-gray-700">Email: {selectedOrder.supplierEmail}</p>}
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="px-6 pb-3">
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-gray-50 p-2 text-center">
                  <div className="text-[10px] font-semibold uppercase text-gray-500">Payment Terms</div>
                  <div className="text-sm font-extrabold">{selectedOrder.paymentTerms || '—'}</div>
                </div>
                <div className="bg-gray-50 p-2 text-center">
                  <div className="text-[10px] font-semibold uppercase text-gray-500">Ship Via</div>
                  <div className="text-sm font-extrabold">{selectedOrder.deliveryInstructions || '—'}</div>
                </div>
                <div className="bg-gray-50 p-2 text-center">
                  <div className="text-[10px] font-semibold uppercase text-gray-500">Total Items</div>
                  <div className="text-sm font-extrabold">{selectedOrder.items.length}</div>
                </div>
                <div className="bg-gray-50 p-2 text-center">
                  <div className="text-[10px] font-semibold uppercase text-gray-500">Grand Total</div>
                  <div className="text-sm font-extrabold">{formatCurrency(selectedOrder.total)}</div>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="px-6 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wide mb-2 flex items-center gap-2">
                <span className="w-[3px] h-3.5 bg-black rounded-sm inline-block" /> Items Ordered
              </h3>
              <div className="overflow-x-auto border border-gray-300">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b-2 border-gray-300">
                      <th className="text-center px-2 py-2 font-bold uppercase tracking-wider border-r border-gray-200 w-8">#</th>
                      <th className="text-left px-2 py-2 font-bold uppercase tracking-wider border-r border-gray-200">Description</th>
                      <th className="text-center px-2 py-2 font-bold uppercase tracking-wider border-r border-gray-200 w-16">Qty</th>
                      <th className="text-center px-2 py-2 font-bold uppercase tracking-wider border-r border-gray-200 w-16">Unit</th>
                      <th className="text-right px-2 py-2 font-bold uppercase tracking-wider border-r border-gray-200 w-24">Unit Price</th>
                      <th className="text-right px-2 py-2 font-bold uppercase tracking-wider w-24">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map((item, index) => (
                      <tr key={index} className={index % 2 === 1 ? 'bg-gray-50' : ''}>
                        <td className="text-center px-2 py-2 font-bold border-r border-gray-200 border-b border-gray-200">{String(index + 1).padStart(2, '0')}</td>
                        <td className="px-2 py-2 font-semibold border-r border-gray-200 border-b border-gray-200">{item.description}</td>
                        <td className="text-center px-2 py-2 border-r border-gray-200 border-b border-gray-200">{item.quantity}</td>
                        <td className="text-center px-2 py-2 border-r border-gray-200 border-b border-gray-200">{item.unit || '-'}</td>
                        <td className="text-right px-2 py-2 border-r border-gray-200 border-b border-gray-200">{formatCurrency(item.unitPrice)}</td>
                        <td className="text-right px-2 py-2 font-bold border-b border-gray-200">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 border-t-2 border-gray-300">
                      <td colSpan={4} className="text-right px-2 py-2 font-bold uppercase text-[10px] tracking-wide border-r border-gray-200">Subtotal</td>
                      <td colSpan={2} className="text-right px-2 py-2 font-bold">{formatCurrency(selectedOrder.subtotal)}</td>
                    </tr>
                    {selectedOrder.tax > 0 && (
                      <tr className="bg-gray-100">
                        <td colSpan={4} className="text-right px-2 py-2 font-bold uppercase text-[10px] tracking-wide border-r border-gray-200">Tax</td>
                        <td colSpan={2} className="text-right px-2 py-2 font-bold">{formatCurrency(selectedOrder.tax)}</td>
                      </tr>
                    )}
                    {selectedOrder.shipping > 0 && (
                      <tr className="bg-gray-100">
                        <td colSpan={4} className="text-right px-2 py-2 font-bold uppercase text-[10px] tracking-wide border-r border-gray-200">Shipping</td>
                        <td colSpan={2} className="text-right px-2 py-2 font-bold">{formatCurrency(selectedOrder.shipping)}</td>
                      </tr>
                    )}
                    <tr className="bg-gray-200">
                      <td colSpan={4} className="text-right px-2 py-2 font-extrabold uppercase text-xs tracking-wide border-r border-gray-200">Grand Total</td>
                      <td colSpan={2} className="text-right px-2 py-2 font-extrabold text-sm">{formatCurrency(selectedOrder.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Notes */}
            {selectedOrder.notes && (
              <div className="px-6 pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wide mb-1 flex items-center gap-2">
                  <span className="w-[3px] h-3.5 bg-black rounded-sm inline-block" /> Special Instructions
                </h3>
                <p className="text-xs whitespace-pre-line bg-gray-50 p-3 rounded border text-gray-700">{selectedOrder.notes}</p>
              </div>
            )}

            {/* Authorization */}
            <div className="px-6 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wide mb-2 flex items-center gap-2">
                <span className="w-[3px] h-3.5 bg-black rounded-sm inline-block" /> Authorization
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="border rounded p-3 text-center">
                  <div className="text-[10px] font-bold uppercase tracking-wide border-b-2 border-gray-200 pb-1 mb-2">Requested By</div>
                  <div className="text-xs font-semibold">{selectedOrder.requestedBy || '—'}</div>
                </div>
                <div className="border rounded p-3 text-center">
                  <div className="text-[10px] font-bold uppercase tracking-wide border-b-2 border-gray-200 pb-1 mb-2">Approved By</div>
                  <div className="text-xs font-semibold">{selectedOrder.approvedBy || '—'}</div>
                </div>
                <div className="border rounded p-3 text-center">
                  <div className="text-[10px] font-bold uppercase tracking-wide border-b-2 border-gray-200 pb-1 mb-2">Date</div>
                  <div className="text-xs font-semibold">{selectedOrder.authorizationDate ? new Date(selectedOrder.authorizationDate).toLocaleDateString() : '—'}</div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 mt-4">
              <div className="border-t-2 border-gray-300 pt-3 flex justify-between">
                <div className="text-[10px] text-gray-500">Generated on {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                <div className="text-[10px] text-gray-500">Purchase Order #{selectedOrder.poNumber}</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
            <div className="container mx-auto px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">← Back</button>
                <h1 className="text-xl font-bold">Saved Purchase Orders</h1>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">Welcome, {username}</span>
                <Button variant="outline" size="sm" onClick={onLogout}>Logout</Button>
              </div>
            </div>
          </div>

          <main className="container mx-auto p-4 sm:p-6">
            <div className="mb-8 sm:mb-10">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 flex items-center gap-2">
                    <FileText className="h-8 w-8 text-primary" /> Saved Purchase Orders
                  </h2>
                  <p className="text-muted-foreground text-sm sm:text-base md:text-lg">View and manage purchase orders placed to suppliers</p>
                </div>
                <div className="flex flex-wrap gap-3 items-center">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <Input type="date" value={dateRange.start} onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))} className="w-40" />
                  </div>
                  <span className="text-muted-foreground">to</span>
                  <div className="flex items-center gap-2">
                    <Input type="date" value={dateRange.end} onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))} className="w-40" />
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search by number, supplier..." className="pl-10 py-5 text-responsive-base w-64" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-64"><p>Loading purchase orders...</p></div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Saved Purchase Orders</h3>
                <p className="text-muted-foreground mb-4">{searchTerm ? "No orders match your search." : "You haven't created any purchase orders yet."}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {filteredOrders.map((order) => (
                  <PurchaseOrderCard
                    key={order.id}
                    order={{ id: order.id, poNumber: order.poNumber, date: order.date, supplierName: order.supplierName, items: order.items.length, total: order.total, status: order.status }}
                    onViewDetails={() => setSelectedOrder(order)}
                    onPrint={() => handlePrintOrder(order)}
                    onDownload={() => handlePrintOrder(order)}
                    onShare={() => handleShareOrder(order)}
                    onDelete={() => handleDeleteOrder(order.id)}
                  />
                ))}
              </div>
            )}
          </main>
        </>
      )}
    </div>
  );
};
