// Utility functions for exporting data
import jsPDF from 'jspdf';

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
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    
    // Add title
    doc.setFontSize(16);
    doc.text(title, 14, 15);

    // Prepare table data
    const headers = Object.keys(data[0]);
    const rows = data.map(row => Object.values(row).map(v => String(v)));

    // Manual table creation without autoTable
    const startY = 25;
    const rowHeight = 7;
    const colWidth = (doc.internal.pageSize.width - 28) / headers.length;
    
    // Draw header row
    doc.setFontSize(8);
    doc.setFillColor(240, 240, 240);
    doc.rect(14, startY, colWidth * headers.length, rowHeight, 'F');
    
    headers.forEach((header, i) => {
      doc.text(header, 14 + (i * colWidth) + 2, startY + 5);
    });
    
    // Draw data rows
    doc.setFillColor(255, 255, 255);
    rows.forEach((row, rowIdx) => {
      const y = startY + rowHeight + (rowIdx * rowHeight);
      
      // Alternate row colors
      if (rowIdx % 2 === 1) {
        doc.setFillColor(250, 250, 250);
        doc.rect(14, y, colWidth * headers.length, rowHeight, 'F');
      }
      
      row.forEach((cell, colIdx) => {
        doc.text(cell.substring(0, 30), 14 + (colIdx * colWidth) + 2, y + 5);
      });
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

  // Export customer settlement as PDF using jsPDF
  static exportCustomerSettlementAsPDF(settlement: any, filename: string) {
    if (!settlement) return;

    // Create a new jsPDF instance (receipt size)
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 200] // 80mm width (standard receipt width) x 200mm height
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
    
    // Add settlement info
    doc.setFontSize(8);
    const settlementNumber = settlement.referenceNumber || settlement.id;
    const date = new Date(settlement.date).toLocaleDateString();
    const time = settlement.time || new Date().toLocaleTimeString();
    
    doc.text(`Settlement #: ${settlementNumber}`, 5, 27);
    doc.text(`Date: ${date}`, 5, 31);
    doc.text(`Time: ${time}`, 5, 35);
    
    // Add separator line
    doc.line(5, 38, doc.internal.pageSize.width - 5, 38);
    
    // Add customer info
    let currentY = 40;
    doc.setFont(undefined, 'bold');
    doc.text('Customer:', 5, currentY);
    doc.setFont(undefined, 'normal');
    currentY += 4;
    doc.text(settlement.customerName, 5, currentY);
    currentY += 4;
    
    if (settlement.customerPhone) {
      doc.text(`Phone: ${settlement.customerPhone}`, 5, currentY);
      currentY += 4;
    }
    
    if (settlement.customerEmail) {
      doc.text(`Email: ${settlement.customerEmail}`, 5, currentY);
      currentY += 4;
    }
    
    // Add separator line
    doc.line(5, currentY, doc.internal.pageSize.width - 5, currentY);
    currentY += 3;
    
    // Add settlement details
    doc.setFont(undefined, 'bold');
    doc.text('Settlement Details:', 5, currentY);
    doc.setFont(undefined, 'normal');
    currentY += 4;
    
    doc.text(`Payment Method: ${settlement.paymentMethod}`, 5, currentY);
    currentY += 4;
    
    if (settlement.previousBalance !== undefined) {
      doc.text(`Previous Balance: ${settlement.previousBalance.toFixed(2)}`, 5, currentY);
      currentY += 4;
    }
    
    doc.text(`Amount Paid: ${settlement.amountPaid.toFixed(2)}`, 5, currentY);
    currentY += 4;
    
    if (settlement.newBalance !== undefined) {
      doc.text(`New Balance: ${settlement.newBalance.toFixed(2)}`, 5, currentY);
      currentY += 4;
    }
    
    if (settlement.notes) {
      doc.text(`Notes: ${settlement.notes}`, 5, currentY);
      currentY += 4;
    }
    
    // Add separator line
    doc.line(5, currentY, doc.internal.pageSize.width - 5, currentY);
    currentY += 3;
    
    // Add totals
    doc.setFont(undefined, 'bold');
    doc.text('Settlement Summary:', 5, currentY);
    doc.setFont(undefined, 'normal');
    currentY += 4;
    
    doc.text(`Total Settlement: ${settlement.settlementAmount.toFixed(2)}`, 5, currentY);
    currentY += 4;
    
    doc.text(`Status: ${settlement.status || 'completed'}`, 5, currentY);
    currentY += 4;
    
    doc.text(`Processed By: ${settlement.cashierName || 'System'}`, 5, currentY);
    currentY += 6;
    
    // Add separator line
    doc.line(5, currentY, doc.internal.pageSize.width - 5, currentY);
    currentY += 5;
    
    // Add footer
    doc.setFontSize(8);
    doc.text('Thank you for your business!', doc.internal.pageSize.width / 2, currentY, { align: 'center' });
    currentY += 4;
    doc.text('Settlements are recorded in our system', doc.internal.pageSize.width / 2, currentY, { align: 'center' });
    
    // Check if we're on a mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      // For mobile devices, save the PDF and show notification
      doc.save(`${filename}.pdf`);
      this.showPreviewNotification("Settlement PDF saved to your device. Check your downloads folder.");
    } else {
      // For desktop, save the PDF
      doc.save(`${filename}.pdf`);
    }
  }

  // Export supplier settlement as PDF
  static exportSupplierSettlementAsPDF(settlement: any, filename: string) {
    if (!settlement) return;

    // Create a new jsPDF instance (receipt size)
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 200] // 80mm width (standard receipt width) x 200mm height
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
    
    // Add settlement info
    doc.setFontSize(8);
    const settlementNumber = settlement.referenceNumber || settlement.id;
    const date = new Date(settlement.date).toLocaleDateString();
    const time = settlement.time || new Date().toLocaleTimeString();
    
    doc.text(`Settlement #: ${settlementNumber}`, 5, 27);
    doc.text(`Date: ${date}`, 5, 31);
    doc.text(`Time: ${time}`, 5, 35);
    
    // Add separator line
    doc.line(5, 38, doc.internal.pageSize.width - 5, 38);
    
    // Add supplier info
    let currentY = 40;
    doc.setFont(undefined, 'bold');
    doc.text('Supplier:', 5, currentY);
    doc.setFont(undefined, 'normal');
    currentY += 4;
    doc.text(settlement.supplierName, 5, currentY);
    currentY += 4;
    
    if (settlement.supplierPhone) {
      doc.text(`Phone: ${settlement.supplierPhone}`, 5, currentY);
      currentY += 4;
    }
    
    if (settlement.supplierEmail) {
      doc.text(`Email: ${settlement.supplierEmail}`, 5, currentY);
      currentY += 4;
    }
    
    if (settlement.poNumber) {
      doc.text(`PO #: ${settlement.poNumber}`, 5, currentY);
      currentY += 4;
    }
    
    // Add separator line
    doc.line(5, currentY, doc.internal.pageSize.width - 5, currentY);
    currentY += 3;
    
    // Add settlement details
    doc.setFont(undefined, 'bold');
    doc.text('Settlement Details:', 5, currentY);
    doc.setFont(undefined, 'normal');
    currentY += 4;
    
    doc.text(`Payment Method: ${settlement.paymentMethod}`, 5, currentY);
    currentY += 4;
    
    if (settlement.previousBalance !== undefined) {
      doc.text(`Previous Balance: ${settlement.previousBalance.toFixed(2)}`, 5, currentY);
      currentY += 4;
    }
    
    doc.text(`Amount Paid: ${settlement.amountPaid.toFixed(2)}`, 5, currentY);
    currentY += 4;
    
    if (settlement.newBalance !== undefined) {
      doc.text(`New Balance: ${settlement.newBalance.toFixed(2)}`, 5, currentY);
      currentY += 4;
    }
    
    if (settlement.notes) {
      doc.text(`Notes: ${settlement.notes}`, 5, currentY);
      currentY += 4;
    }
    
    // Add separator line
    doc.line(5, currentY, doc.internal.pageSize.width - 5, currentY);
    currentY += 3;
    
    // Add totals
    doc.setFont(undefined, 'bold');
    doc.text('Settlement Summary:', 5, currentY);
    doc.setFont(undefined, 'normal');
    currentY += 4;
    
    doc.text(`Total Settlement: ${settlement.settlementAmount.toFixed(2)}`, 5, currentY);
    currentY += 4;
    
    doc.text(`Status: ${settlement.status || 'completed'}`, 5, currentY);
    currentY += 4;
    
    doc.text(`Processed By: ${settlement.processedBy || 'System'}`, 5, currentY);
    currentY += 6;
    
    // Add separator line
    doc.line(5, currentY, doc.internal.pageSize.width - 5, currentY);
    currentY += 5;
    
    // Add footer
    doc.setFontSize(8);
    doc.text('Thank you for your business!', doc.internal.pageSize.width / 2, currentY, { align: 'center' });
    currentY += 4;
    doc.text('We appreciate working with you.', doc.internal.pageSize.width / 2, currentY, { align: 'center' });
    
    // Check if we're on a mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      // For mobile devices, save the PDF and show notification
      doc.save(`${filename}.pdf`);
      this.showPreviewNotification("Supplier settlement PDF saved to your device. Check your downloads folder.");
    } else {
      // For desktop, save the PDF
      doc.save(`${filename}.pdf`);
    }
  }

  // Export GRN as PDF
  static exportGRNAsPDF(grn: any, filename: string) {
    if (!grn) return;

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
    doc.text('GOODS RECEIVED NOTE', doc.internal.pageSize.width / 2, 10, { align: 'center' });
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    doc.text('123 Business St, City, Country', doc.internal.pageSize.width / 2, 15, { align: 'center' });
    doc.text('Phone: (123) 456-7890', doc.internal.pageSize.width / 2, 19, { align: 'center' });
    
    // Add separator line
    doc.line(5, 22, doc.internal.pageSize.width - 5, 22);
    
    // Add GRN info
    doc.setFontSize(8);
    const grnNumber = grn.receiptNumber || grn.id;
    const date = new Date().toLocaleDateString();
    const time = new Date().toLocaleTimeString();
    
    doc.text(`GRN #: ${grnNumber}`, 5, 27);
    doc.text(`Date: ${date}`, 5, 31);
    doc.text(`Time: ${time}`, 5, 35);
    
    // Add separator line
    doc.line(5, 38, doc.internal.pageSize.width - 5, 38);
    
    // Add supplier info
    let currentY = 39;
    if (grn.supplier) {
      doc.setFont(undefined, 'bold');
      doc.text('Supplier:', 5, currentY);
      doc.setFont(undefined, 'normal');
      currentY += 4;
      doc.text(grn.supplier.name, 5, currentY);
      currentY += 4;
      
      if (grn.supplier.phone) {
        doc.text(grn.supplier.phone, 5, currentY);
        currentY += 4;
      }
      
      if (grn.supplier.email) {
        doc.text(grn.supplier.email, 5, currentY);
        currentY += 4;
      }
      
      // Add separator line
      doc.line(5, currentY, doc.internal.pageSize.width - 5, currentY);
      currentY += 3;
    }
    
    // Add PO and delivery info
    if (grn.poNumber) {
      doc.text(`PO #: ${grn.poNumber}`, 5, currentY);
      currentY += 4;
    }
    
    if (grn.deliveryNoteNumber) {
      doc.text(`Delivery Note #: ${grn.deliveryNoteNumber}`, 5, currentY);
      currentY += 4;
    }
    
    if (grn.vehicle) {
      doc.text(`Vehicle: ${grn.vehicle}`, 5, currentY);
      currentY += 4;
    }
    
    if (grn.driver) {
      doc.text(`Driver: ${grn.driver}`, 5, currentY);
      currentY += 4;
    }
    
    // Add separator line
    doc.line(5, currentY, doc.internal.pageSize.width - 5, currentY);
    currentY += 3;
    
    // Add items header
    doc.setFont(undefined, 'bold');
    doc.text('Items Received:', 5, currentY);
    currentY += 4;
    doc.setFont(undefined, 'normal');
    
    // Add items
    if (grn.items && grn.items.length > 0) {
      grn.items.forEach((item: any) => {
        const itemName = item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name;
        
        doc.text(itemName, 5, currentY);
        doc.text(`${item.quantity} ${item.unit || ''}`, 35, currentY);
        doc.text(`${item.price.toFixed(2)}`, doc.internal.pageSize.width - 15, currentY, { align: 'right' });
        currentY += 5;
        
        // Add total for item if available
        if (item.total) {
          doc.text(`Total: ${item.total.toFixed(2)}`, 35, currentY);
          currentY += 4;
        }
      });
    } else {
      doc.text('No items', 5, currentY);
      currentY += 5;
    }
    
    // Add separator line
    doc.line(5, currentY, doc.internal.pageSize.width - 5, currentY);
    currentY += 3;
    
    // Add totals
    const subtotal = grn.subtotal || 0;
    const tax = grn.tax || 0;
    const discount = grn.discount || 0;
    const total = grn.total || 0;
    
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
    
    // Add separator line
    doc.line(5, currentY, doc.internal.pageSize.width - 5, currentY);
    currentY += 5;
    
    // Add footer
    doc.setFontSize(8);
    doc.text('Goods Received Note', doc.internal.pageSize.width / 2, currentY, { align: 'center' });
    currentY += 4;
    doc.text('Thank you for your business!', doc.internal.pageSize.width / 2, currentY, { align: 'center' });
    
    // Check if we're on a mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      // For mobile devices, save the PDF and show notification
      doc.save(`${filename}.pdf`);
      this.showPreviewNotification("GRN PDF saved to your device. Check your downloads folder.");
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

  // Export data to XLS (Excel-compatible CSV format)
  static exportToXLS(data: any[], filename: string, sheetName: string = 'Sheet1') {
    if (!data || data.length === 0) return;

    // Detect if this is payroll data (has Section, Detail, Amount columns)
    const isPayrollData = data[0] && 'Section' in data[0];

    if (isPayrollData) {
      // Advanced Excel format with HTML table styling
      let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<!--[if gte mso 9]>
<xml>
<x:ExcelWorkbook>
<x:ExcelWorksheets>
<x:ExcelWorksheet>
<x:Name>${sheetName}</x:Name>
<x:WorksheetOptions>
<x:DisplayGridlines/>
</x:WorksheetOptions>
</x:ExcelWorksheet>
</x:ExcelWorksheets>
</x:ExcelWorkbook>
</xml>
<![endif]-->
<style>
  td, th {
    font-family: Calibri, Arial, sans-serif;
    font-size: 11pt;
    padding: 4px 8px;
  }
  .header-section {
    background-color: #2563eb;
    color: white;
    font-weight: bold;
    font-size: 14pt;
  }
  .section-title {
    background-color: #dbeafe;
    color: #1e40af;
    font-weight: bold;
    font-size: 12pt;
  }
  .section-header {
    background-color: #f1f5f9;
    font-weight: bold;
    color: #475569;
  }
  .data-row {
    background-color: #ffffff;
  }
  .data-row-alt {
    background-color: #f8fafc;
  }
  .subtotal-row {
    background-color: #fef3c7;
    font-weight: bold;
    border-top: 2px solid #f59e0b;
    border-bottom: 2px solid #f59e0b;
  }
  .total-row {
    background-color: #dcfce7;
    font-weight: bold;
    font-size: 13pt;
    border-top: 3px solid #16a34a;
    border-bottom: 3px solid #16a34a;
  }
  .empty-row {
    height: 15px;
  }
  .amount {
    text-align: right;
    font-family: 'Courier New', monospace;
  }
</style>
</head>
<body>
<table>
`;

      let rowIdx = 0;
      data.forEach((row) => {
        const section = row.Section || '';
        const detail = row.Detail || '';
        const amount = row.Amount;

        // Empty row - no background color
        if (!section && !detail && (amount === '' || amount === 0)) {
          html += `<tr style="height: 15px;"><td></td><td></td><td></td></tr>
`;
          return;
        }

        // Section headers (COMPANY, EMPLOYEE, EARNINGS, etc.) - color only columns A-C
        if (detail && section.toUpperCase() === detail) {
          html += `<tr><td class="header-section" colspan="3">${section}</td><td></td><td></td></tr>
`;
        }
        // Section titles (INFORMATION, RECORD) - color only columns A-C
        else if (detail && !amount && amount !== 0) {
          html += `<tr><td class="section-title" colspan="3">${section} ${detail}</td><td></td><td></td></tr>
`;
        }
        // Subtotals (GROSS PAY, TOTAL DEDUCTIONS) - color only columns A-C
        else if (section.toUpperCase().includes('GROSS PAY') || section.toUpperCase().includes('TOTAL DEDUCTIONS')) {
          const amountValue = typeof amount === 'number' ? amount.toLocaleString() : amount;
          html += `<tr><td class="subtotal-row">${section}</td><td></td><td class="subtotal-row amount">${amountValue}</td><td></td><td></td></tr>
`;
        }
        // Net Pay (final total) - color only columns A-C
        else if (section.toUpperCase() === 'NET PAY') {
          const amountValue = typeof amount === 'number' ? amount.toLocaleString() : amount;
          html += `<tr><td class="total-row">${section}</td><td></td><td class="total-row amount">${amountValue}</td><td></td><td></td></tr>
`;
        }
        // Section headers without detail (EARNINGS, DEDUCTIONS, SUMMARY, ATTENDANCE) - color only columns A-C
        else if (!detail && !amount && amount !== 0 && section) {
          html += `<tr><td class="section-title" colspan="3">${section}</td><td></td><td></td></tr>
`;
        }
        // Regular data rows with alternating colors - color only columns A-C
        else {
          const bgColor = rowIdx % 2 === 0 ? 'data-row' : 'data-row-alt';
          const amountValue = typeof amount === 'number' ? amount.toLocaleString() : (amount || '');
          html += `<tr><td class="${bgColor}">${section}</td><td class="${bgColor}">${detail}</td><td class="${bgColor} amount">${amountValue}</td><td></td><td></td></tr>
`;
          rowIdx++;
        }
      });

      html += `</table>
</body>
</html>`;

      // Create download link
      const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}.xls`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Fallback to simple tab-separated format for non-payroll data
      const headers = Object.keys(data[0]).join('\t');
      const rows = data.map(row => 
        Object.values(row).map(value => {
          if (value === null || value === undefined) return '';
          const str = String(value);
          return str.replace(/\t/g, ' ').replace(/\n/g, ' ');
        }).join('\t')
      );
      
      const csvContent = [headers, ...rows].join('\n');
      
      const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}.xls`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  // Share data (uses Web Share API on mobile, copies to clipboard on desktop)
  static async shareData(title: string, text: string, data?: any[]) {
    // Check if Web Share API is supported
    if (navigator.share && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      try {
        await navigator.share({
          title: title,
          text: text,
        });
        return true;
      } catch (error) {
        console.error('Error sharing:', error);
        return false;
      }
    } else {
      // Fallback: copy to clipboard
      try {
        const content = data 
          ? JSON.stringify(data, null, 2)
          : text;
        await navigator.clipboard.writeText(content);
        return true;
      } catch (error) {
        console.error('Error copying to clipboard:', error);
        return false;
      }
    }
  }
}