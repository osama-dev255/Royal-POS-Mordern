// Utility functions for exporting data
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

  // Format raw object keys into human-readable headers
  private static formatHeaderKey(key: string): string {
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }

  // Export data to PDF using jsPDF with autoTable for proper pagination
  static exportToPDF(data: any[], filename: string, title: string) {
    if (!data || data.length === 0) return;

    const businessName = localStorage.getItem('businessName') || 'Kilango Group LTD';
    const businessAddress = localStorage.getItem('businessAddress') || 'P.O.Box 64, Tanganyika Street, Muheza - Tanga';
    const businessPhone = localStorage.getItem('businessPhone') || '0717 058 266';

    // Create a new jsPDF instance
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();

    // Business header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(businessName, pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(businessAddress, pageWidth / 2, 21, { align: 'center' });
    doc.text(`Tel: ${businessPhone}`, pageWidth / 2, 26, { align: 'center' });

    // Report title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(title, pageWidth / 2, 35, { align: 'center' });

    // Report metadata
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const reportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(`Generated: ${reportDate}  |  Total Records: ${data.length}`, pageWidth / 2, 41, { align: 'center' });

    // Prepare table data with formatted headers
    const rawKeys = Object.keys(data[0]);
    const headers = rawKeys.map(key => this.formatHeaderKey(key));
    const rows = data.map(row => 
      rawKeys.map(key => {
        const val = row[key];
        if (val === null || val === undefined) return '';
        if (typeof val === 'number') return val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
        return String(val).substring(0, 50);
      })
    );

    // Use autoTable for proper pagination and formatting
    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 46,
      theme: 'grid',
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
        cellPadding: 3,
      },
      bodyStyles: {
        fontSize: 7,
        cellPadding: 2,
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250],
      },
      margin: { left: 14, right: 14 },
      didDrawPage: (data) => {
        // Footer on each page
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(128);
        doc.text(
          `Page ${data.pageNumber} of ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 8,
          { align: 'center' }
        );
        doc.text(
          `© ${new Date().getFullYear()} ${businessName}`,
          pageWidth - 14,
          doc.internal.pageSize.getHeight() - 8,
          { align: 'right' }
        );
        // Reset text color
        doc.setTextColor(0);
      }
    });

    // Save the PDF
    doc.save(`${filename}.pdf`);

    // Show notification for mobile users
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      this.showPreviewNotification("PDF saved to your device. Check your downloads folder.");
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
      } catch (error: any) {
        // User cancelled the share
        if (error.name === 'AbortError' || error.name === 'NotAllowedError') {
          console.log('Share cancelled by user');
          return false;
        }
        console.error('Error sharing:', error);
        throw error; // Re-throw to let caller handle
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
  // ==================== GRN DETAILS A4 PDF EXPORT ====================
    static exportGRNDetailsAsPDF(grn: any, filename?: string) {
      const data = grn.data || grn;
      const items = Array.isArray(data.items) ? data.items : [];
      const totalValue = items.reduce((sum: number, item: any) => sum + (item.totalWithReceivingCost || item.total || 0), 0);
      const totalQty = items.reduce((sum: number, item: any) => sum + (item.delivered || item.quantity || 0), 0);
      const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';
  
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 15;
  
      // Header
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('GOODS RECEIVED NOTE', pageWidth / 2, y, { align: 'center' });
      y += 6;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      const bizLine = [data.businessName, data.businessAddress, data.businessPhone].filter(Boolean).join(' • ');
      if (bizLine) doc.text(bizLine, pageWidth / 2, y, { align: 'center' });
      y += 4;
      doc.setDrawColor(0);
      doc.setLineWidth(0.5);
      doc.line(15, y, pageWidth - 15, y);
      y += 8;
  
      // Info boxes
      doc.setTextColor(0);
      doc.setFontSize(8);
      const colW = (pageWidth - 30) / 2;
      const boxH = 30;
  
      // GRN Info box
      doc.setDrawColor(180);
      doc.rect(15, y, colW, boxH);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('GRN Information', 17, y + 4);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`GRN #: ${data.grnNumber || 'N/A'}`, 17, y + 9);
      doc.text(`Date: ${formatDate(data.date)}`, 17, y + 14);
      doc.text(`Status: ${(data.status || 'pending').toUpperCase()}`, 17, y + 19);
      doc.text(`PO #: ${data.poNumber || 'N/A'}`, 17, y + 24);
  
      // Supplier box
      const x2 = 15 + colW;
      doc.rect(x2, y, colW, boxH);
      doc.setFont('helvetica', 'bold');
      doc.text('Supplier Details', x2 + 2, y + 4);
      doc.setFont('helvetica', 'normal');
      doc.text(`Name: ${data.supplierName || 'N/A'}`, x2 + 2, y + 9);
      if (data.supplierPhone) doc.text(`Phone: ${data.supplierPhone}`, x2 + 2, y + 14);
      if (data.supplierEmail) doc.text(`Email: ${data.supplierEmail}`, x2 + 2, y + 19);
      if (data.supplierTinNumber) doc.text(`TIN: ${data.supplierTinNumber}`, x2 + 2, y + 24);
  
      y += boxH + 5;
  
      // Logistics + Destination row
      const boxH2 = 22;
      doc.rect(15, y, colW, boxH2);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Logistics', 17, y + 4);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      let logY = y + 9;
      if (data.vehicleNumber) { doc.text(`Vehicle: ${data.vehicleNumber}`, 17, logY); logY += 5; }
      if (data.driverName) { doc.text(`Driver: ${data.driverName}`, 17, logY); logY += 5; }
      if (data.receivedBy) { doc.text(`Received By: ${data.receivedBy}`, 17, logY); }
  
      doc.rect(x2, y, colW, boxH2);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Destination', x2 + 2, y + 4);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Godown: ${data.destinationGodownName || 'N/A'}`, x2 + 2, y + 9);
      doc.text(`Zone: ${data.destinationZoneName || 'N/A'}`, x2 + 2, y + 14);
      if (data.receivedDate) doc.text(`Received: ${formatDate(data.receivedDate)}`, x2 + 2, y + 19);
  
      y += boxH2 + 8;
  
      // Items table
      const defaultGodown = data.destinationGodownName || data.destinationGodownId || '-';
      const defaultZone = data.destinationZoneName || data.destinationZoneId || '-';
      const tableData = items.map((item: any, i: number) => [
        i + 1,
        item.description || '',
        item.quantity || 0,
        item.delivered || 0,
        item.unit || '-',
        (item.originalUnitCost || 0).toFixed(2),
        (item.receivingCostPerUnit || 0).toFixed(2),
        (item.unitCost || 0).toFixed(2),
        (item.totalWithReceivingCost || item.total || 0).toFixed(2),
        item.batchNumber || '-',
        item.expiryDate ? formatDate(item.expiryDate) : '-',
        item.godown_name || item.godownName || defaultGodown,
        item.zone_name || item.zoneName || defaultZone,
        (item.damaged || 0) > 0 ? item.damaged : '-',
        item.remarks || '-'
      ]);
  
      autoTable(doc, {
        startY: y,
        head: [['#', 'Item', 'Ordered', 'Received', 'Unit', 'Orig. Cost', 'Recv. Cost', 'New Cost', 'Total', 'Batch', 'Expiry', 'Godown', 'Zone', 'Dmg', 'Remarks']],
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 6, cellPadding: 1.5 },
        headStyles: { fillColor: [220, 220, 220], textColor: 0, fontStyle: 'bold', fontSize: 6 },
        columnStyles: {
          0: { cellWidth: 7, halign: 'center' },
          2: { halign: 'center' },
          3: { halign: 'center' },
          5: { halign: 'right' },
          6: { halign: 'right' },
          7: { halign: 'right' },
          8: { halign: 'right' },
          13: { halign: 'center' }
        },
        margin: { left: 10, right: 10 }
      });
  
      // @ts-ignore - autoTable updates y cursor
      y = doc.lastAutoTable?.finalY + 5 || y + 40;
  
      // Receiving Costs table
      const receivingCosts = Array.isArray(data.receivingCosts) ? data.receivingCosts : [];
      if (receivingCosts.length > 0) {
        const costData = receivingCosts.map((c: any, i: number) => [
          i + 1,
          c.description || '',
          (c.amount || 0).toFixed(2)
        ]);
        const costTotal = receivingCosts.reduce((s: number, c: any) => s + (c.amount || 0), 0);
        costData.push(['', 'Total Receiving Costs:', costTotal.toFixed(2)]);
  
        autoTable(doc, {
          startY: y,
          head: [['RECEIVING COSTS', '', '']],
          body: costData,
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [220, 220, 220], textColor: 0, fontStyle: 'bold' },
          columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            2: { halign: 'right', fontStyle: 'bold' }
          },
          margin: { left: pageWidth - 80, right: 15 },
          didParseCell: (hookData: any) => {
            // Bold the last row (total)
            if (hookData.section === 'body' && hookData.row.index === costData.length - 1) {
              hookData.cell.styles.fontStyle = 'bold';
            }
          }
        });
  
        // @ts-ignore
        y = doc.lastAutoTable?.finalY + 5 || y + 20;
      }
  
      // Totals
      doc.setFontSize(9);
      doc.text(`Total Items: ${items.length}`, pageWidth - 15, y, { align: 'right' });
      y += 5;
      doc.text(`Total Quantity: ${totalQty}`, pageWidth - 15, y, { align: 'right' });
      y += 5;
      doc.setFont('helvetica', 'bold');
      doc.text(`Grand Total: ${totalValue.toFixed(2)}`, pageWidth - 15, y, { align: 'right' });
      y += 10;
  
      // Notes
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      if (data.qualityCheckNotes) {
        doc.setFont('helvetica', 'bold');
        doc.text('Quality Check Notes:', 15, y);
        doc.setFont('helvetica', 'normal');
        y += 4;
        const splitNotes = doc.splitTextToSize(data.qualityCheckNotes, pageWidth - 30);
        doc.text(splitNotes, 15, y);
        y += splitNotes.length * 4 + 4;
      }
      if (data.discrepancies) {
        doc.setFont('helvetica', 'bold');
        doc.text('Discrepancies:', 15, y);
        doc.setFont('helvetica', 'normal');
        y += 4;
        const splitDisc = doc.splitTextToSize(data.discrepancies, pageWidth - 30);
        doc.text(splitDisc, 15, y);
        y += splitDisc.length * 4 + 4;
      }
  
      // Signatures
      y = Math.max(y + 10, doc.internal.pageSize.getHeight() - 30);
      const sigW = (pageWidth - 30) / 3;
      doc.setDrawColor(0);
      doc.line(15, y, 15 + sigW, y);
      doc.line(15 + sigW, y, 15 + sigW * 2, y);
      doc.line(15 + sigW * 2, y, pageWidth - 15, y);
      doc.setFontSize(7);
      doc.text(data.preparedBy ? `Prepared By: ${data.preparedBy}` : 'Prepared By', 15 + sigW / 2, y + 4, { align: 'center' });
      doc.text(data.checkedBy ? `Checked By: ${data.checkedBy}` : 'Checked By', 15 + sigW * 1.5, y + 4, { align: 'center' });
      doc.text(data.approvedBy ? `Approved By: ${data.approvedBy}` : 'Approved By', 15 + sigW * 2.5, y + 4, { align: 'center' });
  
      // Footer
      doc.setFontSize(7);
      doc.setTextColor(120);
      doc.text(`Printed: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
  
      // Save
      const fname = filename || `GRN-${data.grnNumber || 'details'}`;
      doc.save(`${fname}.pdf`);
    }
  }