// Utility functions for exporting data
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export class ExportUtils {
  // Export data to CSV
  static exportToCSV(data: any[], filename: string) {
    if (!data || data.length === 0) return;

    // Create CSV content
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => 
      Object.values(row).map(value => {
        // Escape commas and quotes in values
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    );
    
    const csvContent = [headers, ...rows].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Export data to JSON
  static exportToJSON(data: any[], filename: string) {
    if (!data) return;

    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Export data to PDF using jsPDF for better mobile compatibility
  static exportToPDF(data: any[], filename: string, title: string) {
    if (!data || data.length === 0) return;

    // Create a new jsPDF instance
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Add title
    doc.setFontSize(18);
    doc.text(title, doc.internal.pageSize.width / 2, 20, { align: 'center' });

    // Prepare table data
    const headers = Object.keys(data[0]);
    const rows = data.map(row => Object.values(row));

    // Add table using autoTable
    (doc as any).autoTable({
      head: [headers],
      body: rows,
      startY: 30,
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250]
      },
      margin: { top: 30, left: 10, right: 10, bottom: 10 }
    });

    // Check if we're on a mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      // For mobile devices, save the PDF and show notification
      doc.save(`${filename}.pdf`);
      this.showPreviewNotification("PDF saved to your device. Check your downloads folder.");
    } else {
      // For desktop, save the PDF
      doc.save(`${filename}.pdf`);
    }
  }

  // Export transaction receipt as PDF using jsPDF
  static exportReceiptAsPDF(transaction: any, filename: string) {
    if (!transaction) return;

    // Create a new jsPDF instance (receipt size)
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 297] // 80mm width (standard receipt width) x 297mm height
    });

    // Set font and size for receipt
    doc.setFontSize(12);
    
    // Add business header
    doc.setFont(undefined, 'bold');
    doc.text('POS BUSINESS', doc.internal.pageSize.width / 2, 10, { align: 'center' });
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    doc.text('123 Business St, City, Country', doc.internal.pageSize.width / 2, 15, { align: 'center' });
    doc.text('Phone: (123) 456-7890', doc.internal.pageSize.width / 2, 19, { align: 'center' });
    
    // Add separator line
    doc.line(5, 22, doc.internal.pageSize.width - 5, 22);
    
    // Add transaction info
    doc.setFontSize(8);
    const receiptNumber = transaction.id || 'TXN-' + Date.now();
    const date = new Date().toLocaleDateString();
    const time = new Date().toLocaleTimeString();
    
    doc.text(`Receipt #: ${receiptNumber}`, 5, 27);
    doc.text(`Date: ${date}`, 5, 31);
    doc.text(`Time: ${time}`, 5, 35);
    
    // Add separator line
    doc.line(5, 38, doc.internal.pageSize.width - 5, 38);
    
    // Add customer info if available
    let currentY = 39;
    if (transaction.customer) {
      doc.setFont(undefined, 'bold');
      doc.text('Customer:', 5, currentY);
      doc.setFont(undefined, 'normal');
      currentY += 4;
      doc.text(transaction.customer.name, 5, currentY);
      currentY += 4;
      
      if (transaction.customer.address) {
        doc.text(transaction.customer.address, 5, currentY);
        currentY += 4;
      }
      
      if (transaction.customer.email) {
        doc.text(transaction.customer.email, 5, currentY);
        currentY += 4;
      }
      
      if (transaction.customer.phone) {
        doc.text(transaction.customer.phone, 5, currentY);
        currentY += 4;
      }
      
      // Add separator line
      doc.line(5, currentY, doc.internal.pageSize.width - 5, currentY);
      currentY += 3;
    }
    
    // Add items header
    doc.setFont(undefined, 'bold');
    doc.text('Items:', 5, currentY);
    currentY += 4;
    doc.setFont(undefined, 'normal');
    
    // Add items
    transaction.items.forEach((item: any) => {
      const total = item.price * item.quantity;
      const itemName = item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name;
      
      doc.text(itemName, 5, currentY);
      doc.text(`${item.quantity} @ ${item.price.toFixed(2)}`, 35, currentY);
      doc.text(`${total.toFixed(2)}`, doc.internal.pageSize.width - 15, currentY, { align: 'right' });
      currentY += 5;
    });
    
    // Add separator line
    doc.line(5, currentY, doc.internal.pageSize.width - 5, currentY);
    currentY += 3;
    
    // Add totals
    const formattedItems = transaction.items.map((item: any) => {
      const total = item.price * item.quantity;
      return { total };
    });
    
    const subtotal = transaction.subtotal || formattedItems.reduce((sum: number, item: any) => sum + item.total, 0);
    const tax = transaction.tax || 0;
    const discount = transaction.discount || 0;
    const total = transaction.total || (subtotal + tax - discount);
    const amountReceived = transaction.amountReceived || total;
    const change = transaction.change || (amountReceived - total);
    
    doc.text('Subtotal:', 5, currentY);
    doc.text(`${subtotal.toFixed(2)}`, doc.internal.pageSize.width - 15, currentY, { align: 'right' });
    currentY += 5;
    
    if (tax > 0) {
      doc.text('Tax:', 5, currentY);
      doc.text(`${tax.toFixed(2)}`, doc.internal.pageSize.width - 15, currentY, { align: 'right' });
      currentY += 5;
    }
    
    if (discount > 0) {
      doc.text('Discount:', 5, currentY);
      doc.text(`-${discount.toFixed(2)}`, doc.internal.pageSize.width - 15, currentY, { align: 'right' });
      currentY += 5;
    }
    
    doc.setFont(undefined, 'bold');
    doc.text('TOTAL:', 5, currentY);
    doc.text(`${total.toFixed(2)}`, doc.internal.pageSize.width - 15, currentY, { align: 'right' });
    currentY += 7;
    doc.setFont(undefined, 'normal');
    
    // Add payment info
    doc.text('Payment Method:', 5, currentY);
    doc.text(transaction.paymentMethod || 'Cash', doc.internal.pageSize.width - 15, currentY, { align: 'right' });
    currentY += 5;
    
    doc.text('Amount Received:', 5, currentY);
    doc.text(`${amountReceived.toFixed(2)}`, doc.internal.pageSize.width - 15, currentY, { align: 'right' });
    currentY += 5;
    
    doc.text('Change:', 5, currentY);
    doc.text(`${change.toFixed(2)}`, doc.internal.pageSize.width - 15, currentY, { align: 'right' });
    currentY += 7;
    
    // Add separator line
    doc.line(5, currentY, doc.internal.pageSize.width - 5, currentY);
    currentY += 5;
    
    // Add footer
    doc.setFontSize(8);
    doc.text('Thank you for your business!', doc.internal.pageSize.width / 2, currentY, { align: 'center' });
    currentY += 4;
    doc.text('Items sold are not returnable', doc.internal.pageSize.width / 2, currentY, { align: 'center' });
    currentY += 4;
    doc.text('Visit us again soon', doc.internal.pageSize.width / 2, currentY, { align: 'center' });
    
    // Check if we're on a mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      // For mobile devices, save the PDF and show notification
      doc.save(`${filename}.pdf`);
      this.showPreviewNotification("Receipt PDF saved to your device. Check your downloads folder.");
    } else {
      // For desktop, save the PDF
      doc.save(`${filename}.pdf`);
    }
  }

  // Show preview notification for mobile users
  static showPreviewNotification(message: string) {
    // Remove any existing notification
    const existingNotification = document.querySelector('#pdfNotification');
    if (existingNotification) {
      document.body.removeChild(existingNotification);
    }
    
    const notification = document.createElement('div');
    notification.id = 'pdfNotification';
    notification.style.position = 'fixed';
    notification.style.top = '10px';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';
    notification.style.backgroundColor = '#d4edda';
    notification.style.color = '#155724';
    notification.style.padding = '10px 20px';
    notification.style.borderRadius = '5px';
    notification.style.zIndex = '10001';
    notification.style.fontSize = '14px';
    notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    notification.style.maxWidth = '90%';
    notification.style.textAlign = 'center';
    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <span>📄 ${message}</span>
      </div>
    `;
    document.body.appendChild(notification);
    
    // Auto-hide notification after 5 seconds
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 5000);
  }

  // Export transaction receipt (plain text version)
  static exportReceipt(transaction: any, filename: string) {
    const receiptContent = `
      ================================
              SALE RECEIPT
      ================================
      Date: ${new Date().toLocaleDateString()}
      Time: ${new Date().toLocaleTimeString()}
      
      Items:
      ${transaction.items.map((item: any) => 
        `${item.name} x${item.quantity} @ ${item.price.toFixed(2)} = ${(item.price * item.quantity).toFixed(2)}`
      ).join('\n      ')}
      
      -------------------------------
      Subtotal: ${transaction.subtotal.toFixed(2)}
      Tax: ${transaction.tax.toFixed(2)}
      Discount: ${transaction.discount.toFixed(2)}
      Total: ${transaction.total.toFixed(2)}
      -------------------------------
      
      Payment Method: ${transaction.paymentMethod}
      Amount Received: ${transaction.amountReceived.toFixed(2)}
      Change: ${transaction.change.toFixed(2)}
      
      Thank you for your business!
      ================================
    `;

    const blob = new Blob([receiptContent], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.txt`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}