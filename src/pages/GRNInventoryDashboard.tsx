import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { GRNInventoryCards } from "@/components/GRNInventoryCards";
import { GRNDetailsModal } from "@/components/GRNDetailsModal";
import { ProductInventorySection } from "@/components/ProductInventorySection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getSavedGRNs, SavedGRN, deleteGRN } from "@/utils/grnUtils";
import { Package, TrendingUp, AlertTriangle, CheckCircle, Clock, Download, Printer, Truck } from "lucide-react";
import { formatCurrency } from "@/lib/currency";

export const GRNInventoryDashboard = ({ username, onBack, onLogout, onNavigate }: { username: string; onBack: () => void; onLogout: () => void; onNavigate?: (page: string) => void }) => {
  const [grns, setGrns] = useState<SavedGRN[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGRN, setSelectedGRN] = useState<SavedGRN | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"grn" | "inventory">("grn");
  const { toast } = useToast();

  useEffect(() => {
    loadGRNs();
    
    // Listen for add product dialog event
    const handleOpenAddProductDialog = () => {
      // Since we don't have a direct product management dialog here,
      // we'll show a toast notification suggesting the user navigates to the product management page
      toast({
        title: "Add Product",
        description: "Please navigate to the main Product Management section to add new products.",
        duration: 5000
      });
    };
    
    window.addEventListener('openAddProductDialog', handleOpenAddProductDialog);
    
    return () => {
      window.removeEventListener('openAddProductDialog', handleOpenAddProductDialog);
    };
  }, []);

  const loadGRNs = async () => {
    try {
      setLoading(true);
      const data = await getSavedGRNs();
      setGrns(data);
    } catch (error) {
      console.error("Error loading GRNs:", error);
      toast({
        title: "Error",
        description: "Failed to load GRNs. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate dashboard metrics
  const totalGRNs = grns.length;
  const totalValue = grns.reduce((sum, grn) => sum + (grn.total || 0), 0);
  const pendingGRNs = grns.filter(grn => grn.data?.status === "pending" || grn.data?.status === "draft").length;
  const completedGRNs = grns.filter(grn => grn.data?.status === "completed" || grn.data?.status === "approved").length;
  const recentGRNs = grns.slice(0, 5); // Last 5 GRNs

  const handleGRNView = (grn: SavedGRN) => {
    setSelectedGRN(grn);
    setShowDetailsModal(true);
  };

  const handleGRNPrint = (grn: SavedGRN) => {
    // Implement print functionality
    toast({
      title: "Print GRN",
      description: `Printing GRN: ${grn.data.grnNumber || grn.name}`
    });
    // TODO: Implement actual print functionality
  };

  const handleGRNDownload = (grn: SavedGRN) => {
    // Implement download functionality
    toast({
      title: "Download GRN",
      description: `Downloading GRN: ${grn.data.grnNumber || grn.name}`
    });
    // TODO: Implement actual download functionality (PDF/Excel)
  };

  const handleGRNDelete = async (grn: SavedGRN) => {
    if (window.confirm(`Are you sure you want to delete GRN: ${grn.data.grnNumber || grn.name}?`)) {
      try {
        await deleteGRN(grn.id);
        setGrns(prev => prev.filter(g => g.id !== grn.id));
        toast({
          title: "Success",
          description: `GRN deleted: ${grn.data.grnNumber || grn.name}`
        });
      } catch (error) {
        console.error("Error deleting GRN:", error);
        toast({
          title: "Error",
          description: "Failed to delete GRN",
          variant: "destructive"
        });
      }
    }
  };

  const handleExportAll = () => {
    // Implement export all functionality
    toast({
      title: "Export All GRNs",
      description: "Exporting all GRNs to Excel format"
    });
    // TODO: Implement actual export functionality
  };

  const handlePrintAll = () => {
    // Implement print all functionality
    toast({
      title: "Print All GRNs",
      description: "Generating printable report of all GRNs"
    });
    // TODO: Implement actual print functionality
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation 
          title="GRN Inventory Dashboard" 
          onBack={onBack}
          onLogout={onLogout} 
          username={username}
        />
        <main className="container mx-auto p-6">
          <div className="flex justify-center items-center h-64">
            <p className="text-lg">Loading GRN inventory data...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation 
        title="GRN Inventory Dashboard" 
        onBack={onBack}
        onLogout={onLogout} 
        username={username}
      />
      
      <main className="container mx-auto p-6">
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold">GRN & Inventory Dashboard</h2>
              <p className="text-muted-foreground">
                {activeTab === "grn" 
                  ? "View and manage your Goods Received Notes" 
                  : "Monitor your product inventory levels"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handlePrintAll}>
                <Printer className="h-4 w-4 mr-2" />
                Print All
              </Button>
              <Button onClick={handleExportAll}>
                <Download className="h-4 w-4 mr-2" />
                Export All
              </Button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-4 mb-6">
          <Button
            variant={activeTab === "grn" ? "default" : "outline"}
            className="flex items-center gap-2"
            onClick={() => setActiveTab("grn")}
          >
            <Truck className="h-4 w-4" />
            GRN Management
          </Button>
          <Button
            variant={activeTab === "inventory" ? "default" : "outline"}
            className="flex items-center gap-2"
            onClick={() => setActiveTab("inventory")}
          >
            <Package className="h-4 w-4" />
            Product Inventory
          </Button>
        </div>

        {/* Dashboard Content - Tabbed View */}
        {activeTab === "grn" ? (
          <>
            {/* Dashboard Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total GRNs</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalGRNs}</div>
                  <p className="text-xs text-muted-foreground">All received notes</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Value</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
                  <p className="text-xs text-muted-foreground">Total inventory value</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending GRNs</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{pendingGRNs}</div>
                  <p className="text-xs text-muted-foreground">Awaiting processing</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed GRNs</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{completedGRNs}</div>
                  <p className="text-xs text-muted-foreground">Fully processed</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent GRNs Summary */}
            {recentGRNs.length > 0 && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>Recent GRNs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentGRNs.map((grn) => (
                      <div key={grn.id} className="flex justify-between items-center p-4 border rounded-lg">
                        <div>
                          <h3 className="font-medium">{grn.data.grnNumber || grn.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {grn.data.supplierName || "Unknown Supplier"} • {new Date(grn.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(grn.total || 0)}</p>
                          <Button size="sm" variant="outline" onClick={() => handleGRNView(grn)}>
                            View Details
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Main GRN Grid */}
            <GRNInventoryCards
              grns={grns}
              onGRNView={handleGRNView}
              onGRNPrint={handleGRNPrint}
              onGRNDownload={handleGRNDownload}
              onGRNDelete={handleGRNDelete}
            />
          </>
        ) : (
          /* Product Inventory Section */
          <ProductInventorySection />
        )}

        {/* Add Product Dialog - Will be triggered by ProductInventorySection */}
        <div id="add-product-dialog-container" />

        {/* GRN Details Modal */}
        {showDetailsModal && selectedGRN && activeTab === "grn" && (
          <GRNDetailsModal
            grn={selectedGRN}
            open={showDetailsModal}
            onOpenChange={setShowDetailsModal}
            onPrint={handleGRNPrint}
            onDownload={handleGRNDownload}
          />
        )}
      </main>
    </div>
  );
};