# Sales Order Options Dialog Implementation

## Overview
Implemented a comprehensive options dialog for Sales Orders in the Template Management section, providing users with multiple actions after saving a sales order.

## Changes Made

### 1. Added State Variable
**File:** `src/pages/Templates.tsx`

Added new state to manage the sales order options dialog:
```typescript
const [showSalesOrderOptions, setShowSalesOrderOptions] = useState(false);
```

### 2. Created Dialog Handler Functions
Added functions to show and hide the sales order options dialog:

```typescript
// Show sales order options dialog
const showSalesOrderOptionsDialog = () => {
  setShowSalesOrderOptions(true);
};

// Close sales order options dialog
const closeSalesOrderOptionsDialog = () => {
  setShowSalesOrderOptions(false);
  // Reset form after closing dialog
  resetSalesOrderData();
};
```

### 3. Updated handleSaveSalesOrder
Modified the save function to show the options dialog instead of just alerting:

**Before:**
```typescript
alert(`Sales Order ${salesOrderData.orderNumber} saved successfully to Saved Sales Orders!`);
resetSalesOrderData();
```

**After:**
```typescript
// Show the sales order options dialog after saving
showSalesOrderOptionsDialog();

// Don't reset here - let the user choose an option first
```

### 4. Created Action Handler Functions

#### Print Sales Order
```typescript
const handlePrintSalesOrder = () => {
  // Opens a print window with formatted sales order
  // Auto-prints and closes the window
}
```

**Features:**
- Professional print layout
- Displays all order details
- Includes items table with pricing
- Shows special instructions if any
- Auto-triggers print dialog

#### Download Sales Order
```typescript
const handleDownloadSalesOrder = () => {
  setShowSalesOrderOptions(false);
  handleDownloadSalesOrderAsPDF();
}

const handleDownloadSalesOrderAsPDF = () => {
  // Uses html2pdf.js to generate PDF
  // Downloads as "SalesOrder_{orderNumber}.pdf"
}
```

**Features:**
- Generates PDF using html2pdf.js library
- Professional formatting
- Includes all order information
- Auto-downloads to device

#### Share Sales Order
```typescript
const handleShareSalesOrder = () => {
  // Formats order details as text
  // Copies to clipboard for easy sharing
}
```

**Features:**
- Formats order details in readable text
- Copies to clipboard
- Can be pasted into WhatsApp, email, etc.
- Includes all key order information

#### Export Sales Order
```typescript
const handleExportSalesOrder = () => {
  // Uses xlsx library to generate Excel file
  // Downloads as "SalesOrder_{orderNumber}.xlsx"
}
```

**Features:**
- Exports to Excel format (.xlsx)
- Includes all order details
- Formatted with proper columns
- Easy to import into other systems

### 5. Added Options Dialog UI

Created a modal dialog that appears after saving:

```tsx
{showSalesOrderOptions && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
      <h3 className="text-lg font-bold mb-4">Sales Order Options</h3>
      <p className="mb-4">Choose an action for your sales order:</p>
      
      <div className="space-y-2">
        <Button onClick={handlePrintSalesOrder} variant="outline">
          <Printer className="h-4 w-4 mr-2" />
          Print Sales Order
        </Button>
        
        <Button onClick={handleDownloadSalesOrder} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Download Sales Order
        </Button>
        
        <Button onClick={handleShareSalesOrder} variant="outline">
          <Share className="h-4 w-4 mr-2" />
          Share Sales Order
        </Button>
        
        <Button onClick={handleExportSalesOrder} variant="outline">
          <ExternalLink className="h-4 w-4 mr-2" />
          Export Sales Order
        </Button>
      </div>
      
      <div className="mt-4 flex justify-end">
        <Button onClick={closeSalesOrderOptionsDialog} variant="outline">
          Cancel
        </Button>
      </div>
    </div>
  </div>
)}
```

## User Flow

