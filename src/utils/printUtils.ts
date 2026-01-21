import { getTemplateConfig, generateCustomReceipt, getPurchaseTemplateConfig, generateCustomPurchaseReceipt } from "@/utils/templateUtils";

// Remove the dynamic import approach and use a CDN-based solution instead
// This avoids build-time dependency resolution issues with Vite/Rollup

// Utility functions for printing
export class PrintUtils {
  // Check if we're on a mobile device
  static isMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  // Generate QR code for receipt using a CDN-based approach
  static async generateReceiptQRCode(transaction: any, type: 'sales' | 'purchase'): Promise<string> {
    try {
      // Create a URL that points to a page that displays the receipt details
      const receiptData = {
        type,
        receiptNumber: type === 'sales' ? transaction.receiptNumber : transaction.orderNumber,
        date: new Date().toISOString(),
        items: transaction.items || [],
        subtotal: transaction.subtotal || 0,
        tax: transaction.tax || 0,
        discount: transaction.discount || 0,
        total: transaction.total || 0,
        amountReceived: transaction.amountReceived || 0,
        change: transaction.change || 0,
      };
      
      const receiptDataString = JSON.stringify(receiptData);
      console.log('QR Code Generation - Receipt Data:', receiptDataString);
      
      // Use a CDN-based QR code generator to avoid build issues
      // This creates a data URL without requiring the qrcode library at build time
      const encodedData = encodeURIComponent(receiptDataString);
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodedData}&size=120x120&ecc=M`;
      
      // For better reliability, we'll return the URL and let the browser fetch it
      // This avoids any build-time dependency issues
      return qrUrl;
    } catch (error) {
      console.error('Error generating QR code in generateReceiptQRCode:', error);
      return '';
    }
  }

  // Print receipt with enhanced formatting and mobile support
  static async printReceipt(transaction: any) {
    // Show loading indicator
    this.showLoadingIndicator('Preparing print...');
    
    // Generate QR code URL for the receipt
    let qrCodeUrl = '';
    let qrGenerationError = '';
    try {
      const receiptData = {
        type: 'sales',
        receiptNumber: transaction.receiptNumber || Date.now(),
        date: new Date().toISOString(),
        items: transaction.items,
        subtotal: transaction.subtotal,
        tax: transaction.tax,
        discount: transaction.discount,
        total: transaction.total,
        amountReceived: transaction.amountReceived,
        change: transaction.change
      };
      
      const qrCodeData = JSON.stringify(receiptData);
      console.log('Print Receipt - Generating QR code with data length:', qrCodeData.length);
      console.log('Print Receipt - QR Code Data:', qrCodeData);
      
      // Use CDN-based QR code generation
      const encodedData = encodeURIComponent(qrCodeData);
      qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodedData}&size=120x120&ecc=M`;
      
      console.log('Print Receipt - QR Code URL generated successfully:', qrCodeUrl);
    } catch (error) {
      console.error('Print Receipt - Error generating QR code:', error);
      qrGenerationError = error.message;
      qrCodeUrl = '';
    }
    
    console.log('Print Receipt - Final QR Code URL:', qrCodeUrl ? 'Present' : 'Empty');
    console.log('Print Receipt - QR Generation Error:', qrGenerationError);
    
    // For mobile devices, use the mobile print approach
    if (this.isMobileDevice()) {
      return this.printReceiptMobile(transaction, qrCodeUrl);
    }

    // For desktop, use a hidden iframe approach to avoid window stacking
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'absolute';
    printFrame.style.top = '-1000px';
    printFrame.style.left = '-1000px';
    document.body.appendChild(printFrame);
    
    const printDocument = printFrame.contentDocument || printFrame.contentWindow?.document;
    if (!printDocument) {
      this.hideLoadingIndicator();
      console.error('Could not access print frame document');
      return;
    }
    
    // Get template configuration
    const templateConfig = getTemplateConfig();
    
    let receiptContent;
    
    // Use custom template if enabled
    if (templateConfig.customTemplate) {
      receiptContent = generateCustomReceipt(transaction, templateConfig);
    } else {
      // Format items for receipt
      const formattedItems = transaction.items.map((item: any) => {
        const total = item.price * item.quantity;
        return {
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          total: total
        };
      });
      
      // Calculate totals
      const subtotal = transaction.subtotal || formattedItems.reduce((sum: number, item: any) => sum + item.total, 0);
      const tax = transaction.tax || 0;
      const discount = transaction.discount || 0;
      const total = transaction.total || (subtotal + tax - discount);
      // For credit sales, amountReceived should be 0, not default to total
      const amountReceived = transaction.amountReceived !== undefined ? transaction.amountReceived : total;
      const change = transaction.change !== undefined ? transaction.change : (amountReceived - total);
      
      receiptContent = `<!DOCTYPE html>
<html>
  <head>
    <title>Receipt</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      @media print {
        @page {
          margin: 0.5in;
          size: auto;
        }
        body {
          margin: 0.5in;
          padding: 0;
        }
      }
      body {
        font-family: 'Courier New', monospace;
        font-size: 12px;
        max-width: 320px;
        margin: 0 auto;
        padding: 10px;
      }
      .header {
        text-align: center;
        border-bottom: 1px dashed #000;
        padding-bottom: 10px;
        margin-bottom: 10px;
      }
      .business-name {
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 5px;
      }
      .business-info {
        font-size: 10px;
        margin-bottom: 5px;
      }
      .receipt-info {
        display: flex;
        justify-content: space-between;
        font-size: 10px;
        margin-bottom: 10px;
      }
      .customer-info {
        border: none;
        padding: 8px;
        margin-bottom: 10px;
        background-color: #f9f9f9;
      }
      .customer-name {
        font-weight: bold;
        margin-bottom: 3px;
      }
      .customer-detail {
        font-size: 10px;
        margin-bottom: 2px;
      }
      .items {
        margin-bottom: 10px;
      }
      .item {
        display: flex;
        margin-bottom: 5px;
      }
      .item-name {
        flex: 2;
      }
      .item-details {
        flex: 1;
        text-align: right;
      }
      .item-price::before {
        content: "@ ";
      }
      .item-total {
        font-weight: bold;
      }
      .totals {
        border-top: 1px dashed #000;
        padding-top: 10px;
        margin-top: 10px;
      }
      .total-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 5px;
      }
      .final-total {
        font-weight: bold;
        font-size: 14px;
        margin: 10px 0;
      }
      .payment-info {
        border-top: 1px dashed #000;
        padding-top: 10px;
        margin-top: 10px;
      }
      .footer {
        text-align: center;
        margin-top: 20px;
        font-size: 10px;
      }
      .thank-you {
        font-weight: bold;
        margin-bottom: 10px;
      }
      /* QR Code Styles */
      .qr-section {
        text-align: center;
        margin: 15px 0;
        padding: 10px;
        border-top: 1px dashed #000;
      }
      .qr-label {
        font-size: 9px;
        margin-bottom: 5px;
      }
      .qr-code-img {
        max-width: 120px;
        height: auto;
        margin: 10px auto;
        display: block;
      }
      .qr-error {
        font-size: 8px;
        color: #666;
        margin: 5px 0;
      }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="business-name">POS BUSINESS</div>
      <div class="business-info">123 Business St, City, Country</div>
      <div class="business-info">Phone: (123) 456-7890</div>
    </div>
    
    <div class="receipt-info">
      <div>Receipt #: ${transaction.receiptNumber || Date.now()}</div>
      <div>Date: ${new Date().toLocaleDateString()}</div>
      <div>Time: ${new Date().toLocaleTimeString()}</div>
    </div>
    
    ${transaction.customer ? `
    <div class="customer-info">
      <div class="customer-name">${transaction.customer.name}</div>
      ${transaction.customer.phone ? `<div class="customer-detail">Phone: ${transaction.customer.phone}</div>` : ''}
      ${transaction.customer.email ? `<div class="customer-detail">Email: ${transaction.customer.email}</div>` : ''}
      ${transaction.customer.address ? `<div class="customer-detail">Address: ${transaction.customer.address}</div>` : ''}
      ${transaction.customer.tax_id ? `<div class="customer-detail">TIN: ${transaction.customer.tax_id}</div>` : ''}
      ${transaction.customer.loyaltyPoints ? `<div class="customer-detail">Loyalty Points: ${transaction.customer.loyaltyPoints}</div>` : ''}
    </div>
    ` : ''}
    
    <div class="items">
      ${formattedItems.map((item: any) => `
        <div class="item">
          <div class="item-name">${item.name}</div>
          <div class="item-details">${item.quantity} x @ ${item.price.toFixed(2)}</div>
          <div class="item-total">${item.total.toFixed(2)}</div>
        </div>
      `).join('')}
    </div>
    
    <div class="totals">
      <div class="total-row">
        <div>Subtotal:</div>
        <div>${subtotal.toFixed(2)}</div>
      </div>
      <div class="total-row">
        <div>Tax:</div>
        <div>${tax.toFixed(2)}</div>
      </div>
      <div class="total-row">
        <div>Discount:</div>
        <div>${discount.toFixed(2)}</div>
      </div>
      <div class="total-row">
        <div>Total:</div>
        <div>${total.toFixed(2)}</div>
      </div>
    </div>
    
    <div class="payment-info">
      ${transaction.paymentMethod === "credit" ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <div>Payment Method:</div>
          <div>Credit Purchase</div>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <div>Amount Received:</div>
          <div>Credit</div>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <div>Outstanding Balance:</div>
          <div>${total.toFixed(2)}</div>
        </div>
      ` : `
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <div>Payment Method:</div>
          <div>${transaction.paymentMethod}</div>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <div>Amount Received:</div>
          <div>${amountReceived.toFixed(2)}</div>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <div>Change:</div>
          <div>${change < 0 ? `Credited: ${Math.abs(change).toFixed(2)}` : change.toFixed(2)}</div>
        </div>
      `}
    </div>
    
