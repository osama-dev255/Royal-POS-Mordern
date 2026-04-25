import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, Calendar, User, Package, MapPin, Phone, Mail, FileText, Printer, Download, Edit, Save, X } from "lucide-react";
import { DeliveryData } from "@/utils/deliveryUtils";
import { formatCurrency } from "@/lib/currency";
import { ExportUtils } from "@/utils/exportUtils";

interface DeliveryDetailsProps {
  delivery: DeliveryData;
  onBack: () => void;
  onView?: () => void;
  onPrint?: () => void;
  onDownload?: () => void;
  onEdit?: () => void;
  onSaveStatus?: (newStatus: string) => void;
  isEditing?: boolean;
}

export const DeliveryDetails = ({ 
  delivery, 
  onBack,
  onPrint,
  onDownload,
  onEdit,
  onSaveStatus,
  isEditing = false
}: DeliveryDetailsProps) => {
  const [editableStatus, setEditableStatus] = useState<string>(delivery.status);
  const [isEditingMode, setIsEditingMode] = useState<boolean>(isEditing);
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const totals = {
        totalItems: delivery.itemsList?.length || 0,
        totalQuantity: delivery.itemsList?.reduce((sum, item: any) => sum + (item.quantity || 0), 0) || 0,
        totalPackages: delivery.itemsList?.filter((item: any) => item.unit && item.quantity).length || 0
      };

      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Delivery Note - ${delivery.deliveryNoteNumber}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px;
              font-size: 14px;
              line-height: 1.5;
            }
            @media print {
              body { margin: 0; padding: 15px; }
              .no-print { display: none; }
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
            }
            .header h1 {
              font-size: 28px;
              margin: 0 0 5px 0;
            }
            .header .note-number {
              font-size: 20px;
              font-weight: bold;
              color: #2563eb;
            }
            .header .date-time {
              font-size: 12px;
              color: #666;
              margin-top: 5px;
            }
            .info-section {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 20px;
            }
            .info-box h3 {
              font-size: 11px;
              font-weight: bold;
              text-transform: uppercase;
              color: #666;
              margin-bottom: 5px;
            }
            .info-box .name {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 3px;
            }
            .info-box p {
              margin: 2px 0;
              font-size: 13px;
            }
            .details-grid {
              display: grid;
              grid-template-columns: repeat(5, 1fr);
              gap: 10px;
              padding: 10px 0;
              border-top: 1px solid #ddd;
              border-bottom: 1px solid #ddd;
              margin-bottom: 20px;
            }
            .detail-item {
              text-align: left;
            }
            .detail-item label {
              display: block;
              font-size: 10px;
              font-weight: bold;
              text-transform: uppercase;
              color: #666;
              margin-bottom: 3px;
            }
            .detail-item .value {
              font-size: 14px;
              font-weight: 600;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            .items-table th {
              background-color: #f3f4f6;
              padding: 8px;
              text-align: left;
              font-size: 11px;
              font-weight: bold;
              text-transform: uppercase;
              border-bottom: 2px solid #ddd;
            }
            .items-table td {
              padding: 8px;
              border-bottom: 1px solid #eee;
              font-size: 13px;
            }
            .items-table tr:nth-child(even) {
              background-color: #f9fafb;
            }
            .text-right {
              text-align: right;
            }
            .payment-summary {
              float: right;
              width: 300px;
              margin-bottom: 20px;
            }
            .payment-summary h3 {
              font-size: 11px;
              font-weight: bold;
              text-transform: uppercase;
              color: #666;
              margin-bottom: 8px;
            }
            .payment-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #ddd;
            }
            .payment-row.total {
              font-size: 18px;
              font-weight: bold;
            }
            .payment-row.amount-due {
              border-top: 2px solid #000;
              padding-top: 10px;
              margin-top: 10px;
              font-size: 16px;
              font-weight: bold;
              color: #dc2626;
            }
            .delivery-notes {
              clear: both;
              margin-bottom: 20px;
              padding: 12px;
              background-color: #f9fafb;
              border-radius: 5px;
            }
            .delivery-notes h3 {
              font-size: 11px;
              font-weight: bold;
              text-transform: uppercase;
              color: #666;
              margin-bottom: 5px;
            }
            .delivery-notes p {
              font-size: 13px;
              white-space: pre-line;
            }
            .signatures {
              border-top: 2px solid #000;
              padding-top: 15px;
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 20px;
            }
            .signature-box h4 {
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .signature-box .field {
              margin-bottom: 8px;
            }
            .signature-box label {
              display: block;
              font-size: 10px;
              color: #666;
              margin-bottom: 2px;
            }
            .signature-box .value {
              font-size: 13px;
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>DELIVERY NOTE</h1>
            <div class="note-number">${delivery.deliveryNoteNumber}</div>
            <div class="date-time">Date: ${new Date(delivery.date).toLocaleDateString()} | Time: ${new Date(delivery.date).toLocaleTimeString()}</div>
          </div>

          <div class="info-section">
            <div class="info-box">
              <h3>From:</h3>
              <div class="name">${(delivery as any).businessName || 'Business Name'}</div>
              <p>${(delivery as any).businessAddress || 'Business Address'}</p>
              ${(delivery as any).businessPhone ? '<p>📞 ' + (delivery as any).businessPhone + '</p>' : ''}
              ${(delivery as any).businessEmail ? '<p>✉️ ' + (delivery as any).businessEmail + '</p>' : ''}
            </div>
            <div class="info-box">
              <h3>To:</h3>
              <div class="name">${delivery.customer}</div>
              ${(delivery as any).customerAddress1 ? '<p>' + (delivery as any).customerAddress1 + '</p>' : ''}
              ${(delivery as any).customerAddress2 ? '<p>' + (delivery as any).customerAddress2 + '</p>' : ''}
              ${(delivery as any).customerPhone ? '<p>📞 ' + (delivery as any).customerPhone + '</p>' : ''}
              ${(delivery as any).customerEmail ? '<p>✉️ ' + (delivery as any).customerEmail + '</p>' : ''}
            </div>
          </div>

          <div class="details-grid">
            <div class="detail-item">
              <label>Vehicle</label>
              <div class="value">${delivery.vehicle || 'N/A'}</div>
            </div>
            <div class="detail-item">
              <label>Driver</label>
              <div class="value">${delivery.driver || 'N/A'}</div>
            </div>
            <div class="detail-item">
              <label>Total Items</label>
              <div class="value">${totals.totalItems}</div>
            </div>
            <div class="detail-item">
              <label>Total Quantity</label>
              <div class="value">${totals.totalQuantity} units</div>
            </div>
            <div class="detail-item">
              <label>Total Packages</label>
              <div class="value">${totals.totalPackages}</div>
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Description</th>
                <th class="text-right">Quantity</th>
                <th>Unit</th>
                <th class="text-right">Rate</th>
                <th class="text-right">Amount</th>
                <th class="text-right">Delivered</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${delivery.itemsList?.map((item: any, index: number) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${item.name || item.productName || item.description}</td>
                  <td class="text-right">${item.quantity || 0}</td>
                  <td>${item.unit || 'N/A'}</td>
                  <td class="text-right">${formatCurrency(item.price || item.rate || 0)}</td>
                  <td class="text-right">${formatCurrency(item.total || (item.price || item.rate || 0) * (item.quantity || 0))}</td>
                  <td class="text-right">${item.delivered || item.quantity || 0}</td>
                  <td>${item.remarks || '-'}</td>
                </tr>
              `).join('') || '<tr><td colspan="8" style="text-align:center;">No items</td></tr>'}
            </tbody>
          </table>

          <div class="payment-summary">
            <h3>Payment Summary</h3>
            <div class="payment-row total">
              <span>Total:</span>
              <span>${formatCurrency(delivery.total)}</span>
            </div>
            <div class="payment-row">
              <span>Amount Paid:</span>
              <span style="color: #16a34a;">${formatCurrency(delivery.amountReceived ?? 0)}</span>
            </div>
            ${(delivery as any).creditBroughtForward && (delivery as any).creditBroughtForward !== 0 ? `
              <div class="payment-row">
                <span>Credit Brought Forward from previous:</span>
                <span style="color: #ea580c;">${formatCurrency((delivery as any).creditBroughtForward)}</span>
              </div>
            ` : ''}
            <div class="payment-row amount-due">
              <span>AMOUNT DUE:</span>
              <span>${formatCurrency((delivery.total || 0) - (delivery.amountReceived ?? 0) + ((delivery as any).creditBroughtForward || 0))}</span>
            </div>
          </div>

          ${delivery.deliveryNotes ? `
            <div class="delivery-notes">
              <h3>Delivery Notes</h3>
              <p>${delivery.deliveryNotes}</p>
            </div>
          ` : ''}

          <div class="signatures">
            <div class="signature-box">
              <h4>Prepared By</h4>
              <div class="field">
                <label>Name</label>
                <div class="value">${(delivery as any).preparedByName || '_________________'}</div>
              </div>
              <div class="field">
                <label>Date</label>
                <div class="value">${(delivery as any).preparedByDate || '_________'}</div>
              </div>
            </div>
            <div class="signature-box">
              <h4>Driver Signature</h4>
              <div class="field">
                <label>Name</label>
                <div class="value">${(delivery as any).driverName || delivery.driver || '_________________'}</div>
              </div>
              <div class="field">
                <label>Date</label>
                <div class="value">${(delivery as any).driverDate || '_________'}</div>
              </div>
            </div>
            <div class="signature-box">
              <h4>Received By</h4>
              <div class="field">
                <label>Name</label>
                <div class="value">${(delivery as any).receivedByName || '_________________'}</div>
              </div>
              <div class="field">
                <label>Date</label>
                <div class="value">${(delivery as any).receivedByDate || '_________'}</div>
              </div>
              <p style="font-size: 11px; color: #dc2626; margin-top: 10px; font-weight: bold;">⚠️ Signature Required</p>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(printContent);
      printWindow.document.close();
    }
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else {
      // Create a transaction object for PDF export
      const transaction = {
        id: delivery.id,
        receiptNumber: delivery.deliveryNoteNumber,
        date: delivery.date,
        items: delivery.itemsList || [],
        subtotal: delivery.subtotal || 0,
        tax: delivery.tax || 0,
        discount: delivery.discount || 0,
        total: delivery.total,
        paymentMethod: delivery.paymentMethod,
        amountReceived: delivery.amountReceived || delivery.total,
        change: delivery.change || 0,
        customer: { name: delivery.customer },
        vehicle: delivery.vehicle,
        driver: delivery.driver,
        deliveryNotes: delivery.deliveryNotes
      };
      
      ExportUtils.exportReceiptAsPDF(transaction, `delivery-${delivery.deliveryNoteNumber}`);
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit();
    } else {
      // Toggle editing mode for status
      setIsEditingMode(!isEditingMode);
    }
  };

  const handleSaveStatus = () => {
    if (onSaveStatus) {
      onSaveStatus(editableStatus);
    }
    setIsEditingMode(false);
  };

  const handleCancelEdit = () => {
    setEditableStatus(delivery.status);
    setIsEditingMode(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back
            </button>
            <h1 className="text-xl font-bold">Delivery Details</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onBack}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 19-7-7 7-7"/>
                <path d="M19 12H5"/>
              </svg>
            </Button>
            <Button variant="outline" size="sm" onClick={handleEdit}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <main className="container mx-auto p-4 sm:p-6">
        <Card className="max-w-4xl mx-auto">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Truck className="h-6 w-6 text-primary" />
                  Delivery #{delivery.deliveryNoteNumber}
                </CardTitle>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(delivery.date)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Time: {new Date().toLocaleTimeString()}
                </p>
              </div>
              {isEditingMode ? (
                <div className="flex items-center gap-2">
                  <Select value={editableStatus} onValueChange={setEditableStatus}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in-transit">In Transit</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={handleSaveStatus}>
                    <Save className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Badge 
                  className={`${
                    editableStatus === 'completed' || editableStatus === 'delivered' 
                      ? 'bg-green-500 hover:bg-green-500' 
                      : editableStatus === 'in-transit' 
                        ? 'bg-blue-500 hover:bg-blue-500' 
                        : editableStatus === 'pending' 
                          ? 'bg-yellow-500 hover:bg-yellow-500' 
                          : 'bg-red-500 hover:bg-red-500'
                  }`}
                >
                  {editableStatus.charAt(0).toUpperCase() + editableStatus.slice(1)}
                </Badge>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">

            {/* FROM and TO Sections Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* FROM Section */}
              <div>
                <h3 className="text-xs font-bold text-muted-foreground uppercase mb-1">From:</h3>
                <div>
                  <p className="font-bold text-lg">{(delivery as any).businessName || 'Business Name'}</p>
                  <p className="text-sm text-muted-foreground">{(delivery as any).businessAddress || 'Business Address'}</p>
                  {(delivery as any).businessPhone && <p className="text-sm">📞 {(delivery as any).businessPhone}</p>}
                  {(delivery as any).businessEmail && <p className="text-sm">✉️ {(delivery as any).businessEmail}</p>}
                </div>
              </div>

              {/* TO Section */}
              <div>
                <h3 className="text-xs font-bold text-muted-foreground uppercase mb-1">To:</h3>
                <div>
                  <p className="font-bold text-lg">{delivery.customer}</p>
                  {(delivery as any).customerAddress1 && <p className="text-sm text-muted-foreground">{(delivery as any).customerAddress1}</p>}
                  {(delivery as any).customerAddress2 && <p className="text-sm text-muted-foreground">{(delivery as any).customerAddress2}</p>}
                  {(delivery as any).customerPhone && <p className="text-sm">📞 {(delivery as any).customerPhone}</p>}
                  {(delivery as any).customerEmail && <p className="text-sm">✉️ {(delivery as any).customerEmail}</p>}
                </div>
              </div>
            </div>

            {/* Delivery Details Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 py-3 border-y">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase">Vehicle</p>
                <p className="text-sm font-semibold mt-0.5">{delivery.vehicle || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase">Driver</p>
                <p className="text-sm font-semibold mt-0.5">{delivery.driver || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase">Total Items</p>
                <p className="text-sm font-semibold mt-0.5">{delivery.itemsList?.length || 0}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase">Total Quantity</p>
                <p className="text-sm font-semibold mt-0.5">
                  {delivery.itemsList?.reduce((sum, item: any) => sum + (item.quantity || 0), 0) || 0} units
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase">Total Packages</p>
                <p className="text-sm font-semibold mt-0.5">
                  {delivery.itemsList?.filter((item: any) => item.unit && item.quantity).length || 0}
                </p>
              </div>
            </div>

            {/* Items Table */}
            {delivery.itemsList && delivery.itemsList.length > 0 && (
              <div>
                <h3 className="text-base font-bold mb-2">ITEMS DELIVERED</h3>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted">
                        <th className="text-left p-3 text-xs font-bold uppercase">Item</th>
                        <th className="text-left p-3 text-xs font-bold uppercase">Description</th>
                        <th className="text-right p-3 text-xs font-bold uppercase">Quantity</th>
                        <th className="text-left p-3 text-xs font-bold uppercase">Unit</th>
                        <th className="text-right p-3 text-xs font-bold uppercase">Rate</th>
                        <th className="text-right p-3 text-xs font-bold uppercase">Amount</th>
                        <th className="text-right p-3 text-xs font-bold uppercase">Delivered</th>
                        <th className="text-left p-3 text-xs font-bold uppercase">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {delivery.itemsList.map((item: any, index: number) => (
                        <tr key={index} className={`hover:bg-muted/50 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-muted/30"}`}>
                          <td className="p-3 font-semibold">{index + 1}</td>
                          <td className="p-3 font-medium">{item.name || item.productName || item.description}</td>
                          <td className="p-3 text-right font-semibold">{item.quantity || 0}</td>
                          <td className="p-3">
                            <Badge variant="outline" className="text-xs">{item.unit || 'N/A'}</Badge>
                          </td>
                          <td className="p-3 text-right">{formatCurrency(item.price || item.rate || 0)}</td>
                          <td className="p-3 text-right font-bold">{formatCurrency(item.total || (item.price || item.rate || 0) * (item.quantity || 0))}</td>
                          <td className="p-3 text-right">
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                              {item.delivered || item.quantity || 0}
                            </Badge>
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">{item.remarks || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Payment Summary */}
            <div className="flex justify-end">
              <div className="w-80">
                <h3 className="text-xs font-bold text-muted-foreground uppercase mb-1">Payment Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-semibold">Total:</span>
                    <span className="font-bold text-xl">{formatCurrency(delivery.total)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-semibold">Amount Paid:</span>
                    <span className="font-semibold text-green-600">{formatCurrency(delivery.amountReceived ?? 0)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-semibold">Credit Brought Forward from previous:</span>
                    <span className="font-semibold text-orange-600">{formatCurrency((delivery as any).creditBroughtForward ?? 0)}</span>
                  </div>
                  <div className="flex justify-between pt-3">
                    <span className="font-bold text-lg">AMOUNT DUE:</span>
                    <span className="font-bold text-2xl text-red-600">
                      {formatCurrency((delivery.total || 0) - (delivery.amountReceived ?? 0) + ((delivery as any).creditBroughtForward || 0))}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery Notes */}
            {delivery.deliveryNotes && (
              <div>
                <h3 className="text-xs font-bold text-muted-foreground uppercase mb-1">Delivery Notes</h3>
                <p className="text-sm whitespace-pre-line leading-relaxed bg-muted/50 p-3 rounded-lg">
                  {delivery.deliveryNotes}
                </p>
              </div>
            )}

            {/* Signature Section */}
            <div className="border-t pt-4">
              <h3 className="text-base font-bold mb-3 text-center">Authorization & Signatures</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-bold mb-3">Prepared By</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Name</p>
                      <p className="font-semibold">{(delivery as any).preparedByName || '_________________'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Date</p>
                      <p className="font-semibold">{(delivery as any).preparedByDate || '_________'}</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-bold mb-3">Driver Signature</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Name</p>
                      <p className="font-semibold">{(delivery as any).driverName || delivery.driver || '_________________'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Date</p>
                      <p className="font-semibold">{(delivery as any).driverDate || '_________'}</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-bold mb-3">Received By</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Name</p>
                      <p className="font-semibold">{(delivery as any).receivedByName || '_________________'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Date</p>
                      <p className="font-semibold">{(delivery as any).receivedByDate || '_________'}</p>
                    </div>
                    <p className="text-xs mt-3 text-red-600 font-semibold">⚠️ Signature Required</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};