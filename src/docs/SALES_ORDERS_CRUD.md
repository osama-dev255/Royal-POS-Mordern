# Sales Orders CRUD Operations

## Overview

This document describes the CRUD (Create, Read, Update, Delete) operations implemented for the Sales Orders module in the POS system.

## Implemented CRUD Operations

### 1. Create (C)

**Function**: `createSale(sale: Omit<Sale, 'id'>)`
**Location**: `src/services/databaseService.ts`
**Description**: Creates a new sales order in the database

**Features**:
- Form-based data entry
- Customer selection from existing customers
- Automatic calculation of totals
- Support for different payment methods
- Status management (completed, pending, refunded, cancelled)
- Notes field for additional information

**Form Fields**:
- Date
- Customer (optional)
- Subtotal
- Discount
- Tax
- Total
- Payment Method (cash, card, bank transfer)
- Status (completed, pending, refunded, cancelled)
- Notes (optional)

### 2. Read (R)

**Functions**: 
- `getSales()`
- `getSaleById(id: string)`
- `getSaleItemsWithProducts(saleId: string)`

**Location**: `src/services/databaseService.ts`
**Description**: Retrieves sales orders and their associated items from the database

**Features**:
- List view with filtering capabilities
- Detailed view with itemized breakdown
- Search by order ID or customer name
- Date filtering (all dates, today, this week, this month)
- Status filtering (all status, completed, refunded, pending, cancelled)
- Customer information display
- Item count and total amount display

### 3. Update (U)

**Function**: `updateSale(id: string, sale: Partial<Sale>)`
**Location**: `src/services/databaseService.ts`
**Description**: Updates an existing sales order in the database

**Features**:
- Pre-populated form with existing data
- All create form fields are editable
- Real-time validation
- Success/error feedback

### 4. Delete (D)

**Function**: `deleteSale(id: string)`
**Location**: `src/services/databaseService.ts`
**Description**: Permanently removes a sales order from the database

**Features**:
- Confirmation dialog before deletion
- Loading state during deletion process
- Success/error feedback
- Automatic refresh of order list after deletion

## User Interface

### Main Sales Orders Page
- Search and filter functionality
- Create Order button
- Grid view of sales orders with cards
- Edit and Delete buttons on each card
- Refresh button to reload data

### Create/Edit Form
- Modal-like form interface
- Validation for required fields
- Date picker for order date
- Customer dropdown selection
- Numeric inputs for financial values
- Payment method selection
- Status selection
- Notes text field
- Cancel and Save buttons

### Order Details View
- Comprehensive view of order information
- Customer details
- Itemized list of products
- Financial summary (subtotal, discount, tax, total)
- Payment method and status display
- Notes section
- Back button to return to order list

## Data Flow

1. **Loading**: Component loads customers and sales data on mount
2. **Display**: Orders are displayed in a grid with filtering options
3. **Create**: User clicks "Create Order" to open form, fills details, and submits
4. **Read**: User clicks "View" on a card to see detailed order information
5. **Update**: User clicks "Edit" on a card to open pre-filled form, modifies details, and saves
6. **Delete**: User clicks "Delete" on a card, confirms deletion, and order is removed
7. **Refresh**: User can manually refresh data at any time

## Error Handling

- All operations include comprehensive error handling
- User-friendly error messages via toast notifications
- Loading states for async operations
- Form validation for data integrity
- Graceful failure handling with fallbacks

## Security Considerations

- All operations respect Row Level Security (RLS) policies
- Input validation prevents injection attacks
- Authentication is required for all operations
- Data integrity is maintained through database constraints

## Performance Optimization

- Efficient database queries with proper indexing
- Client-side filtering to reduce server requests
- Loading states for better user experience
- Optimized data fetching with related information

## Usage Examples

### Creating a New Sales Order
1. Navigate to Sales Orders page
2. Click "Create Order" button
3. Fill in order details in the form
4. Click "Create Order" to save

### Editing an Existing Sales Order
1. Navigate to Sales Orders page
2. Find the order to edit
3. Click the Edit (pencil) icon on the order card
4. Modify order details in the form
5. Click "Update Order" to save changes

### Viewing Sales Order Details
1. Navigate to Sales Orders page
2. Find the order to view
3. Click the "View" button on the order card
4. Review detailed order information
5. Click "Back to Orders" to return to the list

### Deleting a Sales Order
1. Navigate to Sales Orders page
2. Find the order to delete
3. Click the Delete (trash) icon on the order card
4. Confirm deletion in the confirmation dialog
5. Order is removed from the list

## Best Practices

1. **Always validate data** before performing CRUD operations
2. **Use confirmation dialogs** for destructive operations
3. **Implement proper error handling** for all operations
4. **Provide user feedback** for all operations
5. **Respect user permissions** and security policies
6. **Handle edge cases** such as empty results or invalid IDs
7. **Optimize queries** for performance with large datasets
8. **Implement search and filter** to improve usability