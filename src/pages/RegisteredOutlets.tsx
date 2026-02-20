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
  Trash2
} from "lucide-react";
import { format } from "date-fns";

interface Outlet {
  id: string;
  name: string;
  location: string;
  phone: string;
  email: string;
  manager: string;
  employeeCount: number;
  productCount: number;
  status: "active" | "inactive" | "maintenance";
  createdAt: string;
}

export const RegisteredOutlets = () => {
  const [outlets, setOutlets] = useState<Outlet[]>([
    {
      id: "1",
      name: "Main Branch",
      location: "Dar es Salaam, Tanzania",
      phone: "+255 654 321 000",
      email: "main@company.tz",
      manager: "John Smith",
      employeeCount: 12,
      productCount: 245,
      status: "active",
      createdAt: "2023-01-15"
    },
    {
      id: "2",
      name: "Kigoma Outlet",
      location: "Kigoma, Tanzania",
      phone: "+255 654 321 001",
      email: "kigoma@company.tz",
      manager: "Sarah Johnson",
      employeeCount: 8,
      productCount: 180,
      status: "active",
      createdAt: "2023-03-22"
    },
    {
      id: "3",
      name: "Arusha Branch",
      location: "Arusha, Tanzania",
      phone: "+255 654 321 002",
      email: "arusha@company.tz",
      manager: "Michael Brown",
      employeeCount: 6,
      productCount: 150,
      status: "maintenance",
      createdAt: "2023-05-10"
    },
    {
      id: "4",
      name: "Mwanza Outlet",
      location: "Mwanza, Tanzania",
      phone: "+255 654 321 003",
      email: "mwanza@company.tz",
      manager: "Grace Williams",
      employeeCount: 10,
      productCount: 200,
      status: "active",
      createdAt: "2023-07-18"
    }
  ]);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredOutlets, setFilteredOutlets] = useState<Outlet[]>(outlets);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    const filtered = outlets.filter(outlet => 
      outlet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      outlet.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      outlet.manager.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredOutlets(filtered);
  }, [searchTerm, outlets]);

  const handleDeleteOutlet = (id: string) => {
    setOutlets(outlets.filter(outlet => outlet.id !== id));
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
              {outlets.reduce((sum, outlet) => sum + outlet.employeeCount, 0)}
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
              {outlets.reduce((sum, outlet) => sum + outlet.productCount, 0)}
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Name</th>
                  <th className="text-left py-3 px-4 font-medium">Location</th>
                  <th className="text-left py-3 px-4 font-medium">Manager</th>
                  <th className="text-left py-3 px-4 font-medium">Employees</th>
                  <th className="text-left py-3 px-4 font-medium">Products</th>
                  <th className="text-left py-3 px-4 font-medium">Status</th>
                  <th className="text-left py-3 px-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOutlets.map((outlet) => (
                  <tr key={outlet.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4">
                      <div className="font-medium">{outlet.name}</div>
                      <div className="text-sm text-muted-foreground">{outlet.phone}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="h-3 w-3" />
                        {outlet.location}
                      </div>
                      <div className="text-sm text-muted-foreground">{outlet.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium">{outlet.manager}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {outlet.employeeCount}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <Package className="h-4 w-4" />
                        {outlet.productCount}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={getStatusColor(outlet.status)}>
                        {outlet.status.charAt(0).toUpperCase() + outlet.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleDeleteOutlet(outlet.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};