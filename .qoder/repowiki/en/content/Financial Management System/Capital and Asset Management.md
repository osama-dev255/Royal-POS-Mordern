# Capital and Asset Management

<cite>
**Referenced Files in This Document**
- [CapitalManagement.tsx](file://src/pages/CapitalManagement.tsx)
- [AssetsManagement.tsx](file://src/pages/AssetsManagement.tsx)
- [MonetaryAssets.tsx](file://src/pages/MonetaryAssets.tsx)
- [FinancialReports.tsx](file://src/pages/FinancialReports.tsx)
- [IncomeStatement.tsx](file://src/pages/IncomeStatement.tsx)
- [databaseService.ts](file://src/services/databaseService.ts)
- [20251125_add_vat_depreciation_columns.sql](file://migrations/20251125_add_vat_depreciation_columns.sql)
- [20260219_create_grn_schema.sql](file://migrations/20260219_create_grn_schema.sql)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)

## Introduction
This document explains the capital and asset management system within the Royal POS Modern application. It covers the complete capital tracking workflow from asset acquisition through depreciation and disposal, asset registration processes, valuation methods, lifecycle management, monetary asset tracking, cash flow management, investment monitoring, capital structure reporting, and financial planning integration. Practical examples illustrate asset entry scenarios, depreciation calculations, and capital allocation strategies, along with guidance on asset utilization tracking, maintenance scheduling, and impairment testing.

## Project Structure
The capital and asset management functionality spans several frontend pages and backend services:
- Capital Management: Provides dashboards for capital operations (investment and withdrawal) and summary cards for capital metrics.
- Assets Management: Manages asset acquisitions, disposals, adjustments, and maintains a transaction history.
- Monetary Assets: Tracks income, expenses, receivables, payables, and net position with filtering and export capabilities.
- Financial Reports: Generates financial statements including income statements and balance sheets, integrating asset financials such as VAT and depreciation.
- Income Statement: Calculates revenue, COGS, gross profit, operating expenses, and net profit with VAT-exclusive/inclusive breakdowns.
- Database Services: Defines data models and provides CRUD operations for assets, asset transactions, sales, expenses, and settlements.
- Migrations: Schema updates to support VAT and depreciation tracking on assets and asset transactions.

```mermaid
graph TB
subgraph "Frontend Pages"
CM["CapitalManagement.tsx"]
AM["AssetsManagement.tsx"]
MA["MonetaryAssets.tsx"]
FR["FinancialReports.tsx"]
IS["IncomeStatement.tsx"]
end
subgraph "Services"
DB["databaseService.ts"]
end
subgraph "Database Migrations"
VATMIG["20251125_add_vat_depreciation_columns.sql"]
GRNMIG["20260219_create_grn_schema.sql"]
end
CM --> DB
AM --> DB
MA --> DB
FR --> DB
IS --> DB
DB --> VATMIG
DB --> GRNMIG
```

**Diagram sources**
- [CapitalManagement.tsx:19-132](file://src/pages/CapitalManagement.tsx#L19-L132)
- [AssetsManagement.tsx:28-482](file://src/pages/AssetsManagement.tsx#L28-L482)
- [MonetaryAssets.tsx:31-658](file://src/pages/MonetaryAssets.tsx#L31-L658)
- [FinancialReports.tsx:70-800](file://src/pages/FinancialReports.tsx#L70-L800)
- [IncomeStatement.tsx:63-593](file://src/pages/IncomeStatement.tsx#L63-L593)
- [databaseService.ts:1-800](file://src/services/databaseService.ts#L1-L800)
- [20251125_add_vat_depreciation_columns.sql:1-16](file://migrations/20251125_add_vat_depreciation_columns.sql#L1-L16)
- [20260219_create_grn_schema.sql:1-97](file://migrations/20260219_create_grn_schema.sql#L1-L97)

**Section sources**
- [CapitalManagement.tsx:19-132](file://src/pages/CapitalManagement.tsx#L19-L132)
- [AssetsManagement.tsx:28-482](file://src/pages/AssetsManagement.tsx#L28-L482)
- [MonetaryAssets.tsx:31-658](file://src/pages/MonetaryAssets.tsx#L31-L658)
- [FinancialReports.tsx:70-800](file://src/pages/FinancialReports.tsx#L70-L800)
- [IncomeStatement.tsx:63-593](file://src/pages/IncomeStatement.tsx#L63-L593)
- [databaseService.ts:1-800](file://src/services/databaseService.ts#L1-L800)
- [20251125_add_vat_depreciation_columns.sql:1-16](file://migrations/20251125_add_vat_depreciation_columns.sql#L1-L16)
- [20260219_create_grn_schema.sql:1-97](file://migrations/20260219_create_grn_schema.sql#L1-L97)

## Core Components
- Capital Management Dashboard: Presents total capital, invested capital, and available capital with interactive actions for capital investment and withdrawal.
- Assets Management: Supports buying, selling, disposing, adjusting assets, and viewing transaction history with edit/view/delete capabilities.
- Monetary Assets Tracking: Aggregates sales, expenses, customer settlements, and supplier settlements into a unified monetary asset ledger with search, filter, and export features.
- Financial Reporting: Produces income statements and balance sheets, incorporating VAT and depreciation derived from asset data.
- Income Statement Calculation: Computes revenue, COGS, gross profit, operating expenses, other income/expenses, tax, and net profit with VAT-exclusive/inclusive breakdowns.
- Database Layer: Provides typed interfaces and CRUD operations for assets, asset transactions, sales, expenses, and settlements, enabling robust data management.

**Section sources**
- [CapitalManagement.tsx:19-132](file://src/pages/CapitalManagement.tsx#L19-L132)
- [AssetsManagement.tsx:28-482](file://src/pages/AssetsManagement.tsx#L28-L482)
- [MonetaryAssets.tsx:31-658](file://src/pages/MonetaryAssets.tsx#L31-L658)
- [FinancialReports.tsx:70-800](file://src/pages/FinancialReports.tsx#L70-L800)
- [IncomeStatement.tsx:63-593](file://src/pages/IncomeStatement.tsx#L63-L593)
- [databaseService.ts:1-800](file://src/services/databaseService.ts#L1-L800)

## Architecture Overview
The system follows a layered architecture:
- Presentation Layer: React pages handle user interactions and render dashboards and reports.
- Service Layer: databaseService.ts encapsulates Supabase interactions and exposes typed functions for data operations.
- Data Layer: Supabase-backed tables with migrations ensuring schema alignment for assets, asset transactions, sales, expenses, and settlements.

```mermaid
graph TB
UI["React Pages<br/>CapitalManagement.tsx<br/>AssetsManagement.tsx<br/>MonetaryAssets.tsx<br/>FinancialReports.tsx<br/>IncomeStatement.tsx"]
SVC["databaseService.ts"]
DB["Supabase Tables<br/>assets<br/>asset_transactions<br/>sales<br/>expenses<br/>customer_settlements<br/>supplier_settlements"]
MIG["Migrations<br/>VAT/Depreciation<br/>GRN Schema"]
UI --> SVC
SVC --> DB
DB --> MIG
```

**Diagram sources**
- [CapitalManagement.tsx:19-132](file://src/pages/CapitalManagement.tsx#L19-L132)
- [AssetsManagement.tsx:28-482](file://src/pages/AssetsManagement.tsx#L28-L482)
- [MonetaryAssets.tsx:31-658](file://src/pages/MonetaryAssets.tsx#L31-L658)
- [FinancialReports.tsx:70-800](file://src/pages/FinancialReports.tsx#L70-L800)
- [IncomeStatement.tsx:63-593](file://src/pages/IncomeStatement.tsx#L63-L593)
- [databaseService.ts:1-800](file://src/services/databaseService.ts#L1-L800)
- [20251125_add_vat_depreciation_columns.sql:1-16](file://migrations/20251125_add_vat_depreciation_columns.sql#L1-L16)
- [20260219_create_grn_schema.sql:1-97](file://migrations/20260219_create_grn_schema.sql#L1-L97)

## Detailed Component Analysis

### Capital Management
Capital Management provides:
- Interactive cards for capital investment and withdrawal operations.
- Summary cards for total capital, invested capital, and available capital with trend indicators.
- Navigation to dedicated asset management views.

```mermaid
sequenceDiagram
participant U as "User"
participant CM as "CapitalManagement.tsx"
participant NAV as "Navigation"
U->>CM : Click "Invest Capital"
CM->>NAV : Navigate to asset purchase view
NAV-->>U : Asset purchase screen
U->>CM : Click "Withdraw Capital"
CM->>NAV : Navigate to asset disposal view
NAV-->>U : Asset disposal screen
```

**Diagram sources**
- [CapitalManagement.tsx:19-132](file://src/pages/CapitalManagement.tsx#L19-L132)

**Section sources**
- [CapitalManagement.tsx:19-132](file://src/pages/CapitalManagement.tsx#L19-L132)

### Assets Management
Assets Management supports:
- Asset lifecycle operations: buy, sell, dispose, adjust.
- Transaction history with filtering, pagination placeholders, and modal dialogs for view/edit/delete.
- Integration with databaseService for CRUD operations on asset transactions.

```mermaid
sequenceDiagram
participant U as "User"
participant AM as "AssetsManagement.tsx"
participant DB as "databaseService.ts"
U->>AM : Select "Buy Assets"
AM->>DB : createAssetTransaction(...)
DB-->>AM : Transaction created
AM-->>U : Confirmation
U->>AM : View/Edit/Delete transaction
AM->>DB : getAssetTransactions()/updateAssetTransaction()/deleteAssetTransaction()
DB-->>AM : Updated data
AM-->>U : Updated list
```

**Diagram sources**
- [AssetsManagement.tsx:28-482](file://src/pages/AssetsManagement.tsx#L28-L482)
- [databaseService.ts:1-800](file://src/services/databaseService.ts#L1-L800)

**Section sources**
- [AssetsManagement.tsx:28-482](file://src/pages/AssetsManagement.tsx#L28-L482)
- [databaseService.ts:1-800](file://src/services/databaseService.ts#L1-L800)

### Monetary Assets
Monetary Assets consolidates:
- Income from sales, expenses, customer settlements, and supplier settlements.
- Net position calculation combining income/receivables versus expenses/payables.
- Filtering by type and status, search by description/category/reference, and export to CSV/Excel/Print.

```mermaid
flowchart TD
Start(["Load Data"]) --> FetchSales["Fetch Sales"]
FetchSales --> FetchExpenses["Fetch Expenses"]
FetchExpenses --> FetchCustomerSettlements["Fetch Customer Settlements"]
FetchCustomerSettlements --> FetchSupplierSettlements["Fetch Supplier Settlements"]
FetchSupplierSettlements --> Combine["Combine All Monetary Assets"]
Combine --> ComputeTotals["Compute Totals:<br/>Income/Expenses/Receivables/Payables/Net"]
ComputeTotals --> Filter["Apply Filters/Search"]
Filter --> Render["Render Table and Summary Cards"]
Render --> Export["Export/Print Options"]
```

**Diagram sources**
- [MonetaryAssets.tsx:31-658](file://src/pages/MonetaryAssets.tsx#L31-L658)

**Section sources**
- [MonetaryAssets.tsx:31-658](file://src/pages/MonetaryAssets.tsx#L31-L658)

### Financial Reports
Financial Reports integrates asset financials:
- Calculates total VAT and total depreciation from asset transactions and assets.
- Builds income statement with VAT-exclusive/inclusive breakdowns and adjusts operating profit and net profit accordingly.
- Constructs balance sheet with total assets, accumulated depreciation, and net assets.

```mermaid
sequenceDiagram
participant U as "User"
participant FR as "FinancialReports.tsx"
participant DB as "databaseService.ts"
U->>FR : View "Income Statement"
FR->>DB : getAssets() + getAssetTransactions()
DB-->>FR : Assets and Transactions
FR->>FR : calculateAssetFinancials()
FR-->>U : Income Statement with VAT/Depreciation adjustments
U->>FR : View "Balance Sheet"
FR->>DB : getAssets()
DB-->>FR : Assets
FR->>FR : computeTotalAssets/Depreciation/NetAssets
FR-->>U : Balance Sheet
```

**Diagram sources**
- [FinancialReports.tsx:70-800](file://src/pages/FinancialReports.tsx#L70-L800)
- [databaseService.ts:1-800](file://src/services/databaseService.ts#L1-L800)

**Section sources**
- [FinancialReports.tsx:70-800](file://src/pages/FinancialReports.tsx#L70-L800)
- [databaseService.ts:1-800](file://src/services/databaseService.ts#L1-L800)

### Income Statement
Income Statement computes:
- Revenue (sales minus returns) and COGS (purchases).
- Gross profit, operating expenses, operating profit.
- Other income/expenses, tax (with simplified progressive tax calculation), and net profit.
- VAT-exclusive/inclusive amounts and VAT calculations based on an 18% rate.

```mermaid
flowchart TD
A["Fetch Sales/Purchase/Expense/Return Data"] --> B["Compute Revenue = Sum(Sales) - Sum(Returns)"]
B --> C["Compute COGS = Sum(Purchase Orders)"]
C --> D["Gross Profit = Revenue - COGS"]
D --> E["Operating Expenses = Sum(Expenses)"]
E --> F["Operating Profit = Gross Profit - Operating Expenses"]
F --> G["Other Income/Expenses (placeholder)"]
G --> H["Tax Calculation (progressive)"]
H --> I["Net Profit = Operating Profit + Other - Tax"]
I --> J["Compute VAT-Inclusive/Exclusive Values"]
```

**Diagram sources**
- [IncomeStatement.tsx:63-593](file://src/pages/IncomeStatement.tsx#L63-L593)

**Section sources**
- [IncomeStatement.tsx:63-593](file://src/pages/IncomeStatement.tsx#L63-L593)

### Database Model and Asset Lifecycle
The database layer defines core models and operations supporting asset management:
- Asset and AssetTransaction interfaces enable structured storage of asset metadata, purchase price, current value, depreciation rate, VAT fields, and transaction details.
- CRUD functions for assets and asset transactions facilitate acquisition, sale, disposal, and adjustment workflows.
- Supporting functions for sales, expenses, and settlements integrate monetary asset tracking.

```mermaid
classDiagram
class Asset {
+uuid id
+string name
+string description
+decimal purchase_price
+decimal current_value
+decimal depreciation_rate
+date purchase_date
+date estimated_lifespan
+decimal vat_rate
+decimal vat_amount
+string status
+string serial_number
+string location
+string notes
+timestamp created_at
+timestamp updated_at
}
class AssetTransaction {
+uuid id
+uuid asset_id
+enum transaction_type
+date transaction_date
+decimal amount
+string description
+string buyer_seller
+string notes
+string reference_number
+decimal vat_rate
+decimal vat_amount
+decimal net_amount
+timestamp created_at
+timestamp updated_at
}
class Sale {
+uuid id
+uuid customer_id
+uuid user_id
+string invoice_number
+date sale_date
+decimal subtotal
+decimal discount_amount
+decimal tax_amount
+decimal total_amount
+decimal amount_paid
+decimal change_amount
+string payment_method
+string payment_status
+string sale_status
+string notes
+string reference_number
+timestamp created_at
+timestamp updated_at
}
class Expense {
+uuid id
+uuid user_id
+string category
+string description
+decimal amount
+string payment_method
+date expense_date
+string receipt_url
+boolean is_business_related
+string notes
+timestamp created_at
+timestamp updated_at
}
class CustomerSettlement {
+uuid id
+uuid customer_id
+uuid user_id
+string customer_name
+string customer_phone
+string customer_email
+string reference_number
+decimal settlement_amount
+string payment_method
+string cashier_name
+decimal previous_balance
+decimal amount_paid
+decimal new_balance
+string notes
+date date
+string time
+string status
+timestamp created_at
+timestamp updated_at
}
class SupplierSettlement {
+uuid id
+uuid supplier_id
+uuid user_id
+decimal amount
+string payment_method
+string reference_number
+string notes
+date settlement_date
+timestamp created_at
+timestamp updated_at
}
Asset "1" <-- "many" AssetTransaction : "has transactions"
AssetTransaction --> Asset : "belongs to"
```

**Diagram sources**
- [databaseService.ts:1-800](file://src/services/databaseService.ts#L1-L800)

**Section sources**
- [databaseService.ts:1-800](file://src/services/databaseService.ts#L1-L800)

### Practical Examples

#### Asset Entry Scenario
- Capture asset details: name, description, category, purchase date, purchase price, current value, depreciation rate, estimated lifespan, VAT rate, VAT amount, status, location, notes.
- Create asset and associated asset transaction with transaction type set to purchase, amount equal to purchase price, and VAT fields populated.

**Section sources**
- [AssetsManagement.tsx:28-482](file://src/pages/AssetsManagement.tsx#L28-L482)
- [databaseService.ts:1-800](file://src/services/databaseService.ts#L1-L800)

#### Depreciation Calculation
- Annual depreciation = purchase price × (depreciation rate / 100).
- Accumulated depreciation = annual depreciation × years owned since purchase date.
- Net book value = purchase price − accumulated depreciation.

**Section sources**
- [FinancialReports.tsx:120-153](file://src/pages/FinancialReports.tsx#L120-L153)
- [databaseService.ts:1-800](file://src/services/databaseService.ts#L1-L800)

#### Capital Allocation Strategies
- Use Capital Management summary cards to monitor available capital trends.
- Allocate capital to asset acquisitions by navigating to asset purchase workflows.
- Monitor capital efficiency via financial reports that incorporate VAT and depreciation impacts.

**Section sources**
- [CapitalManagement.tsx:19-132](file://src/pages/CapitalManagement.tsx#L19-L132)
- [FinancialReports.tsx:120-153](file://src/pages/FinancialReports.tsx#L120-L153)

### Asset Utilization Tracking, Maintenance Scheduling, and Impairment Testing
- Utilization tracking: Link asset usage to operational metrics via sales and inventory data.
- Maintenance scheduling: Record maintenance events as asset adjustments or separate maintenance entries, updating asset status and notes.
- Impairment testing: Compare carrying value against recoverable amount; adjust asset value and record impairment loss through asset adjustments.

[No sources needed since this section provides general guidance]

## Dependency Analysis
The system exhibits clear separation of concerns:
- Frontend pages depend on databaseService for data access.
- databaseService depends on Supabase client for persistence.
- Migrations define schema changes for VAT and depreciation support.

```mermaid
graph LR
CM["CapitalManagement.tsx"] --> DB["databaseService.ts"]
AM["AssetsManagement.tsx"] --> DB
MA["MonetaryAssets.tsx"] --> DB
FR["FinancialReports.tsx"] --> DB
IS["IncomeStatement.tsx"] --> DB
DB --> MIG1["20251125_add_vat_depreciation_columns.sql"]
DB --> MIG2["20260219_create_grn_schema.sql"]
```

**Diagram sources**
- [CapitalManagement.tsx:19-132](file://src/pages/CapitalManagement.tsx#L19-L132)
- [AssetsManagement.tsx:28-482](file://src/pages/AssetsManagement.tsx#L28-L482)
- [MonetaryAssets.tsx:31-658](file://src/pages/MonetaryAssets.tsx#L31-L658)
- [FinancialReports.tsx:70-800](file://src/pages/FinancialReports.tsx#L70-L800)
- [IncomeStatement.tsx:63-593](file://src/pages/IncomeStatement.tsx#L63-L593)
- [databaseService.ts:1-800](file://src/services/databaseService.ts#L1-L800)
- [20251125_add_vat_depreciation_columns.sql:1-16](file://migrations/20251125_add_vat_depreciation_columns.sql#L1-L16)
- [20260219_create_grn_schema.sql:1-97](file://migrations/20260219_create_grn_schema.sql#L1-L97)

**Section sources**
- [CapitalManagement.tsx:19-132](file://src/pages/CapitalManagement.tsx#L19-L132)
- [AssetsManagement.tsx:28-482](file://src/pages/AssetsManagement.tsx#L28-L482)
- [MonetaryAssets.tsx:31-658](file://src/pages/MonetaryAssets.tsx#L31-L658)
- [FinancialReports.tsx:70-800](file://src/pages/FinancialReports.tsx#L70-L800)
- [IncomeStatement.tsx:63-593](file://src/pages/IncomeStatement.tsx#L63-L593)
- [databaseService.ts:1-800](file://src/services/databaseService.ts#L1-L800)
- [20251125_add_vat_depreciation_columns.sql:1-16](file://migrations/20251125_add_vat_depreciation_columns.sql#L1-L16)
- [20260219_create_grn_schema.sql:1-97](file://migrations/20260219_create_grn_schema.sql#L1-L97)

## Performance Considerations
- Use pagination and filtering in transaction/history views to limit data loads.
- Batch operations for bulk updates/deletes where applicable.
- Optimize database queries with appropriate indexes (as seen in migration for saved GRNs).
- Cache frequently accessed financial summaries to reduce repeated computations.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
- Asset financial calculations: Verify VAT and depreciation fields are present and populated; confirm migration execution for VAT/Depreciation columns.
- Transaction history: Ensure asset transaction retrieval functions return data; check for network errors and handle loading states gracefully.
- Monetary assets: Confirm sales, expenses, customer settlements, and supplier settlements are fetched successfully; validate computed totals and filters.
- Financial reports: Validate tax period selection for tax summary; ensure asset financial aggregation handles missing or zero values.

**Section sources**
- [20251125_add_vat_depreciation_columns.sql:1-16](file://migrations/20251125_add_vat_depreciation_columns.sql#L1-L16)
- [AssetsManagement.tsx:28-482](file://src/pages/AssetsManagement.tsx#L28-L482)
- [MonetaryAssets.tsx:31-658](file://src/pages/MonetaryAssets.tsx#L31-L658)
- [FinancialReports.tsx:70-800](file://src/pages/FinancialReports.tsx#L70-L800)

## Conclusion
The capital and asset management system integrates asset lifecycle operations with financial reporting, enabling accurate tracking of capital movements, asset valuations, and cash flows. By leveraging VAT and depreciation calculations, the system supports informed decision-making for capital efficiency, ROI analysis, and long-term financial planning. The modular architecture ensures maintainability and scalability as business needs evolve.