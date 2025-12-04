import { useState, useEffect } from "react";
import { DashboardCard } from "@/components/DashboardCard";
import { 
  Wallet,
  TrendingUp,
  PieChart,
  FileText,
  BarChart3,
  Settings,
  Users,
  Truck,
  Bot,
  PiggyBank,
  Package
} from "lucide-react";
import { hasModuleAccess, getCurrentUserRole } from "@/utils/salesPermissionUtils";

interface FinanceModule {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
}

interface FinanceDashboardProps {
  username: string;
  onBack: () => void;
  onLogout: () => void;
  onNavigate: (module: string) => void;
}

export const FinanceDashboard = ({ username, onBack, onLogout, onNavigate }: FinanceDashboardProps) => {
  const [userRole, setUserRole] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchUserRole = async () => {
      const role = await getCurrentUserRole();
      setUserRole(role);
    };
    
    fetchUserRole();
  }, []);

  const allFinanceModules: FinanceModule[] = [
    {
      id: "expenses",
      title: "Expense Management",
      description: "Track and categorize business expenses",
      icon: Wallet,
      color: "bg-white border border-gray-200"
    },
    {
      id: "debts",
      title: "Debt Management",
      description: "Manage customer debts and payment schedules",
      icon: TrendingUp,
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
      id: "supplier-settlements",
      title: "Supplier Settlements",
      description: "Manage supplier payments and settlements",
      icon: Truck,
      color: "bg-white border border-gray-200"
    },
    {
      id: "payables-receivables",
      title: "Payables & Receivables",
      description: "Manage accounts payable and receivable",
      icon: FileText,
      color: "bg-white border border-gray-200"
    },
    {
      id: "assets",
      title: "Assets Management",
      description: "Manage company assets and transactions",
      icon: Package,
      color: "bg-white border border-gray-200"
    },
    {
      id: "capital",
      title: "Capital Management",
      description: "Track and manage business capital, investments, and funding",
      icon: PiggyBank,
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
      id: "financial-statements",
      title: "Financial Statements",
      description: "Access income statement, balance sheet, and cash flow statements",
      icon: FileText,
      color: "bg-white border border-gray-200"
    },
    {
      id: "settings",
      title: "Financial Settings",
      description: "Configure financial system preferences and options",
      icon: Settings,
      color: "bg-white border border-gray-200"
    },
    {
      id: "automated",
      title: "Automated Dashboard",
      description: "View automated financial insights and recommendations",
      icon: Bot,
      color: "bg-white border border-gray-200"
    }
  ];

  // Filter modules based on user role
  const financeModules = allFinanceModules.filter(module => hasModuleAccess(userRole, module.id));

  // If no modules are available for this user, redirect back
  useEffect(() => {
    if (userRole && financeModules.length === 0) {
      // User has no access to any finance modules, redirect back
      onBack();
    }
  }, [userRole, financeModules.length, onBack]);

  const handleNavigate = (moduleId: string) => {
    console.log("FinanceDashboard handleNavigate called with moduleId:", moduleId);
    // Special handling for reports module
    if (moduleId === "reports") {
      console.log("Financial reports module clicked");
      onNavigate("statements-reports");
      return;
    }
    // Special handling for financial statements module
    if (moduleId === "financial-statements") {
      console.log("Financial statements module clicked");
      onNavigate("financial-reports");
      return;
    }
    console.log("Navigating to moduleId:", moduleId);
    onNavigate(moduleId);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Main content without Navigation since it's now in AdvancedLayout */}
      <main className="container mx-auto p-4 sm:p-6">
        <div className="mb-8 sm:mb-10">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">Financial Management</h2>
          <p className="text-muted-foreground text-sm sm:text-base md:text-lg">
            Manage your business finances and view financial reports
          </p>
        </div>
        
        {financeModules.length > 0 ? (
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 sm:gap-5 auto-rows-fr">
            {financeModules.map((module) => (
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
              You don't have permission to access any finance modules.
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