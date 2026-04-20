import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  FileText, 
  Search, 
  ArrowLeft, 
  Calendar,
  Package,
  User,
  Truck,
  Building,
  Eye,
  Printer,
  Download,
  Share2,
  Edit,
  ChevronDown,
  Save,
  X,
  Plus,
  Trash2
} from "lucide-react";
import { getDeliveriesByOutletId, DeliveryData, updateDelivery } from "@/utils/deliveryUtils";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface OutletGRNProps {
  onBack: () => void;
  outletId?: string;
}

export const OutletGRN = ({ onBack, outletId }: OutletGRNProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: ''
  });
  const [deliveries, setDeliveries] = useState<DeliveryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<DeliveryData | null>(null);
  const [editForm, setEditForm] = useState({
    deliveryNoteNumber: '',
    date: '',
    customer: '',
    driver: '',
    vehicle: '',
    status: 'pending' as string,
    deliveryNotes: '',
    total: 0,
    itemsList: [] as any[]
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadDeliveries();
  }, [outletId]);

  const loadDeliveries = async () => {
    if (!outletId) {
      setDeliveries([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await getDeliveriesByOutletId(outletId);
      setDeliveries(data);
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
    
    return matchesSearch && matchesStatus && matchesDateRange;
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
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const itemsList = delivery.itemsList || [];
      const itemsHtml = itemsList.map((item: any) => `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${item.description || item.name || 'N/A'}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.quantity || item.delivered || 0}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatCurrency(item.rate || item.price || 0)}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatCurrency((item.quantity || item.delivered || 0) * (item.rate || item.price || 0))}</td>
        </tr>
      `).join('');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Delivery Note - ${delivery.deliveryNoteNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { margin: 0; color: #333; }
            .header p { margin: 5px 0; color: #666; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .info-box { background: #f5f5f5; padding: 15px; border-radius: 5px; }
            .info-box h3 { margin-top: 0; color: #555; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #f0f0f0; padding: 10px; text-align: left; border: 1px solid #ddd; }
            .total-row { font-weight: bold; background: #f9f9f9; }
            .status-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; }
            @media print { body { padding: 0; } .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>DELIVERY NOTE</h1>
            <p>${delivery.deliveryNoteNumber}</p>
            <p>Date: ${new Date(delivery.date).toLocaleDateString()}</p>
            <p>Time: ${new Date().toLocaleTimeString()}</p>
          </div>
          <div class="info-grid">
            <div class="info-box">
              <h3>Customer Information</h3>
              <p><strong>Customer:</strong> ${delivery.customer}</p>
              ${delivery.driver ? `<p><strong>Driver:</strong> ${delivery.driver}</p>` : ''}
            </div>
            <div class="info-box">
              <h3>Delivery Details</h3>
              <p><strong>Status:</strong> <span class="status-badge" style="background: ${getStatusColor(delivery.status)}">${delivery.status.toUpperCase()}</span></p>
              ${delivery.vehicle ? `<p><strong>Vehicle:</strong> ${delivery.vehicle}</p>` : ''}
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align: center;">Quantity</th>
                <th style="text-align: right;">Rate</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
              <tr class="total-row">
                <td colspan="3" style="text-align: right;">Total:</td>
                <td style="text-align: right;">${formatCurrency(delivery.total || 0)}</td>
              </tr>
            </tbody>
          </table>
          ${delivery.deliveryNotes ? `<div style="margin-top: 30px;"><h3>Notes:</h3><p>${delivery.deliveryNotes}</p></div>` : ''}
          <div class="no-print" style="margin-top: 30px; text-align: center;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">Print</button>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

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
    doc.text(`Date: ${new Date(delivery.date).toLocaleDateString()}`, 14, 36);
    doc.text(`Time: ${new Date().toLocaleTimeString()}`, 14, 42);
    doc.text(`Status: ${delivery.status.toUpperCase()}`, 14, 48);
    doc.text(`Customer: ${delivery.customer}`, 14, 56);
    if (delivery.driver) doc.text(`Driver: ${delivery.driver}`, 14, 62);
    if (delivery.vehicle) doc.text(`Vehicle: ${delivery.vehicle}`, 14, 68);
    
    const itemsList = delivery.itemsList || [];
    const tableData = itemsList.map((item: any) => [
      item.description || item.name || 'N/A',
      (item.quantity || item.delivered || 0).toString(),
      formatCurrency(item.rate || item.price || 0),
      formatCurrency((item.quantity || item.delivered || 0) * (item.rate || item.price || 0))
    ]);
    
    autoTable(doc, {
      startY: 75,
      head: [['Description', 'Quantity', 'Rate', 'Amount']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [245, 158, 11] },
    });

    const finalY = (doc as any).lastAutoTable.finalY || 150;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`Total: ${formatCurrency(delivery.total || 0)}`, 140, finalY + 10, { align: 'right' });

    if (delivery.deliveryNotes) {
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Notes: ${delivery.deliveryNotes}`, 14, finalY + 20);
    }

    doc.save(`Delivery_${delivery.deliveryNoteNumber}.pdf`);
    toast({
      title: "Download Started",
      description: `Downloading ${delivery.deliveryNoteNumber} as PDF`,
    });
  };

  const handleExportDeliveryXLS = (delivery: DeliveryData) => {
    const itemsList = delivery.itemsList || [];
    let csvContent = "Delivery Note,Date,Status,Customer\n";
    csvContent += `${delivery.deliveryNoteNumber},${new Date(delivery.date).toLocaleDateString()},${delivery.status},${delivery.customer}\n\n`;
    csvContent += "Description,Quantity,Rate,Amount\n";
    itemsList.forEach((item: any) => {
      const qty = item.quantity || item.delivered || 0;
      const rate = item.rate || item.price || 0;
      const amount = qty * rate;
      csvContent += `"${item.description || item.name || 'N/A'}",${qty},${rate},${amount}\n`;
    });
    csvContent += `\nTotal,,,,${delivery.total || 0}\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Delivery_${delivery.deliveryNoteNumber}.csv`;
    link.click();
    toast({
      title: "Export Started",
      description: `Exporting ${delivery.deliveryNoteNumber} as CSV`,
    });
  };

  const handleShareDeliveryPDF = async (delivery: DeliveryData) => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text('DELIVERY NOTE', 14, 20);
      doc.setFontSize(12);
      doc.text(delivery.deliveryNoteNumber, 14, 28);
      doc.setFontSize(10);
      doc.text(`Date: ${new Date(delivery.date).toLocaleDateString()}`, 14, 36);
      doc.text(`Customer: ${delivery.customer}`, 14, 42);
      
      const itemsList = delivery.itemsList || [];
      const tableData = itemsList.map((item: any) => [
        item.description || item.name || 'N/A',
        (item.quantity || item.delivered || 0).toString(),
        formatCurrency(item.rate || item.price || 0),
        formatCurrency((item.quantity || item.delivered || 0) * (item.rate || item.price || 0))
      ]);
      
      autoTable(doc, {
        startY: 50,
        head: [['Description', 'Quantity', 'Rate', 'Amount']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [245, 158, 11] },
      });

      const pdfBlob = doc.output('blob');
      const file = new File([pdfBlob], `Delivery_${delivery.deliveryNoteNumber}.pdf`, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Delivery Note - ${delivery.deliveryNoteNumber}`,
          text: `Delivery note for ${delivery.customer}`
        });
        toast({
          title: "Shared Successfully",
          description: "Delivery note has been shared",
        });
      } else {
        handleDownloadDelivery(delivery);
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Share error:', error);
        handleDownloadDelivery(delivery);
      }
    }
  };

  const handleEditDelivery = (delivery: DeliveryData) => {
    setEditingDelivery(delivery);
    setEditForm({
      deliveryNoteNumber: delivery.deliveryNoteNumber,
      date: delivery.date,
      customer: delivery.customer,
      driver: delivery.driver || '',
      vehicle: delivery.vehicle || '',
      status: delivery.status,
      deliveryNotes: delivery.deliveryNotes || '',
      total: delivery.total || 0,
      itemsList: delivery.itemsList || []
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingDelivery) return;

    try {
      setSaving(true);
      const updatedDelivery: DeliveryData = {
        ...editingDelivery,
        deliveryNoteNumber: editForm.deliveryNoteNumber,
        date: editForm.date,
        customer: editForm.customer,
        driver: editForm.driver,
        vehicle: editForm.vehicle,
        status: editForm.status as any,
        deliveryNotes: editForm.deliveryNotes,
        total: editForm.total,
        itemsList: editForm.itemsList,
        items: editForm.itemsList.length
      };

      await updateDelivery(updatedDelivery);
      
      // Refresh the deliveries list
      await loadDeliveries();
      
      toast({
        title: "Success",
        description: `Delivery ${editForm.deliveryNoteNumber} updated successfully`,
      });
      
      setIsEditDialogOpen(false);
      setEditingDelivery(null);
    } catch (error: any) {
      console.error('Error updating delivery:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update delivery. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const addItemRow = () => {
    setEditForm(prev => ({
      ...prev,
      itemsList: [...prev.itemsList, {
        description: '',
        name: '',
        quantity: 0,
        delivered: 0,
        rate: 0,
        price: 0,
        amount: 0
      }]
    }));
  };

  const removeItemRow = (index: number) => {
    setEditForm(prev => {
      const newItemsList = prev.itemsList.filter((_, i) => i !== index);
      const newTotal = newItemsList.reduce((sum, item) => sum + ((item.quantity || 0) * (item.rate || 0)), 0);
      return {
        ...prev,
        itemsList: newItemsList,
        total: newTotal
      };
    });
  };

  const updateItemRow = (index: number, field: string, value: any) => {
    setEditForm(prev => {
      const newItemsList = [...prev.itemsList];
      newItemsList[index] = { ...newItemsList[index], [field]: value };
      
      // Calculate amount for this row using the correct field names
      const quantity = field === 'quantity' ? value : (newItemsList[index].quantity || newItemsList[index].delivered || 0);
      const rate = field === 'rate' ? value : (newItemsList[index].rate || newItemsList[index].price || 0);
      newItemsList[index].amount = quantity * rate;
      
      // Recalculate total
      const newTotal = newItemsList.reduce((sum, item) => {
        const qty = item.quantity || item.delivered || 0;
        const rt = item.rate || item.price || 0;
        return sum + (qty * rt);
      }, 0);
      
      return {
        ...prev,
        itemsList: newItemsList,
        total: newTotal
      };
    });
  };

  const handleCancelEdit = () => {
    setIsEditDialogOpen(false);
    setEditingDelivery(null);
  };

  // Bulk Export Actions
  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const rowsHtml = filteredDeliveries.map(delivery => `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${delivery.deliveryNoteNumber}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${new Date(delivery.date).toLocaleDateString()}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${delivery.customer}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${delivery.driver || 'N/A'}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${delivery.status}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatCurrency(delivery.total || 0)}</td>
        </tr>
      `).join('');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Outlet GRN Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #f59e0b; color: white; padding: 10px; text-align: left; }
            .total-row { font-weight: bold; background: #f9f9f9; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>Outlet GRN Report</h1>
          <p>Total Deliveries: ${filteredDeliveries.length}</p>
          <p>Total Value: ${formatCurrency(filteredDeliveries.reduce((sum, d) => sum + (d.total || 0), 0))}</p>
          <table>
            <thead>
              <tr>
                <th>Delivery Note</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Driver</th>
                <th>Status</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
              <tr class="total-row">
                <td colspan="5" style="text-align: right;">Total:</td>
                <td style="text-align: right;">${formatCurrency(filteredDeliveries.reduce((sum, d) => sum + (d.total || 0), 0))}</td>
              </tr>
            </tbody>
          </table>
          <div style="margin-top: 20px; text-align: center;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">Print</button>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleDownload = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Outlet GRN Report', 14, 20);
    doc.setFontSize(10);
    doc.text(`Total Deliveries: ${filteredDeliveries.length}`, 14, 30);
    doc.text(`Total Value: ${formatCurrency(filteredDeliveries.reduce((sum, d) => sum + (d.total || 0), 0))}`, 14, 36);
    
    const tableData = filteredDeliveries.map(delivery => [
      delivery.deliveryNoteNumber,
      new Date(delivery.date).toLocaleDateString(),
      delivery.customer,
      delivery.driver || 'N/A',
      delivery.status,
      formatCurrency(delivery.total || 0)
    ]);
    
    autoTable(doc, {
      startY: 45,
      head: [['Delivery Note', 'Date', 'Customer', 'Driver', 'Status', 'Total']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [245, 158, 11] },
    });

    doc.save('Outlet_GRN_Report.pdf');
    toast({
      title: "Download Started",
      description: "Downloading GRN report as PDF",
    });
  };

  const handleExportXLS = () => {
    let csvContent = "Delivery Note,Date,Customer,Driver,Status,Total\n";
    filteredDeliveries.forEach(delivery => {
      csvContent += `${delivery.deliveryNoteNumber},${delivery.date},${delivery.customer},${delivery.driver || 'N/A'},${delivery.status},${delivery.total || 0}\n`;
    });
    csvContent += `\nTotal,,,,,${filteredDeliveries.reduce((sum, d) => sum + (d.total || 0), 0)}\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'Outlet_GRN_Report.csv';
    link.click();
    toast({
      title: "Export Started",
      description: "Exporting GRN report as CSV",
    });
  };

  const handleSharePDF = async () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text('Outlet GRN Report', 14, 20);
      doc.setFontSize(10);
      doc.text(`Total Deliveries: ${filteredDeliveries.length}`, 14, 30);
      
      const tableData = filteredDeliveries.map(delivery => [
        delivery.deliveryNoteNumber,
        new Date(delivery.date).toLocaleDateString(),
        delivery.customer,
        delivery.driver || 'N/A',
        delivery.status,
        formatCurrency(delivery.total || 0)
      ]);
      
      autoTable(doc, {
        startY: 40,
        head: [['Delivery Note', 'Date', 'Customer', 'Driver', 'Status', 'Total']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [245, 158, 11] },
      });

      const pdfBlob = doc.output('blob');
      const file = new File([pdfBlob], 'Outlet_GRN_Report.pdf', { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Outlet GRN Report',
          text: `GRN report with ${filteredDeliveries.length} deliveries`
        });
        toast({
          title: "Shared Successfully",
          description: "GRN report has been shared",
        });
      } else {
        handleDownload();
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Share error:', error);
        handleDownload();
      }
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
            <h1 className="text-2xl font-bold">Outlet GRN</h1>
            <p className="text-muted-foreground">Manage Goods Received Notes for this outlet</p>
          </div>
        </div>
        
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
                  {formatCurrency(filteredDeliveries.reduce((sum, d) => sum + (d.total || 0), 0))}
                </p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search deliveries by number, customer, or driver..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
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
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4 animate-pulse" />
            <h3 className="text-lg font-medium">Loading deliveries...</h3>
          </div>
        ) : (
          filteredDeliveries.map((delivery) => (
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
                        {new Date(delivery.date).toLocaleDateString()}
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
                        <Package className="h-4 w-4" />
                        {delivery.itemsList?.length || 0} items
                      </div>
                    </div>
                    {delivery.itemsList && delivery.itemsList.length > 0 && (
                      <div className="mt-2 text-sm">
                        <p className="text-muted-foreground mb-1 font-medium">Products:</p>
                        <div className="flex flex-wrap gap-2">
                          {delivery.itemsList.slice(0, 3).map((item: any, idx: number) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {item.description || item.name || 'Item'} ({item.quantity || 0})
                            </Badge>
                          ))}
                          {delivery.itemsList.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{delivery.itemsList.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                    {delivery.deliveryNotes && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        <FileText className="h-4 w-4 inline mr-1" />
                        {delivery.deliveryNotes}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{formatCurrency(delivery.total || 0)}</p>
                    <div className="flex gap-2 mt-2 justify-end">
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
                        <Edit className="h-4 w-4" />
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
          ))
        )}
      </div>

      {!loading && filteredDeliveries.length === 0 && (
        <div className="text-center py-12">
          <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No deliveries found</h3>
          <p className="text-muted-foreground">
            {searchTerm || statusFilter || dateRange.start || dateRange.end
              ? 'Try adjusting your filters'
              : 'No deliveries for this outlet yet'}
          </p>
        </div>
      )}

      {/* Edit Delivery Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Delivery</DialogTitle>
            <DialogDescription>
              Update the delivery information below. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deliveryNoteNumber">Delivery Note Number</Label>
                <Input
                  id="deliveryNoteNumber"
                  value={editForm.deliveryNoteNumber}
                  disabled
                  className="bg-muted cursor-not-allowed"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={editForm.date}
                  disabled
                  className="bg-muted cursor-not-allowed"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer">Customer</Label>
              <Input
                id="customer"
                value={editForm.customer}
                disabled
                className="bg-muted cursor-not-allowed"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="driver">Driver</Label>
                <Input
                  id="driver"
                  value={editForm.driver}
                  onChange={(e) => setEditForm(prev => ({ ...prev, driver: e.target.value }))}
                  placeholder="Enter driver name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicle">Vehicle</Label>
                <Input
                  id="vehicle"
                  value={editForm.vehicle}
                  onChange={(e) => setEditForm(prev => ({ ...prev, vehicle: e.target.value }))}
                  placeholder="Enter vehicle number"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={editForm.status}
                  onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="pending">Pending</option>
                  <option value="in-transit">In Transit</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="total">Total Amount (Auto-calculated)</Label>
                <Input
                  id="total"
                  type="number"
                  value={editForm.total}
                  disabled
                  className="bg-muted cursor-not-allowed font-semibold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deliveryNotes">Delivery Notes</Label>
              <Textarea
                id="deliveryNotes"
                value={editForm.deliveryNotes}
                onChange={(e) => setEditForm(prev => ({ ...prev, deliveryNotes: e.target.value }))}
                placeholder="Enter any additional notes..."
                rows={3}
              />
            </div>

            {/* Products Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Products/Items</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItemRow}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>
              
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-[100px]">Quantity</TableHead>
                      <TableHead className="w-[120px]">Rate</TableHead>
                      <TableHead className="w-[120px]">Amount</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editForm.itemsList.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Input
                            value={item.description || item.name || ''}
                            onChange={(e) => updateItemRow(index, 'description', e.target.value)}
                            placeholder="Item description"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.quantity || item.delivered || 0}
                            onChange={(e) => updateItemRow(index, 'quantity', parseFloat(e.target.value) || 0)}
                            min="0"
                            className="text-right"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.rate || item.price || 0}
                            onChange={(e) => updateItemRow(index, 'rate', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            className="text-right"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(((item.quantity || item.delivered || 0)) * ((item.rate || item.price || 0)))}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItemRow(index)}
                            disabled={editForm.itemsList.length <= 1}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              <div className="flex justify-end items-center gap-2 pt-2">
                <span className="text-sm font-medium">Total:</span>
                <span className="text-lg font-bold">{formatCurrency(editForm.total)}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancelEdit} disabled={saving}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