    <div class="footer">
      <div class="thank-you">Thank You!</div>
      <div>For more info, visit us at www.posbusiness.com</div>
    </div>
    
    <div class="qr-section">
      <div class="qr-label">Scan for Details</div>
      ${qrCodeUrl ? 
        `<div style="margin: 10px 0; text-align: center;">
           <img src="${qrCodeUrl}" width="120" height="120" class="qr-code-img" alt="Receipt QR Code" 
                style="max-width: 120px; height: auto; width: 120px; height: 120px; margin: 10px auto; display: block; border: 1px solid #ccc; background: #f9f9f9;"
                onerror="console.error('QR Code failed to load - URL:', this.src); 
                        this.style.display='none'; 
                        var errorDiv = this.parentNode.querySelector('.qr-error'); 
                        if (errorDiv) errorDiv.style.display='block';
                        console.log('QR Code onerror triggered - src:', this.src);" 
                onload="console.log('QR Code loaded successfully - src:', this.src);" />
           <div class="qr-error" style="font-size: 8px; color: #666; margin: 5px 0; display: none;">QR Code failed to load</div>
         </div>` : 
        `<div style="margin: 10px 0; text-align: center;">
           <div style="font-size: 8px; color: #666;">
             ${qrGenerationError ? 
               `QR Code generation failed: ${qrGenerationError.substring(0, 50)}...` : 
               'QR Code not available'}
           </div>
         </div>`}
      <div style="font-size: 8px; margin-top: 5px;">Receipt #: ${transaction.receiptNumber || Date.now()}</div>
    </div>
  </body>
</html>`;
    }
    
    // Write content to iframe and print
    printDocument.open();
    printDocument.write(receiptContent);
    printDocument.close();
    
    // Wait for content to load before printing
    printFrame.onload = () => {
      try {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
      } catch (error) {
        console.error('Error during printing:', error);
      } finally {
        // Clean up - remove iframe after a short delay to ensure printing started
        setTimeout(() => {
          if (printFrame.parentNode) {
            printFrame.parentNode.removeChild(printFrame);
          }
          this.hideLoadingIndicator();
        }, 1000);
      }
    };
    
    // Fallback cleanup in case onload doesn't fire
    setTimeout(() => {
      if (printFrame.parentNode) {
        printFrame.parentNode.removeChild(printFrame);
      }
      this.hideLoadingIndicator();
    }, 5000);
  }

  // Print purchase receipt for a single transaction
  static async printPurchaseReceipt(transaction: any) {
    // Show loading indicator
    this.showLoadingIndicator('Preparing print...');
    
    // Generate QR code URL for the receipt
    let qrCodeUrl = '';
    let qrGenerationError = '';
    try {
      const receiptData = {
        type: 'purchase',
        orderNumber: transaction.orderNumber || 'PO-' + Date.now(),
        date: new Date().toISOString(),
        items: transaction.items,
        supplier: transaction.supplier,
        subtotal: transaction.subtotal,
        discount: transaction.discount,
        total: transaction.total,
        paymentMethod: transaction.paymentMethod,
        amountReceived: transaction.amountReceived,
        change: transaction.change
      };
      
      const qrCodeData = JSON.stringify(receiptData);
      console.log('Print Purchase Receipt - Generating QR code with data length:', qrCodeData.length);
      console.log('Print Purchase Receipt - QR Code Data:', qrCodeData);
      
      // Use CDN-based QR code generation
      const encodedData = encodeURIComponent(qrCodeData);
      qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodedData}&size=120x120&ecc=M`;
      
