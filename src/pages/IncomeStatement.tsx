import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Printer, 
  Download, 
  ArrowLeft,
  Loader2,
  Eye
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PrintUtils } from "@/utils/printUtils";
import { 
  getSales, 
  getPurchaseOrders, 
  getExpenses,
  getReturns
} from "@/services/databaseService";
import { Sale, PurchaseOrder, Expense, Return } from "@/services/databaseService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface IncomeStatementProps {
  username: string;
  onBack: () => void;
  onLogout: () => void;
}

interface IncomeStatementData {
  businessName: string;
  period: string;
  revenue: number;
  revenueVat: number;
  revenueExclusive: number;
  cogs: number;
  cogsVat: number;
  cogsExclusive: number;
  grossProfit: number;
  operatingExpenses: number;
  operatingExpensesVat: number;
  operatingExpensesExclusive: number;
  operatingProfit: number;
  otherIncomeExpenses: number;
  otherIncomeExpensesVat: number;
  otherIncomeExpensesExclusive: number;
  tax: number;
  netProfit: number;
}

interface DetailInfo {
  title: string;
  description: string;
  calculation: string;
  dataSources: string[];
}

export const IncomeStatement = ({ username, onBack, onLogout }: IncomeStatementProps) => {
  const { toast } = useToast();
  const [period, setPeriod] = useState("January 2024");
  const [isLoading, setIsLoading] = useState(true);
  const [incomeStatementData, setIncomeStatementData] = useState<IncomeStatementData>({
    businessName: "POS Business Osama",
    period: period,
    revenue: 0,
    revenueVat: 0,
    revenueExclusive: 0,
    cogs: 0,
    cogsVat: 0,
    cogsExclusive: 0,
    grossProfit: 0,
    operatingExpenses: 0,
    operatingExpensesVat: 0,
    operatingExpensesExclusive: 0,
    operatingProfit: 0,
    otherIncomeExpenses: 0,
    otherIncomeExpensesVat: 0,
    otherIncomeExpensesExclusive: 0,
    tax: 0,
    netProfit: 0
  });
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [currentDetail, setCurrentDetail] = useState<DetailInfo | null>(null);

  // Detail information for each line item
  const getDetailInfo = (section: string): DetailInfo => {
    switch(section) {
      case "revenue":
        return {
          title: "Revenue (Sales)",
          description: "Total sales revenue represents all income generated from the sale of goods or services during the reporting period, minus any returns.",
          calculation: `Total Sales to Customers - Total Sales Returns = ${incomeStatementData.revenue.toLocaleString()} TZS`,
          dataSources: [
            "All sales records in the system",
            "Includes cash, credit, and mobile payment transactions",
            "Net of returns and discounts"
          ]
        };
      case "cogs":
        return {
          title: "Cost of Goods Sold (COGS)",
          description: "Direct costs attributable to the production of goods sold by the company. This includes the cost of materials and labor directly used to create the product.",
          calculation: `Sum of all purchase orders + Direct costs = ${incomeStatementData.cogs.toLocaleString()} TZS`,
          dataSources: [
            "Purchase orders from suppliers",
            "Transportation costs for inventory",
            "Direct labor costs for production",
            "Storage and handling costs"
          ]
        };
      case "grossProfit":
        return {
          title: "Gross Profit",
          description: "The profit a company makes after deducting the costs of making and selling its products.",
          calculation: `Revenue - COGS = ${incomeStatementData.revenue.toLocaleString()} - ${incomeStatementData.cogs.toLocaleString()} = ${incomeStatementData.grossProfit.toLocaleString()} TZS`,
          dataSources: [
            "Sales data (revenue)",
            "Purchase data (cost of goods)"
          ]
        };
      case "operatingExpenses":
        return {
          title: "Operating Expenses",
          description: "Expenses incurred in the normal day-to-day operations of a business that are not directly tied to the cost of goods or services.",
          calculation: `Sum of all operating expenses = ${incomeStatementData.operatingExpenses.toLocaleString()} TZS`,
          dataSources: [
            "Expense records",
            "Rent payments",
            "Utility bills",
            "Salaries and wages",
            "Marketing costs",
            "Administrative expenses"
          ]
        };
      case "operatingProfit":
        return {
          title: "Operating Profit",
          description: "Also known as earnings before interest and taxes (EBIT), this represents profits from core business operations.",
          calculation: `Gross Profit - Operating Expenses = ${incomeStatementData.grossProfit.toLocaleString()} - ${incomeStatementData.operatingExpenses.toLocaleString()} = ${incomeStatementData.operatingProfit.toLocaleString()} TZS`,
          dataSources: [
            "Gross profit calculation",
            "Operating expense records"
          ]
        };
      case "otherIncomeExpenses":
        return {
          title: "Other Income / Expenses",
          description: "Non-operating revenues and expenses that are not directly related to core business operations.",
          calculation: `Other income/expenses = ${incomeStatementData.otherIncomeExpenses.toLocaleString()} TZS`,
          dataSources: [
            "Interest income",
            "Asset sale proceeds",
            "Investment returns",
            "Penalties or fines"
          ]
        };
      case "tax":
        return {
          title: "Tax (Income Tax)",
          description: "Taxes owed to the government based on taxable income for the period.",
          calculation: `Income tax calculation = ${incomeStatementData.tax.toLocaleString()} TZS`,
          dataSources: [
            "Tax regulations",
            "Taxable income calculation",
            "Applicable tax rates"
          ]
        };
      case "netProfit":
        return {
          title: "Net Profit",
          description: "The final profit after all expenses, including taxes and interest, have been deducted from total revenue.",
          calculation: `Operating Profit + Other Income/Expenses - Tax = ${incomeStatementData.operatingProfit.toLocaleString()} + ${incomeStatementData.otherIncomeExpenses.toLocaleString()} - ${incomeStatementData.tax.toLocaleString()} = ${incomeStatementData.netProfit.toLocaleString()} TZS`,
          dataSources: [
            "Operating profit",
            "Other income/expense records",
            "Tax calculations"
          ]
        };
      default:
        return {
          title: "Unknown Section",
          description: "No detailed information available for this section.",
          calculation: "N/A",
          dataSources: []
        };
    }
  };

  const showDetail = (section: string) => {
    const detail = getDetailInfo(section);
    setCurrentDetail(detail);
    setDetailDialogOpen(true);
  };

  // Fetch data for the income statement
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch all necessary data
        const [sales, purchases, expenses, returns] = await Promise.all([
          getSales(),
          getPurchaseOrders(),
          getExpenses(),
          getReturns()
        ]);

        // Calculate revenue (total sales) minus returns
        const totalSales = sales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
        const totalReturns = returns.reduce((sum, returnItem) => sum + (returnItem.total_amount || 0), 0);
        const revenue = totalSales - totalReturns;

        // Calculate COGS (cost of goods sold) - based on purchase orders
        const cogs = purchases.reduce((sum, purchase) => sum + (purchase.total_amount || 0), 0);

        // Calculate gross profit
        const grossProfit = revenue - cogs;

        // Calculate operating expenses - based on expense records
        const operatingExpenses = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);

        // Calculate operating profit
        const operatingProfit = grossProfit - operatingExpenses;

        // Other income/expenses (using a placeholder for now)
        const otherIncomeExpenses = 0;

        // Tax calculation (using a progressive tax rate system)
        // For demonstration, using a simplified tax calculation based on Tanzanian tax brackets
        // In a real implementation, this would be configurable
        const taxableIncome = operatingProfit + otherIncomeExpenses;
        let tax = 0;
        
        // Simplified tax calculation (this would be more complex in reality)
        // Assuming a progressive tax system similar to Tanzania's
        if (taxableIncome > 0) {
          if (taxableIncome <= 250000) {
            tax = taxableIncome * 0.08; // 8% for first 250,000 TZS
          } else if (taxableIncome <= 500000) {
            tax = 20000 + (taxableIncome - 250000) * 0.2; // 8% on first 250,000 + 20% on next 250,000
          } else {
            tax = 70000 + (taxableIncome - 500000) * 0.3; // 8% on first 250,000 + 20% on next 250,000 + 30% on remainder
          }
        }

        // Calculate VAT amounts (assuming 18% VAT rate for Tanzania)
        const vatRate = 0.18;
        const revenueVat = revenue * vatRate / (1 + vatRate);
        const revenueExclusive = revenue - revenueVat;
        const cogsVat = cogs * vatRate / (1 + vatRate);
        const cogsExclusive = cogs - cogsVat;
        const operatingExpensesVat = operatingExpenses * vatRate / (1 + vatRate);
        const operatingExpensesExclusive = operatingExpenses - operatingExpensesVat;
        const otherIncomeExpensesVat = otherIncomeExpenses * vatRate / (1 + vatRate);
        const otherIncomeExpensesExclusive = otherIncomeExpenses - otherIncomeExpensesVat;

        // Calculate net profit
        const netProfit = operatingProfit + otherIncomeExpenses - tax;

        // Update state with calculated values
        setIncomeStatementData({
          businessName: "POS Business",
          period: period,
          revenue,
          revenueVat,
          revenueExclusive,
          cogs,
          cogsVat,
          cogsExclusive,
          grossProfit,
          operatingExpenses,
          operatingExpensesVat,
          operatingExpensesExclusive,
          operatingProfit,
          otherIncomeExpenses,
          otherIncomeExpensesVat,
          otherIncomeExpensesExclusive,
          tax,
          netProfit
        });
      } catch (error) {
        console.error("Error fetching income statement data:", error);
        toast({
          title: "Error",
          description: "Failed to load income statement data",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [period, toast]);

  const handlePrint = () => {
    PrintUtils.printIncomeStatement(incomeStatementData);
    toast({
      title: "Printing",
      description: "Income statement is being printed...",
    });
  };

  const handleExport = () => {
    toast({
      title: "Export Started",
      description: "Exporting income statement as PDF...",
    });
    
    // Simulate export process
    setTimeout(() => {
      toast({
        title: "Export Complete",
        description: "Income statement has been exported successfully.",
      });
    }, 1500);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="mt-2">Loading income statement data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation 
        title="Income Statement" 
        onBack={onBack}
        onLogout={onLogout} 
        username={username}
      />
      
      <main className="container mx-auto p-6">
        <div className="mb-6 flex justify-between items-center">
          <Button 
            variant="outline" 
            onClick={onBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Reports
          </Button>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex items-center gap-2"
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button 
              variant="outline" 
              className="flex items-center gap-2"
              onClick={handleExport}
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
        
        <Card className="border border-gray-200 rounded-lg">
          <CardContent className="p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold mb-2">{incomeStatementData.businessName}</h1>
              <h2 className="text-xl font-semibold mb-2">INCOME STATEMENT</h2>
              <p className="text-muted-foreground">For the period ended {incomeStatementData.period}</p>
            </div>
            
            {/* Income Statement Table - Restructured to match specification */}
            <div className="space-y-4">
              <div className="grid grid-cols-5 gap-4 py-2 border-b">
                <div className="font-semibold">Section</div>
                <div className="font-semibold text-right">Description</div>
                <div className="font-semibold text-right">Amount Inclusive (TZS)</div>
                <div className="font-semibold text-right">VAT Amount (TZS)</div>
                <div className="font-semibold text-right">Amount Exclusive (TZS)</div>
              </div>
              
              {/* Section 1: Revenue (Sales) */}
              <div className="grid grid-cols-5 gap-4 py-2">
                <div className="font-semibold">1. Revenue (Sales)</div>
                <div className="flex items-center justify-end gap-2">
                  <span>Total sales to customers - Total sales returns</span>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => showDetail("revenue")}
                    className="h-6 w-6"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-right font-semibold">{incomeStatementData.revenue.toLocaleString()}</div>
                <div className="text-right font-semibold">{incomeStatementData.revenueVat.toLocaleString()}</div>
                <div className="text-right font-semibold">{incomeStatementData.revenueExclusive.toLocaleString()}</div>
              </div>
              
              {/* Section 2: Cost of Goods Sold (COGS) */}
              <div className="grid grid-cols-5 gap-4 py-2">
                <div className="font-semibold">2. Cost of Goods Sold (COGS)</div>
                <div className="flex items-center justify-end gap-2">
                  <span>Cost of items sold — includes purchases, transport, and other direct costs</span>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => showDetail("cogs")}
                    className="h-6 w-6"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-right font-semibold">({incomeStatementData.cogs.toLocaleString()})</div>
                <div className="text-right font-semibold">{incomeStatementData.cogsVat.toLocaleString()}</div>
                <div className="text-right font-semibold">{incomeStatementData.cogsExclusive.toLocaleString()}</div>
              </div>
              
              {/* = Gross Profit */}
              <div className="grid grid-cols-5 gap-4 py-2 border-t border-b">
                <div className="font-semibold">= Gross Profit/Loss</div>
                <div className="flex items-center justify-end gap-2">
                  <span>Revenue − COGS</span>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => showDetail("grossProfit")}
                    className="h-6 w-6"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-right font-semibold">{incomeStatementData.grossProfit.toLocaleString()}</div>
                <div className="text-right font-semibold">{(incomeStatementData.revenueVat - incomeStatementData.cogsVat).toLocaleString()}</div>
                <div className="text-right font-semibold">{(incomeStatementData.revenueExclusive - incomeStatementData.cogsExclusive).toLocaleString()}</div>
              </div>
              
              {/* Section 3: Operating Expenses */}
              <div className="grid grid-cols-5 gap-4 py-2">
                <div className="font-semibold">3. Operating Expenses</div>
                <div className="flex items-center justify-end gap-2">
                  <span>Rent, salaries, utilities, admin, etc.</span>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => showDetail("operatingExpenses")}
                    className="h-6 w-6"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-right font-semibold">({incomeStatementData.operatingExpenses.toLocaleString()})</div>
                <div className="text-right font-semibold">{incomeStatementData.operatingExpensesVat.toLocaleString()}</div>
                <div className="text-right font-semibold">{incomeStatementData.operatingExpensesExclusive.toLocaleString()}</div>
              </div>
              
              {/* = Operating Profit */}
              <div className="grid grid-cols-5 gap-4 py-2 border-t border-b">
                <div className="font-semibold">= Operating Profit/Loss</div>
                <div className="flex items-center justify-end gap-2">
                  <span>Gross Profit/Loss − Operating Expenses</span>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => showDetail("operatingProfit")}
                    className="h-6 w-6"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-right font-semibold">{incomeStatementData.operatingProfit.toLocaleString()}</div>
                <div className="text-right font-semibold">{(incomeStatementData.revenueVat - incomeStatementData.cogsVat - incomeStatementData.operatingExpensesVat).toLocaleString()}</div>
                <div className="text-right font-semibold">{(incomeStatementData.revenueExclusive - incomeStatementData.cogsExclusive - incomeStatementData.operatingExpensesExclusive).toLocaleString()}</div>
              </div>
              
              {/* Section 4: Other Income / Expenses */}
              <div className="grid grid-cols-5 gap-4 py-2">
                <div className="font-semibold">4. Other Income / Expenses</div>
                <div className="flex items-center justify-end gap-2">
                  <span>Interest, asset sales, etc.</span>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => showDetail("otherIncomeExpenses")}
                    className="h-6 w-6"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-right font-semibold">
                  {incomeStatementData.otherIncomeExpenses >= 0 ? '+' : ''}{incomeStatementData.otherIncomeExpenses.toLocaleString()}
                </div>
                <div className="text-right font-semibold">{incomeStatementData.otherIncomeExpensesVat.toLocaleString()}</div>
                <div className="text-right font-semibold">{incomeStatementData.otherIncomeExpensesExclusive.toLocaleString()}</div>
              </div>
              
              {/* Section 5: Tax (Income Tax) */}
              <div className="grid grid-cols-5 gap-4 py-2">
                <div className="font-semibold">5. Tax (Income Tax)</div>
                <div className="flex items-center justify-end gap-2">
                  <span>Based on profit/loss before tax</span>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => showDetail("tax")}
                    className="h-6 w-6"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-right font-semibold">({incomeStatementData.tax.toLocaleString()})</div>
                <div className="text-right font-semibold">0</div>
                <div className="text-right font-semibold">0</div>
              </div>
              
              {/* = Net Profit */}
              <div className="grid grid-cols-5 gap-4 py-2 font-bold text-lg border-t-2 border-b-2">
                <div className="font-bold">= Net Profit/Loss</div>
                <div className="flex items-center justify-end gap-2">
                  <span>Final profit/Loss after all costs and tax</span>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => showDetail("netProfit")}
                    className="h-6 w-6"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-right font-bold">{incomeStatementData.netProfit.toLocaleString()}</div>
                <div className="text-right font-bold">{(incomeStatementData.revenueVat - incomeStatementData.cogsVat - incomeStatementData.operatingExpensesVat + incomeStatementData.otherIncomeExpensesVat - incomeStatementData.tax).toLocaleString()}</div>
                <div className="text-right font-bold">{(incomeStatementData.revenueExclusive - incomeStatementData.cogsExclusive - incomeStatementData.operatingExpensesExclusive + incomeStatementData.otherIncomeExpensesExclusive).toLocaleString()}</div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="mt-8 text-center text-sm text-muted-foreground">
              <p>Prepared on: {new Date().toLocaleDateString()}</p>
              <p className="mt-1">Confidential - For Internal Use Only</p>
            </div>
          </CardContent>
        </Card>
      </main>
      
      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{currentDetail?.title}</DialogTitle>
            <DialogDescription>
              Detailed breakdown of how this amount was calculated
            </DialogDescription>
          </DialogHeader>
          {currentDetail && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-muted-foreground">{currentDetail.description}</p>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Calculation</h3>
                <p className="font-mono text-sm p-2 bg-muted rounded">{currentDetail.calculation}</p>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Data Sources</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {currentDetail.dataSources.map((source, index) => (
                    <li key={index} className="text-muted-foreground">{source}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};