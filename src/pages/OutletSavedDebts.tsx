import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  FileText,
  Eye,
  Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface OutletSavedDebtsProps {
  onBack: () => void;
  outletId?: string;
}

interface SavedSale {
  id: string;
  invoiceNumber: string;
  date: string;
  customer: string;
  items: { name: string; quantity: number; price: number }[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  status: string;
}

export const OutletSavedDebts = ({ onBack, outletId }: OutletSavedDebtsProps) => {
  const { toast } = useToast();
  const [sales, setSales] = useState<SavedSale[]>([]);

  useEffect(() => {
    if (outletId) {
      const savedSalesKey = `outlet_${outletId}_saved_debts`;
      const saved = localStorage.getItem(savedSalesKey);
      if (saved) {
        setSales(JSON.parse(saved));
      }
    }
  }, [outletId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleDelete = (saleId: string) => {
    if (outletId) {
      const savedSalesKey = `outlet_${outletId}_saved_debts`;
      const updatedSales = sales.filter(s => s.id !== saleId);
      localStorage.setItem(savedSalesKey, JSON.stringify(updatedSales));
      setSales(updatedSales);
      toast({
        title: "Debt Deleted",
        description: "The debt record has been removed"
      });
    }
  };

  const totalDebt = sales.reduce((sum, sale) => sum + sale.total, 0);

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Saved Debts
          </h1>
          <p className="text-muted-foreground">View and manage debt transactions</p>
        </div>
        <div className="text-right">
          <Badge variant="outline" className="text-lg px-4 py-2">
            {sales.length} Debts
          </Badge>
          <p className="text-sm text-muted-foreground mt-1">Total: {formatCurrency(totalDebt)}</p>
        </div>
      </div>

      <div className="space-y-4">
        {sales.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Saved Debts</h3>
              <p className="text-muted-foreground">Debt transactions will appear here after completion</p>
            </CardContent>
          </Card>
        ) : (
          sales.map((sale) => (
            <Card key={sale.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-semibold">{sale.invoiceNumber}</span>
                      <Badge className="bg-red-100 text-red-800">{sale.status}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span>{sale.date}</span>
                      <span className="mx-2">•</span>
                      <span className="font-medium text-red-600">{sale.customer || 'Unknown Customer'}</span>
                      <span className="mx-2">•</span>
                      <span>{sale.items.length} items</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-red-600">{formatCurrency(sale.total)}</p>
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleDelete(sale.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
