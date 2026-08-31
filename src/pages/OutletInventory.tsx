import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { 
  Building, 
  Package, 
  Search,
  ArrowLeft,
  Plus,
  Minus,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Boxes,
  DollarSign,
  RefreshCw,
  Filter,
  Grid3X3,
  List,
  ExternalLink,
  Truck,
  Pencil,
  MoreVertical,
  Printer,
  Share2,
  Download,
  FileOutput,
  Calendar as CalendarIcon,
  Info,
  Trash2,
  X
} from "lucide-react";
import { format as formatDate } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { getOutlets, Outlet, getInventoryTotalsByOutlet, InventoryTotals, getInventoryProductsByOutlet, InventoryProduct, getAvailableInventoryByOutlet, deleteInventoryProduct } from "@/services/databaseService";
import { getDeliveriesByOutletId, DeliveryData } from "@/utils/deliveryUtils";
import { getStockMovements, StockMovementWithDetails } from "@/utils/stockMovementUtils";
import { supabase } from "@/lib/supabaseClient";
import { syncSellingPricesToDatabase } from "@/utils/syncSellingPrices";

interface OutletInventoryProps {
  onBack: () => void;
  outletId?: string;
}

interface InventoryItem {
  id: string;
  dbId?: string; // Actual database UUID from inventory_products
  name: string;
  sku: string;
  category: string;
  quantity: number; // Available stock (for backward compatibility)
  totalReceived: number; // Total received from deliveries
  soldQuantity: number; // Total sold
  minStock: number;
  maxStock: number;
  unitPrice: number;
  sellingPrice: number;
  totalValue: number;
  totalPrice: number;
  status: 'in-stock' | 'low-stock' | 'out-of-stock';
  lastUpdated: string;
  deliveryNoteNumber?: string;
}

interface InventoryStats {
  totalProducts: number;
  totalValue: number;
  totalRetailValue: number;
  potentialEarnings: number;
  lowStockItems: number;
  outOfStockItems: number;
  categories: number;
  avgTurnover: number;
  totalDeliveries: number;
}

