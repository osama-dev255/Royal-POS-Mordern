import { useState, useEffect } from "react";
import { DashboardCard } from "@/components/DashboardCard";
import { 
  Package, 
  ShoppingCart, 
  ShoppingBag, 
  Wallet, 
  Users, 
  BarChart3, 
  Settings,
  Truck,
  Shield,
  FileText,
  Bot,
  Scan
} from "lucide-react";
import { hasModuleAccess, getCurrentUserRole } from "@/utils/salesPermissionUtils";

interface DashboardModule {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
}

interface DashboardProps {
  username: string;
  onNavigate: (dashboard: string) => void;
  onLogout: () => void;
}

export const Dashboard = ({ username, onNavigate, onLogout }: DashboardProps) => {
  const [userRole, setUserRole] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchUserRole = async () => {
      const role = await getCurrentUserRole();
      setUserRole(role);
    };
    
    fetchUserRole();
  }, []);

  const allDashboards: DashboardModule[] = [
    {
      id: "inventory",
      title: "Inventory Management",
      description: "Manage your products, stock levels, and inventory tracking",
      icon: Package,
      color: "bg-white border border-gray-200"
    },
    {
      id: "sales",
      title: "Sales Dashboard",
      description: "Process sales, manage transactions, and view sales analytics",
      icon: ShoppingCart,
      color: "bg-white border border-gray-200"
    },
    {
      id: "purchase",
      title: "Purchase Management",
      description: "Handle supplier orders, track purchases, and manage vendors",
      icon: ShoppingBag,
      color: "bg-white border border-gray-200"
    },
    {
      id: "finance",
      title: "Financial Management",
      description: "Manage expenses, debts, and financial reporting",
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
      description: "Manage staff members and permissions",
      icon: Users,
      color: "bg-white border border-gray-200"
    },
    {
      id: "expenses",
      title: "Expense Tracking",
      description: "Track business expenses and categorize spending",
      icon: Wallet,
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
      id: "debts",
      title: "Debt Management",
      description: "Track customer debts and payment schedules",
      icon: Wallet,
      color: "bg-white border border-gray-200"
    },
    {
      id: "reports",
      title: "Financial Reports",
      description: "View detailed financial reports and statements",
      icon: FileText,
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
    }
  ];

  // Filter dashboards based on user role
  const dashboards = allDashboards.filter(dashboard => hasModuleAccess(userRole, dashboard.id));

  const handleNavigate = async (dashboardId: string) => {
    // Check if user has access to the requested dashboard
    if (!hasModuleAccess(userRole, dashboardId)) {
      console.log("User does not have access to dashboard:", dashboardId);
      return;
    }
    
    onNavigate(dashboardId);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Main content without Navigation since it's now in AdvancedLayout */}
      <main className="container-responsive py-6 sm:py-8">
        <div className="mb-8 sm:mb-10">
          <h2 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-bold mb-3">Welcome back, {username}!</h2>
          <p className="text-muted-foreground text-sm sm:text-base md:text-lg">
            Select a dashboard to manage your business operations
          </p>
        </div>
        
        {dashboards.length > 0 ? (
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 sm:gap-5 auto-rows-fr">
            {dashboards.map((dashboard) => (
              <div key={dashboard.id} className="flex">
                <DashboardCard
                  title={dashboard.title}
                  description={dashboard.description}
                  icon={dashboard.icon}
                  onClick={() => handleNavigate(dashboard.id)}
                  className={`${dashboard.color} card-padding`}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold mb-2">No Access</h3>
            <p className="text-muted-foreground mb-4">
              You don't have permission to access any dashboards.
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