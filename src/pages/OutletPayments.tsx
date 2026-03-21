import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  CreditCard, 
  Search, 
  ArrowLeft, 
  Calendar,
  User,
  DollarSign,
  CheckCircle,
  Clock
} from "lucide-react";

interface OutletPaymentsProps {
  onBack: () => void;
  outletId?: string;
}

interface Payment {
  id: string;
  transactionId: string;
  date: string;
  customer: string;
  amount: number;
  method: 'cash' | 'card' | 'mobile' | 'debt';
  status: 'completed' | 'pending' | 'failed';
  description: string;
}

// Mock data for outlet payments
const generateMockPayments = (outletId: string): Payment[] => [
  {
    id: `pay-${outletId}-1`,
    transactionId: "TXN-2026-001",
    date: "2026-03-13",
    customer: "John Smith",
    amount: 125000,
    method: 'cash',
    status: 'completed',
    description: "Payment for invoice #INV-001"
  },
  {
    id: `pay-${outletId}-2`,
    transactionId: "TXN-2026-002",
    date: "2026-03-12",
    customer: "Sarah Johnson",
    amount: 89000,
    method: 'card',
    status: 'completed',
    description: "Payment for invoice #INV-002"
  },
  {
    id: `pay-${outletId}-3`,
    transactionId: "TXN-2026-003",
    date: "2026-03-11",
    customer: "Michael Brown",
    amount: 234000,
    method: 'mobile',
    status: 'completed',
    description: "Payment for invoice #INV-003"
  },
  {
    id: `pay-${outletId}-4`,
    transactionId: "TXN-2026-004",
    date: "2026-03-10",
    customer: "Emily Davis",
    amount: 56700,
    method: 'debt',
    status: 'pending',
    description: "Debt payment - partial"
  },
  {
    id: `pay-${outletId}-5`,
    transactionId: "TXN-2026-005",
    date: "2026-03-09",
    customer: "David Wilson",
    amount: 178000,
    method: 'cash',
    status: 'completed',
    description: "Payment for invoice #INV-005"
  }
];

export const OutletPayments = ({ onBack, outletId }: OutletPaymentsProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  
  const payments = outletId ? generateMockPayments(outletId) : [];
  
  const filteredPayments = payments.filter(payment =>
    payment.transactionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.description.toLowerCase().includes(searchTerm.toLowerCase())
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
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'cash': return <DollarSign className="h-4 w-4" />;
      case 'card': return <CreditCard className="h-4 w-4" />;
      case 'mobile': return <DollarSign className="h-4 w-4" />;
      case 'debt': return <Clock className="h-4 w-4" />;
      default: return <DollarSign className="h-4 w-4" />;
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
          <h1 className="text-2xl font-bold">Outlet Payments</h1>
          <p className="text-muted-foreground">Manage payments for this outlet</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Payments</p>
                <p className="text-2xl font-bold">{payments.length}</p>
              </div>
              <CreditCard className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{payments.filter(p => p.status === 'completed').length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{payments.filter(p => p.status === 'pending').length}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(payments.reduce((sum, p) => sum + p.amount, 0))}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-500" />
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
              placeholder="Search payments by transaction ID, customer, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Payments List */}
      <div className="space-y-4">
        {filteredPayments.map((payment) => (
          <Card key={payment.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{payment.transactionId}</h3>
                    <Badge className={getStatusColor(payment.status)}>
                      {payment.status}
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1">
                      {getMethodIcon(payment.method)}
                      {payment.method}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {payment.date}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4" />
                      {payment.customer}
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {payment.description}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{formatCurrency(payment.amount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPayments.length === 0 && (
        <div className="text-center py-12">
          <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No payments found</h3>
          <p className="text-muted-foreground">Try adjusting your search terms</p>
        </div>
      )}
    </div>
  );
};
