import React, { useState } from 'react';
import { PrintUtils } from '@/utils/printUtils';

const QRTestPage: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [qrImage, setQrImage] = useState<string>('');

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

  const testQRGeneration = async () => {
    setDebugInfo('Generating QR code...');
    setQrImage('');
    
    try {
      const receiptData = {
        type: 'sales',
        receiptNumber: testTransaction.receiptNumber,
        date: new Date().toISOString(),
        items: testTransaction.items,
        subtotal: testTransaction.subtotal,
        tax: testTransaction.tax,
        discount: testTransaction.discount,
        total: testTransaction.total,
        amountReceived: testTransaction.amountReceived,
        change: testTransaction.change
      };
      
      const qrCodeData = JSON.stringify(receiptData);
      setDebugInfo(prev => prev + `\nQR Code data length: ${qrCodeData.length}`);
      
      // Generate QR code using the same method as in PrintUtils
      const qrCodeDataUrl = await (window as any).QRCode.toDataURL(qrCodeData, { 
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
      
      setDebugInfo(prev => prev + `\nQR Code generated successfully`);
      setDebugInfo(prev => prev + `\nData URL length: ${qrCodeDataUrl.length}`);
      setQrImage(qrCodeDataUrl);
      
    } catch (error: any) {
      setDebugInfo(prev => prev + `\nError: ${error.message}`);
      console.error('Error generating QR code:', error);
    }
  };

  const testPrintReceipt = async () => {
    setDebugInfo('Testing print receipt...');
    try {
      await PrintUtils.printReceipt(testTransaction);
      setDebugInfo(prev => prev + '\nPrint receipt called successfully');
    } catch (error: any) {
      setDebugInfo(prev => prev + `\nError: ${error.message}`);
      console.error('Error printing receipt:', error);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>QR Code Test Page</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={testQRGeneration}
          style={{ 
            padding: '10px 20px', 
            marginRight: '10px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Test QR Generation
        </button>
        
        <button 
          onClick={testPrintReceipt}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Test Print Receipt
        </button>
      </div>
      
      <div style={{ 
        marginBottom: '20px', 
        padding: '15px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '5px',
        fontSize: '14px'
      }}>
        <h3>Debug Information</h3>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{debugInfo}</pre>
      </div>
      
      {qrImage && (
        <div style={{ textAlign: 'center' }}>
          <h3>Generated QR Code</h3>
          <img 
            src={qrImage} 
            alt="Test QR Code" 
            style={{ maxWidth: '200px', height: 'auto' }}
            onError={() => setDebugInfo(prev => prev + '\nQR Image failed to load!')}
          />
          <p>Scan this QR code to verify it works</p>
        </div>
      )}
    </div>
  );
};

export default QRTestPage;