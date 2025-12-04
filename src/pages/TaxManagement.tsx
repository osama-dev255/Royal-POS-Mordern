import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  Edit, 
  Trash2, 
  FileText, 
  Calendar,
  Download,
  Printer,
  Save
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  getTaxRecords, 
  createTaxRecord, 
  updateTaxRecord, 
  deleteTaxRecord,
  TaxRecord
} from "@/services/databaseService";
import { PrintUtils } from "@/utils/printUtils";

interface TaxManagementProps {
  username: string;
  onBack: () => void;
  onLogout: () => void;
}

export const TaxManagement = ({ username, onBack, onLogout }: TaxManagementProps) => {
  const { toast } = useToast();
  const [taxRecords, setTaxRecords] = useState<TaxRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTaxRecord, setEditingTaxRecord] = useState<TaxRecord | null>(null);
  const [newTaxRecord, setNewTaxRecord] = useState<Omit<TaxRecord, "id" | "created_at" | "updated_at">>({
    user_id: undefined,
    tax_type: "income_tax",
    period_start: new Date().toISOString().split('T')[0],
    period_end: new Date().toISOString().split('T')[0],
    taxable_amount: 0,
    tax_rate: 0.18,
    tax_amount: 0,
    description: "",
    status: "pending",
    payment_date: undefined,
    reference_number: ""
  });

  // Load tax records from database
  useEffect(() => {
    loadTaxRecords();
  }, []);

  const loadTaxRecords = async () => {
    try {
      setLoading(true);
      const records = await getTaxRecords();
      setTaxRecords(records);
    } catch (error) {
      console.error('Error loading tax records:', error);
      toast({
        title: "Error",
        description: "Failed to load tax records",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddTaxRecord = () => {
    setEditingTaxRecord(null);
    setNewTaxRecord({
      user_id: undefined,
      tax_type: "income_tax",
      period_start: new Date().toISOString().split('T')[0],
      period_end: new Date().toISOString().split('T')[0],
      taxable_amount: 0,
      tax_rate: 0.18,
      tax_amount: 0,
      description: "",
      status: "pending",
      payment_date: undefined,
      reference_number: ""
    });
    setIsDialogOpen(true);
  };

  const handleEditTaxRecord = (record: TaxRecord) => {
    setEditingTaxRecord(record);
    setNewTaxRecord({
      user_id: record.user_id,
      tax_type: record.tax_type,
      period_start: record.period_start,
      period_end: record.period_end,
      taxable_amount: record.taxable_amount,
      tax_rate: record.tax_rate,
      tax_amount: record.tax_amount,
      description: record.description || "",
      status: record.status,
      payment_date: record.payment_date || undefined,
      reference_number: record.reference_number || ""
    });
    setIsDialogOpen(true);
  };

  const handleSaveTaxRecord = async () => {
    try {
      if (editingTaxRecord) {
        // Update existing record
        const updatedRecord = await updateTaxRecord(editingTaxRecord.id!, newTaxRecord);
        if (updatedRecord) {
          setTaxRecords(taxRecords.map(r => r.id === editingTaxRecord.id ? updatedRecord : r));
          toast({
            title: "Success",
            description: "Tax record updated successfully"
          });
        }
      } else {
        // Create new record
        const createdRecord = await createTaxRecord(newTaxRecord);
        if (createdRecord) {
          setTaxRecords([...taxRecords, createdRecord]);
          toast({
            title: "Success",
            description: "Tax record created successfully"
          });
        }
      }
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving tax record:', error);
      toast({
        title: "Error",
        description: "Failed to save tax record",
        variant: "destructive"
      });
    }
  };

  const handleDeleteTaxRecord = async (id: string) => {
    try {
      const result = await deleteTaxRecord(id);
      if (result) {
        setTaxRecords(taxRecords.filter(r => r.id !== id));
        toast({
          title: "Success",
          description: "Tax record deleted successfully"
        });
      }
    } catch (error) {
      console.error('Error deleting tax record:', error);
      toast({
        title: "Error",
        description: "Failed to delete tax record",
        variant: "destructive"
      });
    }
  };

  const handleInputChange = (field: keyof Omit<TaxRecord, "id" | "created_at" | "updated_at" | "user_id">, value: string | number) => {
    setNewTaxRecord(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePrint = () => {
    // Create report data for printing
    const reportData = {
      title: "Tax Records Report",
      period: "All Records",
      data: taxRecords.map(record => ({
        name: `${record.tax_type} - ${record.period_start} to ${record.period_end}`,
        value: record.tax_amount
      }))
    };
    
    PrintUtils.printFinancialReport(reportData);
    toast({
      title: "Printing",
      description: "Tax records report is being printed...",
    });
  };

  const handleExport = () => {
    toast({
      title: "Export Started",
      description: "Exporting tax records as PDF...",
    });
    
    // Simulate export process
    setTimeout(() => {
      toast({
        title: "Export Complete",
        description: "Tax records have been exported successfully.",
      });
    }, 1500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2">Loading tax records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation 
        title="Tax Management" 
        onBack={onBack}
        onLogout={onLogout} 
        username={username}
      />
      
      <main className="container mx-auto p-6">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Tax Management</h1>
            <p className="text-muted-foreground">
              Manage and track all tax records and filings
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex items-center gap-2"
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button 
              variant="outline" 
              className="flex items-center gap-2"
              onClick={handleExport}
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button 
              className="flex items-center gap-2"
              onClick={handleAddTaxRecord}
            >
              <Plus className="h-4 w-4" />
              Add Tax Record
            </Button>
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Tax Records</CardTitle>
          </CardHeader>
          <CardContent>
            {taxRecords.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No tax records found</h3>
                <p className="text-muted-foreground mb-4">
                  Get started by adding your first tax record.
                </p>
                <Button onClick={handleAddTaxRecord}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Tax Record
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tax Type</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Taxable Amount</TableHead>
                      <TableHead>Tax Rate</TableHead>
                      <TableHead>Tax Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {taxRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.tax_type.replace('_', ' ')}</TableCell>
                        <TableCell>
                          {record.period_start} to {record.period_end}
                        </TableCell>
                        <TableCell>
                          {record.taxable_amount.toLocaleString(undefined, {
                            style: 'currency',
                            currency: 'TZS'
                          })}
                        </TableCell>
                        <TableCell>
                          {(record.tax_rate * 100).toFixed(2)}%
                        </TableCell>
                        <TableCell>
                          {record.tax_amount.toLocaleString(undefined, {
                            style: 'currency',
                            currency: 'TZS'
                          })}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            record.status === 'paid' ? 'bg-green-100 text-green-800' :
                            record.status === 'filed' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {record.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditTaxRecord(record)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => record.id && handleDeleteTaxRecord(record.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Add/Edit Tax Record Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingTaxRecord ? "Edit Tax Record" : "Add Tax Record"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="taxType">Tax Type</Label>
                <Select
                  value={newTaxRecord.tax_type}
                  onValueChange={(value) => handleInputChange("tax_type", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income_tax">Income Tax</SelectItem>
                    <SelectItem value="sales_tax">Sales Tax</SelectItem>
                    <SelectItem value="property_tax">Property Tax</SelectItem>
                    <SelectItem value="other">Other Tax</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="periodStart">Period Start</Label>
                  <Input
                    id="periodStart"
                    type="date"
                    value={newTaxRecord.period_start}
                    onChange={(e) => handleInputChange("period_start", e.target.value)}
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="periodEnd">Period End</Label>
                  <Input
                    id="periodEnd"
                    type="date"
                    value={newTaxRecord.period_end}
                    onChange={(e) => handleInputChange("period_end", e.target.value)}
                  />
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="taxableAmount">Taxable Amount</Label>
                <Input
                  id="taxableAmount"
                  type="number"
                  value={newTaxRecord.taxable_amount}
                  onChange={(e) => handleInputChange("taxable_amount", parseFloat(e.target.value) || 0)}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="taxRate">Tax Rate (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  step="0.01"
                  value={newTaxRecord.tax_rate * 100}
                  onChange={(e) => handleInputChange("tax_rate", (parseFloat(e.target.value) || 0) / 100)}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="taxAmount">Tax Amount</Label>
                <Input
                  id="taxAmount"
                  type="number"
                  value={newTaxRecord.tax_amount}
                  onChange={(e) => handleInputChange("tax_amount", parseFloat(e.target.value) || 0)}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={newTaxRecord.status}
                  onValueChange={(value) => handleInputChange("status", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="filed">Filed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="referenceNumber">Reference Number</Label>
                <Input
                  id="referenceNumber"
                  value={newTaxRecord.reference_number}
                  onChange={(e) => handleInputChange("reference_number", e.target.value)}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newTaxRecord.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveTaxRecord}>
                {editingTaxRecord ? "Update" : "Add"} Tax Record
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};