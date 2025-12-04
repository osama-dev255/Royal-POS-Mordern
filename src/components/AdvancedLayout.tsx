import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Home, 
  Package, 
  ShoppingCart, 
  Users, 
  BarChart3, 
  Settings,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  User,
  LogOut,
  Wallet,
  Truck,
  FileText
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface AdvancedLayoutProps {
  children: React.ReactNode;
  username?: string;
  onLogout: () => void;
  currentView?: string;
  onNavigate?: (view: string) => void;
}

interface MenuItem {
  id: string;
  title: string;
  icon: React.ReactNode;
  view: string;
  roles: string[];
}

export const AdvancedLayout = ({ 
  children, 
  username, 
  onLogout,
  currentView = "dashboard",
  onNavigate 
}: AdvancedLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState<string>("admin");

  // Menu items configuration
  const menuItems: MenuItem[] = [
    {
      id: "dashboard",
      title: "Dashboard",
      icon: <Home className="h-5 w-5" />,
      view: "comprehensive",
      roles: ["admin", "manager", "cashier", "staff"]
    },
    {
      id: "inventory",
      title: "Inventory",
      icon: <Package className="h-5 w-5" />,
      view: "products",
      roles: ["admin", "manager", "staff"]
    },
    {
      id: "sales",
      title: "Sales",
      icon: <ShoppingCart className="h-5 w-5" />,
      view: "sales",
      roles: ["admin", "manager", "cashier"]
    },
    {
      id: "purchase",
      title: "Purchase",
      icon: <Truck className="h-5 w-5" />,
      view: "purchase",
      roles: ["admin", "manager"]
    },
    {
      id: "finance",
      title: "Finance",
      icon: <Wallet className="h-5 w-5" />,
      view: "finance",
      roles: ["admin", "manager"]
    },
    {
      id: "customers",
      title: "Customers",
      icon: <Users className="h-5 w-5" />,
      view: "customers",
      roles: ["admin", "manager", "cashier"]
    },
    {
      id: "reports",
      title: "Reports",
      icon: <BarChart3 className="h-5 w-5" />,
      view: "reports",
      roles: ["admin", "manager"]
    },
    {
      id: "settings",
      title: "Settings",
      icon: <Settings className="h-5 w-5" />,
      view: "settings",
      roles: ["admin"]
    }
  ];

  // Filter menu items based on user role
  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(userRole)
  );

  const handleNavigation = (view: string) => {
    if (onNavigate) {
      onNavigate(view);
    }
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
                    <Package className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold">Business POS</h1>
                    <p className="text-xs text-muted-foreground">Professional System</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center"
                >
                  <div className="bg-primary rounded-lg p-2">
                    <Package className="h-6 w-6 text-primary-foreground" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSidebar}
              className="h-8 w-8 p-0"
            >
              {sidebarOpen ? (
                <ChevronLeft className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Navigation menu */}
          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1 px-2">
              {filteredMenuItems.map((item) => (
                <motion.li
                  key={item.id}
                  whileHover={{ x: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Button
                    variant={currentView === item.view ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start h-12",
                      sidebarOpen ? "px-3" : "px-2"
                    )}
                    onClick={() => handleNavigation(item.view)}
                  >
                    <span className={cn(
                      "flex items-center",
                      sidebarOpen ? "w-full" : "justify-center"
                    )}>
                      <span className={cn(
                        "flex items-center justify-center",
                        currentView === item.view ? "text-primary" : "text-muted-foreground"
                      )}>
                        {item.icon}
                      </span>
                      <AnimatePresence>
                        {sidebarOpen && (
                          <motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: "auto" }}
                            exit={{ opacity: 0, width: 0 }}
                            className="ml-3 overflow-hidden whitespace-nowrap"
                          >
                            {item.title}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </span>
                  </Button>
                </motion.li>
              ))}
            </ul>
          </nav>

          {/* Sidebar footer */}
          <div className="p-4 border-t">
            <div className={cn(
              "flex items-center",
              sidebarOpen ? "justify-between" : "justify-center"
            )}>
              <div className={cn(
                "flex items-center",
                sidebarOpen ? "space-x-3" : "space-x-0"
              )}>
                <div className="bg-muted rounded-full p-2">
                  <User className="h-4 w-4" />
                </div>
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.div
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="text-sm font-medium">
                        {username || "User"}
                      </div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {userRole}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0 }}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onLogout}
                      className="h-8 w-8 p-0"
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.aside>
      </AnimatePresence>

      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-20">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMobileMenuOpen(true)}
          className="bg-background"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="lg:hidden fixed top-0 left-0 bottom-0 w-64 bg-card border-r shadow-lg z-50"
          >
            {/* Mobile header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center space-x-2">
                <div className="bg-primary rounded-lg p-2">
                  <Package className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-lg font-bold">Business POS</h1>
                  <p className="text-xs text-muted-foreground">Professional System</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Mobile navigation */}
            <nav className="flex-1 overflow-y-auto py-4">
              <ul className="space-y-1 px-2">
                {filteredMenuItems.map((item) => (
                  <li key={item.id}>
                    <Button
                      variant={currentView === item.view ? "secondary" : "ghost"}
                      className="w-full justify-start h-12 px-3"
                      onClick={() => handleNavigation(item.view)}
                    >
                      <span className="flex items-center w-full">
                        <span className={cn(
                          "flex items-center justify-center",
                          currentView === item.view ? "text-primary" : "text-muted-foreground"
                        )}>
                          {item.icon}
                        </span>
                        <span className="ml-3">{item.title}</span>
                      </span>
                    </Button>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Mobile footer */}
            <div className="p-4 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-muted rounded-full p-2">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">
                      {username || "User"}
                    </div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {userRole}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onLogout}
                  className="h-8 w-8 p-0"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:ml-0 overflow-hidden">
        {/* Top bar for mobile */}
        <header className="lg:hidden flex items-center justify-between p-4 border-b bg-card">
          <h1 className="text-lg font-semibold">
            {filteredMenuItems.find(item => item.view === currentView)?.title || "Dashboard"}
          </h1>
          <div className="flex items-center space-x-2">
            <div className="text-sm text-muted-foreground">
              {username || "User"}
            </div>
            <div className="bg-muted rounded-full p-1.5">
              <User className="h-4 w-4" />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
};