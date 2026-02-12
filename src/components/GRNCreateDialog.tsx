import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { saveGRN, GRNData, GRNItem } from "@/utils/grnUtils";
import { formatCurrency } from "@/lib/currency";

interface GRNCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGRNCreated?: () => void;
}

// Generate unique GRN number
const generateGRNNumber = () => {
  return `GRN-${Date.now()}`;
};

// Generate unique supplier ID
const generateSupplierId = () => {
  return `SUP-${Math.floor(Math.random() * 1000000)}`;
};

const initialGRNData: GRNData = {
  grnNumber: generateGRNNumber(),
  date: new Date().toISOString().split('T')[0],
  time: new Date().toLocaleTimeString(),
  supplierName: "Supplier Name",
  supplierId: generateSupplierId(),
  supplierPhone: "",
  supplierEmail: "",
  supplierAddress: "",
  businessName: "YOUR BUSINESS NAME",
  businessAddress: "123 Business Street",
  businessPhone: "+1234567890",
  businessEmail: "info@yourbusiness.com",
  businessStockType: "",
  isVatable: false,
  supplierTinNumber: "",
  poNumber: "",
  deliveryNoteNumber: "",
  vehicleNumber: "",
  driverName: "",
  receivedBy: "Warehouse Staff",
  receivedLocation: "Main Warehouse",
  items: [
    {
      id: "1",
      description: "",
      quantity: 0,
      delivered: 0,
      soldout: 0,
      rejectedOut: 0,
      rejectionIn: 0,
      damaged: 0,
      complimentary: 0,
      physicalStock: 0,
      available: 0,
      unit: "",
      unitCost: 0,
      total: 0,
      receivingCostPerUnit: 0,
      totalWithReceivingCost: 0
    }
  ],
  receivingCosts: [
    { description: "Transport Charges", amount: 0 },
    { description: "Offloaders Charges", amount: 0 },
    { description: "Traffic Charges", amount: 0 }
  ],
  qualityCheckNotes: "",
  discrepancies: "",
  preparedBy: "Inventory Clerk",
  preparedDate: new Date().toISOString().split('T')[0],
  checkedBy: "Quality Inspector",
  checkedDate: new Date().toISOString().split('T')[0],
  approvedBy: "Warehouse Manager",
  approvedDate: new Date().toISOString().split('T')[0],
  receivedDate: new Date().toISOString().split('T')[0],
  status: "completed"
};

