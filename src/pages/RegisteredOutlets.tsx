import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Building, 
  MapPin, 
  Phone, 
  Mail, 
  Users, 
  Package, 
  Plus, 
  Search,
  Edit,
  Trash2,
  Loader2,
  X
} from "lucide-react";
import { format } from "date-fns";
import { getOutlets, createOutlet, updateOutlet, deleteOutlet, Outlet } from "@/services/databaseService";

export const RegisteredOutlets = () => {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredOutlets, setFilteredOutlets] = useState<Outlet[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);

  const [newOutlet, setNewOutlet] = useState<Omit<Outlet, 'id' | 'created_at' | 'updated_at'>>({
    name: "",
    location: "",
    phone: "",
    email: "",
    manager: "",
    employee_count: 0,
    product_count: 0,
    status: "active",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    country: "Tanzania",
    opening_date: ""
  });

  useEffect(() => {
    fetchOutlets();
  }, []);

  useEffect(() => {
    const filtered = outlets.filter(outlet => 
      outlet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      outlet.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (outlet.manager && outlet.manager.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredOutlets(filtered);
  }, [searchTerm, outlets]);

  const fetchOutlets = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getOutlets();
      setOutlets(data);
    } catch (err) {
      setError("Failed to fetch outlets. Please try again.");
      console.error("Error fetching outlets:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOutlet = async (id: string) => {
    try {
      const success = await deleteOutlet(id);
      if (success) {
        setOutlets(outlets.filter(outlet => outlet.id !== id));
      } else {
        setError("Failed to delete outlet. Please try again.");
      }
    } catch (err) {
      setError("Failed to delete outlet. Please try again.");
      console.error("Error deleting outlet:", err);
    }
  };

  const handleAddOutlet = async () => {
    try {
      // Handle empty date field
      const outletToCreate = {
        ...newOutlet,
        opening_date: newOutlet.opening_date || null
      };
      
      const createdOutlet = await createOutlet(outletToCreate);
      if (createdOutlet) {
        setOutlets([...outlets, createdOutlet]);
        setNewOutlet({
          name: "",
          location: "",
          phone: "",
          email: "",
          manager: "",
          employee_count: 0,
          product_count: 0,
          status: "active",
          address: "",
          city: "",
          state: "",
          zip_code: "",
          country: "Tanzania",
          opening_date: ""
        });
        setShowAddForm(false);
      } else {
        setError("Failed to create outlet. Please try again.");
      }
    } catch (err) {
      setError("Failed to create outlet. Please try again.");
      console.error("Error creating outlet:", err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-red-100 text-red-800";
      case "maintenance":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleViewOutlet = (outlet: Outlet) => {
    console.log("handleViewOutlet called with outlet:", outlet);
    // Navigate to outlet inventory page
    console.log("Setting window.location.hash to:", `#/outlet-inventory/${outlet.id}`);
    window.location.hash = `#/outlet-inventory/${outlet.id}`;
  };

  // Removed outlet details modal functionality

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-1">
              <h3 className="text-red-800 font-medium">Error</h3>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchOutlets}
              className="ml-4"
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Building className="h-8 w-8" />
          Registered Outlets
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage and monitor your registered business outlets across different locations
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Outlets</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{outlets.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Outlets</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {outlets.filter(o => o.status === "active").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {outlets.reduce((sum, outlet) => sum + (outlet.employee_count || 0), 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {outlets.reduce((sum, outlet) => sum + (outlet.product_count || 0), 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Outlet Management
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              View and manage all registered outlets
            </p>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search outlets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-full sm:w-64"
              />
            </div>
            <Button onClick={() => setShowAddForm(!showAddForm)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Outlet
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOutlets.map((outlet) => (
              <Card 
                key={outlet.id} 
                className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-l-blue-500"
                onClick={() => handleViewOutlet(outlet)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <Building className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{outlet.name}</CardTitle>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {outlet.location}
                        </p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(outlet.status)}>
                      {outlet.status.charAt(0).toUpperCase() + outlet.status.slice(1)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{outlet.phone || 'No phone'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{outlet.email || 'No email'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>Manager: {outlet.manager || 'Not assigned'}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                        <Users className="h-4 w-4 text-blue-600" />
                        <div>
                          <p className="text-xs text-muted-foreground">Employees</p>
                          <p className="font-semibold">{outlet.employee_count || 0}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                        <Package className="h-4 w-4 text-purple-600" />
                        <div>
                          <p className="text-xs text-muted-foreground">Products</p>
                          <p className="font-semibold">{outlet.product_count || 0}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteOutlet(outlet.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add Outlet Form */}
      {showAddForm && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Add New Outlet</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Outlet Name *</label>
                <Input
                  value={newOutlet.name}
                  onChange={(e) => setNewOutlet({...newOutlet, name: e.target.value})}
                  placeholder="Enter outlet name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Location *</label>
                <Input
                  value={newOutlet.location}
                  onChange={(e) => setNewOutlet({...newOutlet, location: e.target.value})}
                  placeholder="Enter location"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <Input
                  value={newOutlet.phone || ""}
                  onChange={(e) => setNewOutlet({...newOutlet, phone: e.target.value})}
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <Input
                  value={newOutlet.email || ""}
                  onChange={(e) => setNewOutlet({...newOutlet, email: e.target.value})}
                  placeholder="Enter email"
                  type="email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Manager</label>
                <Input
                  value={newOutlet.manager || ""}
                  onChange={(e) => setNewOutlet({...newOutlet, manager: e.target.value})}
                  placeholder="Enter manager name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={newOutlet.status}
                  onChange={(e) => setNewOutlet({...newOutlet, status: e.target.value as "active" | "inactive" | "maintenance"})}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Employee Count</label>
                <Input
                  value={newOutlet.employee_count || 0}
                  onChange={(e) => setNewOutlet({...newOutlet, employee_count: parseInt(e.target.value) || 0})}
                  placeholder="Enter employee count"
                  type="number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Product Count</label>
                <Input
                  value={newOutlet.product_count || 0}
                  onChange={(e) => setNewOutlet({...newOutlet, product_count: parseInt(e.target.value) || 0})}
                  placeholder="Enter product count"
                  type="number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Opening Date</label>
                <Input
                  value={newOutlet.opening_date || ""}
                  onChange={(e) => setNewOutlet({...newOutlet, opening_date: e.target.value})}
                  placeholder="YYYY-MM-DD"
                  type="date"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddOutlet}>
                Add Outlet
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};