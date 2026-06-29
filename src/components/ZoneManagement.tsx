import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, MapPin, Search, Layers } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  getZones, 
  createZone, 
  updateZone, 
  deleteZone,
  getGodowns,
  GodownZone,
  Godown
} from "@/services/godownService";

const zoneTypes = [
  { value: "general", label: "General Area" },
  { value: "rack", label: "Rack" },
  { value: "shelf", label: "Shelf" },
  { value: "cold-room", label: "Cold Room" },
  { value: "hazardous", label: "Hazardous Materials" },
  { value: "returns", label: "Returns Area" },
  { value: "quarantine", label: "Quarantine" }
];

const zoneStatuses = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "full", label: "Full" }
];

export const ZoneManagement = ({ godownId, godownName }: { godownId: string; godownName: string }) => {
  const [zones, setZones] = useState<GodownZone[]>([]);
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [selectedGodownId, setSelectedGodownId] = useState(godownId);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<GodownZone | null>(null);
  const { toast } = useToast();

  const [newZone, setNewZone] = useState<Omit<GodownZone, "id" | "created_at" | "updated_at">>({
    godown_id: selectedGodownId,
    zone_name: "",
    zone_code: "",
    description: "",
    zone_type: "general",
    rack_number: "",
    shelf_number: "",
    floor_number: "",
    capacity: "",
    status: "active"
  });

  useEffect(() => {
    loadGodowns();
  }, []);

  useEffect(() => {
    if (selectedGodownId) {
      loadZones();
    }
  }, [selectedGodownId]);

  const loadGodowns = async () => {
    try {
      const data = await getGodowns();
      setGodowns(data);
      if (!selectedGodownId && data.length > 0) {
        setSelectedGodownId(data[0].id!);
        setNewZone(prev => ({ ...prev, godown_id: data[0].id! }));
      }
    } catch (error) {
      console.error("Error loading godowns:", error);
    }
  };

  const loadZones = async () => {
    try {
      setLoading(true);
      const data = await getZones(selectedGodownId);
      setZones(data);
    } catch (error) {
      console.error("Error loading zones:", error);
      toast({
        title: "Error",
        description: "Failed to load zones",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddZone = async () => {
    if (!newZone.zone_name || !newZone.zone_code) {
      toast({
        title: "Error",
        description: "Please fill in required fields (Zone Name and Code)",
        variant: "destructive"
      });
      return;
    }

    // Check for duplicate zone code
    const existingZone = zones.find(z => z.zone_code === newZone.zone_code);
    if (existingZone) {
      toast({
        title: "Duplicate Zone Code",
        description: `Zone code "${newZone.zone_code}" already exists. Please use a different code.`,
        variant: "destructive"
      });
      return;
    }

    try {
      const zone = await createZone(newZone);
      if (zone) {
        setZones([...zones, zone]);
        resetForm();
        setIsDialogOpen(false);
        toast({
          title: "Success",
          description: "Zone added successfully"
        });
      }
    } catch (error: any) {
      console.error("Error adding zone:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add zone",
        variant: "destructive"
      });
    }
  };

  const handleUpdateZone = async () => {
    if (!editingZone || !editingZone.id) return;
    
    try {
      const updatedZone = await updateZone(editingZone.id, editingZone);
      if (updatedZone) {
        setZones(zones.map(z => z.id === editingZone.id ? updatedZone : z));
        resetForm();
        setIsDialogOpen(false);
        toast({
          title: "Success",
          description: "Zone updated successfully"
        });
      }
    } catch (error: any) {
      console.error("Error updating zone:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update zone",
        variant: "destructive"
      });
    }
  };

  const handleDeleteZone = async (id: string) => {
    if (!confirm("Are you sure you want to delete this zone?")) {
      return;
    }

    try {
      await deleteZone(id);
      setZones(zones.filter(z => z.id !== id));
      toast({
        title: "Success",
        description: "Zone deleted successfully"
      });
    } catch (error: any) {
      console.error("Error deleting zone:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete zone",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setNewZone({
      godown_id: selectedGodownId,
      zone_name: "",
      zone_code: "",
      description: "",
      zone_type: "general",
      rack_number: "",
      shelf_number: "",
      floor_number: "",
      capacity: "",
      status: "active"
    });
    setEditingZone(null);
  };

  const openEditDialog = (zone: GodownZone) => {
    setEditingZone(zone);
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const filteredZones = zones.filter(zone => 
    zone.zone_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (zone.zone_code && zone.zone_code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "default";
      case "inactive": return "secondary";
      case "full": return "destructive";
      default: return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Layers className="h-6 w-6 text-primary" />
          <div>
            <h3 className="text-2xl font-bold">Zone Management</h3>
            <p className="text-sm text-muted-foreground">
              Managing zones for: <span className="font-semibold">{godownName}</span>
            </p>
          </div>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Zone
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Zones</div>
            <div className="text-2xl font-bold">{zones.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Active</div>
            <div className="text-2xl font-bold text-green-600">
              {zones.filter(z => z.status === "active").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Full</div>
            <div className="text-2xl font-bold text-red-600">
              {zones.filter(z => z.status === "full").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Racks/Shelves</div>
            <div className="text-2xl font-bold text-blue-600">
              {zones.filter(z => z.zone_type === "rack" || z.zone_type === "shelf").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search zones..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Zones Table */}
      <Card>
        <CardContent className="p-6">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <p>Loading zones...</p>
            </div>
          ) : filteredZones.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <MapPin className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-semibold">No zones found</p>
              <p className="text-sm">Add your first zone to organize this godown</p>
              <Button className="mt-4" onClick={openAddDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Add Zone
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Zone Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Location Details</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredZones.map((zone) => (
                    <TableRow key={zone.id}>
                      <TableCell className="font-mono text-sm font-semibold">
                        {zone.zone_code || "-"}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-semibold">{zone.zone_name}</div>
                          {zone.description && (
                            <div className="text-xs text-muted-foreground truncate max-w-xs">
                              {zone.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {zone.zone_type || "general"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm space-y-1">
                          {zone.floor_number && <div>Floor: {zone.floor_number}</div>}
                          {zone.rack_number && <div>Rack: {zone.rack_number}</div>}
                          {zone.shelf_number && <div>Shelf: {zone.shelf_number}</div>}
                          {!zone.floor_number && !zone.rack_number && !zone.shelf_number && (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{zone.capacity || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(zone.status || "active")}>
                          {zone.status || "active"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openEditDialog(zone)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleDeleteZone(zone.id!)}
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
              <MapPin className="h-5 w-5" />
              {editingZone ? "Edit Zone" : "Add New Zone"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="zone_name">Zone Name *</Label>
                <Input
                  id="zone_name"
                  value={editingZone ? (editingZone.zone_name || "") : newZone.zone_name}
                  onChange={(e) => 
                    editingZone 
                      ? setEditingZone({...editingZone, zone_name: e.target.value}) 
                      : setNewZone({...newZone, zone_name: e.target.value})
                  }
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="zone_code">Zone Code *</Label>
                <Input
                  id="zone_code"
                  value={editingZone ? (editingZone.zone_code || "") : newZone.zone_code}
                  onChange={(e) => 
                    editingZone 
                      ? setEditingZone({...editingZone, zone_code: e.target.value.toUpperCase()}) 
                      : setNewZone({...newZone, zone_code: e.target.value.toUpperCase()})
                  }
                  placeholder="ZA-R1"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editingZone ? (editingZone.description || "") : newZone.description}
                onChange={(e) => 
                  editingZone 
                    ? setEditingZone({...editingZone, description: e.target.value}) 
                    : setNewZone({...newZone, description: e.target.value})
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="type">Zone Type</Label>
                <Select
                  value={editingZone ? (editingZone.zone_type || "general") : newZone.zone_type}
                  onValueChange={(value) => 
                    editingZone 
                      ? setEditingZone({...editingZone, zone_type: value as any}) 
                      : setNewZone({...newZone, zone_type: value as any})
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {zoneTypes.map(type => (
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
                  value={editingZone ? (editingZone.status || "active") : newZone.status}
                  onValueChange={(value) => 
                    editingZone 
                      ? setEditingZone({...editingZone, status: value as any}) 
                      : setNewZone({...newZone, status: value as any})
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {zoneStatuses.map(status => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="floor_number">Floor Number</Label>
                <Input
                  id="floor_number"
                  value={editingZone ? (editingZone.floor_number || "") : newZone.floor_number}
                  onChange={(e) => 
                    editingZone 
                      ? setEditingZone({...editingZone, floor_number: e.target.value}) 
                      : setNewZone({...newZone, floor_number: e.target.value})
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="rack_number">Rack Number</Label>
                <Input
                  id="rack_number"
                  value={editingZone ? (editingZone.rack_number || "") : newZone.rack_number}
                  onChange={(e) => 
                    editingZone 
                      ? setEditingZone({...editingZone, rack_number: e.target.value}) 
                      : setNewZone({...newZone, rack_number: e.target.value})
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="shelf_number">Shelf Number</Label>
                <Input
                  id="shelf_number"
                  value={editingZone ? (editingZone.shelf_number || "") : newZone.shelf_number}
                  onChange={(e) => 
                    editingZone 
                      ? setEditingZone({...editingZone, shelf_number: e.target.value}) 
                      : setNewZone({...newZone, shelf_number: e.target.value})
                  }
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="capacity">Capacity</Label>
              <Input
                id="capacity"
                value={editingZone ? (editingZone.capacity || "") : newZone.capacity}
                onChange={(e) => 
                  editingZone 
                    ? setEditingZone({...editingZone, capacity: e.target.value}) 
                    : setNewZone({...newZone, capacity: e.target.value})
                }
                placeholder="e.g., 500 units"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={editingZone ? handleUpdateZone : handleAddZone}>
              {editingZone ? "Update" : "Add"} Zone
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
