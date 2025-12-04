import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart, 
  PieChart, 
  TrendingUp, 
  Wallet, 
  FileText, 
  Calendar,
  Download,
  Filter,
  Eye,
  Plus,
  Printer,
  Save
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PrintUtils } from "@/utils/printUtils";
import { getTaxRecords, TaxRecord, getAssets, Asset, getAssetTransactions, AssetTransaction } from "@/services/databaseService";

interface FinancialReportsProps {
  username: string;
  onBack: () => void;
  onLogout: () => void;
  onNavigate?: (destination: string) => void;
}

// Define types for our report data
interface ReportData {
  title: string;
  description?: string;
  period?: string;
  data: { name: string; value: number }[];
}

interface IncomeData {
  revenues: number;
  cogs: number;
  grossProfit: number;
  operatingExpenses: number;
  operatingProfit: number;
  otherIncomeExpenses: number;
  tax: number;
  netProfit: number;
  period: string;
}

interface BalanceData {
  assets: number;
  liabilities: number;
  equity: number;
  period: string;
}

interface CashFlowData {
  operating: number;
  investing: number;
  financing: number;
  netCash: number;
  period: string;
}

export const FinancialReports = ({ username, onBack, onLogout, onNavigate }: FinancialReportsProps) => {
  const { toast } = useToast();
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [isCustomReportDialogOpen, setIsCustomReportDialogOpen] = useState(false);
  const [isPrintConfirmationOpen, setIsPrintConfirmationOpen] = useState(false);
  const [isViewReportDialogOpen, setIsViewReportDialogOpen] = useState(false);
  const [isCustomReportViewOpen, setIsCustomReportViewOpen] = useState(false);
  const [isTaxPeriodDialogOpen, setIsTaxPeriodDialogOpen] = useState(false);
  const [isCalculationDialogOpen, setIsCalculationDialogOpen] = useState(false);
  const [calculationData, setCalculationData] = useState<{ title: string; description: string; formula: string; example: string } | null>(null);
  const [taxPeriod, setTaxPeriod] = useState({ startDate: "", endDate: "" });
  const [viewReportData, setViewReportData] = useState<ReportData | null>(null);
  const [customReportViewData, setCustomReportViewData] = useState<ReportData | null>(null);
  const [customReportData, setCustomReportData] = useState({
    title: "",
    description: "",
    reportType: "custom",
    startDate: "",
    endDate: ""
  });

  // Mock data for reports
  const mockIncomeData: IncomeData = {
    revenues: 125000,
    cogs: 75000,
    grossProfit: 50000,
    operatingExpenses: 30000,
    operatingProfit: 20000,
    otherIncomeExpenses: 2000,
    tax: 10000,
    netProfit: 12000,
    period: "January 2024"
  };

  const mockBalanceData: BalanceData = {
    assets: 250000,
    liabilities: 100000,
    equity: 150000,
    period: "December 31, 2023"
  };

  const mockCashFlowData: CashFlowData = {
    operating: 35000,
    investing: -15000,
    financing: 5000,
    netCash: 25000,
    period: "January 2024"
  };

  // Add this function to calculate VAT and depreciation effects
  const calculateAssetFinancials = async () => {
    try {
      // Fetch all assets and transactions
      const assets = await getAssets();
      const transactions = await getAssetTransactions();
      
      // Calculate total VAT from asset transactions
      let totalVat = 0;
      let totalDepreciation = 0;
      
      // Calculate VAT from transactions
      transactions.forEach(transaction => {
        if (transaction.vat_amount) {
          totalVat += transaction.vat_amount;
        }
      });
      
      // Calculate depreciation from assets
      const currentDate = new Date();
      assets.forEach(asset => {
        if (asset.depreciation_rate && asset.purchase_date && asset.status === 'active') {
          const purchaseDate = new Date(asset.purchase_date);
          const yearsOwned = (currentDate.getTime() - purchaseDate.getTime()) / (1000 * 3600 * 24 * 365);
          const annualDepreciation = asset.purchase_price * (asset.depreciation_rate / 100);
          totalDepreciation += annualDepreciation * yearsOwned;
        }
      });
      
      return { totalVat, totalDepreciation };
    } catch (error) {
      console.error('Error calculating asset financials:', error);
      return { totalVat: 0, totalDepreciation: 0 };
    }
  };

  const handleViewReport = async (reportType: string) => {
    // Navigate to specific report pages
    if (reportType === "Income Statement" && onNavigate) {
      onNavigate("income-statement");
      return;
    }
    
    setSelectedReport(reportType);
    
    // For Tax Summary, open period selection dialog first
    if (reportType === "Tax Summary") {
      setIsTaxPeriodDialogOpen(true);
      return;
    }
    
    // Prepare report data for viewing
    let reportData: ReportData | null = null;
    
    switch(reportType) {
      case "Income Statement":
        // Calculate asset financials
        const incomeAssetFinancials = await calculateAssetFinancials();
        
        // Use detailed income statement structure
        reportData = {
          title: "Income Statement",
          period: mockIncomeData.period,
          data: [
            { name: "1. Revenue (Sales)", value: mockIncomeData.revenues },
            { name: "2. Cost of Goods Sold (COGS)", value: mockIncomeData.cogs },
            { name: "= Gross Profit", value: mockIncomeData.grossProfit },
            { name: "3. Operating Expenses", value: mockIncomeData.operatingExpenses },
            { name: "4. Depreciation Expense", value: incomeAssetFinancials.totalDepreciation },
            { name: "= Operating Profit", value: mockIncomeData.operatingProfit - incomeAssetFinancials.totalDepreciation },
            { name: "5. Other Income / Expenses", value: mockIncomeData.otherIncomeExpenses },
            { name: "6. VAT Payable", value: incomeAssetFinancials.totalVat },
            { name: "7. Tax (Income Tax)", value: mockIncomeData.tax },
            { name: "= Net Profit", value: mockIncomeData.netProfit - incomeAssetFinancials.totalDepreciation - incomeAssetFinancials.totalVat }
          ]
        };
        break;
      case "Balance Sheet":
        // Calculate asset financials
        const balanceAssetFinancials = await calculateAssetFinancials();
        
        // Calculate total asset value considering depreciation
        const assets = await getAssets();
        let totalAssetValue = 0;
        let totalDepreciatedValue = 0;
        
        assets.forEach(asset => {
          if (asset.status === 'active') {
            totalAssetValue += asset.purchase_price;
            totalDepreciatedValue += asset.current_value;
          }
        });
        
        reportData = {
          title: "Balance Sheet",
          period: mockBalanceData.period,
          data: [
            { name: "Total Assets (Book Value)", value: totalAssetValue },
            { name: "Accumulated Depreciation", value: totalAssetValue - totalDepreciatedValue },
            { name: "Net Assets", value: totalDepreciatedValue },
            { name: "Total Liabilities", value: mockBalanceData.liabilities },
            { name: "Total Equity", value: mockBalanceData.equity }
          ]
        };
        break;
      case "Cash Flow":
        reportData = {
          title: "Cash Flow Statement",
          period: mockCashFlowData.period,
          data: [
            { name: "Operating Activities", value: mockCashFlowData.operating },
            { name: "Investing Activities", value: mockCashFlowData.investing },
            { name: "Financing Activities", value: mockCashFlowData.financing },
            { name: "Net Cash Flow", value: mockCashFlowData.netCash }
          ]
        };
        break;
      case "Fund Flow":
        reportData = {
          title: "Fund Flow Statement",
          period: "January 2024",
          data: [
            { name: "Funds from Operations", value: 45000 },
            { name: "Add: Non-operating Inflows", value: 5000 },
            { name: "Total Sources of Funds", value: 50000 },
            { name: "Less: Non-operating Outflows", value: 8000 },
            { name: "Net Increase in Working Capital", value: 12000 },
            { name: "Application of Funds", value: 30000 },
            { name: "Net Increase in Working Capital", value: 12000 },
            { name: "Net Decrease in Working Capital", value: -12000 }
          ]
        };
        break;
      case "Trial Balance":
        reportData = {
          title: "Trial Balance",
          period: "January 2024",
          data: [
            { name: "Cash", value: 25000 },
            { name: "Accounts Receivable", value: 15000 },
            { name: "Inventory", value: 30000 },
            { name: "Equipment", value: 50000 },
            { name: "Accounts Payable", value: -10000 },
            { name: "Loans Payable", value: -20000 },
            { name: "Capital", value: -45000 },
            { name: "Retained Earnings", value: -15000 },
            { name: "Sales Revenue", value: -80000 },
            { name: "Cost of Goods Sold", value: 40000 },
            { name: "Operating Expenses", value: 25000 }
          ]
        };
        break;
      case "Expense Report":
        reportData = {
          title: "Expense Report",
          period: "January 2024",
          data: [
            { name: "Office Expenses", value: 15000 },
            { name: "Travel Expenses", value: 8000 },
            { name: "Utilities", value: 5000 },
            { name: "Supplies", value: 3000 }
          ]
        };
        break;
      case "Profitability Analysis":
        reportData = {
          title: "Profitability Analysis",
          period: "January 2024",
          data: [
            { name: "Gross Profit Margin", value: 32 },
            { name: "Operating Profit Margin", value: 15 },
            { name: "Net Profit Margin", value: 12 },
            { name: "Return on Investment", value: 18 }
          ]
        };
        break;
      default:
        reportData = {
          title: reportType,
          period: "Current Period",
          data: [
            { name: "Metric 1", value: 1000 },
            { name: "Metric 2", value: 2000 },
            { name: "Metric 3", value: 3000 }
          ]
        };
    }
    
    setViewReportData(reportData);
    setIsViewReportDialogOpen(true);
  };

  const handleViewTaxSummary = async () => {
    if (!taxPeriod.startDate || !taxPeriod.endDate) {
      toast({
        title: "Error",
        description: "Please select both start and end dates for the tax period.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Fetch actual tax data for the selected period
      const taxRecords = await getTaxRecords();
      
      // Filter tax records by the selected period
      const periodStart = new Date(taxPeriod.startDate);
      const periodEnd = new Date(taxPeriod.endDate);
      
      const filteredTaxRecords = taxRecords.filter(record => {
        const recordStart = new Date(record.period_start);
        const recordEnd = new Date(record.period_end);
        return recordStart >= periodStart && recordEnd <= periodEnd;
      });
      
      const periodText = `${taxPeriod.startDate} to ${taxPeriod.endDate}`;
      
      // Calculate totals by tax type
      let incomeTax = 0;
      let salesTax = 0;
      let propertyTax = 0;
      
      filteredTaxRecords.forEach(record => {
        switch(record.tax_type) {
          case 'income_tax':
            incomeTax += record.tax_amount;
            break;
          case 'sales_tax':
            salesTax += record.tax_amount;
            break;
          case 'property_tax':
            propertyTax += record.tax_amount;
            break;
        }
      });
      
      const totalTaxPaid = incomeTax + salesTax + propertyTax;
      
      const reportData: ReportData = {
        title: "Tax Summary",
        period: periodText,
        data: [
          { name: "Income Tax", value: incomeTax },
          { name: "Sales Tax", value: salesTax },
          { name: "Property Tax", value: propertyTax },
          { name: "Total Tax Paid", value: totalTaxPaid }
        ]
      };
      
      setViewReportData(reportData);
      setIsTaxPeriodDialogOpen(false);
      setIsViewReportDialogOpen(true);
    } catch (error) {
      console.error('Error fetching tax data:', error);
      toast({
        title: "Error",
        description: "Failed to load tax data. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handlePrintReport = (reportType: string) => {
    // Create mock report data for printing
    let reportData: any = {};
    
    switch(reportType) {
      case "Income Statement":
        // Use detailed income statement structure for printing
        reportData = {
          title: "Income Statement",
          period: mockIncomeData.period,
          data: [
            { name: "1. Revenue (Sales)", value: mockIncomeData.revenues },
            { name: "2. Cost of Goods Sold (COGS)", value: mockIncomeData.cogs },
            { name: "= Gross Profit", value: mockIncomeData.grossProfit },
            { name: "3. Operating Expenses", value: mockIncomeData.operatingExpenses },
            { name: "= Operating Profit", value: mockIncomeData.operatingProfit },
            { name: "4. Other Income / Expenses", value: mockIncomeData.otherIncomeExpenses },
            { name: "5. Tax (Income Tax)", value: mockIncomeData.tax },
            { name: "= Net Profit", value: mockIncomeData.netProfit }
          ]
        };
        break;
      case "Balance Sheet":
        reportData = {
          title: "Balance Sheet",
          period: mockBalanceData.period,
          data: [
            { name: "Total Assets", value: mockBalanceData.assets },
            { name: "Total Liabilities", value: mockBalanceData.liabilities },
            { name: "Total Equity", value: mockBalanceData.equity }
          ]
        };
        break;
      case "Cash Flow":
        reportData = {
          title: "Cash Flow Statement",
          period: mockCashFlowData.period,
          data: [
            { name: "Operating Activities", value: mockCashFlowData.operating },
            { name: "Investing Activities", value: mockCashFlowData.investing },
            { name: "Financing Activities", value: mockCashFlowData.financing },
            { name: "Net Cash Flow", value: mockCashFlowData.netCash }
          ]
        };
        break;
      case "Fund Flow":
        reportData = {
          title: "Fund Flow Statement",
          period: "January 2024",
          data: [
            { name: "Funds from Operations", value: 45000 },
            { name: "Add: Non-operating Inflows", value: 5000 },
            { name: "Total Sources of Funds", value: 50000 },
            { name: "Less: Non-operating Outflows", value: 8000 },
            { name: "Net Increase in Working Capital", value: 12000 },
            { name: "Application of Funds", value: 30000 },
            { name: "Net Increase in Working Capital", value: 12000 },
            { name: "Net Decrease in Working Capital", value: -12000 }
          ]
        };
        break;
      case "Trial Balance":
        reportData = {
          title: "Trial Balance",
          period: "January 2024",
          data: [
            { name: "Cash", value: 25000 },
            { name: "Accounts Receivable", value: 15000 },
            { name: "Inventory", value: 30000 },
            { name: "Equipment", value: 50000 },
            { name: "Accounts Payable", value: -10000 },
            { name: "Loans Payable", value: -20000 },
            { name: "Capital", value: -45000 },
            { name: "Retained Earnings", value: -15000 },
            { name: "Sales Revenue", value: -80000 },
            { name: "Cost of Goods Sold", value: 40000 },
            { name: "Operating Expenses", value: 25000 }
          ]
        };
        break;
      default:
        reportData = {
          title: reportType,
          period: "Current Period",
          data: [
            { name: "Metric 1", value: 1000 },
            { name: "Metric 2", value: 2000 },
            { name: "Metric 3", value: 3000 }
          ]
        };
    }
    
    PrintUtils.printFinancialReport(reportData);
  };

  const handleExportReport = (reportType: string) => {
    toast({
      title: "Export Started",
      description: `Exporting ${reportType} report as PDF...`,
    });
    
    // Simulate export process
    setTimeout(() => {
      toast({
        title: "Export Complete",
        description: `${reportType} report has been exported successfully.`,
      });
    }, 1500);
  };

  const handleCreateCustomReport = () => {
    if (!customReportData.title) {
      toast({
        title: "Error",
        description: "Please enter a title for your custom report.",
        variant: "destructive"
      });
      return;
    }

    if (!customReportData.startDate || !customReportData.endDate) {
      toast({
        title: "Error",
        description: "Please select both start and end dates.",
        variant: "destructive"
      });
      return;
    }

    // Create the custom report data for viewing
    const reportData: ReportData = {
      title: customReportData.title,
      description: customReportData.description,
      period: `${customReportData.startDate} to ${customReportData.endDate}`,
      data: [
        { name: "Report Type", value: customReportData.reportType === "custom" ? 1 : customReportData.reportType === "sales" ? 2 : 3 },
        { name: "Start Date", value: new Date(customReportData.startDate).getTime() },
        { name: "End Date", value: new Date(customReportData.endDate).getTime() },
        { name: "Created", value: Date.now() }
      ]
    };

    setCustomReportViewData(reportData);
    
    // Close the creation dialog and open the view dialog
    setIsCustomReportDialogOpen(false);
    setIsCustomReportViewOpen(true);
    
    toast({
      title: "Custom Report Created",
      description: `Your custom report "${customReportData.title}" has been created successfully.`,
    });
  };

  const handlePrintCustomReport = () => {
    // Create mock report data for printing
    const reportData = {
      title: customReportData.title,
      description: customReportData.description,
      reportType: customReportData.reportType,
      period: `${customReportData.startDate} to ${customReportData.endDate}`,
      data: [
        { name: "Report Type", value: customReportData.reportType === "custom" ? 1 : customReportData.reportType === "sales" ? 2 : 3 },
        { name: "Start Date", value: new Date(customReportData.startDate).getTime() },
        { name: "End Date", value: new Date(customReportData.endDate).getTime() }
      ]
    };
    
    PrintUtils.printFinancialReport(reportData);
    
    // Close dialogs
    setIsPrintConfirmationOpen(false);
    setIsCustomReportDialogOpen(false);
    
    // Reset form
    setCustomReportData({
      title: "",
      description: "",
      reportType: "custom",
      startDate: "",
      endDate: ""
    });
    
    toast({
      title: "Printing",
      description: "Your custom report is being printed...",
    });
  };

  const handleSaveCustomReport = () => {
    // Just save without printing
    setIsPrintConfirmationOpen(false);
    setIsCustomReportDialogOpen(false);
    
    // Reset form
    setCustomReportData({
      title: "",
      description: "",
      reportType: "custom",
      startDate: "",
      endDate: ""
    });
    
    toast({
      title: "Report Saved",
      description: "Your custom report has been saved successfully.",
    });
  };

  const handleSaveAndViewedReport = () => {
    // Save the viewed custom report
    setIsCustomReportViewOpen(false);
    
    // Reset form
    setCustomReportData({
      title: "",
      description: "",
      reportType: "custom",
      startDate: "",
      endDate: ""
    });
    
    toast({
      title: "Report Saved",
      description: "Your custom report has been saved successfully.",
    });
  };

  const handlePrintAndViewedReport = () => {
    // Print the viewed custom report
    if (customReportViewData) {
      PrintUtils.printFinancialReport(customReportViewData);
      toast({
        title: "Printing",
        description: `${customReportViewData.title} is being printed...`,
      });
    }
    setIsCustomReportViewOpen(false);
    
    // Reset form
    setCustomReportData({
      title: "",
      description: "",
      reportType: "custom",
      startDate: "",
      endDate: ""
    });
  };

  const handleCustomReportInputChange = (field: string, value: string) => {
    setCustomReportData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTaxPeriodChange = (field: string, value: string) => {
    setTaxPeriod(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const reports = [
    {
      id: "income-statement",
      title: "Income Statement",
      description: "View your company's revenues, expenses, and profits over time",
      icon: BarChart,
      color: "bg-blue-50"
    },
    {
      id: "balance-sheet",
      title: "Balance Sheet",
      description: "See your company's assets, liabilities, and equity at a glance",
      icon: PieChart,
      color: "bg-green-50"
    },
    {
      id: "cash-flow",
      title: "Cash Flow",
      description: "Track the flow of cash in and out of your business",
      icon: TrendingUp,
      color: "bg-purple-50"
    },
    {
      id: "fund-flow",
      title: "Fund Flow",
      description: "Analyze sources and applications of funds during a period",
      icon: TrendingUp,
      color: "bg-cyan-50"
    },
    {
      id: "trial-balance",
      title: "Trial Balance",
      description: "Verify accounting accuracy with debit and credit balances",
      icon: FileText,
      color: "bg-amber-50"
    },
    {
      id: "expense-report",
      title: "Expense Report",
      description: "Detailed breakdown of business expenses by category",
      icon: Wallet,
      color: "bg-yellow-50"
    },
    {
      id: "tax-summary",
      title: "Tax Summary",
      description: "Summary of tax obligations and payments",
      icon: FileText,
      color: "bg-red-50"
    },
    {
      id: "profitability",
      title: "Profitability Analysis",
      description: "Analyze which products or services are most profitable",
      icon: TrendingUp,
      color: "bg-indigo-50"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation 
        title="Financial Reports" 
        onBack={onBack}
        onLogout={onLogout} 
        username={username}
      />
      
      <main className="container mx-auto p-6">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Financial Reports</h2>
          <p className="text-muted-foreground">
            Detailed financial statements and analytics
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => {
            const Icon = report.icon;
            return (
              <Card key={report.id} className={`${report.color} border border-gray-200 rounded-lg`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon className="h-5 w-5" />
                    {report.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    {report.description}
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex items-center gap-1"
                      onClick={() => handleViewReport(report.title)}
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex items-center gap-1"
                      onClick={() => handlePrintReport(report.title)}
                    >
                      <Download className="h-4 w-4" />
                      Print
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex items-center gap-1"
                      onClick={() => handleExportReport(report.title)}
                    >
                      <FileText className="h-4 w-4" />
                      Export
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        <div className="mt-8 p-6 bg-white border border-gray-200 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">Custom Reports</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <Filter className="h-4 w-4" />
                Filter
              </Button>
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Date Range
              </Button>
            </div>
          </div>
          <p className="text-muted-foreground mb-4">
            Create custom financial reports based on your specific needs
          </p>
          
          <Dialog open={isCustomReportDialogOpen} onOpenChange={setIsCustomReportDialogOpen}>
            <DialogTrigger asChild>
              <Button className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Create Custom Report
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Custom Report</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Report Title</Label>
                  <Input
                    id="title"
                    value={customReportData.title}
                    onChange={(e) => handleCustomReportInputChange("title", e.target.value)}
                    placeholder="Enter report title"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={customReportData.description}
                    onChange={(e) => handleCustomReportInputChange("description", e.target.value)}
                    placeholder="Enter report description"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="reportType">Report Type</Label>
                  <Select
                    value={customReportData.reportType}
                    onValueChange={(value) => handleCustomReportInputChange("reportType", value)}
                  >
                    <SelectTrigger id="reportType">
                      <SelectValue placeholder="Select report type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">Custom Report</SelectItem>
                      <SelectItem value="sales">Sales Analysis</SelectItem>
                      <SelectItem value="inventory">Inventory Report</SelectItem>
                      <SelectItem value="profitability">Profitability Analysis</SelectItem>
                      <SelectItem value="cashflow">Cash Flow Analysis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={customReportData.startDate}
                      onChange={(e) => handleCustomReportInputChange("startDate", e.target.value)}
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={customReportData.endDate}
                      onChange={(e) => handleCustomReportInputChange("endDate", e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCustomReportDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateCustomReport}>
                  Create Report
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          {/* Tax Period Selection Dialog */}
          <Dialog open={isTaxPeriodDialogOpen} onOpenChange={setIsTaxPeriodDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Select Tax Period</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="taxStartDate">Start Date</Label>
                    <Input
                      id="taxStartDate"
                      type="date"
                      value={taxPeriod.startDate}
                      onChange={(e) => handleTaxPeriodChange("startDate", e.target.value)}
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="taxEndDate">End Date</Label>
                    <Input
                      id="taxEndDate"
                      type="date"
                      value={taxPeriod.endDate}
                      onChange={(e) => handleTaxPeriodChange("endDate", e.target.value)}
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Please select the period range for your tax summary report.
                </p>
              </div>
              <DialogFooter className="flex gap-2">
                <Button variant="outline" onClick={() => setIsTaxPeriodDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleViewTaxSummary}>
                  View Report
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {/* Print Confirmation Dialog */}
          <Dialog open={isPrintConfirmationOpen} onOpenChange={setIsPrintConfirmationOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Print Report</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <p>Your custom report "{customReportData.title}" has been created successfully.</p>
                <p className="mt-2">Would you like to print the report now?</p>
              </div>
              <DialogFooter className="flex gap-2">
                <Button variant="outline" onClick={handleSaveCustomReport}>
                  Save Only
                </Button>
                <Button onClick={handlePrintCustomReport}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print Report
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {/* View Report Dialog */}
          <Dialog open={isViewReportDialogOpen} onOpenChange={setIsViewReportDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {viewReportData?.title}
                </DialogTitle>
              </DialogHeader>
              <div className="py-4">
                {viewReportData?.period && (
                  <p className="text-muted-foreground mb-4">Period: {viewReportData.period}</p>
                )}
                
                <div className="border rounded-lg p-4">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Metric</th>
                        <th className="text-right py-2">Value</th>
                        <th className="text-right py-2">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewReportData?.data.map((item, index) => (
                        <tr key={index} className="border-b">
                          <td className="py-2">{item.name}</td>
                          <td className="py-2 text-right font-medium">
                            {typeof item.value === 'number' && item.value % 1 !== 0 
                              ? item.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                              : typeof item.value === 'number' 
                                ? item.value.toLocaleString()
                                : item.value}
                            {viewReportData.title.includes("Margin") || viewReportData.title.includes("Profitability") ? "%" : ""}
                          </td>
                          <td className="py-2 text-right">
                            {viewReportData?.title === "Income Statement" && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex items-center gap-1"
                                onClick={() => {
                                  // Show detailed calculation card based on the metric
                                  if (item.name === "1. Revenue (Sales)") {
                                    setCalculationData({
                                      title: "Revenue (Sales) Calculation",
                                      description: "Total sales revenue generated from all sales transactions during the period.",
                                      formula: "Total Sales - Sales Returns = Net Sales Revenue",
                                      example: "Total Sales (130,000) - Sales Returns (5,000) = Net Sales Revenue (125,000)"
                                    });
                                  } else if (item.name === "2. Cost of Goods Sold (COGS)") {
                                    setCalculationData({
                                      title: "Cost of Goods Sold (COGS) Calculation",
                                      description: "Direct costs attributable to the production of goods sold during the period.",
                                      formula: "Beginning Inventory + Purchases - Ending Inventory",
                                      example: "Beginning Inventory (20,000) + Purchases (80,000) - Ending Inventory (25,000) = COGS (75,000)"
                                    });
                                  } else if (item.name === "= Gross Profit") {
                                    setCalculationData({
                                      title: "Gross Profit Calculation",
                                      description: "Profit after deducting the cost of goods sold from total revenue.",
                                      formula: "Revenue - Cost of Goods Sold",
                                      example: "Revenue (125,000) - COGS (75,000) = Gross Profit (50,000)"
                                    });
                                  } else if (item.name === "3. Operating Expenses") {
                                    setCalculationData({
                                      title: "Operating Expenses Calculation",
                                      description: "Expenses incurred in the normal day-to-day operations of the business.",
                                      formula: "Sum of all operating expenses",
                                      example: "Salaries (15,000) + Rent (8,000) + Utilities (3,000) + Transport (2,500) + Office Supplies (1,500) + Depreciation (2,000) + Other Expenses (3,000) = Total Operating Expenses (35,000)"
                                    });
                                  } else if (item.name === "= Operating Profit") {
                                    setCalculationData({
                                      title: "Operating Profit Calculation",
                                      description: "Profit generated from normal business operations, excluding taxes and other non-operational expenses.",
                                      formula: "Gross Profit - Operating Expenses",
                                      example: "Gross Profit (50,000) - Operating Expenses (30,000) = Operating Profit (20,000)"
                                    });
                                  } else if (item.name === "4. Other Income / Expenses") {
                                    setCalculationData({
                                      title: "Other Income/Expenses Calculation",
                                      description: "Income or expenses not related to core business operations.",
                                      formula: "Total Other Income - Total Other Expenses",
                                      example: "Interest Income (3,000) - Interest Expense (1,000) = Net Other Income (2,000)"
                                    });
                                  } else if (item.name === "5. Tax (Income Tax)") {
                                    setCalculationData({
                                      title: "Tax Calculation",
                                      description: "Income tax based on taxable income at the applicable tax rate.",
                                      formula: "Taxable Income × Tax Rate",
                                      example: "Taxable Income (22,000) × 45.5% Tax Rate = Tax (10,000)"
                                    });
                                  } else if (item.name === "= Net Profit") {
                                    setCalculationData({
                                      title: "Net Profit Calculation",
                                      description: "Total profit after all expenses, taxes, and costs have been deducted from total revenue.",
                                      formula: "Operating Profit + Other Income - Tax",
                                      example: "Operating Profit (20,000) + Other Income (2,000) - Tax (10,000) = Net Profit (12,000)"
                                    });
                                  }
                                  setIsCalculationDialogOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                                View
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">Report Summary</h4>
                  <p className="text-sm text-muted-foreground">
                    This report provides a comprehensive overview of your financial data. 
                    Use the Print or Export options to save this report for your records.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsViewReportDialogOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => {
                  if (viewReportData) {
                    PrintUtils.printFinancialReport(viewReportData);
                    toast({
                      title: "Printing",
                      description: `${viewReportData.title} is being printed...`,
                    });
                  }
                  setIsViewReportDialogOpen(false);
                }}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print Report
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {/* Custom Report View Dialog */}
          <Dialog open={isCustomReportViewOpen} onOpenChange={setIsCustomReportViewOpen}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {customReportViewData?.title}
                </DialogTitle>
              </DialogHeader>
              <div className="py-4">
                {customReportViewData?.description && (
                  <p className="text-muted-foreground mb-2">{customReportViewData.description}</p>
                )}
                {customReportViewData?.period && (
                  <p className="text-muted-foreground mb-4">Period: {customReportViewData.period}</p>
                )}
                
                <div className="border rounded-lg p-4">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Metric</th>
                        <th className="text-right py-2">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customReportViewData?.data.map((item, index) => (
                        <tr key={index} className="border-b">
                          <td className="py-2">{item.name}</td>
                          <td className="py-2 text-right font-medium">
                            {typeof item.value === 'number' && item.value % 1 !== 0 
                              ? item.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                              : typeof item.value === 'number' 
                                ? item.value.toLocaleString()
                                : item.value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">Report Summary</h4>
                  <p className="text-sm text-muted-foreground">
                    Your custom report has been created successfully. You can save it for future reference or print it now.
                  </p>
                </div>
              </div>
              <DialogFooter className="flex gap-2">
                <Button variant="outline" onClick={() => setIsCustomReportViewOpen(false)}>
                  Close
                </Button>
                <Button variant="outline" onClick={handleSaveAndViewedReport}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Report
                </Button>
                <Button onClick={handlePrintAndViewedReport}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print Report
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {/* Calculation Dialog */}
          <Dialog open={isCalculationDialogOpen} onOpenChange={setIsCalculationDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {calculationData?.title}
                </DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <p className="text-muted-foreground mb-4">
                  {calculationData?.description}
                </p>
                
                <div className="bg-muted p-4 rounded-lg mb-4">
                  <h4 className="font-semibold mb-2">Formula:</h4>
                  <p className="font-mono text-sm">{calculationData?.formula}</p>
                </div>
                
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Example:</h4>
                  <p className="font-mono text-sm">{calculationData?.example}</p>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setIsCalculationDialogOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
};