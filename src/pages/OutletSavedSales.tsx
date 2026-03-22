import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  Banknote,
  CreditCard,
  Smartphone,
  FileText
} from "lucide-react";

interface OutletSavedSalesProps {
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

export const OutletSavedSales = ({ onBack, outletId }: OutletSavedSalesProps) => {
  const navigationCards: NavigationCard[] = [
    {
      id: "saved-cash-sales",
      title: "Saved Cash Sales",
      description: "View and manage saved cash transactions",
      icon: <Banknote className="h-8 w-8" />,
      route: outletId ? `#/outlet-saved-cash-${outletId}` : "#/saved-cash-sales"
    },
    {
      id: "saved-card-sales",
      title: "Saved Card Sales",
      description: "View and manage saved card transactions",
      icon: <CreditCard className="h-8 w-8" />,
      route: outletId ? `#/outlet-saved-card-${outletId}` : "#/saved-card-sales"
    },
    {
      id: "saved-mobile-sales",
      title: "Saved Mobile Money Sales",
      description: "View and manage saved mobile money transactions",
      icon: <Smartphone className="h-8 w-8" />,
      route: outletId ? `#/outlet-saved-mobile-${outletId}` : "#/saved-mobile-sales"
    },
    {
      id: "saved-debts",
      title: "Saved Debts",
      description: "View and manage saved debt transactions",
      icon: <FileText className="h-8 w-8" />,
      route: outletId ? `#/outlet-saved-debts-${outletId}` : "#/saved-debts"
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
          <h1 className="text-2xl font-bold">Saved Sales</h1>
          <p className="text-muted-foreground">Select a category to view saved transactions</p>
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
