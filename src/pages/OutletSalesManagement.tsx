import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ShoppingCart, 
  ArrowLeft, 
  Store,
  FileText,
  Save,
  Users
} from "lucide-react";

interface OutletSalesManagementProps {
  onBack: () => void;
  outletId?: string;
}

interface NavigationCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  route: string;
}

export const OutletSalesManagement = ({ onBack, outletId }: OutletSalesManagementProps) => {
  const navigationCards: NavigationCard[] = [
    {
      id: "sales-terminal",
      title: "Sales Terminal",
      description: "Create new sales and process transactions",
      icon: <Store className="h-8 w-8" />,
      route: outletId ? `#/outlet-sales/${outletId}` : "#/sales-cart"
    },
    {
      id: "sales-orders",
      title: "Sales Orders",
      description: "View and manage all sales orders",
      icon: <FileText className="h-8 w-8" />,
      route: "#/sales-orders"
    },
    {
      id: "saved-sales",
      title: "Saved Sales",
      description: "Access saved and pending sales",
      icon: <Save className="h-8 w-8" />,
      route: "#/saved-sales"
    },
    {
      id: "customers",
      title: "Customers",
      description: "Manage customer information and history",
      icon: <Users className="h-8 w-8" />,
      route: outletId ? `#/outlet-customers-${outletId}` : "#/customers"
    }
  ];

  const handleNavigation = (route: string) => {
    window.location.hash = route;
  };

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="outline" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Sales Management</h1>
          <p className="text-muted-foreground">Select an option to manage sales operations</p>
        </div>
      </div>

      {/* Navigation Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {navigationCards.map((card) => (
          <Card 
            key={card.id}
            className="cursor-pointer hover:shadow-lg transition-shadow hover:border-primary/50"
            onClick={() => handleNavigation(card.route)}
          >
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="p-4 rounded-full bg-primary/10 text-primary">
                  {card.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{card.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{card.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>


    </div>
  );
};