1. **User fills out Sales Order template** → Completes all required fields
2. **User clicks Save button** → Validates and saves to database
3. **Options dialog appears** → Shows 4 action buttons:
   - Print Sales Order
   - Download Sales Order
   - Share Sales Order
   - Export Sales Order
4. **User selects an action:**
   - **Print**: Opens print preview, auto-prints, closes window
   - **Download**: Generates PDF and downloads
   - **Share**: Copies formatted text to clipboard
   - **Export**: Generates Excel file and downloads
5. **User clicks Cancel or completes action** → Dialog closes, form resets

## Features

### Print Functionality
- Clean, professional print layout
- Includes header with order number
- From/To sections
- Items table with quantities and prices
- Totals section (subtotal, discount, tax, shipping, total)
- Special instructions if provided
- Auto-print on window load

### Download Functionality
- PDF generation using html2pdf.js
- High-quality output (jpeg quality 0.98)
- A4 format, portrait orientation
- Proper scaling (scale: 2)
- Filename: `SalesOrder_{orderNumber}.pdf`

### Share Functionality
- Formats order as readable text
- Includes:
  - Order number and date
  - Customer name
  - All items with quantities and prices
  - Totals breakdown
- Copies to clipboard
- Ready to paste in WhatsApp, email, etc.

### Export Functionality
- Excel format (.xlsx)
- Structured data with headers
- Includes all order information
- Filename: `SalesOrder_{orderNumber}.xlsx`
- Easy to import into accounting/ERP systems

## Integration Points

### Existing Components
- Uses existing icon imports (Printer, Download, Share, ExternalLink)
- Follows same pattern as Invoice and Delivery Note dialogs
- Integrates seamlessly with existing sales order data structure

### Dependencies
- **html2pdf.js** - For PDF generation
- **xlsx** - For Excel export
- **lucide-react** - For icons

## Testing Checklist

- [ ] Save button triggers validation
- [ ] Options dialog appears after successful save
- [ ] Print opens print window with correct content
- [ ] Download generates and downloads PDF
- [ ] Share copies text to clipboard
- [ ] Export generates and downloads Excel file
- [ ] Cancel button closes dialog and resets form
- [ ] Form resets after completing any action
- [ ] All order data is correctly displayed in each format

## Benefits

1. **User-Friendly Workflow** - Clear options after saving
2. **Multiple Output Formats** - Print, PDF, Excel, text
3. **Professional Presentation** - Well-formatted outputs
4. **Easy Sharing** - Clipboard integration
5. **Consistent UX** - Matches invoice and delivery note patterns
6. **No Page Reload** - Smooth modal-based interaction

## Future Enhancements

Potential improvements for future versions:

1. **Email Integration** - Direct email sending from dialog
2. **WhatsApp Direct Share** - Open WhatsApp web with pre-filled message
3. **SMS Integration** - Send order details via SMS
4. **Custom Templates** - Allow users to customize print layout
5. **Batch Operations** - Print/download multiple orders at once
6. **QR Code** - Include QR code in printed/exported orders
7. **Digital Signature** - Add signature to exported documents

## Files Modified

1. **src/pages/Templates.tsx**
   - Added state variable
   - Added handler functions
   - Added action functions (print, download, share, export)
   - Added dialog JSX

## Related Documentation

- [Saved Sales Orders Feature](./SAVED_SALES_ORDERS_FEATURE.md)
- [Sales Order Template Save Implementation](./SALES_ORDER_TEMPLATE_SAVE_IMPLEMENTATION.md)
- [Invoice Utils](./src/utils/invoiceUtils.ts)
- [Delivery Note Utils](./src/utils/deliveryUtils.ts)

## Conclusion

The Sales Order Options Dialog provides a comprehensive and user-friendly way for users to handle their saved sales orders, offering multiple output formats and sharing options while maintaining consistency with the existing invoice and delivery note workflows.
