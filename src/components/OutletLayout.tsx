import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Home, 
  Package, 
  ShoppingCart, 
  BarChart3, 
  Settings,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  User,
  LogOut,
  Truck,
  Store,
  Users,
  CreditCard,
  FileText
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface OutletLayoutProps {
  children: React.ReactNode;
  username?: string;
  onLogout: () => void;
  outletId: string;
  outletName: string;
  currentView: 'dashboard' | 'inventory' | 'sales' | 'customers' | 'deliveries' | 'payments' | 'grn' | 'reports' | 'settings';
}

interface MenuItem {
  id: string;
  title: string;
  icon: React.ReactNode;
  view: string;
}

export const OutletLayout = ({ 
  children, 
  username, 
  onLogout,
  outletId,
  outletName,
  currentView
}: OutletLayoutProps) => {
  console.log("OutletLayout rendered with outletId:", outletId);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Outlet-specific menu items - All Quick Actions
  const menuItems: MenuItem[] = [
    {
      id: "dashboard",
      title: "Dashboard",
      icon: <Home className="h-5 w-5" />,
      view: `outlet-details-${outletId}`
    },
    {
      id: "inventory",
      title: "Products",
      icon: <Package className="h-5 w-5" />,
      view: `outlet-inventory-${outletId}`
    },
    {
      id: "sales",
      title: "New Sale",
      icon: <ShoppingCart className="h-5 w-5" />,
      view: `outlet-sales/${outletId}`
    },
    {
      id: "customers",
      title: "Customers",
      icon: <Users className="h-5 w-5" />,
      view: `outlet-customers-${outletId}`
    },
    {
      id: "deliveries",
      title: "Deliveries",
      icon: <Truck className="h-5 w-5" />,
      view: `outlet-deliveries-${outletId}`
    },
    {
      id: "payments",
      title: "Payments",
      icon: <CreditCard className="h-5 w-5" />,
      view: `outlet-payments-${outletId}`
    },
    {
      id: "grn",
      title: "GRN",
      icon: <FileText className="h-5 w-5" />,
      view: `outlet-grn-${outletId}`
    },
    {
      id: "reports",
      title: "Reports",
      icon: <BarChart3 className="h-5 w-5" />,
      view: `outlet-reports-${outletId}`
    },
    {
      id: "back",
      title: "All Outlets",
      icon: <ChevronLeft className="h-5 w-5" />,
      view: "registered-outlets"
    }
  ];

  const handleNavigation = (view: string) => {
    console.log("OutletLayout handleNavigation called with view:", view);
    console.log("Setting hash to:", `#/${view}`);
    window.location.hash = `#/${view}`;
    setMobileMenuOpen(false);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile menu overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence mode="wait">
        <motion.aside
          initial={false}
          animate={{ 
            width: sidebarOpen ? "240px" : "70px",
            transition: { duration: 0.3, ease: "easeInOut" }
          }}
          className={cn(
            "hidden lg:flex flex-col bg-card border-r shadow-sm z-30 fixed h-full",
            sidebarOpen ? "w-60" : "w-18"
          )}
        >
          {/* Sidebar header */}
          <div className="flex items-center justify-between p-4 border-b">
            <AnimatePresence mode="wait">
              {sidebarOpen ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center space-x-2"
                >
                  <div className="bg-primary rounded-lg p-2">
                    <Store className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold truncate max-w-[140px]">{outletName}</h1>
                    <p className="text-xs text-muted-foreground">Outlet Dashboard</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full flex justify-center"
                >
                  <div className="bg-primary rounded-lg p-2">
                    <Store className="h-6 w-6 text-primary-foreground" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="hidden lg:flex"
            >
              {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {menuItems.map((item) => (
              <Button
                key={item.id}
                variant={currentView === item.id ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3",
                  !sidebarOpen && "justify-center px-2"
                )}
                onClick={() => handleNavigation(item.view)}
              >
                {item.icon}
                {sidebarOpen && <span>{item.title}</span>}
              </Button>
            ))}
          </nav>

          {/* User section */}
          <div className="p-4 border-t">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              {sidebarOpen && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{username || "User"}</p>
                  <p className="text-xs text-muted-foreground">Outlet Manager</p>
                </div>
              )}
            </div>
            <Button
              variant="outline"
              className={cn(
                "w-full gap-2",
                !sidebarOpen && "justify-center px-2"
              )}
              onClick={onLogout}
            >
              <LogOut className="h-4 w-4" />
              {sidebarOpen && <span>Logout</span>}
            </Button>
          </div>
        </motion.aside>
      </AnimatePresence>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b z-30 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="bg-primary rounded-lg p-2">
            <Store className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold">{outletName}</h1>
            <p className="text-xs text-muted-foreground">Outlet Dashboard</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "tween", duration: 0.3 }}
            className="fixed inset-y-0 left-0 w-64 bg-card border-r z-50 lg:hidden pt-16"
          >
            <nav className="p-4 space-y-2">
              {menuItems.map((item) => (
                <Button
                  key={item.id}
                  variant={currentView === item.id ? "default" : "ghost"}
                  className="w-full justify-start gap-3"
                  onClick={() => handleNavigation(item.view)}
                >
                  {item.icon}
                  <span>{item.title}</span>
                </Button>
              ))}
            </nav>
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{username || "User"}</p>
                  <p className="text-xs text-muted-foreground">Outlet Manager</p>
                </div>
              </div>
              <Button variant="outline" className="w-full gap-2" onClick={onLogout}>
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className={cn(
        "flex-1 overflow-auto transition-all duration-300",
        sidebarOpen ? "lg:ml-60" : "lg:ml-18",
        "pt-16 lg:pt-0"
      )}>
        {children}
      </main>
    </div>
  );
};
