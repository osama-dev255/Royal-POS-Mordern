import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Package, Calendar, Filter, CheckCircle, AlertTriangle, Truck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
// Import Supabase database service
import { getPurchaseOrders, getProducts, updateProductStock, PurchaseOrder, Product } from "@/services/databaseService";

interface ReceivingItem {
  id: string;
  productId: string;
  productName: string;
  expectedQuantity: number;
  receivedQuantity: number;
  unitCost: number;
  totalCost: number;
  status: "pending" | "partial" | "received";
}

interface ReceivingRecord {
  id: string;
  poId: string;
  poNumber: string;
  supplier: string;
  date: string;
  items: ReceivingItem[];
  status: "pending" | "partial" | "completed";
  totalExpected: number;
  totalReceived: number;
}

export const InventoryReceiving = ({ username, onBack, onLogout }: { username: string; onBack: () => void; onLogout: () => void }) => {
  const [receivingRecords, setReceivingRecords] = useState<ReceivingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRecord, setSelectedRecord] = useState<ReceivingRecord | null>(null);
  const [isReceiveDialogOpen, setIsReceiveDialogOpen] = useState(false);
  const [receiveQuantities, setReceiveQuantities] = useState<Record<string, number>>({});
  const { toast } = useToast();

  // Load purchase orders and products from Supabase on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        console.log("Loading purchase orders and products data...");
        
        // Load purchase orders
        const purchaseOrdersData = await getPurchaseOrders();
        console.log("Purchase orders data loaded:", purchaseOrdersData.length, "records");
        
        // Load products
        const productsData = await getProducts();
        console.log("Products data loaded:", productsData.length, "records");
        
        // Create receiving records from purchase orders
        const formattedRecords: ReceivingRecord[] = purchaseOrdersData.map(po => {
          // Create receiving items from purchase order items
          // Note: In a real implementation, we would fetch actual purchase order items
          // For now, we'll simulate this with mock data
          const items: ReceivingItem[] = [
            {
              id: `item-${po.id}-1`,
              productId: "1",
              productName: "Sample Product",
              expectedQuantity: 10,
              receivedQuantity: 0,
              unitCost: 25.00,
              totalCost: 250.00,
              status: "pending"
            }
          ];
          
          // Calculate totals
          const totalExpected = items.reduce((sum, item) => sum + item.expectedQuantity, 0);
          const totalReceived = items.reduce((sum, item) => sum + item.receivedQuantity, 0);
          
          // Determine overall status
          let status: "pending" | "partial" | "completed" = "pending";
          if (totalReceived > 0 && totalReceived < totalExpected) {
            status = "partial";
          } else if (totalReceived >= totalExpected) {
            status = "completed";
          }
          
          return {
            id: po.id || '',
            poId: po.id || '',
            poNumber: po.order_number || `PO-${po.id?.substring(0, 8)}`,
            supplier: po.supplier_id || 'Unknown Supplier',
            date: po.order_date || new Date().toISOString(),
            items,
            status,
            totalExpected,
            totalReceived
          };
        });
        
        setReceivingRecords(formattedRecords);
      } catch (error) {
        console.error("Error loading data:", error);
        toast({
          title: "Error",
          description: "Failed to load data: " + (error as Error).message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredRecords = receivingRecords.filter(record => {
    const matchesSearch = 
      (record.poNumber && record.poNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      record.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || record.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Refresh data
  const refreshData = async () => {
    try {
      setLoading(true);
      const purchaseOrdersData = await getPurchaseOrders();
      
      // Create receiving records from purchase orders
      const formattedRecords: ReceivingRecord[] = purchaseOrdersData.map(po => {
        // Create receiving items from purchase order items
        // Note: In a real implementation, we would fetch actual purchase order items
        // For now, we'll simulate this with mock data
        const foundItem = selectedRecord?.items.find(item => item.id === `item-${po.id}-1`);
        const items: ReceivingItem[] = [
          {
            id: `item-${po.id}-1`,
            productId: "1",
            productName: "Sample Product",
            expectedQuantity: 10,
            receivedQuantity: foundItem?.receivedQuantity || 0,
            unitCost: 25.00,
            totalCost: 250.00,
            status: foundItem?.status || "pending"
          }
        ];
        
        // Calculate totals
        const totalExpected = items.reduce((sum, item) => sum + item.expectedQuantity, 0);
        const totalReceived = items.reduce((sum, item) => sum + item.receivedQuantity, 0);
        
        // Determine overall status
        let status: "pending" | "partial" | "completed" = "pending";
        if (totalReceived > 0 && totalReceived < totalExpected) {
          status = "partial";
        } else if (totalReceived >= totalExpected) {
          status = "completed";
        }
        
        return {
          id: po.id || '',
          poId: po.id || '',
          poNumber: po.order_number || `PO-${po.id?.substring(0, 8)}`,
          supplier: po.supplier_id || 'Unknown Supplier',
          date: po.order_date || new Date().toISOString(),
          items,
          status,
          totalExpected,
          totalReceived
        };
      });
      
      setReceivingRecords(formattedRecords);
      toast({
        title: "Success",
        description: "Data refreshed successfully",
      });
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast({
        title: "Error",
        description: "Failed to refresh data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openReceiveDialog = (record: ReceivingRecord) => {
    setSelectedRecord(record);
    // Initialize receive quantities with expected quantities
    const initialQuantities: Record<string, number> = {};
    record.items.forEach(item => {
      initialQuantities[item.id] = item.expectedQuantity - item.receivedQuantity;
    });
    setReceiveQuantities(initialQuantities);
    setIsReceiveDialogOpen(true);
  };

  const handleReceiveItem = (itemId: string, quantity: number) => {
    setReceiveQuantities({
      ...receiveQuantities,
      [itemId]: quantity
    });
  };

  const processReceiving = async () => {
    if (!selectedRecord) return;
    
    try {
      // Update item quantities
      const updatedItems: ReceivingItem[] = selectedRecord.items.map(item => {
        const receivedQty = receiveQuantities[item.id] || 0;
        const newReceivedQty = item.receivedQuantity + receivedQty;
        const newStatus = newReceivedQty >= item.expectedQuantity ? "received" as const : 
                         newReceivedQty > 0 ? "partial" as const : "pending" as const;
        
        return {
          ...item,
          receivedQuantity: newReceivedQty,
          status: newStatus
        };
      });
      
      // Update record
      const updatedRecord: ReceivingRecord = {
        ...selectedRecord,
        items: updatedItems,
        totalReceived: updatedItems.reduce((sum, item) => sum + item.receivedQuantity, 0),
        status: updatedItems.every(item => item.status === "received") ? "completed" as const : 
               updatedItems.some(item => item.receivedQuantity > 0) ? "partial" as const : "pending" as const
      };
      
      // Update state
      setReceivingRecords(receivingRecords.map(record => 
        record.id === selectedRecord.id ? updatedRecord : record
      ));
      
      // In a real implementation, we would also:
      // 1. Update the purchase order in the database
      // 2. Update product stock quantities
      // 3. Create receiving records in the database
      
      setIsReceiveDialogOpen(false);
      setSelectedRecord(null);
      setReceiveQuantities({});
      
      toast({
        title: "Success",
        description: "Inventory received successfully",
      });
    } catch (error) {
      console.error("Error processing receiving:", error);
      toast({
        title: "Error",
        description: "Failed to process receiving: " + (error as Error).message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation 
        title="Inventory Receiving" 
        onBack={onBack}
        onLogout={onLogout} 
        username={username}
      />
      
      <main className="container mx-auto p-6">
        <div className="mb-6">
          <h2 className="text-3xl font-bold">Inventory Receiving</h2>
          <p className="text-muted-foreground">Receive and process incoming inventory from suppliers</p>
        </div>
        
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by PO number or supplier..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button onClick={refreshData} variant="outline">
                  Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Pending Receiving Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <p>Loading receiving records...</p>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <Package className="h-8 w-8 mb-2" />
                <p>No receiving records found</p>
                <p className="text-sm">Create purchase orders to see receiving records here</p>
                <Button 
                  variant="outline" 
                  className="mt-2"
                  onClick={refreshData}
                >
                  Refresh Data
                </Button>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO Number</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Expected</TableHead>
                      <TableHead>Received</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.poNumber}</TableCell>
                        <TableCell>{record.supplier}</TableCell>
                        <TableCell>{record.date ? new Date(record.date).toLocaleDateString() : 'N/A'}</TableCell>
                        <TableCell>{record.items.length}</TableCell>
                        <TableCell>{record.totalExpected}</TableCell>
                        <TableCell>{record.totalReceived}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              record.status === "completed" ? "default" :
                              record.status === "partial" ? "secondary" : "outline"
                            }
                          >
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openReceiveDialog(record)}
                            disabled={record.status === "completed"}
                          >
                            <Package className="h-4 w-4 mr-2" />
                            Receive
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Receive Items Dialog */}
        <Dialog open={isReceiveDialogOpen} onOpenChange={setIsReceiveDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Receive Inventory</DialogTitle>
            </DialogHeader>
            {selectedRecord && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <Label>PO Number</Label>
                    <div className="font-medium">{selectedRecord.poNumber}</div>
                  </div>
                  <div>
                    <Label>Supplier</Label>
                    <div className="font-medium">{selectedRecord.supplier}</div>
                  </div>
                  <div>
                    <Label>Date</Label>
                    <div className="font-medium">{selectedRecord.date ? new Date(selectedRecord.date).toLocaleDateString() : 'N/A'}</div>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <div>
                      <Badge 
                        variant={
                          selectedRecord.status === "completed" ? "default" :
                          selectedRecord.status === "partial" ? "secondary" : "outline"
                        }
                      >
                        {selectedRecord.status}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Expected</TableHead>
                        <TableHead>Received</TableHead>
                        <TableHead>To Receive</TableHead>
                        <TableHead>Unit Cost</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedRecord.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.productName}</TableCell>
                          <TableCell>{item.expectedQuantity}</TableCell>
                          <TableCell>{item.receivedQuantity}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              max={item.expectedQuantity - item.receivedQuantity}
                              value={receiveQuantities[item.id] || 0}
                              onChange={(e) => handleReceiveItem(item.id, parseInt(e.target.value) || 0)}
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>{formatCurrency(item.unitCost)}</TableCell>
                          <TableCell>{formatCurrency(item.totalCost)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsReceiveDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={processReceiving}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Process Receiving
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};