import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Truck, Plus, Search, Filter, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ProductManagementCard } from "@/components/ProductManagementCard";
import { GRNManagementCard } from "@/components/GRNManagementCard";

export const InventoryManagement = ({ username, onBack, onLogout }: { username: string; onBack: () => void; onLogout: () => void }) => {
  const [activeTab, setActiveTab] = useState<"products" | "grn">("products");
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { toast } = useToast();

  const refreshData = () => {
    setRefreshTrigger(prev => prev + 1);
    toast({
      title: "Success",
      description: "Data refreshed successfully"
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation 
        title="Inventory Management" 
        onBack={onBack}
        onLogout={onLogout} 
        username={username}
      />
      
      <main className="container mx-auto p-6">
        <div className="mb-6">
          <h2 className="text-3xl font-bold">Inventory Management</h2>
          <p className="text-muted-foreground">Manage your products and goods received notes</p>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex gap-4 mb-6">
          <Button
            variant={activeTab === "products" ? "default" : "outline"}
            className="flex items-center gap-2"
            onClick={() => setActiveTab("products")}
          >
            <Package className="h-4 w-4" />
            Products Management
          </Button>
          <Button
            variant={activeTab === "grn" ? "default" : "outline"}
            className="flex items-center gap-2"
            onClick={() => setActiveTab("grn")}
          >
            <Truck className="h-4 w-4" />
            GRN Management
          </Button>
        </div>

        {/* Search and Filter Bar */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={`Search ${activeTab === "products" ? "products" : "GRNs"}...`}
                  className="w-full pl-10 pr-4 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-input"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={refreshData}>
                  <Filter className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                
                {activeTab === "products" ? (
                  <Button onClick={() => {
                    // This would open the add product dialog
                    const event = new CustomEvent('openAddProductDialog');
                    window.dispatchEvent(event);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product
                  </Button>
                ) : (
                  <Button onClick={() => {
                    // This would open the add GRN dialog
                    const event = new CustomEvent('openAddGRNDialog');
                    window.dispatchEvent(event);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    New GRN
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Cards */}
        <div className="grid grid-cols-1 gap-6">
          {activeTab === "products" ? (
            <ProductManagementCard 
              searchTerm={searchTerm}
              refreshTrigger={refreshTrigger}
            />
          ) : (
            <GRNManagementCard 
              searchTerm={searchTerm}
              refreshTrigger={refreshTrigger}
            />
          )}
        </div>
      </main>
    </div>
  );
};