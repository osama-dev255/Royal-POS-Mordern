# Enhanced Product CRUD Operations Guide

This document provides a comprehensive guide to all Create, Read, Update, and Delete operations available for product management in the enhanced POS system.

## Create Operations

### 1. Basic Product Creation
- **Function**: `createProduct(product: Omit<Product, 'id'>)`
- **Description**: Creates a new product with all required and optional fields
- **Validation**:
  - Product name is required
  - Selling price must be zero or positive
  - Cost price must be zero or positive
  - Stock quantity must be zero or positive
  - Empty strings for barcode and SKU are converted to null

### 2. Product Duplication
- **Function**: `handleDuplicateProduct(product: Product)`
- **Description**: Creates a copy of an existing product with "Copy of" prefix
- **Features**:
  - Automatically modifies barcode and SKU to prevent duplicates
  - Preserves all other product attributes
  - Useful for creating variants of existing products

## Read Operations

### 1. Get All Products
- **Function**: `getProducts()`
- **Description**: Retrieves all products from the database
- **Sorting**: Products are ordered by name alphabetically

### 2. Get Product by ID
- **Function**: `getProductById(id: string)`
- **Description**: Retrieves a specific product by its unique identifier

### 3. Get Product by Barcode
- **Function**: `getProductByBarcode(barcode: string)`
- **Description**: Retrieves a product by its barcode
- **Use Case**: Point of sale scanning

### 4. Get Product by SKU
- **Function**: `getProductBySKU(sku: string)`
- **Description**: Retrieves a product by its SKU (Stock Keeping Unit)

### 5. Search Products
- **Function**: `searchProducts(query: string, filters?: Object)`
- **Description**: Advanced search with filtering capabilities
- **Filters**:
  - Category
  - Price range
  - Stock status

### 6. Get Products by Category
- **Function**: `getProductsByCategory(categoryId: string)`
- **Description**: Retrieves all products in a specific category

### 7. Get Low Stock Products
- **Function**: `getLowStockProducts(threshold: number)`
- **Description**: Retrieves products below minimum stock levels

### 8. Get Out of Stock Products
- **Function**: `getOutOfStockProducts()`
- **Description**: Retrieves products with zero stock quantity

## Update Operations

### 1. Update Product
- **Function**: `updateProduct(id: string, product: Partial<Product>)`
- **Description**: Updates any attributes of an existing product
- **Validation**:
  - Product ID is required
  - Price fields must be zero or positive if provided
  - Stock quantity must be zero or positive if provided

### 2. Update Product Stock
- **Function**: `updateProductStock(id: string, quantity: number)`
- **Description**: Updates only the stock quantity of a product
- **Use Case**: Quick inventory adjustments

### 3. Toggle Product Status
- **Function**: `handleToggleProductStatus(product: Product)`
- **Description**: Switches product between active and inactive states
- **Benefits**: 
  - Keeps products in database without deleting
  - Prevents accidental sales of discontinued items

### 4. Quick Stock Update
- **Function**: `handleQuickStockUpdate(product: Product, newQuantity: number)`
- **Description**: Provides a quick way to update stock levels
- **Use Case**: Daily inventory counts

### 5. Bulk Update Products
- **Function**: `bulkUpdateProducts(updates: { id: string; data: Partial<Product> }[])`
- **Description**: Updates multiple products at once
- **Use Case**: Bulk price changes, category updates, etc.

## Delete Operations

### 1. Delete Product
- **Function**: `deleteProduct(id: string)`
- **Description**: Permanently removes a product from the database
- **Validation**: Product ID is required
- **Warning**: This operation cannot be undone

### 2. Bulk Delete Products
- **Function**: `bulkDeleteProducts(ids: string[])`
- **Description**: Permanently removes multiple products from the database
- **Validation**: Array of product IDs is required
- **Warning**: This operation cannot be undone

## Batch Operations

