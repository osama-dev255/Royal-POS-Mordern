import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, Package, Calendar, CheckCircle, AlertTriangle, Plus, Edit, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import { getSavedGRNs, updateGRN, SavedGRN, GRNItem } from "@/utils/grnUtils";
import { GRNCreateDialog } from "./GRNCreateDialog";

interface GRNManagementCardProps {
  searchTerm: string;
  refreshTrigger: number;
}

interface GRNData {
  grnNumber: string;
  date: string;
  time: string;
  supplierName: string;
  supplierId: string;
  supplierPhone: string;
  supplierEmail: string;
  supplierAddress: string;
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;
  businessStockType?: string;
  isVatable?: boolean;
  supplierTinNumber?: string;
  poNumber: string;
  deliveryNoteNumber: string;
  vehicleNumber: string;
  driverName: string;
  receivedBy: string;
  receivedLocation?: string;
  items: GRNItem[];
  receivingCosts: Array<{ description: string; amount: number }>;
  qualityCheckNotes: string;
  discrepancies: string;
  preparedBy: string;
  preparedDate: string;
  checkedBy: string;
  checkedDate: string;
  approvedBy: string;
  approvedDate: string;
  receivedDate: string;
  status?: "completed" | "pending" | "cancelled";
  timestamp?: string;
}

