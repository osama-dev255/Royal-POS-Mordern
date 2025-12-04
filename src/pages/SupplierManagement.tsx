import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Plus, Edit, Trash2, Truck, Phone, Mail, MapPin, BarChart3, User, Download, Upload, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AutomationService } from "@/services/automationService";
import { ExportImportManager } from "@/components/ExportImportManager";
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from "@/services/databaseService";

interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  tax_id?: string;
  products: string[];
  status: "active" | "inactive";
  lastOrder?: string;
}

export const SupplierManagement = ({ username, onBack, onLogout }: { username: string; onBack: () => void; onLogout: () => void }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [newSupplier, setNewSupplier] = useState<Omit<Supplier, "id">>({
    name: "",
    contactPerson: "",
    email: "",
    phone: "",
    address: "",
    tax_id: "",
    products: [],
    status: "active"
  });
  const { toast } = useToast();

  // Load suppliers from database
  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        setLoading(true);
        const supplierData = await getSuppliers();
        const formattedSuppliers = supplierData.map(supplier => ({
          id: supplier.id || '',
          name: supplier.name,
          contactPerson: supplier.contact_person || '',
          email: supplier.email || '',
          phone: supplier.phone || '',
          address: supplier.address || '',
          products: [], // Will need to be loaded from a separate table or field
          status: supplier.is_active ? "active" as const : "inactive" as const,
          // lastOrder would need to be calculated from purchase orders
        }));
        setSuppliers(formattedSuppliers);
      } catch (error) {
        console.error("Error loading suppliers:", error);
        toast({
          title: "Error",
          description: "Failed to load suppliers",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadSuppliers();
  }, []);

  const handleAddSupplier = async () => {
    if (!newSupplier.name || !newSupplier.contactPerson) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const supplierData = {
        name: newSupplier.name,
        contact_person: newSupplier.contactPerson,
        email: newSupplier.email,
        phone: newSupplier.phone,
        address: newSupplier.address,
        tax_id: newSupplier.tax_id || "",
        is_active: newSupplier.status === "active"
      };

      const createdSupplier = await createSupplier(supplierData);
      
      if (createdSupplier) {
        const formattedSupplier: Supplier = {
          id: createdSupplier.id || '',
          name: createdSupplier.name,
          contactPerson: createdSupplier.contact_person || '',
          email: createdSupplier.email || '',
          phone: createdSupplier.phone || '',
          address: createdSupplier.address || '',
          tax_id: createdSupplier.tax_id || '',
          products: [],
          status: createdSupplier.is_active ? "active" as const : "inactive" as const
        };

        setSuppliers([...suppliers, formattedSupplier]);
        resetForm();
        setIsDialogOpen(false);
        
        toast({
          title: "Success",
          description: "Supplier added successfully"
        });
      } else {
        throw new Error("Failed to create supplier");
      }
    } catch (error) {
      console.error("Error creating supplier:", error);
      toast({
        title: "Error",
        description: "Failed to add supplier: " + (error as Error).message,
        variant: "destructive"
      });
    }
  };

  // Handle supplier import
  const handleImportSuppliers = (importedSuppliers: any[]) => {
    // This would need to be updated to work with the database
    const updatedSuppliers = [...suppliers];
    
    importedSuppliers.forEach(importedSupplier => {
      // Check if supplier already exists (by name)
      const existingIndex = updatedSuppliers.findIndex(s => s.name === importedSupplier.name);
      
      if (existingIndex >= 0) {
        // Update existing supplier
        updatedSuppliers[existingIndex] = {
          ...updatedSuppliers[existingIndex],
          ...importedSupplier
        };
      } else {
        // Add new supplier
        updatedSuppliers.push({
          ...importedSupplier,
          id: Date.now().toString() + Math.random()
        });
      }
    });
    
    setSuppliers(updatedSuppliers);
    
    toast({
      title: "Import Successful",
      description: `Successfully imported ${importedSuppliers.length} suppliers`
    });
  };

  const handleUpdateSupplier = async () => {
    if (!editingSupplier || !editingSupplier.name || !editingSupplier.contactPerson) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const supplierData = {
        name: editingSupplier.name,
        contact_person: editingSupplier.contactPerson,
        email: editingSupplier.email,
        phone: editingSupplier.phone,
        address: editingSupplier.address,
        tax_id: editingSupplier.tax_id || "",
        is_active: editingSupplier.status === "active"
      };

      const updatedSupplier = await updateSupplier(editingSupplier.id, supplierData);
      
      if (updatedSupplier) {
        const formattedSupplier: Supplier = {
          id: updatedSupplier.id || '',
          name: updatedSupplier.name,
          contactPerson: updatedSupplier.contact_person || '',
          email: updatedSupplier.email || '',
          phone: updatedSupplier.phone || '',
          address: updatedSupplier.address || '',
          tax_id: updatedSupplier.tax_id || '',
          products: [],
          status: updatedSupplier.is_active ? "active" as const : "inactive" as const
        };

        setSuppliers(suppliers.map(s => s.id === editingSupplier.id ? formattedSupplier : s));
        resetForm();
        setIsDialogOpen(false);
        
        toast({
          title: "Success",
          description: "Supplier updated successfully"
        });
      } else {
        throw new Error("Failed to update supplier");
      }
    } catch (error) {
      console.error("Error updating supplier:", error);
      toast({
        title: "Error",
        description: "Failed to update supplier: " + (error as Error).message,
        variant: "destructive"
      });
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    try {
      const success = await deleteSupplier(id);
      
      if (success) {
        setSuppliers(suppliers.filter(s => s.id !== id));
        toast({
          title: "Success",
          description: "Supplier deleted successfully"
        });
      } else {
        throw new Error("Failed to delete supplier");
      }
    } catch (error) {
      console.error("Error deleting supplier:", error);
      toast({
        title: "Error",
        description: "Failed to delete supplier: " + (error as Error).message,
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setNewSupplier({
      name: "",
      contactPerson: "",
      email: "",
      phone: "",
      address: "",
      tax_id: "",
      products: [],
      status: "active"
    });
    setEditingSupplier(null);
  };

  const openEditDialog = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  // Refresh suppliers from database
  const refreshSuppliers = async () => {
    try {
      setLoading(true);
      const supplierData = await getSuppliers();
      const formattedSuppliers = supplierData.map(supplier => ({
        id: supplier.id || '',
        name: supplier.name,
        contactPerson: supplier.contact_person || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
        products: [],
        status: supplier.is_active ? "active" as const : "inactive" as const,
      }));
      setSuppliers(formattedSuppliers);
      toast({
        title: "Success",
        description: "Suppliers refreshed successfully"
      });
    } catch (error) {
      console.error("Error refreshing suppliers:", error);
      toast({
        title: "Error",
        description: "Failed to refresh suppliers",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Apply automated supplier performance tracking
  const suppliersWithPerformance = AutomationService.trackSupplierPerformance(suppliers, []);
  
  const filteredSuppliers = suppliersWithPerformance.filter(supplier => 
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.phone.includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation 
        title="Supplier Management" 
        onBack={onBack}
        onLogout={onLogout} 
        username={username}
      />
      
      <main className="container mx-auto p-6">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold">Suppliers</h2>
            <p className="text-muted-foreground">Manage your suppliers and vendor relationships</p>
          </div>
          
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search suppliers..."
                className="pl-8 w-full sm:w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" onClick={refreshSuppliers}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openAddDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Supplier
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingSupplier ? "Edit Supplier" : "Add New Supplier"}
                  </DialogTitle>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Company Name *</Label>
                    <Input
                      id="name"
                      value={editingSupplier ? editingSupplier.name : newSupplier.name}
                      onChange={(e) => 
                        editingSupplier 
                          ? setEditingSupplier({...editingSupplier, name: e.target.value}) 
                          : setNewSupplier({...newSupplier, name: e.target.value})
                      }
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="contactPerson">Contact Person *</Label>
                    <Input
                      id="contactPerson"
                      value={editingSupplier ? editingSupplier.contactPerson : newSupplier.contactPerson}
                      onChange={(e) => 
                        editingSupplier 
                          ? setEditingSupplier({...editingSupplier, contactPerson: e.target.value}) 
                          : setNewSupplier({...newSupplier, contactPerson: e.target.value})
                      }
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={editingSupplier ? editingSupplier.email : newSupplier.email}
                      onChange={(e) => 
                        editingSupplier 
                          ? setEditingSupplier({...editingSupplier, email: e.target.value}) 
                          : setNewSupplier({...newSupplier, email: e.target.value})
                      }
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={editingSupplier ? editingSupplier.phone : newSupplier.phone}
                      onChange={(e) => 
                        editingSupplier 
                          ? setEditingSupplier({...editingSupplier, phone: e.target.value}) 
                          : setNewSupplier({...newSupplier, phone: e.target.value})
                      }
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      value={editingSupplier ? editingSupplier.address : newSupplier.address}
                      onChange={(e) => 
                        editingSupplier 
                          ? setEditingSupplier({...editingSupplier, address: e.target.value}) 
                          : setNewSupplier({...newSupplier, address: e.target.value})
                      }
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="taxId">Tax ID (TIN)</Label>
                    <Input
                      id="taxId"
                      value={editingSupplier ? (editingSupplier.tax_id || "") : (newSupplier.tax_id || "")}
                      onChange={(e) => 
                        editingSupplier 
                          ? setEditingSupplier({...editingSupplier, tax_id: e.target.value}) 
                          : setNewSupplier({...newSupplier, tax_id: e.target.value})
                      }
                      placeholder="Enter tax identification number"
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="products">Products Supplied</Label>
                    <Input
                      id="products"
                      placeholder="e.g., Electronics, Clothing"
                      value={editingSupplier ? editingSupplier.products.join(", ") : newSupplier.products.join(", ")}
                      onChange={(e) => {
                        const products = e.target.value.split(",").map(p => p.trim()).filter(p => p);
                        editingSupplier 
                          ? setEditingSupplier({...editingSupplier, products}) 
                          : setNewSupplier({...newSupplier, products})
                      }}
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={editingSupplier ? handleUpdateSupplier : handleAddSupplier}>
                    {editingSupplier ? "Update" : "Add"} Supplier
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Supplier Directory
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Products</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Order</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No suppliers found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSuppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{supplier.name}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {supplier.contactPerson}
                          </div>
                          {supplier.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {supplier.email}
                            </div>
                          )}
                          {supplier.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {supplier.phone}
                            </div>
                          )}
                          {supplier.address && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {supplier.address.substring(0, 30)}...
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {supplier.products.map((product, index) => (
                            <Badge key={index} variant="secondary">
                              {product}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={supplier.status === "active" ? "default" : "destructive"}>
                          {supplier.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          {supplier.lastOrder || "N/A"}
                          {supplier.performance && (
                            <div className="text-xs text-muted-foreground mt-1">
                              <div>On-time: {supplier.performance.onTimeDeliveryRate.toFixed(1)}%</div>
                              <div>Avg. Order: {supplier.performance.averageOrderValue.toFixed(2)}</div>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openEditDialog(supplier)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleDeleteSupplier(supplier.id)}
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
        
        <div className="mt-6">
          <ExportImportManager 
            data={suppliers}
            dataType="suppliers"
            onImport={handleImportSuppliers}
          />
        </div>
      </main>
    </div>
  );
};