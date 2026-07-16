import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Edit, Trash2, Truck, Phone, Mail, MapPin, User, RefreshCw, Building2, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from "@/services/databaseService";

interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  tax_id: string;
  payment_terms: string;
  status: "active" | "inactive";
  created_at?: string;
}

export const SupplierManagement = ({ username, onBack, onLogout }: { username: string; onBack: () => void; onLogout: () => void }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [newSupplier, setNewSupplier] = useState<Omit<Supplier, "id" | "created_at">>({
    name: "",
    contactPerson: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    country: "",
    tax_id: "",
    payment_terms: "",
    status: "active"
  });
  const { toast } = useToast();

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
          city: supplier.city || '',
          state: supplier.state || '',
          zip_code: supplier.zip_code || '',
          country: supplier.country || '',
          tax_id: supplier.tax_id || '',
          payment_terms: supplier.payment_terms || '',
          status: supplier.is_active ? "active" as const : "inactive" as const,
          created_at: supplier.created_at,
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
        city: newSupplier.city,
        state: newSupplier.state,
        zip_code: newSupplier.zip_code,
        country: newSupplier.country,
        tax_id: newSupplier.tax_id,
        payment_terms: newSupplier.payment_terms,
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
          city: createdSupplier.city || '',
          state: createdSupplier.state || '',
          zip_code: createdSupplier.zip_code || '',
          country: createdSupplier.country || '',
          tax_id: createdSupplier.tax_id || '',
          payment_terms: createdSupplier.payment_terms || '',
          status: createdSupplier.is_active ? "active" as const : "inactive" as const,
          created_at: createdSupplier.created_at,
        };

        setSuppliers([...suppliers, formattedSupplier]);
        resetForm();
        setIsDialogOpen(false);
        
        toast({
          title: "Success",
          description: "Supplier registered successfully"
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
        city: editingSupplier.city,
        state: editingSupplier.state,
        zip_code: editingSupplier.zip_code,
        country: editingSupplier.country,
        tax_id: editingSupplier.tax_id,
        payment_terms: editingSupplier.payment_terms,
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
          city: updatedSupplier.city || '',
          state: updatedSupplier.state || '',
          zip_code: updatedSupplier.zip_code || '',
          country: updatedSupplier.country || '',
          tax_id: updatedSupplier.tax_id || '',
          payment_terms: updatedSupplier.payment_terms || '',
          status: updatedSupplier.is_active ? "active" as const : "inactive" as const,
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
    if (!confirm("Are you sure you want to delete this supplier?")) {
      return;
    }

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
      const errorMsg = (error as Error).message;
      
      // Check for foreign key constraint violation
      if (errorMsg.includes("23503") || errorMsg.includes("foreign key") || errorMsg.includes("still referenced")) {
        toast({
          title: "Cannot Delete Supplier",
          description: "This supplier is linked to existing purchase orders or records and cannot be deleted. You can mark it as inactive instead by editing the supplier.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to delete supplier: " + errorMsg,
          variant: "destructive"
        });
      }
    }
  };

  const resetForm = () => {
    setNewSupplier({
      name: "",
      contactPerson: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      zip_code: "",
      country: "",
      tax_id: "",
      payment_terms: "",
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
        city: supplier.city || '',
        state: supplier.state || '',
        zip_code: supplier.zip_code || '',
        country: supplier.country || '',
        tax_id: supplier.tax_id || '',
        payment_terms: supplier.payment_terms || '',
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

  const filteredSuppliers = suppliers.filter(supplier => 
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.phone.includes(searchTerm) ||
    supplier.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatAddress = (supplier: Supplier) => {
    const parts = [supplier.address, supplier.city, supplier.state, supplier.zip_code, supplier.country].filter(p => p);
    return parts.length > 0 ? parts.join(", ") : "No address provided";
  };

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
            <h2 className="text-3xl font-bold">Supplier Registration</h2>
            <p className="text-muted-foreground">Register and manage your suppliers</p>
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
                  Register Supplier
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-xl">
                    {editingSupplier ? "Edit Supplier Details" : "Register New Supplier"}
                  </DialogTitle>
                </DialogHeader>
                
                <div className="grid gap-6 py-4">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-primary border-b pb-2">Basic Information</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Company Name *</Label>
                        <Input
                          id="name"
                          value={editingSupplier ? editingSupplier.name : newSupplier.name}
                          onChange={(e) => 
                            editingSupplier 
                              ? setEditingSupplier({...editingSupplier, name: e.target.value}) 
                              : setNewSupplier({...newSupplier, name: e.target.value})
                          }
                          placeholder="Enter company name"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="contactPerson">Contact Person *</Label>
                        <Input
                          id="contactPerson"
                          value={editingSupplier ? editingSupplier.contactPerson : newSupplier.contactPerson}
                          onChange={(e) => 
                            editingSupplier 
                              ? setEditingSupplier({...editingSupplier, contactPerson: e.target.value}) 
                              : setNewSupplier({...newSupplier, contactPerson: e.target.value})
                          }
                          placeholder="Enter contact person name"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          value={editingSupplier ? editingSupplier.email : newSupplier.email}
                          onChange={(e) => 
                            editingSupplier 
                              ? setEditingSupplier({...editingSupplier, email: e.target.value}) 
                              : setNewSupplier({...newSupplier, email: e.target.value})
                          }
                          placeholder="supplier@company.com"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          value={editingSupplier ? editingSupplier.phone : newSupplier.phone}
                          onChange={(e) => 
                            editingSupplier 
                              ? setEditingSupplier({...editingSupplier, phone: e.target.value}) 
                              : setNewSupplier({...newSupplier, phone: e.target.value})
                          }
                          placeholder="+1 (555) 000-0000"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Address Information */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-primary border-b pb-2">Address Information</h3>
                    
                    <div className="space-y-2">
                      <Label htmlFor="address">Street Address</Label>
                      <Textarea
                        id="address"
                        value={editingSupplier ? editingSupplier.address : newSupplier.address}
                        onChange={(e) => 
                          editingSupplier 
                            ? setEditingSupplier({...editingSupplier, address: e.target.value}) 
                            : setNewSupplier({...newSupplier, address: e.target.value})
                        }
                        placeholder="Enter street address"
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          value={editingSupplier ? editingSupplier.city : newSupplier.city}
                          onChange={(e) => 
                            editingSupplier 
                              ? setEditingSupplier({...editingSupplier, city: e.target.value}) 
                              : setNewSupplier({...newSupplier, city: e.target.value})
                          }
                          placeholder="Enter city"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="state">State/Province</Label>
                        <Input
                          id="state"
                          value={editingSupplier ? editingSupplier.state : newSupplier.state}
                          onChange={(e) => 
                            editingSupplier 
                              ? setEditingSupplier({...editingSupplier, state: e.target.value}) 
                              : setNewSupplier({...newSupplier, state: e.target.value})
                          }
                          placeholder="Enter state or province"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="zip_code">ZIP/Postal Code</Label>
                        <Input
                          id="zip_code"
                          value={editingSupplier ? editingSupplier.zip_code : newSupplier.zip_code}
                          onChange={(e) => 
                            editingSupplier 
                              ? setEditingSupplier({...editingSupplier, zip_code: e.target.value}) 
                              : setNewSupplier({...newSupplier, zip_code: e.target.value})
                          }
                          placeholder="Enter ZIP or postal code"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="country">Country</Label>
                        <Input
                          id="country"
                          value={editingSupplier ? editingSupplier.country : newSupplier.country}
                          onChange={(e) => 
                            editingSupplier 
                              ? setEditingSupplier({...editingSupplier, country: e.target.value}) 
                              : setNewSupplier({...newSupplier, country: e.target.value})
                          }
                          placeholder="Enter country"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Business Details */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-primary border-b pb-2">Business Details</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="tax_id">Tax ID / TIN</Label>
                        <Input
                          id="tax_id"
                          value={editingSupplier ? editingSupplier.tax_id : newSupplier.tax_id}
                          onChange={(e) => 
                            editingSupplier 
                              ? setEditingSupplier({...editingSupplier, tax_id: e.target.value}) 
                              : setNewSupplier({...newSupplier, tax_id: e.target.value})
                          }
                          placeholder="Enter tax identification number"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="payment_terms">Payment Terms</Label>
                        <Select
                          value={editingSupplier ? editingSupplier.payment_terms : newSupplier.payment_terms}
                          onValueChange={(value) => 
                            editingSupplier 
                              ? setEditingSupplier({...editingSupplier, payment_terms: value}) 
                              : setNewSupplier({...newSupplier, payment_terms: value})
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select payment terms" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="net_30">Net 30 Days</SelectItem>
                            <SelectItem value="net_60">Net 60 Days</SelectItem>
                            <SelectItem value="net_90">Net 90 Days</SelectItem>
                            <SelectItem value="cod">Cash on Delivery</SelectItem>
                            <SelectItem value="prepaid">Prepaid</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={editingSupplier ? editingSupplier.status : newSupplier.status}
                        onValueChange={(value: "active" | "inactive") => 
                          editingSupplier 
                            ? setEditingSupplier({...editingSupplier, status: value}) 
                            : setNewSupplier({...newSupplier, status: value})
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={editingSupplier ? handleUpdateSupplier : handleAddSupplier}>
                    {editingSupplier ? "Update" : "Register"} Supplier
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Supplier Cards Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <p className="text-muted-foreground">Loading suppliers...</p>
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Truck className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Suppliers Found</h3>
              <p className="text-muted-foreground text-center mb-4">
                {searchTerm ? "No suppliers match your search criteria" : "Start by registering your first supplier"}
              </p>
              {!searchTerm && (
                <Button onClick={openAddDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Register Supplier
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSuppliers.map((supplier) => (
              <Card key={supplier.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{supplier.name}</CardTitle>
                        <Badge variant={supplier.status === "active" ? "default" : "secondary"} className="mt-1">
                          {supplier.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Contact Information */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Contact:</span>
                      <span className="font-medium">{supplier.contactPerson || "N/A"}</span>
                    </div>
                    
                    {supplier.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a href={`mailto:${supplier.email}`} className="text-primary hover:underline">
                          {supplier.email}
                        </a>
                      </div>
                    )}
                    
                    {supplier.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <a href={`tel:${supplier.phone}`} className="text-primary hover:underline">
                          {supplier.phone}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Address */}
                  <div className="border-t pt-3">
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-muted-foreground mb-1">Address:</p>
                        <p className="text-foreground">{formatAddress(supplier)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Business Details */}
                  {(supplier.tax_id || supplier.payment_terms) && (
                    <div className="border-t pt-3">
                      <div className="space-y-1 text-sm">
                        {supplier.tax_id && (
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Tax ID:</span>
                            <span className="font-medium">{supplier.tax_id}</span>
                          </div>
                        )}
                        {supplier.payment_terms && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Payment:</span>
                            <Badge variant="outline">{supplier.payment_terms.replace('_', ' ').toUpperCase()}</Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openEditDialog(supplier)}
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => handleDeleteSupplier(supplier.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
