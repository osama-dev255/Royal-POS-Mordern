import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PrintUtils } from "@/utils/printUtils";
import QRCode from "qrcode";

export const TestReceiptQR = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const testTransaction = {
    receiptNumber: "TEST-001",
    items: [
      { name: "Product 1", quantity: 2, price: 10.00, total: 20.00 },
      { name: "Product 2", quantity: 1, price: 15.00, total: 15.00 }
    ],
    subtotal: 35.00,
    tax: 0.00,
    discount: 0.00,
    total: 35.00,
    amountReceived: 40.00,
    change: 5.00
  };

  const testPurchaseTransaction = {
    orderNumber: "PO-001",
    supplier: { name: "Test Supplier", contactPerson: "John Doe" },
    items: [
      { name: "Product A", quantity: 5, price: 8.00, total: 40.00 },
      { name: "Product B", quantity: 3, price: 12.00, total: 36.00 }
    ],
    subtotal: 76.00,
    discount: 0.00,
    total: 76.00,
    paymentMethod: "Cash",
    amountReceived: 80.00,
    change: 4.00
  };

  const handleDirectQRCodeTest = async () => {
    setIsGenerating(true);
    setDebugInfo(null);
    try {
      const receiptData = {
        type: 'sales',
        receiptNumber: "TEST-001",
        date: new Date().toISOString(),
        items: [
          { name: "Product 1", quantity: 2, price: 10.00, total: 20.00 },
          { name: "Product 2", quantity: 1, price: 15.00, total: 15.00 }
        ],
        subtotal: 35.00,
        tax: 0.00,
        discount: 0.00,
        total: 35.00,
        amountReceived: 40.00,
        change: 5.00
      };

      const receiptDataString = JSON.stringify(receiptData);
      console.log('Direct QR Test - Data:', receiptDataString);

      // Test QR code generation directly
      const qrCodeDataUrl = await QRCode.toDataURL(receiptDataString, { 
        width: 120,
        margin: 2,
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 1,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });

      console.log('Direct QR Test - Success, Data URL length:', qrCodeDataUrl.length);
      
      setDebugInfo({
        success: true,
        dataUrlLength: qrCodeDataUrl.length,
        dataUrlPreview: qrCodeDataUrl.substring(0, 100),
        receiptData: receiptDataString
      });
    } catch (error) {
      console.error('Direct QR Test - Error:', error);
      setDebugInfo({
        success: false,
        error: error.message,
        stack: error.stack
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTestSalesReceipt = async () => {
    setIsGenerating(true);
    setDebugInfo(null);
    try {
      await PrintUtils.printReceipt(testTransaction);
    } catch (error) {
      console.error("Error generating sales receipt:", error);
      setDebugInfo({
        success: false,
        error: error.message,
        stack: error.stack
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTestPurchaseReceipt = async () => {
    setIsGenerating(true);
    setDebugInfo(null);
    try {
      await PrintUtils.printPurchaseReceipt(testPurchaseTransaction);
    } catch (error) {
      console.error("Error generating purchase receipt:", error);
      setDebugInfo({
        success: false,
        error: error.message,
        stack: error.stack
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Receipt QR Code Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Test the QR code functionality in receipts. Click the buttons below to generate test receipts.
            </p>
            
            <div className="flex gap-4 flex-wrap">
              <Button 
                onClick={handleTestSalesReceipt} 
                disabled={isGenerating}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isGenerating ? "Generating..." : "Test Sales Receipt"}
              </Button>
              
              <Button 
                onClick={handleTestPurchaseReceipt} 
                disabled={isGenerating}
                variant="outline"
                className="border-blue-300 text-blue-600 hover:bg-blue-100"
              >
                {isGenerating ? "Generating..." : "Test Purchase Receipt"}
              </Button>
              
              <Button 
                onClick={handleDirectQRCodeTest} 
                disabled={isGenerating}
                variant="outline"
                className="border-green-300 text-green-600 hover:bg-green-100"
              >
                {isGenerating ? "Testing..." : "Direct QR Code Test"}
              </Button>
            </div>
            
            {debugInfo && (
              <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                <h3 className="font-medium text-gray-800 mb-2">Debug Information:</h3>
                <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </div>
            )}
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-800 mb-2">Expected Layout:</h3>
              <div className="text-sm text-blue-700 font-mono whitespace-pre">
{`Scan for Details
[QR Code Image]
Receipt #: TEST-001

Thank You!
Visit us at www.posbusiness.com`}
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <h3 className="font-medium text-yellow-800 mb-2">Layout Information:</h3>
              <ul className="text-sm text-yellow-700 list-disc pl-5 space-y-1">
                <li>"Scan for Details" label appears above the QR code</li>
                <li>QR code image is centered with proper styling</li>
                <li>Receipt number is displayed below the QR code</li>
                <li>Fallback message appears when QR code is not available</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};