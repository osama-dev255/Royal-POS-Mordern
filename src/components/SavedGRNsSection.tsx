import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Package, Download, Printer, Eye, Pencil, Calendar, FileSpreadsheet, Share2, ChevronDown, FileText, Loader2, ExternalLink } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SavedGRNsCard } from "./SavedGRNsCard";
import { getSavedGRNs, deleteGRN, SavedGRN as SavedGRNType } from "@/utils/grnUtils";
import { PrintUtils } from "@/utils/printUtils";
import { ExportUtils } from "@/utils/exportUtils";
import { ExcelUtils } from "@/utils/excelUtils";
import { formatCurrency } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface SavedGRNsSectionProps {
  onBack: () => void;
  onLogout: () => void;
  username: string;
  onEditGRN?: (grn: SavedGRNType) => void;
}

export const SavedGRNsSection = ({ onBack, onLogout, username, onEditGRN }: SavedGRNsSectionProps) => {
  const [grns, setGrns] = useState<SavedGRNType[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedGRN, setSelectedGRN] = useState<SavedGRNType | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "history">("list");
  const [historyDateRange, setHistoryDateRange] = useState({ start: '2020-01-01', end: '2099-12-31' });
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatus, setHistoryStatus] = useState("all");
  const { toast } = useToast();

  // Function to distribute receiving costs among items based on quantity
  const distributeReceivingCosts = (items: any[], receivingCosts: Array<{ description: string; amount: number }>) => {
    // Calculate total quantity of all items
    const totalQuantity = items.reduce((sum, item) => sum + (item.delivered || 0), 0);
    
    if (totalQuantity === 0) {
      return items.map(item => {
        // Use originalUnitCost if available (stored at GRN creation), otherwise derive from unitCost
        const baseCost = item.originalUnitCost || (item.unitCost || 0) - (item.receivingCostPerUnit || 0) || 0;
        return {
          ...item,
          originalUnitCost: baseCost,
          receivingCostPerUnit: 0,
          unitCost: baseCost,
          totalWithReceivingCost: baseCost * (item.delivered || 0)
        };
      });
    }
    
    // Calculate total receiving costs
    const totalReceivingCosts = receivingCosts.reduce((sum, cost) => sum + Number(cost.amount || 0), 0);
    
    // Calculate cost per unit based on total quantity
    const costPerUnit = totalReceivingCosts / totalQuantity;
    
    // Update each item with receiving cost per unit and total cost with receiving costs
    return items.map(item => {
      // Use originalUnitCost if available (stored at GRN creation), otherwise derive from unitCost
      const baseCost = item.originalUnitCost || (item.unitCost || 0) - (item.receivingCostPerUnit || 0) || 0;
      const unitCostWithReceiving = baseCost + costPerUnit;
      const totalWithReceivingCost = unitCostWithReceiving * (item.delivered || 0);
      
      return {
        ...item,
        originalUnitCost: baseCost,
        receivingCostPerUnit: costPerUnit,
        totalWithReceivingCost,
        unitCost: unitCostWithReceiving
      };
    });
  };

  // Load saved GRNs from database
  useEffect(() => {
    const loadGRNs = async () => {
      try {
        setLoading(true);
        const savedGRNs = await getSavedGRNs();
        setGrns(savedGRNs);
      } catch (error) {
        console.error("Error loading saved GRNs:", error);
      } finally {
        setLoading(false);
      }
    };

    loadGRNs();

    // Listen for custom GRN save events to update GRNs in real-time
    const handleGRNSaved = (event: CustomEvent) => {
      const { grns } = event.detail;
      setGrns(grns);
    };

    window.addEventListener('grnSaved', handleGRNSaved as EventListener);
    return () => window.removeEventListener('grnSaved', handleGRNSaved as EventListener);
  }, []);

  // Filter GRNs based on search term
  const filteredGRNs = grns.filter(grn => 
    grn.data.grnNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    grn.data.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    grn.data.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    grn.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteGRN = (grnId: string) => {
    try {
      deleteGRN(grnId);
      // Update the state to reflect the deletion
      setGrns(prev => prev.filter(grn => grn.id !== grnId));
    } catch (error) {
      console.error("Error deleting GRN:", error);
    }
  };

  const handleViewGRN = (grn: SavedGRNType) => {
    setSelectedGRN(grn);
  };

  const handlePrintGRN = (grn: SavedGRNType) => {
    PrintUtils.printGRNDetails(grn);
  };

  const handleDownloadGRN = (grn: SavedGRNType) => {
    ExportUtils.exportGRNDetailsAsPDF(grn, `GRN-${grn.data.grnNumber || grn.id}`);
  };

  // History filtered GRNs
  const historyFilteredGRNs = grns.filter(grn => {
    let matchesSearch = true;
    if (historySearch) {
      const term = historySearch.toLowerCase();
      matchesSearch = grn.data.grnNumber.toLowerCase().includes(term) ||
        grn.data.supplierName.toLowerCase().includes(term) ||
        grn.data.poNumber.toLowerCase().includes(term);
    }
    let matchesStatus = true;
    if (historyStatus !== "all") {
      matchesStatus = (grn.data.status || "completed") === historyStatus;
    }
    let matchesDate = true;
    if (historyDateRange.start || historyDateRange.end) {
      const gDate = new Date(grn.data.date);
      if (historyDateRange.start && gDate < new Date(historyDateRange.start)) matchesDate = false;
      if (historyDateRange.end && gDate > new Date(historyDateRange.end + 'T23:59:59')) matchesDate = false;
    }
    return matchesSearch && matchesStatus && matchesDate;
  });

  const getGRNTotal = (grn: SavedGRNType) => {
    return grn.total || grn.data.items.reduce((sum, item) => sum + (item.totalWithReceivingCost || item.total || 0), 0);
  };

  // History export handlers
  const handleHistoryPrint = () => {
    if (historyFilteredGRNs.length === 0) {
      toast({ title: "No Data", description: "No GRNs to print", variant: "destructive" });
      return;
    }
    const totalAmount = historyFilteredGRNs.reduce((sum, grn) => sum + getGRNTotal(grn), 0);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html><html><head><title>GRN History Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { font-size: 18px; margin-bottom: 4px; }
          .subtitle { color: #666; font-size: 12px; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { background: #f5f5f5; border: 1px solid #ddd; padding: 6px 8px; text-align: left; font-weight: bold; }
          td { border: 1px solid #ddd; padding: 5px 8px; }
          .summary { margin-top: 16px; font-size: 13px; }
          .summary span { font-weight: bold; }
          @media print { body { margin: 0; } }
        </style></head><body>
        <h1>GRN History Report</h1>
        <div class="subtitle">Generated: ${new Date().toLocaleString()}</div>
        <table>
          <thead><tr>
            <th>GRN #</th><th>Date</th><th>Supplier</th><th>Phone</th><th>Email</th><th>TIN</th><th>PO #</th><th>Delivery Note #</th><th>Status</th><th>Total EXCL.</th>
          </tr></thead>
          <tbody>
            ${historyFilteredGRNs.map(grn => `<tr>
              <td>${grn.data.grnNumber}</td>
              <td>${grn.data.date}</td>
              <td>${grn.data.supplierName}</td>
              <td>${grn.data.supplierPhone || '-'}</td>
              <td>${grn.data.supplierEmail || '-'}</td>
              <td>${grn.data.supplierTinNumber || grn.data.businessTin || '-'}</td>
              <td>${grn.data.poNumber || '-'}</td>
              <td>${grn.data.deliveryNoteNumber || '-'}</td>
              <td>${grn.data.status || 'completed'}</td>
              <td style="text-align:right">${formatCurrency(getGRNTotal(grn))}</td>
            </tr>`).join('')}
          </tbody>
          <tfoot><tr>
            <td colspan="9" style="text-align:right;font-weight:bold">TOTAL:</td>
            <td style="text-align:right;font-weight:bold">${formatCurrency(totalAmount)}</td>
          </tr></tfoot>
        </table>
        <div class="summary">
          <div>Total GRNs: <span>${historyFilteredGRNs.length}</span></div>
          <div>Total Amount: <span>${formatCurrency(totalAmount)}</span></div>
        </div>
        </body></html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
    toast({ title: "Print", description: "Print dialog opened" });
  };

  const handleHistoryPDF = () => {
    if (historyFilteredGRNs.length === 0) {
      toast({ title: "No Data", description: "No GRNs to export", variant: "destructive" });
      return;
    }
    const totalAmount = historyFilteredGRNs.reduce((sum, grn) => sum + getGRNTotal(grn), 0);
    const data = historyFilteredGRNs.map(grn => ({
      'GRN #': grn.data.grnNumber,
      'Date': grn.data.date,
      'Supplier': grn.data.supplierName,
      'Phone': grn.data.supplierPhone || '-',
      'Email': grn.data.supplierEmail || '-',
      'TIN': grn.data.supplierTinNumber || grn.data.businessTin || '-',
      'PO #': grn.data.poNumber || '-',
      'Delivery Note #': grn.data.deliveryNoteNumber || '-',
      'Status': grn.data.status || 'completed',
      'Total EXCL.': formatCurrency(getGRNTotal(grn))
    }));
    data.push({ 'GRN #': '', 'Date': '', 'Supplier': '', 'Phone': '', 'Email': '', 'TIN': '', 'PO #': '', 'Delivery Note #': '', 'Status': 'TOTAL' as any, 'Total EXCL.': formatCurrency(totalAmount) });
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('GRN History Report', 14, 20);
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
    autoTable(doc, {
      startY: 34,
      head: [Object.keys(data[0])],
      body: data.map(row => Object.values(row)),
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [50, 50, 50] },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });
    doc.save(`GRN_History_${new Date().toISOString().split('T')[0]}.pdf`);
    toast({ title: "Downloaded", description: `PDF: GRN_History_${new Date().toISOString().split('T')[0]}.pdf` });
  };

  const handleHistoryXLS = () => {
    if (historyFilteredGRNs.length === 0) {
      toast({ title: "No Data", description: "No GRNs to export", variant: "destructive" });
      return;
    }
    const data = historyFilteredGRNs.map(grn => ({
      'GRN #': grn.data.grnNumber,
      'Date': grn.data.date,
      'Supplier': grn.data.supplierName,
      'Phone': grn.data.supplierPhone || '-',
      'Email': grn.data.supplierEmail || '-',
      'TIN': grn.data.supplierTinNumber || grn.data.businessTin || '-',
      'PO #': grn.data.poNumber || '-',
      'Delivery Note #': grn.data.deliveryNoteNumber || '-',
      'Status': grn.data.status || 'completed',
      'Total EXCL.': getGRNTotal(grn)
    }));
    const filename = `GRN_History_${new Date().toISOString().split('T')[0]}`;
    ExcelUtils.exportToExcel(data, filename);
    toast({ title: "Exported", description: `XLS: ${filename}.xlsx` });
  };

  const handleHistoryShare = async () => {
    if (historyFilteredGRNs.length === 0) {
      toast({ title: "No Data", description: "No GRNs to share", variant: "destructive" });
      return;
    }
    const totalAmount = historyFilteredGRNs.reduce((sum, grn) => sum + getGRNTotal(grn), 0);
    const lines: string[] = [];
    lines.push('═══════════════════════════════════');
    lines.push('   RIPOTI YA GRN');
    lines.push(`   Tarehe: ${new Date().toLocaleDateString()}`);
    lines.push('═══════════════════════════════════');
    lines.push('');
    lines.push('#, GRN #, Tarehe, Msambaili, Simu, TIN, PO #, Delivery Note #, Hali, Jumla');
    lines.push('───────────────────────────────────');
    historyFilteredGRNs.forEach((grn, i) => {
      lines.push(`${String(i + 1).padStart(2, '0')}, ${grn.data.grnNumber}, ${grn.data.date}, ${grn.data.supplierName}, ${grn.data.supplierPhone || '-'}, ${grn.data.supplierTinNumber || grn.data.businessTin || '-'}, ${grn.data.poNumber || '-'}, ${grn.data.deliveryNoteNumber || '-'}, ${grn.data.status || 'completed'}, ${formatCurrency(getGRNTotal(grn))}`);
    });
    lines.push('───────────────────────────────────');
    lines.push(`JUMLA: ${formatCurrency(totalAmount)} (${historyFilteredGRNs.length} GRN)`);
    lines.push('');
    lines.push(`${grns[0]?.data.businessName || ''}`);
    const shareText = lines.join('\n');
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Ripoti ya GRN', text: shareText });
        toast({ title: "Imeshirikiwa", description: "Ripoti ya GRN imeshirikiwa" });
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          try { await navigator.clipboard.writeText(shareText); toast({ title: "Imenakiliwa", description: "Ripoti yamenakiliwa kwenye clipboard" }); } catch { toast({ title: "Hitilafu", description: "Imeshindwa kushiriki", variant: "destructive" }); }
        }
      }
    } else {
      try { await navigator.clipboard.writeText(shareText); toast({ title: "Imenakiliwa", description: "Ripoti yamenakiliwa kwenye clipboard" }); } catch { toast({ title: "Taarifa", description: "Kushiriki hakuna uwezo kwenye kifaa hiki" }); }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {selectedGRN ? (
        <div className="container mx-auto p-4 sm:p-6">
          <div className="flex gap-2 mb-4">
            <Button onClick={() => setSelectedGRN(null)} variant="outline">
              ← Back to Saved GRNs
            </Button>
            {onEditGRN && (
              <Button onClick={() => onEditGRN(selectedGRN)} variant="default">
                <Pencil className="h-4 w-4 mr-2" />
                Edit GRN
              </Button>
            )}
          </div>
          <Card>
            <CardHeader>
              <CardTitle>GRN Details: {selectedGRN.data.grnNumber}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold">Supplier Information</h3>
                  <p>Supplier: {selectedGRN.data.supplierName}</p>
                  <p>PO Number: {selectedGRN.data.poNumber}</p>
                  <p>Date: {new Date(selectedGRN.data.date).toLocaleDateString()}</p>
                  <p>Status: {selectedGRN.data.status}</p>
                  {selectedGRN.data.suppliers && selectedGRN.data.suppliers.filter(s => s.documentUrl).length > 0 && (
                    <div className="mt-1">
                      <span>Document: </span>
                      {selectedGRN.data.suppliers.filter(s => s.documentUrl).map((s, idx) => (
                        <span key={idx}>
                          {idx > 0 && ', '}
                          <a
                            href={s.documentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline inline-flex items-center gap-1"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            {s.documentName || `Document - ${s.name || 'Supplier'}`}
                          </a>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold">Delivery Information</h3>
                  <p>Delivery Note: {selectedGRN.data.deliveryNoteNumber}</p>
                  <p>Vehicle: {selectedGRN.data.vehicleNumber}</p>
                  <p>Driver: {selectedGRN.data.driverName}</p>
                  <p>Received By: {selectedGRN.data.receivedBy}</p>
                </div>
                {selectedGRN.data.logisticDetails && (
                  <div className="md:col-span-2">
                    <h3 className="font-semibold">Logistic Details</h3>
                    {selectedGRN.data.logisticDetails.vehicleNumber && (
                      <p>Vehicle Number: {selectedGRN.data.logisticDetails.vehicleNumber}</p>
                    )}
                    {selectedGRN.data.logisticDetails.driverName && (
                      <p>Driver Name: {selectedGRN.data.logisticDetails.driverName}</p>
                    )}
                    {selectedGRN.data.logisticDetails.driverPhone && (
                      <p>Driver Phone: {selectedGRN.data.logisticDetails.driverPhone}</p>
                    )}
                    {selectedGRN.data.logisticDetails.transportCompany && (
                      <p>Transport Company: {selectedGRN.data.logisticDetails.transportCompany}</p>
                    )}
                    {selectedGRN.data.logisticDetails.deliveryLocation && (
                      <p>Driver's License: {selectedGRN.data.logisticDetails.deliveryLocation}</p>
                    )}
                    {selectedGRN.data.logisticDetails.specialInstructions && (
                      <p>Special Instructions: {selectedGRN.data.logisticDetails.specialInstructions}</p>
                    )}
                    {selectedGRN.data.logisticDetails.shippingMethod && (
                      <p>Shipping Method: {selectedGRN.data.logisticDetails.shippingMethod}</p>
                    )}
                    {selectedGRN.data.logisticDetails.trackingNumber && (
                      <p>Tracking Number: {selectedGRN.data.logisticDetails.trackingNumber}</p>
                    )}
                  </div>
                )}

              </div>
              <div className="mt-4">
                <h3 className="font-semibold">Items Received</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ordered</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Received</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Soldout</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rejected Out</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rejection In</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Damaged</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Complimentary</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Physical Stock</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Available</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Original Unit Cost</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receiving Cost Per Unit</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">New Unit Cost</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cost with Receiving</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch #</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {distributeReceivingCosts(selectedGRN.data.items, selectedGRN.data.receivingCosts).map((item, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap">{item.description}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{item.quantity || 0}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{item.delivered || 0}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{item.soldout || 0}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{item.rejectedOut || 0}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{item.rejectionIn || 0}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{item.damaged || 0}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{item.complimentary || 0}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{item.physicalStock || 0}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{Number.isFinite(item.available) ? item.available : ((item.delivered || 0) - (item.soldout || 0) - (item.rejectedOut || 0) + (item.rejectionIn || 0) - (item.damaged || 0) - (item.complimentary || 0))}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{item.unit}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{formatCurrency(item.originalUnitCost || 0)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{formatCurrency(item.receivingCostPerUnit || 0)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{formatCurrency(item.unitCost || 0)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{formatCurrency(item.totalWithReceivingCost || ((item.delivered || 0) * (item.unitCost || 0)))}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{item.batchNumber || ''}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{item.expiryDate || ''}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{item.remarks || ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button onClick={() => handlePrintGRN(selectedGRN)}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print GRN
                </Button>
                <Button onClick={() => handleDownloadGRN(selectedGRN)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
            <div className="container mx-auto px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={onBack}
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Back
                </button>
                <h1 className="text-xl font-bold">Purchase Management</h1>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">Welcome, {username}</span>
                <Button variant="outline" size="sm" onClick={onLogout}>
                  Logout
                </Button>
              </div>
            </div>
          </div>

          <main className="container mx-auto p-4 sm:p-6">
            <div className="mb-8 sm:mb-10">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 flex items-center gap-2">
                    <Package className="h-8 w-8 text-primary" />
                    Saved Goods Received Notes
                  </h2>
                  <p className="text-muted-foreground text-sm sm:text-base md:text-lg">
                    View and manage your saved Goods Received Notes from completed transactions
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search GRNs by number, supplier, PO..."
                      className="pl-10 py-5 text-responsive-base w-64"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setViewMode(viewMode === "list" ? "history" : "list")}>
                    {viewMode === "list" ? <FileText className="h-4 w-4 mr-2" /> : <Package className="h-4 w-4 mr-2" />}
                    {viewMode === "list" ? "History View" : "Card View"}
                  </Button>
                </div>
              </div>
            </div>

            {viewMode === "history" ? (
              <>
                {/* Filters Bar */}
                <div className="flex flex-wrap gap-3 items-center mb-6">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <Input type="date" value={historyDateRange.start} onChange={(e) => setHistoryDateRange(prev => ({ ...prev, start: e.target.value }))} className="w-40" />
                  </div>
                  <span className="text-muted-foreground">to</span>
                  <div className="flex items-center gap-2">
                    <Input type="date" value={historyDateRange.end} onChange={(e) => setHistoryDateRange(prev => ({ ...prev, end: e.target.value }))} className="w-40" />
                  </div>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search GRN #, supplier, PO..." className="pl-8 w-56" value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} />
                  </div>
                  <Select value={historyStatus} onValueChange={setHistoryStatus}>
                    <SelectTrigger className="w-32"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 gap-2">
                        <span>Actions</span>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={handleHistoryPrint}><Printer className="h-4 w-4 mr-2" />Print Report</DropdownMenuItem>
                      <DropdownMenuItem onClick={handleHistoryPDF}><Download className="h-4 w-4 mr-2" />Download PDF</DropdownMenuItem>
                      <DropdownMenuItem onClick={handleHistoryXLS}><FileSpreadsheet className="h-4 w-4 mr-2" />Export XLS</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleHistoryShare}><Share2 className="h-4 w-4 mr-2" />Share</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total GRNs</CardTitle>
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">{historyFilteredGRNs.length}</div></CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total EXCL. Amount</CardTitle>
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">{formatCurrency(historyFilteredGRNs.reduce((s, g) => s + getGRNTotal(g), 0))}</div></CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Suppliers</CardTitle>
                      <Search className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">{new Set(historyFilteredGRNs.map(g => g.data.supplierName)).size}</div></CardContent>
                  </Card>
                </div>

                {/* History Table */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />GRN History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>
                    ) : historyFilteredGRNs.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">No GRNs found</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/50">
                              <th className="text-left p-2 font-medium">GRN #</th>
                              <th className="text-left p-2 font-medium">Date</th>
                              <th className="text-left p-2 font-medium">Supplier Name</th>
                              <th className="text-left p-2 font-medium">Phone</th>
                              <th className="text-left p-2 font-medium">Email</th>
                              <th className="text-left p-2 font-medium">TIN</th>
                              <th className="text-left p-2 font-medium">PO #</th>
                              <th className="text-left p-2 font-medium">Delivery Note #</th>
                              <th className="text-left p-2 font-medium">Status</th>
                              <th className="text-right p-2 font-medium">Total EXCL.</th>
                            </tr>
                          </thead>
                          <tbody>
                            {historyFilteredGRNs.map((grn) => (
                              <tr key={grn.id} className="border-b hover:bg-muted/30">
                                <td className="p-2 font-medium">{grn.data.grnNumber}</td>
                                <td className="p-2">{grn.data.date}</td>
                                <td className="p-2">{grn.data.supplierName}</td>
                                <td className="p-2">{grn.data.supplierPhone || '-'}</td>
                                <td className="p-2">{grn.data.supplierEmail || '-'}</td>
                                <td className="p-2">{grn.data.supplierTinNumber || grn.data.businessTin || '-'}</td>
                                <td className="p-2">{grn.data.poNumber || '-'}</td>
                                <td className="p-2">{grn.data.deliveryNoteNumber || '-'}</td>
                                <td className="p-2">
                                  <Badge variant={grn.data.status === "completed" ? "default" : grn.data.status === "cancelled" ? "destructive" : "secondary"}>
                                    {grn.data.status || "completed"}
                                  </Badge>
                                </td>
                                <td className="p-2 text-right font-medium">{formatCurrency(getGRNTotal(grn))}</td>
                              </tr>
                            ))}
                            <tr className="bg-muted/50 font-bold">
                              <td colSpan={9} className="p-2 text-right">TOTAL:</td>
                              <td className="p-2 text-right">{formatCurrency(historyFilteredGRNs.reduce((s, g) => s + getGRNTotal(g), 0))}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : loading ? (
              <div className="flex justify-center items-center h-64">
                <p>Loading saved Goods Received Notes...</p>
              </div>
            ) : filteredGRNs.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Saved Goods Received Notes</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? "No GRNs match your search." : "You haven't saved any Goods Received Notes yet."}
                </p>
                <p className="text-sm text-muted-foreground">
                  GRNs are automatically saved when you complete a Goods Received Note in the Templates section.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {filteredGRNs.map((grn) => (
                  <SavedGRNsCard
                    key={grn.id}
                    grn={{
                      id: grn.id,
                      name: grn.name,
                      grnNumber: grn.data.grnNumber,
                      date: grn.data.date,
                      supplier: grn.data.supplierName,
                      items: grn.data.items.reduce((sum, item) => sum + (item.receivedQuantity || item.delivered || 0), 0),
                      total: grn.total || grn.data.items.reduce((sum, item) => sum + (item.totalWithReceivingCost || 0), 0),
                      poNumber: grn.data.poNumber,
                      status: (grn.data.status || "received") as any
                    }}
                    onViewDetails={() => handleViewGRN(grn)}
                    onPrintGRN={() => handlePrintGRN(grn)}
                    onDownloadGRN={() => handleDownloadGRN(grn)}
                    onDeleteGRN={() => handleDeleteGRN(grn.id)}
                    onEditGRN={onEditGRN ? () => onEditGRN(grn) : undefined}
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