export const OutletInventory = ({ onBack, outletId: propOutletId }: OutletInventoryProps) => {
  const [outlet, setOutlet] = useState<Outlet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: ''
  });
  const [datePreset, setDatePreset] = useState<string>('all');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [deliveries, setDeliveries] = useState<DeliveryData[]>([]);
  const [soldMovements, setSoldMovements] = useState<StockMovementWithDetails[]>([]);
  
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isActionsDialogOpen, setIsActionsDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    quantity: 0,
    unitCost: 0,
    sellingPrice: 0
  });

  const [stats, setStats] = useState<InventoryStats>({
    totalProducts: 0,
    totalValue: 0,
    totalRetailValue: 0,
    potentialEarnings: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    categories: 0,
    avgTurnover: 0,
    totalDeliveries: 0
  });



  useEffect(() => {
    fetchOutletAndInventory();
  }, [propOutletId]);

  // When a date range is selected, ALL products stay visible but their figures
  // (Received, Sold, Available, Stock Level) reflect the selected period:
  // - Received: quantities delivered to the outlet within the range (delivery notes)
  // - Sold: quantities sold within the range (stock_movements SOLD ledger)
  // - Available: stock position as of the range end date, derived from the current
  //   snapshot by reversing stock changes that happened after the range
  const datedInventory = useMemo<InventoryItem[]>(() => {
    if (!dateRange.start && !dateRange.end) return inventory;

    const startDate = dateRange.start ? new Date(dateRange.start) : null;
    if (startDate) startDate.setHours(0, 0, 0, 0);
    const endDate = dateRange.end ? new Date(dateRange.end) : null;
    if (endDate) endDate.setHours(23, 59, 59, 999);

    const inRange = (d: Date) => (!startDate || d >= startDate) && (!endDate || d <= endDate);
    const afterRange = (d: Date) => !!endDate && d > endDate;

    // Received quantities from delivery notes
    const receivedInRange = new Map<string, number>();
    const receivedAfterRange = new Map<string, number>();
    for (const delivery of deliveries) {
      if (!delivery.itemsList || !delivery.date) continue;
      const deliveryDate = new Date(delivery.date);
      if (isNaN(deliveryDate.getTime())) continue;
      const isInRange = inRange(deliveryDate);
      const isAfter = afterRange(deliveryDate);
      if (!isInRange && !isAfter) continue;
      for (const item of delivery.itemsList) {
        const name = (item?.name || item?.description || item?.productName || '').toString().toLowerCase().trim();
        const qty = Number(item?.quantity ?? item?.delivered ?? 0);
        if (!name || qty <= 0) continue;
        if (isInRange) receivedInRange.set(name, (receivedInRange.get(name) || 0) + qty);
        if (isAfter) receivedAfterRange.set(name, (receivedAfterRange.get(name) || 0) + qty);
      }
    }

    // Sold quantities from the stock movements ledger (SOLD via POS)
    const soldInRange = new Map<string, number>();
    const soldAfterRange = new Map<string, number>();
    for (const movement of soldMovements) {
      if (!movement.created_at) continue;
      const soldDate = new Date(movement.created_at);
      if (isNaN(soldDate.getTime())) continue;
      const name = movement.product_name.toLowerCase().trim();
      const qty = Number(movement.quantity) || 0;
      if (qty <= 0) continue;
      if (inRange(soldDate)) soldInRange.set(name, (soldInRange.get(name) || 0) + qty);
      if (afterRange(soldDate)) soldAfterRange.set(name, (soldAfterRange.get(name) || 0) + qty);
    }

    return inventory.map(item => {
      const key = item.name.toLowerCase().trim();
      const received = receivedInRange.get(key) || 0;
      const sold = soldInRange.get(key) || 0;
      const recvAfter = receivedAfterRange.get(key) || 0;
      const soldAfter = soldAfterRange.get(key) || 0;

      // Stock position as of the range end date:
      // current available - what arrived after the range + what was sold after the range
      const availableAtDate = Math.max(0, item.quantity - recvAfter + soldAfter);
      const status = (availableAtDate > item.minStock ? 'in-stock' :
                      availableAtDate > 0 ? 'low-stock' : 'out-of-stock') as 'in-stock' | 'low-stock' | 'out-of-stock';

      return {
        ...item,
        quantity: availableAtDate,
        totalReceived: received,
        soldQuantity: sold,
        totalValue: availableAtDate * item.unitPrice,
        totalPrice: availableAtDate * item.sellingPrice,
        status
      };
    });
  }, [inventory, deliveries, soldMovements, dateRange]);

  useEffect(() => {
    calculateStats();
  }, [datedInventory, deliveries, dateRange]);

  // Quick range presets (standard professional date range picker pattern)
  const handleDatePreset = (preset: string) => {
    setDatePreset(preset);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    switch (preset) {
      case 'today':
        setDateRange({ start: todayStr, end: todayStr });
        break;
      case 'yesterday': {
        const y = new Date(today);
        y.setDate(y.getDate() - 1);
        const yStr = y.toISOString().split('T')[0];
        setDateRange({ start: yStr, end: yStr });
        break;
      }
      case 'last7': {
        const d = new Date(today);
        d.setDate(d.getDate() - 7);
        setDateRange({ start: d.toISOString().split('T')[0], end: todayStr });
        break;
      }
      case 'last30': {
        const d = new Date(today);
        d.setDate(d.getDate() - 30);
        setDateRange({ start: d.toISOString().split('T')[0], end: todayStr });
        break;
      }
      case 'thisMonth': {
        const first = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        setDateRange({ start: first, end: todayStr });
        break;
      }
      case 'lastMonth': {
        const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const last = new Date(today.getFullYear(), today.getMonth(), 0);
        setDateRange({ start: first.toISOString().split('T')[0], end: last.toISOString().split('T')[0] });
        break;
      }
      case 'thisYear': {
        const first = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
        setDateRange({ start: first, end: todayStr });
        break;
      }
      case 'all':
      default:
        setDateRange({ start: '', end: '' });
        break;
    }
  };

  const fetchOutletAndInventory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!propOutletId) {
        setError("No outlet ID provided");
        return;
      }
      
      // Fetch outlet details
      const allOutlets = await getOutlets();
      const foundOutlet = allOutlets.find(o => o.id === propOutletId);
      
      if (foundOutlet) {
        setOutlet(foundOutlet);
      } else {
        setError("Outlet not found");
        return;
      }
      
      // Fetch deliveries for this outlet
      const outletDeliveries = await getDeliveriesByOutletId(propOutletId);
      setDeliveries(outletDeliveries);

      // Fetch sold quantities history for this outlet from the stock movements ledger
      const outletSoldMovements = await getStockMovements({ outletId: propOutletId, movementType: 'SOLD', limit: 5000 });
      setSoldMovements(outletSoldMovements);
      
      // Fetch inventory from database with sold quantities (everything from database)
      const dbInventory = await getAvailableInventoryByOutlet(propOutletId);
      
      // Convert database inventory to InventoryItem format (all values from DB)
      const inventoryItems: InventoryItem[] = dbInventory.map(item => {
        const totalReceived = item.quantity || 0;
        const soldQty = item.sold_quantity || 0;
        const availableQty = item.available_quantity || Math.max(0, totalReceived - soldQty);
        
        return {
          id: `${item.outlet_id}-${item.name}`,
          dbId: item.id, // Store actual database UUID
          name: item.name,
          sku: item.sku || `SKU-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
          category: item.category || 'General',
          quantity: availableQty, // Available stock (for backward compatibility)
          totalReceived: totalReceived, // Total received from deliveries
          soldQuantity: soldQty, // Total sold
          minStock: item.min_stock || Math.floor(totalReceived * 0.2),
          maxStock: item.max_stock || Math.floor(totalReceived * 1.5),
          unitPrice: item.unit_cost,
          sellingPrice: item.selling_price,
          totalValue: availableQty * item.unit_cost,
          totalPrice: availableQty * item.selling_price,
          status: (availableQty > (item.min_stock || 0) ? 'in-stock' : 
                   availableQty > 0 ? 'low-stock' : 'out-of-stock') as 'in-stock' | 'low-stock' | 'out-of-stock',
          lastUpdated: item.last_updated || new Date().toISOString(),
          deliveryNoteNumber: item.delivery_note_number
        };
      });
      
      setInventory(inventoryItems);
    } catch (err) {
      setError("Failed to fetch outlet inventory. Please try again.");
      console.error("Error fetching outlet inventory:", err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = async () => {
    // Use date-aware inventory (figures as of the selected range, all products included)
    const dateFilteredInventory = datedInventory;
    const hasRange = !!(dateRange.start || dateRange.end);
    
    // Calculate stats from filtered inventory
    const lowStock = dateFilteredInventory.filter(item => item.status === 'low-stock').length;
    const outOfStock = dateFilteredInventory.filter(item => item.status === 'out-of-stock').length;
    const categories = new Set(dateFilteredInventory.map(item => item.category)).size;
    
    // Calculate totals from filtered inventory
    const totalInventoryValue = dateFilteredInventory.reduce((sum, item) => sum + item.totalValue, 0);
    const totalRetailValue = dateFilteredInventory.reduce((sum, item) => sum + item.totalPrice, 0);

    // Cost of goods sold: with a date range use REAL sold quantities within the range;
    // otherwise fall back to the original estimate (original vs current stock)
    const totalCostOfGoodsSold = hasRange
      ? dateFilteredInventory.reduce((sum, item) => {
          const soldQty = item.soldQuantity || 0;
          return sum + (soldQty > 0 ? soldQty * item.unitPrice : 0);
        }, 0)
      : dateFilteredInventory.reduce((sum, item) => {
          const soldQty = item.maxStock - item.quantity; // Estimate sold from original vs current
          return sum + (soldQty > 0 ? soldQty * item.unitPrice : 0);
        }, 0);
    
    // Calculate avg turnover
    const avgTurnover = totalInventoryValue > 0 ? totalCostOfGoodsSold / totalInventoryValue : 0;

    // Deliveries count: within the selected range when one is active
    let deliveriesCount = deliveries.length;
    if (hasRange) {
      const startDate = dateRange.start ? new Date(dateRange.start) : null;
      if (startDate) startDate.setHours(0, 0, 0, 0);
      const endDate = dateRange.end ? new Date(dateRange.end) : null;
      if (endDate) endDate.setHours(23, 59, 59, 999);
      deliveriesCount = deliveries.filter(d => {
        if (!d.date) return false;
        const dt = new Date(d.date);
        if (isNaN(dt.getTime())) return false;
        return (!startDate || dt >= startDate) && (!endDate || dt <= endDate);
      }).length;
    }
    
    setStats({
      totalProducts: dateFilteredInventory.length,
      totalValue: totalInventoryValue,
      totalRetailValue: totalRetailValue,
      potentialEarnings: totalRetailValue - totalInventoryValue,
      lowStockItems: lowStock,
      outOfStockItems: outOfStock,
      categories,
      avgTurnover,
      totalDeliveries: deliveriesCount
    });
  };

  // Helper function to fetch inventory from database for Actions (uses latest edited values)
  const fetchInventoryFromDatabase = async (): Promise<InventoryItem[]> => {
    if (!propOutletId) return [];
    
    try {
      // Use getAvailableInventoryByOutlet which already accounts for sold quantities
      const dbProducts = await getAvailableInventoryByOutlet(propOutletId);
      
      return dbProducts.map((product: InventoryProduct) => {
        const totalReceived = product.quantity || 0;
        const soldQty = product.sold_quantity || 0;
        const availableQuantity = product.available_quantity || Math.max(0, totalReceived - soldQty);
        const newStatus = availableQuantity > (product.min_stock || 0) 
          ? 'in-stock' 
          : availableQuantity > 0 
            ? 'low-stock' 
            : 'out-of-stock';
        
        return {
          id: product.id || '',
          name: product.name,
          sku: product.sku || '',
          category: product.category || 'General',
          quantity: availableQuantity, // Available stock
          totalReceived: totalReceived, // Total received
          soldQuantity: soldQty, // Total sold
          minStock: product.min_stock || 0,
          maxStock: product.max_stock || 0,
          unitPrice: product.unit_cost,
          sellingPrice: product.selling_price,
          totalValue: availableQuantity * product.unit_cost,
          totalPrice: availableQuantity * product.selling_price,
          status: newStatus,
          lastUpdated: product.last_updated || '',
          deliveryNoteNumber: product.delivery_note_number
        };
      });
    } catch (error) {
      console.error('Error fetching inventory from database:', error);
      return [];
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in-stock': return 'bg-green-100 text-green-800 border-green-200';
      case 'low-stock': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'out-of-stock': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStockProgress = (quantity: number, maxStock: number) => {
    return Math.min((quantity / maxStock) * 100, 100);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const filteredInventory = datedInventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Ensure we have inventory data before filtering
  const displayInventory = datedInventory.length > 0 ? filteredInventory : [];

  // Helper function to highlight search terms in text
  const highlightText = (text: string, searchTerm: string): JSX.Element => {
    if (!searchTerm || !text) return <span>{text}</span>;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = text.split(regex);
    
    return (
      <span>
        {parts.map((part, i) => {
          const isMatch = regex.test(part);
          if (isMatch) {
            return <span key={i} className="bg-yellow-200 text-yellow-800 px-1 rounded">{part}</span>;
          }
          return <span key={i}>{part}</span>;
        })}
      </span>
    );
  };

  const categories = ['all', ...new Set(inventory.map(item => item.category))];

  const handleEditClick = (item: InventoryItem) => {
    setEditingItem(item);
    setEditForm({
      quantity: item.quantity,
      unitCost: item.unitPrice,
      sellingPrice: item.sellingPrice
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = async (item: InventoryItem) => {
    if (!window.confirm(`Are you sure you want to remove "${item.name}" from this outlet's inventory? This action cannot be undone.`)) {
      return;
    }

    try {
      // Use database UUID (dbId) if available
      const idToDelete = item.dbId || item.id;
      const success = await deleteInventoryProduct(idToDelete);
      
      if (success) {
        // Remove from local state
        setInventory(prev => prev.filter(i => i.id !== item.id));
        alert(`Successfully removed "${item.name}" from inventory.`);
      } else {
        alert(`Failed to remove "${item.name}" from inventory. Please try again.`);
      }
    } catch (error) {
      console.error('Error deleting inventory product:', error);
      alert(`Failed to remove "${item.name}" from inventory. Please try again.`);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingItem || !propOutletId) return;
    
    // Update local state - recalculate totalPrice when sellingPrice changes
    setInventory(prev => prev.map(item => {
      if (item.id === editingItem.id) {
        return {
          ...item,
          sellingPrice: editForm.sellingPrice,
          totalPrice: item.quantity * editForm.sellingPrice
        };
      }
      return item;
    }));
    
    // Save to database - update inventory_products table
    try {
      // Use database UUID (dbId) if available, otherwise fall back to name matching
      const updateData: any = { 
        selling_price: editForm.sellingPrice,
        unit_cost: editForm.unitCost,
        updated_at: new Date().toISOString()
      };
      
      let query = supabase.from('inventory_products').update(updateData);
      
      if (editingItem.dbId) {
        // Use actual database UUID for precise matching
        query = query.eq('id', editingItem.dbId);
      } else {
        // Fallback: match by outlet_id and name
        query = query.eq('outlet_id', propOutletId).eq('name', editingItem.name);
      }
      
      const { error } = await query;
      
      if (error) {
        console.error('Error updating inventory product in database:', error);
        throw error;
      } else {
        console.log('Inventory product updated in database successfully');
      }
    } catch (err) {
      console.error('Failed to sync to database:', err);
    }
    
    setIsEditDialogOpen(false);
    setEditingItem(null);
  };

  const handleCloseEdit = () => {
    setIsEditDialogOpen(false);
    setEditingItem(null);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="flex justify-center items-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
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
            <Button variant="outline" size="sm" onClick={fetchOutletAndInventory} className="ml-4">
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!outlet) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Outlet not found</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onBack}
          className="flex items-center gap-2 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Outlets
        </Button>

        <Card className="bg-gradient-to-r from-purple-600 to-purple-800 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 rounded-lg">
                  <Building className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">{outlet.name}</h1>
                  <p className="text-purple-100 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Inventory Management
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="bg-white text-purple-700 hover:bg-purple-50">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
                <Button variant="outline" className="border-white text-white hover:bg-white/20" onClick={() => {
                  if (outlet?.id) {
                    window.location.hash = `#/outlet/${outlet.id}`;
                  }
                }}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Full Dashboard
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Products</p>
                <p className="text-lg font-bold">{stats.totalProducts}</p>
              </div>
              <div className="p-1.5 bg-blue-100 rounded-full">
                <Boxes className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Inventory Value</p>
                <p className="text-lg font-bold">{formatCurrency(stats.totalValue)}</p>
              </div>
              <div className="p-1.5 bg-green-100 rounded-full">
                <DollarSign className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Retail Value</p>
                <p className="text-lg font-bold text-emerald-600">{formatCurrency(stats.totalRetailValue)}</p>
              </div>
              <div className="p-1.5 bg-emerald-100 rounded-full">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-cyan-500">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Potential Earnings</p>
                <p className="text-lg font-bold text-cyan-600">{formatCurrency(stats.potentialEarnings)}</p>
              </div>
              <div className="p-1.5 bg-cyan-100 rounded-full">
                <TrendingUp className="h-4 w-4 text-cyan-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Low Stock</p>
                <p className="text-lg font-bold text-yellow-600">{stats.lowStockItems}</p>
              </div>
              <div className="p-1.5 bg-yellow-100 rounded-full">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Out of Stock</p>
                <p className="text-lg font-bold text-red-600">{stats.outOfStockItems}</p>
              </div>
              <div className="p-1.5 bg-red-100 rounded-full">
                <Package className="h-4 w-4 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Categories</p>
                <p className="text-lg font-bold">{stats.categories}</p>
              </div>
              <div className="p-1.5 bg-purple-100 rounded-full">
                <Grid3X3 className="h-4 w-4 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Avg Turnover</p>
                <p className="text-lg font-bold">{stats.avgTurnover.toFixed(2)}x</p>
              </div>
              <div className="p-1.5 bg-orange-100 rounded-full">
                <TrendingUp className="h-4 w-4 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products by name or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            
            {/* Date Range Picker */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => { setDateRange(prev => ({ ...prev, start: e.target.value })); setDatePreset('custom'); }}
                  className="w-40"
                />
                <span className="text-muted-foreground">to</span>
                <Input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => { setDateRange(prev => ({ ...prev, end: e.target.value })); setDatePreset('custom'); }}
                  className="w-40"
                />
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 whitespace-nowrap">
                      <CalendarIcon className="h-4 w-4 mr-1" />
                      Calendar
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <CalendarComponent
                      mode="range"
                      selected={{
                        from: dateRange.start ? new Date(dateRange.start) : undefined,
                        to: dateRange.end ? new Date(dateRange.end) : undefined,
                      }}
                      onSelect={(range: { from?: Date; to?: Date } | undefined) => {
                        if (range?.from) setDateRange(prev => ({ ...prev, start: formatDate(range.from!, "yyyy-MM-dd") }));
                        if (range?.to) setDateRange(prev => ({ ...prev, end: formatDate(range.to!, "yyyy-MM-dd") }));
                        setDatePreset('custom');
                      }}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            <div className="flex gap-2 w-full md:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsActionsDialogOpen(true)}
                className="flex items-center gap-1"
              >
                <MoreVertical className="h-4 w-4" />
                Actions
              </Button>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? 'All Categories' : cat}
                  </option>
                ))}
              </select>
              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-none rounded-l-md"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-none rounded-r-md"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Range Presets */}
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t">
            <span className="text-sm font-medium mr-1">Quick Range:</span>
            {[
              { key: 'today', label: 'Today' },
              { key: 'yesterday', label: 'Yesterday' },
              { key: 'last7', label: 'Last 7 Days' },
              { key: 'last30', label: 'Last 30 Days' },
              { key: 'thisMonth', label: 'This Month' },
              { key: 'lastMonth', label: 'Last Month' },
              { key: 'thisYear', label: 'This Year' },
              { key: 'all', label: 'All Time' },
            ].map(preset => (
              <Button
                key={preset.key}
                size="sm"
                variant={datePreset === preset.key ? 'default' : 'outline'}
                onClick={() => handleDatePreset(preset.key)}
                className={datePreset === preset.key ? '' : 'text-xs'}
              >
                {preset.label}
              </Button>
            ))}
            {(dateRange.start || dateRange.end) && (
              <Button variant="ghost" size="sm" onClick={() => handleDatePreset('all')} className="h-7 text-xs">
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Inventory Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
         {displayInventory.map((item) => (
            <Card key={item.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{highlightText(item.name, searchTerm)}</CardTitle>
                    <p className="text-sm text-muted-foreground">{highlightText(item.sku, searchTerm)}</p>
                  </div>
                  <Badge className={getStatusColor(item.status)}>
                    {item.status.replace('-', ' ')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Category:</span>
                    <span className="font-medium">{item.category}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Unit Cost:</span>
                    <span className="font-medium">{formatCurrency(item.unitPrice)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Cost:</span>
                    <span className="font-semibold">{formatCurrency(item.totalValue)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Unit Price:</span>
                    <span className="font-medium">{formatCurrency(item.sellingPrice)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Price:</span>
                    <span className="font-semibold">{formatCurrency(item.sellingPrice * item.quantity)}</span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-blue-700">Available Stock</span>
                      <span className="font-bold text-blue-700">{item.quantity}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Total Received</span>
                      <span className="font-medium">{item.totalReceived}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Total Sold</span>
                      <span className="font-medium">{item.soldQuantity}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2 mt-2">
                      <span>Stock Level</span>
                      <span className="font-medium">{item.quantity} / {item.maxStock}</span>
                    </div>
                    <Progress 
                      value={getStockProgress(item.quantity, item.maxStock)} 
                      className="h-2"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleEditClick(item)}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-3 px-4 font-medium">Product</th>
                    <th className="text-left py-3 px-4 font-medium">SKU</th>
                    <th className="text-left py-3 px-4 font-medium">Category</th>
                    <th className="text-left py-3 px-4 font-medium">Quantity</th>
                    <th className="text-left py-3 px-4 font-medium">Unit Cost</th>
                    <th className="text-left py-3 px-4 font-medium">Total Cost</th>
                    <th className="text-left py-3 px-4 font-medium">Unit Price</th>
                    <th className="text-left py-3 px-4 font-medium">Total Price</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayInventory.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div className="font-medium">{highlightText(item.name, searchTerm)}</div>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{highlightText(item.sku, searchTerm)}</td>
                      <td className="py-3 px-4">{item.category}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="font-medium text-blue-700">{item.quantity}</div>
                            <div className="text-xs text-muted-foreground">Available</div>
                          </div>
                          <div className="border-l pl-2">
                            <div className="text-xs">{item.totalReceived}</div>
                            <div className="text-xs text-muted-foreground">Received</div>
                          </div>
                          <div className="border-l pl-2">
                            <div className="text-xs">{item.soldQuantity}</div>
                            <div className="text-xs text-muted-foreground">Sold</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">{formatCurrency(item.unitPrice)}</td>
                      <td className="py-3 px-4 font-semibold">{formatCurrency(item.totalValue)}</td>
                      <td className="py-3 px-4">{formatCurrency(item.sellingPrice)}</td>
                      <td className="py-3 px-4 font-semibold">{formatCurrency(item.sellingPrice * item.quantity)}</td>
                      <td className="py-3 px-4">
                        <Badge className={getStatusColor(item.status)}>
                          {item.status.replace('-', ' ')}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditClick(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              {editingItem?.name} ({editingItem?.sku})
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-muted-foreground">
                Quantity
              </Label>
              <div className="col-span-3 py-2 px-3 bg-muted rounded-md text-sm">
                {editForm.quantity}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-muted-foreground">
                Unit Cost
              </Label>
              <div className="col-span-3 py-2 px-3 bg-muted rounded-md text-sm">
                {formatCurrency(editForm.unitCost)}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sellingPrice" className="text-right">
                Selling Price
              </Label>
              <Input
                id="sellingPrice"
                type="number"
                value={editForm.sellingPrice}
                onChange={(e) => setEditForm({ ...editForm, sellingPrice: parseFloat(e.target.value) || 0 })}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseEdit}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Actions Dialog */}
      <Dialog open={isActionsDialogOpen} onOpenChange={setIsActionsDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Actions</DialogTitle>
            <DialogDescription>
              Choose an action for the inventory data
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-4"
              onClick={async () => {
                setIsActionsDialogOpen(false);
                // Fetch latest totals from database for stats
                const dbTotals = await getInventoryTotalsByOutlet(propOutletId || '');
                
                // Create a printable inventory report using frontend inventory (has correct available quantities)
                const printWindow = window.open('', '_blank');
                if (printWindow) {
                  const tableRows = filteredInventory.map(item => `
                    <tr>
                      <td style="padding: 8px; border: 1px solid #ddd;">${item.name}</td>
                      <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.sku}</td>
                      <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.category}</td>
                      <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.quantity}</td>
                      <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatCurrency(item.unitPrice)}</td>
                      <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatCurrency(item.totalValue)}</td>
                      <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatCurrency(item.sellingPrice)}</td>
                      <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatCurrency(item.totalPrice)}</td>
                      <td style="padding: 8px; border: 1px solid #ddd; text-align: center; color: ${item.status === 'in-stock' ? 'green' : item.status === 'low-stock' ? 'orange' : 'red'};">${item.status.replace('-', ' ')}</td>
                    </tr>
                  `).join('');

                  printWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <title>Inventory Report - ${outlet?.name || 'Outlet'}</title>
                      <style>
                        body { font-family: Arial, sans-serif; padding: 20px; max-width: 1000px; margin: 0 auto; }
                        h1 { text-align: center; margin-bottom: 5px; }
                        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px; }
                        .header p { margin: 5px 0; color: #666; }
                        .stats { display: flex; justify-content: space-around; margin: 20px 0; background: #f5f5f5; padding: 15px; border-radius: 8px; }
                        .stat { text-align: center; }
                        .stat-value { font-size: 24px; font-weight: bold; color: #333; }
                        .stat-label { font-size: 12px; color: #666; }
                        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                        th { background: #333; color: white; padding: 10px; text-align: left; }
                        th, td { border: 1px solid #ddd; }
                        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
                        @media print { body { padding: 0; } }
                      </style>
                    </head>
                    <body>
                      <div class="header">
                        <h1>INVENTORY REPORT</h1>
                        <p><strong>${outlet?.name || 'Outlet'}</strong></p>
                        <p>Generated on: ${new Date().toLocaleString()}</p>
                      </div>
                      
                      <div class="stats">
                        <div class="stat">
                          <div class="stat-value">${filteredInventory.length}</div>
                          <div class="stat-label">Total Products</div>
                        </div>
                        <div class="stat">
                          <div class="stat-value">${formatCurrency(dbTotals.totalInventoryValue)}</div>
                          <div class="stat-label">Inventory Value</div>
                        </div>
                        <div class="stat">
                          <div class="stat-value">${formatCurrency(dbTotals.totalRetailValue)}</div>
                          <div class="stat-label">Retail Value</div>
                        </div>
                        <div class="stat">
                          <div class="stat-value">${filteredInventory.filter(i => i.status === 'low-stock').length}</div>
                          <div class="stat-label">Low Stock</div>
                        </div>
                        <div class="stat">
                          <div class="stat-value">${filteredInventory.filter(i => i.status === 'out-of-stock').length}</div>
                          <div class="stat-label">Out of Stock</div>
                        </div>
                      </div>

                      <table>
                        <thead>
                          <tr>
                            <th>Product Name</th>
                            <th style="text-align: center;">SKU</th>
                            <th style="text-align: center;">Category</th>
                            <th style="text-align: center;">Qty</th>
                            <th style="text-align: right;">Unit Cost</th>
                            <th style="text-align: right;">Total Cost</th>
                            <th style="text-align: right;">Unit Price</th>
                            <th style="text-align: right;">Total Price</th>
                            <th style="text-align: center;">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${tableRows}
                        </tbody>
                      </table>

                      <div class="footer">
                        <p>Royal POS - Inventory Management System</p>
                        <p>This report was automatically generated</p>
                      </div>
                    </body>
                    </html>
                  `);
                  printWindow.document.close();
                  printWindow.print();
                }
              }}
            >
              <Printer className="h-6 w-6 text-blue-600" />
              <span>Print</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-4"
              onClick={async () => {
                setIsActionsDialogOpen(false);
                // Fetch latest totals from database for stats
                const dbTotals = await getInventoryTotalsByOutlet(propOutletId || '');
                
                // Generate PDF for sharing using frontend inventory (has correct available quantities)
                const doc = new jsPDF('landscape');
                
                // Title
                doc.setFontSize(20);
                doc.setTextColor(51, 51, 51);
                doc.text('INVENTORY REPORT', 148, 20, { align: 'center' });
                
                // Outlet name and date
                doc.setFontSize(12);
                doc.setTextColor(102, 102, 102);
                doc.text(`${outlet?.name || 'Outlet'}`, 148, 28, { align: 'center' });
                doc.text(`Generated on: ${new Date().toLocaleString()}`, 148, 34, { align: 'center' });
                
                // Stats summary
                doc.setFontSize(10);
                doc.setTextColor(51, 51, 51);
                const statsY = 45;
                doc.text(`Total Products: ${filteredInventory.length}`, 20, statsY);
                doc.text(`Inventory Value: ${formatCurrency(dbTotals.totalInventoryValue)}`, 80, statsY);
                doc.text(`Retail Value: ${formatCurrency(dbTotals.totalRetailValue)}`, 150, statsY);
                doc.text(`Low Stock: ${filteredInventory.filter(i => i.status === 'low-stock').length}`, 220, statsY);
                doc.text(`Out of Stock: ${filteredInventory.filter(i => i.status === 'out-of-stock').length}`, 20, statsY + 8);
                
                // Draw line separator
                doc.setDrawColor(200, 200, 200);
                doc.line(20, statsY + 13, 277, statsY + 13);
                
                // Table data
                const tableData = filteredInventory.map(item => [
                  item.name,
                  item.sku,
                  item.category,
                  item.quantity.toString(),
                  formatCurrency(item.unitPrice),
                  formatCurrency(item.totalValue),
                  formatCurrency(item.sellingPrice),
                  formatCurrency(item.totalPrice),
                  item.status.replace('-', ' ')
                ]);
                
                // Generate table
                autoTable(doc, {
                  startY: statsY + 18,
                  head: [['Product Name', 'SKU', 'Category', 'Qty', 'Unit Cost', 'Total Cost', 'Unit Price', 'Total Price', 'Status']],
                  body: tableData,
                  theme: 'striped',
                  headStyles: { 
                    fillColor: [51, 51, 51],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold'
                  },
                  styles: {
                    fontSize: 8,
                    cellPadding: 3
                  },
                  columnStyles: {
                    0: { cellWidth: 50 },
                    1: { cellWidth: 25 },
                    2: { cellWidth: 30 },
                    3: { cellWidth: 15, halign: 'center' },
                    4: { cellWidth: 30, halign: 'right' },
                    5: { cellWidth: 30, halign: 'right' },
                    6: { cellWidth: 35, halign: 'right' },
                    7: { cellWidth: 25, halign: 'center' }
                  }
                });
                
                // Footer
                const pageCount = doc.getNumberOfPages();
                for (let i = 1; i <= pageCount; i++) {
                  doc.setPage(i);
                  doc.setFontSize(8);
                  doc.setTextColor(150, 150, 150);
                  doc.text('Royal POS - Inventory Management System', 148, doc.internal.pageSize.height - 10, { align: 'center' });
                  doc.text(`Page ${i} of ${pageCount}`, 277, doc.internal.pageSize.height - 10, { align: 'right' });
                }
                
                // Convert PDF to Blob and share
                const pdfBlob = doc.output('blob');
                const pdfFile = new File([pdfBlob], `${outlet?.name || 'outlet'}_inventory_${new Date().toISOString().split('T')[0]}.pdf`, { type: 'application/pdf' });
                
                // Try to share the file using Web Share API
                if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
                  try {
                    await navigator.share({
                      title: `${outlet?.name || 'Outlet'} Inventory Report`,
                      text: `Inventory report for ${outlet?.name || 'Outlet'} - ${filteredInventory.length} products`,
                      files: [pdfFile]
                    });
                  } catch (err) {
                    console.log('Share cancelled or failed:', err);
                  }
                } else {
                  // Fallback: download the PDF if sharing is not supported
                  doc.save(`${outlet?.name || 'outlet'}_inventory_${new Date().toISOString().split('T')[0]}.pdf`);
                }
              }}
            >
              <Share2 className="h-6 w-6 text-green-600" />
              <span>Share</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-4"
              onClick={async () => {
                setIsActionsDialogOpen(false);
                // Fetch latest totals from database for stats
                const dbTotals = await getInventoryTotalsByOutlet(propOutletId || '');
                
                // Generate PDF using jsPDF with frontend inventory (has correct available quantities)
                const doc = new jsPDF('landscape');
                
                // Title
                doc.setFontSize(20);
                doc.setTextColor(51, 51, 51);
                doc.text('INVENTORY REPORT', 148, 20, { align: 'center' });
                
                // Outlet name and date
                doc.setFontSize(12);
                doc.setTextColor(102, 102, 102);
                doc.text(`${outlet?.name || 'Outlet'}`, 148, 28, { align: 'center' });
                doc.text(`Generated on: ${new Date().toLocaleString()}`, 148, 34, { align: 'center' });
                
                // Stats summary
                doc.setFontSize(10);
                doc.setTextColor(51, 51, 51);
                const statsY = 45;
                doc.text(`Total Products: ${filteredInventory.length}`, 20, statsY);
                doc.text(`Inventory Value: ${formatCurrency(dbTotals.totalInventoryValue)}`, 80, statsY);
                doc.text(`Retail Value: ${formatCurrency(dbTotals.totalRetailValue)}`, 150, statsY);
                doc.text(`Low Stock: ${filteredInventory.filter(i => i.status === 'low-stock').length}`, 220, statsY);
                doc.text(`Out of Stock: ${filteredInventory.filter(i => i.status === 'out-of-stock').length}`, 20, statsY + 8);
                
                // Draw line separator
                doc.setDrawColor(200, 200, 200);
                doc.line(20, statsY + 13, 277, statsY + 13);
                
                // Table data
                const tableData = filteredInventory.map(item => [
                  item.name,
                  item.sku,
                  item.category,
                  item.quantity.toString(),
                  formatCurrency(item.unitPrice),
                  formatCurrency(item.totalValue),
                  formatCurrency(item.sellingPrice),
                  formatCurrency(item.totalPrice),
                  item.status.replace('-', ' ')
                ]);
                
                // Generate table
                autoTable(doc, {
                  startY: statsY + 18,
                  head: [['Product Name', 'SKU', 'Category', 'Qty', 'Unit Cost', 'Total Cost', 'Unit Price', 'Total Price', 'Status']],
                  body: tableData,
                  theme: 'striped',
                  headStyles: { 
                    fillColor: [51, 51, 51],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold'
                  },
                  styles: {
                    fontSize: 8,
                    cellPadding: 3
                  },
                  columnStyles: {
                    0: { cellWidth: 50 },
                    1: { cellWidth: 25 },
                    2: { cellWidth: 30 },
                    3: { cellWidth: 15, halign: 'center' },
                    4: { cellWidth: 30, halign: 'right' },
                    5: { cellWidth: 30, halign: 'right' },
                    6: { cellWidth: 35, halign: 'right' },
                    7: { cellWidth: 25, halign: 'center' }
                  }
                });
                
                // Footer
                const pageCount = doc.getNumberOfPages();
                for (let i = 1; i <= pageCount; i++) {
                  doc.setPage(i);
                  doc.setFontSize(8);
                  doc.setTextColor(150, 150, 150);
                  doc.text('Royal POS - Inventory Management System', 148, doc.internal.pageSize.height - 10, { align: 'center' });
                  doc.text(`Page ${i} of ${pageCount}`, 277, doc.internal.pageSize.height - 10, { align: 'right' });
                }
                
                // Save the PDF
                doc.save(`${outlet?.name || 'outlet'}_inventory_${new Date().toISOString().split('T')[0]}.pdf`);
              }}
            >
              <Download className="h-6 w-6 text-purple-600" />
              <span>Download</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-4"
              onClick={async () => {
                setIsActionsDialogOpen(false);
                // Fetch latest totals from database for stats
                const dbTotals = await getInventoryTotalsByOutlet(propOutletId || '');
                
                // Generate Excel file (HTML table format that Excel can open) using frontend inventory
                const excelContent = `
                  <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
                  <head>
                    <meta charset="UTF-8">
                    <style>
                      table { border-collapse: collapse; }
                      th, td { border: 1px solid #000; padding: 8px; }
                      th { background-color: #4F46E5; color: white; font-weight: bold; }
                      .header { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
                      .subheader { color: #666; margin-bottom: 20px; }
                    </style>
                  </head>
                  <body>
                    <div class="header">Inventory Report - ${outlet?.name || 'Outlet'}</div>
                    <div class="subheader">Generated on: ${new Date().toLocaleString()}</div>
                    <table>
                      <thead>
                        <tr>
                          <th>Product Name</th>
                          <th>SKU</th>
                          <th>Category</th>
                          <th>Quantity</th>
                          <th>Unit Cost</th>
                          <th>Total Cost</th>
                          <th>Unit Price</th>
                          <th>Total Price</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${filteredInventory.map(item => `
                          <tr>
                            <td>${item.name}</td>
                            <td>${item.sku}</td>
                            <td>${item.category}</td>
                            <td style="text-align: center;">${item.quantity}</td>
                            <td style="text-align: right;">${formatCurrency(item.unitPrice)}</td>
                            <td style="text-align: right;">${formatCurrency(item.totalValue)}</td>
                            <td style="text-align: right;">${formatCurrency(item.sellingPrice)}</td>
                            <td style="text-align: right;">${formatCurrency(item.totalPrice)}</td>
                            <td>${item.status.replace('-', ' ')}</td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                    <br/>
                    <table>
                      <tr><td><strong>Total Products:</strong></td><td>${filteredInventory.length}</td></tr>
                      <tr><td><strong>Inventory Value:</strong></td><td>${formatCurrency(dbTotals.totalInventoryValue)}</td></tr>
                      <tr><td><strong>Total Retail Value:</strong></td><td>${formatCurrency(dbTotals.totalRetailValue)}</td></tr>
                      <tr><td><strong>Low Stock Items:</strong></td><td>${filteredInventory.filter(i => i.status === 'low-stock').length}</td></tr>
                      <tr><td><strong>Out of Stock Items:</strong></td><td>${filteredInventory.filter(i => i.status === 'out-of-stock').length}</td></tr>
                    </table>
                  </body>
                  </html>
                `;
                
                const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${outlet?.name || 'outlet'}_inventory_${new Date().toISOString().split('T')[0]}.xls`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <FileOutput className="h-6 w-6 text-orange-600" />
              <span>Export</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-4"
              onClick={async () => {
                setIsActionsDialogOpen(false);
                if (!propOutletId) {
                  alert('No outlet selected');
                  return;
                }
                const result = await syncSellingPricesToDatabase(propOutletId);
                if (result.success) {
                  alert(`Successfully synced ${result.updated} selling prices to database!`);
                } else {
                  alert(`Sync completed with ${result.errors.length} errors. Check console for details.`);
                }
              }}
            >
              <RefreshCw className="h-6 w-6 text-blue-600" />
              <span>Sync Prices</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
