import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Search, 
  ArrowLeft, 
  Phone, 
  Mail, 
  MapPin,
  ShoppingBag,
  Star
} from "lucide-react";

interface OutletCustomersProps {
  onBack: () => void;
  outletId?: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  totalPurchases: number;
  loyaltyPoints: number;
  lastVisit: string;
  status: 'active' | 'inactive';
}

// Mock data for outlet customers
const generateMockCustomers = (outletId: string): Customer[] => [
  {
    id: `cust-${outletId}-1`,
    name: "John Smith",
    phone: "+255 712 345 678",
    email: "john.smith@email.com",
    address: "123 Main St, Dar es Salaam",
    totalPurchases: 1250000,
    loyaltyPoints: 1250,
    lastVisit: "2026-03-10",
    status: 'active'
  },
  {
    id: `cust-${outletId}-2`,
    name: "Sarah Johnson",
    phone: "+255 723 456 789",
    email: "sarah.j@email.com",
    address: "456 Oak Ave, Dar es Salaam",
    totalPurchases: 890000,
    loyaltyPoints: 890,
    lastVisit: "2026-03-12",
    status: 'active'
  },
  {
    id: `cust-${outletId}-3`,
    name: "Michael Brown",
    phone: "+255 734 567 890",
    email: "mbrown@email.com",
    address: "789 Pine Rd, Dar es Salaam",
    totalPurchases: 2340000,
    loyaltyPoints: 2340,
    lastVisit: "2026-03-08",
    status: 'active'
  },
  {
    id: `cust-${outletId}-4`,
    name: "Emily Davis",
    phone: "+255 745 678 901",
    email: "emily.davis@email.com",
    address: "321 Elm St, Dar es Salaam",
    totalPurchases: 567000,
    loyaltyPoints: 567,
    lastVisit: "2026-02-28",
    status: 'inactive'
  },
  {
    id: `cust-${outletId}-5`,
    name: "David Wilson",
    phone: "+255 756 789 012",
    email: "dwilson@email.com",
    address: "654 Maple Dr, Dar es Salaam",
    totalPurchases: 1780000,
    loyaltyPoints: 1780,
    lastVisit: "2026-03-13",
    status: 'active'
  }
];

export const OutletCustomers = ({ onBack, outletId }: OutletCustomersProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  
  const customers = outletId ? generateMockCustomers(outletId) : [];
  
  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Outlet Customers</h1>
          <p className="text-muted-foreground">Manage customers for this outlet</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Customers</p>
                <p className="text-2xl font-bold">{customers.length}</p>
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
                <p className="text-2xl font-bold">{customers.filter(c => c.status === 'active').length}</p>
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
                <p className="text-sm text-muted-foreground">Total Sales</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(customers.reduce((sum, c) => sum + c.totalPurchases, 0))}
                </p>
              </div>
              <ShoppingBag className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Loyalty Points</p>
                <p className="text-2xl font-bold">
                  {customers.reduce((sum, c) => sum + c.loyaltyPoints, 0).toLocaleString()}
                </p>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map((customer) => (
          <Card key={customer.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{customer.name}</CardTitle>
                  <Badge className={customer.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                    {customer.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  {customer.phone}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {customer.email}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {customer.address}
                </div>
                <div className="pt-2 border-t mt-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Purchases:</span>
                    <span className="font-semibold">{formatCurrency(customer.totalPurchases)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Loyalty Points:</span>
                    <span className="font-semibold">{customer.loyaltyPoints.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Visit:</span>
                    <span className="font-semibold">{customer.lastVisit}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No customers found</h3>
          <p className="text-muted-foreground">Try adjusting your search terms</p>
        </div>
      )}
    </div>
  );
};