export const GRNManagementCard = ({ searchTerm, refreshTrigger }: GRNManagementCardProps) => {
  const [grns, setGrns] = useState<SavedGRN[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGRN, setSelectedGRN] = useState<SavedGRN | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editedRates, setEditedRates] = useState<Record<string, number>>({});
  const { toast } = useToast();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Load data on mount and when refresh trigger changes
  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  useEffect(() => {
    // Listen for add GRN dialog event
    const handleOpenDialog = () => {
      setIsCreateDialogOpen(true);
    };
    
    window.addEventListener('openAddGRNDialog', handleOpenDialog);
    return () => window.removeEventListener('openAddGRNDialog', handleOpenDialog);
  }, []);

  const handleGRNCreated = () => {
    loadData(); // Refresh the data
    setIsCreateDialogOpen(false);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getSavedGRNs();
      setGrns(data);
    } catch (error) {
      console.error("Error loading GRNs:", error);
      toast({
        title: "Error",
        description: "Failed to load GRNs",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };



  const openViewDialog = (grn: SavedGRN) => {
    setSelectedGRN(grn);
    setIsViewDialogOpen(true);
    // Reset edited rates when opening a new GRN
    setEditedRates({});
  };

  const handleRateChange = (itemId: string, value: string) => {
    const rate = parseFloat(value) || 0;
    setEditedRates(prev => ({
      ...prev,
      [itemId]: rate
    }));
  };

  // Function to distribute receiving costs among items based on quantity
  const distributeReceivingCosts = (items: GRNItem[], receivingCosts: Array<{ description: string; amount: number }>) => {
    // Calculate total quantity of all items
    const totalQuantity = items.reduce((sum, item) => sum + item.delivered, 0);
    
    if (totalQuantity === 0) {
      return items.map(item => ({
        ...item,
        receivingCostPerUnit: 0,
        totalWithReceivingCost: item.unitCost ? item.unitCost * item.delivered : 0
      }));
    }
    
    // Calculate total receiving costs
    const totalReceivingCosts = receivingCosts.reduce((sum, cost) => sum + Number(cost.amount || 0), 0);
    
    // Calculate cost per unit based on total quantity
    const costPerUnit = totalReceivingCosts / totalQuantity;
    
    // Update each item with receiving cost per unit and total cost with receiving costs
    return items.map(item => {
      const receivingCostPerUnit = costPerUnit;
      const unitCostWithReceiving = (item.originalUnitCost || item.unitCost || 0) + receivingCostPerUnit;
      const totalWithReceivingCost = unitCostWithReceiving * item.delivered;
      
      return {
        ...item,
        receivingCostPerUnit,
        totalWithReceivingCost,
        unitCost: unitCostWithReceiving
      };
    });
  };

  // Parse GRN data for display
  const parseGRNData = (grn: SavedGRN): GRNData => {
    try {
      const data = typeof grn.data === 'string' ? JSON.parse(grn.data) : grn.data;
      return data;
    } catch (error) {
      console.error("Error parsing GRN data:", error);
      return {
        grnNumber: grn.name || 'Unknown',
        date: '',
        time: '',
        supplierName: 'Unknown Supplier',
        supplierId: '',
        supplierPhone: '',
        supplierEmail: '',
        supplierAddress: '',
        businessName: '',
        businessAddress: '',
        businessPhone: '',
        businessEmail: '',
        businessStockType: '',
        isVatable: false,
        supplierTinNumber: '',
        poNumber: '',
        deliveryNoteNumber: '',
        vehicleNumber: '',
        driverName: '',
        receivedBy: '',
        receivedLocation: '',
        items: [],
        receivingCosts: [],
        qualityCheckNotes: '',
        discrepancies: '',
        preparedBy: '',
        preparedDate: '',
        checkedBy: '',
        checkedDate: '',
        approvedBy: '',
        approvedDate: '',
        receivedDate: '',
        status: 'pending',
        timestamp: ''
      };
    }
  };

  // Filter GRNs based on search term and status
  const filteredGRNs = grns.filter(grn => {
    const grnData = parseGRNData(grn);
    const matchesSearch = 
      grnData.grnNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      grnData.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (grnData.poNumber && grnData.poNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || grnData.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate statistics
  const totalGRNs = grns.length;
  const completedGRNs = grns.filter(g => parseGRNData(g).status === "completed").length;
  const pendingGRNs = grns.filter(g => parseGRNData(g).status === "pending").length;
  const cancelledGRNs = grns.filter(g => parseGRNData(g).status === "cancelled").length;
  const totalItems = grns.reduce((sum, grn) => sum + parseGRNData(grn).items.length, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          GRN (Goods Received Note) Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Total GRNs</div>
              <div className="text-2xl font-bold">{totalGRNs}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Completed</div>
              <div className="text-2xl font-bold text-green-600">{completedGRNs}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Pending</div>
              <div className="text-2xl font-bold text-yellow-600">{pendingGRNs}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Cancelled</div>
              <div className="text-2xl font-bold text-red-600">{cancelledGRNs}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Total Items</div>
              <div className="text-2xl font-bold">{totalItems}</div>
            </CardContent>
          </Card>
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 mb-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* GRNs Table */}
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <p>Loading GRNs...</p>
          </div>
        ) : filteredGRNs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <Package className="h-8 w-8 mb-2" />
            <p>No GRNs found</p>
            <p className="text-sm">Create your first GRN to get started</p>
            <Button className="mt-2" onClick={() => {
              const event = new CustomEvent('openAddGRNDialog');
              window.dispatchEvent(event);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              New GRN
            </Button>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>GRN Number</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Items Count</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>View</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGRNs.map((grn) => {
                  const grnData = parseGRNData(grn);
                  return (
                    <TableRow key={grn.id}>
                      <TableCell className="font-medium">{grnData.grnNumber}</TableCell>
                      <TableCell>{grnData.supplierName}</TableCell>
                      <TableCell>{grnData.date || new Date(grn.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>{grnData.poNumber || 'N/A'}</TableCell>
                      <TableCell>{grnData.items.length}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            grnData.status === "completed" ? "default" :
                            grnData.status === "pending" ? "secondary" : "outline"
                          }
                        >
                          {grnData.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openViewDialog(grn)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* GRN View Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>GRN Details</DialogTitle>
            </DialogHeader>
            
            {selectedGRN && (
              <div className="space-y-6">
                {(() => {
                  const grnData = parseGRNData(selectedGRN);
                  return (
                    <>
                      {/* Header Information */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-muted rounded-lg">
                        <div>
                          <h3 className="font-semibold mb-2">GRN Information</h3>
                          <div className="space-y-1 text-sm">
                            <div><span className="font-medium">GRN Number:</span> {grnData.grnNumber}</div>
                            <div><span className="font-medium">Date:</span> {grnData.date}</div>
                            <div><span className="font-medium">Status:</span> 
                              <Badge className="ml-2" variant={
                                grnData.status === "completed" ? "default" :
                                grnData.status === "pending" ? "secondary" : "outline"
                              }>
                                {grnData.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h3 className="font-semibold mb-2">Supplier Information</h3>
                          <div className="space-y-1 text-sm">
                            <div><span className="font-medium">Name:</span> {grnData.supplierName}</div>
                            <div><span className="font-medium">PO Number:</span> {grnData.poNumber || 'N/A'}</div>
                            <div><span className="font-medium">Delivery Note:</span> {grnData.deliveryNoteNumber || 'N/A'}</div>
                          </div>
                        </div>
                      </div>

                      {/* Items Table */}
                      <div>
                        <h3 className="font-semibold mb-3">Received Items</h3>
                        <div className="rounded-md border overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Ordered</TableHead>
                                <TableHead className="text-right">Received</TableHead>
                                <TableHead className="text-right">Soldout</TableHead>
                                <TableHead className="text-right">Rejected Out</TableHead>
                                <TableHead className="text-right">Rejection In</TableHead>
                                <TableHead className="text-right">Damaged</TableHead>
                                <TableHead className="text-right">Complimentary</TableHead>
                                <TableHead className="text-right">Physical Stock</TableHead>
                                <TableHead className="text-right">Available</TableHead>
                                <TableHead>Unit</TableHead>
                                <TableHead className="text-right">Original Unit Cost</TableHead>
                                <TableHead className="text-right">Receiving Cost Per Unit</TableHead>
                                <TableHead className="text-right">New Unit Cost</TableHead>
                                <TableHead className="text-right">Total Cost with Receiving</TableHead>
                                <TableHead className="text-right">Batch #</TableHead>
                                <TableHead className="text-right">Expiry</TableHead>
                                <TableHead>Remarks</TableHead>
                                <TableHead className="text-right">Rate</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {distributeReceivingCosts(grnData.items, grnData.receivingCosts).map((item) => (
                                <TableRow key={item.id || item.description}>
                                  <TableCell className="font-medium">{item.description}</TableCell>
                                  <TableCell className="text-right">{item.quantity}</TableCell>
                                  <TableCell className="text-right">{item.delivered}</TableCell>
                                  <TableCell className="text-right">
                                    <Input
                                      type="number"
                                      value={item.soldout || 0}
                                      onChange={async (e) => {
                                        const soldoutValue = parseInt(e.target.value) || 0;
                                        const updatedItems = grnData.items.map(i => 
                                          i.id === item.id ? { 
                                            ...i, 
                                            soldout: soldoutValue, 
                                            available: (i.delivered || 0) - soldoutValue - (i.rejectedOut || 0) + (i.rejectionIn || 0) - (i.damaged || 0) - (i.complimentary || 0)
                                          } : i
                                        );
                                        
                                        // Update the selected GRN data
                                        const updatedGRN = {
                                          ...selectedGRN,
                                          data: {
                                            ...selectedGRN!.data,
                                            items: updatedItems
                                          },
                                          updatedAt: new Date().toISOString()
                                        };
                                        
                                        setSelectedGRN(updatedGRN);
                                        
                                        // Save to database and localStorage
                                        try {
                                          await updateGRN(updatedGRN);
                                          
                                          // Update local state
                                          setGrns(prev => prev.map(grn => 
                                            grn.id === selectedGRN.id ? updatedGRN : grn
                                          ));
                                        } catch (error) {
                                          console.error("Error saving soldout value:", error);
                                          toast({
                                            title: "Error",
                                            description: "Failed to save soldout value",
                                            variant: "destructive"
                                          });
                                        }
                                      }}
                                      className="w-20 text-right"
                                      placeholder="0"
                                      step="1"
                                      min="0"
                                    />
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Input
                                      type="number"
                                      value={item.rejectedOut || 0}
                                      onChange={async (e) => {
                                        const rejectedOutValue = parseInt(e.target.value) || 0;
                                        const updatedItems = grnData.items.map(i => 
                                          i.id === item.id ? { 
                                            ...i, 
                                            rejectedOut: rejectedOutValue, 
                                            available: (i.delivered || 0) - (i.soldout || 0) - rejectedOutValue + (i.rejectionIn || 0) - (i.damaged || 0) - (i.complimentary || 0)
                                          } : i
                                        );
                                        
                                        // Update the selected GRN data
                                        const updatedGRN = {
                                          ...selectedGRN,
                                          data: {
                                            ...selectedGRN!.data,
                                            items: updatedItems
                                          },
                                          updatedAt: new Date().toISOString()
                                        };
                                        
                                        setSelectedGRN(updatedGRN);
                                        
                                        // Save to database and localStorage
                                        try {
                                          await updateGRN(updatedGRN);
                                          
                                          // Update local state
                                          setGrns(prev => prev.map(grn => 
                                            grn.id === selectedGRN.id ? updatedGRN : grn
                                          ));
                                        } catch (error) {
                                          console.error("Error saving rejected out value:", error);
                                          toast({
                                            title: "Error",
                                            description: "Failed to save rejected out value",
                                            variant: "destructive"
                                          });
                                        }
                                      }}
                                      className="w-20 text-right"
                                      placeholder="0"
                                      step="1"
                                      min="0"
                                    />
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Input
                                      type="number"
                                      value={item.rejectionIn || 0}
                                      onChange={async (e) => {
                                        const rejectionInValue = parseInt(e.target.value) || 0;
                                        const updatedItems = grnData.items.map(i => 
                                          i.id === item.id ? { 
                                            ...i, 
                                            rejectionIn: rejectionInValue, 
                                            available: (i.delivered || 0) - (i.soldout || 0) - (i.rejectedOut || 0) + rejectionInValue - (i.damaged || 0) - (i.complimentary || 0)
                                          } : i
                                        );
                                        
                                        // Update the selected GRN data
                                        const updatedGRN = {
                                          ...selectedGRN,
                                          data: {
                                            ...selectedGRN!.data,
                                            items: updatedItems
                                          },
                                          updatedAt: new Date().toISOString()
                                        };
                                        
                                        setSelectedGRN(updatedGRN);
                                        
                                        // Save to database and localStorage
                                        try {
                                          await updateGRN(updatedGRN);
                                          
                                          // Update local state
                                          setGrns(prev => prev.map(grn => 
                                            grn.id === selectedGRN.id ? updatedGRN : grn
                                          ));
                                        } catch (error) {
                                          console.error("Error saving rejection in value:", error);
                                          toast({
                                            title: "Error",
                                            description: "Failed to save rejection in value",
                                            variant: "destructive"
                                          });
                                        }
                                      }}
                                      className="w-20 text-right"
                                      placeholder="0"
                                      step="1"
                                      min="0"
                                    />
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Input
                                      type="number"
                                      value={item.damaged || 0}
                                      onChange={async (e) => {
                                        const damagedValue = parseInt(e.target.value) || 0;
                                        const updatedItems = grnData.items.map(i => 
                                          i.id === item.id ? { 
                                            ...i, 
                                            damaged: damagedValue, 
                                            available: (i.delivered || 0) - (i.soldout || 0) - (i.rejectedOut || 0) + (i.rejectionIn || 0) - damagedValue - (i.complimentary || 0)
                                          } : i
                                        );
                                        
                                        // Update the selected GRN data
                                        const updatedGRN = {
                                          ...selectedGRN,
                                          data: {
                                            ...selectedGRN!.data,
                                            items: updatedItems
                                          },
                                          updatedAt: new Date().toISOString()
                                        };
                                        
                                        setSelectedGRN(updatedGRN);
                                        
                                        // Save to database and localStorage
                                        try {
                                          await updateGRN(updatedGRN);
                                          
                                          // Update local state
                                          setGrns(prev => prev.map(grn => 
                                            grn.id === selectedGRN.id ? updatedGRN : grn
                                          ));
                                        } catch (error) {
                                          console.error("Error saving damaged value:", error);
                                          toast({
                                            title: "Error",
                                            description: "Failed to save damaged value",
                                            variant: "destructive"
                                          });
                                        }
                                      }}
                                      className="w-20 text-right"
                                      placeholder="0"
                                      step="1"
                                      min="0"
                                    />
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Input
                                      type="number"
                                      value={item.complimentary || 0}
                                      onChange={async (e) => {
                                        const complimentaryValue = parseInt(e.target.value) || 0;
                                        const updatedItems = grnData.items.map(i => 
                                          i.id === item.id ? { 
                                            ...i, 
                                            complimentary: complimentaryValue, 
                                            available: (i.delivered || 0) - (i.soldout || 0) - (i.rejectedOut || 0) + (i.rejectionIn || 0) - (i.damaged || 0) - complimentaryValue
                                          } : i
                                        );
                                        
                                        // Update the selected GRN data
                                        const updatedGRN = {
                                          ...selectedGRN,
                                          data: {
                                            ...selectedGRN!.data,
                                            items: updatedItems
                                          },
                                          updatedAt: new Date().toISOString()
                                        };
                                        
                                        setSelectedGRN(updatedGRN);
                                        
                                        // Save to database and localStorage
                                        try {
                                          await updateGRN(updatedGRN);
                                          
                                          // Update local state
                                          setGrns(prev => prev.map(grn => 
                                            grn.id === selectedGRN.id ? updatedGRN : grn
                                          ));
                                        } catch (error) {
                                          console.error("Error saving complimentary value:", error);
                                          toast({
                                            title: "Error",
                                            description: "Failed to save complimentary value",
                                            variant: "destructive"
                                          });
                                        }
                                      }}
                                      className="w-20 text-right"
                                      placeholder="0"
                                      step="1"
                                      min="0"
                                    />
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Input
                                      type="number"
                                      value={item.physicalStock || 0}
                                      onChange={async (e) => {
                                        const physicalStockValue = parseInt(e.target.value) || 0;
                                        const updatedItems = grnData.items.map(i => 
                                          i.id === item.id ? { 
                                            ...i, 
                                            physicalStock: physicalStockValue
                                          } : i
                                        );
                                        
                                        // Update the selected GRN data
                                        const updatedGRN = {
                                          ...selectedGRN,
                                          data: {
                                            ...selectedGRN!.data,
                                            items: updatedItems
                                          },
                                          updatedAt: new Date().toISOString()
                                        };
                                        
                                        setSelectedGRN(updatedGRN);
                                        
                                        // Save to database and localStorage
                                        try {
                                          await updateGRN(updatedGRN);
                                          
                                          // Update local state
                                          setGrns(prev => prev.map(grn => 
                                            grn.id === selectedGRN.id ? updatedGRN : grn
                                          ));
                                        } catch (error) {
                                          console.error("Error saving physical stock value:", error);
                                          toast({
                                            title: "Error",
                                            description: "Failed to save physical stock value",
                                            variant: "destructive"
                                          });
                                        }
                                      }}
                                      className="w-20 text-right"
                                      placeholder="0"
                                      step="1"
                                      min="0"
                                    />
                                  </TableCell>
                                  <TableCell className="text-right">{item.available || (item.delivered - (item.soldout || 0) - (item.rejectedOut || 0) + (item.rejectionIn || 0) - (item.damaged || 0) - (item.complimentary || 0))}</TableCell>
                                  <TableCell>{item.unit}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(item.originalUnitCost || (item.unitCost - (item.receivingCostPerUnit || 0)))}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(item.receivingCostPerUnit || 0)}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(item.unitCost)}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(item.totalWithReceivingCost || (item.delivered * (item.unitCost || 0)))}</TableCell>
                                  <TableCell className="text-right">{item.batchNumber || ''}</TableCell>
                                  <TableCell className="text-right">{item.expiryDate || ''}</TableCell>
                                  <TableCell>{item.remarks || ''}</TableCell>
                                  <TableCell className="text-right">
                                    <Input
                                      type="number"
                                      value={editedRates[item.id || item.description] || item.rate || ''}
                                      onChange={(e) => handleRateChange(item.id || item.description, e.target.value)}
                                      className="w-24 text-right"
                                      placeholder="0.00"
                                      step="0.01"
                                      min="0"
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>

                      {/* Additional Information */}
                      {(grnData.qualityCheckNotes || grnData.discrepancies) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {grnData.qualityCheckNotes && (
                            <div>
                              <h3 className="font-semibold mb-2">Quality Check Notes</h3>
                              <p className="text-sm text-muted-foreground">{grnData.qualityCheckNotes}</p>
                            </div>
                          )}
                          {grnData.discrepancies && (
                            <div>
                              <h3 className="font-semibold mb-2">Discrepancies</h3>
                              <p className="text-sm text-muted-foreground">{grnData.discrepancies}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  );
                })()}
                
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                    Close
                  </Button>
                  <Button 
                    variant="secondary"
                    onClick={async () => {
                      if (!selectedGRN) return;
                      
                      try {
                        // Create updated GRN with new rates and preserve soldout/available values
                        // Get the current items from the selectedGRN state (which includes updated soldout/available values)
                        const currentItems = selectedGRN.data.items;
                        
                        const updatedItems = currentItems.map(item => {
                          const itemId = item.id || item.description;
                          const editedRate = editedRates[itemId];
                          
                          // If there's an edited rate, update the item
                          if (editedRate !== undefined && editedRate > 0) {
                            return {
                              ...item,
                              rate: editedRate,
                              originalUnitCost: item.originalUnitCost || (item.unitCost - (item.receivingCostPerUnit || 0))
                            };
                          }
                          return {
                            ...item,
                            originalUnitCost: item.originalUnitCost || (item.unitCost - (item.receivingCostPerUnit || 0))
                          };
                        });
                        
                        // Apply receiving cost distribution
                        const itemsWithCosts = distributeReceivingCosts(updatedItems, selectedGRN.data.receivingCosts);
                        
                        // Update the GRN data with new items, preserving all new field values
                        const finalItems = itemsWithCosts.map((itemWithCosts, index) => {
                          // Preserve all the new field values from the current selectedGRN state
                          const originalItem = selectedGRN.data.items[index];
                          return {
                            ...itemWithCosts,
                            soldout: originalItem?.soldout || 0,
                            rejectedOut: originalItem?.rejectedOut || 0,
                            rejectionIn: originalItem?.rejectionIn || 0,
                            damaged: originalItem?.damaged || 0,
                            complimentary: originalItem?.complimentary || 0,
                            physicalStock: originalItem?.physicalStock || 0,
                            available: originalItem?.available || (originalItem?.delivered || 0) - (originalItem?.soldout || 0) - (originalItem?.rejectedOut || 0) + (originalItem?.rejectionIn || 0) - (originalItem?.damaged || 0) - (originalItem?.complimentary || 0)
                          };
                        });
                        
                        // Update the GRN data with new items
                        const updatedGRN: SavedGRN = {
                          ...selectedGRN,
                          data: {
                            ...selectedGRN.data,
                            items: finalItems
                          },
                          updatedAt: new Date().toISOString()
                        };
                        
                        // Save to database and localStorage
                        await updateGRN(updatedGRN);
                        
                        // Update local state
                        setGrns(prev => prev.map(grn => 
                          grn.id === selectedGRN.id ? updatedGRN : grn
                        ));
                        
                        toast({
                          title: "Success",
                          description: "Rates updated successfully"
                        });
                      } catch (error) {
                        console.error("Error saving rates:", error);
                        toast({
                          title: "Error",
                          description: "Failed to save rates",
                          variant: "destructive"
                        });
                      }
                    }}
                  >
                    Save Rates
                  </Button>
                  <Button>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Print GRN
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
      
      <GRNCreateDialog 
        open={isCreateDialogOpen} 
        onOpenChange={setIsCreateDialogOpen}
        onGRNCreated={handleGRNCreated}
      />
    </Card>
  );
};