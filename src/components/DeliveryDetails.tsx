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
    if (onPrint) {
      onPrint();
    } else {
      // Create a transaction object for printing
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
      
      // Use PrintUtils for printing
      import("@/utils/printUtils").then(({ PrintUtils }) => {
        PrintUtils.printDeliveryNote(transaction);
      });
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
                    <span className="font-semibold text-green-600">{formatCurrency(delivery.amountReceived || delivery.total)}</span>
                  </div>
                  {(delivery as any).creditBroughtForward !== undefined && (delivery as any).creditBroughtForward !== 0 && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="font-semibold">Credit Brought Forward:</span>
                      <span className="font-semibold text-orange-600">{formatCurrency((delivery as any).creditBroughtForward)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-3">
                    <span className="font-bold text-lg">AMOUNT DUE:</span>
                    <span className="font-bold text-2xl text-red-600">
                      {formatCurrency((delivery.total || 0) - (delivery.amountReceived || delivery.total || 0) + ((delivery as any).creditBroughtForward || 0))}
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