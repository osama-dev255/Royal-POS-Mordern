import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Building2, Search, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  getGodowns, 
  createGodown, 
  updateGodown, 
  deleteGodown, 
  Godown 
} from "@/services/godownService";
import { ZoneManagement } from "@/components/ZoneManagement";

const godownTypes = [
  { value: "warehouse", label: "Warehouse" },
  { value: "cold-storage", label: "Cold Storage" },
  { value: "retail", label: "Retail Store" },
  { value: "distribution", label: "Distribution Center" },
  { value: "factory", label: "Factory" }
];

const godownStatuses = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "maintenance", label: "Maintenance" }
];

export const GodownManagement = ({ username, onBack, onLogout }: { username: string; onBack: () => void; onLogout: () => void }) => {
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGodown, setEditingGodown] = useState<Godown | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showZones, setShowZones] = useState(false);
  const [selectedGodownForZones, setSelectedGodownForZones] = useState<Godown | null>(null);
  const { toast } = useToast();

  const [newGodown, setNewGodown] = useState<Omit<Godown, "id" | "created_at" | "updated_at">>({
    name: "",
    code: "",
    description: "",
    location: "",
    address: "",
    manager_name: "",
    manager_phone: "",
    capacity: "",
    godown_type: "warehouse",
    status: "active",
    is_default: false
  });

  useEffect(() => {
    loadGodowns();
  }, []);

  const loadGodowns = async () => {
    try {
      setLoading(true);
      const data = await getGodowns();
      setGodowns(data);
    } catch (error) {
      console.error("Error loading godowns:", error);
      toast({
        title: "Error",
        description: "Failed to load godowns",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddGodown = async () => {
    if (!newGodown.name || !newGodown.code) {
      toast({
        title: "Error",
        description: "Please fill in required fields (Name and Code)",
        variant: "destructive"
      });
      return;
    }

    try {
      const godown = await createGodown(newGodown);
      if (godown) {
        setGodowns([...godowns, godown]);
        resetForm();
        setIsDialogOpen(false);
        toast({
          title: "Success",
          description: "Godown added successfully"
        });
      }
    } catch (error: any) {
      console.error("Error adding godown:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add godown",
        variant: "destructive"
      });
    }
  };

  const handleUpdateGodown = async () => {
    if (!editingGodown || !editingGodown.id) return;
    
    try {
      const updatedGodown = await updateGodown(editingGodown.id, editingGodown);
      if (updatedGodown) {
        setGodowns(godowns.map(g => g.id === editingGodown.id ? updatedGodown : g));
        resetForm();
        setIsDialogOpen(false);
        toast({
          title: "Success",
          description: "Godown updated successfully"
        });
      }
    } catch (error: any) {
      console.error("Error updating godown:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update godown",
        variant: "destructive"
      });
    }
  };

  const handleDeleteGodown = async (id: string) => {
    if (!confirm("Are you sure you want to delete this godown? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteGodown(id);
      setGodowns(godowns.filter(g => g.id !== id));
      toast({
        title: "Success",
        description: "Godown deleted successfully"
      });
    } catch (error: any) {
      console.error("Error deleting godown:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete godown",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setNewGodown({
      name: "",
      code: "",
      description: "",
      location: "",
      address: "",
      manager_name: "",
      manager_phone: "",
      capacity: "",
      godown_type: "warehouse",
      status: "active",
      is_default: false
    });
    setEditingGodown(null);
  };

  const openEditDialog = (godown: Godown) => {
    setEditingGodown(godown);
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openZoneManagement = (godown: Godown) => {
    setSelectedGodownForZones(godown);
    setShowZones(true);
  };

  const closeZoneManagement = () => {
    setShowZones(false);
    setSelectedGodownForZones(null);
  };

  const filteredGodowns = godowns.filter(godown => {
    const matchesSearch = 
      godown.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      godown.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (godown.location && godown.location.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = filterStatus === "all" || godown.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "default";
      case "inactive": return "secondary";
      case "maintenance": return "destructive";
      default: return "secondary";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "cold-storage": return "❄️";
      case "distribution": return "🚚";
      case "retail": return "🏪";
      case "factory": return "🏭";
      default: return "🏢";
    }
  };

  // Show Zone Management if a godown is selected
  if (showZones && selectedGodownForZones) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation 
          title={`Zone Management - ${selectedGodownForZones.name}`} 
          onBack={closeZoneManagement}
          onLogout={onLogout} 
          username={username}
        />
        <main className="container mx-auto p-6">
          <ZoneManagement 
            godownId={selectedGodownForZones.id!}
            godownName={selectedGodownForZones.name}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation 
        title="Godown Management" 
        onBack={onBack}
        onLogout={onLogout} 
        username={username}
      />
      
      <main className="container mx-auto p-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="h-8 w-8 text-primary" />
            <h2 className="text-3xl font-bold">Godown (Warehouse) Management</h2>
          </div>
          <p className="text-muted-foreground">Manage your storage locations, warehouses, and distribution centers</p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Total Godowns</div>
              <div className="text-2xl font-bold">{godowns.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Active</div>
              <div className="text-2xl font-bold text-green-600">
                {godowns.filter(g => g.status === "active").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Maintenance</div>
              <div className="text-2xl font-bold text-yellow-600">
                {godowns.filter(g => g.status === "maintenance").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Default</div>
              <div className="text-2xl font-bold text-blue-600">
                {godowns.filter(g => g.is_default).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search godowns..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={openAddDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Add Godown
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Godowns Table */}
        <Card>
          <CardContent className="p-6">
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <p>Loading godowns...</p>
              </div>
            ) : filteredGodowns.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <Building2 className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg font-semibold">No godowns found</p>
                <p className="text-sm">Add your first godown to get started</p>
                <Button className="mt-4" onClick={openAddDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Godown
                </Button>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Manager</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Default</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGodowns.map((godown) => (
                      <TableRow key={godown.id}>
                        <TableCell className="font-mono text-sm font-semibold">
                          {godown.code}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getTypeIcon(godown.godown_type || "warehouse")}</span>
                            <div>
                              <div className="font-semibold">{godown.name}</div>
                              {godown.description && (
                                <div className="text-xs text-muted-foreground truncate max-w-xs">
                                  {godown.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {godown.godown_type || "warehouse"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {godown.location || "-"}
                        </TableCell>
                        <TableCell>
                          {godown.manager_name ? (
                            <div>
                              <div className="text-sm">{godown.manager_name}</div>
                              {godown.manager_phone && (
                                <div className="text-xs text-muted-foreground">{godown.manager_phone}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>{godown.capacity || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(godown.status || "active")}>
                            {godown.status || "active"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {godown.is_default ? (
                            <Badge variant="default">✓ Yes</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openZoneManagement(godown)}
                              title="Manage Zones"
                            >
                              📍
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openEditDialog(godown)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => handleDeleteGodown(godown.id!)}
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

        {/* Add/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {editingGodown ? "Edit Godown" : "Add New Godown"}
              </DialogTitle>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Godown Name *</Label>
                  <Input
                    id="name"
                    value={editingGodown ? (editingGodown.name || "") : newGodown.name}
                    onChange={(e) => 
                      editingGodown 
                        ? setEditingGodown({...editingGodown, name: e.target.value}) 
                        : setNewGodown({...newGodown, name: e.target.value})
                    }
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="code">Code *</Label>
                  <Input
                    id="code"
                    value={editingGodown ? (editingGodown.code || "") : newGodown.code}
                    onChange={(e) => 
                      editingGodown 
                        ? setEditingGodown({...editingGodown, code: e.target.value.toUpperCase()}) 
                        : setNewGodown({...newGodown, code: e.target.value.toUpperCase()})
                    }
                    placeholder="WH-001"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={editingGodown ? (editingGodown.description || "") : newGodown.description}
                  onChange={(e) => 
                    editingGodown 
                      ? setEditingGodown({...editingGodown, description: e.target.value}) 
                      : setNewGodown({...newGodown, description: e.target.value})
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={editingGodown ? (editingGodown.godown_type || "warehouse") : newGodown.godown_type}
                    onValueChange={(value) => 
                      editingGodown 
                        ? setEditingGodown({...editingGodown, godown_type: value as any}) 
                        : setNewGodown({...newGodown, godown_type: value as any})
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {godownTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={editingGodown ? (editingGodown.status || "active") : newGodown.status}
                    onValueChange={(value) => 
                      editingGodown 
                        ? setEditingGodown({...editingGodown, status: value as any}) 
                        : setNewGodown({...newGodown, status: value as any})
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {godownStatuses.map(status => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={editingGodown ? (editingGodown.location || "") : newGodown.location}
                    onChange={(e) => 
                      editingGodown 
                        ? setEditingGodown({...editingGodown, location: e.target.value}) 
                        : setNewGodown({...newGodown, location: e.target.value})
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="capacity">Capacity</Label>
                  <Input
                    id="capacity"
                    value={editingGodown ? (editingGodown.capacity || "") : newGodown.capacity}
                    onChange={(e) => 
                      editingGodown 
                        ? setEditingGodown({...editingGodown, capacity: e.target.value}) 
                        : setNewGodown({...newGodown, capacity: e.target.value})
                    }
                    placeholder="e.g., 10000 units"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="manager_name">Manager Name</Label>
                  <Input
                    id="manager_name"
                    value={editingGodown ? (editingGodown.manager_name || "") : newGodown.manager_name}
                    onChange={(e) => 
                      editingGodown 
                        ? setEditingGodown({...editingGodown, manager_name: e.target.value}) 
                        : setNewGodown({...newGodown, manager_name: e.target.value})
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="manager_phone">Manager Phone</Label>
                  <Input
                    id="manager_phone"
                    value={editingGodown ? (editingGodown.manager_phone || "") : newGodown.manager_phone}
                    onChange={(e) => 
                      editingGodown 
                        ? setEditingGodown({...editingGodown, manager_phone: e.target.value}) 
                        : setNewGodown({...newGodown, manager_phone: e.target.value})
                    }
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={editingGodown ? (editingGodown.address || "") : newGodown.address}
                  onChange={(e) => 
                    editingGodown 
                      ? setEditingGodown({...editingGodown, address: e.target.value}) 
                      : setNewGodown({...newGodown, address: e.target.value})
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="is_default">Set as Default Godown</Label>
                <Switch
                  id="is_default"
                  checked={editingGodown ? (editingGodown.is_default || false) : newGodown.is_default}
                  onCheckedChange={(checked) => 
                    editingGodown 
                      ? setEditingGodown({...editingGodown, is_default: checked}) 
                      : setNewGodown({...newGodown, is_default: checked})
                  }
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={editingGodown ? handleUpdateGodown : handleAddGodown}>
                {editingGodown ? "Update" : "Add"} Godown
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};
