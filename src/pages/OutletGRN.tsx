import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Search, 
  ArrowLeft, 
  Calendar,
  Package,
  User,
  Truck,
  Building
} from "lucide-react";

interface OutletGRNProps {
  onBack: () => void;
  outletId?: string;
}

interface GRN {
  id: string;
  grnNumber: string;
  date: string;
  supplier: string;
  items: number;
  totalValue: number;
  status: 'pending' | 'received' | 'verified' | 'cancelled';
  receivedBy: string;
  notes: string;
}

// Mock data for outlet GRN
const generateMockGRN = (outletId: string): GRN[] => [
  {
    id: `grn-${outletId}-1`,
    grnNumber: "GRN-2026-001",
    date: "2026-03-13",
    supplier: "ABC Suppliers Ltd",
    items: 25,
    totalValue: 2500000,
    status: 'received',
    receivedBy: "John Manager",
    notes: "All items received in good condition"
  },
  {
    id: `grn-${outletId}-2`,
    grnNumber: "GRN-2026-002",
    date: "2026-03-12",
    supplier: "XYZ Distributors",
    items: 15,
    totalValue: 1800000,
    status: 'verified',
    receivedBy: "Sarah Supervisor",
    notes: "Quality check passed"
  },
  {
    id: `grn-${outletId}-3`,
    grnNumber: "GRN-2026-003",
    date: "2026-03-11",
    supplier: "Global Imports Co",
    items: 40,
    totalValue: 4500000,
    status: 'pending',
    receivedBy: "Pending",
    notes: "Awaiting delivery"
  },
  {
    id: `grn-${outletId}-4`,
    grnNumber: "GRN-2026-004",
    date: "2026-03-10",
    supplier: "Local Traders Inc",
    items: 10,
    totalValue: 950000,
    status: 'cancelled',
    receivedBy: "N/A",
    notes: "Order cancelled by supplier"
  },
  {
    id: `grn-${outletId}-5`,
    grnNumber: "GRN-2026-005",
    date: "2026-03-09",
    supplier: "ABC Suppliers Ltd",
    items: 30,
    totalValue: 3200000,
    status: 'verified',
    receivedBy: "John Manager",
    notes: "Fast delivery, excellent quality"
  }
];

export const OutletGRN = ({ onBack, outletId }: OutletGRNProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  
  const grns = outletId ? generateMockGRN(outletId) : [];
  
  const filteredGRN = grns.filter(grn =>
    grn.grnNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    grn.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
    grn.receivedBy.toLowerCase().includes(searchTerm.toLowerCase())
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
      case 'verified': return 'bg-green-100 text-green-800';
      case 'received': return 'bg-blue-100 text-blue-800';
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
          <h1 className="text-2xl font-bold">Outlet GRN</h1>
          <p className="text-muted-foreground">Manage Goods Received Notes for this outlet</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total GRN</p>
                <p className="text-2xl font-bold">{grns.length}</p>
              </div>
              <FileText className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Verified</p>
                <p className="text-2xl font-bold">{grns.filter(g => g.status === 'verified').length}</p>
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
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{grns.filter(g => g.status === 'pending').length}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-yellow-500" />
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
                  {formatCurrency(grns.reduce((sum, g) => sum + g.totalValue, 0))}
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
              placeholder="Search GRN by number, supplier, or received by..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* GRN List */}
      <div className="space-y-4">
        {filteredGRN.map((grn) => (
          <Card key={grn.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{grn.grnNumber}</h3>
                    <Badge className={getStatusColor(grn.status)}>
                      {grn.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {grn.date}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building className="h-4 w-4" />
                      {grn.supplier}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4" />
                      {grn.receivedBy}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Package className="h-4 w-4" />
                      {grn.items} items
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    <Truck className="h-4 w-4 inline mr-1" />
                    {grn.notes}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{formatCurrency(grn.totalValue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredGRN.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No GRN found</h3>
          <p className="text-muted-foreground">Try adjusting your search terms</p>
        </div>
      )}
    </div>
  );
};
