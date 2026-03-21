import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Truck, 
  Search, 
  ArrowLeft, 
  Calendar,
  Package,
  User,
  MapPin
} from "lucide-react";

interface OutletDeliveriesProps {
  onBack: () => void;
  outletId?: string;
}

interface Delivery {
  id: string;
  deliveryNoteNumber: string;
  date: string;
  customer: string;
  driver: string;
  vehicle: string;
  items: number;
  totalValue: number;
  status: 'pending' | 'in-transit' | 'delivered' | 'cancelled';
  address: string;
}

// Mock data for outlet deliveries
const generateMockDeliveries = (outletId: string): Delivery[] => [
  {
    id: `del-${outletId}-1`,
    deliveryNoteNumber: "DN-2026-001",
    date: "2026-03-13",
    customer: "John Smith",
    driver: "Ahmed Hassan",
    vehicle: "T123 ABC",
    items: 15,
    totalValue: 1250000,
    status: 'delivered',
    address: "123 Main St, Dar es Salaam"
  },
  {
    id: `del-${outletId}-2`,
    deliveryNoteNumber: "DN-2026-002",
    date: "2026-03-12",
    customer: "Sarah Johnson",
    driver: "John Mwinyi",
    vehicle: "T456 DEF",
    items: 8,
    totalValue: 890000,
    status: 'in-transit',
    address: "456 Oak Ave, Dar es Salaam"
  },
  {
    id: `del-${outletId}-3`,
    deliveryNoteNumber: "DN-2026-003",
    date: "2026-03-11",
    customer: "Michael Brown",
    driver: "Peter Joseph",
    vehicle: "T789 GHI",
    items: 25,
    totalValue: 2340000,
    status: 'pending',
    address: "789 Pine Rd, Dar es Salaam"
  },
  {
    id: `del-${outletId}-4`,
    deliveryNoteNumber: "DN-2026-004",
    date: "2026-03-10",
    customer: "Emily Davis",
    driver: "Ahmed Hassan",
    vehicle: "T123 ABC",
    items: 5,
    totalValue: 567000,
    status: 'delivered',
    address: "321 Elm St, Dar es Salaam"
  },
  {
    id: `del-${outletId}-5`,
    deliveryNoteNumber: "DN-2026-005",
    date: "2026-03-09",
    customer: "David Wilson",
    driver: "John Mwinyi",
    vehicle: "T456 DEF",
    items: 18,
    totalValue: 1780000,
    status: 'cancelled',
    address: "654 Maple Dr, Dar es Salaam"
  }
];

export const OutletDeliveries = ({ onBack, outletId }: OutletDeliveriesProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  
  const deliveries = outletId ? generateMockDeliveries(outletId) : [];
  
  const filteredDeliveries = deliveries.filter(delivery =>
    delivery.deliveryNoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    delivery.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    delivery.driver.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'in-transit': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Outlet Deliveries</h1>
          <p className="text-muted-foreground">Manage deliveries for this outlet</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Deliveries</p>
                <p className="text-2xl font-bold">{deliveries.length}</p>
              </div>
              <Truck className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Delivered</p>
                <p className="text-2xl font-bold">{deliveries.filter(d => d.status === 'delivered').length}</p>
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
                <p className="text-sm text-muted-foreground">In Transit</p>
                <p className="text-2xl font-bold">{deliveries.filter(d => d.status === 'in-transit').length}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(deliveries.reduce((sum, d) => sum + d.totalValue, 0))}
                </p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
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
              placeholder="Search deliveries by note number, customer, or driver..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Deliveries List */}
      <div className="space-y-4">
        {filteredDeliveries.map((delivery) => (
          <Card key={delivery.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{delivery.deliveryNoteNumber}</h3>
                    <Badge className={getStatusColor(delivery.status)}>
                      {delivery.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {delivery.date}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4" />
                      {delivery.customer}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Truck className="h-4 w-4" />
                      {delivery.driver}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {delivery.vehicle}
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 inline mr-1" />
                    {delivery.address}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{formatCurrency(delivery.totalValue)}</p>
                  <p className="text-sm text-muted-foreground">{delivery.items} items</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredDeliveries.length === 0 && (
        <div className="text-center py-12">
          <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No deliveries found</h3>
          <p className="text-muted-foreground">Try adjusting your search terms</p>
        </div>
      )}
    </div>
  );
};