export const GRNCreateDialog = ({ open, onOpenChange, onGRNCreated }: GRNCreateDialogProps) => {
  const [grnData, setGrnData] = useState<GRNData>(initialGRNData);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setGrnData({
        ...initialGRNData,
        grnNumber: generateGRNNumber(),
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString()
      });
    }
  }, [open]);

  const handleAddItem = () => {
    setGrnData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: Date.now().toString(),
          description: "",
          quantity: 0,
          delivered: 0,
          soldout: 0,
          rejectedOut: 0,
          rejectionIn: 0,
          damaged: 0,
          complimentary: 0,
          physicalStock: 0,
          available: 0,
          unit: "",
          unitCost: 0,
          total: 0,
          receivingCostPerUnit: 0,
          totalWithReceivingCost: 0
        }
      ]
    }));
  };

  const handleRemoveItem = (itemId: string) => {
    if (grnData.items.length > 1) {
      setGrnData(prev => ({
        ...prev,
        items: prev.items.filter(item => item.id !== itemId)
      }));
    }
  };

  const handleItemChange = (itemId: string, field: keyof GRNItem, value: string | number) => {
    setGrnData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, [field]: value };
          
          // Recalculate total when quantity or unitCost changes
          if (field === 'delivered' || field === 'unitCost') {
            const quantity = field === 'delivered' ? Number(value) : item.delivered;
            const unitCost = field === 'unitCost' ? Number(value) : item.unitCost;
            updatedItem.total = quantity * unitCost;
          }
          
          // Ensure physicalStock exists for backward compatibility
          updatedItem.physicalStock = item.physicalStock || 0;
          
          // Recalculate available when delivered, soldout, rejectedOut, rejectionIn, damaged, or complimentary changes
          if (field === 'delivered' || field === 'soldout' || field === 'rejectedOut' || field === 'rejectionIn' || field === 'damaged' || field === 'complimentary') {
            const delivered = field === 'delivered' ? Number(value) : item.delivered;
            const soldout = field === 'soldout' ? Number(value) : item.soldout || 0;
            const rejectedOut = field === 'rejectedOut' ? Number(value) : item.rejectedOut || 0;
            const rejectionIn = field === 'rejectionIn' ? Number(value) : item.rejectionIn || 0;
            const damaged = field === 'damaged' ? Number(value) : item.damaged || 0;
            const complimentary = field === 'complimentary' ? Number(value) : item.complimentary || 0;
            updatedItem.available = delivered - soldout - rejectedOut + rejectionIn - damaged - complimentary;
          }
          
          return updatedItem;
        }
        return item;
      })
    }));
  };

  const handleReceivingCostChange = (index: number, field: 'description' | 'amount', value: string | number) => {
    setGrnData(prev => ({
      ...prev,
      receivingCosts: prev.receivingCosts.map((cost, i) => 
        i === index ? { ...cost, [field]: value } : cost
      )
    }));
  };

  const calculateTotalAmount = () => {
    const itemsTotal = grnData.items.reduce((sum, item) => sum + Number(item.total || 0), 0);
    const receivingCostsTotal = grnData.receivingCosts.reduce((sum, cost) => sum + Number(cost.amount || 0), 0);
    return itemsTotal + receivingCostsTotal;
  };

  const validateForm = () => {
    if (!grnData.grnNumber.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a GRN number",
        variant: "destructive"
      });
      return false;
    }

    if (!grnData.supplierName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter supplier name",
        variant: "destructive"
      });
      return false;
    }

    if (grnData.items.length === 0 || grnData.items.every(item => !item.description.trim())) {
      toast({
        title: "Validation Error",
        description: "Please add at least one item",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const totalAmount = calculateTotalAmount();
      
      // Prepare GRN data for saving
      const grnToSave = {
        id: Date.now().toString(),
        name: `GRN-${grnData.grnNumber}`,
        grnNumber: grnData.grnNumber,
        date: grnData.date,
        supplier: grnData.supplierName,
        items: grnData.items.length,
        total: totalAmount,
        poNumber: grnData.poNumber,
        status: "completed",
        data: grnData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await saveGRN(grnToSave);

      toast({
        title: "Success",
        description: "GRN saved successfully"
      });

      onOpenChange(false);
      onGRNCreated?.();
    } catch (error) {
      console.error("Error saving GRN:", error);
      toast({
        title: "Error",
        description: "Failed to save GRN. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = calculateTotalAmount();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Goods Received Note</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
          {/* Left Column - Supplier and Business Info */}
          <div className="space-y-6">
            <div>
              <h3 className="font-bold text-lg mb-3">Document Information</h3>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <Label htmlFor="grnNumber">GRN Number</Label>
                  <Input
                    id="grnNumber"
                    value={grnData.grnNumber}
                    onChange={(e) => setGrnData(prev => ({ ...prev, grnNumber: e.target.value }))}
                    placeholder="Enter GRN number"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={grnData.date}
                      onChange={(e) => setGrnData(prev => ({ ...prev, date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="time">Time</Label>
                    <Input
                      id="time"
                      type="time"
                      value={grnData.time}
                      onChange={(e) => setGrnData(prev => ({ ...prev, time: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-3">Supplier Information</h3>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <Label htmlFor="supplierName">Supplier Name *</Label>
                  <Input
                    id="supplierName"
                    value={grnData.supplierName}
                    onChange={(e) => setGrnData(prev => ({ ...prev, supplierName: e.target.value }))}
                    placeholder="Enter supplier name"
                  />
                </div>
                <div>
                  <Label htmlFor="supplierId">Supplier ID</Label>
                  <Input
                    id="supplierId"
                    value={grnData.supplierId}
                    onChange={(e) => setGrnData(prev => ({ ...prev, supplierId: e.target.value }))}
                    placeholder="Enter supplier ID"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="supplierPhone">Phone</Label>
                    <Input
                      id="supplierPhone"
                      value={grnData.supplierPhone}
                      onChange={(e) => setGrnData(prev => ({ ...prev, supplierPhone: e.target.value }))}
                      placeholder="Phone number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="supplierEmail">Email</Label>
                    <Input
                      id="supplierEmail"
                      type="email"
                      value={grnData.supplierEmail}
                      onChange={(e) => setGrnData(prev => ({ ...prev, supplierEmail: e.target.value }))}
                      placeholder="Email address"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="supplierAddress">Address</Label>
                  <Textarea
                    id="supplierAddress"
                    value={grnData.supplierAddress}
                    onChange={(e) => setGrnData(prev => ({ ...prev, supplierAddress: e.target.value }))}
                    placeholder="Supplier address"
                    className="min-h-[80px]"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-3">Receiving Business</h3>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input
                    id="businessName"
                    value={grnData.businessName}
                    onChange={(e) => setGrnData(prev => ({ ...prev, businessName: e.target.value }))}
                    placeholder="Business name"
                  />
                </div>
                <div>
                  <Label htmlFor="businessPhone">Phone</Label>
                  <Input
                    id="businessPhone"
                    value={grnData.businessPhone}
                    onChange={(e) => setGrnData(prev => ({ ...prev, businessPhone: e.target.value }))}
                    placeholder="Business phone"
                  />
                </div>
                <div>
                  <Label htmlFor="businessEmail">Email</Label>
                  <Input
                    id="businessEmail"
                    value={grnData.businessEmail}
                    onChange={(e) => setGrnData(prev => ({ ...prev, businessEmail: e.target.value }))}
                    placeholder="Business email"
                  />
                </div>
                <div>
                  <Label htmlFor="businessAddress">Address</Label>
                  <Textarea
                    id="businessAddress"
                    value={grnData.businessAddress}
                    onChange={(e) => setGrnData(prev => ({ ...prev, businessAddress: e.target.value }))}
                    placeholder="Business address"
                    className="min-h-[80px]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="businessStockType">Stock Type</Label>
                    <Select
                      value={grnData.businessStockType}
                      onValueChange={(value) => setGrnData(prev => ({ ...prev, businessStockType: value as any, isVatable: value === 'vatable' }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select stock type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="exempt">Exempt</SelectItem>
                        <SelectItem value="vatable">Vatable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {grnData.isVatable && (
                    <div>
                      <Label htmlFor="supplierTinNumber">Supplier TIN Number</Label>
                      <Input
                        id="supplierTinNumber"
                        value={grnData.supplierTinNumber}
                        onChange={(e) => setGrnData(prev => ({ ...prev, supplierTinNumber: e.target.value }))}
                        placeholder="TIN number"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Items and Details */}
          <div className="space-y-6">
            <div>
              <h3 className="font-bold text-lg mb-3">Delivery Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="poNumber">PO Number</Label>
                  <Input
                    id="poNumber"
                    value={grnData.poNumber}
                    onChange={(e) => setGrnData(prev => ({ ...prev, poNumber: e.target.value }))}
                    placeholder="PO number"
                  />
                </div>
                <div>
                  <Label htmlFor="deliveryNoteNumber">Delivery Note #</Label>
                  <Input
                    id="deliveryNoteNumber"
                    value={grnData.deliveryNoteNumber}
                    onChange={(e) => setGrnData(prev => ({ ...prev, deliveryNoteNumber: e.target.value }))}
                    placeholder="Delivery note number"
                  />
                </div>
                <div>
                  <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                  <Input
                    id="vehicleNumber"
                    value={grnData.vehicleNumber}
                    onChange={(e) => setGrnData(prev => ({ ...prev, vehicleNumber: e.target.value }))}
                    placeholder="Vehicle number"
                  />
                </div>
                <div>
                  <Label htmlFor="driverName">Driver Name</Label>
                  <Input
                    id="driverName"
                    value={grnData.driverName}
                    onChange={(e) => setGrnData(prev => ({ ...prev, driverName: e.target.value }))}
                    placeholder="Driver name"
                  />
                </div>
                <div>
                  <Label htmlFor="receivedBy">Received By</Label>
                  <Input
                    id="receivedBy"
                    value={grnData.receivedBy}
                    onChange={(e) => setGrnData(prev => ({ ...prev, receivedBy: e.target.value }))}
                    placeholder="Person who received"
                  />
                </div>
                <div>
                  <Label htmlFor="receivedLocation">Received Location</Label>
                  <Input
                    id="receivedLocation"
                    value={grnData.receivedLocation}
                    onChange={(e) => setGrnData(prev => ({ ...prev, receivedLocation: e.target.value }))}
                    placeholder="Receiving location"
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-lg">Items Received</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddItem}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>
              
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted px-4 py-2 font-medium grid grid-cols-12 gap-2 text-sm">
                  <div className="col-span-3">Description</div>
                  <div className="col-span-2">Quantity</div>
                  <div className="col-span-2">Received</div>
                  <div className="col-span-1">Unit</div>
                  <div className="col-span-2">Unit Cost</div>
                  <div className="col-span-1">Total</div>
                  <div className="col-span-1"></div>
                </div>
                
                <div className="max-h-64 overflow-y-auto">
                  {grnData.items.map((item, index) => (
                    <div key={item.id} className="px-4 py-2 border-t grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-3">
                        <Input
                          value={item.description}
                          onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                          placeholder="Item description"
                          className="text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(item.id, 'quantity', Number(e.target.value) || 0)}
                          placeholder="0"
                          className="text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          value={item.delivered}
                          onChange={(e) => handleItemChange(item.id, 'delivered', Number(e.target.value) || 0)}
                          placeholder="0"
                          className="text-sm"
                        />
                      </div>
                      <div className="col-span-1">
                        <Input
                          value={item.unit}
                          onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)}
                          placeholder="Unit"
                          className="text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          value={item.unitCost}
                          onChange={(e) => handleItemChange(item.id, 'unitCost', Number(e.target.value) || 0)}
                          placeholder="0.00"
                          className="text-sm"
                        />
                      </div>
                      <div className="col-span-1 font-medium">
                        {formatCurrency(item.total || 0)}
                      </div>
                      <div className="col-span-1">
                        {grnData.items.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(item.id)}
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-3">Receiving Costs</h3>
              <div className="space-y-2">
                {grnData.receivingCosts.map((cost, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-8">
                      <Input
                        value={cost.description}
                        onChange={(e) => handleReceivingCostChange(index, 'description', e.target.value)}
                        placeholder="Cost description"
                        className="text-sm"
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        value={cost.amount}
                        onChange={(e) => handleReceivingCostChange(index, 'amount', Number(e.target.value) || 0)}
                        placeholder="0.00"
                        className="text-sm"
                      />
                    </div>
                    <div className="col-span-1 font-medium">
                      {formatCurrency(cost.amount || 0)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <div className="text-lg font-bold">Total Amount:</div>
                <div className="text-2xl font-bold text-primary">{formatCurrency(totalAmount)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Information Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          <div>
            <h3 className="font-bold text-lg mb-3">Quality Check Notes</h3>
            <Textarea
              value={grnData.qualityCheckNotes}
              onChange={(e) => setGrnData(prev => ({ ...prev, qualityCheckNotes: e.target.value }))}
              placeholder="Enter quality check notes"
              className="min-h-[100px]"
            />
          </div>
          <div>
            <h3 className="font-bold text-lg mb-3">Discrepancies</h3>
            <Textarea
              value={grnData.discrepancies}
              onChange={(e) => setGrnData(prev => ({ ...prev, discrepancies: e.target.value }))}
              placeholder="Enter any discrepancies found"
              className="min-h-[100px]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          <div>
            <h3 className="font-bold text-lg mb-3">Prepared By</h3>
            <div className="space-y-2">
              <Input
                value={grnData.preparedBy}
                onChange={(e) => setGrnData(prev => ({ ...prev, preparedBy: e.target.value }))}
                placeholder="Name"
              />
              <Input
                type="date"
                value={grnData.preparedDate}
                onChange={(e) => setGrnData(prev => ({ ...prev, preparedDate: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-3">Checked By</h3>
            <div className="space-y-2">
              <Input
                value={grnData.checkedBy}
                onChange={(e) => setGrnData(prev => ({ ...prev, checkedBy: e.target.value }))}
                placeholder="Name"
              />
              <Input
                type="date"
                value={grnData.checkedDate}
                onChange={(e) => setGrnData(prev => ({ ...prev, checkedDate: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-3">Approved By</h3>
            <div className="space-y-2">
              <Input
                value={grnData.approvedBy}
                onChange={(e) => setGrnData(prev => ({ ...prev, approvedBy: e.target.value }))}
                placeholder="Name"
              />
              <Input
                type="date"
                value={grnData.approvedDate}
                onChange={(e) => setGrnData(prev => ({ ...prev, approvedDate: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? (
              "Saving..."
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save GRN
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};