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
  Loader2,
  LayoutGrid,
  List,
  Pencil
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { getOutletCustomers, createOutletCustomer, updateOutletCustomer, deleteOutletCustomer, getOutletDebtsByOutletId, OutletCustomer } from "@/services/databaseService";
import { useToast } from "@/hooks/use-toast";
import { CustomerLedger } from "@/components/CustomerLedger";

interface OutletCustomersProps {
  onBack: () => void;
  outletId?: string;
}

export const OutletCustomers = ({ onBack, outletId }: OutletCustomersProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [customers, setCustomers] = useState<OutletCustomer[]>([]);
  const [customerBalances, setCustomerBalances] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<OutletCustomer | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [selectedCustomerForLedger, setSelectedCustomerForLedger] = useState<OutletCustomer | null>(null);
  const { toast } = useToast();

  // Form state for new customer - aligned with SalesCart
  const [newCustomer, setNewCustomer] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    address: "",
    district_ward: "",
    tax_id: ""
  });

  // Form state for editing customer
  const [editForm, setEditForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    address: "",
    district_ward: "",
    tax_id: ""
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
      
      // Fetch all debts for this outlet and calculate balances per customer
      const debts = await getOutletDebtsByOutletId(outletId);
      const balances: Record<string, number> = {};
      
      // Sum up outstanding AND partial debts for each customer (both have remaining balance)
      debts.forEach(debt => {
        if (debt.customer_id && (debt.payment_status === 'unpaid' || debt.payment_status === 'partial')) {
          balances[debt.customer_id] = (balances[debt.customer_id] || 0) + (debt.remaining_amount || 0);
        }
      });
      
      setCustomerBalances(balances);
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

  const handleCustomerClick = (customer: OutletCustomer) => {
    setSelectedCustomerForLedger(customer);
  };

  const handleBackFromLedger = () => {
    setSelectedCustomerForLedger(null);
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
        tax_id: newCustomer.tax_id.trim() || undefined,
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
          district_ward: "",
          tax_id: ""
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

  const handleEditCustomer = (customer: OutletCustomer) => {
    setEditingCustomer(customer);
    setEditForm({
      first_name: customer.first_name,
      last_name: customer.last_name,
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || "",
      district_ward: customer.district_ward || "",
      tax_id: customer.tax_id || ""
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingCustomer?.id) return;
    if (!editForm.first_name.trim() || !editForm.last_name.trim()) {
      toast({
        title: "Validation Error",
        description: "First name and last name are required",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSaving(true);
      const updated = await updateOutletCustomer(editingCustomer.id, {
        first_name: editForm.first_name.trim(),
        last_name: editForm.last_name.trim(),
        phone: editForm.phone.trim() || undefined,
        email: editForm.email.trim() || undefined,
        address: editForm.address.trim() || undefined,
        district_ward: editForm.district_ward.trim() || undefined,
        tax_id: editForm.tax_id.trim() || undefined
      });

      if (updated) {
        setCustomers(prev => prev.map(c => c.id === updated.id ? updated : c));
        setIsEditDialogOpen(false);
        setEditingCustomer(null);
        toast({
          title: "Success",
          description: "Customer updated successfully"
        });
      } else {
        throw new Error("Failed to update customer");
      }
    } catch (error) {
      console.error("Error updating customer:", error);
      toast({
        title: "Error",
        description: "Failed to update customer",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetEditForm = () => {
    setEditForm({
      first_name: "",
      last_name: "",
      phone: "",
      email: "",
      address: "",
      district_ward: "",
      tax_id: ""
    });
    setEditingCustomer(null);
  };

  const resetForm = () => {
    setNewCustomer({
      first_name: "",
      last_name: "",
      phone: "",
      email: "",
      address: "",
      district_ward: "",
      tax_id: ""
    });
  };

  // Calculate stats
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter(c => c.is_active !== false).length;
  const totalLoyaltyPoints = customers.reduce((sum, c) => sum + (c.loyalty_points || 0), 0);
  
  // Calculate total outstanding customer balances
  const totalOutstandingBalance = Object.values(customerBalances).reduce((sum, balance) => sum + balance, 0);
  const customersWithDebt = Object.values(customerBalances).filter(balance => balance > 0).length;

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
      {/* Show Customer Ledger if a customer is selected */}
      {selectedCustomerForLedger ? (
        <CustomerLedger 
          customer={selectedCustomerForLedger}
          outletId={outletId!}
          onBack={handleBackFromLedger}
        />
      ) : (
        /* Show Customer List */
        <>
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
        <div className="flex items-center gap-4">
          {/* View Toggle */}
          <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as "card" | "table")}>
            <ToggleGroupItem value="card" aria-label="Card view">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="table" aria-label="Table view">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Customers</p>
                <p className="text-xl font-bold">{totalCustomers}</p>
              </div>
              <Users className="h-7 w-7 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Active</p>
                <p className="text-xl font-bold">{activeCustomers}</p>
              </div>
              <div className="h-7 w-7 rounded-full bg-green-100 flex items-center justify-center">
                <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">Outstanding Balance</p>
                <p className="text-lg font-bold text-red-600 truncate">{formatCurrency(totalOutstandingBalance)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{customersWithDebt} customer{customersWithDebt !== 1 ? 's' : ''}</p>
              </div>
              <div className="h-7 w-7 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 ml-2">
                <span className="text-red-600 text-xs font-bold">TSh</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Loyalty Points</p>
                <p className="text-xl font-bold">{totalLoyaltyPoints.toLocaleString()}</p>
              </div>
              <Star className="h-7 w-7 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <p className="text-xl font-bold text-green-600">Active</p>
              </div>
              <ShoppingBag className="h-7 w-7 text-blue-500" />
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
      ) : viewMode === "card" ? (
        /* Card View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((customer) => (
            <Card key={customer.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleCustomerClick(customer)}>
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
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditCustomer(customer)}
                    >
                      <Pencil className="h-4 w-4 text-blue-500" />
                    </Button>
                    {/* Delete button hidden - commented out
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCustomer(customer.id!, `${customer.first_name} ${customer.last_name}`)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                    */}
                  </div>
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
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Balance:</span>
                      <span className={`font-semibold ${customerBalances[customer.id!] ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(customerBalances[customer.id!] || 0)}
                      </span>
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
      ) : (
        /* Table View */
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>District/Ward</TableHead>
                <TableHead>Loyalty Points</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow key={customer.id} className="cursor-pointer hover:bg-gray-50" onClick={() => handleCustomerClick(customer)}>
                  <TableCell className="font-medium">
                    {customer.first_name} {customer.last_name}
                  </TableCell>
                  <TableCell>{customer.phone || '-'}</TableCell>
                  <TableCell>{customer.email || '-'}</TableCell>
                  <TableCell>{customer.address || '-'}</TableCell>
                  <TableCell>{customer.district_ward || '-'}</TableCell>
                  <TableCell>{(customer.loyalty_points || 0).toLocaleString()}</TableCell>
                  <TableCell className={customerBalances[customer.id!] ? 'text-red-600 font-medium' : 'text-green-600'}>
                    {formatCurrency(customerBalances[customer.id!] || 0)}
                  </TableCell>
                  <TableCell>
                    <Badge className={customer.is_active !== false ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                      {customer.is_active !== false ? 'active' : 'inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {customer.created_at ? new Date(customer.created_at).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditCustomer(customer)}
                      >
                        <Pencil className="h-4 w-4 text-blue-500" />
                      </Button>
                      {/* Delete button hidden - commented out
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCustomer(customer.id!, `${customer.first_name} ${customer.last_name}`)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                      */}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
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
            <div>
              <label className="text-sm font-medium mb-1 block">Tax ID (TIN)</label>
              <Input
                value={newCustomer.tax_id}
                onChange={(e) => setNewCustomer(prev => ({ ...prev, tax_id: e.target.value }))}
                placeholder="Enter tax identification number"
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

      {/* Edit Customer Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) resetEditForm();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">First Name *</label>
                <Input
                  value={editForm.first_name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, first_name: e.target.value }))}
                  placeholder="Enter first name"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Last Name *</label>
                <Input
                  value={editForm.last_name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, last_name: e.target.value }))}
                  placeholder="Enter last name"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Phone</label>
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Enter phone number"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Email</label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email address"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Address</label>
              <Input
                value={editForm.address}
                onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Enter address"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">District/Ward</label>
              <Input
                value={editForm.district_ward}
                onChange={(e) => setEditForm(prev => ({ ...prev, district_ward: e.target.value }))}
                placeholder="Enter district or ward"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Tax ID (TIN)</label>
              <Input
                value={editForm.tax_id}
                onChange={(e) => setEditForm(prev => ({ ...prev, tax_id: e.target.value }))}
                placeholder="Enter tax identification number"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditDialogOpen(false);
              resetEditForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Pencil className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </>
      )}
    </div>
  );
};
