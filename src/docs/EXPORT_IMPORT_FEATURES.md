# Printing, Export, and Import Features Documentation

## Overview
This document outlines all the printing, export, and import features implemented in the POS system.

## Export Features

### 1. CSV Export
- Available in all management pages (Product, Customer, Supplier, Transaction, Expense)
- Uses the ExportUtils.exportToCSV() function
- Exports data as comma-separated values files

### 2. Excel Export
- Available in all management pages (Product, Customer, Supplier, Transaction, Expense)
- Uses the ExcelUtils.exportToExcel() function
- Exports data as Excel-compatible files (.xlsx)

### 3. JSON Export
- Available through the ExportImportManager component
- Uses the ExportUtils.exportToJSON() function
- Exports data as JSON files

### 4. PDF Export
- Available through the ExportImportManager component and direct print buttons
- Uses the ExportUtils.exportToPDF() function
- Exports data as PDF files using browser print functionality

### 5. Receipt Export
- Available in SalesCart during payment processing
- Uses the ExportUtils.exportReceipt() function
- Exports receipts as plain text files

### 6. Receipt PDF Export
- Available in SalesCart during payment processing
- Uses the ExportUtils.exportReceiptAsPDF() function
- Exports receipts as PDF files

## Import Features

### 1. CSV Import
- Available in Product, Customer, and Supplier management pages
- Uses the ImportUtils.parseCSV() function
- Supports automatic data validation

### 2. JSON Import
- Available through the ExportImportManager component
- Uses the ImportUtils.parseJSON() function
- Supports automatic data validation

### 3. Manual Data Entry
- Available through the ExportImportManager component
- Allows users to paste data directly into a text area
- Supports both CSV and JSON formats

## Printing Features

### 1. Receipt Printing
- Available in SalesCart during payment processing
- Uses the PrintUtils.printReceipt() function
- Generates formatted receipts with business information

### 2. Inventory Report Printing
- Available in Reports page
- Uses the PrintUtils.printInventoryReport() function
- Generates formatted inventory reports

### 3. Sales Report Printing
- Available in Reports page and TransactionHistory
- Uses the PrintUtils.printSalesReport() function
- Generates formatted sales reports with summaries

### 4. Expense Report Printing
- Available in Reports page
- Uses the ExportUtils.exportToPDF() function
- Generates formatted expense reports

## Customizable Receipt Templates

### 1. Template Configuration
- Available in Settings > Receipt tab
- Configure header, footer, font size, and paper width
- Toggle visibility of different receipt sections

### 2. Template Variables
- Business information (name, address, phone)
- Transaction details (receipt number, date, time)
- Item details (name, quantity, price, total)
- Financial details (subtotal, tax, discount, total)

### 3. Section Controls
- Show/hide business information
- Show/hide transaction details
- Show/hide item details
- Show/hide totals
- Show/hide payment information

## Data Validation

### Product Data Validation
- Validates required fields: name, price, stock
- Ensures price and stock are numeric values

### Customer Data Validation
- Validates required field: name
- Validates email format if provided

### Supplier Data Validation
- Validates required fields: name, contactPerson

## File Formats Supported

| Format | Extension | Description |
|--------|-----------|-------------|
| CSV | .csv | Comma-separated values |
| Excel | .xlsx | Excel-compatible format |
| JSON | .json | JavaScript Object Notation |
| PDF | .pdf | Portable Document Format |
| Text | .txt | Plain text receipts |

## Implementation Details

### Utility Functions
- **ExportUtils**: Handles all export functionality
- **ImportUtils**: Handles all import and parsing functionality
- **PrintUtils**: Handles all printing functionality
- **ExcelUtils**: Handles Excel-specific export functionality
- **TemplateUtils**: Handles custom receipt template functionality

### Components
- **ExportImportManager**: Reusable component for export/import functionality
- **Reports**: Centralized reporting page with all export options

### Integration Points
- ProductManagement
- CustomerManagement
- SupplierManagement
- SalesCart
- TransactionHistory
- ExpenseManagement
- Reports
- Settings

## Usage Instructions

### Exporting Data
1. Navigate to any management page
2. Click on the export button for the desired format
3. File will be automatically downloaded

### Importing Data
1. Navigate to any management page with import capability
2. Click "Select File" or paste data manually
3. Choose the appropriate format
4. Click "Import Data"
5. Data will be validated and imported

### Printing Reports
1. Navigate to the Reports page or relevant management page
2. Configure report options
3. Click "Print Report"
4. Browser print dialog will appear

### Customizing Receipt Templates
1. Navigate to Settings > Receipt tab
2. Enable "Custom Template" toggle
3. Modify header, footer, and other settings
4. Toggle section visibility as needed
5. Click "Save Changes"
6. All future receipts will use your custom template