import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  TrendingDown,
  Wallet,
  PiggyBank
} from "lucide-react";
import { DashboardCard } from "@/components/DashboardCard";
import { formatCurrency } from "@/lib/currency";

interface CapitalManagementProps {
  username: string;
  onBack: () => void;
  onLogout: () => void;
}

export const CapitalManagement = ({ username, onBack, onLogout }: CapitalManagementProps) => {
  const [activeTab, setActiveTab] = useState<"invest" | "withdraw">("invest");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Capital Management</h1>
              <p className="text-muted-foreground">Manage business capital and investments</p>
            </div>
            <Button variant="outline" onClick={onBack}>
              ← Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 sm:p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Capital Operations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Invest Capital Card */}
            <DashboardCard
              title="Invest Capital"
              description="Add capital investment to your business"
              icon={TrendingUp}
              onClick={() => setActiveTab("invest")}
              className="bg-white border border-gray-200 hover:shadow-md transition-shadow"
            />

            {/* Withdraw Capital Card */}
            <DashboardCard
              title="Withdraw Capital"
              description="Withdraw capital from your business"
              icon={TrendingDown}
              onClick={() => setActiveTab("withdraw")}
              className="bg-white border border-gray-200 hover:shadow-md transition-shadow"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Total Capital Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Capital</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(125430)}</div>
              <p className="text-xs text-muted-foreground">+12.5% from last month</p>
            </CardContent>
          </Card>
          
          {/* Invested Capital Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Invested Capital</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(98200)}</div>
              <p className="text-xs text-muted-foreground">+8.2% from last month</p>
            </CardContent>
          </Card>
          
          {/* Available Capital Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Capital</CardTitle>
              <PiggyBank className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(27230)}</div>
              <p className="text-xs text-muted-foreground">+2.3% from last month</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {activeTab === "invest" ? "Capital Investment" : "Capital Withdrawal"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                {activeTab === "invest" ? (
                  <TrendingUp className="h-8 w-8 text-primary" />
                ) : (
                  <TrendingDown className="h-8 w-8 text-primary" />
                )}
              </div>
              <h3 className="text-xl font-semibold mb-2">
                {activeTab === "invest" ? "Capital Investment Management" : "Capital Withdrawal Management"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {activeTab === "invest" 
                  ? "Manage capital investments into your business" 
                  : "Manage capital withdrawals from your business"}
              </p>
              <Button>
                {activeTab === "invest" ? "Start Investing Capital" : "Start Withdrawing Capital"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};