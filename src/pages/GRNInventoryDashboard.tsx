import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { GRNInventoryCards } from "@/components/GRNInventoryCards";
import { useToast } from "@/hooks/use-toast";
import { getSavedGRNs, SavedGRN } from "@/utils/grnUtils";

export const GRNInventoryDashboard = ({ username, onBack, onLogout }: { username: string; onBack: () => void; onLogout: () => void }) => {
  const [grns, setGrns] = useState<SavedGRN[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadGRNs();
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
        description: "Failed to load GRNs",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGRNView = (grn: SavedGRN) => {
    console.log("View GRN:", grn);
    toast({
      title: "GRN View",
      description: `Viewing GRN: ${grn.name}`
    });
  };

  const handleGRNPrint = (grn: SavedGRN) => {
    console.log("Print GRN:", grn);
    toast({
      title: "GRN Print",
      description: `Printing GRN: ${grn.name}`
    });
  };

  const handleGRNDownload = (grn: SavedGRN) => {
    console.log("Download GRN:", grn);
    toast({
      title: "GRN Download",
      description: `Downloading GRN: ${grn.name}`
    });
  };

  const handleGRNDelete = async (grn: SavedGRN) => {
    if (window.confirm(`Are you sure you want to delete GRN: ${grn.name}?`)) {
      try {
        // In a real implementation, you would call the delete function
        // await deleteGRN(grn.id);
        setGrns(prev => prev.filter(g => g.id !== grn.id));
        toast({
          title: "Success",
          description: `GRN deleted: ${grn.name}`
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
            <p>Loading GRNs...</p>
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
          <h2 className="text-3xl font-bold">GRN Inventory Dashboard</h2>
          <p className="text-muted-foreground">View and manage your Goods Received Notes inventory</p>
        </div>
        
        <GRNInventoryCards
          grns={grns}
          onGRNView={handleGRNView}
          onGRNPrint={handleGRNPrint}
          onGRNDownload={handleGRNDownload}
          onGRNDelete={handleGRNDelete}
        />
      </main>
    </div>
  );
};