### 1. Bulk Import
- **Function**: `handleImportProducts(importedProducts: any[])`
- **Description**: Imports multiple products at once
- **Features**:
  - Updates existing products if barcode matches
  - Creates new products for unmatched barcodes
  - Handles data type conversions

## Enhanced Features

### 1. Advanced Filtering
- **Category Filter**: Filter products by category
- **Status Filter**: Filter by active/inactive status
- **Stock Level Filter**: Filter by in-stock, low-stock, or out-of-stock status

### 2. Sorting Options
- **Name**: Sort alphabetically by product name
- **Price**: Sort by selling price
- **Stock**: Sort by stock quantity
- **Category**: Sort by category name

### 3. View Product Details
- **Function**: `openViewDialog(product: Product)`
- **Description**: Opens a read-only view of product details
- **Features**:
  - Detailed product information display
  - No editing capabilities
  - Useful for quick reference

## Error Handling

All CRUD operations include comprehensive error handling:
- Detailed error logging for debugging
- User-friendly error messages
- Graceful failure handling
- Type validation for all inputs

## Security Considerations

- All operations respect Row Level Security (RLS) policies
- Input validation prevents injection attacks
- Authentication is required for all operations
- Data integrity is maintained through database constraints

## Performance Optimization

- Efficient database queries with proper indexing
- Pagination support for large product catalogs
- Caching strategies for frequently accessed data
- Optimized search algorithms

## Usage Examples

### Creating a New Product
```typescript
const newProduct = {
  name: "Wireless Headphones",
  category_id: "electronics-category-id",
  selling_price: 99.99,
  cost_price: 45.00,
  stock_quantity: 25,
  barcode: "123456789012",
  sku: "WH-001"
};

const result = await createProduct(newProduct);
```

### Updating Product Price
```typescript
const updatedProduct = await updateProduct(productId, {
  selling_price: 89.99,
  updated_at: new Date().toISOString()
});
```

### Searching for Products
```typescript
const results = await searchProducts("headphones", {
  categoryId: "electronics-category-id",
  minPrice: 50,
  maxPrice: 150,
  inStockOnly: true
});
```

### Deleting a Product
```typescript
const success = await deleteProduct(productId);
if (success) {
  console.log("Product deleted successfully");
}
```

### Bulk Updating Products
```typescript
const updates = [
  { id: "product-1-id", data: { selling_price: 29.99 } },
  { id: "product-2-id", data: { selling_price: 39.99 } },
  { id: "product-3-id", data: { category_id: "new-category-id" } }
];

const success = await bulkUpdateProducts(updates);
if (success) {
  console.log("Products updated successfully");
}
```

### Bulk Deleting Products
```typescript
const productIds = ["product-1-id", "product-2-id", "product-3-id"];
const success = await bulkDeleteProducts(productIds);
if (success) {
  console.log("Products deleted successfully");
}
```

## Best Practices

1. **Always validate data** before performing CRUD operations
2. **Use transactions** for related operations
3. **Implement proper error handling** for all operations
4. **Log operations** for audit purposes
5. **Respect user permissions** and security policies
6. **Handle edge cases** such as empty results or invalid IDs
7. **Provide user feedback** for all operations
8. **Optimize queries** for performance with large datasets
9. **Use confirmation dialogs** for destructive operations
10. **Implement search and filter** to improve usability

## Future Enhancements

1. **Batch Update Operations**: Update multiple products simultaneously
2. **Advanced Filtering**: More sophisticated search capabilities
3. **Audit Trail**: Track all changes to product data
4. **Versioning**: Maintain history of product changes
5. **Bulk Export**: Export products in various formats
6. **Data Validation Rules**: Custom validation for business rules
7. **Integration APIs**: Connect with external inventory systems
8. **Product Images**: Support for product images and galleries
9. **Supplier Information**: Link products to suppliers
10. **Barcode Generation**: Automatically generate barcodes