      console.log('Print Purchase Receipt - QR Code URL generated successfully:', qrCodeUrl);
    } catch (error) {
      console.error('Print Purchase Receipt - Error generating QR code:', error);
      qrGenerationError = error.message;
      qrCodeUrl = '';
    }
    
    console.log('Print Purchase Receipt - Final QR Code URL:', qrCodeUrl ? 'Present' : 'Empty');
    console.log('Print Purchase Receipt - QR Generation Error:', qrGenerationError);
    
    // For mobile devices, use the mobile print approach
    if (this.isMobileDevice()) {
      return this.printPurchaseReceiptMobile(transaction, qrCodeUrl);
    }

    // For desktop, use a hidden iframe approach to avoid window stacking
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'absolute';
    printFrame.style.top = '-1000px';
    printFrame.style.left = '-1000px';
    document.body.appendChild(printFrame);
    
    const printDocument = printFrame.contentDocument || printFrame.contentWindow?.document;
    if (!printDocument) {
      this.hideLoadingIndicator();
      console.error('Could not access print frame document');
      return;
    }
    
    // Get purchase template configuration
    const templateConfig = getPurchaseTemplateConfig();
    
    let receiptContent;
    
    // Use custom template if enabled
    if (templateConfig.customTemplate) {
      receiptContent = generateCustomPurchaseReceipt(transaction, templateConfig);
    } else {
      // Format items for receipt
      const formattedItems = transaction.items || [];
      
      // Calculate totals
      const subtotal = transaction.subtotal || formattedItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
      // Display only tax (18% of subtotal) - for informational purposes only
      const displayTax = subtotal * 0.18;
      const discount = transaction.discount || 0;
      // Actual total calculation (tax not included in computation)
      const total = transaction.total || (subtotal - discount);
      // For credit purchases, amountReceived should be 0, not default to total
      const amountReceived = transaction.amountReceived !== undefined ? transaction.amountReceived : total;
      const change = transaction.change !== undefined ? transaction.change : (amountReceived - total);
      
      receiptContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Purchase Receipt</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              @media print {
                @page {
                  margin: 0.5in;
                  size: auto;
                }
                body {
                  margin: 0.5in;
                  padding: 0;
                }
              }
              body {
                font-family: 'Courier New', monospace;
                font-size: 12px;
                max-width: 320px;
                margin: 0 auto;
                padding: 10px;
              }
              .header {
                text-align: center;
                border-bottom: 1px dashed #000;
                padding-bottom: 10px;
                margin-bottom: 10px;
              }
              .business-name {
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 5px;
              }
              .business-info {
                font-size: 10px;
                margin-bottom: 5px;
              }
              .receipt-info {
                display: flex;
                justify-content: space-between;
                font-size: 10px;
                margin-bottom: 10px;
              }
              .items {
                margin-bottom: 10px;
              }
              .item {
                display: flex;
                margin-bottom: 5px;
              }
              .item-name {
                flex: 2;
              }
              .item-details {
                flex: 1;
                text-align: right;
              }
              .item-price::before {
                content: "@ ";
              }
              .item-total {
                font-weight: bold;
              }
              .totals {
                border-top: 1px dashed #000;
                padding-top: 10px;
                margin-top: 10px;
              }
              .total-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 5px;
              }
              .final-total {
                font-weight: bold;
                font-size: 14px;
                margin: 10px 0;
              }
              .payment-info {
                border-top: 1px dashed #000;
                padding-top: 10px;
                margin-top: 10px;
              }
              .footer {
                text-align: center;
                margin-top: 20px;
                font-size: 10px;
              }
              .thank-you {
                font-weight: bold;
                margin-bottom: 10px;
              }
              /* QR Code Styles */
              .qr-section {
                text-align: center;
                margin: 15px 0;
                padding: 10px;
                border-top: 1px dashed #000;
              }
              .qr-label {
                font-size: 9px;
                margin-bottom: 5px;
              }
              .qr-code-img {
                max-width: 120px;
                height: auto;
                margin: 10px auto;
                display: block;
              }
              .qr-error {
                font-size: 8px;
                color: #666;
                margin: 5px 0;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="business-name">POS BUSINESS</div>
              <div class="business-info">123 Business St, City, Country</div>
              <div class="business-info">Phone: (123) 456-7890</div>
            </div>
            
            <div class="receipt-info">
              <div>Order #: ${transaction.orderNumber || 'PO-' + Date.now()}</div>
              <div>Date: ${new Date().toLocaleDateString()}</div>
              <div>Time: ${new Date().toLocaleTimeString()}</div>
            </div>
            
            ${transaction.supplier ? `
            <div style="padding: 8px; margin-bottom: 10px; background-color: #f9f9f9;">
              <div style="font-weight: bold; margin-bottom: 3px;">${transaction.supplier.name || transaction.supplier.contactPerson || 'Supplier'}</div>
              ${transaction.supplier.phone ? `<div style="font-size: 10px; margin-bottom: 2px;">Phone: ${transaction.supplier.phone}</div>` : ''}
              ${transaction.supplier.email ? `<div style="font-size: 10px; margin-bottom: 2px;">Email: ${transaction.supplier.email}</div>` : ''}
              ${transaction.supplier.address ? `<div style="font-size: 10px; margin-bottom: 2px;">Address: ${transaction.supplier.address}</div>` : ''}
              ${transaction.supplier.tax_id ? `<div style="font-size: 10px; margin-bottom: 2px;">TIN: ${transaction.supplier.tax_id}</div>` : ''}
            </div>
            ` : ''}
            
            <div class="items">
              ${formattedItems.map((item: any) => `
                <div class="item">
                  <div class="item-name">${item.name}</div>
                  <div class="item-details">${item.quantity} x @ ${item.price.toFixed(2)}</div>
                  <div class="item-total">${item.total.toFixed(2)}</div>
                </div>
              `).join('')}
            </div>
            
            <div style="border-top: 1px dashed #000; padding-top: 10px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <div>Subtotal:</div>
                <div>${subtotal.toFixed(2)}</div>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <div>Tax (18%):</div>
                <div>${displayTax.toFixed(2)}</div>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <div>Discount:</div>
                <div>${discount.toFixed(2)}</div>
              </div>
              <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 10px;">
                <div>Total:</div>
                <div>${total.toFixed(2)}</div>
              </div>
            </div>
            
            <div style="border-top: 1px dashed #000; padding-top: 10px; margin-top: 10px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <div>Payment Method:</div>
                <div>${transaction.paymentMethod}</div>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <div>Amount Received:</div>
                <div>${amountReceived.toFixed(2)}</div>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <div>Change:</div>
                <div>${change < 0 ? `Credited: ${Math.abs(change).toFixed(2)}` : change.toFixed(2)}</div>
              </div>
            </div>
            
            <div class="footer">
              <div class="thank-you">Thank You!</div>
              <div>For more info, visit us at www.posbusiness.com</div>
            </div>
            
            <div class="qr-section">
              <div class="qr-label">Scan for Details</div>
              ${qrCodeUrl ? 
                `<div style="margin: 10px 0; text-align: center;">
                   <img src="${qrCodeUrl}" width="120" height="120" class="qr-code-img" alt="Receipt QR Code" 
                        style="max-width: 120px; height: auto; width: 120px; height: 120px; margin: 10px auto; display: block; border: 1px solid #ccc; background: #f9f9f9;"
                        onerror="console.error('QR Code failed to load - URL:', this.src); 
                                this.style.display='none'; 
                                var errorDiv = this.parentNode.querySelector('.qr-error'); 
                                if (errorDiv) errorDiv.style.display='block';
                                console.log('QR Code onerror triggered - src:', this.src);" 
                        onload="console.log('QR Code loaded successfully - src:', this.src);" />
                   <div class="qr-error" style="font-size: 8px; color: #666; margin: 5px 0; display: none;">QR Code failed to load</div>
                 </div>` : 
                `<div style="margin: 10px 0; text-align: center;">
                   <div style="font-size: 8px; color: #666;">
                     ${qrGenerationError ? 
                       `QR Code generation failed: ${qrGenerationError.substring(0, 50)}...` : 
                       'QR Code not available'}
                   </div>
                 </div>`}
              <div style="font-size: 8px; margin-top: 5px;">Order #: ${transaction.orderNumber || 'PO-' + Date.now()}</div>
            </div>
          </body>
        </html>
      `;
    }
    
    // Write content to iframe and print
    printDocument.open();
    printDocument.write(receiptContent);
    printDocument.close();
    
    // Wait for content to load before printing
    printFrame.onload = () => {
      try {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
      } catch (error) {
        console.error('Error during printing:', error);
      } finally {
        // Clean up - remove iframe after a short delay to ensure printing started
        setTimeout(() => {
          if (printFrame.parentNode) {
            printFrame.parentNode.removeChild(printFrame);
          }
          this.hideLoadingIndicator();
        }, 1000);
      }
    };
    
    // Fallback cleanup in case onload doesn't fire
    setTimeout(() => {
      if (printFrame.parentNode) {
        printFrame.parentNode.removeChild(printFrame);
      }
      this.hideLoadingIndicator();
    }, 5000);
  }

  // Print customer settlement receipt
  static async printCustomerSettlement(settlement: any) {
    // Show loading indicator
    this.showLoadingIndicator('Preparing customer settlement...');
    
    // For mobile devices, use the mobile print approach
    if (this.isMobileDevice()) {
      return this.printCustomerSettlementMobile(settlement);
    }

    // For desktop, use a hidden iframe approach to avoid window stacking
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'absolute';
    printFrame.style.top = '-1000px';
    printFrame.style.left = '-1000px';
    document.body.appendChild(printFrame);
    
    const printDocument = printFrame.contentDocument || printFrame.contentWindow?.document;
    if (!printDocument) {
      this.hideLoadingIndicator();
      console.error('Could not access print frame document');
      return;
    }
    
    // Format the settlement receipt content
    const settlementContent = `<!DOCTYPE html>
<html>
  <head>
    <title>Customer Settlement</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      @media print {
        @page {
          margin: 0.5in;
          size: auto;
        }
        body {
          margin: 0.5in;
          padding: 0;
        }
      }
      body {
        font-family: 'Courier New', monospace;
        font-size: 12px;
        max-width: 320px;
        margin: 0 auto;
        padding: 10px;
      }
      .header {
        text-align: center;
        border-bottom: 1px dashed #000;
        padding-bottom: 10px;
        margin-bottom: 10px;
      }
      .business-name {
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 5px;
      }
      .business-info {
        font-size: 10px;
        margin-bottom: 5px;
      }
      .receipt-info {
        display: flex;
        justify-content: space-between;
        font-size: 10px;
        margin-bottom: 10px;
      }
      .customer-info {
        border: 1px solid #ccc;
        padding: 8px;
        margin-bottom: 10px;
        background-color: #f9f9f9;
      }
      .customer-name {
        font-weight: bold;
        margin-bottom: 3px;
      }
      .customer-detail {
        font-size: 10px;
        margin-bottom: 2px;
      }
      .settlement-details {
        margin-bottom: 10px;
      }
      .detail-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 3px;
      }
      .detail-label {
        font-weight: bold;
      }
      .totals {
        border-top: 1px dashed #000;
        padding-top: 10px;
        margin-top: 10px;
      }
      .total-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 5px;
      }
      .final-total {
        font-weight: bold;
        font-size: 14px;
        margin: 10px 0;
      }
      .footer {
        text-align: center;
        margin-top: 20px;
        font-size: 10px;
      }
      .thank-you {
        font-weight: bold;
        margin-bottom: 10px;
      }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="business-name">POS BUSINESS</div>
      <div class="business-info">123 Business St, City, Country</div>
      <div class="business-info">Phone: (123) 456-7890</div>
    </div>
    
    <div class="receipt-info">
      <div>Settlement #: ${settlement.referenceNumber || settlement.id}</div>
      <div>${new Date(settlement.date).toLocaleDateString()}</div>
      <div>${settlement.time || new Date().toLocaleTimeString()}</div>
    </div>
    
    <div class="customer-info">
      <div class="customer-name">${settlement.customerName}</div>
      ${settlement.customerPhone ? `<div class="customer-detail">Phone: ${settlement.customerPhone}</div>` : ''}
      ${settlement.customerEmail ? `<div class="customer-detail">Email: ${settlement.customerEmail}</div>` : ''}
    </div>
    
    <div class="settlement-details">
      <div class="detail-row">
        <div class="detail-label">Payment Method:</div>
        <div>${settlement.paymentMethod}</div>
      </div>
      ${settlement.previousBalance !== undefined ? `
      <div class="detail-row">
        <div class="detail-label">Previous Balance:</div>
        <div>${settlement.previousBalance.toFixed(2)}</div>
      </div>` : ''}
      <div class="detail-row">
        <div class="detail-label">Amount Paid:</div>
        <div>${settlement.amountPaid.toFixed(2)}</div>
      </div>
      ${settlement.newBalance !== undefined ? `
      <div class="detail-row">
        <div class="detail-label">New Balance:</div>
        <div>${settlement.newBalance.toFixed(2)}</div>
      </div>` : ''}
      ${settlement.notes ? `
      <div class="detail-row">
        <div class="detail-label">Notes:</div>
        <div>${settlement.notes}</div>
      </div>` : ''}
    </div>
    
    <div class="totals">
      <div class="total-row">
        <div class="detail-label">Total Settlement:</div>
        <div>${settlement.settlementAmount.toFixed(2)}</div>
      </div>
      <div class="total-row">
        <div class="detail-label">Status:</div>
        <div>${settlement.status || 'completed'}</div>
      </div>
      <div class="total-row">
        <div class="detail-label">Processed By:</div>
        <div>${settlement.cashierName || 'System'}</div>
      </div>
    </div>
    
    <div class="footer">
      <div class="thank-you">Thank you for your business!</div>
      <div>For more info, visit us at www.posbusiness.com</div>
    </div>
  </body>
