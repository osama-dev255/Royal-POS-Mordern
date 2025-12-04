import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Edit, Trash2, Package, Calendar, Filter, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AuditItem {
  id: string;
  productId: string;
  productName: string;
  expectedQuantity: number;
  actualQuantity: number;
  variance: number;
  reason?: string;
  status: "pending" | "resolved" | "disputed";
  createdAt: string;
  updatedAt: string;
}

interface InventoryAudit {
  id: string;
  auditNumber: string;
  date: string;
  auditor: string;
  location: string;
  status: "draft" | "in_progress" | "completed";
  items: AuditItem[];
  notes?: string;
  discrepancyCount: number;
  totalVariance: number;
}

export const InventoryAudit = ({ username, onBack, onLogout }: { username: string; onBack: () => void; onLogout: () => void }) => {
  const [audits, setAudits] = useState<InventoryAudit[]>([
    {
      id: "1",
      auditNumber: "AUD-001",
      date: "2023-05-15",
      auditor: "John Manager",
      location: "Main Warehouse",
      status: "completed",
      items: [
        {
          id: "1-1",
          productId: "1",
          productName: "Wireless Headphones",
          expectedQuantity: 25,
          actualQuantity: 23,
          variance: -2,
          reason: "Theft suspected",
          status: "resolved",
          createdAt: "2023-05-15",
          updatedAt: "2023-05-16"
        },
        {
          id: "1-2",
          productId: "2",
          productName: "Coffee Maker",
          expectedQuantity: 15,
          actualQuantity: 15,
          variance: 0,
          status: "resolved",
          createdAt: "2023-05-15",
          updatedAt: "2023-05-15"
        }
      ],
      notes: "Quarterly inventory audit completed",
      discrepancyCount: 1,
      totalVariance: -2
    },
    {
      id: "2",
      auditNumber: "AUD-002",
      date: "2023-05-18",
      auditor: "Sarah Supervisor",
      location: "Store Front",
      status: "in_progress",
      items: [
        {
          id: "2-1",
          productId: "3",
          productName: "Running Shoes",
          expectedQuantity: 30,
          actualQuantity: 28,
          variance: -2,
          status: "pending",
          createdAt: "2023-05-18",
          updatedAt: "2023-05-18"
        }
      ],
      discrepancyCount: 1,
      totalVariance: -2
    }
  ]);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAudit, setEditingAudit] = useState<InventoryAudit | null>(null);
  const [newAudit, setNewAudit] = useState<Omit<InventoryAudit, "id" | "auditNumber" | "items" | "discrepancyCount" | "totalVariance">>({
    date: new Date().toISOString().split('T')[0],
    auditor: username,
    location: "",
    status: "draft",
    notes: ""
  });
  const { toast } = useToast();

  const handleAddAudit = () => {
    if (!newAudit.location) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "destructive"
      });
      return;
    }

    const auditNumber = `AUD-${String(audits.length + 1).padStart(3, '0')}`;
    
    const audit: InventoryAudit = {
      ...newAudit,
      id: Date.now().toString(),
      auditNumber,
      items: [],
      discrepancyCount: 0,
      totalVariance: 0
    };

    setAudits([...audits, audit]);
    resetForm();
    setIsDialogOpen(false);
    
    toast({
      title: "Success",
      description: "Inventory audit created successfully"
    });
  };

  const handleUpdateAudit = () => {
    if (!editingAudit || !editingAudit.location) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "destructive"
      });
      return;
    }

    setAudits(audits.map(a => a.id === editingAudit.id ? editingAudit : a));
    resetForm();
    setIsDialogOpen(false);
    
    toast({
      title: "Success",
      description: "Inventory audit updated successfully"
    });
  };

  const handleDeleteAudit = (id: string) => {
    setAudits(audits.filter(a => a.id !== id));
    toast({
      title: "Success",
      description: "Inventory audit deleted successfully"
    });
  };

  const resetForm = () => {
    setNewAudit({
      date: new Date().toISOString().split('T')[0],
      auditor: username,
      location: "",
      status: "draft",
      notes: ""
    });
    setEditingAudit(null);
  };

  const openEditDialog = (audit: InventoryAudit) => {
    setEditingAudit(audit);
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const totalAudits = audits.length;
  const completedAudits = audits.filter(a => a.status === "completed").length;
  const pendingDiscrepancies = audits.reduce((sum, audit) => 
    sum + audit.items.filter(item => item.status === "pending").length, 0
  );

  const filteredAudits = audits.filter(audit => {
    const matchesSearch = 
      audit.auditNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      audit.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      audit.auditor.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || audit.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navigation 
        title="Inventory Audit" 
        onBack={onBack}
        onLogout={onLogout} 
        username={username}
      />
      
      <main className="container mx-auto p-6">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold">Inventory Audits</h2>
            <p className="text-muted-foreground">Track and manage inventory discrepancies</p>
          </div>
          
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search audits..."
                className="pl-8 w-full sm:w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openAddDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Audit
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingAudit ? "Edit Audit" : "Create New Audit"}
                  </DialogTitle>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="date">Audit Date *</Label>
                      <Input
                        id="date"
                        type="date"
                        value={editingAudit ? editingAudit.date : newAudit.date}
                        onChange={(e) => 
                          editingAudit 
                            ? setEditingAudit({...editingAudit, date: e.target.value}) 
                            : setNewAudit({...newAudit, date: e.target.value})
                        }
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={editingAudit ? editingAudit.status : newAudit.status}
                        onValueChange={(value: "draft" | "in_progress" | "completed") => 
                          editingAudit 
                            ? setEditingAudit({...editingAudit, status: value}) 
                            : setNewAudit({...newAudit, status: value})
                        }
                      >
                        <SelectTrigger id="status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="location">Location *</Label>
                    <Input
                      id="location"
                      value={editingAudit ? editingAudit.location : newAudit.location}
                      onChange={(e) => 
                        editingAudit 
                          ? setEditingAudit({...editingAudit, location: e.target.value}) 
                          : setNewAudit({...newAudit, location: e.target.value})
                      }
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="auditor">Auditor</Label>
                    <Input
                      id="auditor"
                      value={editingAudit ? editingAudit.auditor : newAudit.auditor}
                      onChange={(e) => 
                        editingAudit 
                          ? setEditingAudit({...editingAudit, auditor: e.target.value}) 
                          : setNewAudit({...newAudit, auditor: e.target.value})
                      }
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={editingAudit ? editingAudit.notes || "" : newAudit.notes || ""}
                      onChange={(e) => 
                        editingAudit 
                          ? setEditingAudit({...editingAudit, notes: e.target.value}) 
                          : setNewAudit({...newAudit, notes: e.target.value})
                      }
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={editingAudit ? handleUpdateAudit : handleAddAudit}>
                    {editingAudit ? "Update" : "Create"} Audit
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Audits</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalAudits}</div>
              <p className="text-xs text-muted-foreground">Inventory audits</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedAudits}</div>
              <p className="text-xs text-muted-foreground">Finished audits</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Discrepancies</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{pendingDiscrepancies}</div>
              <p className="text-xs text-muted-foreground">Pending resolution</p>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Audit Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Audit #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Auditor</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Discrepancies</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAudits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No audit records found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAudits.map((audit) => (
                    <TableRow key={audit.id}>
                      <TableCell className="font-medium">{audit.auditNumber}</TableCell>
                      <TableCell>{audit.date}</TableCell>
                      <TableCell>{audit.location}</TableCell>
                      <TableCell>{audit.auditor}</TableCell>
                      <TableCell>{audit.items.length}</TableCell>
                      <TableCell>
                        <Badge variant={audit.discrepancyCount > 0 ? "destructive" : "secondary"}>
                          {audit.discrepancyCount}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            audit.status === "completed" ? "default" : 
                            audit.status === "in_progress" ? "secondary" : "outline"
                          }
                        >
                          {audit.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openEditDialog(audit)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleDeleteAudit(audit.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};