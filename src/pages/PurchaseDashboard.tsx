import { useState, useEffect } from "react";
import { DashboardCard } from "@/components/DashboardCard";
import { 
  ShoppingBag,
  Truck,
  FileText,
  Users,
  BarChart3,
  Settings,
  ShoppingCart,
  Package
} from "lucide-react";
import { hasModuleAccess, getCurrentUserRole } from "@/utils/salesPermissionUtils";

interface PurchaseModule {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
}

interface PurchaseDashboardProps {
  username: string;
  onBack: () => void;
  onLogout: () => void;
  onNavigate: (module: string) => void;
}

export const PurchaseDashboard = ({ username, onBack, onLogout, onNavigate }: PurchaseDashboardProps) => {
  const [userRole, setUserRole] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchUserRole = async () => {
      const role = await getCurrentUserRole();
      setUserRole(role);
    };
    
    fetchUserRole();
  }, []);

  const allPurchaseModules: PurchaseModule[] = [
    {
      id: "purchase-terminal",
      title: "Purchase Terminal",
      description: "Create and manage supplier purchase orders",
      icon: ShoppingBag,
      color: "bg-white border border-gray-200"
    },
    {
      id: "purchase-orders",
      title: "Purchase Orders",
      description: "View and manage all purchase orders and receipts",
      icon: FileText,
      color: "bg-white border border-gray-200"
    },
    {
      id: "suppliers",
      title: "Supplier Management",
      description: "Manage supplier information and vendor relationships",
      icon: Truck,
      color: "bg-white border border-gray-200"
    },
    {
      id: "products",
      title: "Product Management",
      description: "Manage product inventory, pricing, and stock levels",
      icon: Package,
      color: "bg-white border border-gray-200"
    },
    {
      id: "purchase-transactions",
      title: "Transaction History",
      description: "View and manage all purchase transactions and receipts",
      icon: FileText,
      color: "bg-white border border-gray-200"
    },
    {
      id: "purchase-reports",
      title: "Purchase Reports",
      description: "Analyze purchasing performance and supplier metrics",
      icon: BarChart3,
      color: "bg-white border border-gray-200"
    },
    {
      id: "supplier-settlements",
      title: "Supplier Settlements",
      description: "Manage supplier payments and settlements",
      icon: Users,
      color: "bg-white border border-gray-200"
    },
    {
      id: "settings",
      title: "Purchase Settings",
      description: "Configure purchasing system preferences and options",
      icon: Settings,
      color: "bg-white border border-gray-200"
    }
  ];

  // Filter modules based on user role
  const purchaseModules = allPurchaseModules.filter(module => hasModuleAccess(userRole, module.id));

  // If no modules are available for this user, redirect back
  useEffect(() => {
    if (userRole && purchaseModules.length === 0) {
      // User has no access to any purchase modules, redirect back
      onBack();
    }
  }, [userRole, purchaseModules.length, onBack]);

  const handleNavigate = (module: string) => {
    onNavigate(module);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Main content without Navigation since it's now in AdvancedLayout */}
      <main className="container mx-auto p-4 sm:p-6">
        <div className="mb-8 sm:mb-10">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">Purchase Management</h2>
          <p className="text-muted-foreground text-sm sm:text-base md:text-lg">
            Manage your suppliers, purchase orders, and procurement processes
          </p>
        </div>
        
        {purchaseModules.length > 0 ? (
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 sm:gap-5 auto-rows-fr">
            {purchaseModules.map((module) => (
              <div key={module.id} className="flex">
                <DashboardCard
                  title={module.title}
                  description={module.description}
                  icon={module.icon}
                  onClick={() => handleNavigate(module.id)}
                  className={module.color}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold mb-2">No Access</h3>
            <p className="text-muted-foreground mb-4">
              You don't have permission to access any purchase modules.
            </p>
            <button
              onClick={onBack}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Back to Dashboard
            </button>
          </div>
        )}
      </main>
    </div>
  );
};