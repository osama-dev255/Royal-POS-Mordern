import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { formatCurrency } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  Receipt, 
  Mail, 
  Download, 
  Upload, 
  Eye,
  Edit,
  Save,
  Printer,
  Copy,
  Trash2,
  Truck,
  FileSpreadsheet,
  FileWarning,
  FileBarChart,
  FileUser,
  Gift,
  Wallet,
  StickyNote,
  ScrollText,
  FileCheck,
  FileX,
  Plus,
  Minus,
  Share,
  ExternalLink,
  MessageCircle,
  RotateCcw,
  HandCoins,
  CreditCard,
  FolderOpen,
  ShoppingCart,
  Loader2,
  ClipboardCheck
} from "lucide-react";
import { getTemplateConfig, saveTemplateConfig, ReceiptTemplateConfig } from '@/utils/templateUtils';
import { PrintUtils } from '@/utils/printUtils';
import { ExportUtils } from '@/utils/exportUtils';
import WhatsAppUtils from '@/utils/whatsappUtils';
import { saveInvoice, InvoiceData as SavedInvoiceData } from '@/utils/invoiceUtils';
import { saveDelivery, DeliveryData } from '@/utils/deliveryUtils';
import { saveSalesOrder, SalesOrderData as SavedSalesOrderData } from '@/utils/salesOrderUtils';
import { saveCustomerSettlement, CustomerSettlementData as SavedCustomerSettlementData } from '@/utils/customerSettlementUtils';
import { saveGRN, SavedGRN as UtilsSavedGRN, getSavedGRNs } from '@/utils/grnUtils';
import { getGodowns, getZones, getGodownStock, Godown, GodownZone, GodownStock } from '@/services/godownService';
import { getSuppliers, createSupplier, Supplier as DBSupplier } from '@/services/databaseService';
import { uploadFile } from '@/utils/fileUploadUtils';
import { updateGRNQuantitiesFromInvoice, updateGRNQuantitiesFromDeliveryNote, updateGRNQuantitiesBasedOnDelivered, updateProductStockBasedOnDelivered, checkItemAvailability } from '@/utils/consumptionUtils';
import { saveSupplierSettlement, SupplierSettlementData as UtilsSupplierSettlementData, generateSupplierSettlementReference } from '@/utils/supplierSettlementUtils';
import { SavedDeliveriesSection } from '@/components/SavedDeliveriesSection';
import { SavedCustomerSettlementsSection } from '@/components/SavedCustomerSettlementsSection';
import { SavedSupplierSettlementsSection } from '@/components/SavedSupplierSettlementsSection';
import { SavedGRNsSection } from '@/components/SavedGRNsSection';
import { SavedSalesOrdersSection } from '@/components/SavedSalesOrdersSection';
import { SavedStockTakesSection } from '@/components/SavedStockTakesSection';
import { SupplierPurchaseNoteSection } from '@/components/SupplierPurchaseNoteSection';
import { getProducts, createProduct, Product, getOutlets, Outlet, incrementProductStock, decrementProductStock } from '@/services/databaseService';
import { supabase } from '@/lib/supabaseClient';

interface Template {
  id: string;
  name: string;
  type: "delivery-note" | "order-form" | "contract" | "invoice" | "receipt" | "notice" | "quotation" | "report" | "salary-slip" | "complimentary-goods" | "expense-voucher" | "customer-settlement" | "supplier-settlement" | "goods-received-note" | "purchase-order" | "sales-order" | "stock-take" | "supplier-purchase-note";
  description: string;
  content: string;
  lastModified: string;
  isActive: boolean;
}

interface DeliveryNoteItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  delivered: number;
  remarks: string;
  godownId?: string;
  godownName?: string;
  zoneId?: string;
  zoneName?: string;
}

interface DeliveryNoteData {
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;
  customerName: string;
  customerAddress1: string;
  customerDistrictWard: string;
  customerAddress2: string;
  customerPhone: string;
  customerEmail: string;
  customerTaxId: string;
  deliveryNoteNumber: string;
  date: string;
  deliveryDate: string;
  vehicle: string;
  driver: string;
  items: DeliveryNoteItem[];
  deliveryNotes: string;
  totalItems: number;
  totalQuantity: number;
  totalPackages: number;
  preparedByName: string;
  preparedByDate: string;
  driverName: string;
  driverDate: string;
  receivedByName: string;
  receivedByDate: string;
  // Financial fields
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  amountPaid: number;
  creditBroughtForward: number;
  amountDue: number;
  timestamp?: string;
  // Godown integration fields
  sourceType?: 'investment' | 'outlet';
  sourceGodownId?: string;
  sourceZoneId?: string;
  sourceGodownName?: string;
  sourceZoneName?: string;
}



interface SavedDeliveryNote {
  id: string;
  name: string;
  data: DeliveryNoteData;
  createdAt: string;
  updatedAt: string;
}

// Helper function to get local date in YYYY-MM-DD format (avoids timezone issues)
const getLocalDate = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Initial delivery note data
const initialDeliveryNoteData: DeliveryNoteData = {
  businessName: "KILANGO INVESTMENT LTD",
  businessAddress: "P.O.BOX 64, Muheza - Tanga - Tanzania.",
  businessPhone: "+255 711 299 266",
  businessEmail: "kilangogroup1@gmail.com",
  customerName: "Customer Name",
  customerAddress1: "Customer Address Line 1",
  customerAddress2: "Customer Address Line 2",
  customerPhone: "+255 ",
  customerEmail: "customer@example.com",
  deliveryNoteNumber: "DN-001",
  date: getLocalDate(), // Current local date
  deliveryDate: getLocalDate(), // Default to today (local)
  vehicle: "",
  driver: "",
  items: [
    { id: "1", description: "Sample Product 1", quantity: 10, unit: "pcs", rate: 100, amount: 1000, delivered: 10, remarks: "Good condition" },
    { id: "2", description: "Sample Product 2", quantity: 5, unit: "boxes", rate: 250, amount: 1250, delivered: 5, remarks: "Fragile" },
    { id: "3", description: "Sample Product 3", quantity: 2, unit: "units", rate: 500, amount: 1000, delivered: 2, remarks: "" }
  ],
  deliveryNotes: "Please inspect the goods upon delivery.\nSignature required upon delivery.",
  totalItems: 3,
  totalQuantity: 0, // Will be calculated dynamically
  totalPackages: 3,
  preparedByName: "",
  preparedByDate: getLocalDate(), // Default to today (local)
  driverName: "",
  driverDate: getLocalDate(), // Default to today (local)
  receivedByName: "",
  receivedByDate: "",
  // Financial fields
  subtotal: 3250,
  tax: 0,
  discount: 0,
  total: 3250,
  amountPaid: 0,
  creditBroughtForward: 0,
  amountDue: 3250
};

// Initial sales order data
const initialSalesOrderData: SalesOrderData = {
  orderNumber: "SO-001",
  date: new Date().toISOString().split('T')[0],
  salesRep: "Sales Representative Name",
  businessName: "KILANGO INVESTMENT LTD",
  businessAddress: "123 Business Street, City, Country",
  businessPhone: "+1234567890",
  businessEmail: "info@yourbusiness.com",
  customerName: "Customer Name",
  customerAddress: "Customer Address Line 1\nCustomer Address Line 2",
  customerPhone: "+1234567890",
  customerEmail: "customer@example.com",
  orderDate: new Date().toISOString().split('T')[0],
  requiredBy: "",
  paymentTerms: "Net 30",
  shippingMethod: "Standard Delivery",
  items: [
    { id: "1", description: "Sample Product 1", quantity: 10, unit: "pcs", unitPrice: 100, total: 1000 },
    { id: "2", description: "Sample Product 2", quantity: 5, unit: "boxes", unitPrice: 250, total: 1250 },
    { id: "3", description: "Sample Product 3", quantity: 2, unit: "units", unitPrice: 500, total: 1000 }
  ],
  subtotal: 3250,
  discount: 0,
  taxRate: 0,
  taxAmount: 0,
  shippingCost: 0,
  total: 3250,
  specialInstructions: "Please handle with care. Fragile items included.",
  customerSignature: "",
  signatureDate: "",
  customerPrintName: "",
  salesRepSignature: "",
  authDate: "",
  managerApproval: "",
  approvalDate: ""
};

// Purchase Order Item interface with unit field
interface PurchaseOrderItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

// Sales Order interfaces
interface SalesOrderItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

interface SalesOrderData {
  orderNumber: string;
  date: string;
  salesRep: string;
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;
  customerName: string;
  customerAddress: string;
  customerDistrictWard: string;
  customerPhone: string;
  customerEmail: string;
  customerTaxId: string;
  orderDate: string;
  requiredBy: string;
  paymentTerms: string;
  shippingMethod: string;
  items: SalesOrderItem[];
  subtotal: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  shippingCost: number;
  total: number;
  specialInstructions: string;
  customerSignature: string;
  signatureDate: string;
  customerPrintName: string;
  salesRepSignature: string;
  authDate: string;
  managerApproval: string;
  approvalDate: string;
}

interface SavedPurchaseOrderData {
  id: string;
  poNumber: string;
  date: string;
  supplier: string;
  items: number;
  total: number;
  paymentMethod: string;
  status: string;
  itemsList: Array<{
    name: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  discount: number;
  shipping: number;
  paymentTerms: string;
  deliveryInstructions: string;
  notes: string;
  authorizedByName: string;
  authorizedBySignature: string;
  authorizationDate: string;
}

interface PurchaseOrderData {
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;
  numberOfSuppliers: number;
  supplierName: string;
  supplierAddress: string;
  supplierPhone: string;
  supplierEmail: string;
  poNumber: string;
  date: string;
  expectedDelivery: string;
  items: PurchaseOrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  shipping: number;
  total: number;
  paymentTerms: string;
  deliveryInstructions: string;
  notes: string;
  authorizedByName: string;
  authorizedBySignature: string;
  authorizationDate: string;
  requestedBy?: string;
  approvedBy?: string;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
}

interface InvoiceData {
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;
  clientName: string;
  clientAddress: string;
  clientDistrictWard: string;
  clientCityState: string;
  clientPhone: string;
  clientEmail: string;
  clientTaxId: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  amountDue: number;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  amountPaid: number;
  creditBroughtForward: number;
  terms: string;
  notes: string;
  paymentOptions: string;
  checkPayableMessage: string;
  timestamp: string;
}

interface ExpenseVoucherItem {
  id: string;
  description: string;
  category: string;
  amount: number;
  date: string;
}

interface ExpenseVoucherData {
  voucherNumber: string;
  date: string;
  submittedBy: string;
  employeeId: string;
  department: string;
  items: ExpenseVoucherItem[];
  totalAmount: number;
  purpose: string;
  approvedBy: string;
  approvedDate: string;
  notes: string;
  submittedBySignature?: string;
  approvedBySignature?: string;
  signatureDate?: string;
}

interface SalarySlipData {
  employeeName: string;
  employeeId: string;
  payPeriod: string;
  paidDate: string;
  basicSalary: number;
  allowances: number;
  overtime: number;
  bonus: number;
  grossPay: number;
  tax: number;
  insurance: number;
  otherDeductions: number;
  totalDeductions: number;
  netPay: number;
  bankName: string;
  accountNumber: string;
  department: string;
  position: string;
  paymentMethod: string;
  employeeSignature?: string;
  managerSignature?: string;
  signatureDate?: string;
}

interface ComplimentaryGoodsItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
}

interface ComplimentaryGoodsData {
  voucherNumber: string;
  date: string;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  customerEmail: string;
  items: ComplimentaryGoodsItem[];
  reason: string;
  authorizedByName: string;
  authorizedByTitle: string;
  authorizedDate: string;
}

interface CustomerSettlementData {
  customerName: string;
  customerId: string;
  customerPhone: string;
  customerEmail: string;
  referenceNumber: string;
  settlementAmount: number;
  paymentMethod: string;
  cashierName: string;
  previousBalance: number;
  amountPaid: number;
  newBalance: number;
  notes?: string;
  date: string;
  time: string;
  status?: "completed" | "pending" | "cancelled";
}

interface LocalSupplierSettlementData {
  supplierName: string;
  supplierId: string;
  supplierPhone: string;
  supplierEmail: string;
  referenceNumber: string;
  settlementAmount: number;
  paymentMethod: string;
  processedBy: string;
  poNumber?: string;
  previousBalance: number;
  amountPaid: number;
  newBalance: number;
  notes?: string;
  date: string;
  time: string;
  status?: "completed" | "pending" | "cancelled";
}

interface GRNItem {
  id: string;
  description: string;
  orderedQuantity: number;
  receivedQuantity: number;
  unit: string;
  originalUnitCost?: number;  // Original cost per unit (without receiving costs)
  unitCost?: number;  // Cost per unit (including receiving costs)
  totalCost?: number;  // Total cost without receiving costs
  receivingCostPerUnit?: number;  // Receiving cost per unit
  totalWithReceivingCost?: number;  // Total cost including receiving costs
  batchNumber?: string;
  expiryDate?: string;
  remarks?: string;
  supplierId?: string;  // To track which supplier this item belongs to
  productId?: string;  // To track which product this item corresponds to
  // Per-item godown/zone fields for multi-godown support
  destinationGodownId?: string;
  destinationZoneId?: string;
  destinationGodownName?: string;
  destinationZoneName?: string;
}

interface GRNReceivingCost {
  id: string;
  description: string;
  amount: number;
}

interface SupplierInfo {
  id: string;
  name: string;
  supplierId: string;
  phone: string;
  email: string;
  address: string;
  tinNumber?: string;
  businessTin?: string;  // Business TIN number separate from supplier TIN
  stockType: 'exempt' | 'vatable' | '';  // Stock type specific to each supplier
  documentUrl?: string;  // URL of uploaded supplier document (PDF)
  documentName?: string; // Original filename of uploaded document
}

interface LogisticDetails {
  vehicleNumber: string;
  driverName: string;
  driverPhone: string;
  transportCompany: string;
  estimatedArrival: string;
  actualArrival: string;
  departureTime: string;
  deliveryLocation: string;
  specialInstructions: string;
  shippingMethod: string;
  trackingNumber: string;
}

interface GRNData {
  grnNumber: string;
  date: string;
  time: string;
  numberOfSuppliers: number;
  suppliers: SupplierInfo[]; // Array to hold multiple supplier information
  supplierName: string; // Kept for backward compatibility
  supplierId: string;   // Kept for backward compatibility
  supplierPhone: string; // Kept for backward compatibility
  supplierEmail: string; // Kept for backward compatibility
  supplierAddress: string; // Kept for backward compatibility
  logisticDetails: LogisticDetails; // New logistic details field
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;
  // businessStockType field removed - now supplier-specific
  isVatable: boolean;
  supplierTinNumber: string;
  businessTin?: string;
  poNumber: string;
  deliveryNoteNumber: string;
  vehicleNumber: string;
  driverName: string;
  receivedBy: string;
  receivedLocation?: string;
  items: GRNItem[];
  receivingCosts: GRNReceivingCost[];
  qualityCheckNotes: string;
  discrepancies: string;
  preparedBy: string;
  preparedDate: string;
  checkedBy: string;
  checkedDate: string;
  approvedBy: string;
  approvedDate: string;
  receivedDate: string;
  status?: "received" | "checked" | "approved" | "completed";
  timestamp?: string;
  // Godown integration fields
  destinationGodownId?: string;
  destinationZoneId?: string;
  destinationGodownName?: string;
  destinationZoneName?: string;
}

interface SavedGRN {
  id: string;
  name: string;
  data: GRNData;
  createdAt: string;
  updatedAt: string;
}

interface SupplierPurchaseNoteItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

interface SupplierPurchaseNoteData {
  purchaseNoteNumber: string;
  date: string;
  supplierName: string;
  supplierPhone: string;
  supplierEmail: string;
  supplierAddress: string;
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;
  items: SupplierPurchaseNoteItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  notes: string;
  preparedBy: string;
  preparedDate: string;
  status: 'draft' | 'completed' | 'cancelled';
}

interface TemplatesProps {
  onBack?: () => void;
}

export const Templates = ({ onBack }: TemplatesProps) => {
  const [activeTab, setActiveTab] = useState<"manage" | "customize" | "preview" | "savedDeliveries" | "savedCustomerSettlements" | "savedSupplierSettlements" | "savedGRNs" | "savedSalesOrders" | "savedStockTakes" | "savedSupplierPurchaseNotes">("manage");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [viewingTemplate, setViewingTemplate] = useState<string | null>(null);
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([
    {
      id: "1",
      name: "Delivery Note",
      type: "delivery-note",
      description: "Professional delivery note template for product shipments",
      content: `DELIVERY NOTE
Delivery #[DELIVERY_NUMBER]
Date: [DATE]
Vehicle: [VEHICLE_REGISTRATION]
Driver: [DRIVER_NAME]

From:
[BUSINESS_NAME]
[BUSINESS_ADDRESS]
[BUSINESS_PHONE]

To:
[CUSTOMER_NAME]
[CUSTOMER_ADDRESS]
[CUSTOMER_PHONE]

Items:
[ITEM_LIST]

Special Instructions:
[SPECIAL_INSTRUCTIONS]

Signature: _________________
Date: [SIGNATURE_DATE]

Thank you for your business!`,
      lastModified: "2023-08-15",
      isActive: true
    },
    {
      id: "2",
      name: "Purchase Order",
      type: "order-form",
      description: "Professional purchase order template for supplier transactions",
      content: `PURCHASE ORDER
Official Business Document

ORDER #
[ORDER_NUMBER]

FROM:
[BUSINESS_NAME]
[BUSINESS_ADDRESS]
Phone:
[BUSINESS_PHONE]
Contact:
[BUSINESS_CONTACT]

TO (Supplier):
[VENDOR_NAME]
[VENDOR_ADDRESS]
Phone:
[VENDOR_PHONE]
Contact:
[VENDOR_CONTACT]

DATE
[DATE]

REQUIRED BY
[REQUIRED_BY]

PAYMENT TERMS
[PAYMENT_TERMS]

SHIP VIA
[SHIP_VIA]

ITEMS ORDERED:
[ITEM_LIST]

SUBTOTAL	[SUBTOTAL]
TAX ([TAX_RATE]%)	[TAX_AMOUNT]
SHIPPING	[SHIPPING]
TOTAL	[TOTAL]

SPECIAL INSTRUCTIONS:
[SPECIAL_INSTRUCTIONS]

APPROVAL:
[APPROVAL_NOTES]`,
      lastModified: "2023-08-15",
      isActive: false
    },
    {
      id: "3",
      name: "Contract Template",
      type: "contract",
      description: "Standard business contract template",
      content: `CONTRACT AGREEMENT
Contract #[CONTRACT_NUMBER]
Date: [DATE]

This Agreement is made between [PARTY_A] and [PARTY_B].

1. Services/Products:
[DESCRIPTION]

2. Terms:
[TERMS]

3. Payment:
[PAYMENT_TERMS]

4. Duration:
[DURATION]

Signatures:
_________________    _________________
[PARTY_A]            [PARTY_B]
Date:                Date:`,
      lastModified: "2023-08-15",
      isActive: false
    },
    {
      id: "4",
      name: "Invoice Template",
      type: "invoice",
      description: "Professional invoice template for billing",
      content: `INVOICE
[INVOICE_NUMBER]
AMOUNT DUE

[AMOUNT_DUE]
Due:
[DUE_DATE]
FROM:

[BUSINESS_NAME]
[BUSINESS_ADDRESS]
Phone:
[BUSINESS_PHONE]
Email:
[BUSINESS_EMAIL]
BILL TO:

[CLIENT_NAME]
[CLIENT_ADDRESS]
[CLIENT_CITY_STATE]
Phone:
[CLIENT_PHONE]
Email:
[CLIENT_EMAIL]
INVOICE DATE

[INVOICE_DATE]
DUE DATE

[DUE_DATE]
TERMS

[TERMS]
SERVICES RENDERED:
Item	Description	Quantity	Unit	Rate	Amount
[ITEM_LIST]
NOTES:
[NOTES]
PAYMENT OPTIONS:

[PAYMENT_OPTIONS]
Subtotal:	[SUBTOTAL]
Discount:	[DISCOUNT]
Tax:	[TAX]
TOTAL:	[TOTAL]
Amount Paid:	[AMOUNT_PAID]
Credit Brought Forward from previous:	[CREDIT_BROUGHT_FORWARD]
AMOUNT DUE:	[AMOUNT_DUE]
[NOTES]

Please make checks payable to [BUSINESS_NAME]`,
      lastModified: "2023-08-15",
      isActive: false
    },
    {
      id: "5",
      name: "Receipt Template",
      type: "receipt",
      description: "Business receipt template for payments",
      content: `POS BUSINESS
123 Business St, City, Country
Phone: (123) 456-7890

Receipt #[RECEIPT_NUMBER]
Date: [DATE]
Time: [TIME]
Customer: [CUSTOMER_NAME]

Items:
[ITEM_LIST]

Subtotal: [SUBTOTAL]
Tax: [TAX]
Discount: [DISCOUNT]
Total: [TOTAL]
Payment Method: [PAYMENT_METHOD]
Amount Received: [AMOUNT_RECEIVED]
Change: [CHANGE]

Thank you for your business!`,
      lastModified: "2023-08-15",
      isActive: false
    },
    {
      id: "6",
      name: "Notice Template",
      type: "notice",
      description: "Formal business notice template",
      content: `NOTICE
Notice #[NOTICE_NUMBER]
Date: [DATE]

To: [RECIPIENT]
From: [SENDER]

Subject: [SUBJECT]

[CONTENT]

Effective Date: [EFFECTIVE_DATE]

Contact:
[CONTACT_INFORMATION]`,
      lastModified: "2023-08-15",
      isActive: false
    },
    {
      id: "7",
      name: "Quotation Template",
      type: "quotation",
      description: "Business quotation/proposal template",
      content: `QUOTATION
Quote #[QUOTE_NUMBER]
Date: [DATE]
Valid Until: [VALID_UNTIL]

From:
[BUSINESS_NAME]
[BUSINESS_ADDRESS]
[BUSINESS_PHONE]

To:
[CUSTOMER_NAME]
[CUSTOMER_ADDRESS]
[CUSTOMER_PHONE]

Items:
[ITEM_LIST]

Subtotal: [SUBTOTAL]
Tax: [TAX]
Discount: [DISCOUNT]
Total: [TOTAL]

This quote is valid for 30 days.`,
      lastModified: "2023-08-15",
      isActive: false
    },
    {
      id: "8",
      name: "Report Template",
      type: "report",
      description: "Business report template for documentation",
      content: `BUSINESS REPORT
Report #[REPORT_NUMBER]
Date: [DATE]
Prepared by: [PREPARER]

Executive Summary:
[SUMMARY]

Details:
[DETAILS]

Conclusion:
[CONCLUSION]

Recommendations:
[RECOMMENDATIONS]`,
      lastModified: "2023-08-15",
      isActive: false
    },
    {
      id: "9",
      name: "Salary Slip",
      type: "salary-slip",
      description: "Employee salary slip template",
      content: `SALARY SLIP
Employee: [EMPLOYEE_NAME]
Employee ID: [EMPLOYEE_ID]
Pay Period: [PAY_PERIOD]

Earnings:
Basic Salary: [BASIC_SALARY]
Allowances: [ALLOWANCES]
Overtime: [OVERTIME]
Bonus: [BONUS]
Gross Pay: [GROSS_PAY]

Deductions:
Tax: [TAX]
Insurance: [INSURANCE]
Other: [OTHER_DEDUCTIONS]
Total Deductions: [TOTAL_DEDUCTIONS]

Net Pay: [NET_PAY]

Paid Date: [PAID_DATE]`,
      lastModified: "2023-08-15",
      isActive: false
    },
    {
      id: "11",
      name: "Expense Voucher",
      type: "expense-voucher",
      description: "Professional expense voucher template",
      content: `EXPENSE VOUCHER
Voucher #[VOUCHER_NUMBER]
Date: [DATE]
Submitted by: [EMPLOYEE_NAME]

Expense Details:
Category: [CATEGORY]
Description: [DESCRIPTION]
Amount: [AMOUNT]

Supporting Documents:
[DOCUMENTS]

Approved by: _________________
Signature: _________________
Date: [DATE]`,
      lastModified: "2023-08-15",
      isActive: false
    },
    {
      id: "12",
      name: "Customer Settlements Template",
      type: "customer-settlement",
      description: "Professional template for customer debt settlements and payment receipts",
      content: `CUSTOMER SETTLEMENT RECEIPT
Receipt #[RECEIPT_NUMBER]
Date: [DATE]
Time: [TIME]

Customer Information:
Name: [CUSTOMER_NAME]
ID: [CUSTOMER_ID]
Phone: [CUSTOMER_PHONE]
Email: [CUSTOMER_EMAIL]

Settlement Details:
Reference: [REFERENCE_NUMBER]
Amount: [SETTLEMENT_AMOUNT]
Payment Method: [PAYMENT_METHOD]

Transaction Summary:
Previous Balance: [PREVIOUS_BALANCE]
Amount Paid: [AMOUNT_PAID]
New Balance: [NEW_BALANCE]

Notes:
[SETTLEMENT_NOTES]

Processed by: [CASHIER_NAME]

Thank you for your payment!
We appreciate your business.`,
      lastModified: "2023-08-15",
      isActive: false
    },
    {
      id: "13",
      name: "Supplier Settlements Template",
      type: "supplier-settlement",
      description: "Professional template for supplier payment settlements and receipts",
      content: `SUPPLIER SETTLEMENT RECEIPT
Receipt #[RECEIPT_NUMBER]
Date: [DATE]
Time: [TIME]

Supplier Information:
Number of suppliers: [NUMBER_OF_SUPPLIERS]
Name: [SUPPLIER_NAME]
ID: [SUPPLIER_ID]
Phone: [SUPPLIER_PHONE]
Email: [SUPPLIER_EMAIL]

Settlement Details:
Reference: [REFERENCE_NUMBER]
PO Number: [PO_NUMBER]
Amount: [SETTLEMENT_AMOUNT]
Payment Method: [PAYMENT_METHOD]

Transaction Summary:
Previous Balance: [PREVIOUS_BALANCE]
Amount Paid: [AMOUNT_PAID]
New Balance: [NEW_BALANCE]

Notes:
[SETTLEMENT_NOTES]

Processed by: [PROCESSED_BY]

Thank you for your business!
We appreciate working with you.`,
      lastModified: "2023-08-15",
      isActive: false
    },
    {
      id: "14",
      name: "Goods Received Note (GRN)",
      type: "goods-received-note",
      description: "Professional template for recording goods received from suppliers",
      content: `GOODS RECEIVED NOTE
Document #[GRN_NUMBER]
Date: [DATE]
Time: [TIME]

Receiving Business:
Name: [BUSINESS_NAME]
Address: [BUSINESS_ADDRESS]
Phone: [BUSINESS_PHONE]
Email: [BUSINESS_EMAIL]

Delivery Details:
PO Number: [PO_NUMBER]
Delivery Note #: [DELIVERY_NOTE_NUMBER]
Vehicle #: [VEHICLE_NUMBER]
Driver: [DRIVER_NAME]
Received By: [RECEIVED_BY]

Items Received:
[ITEM_LIST]

Quality Check:
[QUALITY_CHECK_NOTES]

Discrepancies:
[DISCREPANCIES]

Signatures:
Prepared By: [PREPARED_BY]    Date: [PREPARED_DATE]
Checked By: [CHECKED_BY]      Date: [CHECKED_DATE]
Approved By: [APPROVED_BY]    Date: [APPROVED_DATE]
Received By: [RECEIVED_BY]    Date: [RECEIVED_DATE]

Thank you for your business!`,
      lastModified: "2023-08-15",
      isActive: false
    },
    {
      id: "15",
      name: "Sales Order",
      type: "sales-order",
      description: "Professional sales order template for customer orders",
      content: `SALES ORDER
Order #[ORDER_NUMBER]
Date: [DATE]
Sales Rep: [SALES_REP]

FROM:
[BUSINESS_NAME]
[BUSINESS_ADDRESS]
Phone: [BUSINESS_PHONE]
Email: [BUSINESS_EMAIL]

TO:
[CUSTOMER_NAME]
[CUSTOMER_ADDRESS]
Phone: [CUSTOMER_PHONE]
Email: [CUSTOMER_EMAIL]

ORDER DETAILS:
Order Date: [ORDER_DATE]
Required By: [REQUIRED_BY]
Payment Terms: [PAYMENT_TERMS]
Shipping Method: [SHIPPING_METHOD]

ITEMS ORDERED:
[ITEM_LIST]

ORDER SUMMARY:
Subtotal: [SUBTOTAL]
Discount: [DISCOUNT]
Tax ([TAX_RATE]%): [TAX_AMOUNT]
Shipping: [SHIPPING_COST]
TOTAL: [TOTAL]

SPECIAL INSTRUCTIONS:
[SPECIAL_INSTRUCTIONS]

CUSTOMER ACKNOWLEDGMENT:
I hereby confirm this order and agree to the terms and conditions.

Customer Signature: _________________    Date: [SIGNATURE_DATE]
Print Name: [CUSTOMER_PRINT_NAME]

AUTHORIZED BY:
Sales Representative: [SALES_REP]      Date: [AUTH_DATE]
Manager Approval: _________________     Date: [APPROVAL_DATE]`,
      lastModified: new Date().toISOString().split('T')[0],
      isActive: true
    },
    {
      id: "16",
      name: "Stock Take",
      type: "stock-take",
      description: "Physical stock take template for investment inventory auditing in godowns and zones",
      content: `PHYSICAL STOCK TAKE
Stock Take #[STOCK_TAKE_NUMBER]
Date: [DATE]
Godown: [GODOWN_NAME]
Zone: [ZONE_NAME]
Purpose: Investment Inventory

COUNTED BY:
[COUNTED_BY]

GODOWN STOCK COUNT:
No.	Product	Godown	Zone	System Qty	Physical Count	Variance
[ITEM_LIST]

INVENTORY SUMMARY:
Total Products: [TOTAL_PRODUCTS]
Total System Quantity: [TOTAL_SYSTEM_QTY]
Total Physical Count: [TOTAL_PHYSICAL_COUNT]
Total Variance: [TOTAL_VARIANCE]
Total Investment Value: [TOTAL_INVESTMENT_VALUE]

NOTES:
[NOTES]

VERIFIED BY:
Counted By: _________________    Date: [COUNT_DATE]
Verified By (Manager): _________________    Date: [VERIFICATION_DATE]`,
      lastModified: new Date().toISOString().split('T')[0],
      isActive: true
    },
    {
      id: "17",
      name: "Supplier Purchase Note",
      type: "supplier-purchase-note",
      description: "Professional template for recording purchases on behalf of suppliers without documents",
      content: `SUPPLIER PURCHASE NOTE
Note #[NOTE_NUMBER]
Date: [DATE]

FROM (Supplier):
[SUPPLIER_NAME]
[SUPPLIER_ADDRESS]
Phone: [SUPPLIER_PHONE]
Email: [SUPPLIER_EMAIL]

TO (Business):
[BUSINESS_NAME]
[BUSINESS_ADDRESS]
Phone: [BUSINESS_PHONE]
Email: [BUSINESS_EMAIL]

ITEMS PURCHASED:
[ITEM_LIST]

SUMMARY:
Subtotal: [SUBTOTAL]
Discount: [DISCOUNT]
TOTAL: [TOTAL]

NOTES:
[NOTES]

Prepared By: [PREPARED_BY]    Date: [PREPARED_DATE]

This document records a purchase made on behalf of the supplier.
No inventory adjustment will be made.`,
      lastModified: new Date().toISOString().split('T')[0],
      isActive: true
    }
  ]);
  
  const initialDeliveryNoteData: DeliveryNoteData = {
    businessName: "KILANGO INVESTMENT LTD",
    businessAddress: "P.O.BOX 64, Muheza - Tanga - Tanzania.",
    businessPhone: "+255 711 299 266",
    businessEmail: "info@yourbusiness.com",
    customerName: "Customer Name",
    customerAddress1: "Customer Address Line 1",
    customerAddress2: "Customer Address Line 2",
    customerPhone: "+1234567890",
    customerEmail: "customer@example.com",
    deliveryNoteNumber: "DN-001",
    date: getLocalDate(), // Current local date
    deliveryDate: getLocalDate(), // Default to today (local)
    vehicle: "",
    driver: "",
    items: [
      { id: "1", description: "Sample Product 1", quantity: 10, unit: "pcs", rate: 100, amount: 1000, delivered: 10, remarks: "Good condition" },
      { id: "2", description: "Sample Product 2", quantity: 5, unit: "boxes", rate: 250, amount: 1250, delivered: 5, remarks: "Fragile" },
      { id: "3", description: "Sample Product 3", quantity: 2, unit: "units", rate: 500, amount: 1000, delivered: 2, remarks: "" }
    ],
    deliveryNotes: ".\nSignature required upon delivery.",
    totalItems: 3,
    totalQuantity: 0, // Will be calculated dynamically
    totalPackages: 3,
    preparedByName: "",
    preparedByDate: getLocalDate(), // Default to today (local)
    driverName: "",
    driverDate: getLocalDate(), // Default to today (local)
    receivedByName: "",
    receivedByDate: "",
    // Financial fields
    subtotal: 3250,
    tax: 0,
    discount: 0,
    total: 3250,
    amountPaid: 0,
    creditBroughtForward: 0,
    amountDue: 3250
  };
  
  const [deliveryNoteData, setDeliveryNoteData] = useState<DeliveryNoteData>(initialDeliveryNoteData);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [filteredOutlets, setFilteredOutlets] = useState<Outlet[]>([]);
  const [showOutletDropdown, setShowOutletDropdown] = useState<boolean>(false);
  const [loadingOutlets, setLoadingOutlets] = useState<boolean>(true);
  
  // Godown state for delivery notes
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [deliveryZones, setDeliveryZones] = useState<GodownZone[]>([]);
  const [sourceGodownId, setSourceGodownId] = useState("");
  const [sourceZoneId, setSourceZoneId] = useState("");
  const [isSavingDeliveryNote, setIsSavingDeliveryNote] = useState<boolean>(false);
    const [isSavingGRN, setIsSavingGRN] = useState<boolean>(false);

  // Registered suppliers state
  const [registeredSuppliers, setRegisteredSuppliers] = useState<DBSupplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<DBSupplier[]>([]);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState<boolean>(false);
  const [loadingSuppliers, setLoadingSuppliers] = useState<boolean>(false);
  const [showNewSupplierDialog, setShowNewSupplierDialog] = useState<boolean>(false);
  const [newSupplierForm, setNewSupplierForm] = useState({ name: '', contact_person: '', phone: '', email: '', address: '', tax_id: '' });
  const [savingNewSupplier, setSavingNewSupplier] = useState<boolean>(false);

  // Map of product name -> Map of godownId -> total quantity available
  const [productGodownMap, setProductGodownMap] = useState<Map<string, Map<string, number>>>(new Map());
  // Map of product name -> Map of godownId -> Map of zoneId -> quantity (for zone-level quantities)
  const [productGodownZoneMap, setProductGodownZoneMap] = useState<Map<string, Map<string, Map<string, number>>>>(new Map());
  // Track which products we've already loaded godown stock for
  const [loadedGodownProducts, setLoadedGodownProducts] = useState<Set<string>>(new Set());
  
  const [savedDeliveryNotes, setSavedDeliveryNotes] = useState<SavedDeliveryNote[]>(() => {
    const saved = localStorage.getItem('savedDeliveryNotes');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [savedCustomerSettlements, setSavedCustomerSettlements] = useState<SavedCustomerSettlementData[]>(() => {
    const saved = localStorage.getItem('savedCustomerSettlements');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [savedSupplierSettlements, setSavedSupplierSettlements] = useState<UtilsSupplierSettlementData[]>(() => {
    const saved = localStorage.getItem('savedSupplierSettlements');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [savedPurchaseOrders, setSavedPurchaseOrders] = useState<any[]>(() => {
    const saved = localStorage.getItem('savedPurchaseOrders');
    return saved ? JSON.parse(saved) : [];
  });

  // Product inventory search states for delivery note
  const [deliveryNoteProductItemsMap, setDeliveryNoteProductItemsMap] = useState<Map<string, { rate: number, unit: string, stockQuantity: number }>>(new Map());
  const [deliveryNoteProductDescriptions, setDeliveryNoteProductDescriptions] = useState<string[]>([]);
  
  // Product inventory states for GRN
  const [grnProductItems, setGrnProductItems] = useState<Product[]>([]);
  const [grnProductDescriptions, setGrnProductDescriptions] = useState<string[]>([]);
  const [showGrnDropdown, setShowGrnDropdown] = useState<boolean>(false);
  const [showDeliveryNoteDropdown, setShowDeliveryNoteDropdown] = useState<boolean>(false);
  
  // Product inventory search states for invoice
  const [invoiceProductItemsMap, setInvoiceProductItemsMap] = useState<Map<string, { rate: number, unit: string }>>(new Map());
  const [invoiceProductDescriptions, setInvoiceProductDescriptions] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  
  // Product inventory search states for sales order
  const [salesOrderProductItemsMap, setSalesOrderProductItemsMap] = useState<Map<string, { rate: number, unit: string }>>(new Map());
  const [salesOrderProductDescriptions, setSalesOrderProductDescriptions] = useState<string[]>([]);
  const [showSalesOrderDropdown, setShowSalesOrderDropdown] = useState<boolean>(false);
  
  const [reportName, setReportName] = useState<string>("");
  const [settlementReference, setSettlementReference] = useState<string>("");
  const [stockTakeNumber, setStockTakeNumber] = useState<string>("");
  const [stockTakeGodownId, setStockTakeGodownId] = useState<string>("");
  const [stockTakeZoneId, setStockTakeZoneId] = useState<string>("");
  const [stockTakeZones, setStockTakeZones] = useState<GodownZone[]>([]);

  // Stock Take items state
  interface StockTakeItem {
    id: string;
    productId: string;
    productName: string;
    godownName: string;
    zoneName: string;
    zoneId?: string;
    systemQty: number;
    physicalCount: number;
    variance: number;
    unitCost: number;
    totalCost: number;
  }
  const [stockTakeItems, setStockTakeItems] = useState<StockTakeItem[]>([
    { id: '1', productId: '', productName: '', godownName: '', zoneName: '', systemQty: 0, physicalCount: 0, variance: 0, unitCost: 0, totalCost: 0 },
    { id: '2', productId: '', productName: '', godownName: '', zoneName: '', systemQty: 0, physicalCount: 0, variance: 0, unitCost: 0, totalCost: 0 },
    { id: '3', productId: '', productName: '', godownName: '', zoneName: '', systemQty: 0, physicalCount: 0, variance: 0, unitCost: 0, totalCost: 0 },
  ]);
  const [stockTakeProductSearch, setStockTakeProductSearch] = useState<Record<string, string>>({});
  const [stockTakeProductResults, setStockTakeProductResults] = useState<Record<string, Array<{ productId: string; name: string; quantity: number }>>>({});
  const [stockTakeShowDropdown, setStockTakeShowDropdown] = useState<Record<string, boolean>>({});

  // Batch Mode state
  const [batchMode, setBatchMode] = useState(false);
  const [batchSelectedGodowns, setBatchSelectedGodowns] = useState<Array<{id: string; name: string}>>([]);
  const [batchCurrentIndex, setBatchCurrentIndex] = useState(0);
  const [batchItems, setBatchItems] = useState<Record<string, StockTakeItem[]>>({});
  const [batchStep, setBatchStep] = useState<'select' | 'wizard'>('select');
  const [batchZones, setBatchZones] = useState<Record<string, string>>({}); // godownId -> zoneId
  const [batchZoneOptions, setBatchZoneOptions] = useState<Record<string, GodownZone[]>>({}); // godownId -> zones
  const [stockTakeNotes, setStockTakeNotes] = useState('');
  const [countedByName, setCountedByName] = useState('');
  const [countedByDate, setCountedByDate] = useState(new Date().toISOString().split('T')[0]);
  const [verifiedByName, setVerifiedByName] = useState('');
  const [verifiedByDate, setVerifiedByDate] = useState(new Date().toISOString().split('T')[0]);

  // Generate next stock take number
  const getNextStockTakeNumber = () => {
    const lastNumber = localStorage.getItem('lastStockTakeNumber');
    const today = new Date();
    const dateStr = `${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
    
    let nextNumber = 1;
    if (lastNumber) {
      const [lastDate, lastSeq] = lastNumber.split('-');
      if (lastDate === dateStr) {
        nextNumber = parseInt(lastSeq) + 1;
      }
    }
    
    const num = `ST-${dateStr}-${nextNumber.toString().padStart(3, '0')}`;
    localStorage.setItem('lastStockTakeNumber', `${dateStr}-${nextNumber.toString().padStart(3, '0')}`);
    return num;
  };

  // Set initial stock take number on mount
  useEffect(() => {
    if (!stockTakeNumber) {
      setStockTakeNumber(getNextStockTakeNumber());
    }
  }, []);

  // Load zones when stock take godown changes
  useEffect(() => {
    const loadStockTakeZones = async () => {
      if (stockTakeGodownId) {
        try {
          const data = await getZones(stockTakeGodownId);
          setStockTakeZones(data);
        } catch (error) {
          console.error('Error loading zones for stock take:', error);
          setStockTakeZones([]);
        }
      } else {
        setStockTakeZones([]);
      }
    };
    loadStockTakeZones();
  }, [stockTakeGodownId]);

  // Search products in selected godown/zone for stock take
  const searchStockTakeProducts = async (itemId: string, query: string) => {
    setStockTakeProductSearch(prev => ({ ...prev, [itemId]: query }));
    if (!query || query.length < 1) {
      setStockTakeProductResults(prev => ({ ...prev, [itemId]: [] }));
      setStockTakeShowDropdown(prev => ({ ...prev, [itemId]: false }));
      return;
    }
    try {
      const allProducts = await getProducts();
      const filtered = allProducts.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));
      
      // If a godown is selected, filter to only products with stock in that godown
      if (stockTakeGodownId) {
        const resultsWithQty: Array<{ productId: string; name: string; quantity: number }> = [];
        for (const p of filtered.slice(0, 20)) {
          if (!p.id) continue;
          const stockData = await getGodownStock(p.id, stockTakeGodownId);
          // Filter by zone if selected
          const zoneFiltered = stockTakeZoneId
            ? stockData.filter(s => s.zone_id === stockTakeZoneId || (stockTakeZoneId === '__no_zone__' && !s.zone_id))
            : stockData;
          const totalQty = zoneFiltered.reduce((sum, s) => sum + (s.quantity || 0), 0);
          if (zoneFiltered.length > 0) {
            resultsWithQty.push({ productId: p.id, name: p.name, quantity: totalQty });
          }
        }
        setStockTakeProductResults(prev => ({ ...prev, [itemId]: resultsWithQty }));
      } else {
        // No godown selected - show all products with a hint
        setStockTakeProductResults(prev => ({ ...prev, [itemId]: filtered.slice(0, 20).map(p => ({ productId: p.id || '', name: p.name, quantity: 0 })) }));
      }
      setStockTakeShowDropdown(prev => ({ ...prev, [itemId]: true }));
    } catch (error) {
      console.error('Error searching stock take products:', error);
    }
  };

  // Handle stock take item changes
  const handleStockTakeItemChange = (itemId: string, field: keyof StockTakeItem, value: string | number) => {
    setStockTakeItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const updated = { ...item, [field]: value };
      // Auto-calculate variance
      if (field === 'physicalCount' || field === 'systemQty') {
        updated.variance = Number(updated.physicalCount) - Number(updated.systemQty);
      }
      // Auto-calculate total cost
      if (field === 'unitCost' || field === 'physicalCount') {
        updated.totalCost = Number(updated.unitCost) * Number(updated.physicalCount);
      }
      return updated;
    }));
  };

  // Select a product for stock take item
  const selectStockTakeProduct = async (itemId: string, productId: string, productName: string, qty: number) => {
    const selectedGodown = godowns.find(g => g.id === stockTakeGodownId);
    const selectedZone = stockTakeZones.find(z => z.id === stockTakeZoneId);
    const zoneName = stockTakeZoneId === '__no_zone__' ? 'No Zone' : (selectedZone?.zone_name || '');
    
    setStockTakeItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      return {
        ...item,
        productId,
        productName,
        godownName: selectedGodown?.name || '',
        zoneName,
        systemQty: qty,
        variance: item.physicalCount - qty,
      };
    }));
    setStockTakeProductSearch(prev => ({ ...prev, [itemId]: productName }));
    setStockTakeShowDropdown(prev => ({ ...prev, [itemId]: false }));
  };

  // Add new row to stock take items
  const addStockTakeRow = () => {
    setStockTakeItems(prev => [...prev, {
      id: Date.now().toString(),
      productId: '', productName: '', godownName: '', zoneName: '',
      systemQty: 0, physicalCount: 0, variance: 0, unitCost: 0, totalCost: 0,
    }]);
  };

  // Remove a row from stock take items
  const removeStockTakeRow = (itemId: string) => {
    setStockTakeItems(prev => prev.filter(item => item.id !== itemId));
  };

  // Stock take summary totals
  const stockTakeTotals = stockTakeItems.reduce((acc, item) => ({
    totalProducts: acc.totalProducts + (item.productId ? 1 : 0),
    totalSystemQty: acc.totalSystemQty + item.systemQty,
    totalPhysicalCount: acc.totalPhysicalCount + item.physicalCount,
    totalVariance: acc.totalVariance + item.variance,
    totalInvestmentValue: acc.totalInvestmentValue + item.totalCost,
  }), { totalProducts: 0, totalSystemQty: 0, totalPhysicalCount: 0, totalVariance: 0, totalInvestmentValue: 0 });

  // Load outlets on component mount
  useEffect(() => {
    const loadOutlets = async () => {
      setLoadingOutlets(true);
      try {
        const loadedOutlets = await getOutlets();
        setOutlets(loadedOutlets);
        // Don't set filteredOutlets here - let the filter function handle it
      } catch (error) {
        console.error('Error loading outlets:', error);
        setOutlets([]); // Clear outlets on error
        setFilteredOutlets([]); // Ensure filtered outlets is empty if there's an error
      } finally {
        setLoadingOutlets(false);
      }
    };

    loadOutlets();
  }, []);

  // Load godowns for delivery notes
  useEffect(() => {
    const loadGodowns = async () => {
      try {
        const data = await getGodowns();
        setGodowns(data.filter(g => g.status === 'active'));
      } catch (error) {
        console.error('Error loading godowns:', error);
      }
    };
    loadGodowns();
  }, []);

  // Load registered suppliers for GRN searchable dropdown
  useEffect(() => {
    const loadSuppliers = async () => {
      setLoadingSuppliers(true);
      try {
        const data = await getSuppliers();
        setRegisteredSuppliers(data);
        setFilteredSuppliers(data);
      } catch (error) {
        console.error('Error loading suppliers:', error);
        setRegisteredSuppliers([]);
        setFilteredSuppliers([]);
      } finally {
        setLoadingSuppliers(false);
      }
    };
    loadSuppliers();
  }, []);

  // Load ALL zones on mount (needed for per-row zone name resolution across multiple godowns)
  useEffect(() => {
    const loadZones = async () => {
      try {
        const data = await getZones();
        setDeliveryZones(data);
      } catch (error) {
        console.error('Error loading zones:', error);
      }
    };
    loadZones();
  }, []);

  // Load godown stock for a product and update the productGodownMap + productGodownZoneMap
  const loadGodownStockForProduct = async (productName: string) => {
    if (!productName || loadedGodownProducts.has(productName.toLowerCase().trim())) return;
    try {
      const products = await getProducts();
      const product = products.find(p => p.name.toLowerCase().trim() === productName.toLowerCase().trim());
      if (!product?.id) return;
      
      const stockData = await getGodownStock(product.id);
      const godownQtyMap = new Map<string, number>();
      const godownZoneQtyMap = new Map<string, Map<string, number>>();
      
      for (const stock of stockData) {
        if (stock.quantity > 0 && stock.godown_id) {
          // Accumulate godown-level quantity
          godownQtyMap.set(stock.godown_id, (godownQtyMap.get(stock.godown_id) || 0) + stock.quantity);
          
          // Accumulate zone-level quantity within godown
          const zoneKey = stock.zone_id || '__no_zone__';
          if (!godownZoneQtyMap.has(stock.godown_id)) {
            godownZoneQtyMap.set(stock.godown_id, new Map());
          }
          const zoneMap = godownZoneQtyMap.get(stock.godown_id)!;
          zoneMap.set(zoneKey, (zoneMap.get(zoneKey) || 0) + stock.quantity);
        }
      }
      
      const key = productName.toLowerCase().trim();
      setProductGodownMap(prev => {
        const newMap = new Map(prev);
        newMap.set(key, godownQtyMap);
        return newMap;
      });
      setProductGodownZoneMap(prev => {
        const newMap = new Map(prev);
        newMap.set(key, godownZoneQtyMap);
        return newMap;
      });
      setLoadedGodownProducts(prev => new Set(prev).add(key));
    } catch (error) {
      console.error('Error loading godown stock for product:', productName, error);
    }
  };

  // Compute filtered godowns with quantities based on current items in the delivery note
  const getFilteredGodowns = (): Array<Godown & { quantity: number }> => {
    const itemDescriptions = deliveryNoteData.items
      .map(item => item.description?.toLowerCase().trim())
      .filter(Boolean);
    
    if (itemDescriptions.length === 0) {
      return godowns.map(g => ({ ...g, quantity: 0 }));
    }
    
    // Aggregate quantities across all items per godown
    const godownQtyTotal = new Map<string, number>();
    for (const desc of itemDescriptions) {
      const godownQtyMap = productGodownMap.get(desc);
      if (godownQtyMap) {
        for (const [godownId, qty] of godownQtyMap) {
          godownQtyTotal.set(godownId, (godownQtyTotal.get(godownId) || 0) + qty);
        }
      }
    }
    
    if (godownQtyTotal.size === 0) {
      // No godown stock data loaded yet - show all godowns with 0 qty
      return godowns.map(g => ({ ...g, quantity: 0 }));
    }
    
    // Return only godowns that have stock, with their quantities
    return godowns
      .filter(g => godownQtyTotal.has(g.id!))
      .map(g => ({ ...g, quantity: godownQtyTotal.get(g.id!) || 0 }));
  };

  // Get zone quantities for the selected godown based on current items
  const getZoneQuantities = (): Array<{ zoneId: string; zoneName: string; quantity: number }> => {
    if (!sourceGodownId) return [];
    
    const itemDescriptions = deliveryNoteData.items
      .map(item => item.description?.toLowerCase().trim())
      .filter(Boolean);
    
    // Aggregate zone quantities across all items for the selected godown
    const zoneQtyTotal = new Map<string, number>();
    for (const desc of itemDescriptions) {
      const godownZoneMap = productGodownZoneMap.get(desc)?.get(sourceGodownId);
      if (godownZoneMap) {
        for (const [zoneId, qty] of godownZoneMap) {
          zoneQtyTotal.set(zoneId, (zoneQtyTotal.get(zoneId) || 0) + qty);
        }
      }
    }
    
    // Map zone IDs to names using deliveryZones
    const result: Array<{ zoneId: string; zoneName: string; quantity: number }> = [];
    for (const [zoneId, qty] of zoneQtyTotal) {
      if (zoneId === '__no_zone__') {
        result.push({ zoneId: '', zoneName: 'No Zone', quantity: qty });
      } else {
        const zone = deliveryZones.find(z => z.id === zoneId);
        result.push({ zoneId, zoneName: zone?.zone_name || 'Unknown', quantity: qty });
      }
    }
    
    return result;
  };

  // Get available godowns for a specific item's product
  const getItemGodowns = (itemDescription: string): Array<{ godownId: string; godownName: string; quantity: number }> => {
    if (!itemDescription) return [];
    const key = itemDescription.toLowerCase().trim();
    const godownQtyMap = productGodownMap.get(key);
    if (!godownQtyMap) return [];
    
    return Array.from(godownQtyMap.entries())
      .filter(([, qty]) => qty > 0)
      .map(([godownId, qty]) => {
        const godown = godowns.find(g => g.id === godownId);
        return { godownId, godownName: godown?.name || 'Unknown', quantity: qty };
      });
  };

  // Get available zones for a specific item's product and selected godown
  const getItemZones = (itemDescription: string, godownId: string): Array<{ zoneId: string; zoneName: string; quantity: number }> => {
    if (!itemDescription || !godownId) return [];
    const key = itemDescription.toLowerCase().trim();
    const godownZoneMap = productGodownZoneMap.get(key)?.get(godownId);
    if (!godownZoneMap) return [];
    
    return Array.from(godownZoneMap.entries())
      .filter(([, qty]) => qty > 0)
      .map(([zoneKey, qty]) => {
        if (zoneKey === '__no_zone__') {
          return { zoneId: '__no_zone__', zoneName: 'No Zone (Godown Level)', quantity: qty };
        }
        const zone = deliveryZones.find(z => z.id === zoneKey);
        return { zoneId: zoneKey, zoneName: zone?.zone_name || 'Unknown', quantity: qty };
      });
  };

  // Load products for GRN dropdown on component mount
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const loadedProducts = await getProducts();
        setGrnProductItems(loadedProducts);
        setGrnProductDescriptions(loadedProducts.map(p => p.name));
      } catch (error) {
        console.error('Error loading products for GRN:', error);
        setGrnProductItems([]);
        setGrnProductDescriptions([]);
      }
    };

    loadProducts();
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Check if the click is outside the command component
      const commandElement = document.querySelector('[cmdk-root]');
      if (showOutletDropdown && 
          commandElement && 
          !commandElement.contains(target)) {
        setShowOutletDropdown(false);
      }
      
      // Check if the click is outside the GRN dropdown
      const grnDropdownElement = target.closest('.relative');
      if (showGrnDropdown && !grnDropdownElement) {
        setShowGrnDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showOutletDropdown, showGrnDropdown]);

  // Effect to update savedDeliveryNotes when localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('savedDeliveryNotes');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setSavedDeliveryNotes(parsed);
        } catch (e) {
          console.error('Error parsing saved delivery notes:', e);
        }
      }
      
      const savedSettlements = localStorage.getItem('savedCustomerSettlements');
      if (savedSettlements) {
        try {
          const parsedSettlements = JSON.parse(savedSettlements);
          setSavedCustomerSettlements(parsedSettlements);
        } catch (e) {
          console.error('Error parsing saved customer settlements:', e);
        }
      }
      
      const savedSupplierSettlements = localStorage.getItem('savedSupplierSettlements');
      if (savedSupplierSettlements) {
        try {
          const parsedSupplierSettlements = JSON.parse(savedSupplierSettlements);
          setSavedSupplierSettlements(parsedSupplierSettlements);
        } catch (e) {
          console.error('Error parsing saved supplier settlements:', e);
        }
      }
      
      const savedPurchaseOrders = localStorage.getItem('savedPurchaseOrders');
      if (savedPurchaseOrders) {
        try {
          const parsedPurchaseOrders = JSON.parse(savedPurchaseOrders);
          setSavedPurchaseOrders(parsedPurchaseOrders);
        } catch (e) {
          console.error('Error parsing saved purchase orders:', e);
        }
      }
      
      // Load saved GRNs using the proper utility function
      const loadGRNs = async () => {
        try {
          const { getSavedGRNs } = await import('@/utils/grnUtils');
          const savedGRNsData = await getSavedGRNs();
          setSavedGRNs(savedGRNsData as any);
        } catch (error) {
          console.error('Error loading saved GRNs:', error);
        }
      };
      
      loadGRNs();
    };

    // Add event listener for storage changes
    window.addEventListener('storage', handleStorageChange);
    
    // Cleanup
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
    
  // Function to generate a unique customer ID
  const generateCustomerId = () => {
    return `CUST-${Date.now()}`;
  };
  
  // Function to generate a unique settlement reference number
  const generateSettlementReference = () => {
    return `SET-${Date.now()}`;
  };
  
  // Function to reset customer settlement data to default layout
  const resetCustomerSettlementData = () => {
    setCustomerSettlementData({
      customerName: "Customer Name",
      customerId: generateCustomerId(),
      customerPhone: "(555) 123-4567",
      customerEmail: "customer@example.com",
      referenceNumber: generateSettlementReference(),
      settlementAmount: 0,
      paymentMethod: "Cash",
      cashierName: "Cashier Name",
      previousBalance: 0,
      amountPaid: 0,
      newBalance: 0,
      notes: "",
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString(),
      status: "completed"
    });
  };
  
  // Function to generate a unique supplier ID
  const generateSupplierId = () => {
    return `SUPP-${Date.now()}`;
  };
  
  // Function to reset supplier settlement data to default layout
  const resetSupplierSettlementData = () => {
    setSupplierSettlementData({
      supplierName: "Supplier Name",
      supplierId: generateSupplierId(),
      supplierPhone: "(555) 987-6543",
      supplierEmail: "supplier@example.com",
      referenceNumber: generateSettlementReference(),
      settlementAmount: 0,
      paymentMethod: "Bank Transfer",
      processedBy: "Accountant Name",
      poNumber: "",
      previousBalance: 0,
      amountPaid: 0,
      newBalance: 0,
      notes: "",
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString(),
      status: "completed"
    });
  };
  
  // Function to reset purchase order data to default layout
  const resetPurchaseOrderData = () => {
    setPurchaseOrderData({
      businessName: "Your Business Name",
      businessAddress: "123 Business Street",
      businessPhone: "(555) 987-6543",
      businessEmail: "info@yourbusiness.com",
      numberOfSuppliers: 1,
      supplierName: "Supplier Company Name",
      supplierAddress: "123 Supplier Street",
      supplierPhone: "(555) 123-4567",
      supplierEmail: "supplier@example.com",
      poNumber: "PO-2024-001",
      date: new Date().toISOString().split('T')[0],
      expectedDelivery: "",
      items: [
        { id: "1", description: "Office Chairs", quantity: 10, unit: "EA", unitPrice: 89.99, total: 899.90 },
        { id: "2", description: "Desk Lamps", quantity: 15, unit: "EA", unitPrice: 24.50, total: 367.50 },
        { id: "3", description: "Filing Cabinets", quantity: 3, unit: "EA", unitPrice: 149.99, total: 449.97 }
      ],
      subtotal: 1717.37,
      tax: 145.98,
      discount: 0,
      shipping: 45.00,
      total: 1908.35,
      paymentTerms: "Net 30",
      deliveryInstructions: "Ground",
      notes: "Please deliver by Friday. Call before delivery.",
      authorizedByName: "Jane Manager",
      authorizedBySignature: "Approved for purchase per budget approval.",
      authorizationDate: "",
      requestedBy: "",
      approvedBy: ""
    });
  };

  // Function to reset GRN data to default layout
  const resetGRNData = () => {
    setGrnData({
      grnNumber: generateGRNNumber(),
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString(),
      numberOfSuppliers: 1,
      suppliers: [
        {
          id: "supplier-1",
          name: "Supplier Name",
          supplierId: generateSupplierId(),
          phone: "(555) 987-6543",
          email: "supplier@example.com",
          address: "123 Supplier Street, City, Country",
          tinNumber: "",
          stockType: ""  // Default to empty, user can select
        }
      ],
      supplierName: "Supplier Name",
      supplierId: generateSupplierId(),
      supplierPhone: "(555) 987-6543",
      supplierEmail: "supplier@example.com",
      supplierAddress: "123 Supplier Street, City, Country",
      logisticDetails: {
        vehicleNumber: "",
        driverName: "",
        driverPhone: "",
        transportCompany: "Express Logistics",
        estimatedArrival: new Date().toISOString().split('T')[0],
        actualArrival: new Date().toISOString().split('T')[0],
        departureTime: new Date().toISOString().split('T')[0],
        deliveryLocation: "",
        specialInstructions: "Please Inspect the goods on delivery",
        shippingMethod: "Ground",
        trackingNumber: "TRK-001"
      },
      businessName: "KILANGO GROUP LTD",
      businessAddress: "64 Tanganyika Rd.,Muheza,Tanga,Tanzania",
      businessPhone: "0711 299 266",
      businessEmail: "kilangogroupltd@gmail.com",
      isVatable: false,
      supplierTinNumber: "",
      poNumber: "PO-2024-001",
      deliveryNoteNumber: "DN-001",
      vehicleNumber: "",
      driverName: "",
      receivedBy: "Warehouse Staff",
      receivedLocation: "",
      items: [
        { id: "1", description: "Product A", orderedQuantity: 100, receivedQuantity: 100, unit: "pcs", originalUnitCost: 0, unitCost: 0, receivingCostPerUnit: 0, totalWithReceivingCost: 0, batchNumber: "BATCH-001", expiryDate: "2025-12-31", remarks: "Good condition", supplierId: "supplier-1" },
        { id: "2", description: "Product B", orderedQuantity: 50, receivedQuantity: 48, unit: "boxes", originalUnitCost: 0, unitCost: 0, receivingCostPerUnit: 0, totalWithReceivingCost: 0, batchNumber: "BATCH-002", expiryDate: "2026-06-30", remarks: "2 units damaged", supplierId: "supplier-1" },
        { id: "3", description: "Product C", orderedQuantity: 25, receivedQuantity: 25, unit: "units", originalUnitCost: 0, unitCost: 0, receivingCostPerUnit: 0, totalWithReceivingCost: 0, batchNumber: "BATCH-003", expiryDate: "2025-09-15", remarks: "", supplierId: "supplier-2" }
      ],
      receivingCosts: [
        { id: "1", description: "Transport Charges", amount: 0 },
        { id: "2", description: "Offloaders Charges", amount: 0 },
        { id: "3", description: "Traffic Charges", amount: 0 }
      ],
      qualityCheckNotes: "",
      discrepancies: "",
      preparedBy: "Inventory Clerk",
      preparedDate: new Date().toISOString().split('T')[0],
      checkedBy: "Quality Inspector",
      checkedDate: new Date().toISOString().split('T')[0],
      approvedBy: "Warehouse Manager",
      approvedDate: new Date().toISOString().split('T')[0],
      receivedDate: new Date().toISOString().split('T')[0],
      status: "completed",
      timestamp: new Date().toLocaleString()
    });
  };
  
  // Functions to handle GRN operations
  const handleViewGRN = (grnId: string) => {
    const grn = savedGRNs.find(g => g.id === grnId);
    if (grn) {
      setGrnData({
        ...grn.data,
        isVatable: grn.data.isVatable ?? false,
        supplierTinNumber: grn.data.supplierTinNumber || "",
        receivingCosts: grn.data.receivingCosts || [],
        status: grn.data.status || "completed"
      });
      setActiveTab('preview');
      alert('GRN loaded for viewing');
    }
  };
  
  const handleLoadGRN = (grnId: string) => {
    const grn = savedGRNs.find(g => g.id === grnId);
    if (grn) {
      setGrnData({
        ...grn.data,
        businessStockType: grn.data.businessStockType || "",
        isVatable: grn.data.isVatable ?? false,
        supplierTinNumber: grn.data.supplierTinNumber || "",
        receivingCosts: grn.data.receivingCosts || [],
        status: grn.data.status || "completed"
      });
      setActiveTab('preview');
      alert('GRN loaded for editing');
    }
  };
  
  const handleDeleteSavedGRN = async (grnId: string) => {
    if (confirm('Are you sure you want to delete this saved GRN?')) {
      try {
        // Use the proper deleteGRN utility function
        const { deleteGRN } = await import('@/utils/grnUtils');
        await deleteGRN(grnId);
        
        // Update local state
        const updatedGRNs = savedGRNs.filter(g => g.id !== grnId);
        setSavedGRNs(updatedGRNs as any);
        
        // Trigger custom event to notify other components
        window.dispatchEvent(new CustomEvent('grnSaved', {
          detail: { grns: updatedGRNs }
        }));
      } catch (error) {
        console.error('Error deleting GRN:', error);
        alert('Error deleting GRN. Please try again.');
      }
    }
  };
  
  const handleSaveGRN = async () => {
    if (isSavingGRN) {
      console.warn('⚠️ GRN save already in progress...');
      return;
    }
    setIsSavingGRN(true);
    try {
    console.log('=== STARTING HANDLE SAVE GRN ===');
    if (!grnData.grnNumber.trim()) {
      alert('Please enter a GRN number');
      return;
    }

    // Validate at least one supplier is selected
    if (!grnData.suppliers || grnData.suppliers.length === 0 || !grnData.suppliers[0]?.name?.trim()) {
      alert('Please select a supplier');
      setIsSavingGRN(false);
      return;
    }

    // Validate Stock Type is filled for at least one supplier
    const suppliersWithoutStockType = (grnData.suppliers || []).filter(s => !s.stockType);
    if (suppliersWithoutStockType.length > 0) {
      alert(`Please select a Stock Type for all suppliers. ${suppliersWithoutStockType.length} supplier(s) missing stock type: ${suppliersWithoutStockType.map(s => s.name || '(unnamed)').join(', ')}`);
      setIsSavingGRN(false);
      return;
    }

    // Validate Delivery Note # is filled
    if (!grnData.deliveryNoteNumber?.trim()) {
      alert('Please enter a Delivery Note #');
      setIsSavingGRN(false);
      return;
    }

    // Validate Supplier Document is uploaded for all suppliers
    const suppliersWithoutDocument = (grnData.suppliers || []).filter(s => !s.documentUrl);
    if (suppliersWithoutDocument.length > 0) {
      alert(`Please upload the supplier document (PDF) for all suppliers. ${suppliersWithoutDocument.length} supplier(s) missing document: ${suppliersWithoutDocument.map(s => s.name || '(unnamed)').join(', ')}`);
      setIsSavingGRN(false);
      return;
    }

    // Validate per-item godown assignments
    const itemsWithoutGodown = grnData.items.filter(item => !item.destinationGodownId);
    if (itemsWithoutGodown.length > 0) {
      alert(`Please select a Destination Godown for all items. ${itemsWithoutGodown.length} item(s) missing godown: ${itemsWithoutGodown.map(i => i.description || '(unnamed)').join(', ')}`);
      setIsSavingGRN(false);
      return;
    }

    const itemsWithoutZone = grnData.items.filter(item => !item.destinationZoneId);
    if (itemsWithoutZone.length > 0) {
      alert(`Please select a Destination Zone for all items. ${itemsWithoutZone.length} item(s) missing zone: ${itemsWithoutZone.map(i => i.description || '(unnamed)').join(', ')}`);
      setIsSavingGRN(false);
      return;
    }
    
    console.log('GRN Data:', grnData);
    
    // Calculate total amount from items
    const totalAmount = grnData.items.reduce((sum, item) => sum + Number(item.totalWithReceivingCost || 0), 0);
    
    // For multi-supplier GRNs, combine supplier names or use the first supplier
    const primarySupplier = grnData.suppliers?.[0] || {} as any;
    const effectiveSupplierName = grnData.numberOfSuppliers > 1 
      ? (grnData.suppliers?.map(s => s.name).join(', ') || primarySupplier.name || grnData.supplierName)
      : (primarySupplier.name || grnData.supplierName);
    
    // Convert Templates GRN data to grnUtils format
    const convertedGRNData: any = {
      grnNumber: grnData.grnNumber,
      date: grnData.date,
      time: grnData.time,
      supplierName: effectiveSupplierName,
      supplierId: primarySupplier.supplierId || grnData.supplierId,
      supplierPhone: primarySupplier.phone || grnData.supplierPhone,
      supplierEmail: primarySupplier.email || grnData.supplierEmail,
      supplierAddress: primarySupplier.address || grnData.supplierAddress,
      businessName: primarySupplier.name || grnData.businessName,
      businessAddress: primarySupplier.address || grnData.businessAddress,
      businessPhone: primarySupplier.phone || grnData.businessPhone,
      businessEmail: primarySupplier.email || grnData.businessEmail,
      isVatable: grnData.isVatable,
      supplierTinNumber: primarySupplier.tinNumber || grnData.supplierTinNumber,
      businessTin: grnData.suppliers?.[0]?.businessTin || '',
      businessStockType: primarySupplier.stockType || '',
      poNumber: grnData.poNumber,
      deliveryNoteNumber: grnData.deliveryNoteNumber,
      receivedBy: grnData.receivedBy,
      receivedLocation: grnData.receivedLocation,
      logisticDetails: grnData.logisticDetails,
      vehicleNumber: grnData.logisticDetails?.vehicleNumber || grnData.vehicleNumber,
      driverName: grnData.logisticDetails?.driverName || grnData.driverName,
      numberOfSuppliers: grnData.numberOfSuppliers,
      suppliers: grnData.suppliers,
      items: grnData.items.map(item => {
        // Ensure receiving costs are distributed before saving
        const itemWithCost = { ...item };
        if (!itemWithCost.receivingCostPerUnit || itemWithCost.receivingCostPerUnit === 0) {
          // Recalculate if not set
          const totalReceivingCosts = grnData.receivingCosts.reduce((sum, cost) => sum + Number(cost.amount || 0), 0);
          const totalQuantity = grnData.items.reduce((sum, i) => sum + (i.receivedQuantity || 0), 0);
          if (totalQuantity > 0) {
            itemWithCost.receivingCostPerUnit = totalReceivingCosts / totalQuantity;
            itemWithCost.originalUnitCost = item.originalUnitCost || item.unitCost || 0;
            itemWithCost.unitCost = itemWithCost.originalUnitCost + itemWithCost.receivingCostPerUnit;
            itemWithCost.totalWithReceivingCost = itemWithCost.unitCost * (item.receivedQuantity || 0);
          }
        }
        return {
          id: itemWithCost.id,
          productId: itemWithCost.productId, // Include product ID for godown stock updates
          description: itemWithCost.description,
          quantity: itemWithCost.orderedQuantity,
          delivered: itemWithCost.receivedQuantity,
          unit: itemWithCost.unit,
          unitCost: itemWithCost.unitCost || 0,
          total: itemWithCost.totalWithReceivingCost || 0,
          batchNumber: itemWithCost.batchNumber,
          expiryDate: itemWithCost.expiryDate,
          remarks: itemWithCost.remarks,
          receivingCostPerUnit: itemWithCost.receivingCostPerUnit,
          totalWithReceivingCost: itemWithCost.totalWithReceivingCost,
          originalUnitCost: itemWithCost.originalUnitCost,
          // Per-item godown/zone fields
          destinationGodownId: itemWithCost.destinationGodownId,
          destinationZoneId: itemWithCost.destinationZoneId,
          destinationGodownName: itemWithCost.destinationGodownName,
          destinationZoneName: itemWithCost.destinationZoneName
        };
      }),
      qualityCheckNotes: grnData.qualityCheckNotes,
      discrepancies: grnData.discrepancies,
      preparedBy: grnData.preparedBy,
      preparedDate: grnData.preparedDate,
      checkedBy: grnData.checkedBy,
      checkedDate: grnData.checkedDate,
      approvedBy: grnData.approvedBy,
      approvedDate: grnData.approvedDate,
      receivedDate: grnData.receivedDate,
      status: grnData.status === 'received' || grnData.status === 'checked' || grnData.status === 'approved' ? 'completed' : (grnData.status || 'completed'),
      receivingCosts: grnData.receivingCosts,
      // Godown integration fields
      destinationGodownId: grnData.destinationGodownId,
      destinationZoneId: grnData.destinationZoneId,
      destinationGodownName: grnData.destinationGodownName,
      destinationZoneName: grnData.destinationZoneName
    };
    
    const newGRN: UtilsSavedGRN = {
      id: Date.now().toString(),
      name: `GRN-${grnData.grnNumber}`,
      data: convertedGRNData as any,
      total: totalAmount,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    console.log('About to call saveGRN with:', newGRN);
      // Use the proper saveGRN utility function
      await saveGRN(newGRN);
      
      // Always update general products inventory (products.stock_quantity)
      // regardless of whether a destination godown is set.
      // When a godown IS set, saveGRN() also handles godown_stock via updateGRNGodownStock.
      try {
        const { getProducts, updateProduct } = await import('@/services/databaseService');
        const allProducts = await getProducts();
        
        for (const item of newGRN.data.items) {
          if (item.description && item.delivered > 0) {
            const product = allProducts.find(p => 
              p.name.toLowerCase().trim() === item.description.toLowerCase().trim()
            );
            
            if (product) {
              const currentStock = product.stock_quantity || 0;
              const newStock = currentStock + item.delivered;
              // Update cost_price if a new Orig. Cost was assigned
              const newCostPrice = item.originalUnitCost && item.originalUnitCost > 0
                ? item.originalUnitCost
                : product.cost_price;
              await updateProduct(product.id!, { ...product, stock_quantity: newStock, cost_price: newCostPrice });
              console.log(`Product ${product.name} stock updated: ${currentStock} -> ${newStock}, cost_price updated to ${newCostPrice}`);
            }
          }
        }
      } catch (inventoryError) {
        console.error('Error updating product inventory after GRN save:', inventoryError);
      }
      
      // Update local state
      const updatedGRNs = [...savedGRNs, newGRN];
      setSavedGRNs(updatedGRNs as any);
      
      // Trigger custom event to notify other components
      window.dispatchEvent(new CustomEvent('grnSaved', {
        detail: { grns: updatedGRNs }
      }));
      
      // Show GRN options dialog immediately after saving
      showGRNOptionsDialog();
      
      // Don't reset form here - let the user choose an option first
    } catch (error) {
      console.error('Error saving GRN:', error);
      alert('Error saving GRN. Please try again.');
    } finally {
      setIsSavingGRN(false);
    }
  };
  
  const handlePrintGRN = () => {
    const itemsWithCosts = distributeReceivingCosts([...grnData.items], grnData.receivingCosts);
    const totalReceivingCosts = grnData.receivingCosts.reduce((sum, cost) => sum + Number(cost.amount || 0), 0);
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Goods Received Note</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px;
              font-size: 14px;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
            }
            .header h1 {
              font-size: 24px;
              margin: 0;
            }
            .section {
              margin-bottom: 20px;
            }
            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
            }
            .grid-3 {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 15px;
            }
            .signatures {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr 1fr;
              gap: 20px;
              margin-top: 40px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 10px 0;
              table-layout: fixed;
            }
            th, td {
              border: 1px solid #000;
              padding: 8px;
              text-align: left;
              word-wrap: break-word;
            }
            th {
              background-color: #f0f0f0;
            }
            /* Column widths for items table */
            th:nth-child(1) { width: 25%; min-width: 150px; } /* Description */
            th:nth-child(2) { width: 8%; } /* Ordered */
            th:nth-child(3) { width: 8%; } /* Received */
            th:nth-child(4) { width: 6%; } /* Unit */
            th:nth-child(5) { width: 10%; } /* Original Unit Cost */
            th:nth-child(6) { width: 12%; } /* Receiving Cost Per Unit */
            th:nth-child(7) { width: 10%; } /* New Unit Cost */
            th:nth-child(8) { width: 12%; } /* Total Cost with Receiving */
            th:nth-child(9) { width: 8%; } /* Batch # */
            th:nth-child(10) { width: 8%; } /* Expiry */
            th:nth-child(11) { width: 8%; } /* Remarks */
            .text-right {
              text-align: right;
            }
            .font-bold {
              font-weight: bold;
            }
            .mt-4 {
              margin-top: 20px;
            }
            .mb-2 {
              margin-bottom: 10px;
            }
            .signature-line {
              margin-top: 40px;
              padding-top: 5px;
              border-top: 1px solid #000;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>GOODS RECEIVED NOTE</h1>
          </div>
          
          <div class="grid-3">
            <div>
              <p class="font-bold">GRN Number:</p>
              <p>${grnData.grnNumber}</p>
            </div>
            <div>
              <p class="font-bold">Date:</p>
              <p>${grnData.date}</p>
            </div>
            <div>
              <p class="font-bold">Time:</p>
              <p>${grnData.time}</p>
            </div>
          </div>
          
          <div class="grid">
            <div>
              <h3 class="font-bold mb-2">SUPPLIER INFORMATION:</h3>
              <p><strong>Name:</strong> ${grnData.supplierName}</p>
              <p><strong>ID:</strong> ${grnData.supplierId}</p>
              <p><strong>Phone:</strong> ${grnData.supplierPhone}</p>
              <p><strong>Email:</strong> ${grnData.supplierEmail}</p>
              <p><strong>Address:</strong> ${grnData.supplierAddress}</p>
              ${grnData.suppliers?.[0]?.documentUrl ? `<p><strong>Document:</strong> <a href="${grnData.suppliers[0].documentUrl}" target="_blank" style="color:blue;">${grnData.suppliers[0].documentName || 'View PDF'}</a></p>` : ''}
            </div>
            
            <div>
              <h3 class="font-bold mb-2">RECEIVING BUSINESS:</h3>
              <p><strong>Name:</strong> ${grnData.businessName}</p>
              <p><strong>Address:</strong> ${grnData.businessAddress}</p>
              <p><strong>Phone:</strong> ${grnData.businessPhone}</p>
              <p><strong>Email:</strong> ${grnData.businessEmail}</p>
              <p><strong>Stock Type:</strong> ${grnData.suppliers[0]?.stockType || 'Not specified'}</p>
              <p><strong>Is Vatable:</strong> ${grnData.isVatable ? 'Yes' : 'No'}</p>
              ${grnData.isVatable ? `<p><strong>Supplier TIN Number:</strong> ${grnData.supplierTinNumber || 'Not provided'}</p>` : ''}
            </div>
          </div>
          
          <div class="grid-3">
            <div>
              <p class="font-bold">PO Number:</p>
              <p>${grnData.poNumber || '_________'}</p>
            </div>
            <div>
              <p class="font-bold">Delivery Note #:</p>
              <p>${grnData.deliveryNoteNumber || '_________'}</p>
            </div>
            <div>
              <p class="font-bold">Vehicle #:</p>
              <p>${grnData.vehicleNumber || '_________'}</p>
            </div>
            <div>
              <p class="font-bold">Driver:</p>
              <p>${grnData.driverName || '_________'}</p>
            </div>
            <div>
              <p class="font-bold">Received By:</p>
              <p>${grnData.receivedBy || '_________'}</p>
            </div>
          </div>
          
          <div class="section">
            <h3 class="font-bold mb-2">RECEIVING COSTS:</h3>
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                ${grnData.receivingCosts.map(cost => `
                  <tr>
                    <td>${cost.description}</td>
                    <td>${formatCurrency(cost.amount)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="font-bold mt-2">Total Receiving Costs: ${formatCurrency(totalReceivingCosts)}</div>
          </div>
          
          <div class="section">
            <h3 class="font-bold mb-2">ITEMS RECEIVED WITH UPDATED PRICES:</h3>
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Ordered</th>
                  <th>Received</th>
                  <th>Unit</th>
                  <th>Orig. Cost</th>
                  <th>Recv. Cost</th>
                  <th>New Cost</th>
                  <th>Total</th>
                  <th>Batch #</th>
                  <th>Expiry</th>
                  <th>Godown</th>
                  <th>Zone</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                ${itemsWithCosts.map(item => `
                  <tr>
                    <td>${item.description}</td>
                    <td>${item.orderedQuantity}</td>
                    <td>${item.receivedQuantity}</td>
                    <td>${item.unit}</td>
                    <td>${formatCurrency(item.originalUnitCost || 0)}</td>
                    <td>${formatCurrency(item.receivingCostPerUnit || 0)}</td>
                    <td>${formatCurrency(item.unitCost || 0)}</td>
                    <td>${formatCurrency(item.totalWithReceivingCost || 0)}</td>
                    <td>${item.batchNumber || ''}</td>
                    <td>${item.expiryDate || ''}</td>
                    <td>${item.destinationGodownName || item.destinationGodownId || ''}</td>
                    <td>${item.destinationZoneName || ''}</td>
                    <td>${item.remarks}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="section">
            <h3 class="font-bold mb-2">QUALITY CHECK:</h3>
            <p>${grnData.qualityCheckNotes || ''}</p>
          </div>
          
          <div class="section">
            <h3 class="font-bold mb-2">DISCREPANCIES:</h3>
            <p>${grnData.discrepancies || ''}</p>
          </div>
          
          <div class="signatures">
            <div>
              <h4 class="font-bold mb-2">Prepared By</h4>
              <p>${grnData.preparedBy || '_________'}</p>
              <p>Date: ${grnData.preparedDate || '_________'}</p>
              <p class="signature-line">Signature</p>
            </div>
            
            <div>
              <h4 class="font-bold mb-2">Checked By</h4>
              <p>${grnData.checkedBy || '_________'}</p>
              <p>Date: ${grnData.checkedDate || '_________'}</p>
              <p class="signature-line">Signature</p>
            </div>
            
            <div>
              <h4 class="font-bold mb-2">Approved By</h4>
              <p>${grnData.approvedBy || '_________'}</p>
              <p>Date: ${grnData.approvedDate || '_________'}</p>
              <p class="signature-line">Signature</p>
            </div>
            
            <div>
              <h4 class="font-bold mb-2">Received By</h4>
              <p>${grnData.receivedBy || '_________'}</p>
              <p>Location: ${grnData.receivedLocation || '_________'}</p>
              <p>Date: ${grnData.receivedDate || '_________'}</p>
              <p class="signature-line">Signature</p>
            </div>
          </div>
          
          <div class="mt-4 text-center">
            <p>Thank you for your business!</p>
          </div>
        </body>
        </html>
      `;
      
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };
  
  const handleExportGRNAsPDF = () => {
    // For now, we'll use the print function as PDF export
    handlePrintGRN();
  };

  // Build a GRN object from current grnData for use with printGRNDetails / exportGRNDetailsAsPDF
  const buildGRNObject = () => {
    const itemsWithCosts = distributeReceivingCosts([...grnData.items], grnData.receivingCosts);
    // Pull supplier/business details from the suppliers array (which the form actually edits)
    const primarySupplier = grnData.suppliers?.[0] || {} as any;
    const effectiveSupplierName = grnData.numberOfSuppliers > 1
      ? (grnData.suppliers?.map(s => s.name).join(', ') || grnData.supplierName)
      : (primarySupplier.name || grnData.supplierName);
    return {
      id: Date.now().toString(),
      name: `GRN-${grnData.grnNumber}`,
      data: {
        grnNumber: grnData.grnNumber,
        date: grnData.date,
        time: grnData.time,
        supplierName: effectiveSupplierName,
        supplierId: primarySupplier.supplierId || grnData.supplierId,
        supplierPhone: primarySupplier.phone || grnData.supplierPhone,
        supplierEmail: primarySupplier.email || grnData.supplierEmail,
        supplierAddress: primarySupplier.address || grnData.supplierAddress,
        supplierTinNumber: primarySupplier.tinNumber || grnData.supplierTinNumber,
        documentUrl: primarySupplier.documentUrl || '',
        documentName: primarySupplier.documentName || '',
        businessName: primarySupplier.name || grnData.businessName,
        businessAddress: primarySupplier.address || grnData.businessAddress,
        businessPhone: primarySupplier.phone || grnData.businessPhone,
        businessEmail: primarySupplier.email || grnData.businessEmail,
        poNumber: grnData.poNumber,
        deliveryNoteNumber: grnData.deliveryNoteNumber,
        vehicleNumber: grnData.logisticDetails?.vehicleNumber || grnData.vehicleNumber,
        driverName: grnData.logisticDetails?.driverName || grnData.driverName,
        receivedBy: grnData.receivedBy,
        receivedLocation: grnData.receivedLocation,
        receivedDate: grnData.receivedDate,
        logisticDetails: grnData.logisticDetails,
        status: grnData.status || 'completed',
        qualityCheckNotes: grnData.qualityCheckNotes,
        discrepancies: grnData.discrepancies,
        preparedBy: grnData.preparedBy,
        preparedDate: grnData.preparedDate,
        checkedBy: grnData.checkedBy,
        checkedDate: grnData.checkedDate,
        approvedBy: grnData.approvedBy,
        approvedDate: grnData.approvedDate,
        receivingCosts: grnData.receivingCosts,
        isVatable: grnData.isVatable,
        stockType: primarySupplier.stockType || (grnData.suppliers?.[0]?.stockType) || '',
        businessTin: primarySupplier.businessTin || grnData.businessTin || '',
        destinationGodownId: grnData.destinationGodownId,
        destinationZoneId: grnData.destinationZoneId,
        destinationGodownName: grnData.destinationGodownName,
        destinationZoneName: grnData.destinationZoneName,
        items: itemsWithCosts.map(item => ({
          description: item.description,
          quantity: item.orderedQuantity,
          delivered: item.receivedQuantity,
          unit: item.unit,
          unitCost: item.unitCost || 0,
          originalUnitCost: item.originalUnitCost || 0,
          total: item.totalWithReceivingCost || 0,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate,
          remarks: item.remarks,
          receivingCostPerUnit: item.receivingCostPerUnit,
          totalWithReceivingCost: item.totalWithReceivingCost,
          damaged: (item as any).damaged || 0,
          destinationGodownId: item.destinationGodownId,
          destinationZoneId: item.destinationZoneId,
          destinationGodownName: item.destinationGodownName,
          destinationZoneName: item.destinationZoneName
        }))
      }
    };
  };
  
  const [customerSettlementData, setCustomerSettlementData] = useState<CustomerSettlementData>({
    customerName: "Customer Name",
    customerId: generateCustomerId(),
    customerPhone: "(555) 123-4567",
    customerEmail: "customer@example.com",
    referenceNumber: generateSettlementReference(),
    settlementAmount: 0,
    paymentMethod: "Cash",
    cashierName: "Cashier Name",
    previousBalance: 0,
    amountPaid: 0,
    newBalance: 0,
    notes: "",
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString(),
    status: "completed"
  });
  
  const [supplierSettlementData, setSupplierSettlementData] = useState<LocalSupplierSettlementData>({
    supplierName: "Supplier Name",
    supplierId: generateSupplierId(),
    supplierPhone: "(555) 987-6543",
    supplierEmail: "supplier@example.com",
    referenceNumber: generateSettlementReference(),
    settlementAmount: 0,
    paymentMethod: "Bank Transfer",
    processedBy: "Accountant Name",
    poNumber: "",
    previousBalance: 0,
    amountPaid: 0,
    newBalance: 0,
    notes: "",
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString(),
    status: "completed"
  });
  
  // Function to generate a unique GRN number
  const generateGRNNumber = () => {
    return `GRN-${Date.now()}`;
  };
  
  // Calculate total receiving costs
  const calculateTotalReceivingCosts = () => {
    return grnData.receivingCosts.reduce((sum, cost) => sum + Number(cost.amount || 0), 0);
  };
  
  // Function to handle receiving cost changes
  const handleReceivingCostChange = (costId: string, field: keyof GRNReceivingCost, value: string | number) => {
    setGrnData(prev => ({
      ...prev,
      receivingCosts: prev.receivingCosts.map(cost => 
        cost.id === costId ? { ...cost, [field]: value } : cost
      )
    }));
  };
  
  // Add new receiving cost
  const handleAddReceivingCost = () => {
    setGrnData(prev => ({
      ...prev,
      receivingCosts: [
        ...prev.receivingCosts,
        {
          id: Date.now().toString(),
          description: "",
          amount: 0
        }
      ]
    }));
  };
  
  // Remove receiving cost
  const handleRemoveReceivingCost = (costId: string) => {
    setGrnData(prev => ({
      ...prev,
      receivingCosts: prev.receivingCosts.filter(cost => cost.id !== costId)
    }));
  };
  
  // Add new GRN item
  const handleAddGRNItem = () => {
    setGrnData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: Date.now().toString(),
          productId: "", // Initialize with empty productId
          description: "",
          orderedQuantity: 0,
          receivedQuantity: 0,
          unit: "",
          originalUnitCost: 0,
          unitCost: 0,
          totalCost: 0,
          receivingCostPerUnit: 0,
          totalWithReceivingCost: 0,
          batchNumber: "",
          expiryDate: "",
          remarks: "",
          supplierId: "supplier-1"  // Default to first supplier
        }
      ]
    }));
  };
  
  // Remove GRN item
  const handleRemoveGRNItem = (itemId: string) => {
    setGrnData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }));
  };
  
  // Initial GRN data
  const initialGRNData: GRNData = {
    grnNumber: generateGRNNumber(),
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString(),
    numberOfSuppliers: 1,
    suppliers: [
      {
        id: "supplier-1",
        name: "Supplier Name",
        supplierId: generateSupplierId(),
        phone: "(555) 987-6543",
        email: "supplier@example.com",
        address: "123 Supplier Street, City, Country",
        tinNumber: "",
        stockType: ""  // Default to empty, user can select
      }
    ],
    supplierName: "Supplier Name",
    supplierId: generateSupplierId(),
    supplierPhone: "(555) 987-6543",
    supplierEmail: "supplier@example.com",
    supplierAddress: "123 Supplier Street, City, Country",
    logisticDetails: {
      vehicleNumber: "",
      driverName: "",
      driverPhone: "",
      transportCompany: "Express Logistics",
      estimatedArrival: new Date().toISOString().split('T')[0],
      actualArrival: new Date().toISOString().split('T')[0],
      departureTime: new Date().toISOString().split('T')[0],
      deliveryLocation: "",
      specialInstructions: "Please Inspect the goods on delivery",
      shippingMethod: "Ground",
      trackingNumber: "TRK-001"
    },
    businessName: "KILANGO GROUP LTD",
    businessAddress: "64 Tanganyika Rd.,Muheza,Tanga,Tanzania",
    businessPhone: "0711 299 266",
    businessEmail: "kilangogroupltd@gmail.com",
    isVatable: false,
    supplierTinNumber: "",
    poNumber: "PO-2024-001",
    deliveryNoteNumber: "DN-001",
    vehicleNumber: "",
    driverName: "",
    receivedBy: "Warehouse Staff",
    receivedLocation: "",
    items: [
      { id: "1", description: "", orderedQuantity: 0, receivedQuantity: 0, unit: "", unitCost: 0, totalCost: 0, receivingCostPerUnit: 0, totalWithReceivingCost: 0, batchNumber: "", expiryDate: "", remarks: "", productId: undefined }
    ],
    receivingCosts: [
      { id: "1", description: "Transport Charges", amount: 0 },
      { id: "2", description: "Offloaders Charges", amount: 0 },
      { id: "3", description: "Traffic Charges", amount: 0 }
    ],
    qualityCheckNotes: "",
    discrepancies: "",
    preparedBy: "Inventory Clerk",
    preparedDate: new Date().toISOString().split('T')[0],
    checkedBy: "Quality Inspector",
    checkedDate: new Date().toISOString().split('T')[0],
    approvedBy: "Warehouse Manager",
    approvedDate: new Date().toISOString().split('T')[0],
    receivedDate: new Date().toISOString().split('T')[0],
    status: "completed",
    timestamp: new Date().toLocaleString()
  };
  
  const [grnData, setGrnData] = useState<GRNData>(initialGRNData);
  
  // GRN Godown state
  const [grnGodowns, setGrnGodowns] = useState<Godown[]>([]);
  const [grnZonesByGodown, setGrnZonesByGodown] = useState<Map<string, GodownZone[]>>(new Map());


  // Helper to get zones for a specific godown (loads if not cached)
  const getZonesForGodown = async (godownId: string): Promise<GodownZone[]> => {
    if (grnZonesByGodown.has(godownId)) {
      return grnZonesByGodown.get(godownId)!;
    }
    try {
      const data = await getZones(godownId);
      setGrnZonesByGodown(prev => new Map(prev).set(godownId, data));
      return data;
    } catch (error) {
      console.error('Error loading zones for godown:', error);
      return [];
    }
  };
  
  // Load godowns for GRN
  useEffect(() => {
    const loadGodowns = async () => {
      try {
        const data = await getGodowns();
        setGrnGodowns(data.filter(g => g.status === 'active'));
      } catch (error) {
        console.error('Error loading godowns for GRN:', error);
      }
    };
    loadGodowns();
  }, []);

  
  const [savedGRNs, setSavedGRNs] = useState<any[]>(() => {
    const saved = localStorage.getItem('savedGRNs');
    return saved ? JSON.parse(saved) : [];
  });

  // Supplier Purchase Note state
  const generatePurchaseNoteNumber = () => `SPN-${String(Date.now()).slice(-6)}`;
  const [supplierPurchaseNoteData, setSupplierPurchaseNoteData] = useState<SupplierPurchaseNoteData>({
    purchaseNoteNumber: generatePurchaseNoteNumber(),
    date: new Date().toISOString().split('T')[0],
    supplierName: '',
    supplierPhone: '',
    supplierEmail: '',
    supplierAddress: '',
    businessName: 'KILANGO GROUP LTD',
    businessAddress: '64, Muheza - Tanga - Tanzania',
    businessPhone: '0711 299 266',
    businessEmail: 'kilangogroup1@gmail.com',
    items: [{ id: Date.now().toString(), description: '', quantity: 0, unit: '', unitPrice: 0, total: 0 }],
    subtotal: 0,
    tax: 0,
    discount: 0,
    total: 0,
    notes: '',
    preparedBy: '',
    preparedDate: new Date().toISOString().split('T')[0],
    status: 'draft'
  });

  const handleSupplierPurchaseNoteChange = (field: keyof SupplierPurchaseNoteData, value: any) => {
    setSupplierPurchaseNoteData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddSupplierPurchaseItem = () => {
    setSupplierPurchaseNoteData(prev => ({
      ...prev,
      items: [...prev.items, { id: Date.now().toString(), description: '', quantity: 0, unit: '', unitPrice: 0, total: 0 }]
    }));
  };

  const handleRemoveSupplierPurchaseItem = (itemId: string) => {
    setSupplierPurchaseNoteData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }));
  };

  const handleSupplierPurchaseItemChange = (itemId: string, field: keyof SupplierPurchaseNoteItem, value: any) => {
    setSupplierPurchaseNoteData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id !== itemId) return item;
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          updated.total = (updated.quantity || 0) * (updated.unitPrice || 0);
        }
        return updated;
      })
    }));
  };

  const handleSaveSupplierPurchaseNote = async () => {
    try {
      const subtotal = supplierPurchaseNoteData.items.reduce((sum, item) => sum + (item.total || 0), 0);
      const discount = supplierPurchaseNoteData.discount || 0;
      const total = subtotal - discount;

      const noteData = {
        ...supplierPurchaseNoteData,
        subtotal,
        discount,
        total,
        status: 'completed' as const
      };

      const { saveSupplierPurchaseNote } = await import('@/utils/supplierPurchaseNoteUtils');
      const result = await saveSupplierPurchaseNote(noteData);

      if (result.success) {
        toast({ title: 'Success', description: 'Supplier Purchase Note saved successfully' });
        // Reset form
        setSupplierPurchaseNoteData({
          purchaseNoteNumber: generatePurchaseNoteNumber(),
          date: new Date().toISOString().split('T')[0],
          supplierName: '',
          supplierPhone: '',
          supplierEmail: '',
          supplierAddress: '',
          businessName: '',
          businessAddress: '',
          businessPhone: '',
          businessEmail: '',
          items: [{ id: Date.now().toString(), description: '', quantity: 0, unit: '', unitPrice: 0, total: 0 }],
          subtotal: 0,
          tax: 0,
          discount: 0,
          total: 0,
          notes: '',
          preparedBy: '',
          preparedDate: new Date().toISOString().split('T')[0],
          status: 'draft'
        });
        setActiveTab('manage');
      } else {
        toast({ title: 'Error', description: result.error || 'Failed to save note', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error saving supplier purchase note:', error);
      toast({ title: 'Error', description: 'Failed to save supplier purchase note', variant: 'destructive' });
    }
  };

  // State to store the settlement data to be printed (preserved after save)
  const [settlementToPrint, setSettlementToPrint] = useState<CustomerSettlementData | null>(null);
    
  const [purchaseOrderData, setPurchaseOrderData] = useState<PurchaseOrderData>({
    businessName: "Your Business Name",
    businessAddress: "123 Business Street",
    businessPhone: "(555) 987-6543",
    businessEmail: "info@yourbusiness.com",
    numberOfSuppliers: 1,
    supplierName: "Supplier Company Name",
    supplierAddress: "123 Supplier Street",
    supplierPhone: "(555) 123-4567",
    supplierEmail: "supplier@example.com",
    poNumber: "PO-2024-001",
    date: "12/3/2025",
    expectedDelivery: "",
    items: [
      { id: "1", description: "Office Chairs", quantity: 10, unit: "EA", unitPrice: 89.99, total: 899.90 },
      { id: "2", description: "Desk Lamps", quantity: 15, unit: "EA", unitPrice: 24.50, total: 367.50 },
      { id: "3", description: "Filing Cabinets", quantity: 3, unit: "EA", unitPrice: 149.99, total: 449.97 }
    ],
    subtotal: 1717.37,
    tax: 145.98,
    discount: 0,
    shipping: 45.00,
    total: 1908.35,
    paymentTerms: "Net 30",
    deliveryInstructions: "Ground",
    notes: "Please deliver by Friday. Call before delivery.",
    authorizedByName: "Jane Manager",
    authorizedBySignature: "Approved for purchase per budget approval.",
    authorizationDate: "",
    requestedBy: "",
    approvedBy: ""
  });

  const [salesOrderData, setSalesOrderData] = useState<SalesOrderData>(initialSalesOrderData);
  
  // Initialize invoice data with current date and time-based invoice number
  const initialInvoiceData: InvoiceData = {
    businessName: "Your Business Name",
    businessAddress: "123 Business Street",
    businessPhone: "(555) 123-4567",
    businessEmail: "billing@yourbusiness.com",
    clientName: "Client Company Name",
    clientAddress: "456 Client Avenue",
    clientDistrictWard: "MUHEZA - Magila",
    clientCityState: "Client City, State 67890",
    clientPhone: "(555) 987-6543",
    clientEmail: "accounts@clientcompany.com",
    clientTaxId: "TIN-123456789",
    invoiceNumber: `INV-${new Date().getTime()}`,
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    amountDue: 2395.84,
    items: [
      { id: "1", description: "Website Design & Development", quantity: 1, unit: "Project", rate: 1800.00, amount: 1800.00 },
      { id: "2", description: "Monthly Support (3 months)", quantity: 3, unit: "Months", rate: 150.00, amount: 450.00 }
    ],
    subtotal: 2250.00,
    tax: 195.84,
    discount: 50.00,
    total: 2395.84,
    amountPaid: 0.00,
    creditBroughtForward: 0.00,
    terms: "Net 30",
    notes: "Thank you for your business!?",
    paymentOptions: "Cash , Bank Transfer, Check, or Credit Card",
    checkPayableMessage: "Please make checks payable to KILANGO GROUP LTD",
    timestamp: new Date().toLocaleString()
  };
  
  const [invoiceData, setInvoiceData] = useState<InvoiceData>(initialInvoiceData);
  
  const [showInvoiceOptions, setShowInvoiceOptions] = useState(false);
  const [showDeliveryNoteOptions, setShowDeliveryNoteOptions] = useState(false);
  const [showCustomerSettlementOptions, setShowCustomerSettlementOptions] = useState(false);
  const [showSupplierSettlementOptions, setShowSupplierSettlementOptions] = useState(false);
  const [showGRNOptions, setShowGRNOptions] = useState(false);
  const [showPurchaseOrderOptions, setShowPurchaseOrderOptions] = useState(false);
  const [showSalesOrderOptions, setShowSalesOrderOptions] = useState(false);
  const [showStockTakeOptions, setShowStockTakeOptions] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  
  // Functions to handle customer settlement operations
  const handleViewCustomerSettlement = (settlementId: string) => {
    const settlement = savedCustomerSettlements.find(s => s.id === settlementId);
    if (settlement) {
      setCustomerSettlementData({
        ...settlement,
        status: settlement.status || "completed"
      });
      setActiveTab('preview');
      alert('Customer settlement loaded for viewing');
    }
  };
  
  const handleLoadCustomerSettlement = (settlementId: string) => {
    const settlement = savedCustomerSettlements.find(s => s.id === settlementId);
    if (settlement) {
      setCustomerSettlementData({
        ...settlement,
        status: settlement.status || "completed"
      });
      setActiveTab('preview');
      alert('Customer settlement loaded for editing');
    }
  };
  
  const handleDeleteSavedCustomerSettlement = (settlementId: string) => {
    if (confirm('Are you sure you want to delete this saved customer settlement?')) {
      const updatedSettlements = savedCustomerSettlements.filter(s => s.id !== settlementId);
      localStorage.setItem('savedCustomerSettlements', JSON.stringify(updatedSettlements));
      setSavedCustomerSettlements(updatedSettlements);
      
      // Trigger storage event to notify other components
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'savedCustomerSettlements',
        newValue: JSON.stringify(updatedSettlements)
      }));
    }
  };
  
  const [expenseVoucherData, setExpenseVoucherData] = useState<ExpenseVoucherData>({
    voucherNumber: "EV-2024-001",
    date: "12/3/2025",
    submittedBy: "John Smith",
    employeeId: "EMP-00123",
    department: "Marketing",
    items: [
      { id: "1", description: "Office Supplies", category: "Office Expenses", amount: 150.00, date: "12/1/2025" },
      { id: "2", description: "Travel Expenses", category: "Travel", amount: 320.50, date: "12/2/2025" },
      { id: "3", description: "Client Dinner", category: "Entertainment", amount: 85.75, date: "12/2/2025" }
    ],
    totalAmount: 556.25,
    purpose: "Monthly marketing expenses for Q4 campaign",
    approvedBy: "Jane Manager",
    approvedDate: "12/5/2025",
    notes: "All receipts attached.",
    submittedBySignature: "",
    approvedBySignature: "",
    signatureDate: ""
  });
  
  const [salarySlipData, setSalarySlipData] = useState<SalarySlipData>({
    employeeName: "John Smith",
    employeeId: "EMP-00123",
    payPeriod: "December 2025",
    paidDate: "12/5/2025",
    basicSalary: 5000.00,
    allowances: 800.00,
    overtime: 200.00,
    bonus: 500.00,
    grossPay: 6500.00,
    tax: 650.00,
    insurance: 325.00,
    otherDeductions: 125.00,
    totalDeductions: 1100.00,
    netPay: 5400.00,
    bankName: "Global Bank",
    accountNumber: "**** **** **** 1234",
    department: "Marketing",
    position: "Senior Marketing Specialist",
    paymentMethod: "Direct Deposit",
    employeeSignature: "",
    managerSignature: "",
    signatureDate: ""
  });
  
  const [complimentaryGoodsData, setComplimentaryGoodsData] = useState<ComplimentaryGoodsData>({
    voucherNumber: "CG-2024-001",
    date: "12/3/2025",
    customerName: "ABC Corporation",
    customerAddress: "456 Business Avenue, Suite 100, Business City, BC 67890",
    customerPhone: "(555) 123-4567",
    customerEmail: "contact@abccorp.com",
    items: [
      { id: "1", description: "Sample Product A", quantity: 5, unit: "pcs" },
      { id: "2", description: "Sample Product B", quantity: 10, unit: "boxes" },
      { id: "3", description: "Sample Product C", quantity: 2, unit: "units" }
    ],
    reason: "Customer appreciation for loyal business partnership",
    authorizedByName: "Jane Manager",
    authorizedByTitle: "Sales Director",
    authorizedDate: "12/5/2025"
  });
  
  // Get the next delivery note number from localStorage
  const getNextDeliveryNoteNumber = () => {
    const lastNumber = localStorage.getItem('lastDeliveryNoteNumber');
    const today = new Date();
    const dateStr = `${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
    
    let nextNumber = 1;
    if (lastNumber) {
      const [lastDate, lastSeq] = lastNumber.split('-');
      if (lastDate === dateStr) {
        nextNumber = parseInt(lastSeq) + 1;
      }
    }
    
    const newNumber = `${dateStr}-${nextNumber.toString().padStart(3, '0')}`;
    localStorage.setItem('lastDeliveryNoteNumber', newNumber);
    return `DN-${newNumber}`;
  };
  
  // Generate delivery note number and set current date automatically
  useEffect(() => {
    if (activeTab === "preview") {
      const deliveryNoteNumber = getNextDeliveryNoteNumber();
      
      // Calculate total quantity from items (use quantity first, then delivered as fallback)
      const calculatedTotalQuantity = deliveryNoteData.items.reduce((sum, item) => sum + Number(item.quantity || item.delivered || 0), 0);
      
      // Also update the delivery note number, date, and calculated totals
      setDeliveryNoteData(prev => ({
        ...prev,
        deliveryNoteNumber: deliveryNoteNumber,
        date: new Date().toISOString().split('T')[0], // Set to current date in YYYY-MM-DD format
        totalQuantity: calculatedTotalQuantity // Update with real calculated total
      }));
    }
  }, [activeTab]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleEditTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    setActiveTab("customize");
  };

  const handleViewTemplate = (templateId: string) => {
    setViewingTemplate(templateId);
    setActiveTab("customize");
  };

  const handlePreviewTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template && (template.type === "delivery-note" || template.type === "order-form" || template.type === "invoice" || template.type === "expense-voucher" || template.type === "salary-slip" || template.type === "complimentary-goods" || template.type === "report" || template.type === "customer-settlement" || template.type === "supplier-settlement" || template.type === "goods-received-note" || template.type === "sales-order" || template.type === "stock-take" || template.type === "supplier-purchase-note")) {
      setViewingTemplate(templateId);
      setActiveTab("preview");
    } else {
      handlePrintPreview(templateId);
    }
  };

  const handleSaveTemplate = async () => {
    // Check if we're working with an invoice template
    const currentTemplate = templates.find(t => t.id === selectedTemplate || t.id === viewingTemplate);
    
    if (currentTemplate?.type === "invoice") {
      // For invoice templates, automatically save to saved invoices
      try {
        // Create invoice data for saving
        const invoiceToSave: SavedInvoiceData = {
          id: invoiceData.invoiceNumber, // Use invoice number as ID
          invoiceNumber: invoiceData.invoiceNumber,
          date: invoiceData.invoiceDate,
          customer: invoiceData.clientName,
          items: invoiceData.items.reduce((sum, item) => sum + item.quantity, 0), // Total number of items
          total: invoiceData.total,
          paymentMethod: 'N/A', // Templates don't have payment method
          status: 'completed', // For templates, mark as completed
          itemsList: invoiceData.items.map(item => ({
            name: item.description,
            quantity: item.quantity,
            price: item.rate,
            total: item.amount
          })),
          subtotal: invoiceData.subtotal,
          tax: invoiceData.tax,
          discount: invoiceData.discount,
          amountReceived: 0,
          change: 0,
          amountPaid: invoiceData.amountPaid || 0,
          creditBroughtForward: invoiceData.creditBroughtForward || 0,
          amountDue: invoiceData.amountDue || (invoiceData.total - (invoiceData.amountPaid || 0) + (invoiceData.creditBroughtForward || 0)),
        };
        
        await saveInvoice(invoiceToSave);
        
        // Show the invoice options dialog after saving
        showInvoiceOptionsDialog();
        
        // Don't reset here - let the user choose an option first
      } catch (error) {
        console.error('Error saving invoice:', error);
        alert('Error saving invoice. Please try again.');
      }
    } else if (currentTemplate?.type === "delivery-note") {
      // For delivery note templates, automatically save to saved deliveries
      try {
        // Calculate total items
        const totalItems = deliveryNoteData.items.reduce((sum, item) => sum + item.quantity, 0);
        
        // For delivery notes, we don't have rates, so total is based on quantity
        const totalAmount = totalItems; // Just using quantity as a simple total
        
        // Find the outlet ID if the customer is from registered outlets
        let outletId: string | undefined;
        if (isCustomerFromOutlets) {
          const matchedOutlet = outlets.find(outlet => 
            outlet.name.toLowerCase().trim() === deliveryNoteData.customerName.toLowerCase().trim()
          );
          outletId = matchedOutlet?.id;
        }

        // Create delivery data for saving
        const deliveryToSave: DeliveryData = {
          id: deliveryNoteData.deliveryNoteNumber, // Use delivery note number as ID
          deliveryNoteNumber: deliveryNoteData.deliveryNoteNumber,
          date: deliveryNoteData.date,
          customer: deliveryNoteData.customerName, // Use customerName instead of clientName
          items: totalItems, // Total number of items
          total: totalAmount,
          paymentMethod: 'N/A', // Templates don't have payment method
          status: 'completed', // For templates, mark as completed
          itemsList: deliveryNoteData.items.map(item => {
            // Resolve product ID from grnProductItems by matching name to description
            const matchedProduct = grnProductItems.find(p => 
              p.name.toLowerCase().trim() === item.description.toLowerCase().trim()
            );
            return {
              id: item.id,
              product_id: matchedProduct?.id || undefined, // Resolved product ID for godown stock updates
              name: item.description,
              quantity: item.quantity,
              unit: item.unit,
              delivered: item.delivered,
              remarks: item.remarks,
              price: item.rate, // Use rate as the price for delivery items
              total: item.amount, // Use amount as the total for delivery items
              // Per-item godown/zone for multi-godown deliveries
              godown_id: item.godownId || undefined,
              zone_id: item.zoneId || undefined,
              godown_name: item.godownName || undefined,
              zone_name: item.zoneName || undefined
            };
          }),
          subtotal: deliveryNoteData.subtotal, // Use the calculated subtotal from deliveryNoteData
          tax: deliveryNoteData.tax,
          discount: deliveryNoteData.discount,
          amountReceived: deliveryNoteData.amountPaid,
          change: deliveryNoteData.amountPaid ? deliveryNoteData.amountPaid - totalAmount : 0,
          vehicle: deliveryNoteData.vehicle,
          driver: deliveryNoteData.driver,
          deliveryNotes: deliveryNoteData.deliveryNotes,
          outletId: outletId,
          creditBroughtForward: deliveryNoteData.creditBroughtForward || 0,
          // Godown integration fields - use first item's godown as delivery-level reference
          sourceType: 'investment',
          sourceGodownId: deliveryNoteData.items.find(i => i.godownId)?.godownId || undefined,
          sourceZoneId: deliveryNoteData.items.find(i => i.godownId)?.zoneId || undefined,
          sourceGodownName: deliveryNoteData.items.find(i => i.godownId)?.godownName || '',
          sourceZoneName: deliveryNoteData.items.find(i => i.godownId)?.zoneName || '',
          // Additional fields from DeliveryDetails view (matching exact View Display)
          businessName: deliveryNoteData.businessName,
          businessAddress: deliveryNoteData.businessAddress,
          preparedByName: deliveryNoteData.preparedByName,
          preparedByDate: deliveryNoteData.preparedByDate,
          driverName: deliveryNoteData.driverName,
          driverDate: deliveryNoteData.driverDate,
          receivedByName: deliveryNoteData.receivedByName,
          receivedByDate: deliveryNoteData.receivedByDate
        };
        
        await saveDelivery(deliveryToSave);
        
        // Invalidate godown stock cache so next delivery shows fresh quantities
        setLoadedGodownProducts(new Set());
        setProductGodownMap(new Map());
        setProductGodownZoneMap(new Map());
        
        // Show the delivery note options dialog after saving
        showDeliveryNoteOptionsDialog();
        
        // Auto-increment delivery note number and reset fields for next entry
        setTimeout(() => {
          resetAndIncrementDeliveryNote();
        }, 500);
      } catch (error) {
        console.error('Error saving delivery:', error);
        alert('Error saving delivery. Please try again.');
      }
    } else if (currentTemplate?.type === "purchase-order") {
      // For purchase order templates, automatically save to saved purchase orders
      try {
        // Calculate total items
        const totalItems = purchaseOrderData.items.reduce((sum, item) => sum + item.quantity, 0);
        
        // Create purchase order data for saving
        const purchaseOrderToSave: SavedPurchaseOrderData = {
          id: purchaseOrderData.poNumber, // Use PO number as ID
          poNumber: purchaseOrderData.poNumber,
          date: purchaseOrderData.date,
          supplier: purchaseOrderData.supplierName,
          items: totalItems, // Total number of items
          total: purchaseOrderData.total,
          paymentMethod: 'N/A', // Templates don't have payment method
          status: 'completed', // For templates, mark as completed
          itemsList: purchaseOrderData.items.map(item => ({
            name: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            total: item.total
          })),
          subtotal: purchaseOrderData.subtotal,
          tax: purchaseOrderData.tax,
          discount: purchaseOrderData.discount,
          shipping: purchaseOrderData.shipping,
          paymentTerms: purchaseOrderData.paymentTerms,
          deliveryInstructions: purchaseOrderData.deliveryInstructions,
          notes: purchaseOrderData.notes,
          authorizedByName: purchaseOrderData.authorizedByName,
          authorizedBySignature: purchaseOrderData.authorizedBySignature,
          authorizationDate: purchaseOrderData.authorizationDate
        };
        
        // Save to localStorage
        const savedPurchaseOrders = JSON.parse(localStorage.getItem('savedPurchaseOrders') || '[]');
        savedPurchaseOrders.push(purchaseOrderToSave);
        localStorage.setItem('savedPurchaseOrders', JSON.stringify(savedPurchaseOrders));
        
        // Update state
        setSavedPurchaseOrders(savedPurchaseOrders);
        
        // Show the purchase order options dialog after saving
        setShowPurchaseOrderOptions(true);
        
        // Don't reset here - let the user choose an option first
        
        // Trigger storage event to notify other components
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'savedPurchaseOrders',
          newValue: JSON.stringify(savedPurchaseOrders)
        }));
        
        alert(`Purchase Order ${purchaseOrderData.poNumber} saved successfully!`);
      } catch (error) {
        console.error('Error saving purchase order:', error);
        alert('Error saving purchase order. Please try again.');
      }
    } else {
      // For other templates, just log the save action
      console.log("Saving template:", selectedTemplate);
      
      // Reset after save
      setSelectedTemplate(null);
      setViewingTemplate(null);
      setActiveTab("manage");
    }
  };
  
  // Function to reset invoice data to initial state
  const resetInvoiceData = () => {
    setInvoiceData({
      ...initialInvoiceData,
      invoiceNumber: `INV-${new Date().getTime()}`, // Generate new invoice number
      invoiceDate: new Date().toISOString().split('T')[0], // Set to current date
      timestamp: new Date().toLocaleString() // Update timestamp
    });
  };
  
  // Reset delivery note data to initial state with new incremented number
  const resetAndIncrementDeliveryNote = () => {
    // Generate the next delivery note number
    const nextDeliveryNoteNumber = getNextDeliveryNoteNumber();
    
    // Reset all delivery note data with fresh values
    setDeliveryNoteData({
      ...initialDeliveryNoteData,
      deliveryNoteNumber: nextDeliveryNoteNumber,
      date: getLocalDate(),
      deliveryDate: getLocalDate(),
      preparedByDate: getLocalDate(),
      driverDate: getLocalDate(),
      receivedByDate: '',
      // Reset financial fields
      subtotal: 0,
      tax: 0,
      discount: 0,
      total: 0,
      amountPaid: 0,
      creditBroughtForward: 0,
      amountDue: 0,
      // Reset items to empty array
      items: [],
      totalItems: 0,
      totalQuantity: 0,
      totalPackages: 0,
      // Reset text fields
      deliveryNotes: '',
      preparedByName: '',
      driverName: '',
      receivedByName: '',
      vehicle: '',
      driver: ''
    });
  };
  
  // Function to reset delivery note data to initial state
  const resetDeliveryNoteData = () => {
    resetAndIncrementDeliveryNote();
  };

  // Function to reset sales order data to initial state
  const resetSalesOrderData = () => {
    setSalesOrderData({
      ...initialSalesOrderData,
      orderNumber: `SO-${new Date().getTime()}`, // Generate new order number
      orderDate: new Date().toISOString().split('T')[0], // Set to current date
    });
  };

  // Calculate delivery note totals
  const calculateDeliveryNoteTotals = () => {
    const subtotal = deliveryNoteData.items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const total = subtotal + Number(deliveryNoteData.tax || 0) - Number(deliveryNoteData.discount || 0);
    const amountDue = total - Number(deliveryNoteData.amountPaid || 0) + Number(deliveryNoteData.creditBroughtForward || 0);
    
    return { subtotal, total, amountDue };
  };

  // Update delivery note totals when items change
  useEffect(() => {
    const totals = calculateDeliveryNoteTotals();
    setDeliveryNoteData(prev => ({
      ...prev,
      subtotal: totals.subtotal,
      total: totals.total,
      amountDue: totals.amountDue
    }));
  }, [deliveryNoteData.items, deliveryNoteData.tax, deliveryNoteData.discount, deliveryNoteData.amountPaid, deliveryNoteData.creditBroughtForward]);
  
  // Function to export GRN as PDF
  const exportGRNAsPDF = () => {
    const itemsWithCosts = distributeReceivingCosts([...grnData.items], grnData.receivingCosts);
    
    // Prepare GRN data for export
    const exportData = {
      grnInfo: {
        'GRN Number': grnData.grnNumber,
        'Date': grnData.date,
        'Time': grnData.time,
        'Supplier Name': grnData.supplierName,
        'Supplier ID': grnData.supplierId,
        'Supplier Phone': grnData.supplierPhone,
        'Supplier Email': grnData.supplierEmail,
        'Supplier Address': grnData.supplierAddress,
        'Business Name': grnData.businessName,
        'Business Address': grnData.businessAddress,
        'Business Phone': grnData.businessPhone,
        'Business Email': grnData.businessEmail,
        'Business Stock Type': grnData.suppliers[0]?.stockType || 'Not specified',
        'Is Vatable': grnData.isVatable ? 'Yes' : 'No',
        'Supplier TIN Number': grnData.supplierTinNumber || '',
        'PO Number': grnData.poNumber,
        'Delivery Note #': grnData.deliveryNoteNumber,
        'Vehicle #': grnData.vehicleNumber,
        'Driver': grnData.driverName,
        'Received By': grnData.receivedBy,
        'Received Location': grnData.receivedLocation || '',
        'Quality Check Notes': grnData.qualityCheckNotes,
        'Discrepancies': grnData.discrepancies,
        'Prepared By': grnData.preparedBy,
        'Prepared Date': grnData.preparedDate,
        'Checked By': grnData.checkedBy,
        'Checked Date': grnData.checkedDate,
        'Approved By': grnData.approvedBy,
        'Approved Date': grnData.approvedDate,
        'Received Date': grnData.receivedDate,
        'Status': grnData.status || 'completed',
        'Total Receiving Costs': calculateTotalReceivingCosts(),
      },
      receivingCosts: grnData.receivingCosts.map(cost => ({
        'Description': cost.description,
        'Amount': cost.amount,
      })),
      items: itemsWithCosts.map(item => ({
        'Description': item.description,
        'Ordered': item.orderedQuantity,
        'Received': item.receivedQuantity,
        'Unit': item.unit,
        'Original Unit Cost': item.originalUnitCost || (item.unitCost ? item.unitCost - (item.receivingCostPerUnit || 0) : 0),
        'Receiving Cost Per Unit': item.receivingCostPerUnit || 0,
        'New Unit Cost': item.unitCost || 0,
        'Total Cost with Receiving': item.totalWithReceivingCost || 0,
        'Batch #': item.batchNumber || '',
        'Expiry': item.expiryDate || '',
        'Remarks': item.remarks,
      }))
    };
    
    // Create a simpler array structure for export
    const pdfRows = [];
    
    // Add GRN header
    pdfRows.push(['Field', 'Value']);
    pdfRows.push(['GRN Number', exportData.grnInfo['GRN Number']]);
    pdfRows.push(['Date', exportData.grnInfo['Date']]);
    pdfRows.push(['Time', exportData.grnInfo['Time']]);
    pdfRows.push(['Supplier Name', exportData.grnInfo['Supplier Name']]);
    pdfRows.push(['Supplier ID', exportData.grnInfo['Supplier ID']]);
    pdfRows.push(['Supplier Phone', exportData.grnInfo['Supplier Phone']]);
    pdfRows.push(['Supplier Email', exportData.grnInfo['Supplier Email']]);
    pdfRows.push(['Supplier Address', exportData.grnInfo['Supplier Address']]);
    pdfRows.push(['Business Name', exportData.grnInfo['Business Name']]);
    pdfRows.push(['Business Address', exportData.grnInfo['Business Address']]);
    pdfRows.push(['Business Phone', exportData.grnInfo['Business Phone']]);
    pdfRows.push(['Business Email', exportData.grnInfo['Business Email']]);
    pdfRows.push(['PO Number', exportData.grnInfo['PO Number']]);
    pdfRows.push(['Delivery Note #', exportData.grnInfo['Delivery Note #']]);
    pdfRows.push(['Vehicle #', exportData.grnInfo['Vehicle #']]);
    pdfRows.push(['Driver', exportData.grnInfo['Driver']]);
    pdfRows.push(['Received By', exportData.grnInfo['Received By']]);
    pdfRows.push(['Received Location', exportData.grnInfo['Received Location']]);
    pdfRows.push(['Quality Check Notes', exportData.grnInfo['Quality Check Notes']]);
    pdfRows.push(['Discrepancies', exportData.grnInfo['Discrepancies']]);
    pdfRows.push(['Prepared By', exportData.grnInfo['Prepared By']]);
    pdfRows.push(['Prepared Date', exportData.grnInfo['Prepared Date']]);
    pdfRows.push(['Checked By', exportData.grnInfo['Checked By']]);
    pdfRows.push(['Checked Date', exportData.grnInfo['Checked Date']]);
    pdfRows.push(['Approved By', exportData.grnInfo['Approved By']]);
    pdfRows.push(['Approved Date', exportData.grnInfo['Approved Date']]);
    pdfRows.push(['Received Date', exportData.grnInfo['Received Date']]);
    pdfRows.push(['Total Receiving Costs', exportData.grnInfo['Total Receiving Costs']]);
    
    // Add empty row as separator
    pdfRows.push(['', '']);
    
    // Add receiving costs header
    pdfRows.push(['Receiving Cost Description', 'Amount']);
    
    // Add each receiving cost
    exportData.receivingCosts.forEach(cost => {
      pdfRows.push([
        cost['Description'],
        cost['Amount']
      ]);
    });
    
    // Add empty row as separator
    pdfRows.push(['', '']);
    
    // Add items header
    pdfRows.push(['Item Description', 'Ordered', 'Received', 'Unit', 'Original Unit Cost', 'Receiving Cost Per Unit', 'New Unit Cost', 'Total Cost with Receiving', 'Batch #', 'Expiry', 'Remarks']);
    
    // Add each item
    exportData.items.forEach(item => {
      pdfRows.push([
        item['Description'],
        item['Ordered'],
        item['Received'],
        item['Unit'],
        item['Original Unit Cost'],
        item['Receiving Cost Per Unit'],
        item['New Unit Cost'],
        item['Total Cost with Receiving'],
        item['Batch #'],
        item['Expiry'],
        item['Remarks']
      ]);
    });
    
    // Convert the 2D array to the format expected by ExportUtils
    const formattedData = pdfRows.map(row => {
      if (Array.isArray(row)) {
        // If it's an array, create an object with generic column names
        const obj: any = {};
        row.forEach((val, idx) => {
          obj[`Column ${idx + 1}`] = val;
        });
        return obj;
      } else {
        return row;
      }
    });
    
    ExportUtils.exportToPDF(formattedData, `grn-${grnData.grnNumber}`, `Goods Received Note - ${grnData.grnNumber}`);
  };
    
  // Function to download GRN as PDF
  const downloadGRNAsPDF = async () => {
    // Show a loading message to the user
    const loadingEl = document.createElement('div');
    loadingEl.style.position = 'fixed';
    loadingEl.style.top = '10px';
    loadingEl.style.right = '10px';
    loadingEl.style.backgroundColor = '#3b82f6';
    loadingEl.style.color = 'white';
    loadingEl.style.padding = '10px 15px';
    loadingEl.style.borderRadius = '5px';
    loadingEl.style.zIndex = '9999';
    loadingEl.textContent = 'Generating PDF...';
    document.body.appendChild(loadingEl);
      
    try {
      // Dynamically import html2pdf.js
      const html2pdfModule = await import('html2pdf.js');
        
      // Get the GRN content to print
      const grnContent = generateCleanGRNHTML();
        
      // Create a temporary container to hold the GRN content
      const tempContainer = document.createElement('div');
      tempContainer.innerHTML = grnContent;
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.width = '800px';
      tempContainer.style.fontFamily = 'Arial, sans-serif';
      tempContainer.style.fontSize = '14px';
      document.body.appendChild(tempContainer);
        
      // Configure PDF options
      const opt = {
        margin: 5,
        filename: `GRN_${grnData.grnNumber || 'unknown'}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          width: tempContainer.scrollWidth,
          windowWidth: tempContainer.scrollWidth
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
      };
        
      // Generate PDF
      html2pdfModule.default(tempContainer, opt)
        .then(() => {
          // Remove temporary container after PDF generation
          if (tempContainer.parentNode) {
            tempContainer.parentNode.removeChild(tempContainer);
          }
          // Remove loading message
          if (loadingEl.parentNode) {
            loadingEl.parentNode.removeChild(loadingEl);
          }
          console.log('PDF generated successfully');
        })
        .catch((error) => {
          console.error('Error generating PDF:', error);
          // Remove loading message
          if (loadingEl.parentNode) {
            loadingEl.parentNode.removeChild(loadingEl);
          }
          alert('Error generating PDF. Please try again.');
        });
    } catch (error) {
      console.error('Error importing html2pdf.js:', error);
      // Remove loading message
      if (loadingEl.parentNode) {
        loadingEl.parentNode.removeChild(loadingEl);
      }
      alert('Error loading PDF generator. Please try again.');
    }
  };
    
  // Function to export delivery note as PDF
  const exportDeliveryNoteAsPDF = () => {
    // Prepare delivery note data for export
    const exportData = {
      deliveryNoteInfo: {
        'Delivery Note Number': deliveryNoteData.deliveryNoteNumber,
        'Date': deliveryNoteData.date,
        'Delivery Date': deliveryNoteData.deliveryDate,
        'Business Name': deliveryNoteData.businessName,
        'Business Address': deliveryNoteData.businessAddress,
        'Business Phone': deliveryNoteData.businessPhone,
        'Business Email': deliveryNoteData.businessEmail,
        'Customer Name': deliveryNoteData.customerName,
        'Customer Address': `${deliveryNoteData.customerAddress1} ${deliveryNoteData.customerAddress2}`,
        'Customer Phone': deliveryNoteData.customerPhone,
        'Customer Email': deliveryNoteData.customerEmail,
        'Vehicle': deliveryNoteData.vehicle,
        'Driver': deliveryNoteData.driver,
        'Total Items': deliveryNoteData.totalItems,
        'Total Quantity': deliveryNoteData.totalQuantity,
        'Total Packages': deliveryNoteData.totalPackages,
        'Delivery Notes': deliveryNoteData.deliveryNotes,
        'Prepared By': deliveryNoteData.preparedByName,
        'Prepared Date': deliveryNoteData.preparedByDate,
        'Driver Name': deliveryNoteData.driverName,
        'Driver Date': deliveryNoteData.driverDate,
        'Received By': deliveryNoteData.receivedByName,
        'Received Date': deliveryNoteData.receivedByDate,
      },
      items: deliveryNoteData.items.map(item => ({
        'Item Description': item.description,
        'Quantity': item.quantity,
        'Unit': item.unit,
        'Rate': item.rate,
        'Amount': item.amount,
        'Delivered': item.delivered,
        'Remarks': item.remarks,
      })),
      financialSummary: {
        'Total': deliveryNoteData.total,
        'Amount Paid': deliveryNoteData.amountPaid,
        'Credit Brought Forward': deliveryNoteData.creditBroughtForward,
        'Amount Due': deliveryNoteData.amountDue
      }
    };
    
    // Create a simpler array structure for export
    const pdfRows = [];
    
    // Add delivery note header
    pdfRows.push(['Field', 'Value']);
    pdfRows.push(['Delivery Note Number', exportData.deliveryNoteInfo['Delivery Note Number']]);
    pdfRows.push(['Date', exportData.deliveryNoteInfo['Date']]);
    pdfRows.push(['Delivery Date', exportData.deliveryNoteInfo['Delivery Date']]);
    pdfRows.push(['Business Name', exportData.deliveryNoteInfo['Business Name']]);
    pdfRows.push(['Business Address', exportData.deliveryNoteInfo['Business Address']]);
    pdfRows.push(['Business Phone', exportData.deliveryNoteInfo['Business Phone']]);
    pdfRows.push(['Business Email', exportData.deliveryNoteInfo['Business Email']]);
    pdfRows.push(['Customer Name', exportData.deliveryNoteInfo['Customer Name']]);
    pdfRows.push(['Customer Address', exportData.deliveryNoteInfo['Customer Address']]);
    pdfRows.push(['Customer Phone', exportData.deliveryNoteInfo['Customer Phone']]);
    pdfRows.push(['Customer Email', exportData.deliveryNoteInfo['Customer Email']]);
    pdfRows.push(['Vehicle', exportData.deliveryNoteInfo['Vehicle']]);
    pdfRows.push(['Driver', exportData.deliveryNoteInfo['Driver']]);
    pdfRows.push(['Total Items', exportData.deliveryNoteInfo['Total Items']]);
    pdfRows.push(['Total Quantity', exportData.deliveryNoteInfo['Total Quantity']]);
    pdfRows.push(['Total Packages', exportData.deliveryNoteInfo['Total Packages']]);
    pdfRows.push(['Delivery Notes', exportData.deliveryNoteInfo['Delivery Notes']]);
    pdfRows.push(['Prepared By', exportData.deliveryNoteInfo['Prepared By']]);
    pdfRows.push(['Prepared Date', exportData.deliveryNoteInfo['Prepared Date']]);
    pdfRows.push(['Driver Name', exportData.deliveryNoteInfo['Driver Name']]);
    pdfRows.push(['Driver Date', exportData.deliveryNoteInfo['Driver Date']]);
    pdfRows.push(['Received By', exportData.deliveryNoteInfo['Received By']]);
    pdfRows.push(['Received Date', exportData.deliveryNoteInfo['Received Date']]);
    
    // Add empty row as separator
    pdfRows.push(['', '']);
    
    // Add items header
    pdfRows.push(['Item Description', 'Quantity', 'Unit', 'Delivered', 'Remarks']);
    
    // Add each item
    exportData.items.forEach(item => {
      pdfRows.push([
        item['Item Description'],
        item['Quantity'],
        item['Unit'],
        item['Delivered'],
        item['Remarks']
      ]);
    });
    
    // Convert the 2D array to the format expected by ExportUtils
    const formattedData = pdfRows.map(row => {
      if (Array.isArray(row)) {
        // If it's an array, create an object with generic column names
        const obj: any = {};
        row.forEach((val, idx) => {
          obj[`Column ${idx + 1}`] = val;
        });
        return obj;
      } else {
        return row;
      }
    });
    
    ExportUtils.exportToPDF(formattedData, `delivery-note-${deliveryNoteData.deliveryNoteNumber}`, `Delivery Note - ${deliveryNoteData.deliveryNoteNumber}`);
  };
  
  // Function to export GRN as CSV
  const exportGRNAsCSV = () => {
    // Prepare GRN data for export
    const exportData = {
      grnInfo: {
        'GRN Number': grnData.grnNumber,
        'Date': grnData.date,
        'Time': grnData.time,
        'Supplier Name': grnData.supplierName,
        'Supplier ID': grnData.supplierId,
        'Supplier Phone': grnData.supplierPhone,
        'Supplier Email': grnData.supplierEmail,
        'Supplier Address': grnData.supplierAddress,
        'Business Name': grnData.businessName,
        'Business Address': grnData.businessAddress,
        'Business Phone': grnData.businessPhone,
        'Business Email': grnData.businessEmail,
        'Business Stock Type': grnData.suppliers[0]?.stockType || 'Not specified',
        'Is Vatable': grnData.isVatable ? 'Yes' : 'No',
        'Supplier TIN Number': grnData.supplierTinNumber || '',
        'PO Number': grnData.poNumber,
        'Delivery Note #': grnData.deliveryNoteNumber,
        'Vehicle #': grnData.vehicleNumber,
        'Driver': grnData.driverName,
        'Received By': grnData.receivedBy,
        'Received Location': grnData.receivedLocation || '',
        'Quality Check Notes': grnData.qualityCheckNotes,
        'Discrepancies': grnData.discrepancies,
        'Prepared By': grnData.preparedBy,
        'Prepared Date': grnData.preparedDate,
        'Checked By': grnData.checkedBy,
        'Checked Date': grnData.checkedDate,
        'Approved By': grnData.approvedBy,
        'Approved Date': grnData.approvedDate,
        'Received Date': grnData.receivedDate,
        'Status': grnData.status || 'completed',
        'Total Receiving Costs': calculateTotalReceivingCosts(),
      },
      receivingCosts: grnData.receivingCosts.map(cost => ({
        'Description': cost.description,
        'Amount': cost.amount,
      })),
      items: grnData.items.map(item => ({
        'Description': item.description,
        'Ordered': item.orderedQuantity,
        'Received': item.receivedQuantity,
        'Unit': item.unit,
        'Batch #': item.batchNumber || '',
        'Expiry': item.expiryDate || '',
        'Remarks': item.remarks,
      }))
    };
    
    // Create a simpler array structure for export
    const csvRows = [];
    
    // Add GRN header
    csvRows.push(['Field', 'Value']);
    csvRows.push(['GRN Number', exportData.grnInfo['GRN Number']]);
    csvRows.push(['Date', exportData.grnInfo['Date']]);
    csvRows.push(['Time', exportData.grnInfo['Time']]);
    csvRows.push(['Supplier Name', exportData.grnInfo['Supplier Name']]);
    csvRows.push(['Supplier ID', exportData.grnInfo['Supplier ID']]);
    csvRows.push(['Supplier Phone', exportData.grnInfo['Supplier Phone']]);
    csvRows.push(['Supplier Email', exportData.grnInfo['Supplier Email']]);
    csvRows.push(['Supplier Address', exportData.grnInfo['Supplier Address']]);
    csvRows.push(['Business Name', exportData.grnInfo['Business Name']]);
    csvRows.push(['Business Address', exportData.grnInfo['Business Address']]);
    csvRows.push(['Business Phone', exportData.grnInfo['Business Phone']]);
    csvRows.push(['Business Email', exportData.grnInfo['Business Email']]);
    csvRows.push(['Business Stock Type', exportData.grnInfo['Business Stock Type']]);
    csvRows.push(['Is Vatable', exportData.grnInfo['Is Vatable']]);
    csvRows.push(['Supplier TIN Number', exportData.grnInfo['Supplier TIN Number']]);
    csvRows.push(['PO Number', exportData.grnInfo['PO Number']]);
    csvRows.push(['Delivery Note #', exportData.grnInfo['Delivery Note #']]);
    csvRows.push(['Vehicle #', exportData.grnInfo['Vehicle #']]);
    csvRows.push(['Driver', exportData.grnInfo['Driver']]);
    csvRows.push(['Received By', exportData.grnInfo['Received By']]);
    csvRows.push(['Received Location', exportData.grnInfo['Received Location']]);
    csvRows.push(['Quality Check Notes', exportData.grnInfo['Quality Check Notes']]);
    csvRows.push(['Discrepancies', exportData.grnInfo['Discrepancies']]);
    csvRows.push(['Prepared By', exportData.grnInfo['Prepared By']]);
    csvRows.push(['Prepared Date', exportData.grnInfo['Prepared Date']]);
    csvRows.push(['Checked By', exportData.grnInfo['Checked By']]);
    csvRows.push(['Checked Date', exportData.grnInfo['Checked Date']]);
    csvRows.push(['Approved By', exportData.grnInfo['Approved By']]);
    csvRows.push(['Approved Date', exportData.grnInfo['Approved Date']]);
    csvRows.push(['Received Date', exportData.grnInfo['Received Date']]);
    csvRows.push(['Total Receiving Costs', exportData.grnInfo['Total Receiving Costs']]);
    
    // Add empty row as separator
    csvRows.push(['', '']);
    
    // Add receiving costs header
    csvRows.push(['Receiving Cost Description', 'Amount']);
    
    // Add each receiving cost
    exportData.receivingCosts.forEach(cost => {
      csvRows.push([
        cost['Description'],
        cost['Amount']
      ]);
    });
    
    // Add empty row as separator
    csvRows.push(['', '']);
    
    // Add items header
    csvRows.push(['Item Description', 'Ordered', 'Received', 'Unit', 'Batch #', 'Expiry', 'Remarks']);
    
    // Add each item
    exportData.items.forEach(item => {
      csvRows.push([
        item['Description'],
        item['Ordered'],
        item['Received'],
        item['Unit'],
        item['Batch #'],
        item['Expiry'],
        item['Remarks']
      ]);
    });
    
    // Convert the 2D array to the format expected by ExportUtils
    const formattedData = csvRows.map(row => {
      if (Array.isArray(row)) {
        // If it's an array, create an object with generic column names
        const obj: any = {};
        row.forEach((val, idx) => {
          obj[`Column ${idx + 1}`] = val;
        });
        return obj;
      } else {
        return row;
      }
    });
    
    ExportUtils.exportToCSV(formattedData, `grn-${grnData.grnNumber}`);
  };
  
  // Function to distribute receiving costs among items based on quantity
  const distributeReceivingCosts = (items: GRNItem[], receivingCosts: GRNReceivingCost[]) => {
    // Calculate total quantity of all items
    const totalQuantity = items.reduce((sum, item) => sum + item.receivedQuantity, 0);
    
    if (totalQuantity === 0) {
      return items.map(item => ({
        ...item,
        receivingCostPerUnit: 0,
        totalWithReceivingCost: item.unitCost ? item.unitCost * item.receivedQuantity : 0
      }));
    }
    
    // Calculate total receiving costs
    const totalReceivingCosts = receivingCosts.reduce((sum, cost) => sum + Number(cost.amount || 0), 0);
    
    // Calculate cost per unit based on total quantity
    const costPerUnit = totalReceivingCosts / totalQuantity;
    
    // Update each item with receiving cost per unit and total cost with receiving costs
    return items.map(item => {
      const receivingCostPerUnit = costPerUnit;
      // Use originalUnitCost if available, otherwise assume current unitCost already includes receiving costs
      const baseUnitCost = item.originalUnitCost || (item.unitCost && item.receivingCostPerUnit ? item.unitCost - item.receivingCostPerUnit : item.unitCost) || 0;
      const unitCostWithReceiving = baseUnitCost + receivingCostPerUnit;
      const totalWithReceivingCost = unitCostWithReceiving * item.receivedQuantity;
      
      return {
        ...item,
        receivingCostPerUnit,
        totalWithReceivingCost,
        unitCost: unitCostWithReceiving,
        originalUnitCost: item.originalUnitCost || baseUnitCost
      };
    });
  };
  
  // Function to export GRN as JSON
  const exportGRNAsJSON = () => {
    const exportData = {
      grnInfo: {
        grnNumber: grnData.grnNumber,
        date: grnData.date,
        time: grnData.time,
        supplierName: grnData.supplierName,
        supplierId: grnData.supplierId,
        supplierPhone: grnData.supplierPhone,
        supplierEmail: grnData.supplierEmail,
        supplierAddress: grnData.supplierAddress,
        businessName: grnData.businessName,
        businessAddress: grnData.businessAddress,
        businessPhone: grnData.businessPhone,
        businessEmail: grnData.businessEmail,
        isVatable: grnData.isVatable ? 'Yes' : 'No',
        supplierTinNumber: grnData.supplierTinNumber || '',
        poNumber: grnData.poNumber,
        deliveryNoteNumber: grnData.deliveryNoteNumber,
        vehicleNumber: grnData.vehicleNumber,
        driverName: grnData.driverName,
        receivedBy: grnData.receivedBy,
        receivedLocation: grnData.receivedLocation || '',
        qualityCheckNotes: grnData.qualityCheckNotes,
        discrepancies: grnData.discrepancies,
        preparedBy: grnData.preparedBy,
        preparedDate: grnData.preparedDate,
        checkedBy: grnData.checkedBy,
        checkedDate: grnData.checkedDate,
        approvedBy: grnData.approvedBy,
        approvedDate: grnData.approvedDate,
        receivedDate: grnData.receivedDate,
        status: grnData.status || 'completed',
        totalReceivingCosts: grnData.receivingCosts.reduce((sum, cost) => sum + Number(cost.amount || 0), 0),
        timestamp: new Date().toISOString(),
      },
      receivingCosts: grnData.receivingCosts,
      items: distributeReceivingCosts(grnData.items, grnData.receivingCosts),
    };
    
    ExportUtils.exportToJSON([exportData], `grn-${grnData.grnNumber}`);
  };
  
  // Function to export delivery note as CSV
  const exportDeliveryNoteAsCSV = () => {
    // Prepare delivery note data for export
    const exportData = {
      deliveryNoteInfo: {
        'Delivery Note Number': deliveryNoteData.deliveryNoteNumber,
        'Date': deliveryNoteData.date,
        'Delivery Date': deliveryNoteData.deliveryDate,
        'Business Name': deliveryNoteData.businessName,
        'Business Address': deliveryNoteData.businessAddress,
        'Business Phone': deliveryNoteData.businessPhone,
        'Business Email': deliveryNoteData.businessEmail,
        'Customer Name': deliveryNoteData.customerName,
        'Customer Address': `${deliveryNoteData.customerAddress1} ${deliveryNoteData.customerAddress2}`,
        'Customer Phone': deliveryNoteData.customerPhone,
        'Customer Email': deliveryNoteData.customerEmail,
        'Vehicle': deliveryNoteData.vehicle,
        'Driver': deliveryNoteData.driver,
        'Total Items': deliveryNoteData.totalItems,
        'Total Quantity': deliveryNoteData.totalQuantity,
        'Total Packages': deliveryNoteData.totalPackages,
        'Delivery Notes': deliveryNoteData.deliveryNotes,
        'Prepared By': deliveryNoteData.preparedByName,
        'Prepared Date': deliveryNoteData.preparedByDate,
        'Driver Name': deliveryNoteData.driverName,
        'Driver Date': deliveryNoteData.driverDate,
        'Received By': deliveryNoteData.receivedByName,
        'Received Date': deliveryNoteData.receivedByDate,
      },
      items: deliveryNoteData.items.map(item => ({
        'Item Description': item.description,
        'Quantity': item.quantity,
        'Unit': item.unit,
        'Rate': item.rate,
        'Amount': item.amount,
        'Delivered': item.delivered,
        'Remarks': item.remarks,
      }))
    };
    
    // Create a simpler array structure for export
    const csvRows = [];
    
    // Add delivery note header
    csvRows.push(['Field', 'Value']);
    csvRows.push(['Delivery Note Number', exportData.deliveryNoteInfo['Delivery Note Number']]);
    csvRows.push(['Date', exportData.deliveryNoteInfo['Date']]);
    csvRows.push(['Delivery Date', exportData.deliveryNoteInfo['Delivery Date']]);
    csvRows.push(['Business Name', exportData.deliveryNoteInfo['Business Name']]);
    csvRows.push(['Business Address', exportData.deliveryNoteInfo['Business Address']]);
    csvRows.push(['Business Phone', exportData.deliveryNoteInfo['Business Phone']]);
    csvRows.push(['Business Email', exportData.deliveryNoteInfo['Business Email']]);
    csvRows.push(['Customer Name', exportData.deliveryNoteInfo['Customer Name']]);
    csvRows.push(['Customer Address', exportData.deliveryNoteInfo['Customer Address']]);
    csvRows.push(['Customer Phone', exportData.deliveryNoteInfo['Customer Phone']]);
    csvRows.push(['Customer Email', exportData.deliveryNoteInfo['Customer Email']]);
    csvRows.push(['Vehicle', exportData.deliveryNoteInfo['Vehicle']]);
    csvRows.push(['Driver', exportData.deliveryNoteInfo['Driver']]);
    csvRows.push(['Total Items', exportData.deliveryNoteInfo['Total Items']]);
    csvRows.push(['Total Quantity', exportData.deliveryNoteInfo['Total Quantity']]);
    csvRows.push(['Total Packages', exportData.deliveryNoteInfo['Total Packages']]);
    csvRows.push(['Delivery Notes', exportData.deliveryNoteInfo['Delivery Notes']]);
    csvRows.push(['Prepared By', exportData.deliveryNoteInfo['Prepared By']]);
    csvRows.push(['Prepared Date', exportData.deliveryNoteInfo['Prepared Date']]);
    csvRows.push(['Driver Name', exportData.deliveryNoteInfo['Driver Name']]);
    csvRows.push(['Driver Date', exportData.deliveryNoteInfo['Driver Date']]);
    csvRows.push(['Received By', exportData.deliveryNoteInfo['Received By']]);
    csvRows.push(['Received Date', exportData.deliveryNoteInfo['Received Date']]);
    
    // Add empty row as separator
    csvRows.push(['', '']);
    
    // Add items header
    csvRows.push(['Item Description', 'Quantity', 'Unit', 'Rate', 'Amount', 'Delivered', 'Remarks']);
    
    // Add each item
    exportData.items.forEach(item => {
      csvRows.push([
        item['Item Description'],
        item['Quantity'],
        item['Unit'],
        item['Rate'],
        item['Amount'],
        item['Delivered'],
        item['Remarks']
      ]);
    });
    
    // Convert the 2D array to the format expected by ExportUtils
    const formattedData = csvRows.map(row => {
      if (Array.isArray(row)) {
        // If it's an array, create an object with generic column names
        const obj: any = {};
        row.forEach((val, idx) => {
          obj[`Column ${idx + 1}`] = val;
        });
        return obj;
      } else {
        return row;
      }
    });
    
    ExportUtils.exportToCSV(formattedData, `delivery-note-${deliveryNoteData.deliveryNoteNumber}`);
  };
  
  // Function to export delivery note as JSON
  const exportDeliveryNoteAsJSON = () => {
    const exportData = {
      deliveryNoteInfo: {
        deliveryNoteNumber: deliveryNoteData.deliveryNoteNumber,
        date: deliveryNoteData.date,
        deliveryDate: deliveryNoteData.deliveryDate,
        businessName: deliveryNoteData.businessName,
        businessAddress: deliveryNoteData.businessAddress,
        businessPhone: deliveryNoteData.businessPhone,
        businessEmail: deliveryNoteData.businessEmail,
        customerName: deliveryNoteData.customerName,
        customerAddress: `${deliveryNoteData.customerAddress1} ${deliveryNoteData.customerAddress2}`,
        customerPhone: deliveryNoteData.customerPhone,
        customerEmail: deliveryNoteData.customerEmail,
        vehicle: deliveryNoteData.vehicle,
        driver: deliveryNoteData.driver,
        totalItems: deliveryNoteData.totalItems,
        totalQuantity: deliveryNoteData.totalQuantity,
        totalPackages: deliveryNoteData.totalPackages,
        deliveryNotes: deliveryNoteData.deliveryNotes,
        preparedByName: deliveryNoteData.preparedByName,
        preparedByDate: deliveryNoteData.preparedByDate,
        driverName: deliveryNoteData.driverName,
        driverDate: deliveryNoteData.driverDate,
        receivedByName: deliveryNoteData.receivedByName,
        receivedByDate: deliveryNoteData.receivedByDate,
      },
      items: deliveryNoteData.items,
      timestamp: new Date().toISOString(),
    };
    
    ExportUtils.exportToJSON([exportData], `delivery-note-${deliveryNoteData.deliveryNoteNumber}`);
  };
  
  // Function to export customer settlement as PDF
  const exportCustomerSettlementAsPDF = () => {
    const exportData = {
      customerSettlementInfo: {
        customerName: customerSettlementData.customerName,
        customerId: customerSettlementData.customerId,
        customerPhone: customerSettlementData.customerPhone,
        customerEmail: customerSettlementData.customerEmail,
        referenceNumber: customerSettlementData.referenceNumber,
        settlementAmount: customerSettlementData.settlementAmount,
        paymentMethod: customerSettlementData.paymentMethod,
        cashierName: customerSettlementData.cashierName,
        previousBalance: customerSettlementData.previousBalance,
        amountPaid: customerSettlementData.amountPaid,
        newBalance: customerSettlementData.newBalance,
        notes: customerSettlementData.notes,
        date: customerSettlementData.date || new Date().toISOString().split('T')[0],
        time: customerSettlementData.time || new Date().toLocaleTimeString(),
      },
      timestamp: new Date().toISOString(),
    };
    
    // Create a simple array structure for the PDF
    const pdfRows = [];
    
    // Add header
    pdfRows.push(['Field', 'Value']);
    pdfRows.push(['Customer Name', exportData.customerSettlementInfo.customerName]);
    pdfRows.push(['Customer ID', exportData.customerSettlementInfo.customerId]);
    pdfRows.push(['Customer Phone', exportData.customerSettlementInfo.customerPhone]);
    pdfRows.push(['Customer Email', exportData.customerSettlementInfo.customerEmail]);
    pdfRows.push(['Reference Number', exportData.customerSettlementInfo.referenceNumber]);
    pdfRows.push(['Settlement Amount', exportData.customerSettlementInfo.settlementAmount.toString()]);
    pdfRows.push(['Payment Method', exportData.customerSettlementInfo.paymentMethod]);
    pdfRows.push(['Cashier Name', exportData.customerSettlementInfo.cashierName]);
    pdfRows.push(['Previous Balance', exportData.customerSettlementInfo.previousBalance.toString()]);
    pdfRows.push(['Amount Paid', exportData.customerSettlementInfo.amountPaid.toString()]);
    pdfRows.push(['New Balance', exportData.customerSettlementInfo.newBalance.toString()]);
    pdfRows.push(['Date', exportData.customerSettlementInfo.date]);
    pdfRows.push(['Time', exportData.customerSettlementInfo.time]);
    pdfRows.push(['Notes', exportData.customerSettlementInfo.notes]);
    
    // Convert to object format for ExportUtils
    const formattedData = pdfRows.map(row => {
      if (Array.isArray(row)) {
        const obj: any = {};
        row.forEach((val, idx) => {
          obj[`Column ${idx + 1}`] = val;
        });
        return obj;
      } else {
        return row;
      }
    });
    
    ExportUtils.exportToPDF(formattedData, `customer-settlement-${exportData.customerSettlementInfo.referenceNumber}`, `Customer Settlement - ${exportData.customerSettlementInfo.referenceNumber}`);
  };
  
  // Function to export customer settlement as CSV
  const exportCustomerSettlementAsCSV = () => {
    const exportData = {
      customerSettlementInfo: {
        customerName: customerSettlementData.customerName,
        customerId: customerSettlementData.customerId,
        customerPhone: customerSettlementData.customerPhone,
        customerEmail: customerSettlementData.customerEmail,
        referenceNumber: customerSettlementData.referenceNumber,
        settlementAmount: customerSettlementData.settlementAmount,
        paymentMethod: customerSettlementData.paymentMethod,
        cashierName: customerSettlementData.cashierName,
        previousBalance: customerSettlementData.previousBalance,
        amountPaid: customerSettlementData.amountPaid,
        newBalance: customerSettlementData.newBalance,
        notes: customerSettlementData.notes,
        date: customerSettlementData.date || new Date().toISOString().split('T')[0],
        time: customerSettlementData.time || new Date().toLocaleTimeString(),
      },
      timestamp: new Date().toISOString(),
    };
    
    // Create a simple array structure for the CSV
    const csvRows = [];
    
    // Add header
    csvRows.push(['Field', 'Value']);
    csvRows.push(['Customer Name', exportData.customerSettlementInfo.customerName]);
    csvRows.push(['Customer ID', exportData.customerSettlementInfo.customerId]);
    csvRows.push(['Customer Phone', exportData.customerSettlementInfo.customerPhone]);
    csvRows.push(['Customer Email', exportData.customerSettlementInfo.customerEmail]);
    csvRows.push(['Reference Number', exportData.customerSettlementInfo.referenceNumber]);
    csvRows.push(['Settlement Amount', exportData.customerSettlementInfo.settlementAmount.toString()]);
    csvRows.push(['Payment Method', exportData.customerSettlementInfo.paymentMethod]);
    csvRows.push(['Cashier Name', exportData.customerSettlementInfo.cashierName]);
    csvRows.push(['Previous Balance', exportData.customerSettlementInfo.previousBalance.toString()]);
    csvRows.push(['Amount Paid', exportData.customerSettlementInfo.amountPaid.toString()]);
    csvRows.push(['New Balance', exportData.customerSettlementInfo.newBalance.toString()]);
    csvRows.push(['Date', exportData.customerSettlementInfo.date]);
    csvRows.push(['Time', exportData.customerSettlementInfo.time]);
    csvRows.push(['Notes', exportData.customerSettlementInfo.notes]);
    
    // Convert to object format for ExportUtils
    const formattedData = csvRows.map(row => {
      if (Array.isArray(row)) {
        const obj: any = {};
        row.forEach((val, idx) => {
          obj[`Column ${idx + 1}`] = val;
        });
        return obj;
      } else {
        return row;
      }
    });
    
    ExportUtils.exportToCSV(formattedData, `customer-settlement-${exportData.customerSettlementInfo.referenceNumber}`);
  };
  
  // Function to export customer settlement as JSON
  const exportCustomerSettlementAsJSON = () => {
    const exportData = {
      customerSettlementInfo: {
        customerName: customerSettlementData.customerName,
        customerId: customerSettlementData.customerId,
        customerPhone: customerSettlementData.customerPhone,
        customerEmail: customerSettlementData.customerEmail,
        referenceNumber: customerSettlementData.referenceNumber,
        settlementAmount: customerSettlementData.settlementAmount,
        paymentMethod: customerSettlementData.paymentMethod,
        cashierName: customerSettlementData.cashierName,
        previousBalance: customerSettlementData.previousBalance,
        amountPaid: customerSettlementData.amountPaid,
        newBalance: customerSettlementData.newBalance,
        notes: customerSettlementData.notes,
        date: customerSettlementData.date || new Date().toISOString().split('T')[0],
        time: customerSettlementData.time || new Date().toLocaleTimeString(),
      },
      timestamp: new Date().toISOString(),
    };
    
    ExportUtils.exportToJSON([exportData], `customer-settlement-${exportData.customerSettlementInfo.referenceNumber}`);
  };
  
  // Function to generate clean customer settlement HTML for printing
  const generateCleanCustomerSettlementHTML = (): string => {
    // Use the preserved settlement data for printing if available, otherwise use current data
    const dataToUse = settlementToPrint || customerSettlementData;
    
    return `
      <div class="customer-settlement-container" style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <style>
          body { margin: 0; padding: 20px; }
          .customer-settlement-container { border: 1px solid #ccc; }
          .text-center { text-align: center; }
          .border-b-2 { border-bottom: 2px solid #000; }
          .pb-2 { padding-bottom: 0.5rem; }
          .font-bold { font-weight: bold; }
          .text-2xl { font-size: 1.5rem; }
          .text-sm { font-size: 0.875rem; }
          .mb-1 { margin-bottom: 0.25rem; }
          .mb-2 { margin-bottom: 0.5rem; }
          .mt-4 { margin-top: 1rem; }
          .mt-8 { margin-top: 2rem; }
          .pt-4 { padding-top: 1rem; }
          .border-t { border-top: 1px solid #ccc; }
          .grid { display: grid; }
          .gap-8 { gap: 2rem; }
          .gap-4 { gap: 1rem; }
          .grid-cols-1 { grid-template-columns: 1fr; }
          .grid-cols-2 { grid-template-columns: 1fr 1fr; }
          .grid-cols-3 { grid-template-columns: 1fr 1fr 1fr; }
          .border { border: 1px solid #e5e7eb; }
          .p-3 { padding: 0.75rem; }
          .rounded { border-radius: 0.25rem; }
          .font-medium { font-weight: 500; }
        </style>
        <div class="text-center border-b-2 pb-2">
          <h2 class="text-2xl font-bold">CUSTOMER SETTLEMENT RECEIPT</h2>
          <p class="text-sm">Receipt #${dataToUse.referenceNumber || 'RECEIPT_NUMBER'}</p>
          <p class="text-sm">Date: ${dataToUse.date || new Date().toLocaleDateString()}</p>
          <p class="text-sm">Time: ${dataToUse.time || new Date().toLocaleTimeString()}</p>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
          <div>
            <div class="font-bold mb-1">CUSTOMER INFORMATION:</div>
            <div class="text-sm mb-1">
              <span class="font-medium">Name:</span> ${dataToUse.customerName}
            </div>
            <div class="text-sm mb-1">
              <span class="font-medium">ID:</span> ${dataToUse.customerId}
            </div>
            <div class="text-sm mb-1">
              <span class="font-medium">Phone:</span> ${dataToUse.customerPhone}
            </div>
            <div class="text-sm mb-1">
              <span class="font-medium">Email:</span> ${dataToUse.customerEmail}
            </div>
          </div>
          
          <div>
            <div class="font-bold mb-1">SETTLEMENT DETAILS:</div>
            <div class="text-sm mb-1">
              <span class="font-medium">Reference:</span> ${dataToUse.referenceNumber}
            </div>
            <div class="text-sm mb-1">
              <span class="font-medium">Amount:</span> TZS ${dataToUse.settlementAmount?.toLocaleString() || '0.00'}
            </div>
            <div class="text-sm mb-1">
              <span class="font-medium">Payment Method:</span> ${dataToUse.paymentMethod}
            </div>
            <div class="text-sm mb-1">
              <span class="font-medium">Processed by:</span> ${dataToUse.cashierName}
            </div>
          </div>
        </div>
        
        <div class="space-y-4 mt-4">
          <div class="font-bold mb-2">TRANSACTION SUMMARY:</div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="border p-3 rounded">
              <div class="text-sm font-medium">Previous Balance</div>
              <div class="text-sm">TZS ${dataToUse.previousBalance?.toLocaleString() || '0.00'}</div>
            </div>
            <div class="border p-3 rounded">
              <div class="text-sm font-medium">Amount Paid</div>
              <div class="text-sm">TZS ${dataToUse.amountPaid?.toLocaleString() || '0.00'}</div>
            </div>
            <div class="border p-3 rounded">
              <div class="text-sm font-medium">New Balance</div>
              <div class="text-sm">TZS ${dataToUse.newBalance?.toLocaleString() || '0.00'}</div>
            </div>
          </div>
        </div>
        
        <div class="mt-4">
          <div class="font-bold mb-2">NOTES:</div>
          <div class="text-sm">${dataToUse.notes || 'No notes'}</div>
        </div>
        
        <div class="text-center mt-8 pt-4 border-t">
          <div class="text-sm font-bold">Thank you for your payment!</div>
          <div class="text-sm">We appreciate your business.</div>
        </div>
      </div>
    `;
  };
  
  // Function to generate clean supplier settlement HTML for printing
  const generateCleanSupplierSettlementHTML = (): string => {
    return `
      <div class="supplier-settlement-container" style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <style>
          body { margin: 0; padding: 20px; }
          .supplier-settlement-container { border: 1px solid #ccc; }
          .text-center { text-align: center; }
          .border-b-2 { border-bottom: 2px solid #000; }
          .pb-2 { padding-bottom: 0.5rem; }
          .font-bold { font-weight: bold; }
          .text-2xl { font-size: 1.5rem; }
          .text-sm { font-size: 0.875rem; }
          .mb-1 { margin-bottom: 0.25rem; }
          .mb-2 { margin-bottom: 0.5rem; }
          .mt-4 { margin-top: 1rem; }
          .mt-8 { margin-top: 2rem; }
          .pt-4 { padding-top: 1rem; }
          .border-t { border-top: 1px solid #ccc; }
          .grid { display: grid; }
          .gap-8 { gap: 2rem; }
          .gap-4 { gap: 1rem; }
          .grid-cols-1 { grid-template-columns: 1fr; }
          .grid-cols-2 { grid-template-columns: 1fr 1fr; }
          .grid-cols-3 { grid-template-columns: 1fr 1fr 1fr; }
          .border { border: 1px solid #e5e7eb; }
          .p-3 { padding: 0.75rem; }
          .rounded { border-radius: 0.25rem; }
          .font-medium { font-weight: 500; }
        </style>
        <div class="text-center border-b-2 pb-2">
          <h2 class="text-2xl font-bold">SUPPLIER SETTLEMENT RECEIPT</h2>
          <p class="text-sm">Receipt #${supplierSettlementData.referenceNumber || 'RECEIPT_NUMBER'}</p>
          <p class="text-sm">Date: ${new Date().toLocaleDateString()}</p>
          <p class="text-sm">Time: ${new Date().toLocaleTimeString()}</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
          <div>
            <div class="font-bold mb-1">SUPPLIER INFORMATION:</div>
            <div class="text-sm mb-1">
              <span class="font-medium">Name:</span> ${supplierSettlementData.supplierName}
            </div>
            <div class="text-sm mb-1">
              <span class="font-medium">ID:</span> ${supplierSettlementData.supplierId}
            </div>
            <div class="text-sm mb-1">
              <span class="font-medium">Phone:</span> ${supplierSettlementData.supplierPhone}
            </div>
            <div class="text-sm mb-1">
              <span class="font-medium">Email:</span> ${supplierSettlementData.supplierEmail}
            </div>
          </div>
          
          <div>
            <div class="font-bold mb-1">SETTLEMENT DETAILS:</div>
            <div class="text-sm mb-1">
              <span class="font-medium">Reference:</span> ${supplierSettlementData.referenceNumber}
            </div>
            <div class="text-sm mb-1">
              <span class="font-medium">PO Number:</span> ${supplierSettlementData.poNumber}
            </div>
            <div class="text-sm mb-1">
              <span class="font-medium">Amount:</span> ${formatCurrency(supplierSettlementData.settlementAmount)}
            </div>
            <div class="text-sm mb-1">
              <span class="font-medium">Payment Method:</span> ${supplierSettlementData.paymentMethod}
            </div>
            <div class="text-sm mb-1">
              <span class="font-medium">Processed by:</span> ${supplierSettlementData.processedBy}
            </div>
          </div>
        </div>

        <div class="mt-4">
          <div class="font-bold mb-2">TRANSACTION SUMMARY:</div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="border p-3 rounded">
              <div class="text-sm font-medium">Previous Balance</div>
              <div>${formatCurrency(supplierSettlementData.previousBalance)}</div>
            </div>
            <div class="border p-3 rounded">
              <div class="text-sm font-medium">Amount Paid</div>
              <div>${formatCurrency(supplierSettlementData.amountPaid)}</div>
            </div>
            <div class="border p-3 rounded">
              <div class="text-sm font-medium">New Balance</div>
              <div>${formatCurrency(supplierSettlementData.newBalance)}</div>
            </div>
          </div>
        </div>

        <div class="mt-4">
          <div class="font-bold mb-2">NOTES:</div>
          <div>${supplierSettlementData.notes || 'No notes provided'}</div>
        </div>

        <div class="text-center mt-8 pt-4 border-t border-gray-300">
          <div class="text-sm font-bold">Thank you for your business!</div>
          <div class="text-sm">We appreciate working with you.</div>
        </div>
      </div>
    `;
  };

  // Function to download supplier settlement as PDF
  const downloadSupplierSettlementAsPDF = () => {
    // Show a loading message to the user
    const loadingMsg = 'Generating PDF... Please wait.';
    const loadingEl = document.createElement('div');
    loadingEl.style.position = 'fixed';
    loadingEl.style.top = '10px';
    loadingEl.style.right = '10px';
    loadingEl.style.backgroundColor = '#007bff';
    loadingEl.style.color = 'white';
    loadingEl.style.padding = '10px 15px';
    loadingEl.style.borderRadius = '5px';
    loadingEl.style.zIndex = '10000';
    loadingEl.textContent = loadingMsg;
    document.body.appendChild(loadingEl);

    import('html2pdf.js').then((html2pdfModule) => {
      const supplierSettlementContent = generateCleanSupplierSettlementHTML();

      // Create a temporary container to hold the supplier settlement content
      const tempContainer = document.createElement('div');
      tempContainer.innerHTML = supplierSettlementContent;
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.width = '800px';
      tempContainer.style.fontFamily = 'Arial, sans-serif';
      tempContainer.style.fontSize = '14px';
      document.body.appendChild(tempContainer);

      // Configure PDF options
      const opt = {
        margin: 5,
        filename: `Supplier_Settlement_${supplierSettlementData.referenceNumber || 'unknown'}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          width: tempContainer.scrollWidth,
          windowWidth: tempContainer.scrollWidth
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
      };

      // Generate PDF
      html2pdfModule.default(tempContainer, opt)
        .then(() => {
          // Remove temporary container after PDF generation
          if (tempContainer.parentNode) {
            tempContainer.parentNode.removeChild(tempContainer);
          }
          // Remove loading message
          if (loadingEl.parentNode) {
            loadingEl.parentNode.removeChild(loadingEl);
          }
          console.log('PDF generated successfully');
        })
        .catch((error) => {
          console.error('Error generating PDF:', error);
          // Remove loading message
          if (loadingEl.parentNode) {
            loadingEl.parentNode.removeChild(loadingEl);
          }
          alert('Error generating PDF. Please try again.');
        });
    }).catch((error) => {
      console.error('Error importing html2pdf.js:', error);
      // Remove loading message
      if (loadingEl.parentNode) {
        loadingEl.parentNode.removeChild(loadingEl);
      }
      alert('Error loading PDF generator. Please try again.');
    });
  };

  // Function to export supplier settlement as PDF
  const exportSupplierSettlementAsPDF = () => {
    downloadSupplierSettlementAsPDF();
  };

  // Function to export supplier settlement as CSV
  const exportSupplierSettlementAsCSV = () => {
    try {
      // Prepare supplier settlement data for export
      const exportData = {
        supplierSettlementInfo: {
          'Reference Number': supplierSettlementData.referenceNumber,
          'Supplier Name': supplierSettlementData.supplierName,
          'Supplier ID': supplierSettlementData.supplierId,
          'Supplier Phone': supplierSettlementData.supplierPhone,
          'Supplier Email': supplierSettlementData.supplierEmail,
          'PO Number': supplierSettlementData.poNumber,
          'Settlement Amount': supplierSettlementData.settlementAmount,
          'Payment Method': supplierSettlementData.paymentMethod,
          'Processed By': supplierSettlementData.processedBy,
          'Previous Balance': supplierSettlementData.previousBalance,
          'Amount Paid': supplierSettlementData.amountPaid,
          'New Balance': supplierSettlementData.newBalance,
          'Notes': supplierSettlementData.notes || '',
          'Date': new Date().toISOString().split('T')[0],
          'Time': new Date().toLocaleTimeString()
        }
      };

      // Export using the utility function
      ExportUtils.exportToCSV([exportData], `supplier-settlement-${exportData.supplierSettlementInfo['Reference Number']}`);
    } catch (error) {
      console.error('Error exporting supplier settlement to CSV:', error);
      alert('Error exporting supplier settlement to CSV. Please try again.');
    }
  };

  // Function to export supplier settlement as JSON
  const exportSupplierSettlementAsJSON = () => {
    try {
      // Prepare supplier settlement data for export
      const exportData = {
        supplierSettlementInfo: {
          'Reference Number': supplierSettlementData.referenceNumber,
          'Supplier Name': supplierSettlementData.supplierName,
          'Supplier ID': supplierSettlementData.supplierId,
          'Supplier Phone': supplierSettlementData.supplierPhone,
          'Supplier Email': supplierSettlementData.supplierEmail,
          'PO Number': supplierSettlementData.poNumber,
          'Settlement Amount': supplierSettlementData.settlementAmount,
          'Payment Method': supplierSettlementData.paymentMethod,
          'Processed By': supplierSettlementData.processedBy,
          'Previous Balance': supplierSettlementData.previousBalance,
          'Amount Paid': supplierSettlementData.amountPaid,
          'New Balance': supplierSettlementData.newBalance,
          'Notes': supplierSettlementData.notes || '',
          'Date': new Date().toISOString().split('T')[0],
          'Time': new Date().toLocaleTimeString()
        }
      };

      // Export using the utility function
      ExportUtils.exportToJSON([exportData], `supplier-settlement-${exportData.supplierSettlementInfo['Reference Number']}`);
    } catch (error) {
      console.error('Error exporting supplier settlement to JSON:', error);
      alert('Error exporting supplier settlement to JSON. Please try again.');
    }
  };
  
  // Function to generate clean GRN HTML for printing
  const generateCleanGRNHTML = (): string => {
    try {
      // Validate that we have GRN data
      if (!grnData) {
        console.error('No GRN data available');
        return '';
      }
      
      // Validate required fields
      if (!grnData.grnNumber) {
        console.warn('GRN number is missing');
      }
      
      return `
        <div class="grn-container" style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
          <style>
            body { margin: 0; padding: 20px; }
            .grn-container { border: 1px solid #ccc; }
            .text-center { text-align: center; }
            .border-b-2 { border-bottom: 2px solid #000; }
            .pb-2 { padding-bottom: 0.5rem; }
            .font-bold { font-weight: bold; }
            .text-2xl { font-size: 1.5rem; }
            .text-sm { font-size: 0.875rem; }
            .mb-1 { margin-bottom: 0.25rem; }
            .mb-2 { margin-bottom: 0.5rem; }
            .mt-4 { margin-top: 1rem; }
            .mt-8 { margin-top: 2rem; }
            .pt-4 { padding-top: 1rem; }
            .border-t { border-top: 1px solid #ccc; }
            .grid { display: grid; }
            .gap-8 { gap: 2rem; }
            .gap-4 { gap: 1rem; }
            .grid-cols-1 { grid-template-columns: 1fr; }
            .grid-cols-2 { grid-template-columns: 1fr 1fr; }
            .grid-cols-3 { grid-template-columns: 1fr 1fr 1fr; }
            .border { border: 1px solid #e5e7eb; }
            .p-3 { padding: 0.75rem; }
            .rounded { border-radius: 0.25rem; }
            .font-medium { font-weight: 500; }
          </style>
          <div class="text-center border-b-2 pb-2">
            <h2 class="text-2xl font-bold">GOODS RECEIVED NOTE</h2>
            <p class="text-sm">GRN #: ${grnData.grnNumber || 'N/A'}</p>
            <p class="text-sm">Date: ${new Date().toLocaleDateString()}</p>
            <p class="text-sm">Time: ${new Date().toLocaleTimeString()}</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
            <div>
              <div class="font-bold mb-2">SUPPLIER INFORMATION:</div>
              ${(grnData.suppliers || []).map(supplier => `
                <div class="border p-3 rounded mb-3" style="background-color: #f8f9fa;">
                  <div class="font-medium mb-1">${supplier.name || 'N/A'}</div>
                  <div class="text-sm mb-1">
                    <span class="font-medium">ID:</span> ${supplier.supplierId || 'N/A'}
                  </div>
                  <div class="text-sm mb-1">
                    <span class="font-medium">Phone:</span> ${supplier.phone || 'N/A'}
                  </div>
                  <div class="text-sm mb-1">
                    <span class="font-medium">Email:</span> ${supplier.email || 'N/A'}
                  </div>
                  <div class="text-sm mb-1">
                    <span class="font-medium">Address:</span> ${supplier.address || 'N/A'}
                  </div>
                  <div class="text-sm mb-1">
                    <span class="font-medium">TIN Number:</span> ${supplier.tinNumber || 'N/A'}
                  </div>
                  <div class="text-sm mb-1">
                    <span class="font-medium">Stock Type:</span> ${supplier.stockType || 'N/A'}
                  </div>
                  ${supplier.documentUrl ? `
                  <div class="text-sm mb-1">
                    <span class="font-medium">Document:</span> <a href="${supplier.documentUrl}" target="_blank" class="text-blue-600 underline">${supplier.documentName || 'View PDF'}</a>
                  </div>
                  ` : ''}
                </div>
              `).join('')}
              
              ${grnData.suppliers?.length === 0 ? `
                <div class="text-sm text-gray-500">
                  <span class="font-medium">Primary Supplier:</span> ${grnData.supplierName || 'N/A'}<br>
                  <span class="font-medium">ID:</span> ${grnData.supplierId || 'N/A'}<br>
                  <span class="font-medium">Phone:</span> ${grnData.supplierPhone || 'N/A'}<br>
                  <span class="font-medium">Email:</span> ${grnData.supplierEmail || 'N/A'}<br>
                  <span class="font-medium">Address:</span> ${grnData.supplierAddress || 'N/A'}
                </div>
              ` : ''}
            </div>
            
            <div>
              <div class="font-bold mb-1">RECEIVING BUSINESS:</div>
              <div class="text-sm mb-1">
                <span class="font-medium">Business Name:</span> ${grnData.businessName || 'N/A'}
              </div>
              <div class="text-sm mb-1">
                <span class="font-medium">Address:</span> ${grnData.businessAddress || 'N/A'}
              </div>
              <div class="text-sm mb-1">
                <span class="font-medium">Phone:</span> ${grnData.businessPhone || 'N/A'}
              </div>
              <div class="text-sm mb-1">
                <span class="font-medium">Email:</span> ${grnData.businessEmail || 'N/A'}
              </div>
              <div class="text-sm mb-1">
                <span class="font-medium">Stock Type:</span> ${grnData.suppliers?.[0]?.stockType || 'N/A'}
              </div>
              <div class="text-sm mb-1">
                <span class="font-medium">VAT Status:</span> ${grnData.isVatable ? 'Vatable' : 'Exempt'}
              </div>
              <div class="text-sm mb-1">
                <span class="font-medium">TIN Number:</span> ${grnData.supplierTinNumber || 'N/A'}
              </div>
            </div>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
            <div>
              <div class="font-bold mb-1">DELIVERY DETAILS:</div>
              <div class="text-sm mb-1">
                <span class="font-medium">PO Number:</span> ${grnData.poNumber || 'N/A'}
              </div>
              <div class="text-sm mb-1">
                <span class="font-medium">Delivery Note Number:</span> ${grnData.deliveryNoteNumber || 'N/A'}
              </div>
              <div class="text-sm mb-1">
                <span class="font-medium">Vehicle Number:</span> ${grnData.vehicleNumber || 'N/A'}
              </div>
              <div class="text-sm mb-1">
                <span class="font-medium">Driver Name:</span> ${grnData.driverName || 'N/A'}
              </div>
              <div class="text-sm mb-1">
                <span class="font-medium">Received By:</span> ${grnData.receivedBy || 'N/A'}
              </div>
              <div class="text-sm mb-1">
                <span class="font-medium">Received Location:</span> ${grnData.receivedLocation || 'N/A'}
              </div>
              <div class="text-sm mb-1">
                <span class="font-medium">Received Date:</span> ${grnData.receivedDate || 'N/A'}
              </div>
            </div>
            
            <div>
              <div class="font-bold mb-1">APPROVAL DETAILS:</div>
              <div class="text-sm mb-1">
                <span class="font-medium">Prepared By:</span> ${grnData.preparedBy || 'N/A'}
              </div>
              <div class="text-sm mb-1">
                <span class="font-medium">Prepared Date:</span> ${grnData.preparedDate || 'N/A'}
              </div>
              <div class="text-sm mb-1">
                <span class="font-medium">Checked By:</span> ${grnData.checkedBy || 'N/A'}
              </div>
              <div class="text-sm mb-1">
                <span class="font-medium">Checked Date:</span> ${grnData.checkedDate || 'N/A'}
              </div>
              <div class="text-sm mb-1">
                <span class="font-medium">Approved By:</span> ${grnData.approvedBy || 'N/A'}
              </div>
              <div class="text-sm mb-1">
                <span class="font-medium">Approved Date:</span> ${grnData.approvedDate || 'N/A'}
              </div>
              <div class="text-sm mb-1">
                <span class="font-medium">Status:</span> ${grnData.status || 'N/A'}
              </div>
            </div>
          </div>
          
          <div class="mt-4">
            <div class="font-bold mb-2">ITEMS RECEIVED BY SUPPLIER:</div>
            
            ${(function() {
              // Group items by supplier
              const itemsBySupplier = new Map();
              const unassignedItems = [];
              
              // First, distribute receiving costs across all items
              const itemsWithCosts = distributeReceivingCosts([...(grnData.items || [])], grnData.receivingCosts);
              
              itemsWithCosts.forEach(item => {
                if (item.supplierId) {
                  if (!itemsBySupplier.has(item.supplierId)) {
                    itemsBySupplier.set(item.supplierId, []);
                  }
                  itemsBySupplier.get(item.supplierId).push(item);
                } else {
                  unassignedItems.push(item);
                }
              });
              
              let html = '';
              
              // Display items for each supplier
              itemsBySupplier.forEach((items, supplierId) => {
                const supplier = grnData.suppliers?.find(s => s.id === supplierId);
                html += `
                  <div class="mb-6">
                    <div class="font-bold mb-2" style="background-color: #f0f0f0; padding: 8px; border-radius: 4px;">
                      Supplier: ${supplier?.name || supplierId || 'Unknown Supplier'}
                    </div>
                    <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px;">
                      <thead>
                        <tr style="background-color: #f3f4f6;">
                          <th style="border: 1px solid #e5e7eb; padding: 6px; text-align: left;">Description</th>
                          <th style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">Ordered</th>
                          <th style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">Received</th>
                          <th style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">Unit</th>
                          <th style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">Orig. Cost</th>
                          <th style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">Recv. Cost</th>
                          <th style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">New Cost</th>
                          <th style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">Total</th>
                          <th style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">Batch #</th>
                          <th style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">Expiry</th>
                          <th style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">Godown</th>
                          <th style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">Zone</th>
                          <th style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${items.map(item => `
                          <tr>
                            <td style="border: 1px solid #e5e7eb; padding: 6px;">${item.description || ''}</td>
                            <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">${item.orderedQuantity || 0}</td>
                            <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">${item.receivedQuantity || 0}</td>
                            <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">${item.unit || ''}</td>
                            <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">${(item.originalUnitCost || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                            <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">${(item.receivingCostPerUnit || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                            <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">${(item.unitCost || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                            <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">${(item.totalWithReceivingCost || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                            <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">${item.batchNumber || ''}</td>
                            <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">${item.expiryDate || ''}</td>
                            <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">${item.destinationGodownName || item.destinationGodownId || ''}</td>
                            <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">${item.destinationZoneName || ''}</td>
                            <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">${item.remarks || ''}</td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>
                `;
              });
              
              // Display unassigned items if any
              if (unassignedItems.length > 0) {
                html += `
                  <div class="mb-6">
                    <div class="font-bold mb-2" style="background-color: #fff3cd; padding: 8px; border-radius: 4px; border: 1px solid #ffeaa7;">
                      Unassigned Items (No Supplier Specified)
                    </div>
                    <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px;">
                      <thead>
                        <tr style="background-color: #f3f4f6;">
                          <th style="border: 1px solid #e5e7eb; padding: 6px; text-align: left;">Description</th>
                          <th style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">Ordered</th>
                          <th style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">Received</th>
                          <th style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">Unit</th>
                          <th style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">Orig. Cost</th>
                          <th style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">Recv. Cost</th>
                          <th style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">New Cost</th>
                          <th style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">Total</th>
                          <th style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">Batch #</th>
                          <th style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">Expiry</th>
                          <th style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">Godown</th>
                          <th style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">Zone</th>
                          <th style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${unassignedItems.map(item => `
                          <tr>
                            <td style="border: 1px solid #e5e7eb; padding: 6px;">${item.description || ''}</td>
                            <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">${item.orderedQuantity || 0}</td>
                            <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">${item.receivedQuantity || 0}</td>
                            <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">${item.unit || ''}</td>
                            <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">${(item.originalUnitCost || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                            <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">${(item.receivingCostPerUnit || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                            <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">${(item.unitCost || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                            <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">${(item.totalWithReceivingCost || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                            <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">${item.batchNumber || ''}</td>
                            <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">${item.expiryDate || ''}</td>
                            <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">${item.destinationGodownName || item.destinationGodownId || ''}</td>
                            <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">${item.destinationZoneName || ''}</td>
                            <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">${item.remarks || ''}</td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>
                `;
              }
              
              return html;
            })()}
          </div>
          
          <div class="mt-4">
            <div class="font-bold mb-2">RECEIVING COSTS:</div>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background-color: #f3f4f6;">
                  <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: left;">Cost Description</th>
                  <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${(grnData.receivingCosts || []).map(cost => `
                  <tr>
                    <td style="border: 1px solid #e5e7eb; padding: 8px;">${cost.description || ''}</td>
                    <td style="border: 1px solid #e5e7eb; padding: 8px; text-align: right;">${cost.amount || 0}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="mt-4">
            <div class="font-bold mb-1">QUALITY CHECK NOTES:</div>
            <div class="text-sm">${grnData.qualityCheckNotes || 'N/A'}</div>
          </div>
          
          <div class="mt-4">
            <div class="font-bold mb-1">DISCREPANCIES:</div>
            <div class="text-sm">${grnData.discrepancies || 'N/A'}</div>
          </div>
          
          <div class="text-center mt-8 pt-4 border-t">
            <div class="text-sm font-bold">Thank you for your delivery!</div>
            <div class="text-sm">Goods received and verified.</div>
          </div>
        </div>
      `;
    } catch (error) {
      console.error('Error generating GRN HTML:', error);
      return `<div class="error">Error generating GRN content: ${error.message}</div>`;
    }
  };
  
  // Function to generate clean purchase order HTML for printing
  const generateCleanPurchaseOrderHTML = (): string => {
    return `
      <div class="po-container" style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <style>
          body { margin: 0; padding: 20px; }
          .po-container { border: 1px solid #ccc; }
          .text-center { text-align: center; }
          .border-b-2 { border-bottom: 2px solid #000; }
          .pb-2 { padding-bottom: 0.5rem; }
          .font-bold { font-weight: bold; }
          .text-2xl { font-size: 1.5rem; }
          .text-sm { font-size: 0.875rem; }
          .mb-1 { margin-bottom: 0.25rem; }
          .mb-2 { margin-bottom: 0.5rem; }
          .mt-4 { margin-top: 1rem; }
          .mt-8 { margin-top: 2rem; }
          .pt-4 { padding-top: 1rem; }
          .border-t { border-top: 1px solid #ccc; }
          .grid { display: grid; }
          .gap-8 { gap: 2rem; }
          .gap-4 { gap: 1rem; }
          .grid-cols-1 { grid-template-columns: 1fr; }
          .grid-cols-2 { grid-template-columns: 1fr 1fr; }
          .grid-cols-3 { grid-template-columns: 1fr 1fr 1fr; }
          .border { border: 1px solid #e5e7eb; }
          .p-3 { padding: 0.75rem; }
          .rounded { border-radius: 0.25rem; }
          .font-medium { font-weight: 500; }
        </style>
        <div class="text-center border-b-2 pb-2">
          <h2 class="text-2xl font-bold">PURCHASE ORDER</h2>
          <p class="text-sm">PO #: ${purchaseOrderData.poNumber || 'PO_NUMBER'}</p>
          <p class="text-sm">Date: ${purchaseOrderData.date || new Date().toLocaleDateString()}</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
          <div>
            <div class="font-bold mb-1">BUSINESS INFORMATION:</div>
            <div class="text-sm mb-1">
              <span class="font-medium">Name:</span> ${purchaseOrderData.businessName}
            </div>
            <div class="text-sm mb-1">
              <span class="font-medium">Address:</span> ${purchaseOrderData.businessAddress}
            </div>
            <div class="text-sm mb-1">
              <span class="font-medium">Phone:</span> ${purchaseOrderData.businessPhone}
            </div>
            <div class="text-sm mb-1">
              <span class="font-medium">Email:</span> ${purchaseOrderData.businessEmail}
            </div>
          </div>
          
          <div>
            <div class="font-bold mb-1">SUPPLIER INFORMATION:</div>
            <div class="text-sm mb-1">
              <span class="font-medium">Name:</span> ${purchaseOrderData.supplierName}
            </div>
            <div class="text-sm mb-1">
              <span class="font-medium">Address:</span> ${purchaseOrderData.supplierAddress}
            </div>
            <div class="text-sm mb-1">
              <span class="font-medium">Phone:</span> ${purchaseOrderData.supplierPhone}
            </div>
            <div class="text-sm mb-1">
              <span class="font-medium">Email:</span> ${purchaseOrderData.supplierEmail}
            </div>
          </div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
          <div>
            <div class="font-bold mb-1">DELIVERY DETAILS:</div>
            <div class="text-sm mb-1">
              <span class="font-medium">Expected Delivery:</span> ${purchaseOrderData.expectedDelivery || 'N/A'}
            </div>
            <div class="text-sm mb-1">
              <span class="font-medium">Delivery Instructions:</span> ${purchaseOrderData.deliveryInstructions}
            </div>
          </div>
          
          <div>
            <div class="font-bold mb-1">PAYMENT TERMS:</div>
            <div class="text-sm mb-1">
              <span class="font-medium">Payment Terms:</span> ${purchaseOrderData.paymentTerms}
            </div>
            <div class="text-sm mb-1">
              <span class="font-medium">Authorized By:</span> ${purchaseOrderData.authorizedByName}
            </div>
            <div class="text-sm mb-1">
              <span class="font-medium">Authorization Date:</span> ${purchaseOrderData.authorizationDate || 'N/A'}
            </div>
          </div>
        </div>
        
        <div class="mt-4">
          <div class="font-bold mb-2">ITEMS ORDERED:</div>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="border: 1px solid #e5e7eb; padding: 6px; text-align: left;">Description</th>
                <th style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">Quantity</th>
                <th style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">Unit</th>
                <th style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">Unit Price</th>
                <th style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${(purchaseOrderData.items || []).map(item => `
                <tr>
                  <td style="border: 1px solid #e5e7eb; padding: 6px;">${item.description || ''}</td>
                  <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">${item.quantity || 0}</td>
                  <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">${item.unit || ''}</td>
                  <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">${formatCurrency(item.unitPrice || 0)}</td>
                  <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">${formatCurrency(item.total || 0)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div class="mt-4">
          <div class="font-bold mb-1">NOTES:</div>
          <div class="text-sm">${purchaseOrderData.notes || 'N/A'}</div>
        </div>
        
        <div class="mt-8 pt-4 border-t">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div class="font-bold mb-1">AUTHORIZED SIGNATURE:</div>
              <div class="text-sm">${purchaseOrderData.authorizedBySignature || 'N/A'}</div>
            </div>
            <div class="text-right">
              <div class="font-bold mb-1">TOTAL AMOUNT:</div>
              <div class="text-xl font-bold">${formatCurrency(purchaseOrderData.total || 0)}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  };
  
  // Function to download customer settlement as PDF
  const downloadCustomerSettlementAsPDF = () => {
    // Show a loading message to the user
    const loadingMsg = 'Generating PDF... Please wait.';
    const loadingEl = document.createElement('div');
    loadingEl.style.position = 'fixed';
    loadingEl.style.top = '10px';
    loadingEl.style.right = '10px';
    loadingEl.style.backgroundColor = '#3b82f6';
    loadingEl.style.color = 'white';
    loadingEl.style.padding = '10px 15px';
    loadingEl.style.borderRadius = '4px';
    loadingEl.style.zIndex = '10000';
    loadingEl.textContent = loadingMsg;
    document.body.appendChild(loadingEl);
    
    import('html2pdf.js').then((html2pdfModule) => {
      const customerSettlementContent = generateCleanCustomerSettlementHTML();
      
      // Create a temporary container to hold the customer settlement content
      const tempContainer = document.createElement('div');
      tempContainer.innerHTML = customerSettlementContent;
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.width = '800px';
      tempContainer.style.fontFamily = 'Arial, sans-serif';
      tempContainer.style.fontSize = '14px';
      document.body.appendChild(tempContainer);
      
      // Configure PDF options
      const opt = {
        margin: 5,
        filename: `Customer_Settlement_${customerSettlementData.referenceNumber || 'unknown'}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true,
          logging: false,
          width: tempContainer.scrollWidth,
          windowWidth: tempContainer.scrollWidth
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
      };
      
      // Generate PDF
      html2pdfModule.default(tempContainer, opt)
        .then(() => {
          // Remove temporary container after PDF generation
          if (tempContainer.parentNode) {
            tempContainer.parentNode.removeChild(tempContainer);
          }
          // Remove loading message
          if (loadingEl.parentNode) {
            loadingEl.parentNode.removeChild(loadingEl);
          }
          console.log('PDF generated successfully');
        })
        .catch((error) => {
          console.error('Error generating PDF:', error);
          // Remove loading message
          if (loadingEl.parentNode) {
            loadingEl.parentNode.removeChild(loadingEl);
          }
          alert('Error generating PDF. Please try again.');
        });
    }).catch((error) => {
      console.error('Error importing html2pdf.js:', error);
      // Remove loading message
      if (loadingEl.parentNode) {
        loadingEl.parentNode.removeChild(loadingEl);
      }
      alert('Error loading PDF generator. Please try again.');
    });
  };
  
  const handleDeleteTemplate = (templateId: string) => {
    setTemplates(prev => prev.filter(t => t.id !== templateId));
  };
  
  const handleDuplicateTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      const newTemplate = {
        ...template,
        id: Date.now().toString(),
        name: `${template.name} (Copy)`,
        lastModified: new Date().toISOString().split('T')[0]
      };
      setTemplates(prev => [...prev, newTemplate]);
    }
  };
  
  const handleSetActiveTemplate = (templateId: string) => {
    setTemplates(prev => prev.map(t => ({
      ...t,
      isActive: t.id === templateId
    })));
  };
  
  const handleExportTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      const dataStr = JSON.stringify(template, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `${template.name.replace(/\s+/g, '_')}_template.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    }
  };
  
  const handleImportTemplate = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const templateData = JSON.parse(e.target?.result as string);
          const newTemplate = {
            ...templateData,
            id: Date.now().toString(),
            lastModified: new Date().toISOString().split('T')[0]
          };
          setTemplates(prev => [...prev, newTemplate]);
        } catch (error) {
          console.error('Error importing template:', error);
          alert('Error importing template. Please check the file format.');
        }
      };
      reader.readAsText(file);
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleApplyToReceiptSystem = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template && template.type === "receipt") {
      // Get current template config
      const config = getTemplateConfig();
      
      // Update with template content
      const updatedConfig: ReceiptTemplateConfig = {
        ...config,
        customTemplate: true,
        templateHeader: template.content.split('\n\n')[0] || "",
        templateFooter: template.content.split('\n\n').pop() || "",
      };
      
      // Save to localStorage
      saveTemplateConfig(updatedConfig);
      
      alert(`Template "${template.name}" applied to receipt system successfully!`);
    } else {
      alert("Only receipt templates can be applied to the receipt system.");
    }
  };
  
  const handlePrintPreview = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      // Handle Supplier Purchase Note separately
      if (template.type === "supplier-purchase-note") {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          const htmlContent = generateSupplierPurchaseNoteHTML();
          printWindow.document.write(htmlContent);
          printWindow.document.close();
        }
        return;
      }
      
      // Create a mock transaction for preview
      const mockTransaction = {
        id: "TXN-001",
        receiptNumber: "INV-2023-001",
        items: [
          { name: "Product 1", price: 10.00, quantity: 2, total: 20.00 },
          { name: "Product 2", price: 15.00, quantity: 1, total: 15.00 }
        ],
        subtotal: 35.00,
        tax: 6.30,
        discount: 5.00,
        total: 36.30,
        paymentMethod: "Cash",
        amountReceived: 40.00,
        change: 3.70,
        customer: {
          name: "John Doe",
          phone: "(555) 123-4567",
          email: "john@example.com"
        }
      };
      
      // Print using the existing PrintUtils
      PrintUtils.printReceipt(mockTransaction);
    }
  };

  // Handle delivery note data changes
  const handleDeliveryNoteChange = (field: keyof DeliveryNoteData, value: string | number) => {
    setDeliveryNoteData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle outlet selection from dropdown
  const handleOutletSelect = (outlet: Outlet) => {
    setDeliveryNoteData(prev => ({
      ...prev,
      customerName: outlet.name,
      customerAddress1: outlet.location || '',
      customerPhone: outlet.phone || '',
      customerEmail: outlet.email || ''
    }));
    setFilteredOutlets([]);
    setShowOutletDropdown(false);
  };

  // Handle product selection from GRN dropdown
  const handleGrnProductSelect = (productName: string, itemId: string) => {
    const selectedProduct = grnProductItems.find(p => p.name === productName);
    if (selectedProduct) {
      setGrnData(prev => ({
        ...prev,
        items: prev.items.map(item => 
          item.id === itemId ? { 
            ...item, 
            description: productName,
            unit: selectedProduct.unit_of_measure || item.unit,
            unitCost: selectedProduct.cost_price || item.unitCost,
            productId: selectedProduct.id // Store the product ID for stock updates
          } : item
        )
      }));
    }
    setShowGrnDropdown(false);
  };

  // Handle received quantity changes and update product stock
  const handleReceivedQuantityChange = (itemId: string, newQuantity: number) => {
    // Only update the GRN data - stock will be updated when the GRN is saved
    setGrnData(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.id === itemId ? { ...item, receivedQuantity: newQuantity } : item
      )
    }));
  };

  // Filter outlets based on customer name input
  const filterOutlets = (searchTerm: string) => {
    // Don't filter if outlets are still loading
    if (loadingOutlets) {
      return;
    }
    
    if (!searchTerm.trim()) {
      // When search term is empty, show all outlets
      setFilteredOutlets(outlets);
    } else {
      // When searching, show filtered results
      const filtered = outlets.filter(outlet =>
        outlet.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredOutlets(filtered);
    }
  };

  // Handle item changes
  const handleItemChange = async (itemId: string, field: keyof DeliveryNoteItem, value: string | number) => {
    // Validate quantity against available stock when quantity field is changed
    if (field === 'quantity') {
      const item = deliveryNoteData.items.find(item => item.id === itemId);
      if (item && item.description) {
        const productData = deliveryNoteProductItemsMap.get(item.description);
        if (productData) {
          const availableStock = productData.stockQuantity;
          const requestedQuantity = Number(value);
          
          // Show warning if requested quantity exceeds available stock
          if (requestedQuantity > availableStock) {
            const toastMessage = availableStock === 0 
              ? `⚠️ "${item.description}" is OUT OF STOCK. Available: 0`
              : `⚠️ Insufficient stock for "${item.description}". Requested: ${requestedQuantity}, Available: ${availableStock}`;
            
            // Show toast notification
            toast({
              title: "Stock Warning",
              description: toastMessage,
              variant: "destructive",
            });
            
            // Don't prevent the user from entering the quantity, just warn them
            // They can still proceed if they want to create a backorder
          }
        }
      }
    }
    
    // Only validate against available stock when delivered field is changed, not when quantity is changed
    // Quantity field in delivery note is for planning purposes, validation should happen when delivered is set
    if (field === 'delivered') {
      // Check if business name is "KILANGO INVESTMENT LTD" to handle stock validation
      const shouldValidateStock = deliveryNoteData.businessName === "KILANGO INVESTMENT LTD";
      
      // Only validate stock availability for KILANGO INVESTMENT LTD
      if (shouldValidateStock) {
        const item = deliveryNoteData.items.find(item => item.id === itemId);
        if (item && item.description) {
          const oldValue = item.delivered || 0;
          const newValue = Number(value);
          
          // Only validate if the user is trying to increase the delivered quantity
          if (newValue > oldValue) {
            const quantityIncrease = newValue - oldValue;
            const availability = await checkItemAvailability(item.description, quantityIncrease);
            
            if (!availability.available) {
              alert(`Insufficient stock for "${item.description}". Need ${quantityIncrease} more, but only ${availability.availableQuantity} available in GRN: ${availability.grnNumber || 'N/A'}.`);
              return; // Don't update the item
            }
          }
        }
      }
    }
    
    // Check if business name is "KILANGO INVESTMENT LTD" and customer name is from registered outlets
    const isKilangoInvestment = deliveryNoteData.businessName === "KILANGO INVESTMENT LTD";
    const isCustomerFromOutlets = outlets.some(outlet => 
      outlet.name.toLowerCase().trim() === deliveryNoteData.customerName.toLowerCase().trim()
    );
    
    setDeliveryNoteData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, [field]: value };
          
          // If quantity or rate changes, update amount
          if (field === 'quantity' || field === 'rate') {
            const newQuantity = field === 'quantity' ? Number(value) : item.quantity;
            const newRate = field === 'rate' ? Number(value) : item.rate;
            updatedItem.amount = newQuantity * newRate;
          }
          
          // If delivered field changes and conditions are met, update GRN quantities immediately
          if (field === 'delivered' && isKilangoInvestment && isCustomerFromOutlets) {
            const newDelivered = Number(value);
            
            // For immediate validation, we'll schedule the check after state update
            setTimeout(async () => {
              const oldValue = item.delivered || 0;
              
              // Only validate if the user is trying to increase the delivered quantity
              if (newDelivered > oldValue) {
                const quantityIncrease = newDelivered - oldValue;
                const availability = await checkItemAvailability(item.description, quantityIncrease);
                if (!availability.available && quantityIncrease > 0) {
                  alert(`Insufficient stock for "${item.description}". Need ${quantityIncrease} more, but only ${availability.availableQuantity} available in GRN: ${availability.grnNumber || 'N/A'}.`);
                  
                  // Reset the delivered value to the previous value
                  setDeliveryNoteData(prev => ({
                    ...prev,
                    items: prev.items.map(i => {
                      if (i.id === itemId) {
                        return { ...i, delivered: item.delivered || 0 };
                      }
                      return i;
                    })
                  }));
                  return;
                }
              }
              
              const deliveredDifference = newDelivered - (item.delivered || 0);
              
              if (Math.abs(deliveredDifference) > 0) { // Only update if there's a change
                // Update GRN quantities based on the delivered difference
                const deliveredItems = [{
                  description: item.description,
                  delivered: deliveredDifference  // Use the difference to adjust inventory
                }];
                
                // Removed redundant GRN and product stock updates - outlet inventory update handles this
              }
            }, 0);
          }
          
          return updatedItem;
        }
        return item;
      })
    }));
  };

  // Add new item
  const handleAddItem = () => {
    setDeliveryNoteData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: Date.now().toString(),
          description: "",
          quantity: 0,
          unit: "",
          rate: 0,
          amount: 0,
          delivered: 0,
          remarks: "",
          godownId: "",
          godownName: "",
          zoneId: "",
          zoneName: ""
        }
      ]
    }));
  };

  // Remove item
  const handleRemoveItem = (itemId: string) => {
    setDeliveryNoteData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }));
  };

  // Calculate totals
  const calculateTotals = () => {
    const totalItems = deliveryNoteData.items.length;
    const totalQuantity = deliveryNoteData.items.reduce((sum, item) => sum + Number(item.quantity || item.delivered || 0), 0);
    const totalPackages = deliveryNoteData.items.reduce((count, item) => 
      item.unit && (item.quantity || item.delivered) ? count + 1 : count, 0
    );
    
    return { totalItems, totalQuantity, totalPackages };
  };

  // Validate required delivery note fields
  const validateDeliveryNoteRequiredFields = (): boolean => {
    // Validation disabled - allow saving without required fields
    return true;
  };

  // Save delivery note to localStorage
  // Function to save delivery note to the global saved deliveries system
  const handleSaveDeliveryNote = async () => {
    // Validate required fields
    if (!validateDeliveryNoteRequiredFields()) {
      return;
    }

    // Prevent double submission
    if (isSavingDeliveryNote) {
      console.warn('⚠️ Save already in progress...');
      return;
    }

    // Set saving state to true
    setIsSavingDeliveryNote(true);

    // Use the same approach as handleSaveTemplate for delivery notes
    const currentTemplate = templates.find(t => t.id === selectedTemplate || t.id === viewingTemplate);
    
    if (currentTemplate?.type === "delivery-note") {
      // For delivery note templates, automatically save to saved deliveries
      try {
        // Check if business name is "KILANGO INVESTMENT LTD" and customer name is from registered outlets
        const isKilangoInvestment = deliveryNoteData.businessName === "KILANGO INVESTMENT LTD";
        const isCustomerFromOutlets = outlets.some(outlet => 
          outlet.name.toLowerCase().trim() === deliveryNoteData.customerName.toLowerCase().trim()
        );
        
        // Validate that all delivered quantities are available before saving
        let hasUnavailableItems = false;
        for (const item of deliveryNoteData.items) {
          if (item.description && item.delivered > 0) {
            const availability = await checkItemAvailability(item.description, item.delivered);
            if (!availability.available) {
              alert(`Insufficient stock for "${item.description}". Available: ${availability.availableQuantity} in GRN: ${availability.grnNumber || 'N/A'}. Please reduce the delivered quantity.`);
              hasUnavailableItems = true;
              break;
            }
          }
        }
        
        if (hasUnavailableItems) {
          return; // Don't save if there are unavailable items
        }

        // Calculate total items (sum of all quantities)
        const totalItems = deliveryNoteData.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
        
        // Calculate total amount based on rates and quantities
        const totalAmount = deliveryNoteData.items.reduce((sum, item) => sum + (item.rate * (item.quantity || 0)), 0);
        
        // Find the outlet ID if the customer is from registered outlets
        let outletId: string | undefined;
        if (isCustomerFromOutlets) {
          const matchedOutlet = outlets.find(outlet => 
            outlet.name.toLowerCase().trim() === deliveryNoteData.customerName.toLowerCase().trim()
          );
          outletId = matchedOutlet?.id;
        }

        // Create delivery data for saving
        const deliveryToSave: DeliveryData = {
          id: deliveryNoteData.deliveryNoteNumber, // Use delivery note number as ID
          deliveryNoteNumber: deliveryNoteData.deliveryNoteNumber,
          date: deliveryNoteData.date,
          customer: deliveryNoteData.customerName, // Use customerName instead of clientName
          items: totalItems, // Total number of items
          total: totalAmount,
          paymentMethod: 'N/A', // Templates don't have payment method
          status: 'completed', // For templates, mark as completed
          itemsList: deliveryNoteData.items.map(item => {
            // Resolve product ID from grnProductItems by matching name to description
            const matchedProduct = grnProductItems.find(p => 
              p.name.toLowerCase().trim() === item.description.toLowerCase().trim()
            );
            return {
              id: item.id,
              product_id: matchedProduct?.id || undefined, // Resolved product ID for godown stock updates
              name: item.description,
              quantity: item.quantity, // Use quantity field for the saved record
              unit: item.unit,
              rate: item.rate,
              amount: item.amount,
              delivered: item.quantity, // Also update delivered to match quantity
              remarks: item.remarks,
              price: item.rate, // Use rate as the price for delivery items
              total: item.amount, // Use amount as the total for delivery items
              // Per-item godown/zone for multi-godown deliveries
              godown_id: item.godownId || undefined,
              zone_id: item.zoneId || undefined,
              godown_name: item.godownName || undefined,
              zone_name: item.zoneName || undefined
            };
          }),
          subtotal: deliveryNoteData.subtotal || totalAmount, // Use the calculated subtotal from deliveryNoteData
          tax: deliveryNoteData.tax,
          discount: deliveryNoteData.discount,
          amountReceived: deliveryNoteData.amountPaid,
          change: deliveryNoteData.amountPaid ? deliveryNoteData.amountPaid - totalAmount : 0,
          vehicle: deliveryNoteData.vehicle,
          driver: deliveryNoteData.driver,
          deliveryNotes: deliveryNoteData.deliveryNotes,
          outletId: outletId,
          creditBroughtForward: deliveryNoteData.creditBroughtForward || 0,
          // Godown integration fields - use first item's godown as delivery-level reference
          sourceType: 'investment',
          sourceGodownId: deliveryNoteData.items.find(i => i.godownId)?.godownId || undefined,
          sourceZoneId: deliveryNoteData.items.find(i => i.godownId)?.zoneId || undefined,
          sourceGodownName: deliveryNoteData.items.find(i => i.godownId)?.godownName || '',
          sourceZoneName: deliveryNoteData.items.find(i => i.godownId)?.zoneName || '',
          // Additional fields from DeliveryDetails view (matching exact View Display)
          businessName: deliveryNoteData.businessName,
          businessAddress: deliveryNoteData.businessAddress,
          preparedByName: deliveryNoteData.preparedByName,
          preparedByDate: deliveryNoteData.preparedByDate,
          driverName: deliveryNoteData.driverName,
          driverDate: deliveryNoteData.driverDate,
          receivedByName: deliveryNoteData.receivedByName,
          receivedByDate: deliveryNoteData.receivedByDate
        };
        
        // CRITICAL DIAGNOSTIC: Log godown integration data before save
        console.log('🔍 PRE-SAVE GODOWN DIAGNOSTICS:');
        console.log('   sourceGodownId:', sourceGodownId);
        console.log('   sourceZoneId:', sourceZoneId);
        console.log('   deliveryToSave.sourceGodownId:', deliveryToSave.sourceGodownId);
        console.log('   deliveryToSave.sourceZoneId:', deliveryToSave.sourceZoneId);
        console.log('   deliveryToSave.sourceType:', deliveryToSave.sourceType);
        console.log('   deliveryToSave.itemsList:', deliveryToSave.itemsList?.map(i => ({ name: i.name, product_id: i.product_id, quantity: i.quantity })));
        
        await saveDelivery(deliveryToSave);
        console.log('✅ saveDelivery() completed');
        console.log('📊 Delivery status saved as:', deliveryToSave.status);
        console.log('ℹ️ No JavaScript inventory update should happen - checking for database triggers...');
        
        // CRITICAL DIAGNOSTIC: Log what we're about to do
        console.log('📋 Next steps:');
        console.log('   1. Update GRN quantities (grn_items table)');
        console.log('   2. Update product stock (products table)');
        console.log('   3. DO NOT update outlet inventory (inventory_products table)');
        console.log('   4. If database trigger fires (status="delivered"), it will update inventory_products automatically');
        console.log('   5. Current status is "completed" so trigger should NOT fire');
        
        // Update GRN quantities for consumed items based on quantity field
        const quantityItems = deliveryNoteData.items.map(item => ({
          description: item.description,
          delivered: item.quantity || 0  // Use quantity field for inventory reduction
        }));
        
        // Update GRN soldout quantities (this tracks what was delivered from GRN)
        try {
          console.log('📉 Updating GRN quantities for delivered items...');
          await updateGRNQuantitiesBasedOnDelivered(quantityItems);
          console.log('✅ GRN quantities updated successfully');
        } catch (error) {
          console.error('❌ Error updating GRN quantities:', error);
          // Continue even if GRN update fails
        }
        
        // Update product stock in products table (decrement stock)
        try {
          console.log('📉 Decrementing product stock for delivered items...');
          await updateProductStockBasedOnDelivered(quantityItems);
          console.log('✅ Product stock decremented successfully');
        } catch (error) {
          console.error('❌ Error updating product stock:', error);
          // Continue even if product stock update fails
        }
        
        // NOTE: Outlet inventory update is handled by saveDelivery() in deliveryUtils.ts
        // No need to update it here to avoid double-updating
        
        // CRITICAL: Invalidate godown stock cache so next delivery note shows fresh quantities
        console.log('🔄 Invalidating godown stock cache for next delivery...');
        setLoadedGodownProducts(new Set());
        setProductGodownMap(new Map());
        setProductGodownZoneMap(new Map());
        console.log('✅ Godown stock cache cleared - quantities will be re-fetched from database');
        
        if (isKilangoInvestment && isCustomerFromOutlets) {
          alert(`Delivery Note ${deliveryNoteData.deliveryNoteNumber} saved successfully to Saved Deliveries!\nGRN and product database quantities updated based on quantity for KILANGO INVESTMENT LTD.\n\n✅ Outlet inventory has been updated with delivered products.`);
        } else {
          alert(`Delivery Note ${deliveryNoteData.deliveryNoteNumber} saved successfully to Saved Deliveries!\nGRN and product database quantities updated based on quantity.`);
        }
        
        // Show the delivery note options dialog after saving
        showDeliveryNoteOptionsDialog();
        
        // Don't reset here - let the user choose an option first
      } catch (error) {
        console.error('Error saving delivery:', error);
        alert('Error saving delivery. Please try again.');
      } finally {
        // Reset saving state
        setIsSavingDeliveryNote(false);
      }
    } else {
      // For other cases, save to local saved delivery notes
      try {
      // For other cases, save to local saved delivery notes
      if (!deliveryNoteData.deliveryNoteNumber || !deliveryNoteData.deliveryNoteNumber.trim()) {
        const deliveryNoteNumber = getNextDeliveryNoteNumber();
        
        // Also update the delivery note number in the data
        setDeliveryNoteData(prev => ({
          ...prev,
          deliveryNoteNumber: deliveryNoteNumber
        }));
      }
      
      // Calculate totals before saving
      const totals = calculateTotals();
      
      const newSavedNote: SavedDeliveryNote = {
        id: Date.now().toString(),
        name: deliveryNoteData.deliveryNoteNumber || getNextDeliveryNoteNumber(),
        data: {
          ...deliveryNoteData,
          totalQuantity: totals.totalQuantity, // Save calculated total
          totalItems: totals.totalItems,
          totalPackages: totals.totalPackages
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const updatedNotes = [...savedDeliveryNotes, newSavedNote];
      setSavedDeliveryNotes(updatedNotes);
      localStorage.setItem('savedDeliveryNotes', JSON.stringify(updatedNotes));
      
      alert(`Delivery note "${newSavedNote.name}" saved successfully!`);
      
      // Auto-increment and reset for next delivery note
      setTimeout(() => {
        resetAndIncrementDeliveryNote();
      }, 500);
      } catch (error) {
        console.error('Error saving delivery note:', error);
        alert('Error saving delivery note. Please try again.');
      } finally {
        // Reset saving state
        setIsSavingDeliveryNote(false);
      }
    }
  };

  // Load a saved delivery note
  const handleLoadDeliveryNote = (noteId: string) => {
    const note = savedDeliveryNotes.find(n => n.id === noteId);
    if (note) {
      setDeliveryNoteData(note.data);
      setActiveTab("preview"); // Switch to preview tab to show the loaded data
      alert(`Delivery note "${note.name}" loaded successfully!`);
    }
  };

  // View a saved delivery note in a new window/tab
  const handleViewDeliveryNote = (noteId: string) => {
    const note = savedDeliveryNotes.find(n => n.id === noteId);
    if (note) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const viewedData = note.data;
        const totalItems = viewedData.items.length;
        const totalQuantity = viewedData.items.reduce((sum, item) => sum + Number(item.quantity || item.delivered || 0), 0);
        const totalPackages = viewedData.items.reduce((count, item) => 
          item.unit && (item.quantity || item.delivered) ? count + 1 : count, 0
        );
        const subtotal = viewedData.items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
        const total = subtotal + Number(viewedData.tax || 0) - Number(viewedData.discount || 0);
        const amountDue = total - Number(viewedData.amountPaid || 0) + Number(viewedData.creditBroughtForward || 0);
        const printContent = buildDeliveryNotePrintHTML(
          viewedData,
          { totalItems, totalQuantity, totalPackages },
          { subtotal, total, amountDue },
          { autoPrint: true }
        );
        printWindow.document.write(printContent);
        printWindow.document.close();
      }
    }
  };

  // Delete a saved delivery note
  const handleDeleteSavedNote = (noteId: string) => {
    const updatedNotes = savedDeliveryNotes.filter(n => n.id !== noteId);
    setSavedDeliveryNotes(updatedNotes);
    localStorage.setItem('savedDeliveryNotes', JSON.stringify(updatedNotes));
    alert("Saved delivery note deleted successfully!");
  };

  // Print delivery note
  const handlePrintDeliveryNote = () => {
    // Validate required fields
    if (!validateDeliveryNoteRequiredFields()) {
      return;
    }

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const totals = calculateTotals();
      const noteTotals = calculateDeliveryNoteTotals();
      const printContent = buildDeliveryNotePrintHTML(deliveryNoteData, totals, noteTotals, { autoPrint: true, autoClose: true });
      printWindow.document.write(printContent);
      printWindow.document.close();
    }
  };

  // Download delivery note as PDF
  const handleDownloadDeliveryNote = () => {
    // Validate required fields
    if (!validateDeliveryNoteRequiredFields()) {
      return;
    }

    const totals = calculateTotals();
    const noteTotals = calculateDeliveryNoteTotals();
    const htmlContent = buildDeliveryNotePrintHTML(deliveryNoteData, totals, noteTotals);

    // Create a Blob with the HTML content
    const blob = new Blob([htmlContent], { type: 'text/html' });
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Delivery_Note_${deliveryNoteData.deliveryNoteNumber}.html`;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle purchase order data changes
  const handlePurchaseOrderChange = (field: keyof PurchaseOrderData | 'requestedBy' | 'approvedBy', value: string | number) => {
    setPurchaseOrderData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle purchase order item changes
  const handlePurchaseOrderItemChange = (itemId: string, field: keyof PurchaseOrderItem | 'unit', value: string | number) => {
    setPurchaseOrderData(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.id === itemId ? { ...item, [field]: value } : item
      )
    }));
  };

  // Add new purchase order item
  const handleAddPurchaseOrderItem = () => {
    setPurchaseOrderData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: Date.now().toString(),
          description: "",
          quantity: 1,
          unit: "EA",
          unitPrice: 0,
          total: 0
        }
      ]
    }));
  };

  // Remove purchase order item
  const handleRemovePurchaseOrderItem = (itemId: string) => {
    setPurchaseOrderData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }));
  };

  // Calculate purchase order totals
  const calculatePurchaseOrderTotals = () => {
    const subtotal = purchaseOrderData.items.reduce((sum, item) => sum + Number(item.total || 0), 0);
    const tax = subtotal * 0.085; // 8.5% tax
    const total = subtotal + tax + Number(purchaseOrderData.shipping || 0) - Number(purchaseOrderData.discount || 0);
    
    return { subtotal, tax, total };
  };
  
  // Handle sales order data changes
  const handleSalesOrderChange = (field: keyof SalesOrderData, value: string | number) => {
    setSalesOrderData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle sales order item changes
  const handleSalesOrderItemChange = (itemId: string, field: keyof SalesOrderItem | 'unit', value: string | number) => {
    setSalesOrderData(prev => {
      // Update the specific item field
      const updatedItems = prev.items.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, [field]: value };
          
          // If quantity or unitPrice changed, recalculate the item's total
          if (field === 'quantity') {
            updatedItem.total = updatedItem.quantity * updatedItem.unitPrice;
          } else if (field === 'unitPrice') {
            updatedItem.total = updatedItem.quantity * value;
          }
          
          return updatedItem;
        }
        return item;
      });
      
      // Calculate subtotal from ALL items' total column
      const subtotal = updatedItems.reduce((sum, item) => sum + Number(item.total || 0), 0);
      const taxAmount = subtotal * (Number(prev.taxRate) / 100);
      const total = subtotal - Number(prev.discount) + taxAmount + Number(prev.shippingCost);
      
      return {
        ...prev,
        items: updatedItems,
        subtotal,
        taxAmount,
        total
      };
    });
  };

  // Add new sales order item
  const handleAddSalesOrderItem = () => {
    setSalesOrderData(prev => {
      const newItems = [
        ...prev.items,
        {
          id: Date.now().toString(),
          description: "",
          quantity: 1,
          unit: "EA",
          unitPrice: 0,
          total: 0
        }
      ];
      
      // Recalculate totals with new item
      const subtotal = newItems.reduce((sum, item) => sum + Number(item.total || 0), 0);
      const taxAmount = subtotal * (Number(prev.taxRate) / 100);
      const total = subtotal - Number(prev.discount) + taxAmount + Number(prev.shippingCost);
      
      return {
        ...prev,
        items: newItems,
        subtotal,
        taxAmount,
        total
      };
    });
  };

  // Remove sales order item
  const handleRemoveSalesOrderItem = (itemId: string) => {
    setSalesOrderData(prev => {
      const updatedItems = prev.items.filter(item => item.id !== itemId);
      
      // Recalculate totals after removing item
      const subtotal = updatedItems.reduce((sum, item) => sum + Number(item.total || 0), 0);
      const taxAmount = subtotal * (Number(prev.taxRate) / 100);
      const total = subtotal - Number(prev.discount) + taxAmount + Number(prev.shippingCost);
      
      return {
        ...prev,
        items: updatedItems,
        subtotal,
        taxAmount,
        total
      };
    });
  };

  // Calculate sales order totals (used when discount/tax/shipping changes)
  const calculateSalesOrderTotals = () => {
    return new Promise<{ subtotal: number; taxAmount: number; total }>((resolve) => {
      setSalesOrderData(prev => {
        const subtotal = prev.items.reduce((sum, item) => sum + Number(item.total || 0), 0);
        const taxAmount = subtotal * (Number(prev.taxRate) / 100);
        const total = subtotal - Number(prev.discount) + taxAmount + Number(prev.shippingCost);
        
        resolve({ subtotal, taxAmount, total });
        
        return {
          ...prev,
          subtotal,
          taxAmount,
          total
        };
      });
    });
  };
  
  // Handle invoice data changes
  const handleInvoiceChange = (field: keyof InvoiceData, value: string | number) => {
    setInvoiceData(prev => {
      // Prevent changes to invoice number, date, and timestamp
      if (field === 'invoiceNumber' || field === 'invoiceDate' || field === 'timestamp') {
        return prev;
      }
      
      return {
        ...prev,
        [field]: value
      };
    });
  };
  
  // Handle invoice item changes
  const handleInvoiceItemChange = async (itemId: string, field: keyof InvoiceItem, value: string | number) => {
    // Check if business name is "KILANGO INVESTMENT LTD" to handle stock validation
    const isKilangoInvestment = invoiceData.businessName === "KILANGO INVESTMENT LTD";
    
    // If changing quantity, validate against available stock in GRN only for KILANGO INVESTMENT LTD
    if (field === 'quantity' && isKilangoInvestment) {
      const item = invoiceData.items.find(item => item.id === itemId);
      if (item && item.description) {
        const requestedQuantity = Number(value);
        const availability = await checkItemAvailability(item.description, requestedQuantity);
        
        if (!availability.available) {
          alert(`Insufficient stock for "${item.description}". Available: ${availability.availableQuantity} in GRN: ${availability.grnNumber || 'N/A'}. Please reduce the quantity.`);
          return; // Don't update the item
        }
      }
    }
    
    // Check if business name is "KILANGO INVESTMENT LTD" to handle stock decrement
    // Variable isKilangoInvestment already declared earlier in the function
    
    setInvoiceData(prev => {
      const updatedItems = prev.items.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, [field]: value };
          
          // If quantity or rate changes, update amount
          if (field === 'quantity' || field === 'rate') {
            let effectiveRate = updatedItem.rate;
            if (field === 'quantity') {
              const newQuantity = Number(value);
              updatedItem.amount = newQuantity * effectiveRate;
            } else if (field === 'rate') {
              const newRate = Number(value);
              effectiveRate = newRate;
              updatedItem.amount = updatedItem.quantity * effectiveRate;
            }
            // Update the rate in the item to reflect the discounted rate
            updatedItem.rate = effectiveRate;
          }
          
          return updatedItem;
        }
        return item;
      });
      
      // Calculate new totals
      const subtotal = updatedItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const total = subtotal + Number(prev.tax || 0) - Number(prev.discount || 0);
      const amountDue = total - Number(prev.amountPaid || 0) + Number(prev.creditBroughtForward || 0);
      
      return {
        ...prev,
        items: updatedItems,
        subtotal,
        total,
        amountDue
      };
    });
    
    // If business name is "KILANGO INVESTMENT LTD" and quantity field is changed, decrement stock
    if (isKilangoInvestment && field === 'quantity') {
      const item = invoiceData.items.find(i => i.id === itemId);
      if (item && item.description) {
        setTimeout(async () => {
          try {
            // Get the updated item value after state update
            const updatedItem = invoiceData.items.find(i => i.id === itemId);
            if (!updatedItem) return;
            
            const oldValue = item.quantity || 0;
            const newValue = Number(value);
            
            // Only decrement stock if the user is increasing the quantity
            if (newValue > oldValue) {
              const quantityIncrease = newValue - oldValue;
              
              // Find the product in the database to decrement stock
              const { getProducts } = await import('@/services/databaseService');
              const allProducts = await getProducts();
              const product = allProducts.find(p => 
                p.name.toLowerCase().trim() === item.description.toLowerCase().trim()
              );
              
              if (product) {
                // Decrement the product stock by the quantity increase
                const updatedProduct = await decrementProductStock(product.id!, quantityIncrease);
                if (updatedProduct) {
                  console.log(`Product stock decremented for ${product.name}: ${(product.stock_quantity || 0)} -> ${updatedProduct.stock_quantity}`);
                }
              }
            } else if (newValue < oldValue) {
              // If the user is decreasing the quantity, increment stock (reverse the transaction)
              const quantityDecrease = oldValue - newValue;
              
              // Find the product in the database to increment stock
              const { getProducts } = await import('@/services/databaseService');
              const allProducts = await getProducts();
              const product = allProducts.find(p => 
                p.name.toLowerCase().trim() === item.description.toLowerCase().trim()
              );
              
              if (product) {
                // Increment the product stock by the quantity decrease
                const updatedProduct = await incrementProductStock(product.id!, quantityDecrease);
                if (updatedProduct) {
                  console.log(`Product stock incremented for ${product.name}: ${(product.stock_quantity || 0)} -> ${updatedProduct.stock_quantity} (quantity decreased in invoice)`);
                }
              }
            }
          } catch (error) {
            console.error('Error updating product stock for invoice:', error);
          }
        }, 0);
      }
    }
  };
  
  // Fetch all GRN items for the searchable dropdown with rates and units
  const getAllGRNItems = async () => {
    try {
      const savedGRNs = await getSavedGRNs();
      const itemsMap = new Map<string, { rate: number, unit: string }>(); // description -> { rate, unit }
      
      savedGRNs.forEach(grn => {
        if (grn.data && grn.data.items) {
          grn.data.items.forEach(item => {
            if (item.description) {
              // Type assertion to handle different GRNItem interfaces
              const itemAny = item as any;
              
              // Use the dedicated 'rate' field if available, otherwise fall back to 0 (empty)
              // Do NOT calculate original unit cost as fallback
              const rateValue = (itemAny.rate !== undefined && itemAny.rate !== null) ? 
                             itemAny.rate : 
                             0;
              
              // Store the latest occurrence of each description
              itemsMap.set(item.description, { 
                rate: rateValue, 
                unit: item.unit || ''
              });
            }
          });
        }
      });
      
      return itemsMap;
    } catch (error) {
      console.error('Error fetching GRN items:', error);
      return new Map<string, { rate: number, unit: string }>();
    }
  };
  
  const getAllProductItems = async () => {
    try {
      const products = await getProducts();
      const itemsMap = new Map<string, { rate: number, unit: string, stockQuantity: number }>(); // description -> { rate, unit, stockQuantity }
      
      products.forEach(product => {
        if (product.name) {
          // Use the cost price as the rate and unit of measure as the unit
          itemsMap.set(product.name, { 
            rate: product.cost_price || 0, 
            unit: product.unit_of_measure || 'piece',
            stockQuantity: product.stock_quantity || 0
          });
        }
      });
      
      return itemsMap;
    } catch (error) {
      console.error('Error fetching product items:', error);
      return new Map<string, { rate: number, unit: string, stockQuantity: number }>();
    }
  };

  // Fetch all product items for sales order dropdown (uses selling price)
  const getSalesOrderProductItems = async () => {
    try {
      const products = await getProducts();
      const itemsMap = new Map<string, { rate: number, unit: string }>(); // description -> { selling_price, unit }
      
      products.forEach(product => {
        if (product.name) {
          // Use the selling price for sales orders and unit of measure as the unit
          itemsMap.set(product.name, { 
            rate: product.selling_price || 0, 
            unit: product.unit_of_measure || 'piece'
          });
        }
      });
      
      return itemsMap;
    } catch (error) {
      console.error('Error fetching sales order product items:', error);
      return new Map<string, { rate: number, unit: string }>();
    }
  };
  
  // Fetch all GRN descriptions for the searchable dropdown
  const getAllGRNDescriptions = async (): Promise<string[]> => {
    try {
      const itemsMap = await getAllGRNItems();
      return Array.from(itemsMap.keys());
    } catch (error) {
      console.error('Error fetching GRN descriptions:', error);
      return [];
    }
  };
  
  // State for GRN descriptions
  const [grnDescriptions, setGrnDescriptions] = useState<string[]>([]);
  const [grnItemsMap, setGrnItemsMap] = useState<Map<string, { rate: number, unit: string }>>(new Map());
  
  // Effect to handle dropdown positioning for delivery note, invoice, GRN, and sales order
  useEffect(() => {
    if (showDeliveryNoteDropdown || showDropdown || showGrnDropdown || showSalesOrderDropdown) {
      const updateDropdownPosition = () => {
        const activeInput = document.activeElement;
        if (activeInput instanceof HTMLInputElement) {
          const rect = activeInput.getBoundingClientRect();
          
          // Handle delivery note dropdowns
          if (showDeliveryNoteDropdown) {
            const deliveryDropdowns = document.querySelectorAll('[id^="delivery-note-dropdown-"]');
            deliveryDropdowns.forEach(dropdown => {
              const element = dropdown as HTMLElement;
              element.style.position = 'fixed';
              element.style.top = `${rect.bottom + window.scrollY}px`;
              element.style.left = `${rect.left + window.scrollX}px`;
              element.style.minWidth = `${Math.max(rect.width, 400)}px`;
              element.style.zIndex = '1000';
            });
          }
          
          // Handle invoice dropdowns
          if (showDropdown) {
            const invoiceDropdowns = document.querySelectorAll('[id^="invoice-dropdown-"]');
            invoiceDropdowns.forEach(dropdown => {
              const element = dropdown as HTMLElement;
              element.style.position = 'fixed';
              element.style.top = `${rect.bottom + window.scrollY}px`;
              element.style.left = `${rect.left + window.scrollX}px`;
              element.style.minWidth = `${Math.max(rect.width, 400)}px`;
              element.style.zIndex = '1000';
            });
          }
          
          // Handle GRN dropdowns
          if (showGrnDropdown) {
            const grnDropdowns = document.querySelectorAll('[id^="grn-dropdown-"]');
            grnDropdowns.forEach(dropdown => {
              const element = dropdown as HTMLElement;
              element.style.position = 'fixed';
              element.style.top = `${rect.bottom + window.scrollY}px`;
              element.style.left = `${rect.left + window.scrollX}px`;
              element.style.minWidth = `${Math.max(rect.width, 400)}px`;
              element.style.zIndex = '1000';
            });
          }
          
          // Handle sales order dropdowns
          if (showSalesOrderDropdown) {
            const salesOrderDropdowns = document.querySelectorAll('[id^="sales-order-dropdown-"]');
            salesOrderDropdowns.forEach(dropdown => {
              const element = dropdown as HTMLElement;
              element.style.position = 'fixed';
              element.style.top = `${rect.bottom + window.scrollY}px`;
              element.style.left = `${rect.left + window.scrollX}px`;
              element.style.minWidth = `${Math.max(rect.width, 400)}px`;
              element.style.zIndex = '9999';
            });
          }
        }
      };
      
      // Update position immediately and on scroll/resize
      updateDropdownPosition();
      const scrollHandler = () => updateDropdownPosition();
      const resizeHandler = () => updateDropdownPosition();
      
      window.addEventListener('scroll', scrollHandler, true);
      window.addEventListener('resize', resizeHandler);
      
      return () => {
        window.removeEventListener('scroll', scrollHandler, true);
        window.removeEventListener('resize', resizeHandler);
      };
    }
  }, [showDeliveryNoteDropdown, showDropdown, showGrnDropdown, showSalesOrderDropdown]);
  
  // Load GRN descriptions and items map on component mount
  useEffect(() => {
    const loadGRNData = async () => {
      const itemsMap = await getAllGRNItems();
      setGrnItemsMap(itemsMap);
      setGrnDescriptions(Array.from(itemsMap.keys()));
    };
    
    loadGRNData();
  }, []);
  
  // Show invoice options dialog
  const showInvoiceOptionsDialog = () => {
    // Update invoice date and timestamp to current date/time when saving
    setInvoiceData(prev => ({
      ...prev,
      invoiceDate: new Date().toISOString().split('T')[0],
      timestamp: new Date().toLocaleString()
    }));
    
    setShowInvoiceOptions(true);
  };
  
  // Close invoice options dialog
  const closeInvoiceOptionsDialog = () => {
    setShowInvoiceOptions(false);
  };
  
  // Show delivery note options dialog
  const showDeliveryNoteOptionsDialog = () => {
    // Update delivery note date and timestamp to current date/time when saving
    setDeliveryNoteData(prev => ({
      ...prev,
      date: new Date().toISOString().split('T')[0],
      timestamp: new Date().toLocaleString()
    }));
    
    setShowDeliveryNoteOptions(true);
  };
  
  // Close delivery note options dialog
  const closeDeliveryNoteOptionsDialog = () => {
    setShowDeliveryNoteOptions(false);
  };
  
  // Show customer settlement options dialog
  const showCustomerSettlementOptionsDialog = () => {
    // Update customer settlement date and time to current date/time when saving
    setCustomerSettlementData(prev => ({
      ...prev,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString()
    }));
    
    setShowCustomerSettlementOptions(true);
  };
  
  // Close customer settlement options dialog
  const closeCustomerSettlementOptionsDialog = () => {
    setShowCustomerSettlementOptions(false);
    // Clear the preserved settlement data
    setSettlementToPrint(null);
  };
  
  // Close supplier settlement options dialog
  const closeSupplierSettlementOptionsDialog = () => {
    setShowSupplierSettlementOptions(false);
    // Reset form after closing dialog
    resetSupplierSettlementData();
  };
  
  // Show GRN options dialog
  const showGRNOptionsDialog = () => {
    setShowGRNOptions(true);
  };
  
  // Close GRN options dialog
  const closeGRNOptionsDialog = () => {
    setShowGRNOptions(false);
    // Reset form after closing dialog
    resetGRNData();
  };

  // Show sales order options dialog
  const showSalesOrderOptionsDialog = () => {
    setShowSalesOrderOptions(true);
  };

  // Show stock take options dialog
  const showStockTakeOptionsDialog = () => {
    setShowStockTakeOptions(true);
  };

  // Close stock take options dialog
  const closeStockTakeOptionsDialog = () => {
    setShowStockTakeOptions(false);
  };

  // Reset stock take data for new entry
  const resetStockTakeData = () => {
    setStockTakeGodownId('');
    setStockTakeZoneId('');
    setStockTakeZones([]);
    setStockTakeItems([
      { id: '1', productId: '', productName: '', godownName: '', zoneName: '', systemQty: 0, physicalCount: 0, variance: 0, unitCost: 0, totalCost: 0 },
      { id: '2', productId: '', productName: '', godownName: '', zoneName: '', systemQty: 0, physicalCount: 0, variance: 0, unitCost: 0, totalCost: 0 },
      { id: '3', productId: '', productName: '', godownName: '', zoneName: '', systemQty: 0, physicalCount: 0, variance: 0, unitCost: 0, totalCost: 0 },
    ]);
    setStockTakeProductSearch({});
    setStockTakeProductResults({});
    setStockTakeShowDropdown({});
    setBatchMode(false);
    setBatchSelectedGodowns([]);
    setBatchCurrentIndex(0);
    setBatchItems({});
    setBatchStep('select');
    setBatchZones({});
    setBatchZoneOptions({});
    setStockTakeNotes('');
    setCountedByName('');
    setCountedByDate(new Date().toISOString().split('T')[0]);
    setVerifiedByName('');
    setVerifiedByDate(new Date().toISOString().split('T')[0]);
    setStockTakeNumber(getNextStockTakeNumber());
  };

  // Batch Mode helpers
  const toggleBatchGodown = (godownId: string, godownName: string) => {
    setBatchSelectedGodowns(prev => {
      const exists = prev.find(g => g.id === godownId);
      if (exists) return prev.filter(g => g.id !== godownId);
      return [...prev, { id: godownId, name: godownName }];
    });
  };

  const startBatchStockTake = () => {
    if (batchSelectedGodowns.length === 0) return;
    const initialItems: Record<string, StockTakeItem[]> = {};
    batchSelectedGodowns.forEach(g => {
      initialItems[g.id] = [
        { id: `${g.id}-1`, productId: '', productName: '', godownName: g.name, zoneName: '', systemQty: 0, physicalCount: 0, variance: 0, unitCost: 0, totalCost: 0 },
        { id: `${g.id}-2`, productId: '', productName: '', godownName: g.name, zoneName: '', systemQty: 0, physicalCount: 0, variance: 0, unitCost: 0, totalCost: 0 },
        { id: `${g.id}-3`, productId: '', productName: '', godownName: g.name, zoneName: '', systemQty: 0, physicalCount: 0, variance: 0, unitCost: 0, totalCost: 0 },
      ];
    });
    setBatchItems(initialItems);
    setBatchCurrentIndex(0);
    setBatchStep('wizard');
    // Load zones for first godown
    loadBatchZones(batchSelectedGodowns[0].id);
  };

  const loadBatchZones = async (godownId: string) => {
    if (batchZoneOptions[godownId]) return; // already loaded
    try {
      const zones = await getZones(godownId);
      setBatchZoneOptions(prev => ({ ...prev, [godownId]: zones }));
    } catch (error) {
      console.error('Error loading batch zones:', error);
      setBatchZoneOptions(prev => ({ ...prev, [godownId]: [] }));
    }
  };

  const getCurrentBatchGodown = () => batchSelectedGodowns[batchCurrentIndex] || null;
  const getCurrentBatchItems = () => {
    const godown = getCurrentBatchGodown();
    return godown ? (batchItems[godown.id] || []) : [];
  };

  const updateBatchItem = (itemId: string, field: keyof StockTakeItem, value: string | number) => {
    const godown = getCurrentBatchGodown();
    if (!godown) return;
    setBatchItems(prev => {
      const items = prev[godown.id] || [];
      const updated = items.map(item => {
        if (item.id !== itemId) return item;
        const updatedItem = { ...item, [field]: value };
        if (field === 'physicalCount') {
          updatedItem.variance = Number(value) - item.systemQty;
        }
        return updatedItem;
      });
      return { ...prev, [godown.id]: updated };
    });
  };

  const addBatchRow = () => {
    const godown = getCurrentBatchGodown();
    if (!godown) return;
    setBatchItems(prev => {
      const items = prev[godown.id] || [];
      const newId = `${godown.id}-${Date.now()}`;
      return {
        ...prev,
        [godown.id]: [...items, { id: newId, productId: '', productName: '', godownName: godown.name, zoneName: '', systemQty: 0, physicalCount: 0, variance: 0, unitCost: 0, totalCost: 0 }]
      };
    });
  };

  const removeBatchRow = (itemId: string) => {
    const godown = getCurrentBatchGodown();
    if (!godown) return;
    setBatchItems(prev => ({
      ...prev,
      [godown.id]: (prev[godown.id] || []).filter(item => item.id !== itemId)
    }));
  };

  const batchGodownCompleted = (godownId: string) => {
    const items = batchItems[godownId] || [];
    return items.some(item => item.productId && item.physicalCount > 0);
  };

  const batchTotals = () => {
    let totalProducts = 0, totalSystemQty = 0, totalPhysicalCount = 0, totalVariance = 0;
    Object.values(batchItems).forEach(items => {
      items.forEach(item => {
        if (item.productId) {
          totalProducts++;
          totalSystemQty += item.systemQty;
          totalPhysicalCount += item.physicalCount;
          totalVariance += item.variance;
        }
      });
    });
    return { totalProducts, totalSystemQty, totalPhysicalCount, totalVariance };
  };

  // Search products for batch mode (uses same logic as single mode but scoped to godown)
  const [batchProductSearch, setBatchProductSearch] = useState<Record<string, string>>({});
  const [batchProductResults, setBatchProductResults] = useState<Record<string, Array<{ productId: string; name: string; quantity: number; zoneId?: string; zoneName?: string }>>>({});
  const [batchShowDropdown, setBatchShowDropdown] = useState<Record<string, boolean>>({});

  const searchBatchProducts = async (itemId: string, query: string) => {
    const godown = getCurrentBatchGodown();
    if (!godown) return;
    setBatchProductSearch(prev => ({ ...prev, [itemId]: query }));
    if (query.length < 1) {
      setBatchProductResults(prev => ({ ...prev, [itemId]: [] }));
      return;
    }
    try {
      const allProducts = await getProducts();
      const filtered = allProducts.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));
      const resultsWithQty: Array<{ productId: string; name: string; quantity: number; zoneId?: string; zoneName?: string }> = [];
      for (const p of filtered.slice(0, 10)) {
        if (!p.id) continue;
        const stockData = await getGodownStock(p.id, godown.id);
        // Group by zone to show per-zone quantities
        const zoneMap = new Map<string, { zoneId: string | null; zoneName: string; qty: number }>();
        for (const s of stockData) {
          const zId = s.zone_id || '__no_zone__';
          const existing = zoneMap.get(zId);
          const zName = zId === '__no_zone__' ? 'No Zone' : ((s as any).godown_zones?.zone_name || 'Unknown Zone');
          if (existing) {
            existing.qty += (s.quantity || 0);
          } else {
            zoneMap.set(zId, { zoneId: s.zone_id || null, zoneName: zName, qty: s.quantity || 0 });
          }
        }
        // Add one result per zone (include products even if qty is 0, as long as they are assigned to the zone)
        for (const [, zoneInfo] of zoneMap) {
          resultsWithQty.push({
            productId: p.id,
            name: `${p.name} [${zoneInfo.zoneName}]`,
            quantity: zoneInfo.qty,
            zoneId: zoneInfo.zoneId || undefined,
            zoneName: zoneInfo.zoneName,
          });
        }
      }
      setBatchProductResults(prev => ({ ...prev, [itemId]: resultsWithQty }));
      if (resultsWithQty.length > 0) setBatchShowDropdown(prev => ({ ...prev, [itemId]: true }));
    } catch (error) {
      console.error('Error searching batch products:', error);
    }
  };

  const selectBatchProduct = (itemId: string, productId: string, productName: string, quantity: number, zoneId?: string, zoneName?: string) => {
    const godown = getCurrentBatchGodown();
    if (!godown) return;
    setBatchItems(prev => {
      const items = prev[godown.id] || [];
      return {
        ...prev,
        [godown.id]: items.map(item =>
          item.id === itemId
            ? { ...item, productId, productName: productName.replace(/ \[.*\]$/, ''), systemQty: quantity, godownName: godown.name, zoneId: zoneId || '', zoneName: zoneName || item.zoneName }
            : item
        )
      };
    });
    setBatchProductSearch(prev => ({ ...prev, [itemId]: productName.replace(/ \[.*\]$/, '') }));
    setBatchShowDropdown(prev => ({ ...prev, [itemId]: false }));
  };

  // Generate Stock Take HTML for printing
  const generateStockTakeHTML = (): string => {
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const varianceIcon = (v: number) => v < 0 ? '&#9660;' : v > 0 ? '&#9650;' : '&#9644;';
    const varianceLabel = (v: number) => v < 0 ? 'Shortage' : v > 0 ? 'Surplus' : 'Balanced';

    // Shared CSS for both modes - A4 optimized
    const sharedCSS = `
      @page { size: A4; margin: 12mm 15mm; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a202c; font-size: 11px; line-height: 1.4; }
      .container { max-width: 180mm; margin: 0 auto; padding: 0; }
      
      /* Header */
      .header { border-bottom: 2px solid #1a365d; padding-bottom: 10px; margin-bottom: 14px; }
      .header-top { display: flex; justify-content: space-between; align-items: flex-start; }
      .doc-title { font-size: 24px; font-weight: 700; color: #1a365d; letter-spacing: 1px; text-transform: uppercase; }
      .doc-subtitle { font-size: 10px; color: #718096; margin-top: 2px; letter-spacing: 0.5px; }
      .doc-number { font-size: 13px; font-weight: 600; color: #2b6cb0; text-align: right; }
      .doc-date { font-size: 10px; color: #718096; text-align: right; margin-top: 2px; }
      
      /* Info Grid */
      .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 12px; }
      .info-card { background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px 10px; }
      .info-card-label { font-size: 8px; text-transform: uppercase; letter-spacing: 0.8px; color: #a0aec0; font-weight: 600; margin-bottom: 2px; }
      .info-card-value { font-size: 11px; font-weight: 600; color: #2d3748; }
      
      /* Table */
      .items-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 10px; }
      .items-table thead th { background: #1a365d; color: #fff; padding: 5px 8px; text-align: left; font-weight: 600; font-size: 9px; text-transform: uppercase; letter-spacing: 0.4px; }
      .items-table thead th.num { text-align: center; width: 28px; }
      .items-table thead th.right { text-align: right; }
      .items-table tbody td { padding: 4px 8px; border-bottom: 1px solid #e2e8f0; }
      .items-table tbody td.num { text-align: center; color: #a0aec0; font-size: 9px; }
      .items-table tbody td.right { text-align: right; font-variant-numeric: tabular-nums; }
      .items-table tbody tr:nth-child(even) { background: #f7fafc; }
      .godown-header td { background: #ebf4ff !important; font-weight: 700; color: #1a365d; font-size: 10px; padding: 5px 8px; border-bottom: 2px solid #1a365d; text-transform: uppercase; letter-spacing: 0.5px; }
      .variance-neg { color: #e53e3e; font-weight: 600; }
      .variance-pos { color: #38a169; font-weight: 600; }
      .variance-zero { color: #a0aec0; }
      
      /* Summary Dashboard */
      .summary-section { margin-bottom: 12px; }
      .summary-title { font-size: 11px; font-weight: 700; color: #1a365d; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid #e2e8f0; }
      .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
      .summary-card { text-align: center; padding: 8px 4px; border-radius: 4px; border: 1px solid #e2e8f0; background: #fff; }
      .summary-card-value { font-size: 16px; font-weight: 700; color: #1a202c; }
      .summary-card-label { font-size: 8px; text-transform: uppercase; letter-spacing: 0.4px; color: #718096; margin-top: 2px; }
      
      /* Variance Status Bar */
      .variance-status { display: flex; align-items: center; gap: 6px; margin-top: 6px; padding: 5px 10px; border-radius: 4px; font-size: 10px; font-weight: 600; background: #f7fafc; color: #4a5568; border: 1px solid #e2e8f0; }
      
      /* Notes */
      .notes-section { margin-bottom: 12px; }
      .notes-box { background: #fff; border: 1px solid #e2e8f0; border-radius: 4px; padding: 8px 12px; min-height: 30px; }
      .notes-box p { font-size: 10px; color: #1a202c; }
      .notes-empty { font-style: italic; color: #a0aec0; }
      
      /* Signatures */
      .signatures-section { margin-top: 16px; }
      .signatures-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      .sig-block { border: 1px solid #e2e8f0; border-radius: 4px; padding: 10px; background: #f7fafc; }
      .sig-title { font-size: 9px; text-transform: uppercase; letter-spacing: 0.8px; color: #a0aec0; font-weight: 600; margin-bottom: 4px; }
      .sig-line { border-bottom: 1px solid #2d3748; height: 22px; margin-bottom: 4px; }
      .sig-name { font-size: 11px; font-weight: 600; color: #2d3748; }
      .sig-date { font-size: 9px; color: #718096; margin-top: 1px; }
      
      /* Footer */
      .footer { margin-top: 16px; padding-top: 8px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 8px; color: #a0aec0; }
      
      @media print {
        @page { size: A4; margin: 12mm 15mm; }
        body { padding: 0; font-size: 11px; }
        .container { max-width: none; padding: 0; }
        .items-table tbody tr:nth-child(even),
        .items-table thead th,
        .sig-block,
        .godown-header td { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    `;

    if (batchMode) {
      // BATCH MODE
      const totals = batchTotals();
      const globalIdx = { current: 0 };
      let allRowsHtml = '';
      batchSelectedGodowns.forEach(g => {
        const items = (batchItems[g.id] || []).filter(item => item.productId);
        if (items.length === 0) return;
        const rowsHtml = items.map(item => {
          globalIdx.current++;
          const vClass = item.variance < 0 ? 'variance-neg' : item.variance > 0 ? 'variance-pos' : 'variance-zero';
          return `<tr>
            <td class="num">${globalIdx.current}</td>
            <td>${item.productName}</td>
            <td>${item.zoneName || 'No Zone'}</td>
            <td class="right">${item.systemQty}</td>
            <td class="right">${item.physicalCount}</td>
            <td class="right ${vClass}">${item.variance > 0 ? '+' : ''}${item.variance}</td>
          </tr>`;
        }).join('');
        allRowsHtml += `<tr class="godown-header"><td colspan="6">&#128230; ${g.name}</td></tr>${rowsHtml}`;
      });
      const godownList = batchSelectedGodowns.map(g => g.name).join(', ');

      return `<!DOCTYPE html><html><head><title>Batch Stock Take - ${stockTakeNumber}</title><style>${sharedCSS}</style></head><body><div class="container">
        <div class="header">
          <div class="header-top">
            <div>
              <div class="doc-title">Batch Physical Stock Take</div>
              <div class="doc-subtitle">Multi-Godown Inventory Audit &amp; Reconciliation</div>
            </div>
            <div>
              <div class="doc-number">${stockTakeNumber}</div>
              <div class="doc-date">${today}</div>
            </div>
          </div>
        </div>
        <div class="info-grid">
          <div class="info-card"><div class="info-card-label">Mode</div><div class="info-card-value">Batch Count</div></div>
          <div class="info-card"><div class="info-card-label">Godowns</div><div class="info-card-value">${batchSelectedGodowns.length} Location(s)</div></div>
          <div class="info-card"><div class="info-card-label">Total Items</div><div class="info-card-value">${totals.totalProducts} Product(s)</div></div>
        </div>
        <div class="info-grid" style="grid-template-columns: 1fr;">
          <div class="info-card"><div class="info-card-label">Locations Covered</div><div class="info-card-value">${godownList}</div></div>
        </div>
        <table class="items-table">
          <thead><tr>
            <th class="num">#</th><th>Product</th><th>Zone</th>
            <th class="right">System Qty</th><th class="right">Physical Count</th><th class="right">Variance</th>
          </tr></thead>
          <tbody>${allRowsHtml}</tbody>
        </table>
        <div class="summary-section">
          <div class="summary-title">Consolidated Summary</div>
          <div class="summary-grid">
            <div class="summary-card"><div class="summary-card-value">${totals.totalProducts}</div><div class="summary-card-label">Products</div></div>
            <div class="summary-card"><div class="summary-card-value">${totals.totalSystemQty}</div><div class="summary-card-label">System Qty</div></div>
            <div class="summary-card"><div class="summary-card-value">${totals.totalPhysicalCount}</div><div class="summary-card-label">Physical Count</div></div>
            <div class="summary-card"><div class="summary-card-value">${totals.totalVariance > 0 ? '+' : ''}${totals.totalVariance}</div><div class="summary-card-label">Variance</div></div>
          </div>
          <div class="variance-status">${varianceIcon(totals.totalVariance)} Overall Status: ${varianceLabel(totals.totalVariance)} &mdash; ${totals.totalVariance !== 0 ? Math.abs(totals.totalVariance) + ' unit(s) ' + (totals.totalVariance < 0 ? 'short' : 'surplus') : 'All quantities match'}</div>
        </div>
        <div class="notes-section">
          <div class="summary-title">Notes &amp; Observations</div>
          <div class="notes-box">${stockTakeNotes ? `<p>${stockTakeNotes}</p>` : '<p class="notes-empty">No notes recorded</p>'}</div>
        </div>
        <div class="signatures-section">
          <div class="summary-title">Verification &amp; Approval</div>
          <div class="signatures-grid">
            <div class="sig-block">
              <div class="sig-title">Counted By</div>
              <div class="sig-line"></div>
              <div class="sig-name">${countedByName || '________________________'}</div>
              <div class="sig-date">Date: ${countedByDate}</div>
            </div>
            <div class="sig-block">
              <div class="sig-title">Verified By (Manager)</div>
              <div class="sig-line"></div>
              <div class="sig-name">${verifiedByName || '________________________'}</div>
              <div class="sig-date">Date: ${verifiedByDate}</div>
            </div>
          </div>
        </div>
        <div class="footer">
          <span>Generated: ${today} at ${now}</span>
          <span>Batch Stock Take &bull; ${stockTakeNumber}</span>
          <span>Page 1 of 1</span>
        </div>
      </div></body></html>`;
    }

    // SINGLE MODE
    const selectedGodown = godowns.find(g => g.id === stockTakeGodownId);
    const selectedZone = stockTakeZones.find(z => z.id === stockTakeZoneId);
    const zoneName = stockTakeZoneId === '__no_zone__' ? 'No Zone' : (selectedZone?.zone_name || '');
    const filledItems = stockTakeItems.filter(item => item.productId);

    const rowsHtml = filledItems.map((item, idx) => {
      const vClass = item.variance < 0 ? 'variance-neg' : item.variance > 0 ? 'variance-pos' : 'variance-zero';
      return `<tr>
        <td class="num">${idx + 1}</td>
        <td>${item.productName}</td>
        <td>${selectedGodown?.name || item.godownName || ''}</td>
        <td>${zoneName || item.zoneName || ''}</td>
        <td class="right">${item.systemQty}</td>
        <td class="right">${item.physicalCount}</td>
        <td class="right ${vClass}">${item.variance > 0 ? '+' : ''}${item.variance}</td>
      </tr>`;
    }).join('');

    return `<!DOCTYPE html><html><head><title>Stock Take - ${stockTakeNumber}</title><style>${sharedCSS}</style></head><body><div class="container">
      <div class="header">
        <div class="header-top">
          <div>
            <div class="doc-title">Physical Stock Take</div>
            <div class="doc-subtitle">Inventory Audit &amp; Reconciliation Report</div>
          </div>
          <div>
            <div class="doc-number">${stockTakeNumber}</div>
            <div class="doc-date">${today}</div>
          </div>
        </div>
      </div>
      <div class="info-grid">
        <div class="info-card"><div class="info-card-label">Godown</div><div class="info-card-value">${selectedGodown?.name || '-'}</div></div>
        <div class="info-card"><div class="info-card-label">Zone</div><div class="info-card-value">${zoneName || '-'}</div></div>
        <div class="info-card"><div class="info-card-label">Total Items</div><div class="info-card-value">${stockTakeTotals.totalProducts} Product(s)</div></div>
      </div>
      <table class="items-table">
        <thead><tr>
          <th class="num">#</th><th>Product</th><th>Godown</th><th>Zone</th>
          <th class="right">System Qty</th><th class="right">Physical Count</th><th class="right">Variance</th>
        </tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <div class="summary-section">
        <div class="summary-title">Summary</div>
        <div class="summary-grid">
          <div class="summary-card"><div class="summary-card-value">${stockTakeTotals.totalProducts}</div><div class="summary-card-label">Products</div></div>
          <div class="summary-card"><div class="summary-card-value">${stockTakeTotals.totalSystemQty}</div><div class="summary-card-label">System Qty</div></div>
          <div class="summary-card"><div class="summary-card-value">${stockTakeTotals.totalPhysicalCount}</div><div class="summary-card-label">Physical Count</div></div>
          <div class="summary-card"><div class="summary-card-value">${stockTakeTotals.totalVariance > 0 ? '+' : ''}${stockTakeTotals.totalVariance}</div><div class="summary-card-label">Variance</div></div>
        </div>
        <div class="variance-status">${varianceIcon(stockTakeTotals.totalVariance)} Overall Status: ${varianceLabel(stockTakeTotals.totalVariance)} &mdash; ${stockTakeTotals.totalVariance !== 0 ? Math.abs(stockTakeTotals.totalVariance) + ' unit(s) ' + (stockTakeTotals.totalVariance < 0 ? 'short' : 'surplus') : 'All quantities match'}</div>
      </div>
      <div class="notes-section">
        <div class="summary-title">Notes &amp; Observations</div>
        <div class="notes-box">${stockTakeNotes ? `<p>${stockTakeNotes}</p>` : '<p class="notes-empty">No notes recorded</p>'}</div>
      </div>
      <div class="signatures-section">
        <div class="summary-title">Verification &amp; Approval</div>
        <div class="signatures-grid">
          <div class="sig-block">
            <div class="sig-title">Counted By</div>
            <div class="sig-line"></div>
            <div class="sig-name">${countedByName || '________________________'}</div>
            <div class="sig-date">Date: ${countedByDate}</div>
          </div>
          <div class="sig-block">
            <div class="sig-title">Verified By (Manager)</div>
            <div class="sig-line"></div>
            <div class="sig-name">${verifiedByName || '________________________'}</div>
            <div class="sig-date">Date: ${verifiedByDate}</div>
          </div>
        </div>
      </div>
      <div class="footer">
        <span>Generated: ${today} at ${now}</span>
        <span>Stock Take &bull; ${stockTakeNumber}</span>
        <span>Page 1 of 1</span>
      </div>
    </div></body></html>`;
  };

  // Export stock take as CSV
  const exportStockTakeAsCSV = () => {
    const headers = ['No.', 'Product', 'Godown', 'Zone', 'System Qty', 'Physical Count', 'Variance'];
    let rows: any[] = [];
    let rowNum = 1;

    if (batchMode) {
      batchSelectedGodowns.forEach(g => {
        const items = (batchItems[g.id] || []).filter(item => item.productId);
        items.forEach(item => {
          rows.push([rowNum++, item.productName, g.name, item.zoneName || 'No Zone', item.systemQty, item.physicalCount, item.variance]);
        });
      });
    } else {
      const selectedGodown = godowns.find(g => g.id === stockTakeGodownId);
      const filledItems = stockTakeItems.filter(item => item.productId);
      rows = filledItems.map((item, idx) => [
        idx + 1, item.productName, selectedGodown?.name || item.godownName, item.zoneName,
        item.systemQty, item.physicalCount, item.variance
      ]);
    }
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Stock_Take_${stockTakeNumber}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export stock take as JSON
  const exportStockTakeAsJSON = () => {
    let data: any;
    if (batchMode) {
      const totals = batchTotals();
      const allItems: any[] = [];
      batchSelectedGodowns.forEach(g => {
        (batchItems[g.id] || []).filter(item => item.productId).forEach(item => {
          allItems.push({
            product_name: item.productName,
            godown: g.name,
            zone: item.zoneName || 'No Zone',
            system_qty: item.systemQty,
            physical_count: item.physicalCount,
            variance: item.variance,
          });
        });
      });
      data = {
        stock_take_number: stockTakeNumber,
        date: new Date().toISOString().split('T')[0],
        mode: 'batch',
        godowns: batchSelectedGodowns.map(g => g.name),
        summary: {
          total_products: totals.totalProducts,
          total_system_qty: totals.totalSystemQty,
          total_physical_count: totals.totalPhysicalCount,
          total_variance: totals.totalVariance,
        },
        items: allItems,
      };
    } else {
      const selectedGodown = godowns.find(g => g.id === stockTakeGodownId);
      const filledItems = stockTakeItems.filter(item => item.productId).map(item => ({
        product_name: item.productName,
        godown: selectedGodown?.name || item.godownName,
        zone: item.zoneName,
        system_qty: item.systemQty,
        physical_count: item.physicalCount,
        variance: item.variance,
      }));
      data = {
        stock_take_number: stockTakeNumber,
        date: new Date().toISOString().split('T')[0],
        godown: selectedGodown?.name || '',
        zone: stockTakeZones.find(z => z.id === stockTakeZoneId)?.zone_name || '',
        summary: {
          total_products: stockTakeTotals.totalProducts,
          total_system_qty: stockTakeTotals.totalSystemQty,
          total_physical_count: stockTakeTotals.totalPhysicalCount,
          total_variance: stockTakeTotals.totalVariance,
        },
        items: filledItems,
      };
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Stock_Take_${stockTakeNumber}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export stock take as PDF
  const exportStockTakeAsPDF = () => {
    const htmlContent = generateStockTakeHTML();
    import('html2pdf.js').then((html2pdfModule) => {
      const tempContainer = document.createElement('div');
      tempContainer.innerHTML = htmlContent;
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      document.body.appendChild(tempContainer);
      const opt = {
        margin: 5,
        filename: `Stock_Take_${stockTakeNumber}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
      };
      html2pdfModule.default(tempContainer, opt).then(() => {
        setTimeout(() => { document.body.removeChild(tempContainer); }, 1000);
      });
    });
  };
  
  // Close sales order options dialog
  const closeSalesOrderOptionsDialog = () => {
    setShowSalesOrderOptions(false);
    // Reset form after closing dialog
    resetSalesOrderData();
  };
  
  // Close purchase order options dialog
  const closePurchaseOrderOptionsDialog = () => {
    setShowPurchaseOrderOptions(false);
    // Reset form after closing dialog
    resetPurchaseOrderData();
  };
  
  // Function to generate clean invoice HTML for printing
  const generateCleanInvoiceHTML = (): string => {
    // Create a clean version of the invoice without input fields
    const cleanHTML = `
      <div class="invoice-container" style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="font-size: 24px; margin: 0; padding: 0;">INVOICE</h2>
          <div style="font-size: 18px; font-weight: bold; margin: 10px 0;">${invoiceData.invoiceNumber}</div>
          <div style="font-size: 14px; margin: 5px 0;">Generated: ${invoiceData.timestamp}</div>
          <div style="font-size: 14px; margin: 5px 0;">AMOUNT DUE</div>
          <div style="font-size: 24px; font-weight: bold; color: #dc2626; margin: 10px 0;">${formatCurrency(invoiceData.amountDue)}</div>
        </div>
        
        <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
          <div style="flex: 1; padding-right: 20px;">
            <div style="font-weight: bold; margin-bottom: 5px;">FROM:</div>
            <div style="margin-bottom: 5px;">${invoiceData.businessName}</div>
            <div style="margin-bottom: 5px;">${invoiceData.businessAddress}</div>
            <div style="margin-bottom: 5px;">Phone: ${invoiceData.businessPhone}</div>
            <div style="margin-bottom: 5px;">Email: ${invoiceData.businessEmail}</div>
          </div>
          
          <div style="flex: 1;">
            <div style="font-weight: bold; margin-bottom: 5px;">BILL TO:</div>
            <div style="margin-bottom: 5px;">${invoiceData.clientName}</div>
            ${invoiceData.clientAddress ? `<div style="margin-bottom: 5px;">${invoiceData.clientAddress}</div>` : ''}
            ${invoiceData.clientDistrictWard ? `<div style="margin-bottom: 5px;">${invoiceData.clientDistrictWard}</div>` : ''}
            ${invoiceData.clientCityState ? `<div style="margin-bottom: 5px;">${invoiceData.clientCityState}</div>` : ''}
            ${invoiceData.clientPhone ? `<div style="margin-bottom: 5px;">Phone: ${invoiceData.clientPhone}</div>` : ''}
            ${invoiceData.clientEmail ? `<div style="margin-bottom: 5px;">Email: ${invoiceData.clientEmail}</div>` : ''}
            ${invoiceData.clientTaxId ? `<div style="margin-bottom: 5px;">TIN: ${invoiceData.clientTaxId}</div>` : ''}
          </div>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; font-size: 14px;">
          <div><strong>INVOICE DATE:</strong></div>
          <div>${invoiceData.invoiceDate}</div>
          <div><strong>DUE DATE:</strong></div>
          <div>${invoiceData.dueDate}</div>
        </div>
        
        <div style="margin-bottom: 20px;">
          <div style="font-weight: bold; margin-bottom: 10px;">SERVICES RENDERED:</div>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead style="background-color: #f3f4f6;">
              <tr>
                <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">Item</th>
                <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">Description</th>
                <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">Quantity</th>
                <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">Unit</th>
                <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">Rate</th>
                <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${invoiceData.items.map((item, index) => `
                <tr>
                  <td style="border: 1px solid #d1d5db; padding: 8px;">${String(index + 1).padStart(3, '0')}</td>
                  <td style="border: 1px solid #d1d5db; padding: 8px;">${item.description}</td>
                  <td style="border: 1px solid #d1d5db; padding: 8px;">${item.quantity}</td>
                  <td style="border: 1px solid #d1d5db; padding: 8px;">${item.unit}</td>
                  <td style="border: 1px solid #d1d5db; padding: 8px;">${formatCurrency(item.rate).replace('TZS ', '')}</td>
                  <td style="border: 1px solid #d1d5db; padding: 8px;">${formatCurrency(item.amount)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div style="margin-bottom: 20px;">
          <div style="font-weight: bold; margin-bottom: 5px;">NOTES:</div>
          <div style="min-height: 40px;">${invoiceData.notes}</div>
        </div>
        
        <div style="margin-bottom: 20px;">
          <div style="font-weight: bold; margin-bottom: 5px;">PAYMENT OPTIONS:</div>
          <div style="min-height: 40px;">${invoiceData.paymentOptions}</div>
        </div>
        
        <div style="display: flex; justify-content: flex-end; margin-bottom: 20px;">
          <table style="width: 300px; font-size: 14px;">
            <tr>
              <td style="padding: 5px;"><strong>Subtotal:</strong></td>
              <td style="padding: 5px; text-align: right;">${formatCurrency(calculateInvoiceTotals().subtotal)}</td>
            </tr>
            <tr>
              <td style="padding: 5px;"><strong>Discount:</strong></td>
              <td style="padding: 5px; text-align: right;">${formatCurrency(invoiceData.discount)}</td>
            </tr>
            <tr>
              <td style="padding: 5px;"><strong>Tax:</strong></td>
              <td style="padding: 5px; text-align: right;">${formatCurrency(invoiceData.tax)}</td>
            </tr>
            <tr style="border-top: 2px solid #000; padding-top: 5px;">
              <td style="padding: 5px;"><strong>TOTAL:</strong></td>
              <td style="padding: 5px; text-align: right;"><strong>${formatCurrency(calculateInvoiceTotals().total)}</strong></td>
            </tr>
            <tr>
              <td style="padding: 5px;"><strong>Amount Paid:</strong></td>
              <td style="padding: 5px; text-align: right;">${formatCurrency(invoiceData.amountPaid)}</td>
            </tr>
            <tr>
              <td style="padding: 5px;"><strong>Credit Brought Forward from previous:</strong></td>
              <td style="padding: 5px; text-align: right;">${formatCurrency(invoiceData.creditBroughtForward)}</td>
            </tr>
            <tr style="border-top: 2px solid #000; padding-top: 5px;">
              <td style="padding: 5px;"><strong>AMOUNT DUE:</strong></td>
              <td style="padding: 5px; text-align: right; color: #dc2626;"><strong>${formatCurrency(calculateInvoiceTotals().amountDue)}</strong></td>
            </tr>
          </table>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #d1d5db;">
          <div>${invoiceData.checkPayableMessage}</div>
        </div>
      </div>
    `;
    
    return cleanHTML;
  };
  
  // Shared professional delivery note HTML builder
  const buildDeliveryNotePrintHTML = (
    data: typeof deliveryNoteData,
    totals: { totalItems: number; totalQuantity: number; totalPackages: number },
    noteTotals: { subtotal: number; total: number; amountDue: number },
    options: { autoPrint?: boolean; autoClose?: boolean } = {}
  ): string => {
    const customerLines = [
      data.customerAddress1,
      data.customerDistrictWard,
      data.customerAddress2
    ].filter(line => line && !line.startsWith('Customer Address'));
    const customerAddressHTML = customerLines.map(line => `<div style="margin: 2px 0; text-align: right;">${line}</div>`).join('');
    const timeStr = new Date().toLocaleTimeString();
    const currentDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    return `<!DOCTYPE html>
<html>
<head>
  <title>Delivery Note - ${data.deliveryNoteNumber}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @media print {
      @page { margin: 0.3in; size: A4; }
      body { margin: 0; padding: 0; }
      .no-break { page-break-inside: avoid; }
      .page-break { page-break-after: always; }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      max-width: 850px;
      margin: 0 auto;
      padding: 0;
      font-size: 11px;
      color: #000;
      line-height: 1.5;
      background: #fff;
    }
    
    /* === TOP ACCENT BAR === */
    .accent-bar {
      height: 4px;
      background: linear-gradient(90deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%);
    }
    
    /* === HEADER === */
    .dn-header {
      background: #000;
      color: #fff;
      padding: 12px 24px;
      position: relative;
    }
    .dn-header::after {
      content: '';
      position: absolute;
      right: 24px;
      top: 50%;
      transform: translateY(-50%);
      width: 50px;
      height: 50px;
      border: 2px solid rgba(255,255,255,0.1);
      border-radius: 50%;
    }
    .dn-header-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
    }
    .dn-company-info { flex: 1; }
    .dn-company-name {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .dn-company-details {
      font-size: 11px;
      opacity: 0.9;
      line-height: 1.4;
    }
    .dn-company-details div { margin: 1px 0; }
    .dn-document-info { text-align: right; }
    .dn-document-title {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: 1px;
      margin-bottom: 4px;
      text-transform: uppercase;
    }
    .dn-document-number {
      font-size: 13px;
      font-weight: 600;
      color: #000;
      letter-spacing: 0.5px;
    }
    .dn-copy-indicator {
      display: inline-block;
      margin-top: 4px;
      padding: 2px 8px;
      background: rgba(96, 165, 250, 0.2);
      border: 1px solid #60a5fa;
      border-radius: 3px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    
    /* === META BAR === */
    .meta-bar {
      background: #f8fafc;
      padding: 6px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #e2e8f0;
    }
    .meta-bar-item {
      display: flex;
      align-items: center;
    }
    .meta-bar-text { display: flex; flex-direction: column; }
    .meta-bar-label {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      color: #000;
      letter-spacing: 0.3px;
    }
    .meta-bar-value {
      font-size: 12px;
      font-weight: 700;
      color: #000;
    }
    
    /* === PARTY SECTION === */
    .party-section {
      padding: 12px 24px;
      display: flex;
      gap: 16px;
    }
    .party-box {
      flex: 1;
      background: #fff;
      overflow: hidden;
    }
    .party-box.from-box {
      flex: 0 0 45%;
    }
    .party-box.to-box {
      margin-left: auto;
    }
    .party-box.to-box .party-body {
      text-align: right;
    }
    .party-box.to-box .party-header {
      text-align: right;
    }
    .party-header {
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
      color: #fff;
      padding: 8px 12px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .party-body { padding: 10px 12px; }
    .party-name {
      font-size: 13px;
      font-weight: 700;
      color: #000;
      margin-bottom: 4px;
      padding-bottom: 4px;
      border-bottom: 2px solid #e2e8f0;
    }
    .party-detail {
      font-size: 11px;
      color: #000;
      margin: 2px 0;
    }
    
    /* === INFO GRID === */
    .info-grid-section {
      padding: 0 24px 12px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }
    .info-card {
      background: #f8fafc;
      padding: 8px 10px;
      text-align: center;
    }
    .info-card-label {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      color: #000;
      letter-spacing: 0.3px;
      margin-bottom: 2px;
    }
    .info-card-value {
      font-size: 13px;
      font-weight: 800;
      color: #000;
    }
    
    /* === ITEMS TABLE === */
    .items-section {
      padding: 0 24px 12px;
    }
    .section-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #000;
      margin-bottom: 6px;
      padding-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .section-title::before {
      content: '';
      width: 3px;
      height: 14px;
      background: #1e40af;
      border-radius: 2px;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      border: 1px solid #d1d5db;
    }
    .items-table thead th {
      background: #f9fafb;
      color: #000;
      padding: 8px 10px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      text-align: left;
      border-bottom: 2px solid #d1d5db;
      border-right: 1px solid #e5e7eb;
    }
    .items-table thead th:last-child { border-right: none; }
    .items-table thead th.r { text-align: right; }
    .items-table thead th.c { text-align: center; }
    .items-table tbody td {
      padding: 7px 10px;
      border-bottom: 1px solid #e5e7eb;
      border-right: 1px solid #e5e7eb;
      vertical-align: middle;
    }
    .items-table tbody td:last-child { border-right: none; }
    .items-table tbody tr:nth-child(even) { background: #f9fafb; }
    .items-table tbody tr:hover { background: #f3f4f6; }
    .items-table .r { text-align: right; }
    .items-table .c { text-align: center; }
    .items-table .item-num {
      font-weight: 700;
      color: #000;
      font-size: 10px;
    }
    .items-table .item-desc {
      font-weight: 600;
      color: #000;
    }
    .items-table .item-amount {
      font-weight: 700;
      color: #000;
    }
    .items-table .item-delivered {
      font-weight: 700;
      color: #000;
      font-size: 11px;
    }
    .items-table tfoot td {
      padding: 8px 10px;
      font-weight: 700;
      border-top: 2px solid #d1d5db;
      border-right: 1px solid #e5e7eb;
      background: #f3f4f6;
      font-size: 11px;
    }
    .items-table tfoot td:last-child { border-right: none; }
    .items-table tfoot .total-label {
      text-align: right;
      color: #000;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .items-table tfoot .total-value {
      color: #000;
      font-size: 12px;
    }
    
    /* === PAYMENT + NOTES === */
    .bottom-section {
      padding: 0 24px 12px;
      display: flex;
      gap: 16px;
    }
    .payment-box {
      width: 400px;
      flex-shrink: 0;
      overflow: hidden;
    }
    .payment-header {
      background: #000;
      color: #fff;
      padding: 8px 12px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .payment-body { padding: 2px 0; }
    .payment-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 10px;
      border-bottom: 1px solid #f1f5f9;
    }
    .payment-row:last-child { border-bottom: none; }
    .payment-label { color: #000; font-size: 11px; }
    .payment-value {
      font-weight: 600;
      color: #000;
      font-size: 11px;
    }
    .payment-row.total-row {
      background: #f8fafc;
      border-top: 2px solid #000;
      margin-top: 2px;
    }
    .payment-row.total-row .payment-label,
    .payment-row.total-row .payment-value {
      font-size: 12px;
      font-weight: 800;
      color: #000;
    }
    .payment-row.due-row {
      background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
      border-top: 2px solid #dc2626;
    }
    .payment-row.due-row .payment-label,
    .payment-row.due-row .payment-value {
      color: #dc2626;
      font-weight: 800;
      font-size: 12px;
    }
    .payment-row.discount-row .payment-value { color: #000; }
    .payment-row.paid-row .payment-value { color: #000; }
    
    .notes-box {
      flex: 1;
      overflow: hidden;
    }
    .notes-header {
      background: #f5f5f5;
      padding: 8px 12px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #000;
      border-bottom: 1px solid #ddd;
    }
    .notes-body {
      padding: 10px 12px;
      font-size: 11px;
      color: #000;
      min-height: 50px;
      line-height: 1.4;
    }
    
    /* === SIGNATURES === */
    .sig-section {
      padding: 0 24px 12px;
    }
    .sig-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }
    .sig-box {
      padding: 10px;
      text-align: center;
      background: #fff;
    }
    .sig-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #000;
      margin-bottom: 6px;
      padding-bottom: 4px;
      border-bottom: 2px solid #e2e8f0;
    }
    .sig-field { margin: 4px 0; }
    .sig-label {
      font-size: 10px;
      color: #000;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin-bottom: 1px;
    }
    .sig-value {
      font-size: 11px;
      font-weight: 600;
      color: #000;
    }
    .sig-line {
      margin-top: 12px;
      padding-top: 4px;
      border-top: 2px dashed #94a3b8;
      font-size: 10px;
      color: #000;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .sig-box.received-box {
      background: #fff;
    }
    .sig-box.received-box .sig-title { color: #000; }
    .sig-box.received-box .sig-line {
      color: #000;
      font-weight: 700;
      border-color: #000;
    }
    
    /* === FOOTER === */
    .dn-footer {
      background: #000;
      color: #fff;
      padding: 10px 24px;
      margin-top: 12px;
    }
    .footer-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .footer-thankyou {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.3px;
    }
    .footer-generated {
      font-size: 9px;
      opacity: 0.8;
    }
    .footer-bottom {
      text-align: center;
      padding-top: 6px;
      border-top: 1px solid rgba(255,255,255,0.2);
      font-size: 8px;
      opacity: 0.7;
      letter-spacing: 0.3px;
    }
    
    /* === WATERMARK === */
    @media print {
      .watermark {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-45deg);
        font-size: 80px;
        font-weight: 900;
        color: rgba(30, 64, 175, 0.05);
        z-index: -1;
        letter-spacing: 10px;
        text-transform: uppercase;
      }
    }
  </style>
</head>
<body>
  ${options.autoPrint ? '<div class="watermark">ORIGINAL</div>' : ''}
  
  <!-- ACCENT BAR -->
  <div class="accent-bar"></div>
  
  <!-- HEADER -->
  <div class="dn-header" style="text-align: center;">
    <div class="dn-document-title">DELIVERY NOTE</div>
    <div class="dn-document-number">#${data.deliveryNoteNumber}</div>
    <div class="dn-copy-indicator">Original Copy</div>
  </div>
  
  <!-- META BAR -->
  <div class="meta-bar">
    <div class="meta-bar-item">
      <div class="meta-bar-text">
        <div class="meta-bar-label">Document Date</div>
        <div class="meta-bar-value">${data.date}</div>
      </div>
    </div>
    <div class="meta-bar-item">
      <div class="meta-bar-text">
        <div class="meta-bar-label">Delivery Date</div>
        <div class="meta-bar-value">${data.deliveryDate || 'N/A'}</div>
      </div>
    </div>
    <div class="meta-bar-item">
      <div class="meta-bar-text">
        <div class="meta-bar-label">Time</div>
        <div class="meta-bar-value">${timeStr}</div>
      </div>
    </div>
  </div>

  <!-- FROM / TO -->
  <div class="party-section">
    <div class="party-box from-box">
      <div class="party-header">From (Sender)</div>
      <div class="party-body">
        <div class="party-name">${data.businessName}</div>
        <div class="party-detail">
          <span>${data.businessAddress}</span>
        </div>
        <div class="party-detail">
          <span>${data.businessPhone}</span>
        </div>
        ${data.businessEmail ? `<div class="party-detail">
          <span>${data.businessEmail}</span>
        </div>` : ''}
      </div>
    </div>
    <div class="party-box to-box">
      <div class="party-header">Deliver To (Consignee)</div>
      <div class="party-body">
        <div class="party-name">${data.customerName}</div>
        ${customerAddressHTML}
        ${data.customerPhone ? `<div class="party-detail">
          <span>${data.customerPhone}</span>
        </div>` : ''}
        ${data.customerEmail ? `<div class="party-detail">
          <span>${data.customerEmail}</span>
        </div>` : ''}
        ${data.customerTaxId ? `<div class="party-detail">
          <span>TIN: ${data.customerTaxId}</span>
        </div>` : ''}
      </div>
    </div>
  </div>

  <!-- INFO GRID -->
  <div class="info-grid-section">
    <div class="info-grid">
      <div class="info-card">
        <div class="info-card-label">Vehicle</div>
        <div class="info-card-value">${data.vehicle || 'N/A'}</div>
      </div>
      <div class="info-card">
        <div class="info-card-label">Driver</div>
        <div class="info-card-value">${data.driver || 'N/A'}</div>
      </div>
      <div class="info-card">
        <div class="info-card-label">Total Items</div>
        <div class="info-card-value">${totals.totalItems}</div>
      </div>
    </div>
  </div>

  <!-- ITEMS TABLE -->
  <div class="items-section">
    <div class="section-title">Items Delivered</div>
    <table class="items-table">
      <thead>
        <tr>
          <th style="width:40px;" class="c">#</th>
          <th>Description</th>
          <th>Godown</th>
          <th>Zone</th>
          <th class="r">Qty</th>
          <th class="c">Unit</th>
          <th class="r">Rate</th>
          <th class="r">Amount</th>
          <th class="r">Delivered</th>
          <th>Remarks</th>
        </tr>
      </thead>
      <tbody>
        ${data.items.map((item, index) => `
          <tr>
            <td class="c item-num">${String(index + 1).padStart(2, '0')}</td>
            <td class="item-desc">${item.description}</td>
            <td>${item.godownName || '-'}</td>
            <td>${item.zoneName || '-'}</td>
            <td class="r">${item.quantity}</td>
            <td class="c">${item.unit || '-'}</td>
            <td class="r">${formatCurrency(item.rate || 0)}</td>
            <td class="r item-amount">${formatCurrency(item.amount || 0)}</td>
            <td class="r item-delivered"></td>
            <td style="color:#000; font-size:11px;">${item.remarks || '-'}</td>
          </tr>
        `).join('')}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="4" class="total-label">Totals:</td>
          <td class="r total-value">${totals.totalQuantity}</td>
          <td></td>
          <td></td>
          <td class="r total-value">${formatCurrency(noteTotals.total)}</td>
          <td class="r"></td>
          <td></td>
        </tr>
      </tfoot>
    </table>
  </div>

  <!-- PAYMENT + NOTES -->
  <div class="bottom-section">
    <div class="notes-box">
      <div class="notes-header">Delivery Notes / Instructions</div>
      <div class="notes-body">${data.deliveryNotes ? data.deliveryNotes.replace(/\n/g, '<br>') : '<span style="color:#000;">No additional notes.</span>'}</div>
    </div>
    <div class="payment-box">
      <div class="payment-header">Payment Summary</div>
      <div class="payment-body">
        <div class="payment-row">
          <div class="payment-label">Subtotal</div>
          <div class="payment-value">${formatCurrency(noteTotals.subtotal)}</div>
        </div>
        ${Number(data.tax || 0) !== 0 ? `<div class="payment-row">
          <div class="payment-label">Tax</div>
          <div class="payment-value">${formatCurrency(data.tax || 0)}</div>
        </div>` : ''}
        ${Number(data.discount || 0) !== 0 ? `<div class="payment-row discount-row">
          <div class="payment-label">Discount</div>
          <div class="payment-value">-${formatCurrency(data.discount || 0)}</div>
        </div>` : ''}
        <div class="payment-row total-row">
          <div class="payment-label">Total</div>
          <div class="payment-value">${formatCurrency(noteTotals.total)}</div>
        </div>
        <div class="payment-row paid-row">
          <div class="payment-label">Amount Paid</div>
          <div class="payment-value">${formatCurrency(data.amountPaid || 0)}</div>
        </div>
        ${Number(data.creditBroughtForward || 0) !== 0 ? `<div class="payment-row">
          <div class="payment-label">Credit Brought Forward</div>
          <div class="payment-value" style="color:#000;">${formatCurrency(data.creditBroughtForward)}</div>
        </div>` : ''}
        <div class="payment-row due-row">
          <div class="payment-label">Amount Due</div>
          <div class="payment-value">${formatCurrency(noteTotals.amountDue)}</div>
        </div>
      </div>
    </div>
  </div>

  <!-- SIGNATURES -->
  <div class="sig-section no-break">
    <div class="section-title">Authorization & Signatures</div>
    <div class="sig-grid">
      <div class="sig-box">
        <div class="sig-title">Prepared By</div>
        <div class="sig-field">
          <div class="sig-label">Name</div>
          <div class="sig-value">${data.preparedByName || '—'}</div>
        </div>
        <div class="sig-field">
          <div class="sig-label">Date</div>
          <div class="sig-value">${data.preparedByDate || '—'}</div>
        </div>
        <div class="sig-line">Signature</div>
      </div>
      <div class="sig-box">
        <div class="sig-title">Driver</div>
        <div class="sig-field">
          <div class="sig-label">Name</div>
          <div class="sig-value">${data.driverName || data.driver || '—'}</div>
        </div>
        <div class="sig-field">
          <div class="sig-label">Date</div>
          <div class="sig-value">${data.driverDate || '—'}</div>
        </div>
        <div class="sig-line">Signature</div>
      </div>
      <div class="sig-box received-box">
        <div class="sig-title">Received By</div>
        <div class="sig-field">
          <div class="sig-label">Name</div>
          <div class="sig-value">${data.receivedByName || '—'}</div>
        </div>
        <div class="sig-field">
          <div class="sig-label">Date</div>
          <div class="sig-value">${data.receivedByDate || '—'}</div>
        </div>
        <div class="sig-line">⚠ Signature Required</div>
      </div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="dn-footer">
    <div class="footer-content">
      <div class="footer-thankyou">Thank you for your business!</div>
      <div class="footer-generated">Generated: ${currentDate} at ${timeStr}</div>
    </div>
    <div class="footer-bottom">
      ${data.businessName} &bull; ${data.businessPhone} ${data.businessEmail ? '&bull; ' + data.businessEmail : ''}
    </div>
  </div>

  ${options.autoPrint ? `<script>window.onload = function() { window.print(); ${options.autoClose ? 'window.close();' : ''} };</script>` : ''}
</body>
</html>`;
  };

  // Function to generate clean delivery note HTML for printing
  const generateDeliveryNoteHTML = (): string => {
    const totals = calculateTotals();
    const noteTotals = calculateDeliveryNoteTotals();
    return buildDeliveryNotePrintHTML(deliveryNoteData, totals, noteTotals);
  };

  // Shared professional supplier purchase note HTML builder
  const buildSupplierPurchaseNotePrintHTML = (
    data: typeof supplierPurchaseNoteData,
    totals: { totalItems: number; totalQuantity: number; totalPackages: number },
    noteTotals: { subtotal: number; total: number },
    options: { autoPrint?: boolean; autoClose?: boolean } = {}
  ): string => {
    const timeStr = new Date().toLocaleTimeString();
    const currentDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    return `<!DOCTYPE html>
<html>
<head>
  <title>Supplier Purchase Note - ${data.purchaseNoteNumber}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @media print {
      @page { margin: 0.3in; size: A4; }
      body { margin: 0; padding: 0; }
      .no-break { page-break-inside: avoid; }
      .page-break { page-break-after: always; }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      max-width: 850px;
      margin: 0 auto;
      padding: 0;
      font-size: 11px;
      color: #000;
      line-height: 1.5;
      background: #fff;
    }
    
    /* === TOP ACCENT BAR === */
    .accent-bar {
      height: 4px;
      background: #000;
    }
    
    /* === HEADER === */
    .spn-header {
      background: #fff;
      color: #000;
      padding: 12px 24px;
      position: relative;
      text-align: center;
      border-bottom: 3px solid #000;
    }
    .spn-header::after {
      content: '';
      position: absolute;
      right: 24px;
      top: 50%;
      transform: translateY(-50%);
      width: 50px;
      height: 50px;
      border: 2px solid #ccc;
      border-radius: 50%;
    }
    .spn-document-title {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: 1px;
      margin-bottom: 4px;
      text-transform: uppercase;
      color: #000;
    }
    .spn-document-number {
      font-size: 13px;
      font-weight: 600;
      color: #000;
      letter-spacing: 0.5px;
    }
    .spn-copy-indicator {
      display: inline-block;
      margin-top: 4px;
      padding: 2px 8px;
      background: #fff;
      border: 1px solid #000;
      border-radius: 3px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: #000;
    }
    
    /* === META BAR === */
    .meta-bar {
      background: #f8fafc;
      padding: 6px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #e2e8f0;
    }
    .meta-bar-item {
      display: flex;
      align-items: center;
    }
    .meta-bar-text { display: flex; flex-direction: column; }
    .meta-bar-label {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      color: #000;
      letter-spacing: 0.3px;
    }
    .meta-bar-value {
      font-size: 12px;
      font-weight: 700;
      color: #000;
    }
    
    /* === PARTY SECTION === */
    .party-section {
      padding: 12px 24px;
      display: flex;
      gap: 16px;
    }
    .party-box {
      flex: 1;
      background: #fff;
      overflow: hidden;
    }
    .party-box.from-box {
      flex: 0 0 45%;
    }
    .party-box.to-box {
      margin-left: auto;
    }
    .party-box.to-box .party-body {
      text-align: right;
    }
    .party-box.to-box .party-header {
      text-align: right;
    }
    .party-header {
      background: #000;
      color: #fff;
      padding: 8px 12px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .party-body { padding: 10px 12px; }
    .party-name {
      font-size: 13px;
      font-weight: 700;
      color: #000;
      margin-bottom: 4px;
      padding-bottom: 4px;
      border-bottom: 2px solid #e2e8f0;
    }
    .party-detail {
      font-size: 11px;
      color: #000;
      margin: 2px 0;
    }
    
    /* === INFO GRID === */
    .info-grid-section {
      padding: 0 24px 12px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }
    .info-card {
      background: #f8fafc;
      padding: 8px 10px;
      text-align: center;
    }
    .info-card-label {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      color: #000;
      letter-spacing: 0.3px;
      margin-bottom: 2px;
    }
    .info-card-value {
      font-size: 13px;
      font-weight: 800;
      color: #000;
    }
    
    /* === ITEMS TABLE === */
    .items-section {
      padding: 0 24px 12px;
    }
    .section-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #000;
      margin-bottom: 6px;
      padding-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .section-title::before {
      content: '';
      width: 3px;
      height: 14px;
      background: #000;
      border-radius: 2px;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      border: 1px solid #d1d5db;
    }
    .items-table thead th {
      background: #f9fafb;
      color: #000;
      padding: 8px 10px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      text-align: left;
      border-bottom: 2px solid #d1d5db;
      border-right: 1px solid #e5e7eb;
    }
    .items-table thead th:last-child { border-right: none; }
    .items-table thead th.r { text-align: right; }
    .items-table thead th.c { text-align: center; }
    .items-table tbody td {
      padding: 7px 10px;
      border-bottom: 1px solid #e5e7eb;
      border-right: 1px solid #e5e7eb;
      vertical-align: middle;
    }
    .items-table tbody td:last-child { border-right: none; }
    .items-table tbody tr:nth-child(even) { background: #f9fafb; }
    .items-table tbody tr:hover { background: #f3f4f6; }
    .items-table .r { text-align: right; }
    .items-table .c { text-align: center; }
    .items-table .item-num {
      font-weight: 700;
      color: #000;
      font-size: 10px;
    }
    .items-table .item-desc {
      font-weight: 600;
      color: #000;
    }
    .items-table .item-amount {
      font-weight: 700;
      color: #000;
    }
    .items-table tfoot td {
      padding: 8px 10px;
      font-weight: 700;
      border-top: 2px solid #d1d5db;
      border-right: 1px solid #e5e7eb;
      background: #f3f4f6;
      font-size: 11px;
    }
    .items-table tfoot td:last-child { border-right: none; }
    .items-table tfoot .total-label {
      text-align: right;
      color: #000;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .items-table tfoot .total-value {
      color: #000;
      font-size: 12px;
    }
    
    /* === PAYMENT + NOTES === */
    .bottom-section {
      padding: 0 24px 12px;
      display: flex;
      gap: 16px;
    }
    .payment-box {
      width: 400px;
      flex-shrink: 0;
      overflow: hidden;
    }
    .payment-header {
      background: #000;
      color: #fff;
      padding: 8px 12px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .payment-body { padding: 2px 0; }
    .payment-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 10px;
      border-bottom: 1px solid #f1f5f9;
    }
    .payment-row:last-child { border-bottom: none; }
    .payment-label { color: #000; font-size: 11px; }
    .payment-value {
      font-weight: 600;
      color: #000;
      font-size: 11px;
    }
    .payment-row.total-row {
      background: #f8fafc;
      border-top: 2px solid #000;
      margin-top: 2px;
    }
    .payment-row.total-row .payment-label,
    .payment-row.total-row .payment-value {
      font-size: 12px;
      font-weight: 800;
      color: #000;
    }
    .payment-row.discount-row .payment-value { color: #000; }
    
    .notes-box {
      flex: 1;
      overflow: hidden;
    }
    .notes-header {
      background: #f5f5f5;
      padding: 8px 12px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #000;
      border-bottom: 1px solid #ddd;
    }
    .notes-body {
      padding: 10px 12px;
      font-size: 11px;
      color: #000;
      min-height: 50px;
      line-height: 1.4;
    }
    
    /* === SIGNATURES === */
    .sig-section {
      padding: 0 24px 12px;
    }
    .sig-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px;
      max-width: 300px;
    }
    .sig-box {
      padding: 10px;
      text-align: center;
      background: #fff;
    }
    .sig-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #000;
      margin-bottom: 6px;
      padding-bottom: 4px;
      border-bottom: 2px solid #e2e8f0;
    }
    .sig-field { margin: 4px 0; }
    .sig-label {
      font-size: 10px;
      color: #000;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin-bottom: 1px;
    }
    .sig-value {
      font-size: 11px;
      font-weight: 600;
      color: #000;
    }
    .sig-line {
      margin-top: 12px;
      padding-top: 4px;
      border-top: 2px dashed #94a3b8;
      font-size: 10px;
      color: #000;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    
    /* === FOOTER === */
    .spn-footer {
      background: #fff;
      color: #000;
      padding: 10px 24px;
      margin-top: 12px;
      border-top: 3px solid #000;
    }
    .footer-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .footer-thankyou {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.3px;
    }
    .footer-generated {
      font-size: 9px;
      opacity: 0.8;
    }
    .footer-bottom {
      text-align: center;
      padding-top: 6px;
      border-top: 1px solid rgba(255,255,255,0.2);
      font-size: 8px;
      opacity: 0.7;
      letter-spacing: 0.3px;
    }
    
    /* === WATERMARK === */
    @media print {
      .watermark {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-45deg);
        font-size: 80px;
        font-weight: 900;
        color: rgba(0, 0, 0, 0.05);
        z-index: -1;
        letter-spacing: 10px;
        text-transform: uppercase;
      }
    }
  </style>
</head>
<body>
  ${options.autoPrint ? '<div class="watermark">ORIGINAL</div>' : ''}
  
  <!-- ACCENT BAR -->
  <div class="accent-bar"></div>
  
  <!-- HEADER -->
  <div class="spn-header">
    <div class="spn-document-title">SUPPLIER PURCHASE NOTE</div>
    <div class="spn-document-number">#${data.purchaseNoteNumber}</div>
    <div class="spn-copy-indicator">Original Copy</div>
  </div>
  
  <!-- META BAR -->
  <div class="meta-bar">
    <div class="meta-bar-item">
      <div class="meta-bar-text">
        <div class="meta-bar-label">Document Date</div>
        <div class="meta-bar-value">${data.date}</div>
      </div>
    </div>
    <div class="meta-bar-item">
      <div class="meta-bar-text">
        <div class="meta-bar-label">Time</div>
        <div class="meta-bar-value">${timeStr}</div>
      </div>
    </div>
    <div class="meta-bar-item">
      <div class="meta-bar-text">
        <div class="meta-bar-label">Status</div>
        <div class="meta-bar-value">${data.status || 'Completed'}</div>
      </div>
    </div>
  </div>

  <!-- FROM / TO -->
  <div class="party-section">
    <div class="party-box from-box">
      <div class="party-header">From (Supplier)</div>
      <div class="party-body">
        <div class="party-name">${data.supplierName || 'N/A'}</div>
        <div class="party-detail">
          <span>${data.supplierAddress || ''}</span>
        </div>
        <div class="party-detail">
          <span>${data.supplierPhone || ''}</span>
        </div>
        ${data.supplierEmail ? `<div class="party-detail">
          <span>${data.supplierEmail}</span>
        </div>` : ''}
      </div>
    </div>
    <div class="party-box to-box">
      <div class="party-header">To (Business)</div>
      <div class="party-body">
        <div class="party-name">${data.businessName}</div>
        <div class="party-detail">
          <span>${data.businessAddress}</span>
        </div>
        <div class="party-detail">
          <span>${data.businessPhone}</span>
        </div>
        ${data.businessEmail ? `<div class="party-detail">
          <span>${data.businessEmail}</span>
        </div>` : ''}
      </div>
    </div>
  </div>

  <!-- INFO GRID -->
  <div class="info-grid-section">
    <div class="info-grid">
      <div class="info-card">
        <div class="info-card-label">Total Items</div>
        <div class="info-card-value">${totals.totalItems}</div>
      </div>
      <div class="info-card">
        <div class="info-card-label">Total Quantity</div>
        <div class="info-card-value">${totals.totalQuantity}</div>
      </div>
      <div class="info-card">
        <div class="info-card-label">Total Packages</div>
        <div class="info-card-value">${totals.totalPackages}</div>
      </div>
    </div>
  </div>

  <!-- ITEMS TABLE -->
  <div class="items-section">
    <div class="section-title">Items Purchased</div>
    <table class="items-table">
      <thead>
        <tr>
          <th style="width:40px;" class="c">#</th>
          <th>Description</th>
          <th class="r">Qty</th>
          <th class="c">Unit</th>
          <th class="r">Unit Price</th>
          <th class="r">Total</th>
        </tr>
      </thead>
      <tbody>
        ${data.items.map((item, index) => `
          <tr>
            <td class="c item-num">${String(index + 1).padStart(2, '0')}</td>
            <td class="item-desc">${item.description || ''}</td>
            <td class="r">${item.quantity || 0}</td>
            <td class="c">${item.unit || '-'}</td>
            <td class="r">${formatCurrency(item.unitPrice || 0)}</td>
            <td class="r item-amount">${formatCurrency(item.total || 0)}</td>
          </tr>
        `).join('')}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2" class="total-label">Totals:</td>
          <td class="r total-value">${totals.totalQuantity}</td>
          <td></td>
          <td></td>
          <td class="r total-value">${formatCurrency(noteTotals.total)}</td>
        </tr>
      </tfoot>
    </table>
  </div>

  <!-- PAYMENT + NOTES -->
  <div class="bottom-section">
    <div class="notes-box">
      <div class="notes-header">Notes</div>
      <div class="notes-body">${data.notes ? data.notes.replace(/\n/g, '<br>') : '<span style="color:#000;">No additional notes.</span>'}</div>
    </div>
    <div class="payment-box">
      <div class="payment-header">Payment Summary</div>
      <div class="payment-body">
        <div class="payment-row">
          <div class="payment-label">Subtotal</div>
          <div class="payment-value">${formatCurrency(noteTotals.subtotal)}</div>
        </div>
        ${Number(data.discount || 0) !== 0 ? `<div class="payment-row discount-row">
          <div class="payment-label">Discount</div>
          <div class="payment-value">-${formatCurrency(data.discount || 0)}</div>
        </div>` : ''}
        <div class="payment-row total-row">
          <div class="payment-label">Total</div>
          <div class="payment-value">${formatCurrency(noteTotals.total)}</div>
        </div>
      </div>
    </div>
  </div>

  <!-- SIGNATURES -->
  <div class="sig-section no-break">
    <div class="section-title">Authorization & Signatures</div>
    <div class="sig-grid">
      <div class="sig-box">
        <div class="sig-title">Prepared By</div>
        <div class="sig-field">
          <div class="sig-label">Name</div>
          <div class="sig-value">${data.preparedBy || '—'}</div>
        </div>
        <div class="sig-field">
          <div class="sig-label">Date</div>
          <div class="sig-value">${data.preparedDate || '—'}</div>
        </div>
        <div class="sig-line">Signature</div>
      </div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="spn-footer">
    <div class="footer-content">
      <div class="footer-thankyou">Thank you for your business!</div>
      <div class="footer-generated">Generated: ${currentDate} at ${timeStr}</div>
    </div>
    <div class="footer-bottom">
      ${data.businessName} &bull; ${data.businessPhone} ${data.businessEmail ? '&bull; ' + data.businessEmail : ''}
    </div>
  </div>

  ${options.autoPrint ? `<script>window.onload = function() { window.print(); ${options.autoClose ? 'window.close();' : ''} };</script>` : ''}
</body>
</html>`;
  };

  // Function to generate supplier purchase note HTML for printing
  const generateSupplierPurchaseNoteHTML = (): string => {
    const items = supplierPurchaseNoteData.items;
    const totalItems = items.length;
    const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalPackages = items.filter(item => item.unit && item.quantity).length;
    const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
    const discount = supplierPurchaseNoteData.discount || 0;
    const total = subtotal - discount;
    
    return buildSupplierPurchaseNotePrintHTML(
      supplierPurchaseNoteData,
      { totalItems, totalQuantity, totalPackages },
      { subtotal, total }
    );
  };
  
  // Handle print invoice - generate PDF and trigger print dialog
  const handlePrintInvoice = () => {
    // Show loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded shadow-lg z-50';
    loadingIndicator.textContent = 'Preparing invoice for printing...';
    document.body.appendChild(loadingIndicator);
    
    try {
      // Generate clean invoice HTML
      const cleanInvoiceHTML = generateCleanInvoiceHTML();
      
      // Create a new window with the invoice content
      const printWindow = window.open('', '_blank', 'width=800,height=1000');
      
      if (printWindow) {
        // Write the invoice HTML directly to the new window
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Invoice ${invoiceData.invoiceNumber}</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                margin: 0; 
                padding: 20px; 
                background: white;
              }
              @media print {
                body { margin: 0; padding: 10px; }
              }
            </style>
          </head>
          <body>
            ${cleanInvoiceHTML}
          </body>
          </html>
        `);
        
        printWindow.document.close();
        
        // Remove loading indicator
        if (loadingIndicator.parentNode) {
          loadingIndicator.parentNode.removeChild(loadingIndicator);
        }
        
        // Wait for content to load, then print
        printWindow.onload = () => {
          setTimeout(() => {
            try {
              printWindow.print();
              
              // Close window after printing
              printWindow.onafterprint = () => {
                printWindow.close();
              };
            } catch (printError) {
              console.error('Error during printing:', printError);
              // Just keep window open if printing fails
            }
          }, 500);
        };
        
        // Close dialogs and reset data
        closeInvoiceOptionsDialog();
        resetInvoiceData();
      } else {
        // Popup blocked - fallback to download
        if (loadingIndicator.parentNode) {
          loadingIndicator.parentNode.removeChild(loadingIndicator);
        }
        
        alert('Popup blocked. Please allow popups for this site to enable printing.');
        closeInvoiceOptionsDialog();
        resetInvoiceData();
      }
    } catch (error) {
      console.error('Error in print invoice handler:', error);
      
      // Cleanup
      if (loadingIndicator.parentNode) {
        loadingIndicator.parentNode.removeChild(loadingIndicator);
      }
      
      alert('Error preparing invoice for printing. Please try again.');
      closeInvoiceOptionsDialog();
      resetInvoiceData();
    }
  };
  
  // Handle download invoice - show download options dialog
  const handleDownloadInvoice = () => {
    setShowInvoiceOptions(false);
    setShowDownloadOptions(true);
  };
  
  // Handle download as PDF
  const handleDownloadAsPDF = () => {
    // Show loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
    loadingIndicator.textContent = 'Generating PDF...';
    document.body.appendChild(loadingIndicator);
    
    try {
      // Generate clean invoice HTML
      const cleanInvoiceHTML = generateCleanInvoiceHTML();
      
      // Create a simple HTML document with the invoice
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invoice ${invoiceData.invoiceNumber}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px; 
              background: white;
            }
          </style>
        </head>
        <body>
          ${cleanInvoiceHTML}
        </body>
        </html>
      `;
      
      // Create blob and download link
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice_${invoiceData.invoiceNumber}_${new Date().getTime()}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      URL.revokeObjectURL(url);
      
      // Remove loading indicator
      if (loadingIndicator.parentNode) {
        loadingIndicator.parentNode.removeChild(loadingIndicator);
      }
      
      // Show success message
      const successMsg = document.createElement('div');
      successMsg.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
      successMsg.textContent = 'Invoice downloaded as HTML successfully!';
      document.body.appendChild(successMsg);
      
      setTimeout(() => {
        if (successMsg.parentNode) {
          successMsg.parentNode.removeChild(successMsg);
        }
      }, 3000);
      
      // Close dialogs and reset data
      setShowDownloadOptions(false);
      resetInvoiceData();
    } catch (error) {
      console.error('Error in download PDF handler:', error);
      
      // Cleanup
      if (loadingIndicator.parentNode) {
        loadingIndicator.parentNode.removeChild(loadingIndicator);
      }
      
      alert('Error preparing invoice download. Please try again.');
      setShowDownloadOptions(false);
      resetInvoiceData();
    }
  };
  
  // Handle download as Excel (reusing existing export functionality)
  const handleDownloadAsExcel = () => {
    // Show loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
    loadingIndicator.textContent = 'Generating Excel file...';
    document.body.appendChild(loadingIndicator);
    
    import('xlsx').then((XLSXModule) => {
      try {
        // Create worksheet data
        const wsData = [
          ['INVOICE', invoiceData.invoiceNumber],
          ['Invoice Date', invoiceData.invoiceDate],
          ['Due Date', invoiceData.dueDate],
          [],
          ['FROM:'],
          [invoiceData.businessName],
          [invoiceData.businessAddress],
          ['Phone:', invoiceData.businessPhone],
          ['Email:', invoiceData.businessEmail],
          [],
          ['BILL TO:'],
          [invoiceData.clientName],
          [invoiceData.clientAddress],
          [invoiceData.clientCityState],
          ['Phone:', invoiceData.clientPhone],
          ['Email:', invoiceData.clientEmail],
          [],
          ['DESCRIPTION', 'QUANTITY', 'UNIT', 'RATE', 'AMOUNT'],
          ...invoiceData.items.map(item => [
            item.description, 
            item.quantity, 
            item.unit, 
            `${formatCurrency(item.rate)}`, 
            `${formatCurrency(item.amount)}`
          ]),
          [],
          ['SUBTOTAL', `${formatCurrency(calculateInvoiceTotals().subtotal)}`],
          ['DISCOUNT', `${formatCurrency(invoiceData.discount)}`],
          ['TAX', `${formatCurrency(invoiceData.tax)}`],
          ['TOTAL', `${formatCurrency(calculateInvoiceTotals().total)}`],
          ['Amount Paid', `${formatCurrency(invoiceData.amountPaid)}`],
          ['Credit Brought Forward from previous', `${formatCurrency(invoiceData.creditBroughtForward)}`],
          ['AMOUNT DUE', `${formatCurrency(calculateInvoiceTotals().amountDue)}`]
        ];
        
        const ws = XLSXModule.utils.aoa_to_sheet(wsData);
        const wb = XLSXModule.utils.book_new();
        XLSXModule.utils.book_append_sheet(wb, ws, 'Invoice');
        
        XLSXModule.writeFile(wb, `Invoice_${invoiceData.invoiceNumber}_${new Date().getTime()}.xlsx`);
        
        // Remove loading indicator
        if (loadingIndicator.parentNode) {
          loadingIndicator.parentNode.removeChild(loadingIndicator);
        }
        
        // Show success message
        const successMsg = document.createElement('div');
        successMsg.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
        successMsg.textContent = 'Excel file downloaded successfully!';
        document.body.appendChild(successMsg);
        
        setTimeout(() => {
          if (successMsg.parentNode) {
            successMsg.parentNode.removeChild(successMsg);
          }
        }, 3000);
        
        setShowDownloadOptions(false);
        resetInvoiceData();
      } catch (error) {
        console.error('Error generating Excel:', error);
        
        // Remove loading indicator
        if (loadingIndicator.parentNode) {
          loadingIndicator.parentNode.removeChild(loadingIndicator);
        }
        
        alert('Error generating Excel file. Please try again.');
        setShowDownloadOptions(false);
        resetInvoiceData();
      }
    }).catch(err => {
      console.error('Error loading xlsx library:', err);
      
      // Remove loading indicator
      if (loadingIndicator.parentNode) {
        loadingIndicator.parentNode.removeChild(loadingIndicator);
      }
      
      alert('Error loading Excel library. Please check your internet connection and try again.');
      setShowDownloadOptions(false);
      resetInvoiceData();
    });
  };
  
  // Handle download as CSV
  const handleDownloadAsCSV = () => {
    try {
      // Show loading indicator
      const loadingIndicator = document.createElement('div');
      loadingIndicator.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
      loadingIndicator.textContent = 'Generating CSV file...';
      document.body.appendChild(loadingIndicator);
      
      let csvContent = 'data:text/csv;charset=utf-8,Invoice Details\n';
      csvContent += `Invoice Number,${invoiceData.invoiceNumber}\n`;
      csvContent += `Invoice Date,${invoiceData.invoiceDate}\n`;
      csvContent += `Due Date,${invoiceData.dueDate}\n`;
      csvContent += '\n';
      csvContent += 'FROM,\n';
      csvContent += `${invoiceData.businessName},\n`;
      csvContent += `${invoiceData.businessAddress},\n`;
      csvContent += `Phone,${invoiceData.businessPhone}\n`;
      csvContent += `Email,${invoiceData.businessEmail}\n`;
      csvContent += '\n';
      csvContent += 'BILL TO,\n';
      csvContent += `${invoiceData.clientName},\n`;
      csvContent += `${invoiceData.clientAddress},\n`;
      csvContent += `${invoiceData.clientCityState},\n`;
      csvContent += `Phone,${invoiceData.clientPhone}\n`;
      csvContent += `Email,${invoiceData.clientEmail}\n`;
      csvContent += '\n';
      csvContent += 'Item Description,Quantity,Unit,Rate,Amount\n';
      
      invoiceData.items.forEach(item => {
        // Sanitize data for CSV (escape commas and quotes)
        const sanitize = (str: string) => {
          if (typeof str !== 'string') return String(str);
          if (str.includes(',') || str.includes('\"') || str.includes('\n')) {
            return `"${str.replace(/\"/g, '\"\"')}"`;
          }
          return str;
        };
        
        csvContent += `${sanitize(item.description)},${item.quantity},${sanitize(item.unit)},${sanitize(formatCurrency(item.rate))},${sanitize(formatCurrency(item.amount))}\n`;
      });
      
      csvContent += '\n';
      csvContent += `Subtotal,${formatCurrency(calculateInvoiceTotals().subtotal)}\n`;
      csvContent += `Discount,${formatCurrency(invoiceData.discount)}\n`;
      csvContent += `Tax,${formatCurrency(invoiceData.tax)}\n`;
      csvContent += `Total,${formatCurrency(calculateInvoiceTotals().total)}\n`;
      csvContent += `Amount Paid,${formatCurrency(invoiceData.amountPaid)}\n`;
      csvContent += `Credit Brought Forward from previous,${formatCurrency(invoiceData.creditBroughtForward)}\n`;
      csvContent += `Amount Due,${formatCurrency(calculateInvoiceTotals().amountDue)}\n`;
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Invoice_${invoiceData.invoiceNumber}_${new Date().getTime()}.csv`);
      document.body.appendChild(link);
      
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      
      // Remove loading indicator
      if (loadingIndicator.parentNode) {
        loadingIndicator.parentNode.removeChild(loadingIndicator);
      }
      
      // Show success message
      const successMsg = document.createElement('div');
      successMsg.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
      successMsg.textContent = 'CSV file downloaded successfully!';
      document.body.appendChild(successMsg);
      
      setTimeout(() => {
        if (successMsg.parentNode) {
          successMsg.parentNode.removeChild(successMsg);
        }
      }, 3000);
      
      setShowDownloadOptions(false);
      resetInvoiceData();
    } catch (error) {
      console.error('Error generating CSV:', error);
      
      // Remove any loading indicators
      const indicators = document.querySelectorAll('.fixed.top-4.right-4.bg-green-500');
      indicators.forEach(indicator => {
        if (indicator.parentNode) {
          indicator.parentNode.removeChild(indicator);
        }
      });
      
      alert('Error generating CSV file. Please try again.');
      setShowDownloadOptions(false);
      resetInvoiceData();
    }
  };
  
  // Close download options dialog
  const closeDownloadOptionsDialog = () => {
    setShowDownloadOptions(false);
  };
  
  // Handle save invoice to saved invoices section
  const handleSaveInvoice = async () => {
    try {
      // Validate that all quantities are available before saving
      let hasUnavailableItems = false;
      for (const item of invoiceData.items) {
        if (item.description && item.quantity > 0) {
          const availability = await checkItemAvailability(item.description, item.quantity);
          if (!availability.available) {
            alert(`Insufficient stock for "${item.description}". Available: ${availability.availableQuantity} in GRN: ${availability.grnNumber || 'N/A'}. Please reduce the quantity.`);
            hasUnavailableItems = true;
            break;
          }
        }
      }
      
      if (hasUnavailableItems) {
        return; // Don't save if there are unavailable items
      }

      // Create invoice data for saving
      const invoiceToSave: SavedInvoiceData = {
        id: invoiceData.invoiceNumber, // Use invoice number as ID
        invoiceNumber: invoiceData.invoiceNumber,
        date: invoiceData.invoiceDate,
        customer: invoiceData.clientName,
        items: invoiceData.items.filter(item => item.quantity > 0).length,
        total: invoiceData.total,
        paymentMethod: 'N/A', // Templates don't have payment method
        status: 'completed', // For templates, mark as completed
        itemsList: invoiceData.items,
        subtotal: invoiceData.subtotal,
        tax: invoiceData.tax,
        discount: invoiceData.discount,
        amountReceived: 0,
        change: 0,
        amountPaid: invoiceData.amountPaid || 0,
        creditBroughtForward: invoiceData.creditBroughtForward || 0,
        amountDue: invoiceData.amountDue || (invoiceData.total - (invoiceData.amountPaid || 0) + (invoiceData.creditBroughtForward || 0)),
      };
      
      await saveInvoice(invoiceToSave);
      
      // Check if business name is "KILANGO INVESTMENT LTD" to handle stock decrement in Product Inventory
      const isKilangoInvestment = invoiceData.businessName === "KILANGO INVESTMENT LTD";
      
      if (isKilangoInvestment) {
        // Update Product Inventory for consumed items
        for (const item of invoiceData.items) {
          if (item.description && item.quantity > 0) {
            try {
              // Find the product in the database to decrement stock
              const { getProducts, updateProduct } = await import('@/services/databaseService');
              const allProducts = await getProducts();
              const product = allProducts.find(p => 
                p.name.toLowerCase().trim() === item.description.toLowerCase().trim()
              );
              
              if (product) {
                // Decrement the product stock by the quantity
                const currentStock = product.stock_quantity || 0;
                const newStock = Math.max(0, currentStock - item.quantity);
                const updatedProduct = { ...product, stock_quantity: newStock };
                await updateProduct(product.id!, updatedProduct);
                console.log(`Product ${product.name} stock updated from ${currentStock} to ${newStock} after invoice save`);
              }
            } catch (error) {
              console.error('Error updating product inventory after invoice save:', error);
            }
          }
        }
      }
      
      // Check if business name is "KILANGO INVESTMENT LTD" to handle inventory update
      // Variable isKilangoInvestment already declared earlier in the function
      
      // Only update GRN quantities for consumed items if business name is "KILANGO INVESTMENT LTD"
      if (isKilangoInvestment) {
        const consumedItems = invoiceData.items.map(item => ({
          description: item.description,
          quantity: item.quantity
        }));
        await updateGRNQuantitiesFromInvoice(consumedItems);
      }
      
      // Close the dialog and show success message
      setShowInvoiceOptions(false);
      alert(`Invoice ${invoiceData.invoiceNumber} saved successfully to Saved Invoices!\nGRN quantities updated for consumed items.`);
      
      // Reset the invoice data for new input
      resetInvoiceData();
    } catch (error) {
      console.error('Error saving invoice:', error);
      alert('Error saving invoice. Please try again.');
    }
  };

  const handleSaveSalesOrder = async () => {
    try {
      // Validate that all quantities are available before saving
      let hasUnavailableItems = false;
      for (const item of salesOrderData.items) {
        if (item.description && item.quantity > 0) {
          const availability = await checkItemAvailability(item.description, item.quantity);
          if (!availability.available) {
            alert(`Insufficient stock for "${item.description}". Available: ${availability.availableQuantity} in GRN: ${availability.grnNumber || 'N/A'}. Please reduce the quantity.`);
            hasUnavailableItems = true;
            break;
          }
        }
      }
      
      if (hasUnavailableItems) {
        return; // Don't save if there are unavailable items
      }

      // Generate a unique order number with higher precision timestamp and random suffix
      const timestamp = new Date().getTime();
      const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const uniqueOrderNumber = `SO-${timestamp}-${randomSuffix}`;

      // Create sales order data for saving
      const salesOrderToSave: SavedSalesOrderData = {
        id: uniqueOrderNumber, // Use unique order number as ID
        orderNumber: uniqueOrderNumber,
        date: salesOrderData.orderDate,
        customer: salesOrderData.customerName,
        customerId: undefined, // Templates don't have customer ID linkage
        items: salesOrderData.items.filter(item => item.quantity > 0).length,
        total: salesOrderData.total,
        status: 'pending', // Sales orders from templates are pending
        itemsList: salesOrderData.items.map(item => ({
          productId: undefined,
          productName: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          price: item.unitPrice,
          total: item.total,
          unit: item.unit
        })),
        subtotal: salesOrderData.subtotal,
        tax: salesOrderData.taxAmount,
        discount: salesOrderData.discount,
        amountPaid: 0, // Pending orders are unpaid
        creditBroughtForward: 0,
        amountDue: salesOrderData.total, // Full amount due for pending orders
        notes: salesOrderData.specialInstructions
      };
      
      await saveSalesOrder(salesOrderToSave);
      
      // Check if business name is "KILANGO INVESTMENT LTD" to handle inventory update
      const isKilangoInvestment = salesOrderData.businessName === "KILANGO INVESTMENT LTD";
      
      // Note: We don't update GRN or product stock yet because this is just a sales order
      // Stock will be updated when the order is fulfilled and converted to an invoice/delivery
      
      // Update the UI with the new order number for display purposes
      setSalesOrderData(prev => ({
        ...prev,
        orderNumber: uniqueOrderNumber
      }));
      
      // Show the sales order options dialog after saving
      showSalesOrderOptionsDialog();
      
      // Don't reset here - let the user choose an option first
    } catch (error: any) {
      console.error('Error saving sales order:', error);
      
      // Check if it's a duplicate key error
      if (error.code === '23505' || error.message?.includes('duplicate key')) {
        // This is very unlikely with our unique generation, but handle it gracefully
        alert('This order has already been saved. A new order number will be generated.');
        // Generate a new order number for next attempt
        resetSalesOrderData();
      } else {
        alert('Error saving sales order. Please try again.');
      }
    }
  };
  
  // Handle share invoice - show share options dialog
  const handleShareInvoice = () => {
    setShowInvoiceOptions(false);
    setShowShareOptions(true);
  };
  
  // Handle WhatsApp share
  const handleWhatsAppShare = () => {
    // Create a text version of the invoice for sharing
    let invoiceText = `*INVOICE*\n\n`;
    invoiceText += `*Invoice Number:* ${invoiceData.invoiceNumber}\n`;
    invoiceText += `*Invoice Date:* ${invoiceData.invoiceDate}\n`;
    invoiceText += `*Due Date:* ${invoiceData.dueDate}\n`;
    invoiceText += `*Generated at:* ${new Date().toLocaleString()}\n\n`;
    
    invoiceText += `*FROM:*\n`;
    invoiceText += `${invoiceData.businessName}\n`;
    invoiceText += `${invoiceData.businessAddress}\n`;
    invoiceText += `Phone: ${invoiceData.businessPhone}\n`;
    invoiceText += `Email: ${invoiceData.businessEmail}\n\n`;
    
    invoiceText += `*BILL TO:*\n`;
    invoiceText += `${invoiceData.clientName}\n`;
    invoiceText += `${invoiceData.clientAddress}\n`;
    invoiceText += `${invoiceData.clientCityState}\n`;
    invoiceText += `Phone: ${invoiceData.clientPhone}\n`;
    invoiceText += `Email: ${invoiceData.clientEmail}\n\n`;
    
    invoiceText += `*ITEMS:*\n`;
    invoiceData.items.forEach(item => {
      invoiceText += `${item.description} - ${item.quantity} ${item.unit} @ ${formatCurrency(item.rate)} = ${formatCurrency(item.amount)}\n`;
    });
    
    invoiceText += `\n*SUBTOTAL:* ${formatCurrency(calculateInvoiceTotals().subtotal)}\n`;
    invoiceText += `*DISCOUNT:* ${formatCurrency(invoiceData.discount)}\n`;
    invoiceText += `*TAX:* ${formatCurrency(invoiceData.tax)}\n`;
    invoiceText += `*TOTAL:* ${formatCurrency(calculateInvoiceTotals().total)}\n`;
    invoiceText += `*Amount Paid:* ${formatCurrency(invoiceData.amountPaid)}\n`;
    invoiceText += `*Credit Brought Forward from previous:* ${formatCurrency(invoiceData.creditBroughtForward)}\n`;
    invoiceText += `*AMOUNT DUE:* ${formatCurrency(calculateInvoiceTotals().amountDue)}\n`;
    
    // Format phone number for WhatsApp (remove all non-digit characters except the plus sign)
    if (invoiceData.clientPhone) {
      const formattedPhoneNumber = invoiceData.clientPhone.replace(/[^+\d]/g, '');
      WhatsAppUtils.sendWhatsAppMessage(formattedPhoneNumber, invoiceText);
    } else {
      alert('Client phone number is not available. Please add a phone number to share via WhatsApp.');
    }
    
    setShowShareOptions(false);
  };
  
  // Handle Email share
  const handleEmailShare = () => {
    // Create a text version of the invoice for sharing
    let invoiceText = `INVOICE\n\n`;
    invoiceText += `Invoice Number: ${invoiceData.invoiceNumber}\n`;
    invoiceText += `Invoice Date: ${invoiceData.invoiceDate}\n`;
    invoiceText += `Due Date: ${invoiceData.dueDate}\n`;
    invoiceText += `Generated at: ${new Date().toLocaleString()}\n\n`;
    
    invoiceText += `FROM:\n`;
    invoiceText += `${invoiceData.businessName}\n`;
    invoiceText += `${invoiceData.businessAddress}\n`;
    invoiceText += `Phone: ${invoiceData.businessPhone}\n`;
    invoiceText += `Email: ${invoiceData.businessEmail}\n\n`;
    
    invoiceText += `BILL TO:\n`;
    invoiceText += `${invoiceData.clientName}\n`;
    invoiceText += `${invoiceData.clientAddress}\n`;
    invoiceText += `${invoiceData.clientCityState}\n`;
    invoiceText += `Phone: ${invoiceData.clientPhone}\n`;
    invoiceText += `Email: ${invoiceData.clientEmail}\n\n`;
    
    invoiceText += `ITEMS:\n`;
    invoiceData.items.forEach(item => {
      invoiceText += `${item.description} - ${item.quantity} ${item.unit} @ ${formatCurrency(item.rate)} = ${formatCurrency(item.amount)}\n`;
    });
    
    invoiceText += `\nSUBTOTAL: ${formatCurrency(calculateInvoiceTotals().subtotal)}\n`;
    invoiceText += `DISCOUNT: ${formatCurrency(invoiceData.discount)}\n`;
    invoiceText += `TAX: ${formatCurrency(invoiceData.tax)}\n`;
    invoiceText += `TOTAL: ${formatCurrency(calculateInvoiceTotals().total)}\n`;
    invoiceText += `Amount Paid: ${formatCurrency(invoiceData.amountPaid)}\n`;
    invoiceText += `Credit Brought Forward from previous: ${formatCurrency(invoiceData.creditBroughtForward)}\n`;
    invoiceText += `AMOUNT DUE: ${formatCurrency(calculateInvoiceTotals().amountDue)}\n`;
    
    // Create mailto link
    const subject = `Invoice ${invoiceData.invoiceNumber}`;
    const body = encodeURIComponent(invoiceText);
    
    if (invoiceData.clientEmail) {
      const mailtoLink = `mailto:${invoiceData.clientEmail}?subject=${encodeURIComponent(subject)}&body=${body}`;
      window.open(mailtoLink, '_blank');
    } else {
      alert('Client email address is not available. Please add an email address to share via email.');
    }
    
    setShowShareOptions(false);
  };
  
  // Handle copy to clipboard
  const handleCopyToClipboard = () => {
    // Create a text version of the invoice for sharing
    let invoiceText = `INVOICE\n`;
    invoiceText += `Invoice Number: ${invoiceData.invoiceNumber}\n`;
    invoiceText += `Invoice Date: ${invoiceData.invoiceDate}\n`;
    invoiceText += `Due Date: ${invoiceData.dueDate}\n`;
    invoiceText += `Generated at: ${new Date().toLocaleString()}\n\n`;
    
    invoiceText += `FROM:\n`;
    invoiceText += `${invoiceData.businessName}\n`;
    invoiceText += `${invoiceData.businessAddress}\n`;
    invoiceText += `Phone: ${invoiceData.businessPhone}\n`;
    invoiceText += `Email: ${invoiceData.businessEmail}\n\n`;
    
    invoiceText += `BILL TO:\n`;
    invoiceText += `${invoiceData.clientName}\n`;
    invoiceText += `${invoiceData.clientAddress}\n`;
    invoiceText += `${invoiceData.clientCityState}\n`;
    invoiceText += `Phone: ${invoiceData.clientPhone}\n`;
    invoiceText += `Email: ${invoiceData.clientEmail}\n\n`;
    
    invoiceText += `ITEMS:\n`;
    invoiceData.items.forEach(item => {
      invoiceText += `${item.description} - ${item.quantity} ${item.unit} @ TSH ${item.rate.toFixed(2)} = TSH ${item.amount.toFixed(2)}\n`;
    });
    
    invoiceText += `\nSUBTOTAL: TSH ${calculateInvoiceTotals().subtotal.toFixed(2)}\n`;
    invoiceText += `DISCOUNT: TSH ${invoiceData.discount.toFixed(2)}\n`;
    invoiceText += `TAX: TSH ${invoiceData.tax.toFixed(2)}\n`;
    invoiceText += `TOTAL: TSH ${calculateInvoiceTotals().total.toFixed(2)}\n`;
    invoiceText += `AMOUNT DUE: TSH ${calculateInvoiceTotals().amountDue.toFixed(2)}\n`;
    
    navigator.clipboard.writeText(invoiceText)
      .then(() => {
        alert('Invoice details copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
        alert('Failed to copy invoice details to clipboard');
      });
    
    setShowShareOptions(false);
  };
  
  // Close share options dialog
  const closeShareOptionsDialog = () => {
    setShowShareOptions(false);
  };
  
  // Handle export invoice as Excel
  // Handle print sales order
  const handlePrintSalesOrder = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Sales Order - ${salesOrderData.orderNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .info-section { margin-bottom: 20px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background-color: #f5f5f5; }
            .totals { margin-top: 20px; text-align: right; }
            .totals table { width: auto; margin-left: auto; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>SALES ORDER</h1>
            <p>Order #${salesOrderData.orderNumber}</p>
          </div>
          
          <div class="info-section">
            <div class="info-grid">
              <div>
                <h3>From:</h3>
                <p>
                  ${salesOrderData.businessName}<br/>
                  ${salesOrderData.businessAddress}<br/>
                  Phone: ${salesOrderData.businessPhone}<br/>
                  Email: ${salesOrderData.businessEmail}
                </p>
              </div>
              <div>
                <h3>To:</h3>
                <p>
                  ${salesOrderData.customerName}<br/>
                  ${salesOrderData.customerAddress}<br/>
                  ${salesOrderData.customerDistrictWard ? `${salesOrderData.customerDistrictWard}<br/>` : ''}
                  Phone: ${salesOrderData.customerPhone}<br/>
                  Email: ${salesOrderData.customerEmail}
                  ${salesOrderData.customerTaxId ? `<br/>TIN: ${salesOrderData.customerTaxId}` : ''}
                </p>
              </div>
            </div>
          </div>
          
          <div class="info-section">
            <p><strong>Order Date:</strong> ${salesOrderData.orderDate}</p>
            <p><strong>Required By:</strong> ${salesOrderData.requiredBy || 'Not specified'}</p>
            <p><strong>Payment Terms:</strong> ${salesOrderData.paymentTerms || 'Not specified'}</p>
            <p><strong>Shipping Method:</strong> ${salesOrderData.shippingMethod || 'Not specified'}</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Description</th>
                <th>Quantity</th>
                <th>Unit</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${salesOrderData.items.map((item, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${item.description}</td>
                  <td>${item.quantity}</td>
                  <td>${item.unit || 'pcs'}</td>
                  <td>${formatCurrency(item.unitPrice)}</td>
                  <td>${formatCurrency(item.total)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="totals">
            <table>
              <tr>
                <td><strong>Subtotal:</strong></td>
                <td>${formatCurrency(salesOrderData.subtotal)}</td>
              </tr>
              <tr>
                <td><strong>Discount:</strong></td>
                <td>-${formatCurrency(salesOrderData.discount)}</td>
              </tr>
              <tr>
                <td><strong>Tax (${salesOrderData.taxRate}%):</strong></td>
                <td>${formatCurrency(salesOrderData.taxAmount)}</td>
              </tr>
              <tr>
                <td><strong>Shipping:</strong></td>
                <td>${formatCurrency(salesOrderData.shippingCost || 0)}</td>
              </tr>
              <tr style="font-size: 1.2em; font-weight: bold;">
                <td><strong>TOTAL:</strong></td>
                <td>${formatCurrency(salesOrderData.total)}</td>
              </tr>
            </table>
          </div>
          
          ${salesOrderData.specialInstructions ? `
            <div class="info-section" style="margin-top: 30px;">
              <h3>Special Instructions:</h3>
              <p>${salesOrderData.specialInstructions}</p>
            </div>
          ` : ''}
          
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
        </html>
      `;
      
      printWindow.document.write(printContent);
      printWindow.document.close();
    }
  };

  // Handle download sales order
  const handleDownloadSalesOrder = () => {
    setShowSalesOrderOptions(false);
    // For now, directly download as PDF
    handleDownloadSalesOrderAsPDF();
  };

  // Handle download sales order as PDF
  const handleDownloadSalesOrderAsPDF = () => {
    try {
      // Import html2pdf dynamically
      import('html2pdf.js').then((html2pdf) => {
        // Create a temporary element with the sales order content
        const element = document.createElement('div');
        element.innerHTML = `
          <div style="padding: 20px; font-family: Arial, sans-serif;">
            <h1 style="text-align: center;">SALES ORDER</h1>
            <p style="text-align: center;">Order #${salesOrderData.orderNumber}</p>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
              <div>
                <h3>From:</h3>
                <p>${salesOrderData.businessName}<br/>${salesOrderData.businessAddress}<br/>Phone: ${salesOrderData.businessPhone}<br/>Email: ${salesOrderData.businessEmail}</p>
              </div>
              <div>
                <h3>To:</h3>
                <p>${salesOrderData.customerName}<br/>${salesOrderData.customerAddress}<br/>Phone: ${salesOrderData.customerPhone}<br/>Email: ${salesOrderData.customerEmail}</p>
              </div>
            </div>
            <p><strong>Order Date:</strong> ${salesOrderData.orderDate}</p>
            <p><strong>Required By:</strong> ${salesOrderData.requiredBy || 'Not specified'}</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <thead>
                <tr style="background-color: #f5f5f5;">
                  <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">#</th>
                  <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Description</th>
                  <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Quantity</th>
                  <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Unit</th>
                  <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Unit Price</th>
                  <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${salesOrderData.items.map((item, index) => `
                  <tr>
                    <td style="border: 1px solid #ddd; padding: 10px;">${index + 1}</td>
                    <td style="border: 1px solid #ddd; padding: 10px;">${item.description}</td>
                    <td style="border: 1px solid #ddd; padding: 10px;">${item.quantity}</td>
                    <td style="border: 1px solid #ddd; padding: 10px;">${item.unit || 'pcs'}</td>
                    <td style="border: 1px solid #ddd; padding: 10px;">${formatCurrency(item.unitPrice)}</td>
                    <td style="border: 1px solid #ddd; padding: 10px;">${formatCurrency(item.total)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div style="text-align: right; margin-top: 20px;">
              <p><strong>Subtotal:</strong> ${formatCurrency(salesOrderData.subtotal)}</p>
              <p><strong>Discount:</strong> -${formatCurrency(salesOrderData.discount)}</p>
              <p><strong>Tax:</strong> ${formatCurrency(salesOrderData.taxAmount)}</p>
              <p><strong>Total:</strong> ${formatCurrency(salesOrderData.total)}</p>
            </div>
          </div>
        `;
        
        document.body.appendChild(element);
        
        const opt = {
          margin: 10,
          filename: `SalesOrder_${salesOrderData.orderNumber}.pdf`,
          image: { type: 'jpeg' as const, quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
        };
        
        html2pdf.default().set(opt).from(element).save().then(() => {
          document.body.removeChild(element);
        });
      }).catch(err => {
        console.error('Error generating PDF:', err);
        alert('Error generating PDF file. Please try again.');
      });
    } catch (error) {
      console.error('Error downloading sales order:', error);
      alert('Error downloading sales order. Please try again.');
    }
  };

  // Handle share sales order
  const handleShareSalesOrder = () => {
    setShowSalesOrderOptions(false);
    // For now, show a simple alert - can be enhanced with WhatsApp/Email sharing like invoices
    let shareText = `SALES ORDER\n\n`;
    shareText += `Order #: ${salesOrderData.orderNumber}\n`;
    shareText += `Order Date: ${salesOrderData.orderDate}\n`;
    shareText += `Customer: ${salesOrderData.customerName}\n\n`;
    shareText += `Items:\n`;
    salesOrderData.items.forEach(item => {
      shareText += `- ${item.description}: ${item.quantity} ${item.unit || 'pcs'} @ ${formatCurrency(item.unitPrice)} = ${formatCurrency(item.total)}\n`;
    });
    shareText += `\nSubtotal: ${formatCurrency(salesOrderData.subtotal)}\n`;
    shareText += `Discount: -${formatCurrency(salesOrderData.discount)}\n`;
    shareText += `Tax: ${formatCurrency(salesOrderData.taxAmount)}\n`;
    shareText += `TOTAL: ${formatCurrency(salesOrderData.total)}\n`;
    
    navigator.clipboard.writeText(shareText).then(() => {
      alert('Sales order details copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy: ', err);
      alert('Failed to copy sales order details to clipboard');
    });
  };

  // Handle export sales order as Excel
  const handleExportSalesOrder = () => {
    import('xlsx').then((XLSXModule) => {
      // Create worksheet data
      const wsData = [
        ['SALES ORDER', salesOrderData.orderNumber],
        ['Order Date', salesOrderData.orderDate],
        ['Required By', salesOrderData.requiredBy || ''],
        [],
        ['FROM:'],
        [salesOrderData.businessName],
        [salesOrderData.businessAddress],
        ['Phone:', salesOrderData.businessPhone],
        ['Email:', salesOrderData.businessEmail],
        [],
        ['TO:'],
        [salesOrderData.customerName],
        [salesOrderData.customerAddress],
        ['Phone:', salesOrderData.customerPhone],
        ['Email:', salesOrderData.customerEmail],
        [],
        ['DESCRIPTION', 'QUANTITY', 'UNIT', 'UNIT PRICE', 'TOTAL'],
        ...salesOrderData.items.map(item => [
          item.description, 
          item.quantity, 
          item.unit || 'pcs', 
          `${formatCurrency(item.unitPrice)}`, 
          `${formatCurrency(item.total)}`
        ]),
        [],
        ['SUBTOTAL', `${formatCurrency(salesOrderData.subtotal)}`],
        ['DISCOUNT', `${formatCurrency(salesOrderData.discount)}`],
        ['TAX', `${formatCurrency(salesOrderData.taxAmount)}`],
        ['TOTAL', `${formatCurrency(salesOrderData.total)}`]
      ];
      
      const ws = XLSXModule.utils.aoa_to_sheet(wsData);
      const wb = XLSXModule.utils.book_new();
      XLSXModule.utils.book_append_sheet(wb, ws, 'Sales Order');
      
      XLSXModule.writeFile(wb, `SalesOrder_${salesOrderData.orderNumber}.xlsx`);
      
      closeSalesOrderOptionsDialog();
    }).catch(err => {
      console.error('Error generating Excel:', err);
      alert('Error generating Excel file. Please try again.');
    });
  };

  const handleExportInvoice = () => {
    import('xlsx').then((XLSXModule) => {
      // Create worksheet data
      const wsData = [
        ['INVOICE', invoiceData.invoiceNumber],
        ['Invoice Date', invoiceData.invoiceDate],
        ['Due Date', invoiceData.dueDate],
        [],
        ['FROM:'],
        [invoiceData.businessName],
        [invoiceData.businessAddress],
        ['Phone:', invoiceData.businessPhone],
        ['Email:', invoiceData.businessEmail],
        [],
        ['BILL TO:'],
        [invoiceData.clientName],
        [invoiceData.clientAddress],
        [invoiceData.clientCityState],
        ['Phone:', invoiceData.clientPhone],
        ['Email:', invoiceData.clientEmail],
        [],
        ['DESCRIPTION', 'QUANTITY', 'UNIT', 'RATE', 'AMOUNT'],
        ...invoiceData.items.map(item => [
          item.description, 
          item.quantity, 
          item.unit, 
          `${formatCurrency(item.rate)}`, 
          `${formatCurrency(item.amount)}`
        ]),
        [],
        ['SUBTOTAL', `${formatCurrency(calculateInvoiceTotals().subtotal)}`],
        ['DISCOUNT', `${formatCurrency(invoiceData.discount)}`],
        ['TAX', `${formatCurrency(invoiceData.tax)}`],
        ['TOTAL', `${formatCurrency(calculateInvoiceTotals().total)}`],
        ['Amount Paid', `${formatCurrency(invoiceData.amountPaid)}`],
        ['Credit Brought Forward from previous', `${formatCurrency(invoiceData.creditBroughtForward)}`],
        ['AMOUNT DUE', `${formatCurrency(calculateInvoiceTotals().amountDue)}`]
      ];
      
      const ws = XLSXModule.utils.aoa_to_sheet(wsData);
      const wb = XLSXModule.utils.book_new();
      XLSXModule.utils.book_append_sheet(wb, ws, 'Invoice');
      
      XLSXModule.writeFile(wb, `Invoice_${invoiceData.invoiceNumber}.xlsx`);
    }).catch(err => {
      console.error('Error generating Excel:', err);
      alert('Error generating Excel file. Please try again.');
    });
    
    closeInvoiceOptionsDialog();
    
    // Reset the invoice data for new input
    resetInvoiceData();
  };
  
  // Add new invoice item
  const handleAddInvoiceItem = () => {
    setInvoiceData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: Date.now().toString(),
          description: "",
          quantity: 1,
          unit: "",
          rate: 0,
          amount: 0
        }
      ]
    }));
  };
  
  // Remove invoice item
  const handleRemoveInvoiceItem = (itemId: string) => {
    setInvoiceData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }));
  };
  
  // Calculate invoice totals
  const calculateInvoiceTotals = () => {
    const subtotal = invoiceData.items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const total = subtotal + Number(invoiceData.tax || 0) - Number(invoiceData.discount || 0);
    const amountDue = total - Number(invoiceData.amountPaid || 0) + Number(invoiceData.creditBroughtForward || 0);
    
    return { subtotal, total, amountDue };
  };
  
  const calculateInvoiceTotalQuantity = () => {
    return invoiceData.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  };
  
  // Update totals when invoice data changes
  useEffect(() => {
    // Recalculate totals when items, tax, or discount change
    const newSubtotal = invoiceData.items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const newTotal = newSubtotal + Number(invoiceData.tax || 0) - Number(invoiceData.discount || 0);
    const newAmountDue = newTotal - Number(invoiceData.amountPaid || 0) + Number(invoiceData.creditBroughtForward || 0);
    
    setInvoiceData(prev => ({
      ...prev,
      subtotal: newSubtotal,
      total: newTotal,
      amountDue: newAmountDue
    }));
  }, [invoiceData.items, invoiceData.tax, invoiceData.discount, invoiceData.amountPaid, invoiceData.creditBroughtForward]);
  
  // Handle expense voucher data changes
  const handleExpenseVoucherChange = (field: keyof ExpenseVoucherData, value: string | number) => {
    setExpenseVoucherData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Handle expense voucher item changes
  const handleExpenseVoucherItemChange = (itemId: string, field: keyof ExpenseVoucherItem, value: string | number) => {
    setExpenseVoucherData(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.id === itemId ? { ...item, [field]: value } : item
      )
    }));
  };
  
  // Add new expense voucher item
  const handleAddExpenseVoucherItem = () => {
    setExpenseVoucherData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: Date.now().toString(),
          description: "",
          category: "",
          amount: 0,
          date: ""
        }
      ]
    }));
  };
  
  // Remove expense voucher item
  const handleRemoveExpenseVoucherItem = (itemId: string) => {
    setExpenseVoucherData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }));
  };
  
  // Calculate expense voucher totals
  const calculateExpenseVoucherTotals = () => {
    const totalAmount = expenseVoucherData.items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    
    return { totalAmount };
  };
  
  // Handle salary slip data changes
  const handleSalarySlipChange = (field: keyof SalarySlipData, value: string | number) => {
    setSalarySlipData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Calculate salary slip totals
  const calculateSalarySlipTotals = () => {
    const grossPay = salarySlipData.basicSalary + salarySlipData.allowances + salarySlipData.overtime + salarySlipData.bonus;
    const totalDeductions = salarySlipData.tax + salarySlipData.insurance + salarySlipData.otherDeductions;
    const netPay = grossPay - totalDeductions;
      
    return { grossPay, totalDeductions, netPay };
  };
  
  // Handle complimentary goods data changes
  const handleComplimentaryGoodsChange = (field: keyof ComplimentaryGoodsData, value: string) => {
    setComplimentaryGoodsData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Handle complimentary goods item changes
  const handleComplimentaryGoodsItemChange = (itemId: string, field: keyof ComplimentaryGoodsItem, value: string | number) => {
    setComplimentaryGoodsData(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.id === itemId ? { ...item, [field]: value } : item
      )
    }));
  };
  
  // Handle customer settlement changes
  const handleCustomerSettlementChange = (field: keyof CustomerSettlementData, value: string | number) => {
    setCustomerSettlementData(prev => {
      let updatedData = { ...prev, [field]: value };
      
      // Calculate new balance when previous balance or amount paid changes
      if (field === 'previousBalance' || field === 'amountPaid') {
        const prevBalance = field === 'previousBalance' ? (Number(value) || 0) : (prev.previousBalance || 0);
        const amountPaid = field === 'amountPaid' ? (Number(value) || 0) : (prev.amountPaid || 0);
        updatedData.newBalance = prevBalance - amountPaid;
      }
      
      return updatedData;
    });
  };
  
  // Handle supplier settlement data changes
  const handleSupplierSettlementChange = (field: keyof UtilsSupplierSettlementData, value: string | number) => {
    setSupplierSettlementData(prev => {
      let updatedData = { ...prev, [field]: value };
      
      // Calculate new balance when previous balance or amount paid changes
      if (field === 'previousBalance' || field === 'amountPaid') {
        const prevBalance = field === 'previousBalance' ? Number(value) : prev.previousBalance;
        const amountPaid = field === 'amountPaid' ? Number(value) : prev.amountPaid;
        updatedData.newBalance = prevBalance - amountPaid;
      }
      
      return updatedData;
    });
  };
  
  // Add new complimentary goods item
  const handleAddComplimentaryGoodsItem = () => {
    setComplimentaryGoodsData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: Date.now().toString(),
          description: "",
          quantity: 1,
          unit: ""
        }
      ]
    }));
  };
  
  // Remove complimentary goods item
  const handleRemoveComplimentaryGoodsItem = (itemId: string) => {
    setComplimentaryGoodsData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }));
  };
  
  // Calculate complimentary goods totals
  const calculateComplimentaryGoodsTotals = () => {
    const totalItems = complimentaryGoodsData.items.length;
    const totalQuantity = complimentaryGoodsData.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    
    return { totalItems, totalQuantity };
  };
  
  // Effect to recalculate complimentary goods totals when data changes
  useEffect(() => {
    calculateComplimentaryGoodsTotals();
  }, [complimentaryGoodsData.items]);

  // Find the template being viewed/edited
  const currentTemplate = templates.find(t => t.id === (selectedTemplate || viewingTemplate)) || templates[0];

  // Get icon for template type
  const getTemplateIcon = (type: string) => {
    switch (type) {
      case "delivery-note": return <Truck className="h-5 w-5" />;
      case "order-form": return <FileSpreadsheet className="h-5 w-5" />;
      case "contract": return <ScrollText className="h-5 w-5" />;
      case "invoice": return <FileText className="h-5 w-5" />;
      case "receipt": return <Receipt className="h-5 w-5" />;
      case "notice": return <FileWarning className="h-5 w-5" />;
      case "quotation": return <FileCheck className="h-5 w-5" />;
      case "report": return <FileBarChart className="h-5 w-5" />;
      case "salary-slip": return <FileUser className="h-5 w-5" />;
      case "complimentary-goods": return <Gift className="h-5 w-5" />;
      case "expense-voucher": return <Wallet className="h-5 w-5" />;
      case "customer-settlement": return <HandCoins className="h-5 w-5" />;
      case "supplier-settlement": return <Truck className="h-5 w-5" />;
      case "sales-order": return <ShoppingCart className="h-5 w-5" />;
      case "stock-take": return <ClipboardCheck className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  const totals = calculateTotals();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Business Templates</h1>
              <p className="text-muted-foreground">Professional templates for your business documents</p>
            </div>
            {onBack && (
              <Button variant="outline" onClick={onBack}>
                ← Back to Dashboard
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 sm:p-6">
        <Card>
          <CardHeader>
            <CardTitle>
              {activeTab === "manage" 
                ? "Template Management" 
                : activeTab === "preview" && viewingTemplate
                  ? (currentTemplate?.type === "order-form" 
                    ? "Purchase Order Preview" 
                    : currentTemplate?.type === "invoice" 
                      ? "Invoice Preview" 
                      : currentTemplate?.type === "expense-voucher" 
                        ? "Expense Voucher Preview" 
                        : currentTemplate?.type === "salary-slip" 
                          ? "Salary Slip Preview" 
                          : currentTemplate?.type === "complimentary-goods" 
                            ? "Complimentary Goods Preview" 
                            : currentTemplate?.type === "report" 
                              ? "Report Template Preview" 
                              : currentTemplate?.type === "customer-settlement" 
                                ? "Customer Settlement Preview"
                                : currentTemplate?.type === "supplier-settlement" 
                                  ? "Supplier Settlement Preview"
                                  : currentTemplate?.type === "sales-order"
                                    ? "Sales Order Preview"
                                    : currentTemplate?.type === "stock-take"
                                      ? "Stock Take Preview"
                                      : "Delivery Note Preview")
                  : viewingTemplate 
                    ? `Viewing Template: ${currentTemplate?.name || 'Template'}`
                    : selectedTemplate 
                      ? `Editing Template: ${currentTemplate?.name || 'Template'}`
                      : "Template Customization"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeTab === "manage" ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold">Available Templates</h3>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setActiveTab('savedDeliveries')}
                      className="flex items-center gap-2"
                    >
                      <Truck className="h-4 w-4" />
                      Saved Deliveries
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setActiveTab('savedCustomerSettlements')}
                      className="flex items-center gap-2"
                    >
                      <HandCoins className="h-4 w-4" />
                      Saved Customer Settlements
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setActiveTab('savedSupplierSettlements')}
                      className="flex items-center gap-2"
                    >
                      <Truck className="h-4 w-4" />
                      Saved Supplier Settlements
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setActiveTab('savedGRNs')}
                      className="flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Saved GRNs
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setActiveTab('savedStockTakes')}
                      className="flex items-center gap-2"
                    >
                      <ClipboardCheck className="h-4 w-4" />
                      Saved Stock Takes
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setActiveTab('savedSupplierPurchaseNotes')}
                      className="flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Supplier Purchase Notes
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {templates.map((template) => (
                    <Card 
                      key={template.id} 
                      className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handlePreviewTemplate(template.id)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="mt-1">
                            {getTemplateIcon(template.type)}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{template.name}</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {template.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : activeTab === "savedDeliveries" ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl font-semibold">Saved Deliveries</h3>
                    <p className="text-sm text-muted-foreground">View and manage your saved delivery notes</p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => setActiveTab('manage')}
                    className="flex items-center gap-2"
                  >
                    ← Back to Templates
                  </Button>
                </div>
                <SavedDeliveriesSection 
                  onBack={() => setActiveTab('manage')} 
                  onLogout={() => {}} 
                  username="User" 
                />
              </div>
            ) : activeTab === "savedCustomerSettlements" ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl font-semibold">Saved Customer Settlements</h3>
                    <p className="text-sm text-muted-foreground">View and manage your saved customer settlements</p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => setActiveTab('manage')}
                    className="flex items-center gap-2"
                  >
                    ← Back to Templates
                  </Button>
                </div>
                <SavedCustomerSettlementsSection 
                  onBack={() => setActiveTab('manage')} 
                  onLogout={() => {}} 
                  username="User" 
                />
              </div>
            ) : activeTab === "savedSupplierSettlements" ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl font-semibold">Saved Supplier Settlements</h3>
                    <p className="text-sm text-muted-foreground">View and manage your saved supplier settlements</p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => setActiveTab('manage')}
                    className="flex items-center gap-2"
                  >
                    ← Back to Templates
                  </Button>
                </div>
                <SavedSupplierSettlementsSection 
                  onBack={() => setActiveTab('manage')} 
                  onLogout={() => {}} 
                  username="User" 
                />
              </div>
            ) : activeTab === "savedGRNs" ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl font-semibold">Saved Goods Received Notes</h3>
                    <p className="text-sm text-muted-foreground">View and manage your saved GRNs</p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => setActiveTab('manage')}
                    className="flex items-center gap-2"
                  >
                    ← Back to Templates
                  </Button>
                </div>
                <SavedGRNsSection 
                  onBack={() => setActiveTab('manage')} 
                  onLogout={() => {}} 
                  username="User"
                  onEditGRN={(grn) => {
                    setGrnData({
                      ...grn.data,
                      numberOfSuppliers: grn.data.numberOfSuppliers || 1,
                      suppliers: grn.data.suppliers || [{
                        id: "supplier-1",
                        name: grn.data.supplierName || "",
                        supplierId: grn.data.supplierId || "",
                        phone: grn.data.supplierPhone || "",
                        email: grn.data.supplierEmail || "",
                        address: grn.data.supplierAddress || "",
                        tinNumber: grn.data.supplierTinNumber || "",
                        businessTin: grn.data.businessTin || "",
                        stockType: grn.data.businessStockType || ""
                      }],
                      businessStockType: grn.data.businessStockType || "",
                      isVatable: grn.data.isVatable ?? false,
                      supplierTinNumber: grn.data.supplierTinNumber || "",
                      receivingCosts: grn.data.receivingCosts || [],
                      status: grn.data.status || "completed"
                    });
                    setViewingTemplate('14');
                    setActiveTab('preview');
                  }}
                />
              </div>
            ) : activeTab === "savedSalesOrders" ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl font-semibold">Saved Sales Orders</h3>
                    <p className="text-sm text-muted-foreground">View and manage your pending sales orders</p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => setActiveTab('manage')}
                    className="flex items-center gap-2"
                  >
                    ← Back to Templates
                  </Button>
                </div>
                <SavedSalesOrdersSection 
                  onBack={() => setActiveTab('manage')} 
                  onLogout={() => {}} 
                  username="User" 
                />
              </div>
            ) : activeTab === "savedStockTakes" ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl font-semibold">Saved Stock Takes</h3>
                    <p className="text-sm text-muted-foreground">View and manage your saved physical stock take records</p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => setActiveTab('manage')}
                    className="flex items-center gap-2"
                  >
                    ← Back to Templates
                  </Button>
                </div>
                <SavedStockTakesSection 
                  onBack={() => setActiveTab('manage')} 
                  onLogout={() => {}} 
                  username="User" 
                />
              </div>
            ) : activeTab === "savedSupplierPurchaseNotes" ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl font-semibold">Supplier Purchase Notes</h3>
                    <p className="text-sm text-muted-foreground">View and manage purchase notes created on behalf of suppliers</p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => setActiveTab('manage')}
                    className="flex items-center gap-2"
                  >
                    ← Back to Templates
                  </Button>
                </div>
                <SupplierPurchaseNoteSection 
                  onBack={() => setActiveTab('manage')} 
                  onLogout={() => {}} 
                  username="User" 
                />
              </div>
            ) : activeTab === "preview" ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">
                    {currentTemplate?.type === "order-form" ? "Purchase Order Preview" : currentTemplate?.type === "invoice" ? "Invoice Preview" : currentTemplate?.type === "expense-voucher" ? "Expense Voucher Preview" : currentTemplate?.type === "salary-slip" ? "Salary Slip Preview" : currentTemplate?.type === "complimentary-goods" ? "Complimentary Goods Preview" : currentTemplate?.type === "report" ? "Report Template Preview" : currentTemplate?.type === "customer-settlement" ? "Customer Settlement Preview" : currentTemplate?.type === "supplier-settlement" ? "Supplier Settlement Preview" : currentTemplate?.type === "goods-received-note" ? "Goods Received Note Preview" : currentTemplate?.type === "sales-order" ? "Sales Order Preview" : currentTemplate?.type === "stock-take" ? "Stock Take Preview" : currentTemplate?.type === "supplier-purchase-note" ? "Supplier Purchase Note Preview" : "Delivery Note Preview"}
                  </h3>
                  <div className="flex gap-2">
                    {currentTemplate?.type === "order-form" ? (
                      <Input
                        type="text"
                        placeholder="Purchase Order Name"
                        value={purchaseOrderData.poNumber}
                        onChange={(e) => handlePurchaseOrderChange("poNumber", e.target.value)}
                        className="w-48 h-10"
                      />
                    ) : currentTemplate?.type === "invoice" ? (
                      <Input
                        type="text"
                        placeholder="Invoice Number"
                        value={invoiceData.invoiceNumber}
                        onChange={(e) => handleInvoiceChange("invoiceNumber", e.target.value)}
                        className="w-48 h-10"
                      />
                    ) : currentTemplate?.type === "salary-slip" ? (
                      <Input
                        type="text"
                        placeholder="Employee Name"
                        value={salarySlipData.employeeName}
                        onChange={(e) => handleSalarySlipChange("employeeName", e.target.value)}
                        className="w-48 h-10"
                      />
                    ) : currentTemplate?.type === "complimentary-goods" ? (
                      <Input
                        type="text"
                        placeholder="Voucher Number"
                        value={complimentaryGoodsData.voucherNumber}
                        onChange={(e) => handleComplimentaryGoodsChange("voucherNumber", e.target.value)}
                        className="w-48 h-10"
                      />
                    ) : currentTemplate?.type === "report" ? (
                      <Input
                        type="text"
                        placeholder="Report Name"
                        value={reportName}
                        onChange={(e) => setReportName(e.target.value)}
                        className="w-48 h-10"
                      />
                    ) : currentTemplate?.type === "customer-settlement" ? (
                      <Input
                        type="text"
                        placeholder="Settlement Reference"
                        value={settlementReference}
                        onChange={(e) => setSettlementReference(e.target.value)}
                        className="w-48 h-10"
                      />
                    ) : currentTemplate?.type === "supplier-settlement" ? (
                      <Input
                        type="text"
                        placeholder="Settlement Reference"
                        value={supplierSettlementData.referenceNumber}
                        onChange={(e) => handleSupplierSettlementChange("referenceNumber", e.target.value)}
                        className="w-48 h-10"
                      />
                    ) : currentTemplate?.type === "goods-received-note" ? (
                      <Input
                        type="text"
                        placeholder="GRN Number"
                        value={grnData.grnNumber}
                        onChange={(e) => setGrnData(prev => ({ ...prev, grnNumber: e.target.value }))}
                        className="w-48 h-10"
                      />
                    ) : currentTemplate?.type === "sales-order" ? (
                      <Input
                        type="text"
                        placeholder="Sales Order Number"
                        value={salesOrderData.orderNumber}
                        onChange={(e) => handleSalesOrderChange("orderNumber", e.target.value)}
                        className="w-48 h-10"
                      />
                    ) : currentTemplate?.type === "stock-take" ? (
                      <Input
                        type="text"
                        placeholder="Stock Take Number"
                        value={stockTakeNumber}
                        onChange={(e) => setStockTakeNumber(e.target.value)}
                        className="w-48 h-10"
                      />
                    ) : null}
                    <Button 
                      disabled={isSavingDeliveryNote || isSavingGRN}
                      onClick={async () => {
                        if (isSavingDeliveryNote || isSavingGRN) {
                          console.warn('⚠️ Save already in progress...');
                          return;
                        }
                        
                        if (currentTemplate?.type === "order-form") {
                        alert(`Purchase Order ${purchaseOrderData.poNumber} saved successfully!`);
                      } else if (currentTemplate?.type === "invoice") {
                        // Automatically save invoice to saved invoices
                        try {
                          // Validate that all quantities are available before saving
                          let hasUnavailableItems = false;
                          for (const item of invoiceData.items) {
                            if (item.description && item.quantity > 0) {
                              const availability = await checkItemAvailability(item.description, item.quantity);
                              if (!availability.available) {
                                alert(`Insufficient stock for "${item.description}". Available: ${availability.availableQuantity} in GRN: ${availability.grnNumber || 'N/A'}. Please reduce the quantity.`);
                                hasUnavailableItems = true;
                                break;
                              }
                            }
                          }
                          
                          if (hasUnavailableItems) {
                            return; // Don't save if there are unavailable items
                          }

                          // Create invoice data for saving
                          const invoiceToSave: SavedInvoiceData = {
                            id: invoiceData.invoiceNumber, // Use invoice number as ID
                            invoiceNumber: invoiceData.invoiceNumber,
                            date: invoiceData.invoiceDate,
                            customer: invoiceData.clientName,
                            items: invoiceData.items.reduce((sum, item) => sum + item.quantity, 0), // Total number of items
                            total: invoiceData.total,
                            paymentMethod: 'N/A', // Templates don't have payment method
                            status: 'completed', // For templates, mark as completed
                            itemsList: invoiceData.items.map(item => ({
                              name: item.description,
                              quantity: item.quantity,
                              price: item.rate,
                              total: item.amount
                            })),
                            subtotal: invoiceData.subtotal,
                            tax: invoiceData.tax,
                            discount: invoiceData.discount,
                            amountReceived: 0,
                            change: 0,
                            amountPaid: invoiceData.amountPaid || 0,
                            creditBroughtForward: invoiceData.creditBroughtForward || 0,
                            amountDue: invoiceData.amountDue || (invoiceData.total - (invoiceData.amountPaid || 0) + (invoiceData.creditBroughtForward || 0)),
                          };
                          
                          await saveInvoice(invoiceToSave);
                          
                          // Update GRN quantities for consumed items
                          const consumedItems = invoiceData.items.map(item => ({
                            description: item.description,
                            quantity: item.quantity
                          }));
                          await updateGRNQuantitiesFromInvoice(consumedItems);
                          
                          alert(`Invoice ${invoiceData.invoiceNumber} saved successfully to Saved Invoices!\nGRN quantities updated for consumed items.`);
                          
                          // Show the invoice options dialog after saving
                          showInvoiceOptionsDialog();
                        } catch (error) {
                          console.error('Error saving invoice:', error);
                          alert('Error saving invoice. Please try again.');
                        }
                      } else if (currentTemplate?.type === "sales-order") {
                        // Automatically save sales order to saved sales orders
                        await handleSaveSalesOrder();
                      } else if (currentTemplate?.type === "stock-take") {
                        // Save stock take to database
                        try {
                          const { data: { user } } = await supabase.auth.getUser();

                          if (batchMode) {
                            // BATCH MODE: Save all godowns as one combined record
                            if (batchSelectedGodowns.length === 0) {
                              alert("Please select at least one godown for batch stock take.");
                              return;
                            }
                            // Combine all items from all godowns
                            const allItems: any[] = [];
                            Object.entries(batchItems).forEach(([godownId, items]) => {
                              const godown = batchSelectedGodowns.find(g => g.id === godownId);
                              items.forEach(item => {
                                if (item.productId) {
                                  const zoneId = item.zoneId || null;
                                  allItems.push({
                                    product_id: item.productId,
                                    product_name: item.productName,
                                    godown_id: godownId,
                                    godown_name: godown?.name || '',
                                    zone_id: zoneId,
                                    zone_name: item.zoneName || '',
                                    system_qty: item.systemQty,
                                    physical_count: item.physicalCount,
                                    variance: item.variance,
                                    unit_cost: item.unitCost,
                                    total_cost: item.totalCost,
                                  });
                                }
                              });
                            });
                            if (allItems.length === 0) {
                              alert("Please add at least one product with a physical count across all godowns.");
                              return;
                            }
                            const totals = batchTotals();
                            const stockTakeRecord = {
                              outlet_id: null,
                              stock_take_number: stockTakeNumber,
                              date: new Date().toISOString().split('T')[0],
                              total_products: totals.totalProducts,
                              total_calculated_sold: 0,
                              total_costs: 0,
                              total_price: 0,
                              potential_earnings: 0,
                              avg_turnover: 0,
                              items: allItems,
                              notes: stockTakeNotes,
                              status: 'completed',
                              godown_id: null,
                              godown_name: null,
                              zone_id: null,
                              zone_name: null,
                              take_type: 'batch',
                              total_system_qty: totals.totalSystemQty,
                              total_physical_count: totals.totalPhysicalCount,
                              total_variance: totals.totalVariance,
                              total_investment_value: 0,
                              counted_by: countedByName,
                              counted_by_date: countedByDate,
                              counted_by_timestamp: new Date().toISOString(),
                              verified_by: verifiedByName,
                              verified_by_date: verifiedByDate,
                              verified_by_timestamp: new Date().toISOString(),
                              stock_take_timestamp: new Date().toISOString(),
                              batch_godowns: batchSelectedGodowns.map(g => ({ id: g.id, name: g.name })),
                              created_by: user?.id || null,
                            };
                            const { error } = await supabase.from('saved_stock_takes').insert(stockTakeRecord);
                            if (error) throw error;
                          } else {
                            // SINGLE MODE: Existing logic
                            if (!stockTakeGodownId) {
                              alert("Please select a Godown before saving.");
                              return;
                            }
                            const filledItems = stockTakeItems.filter(item => item.productId);
                            if (filledItems.length === 0) {
                              alert("Please add at least one product with a physical count.");
                              return;
                            }
                            const selectedGodown = godowns.find(g => g.id === stockTakeGodownId);
                            const selectedZone = stockTakeZones.find(z => z.id === stockTakeZoneId);
                            const zoneName = stockTakeZoneId === '__no_zone__' ? 'No Zone' : (selectedZone?.zone_name || '');
                            const stockTakeRecord = {
                              outlet_id: null,
                              stock_take_number: stockTakeNumber,
                              date: new Date().toISOString().split('T')[0],
                              total_products: stockTakeTotals.totalProducts,
                              total_calculated_sold: 0,
                              total_costs: stockTakeTotals.totalInvestmentValue,
                              total_price: 0,
                              potential_earnings: 0,
                              avg_turnover: 0,
                              items: stockTakeItems.filter(item => item.productId).map(item => ({
                                product_id: item.productId,
                                product_name: item.productName,
                                godown_id: stockTakeGodownId,
                                godown_name: selectedGodown?.name || '',
                                zone_id: stockTakeZoneId || null,
                                zone_name: zoneName,
                                system_qty: item.systemQty,
                                physical_count: item.physicalCount,
                                variance: item.variance,
                                unit_cost: item.unitCost,
                                total_cost: item.totalCost,
                              })),
                              notes: stockTakeNotes,
                              status: 'completed',
                              godown_id: stockTakeGodownId,
                              godown_name: selectedGodown?.name || '',
                              zone_id: stockTakeZoneId || null,
                              zone_name: zoneName,
                              take_type: 'investment',
                              total_system_qty: stockTakeTotals.totalSystemQty,
                              total_physical_count: stockTakeTotals.totalPhysicalCount,
                              total_variance: stockTakeTotals.totalVariance,
                              total_investment_value: stockTakeTotals.totalInvestmentValue,
                              counted_by: countedByName,
                              counted_by_date: countedByDate,
                              counted_by_timestamp: new Date().toISOString(),
                              verified_by: verifiedByName,
                              verified_by_date: verifiedByDate,
                              verified_by_timestamp: new Date().toISOString(),
                              stock_take_timestamp: new Date().toISOString(),
                              created_by: user?.id || null,
                            };
                            const { error } = await supabase.from('saved_stock_takes').insert(stockTakeRecord);
                            if (error) throw error;
                          }

                          alert(`Stock Take ${stockTakeNumber} saved successfully!`);
                          showStockTakeOptionsDialog();
                        } catch (error) {
                          console.error('Error saving stock take:', error);
                          alert('Error saving stock take. Please try again.');
                        }
                      } else if (currentTemplate?.type === "salary-slip") {
                        alert(`Salary Slip for ${salarySlipData.employeeName} saved successfully!`);
                      } else if (currentTemplate?.type === "complimentary-goods") {
                        alert(`Complimentary Goods Voucher ${complimentaryGoodsData.voucherNumber} saved successfully!`);
                      } else if (currentTemplate?.type === "report") {
                        alert(`Report Template ${reportName} saved successfully!`);
                      } else if (currentTemplate?.type === "customer-settlement") {
                        try {
                          // Validate required fields before saving
                          if (!customerSettlementData.customerName || customerSettlementData.customerName.trim() === "" || customerSettlementData.customerName === "Customer Name") {
                            alert("Please enter a valid customer name.");
                            return;
                          }
                          
                          if (customerSettlementData.settlementAmount <= 0) {
                            alert("Please enter a valid settlement amount greater than 0.");
                            return;
                          }
                          
                          // Prepare customer settlement data for saving
                          const settlementToSave: SavedCustomerSettlementData = {
                            id: Date.now().toString(), // Generate unique ID
                            customerName: customerSettlementData.customerName.trim(),
                            customerId: customerSettlementData.customerId || "",
                            customerPhone: customerSettlementData.customerPhone || "",
                            customerEmail: customerSettlementData.customerEmail || "",
                            referenceNumber: customerSettlementData.referenceNumber.trim(),
                            settlementAmount: customerSettlementData.settlementAmount,
                            paymentMethod: customerSettlementData.paymentMethod || "Cash",
                            cashierName: customerSettlementData.cashierName || "System",
                            previousBalance: customerSettlementData.previousBalance || 0,
                            amountPaid: customerSettlementData.amountPaid || 0,
                            // Calculate newBalance correctly: previousBalance - amountPaid
                            // This ensures overpayments show negative balances (credits) instead of 0
                            newBalance: (customerSettlementData.previousBalance || 0) - (customerSettlementData.amountPaid || 0),
                            notes: customerSettlementData.notes || "",
                            date: new Date().toISOString().split('T')[0], // Current date
                            time: new Date().toLocaleTimeString(), // Current time
                            status: "completed" // Default status for saved settlements
                          };
                          
                          console.log("Saving customer settlement:", settlementToSave);
                          
                          await saveCustomerSettlement(settlementToSave);
                          
                          // Preserve the settlement data for printing before resetting the form
                          setSettlementToPrint(settlementToSave);
                          
                          // Reset form to default values
                          setCustomerSettlementData({
                            customerName: "Customer Name",
                            customerId: generateCustomerId(),
                            customerPhone: "(555) 123-4567",
                            customerEmail: "customer@example.com",
                            referenceNumber: generateSettlementReference(),
                            settlementAmount: 0,
                            paymentMethod: "Cash",
                            cashierName: "Cashier Name",
                            previousBalance: 0,
                            amountPaid: 0,
                            newBalance: 0,
                            notes: "",
                            date: new Date().toISOString().split('T')[0],
                            time: new Date().toLocaleTimeString(),
                            status: "completed"
                          });
                          
                          // Show the customer settlement options dialog after saving
                          showCustomerSettlementOptionsDialog();
                          
                          // Trigger a storage event to notify other components of the change
                          window.dispatchEvent(new StorageEvent('storage', {
                            key: 'savedSettlements',
                            newValue: JSON.stringify([settlementToSave])
                          }));
                          
                          // Trigger manual refresh event
                          window.dispatchEvent(new Event('refreshSettlements'));
                        } catch (error) {
                          console.error('Error saving customer settlement:', error);
                          alert('Error saving customer settlement. Please try again.');
                        }
                      } else if (currentTemplate?.type === "supplier-settlement") {
                        try {
                          // Validate required fields before saving
                          if (!supplierSettlementData.supplierName || supplierSettlementData.supplierName.trim() === "" || supplierSettlementData.supplierName === "Supplier Name") {
                            alert("Please enter a valid supplier name.");
                            return;
                          }
                          
                          if (supplierSettlementData.settlementAmount <= 0) {
                            alert("Please enter a valid settlement amount greater than 0.");
                            return;
                          }
                          
                          // Prepare supplier settlement data for saving
                          const settlementToSave = {
                            id: Date.now().toString(), // Generate unique ID
                            supplierName: supplierSettlementData.supplierName.trim(),
                            supplierId: supplierSettlementData.supplierId || "",
                            supplierPhone: supplierSettlementData.supplierPhone || "",
                            supplierEmail: supplierSettlementData.supplierEmail || "",
                            referenceNumber: supplierSettlementData.referenceNumber.trim(),
                            settlementAmount: supplierSettlementData.settlementAmount,
                            paymentMethod: supplierSettlementData.paymentMethod || "Cash",
                            processedBy: supplierSettlementData.processedBy || "System",
                            poNumber: supplierSettlementData.poNumber || "",
                            previousBalance: supplierSettlementData.previousBalance || 0,
                            amountPaid: supplierSettlementData.amountPaid || 0,
                            newBalance: supplierSettlementData.newBalance || 0,
                            notes: supplierSettlementData.notes || "",
                            date: new Date().toISOString().split('T')[0], // Current date
                            time: new Date().toLocaleTimeString(), // Current time
                            status: "completed" // Default status for saved settlements
                          };
                          
                          console.log("Saving supplier settlement:", settlementToSave);
                          
                          // Save using the utility function
                          const saveResult = saveSupplierSettlement(settlementToSave as UtilsSupplierSettlementData);
                          
                          if (saveResult) {
                            // Show the supplier settlement options dialog after saving
                            setShowSupplierSettlementOptions(true);
                            
                            // Trigger storage event to notify other components
                            window.dispatchEvent(new StorageEvent('storage', {
                              key: 'savedSupplierSettlements',
                              newValue: JSON.stringify([settlementToSave])
                            }));
                            
                            // Trigger manual refresh event
                            window.dispatchEvent(new Event('refreshSettlements'));
                          } else {
                            throw new Error('Failed to save supplier settlement');
                          }
                        } catch (error) {
                          console.error('Error saving supplier settlement:', error);
                          alert('Error saving supplier settlement. Please try again.');
                        }
                      } else if (currentTemplate?.type === "goods-received-note") {
                        // Use the proper handleSaveGRN function for GRNs
                        await handleSaveGRN();
                      } else {
                        handleSaveDeliveryNote();
                      }
                    }}>
                      {(isSavingDeliveryNote || isSavingGRN) ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </>
                      )}
                    </Button>
                    {currentTemplate?.type === "customer-settlement" && (
                      <Button 
                        variant="outline" 
                        onClick={() => setActiveTab('savedCustomerSettlements')}
                        className="flex items-center gap-2"
                      >
                        <HandCoins className="h-4 w-4" />
                        View Saved Settlements
                      </Button>
                    )}
                    {currentTemplate?.type === "supplier-settlement" && (
                      <Button 
                        variant="outline" 
                        onClick={() => setActiveTab('savedSupplierSettlements')}
                        className="flex items-center gap-2"
                      >
                        <CreditCard className="h-4 w-4" />
                        View Saved Settlements
                      </Button>
                    )}
                    {currentTemplate?.type === "sales-order" && (
                      <Button 
                        variant="outline" 
                        onClick={() => setActiveTab('savedSalesOrders')}
                        className="flex items-center gap-2"
                      >
                        <ShoppingCart className="h-4 w-4" />
                        View Saved Orders
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => setActiveTab("manage")}>
                      Back to Templates
                    </Button>
                    {(currentTemplate?.type !== "invoice" && currentTemplate?.type !== "delivery-note" && currentTemplate?.type !== "customer-settlement" && currentTemplate?.type !== "goods-received-note" && currentTemplate?.type !== "supplier-settlement" && currentTemplate?.type !== "sales-order" && currentTemplate?.type !== "stock-take") && (
                      <>
                        <Button onClick={() => {
                          if (currentTemplate?.type === "order-form") {
                            window.print();
                          } else if (currentTemplate?.type === "salary-slip") {
                            window.print();
                          } else if (currentTemplate?.type === "complimentary-goods") {
                            window.print();
                          } else if (currentTemplate?.type === "report") {
                            window.print();
                          } else if (currentTemplate?.type === "supplier-settlement") {
                            window.print();
                          } else if (currentTemplate?.type === "goods-received-note") {
                            window.print();
                          } else if (currentTemplate?.type === "supplier-purchase-note") {
                            const printWindow = window.open('', '_blank');
                            if (printWindow) {
                              const htmlContent = generateSupplierPurchaseNoteHTML();
                              printWindow.document.write(htmlContent);
                              printWindow.document.close();
                            }
                          } else {
                            handlePrintDeliveryNote();
                          }
                        }}>
                          <Printer className="h-4 w-4 mr-2" />
                          Print
                        </Button>
                        <Button onClick={() => {
                          if (currentTemplate?.type === "order-form") {
                            const content = document.getElementById('template-preview-content');
                            if (content) {
                              const blob = new Blob([content.innerHTML], { type: 'text/html' });
                              const url = URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.href = url;
                              link.download = `Purchase_Order_${purchaseOrderData.poNumber}.html`;
                              link.click();
                              URL.revokeObjectURL(url);
                            }
                          } else if (currentTemplate?.type === "salary-slip") {
                            const content = document.getElementById('template-preview-content');
                            if (content) {
                              const blob = new Blob([content.innerHTML], { type: 'text/html' });
                              const url = URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.href = url;
                              link.download = `Salary_Slip_${salarySlipData.employeeName.replace(/\s+/g, '_')}.html`;
                              link.click();
                              URL.revokeObjectURL(url);
                            }
                          } else if (currentTemplate?.type === "complimentary-goods") {
                            const content = document.getElementById('template-preview-content');
                            if (content) {
                              const blob = new Blob([content.innerHTML], { type: 'text/html' });
                              const url = URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.href = url;
                              link.download = `Complimentary_Goods_Voucher_${complimentaryGoodsData.voucherNumber}.html`;
                              link.click();
                              URL.revokeObjectURL(url);
                            }
                          } else if (currentTemplate?.type === "supplier-settlement") {
                            const content = document.getElementById('template-preview-content');
                            if (content) {
                              const blob = new Blob([content.innerHTML], { type: 'text/html' });
                              const url = URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.href = url;
                              link.download = `Supplier_Settlement_${supplierSettlementData.referenceNumber}.html`;
                              link.click();
                              URL.revokeObjectURL(url);
                            }
                          } else if (currentTemplate?.type === "goods-received-note") {
                            const content = document.getElementById('template-preview-content');
                            if (content) {
                              const blob = new Blob([content.innerHTML], { type: 'text/html' });
                              const url = URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.href = url;
                              link.download = `Goods_Received_Note_${grnData.grnNumber}.html`;
                              link.click();
                              URL.revokeObjectURL(url);
                            }
                          } else {
                            handleDownloadDeliveryNote();
                          }
                        }}>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Saved delivery notes section - only show for delivery notes */}
                {currentTemplate?.type === "delivery-note" && savedDeliveryNotes.length > 0 && (
                  <div className="border rounded-lg p-4">
                    <h4 className="font-bold mb-2">Saved Delivery Notes:</h4>
                    <div className="flex flex-wrap gap-2">
                      {savedDeliveryNotes.map((note) => (
                        <div key={note.id} className="flex items-center gap-2 bg-gray-100 rounded p-2">
                          <span className="text-sm">{note.name}</span>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleViewDeliveryNote(note.id)}
                            className="h-6 px-2"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleLoadDeliveryNote(note.id)}
                            className="h-6 px-2"
                          >
                            Load
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleDeleteSavedNote(note.id)}
                            className="h-6 px-2"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                

                
                <div className="border rounded-lg p-6 max-w-6xl mx-auto" id="template-preview-content">
                  <div className="space-y-6">
                    {/* Header */}
                    {currentTemplate?.type === "order-form" ? (
                      <div className="text-center border-b-2 border-gray-800 pb-2">
                        <h2 className="text-2xl font-bold">PURCHASE ORDER</h2>
                        <p className="text-sm">Official Business Document</p>
                      </div>
                    ) : currentTemplate?.type === "sales-order" ? (
                      <div className="text-center border-b-2 border-gray-800 pb-2">
                        <h2 className="text-2xl font-bold">SALES ORDER</h2>
                        <p className="text-sm">Customer Order Confirmation</p>
                      </div>
                    ) : currentTemplate?.type === "stock-take" ? (
                      <div className="text-center border-b-2 border-gray-800 pb-2">
                        <h2 className="text-2xl font-bold">PHYSICAL STOCK TAKE</h2>
                        <p className="text-sm">Inventory Audit & Reconciliation</p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <h2 className="text-2xl font-bold">DELIVERY NOTE</h2>
                      </div>
                    )}
                    
                    {/* Business Info and Content - Separated by template type */}
                    {currentTemplate?.type === "order-form" ? (
                      // Purchase Order Content
                      <div className="space-y-6">
                        {/* Order Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div>
                            <div className="font-bold mb-1">ORDER #</div>
                            <Input
                              value={purchaseOrderData.poNumber}
                              onChange={(e) => handlePurchaseOrderChange("poNumber", e.target.value)}
                              className="text-sm font-bold mb-4 p-1 h-8"
                            />
                            
                            <div className="font-bold mb-1">FROM:</div>
                            <Input
                              value={purchaseOrderData.businessName}
                              onChange={(e) => handlePurchaseOrderChange("businessName", e.target.value)}
                              className="text-sm mb-1 p-1 h-8"
                            />
                            <Input
                              value={purchaseOrderData.businessAddress}
                              onChange={(e) => handlePurchaseOrderChange("businessAddress", e.target.value)}
                              className="text-sm mb-1 p-1 h-8"
                            />
                            <div className="flex items-center gap-2 text-sm mt-1">
                              <span>Phone:</span>
                              <Input
                                value={purchaseOrderData.businessPhone}
                                onChange={(e) => handlePurchaseOrderChange("businessPhone", e.target.value)}
                                className="text-sm p-1 h-8 w-40 inline-block"
                              />
                            </div>
                            <div className="flex items-center gap-2 text-sm mt-1">
                              <span>Contact:</span>
                              <Input
                                value={purchaseOrderData.businessEmail}
                                onChange={(e) => handlePurchaseOrderChange("businessEmail", e.target.value)}
                                className="text-sm p-1 h-8 w-40 inline-block"
                              />
                            </div>
                          </div>
                          
                          <div>
                            <div className="h-8 mb-4"></div>
                            
                            <div className="font-bold mb-1">TO (Supplier):</div>
                            <div className="text-sm mb-1">
                              <span className="font-medium">Number of Suppliers:</span>
                              <Input 
                                type="number"
                                min="1"
                                value={purchaseOrderData.numberOfSuppliers}
                                onChange={(e) => handlePurchaseOrderChange("numberOfSuppliers", parseInt(e.target.value) || 1)}
                                className="w-full p-1 text-sm mt-1"
                              />
                            </div>
                            <Input
                              value={purchaseOrderData.supplierName}
                              onChange={(e) => handlePurchaseOrderChange("supplierName", e.target.value)}
                              className="text-sm mb-1 p-1 h-8"
                            />
                            <Input
                              value={purchaseOrderData.supplierAddress}
                              onChange={(e) => handlePurchaseOrderChange("supplierAddress", e.target.value)}
                              className="text-sm mb-1 p-1 h-8"
                            />
                            <div className="flex items-center gap-2 text-sm mt-1">
                              <span>Phone:</span>
                              <Input
                                value={purchaseOrderData.supplierPhone}
                                onChange={(e) => handlePurchaseOrderChange("supplierPhone", e.target.value)}
                                className="text-sm p-1 h-8 w-40 inline-block"
                              />
                            </div>
                            <div className="flex items-center gap-2 text-sm mt-1">
                              <span>Contact:</span>
                              <Input
                                value={purchaseOrderData.supplierEmail}
                                onChange={(e) => handlePurchaseOrderChange("supplierEmail", e.target.value)}
                                className="text-sm p-1 h-8 w-40 inline-block"
                              />
                            </div>
                          </div>
                        </div>
                        
                        {/* Document Details */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <div className="text-sm font-medium">DATE</div>
                            <Input
                              type="date"
                              value={purchaseOrderData.date}
                              onChange={(e) => handlePurchaseOrderChange("date", e.target.value)}
                              className="text-sm p-1 h-8"
                            />
                          </div>
                          <div>
                            <div className="text-sm font-medium">REQUIRED BY</div>
                            <Input
                              value={purchaseOrderData.expectedDelivery}
                              onChange={(e) => handlePurchaseOrderChange("expectedDelivery", e.target.value)}
                              className="text-sm p-1 h-8"
                              placeholder="Expected delivery date"
                            />
                          </div>
                          <div>
                            <div className="text-sm font-medium">PAYMENT TERMS</div>
                            <Input
                              value={purchaseOrderData.paymentTerms}
                              onChange={(e) => handlePurchaseOrderChange("paymentTerms", e.target.value)}
                              className="text-sm p-1 h-8"
                              placeholder="Net 30, etc."
                            />
                          </div>
                          <div>
                            <div className="text-sm font-medium">SHIP VIA</div>
                            <Input
                              value={purchaseOrderData.deliveryInstructions}
                              onChange={(e) => handlePurchaseOrderChange("deliveryInstructions", e.target.value)}
                              className="text-sm p-1 h-8"
                              placeholder="Shipping method"
                            />
                          </div>
                        </div>
                        
                        {/* Items Table */}
                        <div>
                          <div className="font-bold mb-2">ITEMS ORDERED:</div>
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-gray-300 text-sm">
                              <thead>
                                <tr className="bg-gray-100">
                                  <th className="border border-gray-300 p-2 text-left">Item #</th>
                                  <th className="border border-gray-300 p-2 text-left">Description</th>
                                  <th className="border border-gray-300 p-2 text-left">Qty</th>
                                  <th className="border border-gray-300 p-2 text-left">Unit</th>
                                  <th className="border border-gray-300 p-2 text-left">Unit Price</th>
                                  <th className="border border-gray-300 p-2 text-left">Total</th>
                                  <th className="border border-gray-300 p-2 text-left">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {purchaseOrderData.items.map((item, index) => (
                                  <tr key={item.id}>
                                    <td className="border border-gray-300 p-2">
                                      ITM-{String(index + 1).padStart(3, '0')}
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                      <Input
                                        value={item.description}
                                        onChange={(e) => handlePurchaseOrderItemChange(item.id, 'description', e.target.value)}
                                        className="p-1 h-8 text-sm"
                                      />
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                      <Input
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => {
                                          const newQuantity = parseFloat(e.target.value);
                                          handlePurchaseOrderItemChange(item.id, 'quantity', newQuantity);
                                          // Update total when quantity changes
                                          handlePurchaseOrderItemChange(item.id, 'total', newQuantity * item.unitPrice);
                                        }}
                                        className="p-1 h-8 text-sm"
                                      />
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                      <Input
                                        value={item.unit}
                                        onChange={(e) => handlePurchaseOrderItemChange(item.id, 'unit', e.target.value)}
                                        className="p-1 h-8 text-sm"
                                      />
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                      <Input
                                        type="number"
                                        step="0.01"
                                        value={item.unitPrice}
                                        onChange={(e) => {
                                          const newPrice = parseFloat(e.target.value);
                                          handlePurchaseOrderItemChange(item.id, 'unitPrice', newPrice);
                                          // Update total when unit price changes
                                          handlePurchaseOrderItemChange(item.id, 'total', item.quantity * newPrice);
                                        }}
                                        className="p-1 h-8 text-sm"
                                      />
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                      {formatCurrency(item.total)}
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                      <Button
                                        onClick={() => handleRemovePurchaseOrderItem(item.id)}
                                        variant="outline"
                                        size="sm"
                                        className="p-1 h-8"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <Button 
                            onClick={handleAddPurchaseOrderItem}
                            variant="outline"
                            size="sm"
                            className="mt-2"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Item
                          </Button>
                        </div>
                        
                        {/* Financial Summary */}
                        <div className="grid grid-cols-1 gap-2 max-w-xs ml-auto">
                          <div className="flex justify-between text-sm">
                            <span className="font-bold">SUBTOTAL</span>
                            <span>{formatCurrency(calculatePurchaseOrderTotals().subtotal)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="font-bold">TAX (8.5%)</span>
                            <span>{formatCurrency(calculatePurchaseOrderTotals().tax)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="font-bold">SHIPPING</span>
                            <Input
                              type="number"
                              step="0.01"
                              value={purchaseOrderData.shipping}
                              onChange={(e) => handlePurchaseOrderChange("shipping", parseFloat(e.target.value) || 0)}
                              className="w-24 inline-block p-1 h-8 text-right text-sm"
                            />
                          </div>
                          <div className="flex justify-between text-sm pt-2 border-t border-gray-300">
                            <span className="font-bold">TOTAL</span>
                            <span className="font-bold">{formatCurrency(calculatePurchaseOrderTotals().total)}</span>
                          </div>
                        </div>
                        
                        {/* Instructions and Approval */}
                        <div className="space-y-4">
                          <div>
                            <div className="font-bold mb-2">SPECIAL INSTRUCTIONS:</div>
                            <Textarea
                              value={purchaseOrderData.notes}
                              onChange={(e) => handlePurchaseOrderChange("notes", e.target.value)}
                              className="min-h-[80px] text-sm"
                              placeholder="Special instructions or requirements..."
                            />
                          </div>
                          
                          <div>
                            <div className="font-bold mb-2">APPROVAL:</div>
                            <Textarea
                              value={purchaseOrderData.authorizedBySignature}
                              onChange={(e) => handlePurchaseOrderChange("authorizedBySignature", e.target.value)}
                              className="min-h-[80px] text-sm"
                              placeholder="Authorization details..."
                            />
                          </div>
                        </div>
                        
                        {/* Signatures */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                          <div>
                            <div className="font-bold mb-2">REQUESTED BY</div>
                            <div className="text-sm space-y-2">
                              <div className="pt-1 mt-8">
                                <Input
                                  value={purchaseOrderData.requestedBy || ""}
                                  onChange={(e) => handlePurchaseOrderChange("requestedBy", e.target.value)}
                                  className="text-xs p-1 h-8 border-b border-black rounded-none focus:ring-0 focus:border-black"
                                  placeholder="Name & Title"
                                />
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="font-bold mb-2">APPROVED BY</div>
                            <div className="text-sm space-y-2">
                              <div className="pt-1 mt-8">
                                <Input
                                  value={purchaseOrderData.approvedBy || ""}
                                  onChange={(e) => handlePurchaseOrderChange("approvedBy", e.target.value)}
                                  className="text-xs p-1 h-8 border-b border-black rounded-none focus:ring-0 focus:border-black"
                                  placeholder="Name & Title"
                                />
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="font-bold mb-2">DATE</div>
                            <div className="text-sm space-y-2">
                              <div className="pt-1 mt-8">
                                <Input
                                  type="date"
                                  value={purchaseOrderData.authorizationDate || ""}
                                  onChange={(e) => handlePurchaseOrderChange("authorizationDate", e.target.value)}
                                  className="text-xs p-1 h-8 border-b border-black rounded-none focus:ring-0 focus:border-black w-full"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : currentTemplate?.type === "sales-order" ? (
                      // Sales Order Content
                      <div className="space-y-6">
                        {/* Order Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div>
                            <div className="font-bold mb-1">ORDER #</div>
                            <Input
                              value={salesOrderData.orderNumber}
                              onChange={(e) => handleSalesOrderChange("orderNumber", e.target.value)}
                              className="text-sm font-bold mb-4 p-1 h-8"
                            />
                            
                            <div className="font-bold mb-1">FROM:</div>
                            <Input
                              value={salesOrderData.businessName}
                              onChange={(e) => handleSalesOrderChange("businessName", e.target.value)}
                              className="text-sm mb-1 p-1 h-8"
                            />
                            <Input
                              value={salesOrderData.businessAddress}
                              onChange={(e) => handleSalesOrderChange("businessAddress", e.target.value)}
                              className="text-sm mb-1 p-1 h-8"
                            />
                            <div className="flex items-center gap-2 text-sm mt-1">
                              <span>Phone:</span>
                              <Input
                                value={salesOrderData.businessPhone}
                                onChange={(e) => handleSalesOrderChange("businessPhone", e.target.value)}
                                className="text-sm p-1 h-8 w-40 inline-block"
                              />
                            </div>
                            <div className="flex items-center gap-2 text-sm mt-1">
                              <span>Contact:</span>
                              <Input
                                value={salesOrderData.businessEmail}
                                onChange={(e) => handleSalesOrderChange("businessEmail", e.target.value)}
                                className="text-sm p-1 h-8 w-40 inline-block"
                              />
                            </div>
                          </div>
                          
                          <div>
                            <div className="font-bold mb-1">SALES REP:</div>
                            <Input
                              value={salesOrderData.salesRep}
                              onChange={(e) => handleSalesOrderChange("salesRep", e.target.value)}
                              className="text-sm mb-4 p-1 h-8"
                            />
                            
                            <div className="font-bold mb-1">TO (Customer):</div>
                            <Input
                              value={salesOrderData.customerName}
                              onChange={(e) => handleSalesOrderChange("customerName", e.target.value)}
                              className="text-sm mb-1 p-1 h-8"
                            />
                            <Input
                              value={salesOrderData.customerAddress}
                              onChange={(e) => handleSalesOrderChange("customerAddress", e.target.value)}
                              className="text-sm mb-1 p-1 h-8"
                            />
                            <div className="flex items-center gap-2 text-sm mt-1">
                              <span>Phone:</span>
                              <Input
                                value={salesOrderData.customerPhone}
                                onChange={(e) => handleSalesOrderChange("customerPhone", e.target.value)}
                                className="text-sm p-1 h-8 w-40 inline-block"
                              />
                            </div>
                            <div className="flex items-center gap-2 text-sm mt-1">
                              <span>Contact:</span>
                              <Input
                                value={salesOrderData.customerEmail}
                                onChange={(e) => handleSalesOrderChange("customerEmail", e.target.value)}
                                className="text-sm p-1 h-8 w-40 inline-block"
                              />
                            </div>
                          </div>
                        </div>
                        
                        {/* Document Details */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <div className="text-sm font-medium">DATE</div>
                            <Input
                              type="date"
                              value={salesOrderData.date}
                              onChange={(e) => handleSalesOrderChange("date", e.target.value)}
                              className="text-sm p-1 h-8"
                            />
                          </div>
                          <div>
                            <div className="text-sm font-medium">ORDER DATE</div>
                            <Input
                              type="date"
                              value={salesOrderData.orderDate}
                              onChange={(e) => handleSalesOrderChange("orderDate", e.target.value)}
                              className="text-sm p-1 h-8"
                            />
                          </div>
                          <div>
                            <div className="text-sm font-medium">REQUIRED BY</div>
                            <Input
                              type="date"
                              value={salesOrderData.requiredBy}
                              onChange={(e) => handleSalesOrderChange("requiredBy", e.target.value)}
                              className="text-sm p-1 h-8"
                            />
                          </div>
                          <div>
                            <div className="text-sm font-medium">PAYMENT TERMS</div>
                            <Input
                              value={salesOrderData.paymentTerms}
                              onChange={(e) => handleSalesOrderChange("paymentTerms", e.target.value)}
                              className="text-sm p-1 h-8"
                              placeholder="Net 30, etc."
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <div className="text-sm font-medium">SHIPPING METHOD</div>
                            <Input
                              value={salesOrderData.shippingMethod}
                              onChange={(e) => handleSalesOrderChange("shippingMethod", e.target.value)}
                              className="text-sm p-1 h-8"
                              placeholder="Standard Delivery"
                            />
                          </div>
                        </div>
                        
                        {/* Items Table */}
                        <div>
                          <div className="font-bold mb-2">ITEMS ORDERED:</div>
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-gray-300 text-sm">
                              <thead>
                                <tr className="bg-gray-100">
                                  <th className="border border-gray-300 p-2 text-left">Item #</th>
                                  <th className="border border-gray-300 p-2 text-left">Description</th>
                                  <th className="border border-gray-300 p-2 text-left">Qty</th>
                                  <th className="border border-gray-300 p-2 text-left">Unit</th>
                                  <th className="border border-gray-300 p-2 text-left">Unit Price</th>
                                  <th className="border border-gray-300 p-2 text-left">Total</th>
                                  <th className="border border-gray-300 p-2 text-left">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {salesOrderData.items.map((item, index) => (
                                  <tr key={item.id}>
                                    <td className="border border-gray-300 p-2">
                                      {String(index + 1).padStart(3, '0')}
                                    </td>
                                    <td className="border border-gray-300 p-2 relative">
                                      <div className="relative">
                                        <Input
                                          value={item.description}
                                          onChange={(e) => {
                                            handleSalesOrderItemChange(item.id, 'description', e.target.value);
                                          }}
                                          onFocus={async (e) => {
                                            console.log('Description field focused, loading products...');
                                            try {
                                              // Load product items map when the input is focused
                                              const itemsMap = await getSalesOrderProductItems();
                                              console.log('Products loaded:', itemsMap.size);
                                              setSalesOrderProductItemsMap(itemsMap);
                                              setSalesOrderProductDescriptions(Array.from(itemsMap.keys()));
                                              setShowSalesOrderDropdown(true);
                                              console.log('Dropdown shown, products count:', Array.from(itemsMap.keys()).length);
                                            } catch (error) {
                                              console.error('Error loading products:', error);
                                            }
                                          }}
                                          onBlur={(e) => {
                                            console.log('Description field blurred');
                                            // Delay hiding the dropdown to allow click events to register
                                            setTimeout(() => {
                                              setShowSalesOrderDropdown(false);
                                              console.log('Dropdown hidden');
                                            }, 200);
                                          }}
                                          className="p-1 h-8 text-sm w-full"
                                          placeholder="Select or enter description..."
                                        />
                                        {showSalesOrderDropdown && (
                                          <div 
                                            id={`sales-order-dropdown-${item.id}`}
                                            className="fixed bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto z-[9999]"
                                            style={{ minWidth: '400px', maxHeight: '300px' }}
                                            onMouseDown={(e) => e.preventDefault()} // Prevent blur from closing dropdown
                                          >
                                            {salesOrderProductDescriptions.length > 0 ? (
                                              salesOrderProductDescriptions
                                                .filter(desc => 
                                                  item.description === "" || desc.toLowerCase().includes(item.description.toLowerCase())
                                                )
                                                .map((desc, idx) => (
                                                  <div
                                                    key={idx}
                                                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                                                    onClick={() => {
                                                      handleSalesOrderItemChange(item.id, 'description', desc);
                                                      // Set the selling_price and unit from the product inventory if available
                                                      const itemDataFromProduct = salesOrderProductItemsMap.get(desc);
                                                      if (itemDataFromProduct) {
                                                        handleSalesOrderItemChange(item.id, 'unitPrice', itemDataFromProduct.rate);
                                                        handleSalesOrderItemChange(item.id, 'unit', itemDataFromProduct.unit);
                                                        // Also update the total based on the effective rate and existing quantity
                                                        const newTotal = item.quantity * itemDataFromProduct.rate;
                                                        handleSalesOrderItemChange(item.id, 'total', newTotal);
                                                        calculateSalesOrderTotals();
                                                      }
                                                      setShowSalesOrderDropdown(false);
                                                    }}
                                                  >
                                                    {desc}
                                                  </div>
                                                ))
                                            ) : (
                                              <div className="px-3 py-2 text-gray-500 text-sm">Loading products...</div>
                                            )}
                                            {salesOrderProductDescriptions.length > 0 && 
                                              salesOrderProductDescriptions.filter(desc => 
                                                item.description === "" || desc.toLowerCase().includes(item.description.toLowerCase())
                                              ).length === 0 && (
                                                <div className="px-3 py-2 text-gray-500 text-sm">No products found</div>
                                              )
                                            }
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                      <Input
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => {
                                          const newQuantity = parseFloat(e.target.value);
                                          handleSalesOrderItemChange(item.id, 'quantity', newQuantity);
                                        }}
                                        className="p-1 h-8 text-sm"
                                      />
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                      <Input
                                        value={item.unit}
                                        onChange={(e) => handleSalesOrderItemChange(item.id, 'unit', e.target.value)}
                                        className="p-1 h-8 text-sm"
                                      />
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                      <Input
                                        type="number"
                                        step="0.01"
                                        value={item.unitPrice}
                                        onChange={(e) => {
                                          const newPrice = parseFloat(e.target.value);
                                          handleSalesOrderItemChange(item.id, 'unitPrice', newPrice);
                                        }}
                                        className="p-1 h-8 text-sm"
                                      />
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                      {formatCurrency(item.total)}
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemoveSalesOrderItem(item.id)}
                                        className="p-1 h-8"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <Button 
                            onClick={handleAddSalesOrderItem}
                            variant="outline"
                            size="sm"
                            className="mt-2"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Item
                          </Button>
                        </div>
                        
                        {/* Financial Summary */}
                        <div className="grid grid-cols-1 gap-2 max-w-xs ml-auto">
                          <div className="flex justify-between text-sm">
                            <span className="font-bold">SUBTOTAL</span>
                            <span>{formatCurrency(salesOrderData.subtotal)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="font-bold">DISCOUNT</span>
                            <Input
                              type="number"
                              step="0.01"
                              value={salesOrderData.discount}
                              onChange={(e) => {
                                handleSalesOrderChange("discount", parseFloat(e.target.value) || 0);
                                calculateSalesOrderTotals();
                              }}
                              className="w-24 inline-block p-1 h-8 text-right text-sm"
                            />
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="font-bold">TAX ({salesOrderData.taxRate}%)</span>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                step="0.1"
                                value={salesOrderData.taxRate}
                                onChange={(e) => {
                                  handleSalesOrderChange("taxRate", parseFloat(e.target.value) || 0);
                                  calculateSalesOrderTotals();
                                }}
                                className="w-16 p-1 h-8 text-right text-sm"
                              />
                              <span>{formatCurrency(salesOrderData.taxAmount)}</span>
                            </div>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="font-bold">SHIPPING</span>
                            <Input
                              type="number"
                              step="0.01"
                              value={salesOrderData.shippingCost}
                              onChange={(e) => {
                                handleSalesOrderChange("shippingCost", parseFloat(e.target.value) || 0);
                                calculateSalesOrderTotals();
                              }}
                              className="w-24 inline-block p-1 h-8 text-right text-sm"
                            />
                          </div>
                          <div className="flex justify-between text-sm pt-2 border-t border-gray-300">
                            <span className="font-bold">TOTAL</span>
                            <span className="font-bold">{formatCurrency(salesOrderData.total)}</span>
                          </div>
                        </div>
                        
                        {/* Special Instructions */}
                        <div>
                          <div className="font-bold mb-2">SPECIAL INSTRUCTIONS:</div>
                          <textarea
                            value={salesOrderData.specialInstructions}
                            onChange={(e) => handleSalesOrderChange("specialInstructions", e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded text-sm h-20"
                            placeholder="Enter any special instructions for this order..."
                          />
                        </div>
                        
                        {/* Signatures Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8">
                          <div>
                            <div className="font-bold mb-2">CUSTOMER ACKNOWLEDGMENT:</div>
                            <div className="text-sm mb-2">
                              I hereby confirm this order and agree to the terms and conditions.
                            </div>
                            <div className="border-t border-gray-400 pt-8 mt-4">
                              <div className="text-sm mb-1">Customer Signature:</div>
                              <Input
                                value={salesOrderData.customerSignature}
                                onChange={(e) => handleSalesOrderChange("customerSignature", e.target.value)}
                                className="text-sm p-1 h-8 border-b border-black rounded-none focus:ring-0 focus:border-black"
                                placeholder="Signature"
                              />
                              <div className="flex justify-between text-sm mt-2">
                                <div>
                                  <div className="mb-1">Date:</div>
                                  <Input
                                    type="date"
                                    value={salesOrderData.signatureDate}
                                    onChange={(e) => handleSalesOrderChange("signatureDate", e.target.value)}
                                    className="text-sm p-1 h-8 border-b border-black rounded-none focus:ring-0 focus:border-black w-full"
                                  />
                                </div>
                                <div>
                                  <div className="mb-1">Print Name:</div>
                                  <Input
                                    value={salesOrderData.customerPrintName}
                                    onChange={(e) => handleSalesOrderChange("customerPrintName", e.target.value)}
                                    className="text-sm p-1 h-8 border-b border-black rounded-none focus:ring-0 focus:border-black w-full"
                                    placeholder="Full Name"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="font-bold mb-2">AUTHORIZED BY:</div>
                            <div className="border-t border-gray-400 pt-8 mt-4">
                              <div className="text-sm mb-1">Sales Representative:</div>
                              <Input
                                value={salesOrderData.salesRepSignature}
                                onChange={(e) => handleSalesOrderChange("salesRepSignature", e.target.value)}
                                className="text-sm p-1 h-8 border-b border-black rounded-none focus:ring-0 focus:border-black"
                                placeholder="Signature"
                              />
                              <div className="text-sm mt-1 mb-1">Date:</div>
                              <Input
                                type="date"
                                value={salesOrderData.authDate}
                                onChange={(e) => handleSalesOrderChange("authDate", e.target.value)}
                                className="text-sm p-1 h-8 border-b border-black rounded-none focus:ring-0 focus:border-black w-full"
                              />
                              
                              <div className="text-sm mt-4 mb-1">Manager Approval:</div>
                              <Input
                                value={salesOrderData.managerApproval}
                                onChange={(e) => handleSalesOrderChange("managerApproval", e.target.value)}
                                className="text-sm p-1 h-8 border-b border-black rounded-none focus:ring-0 focus:border-black"
                                placeholder="Signature"
                              />
                              <div className="text-sm mt-1 mb-1">Date:</div>
                              <Input
                                type="date"
                                value={salesOrderData.approvalDate}
                                onChange={(e) => handleSalesOrderChange("approvalDate", e.target.value)}
                                className="text-sm p-1 h-8 border-b border-black rounded-none focus:ring-0 focus:border-black w-full"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : currentTemplate?.type === "invoice" ? (
                      // Invoice Content
                      <div className="space-y-6">
                        {/* Header with Amount Due */}
                        <div className="text-center">
                          <h2 className="text-2xl font-bold">INVOICE</h2>
                          <div className="text-xl font-bold mt-2">
                            {invoiceData.invoiceNumber}
                          </div>
                          <div className="text-sm mt-1">Generated: {invoiceData.timestamp}</div>
                          <div className="text-sm mt-1">AMOUNT DUE</div>
                          <div className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(invoiceData.amountDue)}</div>
                        </div>
                        
                        {/* Business and Client Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div>
                            <div className="font-bold mb-1">FROM:</div>
                            <Input
                              value={invoiceData.businessName}
                              onChange={(e) => handleInvoiceChange('businessName', e.target.value)}
                              className="text-sm mb-1 p-1 h-8"
                            />
                            <Input
                              value={invoiceData.businessAddress}
                              onChange={(e) => handleInvoiceChange('businessAddress', e.target.value)}
                              className="text-sm mb-1 p-1 h-8"
                            />
                            <div className="flex items-center gap-2 text-sm mt-1">
                              <span>Phone:</span>
                              <Input
                                value={invoiceData.businessPhone}
                                onChange={(e) => handleInvoiceChange('businessPhone', e.target.value)}
                                className="text-sm p-1 h-8 w-40 inline-block"
                              />
                            </div>
                            <div className="flex items-center gap-2 text-sm mt-1">
                              <span>Email:</span>
                              <Input
                                value={invoiceData.businessEmail}
                                onChange={(e) => handleInvoiceChange('businessEmail', e.target.value)}
                                className="text-sm p-1 h-8 w-40 inline-block"
                              />
                            </div>
                          </div>
                          
                          <div>
                            <div className="font-bold mb-1">BILL TO:</div>
                            <Input
                              value={invoiceData.clientName}
                              onChange={(e) => handleInvoiceChange('clientName', e.target.value)}
                              className="text-sm mb-1 p-1 h-8"
                            />
                            <Input
                              value={invoiceData.clientAddress}
                              onChange={(e) => handleInvoiceChange('clientAddress', e.target.value)}
                              className="text-sm mb-1 p-1 h-8"
                            />
                            <Input
                              value={invoiceData.clientCityState}
                              onChange={(e) => handleInvoiceChange('clientCityState', e.target.value)}
                              className="text-sm mb-1 p-1 h-8"
                            />
                            <div className="flex items-center gap-2 text-sm mt-1">
                              <span>Phone:</span>
                              <Input
                                value={invoiceData.clientPhone}
                                onChange={(e) => handleInvoiceChange('clientPhone', e.target.value)}
                                className="text-sm p-1 h-8 w-40 inline-block"
                              />
                            </div>
                            <div className="flex items-center gap-2 text-sm mt-1">
                              <span>Email:</span>
                              <Input
                                value={invoiceData.clientEmail}
                                onChange={(e) => handleInvoiceChange('clientEmail', e.target.value)}
                                className="text-sm p-1 h-8 w-40 inline-block"
                              />
                            </div>
                          </div>
                        </div>
                        
                        {/* Invoice Details */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <div className="text-sm font-medium">INVOICE DATE</div>
                            <div className="text-sm">{invoiceData.invoiceDate}</div>
                          </div>
                          <div>
                            <div className="text-sm font-medium">DUE DATE</div>
                            <Input
                              type="date"
                              value={invoiceData.dueDate}
                              onChange={(e) => handleInvoiceChange('dueDate', e.target.value)}
                              className="text-sm p-1 h-8"
                            />
                          </div>
                          <div>
                            <div className="text-sm font-medium">TERMS</div>
                            <Input
                              value={invoiceData.terms}
                              onChange={(e) => handleInvoiceChange('terms', e.target.value)}
                              className="text-sm p-1 h-8"
                            />
                          </div>
                        </div>
                        
                        {/* Items Table */}
                        <div>
                          <div className="font-bold mb-2">SERVICES RENDERED:</div>
                          <div className="overflow-x-auto relative">
                            <table className="w-full border-collapse border border-gray-300 text-sm">
                              <thead>
                                <tr className="bg-gray-100">
                                  <th className="border border-gray-300 p-2 text-left">Item</th>
                                  <th className="border border-gray-300 p-2 text-left">Description</th>
                                  <th className="border border-gray-300 p-2 text-left">Quantity</th>
                                  <th className="border border-gray-300 p-2 text-left">Unit</th>
                                  <th className="border border-gray-300 p-2 text-left">Rate</th>
                                  <th className="border border-gray-300 p-2 text-left">Amount</th>
                                  <th className="border border-gray-300 p-2 text-left">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {invoiceData.items.map((item, index) => (
                                  <tr key={item.id}>
                                    <td className="border border-gray-300 p-2">
                                      {String(index + 1).padStart(3, '0')}
                                    </td>
                                    <td className="border border-gray-300 p-2 relative">
                                      <div className="relative">
                                        <Input
                                          value={item.description}
                                          onChange={(e) => {
                                            handleInvoiceItemChange(item.id, 'description', e.target.value);
                                          }}
                                          onFocus={async (e) => {
                                            // Load product items map when the input is focused
                                            const itemsMap = await getAllProductItems();
                                            setInvoiceProductItemsMap(itemsMap);
                                            setInvoiceProductDescriptions(Array.from(itemsMap.keys()));
                                            setShowDropdown(true);
                                          }}
                                          onBlur={() => {
                                            // Delay hiding the dropdown to allow click events to register
                                            setTimeout(() => setShowDropdown(false), 150);
                                          }}
                                          className="p-1 h-8 text-sm w-full"
                                          placeholder="Select or enter description..."
                                        />
                                        {invoiceProductDescriptions.length > 0 && showDropdown && (
                                          <div 
                                            id={`invoice-dropdown-${item.id}`}
                                            className="fixed z-50 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
                                            style={{ minWidth: '400px' }}
                                          >
                                            {invoiceProductDescriptions
                                              .filter(desc => 
                                                item.description === "" || desc.toLowerCase().includes(item.description.toLowerCase())
                                              )
                                              .map((desc, idx) => (
                                                <div
                                                  key={idx}
                                                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                                                  onMouseDown={() => {
                                                    handleInvoiceItemChange(item.id, 'description', desc);
                                                    // Set the rate and unit from the product inventory if available
                                                    const itemDataFromProduct = invoiceProductItemsMap.get(desc);
                                                    if (itemDataFromProduct) {
                                                      let effectiveRate = itemDataFromProduct.rate;
                                                      
                                                      handleInvoiceItemChange(item.id, 'rate', effectiveRate);
                                                      handleInvoiceItemChange(item.id, 'unit', itemDataFromProduct.unit);
                                                      // Also update the amount based on the effective rate and existing quantity
                                                      const newAmount = item.quantity * effectiveRate;
                                                      handleInvoiceItemChange(item.id, 'amount', newAmount);
                                                    }
                                                    setShowDropdown(false);
                                                  }}
                                                >
                                                  {desc}
                                                </div>
                                              ))
                                            }
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                      <Input
                                        type="number"
                                        value={item.quantity}
                                        onChange={async (e) => {
                                          const newQuantity = parseFloat(e.target.value);
                                          await handleInvoiceItemChange(item.id, 'quantity', newQuantity);
                                          // The handleInvoiceItemChange function now handles the rate and amount calculations automatically
                                        }}
                                        className="p-1 h-8 text-sm"
                                      />
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                      <Input
                                        value={item.unit}
                                        onChange={(e) => handleInvoiceItemChange(item.id, 'unit', e.target.value)}
                                        className="p-1 h-8 text-sm"
                                      />
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                      <Input
                                        type="number"
                                        step="0.01"
                                        value={item.rate}
                                        onChange={(e) => {
                                          const newRate = parseFloat(e.target.value);
                                          handleInvoiceItemChange(item.id, 'rate', newRate);
                                          // The handleInvoiceItemChange function now handles the rate and amount calculations automatically
                                        }}
                                        className="p-1 h-8 text-sm"
                                      />
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                      {formatCurrency(item.amount)}
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                      <Button
                                        onClick={() => handleRemoveInvoiceItem(item.id)}
                                        variant="outline"
                                        size="sm"
                                        className="p-1 h-8"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <Button 
                            onClick={handleAddInvoiceItem}
                            variant="outline"
                            size="sm"
                            className="mt-2"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Item
                          </Button>
                        </div>
                        
                        {/* Notes */}
                        <div>
                          <div className="font-bold mb-2">NOTES:</div>
                          <Textarea
                            value={invoiceData.notes}
                            onChange={(e) => handleInvoiceChange('notes', e.target.value)}
                            className="min-h-[80px]"
                          />
                        </div>
                        
                        {/* Payment Options */}
                        <div>
                          <div className="font-bold mb-2">PAYMENT OPTIONS:</div>
                          <Textarea
                            value={invoiceData.paymentOptions}
                            onChange={(e) => handleInvoiceChange('paymentOptions', e.target.value)}
                            className="min-h-[80px]"
                          />
                        </div>
                        
                        {/* Financial Summary */}
                        <div className="grid grid-cols-1 gap-2 max-w-xs ml-auto">
                          <div className="flex justify-between text-sm">
                            <span className="font-bold">Subtotal:</span>
                            <span>{formatCurrency(calculateInvoiceTotals().subtotal)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="font-bold">Total Quantity:</span>
                            <span>{calculateInvoiceTotalQuantity()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="font-bold">Discount:</span>
                            <span>
                              <Input
                                type="number"
                                step="0.01"
                                value={invoiceData.discount}
                                onChange={(e) => handleInvoiceChange('discount', parseFloat(e.target.value))}
                                className="w-24 inline-block p-1 h-8 text-right"
                              />
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="font-bold">Tax:</span>
                            <span>
                              <Input
                                type="number"
                                step="0.01"
                                value={invoiceData.tax}
                                onChange={(e) => handleInvoiceChange('tax', parseFloat(e.target.value))}
                                className="w-24 inline-block p-1 h-8 text-right"
                              />
                            </span>
                          </div>
                          <div className="flex justify-between text-sm pt-2 border-t border-gray-300">
                            <span className="font-bold">TOTAL:</span>
                            <span className="font-bold">{formatCurrency(calculateInvoiceTotals().total)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="font-bold">Amount Paid:</span>
                            <Input
                              type="number"
                              step="0.01"
                              value={invoiceData.amountPaid}
                              onChange={(e) => handleInvoiceChange('amountPaid', parseFloat(e.target.value) || 0)}
                              className="w-24 inline-block p-1 h-8 text-right"
                            />
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="font-bold">Credit Brought Forward from previous:</span>
                            <Input
                              type="number"
                              step="0.01"
                              value={invoiceData.creditBroughtForward}
                              onChange={(e) => handleInvoiceChange('creditBroughtForward', parseFloat(e.target.value) || 0)}
                              className="w-24 inline-block p-1 h-8 text-right"
                            />
                          </div>
                          <div className="flex justify-between text-sm pt-2 border-t border-gray-300">
                            <span className="font-bold">AMOUNT DUE:</span>
                            <span className="font-bold text-red-600">{formatCurrency(calculateInvoiceTotals().amountDue)}</span>
                          </div>
                        </div>
                        
                        {/* Footer Note */}
                        <div className="text-center text-sm mt-4 pt-4 border-t border-gray-300">
                          <div className="mt-2">
                            <Input
                              value={invoiceData.checkPayableMessage}
                              onChange={(e) => handleInvoiceChange('checkPayableMessage', e.target.value)}
                              className="text-center"
                            />
                          </div>
                        </div>
                      </div>
                    ) : currentTemplate?.type === "expense-voucher" ? (
                      // Expense Voucher Content
                      <div className="space-y-6">
                        {/* Header */}
                        <div className="text-center">
                          <h2 className="text-2xl font-bold">EXPENSE VOUCHER</h2>
                          <div className="mt-2">
                            <Input
                              value={expenseVoucherData.voucherNumber}
                              onChange={(e) => handleExpenseVoucherChange("voucherNumber", e.target.value)}
                              className="text-xl font-bold text-center p-1 h-10"
                            />
                          </div>
                          <div className="mt-1">
                            <Input
                              type="date"
                              value={expenseVoucherData.date}
                              onChange={(e) => handleExpenseVoucherChange("date", e.target.value)}
                              className="text-sm p-1 h-8 w-48 mx-auto"
                            />
                          </div>
                        </div>
                        
                        {/* Employee Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div>
                            <div className="font-bold mb-1">SUBMITTED BY:</div>
                            <div className="space-y-2">
                              <Input
                                value={expenseVoucherData.submittedBy}
                                onChange={(e) => handleExpenseVoucherChange("submittedBy", e.target.value)}
                                className="text-sm p-1 h-8"
                                placeholder="Name"
                              />
                              <div className="flex items-center gap-2">
                                <span className="text-sm">Employee ID:</span>
                                <Input
                                  value={expenseVoucherData.employeeId}
                                  onChange={(e) => handleExpenseVoucherChange("employeeId", e.target.value)}
                                  className="text-sm p-1 h-8 flex-1"
                                  placeholder="EMP-00000"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm">Department:</span>
                                <Input
                                  value={expenseVoucherData.department}
                                  onChange={(e) => handleExpenseVoucherChange("department", e.target.value)}
                                  className="text-sm p-1 h-8 flex-1"
                                  placeholder="Department"
                                />
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="font-bold mb-1">APPROVAL:</div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm">Approved by:</span>
                                <Input
                                  value={expenseVoucherData.approvedBy}
                                  onChange={(e) => handleExpenseVoucherChange("approvedBy", e.target.value)}
                                  className="text-sm p-1 h-8 flex-1"
                                  placeholder="Approver Name"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm">Date:</span>
                                <Input
                                  type="date"
                                  value={expenseVoucherData.approvedDate}
                                  onChange={(e) => handleExpenseVoucherChange("approvedDate", e.target.value)}
                                  className="text-sm p-1 h-8 flex-1"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Purpose */}
                        <div>
                          <div className="font-bold mb-2">PURPOSE:</div>
                          <Textarea
                            value={expenseVoucherData.purpose}
                            onChange={(e) => handleExpenseVoucherChange("purpose", e.target.value)}
                            className="min-h-[80px]"
                            placeholder="Enter the purpose of this expense voucher..."
                          />
                        </div>
                        
                        {/* Items Table */}
                        <div>
                          <div className="font-bold mb-2">EXPENSE DETAILS:</div>
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-gray-300 text-sm">
                              <thead>
                                <tr className="bg-gray-100">
                                  <th className="border border-gray-300 p-2 text-left">Date</th>
                                  <th className="border border-gray-300 p-2 text-left">Description</th>
                                  <th className="border border-gray-300 p-2 text-left">Category</th>
                                  <th className="border border-gray-300 p-2 text-left">Amount</th>
                                  <th className="border border-gray-300 p-2 text-left w-20">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {expenseVoucherData.items.map((item) => (
                                  <tr key={item.id}>
                                    <td className="border border-gray-300 p-2">
                                      <Input
                                        type="date"
                                        value={item.date}
                                        onChange={(e) => handleExpenseVoucherItemChange(item.id, "date", e.target.value)}
                                        className="p-1 h-8"
                                      />
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                      <Input
                                        value={item.description}
                                        onChange={(e) => handleExpenseVoucherItemChange(item.id, "description", e.target.value)}
                                        className="p-1 h-8"
                                        placeholder="Description"
                                      />
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                      <Input
                                        value={item.category}
                                        onChange={(e) => handleExpenseVoucherItemChange(item.id, "category", e.target.value)}
                                        className="p-1 h-8"
                                        placeholder="Category"
                                      />
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                      <Input
                                        type="number"
                                        step="0.01"
                                        value={item.amount}
                                        onChange={(e) => handleExpenseVoucherItemChange(item.id, "amount", parseFloat(e.target.value) || 0)}
                                        className="p-1 h-8 w-full"
                                      />
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                      <Button
                                        onClick={() => handleRemoveExpenseVoucherItem(item.id)}
                                        variant="outline"
                                        size="sm"
                                        className="p-1 h-8"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <Button 
                            onClick={handleAddExpenseVoucherItem}
                            variant="outline"
                            size="sm"
                            className="mt-2"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Item
                          </Button>
                        </div>
                        
                        {/* Total */}
                        <div className="grid grid-cols-1 gap-2 max-w-xs ml-auto">
                          <div className="flex justify-between text-sm pt-2 border-t border-gray-300">
                            <span className="font-bold">TOTAL AMOUNT:</span>
                            <span className="font-bold">{formatCurrency(calculateExpenseVoucherTotals().totalAmount)}</span>
                          </div>
                        </div>
                        
                        {/* Notes */}
                        <div>
                          <div className="font-bold mb-2">NOTES:</div>
                          <Textarea
                            value={expenseVoucherData.notes}
                            onChange={(e) => handleExpenseVoucherChange("notes", e.target.value)}
                            className="min-h-[80px]"
                            placeholder="Additional notes..."
                          />
                        </div>
                        
                        {/* Signatures */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                          <div>
                            <div className="font-bold mb-2">SUBMITTED BY</div>
                            <div className="text-sm space-y-2">
                              <div className="pt-1 mt-8">
                                <Input
                                  value={expenseVoucherData.submittedBySignature || ""}
                                  onChange={(e) => handleExpenseVoucherChange("submittedBySignature", e.target.value)}
                                  className="text-xs p-1 h-8 border-b border-black rounded-none focus:ring-0 focus:border-black"
                                  placeholder="Name & Signature"
                                />
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="font-bold mb-2">APPROVED BY</div>
                            <div className="text-sm space-y-2">
                              <div className="pt-1 mt-8">
                                <Input
                                  value={expenseVoucherData.approvedBySignature || ""}
                                  onChange={(e) => handleExpenseVoucherChange("approvedBySignature", e.target.value)}
                                  className="text-xs p-1 h-8 border-b border-black rounded-none focus:ring-0 focus:border-black"
                                  placeholder="Name & Signature"
                                />
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="font-bold mb-2">DATE</div>
                            <div className="text-sm space-y-2">
                              <div className="pt-1 mt-8">
                                <Input
                                  type="date"
                                  value={expenseVoucherData.signatureDate || ""}
                                  onChange={(e) => handleExpenseVoucherChange("signatureDate", e.target.value)}
                                  className="text-xs p-1 h-8 border-b border-black rounded-none focus:ring-0 focus:border-black w-full"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : currentTemplate?.type === "salary-slip" ? (
                      // Salary Slip Content
                      <div className="space-y-6">
                        {/* Header */}
                        <div className="text-center">
                          <h2 className="text-2xl font-bold">SALARY SLIP</h2>
                          <div className="mt-1">
                            <Input
                              value={salarySlipData.payPeriod}
                              onChange={(e) => handleSalarySlipChange("payPeriod", e.target.value)}
                              className="text-sm p-1 h-8 w-48 mx-auto"
                              placeholder="Pay Period"
                            />
                          </div>
                        </div>
                        
                        {/* Employee Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div>
                            <div className="font-bold mb-1">EMPLOYEE INFORMATION:</div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm">Name:</span>
                                <Input
                                  value={salarySlipData.employeeName}
                                  onChange={(e) => handleSalarySlipChange("employeeName", e.target.value)}
                                  className="text-sm p-1 h-8 flex-1"
                                  placeholder="Employee Name"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm">Employee ID:</span>
                                <Input
                                  value={salarySlipData.employeeId}
                                  onChange={(e) => handleSalarySlipChange("employeeId", e.target.value)}
                                  className="text-sm p-1 h-8 flex-1"
                                  placeholder="EMP-00000"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm">Department:</span>
                                <Input
                                  value={salarySlipData.department}
                                  onChange={(e) => handleSalarySlipChange("department", e.target.value)}
                                  className="text-sm p-1 h-8 flex-1"
                                  placeholder="Department"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm">Position:</span>
                                <Input
                                  value={salarySlipData.position}
                                  onChange={(e) => handleSalarySlipChange("position", e.target.value)}
                                  className="text-sm p-1 h-8 flex-1"
                                  placeholder="Position"
                                />
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="font-bold mb-1">PAYMENT DETAILS:</div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm">Payment Method:</span>
                                <Input
                                  value={salarySlipData.paymentMethod}
                                  onChange={(e) => handleSalarySlipChange("paymentMethod", e.target.value)}
                                  className="text-sm p-1 h-8 flex-1"
                                  placeholder="Payment Method"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm">Bank:</span>
                                <Input
                                  value={salarySlipData.bankName}
                                  onChange={(e) => handleSalarySlipChange("bankName", e.target.value)}
                                  className="text-sm p-1 h-8 flex-1"
                                  placeholder="Bank Name"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm">Account #:</span>
                                <Input
                                  value={salarySlipData.accountNumber}
                                  onChange={(e) => handleSalarySlipChange("accountNumber", e.target.value)}
                                  className="text-sm p-1 h-8 flex-1"
                                  placeholder="Account Number"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm">Paid Date:</span>
                                <Input
                                  type="date"
                                  value={salarySlipData.paidDate}
                                  onChange={(e) => handleSalarySlipChange("paidDate", e.target.value)}
                                  className="text-sm p-1 h-8 flex-1"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Earnings */}
                        <div>
                          <div className="font-bold mb-2">EARNINGS:</div>
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-gray-300 text-sm">
                              <thead>
                                <tr className="bg-gray-100">
                                  <th className="border border-gray-300 p-2 text-left">Description</th>
                                  <th className="border border-gray-300 p-2 text-right">Amount</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td className="border border-gray-300 p-2">Basic Salary</td>
                                  <td className="border border-gray-300 p-2 text-right">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={salarySlipData.basicSalary}
                                      onChange={(e) => handleSalarySlipChange("basicSalary", parseFloat(e.target.value) || 0)}
                                      className="p-1 h-8 w-full text-right"
                                    />
                                  </td>
                                </tr>
                                <tr>
                                  <td className="border border-gray-300 p-2">Allowances</td>
                                  <td className="border border-gray-300 p-2 text-right">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={salarySlipData.allowances}
                                      onChange={(e) => handleSalarySlipChange("allowances", parseFloat(e.target.value) || 0)}
                                      className="p-1 h-8 w-full text-right"
                                    />
                                  </td>
                                </tr>
                                <tr>
                                  <td className="border border-gray-300 p-2">Overtime</td>
                                  <td className="border border-gray-300 p-2 text-right">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={salarySlipData.overtime}
                                      onChange={(e) => handleSalarySlipChange("overtime", parseFloat(e.target.value) || 0)}
                                      className="p-1 h-8 w-full text-right"
                                    />
                                  </td>
                                </tr>
                                <tr>
                                  <td className="border border-gray-300 p-2">Bonus</td>
                                  <td className="border border-gray-300 p-2 text-right">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={salarySlipData.bonus}
                                      onChange={(e) => handleSalarySlipChange("bonus", parseFloat(e.target.value) || 0)}
                                      className="p-1 h-8 w-full text-right"
                                    />
                                  </td>
                                </tr>
                                <tr className="bg-gray-50 font-bold">
                                  <td className="border border-gray-300 p-2">Gross Pay</td>
                                  <td className="border border-gray-300 p-2 text-right">{formatCurrency(calculateSalarySlipTotals().grossPay)}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                        
                        {/* Deductions */}
                        <div>
                          <div className="font-bold mb-2">DEDUCTIONS:</div>
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-gray-300 text-sm">
                              <thead>
                                <tr className="bg-gray-100">
                                  <th className="border border-gray-300 p-2 text-left">Description</th>
                                  <th className="border border-gray-300 p-2 text-right">Amount</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td className="border border-gray-300 p-2">Tax</td>
                                  <td className="border border-gray-300 p-2 text-right">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={salarySlipData.tax}
                                      onChange={(e) => handleSalarySlipChange("tax", parseFloat(e.target.value) || 0)}
                                      className="p-1 h-8 w-full text-right"
                                    />
                                  </td>
                                </tr>
                                <tr>
                                  <td className="border border-gray-300 p-2">Insurance</td>
                                  <td className="border border-gray-300 p-2 text-right">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={salarySlipData.insurance}
                                      onChange={(e) => handleSalarySlipChange("insurance", parseFloat(e.target.value) || 0)}
                                      className="p-1 h-8 w-full text-right"
                                    />
                                  </td>
                                </tr>
                                <tr>
                                  <td className="border border-gray-300 p-2">Other Deductions</td>
                                  <td className="border border-gray-300 p-2 text-right">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={salarySlipData.otherDeductions}
                                      onChange={(e) => handleSalarySlipChange("otherDeductions", parseFloat(e.target.value) || 0)}
                                      className="p-1 h-8 w-full text-right"
                                    />
                                  </td>
                                </tr>
                                <tr className="bg-gray-50 font-bold">
                                  <td className="border border-gray-300 p-2">Total Deductions</td>
                                  <td className="border border-gray-300 p-2 text-right">{formatCurrency(calculateSalarySlipTotals().totalDeductions)}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                        
                        {/* Net Pay */}
                        <div className="grid grid-cols-1 gap-2 max-w-xs ml-auto">
                          <div className="flex justify-between text-lg pt-2 border-t border-gray-300">
                            <span className="font-bold">NET PAY:</span>
                            <span className="font-bold text-green-600">{formatCurrency(calculateSalarySlipTotals().netPay)}</span>
                          </div>
                        </div>
                        
                        {/* Signatures */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                          <div>
                            <div className="font-bold mb-2">EMPLOYEE SIGNATURE</div>
                            <div className="text-sm space-y-2">
                              <div className="pt-1 mt-8">
                                <Input
                                  value={salarySlipData.employeeSignature || ""}
                                  onChange={(e) => handleSalarySlipChange("employeeSignature", e.target.value)}
                                  className="text-xs p-1 h-8 border-b border-black rounded-none focus:ring-0 focus:border-black"
                                  placeholder="Name & Signature"
                                />
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="font-bold mb-2">MANAGER APPROVAL</div>
                            <div className="text-sm space-y-2">
                              <div className="pt-1 mt-8">
                                <Input
                                  value={salarySlipData.managerSignature || ""}
                                  onChange={(e) => handleSalarySlipChange("managerSignature", e.target.value)}
                                  className="text-xs p-1 h-8 border-b border-black rounded-none focus:ring-0 focus:border-black"
                                  placeholder="Name & Signature"
                                />
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="font-bold mb-2">DATE</div>
                            <div className="text-sm space-y-2">
                              <div className="pt-1 mt-8">
                                <Input
                                  type="date"
                                  value={salarySlipData.signatureDate || ""}
                                  onChange={(e) => handleSalarySlipChange("signatureDate", e.target.value)}
                                  className="text-xs p-1 h-8 border-b border-black rounded-none focus:ring-0 focus:border-black w-full"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : currentTemplate?.type === "complimentary-goods" ? (
                      // Complimentary Goods Content
                      <div className="space-y-6">
                        {/* Header */}
                        <div className="text-center">
                          <h2 className="text-2xl font-bold">COMPLIMENTARY GOODS VOUCHER</h2>
                          <div className="text-sm mt-1">Voucher #{complimentaryGoodsData.voucherNumber}</div>
                          <div className="text-sm mt-1">Date: {complimentaryGoodsData.date}</div>
                        </div>
                    ) : currentTemplate?.type === "report" ? (
                      // Report Template Content
                      <div className="space-y-6">
                        {/* Header */}
                        <div className="text-center border-b-2 border-gray-800 pb-2">
                          <h2 className="text-2xl font-bold">BUSINESS REPORT</h2>
                          <p className="text-sm">Report #{reportName || 'REPORT_NUMBER'}</p>
                          <p className="text-sm">Date: {new Date().toLocaleDateString()}</p>
                        </div>
                        
                        {/* Report Content */}
                        <div className="space-y-4">
                          <div>
                            <div className="font-bold mb-1">EXECUTIVE SUMMARY:</div>
                            <div className="text-sm min-h-[60px] p-2 border rounded bg-gray-50">
                              [Enter executive summary here]
                            </div>
                          </div>
                          
                          <div>
                            <div className="font-bold mb-1">REPORT DETAILS:</div>
                            <div className="text-sm min-h-[100px] p-2 border rounded bg-gray-50">
                              [Enter report details here]
                            </div>
                          </div>
                          
                          <div>
                            <div className="font-bold mb-1">CONCLUSION:</div>
                            <div className="text-sm min-h-[60px] p-2 border rounded bg-gray-50">
                              [Enter conclusion here]
                            </div>
                          </div>
                          
                          <div>
                            <div className="font-bold mb-1">RECOMMENDATIONS:</div>
                            <div className="text-sm min-h-[60px] p-2 border rounded bg-gray-50">
                              [Enter recommendations here]
                            </div>
                          </div>
                        </div>
                        
                        {/* Prepared by */}
                        <div className="mt-8">
                          <div className="grid grid-cols-2 gap-8">
                            <div>
                              <div className="font-bold mb-2">Prepared by:</div>
                              <div className="text-sm min-h-[40px] p-2 border rounded bg-gray-50">
                                [Preparer Name]
                              </div>
                            </div>
                            <div>
                              <div className="font-bold mb-2">Date:</div>
                              <div className="text-sm min-h-[40px] p-2 border rounded bg-gray-50">
                                {new Date().toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                        
                        {/* Customer Info */}
                        <div>
                          <div className="font-bold mb-1">THIS IS TO CERTIFY THAT THE FOLLOWING GOODS HAVE BEEN PROVIDED FREE OF CHARGE TO:</div>
                          <div className="text-sm mb-1">{complimentaryGoodsData.customerName}</div>
                          <div className="text-sm mb-1">{complimentaryGoodsData.customerAddress}</div>
                          <div className="flex items-center gap-2 text-sm mt-1">
                            <span>Phone:</span>
                            <span>{complimentaryGoodsData.customerPhone}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm mt-1">
                            <span>Email:</span>
                            <span>{complimentaryGoodsData.customerEmail}</span>
                          </div>
                        </div>
                        
                        {/* Items Table */}
                        <div>
                          <div className="font-bold mb-2">ITEMS:</div>
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-gray-300 text-sm">
                              <thead>
                                <tr className="bg-gray-100">
                                  <th className="border border-gray-300 p-2 text-left">Item #</th>
                                  <th className="border border-gray-300 p-2 text-left">Description</th>
                                  <th className="border border-gray-300 p-2 text-left">Quantity</th>
                                  <th className="border border-gray-300 p-2 text-left">Unit</th>
                                </tr>
                              </thead>
                              <tbody>
                                {complimentaryGoodsData.items.map((item, index) => (
                                  <tr key={item.id}>
                                    <td className="border border-gray-300 p-2">
                                      {String(index + 1).padStart(3, '0')}
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                      {item.description}
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                      {item.quantity}
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                      {item.unit}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <Button 
                            onClick={handleAddComplimentaryGoodsItem}
                            variant="outline"
                            size="sm"
                            className="mt-2"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Item
                          </Button>
                        </div>
                        
                        {/* Reason */}
                        <div>
                          <div className="font-bold mb-2">REASON FOR COMPLIMENTARY GOODS:</div>
                          <div className="text-sm min-h-[40px]">
                            {complimentaryGoodsData.reason}
                          </div>
                        </div>
                        
                        {/* Signatures */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                          <div>
                            <div className="font-bold mb-2">AUTHORIZED BY</div>
                            <div className="text-sm space-y-2">
                              <div className="border-t border-black pt-1 mt-8">
                                <div className="text-xs">Name: {complimentaryGoodsData.authorizedByName}</div>
                              </div>
                              <div className="text-xs">Title: {complimentaryGoodsData.authorizedByTitle}</div>
                              <div className="text-xs">Date: {complimentaryGoodsData.authorizedDate}</div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="font-bold mb-2">SIGNATURE</div>
                            <div className="text-sm space-y-2">
                              <div className="border-t border-black pt-1 mt-8">
                                <div className="text-xs">&nbsp;</div>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="font-bold mb-2">DATE</div>
                            <div className="text-sm space-y-2">
                              <div className="border-t border-black pt-1 mt-8">
                                <div className="text-xs">&nbsp;</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : currentTemplate?.type === "customer-settlement" ? (
                      // Customer Settlement Content
                      <div className="space-y-6">
                        {/* Header */}
                        <div className="text-center border-b-2 border-gray-800 pb-2">
                          <h2 className="text-2xl font-bold">CUSTOMER SETTLEMENT RECEIPT</h2>
                          <p className="text-sm">Receipt #{settlementReference || 'RECEIPT_NUMBER'}</p>
                          <p className="text-sm">Date: {new Date().toLocaleDateString()}</p>
                          <p className="text-sm">Time: {new Date().toLocaleTimeString()}</p>
                        </div>
                                            
                        {/* Customer Information */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div>
                            <div className="font-bold mb-1">CUSTOMER INFORMATION:</div>
                            <div className="text-sm mb-1">
                              <span className="font-medium">Name:</span>
                              <Input 
                                value={customerSettlementData.customerName}
                                onChange={(e) => handleCustomerSettlementChange("customerName", e.target.value)}
                                className="w-full p-1 text-sm mt-1"
                              />
                            </div>
                            <div className="text-sm mb-1">
                              <span className="font-medium">ID:</span>
                              <Input 
                                value={customerSettlementData.customerId}
                                onChange={(e) => handleCustomerSettlementChange("customerId", e.target.value)}
                                className="w-full p-1 text-sm mt-1"
                                readOnly
                              />
                            </div>
                            <div className="text-sm mb-1">
                              <span className="font-medium">Phone:</span>
                              <Input 
                                value={customerSettlementData.customerPhone}
                                onChange={(e) => handleCustomerSettlementChange("customerPhone", e.target.value)}
                                className="w-full p-1 text-sm mt-1"
                              />
                            </div>
                            <div className="text-sm mb-1">
                              <span className="font-medium">Email:</span>
                              <Input 
                                value={customerSettlementData.customerEmail}
                                onChange={(e) => handleCustomerSettlementChange("customerEmail", e.target.value)}
                                className="w-full p-1 text-sm mt-1"
                              />
                            </div>
                          </div>
                                              
                          <div>
                            <div className="font-bold mb-1">SETTLEMENT DETAILS:</div>
                            <div className="text-sm mb-1">
                              <span className="font-medium">Reference:</span>
                              <Input 
                                value={customerSettlementData.referenceNumber}
                                onChange={(e) => handleCustomerSettlementChange("referenceNumber", e.target.value)}
                                className="w-full p-1 text-sm mt-1"
                                readOnly
                              />
                            </div>
                            <div className="text-sm mb-1">
                              <span className="font-medium">Amount:</span>
                              <div className="flex">
                                <span className="inline-flex items-center px-3 text-sm text-gray-500 bg-gray-100 border border-r-0 border-gray-300 rounded-l-md">
                                  TZS
                                </span>
                                <Input 
                                  type="number" 
                                  step="0.01"
                                  value={customerSettlementData.settlementAmount}
                                  onChange={(e) => handleCustomerSettlementChange("settlementAmount", parseFloat(e.target.value) || 0)}
                                  className="w-full p-1 text-sm mt-1 rounded-l-none"
                                />
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Formatted: {formatCurrency(customerSettlementData.settlementAmount)}
                              </div>
                            </div>
                            <div className="text-sm mb-1">
                              <span className="font-medium">Payment Method:</span>
                              <Input 
                                value={customerSettlementData.paymentMethod}
                                onChange={(e) => handleCustomerSettlementChange("paymentMethod", e.target.value)}
                                className="w-full p-1 text-sm mt-1"
                              />
                            </div>
                            <div className="text-sm mb-1">
                              <span className="font-medium">Processed by:</span>
                              <Input 
                                value={customerSettlementData.cashierName}
                                onChange={(e) => handleCustomerSettlementChange("cashierName", e.target.value)}
                                className="w-full p-1 text-sm mt-1"
                              />
                            </div>
                          </div>
                        </div>
                                            
                        {/* Transaction Summary */}
                        <div className="space-y-4">
                          <div className="font-bold mb-2">TRANSACTION SUMMARY:</div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="border p-3 rounded">
                              <div className="text-sm font-medium">Previous Balance</div>
                              <Input 
                                type="number" 
                                step="0.01"
                                value={customerSettlementData.previousBalance}
                                onChange={(e) => handleCustomerSettlementChange("previousBalance", parseFloat(e.target.value) || 0)}
                                className="w-full p-1 text-sm mt-1"
                              />
                              <div className="text-xs text-gray-500 mt-1">
                                Formatted: {formatCurrency(customerSettlementData.previousBalance)}
                              </div>
                            </div>
                            <div className="border p-3 rounded">
                              <div className="text-sm font-medium">Amount Paid</div>
                              <Input 
                                type="number" 
                                step="0.01"
                                value={customerSettlementData.amountPaid}
                                onChange={(e) => handleCustomerSettlementChange("amountPaid", parseFloat(e.target.value) || 0)}
                                className="w-full p-1 text-sm mt-1"
                              />
                              <div className="text-xs text-gray-500 mt-1">
                                Formatted: {formatCurrency(customerSettlementData.amountPaid)}
                              </div>
                            </div>
                            <div className="border p-3 rounded">
                              <div className="text-sm font-medium">New Balance</div>
                              <Input 
                                type="number" 
                                step="0.01"
                                value={customerSettlementData.newBalance}
                                onChange={(e) => handleCustomerSettlementChange("newBalance", parseFloat(e.target.value) || 0)}
                                className="w-full p-1 text-sm mt-1"
                              />
                              <div className="text-xs text-gray-500 mt-1">
                                Formatted: {formatCurrency(customerSettlementData.newBalance)}
                              </div>
                            </div>
                          </div>
                        </div>
                                            
                        {/* Notes */}
                        <div>
                          <div className="font-bold mb-2">NOTES:</div>
                          <Textarea
                            value={customerSettlementData.notes}
                            onChange={(e) => handleCustomerSettlementChange("notes", e.target.value)}
                            className="min-h-[60px] p-2 border rounded bg-gray-50 w-full"
                          />
                        </div>
                                            
                        {/* Footer */}
                        <div className="text-center mt-8 pt-4 border-t border-gray-300">
                          <div className="text-sm font-bold">Thank you for your payment!</div>
                          <div className="text-sm">We appreciate your business.</div>
                        </div>
                      </div>
                    ) : currentTemplate?.type === "goods-received-note" ? (
                      // Goods Received Note Content
                      <div className="space-y-6">
                        {/* Header */}
                        <div className="text-center border-b-2 border-gray-800 pb-2">
                          <h2 className="text-2xl font-bold">GOODS RECEIVED NOTE</h2>
                          <p className="text-sm">Document #{grnData.grnNumber || 'GRN_NUMBER'}</p>
                          <p className="text-sm">Date: {grnData.date || new Date().toLocaleDateString()}</p>
                          <p className="text-sm">Time: {grnData.time || new Date().toLocaleTimeString()}</p>
                        </div>
                        
                        {/* Supplier and Business Information */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div>
                            <div className="font-bold mb-1">SUPPLIER INFORMATION:</div>
                            <div className="text-sm mb-1">
                              <span className="font-medium">Number of Suppliers:</span>
                              <Input 
                                type="number"
                                min="1"
                                value={grnData.numberOfSuppliers}
                                onChange={(e) => {
                                  const newCount = parseInt(e.target.value) || 1;
                                  const updatedSuppliers = [...grnData.suppliers];
                                  
                                  // Add new suppliers if count increased
                                  for (let i = updatedSuppliers.length; i < newCount; i++) {
                                    updatedSuppliers.push({
                                      id: `supplier-${i + 1}`,
                                      name: `Supplier ${i + 1}`,
                                      supplierId: `SUP-${String(i + 1).padStart(3, '0')}`,
                                      phone: "",
                                      email: "",
                                      address: "",
                                      tinNumber: "",
                                      businessTin: "",  // Add the businessTin field
                                      stockType: ""  // Add the stockType field
                                    });
                                  }
                                  
                                  // Remove excess suppliers if count decreased
                                  if (newCount < updatedSuppliers.length) {
                                    updatedSuppliers.splice(newCount);
                                  }
                                  
                                  setGrnData(prev => ({ 
                                    ...prev, 
                                    numberOfSuppliers: newCount,
                                    suppliers: updatedSuppliers
                                  }));
                                }}
                                className="w-full p-1 text-sm mt-1"
                              />
                            </div>
                            
                            {/* Logistic Details Section */}
                            <div className="border border-gray-300 rounded-lg p-4 mt-4 bg-blue-50">
                              <div className="font-bold text-lg mb-3 text-blue-800">
                                LOGISTIC DETAILS INFORMATION
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <div className="text-sm font-medium text-gray-700">Vehicle Number:</div>
                                  <Input
                                    value={grnData.logisticDetails.vehicleNumber}
                                    onChange={(e) => setGrnData(prev => ({
                                      ...prev,
                                      logisticDetails: {
                                        ...prev.logisticDetails,
                                        vehicleNumber: e.target.value
                                      }
                                    }))}
                                    className="p-2 text-sm w-full mt-1"
                                    placeholder="Enter vehicle number"
                                  />
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-700">Driver Name:</div>
                                  <Input
                                    value={grnData.logisticDetails.driverName}
                                    onChange={(e) => setGrnData(prev => ({
                                      ...prev,
                                      logisticDetails: {
                                        ...prev.logisticDetails,
                                        driverName: e.target.value
                                      }
                                    }))}
                                    className="p-2 text-sm w-full mt-1"
                                    placeholder="Enter driver name"
                                  />
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-700">Driver Phone:</div>
                                  <Input
                                    value={grnData.logisticDetails.driverPhone}
                                    onChange={(e) => setGrnData(prev => ({
                                      ...prev,
                                      logisticDetails: {
                                        ...prev.logisticDetails,
                                        driverPhone: e.target.value
                                      }
                                    }))}
                                    className="p-2 text-sm w-full mt-1"
                                    placeholder="Enter driver phone"
                                    type="tel"
                                  />
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-700">Transport Company:</div>
                                  <Input
                                    value={grnData.logisticDetails.transportCompany}
                                    onChange={(e) => setGrnData(prev => ({
                                      ...prev,
                                      logisticDetails: {
                                        ...prev.logisticDetails,
                                        transportCompany: e.target.value
                                      }
                                    }))}
                                    className="p-2 text-sm w-full mt-1"
                                    placeholder="Enter transport company"
                                  />
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-700">Driver's License:</div>
                                  <Input
                                    value={grnData.logisticDetails.deliveryLocation}
                                    onChange={(e) => setGrnData(prev => ({
                                      ...prev,
                                      logisticDetails: {
                                        ...prev.logisticDetails,
                                        deliveryLocation: e.target.value
                                      }
                                    }))}
                                    className="p-2 text-sm w-full mt-1"
                                    placeholder="Enter driver's license"
                                  />
                                </div>
                                <div className="md:col-span-2">
                                  <div className="text-sm font-medium text-gray-700">Special Instructions:</div>
                                  <Textarea
                                    value={grnData.logisticDetails.specialInstructions}
                                    onChange={(e) => setGrnData(prev => ({
                                      ...prev,
                                      logisticDetails: {
                                        ...prev.logisticDetails,
                                        specialInstructions: e.target.value
                                      }
                                    }))}
                                    className="p-2 text-sm w-full mt-1 min-h-[60px]"
                                    placeholder="Enter special handling instructions"
                                  />
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-700">Shipping Method:</div>
                                  <Select
                                    value={grnData.logisticDetails.shippingMethod}
                                    onValueChange={(value) => setGrnData(prev => ({
                                      ...prev,
                                      logisticDetails: {
                                        ...prev.logisticDetails,
                                        shippingMethod: value
                                      }
                                    }))}
                                  >
                                    <SelectTrigger className="w-full mt-1">
                                      <SelectValue placeholder="Select shipping method" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="ground">Ground</SelectItem>
                                      <SelectItem value="air">Air</SelectItem>
                                      <SelectItem value="sea">Sea</SelectItem>
                                      <SelectItem value="rail">Rail</SelectItem>
                                      <SelectItem value="express">Express</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-700">Tracking Number:</div>
                                  <Input
                                    value={grnData.logisticDetails.trackingNumber}
                                    onChange={(e) => setGrnData(prev => ({
                                      ...prev,
                                      logisticDetails: {
                                        ...prev.logisticDetails,
                                        trackingNumber: e.target.value
                                      }
                                    }))}
                                    className="p-2 text-sm w-full mt-1"
                                    placeholder="Enter tracking number"
                                  />
                                </div>
                              </div>
                            </div>

                          </div>
                          
                          <div>
                            <div className="font-bold mb-1">RECEIVING BUSINESS:</div>
                            <div className="text-sm mb-1">
                              <span className="font-medium">Name:</span>
                              <Input 
                                value={grnData.businessName}
                                onChange={(e) => setGrnData(prev => ({ ...prev, businessName: e.target.value }))}
                                className="w-full p-1 text-sm mt-1"
                              />
                            </div>
                            <div className="text-sm mb-1">
                              <span className="font-medium">Address:</span>
                              <Textarea 
                                value={grnData.businessAddress}
                                onChange={(e) => setGrnData(prev => ({ ...prev, businessAddress: e.target.value }))}
                                className="w-full p-1 text-sm mt-1 min-h-[60px]"
                              />
                            </div>
                            <div className="text-sm mb-1">
                              <span className="font-medium">Phone:</span>
                              <Input 
                                value={grnData.businessPhone}
                                onChange={(e) => setGrnData(prev => ({ ...prev, businessPhone: e.target.value }))}
                                className="w-full p-1 text-sm mt-1"
                              />
                            </div>
                            <div className="text-sm mb-1">
                              <span className="font-medium">Email:</span>
                              <Input 
                                value={grnData.businessEmail}
                                onChange={(e) => setGrnData(prev => ({ ...prev, businessEmail: e.target.value }))}
                                className="w-full p-1 text-sm mt-1"
                              />
                            </div>
                          </div>
                        </div>
                        
                        {/* Delivery Details */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <div className="text-sm font-medium">PO Number:</div>
                            <Input
                              value={grnData.poNumber || ""}
                              onChange={(e) => setGrnData(prev => ({ ...prev, poNumber: e.target.value }))}
                              className="text-sm p-1 h-8"
                            />
                          </div>
                          <div>
                            <div className="text-sm font-medium">Delivery Note #: <span className="text-red-500">*</span></div>
                            <Input
                              value={grnData.deliveryNoteNumber || ""}
                              onChange={(e) => setGrnData(prev => ({ ...prev, deliveryNoteNumber: e.target.value }))}
                              className="text-sm p-1 h-8"
                            />
                          </div>
                        </div>
                        
                        {/* Receiving Costs Section */}
                        <div>
                          <div className="font-bold mb-2">RECEIVING COSTS:</div>
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-gray-300 text-sm">
                              <thead>
                                <tr className="bg-gray-100">
                                  <th className="border border-gray-300 p-2 text-left">Description</th>
                                  <th className="border border-gray-300 p-2 text-left">Amount</th>
                                  <th className="border border-gray-300 p-2 text-left">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {grnData.receivingCosts.map((cost) => (
                                  <tr key={cost.id}>
                                    <td className="border border-gray-300 p-2">
                                      <Input
                                        value={cost.description}
                                        onChange={(e) => handleReceivingCostChange(cost.id, 'description', e.target.value)}
                                        className="p-1 h-8 text-sm w-full"
                                        placeholder="Cost description"
                                      />
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                      <div className="flex">
                                        <span className="inline-flex items-center px-3 text-sm text-gray-500 bg-gray-100 border border-r-0 border-gray-300 rounded-l-md">
                                          TZS
                                        </span>
                                        <Input
                                          type="number"
                                          step="0.01"
                                          value={cost.amount}
                                          onChange={(e) => handleReceivingCostChange(cost.id, 'amount', parseFloat(e.target.value) || 0)}
                                          className="p-1 h-8 text-sm w-full rounded-l-none"
                                        />
                                      </div>
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                      <Button
                                        onClick={() => handleRemoveReceivingCost(cost.id)}
                                        variant="outline"
                                        size="sm"
                                        className="p-1 h-8"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="flex justify-between items-center mt-2">
                            <Button 
                              onClick={handleAddReceivingCost}
                              variant="outline"
                              size="sm"
                              className="mt-2"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add Cost
                            </Button>
                            <div className="text-sm font-medium mt-2">
                              Total Receiving Costs: {formatCurrency(calculateTotalReceivingCosts())}
                            </div>
                          </div>
                        </div>
                        
                        {/* Dynamic Items Tables based on Number of Suppliers */}
                        <div>
                          {[...Array(Math.max(1, grnData.numberOfSuppliers))].map((_, supplierIndex) => {
                            const supplierId = `supplier-${supplierIndex + 1}`;
                            const supplierInfo = grnData.suppliers.find(s => s.id === supplierId) || {
                              id: supplierId,
                              name: `Supplier ${supplierIndex + 1}`,
                              supplierId: `SUP-${String(supplierIndex + 1).padStart(3, '0')}`,
                              phone: "",
                              email: "",
                              address: "",
                              tinNumber: "",
                              businessTin: undefined,
                              stockType: ""
                            };
                            const supplierItems = distributeReceivingCosts(grnData.items, grnData.receivingCosts).filter(item => 
                              item.supplierId === supplierId || (!item.supplierId && supplierIndex === 0)
                            );
                            
                            return (
                              <div key={supplierIndex} className="mb-8">
                                {/* Supplier Details Section */}
                                <div className="border border-gray-300 rounded-lg p-4 mb-4 bg-gray-50">
                                  <div className="font-bold text-lg mb-3 text-blue-800">
                                    SUPPLIER DETAILS - {supplierInfo.name} <span className="text-red-600">*</span>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <div className="text-sm font-medium text-gray-700">Supplier Name:</div>
                                      <div className="relative mt-1">
                                        <Command className="rounded-lg border shadow-sm" shouldFilter={false}>
                                          <CommandInput
                                            placeholder="Search supplier..."
                                            value={supplierInfo.name}
                                            onValueChange={(value) => {
                                              const updatedSuppliers = [...grnData.suppliers];
                                              const supplierIndex = updatedSuppliers.findIndex(s => s.id === supplierId);
                                              if (supplierIndex >= 0) {
                                                updatedSuppliers[supplierIndex].name = value;
                                              } else {
                                                updatedSuppliers.push({
                                                  id: supplierId,
                                                  name: value,
                                                  supplierId: `SUP-${String(supplierIndex + 1).padStart(3, '0')}`,
                                                  phone: "",
                                                  email: "",
                                                  address: "",
                                                  tinNumber: "",
                                                  stockType: ""
                                                });
                                              }
                                              setGrnData(prev => ({ ...prev, suppliers: updatedSuppliers }));
                                              // Filter suppliers
                                              const filtered = registeredSuppliers.filter(s =>
                                                s.name.toLowerCase().includes(value.toLowerCase()) ||
                                                (s.contact_person && s.contact_person.toLowerCase().includes(value.toLowerCase())) ||
                                                (s.phone && s.phone.includes(value))
                                              );
                                              setFilteredSuppliers(filtered);
                                              setShowSupplierDropdown(true);
                                            }}
                                            onFocus={() => {
                                              setFilteredSuppliers(registeredSuppliers);
                                              setShowSupplierDropdown(true);
                                            }}
                                            onBlur={() => {
                                              setTimeout(() => setShowSupplierDropdown(false), 200);
                                            }}
                                            className="h-9 text-sm"
                                          />
                                        </Command>
                                        {supplierInfo.name && (
                                          <button
                                            onClick={() => {
                                              const updatedSuppliers = [...grnData.suppliers];
                                              const supplierIndex = updatedSuppliers.findIndex(s => s.id === supplierId);
                                              if (supplierIndex >= 0) {
                                                updatedSuppliers[supplierIndex] = {
                                                  ...updatedSuppliers[supplierIndex],
                                                  name: "",
                                                  supplierId: "",
                                                  phone: "",
                                                  email: "",
                                                  address: "",
                                                  tinNumber: "",
                                                  stockType: ""
                                                };
                                              }
                                              setGrnData(prev => ({ ...prev, suppliers: updatedSuppliers }));
                                            }}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 hover:bg-gray-100 p-1 rounded z-10"
                                          >
                                            <svg
                                              xmlns="http://www.w3.org/2000/svg"
                                              width="24"
                                              height="24"
                                              viewBox="0 0 24 24"
                                              fill="none"
                                              stroke="currentColor"
                                              strokeWidth="2"
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              className="h-4 w-4"
                                            >
                                              <path d="M18 6 6 18" />
                                              <path d="m6 6 12 12" />
                                            </svg>
                                          </button>
                                        )}
                                        {showSupplierDropdown && (
                                          <div className="max-h-48 overflow-auto absolute z-50 bg-white border rounded-b-lg shadow-lg w-full mt-[-1px]">
                                            {loadingSuppliers ? (
                                              <div className="p-3 text-center text-sm text-muted-foreground">
                                                Loading suppliers...
                                              </div>
                                            ) : filteredSuppliers.length > 0 ? (
                                              <div>
                                                {filteredSuppliers.map((supplier) => (
                                                  <div
                                                    key={supplier.id}
                                                    onMouseDown={(e) => {
                                                      e.preventDefault();
                                                      const updatedSuppliers = [...grnData.suppliers];
                                                      const supplierIndex = updatedSuppliers.findIndex(s => s.id === supplierId);
                                                      if (supplierIndex >= 0) {
                                                        updatedSuppliers[supplierIndex] = {
                                                          ...updatedSuppliers[supplierIndex],
                                                          name: supplier.name,
                                                          supplierId: supplier.tax_id || `SUP-${String(supplierIndex + 1).padStart(3, '0')}`,
                                                          phone: supplier.phone || "",
                                                          email: supplier.email || "",
                                                          address: supplier.address || "",
                                                          tinNumber: supplier.tax_id || "",
                                                          stockType: updatedSuppliers[supplierIndex].stockType || ""
                                                        };
                                                      } else {
                                                        updatedSuppliers.push({
                                                          id: supplierId,
                                                          name: supplier.name,
                                                          supplierId: supplier.tax_id || `SUP-${String(updatedSuppliers.length + 1).padStart(3, '0')}`,
                                                          phone: supplier.phone || "",
                                                          email: supplier.email || "",
                                                          address: supplier.address || "",
                                                          tinNumber: supplier.tax_id || "",
                                                          stockType: ""
                                                        });
                                                      }
                                                      setGrnData(prev => ({ ...prev, suppliers: updatedSuppliers }));
                                                      setShowSupplierDropdown(false);
                                                    }}
                                                    className="cursor-pointer py-2 px-3 hover:bg-gray-50 border-b last:border-b-0"
                                                  >
                                                    <div className="flex flex-col gap-0.5 w-full">
                                                      <span className="font-semibold text-sm">{supplier.name}</span>
                                                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                        {supplier.contact_person && (
                                                          <span>Contact: {supplier.contact_person}</span>
                                                        )}
                                                        {supplier.phone && (
                                                          <span>Phone: {supplier.phone}</span>
                                                        )}
                                                      </div>
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            ) : (
                                              <div className="p-3 text-center text-sm text-muted-foreground">
                                                No suppliers found.
                                              </div>
                                            )}
                                            <div
                                              onMouseDown={(e) => {
                                                e.preventDefault();
                                                setShowSupplierDropdown(false);
                                                setNewSupplierForm({ name: supplierInfo.name || '', contact_person: '', phone: '', email: '', address: '', tax_id: '' });
                                                setShowNewSupplierDialog(true);
                                              }}
                                              className="cursor-pointer py-2 px-3 hover:bg-blue-50 border-t text-blue-600 flex items-center gap-2 text-sm font-medium"
                                            >
                                              <Plus className="h-4 w-4" />
                                              Register New Supplier
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-sm font-medium text-gray-700">Supplier ID:</div>
                                      <Input
                                        value={supplierInfo.supplierId}
                                        onChange={(e) => {
                                          const updatedSuppliers = [...grnData.suppliers];
                                          const supplierIndex = updatedSuppliers.findIndex(s => s.id === supplierId);
                                          if (supplierIndex >= 0) {
                                            updatedSuppliers[supplierIndex].supplierId = e.target.value;
                                          } else {
                                            updatedSuppliers.push({
                                              id: supplierId,
                                              name: `Supplier ${supplierIndex + 1}`,
                                              supplierId: e.target.value,
                                              phone: "",
                                              email: "",
                                              address: "",
                                              tinNumber: "",
                                              stockType: ""  // Add the stockType field
                                            });
                                          }
                                          setGrnData(prev => ({ ...prev, suppliers: updatedSuppliers }));
                                        }}
                                        className="p-2 text-sm w-full mt-1"
                                        placeholder="Enter supplier ID"
                                      />
                                    </div>
                                    <div>
                                      <div className="text-sm font-medium text-gray-700">Phone:</div>
                                      <Input
                                        value={supplierInfo.phone}
                                        onChange={(e) => {
                                          const updatedSuppliers = [...grnData.suppliers];
                                          const supplierIndex = updatedSuppliers.findIndex(s => s.id === supplierId);
                                          if (supplierIndex >= 0) {
                                            updatedSuppliers[supplierIndex].phone = e.target.value;
                                          }
                                          setGrnData(prev => ({ ...prev, suppliers: updatedSuppliers }));
                                        }}
                                        className="p-2 text-sm w-full mt-1"
                                        placeholder="Enter phone number"
                                      />
                                    </div>
                                    <div>
                                      <div className="text-sm font-medium text-gray-700">Email:</div>
                                      <Input
                                        value={supplierInfo.email}
                                        onChange={(e) => {
                                          const updatedSuppliers = [...grnData.suppliers];
                                          const supplierIndex = updatedSuppliers.findIndex(s => s.id === supplierId);
                                          if (supplierIndex >= 0) {
                                            updatedSuppliers[supplierIndex].email = e.target.value;
                                          }
                                          setGrnData(prev => ({ ...prev, suppliers: updatedSuppliers }));
                                        }}
                                        className="p-2 text-sm w-full mt-1"
                                        placeholder="Enter email address"
                                        type="email"
                                      />
                                    </div>
                                    <div className="md:col-span-2">
                                      <div className="text-sm font-medium text-gray-700">Address:</div>
                                      <Textarea
                                        value={supplierInfo.address}
                                        onChange={(e) => {
                                          const updatedSuppliers = [...grnData.suppliers];
                                          const supplierIndex = updatedSuppliers.findIndex(s => s.id === supplierId);
                                          if (supplierIndex >= 0) {
                                            updatedSuppliers[supplierIndex].address = e.target.value;
                                          }
                                          setGrnData(prev => ({ ...prev, suppliers: updatedSuppliers }));
                                        }}
                                        className="p-2 text-sm w-full mt-1 min-h-[60px]"
                                        placeholder="Enter supplier address"
                                      />
                                    </div>
                                    <div>
                                      <div className="text-sm font-medium text-gray-700">Supplier Tin:</div>
                                      <Input
                                        value={supplierInfo.tinNumber || ""}
                                        onChange={(e) => {
                                          const updatedSuppliers = [...grnData.suppliers];
                                          const supplierIndex = updatedSuppliers.findIndex(s => s.id === supplierId);
                                          if (supplierIndex >= 0) {
                                            updatedSuppliers[supplierIndex].tinNumber = e.target.value;
                                          } else {
                                            updatedSuppliers.push({
                                              id: supplierId,
                                              name: `Supplier ${supplierIndex + 1}`,
                                              supplierId: `SUP-${String(supplierIndex + 1).padStart(3, '0')}`,
                                              phone: "",
                                              email: "",
                                              address: "",
                                              tinNumber: e.target.value,
                                              businessTin: "",
                                              stockType: ""
                                            });
                                          }
                                          setGrnData(prev => ({ ...prev, suppliers: updatedSuppliers }));
                                        }}
                                        className="p-2 text-sm w-full mt-1"
                                        placeholder="Enter supplier TIN number"
                                      />
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Compliance Section */}
                                <div className="border border-gray-300 rounded-lg p-4 mb-4 bg-gray-50">
                                  <div className="font-bold text-lg mb-3 text-green-800">
                                    COMPLIANCE
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <div className="text-sm font-medium text-gray-700">Stock Type: <span className="text-red-500">*</span></div>
                                      <Select
                                        value={(supplierInfo as SupplierInfo).stockType}
                                        onValueChange={(value) => {
                                          const updatedSuppliers = [...grnData.suppliers];
                                          const supplierIndex = updatedSuppliers.findIndex(s => s.id === supplierId);
                                          if (supplierIndex >= 0) {
                                            const supplier = updatedSuppliers[supplierIndex] as SupplierInfo;
                                            supplier.stockType = value as 'exempt' | 'vatable' | '';
                                          } else {
                                            updatedSuppliers.push({
                                              id: supplierId,
                                              name: `Supplier ${supplierIndex + 1}`,
                                              supplierId: `SUP-${String(supplierIndex + 1).padStart(3, '0')}`,
                                              phone: "",
                                              email: "",
                                              address: "",
                                              tinNumber: "",
                                              businessTin: "",  // Add the businessTin field
                                              stockType: value as 'exempt' | 'vatable' | ''
                                            });
                                          }
                                          setGrnData(prev => ({ ...prev, suppliers: updatedSuppliers }));
                                        }}
                                      >
                                        <SelectTrigger className="w-full mt-1">
                                          <SelectValue placeholder="Select stock type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="exempt">Exempt Stock</SelectItem>
                                          <SelectItem value="vatable">Vatable Stock</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div>
                                      <div className="text-sm font-medium text-gray-700">Is Tin Implemented ?:</div>
                                      <div className="flex space-x-2 mt-1">
                                        <Button
                                          type="button"
                                          variant={supplierInfo.businessTin !== undefined ? "default" : "outline"}
                                          size="sm"
                                          onClick={() => {
                                            // Show Business TIN field - user wants TIN implemented
                                            const updatedSuppliers = [...grnData.suppliers];
                                            const supplierIndex = updatedSuppliers.findIndex(s => s.id === supplierId);
                                            if (supplierIndex >= 0) {
                                              if (updatedSuppliers[supplierIndex].businessTin === undefined) {
                                                updatedSuppliers[supplierIndex].businessTin = "";
                                              }
                                            } else {
                                              updatedSuppliers.push({
                                                id: supplierId,
                                                name: `Supplier ${supplierIndex + 1}`,
                                                supplierId: `SUP-${String(supplierIndex + 1).padStart(3, '0')}`,
                                                phone: "",
                                                email: "",
                                                address: "",
                                                tinNumber: supplierInfo.tinNumber || "",
                                                businessTin: "",
                                                stockType: ""
                                              });
                                            }
                                            setGrnData(prev => ({ ...prev, suppliers: updatedSuppliers, isVatable: true }));
                                          }}
                                        >
                                          Yes
                                        </Button>
                                        <Button
                                          type="button"
                                          variant={supplierInfo.businessTin === undefined ? "default" : "outline"}
                                          size="sm"
                                          onClick={() => {
                                            // Hide Business TIN field - keep supplier tinNumber intact
                                            const updatedSuppliers = [...grnData.suppliers];
                                            const supplierIndex = updatedSuppliers.findIndex(s => s.id === supplierId);
                                            if (supplierIndex >= 0) {
                                              updatedSuppliers[supplierIndex].businessTin = undefined;
                                            }
                                            setGrnData(prev => ({ ...prev, suppliers: updatedSuppliers, isVatable: false }));
                                          }}
                                        >
                                          No
                                        </Button>
                                      </div>
                                    </div>
                                    {supplierInfo.businessTin !== undefined && supplierInfo.businessTin !== null && (
                                      <div className="md:col-span-2">
                                        <div className="text-sm font-medium text-gray-700">Business Tin:</div>
                                        <Input
                                          value={supplierInfo.businessTin || ""}
                                          onChange={(e) => {
                                            const updatedSuppliers = [...grnData.suppliers];
                                            const supplierIndex = updatedSuppliers.findIndex(s => s.id === supplierId);
                                            if (supplierIndex >= 0) {
                                              const supplier = updatedSuppliers[supplierIndex] as SupplierInfo;
                                              supplier.businessTin = e.target.value;
                                            }
                                            setGrnData(prev => ({ ...prev, suppliers: updatedSuppliers }));
                                          }}
                                          className="p-2 text-sm w-full mt-1"
                                          placeholder="Enter business TIN number"
                                        />
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Supplier Document Upload */}
                                <div className="border border-gray-300 rounded-lg p-4 mb-4 bg-orange-50">
                                  <div className="font-bold text-lg mb-3 text-orange-800">
                                    SUPPLIER DOCUMENT <span className="text-red-600">*</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <label className="cursor-pointer bg-orange-600 hover:bg-orange-700 text-white text-sm px-4 py-2 rounded flex items-center gap-2">
                                      <FileText size={16} />
                                      {supplierInfo.documentUrl ? 'Replace PDF' : 'Upload PDF'}
                                      <input
                                        type="file"
                                        accept=".pdf,application/pdf"
                                        className="hidden"
                                        onChange={async (e) => {
                                          const file = e.target.files?.[0];
                                          if (!file) return;
                                          if (file.type !== 'application/pdf') {
                                            alert('Please select a PDF file');
                                            return;
                                          }
                                          const updatedSuppliers = [...grnData.suppliers];
                                          const supplierIndex = updatedSuppliers.findIndex(s => s.id === supplierId);
                                          if (supplierIndex >= 0) {
                                            updatedSuppliers[supplierIndex].documentName = file.name;
                                          }
                                          setGrnData(prev => ({ ...prev, suppliers: updatedSuppliers }));
                                          const url = await uploadFile(file, 'assets', 'grn-documents');
                                          if (url) {
                                            const upd = [...grnData.suppliers];
                                            const idx = upd.findIndex(s => s.id === supplierId);
                                            if (idx >= 0) {
                                              upd[idx].documentUrl = url;
                                            }
                                            setGrnData(prev => ({ ...prev, suppliers: upd }));
                                          } else {
                                            alert('Failed to upload document. Please try again.');
                                          }
                                        }}
                                      />
                                    </label>
                                    {supplierInfo.documentUrl && (
                                      <div className="flex items-center gap-2">
                                        <a
                                          href={supplierInfo.documentUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                                        >
                                          <ExternalLink size={14} />
                                          {supplierInfo.documentName || 'View Document'}
                                        </a>
                                        <button
                                          type="button"
                                          className="text-red-500 hover:text-red-700 text-xs"
                                          onClick={() => {
                                            const updatedSuppliers = [...grnData.suppliers];
                                            const supplierIndex = updatedSuppliers.findIndex(s => s.id === supplierId);
                                            if (supplierIndex >= 0) {
                                              updatedSuppliers[supplierIndex].documentUrl = undefined;
                                              updatedSuppliers[supplierIndex].documentName = undefined;
                                            }
                                            setGrnData(prev => ({ ...prev, suppliers: updatedSuppliers }));
                                          }}
                                        >
                                          Remove
                                        </button>
                                      </div>
                                    )}
                                    {!supplierInfo.documentUrl && supplierInfo.documentName && (
                                      <span className="text-sm text-gray-500 flex items-center gap-1">
                                        <Loader2 size={14} className="animate-spin" />
                                        Uploading {supplierInfo.documentName}...
                                      </span>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Items Table */}
                                <div className="font-bold mb-2">
                                  ITEMS RECEIVED WITH UPDATED PRICES{grnData.numberOfSuppliers > 1 ? ` - SUPPLIER ${supplierIndex + 1}` : ':'}
                                </div>
                                <div className="overflow-x-auto relative">
                                  <table className="w-full border-collapse border border-gray-300 text-sm">
                                    <thead>
                                      <tr className="bg-gray-100">
                                        <th className="border border-gray-300 p-2 text-left" style={{ width: '18%', minWidth: '180px' }}>Description</th>
                                        <th className="border border-gray-300 p-2 text-left" style={{ width: '6%' }}>Ordered</th>
                                        <th className="border border-gray-300 p-2 text-left" style={{ width: '6%' }}>Received</th>
                                        <th className="border border-gray-300 p-2 text-left" style={{ width: '5%' }}>Unit</th>
                                        <th className="border border-gray-300 p-2 text-left" style={{ width: '10%' }}>Orig. Cost</th>
                                        <th className="border border-gray-300 p-2 text-left" style={{ width: '8%' }}>Recv. Cost</th>
                                        <th className="border border-gray-300 p-2 text-left" style={{ width: '8%' }}>New Cost</th>
                                        <th className="border border-gray-300 p-2 text-left" style={{ width: '9%' }}>Total</th>
                                        <th className="border border-gray-300 p-2 text-left" style={{ width: '6%' }}>Batch #</th>
                                        <th className="border border-gray-300 p-2 text-left" style={{ width: '7%' }}>Expiry</th>
                                        <th className="border border-gray-300 p-2 text-left" style={{ width: '10%', minWidth: '120px' }}>Godown *</th>
                                        <th className="border border-gray-300 p-2 text-left" style={{ width: '10%', minWidth: '120px' }}>Zone *</th>
                                        <th className="border border-gray-300 p-2 text-left" style={{ width: '6%' }}>Remarks</th>
                                        <th className="border border-gray-300 p-2 text-left" style={{ width: '4%' }}>Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {supplierItems.map((item) => (
                                        <tr key={`${item.id}-${supplierIndex}`}>
                                          <td className="border border-gray-300 p-2 relative" style={{ width: '25%', minWidth: '200px' }}>
                                            <div className="relative">
                                              <Input
                                                value={item.description || ""}
                                                onChange={(e) => {
                                                  setGrnData(prev => ({
                                                    ...prev,
                                                    items: prev.items.map(i => 
                                                      i.id === item.id ? { ...i, description: e.target.value } : i
                                                    )
                                                  }));
                                                  setShowGrnDropdown(true);
                                                }}
                                                onFocus={() => setShowGrnDropdown(true)}
                                                onBlur={() => {
                                                  // Delay hiding the dropdown to allow click events to register
                                                  setTimeout(() => setShowGrnDropdown(false), 150);
                                                }}
                                                className="p-1 h-8 text-sm w-full"
                                                placeholder="Select or enter product..."
                                                style={{ minWidth: '180px' }}
                                              />
                                              {showGrnDropdown && grnProductDescriptions.length > 0 && (
                                                <div 
                                                  id={`grn-dropdown-${item.id}-${supplierIndex}`}
                                                  className="fixed z-50 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
                                                  style={{ minWidth: '400px' }}
                                                >
                                                  {grnProductDescriptions
                                                    .filter(desc => 
                                                      item.description === "" || desc.toLowerCase().includes(item.description.toLowerCase())
                                                    )
                                                    .map((desc, idx) => {
                                                      const productData = grnProductItems.find(p => p.name === desc);
                                                      const stockQty = productData?.stock_quantity ?? 0;
                                                      const stockColor = stockQty === 0 ? 'text-red-600' : stockQty <= 10 ? 'text-yellow-600' : 'text-green-600';
                                                      
                                                      return (
                                                      <div
                                                        key={idx}
                                                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm flex justify-between items-center"
                                                        onMouseDown={() => {
                                                          handleGrnProductSelect(desc, item.id);
                                                        }}
                                                      >
                                                        <span className="flex-1">{desc}</span>
                                                        <span className={`ml-2 font-semibold ${stockColor}`}>
                                                          Stock: {stockQty}
                                                        </span>
                                                      </div>
                                                      );
                                                    })
                                                  }
                                                </div>
                                              )}
                                            </div>
                                          </td>
                                          <td className="border border-gray-300 p-2">
                                            <Input
                                              type="number"
                                              value={item.orderedQuantity || 0}
                                              onChange={(e) => setGrnData(prev => ({
                                                ...prev,
                                                items: prev.items.map(i => 
                                                  i.id === item.id ? { ...i, orderedQuantity: parseInt(e.target.value) || 0 } : i
                                                )
                                              }))}
                                              className="p-1 h-8 text-sm w-full"
                                            />
                                          </td>
                                          <td className="border border-gray-300 p-2">
                                            <Input
                                              type="number"
                                              value={item.receivedQuantity || 0}
                                              onChange={(e) => {
                                                const newQuantity = parseInt(e.target.value) || 0;
                                                handleReceivedQuantityChange(item.id, newQuantity);
                                              }}
                                              className="p-1 h-8 text-sm w-full"
                                            />
                                          </td>
                                          <td className="border border-gray-300 p-2">
                                            <Input
                                              value={item.unit || ""}
                                              onChange={(e) => setGrnData(prev => ({
                                                ...prev,
                                                items: prev.items.map(i => 
                                                  i.id === item.id ? { ...i, unit: e.target.value } : i
                                                )
                                              }))}
                                              className="p-1 h-8 text-sm w-full"
                                            />
                                          </td>
                                          <td className="border border-gray-300 p-2 text-right cursor-pointer" onClick={(e) => {
                                            const input = e.currentTarget.querySelector('input');
                                            if (input) { input.focus(); input.select(); }
                                          }}>
                                            <div className="relative">
                                              <span className="cost-display">{formatCurrency(item.originalUnitCost || (item.unitCost ? item.unitCost - (item.receivingCostPerUnit || 0) : 0))}</span>
                                              <Input
                                                type="number"
                                                step="0.01"
                                                value={item.originalUnitCost || (item.unitCost ? item.unitCost - (item.receivingCostPerUnit || 0) : 0)}
                                                onChange={(e) => setGrnData(prev => ({
                                                  ...prev,
                                                  items: prev.items.map(i => 
                                                    i.id === item.id ? { 
                                                      ...i, 
                                                      originalUnitCost: parseFloat(e.target.value) || 0,
                                                      unitCost: (parseFloat(e.target.value) || 0) + (item.receivingCostPerUnit || 0)
                                                    } : i
                                                  )
                                                }))}
                                                className="p-1 h-8 text-sm w-full text-right absolute inset-0 opacity-0 focus:opacity-100 focus:z-10"
                                              />
                                            </div>
                                          </td>
                                          <td className="border border-gray-300 p-2">
                                            {formatCurrency(item.receivingCostPerUnit || 0)}
                                          </td>
                                          <td className="border border-gray-300 p-2">
                                            {formatCurrency(item.unitCost || 0)}
                                          </td>
                                          <td className="border border-gray-300 p-2">
                                            {formatCurrency(item.totalWithReceivingCost || 0)}
                                          </td>
                                          <td className="border border-gray-300 p-2">
                                            <Input
                                              value={item.batchNumber || ""}
                                              onChange={(e) => setGrnData(prev => ({
                                                ...prev,
                                                items: prev.items.map(i => 
                                                  i.id === item.id ? { ...i, batchNumber: e.target.value } : i
                                                )
                                              }))}
                                              className="p-1 h-8 text-sm w-full"
                                            />
                                          </td>
                                          <td className="border border-gray-300 p-2">
                                            <Input
                                              type="date"
                                              value={item.expiryDate || ""}
                                              onChange={(e) => setGrnData(prev => ({
                                                ...prev,
                                                items: prev.items.map(i => 
                                                  i.id === item.id ? { ...i, expiryDate: e.target.value } : i
                                                )
                                              }))}
                                              className="p-1 h-8 text-sm w-full"
                                            />
                                          </td>
                                          <td className="border border-gray-300 p-2">
                                            <select
                                              value={item.destinationGodownId || ""}
                                              onChange={async (e) => {
                                                const godownId = e.target.value;
                                                const selectedGodown = grnGodowns.find(g => g.id === godownId);
                                                setGrnData(prev => ({
                                                  ...prev,
                                                  items: prev.items.map(i =>
                                                    i.id === item.id ? {
                                                      ...i,
                                                      destinationGodownId: godownId,
                                                      destinationGodownName: selectedGodown?.name || '',
                                                      destinationZoneId: '',
                                                      destinationZoneName: ''
                                                    } : i
                                                  )
                                                }));
                                                if (godownId) {
                                                  await getZonesForGodown(godownId);
                                                }
                                              }}
                                              className="p-1 h-8 text-xs w-full border border-gray-300 rounded"
                                            >
                                              <option value="">Select...</option>
                                              {grnGodowns.map((godown) => (
                                                <option key={godown.id} value={godown.id!}>
                                                  {godown.name}
                                                </option>
                                              ))}
                                            </select>
                                          </td>
                                          <td className="border border-gray-300 p-2">
                                            <select
                                              value={item.destinationZoneId || ""}
                                              onChange={(e) => {
                                                const zoneId = e.target.value;
                                                const zones = grnZonesByGodown.get(item.destinationGodownId || '') || [];
                                                const selectedZone = zones.find(z => z.id === zoneId);
                                                setGrnData(prev => ({
                                                  ...prev,
                                                  items: prev.items.map(i =>
                                                    i.id === item.id ? {
                                                      ...i,
                                                      destinationZoneId: zoneId,
                                                      destinationZoneName: selectedZone?.zone_name || ''
                                                    } : i
                                                  )
                                                }));
                                              }}
                                              className="p-1 h-8 text-xs w-full border border-gray-300 rounded"
                                              disabled={!item.destinationGodownId}
                                            >
                                              <option value="">All Zones</option>
                                              {(grnZonesByGodown.get(item.destinationGodownId || '') || []).map((zone) => (
                                                <option key={zone.id} value={zone.id!}>
                                                  {zone.zone_name}
                                                </option>
                                              ))}
                                            </select>
                                          </td>
                                          <td className="border border-gray-300 p-2">
                                            <Input
                                              value={item.remarks || ""}
                                              onChange={(e) => setGrnData(prev => ({
                                                ...prev,
                                                items: prev.items.map(i => 
                                                  i.id === item.id ? { ...i, remarks: e.target.value } : i
                                                )
                                              }))}
                                              className="p-1 h-8 text-sm w-full"
                                            />
                                          </td>
                                          <td className="border border-gray-300 p-2">
                                            <Button
                                              onClick={() => handleRemoveGRNItem(item.id)}
                                              variant="outline"
                                              size="sm"
                                              className="p-1 h-8"
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                                
                                {/* Add Item button for each supplier table */}
                                <div className="flex justify-between items-center mt-2">
                                  <Button 
                                    onClick={() => {
                                      const newItemId = Date.now().toString();
                                      setGrnData(prev => ({
                                        ...prev,
                                        items: [...prev.items, {
                                          id: newItemId,
                                          description: "",
                                          orderedQuantity: 0,
                                          receivedQuantity: 0,
                                          unit: "",
                                          originalUnitCost: 0,
                                          unitCost: 0,
                                          receivingCostPerUnit: 0,
                                          totalWithReceivingCost: 0,
                                          batchNumber: "",
                                          expiryDate: "",
                                          remarks: "",
                                          supplierId: supplierId
                                        }]
                                      }));
                                    }}
                                    variant="outline"
                                    size="sm"
                                    className="mt-2"
                                  >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Add Item for Supplier {supplierIndex + 1}
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                          
                          {/* Global Add Item button */}
                          <div className="flex justify-between items-center mt-4 pt-4 border-t">
                            <Button 
                              onClick={handleAddGRNItem}
                              variant="outline"
                              size="sm"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add Item (Global)
                            </Button>
                            <div className="text-sm text-gray-600">
                              Total Suppliers: {grnData.numberOfSuppliers} | Total Items: {grnData.items.length}
                            </div>
                          </div>
                        </div>
                        
                        {/* Quality Check and Discrepancies */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <div className="font-bold mb-2">QUALITY CHECK NOTES:</div>
                            <Textarea
                              value={grnData.qualityCheckNotes}
                              onChange={(e) => setGrnData(prev => ({ ...prev, qualityCheckNotes: e.target.value }))}
                              className="min-h-[80px] text-sm"
                            />
                          </div>
                          <div>
                            <div className="font-bold mb-2">DISCREPANCIES:</div>
                            <Textarea
                              value={grnData.discrepancies}
                              onChange={(e) => setGrnData(prev => ({ ...prev, discrepancies: e.target.value }))}
                              className="min-h-[80px] text-sm"
                            />
                          </div>
                        </div>
                        
                        {/* Signatures */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
                          <div>
                            <div className="font-bold mb-2">Prepared By</div>
                            <div className="text-sm space-y-2">
                              <div>
                                <span>Name:</span>
                                <Input 
                                  value={grnData.preparedBy}
                                  onChange={(e) => setGrnData(prev => ({ ...prev, preparedBy: e.target.value }))}
                                  className="w-full h-6 p-1 text-sm mt-1"
                                />
                              </div>
                              <div>
                                <span>Date:</span>
                                <Input 
                                  type="date"
                                  value={grnData.preparedDate}
                                  onChange={(e) => setGrnData(prev => ({ ...prev, preparedDate: e.target.value }))}
                                  className="w-full h-6 p-1 text-sm mt-1"
                                />
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="font-bold mb-2">Checked By</div>
                            <div className="text-sm space-y-2">
                              <div>
                                <span>Name:</span>
                                <Input 
                                  value={grnData.checkedBy}
                                  onChange={(e) => setGrnData(prev => ({ ...prev, checkedBy: e.target.value }))}
                                  className="w-full h-6 p-1 text-sm mt-1"
                                />
                              </div>
                              <div>
                                <span>Date:</span>
                                <Input 
                                  type="date"
                                  value={grnData.checkedDate}
                                  onChange={(e) => setGrnData(prev => ({ ...prev, checkedDate: e.target.value }))}
                                  className="w-full h-6 p-1 text-sm mt-1"
                                />
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="font-bold mb-2">Approved By</div>
                            <div className="text-sm space-y-2">
                              <div>
                                <span>Name:</span>
                                <Input 
                                  value={grnData.approvedBy}
                                  onChange={(e) => setGrnData(prev => ({ ...prev, approvedBy: e.target.value }))}
                                  className="w-full h-6 p-1 text-sm mt-1"
                                />
                              </div>
                              <div>
                                <span>Date:</span>
                                <Input 
                                  type="date"
                                  value={grnData.approvedDate}
                                  onChange={(e) => setGrnData(prev => ({ ...prev, approvedDate: e.target.value }))}
                                  className="w-full h-6 p-1 text-sm mt-1"
                                />
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="font-bold mb-2">Received By</div>
                            <div className="text-sm space-y-2">
                              <div>
                                <span>Name:</span>
                                <Input 
                                  value={grnData.receivedBy}
                                  onChange={(e) => setGrnData(prev => ({ ...prev, receivedBy: e.target.value }))}
                                  className="w-full h-6 p-1 text-sm mt-1"
                                />
                              </div>
                              <div>
                                <span>Date:</span>
                                <Input 
                                  type="date"
                                  value={grnData.receivedDate}
                                  onChange={(e) => setGrnData(prev => ({ ...prev, receivedDate: e.target.value }))}
                                  className="w-full h-6 p-1 text-sm mt-1"
                                />
                              </div>
                              <div className="text-xs mt-2">(Signature Required)</div>
                            </div>
                          </div>

                        </div>
                      </div>
                    ) : currentTemplate?.type === "supplier-settlement" ? (
                      // Supplier Settlement Content
                      <div className="space-y-6">
                        {/* Header */}
                        <div className="text-center border-b-2 border-gray-800 pb-2">
                          <h2 className="text-2xl font-bold">SUPPLIER SETTLEMENT RECEIPT</h2>
                          <p className="text-sm">Receipt #{supplierSettlementData.referenceNumber || 'RECEIPT_NUMBER'}</p>
                          <p className="text-sm">Date: {new Date().toLocaleDateString()}</p>
                          <p className="text-sm">Time: {new Date().toLocaleTimeString()}</p>
                        </div>
                                            
                        {/* Supplier Information */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div>
                            <div className="font-bold mb-1">SUPPLIER INFORMATION:</div>
                            <div className="text-sm mb-1">
                              <span className="font-medium">Name:</span>
                              <Input 
                                value={supplierSettlementData.supplierName}
                                onChange={(e) => handleSupplierSettlementChange("supplierName", e.target.value)}
                                className="w-full p-1 text-sm mt-1"
                              />
                            </div>
                            <div className="text-sm mb-1">
                              <span className="font-medium">ID:</span>
                              <Input 
                                value={supplierSettlementData.supplierId}
                                onChange={(e) => handleSupplierSettlementChange("supplierId", e.target.value)}
                                className="w-full p-1 text-sm mt-1"
                                readOnly
                              />
                            </div>
                            <div className="text-sm mb-1">
                              <span className="font-medium">Phone:</span>
                              <Input 
                                value={supplierSettlementData.supplierPhone}
                                onChange={(e) => handleSupplierSettlementChange("supplierPhone", e.target.value)}
                                className="w-full p-1 text-sm mt-1"
                              />
                            </div>
                            <div className="text-sm mb-1">
                              <span className="font-medium">Email:</span>
                              <Input 
                                value={supplierSettlementData.supplierEmail}
                                onChange={(e) => handleSupplierSettlementChange("supplierEmail", e.target.value)}
                                className="w-full p-1 text-sm mt-1"
                              />
                            </div>
                          </div>
                                              
                          <div>
                            <div className="font-bold mb-1">SETTLEMENT DETAILS:</div>
                            <div className="text-sm mb-1">
                              <span className="font-medium">Reference:</span>
                              <Input 
                                value={supplierSettlementData.referenceNumber}
                                onChange={(e) => handleSupplierSettlementChange("referenceNumber", e.target.value)}
                                className="w-full p-1 text-sm mt-1"
                                readOnly
                              />
                            </div>
                            <div className="text-sm mb-1">
                              <span className="font-medium">PO Number:</span>
                              <Input 
                                value={supplierSettlementData.poNumber}
                                onChange={(e) => handleSupplierSettlementChange("poNumber", e.target.value)}
                                className="w-full p-1 text-sm mt-1"
                              />
                            </div>
                            <div className="text-sm mb-1">
                              <span className="font-medium">Amount:</span>
                              <div className="flex">
                                <span className="inline-flex items-center px-3 text-sm text-gray-500 bg-gray-100 border border-r-0 border-gray-300 rounded-l-md">
                                  TZS
                                </span>
                                <Input 
                                  type="number" 
                                  step="0.01"
                                  value={supplierSettlementData.settlementAmount}
                                  onChange={(e) => handleSupplierSettlementChange("settlementAmount", parseFloat(e.target.value) || 0)}
                                  className="w-full p-1 text-sm mt-1 rounded-l-none"
                                />
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Formatted: {formatCurrency(supplierSettlementData.settlementAmount)}
                              </div>
                            </div>
                            <div className="text-sm mb-1">
                              <span className="font-medium">Payment Method:</span>
                              <Input 
                                value={supplierSettlementData.paymentMethod}
                                onChange={(e) => handleSupplierSettlementChange("paymentMethod", e.target.value)}
                                className="w-full p-1 text-sm mt-1"
                              />
                            </div>
                            <div className="text-sm mb-1">
                              <span className="font-medium">Processed by:</span>
                              <Input 
                                value={supplierSettlementData.processedBy}
                                onChange={(e) => handleSupplierSettlementChange("processedBy", e.target.value)}
                                className="w-full p-1 text-sm mt-1"
                              />
                            </div>
                          </div>
                        </div>
                                            
                        {/* Transaction Summary */}
                        <div className="space-y-4">
                          <div className="font-bold mb-2">TRANSACTION SUMMARY:</div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="border p-3 rounded">
                              <div className="text-sm font-medium">Previous Balance</div>
                              <Input 
                                type="number" 
                                step="0.01"
                                value={supplierSettlementData.previousBalance}
                                onChange={(e) => handleSupplierSettlementChange("previousBalance", parseFloat(e.target.value) || 0)}
                                className="w-full p-1 text-sm mt-1"
                              />
                              <div className="text-xs text-gray-500 mt-1">
                                Formatted: {formatCurrency(supplierSettlementData.previousBalance)}
                              </div>
                            </div>
                            <div className="border p-3 rounded">
                              <div className="text-sm font-medium">Amount Paid</div>
                              <Input 
                                type="number" 
                                step="0.01"
                                value={supplierSettlementData.amountPaid}
                                onChange={(e) => handleSupplierSettlementChange("amountPaid", parseFloat(e.target.value) || 0)}
                                className="w-full p-1 text-sm mt-1"
                              />
                              <div className="text-xs text-gray-500 mt-1">
                                Formatted: {formatCurrency(supplierSettlementData.amountPaid)}
                              </div>
                            </div>
                            <div className="border p-3 rounded">
                              <div className="text-sm font-medium">New Balance</div>
                              <Input 
                                type="number" 
                                step="0.01"
                                value={supplierSettlementData.newBalance}
                                onChange={(e) => handleSupplierSettlementChange("newBalance", parseFloat(e.target.value) || 0)}
                                className="w-full p-1 text-sm mt-1"
                              />
                              <div className="text-xs text-gray-500 mt-1">
                                Formatted: {formatCurrency(supplierSettlementData.newBalance)}
                              </div>
                            </div>
                          </div>
                        </div>
                                            
                        {/* Notes */}
                        <div>
                          <div className="font-bold mb-2">NOTES:</div>
                          <Textarea
                            value={supplierSettlementData.notes}
                            onChange={(e) => handleSupplierSettlementChange("notes", e.target.value)}
                            className="min-h-[60px] p-2 border rounded bg-gray-50 w-full"
                          />
                        </div>
                                            
                        {/* Footer */}
                        <div className="text-center mt-8 pt-4 border-t border-gray-300">
                          <div className="text-sm font-bold">Thank you for your business!</div>
                          <div className="text-sm">We appreciate working with you.</div>
                        </div>
                      </div>
                    ) : currentTemplate?.type === "stock-take" ? (
                      // Stock Take Content - Investment Inventory (Godown/Zone)
                      <div className="space-y-6">
                        {/* Batch Mode Toggle */}
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                          <div>
                            <span className="font-bold text-sm">BATCH MODE</span>
                            <p className="text-xs text-muted-foreground">Count stock across multiple godowns in one session</p>
                          </div>
                          <button
                            onClick={() => { setBatchMode(!batchMode); if (!batchMode) { setBatchStep('select'); setBatchSelectedGodowns([]); } }}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${batchMode ? 'bg-blue-600' : 'bg-gray-300'}`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${batchMode ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                        </div>

                        {batchMode ? (
                          /* BATCH MODE UI */
                          batchStep === 'select' ? (
                            /* Step 1: Godown Selection */
                            <div className="space-y-4">
                              <h3 className="font-bold text-lg">Select Godowns for Batch Stock Take</h3>
                              <p className="text-sm text-muted-foreground">Choose which godowns to include in this stock take session.</p>
                              {godowns.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic">No godowns registered. Please add godowns first.</p>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {godowns.map(g => {
                                    const selected = batchSelectedGodowns.some(sg => sg.id === g.id);
                                    return (
                                      <div
                                        key={g.id}
                                        onClick={() => toggleBatchGodown(g.id!, g.name)}
                                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${selected ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                                      >
                                        <div className="flex items-center justify-between">
                                          <span className="font-medium text-sm">{g.name}</span>
                                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${selected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                                            {selected && <span className="text-white text-xs">&#10003;</span>}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              <div className="flex items-center justify-between pt-4 border-t">
                                <span className="text-sm font-medium">{batchSelectedGodowns.length} godown(s) selected</span>
                                <Button
                                  onClick={startBatchStockTake}
                                  disabled={batchSelectedGodowns.length === 0}
                                  className="bg-blue-600 text-white hover:bg-blue-700"
                                >
                                  Start Batch Stock Take
                                </Button>
                              </div>
                            </div>
                          ) : (
                            /* Step 2: Wizard */
                            <div className="space-y-4">
                              {/* Progress Bar */}
                              <div className="p-3 bg-gray-50 rounded-lg border">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-bold text-sm">
                                    Godown {batchCurrentIndex + 1} of {batchSelectedGodowns.length}: {getCurrentBatchGodown()?.name}
                                  </span>
                                  <Button variant="ghost" size="sm" onClick={() => setBatchStep('select')} className="text-xs">
                                    Change Godowns
                                  </Button>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-blue-600 h-2 rounded-full transition-all"
                                    style={{ width: `${((batchCurrentIndex + 1) / batchSelectedGodowns.length) * 100}%` }}
                                  />
                                </div>
                              </div>

                              {/* Godown Sidebar + Main Area */}
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                {/* Sidebar: Godown List */}
                                <div className="md:col-span-1 space-y-2">
                                  {batchSelectedGodowns.map((g, idx) => (
                                    <div
                                      key={g.id}
                                      onClick={() => { setBatchCurrentIndex(idx); loadBatchZones(g.id); }}
                                      className={`p-2 rounded-lg border cursor-pointer text-sm transition-all ${idx === batchCurrentIndex ? 'border-blue-600 bg-blue-50 font-semibold' : 'border-gray-200 hover:border-gray-300'}`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="truncate">{g.name}</span>
                                        {batchGodownCompleted(g.id) ? (
                                          <span className="text-green-600 text-xs">&#10003;</span>
                                        ) : (
                                          <span className="text-gray-400 text-xs">○</span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {/* Main: Stock Count Table */}
                                <div className="md:col-span-3 space-y-4">
                                  {/* Stock Take Header */}
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <div className="font-bold mb-1 text-sm">STOCK TAKE #</div>
                                      <Input value={stockTakeNumber} onChange={(e) => setStockTakeNumber(e.target.value)} className="text-sm font-bold p-1 h-8" />
                                    </div>
                                    <div>
                                      <div className="font-bold mb-1 text-sm">DATE</div>
                                      <Input type="date" value={new Date().toISOString().split('T')[0]} onChange={(e) => {}} className="text-sm p-1 h-8" />
                                    </div>
                                  </div>

                                  {/* Items Table for current godown */}
                                  <div>
                                    <div className="flex items-center justify-between mb-2">
                                      <h3 className="font-bold text-sm">GODOWN STOCK COUNT - {getCurrentBatchGodown()?.name}</h3>
                                    </div>
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-sm border-collapse">
                                        <thead>
                                          <tr className="border-b-2 border-gray-800">
                                            <th className="text-left p-2">No.</th>
                                            <th className="text-left p-2">Product</th>
                                            <th className="text-left p-2">Zone</th>
                                            <th className="text-right p-2">System Qty</th>
                                            <th className="text-right p-2">Physical Count</th>
                                            <th className="text-right p-2">Variance</th>
                                            <th className="p-2"></th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {getCurrentBatchItems().map((item, idx) => (
                                            <tr key={item.id} className="border-b">
                                              <td className="p-2">{idx + 1}</td>
                                              <td className="p-2 relative">
                                                <Input
                                                  value={batchProductSearch[item.id] || ''}
                                                  onChange={(e) => searchBatchProducts(item.id, e.target.value)}
                                                  onFocus={() => { if (batchProductResults[item.id]?.length) setBatchShowDropdown(prev => ({ ...prev, [item.id]: true })); }}
                                                  placeholder="Search product..."
                                                  className="text-sm p-1 h-7"
                                                />
                                                {batchShowDropdown[item.id] && batchProductResults[item.id]?.length > 0 && (
                                                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border rounded shadow-md max-h-48 overflow-y-auto">
                                                    {batchProductResults[item.id].map((p, pIdx) => (
                                                      <div key={`${p.productId}-${p.zoneId || 'nz'}-${pIdx}`} className="px-2 py-1 hover:bg-gray-100 cursor-pointer flex justify-between items-center" onClick={() => selectBatchProduct(item.id, p.productId, p.name, p.quantity, p.zoneId, p.zoneName)}>
                                                        <span className="text-sm">{p.name}</span>
                                                        <span className="text-xs font-semibold text-green-700">Qty: {p.quantity}</span>
                                                      </div>
                                                    ))}
                                                  </div>
                                                )}
                                                {batchShowDropdown[item.id] && batchProductResults[item.id]?.length === 0 && batchProductSearch[item.id] && (
                                                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border rounded shadow-md p-2 text-sm text-muted-foreground">No products found.</div>
                                                )}
                                              </td>
                                              <td className="p-2">
                                                <Select
                                                  value={item.zoneId || '__no_zone__'}
                                                  onValueChange={(val) => {
                                                    const godown = getCurrentBatchGodown();
                                                    if (!godown) return;
                                                    const zoneName = val === '__no_zone__' ? 'No Zone' : (batchZoneOptions[godown.id]?.find(z => z.id === val)?.zone_name || val);
                                                    const zoneId = val === '__no_zone__' ? '' : val;
                                                    setBatchItems(prev => ({
                                                      ...prev,
                                                      [godown.id]: (prev[godown.id] || []).map(i => i.id === item.id ? { ...i, zoneName, zoneId } : i)
                                                    }));
                                                  }}
                                                >
                                                  <SelectTrigger className="h-6 text-xs w-28">
                                                    <SelectValue />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    <SelectItem value="__no_zone__">No Zone</SelectItem>
                                                    {(batchZoneOptions[getCurrentBatchGodown()?.id || ''] || []).map(z => (
                                                      <SelectItem key={z.id} value={z.id!}>{z.zone_name}</SelectItem>
                                                    ))}
                                                  </SelectContent>
                                                </Select>
                                              </td>
                                              <td className="p-2 text-right"><span className="text-sm font-semibold">{item.systemQty}</span></td>
                                              <td className="p-2 text-right">
                                                <Input type="number" value={item.physicalCount || ''} onChange={(e) => updateBatchItem(item.id, 'physicalCount', Number(e.target.value))} placeholder="0" className="text-sm p-1 h-7 text-right" />
                                              </td>
                                              <td className="p-2 text-right">
                                                <span className={`text-sm font-semibold ${item.variance < 0 ? 'text-red-600' : item.variance > 0 ? 'text-green-600' : ''}`}>{item.variance}</span>
                                              </td>
                                              <td className="p-2 text-center">
                                                <Button variant="ghost" size="sm" onClick={() => removeBatchRow(item.id)} className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50">
                                                  <Trash2 className="h-4 w-4" />
                                                </Button>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={addBatchRow} className="mt-2">
                                      <Plus className="h-4 w-4 mr-1" /> Add Row
                                    </Button>
                                  </div>

                                  {/* Navigation */}
                                  <div className="flex items-center justify-between pt-4 border-t">
                                    <Button variant="outline" onClick={() => setBatchCurrentIndex(Math.max(0, batchCurrentIndex - 1))} disabled={batchCurrentIndex === 0}>
                                      Previous
                                    </Button>
                                    <div className="flex gap-2">
                                      {batchCurrentIndex < batchSelectedGodowns.length - 1 ? (
                                        <Button onClick={() => {
                                          const nextIdx = batchCurrentIndex + 1;
                                          setBatchCurrentIndex(nextIdx);
                                          loadBatchZones(batchSelectedGodowns[nextIdx].id);
                                        }} className="bg-blue-600 text-white hover:bg-blue-700">
                                          Next Godown
                                        </Button>
                                      ) : null}
                                    </div>
                                  </div>

                                  {/* Notes and Verification - Show on last godown or always */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t mt-4">
                                    <div className="md:col-span-2">
                                      <h3 className="font-bold mb-2">NOTES</h3>
                                      <Textarea
                                        value={stockTakeNotes}
                                        onChange={(e) => setStockTakeNotes(e.target.value)}
                                        placeholder="Enter notes about discrepancies, damages, or adjustments..."
                                        className="min-h-[80px] p-2 border rounded w-full"
                                      />
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                                    <div>
                                      <div className="font-bold mb-1">COUNTED BY</div>
                                      <Input value={countedByName} onChange={(e) => setCountedByName(e.target.value)} placeholder="Name" className="text-sm p-1 h-8" />
                                      <div className="text-sm mt-1">Date:</div>
                                      <Input type="date" value={countedByDate} onChange={(e) => setCountedByDate(e.target.value)} className="text-sm p-1 h-8 w-full" />
                                    </div>
                                    <div>
                                      <div className="font-bold mb-1">VERIFIED BY (MANAGER)</div>
                                      <Input value={verifiedByName} onChange={(e) => setVerifiedByName(e.target.value)} placeholder="Name" className="text-sm p-1 h-8" />
                                      <div className="text-sm mt-1">Date:</div>
                                      <Input type="date" value={verifiedByDate} onChange={(e) => setVerifiedByDate(e.target.value)} className="text-sm p-1 h-8 w-full" />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        ) : (
                        /* SINGLE GODOWN MODE (existing) */
                        <div>
                        {/* Stock Take Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <div className="font-bold mb-1">STOCK TAKE #</div>
                            <Input
                              value={stockTakeNumber}
                              onChange={(e) => setStockTakeNumber(e.target.value)}
                              className="text-sm font-bold mb-4 p-1 h-8"
                            />
                            
                            <div className="font-bold mb-1">DATE</div>
                            <Input
                              type="date"
                              value={new Date().toISOString().split('T')[0]}
                              onChange={(e) => {}}
                              className="text-sm mb-4 p-1 h-8"
                            />

                            <div className="font-bold mb-1">GODOWN</div>
                            <Select value={stockTakeGodownId} onValueChange={(val) => { setStockTakeGodownId(val); setStockTakeZoneId(""); }}>
                              <SelectTrigger className="text-sm mb-4 p-1 h-8">
                                <SelectValue placeholder="Select godown" />
                              </SelectTrigger>
                              <SelectContent>
                                {godowns.map(g => (
                                  <SelectItem key={g.id} value={g.id!}>{g.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <div className="font-bold mb-1">ZONE</div>
                            <Select value={stockTakeZoneId} onValueChange={setStockTakeZoneId}>
                              <SelectTrigger className="text-sm mb-4 p-1 h-8">
                                <SelectValue placeholder={stockTakeGodownId ? "Select zone (optional)" : "Select godown first"} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__no_zone__">No Zone (Godown Level)</SelectItem>
                                {stockTakeZones.map(z => (
                                  <SelectItem key={z.id} value={z.id!}>{z.zone_name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <div className="font-bold mb-1">COUNTED BY</div>
                            <Input
                              placeholder="Enter name"
                              className="text-sm mb-4 p-1 h-8"
                            />

                            <div className="font-bold mb-1">PURPOSE</div>
                            <Input
                              value="Investment Inventory"
                              readOnly
                              className="text-sm mb-4 p-1 h-8 bg-gray-100"
                            />
                          </div>
                        </div>

                        {/* Items Table */}
                        <div>
                          <h3 className="font-bold mb-2">GODOWN STOCK COUNT</h3>
                          {!stockTakeGodownId && (
                            <p className="text-sm text-muted-foreground mb-2 italic">Select a Godown above to filter products by warehouse stock.</p>
                          )}
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse">
                              <thead>
                                <tr className="border-b-2 border-gray-800">
                                  <th className="text-left p-2">No.</th>
                                  <th className="text-left p-2">Product</th>
                                  <th className="text-left p-2">Godown</th>
                                  <th className="text-left p-2">Zone</th>
                                  <th className="text-right p-2">System Qty</th>
                                  <th className="text-right p-2">Physical Count</th>
                                  <th className="text-right p-2">Variance</th>
                                  <th className="p-2"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {stockTakeItems.map((item, idx) => (
                                  <tr key={item.id} className="border-b">
                                    <td className="p-2">{idx + 1}</td>
                                    <td className="p-2 relative">
                                      <Input
                                        value={stockTakeProductSearch[item.id] || ''}
                                        onChange={(e) => searchStockTakeProducts(item.id, e.target.value)}
                                        onFocus={() => {
                                          if (stockTakeProductResults[item.id]?.length) {
                                            setStockTakeShowDropdown(prev => ({ ...prev, [item.id]: true }));
                                          }
                                        }}
                                        placeholder="Search product..."
                                        className="text-sm p-1 h-7"
                                      />
                                      {stockTakeShowDropdown[item.id] && stockTakeProductResults[item.id]?.length > 0 && (
                                        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border rounded shadow-md max-h-48 overflow-y-auto">
                                          {stockTakeProductResults[item.id].map(p => (
                                            <div
                                              key={p.productId}
                                              className="px-2 py-1 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
                                              onClick={() => selectStockTakeProduct(item.id, p.productId, p.name, p.quantity)}
                                            >
                                              <span className="text-sm">{p.name}</span>
                                              {stockTakeGodownId && (
                                                <span className="text-xs font-semibold text-green-700">Qty: {p.quantity}</span>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      {stockTakeShowDropdown[item.id] && stockTakeProductResults[item.id]?.length === 0 && stockTakeProductSearch[item.id] && (
                                        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border rounded shadow-md p-2 text-sm text-muted-foreground">
                                          {stockTakeGodownId ? 'No products found in selected godown/zone.' : 'Select a godown first to filter products.'}
                                        </div>
                                      )}
                                    </td>
                                    <td className="p-2"><span className="text-sm">{item.godownName || '-'}</span></td>
                                    <td className="p-2"><span className="text-sm">{item.zoneName || '-'}</span></td>
                                    <td className="p-2 text-right"><span className="text-sm font-semibold">{item.systemQty}</span></td>
                                    <td className="p-2 text-right">
                                      <Input
                                        type="number"
                                        value={item.physicalCount || ''}
                                        onChange={(e) => handleStockTakeItemChange(item.id, 'physicalCount', Number(e.target.value))}
                                        placeholder="0"
                                        className="text-sm p-1 h-7 text-right"
                                      />
                                    </td>
                                    <td className="p-2 text-right">
                                      <span className={`text-sm font-semibold ${item.variance < 0 ? 'text-red-600' : item.variance > 0 ? 'text-green-600' : ''}`}>
                                        {item.variance}
                                      </span>
                                    </td>
                                    <td className="p-2 text-center">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeStockTakeRow(item.id)}
                                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <Button variant="outline" size="sm" onClick={addStockTakeRow} className="mt-2">
                            <Plus className="h-4 w-4 mr-1" /> Add Row
                          </Button>
                        </div>

                        {/* Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h3 className="font-bold mb-2">INVENTORY SUMMARY</h3>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between"><span>Total Products:</span><span className="font-bold">{stockTakeTotals.totalProducts}</span></div>
                              <div className="flex justify-between"><span>Total System Quantity:</span><span className="font-bold">{stockTakeTotals.totalSystemQty}</span></div>
                              <div className="flex justify-between"><span>Total Physical Count:</span><span className="font-bold">{stockTakeTotals.totalPhysicalCount}</span></div>
                              <div className="flex justify-between"><span>Total Variance:</span><span className={`font-bold ${stockTakeTotals.totalVariance < 0 ? 'text-red-600' : stockTakeTotals.totalVariance > 0 ? 'text-green-600' : ''}`}>{stockTakeTotals.totalVariance}</span></div>

                            </div>
                          </div>
                          <div>
                            <h3 className="font-bold mb-2">NOTES</h3>
                            <Textarea
                              value={stockTakeNotes}
                              onChange={(e) => setStockTakeNotes(e.target.value)}
                              placeholder="Enter notes about discrepancies, damages, or adjustments..."
                              className="min-h-[80px] p-2 border rounded w-full"
                            />
                          </div>
                        </div>

                        {/* Verification */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                          <div>
                            <div className="font-bold mb-1">COUNTED BY</div>
                            <Input value={countedByName} onChange={(e) => setCountedByName(e.target.value)} placeholder="Name" className="text-sm p-1 h-8" />
                            <div className="text-sm mt-1">Date:</div>
                            <Input type="date" value={countedByDate} onChange={(e) => setCountedByDate(e.target.value)} className="text-sm p-1 h-8 w-full" />
                          </div>
                          <div>
                            <div className="font-bold mb-1">VERIFIED BY (MANAGER)</div>
                            <Input value={verifiedByName} onChange={(e) => setVerifiedByName(e.target.value)} placeholder="Name" className="text-sm p-1 h-8" />
                            <div className="text-sm mt-1">Date:</div>
                            <Input type="date" value={verifiedByDate} onChange={(e) => setVerifiedByDate(e.target.value)} className="text-sm p-1 h-8 w-full" />
                          </div>
                        </div>
                        </div>
                        )}
                      </div>
                    ) : currentTemplate?.type === "supplier-purchase-note" ? (
                      // Supplier Purchase Note Content
                      <div className="space-y-6">
                        {/* Header */}
                        <div className="text-center border-b-2 border-indigo-800 pb-2">
                          <h2 className="text-2xl font-bold text-indigo-900">SUPPLIER PURCHASE NOTE</h2>
                          <p className="text-sm text-muted-foreground">Purchase made on behalf of supplier - No inventory adjustment</p>
                        </div>

                        {/* Note Info */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-bold">Note Number</label>
                            <Input
                              value={supplierPurchaseNoteData.purchaseNoteNumber}
                              onChange={(e) => handleSupplierPurchaseNoteChange('purchaseNoteNumber', e.target.value)}
                              className="p-1 h-8 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold">Date</label>
                            <Input
                              type="date"
                              value={supplierPurchaseNoteData.date}
                              onChange={(e) => handleSupplierPurchaseNoteChange('date', e.target.value)}
                              className="p-1 h-8 text-sm"
                            />
                          </div>
                        </div>

                        {/* Business and Supplier Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="border border-indigo-200 rounded-lg p-4 bg-indigo-50/30">
                            <h3 className="font-bold text-amber-900 mb-2">FROM (Supplier)</h3>
                            <Input placeholder="Supplier Name" value={supplierPurchaseNoteData.supplierName} onChange={(e) => handleSupplierPurchaseNoteChange('supplierName', e.target.value)} className="mb-2 p-1 h-8 text-sm" />
                            <Input placeholder="Supplier Address" value={supplierPurchaseNoteData.supplierAddress} onChange={(e) => handleSupplierPurchaseNoteChange('supplierAddress', e.target.value)} className="mb-2 p-1 h-8 text-sm" />
                            <div className="grid grid-cols-2 gap-2">
                              <Input placeholder="Phone" value={supplierPurchaseNoteData.supplierPhone} onChange={(e) => handleSupplierPurchaseNoteChange('supplierPhone', e.target.value)} className="p-1 h-8 text-sm" />
                              <Input placeholder="Email" value={supplierPurchaseNoteData.supplierEmail} onChange={(e) => handleSupplierPurchaseNoteChange('supplierEmail', e.target.value)} className="p-1 h-8 text-sm" />
                            </div>
                          </div>
                          <div className="border border-indigo-200 rounded-lg p-4 bg-indigo-50/30">
                            <h3 className="font-bold text-indigo-900 mb-2">TO (Business)</h3>
                            <Input placeholder="Business Name" value={supplierPurchaseNoteData.businessName} onChange={(e) => handleSupplierPurchaseNoteChange('businessName', e.target.value)} className="mb-2 p-1 h-8 text-sm" />
                            <Input placeholder="Business Address" value={supplierPurchaseNoteData.businessAddress} onChange={(e) => handleSupplierPurchaseNoteChange('businessAddress', e.target.value)} className="mb-2 p-1 h-8 text-sm" />
                            <div className="grid grid-cols-2 gap-2">
                              <Input placeholder="Phone" value={supplierPurchaseNoteData.businessPhone} onChange={(e) => handleSupplierPurchaseNoteChange('businessPhone', e.target.value)} className="p-1 h-8 text-sm" />
                              <Input placeholder="Email" value={supplierPurchaseNoteData.businessEmail} onChange={(e) => handleSupplierPurchaseNoteChange('businessEmail', e.target.value)} className="p-1 h-8 text-sm" />
                            </div>
                          </div>
                        </div>

                        {/* Items Table */}
                        <div>
                          <h3 className="font-bold mb-2">ITEMS PURCHASED</h3>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse">
                              <thead>
                                <tr className="border-b-2 border-indigo-300 bg-indigo-50">
                                  <th className="text-left p-2">Description</th>
                                  <th className="text-center p-2 w-20">Qty</th>
                                  <th className="text-left p-2 w-20">Unit</th>
                                  <th className="text-right p-2 w-28">Unit Price</th>
                                  <th className="text-right p-2 w-28">Total</th>
                                  <th className="p-2 w-10"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {supplierPurchaseNoteData.items.map((item) => (
                                  <tr key={item.id} className="border-b">
                                    <td className="p-2">
                                      <Input value={item.description || ''} onChange={(e) => handleSupplierPurchaseItemChange(item.id, 'description', e.target.value)} className="p-1 h-8 text-sm" placeholder="Item description" />
                                    </td>
                                    <td className="p-2">
                                      <Input type="number" value={item.quantity || 0} onChange={(e) => handleSupplierPurchaseItemChange(item.id, 'quantity', parseInt(e.target.value) || 0)} className="p-1 h-8 text-sm text-center" />
                                    </td>
                                    <td className="p-2">
                                      <Input value={item.unit || ''} onChange={(e) => handleSupplierPurchaseItemChange(item.id, 'unit', e.target.value)} className="p-1 h-8 text-sm" placeholder="Unit" />
                                    </td>
                                    <td className="p-2">
                                      <Input type="number" step="0.01" value={item.unitPrice || 0} onChange={(e) => handleSupplierPurchaseItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)} className="p-1 h-8 text-sm text-right" />
                                    </td>
                                    <td className="p-2 text-right font-medium">{formatCurrency(item.total || 0)}</td>
                                    <td className="p-2">
                                      <Button onClick={() => handleRemoveSupplierPurchaseItem(item.id)} variant="outline" size="sm" className="p-1 h-8"><Trash2 className="h-4 w-4" /></Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="border-t-2 border-indigo-300">
                                  <td colSpan={4} className="p-2 text-right font-bold">Subtotal:</td>
                                  <td className="p-2 text-right font-bold">{formatCurrency(supplierPurchaseNoteData.items.reduce((sum, item) => sum + (item.total || 0), 0))}</td>
                                  <td></td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                          <Button onClick={handleAddSupplierPurchaseItem} variant="outline" size="sm" className="mt-2">
                            <Plus className="h-4 w-4 mr-1" /> Add Item
                          </Button>
                        </div>

                        {/* Discount, Total */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-bold">Discount</label>
                            <Input type="number" step="0.01" value={supplierPurchaseNoteData.discount} onChange={(e) => handleSupplierPurchaseNoteChange('discount', parseFloat(e.target.value) || 0)} className="p-1 h-8 text-sm" />
                          </div>
                          <div>
                            <label className="text-xs font-bold">Total</label>
                            <div className="p-1 h-8 text-sm font-bold flex items-center bg-indigo-50 rounded px-2">
                              {formatCurrency((supplierPurchaseNoteData.items.reduce((sum, item) => sum + (item.total || 0), 0)) - (supplierPurchaseNoteData.discount || 0))}
                            </div>
                          </div>
                        </div>

                        {/* Notes */}
                        <div>
                          <label className="text-xs font-bold">Notes</label>
                          <textarea
                            value={supplierPurchaseNoteData.notes}
                            onChange={(e) => handleSupplierPurchaseNoteChange('notes', e.target.value)}
                            className="w-full p-2 border rounded text-sm h-20"
                            placeholder="Additional notes..."
                          />
                        </div>

                        {/* Prepared By */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-bold">Prepared By</label>
                            <Input value={supplierPurchaseNoteData.preparedBy} onChange={(e) => handleSupplierPurchaseNoteChange('preparedBy', e.target.value)} className="p-1 h-8 text-sm" />
                          </div>
                          <div>
                            <label className="text-xs font-bold">Date</label>
                            <Input type="date" value={supplierPurchaseNoteData.preparedDate} onChange={(e) => handleSupplierPurchaseNoteChange('preparedDate', e.target.value)} className="p-1 h-8 text-sm" />
                          </div>
                        </div>

                        {/* Save and Print Buttons */}
                        <div className="flex justify-end gap-2">
                          <Button 
                            onClick={() => {
                              const printWindow = window.open('', '_blank');
                              if (printWindow) {
                                const htmlContent = generateSupplierPurchaseNoteHTML();
                                printWindow.document.write(htmlContent);
                                printWindow.document.close();
                              }
                            }}
                            variant="outline"
                          >
                            <Printer className="h-4 w-4 mr-2" /> Print
                          </Button>
                          <Button onClick={handleSaveSupplierPurchaseNote} className="bg-indigo-600 hover:bg-indigo-700">
                            <Save className="h-4 w-4 mr-2" /> Save Purchase Note
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // Delivery Note Content
                      <div className="space-y-6">
                        {/* Business Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h3 className="font-bold text-lg">
                              <Input 
                                value={deliveryNoteData.businessName}
                                onChange={(e) => handleDeliveryNoteChange("businessName", e.target.value)}
                                className="w-full h-8 p-1 text-lg font-bold"
                              />
                            </h3>
                            <div className="mt-2">
                              <Textarea 
                                value={deliveryNoteData.businessAddress}
                                onChange={(e) => handleDeliveryNoteChange("businessAddress", e.target.value)}
                                className="w-full h-16 p-1 text-sm resize-none"
                                placeholder="Business Address"
                              />
                            </div>
                            <div className="flex items-center gap-2 text-sm mt-1">
                              <span>Phone:</span>
                              <Input 
                                value={deliveryNoteData.businessPhone}
                                onChange={(e) => handleDeliveryNoteChange("businessPhone", e.target.value)}
                                className="w-auto h-6 p-1 text-sm"
                              />
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <span>Email:</span>
                              <Input 
                                value={deliveryNoteData.businessEmail}
                                onChange={(e) => handleDeliveryNoteChange("businessEmail", e.target.value)}
                                className="w-auto h-6 p-1 text-sm"
                              />
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-bold mb-2">TO: <span className="text-red-500">*</span></h4>
                            <div className="relative command-autocomplete">
                              <Command className="rounded-lg border shadow-sm">
                                <div className="flex items-center border-b px-3">
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="mr-2 h-4 w-4 shrink-0 opacity-50"
                                  >
                                    <circle cx="11" cy="11" r="8" />
                                    <path d="m21 21-4.3-4.3" />
                                  </svg>
                                  <CommandInput
                                    placeholder="Search outlet by name, location, or phone..."
                                    value={deliveryNoteData.customerName}
                                    onValueChange={(value) => {
                                      handleDeliveryNoteChange("customerName", value);
                                      filterOutlets(value);
                                    }}
                                    onFocus={() => {
                                      // When focusing, show all outlets to allow selection
                                      setFilteredOutlets(outlets);
                                      setShowOutletDropdown(outlets.length > 0);
                                    }}
                                    onBlur={() => {
                                      // Dropdown will be closed by click outside handler
                                    }}
                                    className="flex-1 h-10 placeholder:text-muted-foreground focus-visible:outline-none"
                                  />
                                  {deliveryNoteData.customerName && (
                                    <button
                                      onClick={() => {
                                        handleDeliveryNoteChange("customerName", "");
                                        handleDeliveryNoteChange("customerAddress1", "");
                                        handleDeliveryNoteChange("customerPhone", "");
                                        handleDeliveryNoteChange("customerEmail", "");
                                        setFilteredOutlets([]);
                                      }}
                                      className="ml-2 hover:bg-gray-100 p-1 rounded"
                                    >
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="24"
                                        height="24"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="h-4 w-4"
                                      >
                                        <path d="M18 6 6 18" />
                                        <path d="m6 6 12 12" />
                                      </svg>
                                    </button>
                                  )}
                                </div>
                                {showOutletDropdown && (
                                  <CommandList className="max-h-64 overflow-auto">
                                    {loadingOutlets ? (
                                      <div className="p-4 text-center text-sm text-muted-foreground">
                                        Loading outlets...
                                      </div>
                                    ) : filteredOutlets.length > 0 ? (
                                      <CommandGroup>
                                        {filteredOutlets.map((outlet) => (
                                          <CommandItem
                                            key={outlet.id}
                                            onSelect={() => handleOutletSelect(outlet)}
                                            className="cursor-pointer py-3 px-4 hover:bg-gray-50 border-b last:border-b-0"
                                          >
                                            <div className="flex flex-col gap-1 w-full">
                                              <div className="flex items-center gap-2">
                                                <svg
                                                  xmlns="http://www.w3.org/2000/svg"
                                                  width="24"
                                                  height="24"
                                                  viewBox="0 0 24 24"
                                                  fill="none"
                                                  stroke="currentColor"
                                                  strokeWidth="2"
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                  className="h-4 w-4 text-primary"
                                                >
                                                  <path d="M15 21v-8a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v8" />
                                                  <path d="M9 11V6a3 3 0 0 1 3-3 3 3 0 0 1 3 3v5" />
                                                  <path d="M4 21h16" />
                                                  <path d="M4 11h16" />
                                                </svg>
                                                <span className="font-semibold text-sm">{outlet.name}</span>
                                              </div>
                                              <div className="flex items-center gap-4 text-xs text-muted-foreground ml-6">
                                                {outlet.location && (
                                                  <div className="flex items-center gap-1">
                                                    <svg
                                                      xmlns="http://www.w3.org/2000/svg"
                                                      width="24"
                                                      height="24"
                                                      viewBox="0 0 24 24"
                                                      fill="none"
                                                      stroke="currentColor"
                                                      strokeWidth="2"
                                                      strokeLinecap="round"
                                                      strokeLinejoin="round"
                                                      className="h-3 w-3"
                                                    >
                                                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                                                      <circle cx="12" cy="10" r="3" />
                                                    </svg>
                                                    <span>{outlet.location}</span>
                                                  </div>
                                                )}
                                                {outlet.phone && (
                                                  <div className="flex items-center gap-1">
                                                    <svg
                                                      xmlns="http://www.w3.org/2000/svg"
                                                      width="24"
                                                      height="24"
                                                      viewBox="0 0 24 24"
                                                      fill="none"
                                                      stroke="currentColor"
                                                      strokeWidth="2"
                                                      strokeLinecap="round"
                                                      strokeLinejoin="round"
                                                      className="h-3 w-3"
                                                    >
                                                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                                    </svg>
                                                    <span>{outlet.phone}</span>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    ) : (
                                      <div className="p-4 text-center text-sm text-muted-foreground">
                                        No outlets found.
                                      </div>
                                    )}
                                  </CommandList>
                                )}
                              </Command>
                            </div>
                            <Input 
                              value={deliveryNoteData.customerAddress1}
                              onChange={(e) => handleDeliveryNoteChange("customerAddress1", e.target.value)}
                              className="w-full h-6 p-1 text-sm mb-1"
                            />
                            <Input 
                              value={deliveryNoteData.customerAddress2}
                              onChange={(e) => handleDeliveryNoteChange("customerAddress2", e.target.value)}
                              className="w-full h-6 p-1 text-sm mb-1"
                            />
                            <div className="flex items-center gap-2 text-sm mt-1">
                              <span>Phone:</span>
                              <Input 
                                value={deliveryNoteData.customerPhone}
                                onChange={(e) => handleDeliveryNoteChange("customerPhone", e.target.value)}
                                className="w-auto h-6 p-1 text-sm"
                              />
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <span>Email:</span>
                              <Input 
                                value={deliveryNoteData.customerEmail}
                                onChange={(e) => handleDeliveryNoteChange("customerEmail", e.target.value)}
                                className="w-auto h-6 p-1 text-sm"
                              />
                            </div>
                          </div>
                        </div>
                        
                        {/* Document Details */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <div className="text-sm font-medium">Delivery Note #:</div>
                            <div className="text-sm">{deliveryNoteData.deliveryNoteNumber}</div>
                          </div>
                          <div>
                            <div className="text-sm font-medium">Date:</div>
                            <div className="text-sm">{deliveryNoteData.date}</div>
                          </div>
                          <div>
                            <div className="text-sm font-medium mb-1">Delivery Date:</div>
                            <div className="relative">
                              <Input
                                type="date"
                                value={deliveryNoteData.deliveryDate || ""}
                                onChange={(e) => handleDeliveryNoteChange("deliveryDate", e.target.value)}
                                className="text-sm p-1 h-9 pr-10"
                              />
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
                              >
                                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                                <line x1="16" x2="16" y1="2" y2="6" />
                                <line x1="8" x2="8" y1="2" y2="6" />
                                <line x1="3" x2="21" y1="10" y2="10" />
                              </svg>
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-medium">Vehicle #:</div>
                            <Input
                              value={deliveryNoteData.vehicle || ""}
                              onChange={(e) => handleDeliveryNoteChange("vehicle", e.target.value)}
                              className="text-sm p-1 h-6"
                            />
                          </div>
                          <div>
                            <div className="text-sm font-medium">Driver:</div>
                            <Input
                              value={deliveryNoteData.driver || ""}
                              onChange={(e) => handleDeliveryNoteChange("driver", e.target.value)}
                              className="text-sm p-1 h-6"
                            />
                          </div>
                          
                          <div>
                            <div className="text-sm font-medium">Generated:</div>
                            <div className="text-sm">{new Date().toLocaleString()}</div>
                          </div>
                        </div>
                        
                        {/* Items Table */}
                        <div>
                          <h4 className="font-bold mb-2">ITEMS DELIVERED:</h4>
                          <div className="overflow-x-auto relative">
                            <table className="w-full border-collapse border border-gray-300 text-sm">
                              <thead>
                                <tr className="bg-gray-100">
                                  <th className="border border-gray-300 p-2 text-left">Item Description</th>
                                  <th className="border border-gray-300 p-2 text-left">Godown</th>
                                  <th className="border border-gray-300 p-2 text-left">Zone</th>
                                  <th className="border border-gray-300 p-2 text-left">Quantity</th>
                                  <th className="border border-gray-300 p-2 text-left">Unit</th>
                                  <th className="border border-gray-300 p-2 text-left">Rate</th>
                                  <th className="border border-gray-300 p-2 text-left">Amount</th>
                                  <th className="border border-gray-300 p-2 text-left">Delivered</th>
                                  <th className="border border-gray-300 p-2 text-left">Remarks</th>
                                  <th className="border border-gray-300 p-2 text-left">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {deliveryNoteData.items.map((item) => (
                                  <tr key={item.id}>
                                    <td className="border border-gray-300 p-2 relative">
                                      <div className="relative">
                                        <Input
                                          value={item.description}
                                          onChange={(e) => {
                                            handleItemChange(item.id, 'description', e.target.value);
                                          }}
                                          onFocus={async (e) => {
                                            // Load product items map when the input is focused
                                            const itemsMap = await getAllProductItems();
                                            setDeliveryNoteProductItemsMap(itemsMap);
                                            setDeliveryNoteProductDescriptions(Array.from(itemsMap.keys()));
                                            setShowDeliveryNoteDropdown(true);
                                          }}
                                          onBlur={() => {
                                            // Delay hiding the dropdown to allow click events to register
                                            setTimeout(() => setShowDeliveryNoteDropdown(false), 150);
                                          }}
                                          className="p-1 h-8 text-sm w-full"
                                          placeholder="Select or enter description..."
                                        />
                                        {deliveryNoteProductDescriptions.length > 0 && showDeliveryNoteDropdown && (
                                          <div 
                                            id={`delivery-note-dropdown-${item.id}`}
                                            className="bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
                                          >
                                            {deliveryNoteProductDescriptions
                                              .filter(desc => 
                                                item.description === "" || desc.toLowerCase().includes(item.description.toLowerCase())
                                              )
                                              .map((desc, idx) => {
                                                const productData = deliveryNoteProductItemsMap.get(desc);
                                                const stockQty = productData?.stockQuantity ?? 0;
                                                const stockColor = stockQty === 0 ? 'text-red-600' : stockQty <= 10 ? 'text-yellow-600' : 'text-green-600';
                                                
                                                return (
                                                <div
                                                  key={idx}
                                                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm flex justify-between items-center"
                                                  onMouseDown={() => {
                                                    handleItemChange(item.id, 'description', desc);
                                                    // Set the rate and unit from the product inventory if available
                                                    const itemDataFromProduct = deliveryNoteProductItemsMap.get(desc);
                                                    if (itemDataFromProduct) {
                                                      handleItemChange(item.id, 'rate', itemDataFromProduct.rate);
                                                      handleItemChange(item.id, 'unit', itemDataFromProduct.unit);
                                                    }
                                                    // Load godown stock for this product to filter Source Godown dropdown
                                                    loadGodownStockForProduct(desc);
                                                    setShowDeliveryNoteDropdown(false);
                                                  }}
                                                >
                                                  <span className="flex-1">{desc}</span>
                                                  <span className={`ml-2 font-semibold ${stockColor}`}>
                                                    Stock: {stockQty}
                                                  </span>
                                                </div>
                                                );
                                              })
                                            }
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                      <Select
                                        value={item.godownId || ''}
                                        onValueChange={(val) => {
                                          const godown = godowns.find(g => g.id === val);
                                          handleItemChange(item.id, 'godownId', val);
                                          handleItemChange(item.id, 'godownName', godown?.name || '');
                                          // Reset zone when godown changes
                                          handleItemChange(item.id, 'zoneId', '');
                                          handleItemChange(item.id, 'zoneName', '');
                                        }}
                                        disabled={!item.description}
                                      >
                                        <SelectTrigger className="h-8 text-xs w-[140px]">
                                          <SelectValue placeholder="Select godown" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {getItemGodowns(item.description).map(g => (
                                            <SelectItem key={g.godownId} value={g.godownId}>
                                              {g.godownName} (Qty: {g.quantity})
                                            </SelectItem>
                                          ))}
                                          {item.description && getItemGodowns(item.description).length === 0 && (
                                            <SelectItem value="__none__" disabled>No stock available</SelectItem>
                                          )}
                                        </SelectContent>
                                      </Select>
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                      <Select
                                        value={item.zoneId || ''}
                                        onValueChange={(val) => {
                                          const zoneVal = val === '__no_zone__' ? '' : val;
                                          const zone = deliveryZones.find(z => z.id === val);
                                          handleItemChange(item.id, 'zoneId', zoneVal);
                                          handleItemChange(item.id, 'zoneName', val === '__no_zone__' ? 'No Zone' : (zone?.zone_name || ''));
                                        }}
                                        disabled={!item.godownId}
                                      >
                                        <SelectTrigger className="h-8 text-xs w-[160px]">
                                          <SelectValue placeholder="Select zone" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {item.godownId && getItemZones(item.description, item.godownId).map(z => (
                                            <SelectItem key={z.zoneId} value={z.zoneId}>
                                              {z.zoneName} (Qty: {z.quantity})
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                      <Input
                                        type="number"
                                        value={item.quantity}
                                        onChange={async (e) => await handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                        className={`p-1 h-8 text-sm w-full ${
                                          item.description && deliveryNoteProductItemsMap.has(item.description) && 
                                          item.quantity > (deliveryNoteProductItemsMap.get(item.description)?.stockQuantity ?? 0)
                                            ? 'border-red-500 bg-red-50'
                                            : ''
                                        }`}
                                      />
                                      {item.description && deliveryNoteProductItemsMap.has(item.description) && 
                                       item.quantity > (deliveryNoteProductItemsMap.get(item.description)?.stockQuantity ?? 0) && (
                                        <div className="text-xs text-red-600 mt-1 font-semibold">
                                          ⚠️ Exceeds stock ({deliveryNoteProductItemsMap.get(item.description)?.stockQuantity ?? 0} available)
                                        </div>
                                      )}
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                      <Input
                                        value={item.unit}
                                        onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)}
                                        className="p-1 h-8 text-sm w-full"
                                      />
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                      <Input
                                        type="number"
                                        step="0.01"
                                        value={item.rate}
                                        onChange={(e) => {
                                          const newRate = parseFloat(e.target.value) || 0;
                                          handleItemChange(item.id, 'rate', newRate);
                                        }}
                                        className="p-1 h-8 text-sm w-full"
                                      />
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                      <Input
                                        type="number"
                                        step="0.01"
                                        value={item.amount}
                                        onChange={(e) => handleItemChange(item.id, 'amount', parseFloat(e.target.value) || 0)}
                                        className="p-1 h-8 text-sm w-full"
                                      />
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                      <Input
                                        type="number"
                                        value={item.delivered}
                                        onChange={(e) => handleItemChange(item.id, 'delivered', parseFloat(e.target.value) || 0)}
                                        className="p-1 h-8 text-sm w-full"
                                      />
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                      <Input
                                        value={item.remarks}
                                        onChange={(e) => handleItemChange(item.id, 'remarks', e.target.value)}
                                        className="p-1 h-8 text-sm w-full"
                                      />
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                      <Button
                                        onClick={() => handleRemoveItem(item.id)}
                                        variant="outline"
                                        size="sm"
                                        className="p-1 h-8">
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                        <Button 
                          onClick={handleAddItem}
                          variant="outline"
                          size="sm"
                          className="mt-2">
                          <Plus className="h-4 w-4 mr-1" />
                          Add Item
                        </Button>
                        
                        {/* Financial Summary */}
                        <div className="grid grid-cols-1 gap-2 max-w-xs ml-auto">
                          <div className="flex justify-between text-sm">
                            <span className="font-bold">Total:</span>
                            <span>{formatCurrency(calculateDeliveryNoteTotals().total)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="font-bold">Amount Paid:</span>
                            <Input
                              type="number"
                              step="0.01"
                              value={deliveryNoteData.amountPaid}
                              onChange={(e) => handleDeliveryNoteChange('amountPaid', parseFloat(e.target.value) || 0)}
                              className="w-24 inline-block p-1 h-8 text-right"
                            />
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="font-bold">Credit Brought Forward from previous:</span>
                            <Input
                              type="number"
                              step="0.01"
                              value={deliveryNoteData.creditBroughtForward}
                              onChange={(e) => handleDeliveryNoteChange('creditBroughtForward', parseFloat(e.target.value) || 0)}
                              className="w-24 inline-block p-1 h-8 text-right"
                            />
                          </div>
                          <div className="flex justify-between text-sm pt-2 border-t border-gray-300">
                            <span className="font-bold">AMOUNT DUE:</span>
                            <span className="font-bold text-red-600">{formatCurrency(calculateDeliveryNoteTotals().amountDue)}</span>
                          </div>
                        </div>
                        
                        {/* Document Notes */}
                        <div>
                          <h4 className="font-bold mb-2">DELIVERY NOTES:</h4>
                          <Textarea
                            value={deliveryNoteData.deliveryNotes}
                            onChange={(e) => handleDeliveryNoteChange("deliveryNotes", e.target.value)}
                            className="min-h-[80px] text-sm"
                          />
                        </div>
                        
                        {/* Totals */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="text-sm">
                            <span className="font-bold">Total Items:</span> {totals.totalItems}
                          </div>
                          <div className="text-sm">
                            <span className="font-bold">Total Quantity:</span> {totals.totalQuantity} units
                          </div>
                          <div className="text-sm">
                            <span className="font-bold">Total Packages:</span> {totals.totalPackages}
                          </div>
                        </div>
                        
                        {/* Signatures */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                          <div>
                            <h4 className="font-bold mb-2">Prepared By <span className="text-red-500">*</span></h4>
                            <div className="text-sm space-y-2">
                              <div>
                                <span>Name:</span>
                                <Input 
                                  value={deliveryNoteData.preparedByName}
                                  onChange={(e) => handleDeliveryNoteChange("preparedByName", e.target.value)}
                                  className="w-full h-6 p-1 text-sm mt-1"
                                />
                              </div>
                              <div>
                                <span>Date:</span>
                                <div className="relative mt-1">
                                  <Input 
                                    type="date"
                                    value={deliveryNoteData.preparedByDate}
                                    onChange={(e) => handleDeliveryNoteChange("preparedByDate", e.target.value)}
                                    className="w-full h-8 p-1 text-sm pr-8"
                                  />
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none"
                                  >
                                    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                                    <line x1="16" x2="16" y1="2" y2="6" />
                                    <line x1="8" x2="8" y1="2" y2="6" />
                                    <line x1="3" x2="21" y1="10" y2="10" />
                                  </svg>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-bold mb-2">Driver Signature</h4>
                            <div className="text-sm space-y-2">
                              <div>
                                <span>Name:</span>
                                <Input 
                                  value={deliveryNoteData.driverName}
                                  onChange={(e) => handleDeliveryNoteChange("driverName", e.target.value)}
                                  className="w-full h-6 p-1 text-sm mt-1"
                                />
                              </div>
                              <div>
                                <span>Date:</span>
                                <div className="relative mt-1">
                                  <Input 
                                    type="date"
                                    value={deliveryNoteData.driverDate}
                                    onChange={(e) => handleDeliveryNoteChange("driverDate", e.target.value)}
                                    className="w-full h-8 p-1 text-sm pr-8"
                                  />
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none"
                                  >
                                    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                                    <line x1="16" x2="16" y1="2" y2="6" />
                                    <line x1="8" x2="8" y1="2" y2="6" />
                                    <line x1="3" x2="21" y1="10" y2="10" />
                                  </svg>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-bold mb-2">Received By</h4>
                            <div className="text-sm space-y-2">
                              <div>
                                <span>Name:</span>
                                <Input 
                                  value={deliveryNoteData.receivedByName}
                                  onChange={(e) => handleDeliveryNoteChange("receivedByName", e.target.value)}
                                  className="w-full h-6 p-1 text-sm mt-1"
                                />
                              </div>
                              <div>
                                <span>Date:</span>
                                <div className="relative mt-1">
                                  <Input 
                                    type="date"
                                    value={deliveryNoteData.receivedByDate}
                                    onChange={(e) => handleDeliveryNoteChange("receivedByDate", e.target.value)}
                                    className="w-full h-8 p-1 text-sm pr-8"
                                  />
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none"
                                  >
                                    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                                    <line x1="16" x2="16" y1="2" y2="6" />
                                    <line x1="8" x2="8" y1="2" y2="6" />
                                    <line x1="3" x2="21" y1="10" y2="10" />
                                  </svg>
                                </div>
                              </div>
                              <div className="text-xs mt-2">(Signature Required)</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">
                    {viewingTemplate 
                      ? `Viewing Template #${viewingTemplate}`
                      : selectedTemplate 
                        ? `Editing Template #${selectedTemplate}`
                        : "Create New Template"}
                  </h3>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handlePrintPreview(currentTemplate?.id || '')}>
                      <Printer className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                    {!viewingTemplate && (
                      <Button onClick={handleSaveTemplate}>
                        <Save className="h-4 w-4 mr-2" />
                        Save Template
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="border rounded-lg p-6">
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label htmlFor="templateName" className="text-sm font-medium">Template Name</label>
                        <input 
                          id="templateName" 
                          defaultValue={currentTemplate?.name || ''}
                          disabled={!!viewingTemplate}
                          className="w-full p-2 border rounded-md"
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="templateType" className="text-sm font-medium">Template Type</label>
                        <select
                          id="templateType"
                          defaultValue={currentTemplate?.type || 'receipt'}
                          disabled={!!viewingTemplate}
                          className="w-full p-2 border rounded-md"
                        >
                          <option value="delivery-note">Delivery Note</option>
                          <option value="order-form">Order Form</option>
                          <option value="contract">Contract</option>
                          <option value="invoice">Invoice</option>
                          <option value="receipt">Receipt</option>
                          <option value="notice">Notice</option>
                          <option value="quotation">Quotation</option>
                          <option value="report">Report</option>
                          <option value="salary-slip">Salary Slip</option>
                          <option value="complimentary-goods">Complimentary Goods</option>
                          <option value="expense-voucher">Expense Voucher</option>
                          <option value="customer-settlement">Customer Settlement</option>
                          <option value="supplier-settlement">Supplier Settlement</option>
                          <option value="sales-order">Sales Order</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="templateDescription" className="text-sm font-medium">Description</label>
                      <textarea 
                        id="templateDescription" 
                        defaultValue={currentTemplate?.description || ''}
                        disabled={!!viewingTemplate}
                        className="w-full p-2 border rounded-md"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Template Content</label>
                      <textarea 
                        rows={15}
                        placeholder="Template content with placeholders..."
                        defaultValue={currentTemplate?.content || ''}
                        disabled={!!viewingTemplate}
                        className="w-full p-2 border rounded-md"
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        id="isActive" 
                        defaultChecked={currentTemplate?.isActive || false}
                        disabled={!!viewingTemplate}
                      />
                      <label htmlFor="isActive" className="text-sm">Set as Active Template</label>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setActiveTab("manage");
                      setViewingTemplate(null);
                      setSelectedTemplate(null);
                    }}
                  >
                    Back to Templates
                  </Button>
                  {!viewingTemplate && (
                    <Button onClick={handleSaveTemplate}>
                      <Save className="h-4 w-4 mr-2" />
                      Save Template
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>        
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileImport}
          accept=".json"
          className="hidden" 
        />
      </main>
      
      {/* Invoice Options Dialog */}
      {showInvoiceOptions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold mb-4">Invoice Options</h3>
            <p className="mb-4">Choose an action for your invoice:</p>
            
            <div className="space-y-2">
              <Button 
                onClick={handlePrintInvoice}
                className="w-full flex items-center justify-start"
                variant="outline"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Invoice
              </Button>
              
              <Button 
                onClick={handleDownloadInvoice}
                className="w-full flex items-center justify-start"
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Invoice
              </Button>
              
              <Button 
                onClick={handleShareInvoice}
                className="w-full flex items-center justify-start"
                variant="outline"
              >
                <Share className="h-4 w-4 mr-2" />
                Share Invoice
              </Button>
              
              <Button 
                onClick={handleExportInvoice}
                className="w-full flex items-center justify-start"
                variant="outline"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Export as Excel
              </Button>
              
              <Button 
                onClick={handleSaveInvoice}
                className="w-full flex items-center justify-start"
                variant="outline"
              >
                <Save className="h-4 w-4 mr-2" />
                Save to Saved Invoices
              </Button>
            </div>
            
            <div className="mt-4 flex justify-end">
              <Button 
                onClick={closeInvoiceOptionsDialog}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Share Options Dialog */}
      {showShareOptions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold mb-4">Share Invoice</h3>
            <p className="mb-4">Choose how you want to share your invoice:</p>
            
            <div className="space-y-2">
              <Button 
                onClick={handleWhatsAppShare}
                className="w-full flex items-center justify-start"
                variant="outline"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Share via WhatsApp
              </Button>
              
              <Button 
                onClick={handleEmailShare}
                className="w-full flex items-center justify-start"
                variant="outline"
              >
                <Mail className="h-4 w-4 mr-2" />
                Share via Email
              </Button>
              
              <Button 
                onClick={handleCopyToClipboard}
                className="w-full flex items-center justify-start"
                variant="outline"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy to Clipboard
              </Button>
            </div>
            
            <div className="mt-4 flex justify-end">
              <Button 
                onClick={closeShareOptionsDialog}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Download Options Dialog */}
      {showDownloadOptions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold mb-4">Download Invoice</h3>
            <p className="mb-4">Choose format to download your invoice:</p>
            
            <div className="space-y-2">
              <Button 
                onClick={handleDownloadAsPDF}
                className="w-full flex items-center justify-start"
                variant="outline"
              >
                <FileText className="h-4 w-4 mr-2" />
                Download as PDF
              </Button>
              
              <Button 
                onClick={handleDownloadAsExcel}
                className="w-full flex items-center justify-start"
                variant="outline"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Download as Excel
              </Button>
              
              <Button 
                onClick={handleDownloadAsCSV}
                className="w-full flex items-center justify-start"
                variant="outline"
              >
                <FileText className="h-4 w-4 mr-2" />
                Download as CSV
              </Button>
            </div>
            
            <div className="mt-4 flex justify-end">
              <Button 
                onClick={closeDownloadOptionsDialog}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Delivery Note Options Dialog */}
      {showDeliveryNoteOptions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold mb-4">Delivery Note Options</h3>
            <p className="mb-4">Choose an action for your delivery note:</p>
            
            <div className="space-y-2">
              <Button 
                onClick={() => {
                  // Print functionality for delivery note
                  // Create a print-friendly version of the delivery note
                  const deliveryNoteContent = generateDeliveryNoteHTML();
                  
                  // Create a temporary iframe for printing
                  const printFrame = document.createElement('iframe');
                  printFrame.style.position = 'absolute';
                  printFrame.style.top = '-1000px';
                  printFrame.style.left = '-1000px';
                  document.body.appendChild(printFrame);
                  
                  const printDocument = printFrame.contentDocument || printFrame.contentWindow?.document;
                  if (printDocument) {
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
                        // Clean up after printing
                        setTimeout(() => {
                          if (printFrame.parentNode) {
                            printFrame.parentNode.removeChild(printFrame);
                          }
                          // Auto-refresh after printing - reset all fields and increment number
                          resetAndIncrementDeliveryNote();
                        }, 1000);
                      }
                    };
                  }
                  closeDeliveryNoteOptionsDialog();
                }}
                className="w-full flex items-center justify-start"
                variant="outline"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Delivery Note
              </Button>
              
              <Button 
                onClick={() => {
                  // Download functionality for delivery note
                  // Generate the delivery note as a PDF
                  import('html2pdf.js').then((html2pdfModule) => {
                    const deliveryNoteContent = generateDeliveryNoteHTML();
                    
                    // Create a temporary container to hold the delivery note content
                    const tempContainer = document.createElement('div');
                    tempContainer.innerHTML = deliveryNoteContent;
                    tempContainer.style.position = 'absolute';
                    tempContainer.style.left = '-9999px';
                    document.body.appendChild(tempContainer);
                    
                    // Configure PDF options
                    const opt = {
                      margin: 5,
                      filename: `Delivery_Note_${deliveryNoteData.deliveryNoteNumber}.pdf`,
                      image: { type: 'jpeg' as const, quality: 0.98 },
                      html2canvas: { scale: 2, useCORS: true },
                      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
                    };
                    
                    // Generate PDF
                    html2pdfModule.default(tempContainer, opt).then(() => {
                      // Remove temporary container after PDF generation
                      setTimeout(() => {
                        document.body.removeChild(tempContainer);
                        // Auto-refresh after downloading - reset all fields and increment number
                        resetAndIncrementDeliveryNote();
                      }, 1000);
                    });
                  });
                  closeDeliveryNoteOptionsDialog();
                }}
                className="w-full flex items-center justify-start"
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Delivery Note
              </Button>
              
              <Button 
                onClick={() => {
                  // Share functionality for delivery note
                  // Create a shareable link for the delivery note
                  try {
                    // Generate a shareable URL for the delivery note
                    const shareData = {
                      title: `Delivery Note ${deliveryNoteData.deliveryNoteNumber}`,
                      text: `Delivery Note #${deliveryNoteData.deliveryNoteNumber} for customer ${deliveryNoteData.customerName}`,
                      url: window.location.href // In a real app, this would be a specific delivery note URL
                    };
                    
                    // Use the Web Share API if available
                    if (navigator.share) {
                      navigator.share(shareData)
                        .then(() => console.log('Shared successfully'))
                        .catch((error) => {
                          console.log('Sharing failed:', error);
                          // Fallback to copying to clipboard
                          try {
                            // Try to copy the URL to clipboard
                            navigator.clipboard.writeText(shareData.url || window.location.href)
                              .then(() => {
                                alert('Delivery note link copied to clipboard! You can now share it with others.');
                              })
                              .catch(err => {
                                console.error('Failed to copy: ', err);
                                // If clipboard fails, show the URL to the user
                                const url = prompt('Copy this link to share the delivery note:', shareData.url || window.location.href);
                              });
                          } catch (err) {
                            console.error('Fallback sharing failed: ', err);
                            alert('Could not share the delivery note. Please copy the URL manually.');
                          }
                        });
                    } else {
                      // Fallback to copying to clipboard
                      try {
                        // Try to copy the URL to clipboard
                        navigator.clipboard.writeText(shareData.url || window.location.href)
                          .then(() => {
                            alert('Delivery note link copied to clipboard! You can now share it with others.');
                          })
                          .catch(err => {
                            console.error('Failed to copy: ', err);
                            // If clipboard fails, show the URL to the user
                            const url = prompt('Copy this link to share the delivery note:', shareData.url || window.location.href);
                          });
                      } catch (err) {
                        console.error('Fallback sharing failed: ', err);
                        alert('Could not share the delivery note. Please copy the URL manually.');
                      }
                    }
                  } catch (error) {
                    console.error('Error sharing delivery note:', error);
                    alert('Error sharing delivery note. Please try again.');
                  }
                  closeDeliveryNoteOptionsDialog();
                  // Auto-refresh after sharing - reset all fields and increment number
                  setTimeout(() => {
                    resetAndIncrementDeliveryNote();
                  }, 300);
                }}
                className="w-full flex items-center justify-start"
                variant="outline"
              >
                <Share className="h-4 w-4 mr-2" />
                Share Delivery Note
              </Button>
              
              <Button 
                onClick={() => {
                  // Export functionality for delivery note
                  // Allow user to export in different formats
                  const exportOptions = [
                    { name: 'PDF', action: () => exportDeliveryNoteAsPDF() },
                    { name: 'CSV', action: () => exportDeliveryNoteAsCSV() },
                    { name: 'JSON', action: () => exportDeliveryNoteAsJSON() },
                  ];
                  
                  // Show export options to user
                  const exportChoice = prompt(`Choose export format:
1. PDF
2. CSV
3. JSON
Enter choice (1-3):`);
                  
                  // Execute the chosen export
                  if (exportChoice) {
                    const choice = parseInt(exportChoice);
                    if (choice >= 1 && choice <= 3) {
                      exportOptions[choice - 1].action();
                      // Auto-refresh after exporting - reset all fields and increment number
                      setTimeout(() => {
                        resetAndIncrementDeliveryNote();
                      }, 500);
                    }
                  }
                  
                  closeDeliveryNoteOptionsDialog();
                }}
                className="w-full flex items-center justify-start"
                variant="outline"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Export Delivery Note
              </Button>
              
              <Button 
                onClick={() => {
                  // Save to saved deliveries and reset for next entry
                  alert('Delivery note saved to saved deliveries!');
                  closeDeliveryNoteOptionsDialog();
                  resetAndIncrementDeliveryNote();
                }}
                className="w-full flex items-center justify-start"
                variant="outline"
              >
                <Save className="h-4 w-4 mr-2" />
                Save to Saved Deliveries
              </Button>
              
              <Button 
                onClick={() => {
                  // Create new delivery note - reset all fields
                  closeDeliveryNoteOptionsDialog();
                  resetAndIncrementDeliveryNote();
                }}
                className="w-full flex items-center justify-start bg-blue-600 text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Delivery Note
              </Button>
            </div>
            
            <div className="mt-4 flex justify-end">
              <Button 
                onClick={closeDeliveryNoteOptionsDialog}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Sales Order Options Dialog */}
      {showSalesOrderOptions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold mb-4">Sales Order Options</h3>
            <p className="mb-4">Choose an action for your sales order:</p>
            
            <div className="space-y-2">
              <Button 
                onClick={handlePrintSalesOrder}
                className="w-full flex items-center justify-start"
                variant="outline"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Sales Order
              </Button>
              
              <Button 
                onClick={handleDownloadSalesOrder}
                className="w-full flex items-center justify-start"
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Sales Order
              </Button>
              
              <Button 
                onClick={handleShareSalesOrder}
                className="w-full flex items-center justify-start"
                variant="outline"
              >
                <Share className="h-4 w-4 mr-2" />
                Share Sales Order
              </Button>
              
              <Button 
                onClick={handleExportSalesOrder}
                className="w-full flex items-center justify-start"
                variant="outline"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Export Sales Order
              </Button>
            </div>
            
            <div className="mt-4 flex justify-end">
              <Button 
                onClick={closeSalesOrderOptionsDialog}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Stock Take Options Dialog */}
      {showStockTakeOptions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold mb-4">Stock Take Options</h3>
            <p className="mb-4">Choose an action for your stock take:</p>
            
            <div className="space-y-2">
              <Button 
                onClick={() => {
                  const stockTakeContent = generateStockTakeHTML();
                  const printFrame = document.createElement('iframe');
                  printFrame.style.position = 'absolute';
                  printFrame.style.top = '-1000px';
                  printFrame.style.left = '-1000px';
                  document.body.appendChild(printFrame);
                  const printDocument = printFrame.contentDocument || printFrame.contentWindow?.document;
                  if (printDocument) {
                    printDocument.open();
                    printDocument.write(stockTakeContent);
                    printDocument.close();
                    printFrame.onload = () => {
                      try {
                        printFrame.contentWindow?.focus();
                        printFrame.contentWindow?.print();
                      } catch (error) {
                        console.error('Error during printing:', error);
                      } finally {
                        setTimeout(() => {
                          if (printFrame.parentNode) { printFrame.parentNode.removeChild(printFrame); }
                        }, 1000);
                      }
                    };
                  }
                  closeStockTakeOptionsDialog();
                  resetStockTakeData();
                }}
                className="w-full flex items-center justify-start"
                variant="outline"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Stock Take
              </Button>
              
              <Button 
                onClick={() => {
                  exportStockTakeAsPDF();
                  closeStockTakeOptionsDialog();
                  resetStockTakeData();
                }}
                className="w-full flex items-center justify-start"
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Stock Take
              </Button>
              
              <Button 
                onClick={() => {
                  try {
                    const stockTakeContent = generateStockTakeHTML();
                    const blob = new Blob([stockTakeContent], { type: 'text/html' });
                    const file = new File([blob], `Stock_Take_${stockTakeNumber}.html`, { type: 'text/html' });
                    
                    if (navigator.canShare && navigator.canShare({ files: [file] })) {
                      navigator.share({
                        title: `Stock Take ${stockTakeNumber}`,
                        text: batchMode 
                          ? `Batch Stock Take - ${batchSelectedGodowns.length} godowns`
                          : `Physical Stock Take ${stockTakeNumber}`,
                        files: [file]
                      }).catch(() => {
                        // Fallback: copy HTML to clipboard
                        navigator.clipboard.writeText(stockTakeContent).then(() => {
                          alert('Stock take HTML copied to clipboard!');
                        });
                      });
                    } else if (navigator.share) {
                      navigator.share({
                        title: `Stock Take ${stockTakeNumber}`,
                        text: batchMode 
                          ? `Batch Stock Take - ${batchSelectedGodowns.length} godowns`
                          : `Physical Stock Take ${stockTakeNumber}`,
                      }).catch(() => {
                        navigator.clipboard.writeText(stockTakeContent).then(() => {
                          alert('Stock take HTML copied to clipboard!');
                        });
                      });
                    } else {
                      navigator.clipboard.writeText(stockTakeContent).then(() => {
                        alert('Stock take HTML copied to clipboard!');
                      });
                    }
                  } catch (error) {
                    console.error('Error sharing stock take:', error);
                  }
                  closeStockTakeOptionsDialog();
                  resetStockTakeData();
                }}
                className="w-full flex items-center justify-start"
                variant="outline"
              >
                <Share className="h-4 w-4 mr-2" />
                Share Stock Take
              </Button>
              
              <Button 
                onClick={() => {
                  const exportChoice = prompt(`Choose export format:\n1. PDF\n2. CSV\n3. JSON\nEnter choice (1-3):`);
                  if (exportChoice) {
                    const choice = parseInt(exportChoice);
                    if (choice === 1) exportStockTakeAsPDF();
                    else if (choice === 2) exportStockTakeAsCSV();
                    else if (choice === 3) exportStockTakeAsJSON();
                  }
                  closeStockTakeOptionsDialog();
                  resetStockTakeData();
                }}
                className="w-full flex items-center justify-start"
                variant="outline"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Export Stock Take
              </Button>
              
              <Button 
                onClick={() => {
                  closeStockTakeOptionsDialog();
                  resetStockTakeData();
                  setActiveTab('savedStockTakes');
                }}
                className="w-full flex items-center justify-start"
                variant="outline"
              >
                <Eye className="h-4 w-4 mr-2" />
                View Saved Stock Takes
              </Button>
              
              <Button 
                onClick={() => {
                  closeStockTakeOptionsDialog();
                  resetStockTakeData();
                }}
                className="w-full flex items-center justify-start bg-blue-600 text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Stock Take
              </Button>
            </div>
            
            <div className="mt-4 flex justify-end">
              <Button 
                onClick={closeStockTakeOptionsDialog}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Settlement Options Dialog */}
      {showCustomerSettlementOptions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold mb-4">Customer Settlements Options</h3>
            <p className="mb-4">Choose an action for your Settlements:</p>
            
            <div className="space-y-2">
              <Button 
                onClick={() => {
                  // Print functionality for customer settlement
                  const customerSettlementContent = generateCleanCustomerSettlementHTML();
                  
                  // Create a temporary window for printing
                  const printWindow = window.open('', '_blank', 'width=800,height=600');
                  if (printWindow) {
                    printWindow.document.write(`
                      <!DOCTYPE html>
                      <html>
                      <head>
                        <title>Customer Settlement</title>
                        <style>
                          body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
                          .customer-settlement-container { max-width: 800px; margin: 0 auto; padding: 20px; border: 1px solid #ccc; }
                          .text-center { text-align: center; }
                          .border-b-2 { border-bottom: 2px solid #000; }
                          .pb-2 { padding-bottom: 0.5rem; }
                          .font-bold { font-weight: bold; }
                          .text-2xl { font-size: 1.5rem; }
                          .text-sm { font-size: 0.875rem; }
                          .mb-1 { margin-bottom: 0.25rem; }
                          .mb-2 { margin-bottom: 0.5rem; }
                          .mt-4 { margin-top: 1rem; }
                          .mt-8 { margin-top: 2rem; }
                          .pt-4 { padding-top: 1rem; }
                          .border-t { border-top: 1px solid #ccc; }
                          .grid { display: grid; }
                          .gap-8 { gap: 2rem; }
                          .gap-4 { gap: 1rem; }
                          .grid-cols-1 { grid-template-columns: 1fr; }
                          .grid-cols-2 { grid-template-columns: 1fr 1fr; }
                          .grid-cols-3 { grid-template-columns: 1fr 1fr 1fr; }
                          .border { border: 1px solid #e5e7eb; }
                          .p-3 { padding: 0.75rem; }
                          .rounded { border-radius: 0.25rem; }
                          .font-medium { font-weight: 500; }
                        </style>
                      </head>
                      <body>
                        ${customerSettlementContent}
                      </body>
                      </html>
                    `);
                    printWindow.document.close();
                    
                    // Wait a bit for content to render before printing
                    setTimeout(() => {
                      printWindow.focus();
                      printWindow.print();
                      printWindow.close();
                      
                      // Clear the preserved settlement data after printing
                      setSettlementToPrint(null);
                    }, 500);
                  } else {
                    // Fallback: Alert user to allow popups
                    alert('Please enable popups for this site to print the customer settlement');
                  }
                  closeCustomerSettlementOptionsDialog();
                }}
                className="w-full flex items-center justify-start"
                variant="outline"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Settlement
              </Button>
              
              <Button 
                onClick={() => {
                  // Download functionality for customer settlement
                  downloadCustomerSettlementAsPDF();
                  closeCustomerSettlementOptionsDialog();
                  
                  // Reset form after action
                  resetCustomerSettlementData();
                  
                  // Clear the preserved settlement data
                  setSettlementToPrint(null);
                }}
                className="w-full flex items-center justify-start"
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Settlement
              </Button>
              
              <Button 
                onClick={() => {
                  // Share functionality for customer settlement
                  try {
                    // Generate a shareable URL for the customer settlement
                    const shareData = {
                      title: `Customer Settlement ${customerSettlementData.referenceNumber}`,
                      text: `Customer Settlement #${customerSettlementData.referenceNumber} for customer ${customerSettlementData.customerName}`,
                      url: window.location.href // In a real app, this would be a specific settlement URL
                    };
                    
                    // Use the Web Share API if available
                    if (navigator.share) {
                      navigator.share(shareData)
                        .then(() => console.log('Shared successfully'))
                        .catch((error) => {
                          console.log('Sharing failed:', error);
                          // Fallback to copying to clipboard
                          try {
                            // Try to copy the URL to clipboard
                            navigator.clipboard.writeText(shareData.url || window.location.href)
                              .then(() => {
                                alert('Customer settlement link copied to clipboard! You can now share it with others.');
                              })
                              .catch(err => {
                                console.error('Failed to copy: ', err);
                                // If clipboard fails, show the URL to the user
                                const url = prompt('Copy this link to share the customer settlement:', shareData.url || window.location.href);
                              });
                          } catch (err) {
                            console.error('Fallback sharing failed: ', err);
                            alert('Could not share the customer settlement. Please copy the URL manually.');
                          }
                        });
                    } else {
                      // Fallback to copying to clipboard
                      try {
                        // Try to copy the URL to clipboard
                        navigator.clipboard.writeText(shareData.url || window.location.href)
                          .then(() => {
                            alert('Customer settlement link copied to clipboard! You can now share it with others.');
                          })
                          .catch(err => {
                            console.error('Failed to copy: ', err);
                            // If clipboard fails, show the URL to the user
                            const url = prompt('Copy this link to share the customer settlement:', shareData.url || window.location.href);
                          });
                      } catch (err) {
                        console.error('Fallback sharing failed: ', err);
                        alert('Could not share the customer settlement. Please copy the URL manually.');
                      }
                    }
                  } catch (error) {
                    console.error('Error sharing customer settlement:', error);
                    alert('Error sharing customer settlement. Please try again.');
                  }
                  closeCustomerSettlementOptionsDialog();
                  
                  // Reset form after action
                  resetCustomerSettlementData();
                  
                  // Clear the preserved settlement data
                  setSettlementToPrint(null);
                }}
                className="w-full flex items-center justify-start"
                variant="outline"
              >
                <Share className="h-4 w-4 mr-2" />
                Share Settlement
              </Button>
              
              <Button 
                onClick={() => {
                  // Export functionality for customer settlement
                  // Allow user to export in different formats
                  const exportOptions = [
                    { name: 'PDF', action: () => exportCustomerSettlementAsPDF() },
                    { name: 'CSV', action: () => exportCustomerSettlementAsCSV() },
                    { name: 'JSON', action: () => exportCustomerSettlementAsJSON() },
                  ];
                  
                  // Show export options to user
                  const exportChoice = prompt(`Choose export format:
1. PDF
2. CSV
3. JSON
Enter choice (1-3):`);
                  
                  closeCustomerSettlementOptionsDialog();
                  
                  // Reset form after action
                  resetCustomerSettlementData();
                  
                  // Clear the preserved settlement data
                  setSettlementToPrint(null);
                }}
                className="w-full flex items-center justify-start"
                variant="outline"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Export Settlement
              </Button>
              
              <Button 
                onClick={() => {
                  // Reset functionality for customer settlement
                  resetCustomerSettlementData();
                  closeCustomerSettlementOptionsDialog();
                  alert('Customer settlement form has been reset to default layout');
                  
                  // Clear the preserved settlement data
                  setSettlementToPrint(null);
                }}
                className="w-full flex items-center justify-start"
                variant="outline"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset Form
              </Button>
            </div>
            
            <div className="mt-4 flex justify-end">
              <Button 
                onClick={() => {
                  closeCustomerSettlementOptionsDialog();
                  // Clear the preserved settlement data
                  setSettlementToPrint(null);
                }}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Supplier Settlement Options Dialog */}
      {showSupplierSettlementOptions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold mb-4">Supplier Settlements Options</h3>
            <p className="mb-4">Choose an action for your Settlements:</p>
            
            <div className="space-y-2">
              <Button 
                onClick={() => {
                  // Print functionality for supplier settlement
                  // Create a print-friendly version of the supplier settlement
                  const supplierSettlementContent = generateCleanSupplierSettlementHTML();
                  
                  // Create a temporary window for printing
                  const printWindow = window.open('', '_blank', 'width=800,height=600');
                  if (printWindow) {
                    printWindow.document.write(`
                      <!DOCTYPE html>
                      <html>
                      <head>
                        <title>Supplier Settlement</title>
                        <style>
                          body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
                          .supplier-settlement-container { max-width: 800px; margin: 0 auto; padding: 20px; border: 1px solid #ccc; }
                          .text-center { text-align: center; }
                          .border-b-2 { border-bottom: 2px solid #000; }
                          .pb-2 { padding-bottom: 0.5rem; }
                          .font-bold { font-weight: bold; }
                          .text-2xl { font-size: 1.5rem; }
                          .text-sm { font-size: 0.875rem; }
                          .mb-1 { margin-bottom: 0.25rem; }
                          .mb-2 { margin-bottom: 0.5rem; }
                          .mt-4 { margin-top: 1rem; }
                          .mt-8 { margin-top: 2rem; }
                          .pt-4 { padding-top: 1rem; }
                          .border-t { border-top: 1px solid #ccc; }
                          .grid { display: grid; }
                          .gap-8 { gap: 2rem; }
                          .gap-4 { gap: 1rem; }
                          .grid-cols-1 { grid-template-columns: 1fr; }
                          .grid-cols-2 { grid-template-columns: 1fr 1fr; }
                          .grid-cols-3 { grid-template-columns: 1fr 1fr 1fr; }
                          .border { border: 1px solid #e5e7eb; }
                          .p-3 { padding: 0.75rem; }
                          .rounded { border-radius: 0.25rem; }
                          .font-medium { font-weight: 500; }
                        </style>
                      </head>
                      <body>
                        ${supplierSettlementContent}
                      </body>
                      </html>
                    `);
                    printWindow.document.close();
                    
                    // Wait a bit for content to render before printing
                    setTimeout(() => {
                      printWindow.focus();
                      printWindow.print();
                      printWindow.close();
                    }, 500);
                  } else {
                    // Fallback: Alert user to allow popups
                    alert('Please enable popups for this site to print the supplier settlement');
                  }
                  closeSupplierSettlementOptionsDialog();
                }}
                className="w-full flex items-center justify-start"
                variant="outline"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Settlement
              </Button>
              
              <Button 
                onClick={() => {
                  // Download functionality for supplier settlement
                  downloadSupplierSettlementAsPDF();
                  closeSupplierSettlementOptionsDialog();
                  
                  // Reset form after action
                  resetSupplierSettlementData();
                }}
                className="w-full flex items-center justify-start"
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Settlement
              </Button>
              
              <Button 
                onClick={() => {
                  // Share functionality for supplier settlement
                  try {
                    // Generate a shareable URL for the supplier settlement
                    const shareData = {
                      title: `Supplier Settlement ${supplierSettlementData.referenceNumber}`,
                      text: `Supplier Settlement #${supplierSettlementData.referenceNumber} for supplier ${supplierSettlementData.supplierName}`,
                      url: window.location.href // In a real app, this would be a specific settlement URL
                    };
                    
                    // Use the Web Share API if available
                    if (navigator.share) {
                      navigator.share(shareData)
                        .then(() => console.log('Shared successfully'))
                        .catch((error) => {
                          console.log('Sharing failed:', error);
                          // Fallback to copying to clipboard
                          try {
                            // Try to copy the URL to clipboard
                            navigator.clipboard.writeText(shareData.url || window.location.href)
                              .then(() => {
                                alert('Supplier settlement link copied to clipboard! You can now share it with others.');
                              })
                              .catch(err => {
                                console.error('Failed to copy: ', err);
                                // If clipboard fails, show the URL to the user
                                const url = prompt('Copy this link to share the supplier settlement:', shareData.url || window.location.href);
                              });
                          } catch (err) {
                            console.error('Fallback sharing failed: ', err);
                            alert('Could not share the supplier settlement. Please copy the URL manually.');
                          }
                        });
                    } else {
                      // Fallback to copying to clipboard
                      try {
                        // Try to copy the URL to clipboard
                        navigator.clipboard.writeText(shareData.url || window.location.href)
                          .then(() => {
                            alert('Supplier settlement link copied to clipboard! You can now share it with others.');
                          })
                          .catch(err => {
                            console.error('Failed to copy: ', err);
                            // If clipboard fails, show the URL to the user
                            const url = prompt('Copy this link to share the supplier settlement:', shareData.url || window.location.href);
                          });
                      } catch (err) {
                        console.error('Fallback sharing failed: ', err);
                        alert('Could not share the supplier settlement. Please copy the URL manually.');
                      }
                    }
                  } catch (error) {
                    console.error('Error sharing supplier settlement:', error);
                    alert('Error sharing supplier settlement. Please try again.');
                  }
                  closeSupplierSettlementOptionsDialog();
                  
                  // Reset form after action
                  resetSupplierSettlementData();
                }}
                className="w-full flex items-center justify-start"
                variant="outline"
              >
                <Share className="h-4 w-4 mr-2" />
                Share Settlement
              </Button>
              
              <Button 
                onClick={() => {
                  // Export functionality for supplier settlement
                  // Allow user to export in different formats
                  const exportOptions = [
                    { name: 'PDF', action: () => exportSupplierSettlementAsPDF() },
                    { name: 'CSV', action: () => exportSupplierSettlementAsCSV() },
                    { name: 'JSON', action: () => exportSupplierSettlementAsJSON() },
                  ];
                  
                  // Show export options to user
                  const exportChoice = prompt(`Choose export format:
1. PDF
2. CSV
3. JSON
Enter choice (1-3):`);
                  
                  closeSupplierSettlementOptionsDialog();
                  
                  // Reset form after action
                  resetSupplierSettlementData();
                }}
                className="w-full flex items-center justify-start"
                variant="outline"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Export Settlement
              </Button>
              
              <Button 
                onClick={() => {
                  // Reset functionality for supplier settlement
                  resetSupplierSettlementData();
                  closeSupplierSettlementOptionsDialog();
                  alert('Supplier settlement form has been reset to default layout');
                }}
                className="w-full flex items-center justify-start"
                variant="outline"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset Form
              </Button>
            </div>
            
            <div className="mt-4 flex justify-end">
              <Button 
                onClick={closeSupplierSettlementOptionsDialog}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* GRN Options Dialog */}
      {showGRNOptions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold mb-4">GRN Options</h3>
            <p className="mb-4">Choose an action for your GRN:</p>
            
            <div className="space-y-2">
              <Button 
                onClick={() => {
                  PrintUtils.printGRNDetails(buildGRNObject());
                  closeGRNOptionsDialog();
                }}
                className="w-full flex items-center justify-start"
                variant="outline"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print GRN
              </Button>
              
              <Button 
                onClick={() => {
                  ExportUtils.exportGRNDetailsAsPDF(buildGRNObject(), `GRN-${grnData.grnNumber}`);
                  closeGRNOptionsDialog();
                }}
                className="w-full flex items-center justify-start"
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                Download GRN
              </Button>
              
              <Button 
                onClick={() => {
                  // Share functionality for GRN
                  try {
                    // Generate a shareable URL for the GRN
                    const shareData = {
                      title: `Goods Received Note ${grnData.grnNumber}`,
                      text: `GRN #${grnData.grnNumber} for supplier ${grnData.supplierName}`,
                      url: window.location.href // In a real app, this would be a specific GRN URL
                    };
                    
                    // Use the Web Share API if available
                    if (navigator.share) {
                      navigator.share(shareData)
                        .then(() => console.log('Shared successfully'))
                        .catch((error) => {
                          console.log('Sharing failed:', error);
                          // Fallback to copying to clipboard
                          try {
                            // Try to copy the URL to clipboard
                            navigator.clipboard.writeText(shareData.url || window.location.href)
                              .then(() => {
                                alert('GRN link copied to clipboard! You can now share it with others.');
                              })
                              .catch(err => {
                                console.error('Failed to copy: ', err);
                                // If clipboard fails, show the URL to the user
                                const url = prompt('Copy this link to share the GRN:', shareData.url || window.location.href);
                              });
                          } catch (err) {
                            console.error('Fallback sharing failed: ', err);
                            alert('Could not share the GRN. Please copy the URL manually.');
                          }
                        });
                    } else {
                      // Fallback to copying to clipboard
                      try {
                        // Try to copy the URL to clipboard
                        navigator.clipboard.writeText(shareData.url || window.location.href)
                          .then(() => {
                            alert('GRN link copied to clipboard! You can now share it with others.');
                          })
                          .catch(err => {
                            console.error('Failed to copy: ', err);
                            // If clipboard fails, show the URL to the user
                            const url = prompt('Copy this link to share the GRN:', shareData.url || window.location.href);
                          });
                      } catch (err) {
                        console.error('Fallback sharing failed: ', err);
                        alert('Could not share the GRN. Please copy the URL manually.');
                      }
                    }
                  } catch (error) {
                    console.error('Error sharing GRN:', error);
                    alert('Error sharing GRN. Please try again.');
                  }
                  closeGRNOptionsDialog();
                  
                  // Reset form after action
                  resetGRNData();
                }}
                className="w-full flex items-center justify-start"
                variant="outline"
              >
                <Share className="h-4 w-4 mr-2" />
                Share GRN
              </Button>
              
              <Button 
                onClick={() => {
                  // Export functionality for GRN
                  // Allow user to export in different formats
                  const exportOptions = [
                    { name: 'PDF', action: () => exportGRNAsPDF() },
                    { name: 'CSV', action: () => exportGRNAsCSV() },
                    { name: 'JSON', action: () => exportGRNAsJSON() },
                  ];
                  
                  // Show export options to user
                  const exportChoice = prompt(`Choose export format:
1. PDF
2. CSV
3. JSON
Enter choice (1-3):`);
                  
                  closeGRNOptionsDialog();
                  
                  // Reset form after action
                  resetGRNData();
                }}
                className="w-full flex items-center justify-start"
                variant="outline"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Export GRN
              </Button>
              
              <Button 
                onClick={() => {
                  // View Saved GRNs functionality
                  setActiveTab('savedGRNs');
                  closeGRNOptionsDialog();
                }}
                className="w-full flex items-center justify-start"
                variant="outline"
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                View Saved GRNs
              </Button>
              
              <Button 
                onClick={() => {
                  // Reset functionality for GRN
                  resetGRNData();
                  closeGRNOptionsDialog();
                  alert('GRN form has been reset to default layout');
                }}
                className="w-full flex items-center justify-start"
                variant="outline"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset Form
              </Button>
            </div>
            
            <div className="mt-4 flex justify-end">
              <Button 
                onClick={closeGRNOptionsDialog}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Purchase Order Options Dialog */}
      {showPurchaseOrderOptions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold mb-4">Purchase Order Options</h3>
            <p className="mb-4">Choose an action for your purchase order:</p>
            
            <div className="space-y-2">
              <Button 
                onClick={() => {
                  // Print functionality for purchase order
                  // Create a print-friendly version of the purchase order
                  const purchaseOrderContent = generateCleanPurchaseOrderHTML();
                  
                  // Create a temporary window for printing
                  const printWindow = window.open('', '_blank', 'width=800,height=600');
                  if (printWindow) {
                    printWindow.document.write(`
                      <!DOCTYPE html>
                      <html>
                      <head>
                        <title>Purchase Order</title>
                        <style>
                          body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
                          .po-container { max-width: 800px; margin: 0 auto; padding: 20px; border: 1px solid #ccc; }
                          .text-center { text-align: center; }
                          .border-b-2 { border-bottom: 2px solid #000; }
                          .pb-2 { padding-bottom: 0.5rem; }
                          .font-bold { font-weight: bold; }
                          .text-2xl { font-size: 1.5rem; }
                          .text-sm { font-size: 0.875rem; }
                          .mb-1 { margin-bottom: 0.25rem; }
                          .mb-2 { margin-bottom: 0.5rem; }
                          .mt-4 { margin-top: 1rem; }
                          .mt-8 { margin-top: 2rem; }
                          .pt-4 { padding-top: 1rem; }
                          .border-t { border-top: 1px solid #ccc; }
                          .grid { display: grid; }
                          .gap-8 { gap: 2rem; }
                          .gap-4 { gap: 1rem; }
                          .grid-cols-1 { grid-template-columns: 1fr; }
                          .grid-cols-2 { grid-template-columns: 1fr 1fr; }
                          .grid-cols-3 { grid-template-columns: 1fr 1fr 1fr; }
                          .border { border: 1px solid #e5e7eb; }
                          .p-3 { padding: 0.75rem; }
                          .rounded { border-radius: 0.25rem; }
                          .font-medium { font-weight: 500; }
                        </style>
                      </head>
                      <body>
                        ${purchaseOrderContent}
                      </body>
                      </html>
                    `);
                    printWindow.document.close();
                    
                    // Wait a bit for content to render before printing
                    setTimeout(() => {
                      printWindow.focus();
                      printWindow.print();
                      printWindow.close();
                    }, 500);
                  } else {
                    // Fallback: Alert user to allow popups
                    alert('Please enable popups for this site to print the purchase order');
                  }
                  closePurchaseOrderOptionsDialog();
                }}
                className="w-full flex items-center justify-start"
                variant="outline"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Purchase Order
              </Button>
              
              <Button 
                onClick={() => {
                  // Download functionality for purchase order
                  // Generate the purchase order as a PDF
                  import('html2pdf.js').then((html2pdfModule) => {
                    const purchaseOrderContent = generateCleanPurchaseOrderHTML();
                    
                    // Create a temporary container to hold the purchase order content
                    const tempContainer = document.createElement('div');
                    tempContainer.innerHTML = purchaseOrderContent;
                    tempContainer.style.position = 'absolute';
                    tempContainer.style.left = '-9999px';
                    document.body.appendChild(tempContainer);
                    
                    // Configure PDF options
                    const opt = {
                      margin: 5,
                      filename: `Purchase_Order_${purchaseOrderData.poNumber}.pdf`,
                      image: { type: 'jpeg' as const, quality: 0.98 },
                      html2canvas: { scale: 2, useCORS: true },
                      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
                    };
                    
                    // Generate PDF
                    html2pdfModule.default(tempContainer, opt).then(() => {
                      // Remove temporary container after PDF generation
                      setTimeout(() => {
                        document.body.removeChild(tempContainer);
                      }, 1000);
                    });
                  });
                  closePurchaseOrderOptionsDialog();
                }}
                className="w-full flex items-center justify-start"
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Purchase Order
              </Button>
              
              <Button 
                onClick={() => {
                  // Share functionality for purchase order
                  try {
                    // Generate a shareable URL for the purchase order
                    const shareData = {
                      title: `Purchase Order ${purchaseOrderData.poNumber}`,
                      text: `Purchase Order #${purchaseOrderData.poNumber} for supplier ${purchaseOrderData.supplierName}`,
                      url: window.location.href // In a real app, this would be a specific purchase order URL
                    };
                    
                    // Use the Web Share API if available
                    if (navigator.share) {
                      navigator.share(shareData)
                        .then(() => console.log('Shared successfully'))
                        .catch((error) => {
                          console.log('Sharing failed:', error);
                          // Fallback to copying to clipboard
                          try {
                            // Try to copy the URL to clipboard
                            navigator.clipboard.writeText(shareData.url || window.location.href)
                              .then(() => {
                                alert('Purchase order link copied to clipboard! You can now share it with others.');
                              })
                              .catch(err => {
                                console.error('Failed to copy: ', err);
                                // If clipboard fails, show the URL to the user
                                const url = prompt('Copy this link to share the purchase order:', shareData.url || window.location.href);
                              });
                          } catch (err) {
                            console.error('Fallback sharing failed: ', err);
                            alert('Could not share the purchase order. Please copy the URL manually.');
                          }
                        });
                    } else {
                      // Fallback to copying to clipboard
                      try {
                        // Try to copy the URL to clipboard
                        navigator.clipboard.writeText(shareData.url || window.location.href)
                          .then(() => {
                            alert('Purchase order link copied to clipboard! You can now share it with others.');
                          })
                          .catch(err => {
                            console.error('Failed to copy: ', err);
                            // If clipboard fails, show the URL to the user
                            const url = prompt('Copy this link to share the purchase order:', shareData.url || window.location.href);
                          });
                      } catch (err) {
                        console.error('Fallback sharing failed: ', err);
                        alert('Could not share the purchase order. Please copy the URL manually.');
                      }
                    }
                  } catch (error) {
                    console.error('Error sharing purchase order:', error);
                    alert('Error sharing purchase order. Please try again.');
                  }
                  closePurchaseOrderOptionsDialog();
                }}
                className="w-full flex items-center justify-start"
                variant="outline"
              >
                <Share className="h-4 w-4 mr-2" />
                Share Purchase Order
              </Button>
              
              <Button 
                onClick={() => {
                  // Export functionality for purchase order
                  // Allow user to export in different formats
                  const exportOptions = [
                    { name: 'PDF', action: () => {
                        // Placeholder for PDF export
                        alert('PDF export functionality coming soon');
                      } 
                    },
                    { name: 'CSV', action: () => {
                        // Placeholder for CSV export
                        alert('CSV export functionality coming soon');
                      } 
                    },
                    { name: 'JSON', action: () => {
                        // Placeholder for JSON export
                        alert('JSON export functionality coming soon');
                      } 
                    },
                  ];
                  
                  // Show export options to user
                  const exportChoice = prompt(`Choose export format:
1. PDF
2. CSV
3. JSON
Enter choice (1-3):`);
                  
                  closePurchaseOrderOptionsDialog();
                }}
                className="w-full flex items-center justify-start"
                variant="outline"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Export Purchase Order
              </Button>
              
              <Button 
                onClick={() => {
                  // Reset functionality for purchase order
                  resetPurchaseOrderData();
                  closePurchaseOrderOptionsDialog();
                  alert('Purchase order form has been reset to default layout');
                }}
                className="w-full flex items-center justify-start"
                variant="outline"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset Form
              </Button>
            </div>
            
            <div className="mt-4 flex justify-end">
              <Button 
                onClick={closePurchaseOrderOptionsDialog}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* New Supplier Registration Dialog */}
      {showNewSupplierDialog && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Register New Supplier</h3>
              <button
                onClick={() => setShowNewSupplierDialog(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Supplier Name <span className="text-red-500">*</span></label>
                <Input
                  value={newSupplierForm.name}
                  onChange={(e) => setNewSupplierForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter supplier name"
                  className="mt-1 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Contact Person <span className="text-red-500">*</span></label>
                <Input
                  value={newSupplierForm.contact_person}
                  onChange={(e) => setNewSupplierForm(prev => ({ ...prev, contact_person: e.target.value }))}
                  placeholder="Enter contact person"
                  className="mt-1 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Phone</label>
                  <Input
                    value={newSupplierForm.phone}
                    onChange={(e) => setNewSupplierForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Phone number"
                    className="mt-1 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <Input
                    value={newSupplierForm.email}
                    onChange={(e) => setNewSupplierForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Email address"
                    className="mt-1 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Address</label>
                <Input
                  value={newSupplierForm.address}
                  onChange={(e) => setNewSupplierForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Enter address"
                  className="mt-1 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Tax ID / TIN</label>
                <Input
                  value={newSupplierForm.tax_id}
                  onChange={(e) => setNewSupplierForm(prev => ({ ...prev, tax_id: e.target.value }))}
                  placeholder="Enter tax ID"
                  className="mt-1 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowNewSupplierDialog(false)}
                disabled={savingNewSupplier}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!newSupplierForm.name || !newSupplierForm.contact_person) {
                    toast({ title: "Error", description: "Please fill in Supplier Name and Contact Person", variant: "destructive" });
                    return;
                  }
                  setSavingNewSupplier(true);
                  try {
                    const created = await createSupplier({
                      name: newSupplierForm.name,
                      contact_person: newSupplierForm.contact_person,
                      phone: newSupplierForm.phone,
                      email: newSupplierForm.email,
                      address: newSupplierForm.address,
                      tax_id: newSupplierForm.tax_id,
                      is_active: true
                    });
                    if (created) {
                      const newSupplier: DBSupplier = {
                        ...created,
                        id: created.id || ''
                      };
                      setRegisteredSuppliers(prev => [...prev, newSupplier]);
                      setFilteredSuppliers(prev => [...prev, newSupplier]);
                      // Auto-select the newly created supplier
                      const updatedSuppliers = [...grnData.suppliers];
                      const supplierIndex = updatedSuppliers.findIndex(s => s.id === grnData.suppliers[0]?.id);
                      if (supplierIndex >= 0) {
                        updatedSuppliers[supplierIndex] = {
                          ...updatedSuppliers[supplierIndex],
                          name: created.name,
                          supplierId: created.tax_id || `SUP-${String(supplierIndex + 1).padStart(3, '0')}`,
                          phone: created.phone || "",
                          email: created.email || "",
                          address: created.address || "",
                          tinNumber: created.tax_id || "",
                          stockType: updatedSuppliers[supplierIndex].stockType || ""
                        };
                      }
                      setGrnData(prev => ({ ...prev, suppliers: updatedSuppliers }));
                      setShowNewSupplierDialog(false);
                      setNewSupplierForm({ name: '', contact_person: '', phone: '', email: '', address: '', tax_id: '' });
                      toast({ title: "Success", description: "Supplier registered successfully" });
                    } else {
                      throw new Error("Failed to create supplier");
                    }
                  } catch (error) {
                    console.error("Error creating supplier:", error);
                    toast({ title: "Error", description: "Failed to register supplier: " + (error as Error).message, variant: "destructive" });
                  } finally {
                    setSavingNewSupplier(false);
                  }
                }}
                disabled={savingNewSupplier}
              >
                {savingNewSupplier ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                ) : (
                  "Register & Select"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Templates;