</html>`;
    
    // Write content to iframe and print
    printDocument.open();
    printDocument.write(settlementContent);
    printDocument.close();
    
    // Wait for content to load before printing
    printFrame.onload = () => {
      try {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
      } catch (error) {
        console.error('Error during printing:', error);
      } finally {
        // Clean up - remove iframe after a short delay to ensure printing started
        setTimeout(() => {
          if (printFrame.parentNode) {
            printFrame.parentNode.removeChild(printFrame);
          }
          this.hideLoadingIndicator();
        }, 1000);
      }
    };
    
    // Fallback cleanup in case onload doesn't fire
    setTimeout(() => {
      if (printFrame.parentNode) {
        printFrame.parentNode.removeChild(printFrame);
      }
      this.hideLoadingIndicator();
    }, 5000);
  }

  // Mobile print customer settlement
  static printCustomerSettlementMobile(settlement: any) {
    console.log('Using mobile print approach for customer settlement...');
    
    // Create a modal dialog for mobile printing with a clear print button
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    modal.style.zIndex = '10000';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    
    // Format the settlement receipt content
    const settlementContent = `
      <div style="background: white; padding: 20px; max-width: 90%; max-height: 80%; overflow-y: auto;">
        <h2 style="text-align: center; margin-bottom: 20px;">Customer Settlement Preview</h2>
        <div style="font-family: monospace; font-size: 14px;">
          <div style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px;">
            <div style="font-weight: bold; font-size: 18px;">POS BUSINESS</div>
            <div style="font-size: 12px;">123 Business St, City, Country</div>
            <div style="font-size: 12px;">Phone: (123) 456-7890</div>
          </div>
          
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 10px;">
            <div>Settlement #: ${settlement.referenceNumber || settlement.id}</div>
            <div>${new Date(settlement.date).toLocaleDateString()}</div>
          </div>
          
          <div style="padding: 8px; margin-bottom: 10px; background-color: #f9f9f9;">
            <div style="font-weight: bold; margin-bottom: 3px;">${settlement.customerName}</div>
            ${settlement.customerPhone ? `<div style="font-size: 10px; margin-bottom: 2px;">Phone: ${settlement.customerPhone}</div>` : ''}
            ${settlement.customerEmail ? `<div style="font-size: 10px; margin-bottom: 2px;">Email: ${settlement.customerEmail}</div>` : ''}
          </div>
          
          <div style="margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
              <div style="font-weight: bold;">Payment Method:</div>
              <div>${settlement.paymentMethod}</div>
            </div>
            ${settlement.previousBalance !== undefined ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
              <div style="font-weight: bold;">Previous Balance:</div>
              <div>${settlement.previousBalance.toFixed(2)}</div>
            </div>` : ''}
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
              <div style="font-weight: bold;">Amount Paid:</div>
              <div>${settlement.amountPaid.toFixed(2)}</div>
            </div>
            ${settlement.newBalance !== undefined ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
              <div style="font-weight: bold;">New Balance:</div>
              <div>${settlement.newBalance.toFixed(2)}</div>
            </div>` : ''}
            ${settlement.notes ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
              <div style="font-weight: bold;">Notes:</div>
              <div>${settlement.notes}</div>
            </div>` : ''}
          </div>
          
          <div style="border-top: 1px dashed #000; padding-top: 10px; margin-top: 10px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <div style="font-weight: bold;">Total Settlement:</div>
              <div>${settlement.settlementAmount.toFixed(2)}</div>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <div style="font-weight: bold;">Status:</div>
              <div>${settlement.status || 'completed'}</div>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <div style="font-weight: bold;">Processed By:</div>
              <div>${settlement.cashierName || 'System'}</div>
            </div>
          </div>
        </div>
        
        <div style="display: flex; gap: 10px; margin-top: 20px;">
          <button id="cancelPrint" style="flex: 1; padding: 12px; background: #ccc; border: none; border-radius: 5px; font-size: 16px;">Cancel</button>
          <button id="confirmPrint" style="flex: 1; padding: 12px; background: #4CAF50; color: white; border: none; border-radius: 5px; font-size: 16px;">Print Settlement</button>
        </div>
      </div>
    `;
    
    modal.innerHTML = settlementContent;
    document.body.appendChild(modal);
    
    // Add event listeners
    const confirmBtn = modal.querySelector('#confirmPrint');
    const cancelBtn = modal.querySelector('#cancelPrint');
    
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        // Use the standard print method for mobile
        this.printCustomerSettlement(settlement);
        document.body.removeChild(modal);
      });
    }
    
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
      });
    }
  }

  // Show loading indicator
  static showLoadingIndicator(message: string) {
    const loadingIndicator = document.createElement('div');
    loadingIndicator.style.position = 'fixed';
    loadingIndicator.style.top = '50%';
    loadingIndicator.style.left = '50%';
    loadingIndicator.style.transform = 'translate(-50%, -50%)';
    loadingIndicator.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    loadingIndicator.style.color = '#fff';
    loadingIndicator.style.padding = '10px';
    loadingIndicator.style.borderRadius = '5px';
    loadingIndicator.style.zIndex = '1000';
    loadingIndicator.textContent = message;
    document.body.appendChild(loadingIndicator);
  }

  // Hide loading indicator
  static hideLoadingIndicator() {
    const loadingIndicator = document.querySelector('div[style*="position: fixed; top: 50%; left: 50%;"]');
    if (loadingIndicator) {
      document.body.removeChild(loadingIndicator);
    }
  }

  // Fallback method for printing on mobile devices
  static printReceiptMobile(transaction: any, qrCodeUrl: string) {
    console.log('Using mobile print approach...');
    
    // Create a modal dialog for mobile printing with a clear print button
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    modal.style.zIndex = '10000';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    
    // Get template configuration
    const templateConfig = getTemplateConfig();
    
    let receiptContent;
    
    // Use custom template if enabled
    if (templateConfig.customTemplate) {
      receiptContent = generateCustomReceipt(transaction, templateConfig);
    } else {
      // Format items for receipt
      const formattedItems = transaction.items.map((item: any) => {
        const total = item.price * item.quantity;
        return {
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          total: total
        };
      });
      
      // Calculate totals
      const subtotal = transaction.subtotal || formattedItems.reduce((sum: number, item: any) => sum + item.total, 0);
      const tax = transaction.tax || 0;
      const discount = transaction.discount || 0;
      const total = transaction.total || (subtotal + tax - discount);
      const amountReceived = transaction.amountReceived || total;
      const change = transaction.change || (amountReceived - total);
      
      // Simplified mobile receipt content
      receiptContent = `
        <div style="background: white; padding: 20px; max-width: 90%; max-height: 80%; overflow-y: auto;">
          <h2 style="text-align: center; margin-bottom: 20px;">Receipt Preview</h2>
          <div style="font-family: monospace; font-size: 14px;">
            <div style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px;">
              <div style="font-weight: bold; font-size: 18px;">POS BUSINESS</div>
              <div style="font-size: 12px;">123 Business St, City, Country</div>
              <div style="font-size: 12px;">Phone: (123) 456-7890</div>
            </div>
            
            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 10px;">
              <div>Receipt #: ${transaction.receiptNumber || Date.now()}</div>
              <div>${new Date().toLocaleDateString()}</div>
            </div>
            
            ${transaction.customer ? `
            <div style="padding: 8px; margin-bottom: 10px; background-color: #f9f9f9;">
              <div style="font-weight: bold; margin-bottom: 3px;">${transaction.customer.name}</div>
              ${transaction.customer.phone ? `<div style="font-size: 10px; margin-bottom: 2px;">Phone: ${transaction.customer.phone}</div>` : ''}
              ${transaction.customer.email ? `<div style="font-size: 10px; margin-bottom: 2px;">Email: ${transaction.customer.email}</div>` : ''}
              ${transaction.customer.address ? `<div style="font-size: 10px; margin-bottom: 2px;">Address: ${transaction.customer.address}</div>` : ''}
              ${transaction.customer.loyaltyPoints ? `<div style="font-size: 10px; margin-bottom: 2px;">Loyalty Points: ${transaction.customer.loyaltyPoints}</div>` : ''}
            </div>
            ` : ''}
            
            <div style="margin-bottom: 15px;">
              ${formattedItems.map((item: any) => `
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                  <div>${item.name}</div>
                  <div>${item.quantity} x @ ${item.price.toFixed(2)}</div>
                  <div>${item.total.toFixed(2)}</div>
                </div>
              `).join('')}
            </div>
            
            <div style="border-top: 1px dashed #000; padding-top: 10px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <div>Subtotal:</div>
                <div>${subtotal.toFixed(2)}</div>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <div>Tax:</div>
                <div>${tax.toFixed(2)}</div>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <div>Discount:</div>
                <div>${discount.toFixed(2)}</div>
              </div>
              <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 10px;">
                <div>Total:</div>
                <div>${total.toFixed(2)}</div>
              </div>
            </div>
            
            <div style="border-top: 1px dashed #000; padding-top: 10px; margin-top: 10px;">
              ${transaction.paymentMethod === "credit" ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                  <div>Payment Method:</div>
                  <div>Credit Purchase</div>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                  <div>Amount Received:</div>
                  <div>Credit</div>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                  <div>Outstanding Balance:</div>
                  <div>${total.toFixed(2)}</div>
                </div>
              ` : `
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                  <div>Payment Method:</div>
                  <div>${transaction.paymentMethod}</div>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                  <div>Amount Received:</div>
                  <div>${amountReceived.toFixed(2)}</div>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                  <div>Change:</div>
                  <div>${change < 0 ? `Credited: ${Math.abs(change).toFixed(2)}` : change.toFixed(2)}</div>
                </div>
              `}
            </div>
            
            <div style="text-align: center; margin: 15px 0;">
              <div style="font-size: 12px; margin-bottom: 10px;">Scan for Details</div>
              ${qrCodeUrl ? 
                `<img src="${qrCodeUrl}" style="width: 120px; height: 120px; margin: 0 auto; display: block;" alt="Receipt QR Code" />` : 
                `<div style="font-size: 10px; color: #666;">QR Code not available</div>`}
            </div>
          </div>
          
          <div style="display: flex; gap: 10px; margin-top: 20px;">
            <button id="cancelPrint" style="flex: 1; padding: 12px; background: #ccc; border: none; border-radius: 5px; font-size: 16px;">Cancel</button>
            <button id="confirmPrint" style="flex: 1; padding: 12px; background: #4CAF50; color: white; border: none; border-radius: 5px; font-size: 16px;">Print Receipt</button>
          </div>
        </div>
      `;
    }
    
    modal.innerHTML = receiptContent;
    document.body.appendChild(modal);
    
    // Add event listeners
    const confirmBtn = modal.querySelector('#confirmPrint');
    const cancelBtn = modal.querySelector('#cancelPrint');
    
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        // Use the standard print method for mobile
        this.printReceipt(transaction);
        document.body.removeChild(modal);
      });
    }
    
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
      });
    }
  }

  // Fallback method for printing on mobile devices
  static printPurchaseReceiptMobile(transaction: any, qrCodeUrl: string) {
    console.log('Using mobile print approach for purchase receipt...');
    
    // Create a modal dialog for mobile printing with a clear print button
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    modal.style.zIndex = '10000';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    
    // Get purchase template configuration
    const templateConfig = getPurchaseTemplateConfig();
    
    let receiptContent;
    
    // Use custom template if enabled
    if (templateConfig.customTemplate) {
      receiptContent = generateCustomPurchaseReceipt(transaction, templateConfig);
    } else {
      // Format items for receipt
      const formattedItems = transaction.items || [];
      
      // Calculate totals
      const subtotal = transaction.subtotal || formattedItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
      // Display only tax (18% of subtotal) - for informational purposes only
      const displayTax = subtotal * 0.18;
      const discount = transaction.discount || 0;
      // Actual total calculation (tax not included in computation)
      const total = transaction.total || (subtotal - discount);
      const amountReceived = transaction.amountReceived || total;
      const change = transaction.change || (amountReceived - total);
      
      // Simplified mobile receipt content
      receiptContent = `
        <div style="background: white; padding: 20px; max-width: 90%; max-height: 80%; overflow-y: auto;">
          <h2 style="text-align: center; margin-bottom: 20px;">Purchase Receipt Preview</h2>
          <div style="font-family: monospace; font-size: 14px;">
            <div style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px;">
              <div style="font-weight: bold; font-size: 18px;">POS BUSINESS</div>
              <div style="font-size: 12px;">123 Business St, City, Country</div>
              <div style="font-size: 12px;">Phone: (123) 456-7890</div>
            </div>
            
            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 10px;">
              <div>Order #: ${transaction.orderNumber || 'PO-' + Date.now()}</div>
              <div>${new Date().toLocaleDateString()}</div>
            </div>
            
            ${transaction.supplier ? `
            <div style="padding: 8px; margin-bottom: 10px; background-color: #f9f9f9;">
              <div style="font-weight: bold; margin-bottom: 3px;">${transaction.supplier.name || transaction.supplier.contactPerson || 'Supplier'}</div>
              ${transaction.supplier.phone ? `<div style="font-size: 10px; margin-bottom: 2px;">Phone: ${transaction.supplier.phone}</div>` : ''}
              ${transaction.supplier.email ? `<div style="font-size: 10px; margin-bottom: 2px;">Email: ${transaction.supplier.email}</div>` : ''}
              ${transaction.supplier.address ? `<div style="font-size: 10px; margin-bottom: 2px;">Address: ${transaction.supplier.address}</div>` : ''}
              ${transaction.supplier.tax_id ? `<div style="font-size: 10px; margin-bottom: 2px;">TIN: ${transaction.supplier.tax_id}</div>` : ''}
            </div>
            ` : ''}
            
            <div style="margin-bottom: 15px;">
              ${formattedItems.map((item: any) => `
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                  <div>${item.name} (${item.quantity})</div>
                  <div>${item.total.toFixed(2)}</div>
                </div>
              `).join('')}
            </div>
            
            <div style="border-top: 1px dashed #000; padding-top: 10px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <div>Subtotal:</div>
                <div>${subtotal.toFixed(2)}</div>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <div>Tax (18%):</div>
                <div>${displayTax.toFixed(2)}</div>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <div>Discount:</div>
                <div>${discount.toFixed(2)}</div>
              </div>
              <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 10px;">
                <div>Total:</div>
                <div>${total.toFixed(2)}</div>
              </div>
            </div>
            
            <div style="text-align: center; margin: 15px 0;">
              <div style="font-size: 12px; margin-bottom: 10px;">Scan for Details</div>
              ${qrCodeUrl ? 
                `<img src="${qrCodeUrl}" style="width: 120px; height: 120px; margin: 0 auto; display: block;" alt="Receipt QR Code" />` : 
                `<div style="font-size: 10px; color: #666;">QR Code not available</div>`}
            </div>
          </div>
          
          <div style="display: flex; gap: 10px; margin-top: 20px;">
            <button id="cancelPrint" style="flex: 1; padding: 12px; background: #ccc; border: none; border-radius: 5px; font-size: 16px;">Cancel</button>
            <button id="confirmPrint" style="flex: 1; padding: 12px; background: #4CAF50; color: white; border: none; border-radius: 5px; font-size: 16px;">Print Receipt</button>
          </div>
        </div>
      `;
    }
    
    modal.innerHTML = receiptContent;
    document.body.appendChild(modal);
    
    // Add event listeners
    const confirmBtn = modal.querySelector('#confirmPrint');
    const cancelBtn = modal.querySelector('#cancelPrint');
    
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        // Use the standard print method for mobile
        this.printPurchaseReceipt(transaction);
        document.body.removeChild(modal);
      });
    }
    
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
      });
    }
  }

  // Fallback method for printing when popup blockers are enabled
  static printReceiptFallback(transaction: any, qrCodeUrl: string) {
    console.log('Popup blocked, trying fallback print...');
    // For now, just call the regular print method
    this.printReceipt(transaction);
  }

  // Fallback method for printing when popup blockers are enabled
  static printPurchaseReceiptFallback(transaction: any, qrCodeUrl: string) {
    console.log('Popup blocked, trying fallback print for purchase...');
    // For now, just call the regular print method
    this.printPurchaseReceipt(transaction);
  }

  // Print purchase report
  static printPurchaseReport(transactions: any[]) {
    const reportWindow = window.open('', '_blank');
    if (!reportWindow) return;
    
    const totalPurchases = transactions.reduce((sum, t) => sum + t.total, 0);
    const totalTransactions = transactions.length;
    
    const reportContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Purchase Report</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f2f2f2;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
            }
            .summary {
              margin: 20px 0;
              padding: 15px;
              background-color: #f9f9f9;
              border-radius: 5px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Purchase Report</h1>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
          </div>
          
          <div class="summary">
            <h2>Summary</h2>
            <p><strong>Total Purchases:</strong> $${totalPurchases.toFixed(2)}</p>
            <p><strong>Total Transactions:</strong> ${totalTransactions}</p>
            <p><strong>Average Transaction:</strong> $${(totalPurchases / totalTransactions).toFixed(2)}</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Transaction ID</th>
                <th>Supplier</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${transactions.map(transaction => `
                <tr>
                  <td>${new Date(transaction.date).toLocaleDateString()}</td>
                  <td>${transaction.id}</td>
                  <td>${transaction.supplier}</td>
                  <td>${transaction.items} items</td>
                  <td>$${transaction.total.toFixed(2)}</td>
                  <td>${transaction.status}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    
    reportWindow.document.write(reportContent);
    reportWindow.document.close();
    reportWindow.focus();
    
    // Give time for content to load before printing
    setTimeout(() => {
      reportWindow.print();
      reportWindow.close();
    }, 250);
  }

  // Print sales report
  static printSalesReport(transactions: any[]) {
    const reportWindow = window.open('', '_blank');
    if (!reportWindow) return;
    
    const totalSales = transactions.reduce((sum, t) => sum + t.total, 0);
    const totalTransactions = transactions.length;
    
    const reportContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Sales Report</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f2f2f2;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
            }
            .summary {
              margin: 20px 0;
              padding: 15px;
              background-color: #f9f9f9;
              border-radius: 5px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Sales Report</h1>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
          </div>
          
          <div class="summary">
            <h2>Summary</h2>
            <p><strong>Total Sales:</strong> $${totalSales.toFixed(2)}</p>
            <p><strong>Total Transactions:</strong> ${totalTransactions}</p>
            <p><strong>Average Transaction:</strong> $${(totalSales / totalTransactions).toFixed(2)}</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Transaction ID</th>
                <th>Items</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${transactions.map(transaction => `
                <tr>
                  <td>${new Date(transaction.date).toLocaleDateString()}</td>
                  <td>${transaction.id}</td>
                  <td>${transaction.items.length} items</td>
                  <td>$${transaction.total.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    
    reportWindow.document.write(reportContent);
    reportWindow.document.close();
    reportWindow.focus();
    
    // Give time for content to load before printing
    setTimeout(() => {
      reportWindow.print();
      reportWindow.close();
    }, 250);
  }

  // Print financial report with summary header and table layout
  static printFinancialReport(reportData: any) {
    try {
      const reportWindow = window.open('', '_blank', 'width=800,height=600');
      if (!reportWindow) {
        console.error('Failed to open print window');
        return;
      }
      
      let reportContent = '';
      
      // Check if data exists
      if (!reportData.data || reportData.data.length === 0) {
        // Create a simple message for empty data
        reportContent = `
          <!DOCTYPE html>
          <html>
            <head>
              <title>${reportData.title}</title>
              <style>
                body {
                  font-family: Arial, sans-serif;
                  margin: 20px;
                  color: #333;
                  text-align: center;
                }
                .header {
                  text-align: center;
                  border-bottom: 2px solid #333;
                  padding-bottom: 10px;
                  margin-bottom: 20px;
                }
                .report-title {
                  font-size: 24px;
                  font-weight: bold;
                  margin-bottom: 5px;
                }
                .report-period {
                  font-size: 16px;
                  color: #666;
                  margin-bottom: 10px;
                }
                .message {
                  font-size: 18px;
                  margin: 50px 0;
                  color: #666;
                }
              </style>
            </head>
            <body>
              <div class="header">
                <div class="report-title">${reportData.title}</div>
                <div class="report-period">${reportData.period || 'Current Period'}</div>
              </div>
              
              <div class="message">
                No data available for the selected date range
              </div>
              
              <div style="position: fixed; bottom: 20px; width: 100%; text-align: center; font-size: 12px; color: #999;">
                Generated on: ${new Date().toLocaleDateString()}<br/>
                Confidential - For Internal Use Only
              </div>
            </body>
          </html>
        `;
      } else {
        // Determine if this is a table-based report by checking if data has specific fields
        const hasTableStructure = reportData.data && reportData.data.length > 0 && 
                                 typeof reportData.data[0] === 'object' && 
                                 ('productName' in reportData.data[0] || 'customerName' in reportData.data[0] || 
                                  'supplierName' in reportData.data[0] || 'itemName' in reportData.data[0] ||
                                  'reference' in reportData.data[0] || 'transactionId' in reportData.data[0] ||
                                  'invoiceNumber' in reportData.data[0]);
        
        if (hasTableStructure) {
          // Create table-based report with summary header
          // Determine columns based on the keys in the first data item
          const firstItem = reportData.data[0];
          const columns = Object.keys(firstItem).filter(key => key !== 'id'); // exclude id from display
          
          const tableRows = reportData.data.map((item: any, index: number) => {
            let row = '<tr>';
            // Add row number
            row += `<td>${index + 1}</td>`;
            columns.forEach(col => {
              let value = item[col];
              
              // Handle undefined/null values
              if (value === undefined || value === null) {
                value = 'N/A';
              }
              
              // Format dates
              if (col.toLowerCase().includes('date') && value !== 'N/A' && typeof value === 'string') {
                try {
                  value = new Date(value).toLocaleDateString();
                } catch (e) {
                  value = 'Invalid Date';
                }
              }
              
              row += `<td>${value}</td>`;
            });
            row += '</tr>';
            return row;
          }).join('');
          
          // Create a mapping of camelCase field names to human-readable labels
          const fieldLabels: Record<string, string> = {
            'invoiceNumber': 'Invoice #',
            'date': 'Date',
            'customer': 'Customer',
            'items': 'Items',
            'total': 'Total',
            'status': 'Status',
            'transactionId': 'Transaction ID',
            'paymentMethod': 'Payment Method',
            'category': 'Category',
            'description': 'Description',
            'amount': 'Amount',
            'price': 'Price',
            'cost': 'Cost',
            'stock': 'Stock',
            'barcode': 'Barcode',
            'email': 'Email',
            'phone': 'Phone',
            'loyaltyPoints': 'Loyalty Points',
            'totalSpent': 'Total Spent',
            'contactPerson': 'Contact Person',
            'products': 'Products',
            'reference': 'Reference',
            'previousBalance': 'Previous Balance',
            'amountPaid': 'Amount Paid',
            'newBalance': 'New Balance',
            'productName': 'Product',
            'customerName': 'Customer',
            'supplierName': 'Supplier',
            'itemName': 'Item'
          };
          
          const tableHeaders = `<th>#</th>${columns.map(col => {
            // Use the mapped label if available, otherwise format the camelCase name
            const label = fieldLabels[col] || col.replace(/([A-Z])/g, ' $1').replace(/^\w/, c => c.toUpperCase());
            return `<th>${label}</th>`;
          }).join('')}`;
          
          // Create summary information based on the report type
          let summaryInfo = '';
          
          if (reportData.title.toLowerCase().includes('settlement')) {
            const totalSettlements = reportData.data.length;
            const totalAmount = reportData.data.reduce((sum: number, item: any) => {
              // Use amountPaidRaw if available (for formatted reports), otherwise use amountPaid
              const amountValue = item.amountPaidRaw !== undefined ? item.amountPaidRaw : item.amountPaid;
              if (typeof amountValue === 'number') {
                return sum + amountValue;
              } else if (typeof amountValue === 'string') {
                const numericValue = parseFloat(amountValue.replace(/[^0-9.,-]/g, ''));
                return sum + (isNaN(numericValue) ? 0 : numericValue);
              }
              return sum;
            }, 0);
            
            summaryInfo = `
              <div class="summary">
                <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                  <div>Total Settlements (${reportData.period || 'Current'}): ${totalSettlements}</div>
                  <div>Total Amount: ${new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS' }).format(totalAmount)}</div>
                </div>
              </div>
            `;
          } else if (reportData.title.toLowerCase().includes('sale') || reportData.title.toLowerCase().includes('transaction')) {
            const totalTransactions = reportData.data.length;
            const totalAmount = reportData.data.reduce((sum: number, item: any) => {
              // Use totalRaw if available (for formatted reports), otherwise use total
              const amountValue = item.totalRaw !== undefined ? item.totalRaw : item.total;
              if (typeof amountValue === 'number') {
                return sum + amountValue;
              } else if (typeof amountValue === 'string') {
                const numericValue = parseFloat(amountValue.replace(/[^0-9.,-]/g, ''));
                return sum + (isNaN(numericValue) ? 0 : numericValue);
              }
              return sum;
            }, 0);
            
            summaryInfo = `
              <div class="summary">
                <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                  <div>Total Transactions (${reportData.period || 'Current'}): ${totalTransactions}</div>
                  <div>Total Amount: ${new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS' }).format(totalAmount)}</div>
                </div>
              </div>
            `;
          } else if (reportData.title.toLowerCase().includes('expense')) {
            const totalExpenses = reportData.data.length;
            const totalAmount = reportData.data.reduce((sum: number, item: any) => {
              // Use amountRaw if available (for formatted reports), otherwise use amount
              const amountValue = item.amountRaw !== undefined ? item.amountRaw : item.amount;
              if (typeof amountValue === 'number') {
                return sum + amountValue;
              } else if (typeof amountValue === 'string') {
                const numericValue = parseFloat(amountValue.replace(/[^0-9.,-]/g, ''));
                return sum + (isNaN(numericValue) ? 0 : numericValue);
              }
              return sum;
            }, 0);
            
            summaryInfo = `
              <div class="summary">
                <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                  <div>Total Expenses (${reportData.period || 'Current'}): ${totalExpenses}</div>
                  <div>Total Amount: ${new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS' }).format(totalAmount)}</div>
                </div>
              </div>
            `;
          } else if (reportData.title.toLowerCase().includes('invoice')) {
            const totalInvoices = reportData.data.length;
            const totalAmount = reportData.data.reduce((sum: number, item: any) => {
              // Use totalRaw if available (for formatted reports), otherwise use total
              const amountValue = item.totalRaw !== undefined ? item.totalRaw : item.total;
              if (typeof amountValue === 'number') {
                return sum + amountValue;
              } else if (typeof amountValue === 'string') {
                const numericValue = parseFloat(amountValue.replace(/[^0-9.,-]/g, ''));
                return sum + (isNaN(numericValue) ? 0 : numericValue);
              }
              return sum;
            }, 0);
            
            summaryInfo = `
              <div class="summary">
                <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                  <div>Total Invoices (${reportData.period || 'Current'}): ${totalInvoices}</div>
                  <div>Total Amount: ${new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS' }).format(totalAmount)}</div>
                </div>
              </div>
            `;
          } else {
            // For other report types, just show the count
            summaryInfo = `
              <div class="summary">
                <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                  <div>Total Records (${reportData.period || 'Current'}): ${reportData.data.length}</div>
                </div>
              </div>
            `;
          }
          
          reportContent = `
            <!DOCTYPE html>
            <html>
              <head>
                <title>${reportData.title}</title>
                <style>
                  body {
                    font-family: Arial, sans-serif;
                    margin: 20px;
                    color: #333;
                  }
                  .header {
                    text-align: center;
                    border-bottom: 2px solid #333;
                    padding-bottom: 10px;
                    margin-bottom: 20px;
                  }
                  .report-title {
                    font-size: 24px;
                    font-weight: bold;
                    margin-bottom: 5px;
                  }
                  .report-period {
                    font-size: 16px;
                    color: #666;
                    margin-bottom: 10px;
                  }
                  table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 20px 0;
                  }
                  th, td {
                    border: 1px solid #ddd;
                    padding: 8px;
                    text-align: left;
                  }
                  th {
                    background-color: #f2f2f2;
                    font-weight: bold;
                  }
                  .footer {
                    margin-top: 30px;
                    text-align: center;
                    font-size: 12px;
                    color: #999;
                  }
                </style>
              </head>
              <body>
                <div class="header">
                  <div class="report-title">${reportData.title}</div>
                  <div class="report-period">${reportData.period || 'Current Period'}</div>
                </div>
                
                ${summaryInfo}
                
                <table>
                  <thead>
                    <tr>${tableHeaders}</tr>
                  </thead>
                  <tbody>
                    ${tableRows}
                  </tbody>
                </table>
                
                <div class="footer">
                  <p>Generated on: ${new Date().toLocaleDateString()}</p>
                  <p>Confidential - For Internal Use Only</p>
                </div>
              </body>
            </html>
          `;
        } else {
          // Create list-based report (original format)
          reportContent = `
            <!DOCTYPE html>
            <html>
              <head>
                <title>${reportData.title}</title>
                <style>
                  body {
                    font-family: Arial, sans-serif;
                    margin: 20px;
                    color: #333;
                  }
                  .header {
                    text-align: center;
                    border-bottom: 2px solid #333;
                    padding-bottom: 10px;
                    margin-bottom: 20px;
                  }
                  .report-title {
                    font-size: 24px;
                    font-weight: bold;
                    margin-bottom: 5px;
                  }
                  .report-period {
                    font-size: 16px;
                    color: #666;
                    margin-bottom: 10px;
                  }
                  .report-data {
                    margin: 20px 0;
                  }
                  .data-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 0;
                    border-bottom: 1px solid #eee;
                  }
                  .data-label {
                    font-weight: bold;
                  }
                  .data-value {
                    font-weight: bold;
                  }
                  .footer {
                    margin-top: 30px;
                    text-align: center;
                    font-size: 12px;
                    color: #999;
                  }
                </style>
              </head>
              <body>
                <div class="header">
                  <div class="report-title">${reportData.title}</div>
                  <div class="report-period">${reportData.period || 'Current Period'}</div>
                </div>
                
                <div class="report-data">
                  ${reportData.data.map((item: any) => `
                    <div class="data-row">
                      <span class="data-label">${item.name}:</span>
                      <span class="data-value">${item.value}</span>
                    </div>
                  `).join('')}
                </div>
                
                <div class="footer">
                  <p>Generated on: ${new Date().toLocaleDateString()}</p>
                  <p>Confidential - For Internal Use Only</p>
                </div>
              </body>
            </html>
          `;
        }
      }
      
      reportWindow.document.write(reportContent);
      reportWindow.document.close();
      reportWindow.focus();
      
      // Give time for content to load before printing
      setTimeout(() => {
        reportWindow.print();
        reportWindow.close();
      }, 500); // Increased timeout to ensure content loads
    } catch (error) {
      console.error('Error in printFinancialReport:', error);
      alert('There was an error generating the print report. Please try again.');
    }
  }

  // Print income statement
  static printIncomeStatement(data: any) {
    const reportWindow = window.open('', '_blank');
    if (!reportWindow) return;
    
    // Format numbers with proper signs
    const formatAmount = (amount: number, isNegativeFormat: boolean = false) => {
      if (isNegativeFormat && amount > 0) {
        return `(${amount.toLocaleString()})`;
      } else if (!isNegativeFormat && amount < 0) {
        return `(${Math.abs(amount).toLocaleString()})`;
      } else {
        return amount.toLocaleString();
      }
    };
    
    const formatOtherIncome = (amount: number) => {
      if (amount >= 0) {
        return `+${amount.toLocaleString()}`;
      } else {
        return `(${Math.abs(amount).toLocaleString()})`;
      }
    };
    
    const reportContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Income Statement</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              color: #333;
              font-size: 14px;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
            }
            .business-name {
              font-size: 20px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .report-title {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .report-period {
              font-size: 14px;
              color: #666;
              margin-bottom: 20px;
            }
            .report-table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            .report-table th {
              text-align: left;
              border-bottom: 1px solid #333;
              padding: 8px 0;
            }
            .report-table td {
              padding: 8px 0;
            }
            .text-right {
              text-align: right;
            }
            .font-semibold {
              font-weight: 600;
            }
            .font-bold {
              font-weight: bold;
            }
            .border-t {
              border-top: 1px solid #333;
            }
            .border-b {
              border-bottom: 1px solid #ccc;
            }
            .border-t-2 {
              border-top: 2px solid #333;
            }
            .border-b-2 {
              border-bottom: 2px solid #333;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 12px;
              color: #999;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="business-name">${data.businessName}</div>
            <div class="report-title">INCOME STATEMENT</div>
            <div class="report-period">For the period ended ${data.period}</div>
          </div>
          
          <table class="report-table">
            <thead>
              <tr>
                <th>Section</th>
                <th class="text-right">Description</th>
                <th class="text-right">Amount Inclusive (TZS)</th>
                <th class="text-right">VAT Amount (TZS)</th>
                <th class="text-right">Amount Exclusive (TZS)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="font-semibold">1. Revenue (Sales)</td>
                <td class="text-right">Total sales to customers</td>
                <td class="text-right font-semibold">${data.revenue.toLocaleString()}</td>
                <td class="text-right font-semibold">${data.revenueVat.toLocaleString()}</td>
                <td class="text-right font-semibold">${data.revenueExclusive.toLocaleString()}</td>
              </tr>
              <tr>
                <td class="font-semibold">2. Cost of Goods Sold (COGS)</td>
                <td class="text-right">Cost of items sold — includes purchases, transport, and other direct costs</td>
                <td class="text-right font-semibold">${formatAmount(data.cogs, true)}</td>
                <td class="text-right font-semibold">${data.cogsVat.toLocaleString()}</td>
                <td class="text-right font-semibold">${data.cogsExclusive.toLocaleString()}</td>
              </tr>
              <tr class="border-t border-b">
                <td class="font-semibold">= Gross Profit/Loss</td>
                <td class="text-right">Revenue − COGS</td>
                <td class="text-right font-semibold">${data.grossProfit.toLocaleString()}</td>
                <td class="text-right font-semibold">${(data.revenueVat - data.cogsVat).toLocaleString()}</td>
                <td class="text-right font-semibold">${(data.revenueExclusive - data.cogsExclusive).toLocaleString()}</td>
              </tr>
              <tr>
                <td class="font-semibold">3. Operating Expenses</td>
                <td class="text-right">Rent, salaries, utilities, admin, etc.</td>
                <td class="text-right font-semibold">${formatAmount(data.operatingExpenses, true)}</td>
                <td class="text-right font-semibold">${data.operatingExpensesVat.toLocaleString()}</td>
                <td class="text-right font-semibold">${data.operatingExpensesExclusive.toLocaleString()}</td>
              </tr>
              <tr class="border-t border-b">
                <td class="font-semibold">= Operating Profit/Loss</td>
                <td class="text-right">Gross Profit/Loss − Operating Expenses</td>
                <td class="text-right font-semibold">${data.operatingProfit.toLocaleString()}</td>
                <td class="text-right font-semibold">${(data.revenueVat - data.cogsVat - data.operatingExpensesVat).toLocaleString()}</td>
                <td class="text-right font-semibold">${(data.revenueExclusive - data.cogsExclusive - data.operatingExpensesExclusive).toLocaleString()}</td>
              </tr>
              <tr>
                <td class="font-semibold">4. Other Income / Expenses</td>
                <td class="text-right">Interest, asset sales, etc.</td>
                <td class="text-right font-semibold">${formatOtherIncome(data.otherIncomeExpenses)}</td>
                <td class="text-right font-semibold">${data.otherIncomeExpensesVat.toLocaleString()}</td>
                <td class="text-right font-semibold">${data.otherIncomeExpensesExclusive.toLocaleString()}</td>
              </tr>
              <tr>
                <td class="font-semibold">5. Tax (Income Tax)</td>
                <td class="text-right">Based on profit/loss before tax</td>
                <td class="text-right font-semibold">${formatAmount(data.tax, true)}</td>
                <td class="text-right font-semibold">${data.tax.toLocaleString()}</td>
                <td class="text-right font-semibold">0</td>
              </tr>
              <tr class="border-t-2 border-b-2">
                <td class="font-bold">= Net Profit/Loss</td>
                <td class="text-right">Final profit/Loss after all costs and tax</td>
                <td class="text-right font-bold">${data.netProfit.toLocaleString()}</td>
                <td class="text-right font-bold">${(data.revenueVat - data.cogsVat - data.operatingExpensesVat + data.otherIncomeExpensesVat - data.tax).toLocaleString()}</td>
                <td class="text-right font-bold">${(data.revenueExclusive - data.cogsExclusive - data.operatingExpensesExclusive + data.otherIncomeExpensesExclusive).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
          
          <div class="footer">
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
            <p>Confidential - For Internal Use Only</p>
          </div>
        </body>
      </html>
    `;
    
    reportWindow.document.write(reportContent);
    reportWindow.document.close();
    reportWindow.focus();
    
    // Give time for content to load before printing
    setTimeout(() => {
      reportWindow.print();
      reportWindow.close();
    }, 250);
  }

  // Print delivery note in template format
  static printDeliveryNote(delivery: any) {
    // Show loading indicator
    this.showLoadingIndicator('Preparing delivery note...');
    
    // For mobile devices, use the mobile print approach
    if (this.isMobileDevice()) {
      return this.printDeliveryNoteMobile(delivery);
    }

    // For desktop, use a hidden iframe approach to avoid window stacking
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'absolute';
    printFrame.style.top = '-1000px';
    printFrame.style.left = '-1000px';
    document.body.appendChild(printFrame);
    
    const printDocument = printFrame.contentDocument || printFrame.contentWindow?.document;
    if (!printDocument) {
      this.hideLoadingIndicator();
      console.error('Could not access print frame document');
      return;
    }
    
    // Format the delivery note content
    const deliveryNoteContent = `<!DOCTYPE html>
<html>
  <head>
    <title>Delivery Note</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      @media print {
        @page {
          margin: 0.5in;
          size: auto;
        }
        body {
          margin: 0.5in;
          padding: 0;
        }
      }
      body {
        font-family: 'Courier New', monospace;
        font-size: 12px;
        max-width: 320px;
        margin: 0 auto;
        padding: 10px;
      }
      .header {
        text-align: center;
        border-bottom: 1px dashed #000;
        padding-bottom: 10px;
        margin-bottom: 10px;
      }
      .business-name {
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 5px;
      }
      .business-info {
        font-size: 10px;
        margin-bottom: 5px;
      }
      .delivery-info {
        display: flex;
        justify-content: space-between;
        font-size: 10px;
        margin-bottom: 10px;
      }
      .customer-info {
        border: 1px solid #ccc;
        padding: 8px;
        margin-bottom: 10px;
        background-color: #f9f9f9;
      }
      .customer-name {
        font-weight: bold;
        margin-bottom: 3px;
      }
      .customer-detail {
        font-size: 10px;
        margin-bottom: 2px;
      }
      .items {
        margin-bottom: 10px;
      }
      .item {
        display: flex;
        margin-bottom: 5px;
      }
      .item-name {
        flex: 2;
      }
      .item-details {
        flex: 1;
        text-align: right;
      }
      .item-price::before {
        content: "@ ";
      }
      .item-total {
        font-weight: bold;
      }
      .totals {
        border-top: 1px dashed #000;
        padding-top: 10px;
        margin-top: 10px;
      }
      .total-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 5px;
      }
      .final-total {
        font-weight: bold;
        font-size: 14px;
        margin: 10px 0;
      }
      .footer {
        text-align: center;
        margin-top: 20px;
        font-size: 10px;
      }
      .thank-you {
        font-weight: bold;
        margin-bottom: 10px;
      }
      .signature-section {
        margin-top: 30px;
        border-top: 1px solid #000;
        padding-top: 10px;
      }
      .signature-row {
        display: flex;
        justify-content: space-between;
        margin-top: 30px;
      }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="business-name">POS BUSINESS</div>
      <div class="business-info">123 Business St, City, Country</div>
      <div class="business-info">Phone: (123) 456-7890</div>
    </div>
    
    <div class="delivery-info">
      <div>Delivery #: ${delivery.deliveryNoteNumber || 'DN-' + Date.now()}</div>
      <div>${new Date(delivery.date).toLocaleDateString()}</div>
    </div>
    
    <div class="customer-info">
      <div class="customer-name">${delivery.customer}</div>
      ${delivery.vehicle ? `<div class="customer-detail">Vehicle: ${delivery.vehicle}</div>` : ''}
      ${delivery.driver ? `<div class="customer-detail">Driver: ${delivery.driver}</div>` : ''}
    </div>
    
    <div class="items">
      <div style="font-weight: bold; margin-bottom: 5px;">Items:</div>
      ${delivery.itemsList && delivery.itemsList.length > 0 ? 
        delivery.itemsList.map((item: any) => `
          <div class="item">
            <div class="item-name">${item.name || item.productName}</div>
            <div class="item-details">${item.quantity} x @ ${item.price?.toFixed(2) || item.unitPrice?.toFixed(2) || '0.00'}</div>
            <div class="item-total">${(item.total || (item.price * item.quantity) || (item.unitPrice * item.quantity)).toFixed(2)}</div>
          </div>
        `).join('') : 
        `<div>No items</div>`}
    </div>
    
    <div class="totals">
      <div class="total-row">
        <div>Subtotal:</div>
        <div>${(delivery.subtotal || 0).toFixed(2)}</div>
      </div>
      ${delivery.tax ? `
        <div class="total-row">
          <div>Tax:</div>
          <div>${delivery.tax.toFixed(2)}</div>
        </div>
      ` : ''}
      ${delivery.discount ? `
        <div class="total-row">
          <div>Discount:</div>
          <div>${delivery.discount.toFixed(2)}</div>
        </div>
      ` : ''}
      <div class="total-row">
        <div>Total:</div>
        <div>${delivery.total.toFixed(2)}</div>
      </div>
    </div>
    
    ${delivery.deliveryNotes ? `
      <div style="margin: 10px 0;">
        <div style="font-weight: bold; margin-bottom: 5px;">Special Instructions:</div>
        <div>${delivery.deliveryNotes}</div>
      </div>
    ` : ''}
    
    <div class="signature-section">
      <div class="signature-row">
        <div>Received by: _________________</div>
        <div>Date: _________________</div>
      </div>
    </div>
    
    <div class="footer">
      <div class="thank-you">Thank you for your business!</div>
      <div>For more info, visit us at www.posbusiness.com</div>
    </div>
  </body>
</html>`;
    
    // Write content to iframe and print
    printDocument.open();
    printDocument.write(deliveryNoteContent);
    printDocument.close();
    
    // Wait for content to load before printing
    printFrame.onload = () => {
      try {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
      } catch (error) {
        console.error('Error during printing:', error);
      } finally {
        // Clean up - remove iframe after a short delay to ensure printing started
        setTimeout(() => {
          if (printFrame.parentNode) {
            printFrame.parentNode.removeChild(printFrame);
          }
          this.hideLoadingIndicator();
        }, 1000);
      }
    };
    
    // Fallback cleanup in case onload doesn't fire
    setTimeout(() => {
      if (printFrame.parentNode) {
        printFrame.parentNode.removeChild(printFrame);
      }
      this.hideLoadingIndicator();
    }, 5000);
  }

  // Mobile print delivery note
  static printDeliveryNoteMobile(delivery: any) {
    console.log('Using mobile print approach for delivery note...');
    
    // Create a modal dialog for mobile printing with a clear print button
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    modal.style.zIndex = '10000';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    
    // Format the delivery note content
    const deliveryNoteContent = `
      <div style="background: white; padding: 20px; max-width: 90%; max-height: 80%; overflow-y: auto;">
        <h2 style="text-align: center; margin-bottom: 20px;">Delivery Note Preview</h2>
        <div style="font-family: monospace; font-size: 14px;">
          <div style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px;">
            <div style="font-weight: bold; font-size: 18px;">POS BUSINESS</div>
            <div style="font-size: 12px;">123 Business St, City, Country</div>
            <div style="font-size: 12px;">Phone: (123) 456-7890</div>
          </div>
          
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 10px;">
            <div>Delivery #: ${delivery.deliveryNoteNumber || 'DN-' + Date.now()}</div>
            <div>${new Date(delivery.date).toLocaleDateString()}</div>
          </div>
          
          <div style="padding: 8px; margin-bottom: 10px; background-color: #f9f9f9;">
            <div style="font-weight: bold; margin-bottom: 3px;">${delivery.customer}</div>
            ${delivery.vehicle ? `<div style="font-size: 10px; margin-bottom: 2px;">Vehicle: ${delivery.vehicle}</div>` : ''}
            ${delivery.driver ? `<div style="font-size: 10px; margin-bottom: 2px;">Driver: ${delivery.driver}</div>` : ''}
          </div>
          
          <div style="margin-bottom: 15px;">
            <div style="font-weight: bold; margin-bottom: 5px;">Items:</div>
            ${delivery.itemsList && delivery.itemsList.length > 0 ? 
              delivery.itemsList.map((item: any) => `
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                  <div>${item.name || item.productName}</div>
                  <div>${item.quantity} x @ ${(item.price || item.unitPrice || 0).toFixed(2)}</div>
                  <div>${(item.total || (item.price * item.quantity) || (item.unitPrice * item.quantity)).toFixed(2)}</div>
                </div>
              `).join('') : 
              `<div>No items</div>`}
          </div>
          
          <div style="border-top: 1px dashed #000; padding-top: 10px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <div>Subtotal:</div>
              <div>${(delivery.subtotal || 0).toFixed(2)}</div>
            </div>
            ${delivery.tax ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <div>Tax:</div>
                <div>${delivery.tax.toFixed(2)}</div>
              </div>
            ` : ''}
            ${delivery.discount ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <div>Discount:</div>
                <div>${delivery.discount.toFixed(2)}</div>
              </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 10px;">
              <div>Total:</div>
              <div>${delivery.total.toFixed(2)}</div>
            </div>
          </div>
          
          ${delivery.deliveryNotes ? `
            <div style="margin: 10px 0;">
              <div style="font-weight: bold; margin-bottom: 5px;">Special Instructions:</div>
              <div style="font-size: 12px;">${delivery.deliveryNotes}</div>
            </div>
          ` : ''}
          
          <div style="margin-top: 30px; border-top: 1px solid #000; padding-top: 10px;">
            <div style="display: flex; justify-content: space-between; margin-top: 30px;">
              <div>Received by: _________________</div>
              <div>Date: _________________</div>
            </div>
          </div>
        </div>
        
        <div style="display: flex; gap: 10px; margin-top: 20px;">
          <button id="cancelPrint" style="flex: 1; padding: 12px; background: #ccc; border: none; border-radius: 5px; font-size: 16px;">Cancel</button>
          <button id="confirmPrint" style="flex: 1; padding: 12px; background: #4CAF50; color: white; border: none; border-radius: 5px; font-size: 16px;">Print Delivery Note</button>
        </div>
      </div>
    `;
    
    modal.innerHTML = deliveryNoteContent;
    document.body.appendChild(modal);
    
    // Add event listeners
    const confirmBtn = modal.querySelector('#confirmPrint');
    const cancelBtn = modal.querySelector('#cancelPrint');
    
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        // Use the standard print method for mobile
        this.printDeliveryNote(delivery);
        document.body.removeChild(modal);
      });
    }
    
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
      });
    }
  }

  // Print purchase order
  static printPurchaseOrder(poData: any) {
    const reportWindow = window.open('', '_blank');
    if (!reportWindow) return;
    
    const reportContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Purchase Order ${poData.orderNumber}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              color: #333;
              font-size: 14px;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              border-bottom: 2px solid #333;
              padding-bottom: 10px;
            }
            .business-name {
              font-size: 20px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .report-title {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .report-info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 20px;
            }
            .info-section {
              flex: 1;
            }
            .info-label {
              font-weight: bold;
              margin-bottom: 5px;
            }
            .report-table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            .report-table th {
              text-align: left;
              border-bottom: 1px solid #333;
              padding: 8px;
              background-color: #f5f5f5;
            }
            .report-table td {
              padding: 8px;
              border-bottom: 1px solid #eee;
            }
            .text-right {
              text-align: right;
            }
            .font-semibold {
              font-weight: 600;
            }
            .font-bold {
              font-weight: bold;
            }
            .border-t {
              border-top: 1px solid #333;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 12px;
              color: #999;
            }
            .total-section {
              margin-top: 20px;
              text-align: right;
            }
            .total-row {
              display: flex;
              justify-content: flex-end;
              margin-bottom: 5px;
            }
            .total-label {
              width: 150px;
              font-weight: bold;
            }
            .total-value {
              width: 100px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="business-name">POS BUSINESS</div>
            <div class="report-title">PURCHASE ORDER</div>
            <div>Order #: ${poData.orderNumber}</div>
          </div>
          
          <div class="report-info">
            <div class="info-section">
              <div class="info-label">Supplier</div>
              <div>${poData.supplier.name}</div>
            </div>
            <div class="info-section">
              <div class="info-label">Date</div>
              <div>${new Date(poData.date).toLocaleDateString()}</div>
            </div>
          </div>
          
          <table class="report-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${poData.items.map((item: any) => `
                <tr>
                  <td>${item.productName}</td>
                  <td>${item.quantity}</td>
                  <td>${item.unitPrice.toFixed(2)}</td>
                  <td class="text-right">${item.total.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="total-section">
            <div class="total-row">
              <div class="total-label">Total:</div>
              <div class="total-value">${poData.total.toFixed(2)}</div>
            </div>
          </div>
          
          <div class="footer">
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
            <p>Thank you for your business!</p>
          </div>
        </body>
      </html>
    `;
    
    reportWindow.document.write(reportContent);
    reportWindow.document.close();
    reportWindow.focus();
    
    // Give time for content to load before printing
    setTimeout(() => {
      reportWindow.print();
      reportWindow.close();
    }, 250);
  }
}