import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { Dashboard } from "./pages/Dashboard";
import { SalesDashboard } from "./pages/SalesDashboard";
import { SalesCart } from "./pages/SalesCart";
import { SalesOrders } from "./pages/SalesOrders";
import { TestSalesOrders } from "./pages/TestSalesOrders";
import { PurchaseTerminal } from "./pages/PurchaseTerminal";
import TestPage from "./pages/TestPage";
import { TestQRCode } from "./pages/TestQRCode";
import { TestReceiptQR } from "./pages/TestReceiptQR";
import { QRDebugTest } from "./pages/QRDebugTest";
import QRTestPage from "./pages/QRTestPage";
import TestAssets from "./pages/TestAssets";
import { SavedInvoicesSection } from "@/components/SavedInvoicesSection";
import { useEffect } from "react";
// Import authentication context
import { AuthProvider } from "@/contexts/AuthContext";
// Import language context
import { LanguageProvider } from "@/contexts/LanguageContext";

// Import Supabase test function
import { testSupabaseConnection } from "@/services/supabaseService";
import { testRLSPolicies } from "@/services/databaseService";
import { testAssetTables } from "@/services/databaseService";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // Test Supabase connection on app start
    testSupabaseConnection().then((isConnected) => {
      if (isConnected) {
        console.log("Successfully connected to Supabase!");
      } else {
        console.warn("Failed to connect to Supabase. Please check your credentials in the .env file.");
      }
    });
    
    // Test RLS policies
    testRLSPolicies().then((policiesOk) => {
      if (policiesOk) {
        console.log("RLS policies are correctly configured!");
      } else {
        console.warn("RLS policies need to be configured. Please run the FIX_RLS_POLICIES.sql script in your Supabase SQL editor.");
      }
    });
    
    // Test asset tables
    testAssetTables().then((assetsOk) => {
      if (assetsOk) {
        console.log("Asset tables are correctly configured!");
      } else {
        console.warn("Asset tables need to be configured. Please run the SUPABASE_COMPLETE_SCHEMA.sql script in your Supabase SQL editor.");
      }
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/register" element={<Index />} />
                <Route path="/dashboard" element={<Dashboard username="admin" onNavigate={() => {}} onLogout={() => {}} />} />
                <Route path="/sales" element={<SalesDashboard username="admin" onBack={() => {}} onLogout={() => {}} onNavigate={() => {}} />} />
                <Route path="/sales/cart" element={<Index />} />
                <Route path="/sales/orders" element={<SalesOrders username="admin" onBack={() => {}} onLogout={() => {}} />} />
                <Route path="/test/sales-orders" element={<TestSalesOrders username="admin" onBack={() => {}} onLogout={() => {}} />} />
                <Route path="/purchase/terminal" element={<PurchaseTerminal username="admin" onBack={() => {}} onLogout={() => {}} />} />
                <Route path="/test" element={<TestPage />} />
                <Route path="/test/qr" element={<TestQRCode />} />
                <Route path="/test/receipt-qr" element={<TestReceiptQR />} />
                <Route path="/test/qr-debug" element={<QRDebugTest />} />
                <Route path="/test/qr-test" element={<QRTestPage />} />
                <Route path="/test/assets" element={<TestAssets />} />
                <Route path="/sales/saved-invoices" element={<SavedInvoicesSection username="admin" onBack={() => window.history.back()} onLogout={() => {}} />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </LanguageProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;