import { useState, useEffect } from "react";
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
  MapPin,
  Eye
} from "lucide-react";
import { getDeliveriesByOutletId, DeliveryData } from "@/utils/deliveryUtils";
import { useToast } from "@/hooks/use-toast";

interface OutletDeliveriesProps {
  onBack: () => void;
  outletId?: string;
}

export const OutletDeliveries = ({ onBack, outletId }: OutletDeliveriesProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: ''
  });
  const [deliveries, setDeliveries] = useState<DeliveryData[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadDeliveries();
  }, [outletId]);

  const loadDeliveries = async () => {
    if (!outletId) {
      setDeliveries([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await getDeliveriesByOutletId(outletId);
      setDeliveries(data);
    } catch (error) {
      console.error("Error loading deliveries:", error);
      toast({
        title: "Error",
        description: "Failed to load deliveries. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const filteredDeliveries = deliveries.filter(delivery => {
    // Search filter
    const matchesSearch = 
      delivery.deliveryNoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (delivery.driver && delivery.driver.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Status filter
    const matchesStatus = !statusFilter || delivery.status === statusFilter;
    
    // Date range filter
    let matchesDateRange = true;
    if (dateRange.start || dateRange.end) {
      const deliveryDate = new Date(delivery.date);
      if (dateRange.start) {
        const startDate = new Date(dateRange.start);
        startDate.setHours(0, 0, 0, 0);
        matchesDateRange = matchesDateRange && deliveryDate >= startDate;
      }
      if (dateRange.end) {
        const endDate = new Date(dateRange.end);
        endDate.setHours(23, 59, 59, 999);
        matchesDateRange = matchesDateRange && deliveryDate <= endDate;
      }
    }
    
    return matchesSearch && matchesStatus && matchesDateRange;
  });

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

  const handleViewDelivery = (delivery: DeliveryData) => {
    // Open delivery details in a new window/tab
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const itemsList = delivery.itemsList || [];
      const itemsHtml = itemsList.map((item: any) => `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${item.description || item.name || 'N/A'}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.quantity || item.delivered || 0}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatCurrency(item.rate || item.price || 0)}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatCurrency((item.quantity || item.delivered || 0) * (item.rate || item.price || 0))}</td>
        </tr>
      `).join('');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Delivery Note - ${delivery.deliveryNoteNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { margin: 0; color: #333; }
            .header p { margin: 5px 0; color: #666; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .info-box { background: #f5f5f5; padding: 15px; border-radius: 5px; }
            .info-box h3 { margin-top: 0; color: #555; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #f0f0f0; padding: 10px; text-align: left; border: 1px solid #ddd; }
            .total-row { font-weight: bold; background: #f9f9f9; }
            .status-badge { 
              display: inline-block; 
              padding: 5px 15px; 
              border-radius: 15px; 
              font-size: 14px; 
              font-weight: bold;
              text-transform: uppercase;
            }
            .status-delivered { background: #d4edda; color: #155724; }
            .status-in-transit { background: #cce5ff; color: #004085; }
            .status-pending { background: #fff3cd; color: #856404; }
            .status-cancelled { background: #f8d7da; color: #721c24; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>DELIVERY NOTE</h1>
            <p><strong>${delivery.deliveryNoteNumber}</strong></p>
            <span class="status-badge status-${delivery.status}">${delivery.status}</span>
          </div>
          
          <div class="info-grid">
            <div class="info-box">
              <h3>Delivery Information</h3>
              <p><strong>Date:</strong> ${delivery.date}</p>
              <p><strong>Customer:</strong> ${delivery.customer}</p>
              <p><strong>Driver:</strong> ${delivery.driver || 'N/A'}</p>
              <p><strong>Vehicle:</strong> ${delivery.vehicle || 'N/A'}</p>
            </div>
            <div class="info-box">
              <h3>Summary</h3>
              <p><strong>Total Items:</strong> ${delivery.items}</p>
              <p><strong>Total Value:</strong> ${formatCurrency(delivery.total)}</p>
              ${delivery.paymentMethod ? `<p><strong>Payment Method:</strong> ${delivery.paymentMethod}</p>` : ''}
            </div>
          </div>
          
          <h3>Items Delivered</h3>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align: center;">Quantity</th>
                <th style="text-align: right;">Rate</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
              <tr class="total-row">
                <td colspan="3" style="text-align: right; padding: 10px;"><strong>Total:</strong></td>
                <td style="text-align: right; padding: 10px;"><strong>${formatCurrency(delivery.total)}</strong></td>
              </tr>
            </tbody>
          </table>
          
          ${delivery.deliveryNotes ? `
            <div style="margin-top: 30px; padding: 15px; background: #f9f9f9; border-radius: 5px;">
              <h3>Delivery Notes</h3>
              <p>${delivery.deliveryNotes}</p>
            </div>
          ` : ''}
        </body>
        </html>
      `);
      printWindow.document.close();
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
                <p className="text-2xl font-bold">{filteredDeliveries.length}</p>
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
                <p className="text-2xl font-bold">{filteredDeliveries.filter(d => d.status === 'delivered').length}</p>
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
                <p className="text-2xl font-bold">{filteredDeliveries.filter(d => d.status === 'in-transit').length}</p>
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
                  {formatCurrency(filteredDeliveries.reduce((sum, d) => sum + d.total, 0))}
                </p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Date Range */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search deliveries by note number, customer, or driver..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm w-full md:w-auto"
            >
              <option value="">All Status</option>
              <option value="delivered">Delivered</option>
              <option value="in-transit">In Transit</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>
            
            {/* Date Range Picker */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="px-2 py-1.5 border rounded-md text-sm"
                placeholder="Start Date"
              />
              <span className="text-muted-foreground">to</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="px-2 py-1.5 border rounded-md text-sm"
                placeholder="End Date"
              />
              {(dateRange.start || dateRange.end) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDateRange({ start: '', end: '' })}
                  className="h-7 px-2"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deliveries List */}
      {loading ? (
        <div className="text-center py-12">
          <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4 animate-pulse" />
          <h3 className="text-lg font-medium">Loading deliveries...</h3>
        </div>
      ) : (
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
                        {delivery.driver || 'N/A'}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {delivery.vehicle || 'N/A'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{formatCurrency(delivery.total)}</p>
                    <p className="text-sm text-muted-foreground">{delivery.items} items</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2"
                      onClick={() => handleViewDelivery(delivery)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && filteredDeliveries.length === 0 && (
        <div className="text-center py-12">
          <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No deliveries found</h3>
          <p className="text-muted-foreground">
            {searchTerm ? 'Try adjusting your search terms' : 'No deliveries for this outlet yet'}
          </p>
        </div>
      )}
    </div>
  );
};
