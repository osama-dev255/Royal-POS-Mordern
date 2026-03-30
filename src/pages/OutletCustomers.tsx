import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Users,
  Search,
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  ShoppingBag,
  Star,
  Plus,
  Trash2,
  UserPlus,
  Loader2
} from "lucide-react";
import { getOutletCustomers, createOutletCustomer, deleteOutletCustomer, OutletCustomer } from "@/services/databaseService";
import { useToast } from "@/hooks/use-toast";

interface OutletCustomersProps {
  onBack: () => void;
  outletId?: string;
}

export const OutletCustomers = ({ onBack, outletId }: OutletCustomersProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [customers, setCustomers] = useState<OutletCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Form state for new customer
  const [newCustomer, setNewCustomer] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    address: "",
    district_ward: ""
  });

  useEffect(() => {
    loadCustomers();
  }, [outletId]);

  const loadCustomers = async () => {
    if (!outletId) return;
    
    try {
      setLoading(true);
      // Use outlet_customers table - completely separate from general customers
      const data = await getOutletCustomers(outletId);
      setCustomers(data);
    } catch (error) {
      console.error("Error loading outlet customers:", error);
      toast({
        title: "Error",
        description: "Failed to load outlet customers",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(customer =>
    `${customer.first_name} ${customer.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.phone && customer.phone.includes(searchTerm)) ||
    (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleAddCustomer = async () => {
    if (!outletId) return;
    if (!newCustomer.first_name.trim() || !newCustomer.last_name.trim()) {
      toast({
        title: "Validation Error",
        description: "First name and last name are required",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSaving(true);
      const customer = await createOutletCustomer({
        outlet_id: outletId,
        first_name: newCustomer.first_name.trim(),
        last_name: newCustomer.last_name.trim(),
        phone: newCustomer.phone.trim() || undefined,
        email: newCustomer.email.trim() || undefined,
        address: newCustomer.address.trim() || undefined,
        district_ward: newCustomer.district_ward.trim() || undefined,
        is_active: true,
        loyalty_points: 0
      });

      if (customer) {
        setCustomers(prev => [...prev, customer]);
        setNewCustomer({
          first_name: "",
          last_name: "",
          phone: "",
          email: "",
          address: "",
          district_ward: ""
        });
        setIsAddDialogOpen(false);
        toast({
          title: "Success",
          description: "Outlet customer added successfully"
        });
      } else {
        throw new Error("Failed to create outlet customer");
      }
    } catch (error) {
      console.error("Error adding outlet customer:", error);
      toast({
        title: "Error",
        description: "Failed to add outlet customer",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCustomer = async (customerId: string, customerName: string) => {
    if (!confirm(`Are you sure you want to delete "${customerName}"?`)) return;

    try {
      const success = await deleteOutletCustomer(customerId);
      if (success) {
        setCustomers(prev => prev.filter(c => c.id !== customerId));
        toast({
          title: "Success",
          description: "Outlet customer deleted successfully"
        });
      } else {
        throw new Error("Failed to delete outlet customer");
      }
    } catch (error) {
      console.error("Error deleting outlet customer:", error);
      toast({
        title: "Error",
        description: "Failed to delete outlet customer",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setNewCustomer({
      first_name: "",
      last_name: "",
      phone: "",
      email: "",
      address: "",
      district_ward: ""
    });
  };

  // Calculate stats
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter(c => c.is_active !== false).length;
  const totalLoyaltyPoints = customers.reduce((sum, c) => sum + (c.loyalty_points || 0), 0);

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Outlet Customers</h1>
            <p className="text-muted-foreground">Manage customers for this outlet</p>
          </div>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Customers</p>
                <p className="text-2xl font-bold">{totalCustomers}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{activeCustomers}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Loyalty Points</p>
                <p className="text-2xl font-bold">{totalLoyaltyPoints.toLocaleString()}</p>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="text-2xl font-bold text-green-600">Active</p>
              </div>
              <ShoppingBag className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers by name, phone, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Customers List */}
      {filteredCustomers.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No customers found</h3>
          <p className="text-muted-foreground mb-4">
            {customers.length === 0 
              ? "Add your first customer to get started" 
              : "Try adjusting your search terms"}
          </p>
          {customers.length === 0 && (
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add First Customer
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((customer) => (
            <Card key={customer.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {customer.first_name} {customer.last_name}
                    </CardTitle>
                    <Badge className={customer.is_active !== false ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                      {customer.is_active !== false ? 'active' : 'inactive'}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteCustomer(customer.id!, `${customer.first_name} ${customer.last_name}`)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 text-sm">
                  {customer.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      {customer.phone}
                    </div>
                  )}
                  {customer.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      {customer.email}
                    </div>
                  )}
                  {(customer.address || customer.district_ward) && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {customer.address}{customer.district_ward ? `, ${customer.district_ward}` : ''}
                    </div>
                  )}
                  <div className="pt-2 border-t mt-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Loyalty Points:</span>
                      <span className="font-semibold">{(customer.loyalty_points || 0).toLocaleString()}</span>
                    </div>
                    {customer.created_at && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Joined:</span>
                        <span className="font-semibold">
                          {new Date(customer.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Customer Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        setIsAddDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">First Name *</label>
                <Input
                  value={newCustomer.first_name}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, first_name: e.target.value }))}
                  placeholder="Enter first name"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Last Name *</label>
                <Input
                  value={newCustomer.last_name}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, last_name: e.target.value }))}
                  placeholder="Enter last name"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Phone</label>
              <Input
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Enter phone number"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Email</label>
              <Input
                type="email"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email address"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Address</label>
              <Input
                value={newCustomer.address}
                onChange={(e) => setNewCustomer(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Enter address"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">District/Ward</label>
              <Input
                value={newCustomer.district_ward}
                onChange={(e) => setNewCustomer(prev => ({ ...prev, district_ward: e.target.value }))}
                placeholder="Enter district or ward"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddDialogOpen(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleAddCustomer} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Customer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
