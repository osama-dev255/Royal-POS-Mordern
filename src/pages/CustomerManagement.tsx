import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Plus, Edit, Trash2, Users, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import { AutomationService } from "@/services/automationService";
import { ExportImportManager } from "@/components/ExportImportManager";
// Import Supabase database service
import { getCustomers, createCustomer, updateCustomer, deleteCustomer, Customer } from "@/services/databaseService";

export const CustomerManagement = ({ username, onBack, onLogout }: { username: string; onBack: () => void; onLogout: () => void }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [newCustomer, setNewCustomer] = useState<Omit<Customer, "id" | "loyalty_points" | "created_at" | "updated_at">>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    address: "",
    tax_id: ""
  });
  const { toast } = useToast();

  // Load customers from Supabase on component mount
  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const data = await getCustomers();
      setCustomers(data);
    } catch (error) {
      console.error("Error loading customers:", error);
      toast({
        title: "Error",
        description: "Failed to load customers",
        variant: "success"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.first_name && !newCustomer.last_name) {
      toast({
        title: "Error",
        description: "Customer name is required",
        variant: "success"
      });
      return;
    }

    try {
      const customerData = {
        ...newCustomer,
        loyalty_points: 0
      };
      
      const customer = await createCustomer(customerData);
      if (customer) {
        setCustomers([...customers, customer]);
        resetForm();
        setIsDialogOpen(false);
        
        toast({
          title: "Success",
          description: "Customer added successfully"
        });
      } else {
        throw new Error("Failed to create customer");
      }
    } catch (error) {
      console.error("Error adding customer:", error);
      toast({
        title: "Error",
        description: "Failed to add customer",
        variant: "success"
      });
    }
  };

  // Handle customer import
  const handleImportCustomers = async (importedCustomers: any[]) => {
    try {
      const results = [];
      
      for (const importedCustomer of importedCustomers) {
        // Check if customer already exists (by email)
        const existingCustomer = customers.find(c => 
          c.email && importedCustomer.email && c.email === importedCustomer.email
        );
        
        if (existingCustomer && existingCustomer.id) {
          // Update existing customer
          const updatedCustomer = await updateCustomer(existingCustomer.id, {
            ...existingCustomer,
            ...importedCustomer,
            loyalty_points: Number(importedCustomer.loyalty_points) || existingCustomer.loyalty_points
          });
          
          if (updatedCustomer) {
            results.push(updatedCustomer);
          }
        } else {
          // Add new customer
          const newCustomerData = {
            ...importedCustomer,
            loyalty_points: Number(importedCustomer.loyalty_points) || 0
          };
          
          const createdCustomer = await createCustomer(newCustomerData);
          if (createdCustomer) {
            results.push(createdCustomer);
          }
        }
      }
      
      // Refresh customers list
      await loadCustomers();
      
      toast({
        title: "Import Successful",
        description: `Successfully imported/updated ${results.length} customers`
      });
    } catch (error) {
      console.error("Error importing customers:", error);
      toast({
        title: "Import Failed",
        description: "Failed to import customers",
        variant: "success"
      });
    }
  };

  const handleUpdateCustomer = async () => {
    if (!editingCustomer || !editingCustomer.first_name || !editingCustomer.last_name) {
      toast({
        title: "Error",
        description: "Customer name is required",
        variant: "success"
      });
      return;
    }

    try {
      if (editingCustomer.id) {
        const updatedCustomer = await updateCustomer(editingCustomer.id, editingCustomer);
        if (updatedCustomer) {
          setCustomers(customers.map(c => c.id === editingCustomer.id ? updatedCustomer : c));
          resetForm();
          setIsDialogOpen(false);
          
          toast({
            title: "Success",
            description: "Customer updated successfully"
          });
        } else {
          throw new Error("Failed to update customer");
        }
      }
    } catch (error) {
      console.error("Error updating customer:", error);
      toast({
        title: "Error",
        description: "Failed to update customer",
        variant: "success"
      });
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    try {
      const success = await deleteCustomer(id);
      if (success) {
        setCustomers(customers.filter(c => c.id !== id));
        toast({
          title: "Success",
          description: "Customer deleted successfully"
        });
      } else {
        throw new Error("Failed to delete customer");
      }
    } catch (error) {
      console.error("Error deleting customer:", error);
      toast({
        title: "Error",
        description: "Failed to delete customer",
        variant: "success"
      });
    }
  };

  const resetForm = () => {
    setNewCustomer({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      address: "",
      tax_id: ""
    });
    setEditingCustomer(null);
  };

  const openEditDialog = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  // Apply automated customer segmentation
  const segmentedCustomers = AutomationService.segmentCustomers(customers);
  
  const filteredCustomers = segmentedCustomers.filter(customer => 
    (customer.name && customer.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (customer.phone && customer.phone.includes(searchTerm))
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation 
        title="Customer Management" 
        onBack={onBack}
        onLogout={onLogout} 
        username={username}
      />
      
      <main className="container mx-auto p-6">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Customer Management</h1>
            <p className="text-muted-foreground">Manage your customer database and loyalty programs</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openAddDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Customer
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingCustomer ? "Edit Customer" : "Add New Customer"}
                  </DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Customer Name *</Label>
                    <Input
                      id="name"
                      value={editingCustomer ? `${editingCustomer.first_name} ${editingCustomer.last_name}` : `${newCustomer.first_name} ${newCustomer.last_name}`}
                      onChange={(e) => {
                        const [firstName, lastName = ''] = e.target.value.split(' ', 2);
                        if (editingCustomer) {
                          setEditingCustomer({
                            ...editingCustomer, 
                            first_name: firstName,
                            last_name: lastName
                          });
                        } else {
                          setNewCustomer({
                            ...newCustomer, 
                            first_name: firstName,
                            last_name: lastName
                          });
                        }
                      }}
                      placeholder="Enter customer name"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={editingCustomer ? (editingCustomer.email || "") : (newCustomer.email || "")}
                        onChange={(e) => 
                          editingCustomer
                            ? setEditingCustomer({...editingCustomer, email: e.target.value})
                            : setNewCustomer({...newCustomer, email: e.target.value})
                        }
                        placeholder="Enter email address"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={editingCustomer ? (editingCustomer.phone || "") : (newCustomer.phone || "")}
                        onChange={(e) => 
                          editingCustomer
                            ? setEditingCustomer({...editingCustomer, phone: e.target.value})
                            : setNewCustomer({...newCustomer, phone: e.target.value})
                        }
                        placeholder="Enter phone number"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={editingCustomer ? (editingCustomer.address || "") : (newCustomer.address || "")}
                      onChange={(e) => 
                        editingCustomer
                          ? setEditingCustomer({...editingCustomer, address: e.target.value})
                          : setNewCustomer({...newCustomer, address: e.target.value})
                      }
                      placeholder="Enter address"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="taxId">Tax ID (TIN)</Label>
                    <Input
                      id="taxId"
                      value={editingCustomer ? (editingCustomer.tax_id || "") : (newCustomer.tax_id || "")}
                      onChange={(e) => 
                        editingCustomer
                          ? setEditingCustomer({...editingCustomer, tax_id: e.target.value})
                          : setNewCustomer({...newCustomer, tax_id: e.target.value})
                      }
                      placeholder="Enter tax identification number"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={editingCustomer ? handleUpdateCustomer : handleAddCustomer}>
                    {editingCustomer ? "Update Customer" : "Add Customer"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Customer Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{customers.length}</div>
              <p className="text-xs text-muted-foreground">Active customers</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">VIP Customers</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {customers.filter(c => c.loyalty_points && c.loyalty_points > 200).length}
              </div>
              <p className="text-xs text-muted-foreground">Loyalty points &gt; 200</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Spend</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {customers.length > 0 
                  ? formatCurrency(customers.reduce((sum, c) => sum + (c.loyalty_points || 0), 0) / customers.length)
                  : formatCurrency(0)
                }
              </div>
              <p className="text-xs text-muted-foreground">Average loyalty points</p>
            </CardContent>
          </Card>
        </div>

        {/* Customers Table */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Customer Database</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <p>Loading customers...</p>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <Users className="h-8 w-8 mb-2" />
                <p>No customers found</p>
                <p className="text-sm">Add your first customer to get started</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead className="text-right">Loyalty Points</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{`${customer.first_name} ${customer.last_name}`}</div>
                            <div className="text-sm text-muted-foreground">
                              {customer.address}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {customer.email && (
                              <div>{customer.email}</div>
                            )}
                            {customer.phone && (
                              <div>{customer.phone}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">
                            {customer.loyalty_points || 0} pts
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(customer)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => customer.id && handleDeleteCustomer(customer.id)}
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

        {/* Export/Import Manager */}
        <Card>
          <CardHeader>
            <CardTitle>Import/Export Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <ExportImportManager 
              data={customers}
              onImport={handleImportCustomers}
              dataType="customers"
            />
          </CardContent>
        </Card>

      </main>
    </div>
  );
};