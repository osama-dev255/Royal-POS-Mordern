import { useState, useEffect } from "react";
import QRCode from "qrcode";

export const TestQRCode = () => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [testQrCode, setTestQrCode] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const generateQRCode = async () => {
      try {
        // Test with simple text
        const testQR = await QRCode.toDataURL('TEST QR CODE', { 
          width: 100, 
          margin: 2,
          errorCorrectionLevel: 'M'
        });
        setTestQrCode(testQR);
        
        // Test with JSON data
        const testData = {
          type: 'sales',
          receiptNumber: 'TEST-001',
          date: new Date().toISOString(),
          items: [
            { name: 'Product 1', quantity: 2, price: 10.00, total: 20.00 },
            { name: 'Product 2', quantity: 1, price: 15.00, total: 15.00 }
          ],
          total: 35.00
        };
        
        const dataQR = await QRCode.toDataURL(JSON.stringify(testData), { 
          width: 120, 
          margin: 2,
          errorCorrectionLevel: 'M'
        });
        
        setQrCodeDataUrl(dataQR);
      } catch (err) {
        console.error('Error generating QR codes:', err);
        setError(`Error generating QR codes: ${err}`);
      }
    };

    generateQRCode();
  }, []);

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>QR Code Generation Test</h1>
      
      {error && (
        <div style={{ color: "red", marginBottom: "20px" }}>
          <h2>Error:</h2>
          <p>{error}</p>
        </div>
      )}
      
      <div style={{ marginBottom: "20px" }}>
        <h2>Test QR Code (Simple Text)</h2>
        {testQrCode ? (
          <img src={testQrCode} alt="Test QR Code" style={{ border: "1px solid #ccc", padding: "10px" }} />
        ) : (
          <p>Generating test QR code...</p>
        )}
      </div>
      
      <div>
        <h2>Data QR Code (Receipt Data)</h2>
        {qrCodeDataUrl ? (
          <img src={qrCodeDataUrl} alt="Data QR Code" style={{ border: "1px solid #ccc", padding: "10px" }} />
        ) : (
          <p>Generating data QR code...</p>
        )}
      </div>
      
      <div style={{ marginTop: "20px", padding: "10px", backgroundColor: "#f0f0f0" }}>
        <h3>Debug Information</h3>
        <p>Test QR Code Length: {testQrCode.length}</p>
        <p>Data QR Code Length: {qrCodeDataUrl.length}</p>
        <p>Test QR Code Preview: {testQrCode.substring(0, 50)}</p>
        <p>Data QR Code Preview: {qrCodeDataUrl.substring(0, 50)}</p>
      </div>
    </div>
  );
};