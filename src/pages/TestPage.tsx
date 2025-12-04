import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { createProduct, getProducts } from "@/services/databaseService";
import { Link } from "react-router-dom";

export const TestPage = () => {
  const [testResult, setTestResult] = useState<string>("");
  const [products, setProducts] = useState<any[]>([]);
  const { toast } = useToast();

  const debugProductCreation = async () => {
    setTestResult("Debugging product creation...");
    
    try {
      // Test with the exact same data structure as ProductManagement.tsx
      const testProduct = {
        name: "Debug Test Product",
        category_id: null,
        selling_price: 49.99,
        cost_price: 25.00,
        stock_quantity: 15,
        barcode: "",
        sku: "",
        description: "",
        unit_of_measure: "piece",
        wholesale_price: 0,
        min_stock_level: 0,
        max_stock_level: 10000,
        is_active: true
      };

      console.log("Debug: Attempting to create product with data:", testProduct);
      setTestResult("Debug: Attempting to create product with data: " + JSON.stringify(testProduct, null, 2));
      
      // Call createProduct directly
      const result = await createProduct(testProduct);
      
      console.log("Debug: createProduct returned:", result);
      
      if (result) {
        console.log("Debug: Product created successfully:", result);
        setTestResult("SUCCESS: Product created with ID: " + result.id);
        toast({
          title: "Success",
          description: "Product created successfully with ID: " + result.id
        });
        
        // Refresh products list
        loadProducts();
      } else {
        console.log("Debug: Product creation returned null");
        setTestResult("FAILED: Product creation returned null");
        toast({
          title: "Failed",
          description: "Product creation returned null",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error("Debug: Error during product creation:", error);
      setTestResult("ERROR: " + error.message);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const loadProducts = async () => {
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (error: any) {
      console.error("Error loading products:", error);
      toast({
        title: "Error",
        description: "Failed to load products: " + error.message,
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Debug Product Creation</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Navigation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Link to="/test/qr">
                <Button variant="outline">QR Code Test</Button>
              </Link>
              <Link to="/test/receipt-qr">
                <Button variant="outline">Receipt QR Test</Button>
              </Link>
              <Link to="/test/qr-debug">
                <Button variant="outline">QR Debug Test</Button>
              </Link>
              <Link to="/test/assets">
                <Button variant="outline">Assets Management Test</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Product Creation Debug</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={debugProductCreation}>
              Debug Product Creation
            </Button>
            
            <div className="p-4 bg-muted rounded-md">
              <h3 className="font-medium mb-2">Debug Result:</h3>
              <pre className="whitespace-pre-wrap text-sm">{testResult}</pre>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Existing Products ({products.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {products.length > 0 ? (
              <div className="space-y-2">
                {products.map((product) => (
                  <div key={product.id} className="p-2 border rounded">
                    <div className="font-medium">{product.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Price: ${product.selling_price} | Stock: {product.stock_quantity}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No products found</p>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>Click the "Debug Product Creation" button to test product creation with the exact same data structure as the Product Management page.</p>
              <p>Check the browser console for detailed logs.</p>
              <p>Use the navigation buttons above to access QR code testing pages.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TestPage;