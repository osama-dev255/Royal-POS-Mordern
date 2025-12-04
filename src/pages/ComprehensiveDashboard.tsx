import { useState, useEffect } from "react";
import { DashboardCard } from "@/components/DashboardCard";
import { 
  Package, 
  ShoppingCart, 
  Users, 
  BarChart3, 
  Wallet, 
  Truck,
  Settings,
  User,
  Shield,
  FileText,
  Bot,
  Scan,
  AlertTriangle,
  Printer,
  Building,
  PiggyBank,
  LayoutTemplate
} from "lucide-react";
import { hasModuleAccess, getCurrentUserRole } from "@/utils/salesPermissionUtils";

interface Module {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
}

interface ComprehensiveDashboardProps {
  username: string;
  onNavigate: (module: string) => void;
  onLogout: () => void;
}

export const ComprehensiveDashboard = ({ username, onNavigate, onLogout }: ComprehensiveDashboardProps) => {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isRoleLoading, setIsRoleLoading] = useState(true);
  
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const role = await getCurrentUserRole();
        console.log("Fetched user role:", role);
        setUserRole(role);
      } catch (error) {
        console.error("Error fetching user role:", error);
        setUserRole(null);
      } finally {
        setIsRoleLoading(false);
      }
    };
    
    fetchUserRole();
  }, []);

  const allModules: Module[] = [
    {
      id: "inventory",
      title: "Inventory Management",
      description: "Manage products, stock levels, and inventory tracking",
      icon: Package,
      color: "bg-white border border-gray-200"
    },
    {
      id: "sales",
      title: "Sales Terminal",
      description: "Process sales transactions and manage customers",
      icon: ShoppingCart,
      color: "bg-white border border-gray-200"
    },
    {
      id: "purchase",
      title: "Purchase Management",
      description: "Handle supplier orders and purchase transactions",
      icon: Truck,
      color: "bg-white border border-gray-200"
    },
    {
      id: "finance",
      title: "Financial Management",
      description: "Track expenses, debts, and financial reporting",
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
      id: "suppliers",
      title: "Supplier Management",
      description: "Manage supplier information and vendor relationships",
      icon: Truck,
      color: "bg-white border border-gray-200"
    },
    {
      id: "employees",
      title: "Employee Management",
      description: "Manage staff information and payroll",
      icon: User,
      color: "bg-white border border-gray-200"
    },
    {
      id: "expenses",
      title: "Expense Tracking",
      description: "Record and categorize business expenses",
      icon: PiggyBank,
      color: "bg-white border border-gray-200"
    },
    {
      id: "returns",
      title: "Return Management",
      description: "Process product returns and refunds",
      icon: AlertTriangle,
      color: "bg-white border border-gray-200"
    },
    {
      id: "debts",
      title: "Debt Management",
      description: "Track receivables and payables",
      icon: FileText,
      color: "bg-white border border-gray-200"
    },
    {
      id: "customer-settlements",
      title: "Customer Settlements",
      description: "Manage customer payments and settlements",
      icon: Users,
      color: "bg-white border border-gray-200"
    },
    {
      id: "supplier-settlements",
      title: "Supplier Settlements",
      description: "Manage supplier payments and settlements",
      icon: Truck,
      color: "bg-white border border-gray-200"
    },
    {
      id: "reports",
      title: "Reports & Analytics",
      description: "View financial reports and business analytics",
      icon: BarChart3,
      color: "bg-white border border-gray-200"
    },
    {
      id: "access-logs",
      title: "Access Logs",
      description: "Monitor user activity and system access",
      icon: Shield,
      color: "bg-white border border-gray-200"
    },
    {
      id: "settings",
      title: "System Settings",
      description: "Configure POS system preferences and options",
      icon: Settings,
      color: "bg-white border border-gray-200"
    },
    {
      id: "scanner",
      title: "Scan Items",
      description: "Quickly add products using barcode scanner",
      icon: Scan,
      color: "bg-white border border-gray-200"
    },
    {
      id: "automated",
      title: "Automated Dashboard",
      description: "View automated business insights and recommendations",
      icon: Bot,
      color: "bg-white border border-gray-200"
    },
    {
      id: "assets",
      title: "Assets Management",
      description: "Manage company assets, depreciation, and asset tracking",
      icon: Building,
      color: "bg-white border border-gray-200"
    },
    {
      id: "templates",
      title: "Business Templates",
      description: "Professional templates for your business documents",
      icon: LayoutTemplate,
      color: "bg-white border border-gray-200"
    }
  ];

  // Filter modules based on user role
  const modules = allModules.filter(module => {
    // While role is loading, show all modules to avoid empty state
    if (isRoleLoading) {
      return true;
    }
    
    return hasModuleAccess(userRole, module.id);
  });

  const handleNavigate = async (moduleId: string) => {
    // Special handling for reports module
    if (moduleId === "reports") {
      onNavigate("statements-reports");
      return;
    }
    // Special handling for financial statements module
    if (moduleId === "financial-statements") {
      onNavigate("financial-reports");
      return;
    }
    
    // Navigate to specific modules
    switch (moduleId) {
      case "inventory":
        onNavigate("products");
        break;
      case "sales":
        onNavigate("sales");
        break;
      case "purchase":
        onNavigate("purchase");
        break;
      case "finance":
        onNavigate("finance");
        break;
      case "assets":
        onNavigate("assets");
        break;
      case "employees":
        onNavigate("employees");
        break;
      case "customers":
        onNavigate("customers");
        break;
      case "suppliers":
        onNavigate("suppliers");
        break;
      case "expenses":
        onNavigate("expenses");
        break;
      case "returns":
        onNavigate("returns");
        break;
      case "debts":
        onNavigate("debts");
        break;
      case "customer-settlements":
        onNavigate("customer-settlements");
        break;
      case "supplier-settlements":
        onNavigate("supplier-settlements");
        break;
      case "access-logs":
        onNavigate("access-logs");
        break;
      case "settings":
        onNavigate("settings");
        break;
      case "scanner":
        onNavigate("scanner");
        break;
      case "automated":
        onNavigate("automated");
        break;
      case "capital":
        onNavigate("capital");
        break;
      case "templates":
        onNavigate("templates");
        break;
      default:
        onNavigate(moduleId);
    }
  };

  // Show loading state while fetching role
  if (isRoleLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto p-4 sm:p-6">
          <div className="mb-8 sm:mb-10">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">Welcome back, {username}!</h2>
            <p className="text-muted-foreground text-sm sm:text-base md:text-lg">
              Loading your dashboard...
            </p>
          </div>
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 sm:gap-5 auto-rows-fr">
            {allModules.map((module) => (
              <div key={module.id} className="flex">
                <DashboardCard
                  title={module.title}
                  description={module.description}
                  icon={module.icon}
                  onClick={() => {}}
                  className={`${module.color} opacity-50`}
                />
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto p-4 sm:p-6">
        <div className="mb-8 sm:mb-10">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">Welcome back, {username}!</h2>
          <p className="text-muted-foreground text-sm sm:text-base md:text-lg">
            Select a module to manage your business operations
          </p>
        </div>
        
        {modules.length > 0 ? (
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 sm:gap-5 auto-rows-fr">
            {modules.map((module) => (
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
              You don't have permission to access any modules.
            </p>
            <button
              onClick={onLogout}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Logout
            </button>
          </div>
        )}
      </main>
    </div>
  );
};