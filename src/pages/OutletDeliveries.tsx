import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Truck, 
  Search, 
  ArrowLeft, 
  Calendar,
  Package,
  User,
  MapPin,
  Eye,
  Printer,
  Download,
  Share2,
  FileText,
  ChevronDown,
  Plus,
  Pencil,
  Building,
  Loader2
} from "lucide-react";
import { getDeliveriesByOutletId, DeliveryData } from "@/utils/deliveryUtils";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/lib/supabaseClient";
import { getOutlets, Outlet, getInventoryProductsByOutlet, InventoryProduct } from "@/services/databaseService";
import { DeliveryDetails } from "@/components/DeliveryDetails";

interface OutletDeliveriesProps {
  onBack: () => void;
  outletId?: string;
}

export const OutletDeliveries = ({ onBack, outletId }: OutletDeliveriesProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState<"all" | "in" | "out">("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "investment" | "outlet">("all"); // Filter for delivery source
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: ''
  });
  const [deliveries, setDeliveries] = useState<DeliveryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingDelivery, setViewingDelivery] = useState<DeliveryData | null>(null);
  const [showNewDeliveryDialog, setShowNewDeliveryDialog] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<DeliveryData | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingItems, setEditingItems] = useState<any[]>([]);
  const [showEditItemDialog, setShowEditItemDialog] = useState(false);
  const [editItemForm, setEditItemForm] = useState({
    description: '',
    quantity: 0,
    rate: 0
  });
  const [editItemIndex, setEditItemIndex] = useState<number | null>(null);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loadingOutlets, setLoadingOutlets] = useState(false);
  const [inventoryProducts, setInventoryProducts] = useState<InventoryProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [isSavingDelivery, setIsSavingDelivery] = useState(false);
  const [isEditingDelivery, setIsEditingDelivery] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [editProductSearchTerm, setEditProductSearchTerm] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [showEditProductDropdown, setShowEditProductDropdown] = useState(false);
  const [newDeliveryForm, setNewDeliveryForm] = useState({
    deliveryNoteNumber: `DO-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${String(Date.now()).slice(-6)}`,
    deliveryDate: new Date().toISOString().split('T')[0],
    sourceBusinessName: '',
    sourceAddress: '',
    destinationOutlet: '',
    destinationAddress: '',
    driverName: '',
    vehicleNumber: '',
    paymentMethod: 'credit',
    status: 'pending',
    notes: '',
    preparedByName: '',
    preparedByDate: '',
    receivedByName: '',
    receivedByDate: ''
  });
  const [deliveryItems, setDeliveryItems] = useState<Array<{
    id: string;
    description: string;
    quantity: number;
    rate: number;
  }>>([]);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [itemForm, setItemForm] = useState({
    description: '',
    quantity: 0,
    rate: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    loadDeliveries();
    loadOutlets();
  }, [outletId]);

  // Set source address when current outlet is loaded
  useEffect(() => {
    if (outlets.length > 0 && outletId) {
      const currentOutlet = outlets.find(o => o.id === outletId);
      if (currentOutlet) {
        // Use address if available, otherwise use location
        const outletAddress = currentOutlet.address || currentOutlet.location || '';
        setNewDeliveryForm(prev => ({
          ...prev,
          sourceBusinessName: currentOutlet.name || '',
          sourceAddress: outletAddress
        }));
      }
    }
  }, [outlets, outletId]);

  const loadOutlets = async () => {
    try {
      setLoadingOutlets(true);
      const data = await getOutlets();
      setOutlets(data);
      
      // Load inventory products for the current outlet
      if (outletId) {
        const products = await getInventoryProductsByOutlet(outletId);
        setInventoryProducts(products);
      }
    } catch (error) {
      console.error("Error loading outlets:", error);
    } finally {
      setLoadingOutlets(false);
    }
  };

  const loadDeliveries = async () => {
    if (!outletId) {
      setDeliveries([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Fetch incoming deliveries (Deliveries In)
      const incomingData = await getDeliveriesByOutletId(outletId);
      
      // Fetch outgoing deliveries (Deliveries Out)
      const { data: outgoingData, error: outgoingError } = await supabase
        .from('outlet_deliveries_out')
        .select(`
          *,
          outlet_deliveries_out_items (*)
        `)
        .eq('outlet_id', outletId)
        .order('delivery_date', { ascending: false });

      if (outgoingError) {
        console.error("Error loading outgoing deliveries:", outgoingError);
      }

      // Transform outgoing deliveries to match DeliveryData format
      const outgoingDeliveries: DeliveryData[] = (outgoingData || []).map((outgoing: any) => {
        const items = outgoing.outlet_deliveries_out_items || [];
        const totalAmount = items.reduce((sum: number, item: any) => sum + (item.total_price || 0), 0);
        
        return {
          id: outgoing.id,
          deliveryNoteNumber: outgoing.delivery_note_number,
          date: outgoing.delivery_date,
          customer: outgoing.destination_outlet,
          items: outgoing.items_count,
          total: totalAmount || outgoing.total_amount,
          paymentMethod: outgoing.payment_method,
          status: outgoing.status,
          driver: outgoing.driver_name,
          vehicle: outgoing.vehicle_number,
          deliveryNotes: outgoing.delivery_notes,
          outletId: outgoing.outlet_id,
          deliveryType: 'out', // Mark as outgoing delivery
          // Add source business info for DeliveryDetails component
          businessName: outgoing.source_business_name || null,
          businessAddress: outgoing.source_address || null,
          preparedByName: outgoing.prepared_by_name || null,
          preparedByDate: outgoing.prepared_by_date || null,
          receivedByName: outgoing.received_by_name || null,
          receivedByDate: outgoing.received_by_date || null,
          itemsList: items.map((item: any) => ({
            description: item.product_name || item.description,
            quantity: item.quantity,
            delivered: item.delivered_quantity,
            rate: item.selling_price,
            price: item.selling_price,
            sellingPrice: item.selling_price,
            unitPrice: item.selling_price
          }))
        };
      });

      // Mark incoming deliveries and enrich with source outlet names
      const incomingDeliveriesWithType: DeliveryData[] = incomingData.map(delivery => {
        const sourceOutlet = outlets.find(o => o.id === delivery.sourceOutletId);
        return {
          ...delivery,
          deliveryType: 'in' as const, // Mark as incoming delivery
          sourceOutletName: sourceOutlet?.name || 'Unknown Outlet'
        };
      });

      // Combine incoming and outgoing deliveries
      const allDeliveries = [...incomingDeliveriesWithType, ...outgoingDeliveries];
      setDeliveries(allDeliveries);
    } catch (error) {
      console.error("Error loading deliveries:", error);
      toast({
        title: "Error",
        description: "Failed to load deliveries. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const filteredDeliveries = deliveries.filter(delivery => {
    // Search filter
    const matchesSearch = 
      delivery.deliveryNoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (delivery.driver && delivery.driver.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Status filter
    const matchesStatus = !statusFilter || delivery.status === statusFilter;
    
    // Section filter (All, Deliveries In, Deliveries Out)
    let matchesSection = true;
    if (sectionFilter === "in") {
      // Deliveries In: deliveries TO the outlet (incoming stock)
      matchesSection = delivery.deliveryType === 'in';
    } else if (sectionFilter === "out") {
      // Deliveries Out: deliveries FROM the outlet (outgoing sales)
      matchesSection = delivery.deliveryType === 'out';
    }
    
    // Source filter (only applies when sectionFilter is "in")
    let matchesSource = true;
    if (sectionFilter === "in" && sourceFilter !== "all") {
      matchesSource = delivery.sourceType === sourceFilter;
    }
    
    // Date range filter
    let matchesDateRange = true;
    if (dateRange.start || dateRange.end) {
      const deliveryDate = new Date(delivery.date);
      if (dateRange.start) {
        const startDate = new Date(dateRange.start);
        startDate.setHours(0, 0, 0, 0);
        matchesDateRange = matchesDateRange && deliveryDate >= startDate;
      }
      if (dateRange.end) {
        const endDate = new Date(dateRange.end);
        endDate.setHours(23, 59, 59, 999);
        matchesDateRange = matchesDateRange && deliveryDate <= endDate;
      }
    }
    
    return matchesSearch && matchesStatus && matchesSection && matchesSource && matchesDateRange;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'in-transit': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleViewDelivery = (delivery: DeliveryData) => {
    // Set the delivery to view in the dialog
    setViewingDelivery(delivery);
  };

  const handleEditDelivery = (delivery: DeliveryData) => {
    setEditingDelivery(delivery);
    setEditingItems(delivery.itemsList || []);
    setShowEditDialog(true);
  };

  const handleAddEditItem = (index: number | null = null) => {
    setEditItemIndex(index);
    if (index !== null && editingItems[index]) {
      setEditItemForm({
        description: editingItems[index].description || editingItems[index].name || '',
        quantity: editingItems[index].quantity || editingItems[index].delivered || 0,
        rate: editingItems[index].rate || editingItems[index].price || 0
      });
    } else {
      setEditItemForm({ description: '', quantity: 0, rate: 0 });
    }
    setShowEditItemDialog(true);
  };

  const handleSaveEditItem = () => {
    if (!editItemForm.description || editItemForm.quantity <= 0 || editItemForm.rate <= 0) {
      toast({
        title: "Error",
        description: "Please fill in all item fields correctly",
        variant: "destructive"
      });
      return;
    }

    const updatedItem = {
      description: editItemForm.description,
      name: editItemForm.description,
      quantity: editItemForm.quantity,
      delivered: editItemForm.quantity,
      rate: editItemForm.rate,
      price: editItemForm.rate,
      sellingPrice: editItemForm.rate,
      unitPrice: editItemForm.rate
    };

    if (editItemIndex !== null) {
      // Update existing item
      setEditingItems(prev => {
        const updated = [...prev];
        updated[editItemIndex] = updatedItem;
        return updated;
      });
    } else {
      // Add new item
      setEditingItems(prev => [...prev, updatedItem]);
    }

    setShowEditItemDialog(false);
    setEditItemForm({ description: '', quantity: 0, rate: 0 });
  };

  const handleDeleteEditItem = (index: number) => {
    setEditingItems(prev => prev.filter((_, i) => i !== index));
    toast({
      title: "Item Removed",
      description: "Item has been removed from the delivery"
    });
  };

  const calculateEditTotal = () => {
    return editingItems.reduce((sum, item) => {
      const qty = item.quantity || item.delivered || 0;
      const rate = item.rate || item.price || 0;
      return sum + (qty * rate);
    }, 0);
  };

  // Individual delivery export actions
  const handlePrintDelivery = (delivery: DeliveryData) => {
    handleViewDelivery(delivery);
  };

  const handleDownloadDelivery = (delivery: DeliveryData) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('DELIVERY NOTE', 14, 20);
    doc.setFontSize(12);
    doc.text(delivery.deliveryNoteNumber, 14, 28);
    doc.setFontSize(10);
    doc.text(`Date: ${delivery.date}`, 14, 36);
    doc.text(`Status: ${delivery.status.toUpperCase()}`, 14, 42);
    doc.text(`Customer: ${delivery.customer}`, 14, 50);
    if (delivery.driver) doc.text(`Driver: ${delivery.driver}`, 14, 56);
    if (delivery.vehicle) doc.text(`Vehicle: ${delivery.vehicle}`, 14, 62);
    
    const itemsList = delivery.itemsList || [];
    const tableData = itemsList.map((item: any) => [
      item.description || item.name || 'N/A',
      (item.quantity || item.delivered || 0).toString(),
      formatCurrency(item.rate || item.price || 0),
      formatCurrency((item.quantity || item.delivered || 0) * (item.rate || item.price || 0))
    ]);
    
    autoTable(doc, {
      startY: 70,
      head: [['Description', 'Quantity', 'Rate', 'Amount']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [245, 158, 11] },
    });
    
    const finalY = (doc as any).lastAutoTable?.finalY || 80;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`Total: ${formatCurrency(delivery.total)}`, 14, finalY + 10);
    
    if (delivery.deliveryNotes) {
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text('Notes:', 14, finalY + 20);
      doc.text(delivery.deliveryNotes, 14, finalY + 26);
    }
    
    const filename = `delivery-${delivery.deliveryNoteNumber}-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
    toast({ title: "Downloaded", description: `PDF: ${filename}` });
  };

  const handleExportDeliveryXLS = (delivery: DeliveryData) => {
    const itemsList = delivery.itemsList || [];
    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head><meta charset="UTF-8"><style>td, th { padding: 5px; border: 1px solid #ccc; } th { background: #f59e0b; color: white; }</style></head>
      <body>
        <table>
          <tr><td colspan="4" style="font-weight: bold;">DELIVERY NOTE</td></tr>
          <tr><td colspan="4">${delivery.deliveryNoteNumber}</td></tr>
          <tr><td>Date:</td><td>${delivery.date}</td><td>Status:</td><td>${delivery.status}</td></tr>
          <tr><td>Customer:</td><td>${delivery.customer}</td><td>Driver:</td><td>${delivery.driver || 'N/A'}</td></tr>
          <tr><td>Vehicle:</td><td>${delivery.vehicle || 'N/A'}</td><td></td><td></td></tr>
          <tr><th>Description</th><th>Quantity</th><th>Rate</th><th>Amount</th></tr>
    `;
    
    itemsList.forEach((item: any) => {
      const qty = item.quantity || item.delivered || 0;
      const rate = item.rate || item.price || 0;
      const amount = qty * rate;
      html += `<tr><td>${item.description || item.name || 'N/A'}</td><td>${qty}</td><td>${rate}</td><td>${amount}</td></tr>`;
    });
    
    html += `
          <tr style="font-weight: bold;"><td colspan="3" style="text-align: right;">Total:</td><td>${delivery.total}</td></tr>
        </table>
        ${delivery.deliveryNotes ? `<p><strong>Notes:</strong> ${delivery.deliveryNotes}</p>` : ''}
      </body></html>
    `;
    
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filename = `delivery-${delivery.deliveryNoteNumber}-${new Date().toISOString().split('T')[0]}.xls`;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: `Excel: ${filename}` });
  };

  const handleShareDeliveryPDF = async (delivery: DeliveryData) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('DELIVERY NOTE', 14, 20);
    doc.setFontSize(12);
    doc.text(delivery.deliveryNoteNumber, 14, 28);
    doc.setFontSize(10);
    doc.text(`Date: ${delivery.date}`, 14, 36);
    doc.text(`Status: ${delivery.status.toUpperCase()}`, 14, 42);
    doc.text(`Customer: ${delivery.customer}`, 14, 50);
    if (delivery.driver) doc.text(`Driver: ${delivery.driver}`, 14, 56);
    if (delivery.vehicle) doc.text(`Vehicle: ${delivery.vehicle}`, 14, 62);
    
    const itemsList = delivery.itemsList || [];
    const tableData = itemsList.map((item: any) => [
      item.description || item.name || 'N/A',
      (item.quantity || item.delivered || 0).toString(),
      formatCurrency(item.rate || item.price || 0),
      formatCurrency((item.quantity || item.delivered || 0) * (item.rate || item.price || 0))
    ]);
    
    autoTable(doc, {
      startY: 70,
      head: [['Description', 'Quantity', 'Rate', 'Amount']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [245, 158, 11] },
    });
    
    const finalY = (doc as any).lastAutoTable?.finalY || 80;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`Total: ${formatCurrency(delivery.total)}`, 14, finalY + 10);
    
    if (delivery.deliveryNotes) {
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text('Notes:', 14, finalY + 20);
      doc.text(delivery.deliveryNotes, 14, finalY + 26);
    }
    
    const pdfBlob = doc.output('blob');
    const pdfFile = new File([pdfBlob], `delivery-${delivery.deliveryNoteNumber}.pdf`, { type: 'application/pdf' });
    
    if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      try {
        await navigator.share({ files: [pdfFile], title: `Delivery ${delivery.deliveryNoteNumber}` });
        toast({ title: "Shared", description: "PDF shared successfully" });
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          doc.save(`delivery-${delivery.deliveryNoteNumber}.pdf`);
          toast({ title: "Downloaded", description: "Sharing failed, PDF downloaded" });
        }
      }
    } else {
      doc.save(`delivery-${delivery.deliveryNoteNumber}.pdf`);
      toast({ title: "Downloaded", description: "Sharing not supported, PDF downloaded" });
    }
  };

  // Export actions
  const handlePrintReport = () => {
    if (filteredDeliveries.length === 0) {
      toast({ title: "No Data", description: "No deliveries to print", variant: "destructive" });
      return;
    }

    const totalValue = filteredDeliveries.reduce((sum, d) => sum + d.total, 0);
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: "Print Failed", description: "Please allow popups", variant: "destructive" });
      return;
    }

    const rows = filteredDeliveries.map(d => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${d.deliveryNoteNumber}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${d.date}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${d.customer}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;"><span style="padding: 3px 10px; border-radius: 10px; background: ${d.status === 'delivered' ? '#d4edda' : d.status === 'in-transit' ? '#cce5ff' : d.status === 'pending' ? '#fff3cd' : '#f8d7da'}; color: ${d.status === 'delivered' ? '#155724' : d.status === 'in-transit' ? '#004085' : d.status === 'pending' ? '#856404' : '#721c24'}; font-size: 12px;">${d.status}</span></td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${d.items}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${formatCurrency(d.total)}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Deliveries Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #f59e0b; padding-bottom: 20px; }
          .header h1 { font-size: 28px; color: #f59e0b; margin-bottom: 10px; }
          .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px; }
          .stat-card { background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; }
          .stat-card h3 { font-size: 12px; color: #666; margin-bottom: 5px; text-transform: uppercase; }
          .stat-card p { font-size: 20px; font-weight: bold; color: #f59e0b; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #f59e0b; color: white; padding: 10px; text-align: left; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>OUTLET DELIVERIES REPORT</h1>
          <p>Generated: ${new Date().toLocaleString()}</p>
        </div>
        <div class="stats">
          <div class="stat-card">
            <h3>Total Deliveries</h3>
            <p>${filteredDeliveries.length}</p>
          </div>
          <div class="stat-card">
            <h3>Total Items</h3>
            <p>${filteredDeliveries.reduce((sum, d) => sum + d.items, 0)}</p>
          </div>
          <div class="stat-card">
            <h3>Total Value</h3>
            <p>${formatCurrency(totalValue)}</p>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Note Number</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Status</th>
              <th style="text-align: center;">Items</th>
              <th style="text-align: right;">Total Value</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="footer">
          <p>End of Report</p>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  const handleDownload = () => {
    if (filteredDeliveries.length === 0) {
      toast({ title: "No Data", description: "No deliveries to download", variant: "destructive" });
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Outlet Deliveries Report', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
    
    const totalValue = filteredDeliveries.reduce((sum, d) => sum + d.total, 0);
    doc.text(`Total Deliveries: ${filteredDeliveries.length}`, 14, 36);
    doc.text(`Total Value: ${formatCurrency(totalValue)}`, 14, 42);
    
    const tableData = filteredDeliveries.map(d => [
      d.deliveryNoteNumber, d.date, d.customer, d.status, d.items.toString(), formatCurrency(d.total)
    ]);
    
    autoTable(doc, {
      startY: 50,
      head: [['Note Number', 'Date', 'Customer', 'Status', 'Items', 'Total Value']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [245, 158, 11] },
    });
    
    const filename = `deliveries-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
    toast({ title: "Downloaded", description: `PDF: ${filename}` });
  };

  const handleExportXLS = () => {
    if (filteredDeliveries.length === 0) {
      toast({ title: "No Data", description: "No deliveries to export", variant: "destructive" });
      return;
    }

    const totalValue = filteredDeliveries.reduce((sum, d) => sum + d.total, 0);
    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head><meta charset="UTF-8"><style>td, th { padding: 5px; border: 1px solid #ccc; } th { background: #f59e0b; color: white; }</style></head>
      <body><table>
        <tr><td colspan="6" style="font-weight: bold;">Outlet Deliveries Report</td></tr>
        <tr><td colspan="6">Total Deliveries: ${filteredDeliveries.length} | Total Value: ${formatCurrency(totalValue)}</td></tr>
        <tr><th>Note Number</th><th>Date</th><th>Customer</th><th>Status</th><th>Items</th><th>Total Value</th></tr>
    `;
    
    filteredDeliveries.forEach(d => {
      html += `<tr><td>${d.deliveryNoteNumber}</td><td>${d.date}</td><td>${d.customer}</td><td>${d.status}</td><td>${d.items}</td><td>${d.total}</td></tr>`;
    });
    
    html += '</table></body></html>';
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filename = `deliveries-${new Date().toISOString().split('T')[0]}.xls`;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: `Excel: ${filename}` });
  };

  const handleCreateDelivery = async () => {
    if (!outletId) {
      toast({
        title: "Error",
        description: "No outlet selected",
        variant: "destructive"
      });
      return;
    }

    if (!newDeliveryForm.deliveryNoteNumber || !newDeliveryForm.destinationOutlet) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "destructive"
      });
      return;
    }

    // Validate required fields: Driver Name, Prepared By Name, Prepared By Date
    if (!newDeliveryForm.driverName || !newDeliveryForm.driverName.trim()) {
      toast({
        title: "Error",
        description: "Driver Name is required",
        variant: "destructive"
      });
      return;
    }

    if (!newDeliveryForm.preparedByName || !newDeliveryForm.preparedByName.trim()) {
      toast({
        title: "Error",
        description: "Prepared By Name is required",
        variant: "destructive"
      });
      return;
    }

    if (!newDeliveryForm.preparedByDate) {
      toast({
        title: "Error",
        description: "Prepared By Date is required",
        variant: "destructive"
      });
      return;
    }

    if (deliveryItems.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one item",
        variant: "destructive"
      });
      return;
    }

    // Prevent double submission
    if (isSavingDelivery) {
      console.warn('⚠️ Save already in progress...');
      return;
    }

    // Set saving state to true
    setIsSavingDelivery(true);

    try {
      // Calculate totals
      const totalAmount = deliveryItems.reduce((sum, item) => sum + (item.quantity * item.rate), 0);

      // Insert into outlet_deliveries_out table
      const { data: deliveryData, error: deliveryError } = await supabase
        .from('outlet_deliveries_out')
        .insert({
          outlet_id: outletId,
          delivery_note_number: newDeliveryForm.deliveryNoteNumber,
          delivery_date: new Date(newDeliveryForm.deliveryDate).toISOString(),
          source_business_name: newDeliveryForm.sourceBusinessName || null,
          source_address: newDeliveryForm.sourceAddress || null,
          destination_outlet: newDeliveryForm.destinationOutlet,
          destination_address: newDeliveryForm.destinationAddress || null,
          items_count: deliveryItems.length,
          total_amount: totalAmount,
          payment_method: newDeliveryForm.paymentMethod,
          status: newDeliveryForm.status,
          driver_name: newDeliveryForm.driverName || null,
          vehicle_number: newDeliveryForm.vehicleNumber || null,
          delivery_notes: newDeliveryForm.notes || null,
          prepared_by_name: newDeliveryForm.preparedByName || null,
          prepared_by_date: newDeliveryForm.preparedByDate || null,
          received_by_name: newDeliveryForm.receivedByName || null,
          received_by_date: newDeliveryForm.receivedByDate || null
        })
        .select()
        .single();

      if (deliveryError) throw deliveryError;

      // Insert items
      const itemsToInsert = deliveryItems.map(item => ({
        delivery_id: deliveryData.id,
        product_name: item.description,
        description: item.description,
        quantity: item.quantity,
        delivered_quantity: item.quantity,
        unit_cost: 0, // Can be added later
        selling_price: item.rate,
        total_cost: 0,
        total_price: item.quantity * item.rate
      }));

      const { error: itemsError } = await supabase
        .from('outlet_deliveries_out_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // Update inventory for both source and destination outlets
      if (newDeliveryForm.status === 'delivered') {
        // Find destination outlet ID
        const destinationOutletData = outlets.find(o => o.name === newDeliveryForm.destinationOutlet);
        
        if (destinationOutletData) {
          // Update inventory for each item
          for (const item of deliveryItems) {
            // Deduct from source outlet inventory
            const sourceProduct = inventoryProducts.find(p => p.name === item.description);
            
            if (sourceProduct) {
              const newSourceQuantity = Math.max(0, (sourceProduct.available_quantity || 0) - item.quantity);
              
              await supabase
                .from('inventory_products')
                .update({
                  quantity: newSourceQuantity
                  // available_quantity is a generated column, don't set it directly
                })
                .eq('id', sourceProduct.id);
            }

            // Add to destination outlet inventory
            const { data: destProducts } = await supabase
              .from('inventory_products')
              .select('*')
              .eq('outlet_id', destinationOutletData.id)
              .eq('name', item.description);

            if (destProducts && destProducts.length > 0) {
              // Product exists in destination, update quantity
              const destProduct = destProducts[0];
              const newDestQuantity = (destProduct.available_quantity || 0) + item.quantity;
              
              await supabase
                .from('inventory_products')
                .update({
                  quantity: newDestQuantity
                  // available_quantity is a generated column, don't set it directly
                })
                .eq('id', destProduct.id);
            } else {
              // Product doesn't exist in destination, create it
              await supabase
                .from('inventory_products')
                .insert({
                  outlet_id: destinationOutletData.id,
                  name: item.description,
                  quantity: item.quantity,
                  // available_quantity is a generated column, don't set it directly
                  unit_cost: 0,
                  selling_price: item.rate
                });
            }
          }

          // Also save to saved_delivery_notes for destination outlet (Deliveries In)
          const deliveryItemsList = deliveryItems.map(item => ({
            description: item.description,
            name: item.description,
            quantity: item.quantity,
            delivered: item.quantity,
            rate: item.rate,
            price: item.rate,
            sellingPrice: item.rate,
            unitPrice: item.rate
          }));

          await supabase
            .from('saved_delivery_notes')
            .insert({
              outlet_id: destinationOutletData.id,
              delivery_note_number: newDeliveryForm.deliveryNoteNumber,
              date: new Date(newDeliveryForm.deliveryDate).toISOString(),
              customer: outlets.find(o => o.id === outletId)?.name || 'Unknown Outlet',
              items: deliveryItems.length,
              total: totalAmount,
              payment_method: newDeliveryForm.paymentMethod,
              status: newDeliveryForm.status,
              driver: newDeliveryForm.driverName || null,
              vehicle: newDeliveryForm.vehicleNumber || null,
              delivery_notes: newDeliveryForm.notes || null,
              items_list: deliveryItemsList,
              // Set source tracking fields for proper categorization
              source_outlet_id: outletId, // The outlet that sent this delivery
              source_type: 'outlet', // This came from another outlet
              source_business_name: newDeliveryForm.sourceBusinessName || null,
              source_address: newDeliveryForm.sourceAddress || null
            });
        }
      }

      toast({
        title: "Success",
        description: "Delivery created successfully"
      });

      // Close dialog and reset form
      setShowNewDeliveryDialog(false);
      setNewDeliveryForm({
        deliveryNoteNumber: `DO-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${String(Date.now()).slice(-6)}`,
        deliveryDate: new Date().toISOString().split('T')[0],
        sourceBusinessName: '',
        sourceAddress: '',
        destinationOutlet: '',
        destinationAddress: '',
        driverName: '',
        vehicleNumber: '',
        paymentMethod: 'credit',
        status: 'pending',
        notes: '',
        preparedByName: '',
        preparedByDate: '',
        receivedByName: '',
        receivedByDate: ''
      });
      setDeliveryItems([]);

      // Reload deliveries to show the new one
      await loadDeliveries();
    } catch (error: any) {
      console.error("Error creating delivery:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create delivery",
        variant: "destructive"
      });
    } finally {
      // Reset saving state
      setIsSavingDelivery(false);
    }
  };

  const handleAddItem = () => {
    setEditingItemIndex(null);
    setItemForm({ description: '', quantity: 0, rate: 0 });
    setShowItemDialog(true);
  };

  const handleEditItem = (index: number) => {
    setEditingItemIndex(index);
    setItemForm({ ...deliveryItems[index] });
    setShowItemDialog(true);
  };

  const handleDeleteItem = (index: number) => {
    setDeliveryItems(prev => prev.filter((_, i) => i !== index));
    toast({
      title: "Item Removed",
      description: "Item has been removed from the delivery"
    });
  };

  const handleSaveItem = () => {
    if (!itemForm.description || itemForm.quantity <= 0 || itemForm.rate <= 0) {
      toast({
        title: "Error",
        description: "Please fill in all item fields correctly",
        variant: "destructive"
      });
      return;
    }

    if (editingItemIndex !== null) {
      // Update existing item
      setDeliveryItems(prev => {
        const updated = [...prev];
        updated[editingItemIndex] = { ...itemForm, id: updated[editingItemIndex].id };
        return updated;
      });
    } else {
      // Add new item
      setDeliveryItems(prev => [...prev, { ...itemForm, id: Date.now().toString() }]);
    }

    setShowItemDialog(false);
    setItemForm({ description: '', quantity: 0, rate: 0 });
  };

  const calculateItemAmount = (quantity: number, rate: number) => {
    return quantity * rate;
  };

  const calculateTotalAmount = () => {
    return deliveryItems.reduce((sum, item) => sum + calculateItemAmount(item.quantity, item.rate), 0);
  };

  const handleSharePDF = async () => {
    if (filteredDeliveries.length === 0) {
      toast({ title: "No Data", description: "No deliveries to share", variant: "destructive" });
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Outlet Deliveries Report', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
    
    const totalValue = filteredDeliveries.reduce((sum, d) => sum + d.total, 0);
    doc.text(`Total Deliveries: ${filteredDeliveries.length}`, 14, 36);
    doc.text(`Total Value: ${formatCurrency(totalValue)}`, 14, 42);
    
    const tableData = filteredDeliveries.map(d => [
      d.deliveryNoteNumber, d.date, d.customer, d.status, d.items.toString(), formatCurrency(d.total)
    ]);
    
    autoTable(doc, {
      startY: 50,
      head: [['Note Number', 'Date', 'Customer', 'Status', 'Items', 'Total Value']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [245, 158, 11] },
    });
    
    const pdfBlob = doc.output('blob');
    const pdfFile = new File([pdfBlob], 'deliveries-report.pdf', { type: 'application/pdf' });
    
    if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      try {
        await navigator.share({ files: [pdfFile], title: 'Outlet Deliveries Report' });
        toast({ title: "Shared", description: "PDF shared successfully" });
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          doc.save('deliveries-report.pdf');
          toast({ title: "Downloaded", description: "Sharing failed, PDF downloaded" });
        }
      }
    } else {
      doc.save('deliveries-report.pdf');
      toast({ title: "Downloaded", description: "Sharing not supported, PDF downloaded" });
    }
  };

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Outlet Deliveries</h1>
            <p className="text-muted-foreground">Manage deliveries for this outlet</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {/* New Delivery Button - Only for Deliveries Out section */}
          {sectionFilter === "out" && (
            <Button onClick={() => setShowNewDeliveryDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Delivery
            </Button>
          )}
          
          {/* Export Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Export
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handlePrintReport}>
                <Printer className="h-4 w-4 mr-2" />
                <span>Print</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                <span>Download .pdf</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportXLS}>
                <FileText className="h-4 w-4 mr-2" />
                <span>Export .xls</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSharePDF}>
                <Share2 className="h-4 w-4 mr-2" />
                <span>Share .pdf</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Deliveries</p>
                <p className="text-2xl font-bold">{filteredDeliveries.length}</p>
              </div>
              <Truck className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Delivered</p>
                <p className="text-2xl font-bold">{filteredDeliveries.filter(d => d.status === 'delivered').length}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Transit</p>
                <p className="text-2xl font-bold">{filteredDeliveries.filter(d => d.status === 'in-transit').length}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(filteredDeliveries.reduce((sum, d) => sum + d.total, 0))}
                </p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section Filter Tabs */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={sectionFilter === "all" ? "default" : "outline"}
          onClick={() => setSectionFilter("all")}
          className="flex-1 md:flex-none"
        >
          <Package className="h-4 w-4 mr-2" />
          All
          <Badge variant="secondary" className="ml-2">
            {deliveries.length}
          </Badge>
        </Button>
        <Button
          variant={sectionFilter === "in" ? "default" : "outline"}
          onClick={() => setSectionFilter("in")}
          className="flex-1 md:flex-none"
        >
          <Truck className="h-4 w-4 mr-2" />
          Deliveries In
          <Badge variant="secondary" className="ml-2">
            {deliveries.filter(d => d.deliveryType === 'in').length}
          </Badge>
        </Button>
        <Button
          variant={sectionFilter === "out" ? "default" : "outline"}
          onClick={() => setSectionFilter("out")}
          className="flex-1 md:flex-none"
        >
          <Share2 className="h-4 w-4 mr-2" />
          Deliveries Out
          <Badge variant="secondary" className="ml-2">
            {deliveries.filter(d => d.deliveryType === 'out').length}
          </Badge>
        </Button>
      </div>

      {/* Source Filter Tabs (only shown when Deliveries In is selected) */}
      {sectionFilter === "in" && (
        <div className="flex gap-2 mb-6 p-4 bg-muted/30 rounded-lg">
          <Button
            variant={sourceFilter === "all" ? "default" : "outline"}
            onClick={() => setSourceFilter("all")}
            className="flex-1 md:flex-none"
            size="sm"
          >
            <Package className="h-4 w-4 mr-2" />
            All Sources
            <Badge variant="secondary" className="ml-2">
              {deliveries.filter(d => d.deliveryType === 'in').length}
            </Badge>
          </Button>
          <Button
            variant={sourceFilter === "investment" ? "default" : "outline"}
            onClick={() => setSourceFilter("investment")}
            className="flex-1 md:flex-none"
            size="sm"
          >
            <Building className="h-4 w-4 mr-2" />
            From Investment
            <Badge variant="secondary" className="ml-2">
              {deliveries.filter(d => d.deliveryType === 'in' && (d.sourceType === 'investment' || !d.sourceType)).length}
            </Badge>
          </Button>
          <Button
            variant={sourceFilter === "outlet" ? "default" : "outline"}
            onClick={() => setSourceFilter("outlet")}
            className="flex-1 md:flex-none"
            size="sm"
          >
            <MapPin className="h-4 w-4 mr-2" />
            From Other Outlets
            <Badge variant="secondary" className="ml-2">
              {deliveries.filter(d => d.deliveryType === 'in' && d.sourceType === 'outlet').length}
            </Badge>
          </Button>
        </div>
      )}

      {/* Search and Date Range */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search deliveries by note number, customer, or driver..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm w-full md:w-auto"
            >
              <option value="">All Status</option>
              <option value="delivered">Delivered</option>
              <option value="in-transit">In Transit</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>
            
            {/* Date Range Picker */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="px-2 py-1.5 border rounded-md text-sm"
                placeholder="Start Date"
              />
              <span className="text-muted-foreground">to</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="px-2 py-1.5 border rounded-md text-sm"
                placeholder="End Date"
              />
              {(dateRange.start || dateRange.end) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDateRange({ start: '', end: '' })}
                  className="h-7 px-2"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deliveries List */}
      {loading ? (
        <div className="text-center py-12">
          <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4 animate-pulse" />
          <h3 className="text-lg font-medium">Loading deliveries...</h3>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDeliveries.map((delivery) => (
            <Card key={delivery.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{delivery.deliveryNoteNumber}</h3>
                      <Badge className={getStatusColor(delivery.status)}>
                        {delivery.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {delivery.date}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="h-4 w-4" />
                        {delivery.customer}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Truck className="h-4 w-4" />
                        {delivery.driver || 'N/A'}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {delivery.vehicle || 'N/A'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{formatCurrency(delivery.total)}</p>
                    <p className="text-sm text-muted-foreground">{delivery.items} items</p>
                    <div className="flex gap-2 mt-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <FileText className="h-4 w-4 mr-1" />
                            Actions
                            <ChevronDown className="h-4 w-4 ml-1" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handlePrintDelivery(delivery)}>
                            <Printer className="h-4 w-4 mr-2" />
                            <span>Print</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownloadDelivery(delivery)}>
                            <Download className="h-4 w-4 mr-2" />
                            <span>Download .pdf</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExportDeliveryXLS(delivery)}>
                            <FileText className="h-4 w-4 mr-2" />
                            <span>Export .xls</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleShareDeliveryPDF(delivery)}>
                            <Share2 className="h-4 w-4 mr-2" />
                            <span>Share .pdf</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEditDelivery(delivery)}
                        title="Edit Delivery"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleViewDelivery(delivery)}
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && filteredDeliveries.length === 0 && (
        <div className="text-center py-12">
          <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No deliveries found</h3>
          <p className="text-muted-foreground">
            {searchTerm ? 'Try adjusting your search terms' : 'No deliveries for this outlet yet'}
          </p>
        </div>
      )}

      {/* New Delivery Dialog */}
      <Dialog open={showNewDeliveryDialog} onOpenChange={setShowNewDeliveryDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Outgoing Delivery</DialogTitle>
            <DialogDescription>
              Fill in the details for the new delivery to another outlet
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deliveryNoteNumber">Delivery Note Number *</Label>
                <Input
                  id="deliveryNoteNumber"
                  value={newDeliveryForm.deliveryNoteNumber}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">Auto-generated</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="deliveryDate">Delivery Date *</Label>
                <Input
                  id="deliveryDate"
                  type="date"
                  value={newDeliveryForm.deliveryDate}
                  onChange={(e) => setNewDeliveryForm(prev => ({ ...prev, deliveryDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sourceBusinessName">Source/From Outlet Business Name</Label>
              <Input
                id="sourceBusinessName"
                value={newDeliveryForm.sourceBusinessName}
                readOnly
                className="bg-muted"
                placeholder="Business name will be auto-populated"
              />
              <p className="text-xs text-muted-foreground">Auto-populated from current outlet</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sourceAddress">Source/From Outlet Address</Label>
              <Textarea
                id="sourceAddress"
                value={newDeliveryForm.sourceAddress}
                readOnly
                className="bg-muted"
                placeholder="Address will be auto-populated from current outlet"
                rows={2}
              />
              <p className="text-xs text-muted-foreground">Auto-populated from current outlet</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="destinationOutlet">Destination Outlet *</Label>
              <select
                id="destinationOutlet"
                value={newDeliveryForm.destinationOutlet}
                onChange={(e) => setNewDeliveryForm(prev => ({ ...prev, destinationOutlet: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md"
                disabled={loadingOutlets}
              >
                <option value="">Select an outlet</option>
                {outlets.map((outlet) => (
                  <option key={outlet.id} value={outlet.name}>
                    {outlet.name}
                  </option>
                ))}
              </select>
              {loadingOutlets && (
                <p className="text-xs text-muted-foreground">Loading outlets...</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="destinationAddress">Destination Address</Label>
              <Textarea
                id="destinationAddress"
                value={newDeliveryForm.destinationAddress}
                onChange={(e) => setNewDeliveryForm(prev => ({ ...prev, destinationAddress: e.target.value }))}
                placeholder="Full address of destination outlet"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="driverName">Driver Name *</Label>
                <Input
                  id="driverName"
                  value={newDeliveryForm.driverName}
                  onChange={(e) => setNewDeliveryForm(prev => ({ ...prev, driverName: e.target.value }))}
                  placeholder="e.g., John Doe"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                <Input
                  id="vehicleNumber"
                  value={newDeliveryForm.vehicleNumber}
                  onChange={(e) => setNewDeliveryForm(prev => ({ ...prev, vehicleNumber: e.target.value }))}
                  placeholder="e.g., TRK-001"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <select
                  id="paymentMethod"
                  value={newDeliveryForm.paymentMethod}
                  onChange={(e) => setNewDeliveryForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="cash">Cash</option>
                  <option value="credit">Credit</option>
                  <option value="transfer">Bank Transfer</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={newDeliveryForm.status}
                  onChange={(e) => setNewDeliveryForm(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="pending">Pending</option>
                  <option value="in-transit">In Transit</option>
                  <option value="delivered">Delivered</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Delivery Notes</Label>
              <Textarea
                id="notes"
                value={newDeliveryForm.notes}
                onChange={(e) => setNewDeliveryForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes for this delivery"
                rows={3}
              />
            </div>

            {/* Authorization & Signatures Section */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3">Authorization & Signatures</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="preparedByName">Prepared By Name *</Label>
                  <Input
                    id="preparedByName"
                    value={newDeliveryForm.preparedByName}
                    onChange={(e) => setNewDeliveryForm(prev => ({ ...prev, preparedByName: e.target.value }))}
                    placeholder="Name of person preparing"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preparedByDate">Prepared By Date *</Label>
                  <Input
                    id="preparedByDate"
                    type="date"
                    value={newDeliveryForm.preparedByDate}
                    onChange={(e) => setNewDeliveryForm(prev => ({ ...prev, preparedByDate: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="receivedByName">Received By Name</Label>
                  <Input
                    id="receivedByName"
                    value={newDeliveryForm.receivedByName}
                    onChange={(e) => setNewDeliveryForm(prev => ({ ...prev, receivedByName: e.target.value }))}
                    placeholder="Name of person receiving"
                  />
                  <p className="text-xs text-muted-foreground">(Signature Required)</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="receivedByDate">Received By Date</Label>
                  <Input
                    id="receivedByDate"
                    type="date"
                    value={newDeliveryForm.receivedByDate}
                    onChange={(e) => setNewDeliveryForm(prev => ({ ...prev, receivedByDate: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* Items Section */}
            <div className="space-y-4 mt-6 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-semibold">Items Delivered</Label>
                <Button size="sm" onClick={handleAddItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>

              {deliveryItems.length > 0 ? (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deliveryItems.map((item, index) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.description}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">TSh {item.rate.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-semibold">TSh {calculateItemAmount(item.quantity, item.rate).toLocaleString()}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditItem(index)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteItem(index)}
                                className="text-red-600 hover:text-red-700"
                              >
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={3} className="text-right font-bold">Total:</TableCell>
                        <TableCell className="text-right font-bold text-lg">TSh {calculateTotalAmount().toLocaleString()}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 border-2 border-dashed rounded-md">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No items added yet</p>
                  <p className="text-sm text-muted-foreground">Click "Add Item" to add products</p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDeliveryDialog(false)} disabled={isSavingDelivery}>
              Cancel
            </Button>
            <Button onClick={handleCreateDelivery} disabled={isSavingDelivery}>
              {isSavingDelivery ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Save Delivery'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Item Dialog */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItemIndex !== null ? 'Edit Item' : 'Add Item'}</DialogTitle>
            <DialogDescription>
              {editingItemIndex !== null ? 'Update the item details' : 'Enter the item details for this delivery'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="itemDescription">Description *</Label>
              <div className="relative">
                <Input
                  id="itemDescription"
                  value={productSearchTerm || itemForm.description}
                  onChange={(e) => {
                    setProductSearchTerm(e.target.value);
                    setShowProductDropdown(true);
                    if (!e.target.value) {
                      setItemForm(prev => ({ ...prev, description: '' }));
                    }
                  }}
                  onFocus={() => setShowProductDropdown(true)}
                  onBlur={() => {
                    setTimeout(() => setShowProductDropdown(false), 200);
                  }}
                  placeholder="Search or select a product..."
                  disabled={loadingProducts || inventoryProducts.length === 0}
                />
                {showProductDropdown && (loadingProducts || inventoryProducts.length > 0) && (
                  <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {loadingProducts ? (
                      <div className="p-3 text-sm text-muted-foreground">Loading products...</div>
                    ) : (
                      <>
                        {inventoryProducts
                          .filter(p => {
                            const hasStock = (p.available_quantity || 0) > 0;
                            const matchesSearch = p.name.toLowerCase().includes(productSearchTerm.toLowerCase());
                            return hasStock && matchesSearch;
                          })
                          .slice(0, 50)
                          .map((product) => (
                            <div
                              key={product.id}
                              className="px-3 py-2 hover:bg-muted cursor-pointer text-sm"
                              onMouseDown={() => {
                                setItemForm(prev => ({ 
                                  ...prev, 
                                  description: product.name,
                                  rate: product.selling_price || 0
                                }));
                                setProductSearchTerm(product.name);
                                setShowProductDropdown(false);
                              }}
                            >
                              <div className="font-medium">{product.name}</div>
                              <div className="text-xs text-muted-foreground">
                                Available: {product.available_quantity || 0} | Price: {formatCurrency(product.selling_price || 0)}
                              </div>
                            </div>
                          ))}
                        {inventoryProducts.filter(p => {
                          const hasStock = (p.available_quantity || 0) > 0;
                          const matchesSearch = p.name.toLowerCase().includes(productSearchTerm.toLowerCase());
                          return hasStock && matchesSearch;
                        }).length === 0 && (
                          <div className="p-3 text-sm text-muted-foreground">No products found</div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
              {!loadingProducts && inventoryProducts.length === 0 && (
                <p className="text-xs text-muted-foreground">No products in inventory</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="itemQuantity">Quantity *</Label>
                <Input
                  id="itemQuantity"
                  type="number"
                  min="0"
                  value={itemForm.quantity}
                  onChange={(e) => setItemForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                  placeholder="200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="itemRate">Rate (TSh) *</Label>
                <Input
                  id="itemRate"
                  type="number"
                  min="0"
                  value={itemForm.rate}
                  onChange={(e) => setItemForm(prev => ({ ...prev, rate: parseInt(e.target.value) || 0 }))}
                  placeholder="5500"
                />
              </div>
            </div>

            {itemForm.quantity > 0 && itemForm.rate > 0 && (
              <div className="p-4 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">Amount:</p>
                <p className="text-2xl font-bold">TSh {calculateItemAmount(itemForm.quantity, itemForm.rate).toLocaleString()}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowItemDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveItem}>
              {editingItemIndex !== null ? 'Update Item' : 'Add Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Delivery Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Delivery - {editingDelivery?.deliveryNoteNumber}</DialogTitle>
            <DialogDescription>
              Update the delivery details
            </DialogDescription>
          </DialogHeader>

          {editingDelivery && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Delivery Note Number</Label>
                  <Input value={editingDelivery.deliveryNoteNumber} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input value={new Date(editingDelivery.date).toLocaleDateString()} disabled />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{editingDelivery.deliveryType === 'out' ? 'Destination Outlet' : 'Customer'}</Label>
                <Input value={editingDelivery.customer} disabled />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editDriver">Driver Name</Label>
                  <Input
                    id="editDriver"
                    value={editingDelivery.driver || ''}
                    onChange={(e) => setEditingDelivery(prev => prev ? {...prev, driver: e.target.value} : null)}
                    placeholder="e.g., John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editVehicle">Vehicle Number</Label>
                  <Input
                    id="editVehicle"
                    value={editingDelivery.vehicle || ''}
                    onChange={(e) => setEditingDelivery(prev => prev ? {...prev, vehicle: e.target.value} : null)}
                    placeholder="e.g., TRK-001"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editStatus">Status</Label>
                  <select
                    id="editStatus"
                    value={editingDelivery.status}
                    onChange={(e) => setEditingDelivery(prev => prev ? {...prev, status: e.target.value as any} : null)}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="pending">Pending</option>
                    <option value="in-transit">In Transit</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Total Amount</Label>
                  <Input value={formatCurrency(editingDelivery.total)} disabled />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editNotes">Delivery Notes</Label>
                <Textarea
                  id="editNotes"
                  value={editingDelivery.deliveryNotes || ''}
                  onChange={(e) => setEditingDelivery(prev => prev ? {...prev, deliveryNotes: e.target.value} : null)}
                  placeholder="Additional notes for this delivery"
                  rows={3}
                />
              </div>

              {/* Items Display */}
              <div className="space-y-4 mt-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label className="text-lg font-semibold">Items ({editingItems.length})</Label>
                  <Button size="sm" onClick={() => handleAddEditItem(null)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </div>
                
                {editingItems.length > 0 ? (
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead className="text-right">Rate</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {editingItems.map((item: any, index: number) => {
                          const qty = item.quantity || item.delivered || 0;
                          const rate = item.rate || item.price || 0;
                          const amount = qty * rate;
                          return (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{item.description || item.name || 'N/A'}</TableCell>
                              <TableCell className="text-right">{qty}</TableCell>
                              <TableCell className="text-right">{formatCurrency(rate)}</TableCell>
                              <TableCell className="text-right font-semibold">{formatCurrency(amount)}</TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleAddEditItem(index)}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteEditItem(index)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        <TableRow>
                          <TableCell colSpan={3} className="text-right font-bold">Total:</TableCell>
                          <TableCell className="text-right font-bold text-lg">{formatCurrency(calculateEditTotal())}</TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 border-2 border-dashed rounded-md">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No items added yet</p>
                    <p className="text-sm text-muted-foreground">Click "Add Item" to add products</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={isEditingDelivery}>
              Cancel
            </Button>
            <Button onClick={async () => {
              // Prevent double submission
              if (isEditingDelivery) {
                console.warn('⚠️ Save already in progress...');
                return;
              }

              if (!editingDelivery) return;
              
              // Set editing state to true
              setIsEditingDelivery(true);
              
              try {
                const totalAmount = calculateEditTotal();

                // Update based on delivery type
                if (editingDelivery.deliveryType === 'out') {
                  // Update delivery header
                  const { error: deliveryError } = await supabase
                    .from('outlet_deliveries_out')
                    .update({
                      driver_name: editingDelivery.driver,
                      vehicle_number: editingDelivery.vehicle,
                      status: editingDelivery.status,
                      delivery_notes: editingDelivery.deliveryNotes,
                      items_count: editingItems.length,
                      total_amount: totalAmount
                    })
                    .eq('id', editingDelivery.id);

                  if (deliveryError) throw deliveryError;

                  // Delete old items
                  const { error: deleteError } = await supabase
                    .from('outlet_deliveries_out_items')
                    .delete()
                    .eq('delivery_id', editingDelivery.id);

                  if (deleteError) throw deleteError;

                  // Insert new items
                  if (editingItems.length > 0) {
                    const itemsToInsert = editingItems.map(item => ({
                      delivery_id: editingDelivery.id,
                      product_name: item.description || item.name,
                      description: item.description || item.name,
                      quantity: item.quantity || item.delivered || 0,
                      delivered_quantity: item.quantity || item.delivered || 0,
                      unit_cost: 0,
                      selling_price: item.rate || item.price || 0,
                      total_cost: 0,
                      total_price: (item.quantity || item.delivered || 0) * (item.rate || item.price || 0)
                    }));

                    const { error: insertError } = await supabase
                      .from('outlet_deliveries_out_items')
                      .insert(itemsToInsert);

                    if (insertError) throw insertError;
                  }

                  // Update inventory if status is 'delivered'
                  if (editingDelivery.status === 'delivered') {
                    const destinationOutletData = outlets.find(o => o.name === editingDelivery.customer);
                    
                    if (destinationOutletData) {
                      try {
                        // Reload inventory products to get latest quantities
                        const currentInventoryProducts = await getInventoryProductsByOutlet(outletId);
                        
                        // Update inventory for each item
                        for (const item of editingItems) {
                          const itemName = item.description || item.name;
                          const itemQuantity = item.quantity || item.delivered || 0;
                          const itemRate = item.rate || item.price || 0;

                          if (!itemName || !itemName.trim()) {
                            console.warn('Skipping item with empty name');
                            continue;
                          }

                          // Deduct from source outlet inventory
                          const sourceProduct = currentInventoryProducts.find(p => p.name === itemName);
                          
                          if (sourceProduct) {
                            const newSourceQuantity = Math.max(0, (sourceProduct.available_quantity || 0) - itemQuantity);
                            
                            const { error: updateError } = await supabase
                              .from('inventory_products')
                              .update({
                                quantity: newSourceQuantity
                                // available_quantity is a generated column, don't set it directly
                              })
                              .eq('id', sourceProduct.id);
                            
                            if (updateError) {
                              console.error('Error updating source inventory:', updateError);
                            }
                          }

                          // Add to destination outlet inventory
                          const { data: destProducts, error: fetchError } = await supabase
                            .from('inventory_products')
                            .select('*')
                            .eq('outlet_id', destinationOutletData.id)
                            .eq('name', itemName);

                          if (fetchError) {
                            console.error('Error fetching destination product:', fetchError);
                            continue;
                          }

                          if (destProducts && destProducts.length > 0) {
                            const destProduct = destProducts[0];
                            const newDestQuantity = (destProduct.available_quantity || 0) + itemQuantity;
                            
                            const { error: updateError } = await supabase
                              .from('inventory_products')
                              .update({
                                quantity: newDestQuantity
                                // available_quantity is a generated column, don't set it directly
                              })
                              .eq('id', destProduct.id);
                            
                            if (updateError) {
                              console.error('Error updating destination inventory:', updateError);
                            }
                          } else {
                            const { error: insertError } = await supabase
                              .from('inventory_products')
                              .insert({
                                outlet_id: destinationOutletData.id,
                                name: itemName,
                                quantity: itemQuantity,
                                // available_quantity is a generated column, don't set it directly
                                unit_cost: 0,
                                selling_price: itemRate,
                                category: 'General'
                              });
                            
                            if (insertError) {
                              console.error('Error creating destination product:', insertError);
                            }
                          }
                        }
                      } catch (inventoryError) {
                        console.error('Error updating inventory:', inventoryError);
                        // Don't throw - allow the delivery edit to succeed even if inventory update fails
                      }
                    }
                  }

                  // Update the delivery in destination outlet's saved_delivery_notes (Deliveries In)
                  const destinationOutletData = outlets.find(o => o.name === editingDelivery.customer);
                  
                  if (destinationOutletData) {
                    try {
                      // Prepare items list for saved_delivery_notes
                      const deliveryItemsList = editingItems.map(item => ({
                        description: item.description || item.name,
                        name: item.description || item.name,
                        quantity: item.quantity || item.delivered || 0,
                        delivered: item.quantity || item.delivered || 0,
                        rate: item.rate || item.price || 0,
                        price: item.rate || item.price || 0,
                        sellingPrice: item.rate || item.price || 0,
                        unitPrice: item.rate || item.price || 0
                      }));

                      // Find the existing saved_delivery_notes record for this delivery
                      const { data: existingDeliveryIn, error: fetchError } = await supabase
                        .from('saved_delivery_notes')
                        .select('*')
                        .eq('outlet_id', destinationOutletData.id)
                        .eq('delivery_note_number', editingDelivery.deliveryNoteNumber)
                        .maybeSingle();

                      if (fetchError) {
                        console.error('Error fetching destination delivery:', fetchError);
                      }

                      if (existingDeliveryIn) {
                        // Update existing record
                        const { error: updateError } = await supabase
                          .from('saved_delivery_notes')
                          .update({
                            date: editingDelivery.date ? new Date(editingDelivery.date).toISOString() : undefined,
                            customer: outlets.find(o => o.id === outletId)?.name || 'Unknown Outlet',
                            items: editingItems.length,
                            total: totalAmount,
                            payment_method: editingDelivery.paymentMethod || undefined,
                            status: editingDelivery.status,
                            driver: editingDelivery.driver || null,
                            vehicle: editingDelivery.vehicle || null,
                            delivery_notes: editingDelivery.deliveryNotes || null,
                            items_list: deliveryItemsList,
                            // Ensure source tracking fields are set correctly
                            source_outlet_id: outletId,
                            source_type: 'outlet',
                            source_business_name: editingDelivery.businessName || null,
                            source_address: editingDelivery.businessAddress || null
                          })
                          .eq('id', existingDeliveryIn.id);

                        if (updateError) {
                          console.error('Error updating destination delivery:', updateError);
                        } else {
                          console.log('✅ Destination outlet delivery updated successfully');
                        }
                      } else {
                        console.warn('⚠️ Destination delivery record not found, creating new one...');
                        // Create new record if it doesn't exist
                        const { error: insertError } = await supabase
                          .from('saved_delivery_notes')
                          .insert({
                            outlet_id: destinationOutletData.id,
                            delivery_note_number: editingDelivery.deliveryNoteNumber,
                            date: editingDelivery.date ? new Date(editingDelivery.date).toISOString() : new Date().toISOString(),
                            customer: outlets.find(o => o.id === outletId)?.name || 'Unknown Outlet',
                            items: editingItems.length,
                            total: totalAmount,
                            payment_method: editingDelivery.paymentMethod || 'credit',
                            status: editingDelivery.status,
                            driver: editingDelivery.driver || null,
                            vehicle: editingDelivery.vehicle || null,
                            delivery_notes: editingDelivery.deliveryNotes || null,
                            items_list: deliveryItemsList,
                            // Set source tracking fields for proper categorization
                            source_outlet_id: outletId,
                            source_type: 'outlet',
                            source_business_name: editingDelivery.businessName || null,
                            source_address: editingDelivery.businessAddress || null
                          });

                        if (insertError) {
                          console.error('Error creating destination delivery:', insertError);
                        } else {
                          console.log('✅ Destination outlet delivery created successfully');
                        }
                      }
                    } catch (destError) {
                      console.error('Error updating destination outlet delivery:', destError);
                      // Don't throw - allow the delivery edit to succeed even if destination update fails
                    }
                  }
                } else {
                  toast({
                    title: "Info",
                    description: "Editing incoming deliveries not yet implemented"
                  });
                  return;
                }

                toast({
                  title: "Success",
                  description: "Delivery updated successfully"
                });

                setShowEditDialog(false);
                setEditingDelivery(null);
                setEditingItems([]);
                await loadDeliveries();
              } catch (error: any) {
                console.error("Error updating delivery:", error);
                toast({
                  title: "Error",
                  description: error.message || "Failed to update delivery",
                  variant: "destructive"
                });
              } finally {
                // Reset editing state
                setIsEditingDelivery(false);
              }
            }}>
              {isEditingDelivery ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={showEditItemDialog} onOpenChange={setShowEditItemDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editItemIndex !== null ? 'Edit Item' : 'Add Item'}</DialogTitle>
            <DialogDescription>
              {editItemIndex !== null ? 'Update the item details' : 'Enter the item details for this delivery'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editItemDescription">Description *</Label>
              <div className="relative">
                <Input
                  id="editItemDescription"
                  value={editProductSearchTerm || editItemForm.description}
                  onChange={(e) => {
                    setEditProductSearchTerm(e.target.value);
                    setShowEditProductDropdown(true);
                    if (!e.target.value) {
                      setEditItemForm(prev => ({ ...prev, description: '' }));
                    }
                  }}
                  onFocus={() => setShowEditProductDropdown(true)}
                  onBlur={() => {
                    setTimeout(() => setShowEditProductDropdown(false), 200);
                  }}
                  placeholder="Search or select a product..."
                  disabled={loadingProducts || inventoryProducts.length === 0}
                />
                {showEditProductDropdown && (loadingProducts || inventoryProducts.length > 0) && (
                  <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {loadingProducts ? (
                      <div className="p-3 text-sm text-muted-foreground">Loading products...</div>
                    ) : (
                      <>
                        {inventoryProducts
                          .filter(p => {
                            const hasStock = (p.available_quantity || 0) > 0;
                            const matchesSearch = p.name.toLowerCase().includes(editProductSearchTerm.toLowerCase());
                            return hasStock && matchesSearch;
                          })
                          .slice(0, 50)
                          .map((product) => (
                            <div
                              key={product.id}
                              className="px-3 py-2 hover:bg-muted cursor-pointer text-sm"
                              onMouseDown={() => {
                                setEditItemForm(prev => ({ 
                                  ...prev, 
                                  description: product.name,
                                  rate: product.selling_price || 0
                                }));
                                setEditProductSearchTerm(product.name);
                                setShowEditProductDropdown(false);
                              }}
                            >
                              <div className="font-medium">{product.name}</div>
                              <div className="text-xs text-muted-foreground">
                                Available: {product.available_quantity || 0} | Price: {formatCurrency(product.selling_price || 0)}
                              </div>
                            </div>
                          ))}
                        {inventoryProducts.filter(p => {
                          const hasStock = (p.available_quantity || 0) > 0;
                          const matchesSearch = p.name.toLowerCase().includes(editProductSearchTerm.toLowerCase());
                          return hasStock && matchesSearch;
                        }).length === 0 && (
                          <div className="p-3 text-sm text-muted-foreground">No products found</div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
              {!loadingProducts && inventoryProducts.length === 0 && (
                <p className="text-xs text-muted-foreground">No products in inventory</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editItemQuantity">Quantity *</Label>
                <Input
                  id="editItemQuantity"
                  type="number"
                  min="0"
                  value={editItemForm.quantity}
                  onChange={(e) => setEditItemForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                  placeholder="200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editItemRate">Rate (TSh) *</Label>
                <Input
                  id="editItemRate"
                  type="number"
                  min="0"
                  value={editItemForm.rate}
                  onChange={(e) => setEditItemForm(prev => ({ ...prev, rate: parseInt(e.target.value) || 0 }))}
                  placeholder="5500"
                />
              </div>
            </div>

            {editItemForm.quantity > 0 && editItemForm.rate > 0 && (
              <div className="p-4 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">Amount:</p>
                <p className="text-2xl font-bold">{formatCurrency(editItemForm.quantity * editItemForm.rate)}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditItemDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEditItem}>
              {editItemIndex !== null ? 'Update Item' : 'Add Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Delivery Details Dialog */}
      <Dialog open={!!viewingDelivery} onOpenChange={(open) => !open && setViewingDelivery(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Delivery Details</DialogTitle>
          </DialogHeader>
          {viewingDelivery && (
            <DeliveryDetails
              delivery={viewingDelivery}
              onBack={() => setViewingDelivery(null)}
              onPrint={() => {
                // Reuse the existing print function
                handlePrintDelivery(viewingDelivery);
              }}
              onDownload={() => {
                // Reuse the existing download function
                handleDownloadDelivery(viewingDelivery);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
