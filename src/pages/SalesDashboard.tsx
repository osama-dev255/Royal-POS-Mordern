import { useState, useEffect } from "react";
import { DashboardCard } from "@/components/DashboardCard";
import { 
  ShoppingCart,
  Receipt,
  Package,
  Users,
  BarChart3,
  Settings,
  Scan,
  Truck,
  Wallet,
  FileText
} from "lucide-react";
import { hasModuleAccess, getCurrentUserRole } from "@/utils/salesPermissionUtils";

interface SalesModule {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
}

interface SalesDashboardProps {
  username: string;
  onBack: () => void;
  onLogout: () => void;
  onNavigate: (module: string) => void;
}

export const SalesDashboard = ({ username, onBack, onLogout, onNavigate }: SalesDashboardProps) => {
  const [userRole, setUserRole] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchUserRole = async () => {
      const role = await getCurrentUserRole();
      setUserRole(role);
    };
    
    fetchUserRole();
  }, []);

  const allSalesModules: SalesModule[] = [
    {
      id: "sales-cart",
      title: "Sales Terminal",
      description: "Process sales transactions and manage customer purchases",
      icon: ShoppingCart,
      color: "bg-white border border-gray-200"
    },
    {
      id: "sales-orders",
      title: "Sales Orders",
      description: "View and manage all sales orders and transactions",
      icon: Receipt,
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
      id: "customer-stock",
      title: "Customer Stock",
      description: "Manage uncollected stock and changes after sales to customer",
      icon: Package,
      color: "bg-white border border-gray-200"
    },
    {
      id: "monetary-assets",
      title: "Monetary Assets",
      description: "Track financial assets and monetary changes from sales",
      icon: Wallet,
      color: "bg-white border border-gray-200"
    },
    {
      id: "customers",
      title: "Customer Management",
      description: "Manage customer information and loyalty programs",
      icon: Users,
      color: "bg-white border border-gray-200"
    },
    {
      id: "returns",
      title: "Returns Management",
      description: "Process product returns and refunds",
      icon: Package,
      color: "bg-white border border-gray-200"
    },
    {
      id: "discounts",
      title: "Discount Management",
      description: "Manage discount codes and promotional offers",
      icon: Wallet,
      color: "bg-white border border-gray-200"
    },
    {
      id: "debts",
      title: "Debt Management",
      description: "Track customer debts and payment schedules",
      icon: Wallet,
      color: "bg-white border border-gray-200"
    },
    {
      id: "customer-settlements",
      title: "Customer Settlements",
      description: "Manage customer debt settlements and payments",
      icon: Users,
      color: "bg-white border border-gray-200"
    },
    {
      id: "settings",
      title: "Sales Settings",
      description: "Configure sales system preferences and options",
      icon: Settings,
      color: "bg-white border border-gray-200"
    },
    {
      id: "scanner",
      title: "Scan Items",
      description: "Quickly add products to cart using barcode scanner",
      icon: Scan,
      color: "bg-white border border-gray-200"
    }
  ];

  // Filter modules based on user role
  const salesModules = allSalesModules.filter(module => hasModuleAccess(userRole, module.id));

  // If no modules are available for this user, redirect back
  useEffect(() => {
    if (userRole && salesModules.length === 0) {
      // User has no access to any sales modules, redirect back
      onBack();
    }
  }, [userRole, salesModules.length, onBack]);

  // Wrapper function for onNavigate that checks permissions
  const handleNavigate = async (module: string) => {
    // Check if user has access to the requested module
    if (!hasModuleAccess(userRole, module)) {
      console.log("User does not have access to module:", module);
      // Optionally show an error message
      return;
    }
    
    onNavigate(module);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Main content without Navigation since it's now in AdvancedLayout */}
      <main className="container mx-auto p-4 sm:p-6">
        <div className="mb-8 sm:mb-10">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">Sales Management</h2>
          <p className="text-muted-foreground text-sm sm:text-base md:text-lg">
            Choose a sales module to manage your transactions and customer data
          </p>
        </div>
        
        {salesModules.length > 0 ? (
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 sm:gap-5 auto-rows-fr">
            {salesModules.map((module) => (
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
              You don't have permission to access any sales modules.
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