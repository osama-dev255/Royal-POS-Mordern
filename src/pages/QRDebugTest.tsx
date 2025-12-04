import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import QRCode from "qrcode";

export const QRDebugTest = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);

  const testQrGeneration = async () => {
    setIsGenerating(true);
    setDebugInfo(null);
    setQrImage(null);
    
    try {
      // Test data
      const testData = {
        type: 'sales',
        receiptNumber: 'TEST-001',
        date: new Date().toISOString(),
        items: [
          { name: 'Product 1', quantity: 2, price: 10.00, total: 20.00 },
          { name: 'Product 2', quantity: 1, price: 15.00, total: 15.00 }
        ],
        subtotal: 35.00,
        tax: 0.00,
        discount: 0.00,
        total: 35.00,
        amountReceived: 40.00,
        change: 5.00
      };

      const testDataString = JSON.stringify(testData);
      
      // Test 1: Simple QR code
      const simpleQr = await QRCode.toDataURL('Hello World', {
        width: 120,
        margin: 2,
        errorCorrectionLevel: 'M'
      });

      // Test 2: Complex data QR code
      const complexQr = await QRCode.toDataURL(testDataString, {
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

      // Test 3: Canvas-based QR code
      const canvas = document.createElement('canvas');
      await QRCode.toCanvas(canvas, testDataString, {
        width: 120,
        margin: 2,
        errorCorrectionLevel: 'M'
      });

      setDebugInfo({
        success: true,
        simpleQrLength: simpleQr.length,
        complexQrLength: complexQr.length,
        dataStringLength: testDataString.length,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height
      });
      
      setQrImage(complexQr);
    } catch (error) {
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
          <CardTitle>QR Code Debug Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Test QR code generation directly in the application environment.
            </p>
            
            <Button 
              onClick={testQrGeneration} 
              disabled={isGenerating}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isGenerating ? "Testing..." : "Run QR Code Tests"}
            </Button>
            
            {debugInfo && (
              <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                <h3 className="font-medium text-gray-800 mb-2">Debug Information:</h3>
                <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </div>
            )}
            
            {qrImage && (
              <div className="mt-4 p-4 bg-white rounded-lg border">
                <h3 className="font-medium text-gray-800 mb-2">Generated QR Code:</h3>
                <div className="flex flex-col items-center">
                  <img src={qrImage} alt="Generated QR Code" className="max-w-[200px]" />
                  <p className="mt-2 text-sm text-gray-600">Scan for Details</p>
                  <p className="text-xs text-gray-500">Receipt #: TEST-001</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};