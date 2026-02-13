import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/currency";
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
  FolderOpen
} from "lucide-react";
import { getTemplateConfig, saveTemplateConfig, ReceiptTemplateConfig } from '@/utils/templateUtils';
import { PrintUtils } from '@/utils/printUtils';
import { ExportUtils } from '@/utils/exportUtils';
import WhatsAppUtils from '@/utils/whatsappUtils';
import { saveInvoice, InvoiceData as SavedInvoiceData } from '@/utils/invoiceUtils';
import { saveDelivery, DeliveryData } from '@/utils/deliveryUtils';
import { saveCustomerSettlement, CustomerSettlementData as SavedCustomerSettlementData } from '@/utils/customerSettlementUtils';
import { saveGRN, SavedGRN as UtilsSavedGRN, getSavedGRNs } from '@/utils/grnUtils';
import { updateGRNQuantitiesFromInvoice, updateGRNQuantitiesFromDeliveryNote } from '@/utils/consumptionUtils';
import { saveSupplierSettlement, SupplierSettlementData as UtilsSupplierSettlementData, generateSupplierSettlementReference } from '@/utils/supplierSettlementUtils';
import { SavedDeliveriesSection } from '@/components/SavedDeliveriesSection';
import { SavedCustomerSettlementsSection } from '@/components/SavedCustomerSettlementsSection';
import { SavedSupplierSettlementsSection } from '@/components/SavedSupplierSettlementsSection';
import { SavedGRNsSection } from '@/components/SavedGRNsSection';

interface Template {
  id: string;
  name: string;
  type: "delivery-note" | "order-form" | "contract" | "invoice" | "receipt" | "notice" | "quotation" | "report" | "salary-slip" | "complimentary-goods" | "expense-voucher" | "customer-settlement" | "supplier-settlement" | "goods-received-note" | "purchase-order";
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
}

interface DeliveryNoteData {
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;
  customerName: string;
  customerAddress1: string;
  customerAddress2: string;
  customerPhone: string;
  customerEmail: string;
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
}



interface SavedDeliveryNote {
  id: string;
  name: string;
  data: DeliveryNoteData;
  createdAt: string;
  updatedAt: string;
}

// Initial delivery note data
const initialDeliveryNoteData: DeliveryNoteData = {
  businessName: "YOUR BUSINESS NAME",
  businessAddress: "123 Business Street, City, Country",
  businessPhone: "+1234567890",
  businessEmail: "info@yourbusiness.com",
  customerName: "Customer Name",
  customerAddress1: "Customer Address Line 1",
  customerAddress2: "Customer Address Line 2",
  customerPhone: "+1234567890",
  customerEmail: "customer@example.com",
  deliveryNoteNumber: "DN-001",
  date: "11/30/2025",
  deliveryDate: "",
  vehicle: "",
  driver: "",
  items: [
    { id: "1", description: "Sample Product 1", quantity: 10, unit: "pcs", rate: 100, amount: 1000, delivered: 10, remarks: "Good condition" },
    { id: "2", description: "Sample Product 2", quantity: 5, unit: "boxes", rate: 250, amount: 1250, delivered: 5, remarks: "Fragile" },
    { id: "3", description: "Sample Product 3", quantity: 2, unit: "units", rate: 500, amount: 1000, delivered: 2, remarks: "" }
  ],
  deliveryNotes: "Please handle with care. Fragile items included.\nSignature required upon delivery.",
  totalItems: 3,
  totalQuantity: 17,
  totalPackages: 3,
  preparedByName: "",
  preparedByDate: "",
  driverName: "",
  driverDate: "",
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

// Purchase Order Item interface with unit field
interface PurchaseOrderItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
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
  clientCityState: string;
  clientPhone: string;
  clientEmail: string;
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
}

interface GRNReceivingCost {
  id: string;
  description: string;
  amount: number;
}

interface GRNData {
  grnNumber: string;
  date: string;
  time: string;
  supplierName: string;
  supplierId: string;
  supplierPhone: string;
  supplierEmail: string;
  supplierAddress: string;
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;
  businessStockType: 'exempt' | 'vatable' | '';
  isVatable: boolean;
  supplierTinNumber: string;
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
}

interface SavedGRN {
  id: string;
  name: string;
  data: GRNData;
  createdAt: string;
  updatedAt: string;
}

interface TemplatesProps {
  onBack?: () => void;
}

export const Templates = ({ onBack }: TemplatesProps) => {
  const [activeTab, setActiveTab] = useState<"manage" | "customize" | "preview" | "savedDeliveries" | "savedCustomerSettlements" | "savedSupplierSettlements" | "savedGRNs">("manage");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [viewingTemplate, setViewingTemplate] = useState<string | null>(null);
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
      id: "10",
      name: "Complimentary Goods",
      type: "complimentary-goods",
      description: "Professional complimentary goods template",
      content: `COMPLIMENTARY GOODS VOUCHER
Voucher #[VOUCHER_NUMBER]
Date: [DATE]

This is to certify that the following goods have been provided free of charge to [CUSTOMER_NAME]:

Items:
[ITEM_LIST]

Reason for Complimentary Goods:
[REASON]

Authorized by: _________________
Signature: _________________
Date: [DATE]`,
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

Supplier Information:
Name: [SUPPLIER_NAME]
ID: [SUPPLIER_ID]
Phone: [SUPPLIER_PHONE]
Email: [SUPPLIER_EMAIL]
Address: [SUPPLIER_ADDRESS]

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
    }
  ]);
  
  const initialDeliveryNoteData: DeliveryNoteData = {
    businessName: "YOUR BUSINESS NAME",
    businessAddress: "123 Business Street, City, Country",
    businessPhone: "+1234567890",
    businessEmail: "info@yourbusiness.com",
    customerName: "Customer Name",
    customerAddress1: "Customer Address Line 1",
    customerAddress2: "Customer Address Line 2",
    customerPhone: "+1234567890",
    customerEmail: "customer@example.com",
    deliveryNoteNumber: "DN-001",
    date: "11/30/2025",
    deliveryDate: "",
    vehicle: "",
    driver: "",
    items: [
      { id: "1", description: "Sample Product 1", quantity: 10, unit: "pcs", rate: 100, amount: 1000, delivered: 10, remarks: "Good condition" },
      { id: "2", description: "Sample Product 2", quantity: 5, unit: "boxes", rate: 250, amount: 1250, delivered: 5, remarks: "Fragile" },
      { id: "3", description: "Sample Product 3", quantity: 2, unit: "units", rate: 500, amount: 1000, delivered: 2, remarks: "" }
    ],
    deliveryNotes: ".\nSignature required upon delivery.",
    totalItems: 3,
    totalQuantity: 17,
    totalPackages: 3,
    preparedByName: "",
    preparedByDate: "",
    driverName: "",
    driverDate: "",
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

  const [deliveryNoteName, setDeliveryNoteName] = useState<string>("");
  // GRN search states for delivery note
  const [deliveryNoteGRNItemsMap, setDeliveryNoteGRNItemsMap] = useState<Map<string, { rate: number, unit: string }>>(new Map());
  const [deliveryNoteGRNDescriptions, setDeliveryNoteGRNDescriptions] = useState<string[]>([]);
  const [showDeliveryNoteDropdown, setShowDeliveryNoteDropdown] = useState<boolean>(false);
  const [reportName, setReportName] = useState<string>("");
  const [settlementReference, setSettlementReference] = useState<string>("");
    
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
      supplierName: "Supplier Name",
      supplierId: generateSupplierId(),
      supplierPhone: "(555) 987-6543",
      supplierEmail: "supplier@example.com",
      supplierAddress: "123 Supplier Street, City, Country",
      businessName: "YOUR BUSINESS NAME",
      businessAddress: "123 Business Street, City, Country",
      businessPhone: "+1234567890",
      businessEmail: "info@yourbusiness.com",
      businessStockType: "",
      isVatable: false,
      supplierTinNumber: "",
      poNumber: "PO-2024-001",
      deliveryNoteNumber: "DN-001",
      vehicleNumber: "TRUCK-001",
      driverName: "John Driver",
      receivedBy: "Warehouse Staff",
      receivedLocation: "Main Warehouse",
      items: [
        { id: "1", description: "Product A", orderedQuantity: 100, receivedQuantity: 100, unit: "pcs", originalUnitCost: 0, unitCost: 0, receivingCostPerUnit: 0, totalWithReceivingCost: 0, batchNumber: "BATCH-001", expiryDate: "2025-12-31", remarks: "Good condition" },
        { id: "2", description: "Product B", orderedQuantity: 50, receivedQuantity: 48, unit: "boxes", originalUnitCost: 0, unitCost: 0, receivingCostPerUnit: 0, totalWithReceivingCost: 0, batchNumber: "BATCH-002", expiryDate: "2026-06-30", remarks: "2 units damaged" },
        { id: "3", description: "Product C", orderedQuantity: 25, receivedQuantity: 25, unit: "units", originalUnitCost: 0, unitCost: 0, receivingCostPerUnit: 0, totalWithReceivingCost: 0, batchNumber: "BATCH-003", expiryDate: "2025-09-15", remarks: "" }
      ],
      receivingCosts: [
        { id: "1", description: "Transport Charges", amount: 0 },
        { id: "2", description: "Offloaders Charges", amount: 0 },
        { id: "3", description: "Traffic Charges", amount: 0 }
      ],
      qualityCheckNotes: "All items inspected. Overall condition good. Minor damage to 2 units of Product B.",
      discrepancies: "Product B: 2 units damaged, will need replacement",
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
        businessStockType: grn.data.businessStockType || "",
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
    console.log('=== STARTING HANDLE SAVE GRN ===');
    if (!grnData.grnNumber.trim()) {
      alert('Please enter a GRN number');
      return;
    }
    
    console.log('GRN Data:', grnData);
    
    // Calculate total amount from items
    const totalAmount = grnData.items.reduce((sum, item) => sum + Number(item.totalWithReceivingCost || 0), 0);
    
    // Convert Templates GRN data to grnUtils format
    const convertedGRNData: any = {
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
      businessStockType: grnData.businessStockType || undefined,
      isVatable: grnData.isVatable,
      supplierTinNumber: grnData.supplierTinNumber,
      poNumber: grnData.poNumber,
      deliveryNoteNumber: grnData.deliveryNoteNumber,
      vehicleNumber: grnData.vehicleNumber,
      driverName: grnData.driverName,
      receivedBy: grnData.receivedBy,
      receivedLocation: grnData.receivedLocation,
      items: grnData.items.map(item => ({
        id: item.id,
        description: item.description,
        quantity: item.orderedQuantity,
        delivered: item.receivedQuantity,
        unit: item.unit,
        unitCost: item.unitCost || 0,
        total: item.totalWithReceivingCost || 0,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate,
        remarks: item.remarks,
        receivingCostPerUnit: item.receivingCostPerUnit,
        totalWithReceivingCost: item.totalWithReceivingCost
      })),
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
      receivingCosts: grnData.receivingCosts
    };
    
    const newGRN: UtilsSavedGRN = {
      id: Date.now().toString(),
      name: `GRN-${grnData.grnNumber}`,
      data: convertedGRNData as any,
      total: totalAmount,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    try {
      console.log('About to call saveGRN with:', newGRN);
      // Use the proper saveGRN utility function
      await saveGRN(newGRN);
      
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
            }
            th, td {
              border: 1px solid #000;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f0f0f0;
            }
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
            </div>
            
            <div>
              <h3 class="font-bold mb-2">RECEIVING BUSINESS:</h3>
              <p><strong>Name:</strong> ${grnData.businessName}</p>
              <p><strong>Address:</strong> ${grnData.businessAddress}</p>
              <p><strong>Phone:</strong> ${grnData.businessPhone}</p>
              <p><strong>Email:</strong> ${grnData.businessEmail}</p>
              <p><strong>Stock Type:</strong> ${grnData.businessStockType || 'Not specified'}</p>
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
                  <th>Original Unit Cost</th>
                  <th>Receiving Cost Per Unit</th>
                  <th>New Unit Cost</th>
                  <th>Total Cost with Receiving</th>
                  <th>Batch #</th>
                  <th>Expiry</th>
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
                    <td>${formatCurrency(item.originalUnitCost || (item.unitCost ? item.unitCost - (item.receivingCostPerUnit || 0) : 0))}</td>
                    <td>${formatCurrency(item.receivingCostPerUnit || 0)}</td>
                    <td>${formatCurrency(item.unitCost || 0)}</td>
                    <td>${formatCurrency(item.totalWithReceivingCost || 0)}</td>
                    <td>${item.batchNumber || ''}</td>
                    <td>${item.expiryDate || ''}</td>
                    <td>${item.remarks}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="section">
            <h3 class="font-bold mb-2">QUALITY CHECK:</h3>
            <p>${grnData.qualityCheckNotes || 'No quality issues noted.'}</p>
          </div>
          
          <div class="section">
            <h3 class="font-bold mb-2">DISCREPANCIES:</h3>
            <p>${grnData.discrepancies || 'None'}</p>
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
          remarks: ""
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
    supplierName: "Supplier Name",
    supplierId: generateSupplierId(),
    supplierPhone: "(555) 987-6543",
    supplierEmail: "supplier@example.com",
    supplierAddress: "123 Supplier Street, City, Country",
    businessName: "YOUR BUSINESS NAME",
    businessAddress: "123 Business Street, City, Country",
    businessPhone: "+1234567890",
    businessEmail: "info@yourbusiness.com",
    businessStockType: "",
    isVatable: false,
    supplierTinNumber: "",
    poNumber: "PO-2024-001",
    deliveryNoteNumber: "DN-001",
    vehicleNumber: "TRUCK-001",
    driverName: "John Driver",
    receivedBy: "Warehouse Staff",
    receivedLocation: "Main Warehouse",
    items: [
      { id: "1", description: "Product A", orderedQuantity: 100, receivedQuantity: 100, unit: "pcs", unitCost: 10, totalCost: 1000, receivingCostPerUnit: 0, totalWithReceivingCost: 1000, batchNumber: "BATCH-001", expiryDate: "2025-12-31", remarks: "Good condition" },
      { id: "2", description: "Product B", orderedQuantity: 50, receivedQuantity: 48, unit: "boxes", unitCost: 15, totalCost: 750, receivingCostPerUnit: 0, totalWithReceivingCost: 750, batchNumber: "BATCH-002", expiryDate: "2026-06-30", remarks: "2 units damaged" },
      { id: "3", description: "Product C", orderedQuantity: 25, receivedQuantity: 25, unit: "units", unitCost: 20, totalCost: 500, receivingCostPerUnit: 0, totalWithReceivingCost: 500, batchNumber: "BATCH-003", expiryDate: "2025-09-15", remarks: "" }
    ],
    receivingCosts: [
      { id: "1", description: "Transport Charges", amount: 0 },
      { id: "2", description: "Offloaders Charges", amount: 0 },
      { id: "3", description: "Traffic Charges", amount: 0 }
    ],
    qualityCheckNotes: "All items inspected. Overall condition good. Minor damage to 2 units of Product B.",
    discrepancies: "Product B: 2 units damaged, will need replacement",
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
  
  const [savedGRNs, setSavedGRNs] = useState<any[]>(() => {
    const saved = localStorage.getItem('savedGRNs');
    return saved ? JSON.parse(saved) : [];
  });
  
  // State to store the settlement data to be printed (preserved after save)
  const [settlementToPrint, setSettlementToPrint] = useState<CustomerSettlementData | null>(null);
    
  const [purchaseOrderData, setPurchaseOrderData] = useState<PurchaseOrderData>({
    businessName: "Your Business Name",
    businessAddress: "123 Business Street",
    businessPhone: "(555) 987-6543",
    businessEmail: "info@yourbusiness.com",
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
  
  // Initialize invoice data with current date and time-based invoice number
  const initialInvoiceData: InvoiceData = {
    businessName: "Your Business Name",
    businessAddress: "123 Business Street",
    businessPhone: "(555) 123-4567",
    businessEmail: "billing@yourbusiness.com",
    clientName: "Client Company Name",
    clientAddress: "456 Client Avenue",
    clientCityState: "Client City, State 67890",
    clientPhone: "(555) 987-6543",
    clientEmail: "accounts@clientcompany.com",
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
    notes: "Thank you for your business!.",
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
  
  // Generate delivery note number automatically
  useEffect(() => {
    if (activeTab === "preview" && !deliveryNoteName) {
      const deliveryNoteNumber = getNextDeliveryNoteNumber();
      setDeliveryNoteName(deliveryNoteNumber);
      
      // Also update the delivery note number in the data
      setDeliveryNoteData(prev => ({
        ...prev,
        deliveryNoteNumber: deliveryNoteNumber
      }));
    }
  }, [activeTab, deliveryNoteName]);

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
    if (template && (template.type === "delivery-note" || template.type === "order-form" || template.type === "invoice" || template.type === "expense-voucher" || template.type === "salary-slip" || template.type === "complimentary-goods" || template.type === "report" || template.type === "customer-settlement" || template.type === "supplier-settlement" || template.type === "goods-received-note")) {
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
          itemsList: deliveryNoteData.items.map(item => ({
            name: item.description,
            quantity: item.quantity,
            unit: item.unit,
            delivered: item.delivered,
            remarks: item.remarks,
            price: 0, // Delivery notes don't have prices
            total: 0  // Delivery notes don't have totals
          })),
          subtotal: totalAmount, // For delivery notes, subtotal is same as total
          tax: 0,
          discount: 0,
          amountReceived: 0,
          change: 0,
          vehicle: deliveryNoteData.vehicle,
          driver: deliveryNoteData.driver,
          deliveryNotes: deliveryNoteData.deliveryNotes
        };
        
        await saveDelivery(deliveryToSave);
        
        // Show the delivery note options dialog after saving
        showDeliveryNoteOptionsDialog();
        
        // Don't reset here - let the user choose an option first
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
  
  // Function to reset delivery note data to initial state
  const resetDeliveryNoteData = () => {
    setDeliveryNoteData({
      ...initialDeliveryNoteData,
      deliveryNoteNumber: `DN-${new Date().getTime()}`, // Generate new delivery note number
      date: new Date().toISOString().split('T')[0], // Set to current date
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
        'Business Stock Type': grnData.businessStockType || 'Not specified',
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
        'Business Stock Type': grnData.businessStockType || 'Not specified',
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
      const unitCostWithReceiving = (item.originalUnitCost || item.unitCost || 0) + receivingCostPerUnit;
      const totalWithReceivingCost = unitCostWithReceiving * item.receivedQuantity;
      
      return {
        ...item,
        receivingCostPerUnit,
        totalWithReceivingCost,
        unitCost: unitCostWithReceiving
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
        businessStockType: grnData.businessStockType || 'Not specified',
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
          <p class="text-sm">GRN #: ${grnData.grnNumber || 'GRN_NUMBER'}</p>
          <p class="text-sm">Date: ${new Date().toLocaleDateString()}</p>
          <p class="text-sm">Time: ${new Date().toLocaleTimeString()}</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
          <div>
            <div class="font-bold mb-1">SUPPLIER INFORMATION:</div>
            <div class="text-sm mb-1">
              <span class="font-medium">Name:</span> ${grnData.supplierName}
            </div>
            <div class="text-sm mb-1">
              <span class="font-medium">ID:</span> ${grnData.supplierId || 'N/A'}
            </div>
            <div class="text-sm mb-1">
              <span class="font-medium">Phone:</span> ${grnData.supplierPhone || 'N/A'}
            </div>
            <div class="text-sm mb-1">
              <span class="font-medium">Email:</span> ${grnData.supplierEmail || 'N/A'}
            </div>
            <div class="text-sm mb-1">
              <span class="font-medium">Address:</span> ${grnData.supplierAddress || 'N/A'}
            </div>
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
              <span class="font-medium">Stock Type:</span> ${grnData.businessStockType || 'N/A'}
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
          <div class="font-bold mb-2">ITEMS RECEIVED:</div>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="border: 1px solid #e5e7eb; padding: 6px; text-align: left;">Description</th>
                <th style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">Ordered</th>
                <th style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">Received</th>
                <th style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">Unit</th>
                <th style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">Original Unit Cost</th>
                <th style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">Receiving Cost Per Unit</th>
                <th style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">New Unit Cost</th>
                <th style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">Total Cost with Receiving</th>
                <th style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">Batch #</th>
                <th style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">Expiry</th>
                <th style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${(distributeReceivingCosts(grnData.items, grnData.receivingCosts) || []).map(item => `
                <tr>
                  <td style="border: 1px solid #e5e7eb; padding: 6px;">${item.description || ''}</td>
                  <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">${item.orderedQuantity || 0}</td>
                  <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">${item.receivedQuantity || 0}</td>
                  <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">${item.unit || ''}</td>
                  <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">${(item.originalUnitCost || (item.unitCost ? item.unitCost - (item.receivingCostPerUnit || 0) : 0)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                  <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">${(item.receivingCostPerUnit || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                  <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">${(item.unitCost || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                  <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">${(item.totalWithReceivingCost || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                  <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">${item.batchNumber || ''}</td>
                  <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">${item.expiryDate || ''}</td>
                  <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: right;">${item.remarks || ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
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

  // Handle item changes
  const handleItemChange = (itemId: string, field: keyof DeliveryNoteItem, value: string | number) => {
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
          remarks: ""
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
    const totalQuantity = deliveryNoteData.items.reduce((sum, item) => sum + Number(item.delivered || 0), 0);
    const totalPackages = deliveryNoteData.items.reduce((count, item) => 
      item.unit && item.delivered ? count + 1 : count, 0
    );
    
    return { totalItems, totalQuantity, totalPackages };
  };

  // Save delivery note to localStorage
  // Function to save delivery note to the global saved deliveries system
  const handleSaveDeliveryNote = async () => {
    // Use the same approach as handleSaveTemplate for delivery notes
    const currentTemplate = templates.find(t => t.id === selectedTemplate || t.id === viewingTemplate);
    
    if (currentTemplate?.type === "delivery-note") {
      // For delivery note templates, automatically save to saved deliveries
      try {
        // Calculate total items
        const totalItems = deliveryNoteData.items.reduce((sum, item) => sum + item.quantity, 0);
        
        // For delivery notes, we don't have rates, so total is based on quantity
        const totalAmount = totalItems; // Just using quantity as a simple total
        
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
          itemsList: deliveryNoteData.items.map(item => ({
            name: item.description,
            quantity: item.quantity,
            unit: item.unit,
            rate: item.rate,
            amount: item.amount,
            delivered: item.delivered,
            remarks: item.remarks,
            price: item.rate, // For backward compatibility
            total: item.amount  // For backward compatibility
          })),
          subtotal: totalAmount, // For delivery notes, subtotal is same as total
          tax: 0,
          discount: 0,
          amountReceived: 0,
          change: 0,
          vehicle: deliveryNoteData.vehicle,
          driver: deliveryNoteData.driver,
          deliveryNotes: deliveryNoteData.deliveryNotes
        };
        
        await saveDelivery(deliveryToSave);
        
        // Update GRN quantities for consumed items
        const consumedItems = deliveryNoteData.items.map(item => ({
          description: item.description,
          quantity: item.quantity
        }));
        await updateGRNQuantitiesFromDeliveryNote(consumedItems);
        
        alert(`Delivery Note ${deliveryNoteData.deliveryNoteNumber} saved successfully to Saved Deliveries!\nGRN quantities updated for consumed items.`);
        
        // Show the delivery note options dialog after saving
        showDeliveryNoteOptionsDialog();
        
        // Don't reset here - let the user choose an option first
      } catch (error) {
        console.error('Error saving delivery:', error);
        alert('Error saving delivery. Please try again.');
      }
    } else {
      // For other cases, save to local saved delivery notes
      if (!deliveryNoteName.trim()) {
        const deliveryNoteNumber = getNextDeliveryNoteNumber();
        setDeliveryNoteName(deliveryNoteNumber);
        
        // Also update the delivery note number in the data
        setDeliveryNoteData(prev => ({
          ...prev,
          deliveryNoteNumber: deliveryNoteNumber
        }));
      }
      
      const newSavedNote: SavedDeliveryNote = {
        id: Date.now().toString(),
        name: deliveryNoteName || getNextDeliveryNoteNumber(),
        data: deliveryNoteData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const updatedNotes = [...savedDeliveryNotes, newSavedNote];
      setSavedDeliveryNotes(updatedNotes);
      localStorage.setItem('savedDeliveryNotes', JSON.stringify(updatedNotes));
      
      alert(`Delivery note "${newSavedNote.name}" saved successfully!`);
      
      // Generate next number for the next delivery note
      setTimeout(() => {
        const nextDeliveryNoteNumber = getNextDeliveryNoteNumber();
        setDeliveryNoteName(nextDeliveryNoteNumber);
        
        // Also update the delivery note number in the data
        setDeliveryNoteData(prev => ({
          ...prev,
          deliveryNoteNumber: nextDeliveryNoteNumber
        }));
      }, 100);
    }
  };

  // Load a saved delivery note
  const handleLoadDeliveryNote = (noteId: string) => {
    const note = savedDeliveryNotes.find(n => n.id === noteId);
    if (note) {
      setDeliveryNoteData(note.data);
      setDeliveryNoteName(note.name);
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
        // Calculate totals for the viewed note
        const viewedData = note.data;
        const totalItems = viewedData.items.length;
        const totalQuantity = viewedData.items.reduce((sum, item) => sum + Number(item.delivered || 0), 0);
        const totalPackages = viewedData.items.reduce((count, item) => 
          item.unit && item.delivered ? count + 1 : count, 0
        );
        
        const printContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Delivery Note - ${note.name}</title>
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
              .grid-4 {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr 1fr;
                gap: 10px;
              }
              .signatures {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
                gap: 20px;
                margin-top: 40px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
              }
              th, td {
                border: 1px solid #ddd;
                padding: 8px;
                text-align: left;
              }
              th {
                background-color: #f2f2f2;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>DELIVERY NOTE</h1>
            </div>
            
            <div class="grid">
              <div>
                <h3 class="font-bold text-lg">${viewedData.businessName}</h3>
                <p>${viewedData.businessAddress}</p>
                <p>Phone: ${viewedData.businessPhone}</p>
                <p>Email: ${viewedData.businessEmail}</p>
              </div>
              
              <div>
                <h3 class="font-bold">TO:</h3>
                <p>${viewedData.customerName}</p>
                <p>${viewedData.customerAddress1}</p>
                <p>${viewedData.customerAddress2}</p>
                <p>Phone: ${viewedData.customerPhone}</p>
                <p>Email: ${viewedData.customerEmail}</p>
              </div>
            </div>
            
            <div class="grid-4">
              <div>
                <p class="font-bold">Delivery Note #:</p>
                <p>${viewedData.deliveryNoteNumber}</p>
              </div>
              <div>
                <p class="font-bold">Date:</p>
                <p>${viewedData.date}</p>
              </div>
              <div>
                <p class="font-bold">Delivery Date:</p>
                <p>${viewedData.deliveryDate || '_________'}</p>
              </div>
              <div>
                <p class="font-bold">Vehicle #:</p>
                <p>${viewedData.vehicle || '_________'}</p>
              </div>
              <div>
                <p class="font-bold">Driver:</p>
                <p>${viewedData.driver || '_________'}</p>
              </div>
            </div>
            
            <div class="section">
              <h3 class="font-bold mb-2">ITEMS DELIVERED:</h3>
              <table>
                <thead>
                  <tr>
                    <th>Item Description</th>
                    <th>Quantity</th>
                    <th>Unit</th>
                    <th>Delivered</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  ${viewedData.items.map(item => `
                    <tr>
                      <td>${item.description}</td>
                      <td>${item.quantity}</td>
                      <td>${item.unit}</td>
                      <td>${item.delivered}</td>
                      <td>${item.remarks}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            
            <div class="section">
              <h3 class="font-bold mb-2">DELIVERY NOTES:</h3>
              <p>${viewedData.deliveryNotes}</p>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <span class="font-bold">Total Items:</span> ${totalItems}
              </div>
              <div>
                <span class="font-bold">Total Quantity:</span> ${totalQuantity} units
              </div>
              <div>
                <span class="font-bold">Total Packages:</span> ${totalPackages}
              </div>
            </div>
            
            <div class="signatures">
              <div>
                <h4 class="font-bold mb-2">Prepared By</h4>
                <p>Name: ${viewedData.preparedByName || '_________'}</p>
                <p>Date: ${viewedData.preparedByDate || '_________'}</p>
                <p class="mt-8">Signature: _________________</p>
              </div>
              
              <div>
                <h4 class="font-bold mb-2">Driver Signature</h4>
                <p>Name: ${viewedData.driverName || '_________'}</p>
                <p>Date: ${viewedData.driverDate || '_________'}</p>
                <p class="mt-8">Signature: _________________</p>
              </div>
              
              <div>
                <h4 class="font-bold mb-2">Received By</h4>
                <p>Name: ${viewedData.receivedByName || '_________'}</p>
                <p>Date: ${viewedData.receivedByDate || '_________'}</p>
                <p class="mt-8">Signature: _________________</p>
                <p class="text-xs mt-2">(Signature Required)</p>
              </div>
            </div>
          </body>
          </html>
        `;
        
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
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const totals = calculateTotals();
      
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Delivery Note</title>
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
            .grid-4 {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr 1fr;
              gap: 10px;
            }
            .signatures {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 20px;
              margin-top: 40px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 10px 0;
            }
            th, td {
              border: 1px solid #000;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f0f0f0;
            }
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
            <h1>DELIVERY NOTE</h1>
          </div>
          
          <div class="grid">
            <div>
              <h2 class="font-bold">${deliveryNoteData.businessName}</h2>
              <p>${deliveryNoteData.businessAddress}</p>
              <p>Phone: ${deliveryNoteData.businessPhone}</p>
              <p>Email: ${deliveryNoteData.businessEmail}</p>
            </div>
            
            <div>
              <h3 class="font-bold">TO:</h3>
              <p>${deliveryNoteData.customerName}</p>
              <p>${deliveryNoteData.customerAddress1}</p>
              <p>${deliveryNoteData.customerAddress2}</p>
              <p>Phone: ${deliveryNoteData.customerPhone}</p>
              <p>Email: ${deliveryNoteData.customerEmail}</p>
            </div>
          </div>
          
          <div class="grid-4">
            <div>
              <p class="font-bold">Delivery Note #:</p>
              <p>${deliveryNoteData.deliveryNoteNumber}</p>
            </div>
            <div>
              <p class="font-bold">Date:</p>
              <p>${deliveryNoteData.date}</p>
            </div>
            <div>
              <p class="font-bold">Delivery Date:</p>
              <p>${deliveryNoteData.deliveryDate || '_________'}</p>
            </div>
            <div>
              <p class="font-bold">Vehicle #:</p>
              <p>${deliveryNoteData.vehicle || '_________'}</p>
            </div>
            <div>
              <p class="font-bold">Driver:</p>
              <p>${deliveryNoteData.driver || '_________'}</p>
            </div>
          </div>
          
          <div class="section">
            <h3 class="font-bold mb-2">ITEMS DELIVERED:</h3>
            <table>
              <thead>
                <tr>
                  <th>Item Description</th>
                  <th>Quantity</th>
                  <th>Unit</th>
                  <th>Delivered</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                ${deliveryNoteData.items.map(item => `
                  <tr>
                    <td>${item.description}</td>
                    <td>${item.quantity}</td>
                    <td>${item.unit}</td>
                    <td>${item.delivered}</td>
                    <td>${item.remarks}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="section">
            <h3 class="font-bold mb-2">DELIVERY NOTES:</h3>
            <p>${deliveryNoteData.deliveryNotes.replace(/\n/g, '<br>')}</p>
          </div>
          
          <div class="grid-4">
            <div>
              <p class="font-bold">Total Items:</p>
              <p>${totals.totalItems}</p>
            </div>
            <div>
              <p class="font-bold">Total Quantity:</p>
              <p>${totals.totalQuantity} units</p>
            </div>
            <div>
              <p class="font-bold">Total Packages:</p>
              <p>${totals.totalPackages}</p>
            </div>
          </div>
          
          <div class="signatures">
            <div>
              <h4 class="font-bold">Prepared By</h4>
              <p>Name: ${deliveryNoteData.preparedByName || '_________________'}</p>
              <p>Date: ${deliveryNoteData.preparedByDate || '_________'}</p>
            </div>
            
            <div>
              <h4 class="font-bold">Driver Signature</h4>
              <p>Name: ${deliveryNoteData.driverName || '_________________'}</p>
              <p>Date: ${deliveryNoteData.driverDate || '_________'}</p>
            </div>
            
            <div>
              <h4 class="font-bold">Received By</h4>
              <p>Name: ${deliveryNoteData.receivedByName || '_________________'}</p>
              <p>Date: ${deliveryNoteData.receivedByDate || '_________'}</p>
              <p class="signature-line">(Signature Required)</p>
            </div>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
        </html>
      `;
      
      printWindow.document.write(printContent);
      printWindow.document.close();
    }
  };

  // Download delivery note as PDF
  const handleDownloadDeliveryNote = () => {
    const totals = calculateTotals();
    
    // Create HTML content for the PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Delivery Note</title>
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
          .grid-4 {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr 1fr;
            gap: 10px;
          }
          .signatures {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 20px;
            margin-top: 40px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
          }
          th, td {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f0f0f0;
          }
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
          <h1>DELIVERY NOTE</h1>
        </div>
        
        <div class="grid">
          <div>
            <h2 class="font-bold">${deliveryNoteData.businessName}</h2>
            <p>${deliveryNoteData.businessAddress}</p>
            <p>Phone: ${deliveryNoteData.businessPhone}</p>
            <p>Email: ${deliveryNoteData.businessEmail}</p>
          </div>
          
          <div>
            <h3 class="font-bold">TO:</h3>
            <p>${deliveryNoteData.customerName}</p>
            <p>${deliveryNoteData.customerAddress1}</p>
            <p>${deliveryNoteData.customerAddress2}</p>
            <p>Phone: ${deliveryNoteData.customerPhone}</p>
            <p>Email: ${deliveryNoteData.customerEmail}</p>
          </div>
        </div>
        
        <div class="grid-4">
          <div>
            <p class="font-bold">Delivery Note #:</p>
            <p>${deliveryNoteData.deliveryNoteNumber}</p>
          </div>
          <div>
            <p class="font-bold">Date:</p>
            <p>${deliveryNoteData.date}</p>
          </div>
          <div>
            <p class="font-bold">Delivery Date:</p>
            <p>${deliveryNoteData.deliveryDate || '_________'}</p>
          </div>
          <div>
            <p class="font-bold">Vehicle #:</p>
            <p>${deliveryNoteData.vehicle || '_________'}</p>
          </div>
          <div>
            <p class="font-bold">Driver:</p>
            <p>${deliveryNoteData.driver || '_________'}</p>
          </div>
        </div>
        
        <div class="section">
          <h3 class="font-bold mb-2">ITEMS DELIVERED:</h3>
          <table>
            <thead>
              <tr>
                <th>Item Description</th>
                <th>Quantity</th>
                <th>Unit</th>
                <th>Rate</th>
                <th>Amount</th>
                <th>Delivered</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${deliveryNoteData.items.map(item => `
                <tr>
                  <td>${item.description}</td>
                  <td>${item.quantity}</td>
                  <td>${item.unit}</td>
                  <td>${item.rate}</td>
                  <td>${item.amount}</td>
                  <td>${item.delivered}</td>
                  <td>${item.remarks}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div class="section">
          <h3 class="font-bold mb-2">DELIVERY NOTES:</h3>
          <p>${deliveryNoteData.deliveryNotes.replace(/\n/g, '<br>')}</p>
        </div>
        
        <div class="grid-4">
          <div>
            <p class="font-bold">Total Items:</p>
            <p>${totals.totalItems}</p>
          </div>
          <div>
            <p class="font-bold">Total Quantity:</p>
            <p>${totals.totalQuantity} units</p>
          </div>
          <div>
            <p class="font-bold">Total Packages:</p>
            <p>${totals.totalPackages}</p>
          </div>
        </div>
        
        <div class="signatures">
          <div>
            <h4 class="font-bold">Prepared By</h4>
            <p>Name: ${deliveryNoteData.preparedByName || '_________________'}</p>
            <p>Date: ${deliveryNoteData.preparedByDate || '_________'}</p>
          </div>
          
          <div>
            <h4 class="font-bold">Driver Signature</h4>
            <p>Name: ${deliveryNoteData.driverName || '_________________'}</p>
            <p>Date: ${deliveryNoteData.driverDate || '_________'}</p>
          </div>
          
          <div>
            <h4 class="font-bold">Received By</h4>
            <p>Name: ${deliveryNoteData.receivedByName || '_________________'}</p>
            <p>Date: ${deliveryNoteData.receivedByDate || '_________'}</p>
            <p class="signature-line">(Signature Required)</p>
          </div>
        </div>
      </body>
      </html>
    `;

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
  const handleInvoiceItemChange = (itemId: string, field: keyof InvoiceItem, value: string | number) => {
    setInvoiceData(prev => {
      const updatedItems = prev.items.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, [field]: value };
          
          // If quantity or rate changes, update amount
          if (field === 'quantity' || field === 'rate') {
            // Apply discount validation: if quantity > 20, deduct 200 from rate
            let effectiveRate = updatedItem.rate;
            if (field === 'quantity') {
              const newQuantity = Number(value);
              if (newQuantity >= 20) {
                effectiveRate = Math.max(0, updatedItem.rate - 200); // Ensure rate doesn't go below 0
              }
              updatedItem.amount = newQuantity * effectiveRate;
            } else if (field === 'rate') {
              const newRate = Number(value);
              if (updatedItem.quantity >= 20) {
                effectiveRate = Math.max(0, newRate - 200); // Ensure rate doesn't go below 0
              } else {
                effectiveRate = newRate;
              }
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
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  
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
            <div style="margin-bottom: 5px;">${invoiceData.clientAddress}</div>
            <div style="margin-bottom: 5px;">${invoiceData.clientCityState}</div>
            <div style="margin-bottom: 5px;">Phone: ${invoiceData.clientPhone}</div>
            <div style="margin-bottom: 5px;">Email: ${invoiceData.clientEmail}</div>
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
  
  // Function to generate clean delivery note HTML for printing
  const generateDeliveryNoteHTML = (): string => {
    // Create a clean version of the delivery note without input fields
    const cleanHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Delivery Note ${deliveryNoteData.deliveryNoteNumber}</title>
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
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            font-size: 14px;
          }
          .delivery-note-container {
            border: 1px solid #ccc;
            padding: 20px;
            border-radius: 5px;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
          }
          .header h2 {
            margin: 0;
            font-size: 24px;
          }
          .header .number {
            font-size: 18px;
            font-weight: bold;
            margin: 10px 0;
          }
          .info-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
          }
          .business-info, .customer-info {
            flex: 1;
            padding: 0 10px;
          }
          .info-section h3 {
            margin-top: 0;
            font-size: 16px;
          }
          .delivery-details {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            margin-bottom: 20px;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .items-table th,
          .items-table td {
            border: 1px solid #ccc;
            padding: 8px;
            text-align: left;
          }
          .items-table th {
            background-color: #f5f5f5;
          }
          .signature-section {
            margin-top: 30px;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
          }
          .signature-box {
            text-align: center;
            padding-top: 40px;
            border-top: 1px solid #000;
          }
          .notes-section {
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="delivery-note-container">
          <div class="header">
            <h2>DELIVERY NOTE</h2>
            <div class="number">${deliveryNoteData.deliveryNoteNumber}</div>
            <div>Date: ${deliveryNoteData.date}</div>
          </div>
          
          <div class="info-section">
            <div class="business-info">
              <h3>FROM:</h3>
              <div>${deliveryNoteData.businessName}</div>
              <div>${deliveryNoteData.businessAddress}</div>
              <div>Phone: ${deliveryNoteData.businessPhone}</div>
              <div>Email: ${deliveryNoteData.businessEmail}</div>
            </div>
            
            <div class="customer-info">
              <h3>TO:</h3>
              <div>${deliveryNoteData.customerName}</div>
              <div>${deliveryNoteData.customerAddress1}</div>
              <div>${deliveryNoteData.customerAddress2}</div>
              <div>Phone: ${deliveryNoteData.customerPhone}</div>
              <div>Email: ${deliveryNoteData.customerEmail}</div>
            </div>
          </div>
          
          <div class="delivery-details">
            <div><strong>Delivery Date:</strong> ${deliveryNoteData.deliveryDate || 'N/A'}</div>
            <div><strong>Vehicle:</strong> ${deliveryNoteData.vehicle || 'N/A'}</div>
            <div><strong>Driver:</strong> ${deliveryNoteData.driver || 'N/A'}</div>
            <div><strong>Total Items:</strong> ${deliveryNoteData.totalItems}</div>
            <div><strong>Total Quantity:</strong> ${deliveryNoteData.totalQuantity}</div>
            <div><strong>Total Packages:</strong> ${deliveryNoteData.totalPackages}</div>
          </div>
          
        <div style="display: flex; justify-content: flex-end; margin-bottom: 20px;">
          <table style="width: 300px; font-size: 14px;">
            <tr>
              <td style="padding: 5px;"><strong>Total:</strong></td>
              <td style="padding: 5px; text-align: right;">${formatCurrency(calculateDeliveryNoteTotals().total)}</td>
            </tr>
            <tr>
              <td style="padding: 5px;"><strong>Amount Paid:</strong></td>
              <td style="padding: 5px; text-align: right;">${formatCurrency(deliveryNoteData.amountPaid)}</td>
            </tr>
            <tr>
              <td style="padding: 5px;"><strong>Credit Brought Forward from previous:</strong></td>
              <td style="padding: 5px; text-align: right;">${formatCurrency(deliveryNoteData.creditBroughtForward)}</td>
            </tr>
            <tr style="border-top: 2px solid #000; padding-top: 5px;">
              <td style="padding: 5px;"><strong>AMOUNT DUE:</strong></td>
              <td style="padding: 5px; text-align: right; color: #dc2626;"><strong>${formatCurrency(calculateDeliveryNoteTotals().amountDue)}</strong></td>
            </tr>
          </table>
        </div>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr>
                  <th style="border: 1px solid #ccc; padding: 8px; text-align: left;">Item</th>
                  <th style="border: 1px solid #ccc; padding: 8px; text-align: left;">Description</th>
                  <th style="border: 1px solid #ccc; padding: 8px; text-align: left;">Quantity</th>
                  <th style="border: 1px solid #ccc; padding: 8px; text-align: left;">Unit</th>
                  <th style="border: 1px solid #ccc; padding: 8px; text-align: left;">Rate</th>
                  <th style="border: 1px solid #ccc; padding: 8px; text-align: left;">Amount</th>
                  <th style="border: 1px solid #ccc; padding: 8px; text-align: left;">Delivered</th>
                  <th style="border: 1px solid #ccc; padding: 8px; text-align: left;">Remarks</th>
                </tr>
              </thead>
              <tbody>
                ${deliveryNoteData.items.map((item, index) => `
                  <tr>
                    <td style="border: 1px solid #ccc; padding: 8px;">${index + 1}</td>
                    <td style="border: 1px solid #ccc; padding: 8px;">${item.description}</td>
                    <td style="border: 1px solid #ccc; padding: 8px;">${item.quantity}</td>
                    <td style="border: 1px solid #ccc; padding: 8px;">${item.unit}</td>
                    <td style="border: 1px solid #ccc; padding: 8px;">${item.rate}</td>
                    <td style="border: 1px solid #ccc; padding: 8px;">${item.amount}</td>
                    <td style="border: 1px solid #ccc; padding: 8px;">${item.delivered}</td>
                    <td style="border: 1px solid #ccc; padding: 8px;">${item.remarks}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="notes-section">
            <h3>Delivery Notes:</h3>
            <div>${deliveryNoteData.deliveryNotes}</div>
          </div>
          
          <div class="signature-section">
            <div class="signature-box">
              Prepared By: ${deliveryNoteData.preparedByName || '________________'}
              <br>
              Date: ${deliveryNoteData.preparedByDate || '________________'}
            </div>
            <div class="signature-box">
              Driver: ${deliveryNoteData.driverName || '________________'}
              <br>
              Date: ${deliveryNoteData.driverDate || '________________'}
            </div>
            <div class="signature-box">
              Received By: ${deliveryNoteData.receivedByName || '________________'}
              <br>
              Date: ${deliveryNoteData.receivedByDate || '________________'}
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    
    return cleanHTML;
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
      // Create invoice data for saving
      const invoiceToSave: SavedInvoiceData = {
        id: invoiceData.invoiceNumber, // Use invoice number as ID
        invoiceNumber: invoiceData.invoiceNumber,
        date: invoiceData.invoiceDate,
        customer: invoiceData.clientName,
        items: invoiceData.items.reduce((sum, item) => sum + item.quantity, 0),
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
      
      // Update GRN quantities for consumed items
      const consumedItems = invoiceData.items.map(item => ({
        description: item.description,
        quantity: item.quantity
      }));
      await updateGRNQuantitiesFromInvoice(consumedItems);
      
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
        const prevBalance = field === 'previousBalance' ? Number(value) : prev.previousBalance;
        const amountPaid = field === 'amountPaid' ? Number(value) : prev.amountPaid;
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
                />
              </div>
            ) : activeTab === "preview" ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">
                    {currentTemplate?.type === "order-form" ? "Purchase Order Preview" : currentTemplate?.type === "invoice" ? "Invoice Preview" : currentTemplate?.type === "expense-voucher" ? "Expense Voucher Preview" : currentTemplate?.type === "salary-slip" ? "Salary Slip Preview" : currentTemplate?.type === "complimentary-goods" ? "Complimentary Goods Preview" : currentTemplate?.type === "report" ? "Report Template Preview" : currentTemplate?.type === "customer-settlement" ? "Customer Settlement Preview" : currentTemplate?.type === "supplier-settlement" ? "Supplier Settlement Preview" : currentTemplate?.type === "goods-received-note" ? "Goods Received Note Preview" : "Delivery Note Preview"}
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
                    ) : (
                      <Input
                        type="text"
                        placeholder="Delivery Note Name"
                        value={deliveryNoteName}
                        onChange={(e) => setDeliveryNoteName(e.target.value)}
                        className="w-48 h-10"
                      />
                    )}
                    <Button onClick={async () => {
                      if (currentTemplate?.type === "order-form") {
                        alert(`Purchase Order ${purchaseOrderData.poNumber} saved successfully!`);
                      } else if (currentTemplate?.type === "invoice") {
                        // Automatically save invoice to saved invoices
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
                            newBalance: customerSettlementData.newBalance || 0,
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
                      <Save className="h-4 w-4 mr-2" />
                      Save
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
                    <Button variant="outline" onClick={() => setActiveTab("manage")}>
                      Back to Templates
                    </Button>
                    {(currentTemplate?.type !== "invoice" && currentTemplate?.type !== "delivery-note" && currentTemplate?.type !== "customer-settlement" && currentTemplate?.type !== "goods-received-note" && currentTemplate?.type !== "supplier-settlement") && (
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
                

                
                <div className="border rounded-lg p-6 max-w-4xl mx-auto" id="template-preview-content">
                  <div className="space-y-6">
                    {/* Header */}
                    {currentTemplate?.type === "order-form" ? (
                      <div className="text-center border-b-2 border-gray-800 pb-2">
                        <h2 className="text-2xl font-bold">PURCHASE ORDER</h2>
                        <p className="text-sm">Official Business Document</p>
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
                          <div className="overflow-x-auto">
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
                                    <td className="border border-gray-300 p-2">
                                      <div className="relative">
                                        <Input
                                          value={item.description}
                                          onChange={(e) => {
                                            handleInvoiceItemChange(item.id, 'description', e.target.value);
                                          }}
                                          onFocus={async (e) => {
                                            // Load GRN items map when the input is focused
                                            const itemsMap = await getAllGRNItems();
                                            setGrnItemsMap(itemsMap);
                                            setGrnDescriptions(Array.from(itemsMap.keys()));
                                            setShowDropdown(true);
                                          }}
                                          onBlur={() => {
                                            // Delay hiding the dropdown to allow click events to register
                                            setTimeout(() => setShowDropdown(false), 150);
                                          }}
                                          className="p-1 h-8 text-sm w-full"
                                          placeholder="Select or enter description..."
                                        />
                                        {grnDescriptions.length > 0 && showDropdown && (
                                          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                            {grnDescriptions
                                              .filter(desc => 
                                                item.description === "" || desc.toLowerCase().includes(item.description.toLowerCase())
                                              )
                                              .map((desc, idx) => (
                                                <div
                                                  key={idx}
                                                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                                                  onMouseDown={() => {
                                                    handleInvoiceItemChange(item.id, 'description', desc);
                                                    // Set the rate and unit from the GRN if available
                                                    const itemDataFromGRN = grnItemsMap.get(desc);
                                                    if (itemDataFromGRN) {
                                                      // Apply discount validation: if quantity > 20, deduct 200 from rate
                                                      let effectiveRate = itemDataFromGRN.rate;
                                                      if (item.quantity >= 20) {
                                                        effectiveRate = Math.max(0, itemDataFromGRN.rate - 200);
                                                      }
                                                      
                                                      handleInvoiceItemChange(item.id, 'rate', effectiveRate);
                                                      handleInvoiceItemChange(item.id, 'unit', itemDataFromGRN.unit);
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
                                        onChange={(e) => {
                                          const newQuantity = parseFloat(e.target.value);
                                          handleInvoiceItemChange(item.id, 'quantity', newQuantity);
                                          // The handleInvoiceItemChange function now handles the discount validation automatically
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
                                          // The handleInvoiceItemChange function now handles the discount validation automatically
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
                              <span className="font-medium">Name:</span>
                              <Input 
                                value={grnData.supplierName}
                                onChange={(e) => setGrnData(prev => ({ ...prev, supplierName: e.target.value }))}
                                className="w-full p-1 text-sm mt-1"
                              />
                            </div>
                            <div className="text-sm mb-1">
                              <span className="font-medium">ID:</span>
                              <Input 
                                value={grnData.supplierId}
                                onChange={(e) => setGrnData(prev => ({ ...prev, supplierId: e.target.value }))}
                                className="w-full p-1 text-sm mt-1"
                                readOnly
                              />
                            </div>
                            <div className="text-sm mb-1">
                              <span className="font-medium">Phone:</span>
                              <Input 
                                value={grnData.supplierPhone}
                                onChange={(e) => setGrnData(prev => ({ ...prev, supplierPhone: e.target.value }))}
                                className="w-full p-1 text-sm mt-1"
                              />
                            </div>
                            <div className="text-sm mb-1">
                              <span className="font-medium">Email:</span>
                              <Input 
                                value={grnData.supplierEmail}
                                onChange={(e) => setGrnData(prev => ({ ...prev, supplierEmail: e.target.value }))}
                                className="w-full p-1 text-sm mt-1"
                              />
                            </div>
                            <div className="text-sm mb-1">
                              <span className="font-medium">Address:</span>
                              <Textarea 
                                value={grnData.supplierAddress}
                                onChange={(e) => setGrnData(prev => ({ ...prev, supplierAddress: e.target.value }))}
                                className="w-full p-1 text-sm mt-1 min-h-[60px]"
                              />
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
                            <div className="text-sm mb-1">
                              <span className="font-medium">Stock Type:</span>
                              <Select 
                                value={grnData.businessStockType}
                                onValueChange={(value) => setGrnData(prev => ({ ...prev, businessStockType: value as 'exempt' | 'vatable' | '' }))}
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
                            <div className="text-sm mb-1">
                              <span className="font-medium">Is Tin Implimented ?:</span>
                              <div className="flex space-x-2 mt-1">
                                <Button
                                  type="button"
                                  variant={grnData.isVatable ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setGrnData(prev => ({ ...prev, isVatable: true }))}
                                >
                                  Yes
                                </Button>
                                <Button
                                  type="button"
                                  variant={!grnData.isVatable ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setGrnData(prev => ({ ...prev, isVatable: false }))}
                                >
                                  No
                                </Button>
                              </div>
                            </div>
                            {grnData.isVatable && (
                              <div className="text-sm mb-1">
                                <span className="font-medium">Implimented TIN Number:</span>
                                <Input
                                  value={grnData.supplierTinNumber}
                                  onChange={(e) => setGrnData(prev => ({ ...prev, supplierTinNumber: e.target.value }))}
                                  className="mt-1"
                                  placeholder="Enter Implimented TIN number"
                                />
                              </div>
                            )}
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
                            <div className="text-sm font-medium">Delivery Note #:</div>
                            <Input
                              value={grnData.deliveryNoteNumber || ""}
                              onChange={(e) => setGrnData(prev => ({ ...prev, deliveryNoteNumber: e.target.value }))}
                              className="text-sm p-1 h-8"
                            />
                          </div>
                          <div>
                            <div className="text-sm font-medium">Vehicle #:</div>
                            <Input
                              value={grnData.vehicleNumber || ""}
                              onChange={(e) => setGrnData(prev => ({ ...prev, vehicleNumber: e.target.value }))}
                              className="text-sm p-1 h-8"
                            />
                          </div>
                          <div>
                            <div className="text-sm font-medium">Driver:</div>
                            <Input
                              value={grnData.driverName || ""}
                              onChange={(e) => setGrnData(prev => ({ ...prev, driverName: e.target.value }))}
                              className="text-sm p-1 h-8"
                            />
                          </div>
                          <div>
                            <div className="text-sm font-medium">Received By:</div>
                            <Input
                              value={grnData.receivedBy || ""}
                              onChange={(e) => setGrnData(prev => ({ ...prev, receivedBy: e.target.value }))}
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
                        
                        {/* Items Table */}
                        <div>
                          <div className="font-bold mb-2">ITEMS RECEIVED WITH UPDATED PRICES:</div>
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-gray-300 text-sm">
                              <thead>
                                <tr className="bg-gray-100">
                                  <th className="border border-gray-300 p-2 text-left">Description</th>
                                  <th className="border border-gray-300 p-2 text-left">Ordered</th>
                                  <th className="border border-gray-300 p-2 text-left">Received</th>
                                  <th className="border border-gray-300 p-2 text-left">Unit</th>
                                  <th className="border border-gray-300 p-2 text-left">Original Unit Cost</th>
                                  <th className="border border-gray-300 p-2 text-left">Receiving Cost Per Unit</th>
                                  <th className="border border-gray-300 p-2 text-left">New Unit Cost</th>
                                  <th className="border border-gray-300 p-2 text-left">Total Cost with Receiving</th>
                                  <th className="border border-gray-300 p-2 text-left">Batch #</th>
                                  <th className="border border-gray-300 p-2 text-left">Expiry</th>
                                  <th className="border border-gray-300 p-2 text-left">Remarks</th>
                                  <th className="border border-gray-300 p-2 text-left">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {distributeReceivingCosts(grnData.items, grnData.receivingCosts).map((item) => (
                                  <tr key={item.id}>
                                    <td className="border border-gray-300 p-2">
                                      <Input
                                        value={item.description}
                                        onChange={(e) => setGrnData(prev => ({
                                          ...prev,
                                          items: prev.items.map(i => 
                                            i.id === item.id ? { ...i, description: e.target.value } : i
                                          )
                                        }))}
                                        className="p-1 h-8 text-sm w-full"
                                      />
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                      <Input
                                        type="number"
                                        value={item.orderedQuantity}
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
                                        value={item.receivedQuantity}
                                        onChange={(e) => setGrnData(prev => ({
                                          ...prev,
                                          items: prev.items.map(i => 
                                            i.id === item.id ? { ...i, receivedQuantity: parseInt(e.target.value) || 0 } : i
                                          )
                                        }))}
                                        className="p-1 h-8 text-sm w-full"
                                      />
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                      <Input
                                        value={item.unit}
                                        onChange={(e) => setGrnData(prev => ({
                                          ...prev,
                                          items: prev.items.map(i => 
                                            i.id === item.id ? { ...i, unit: e.target.value } : i
                                          )
                                        }))}
                                        className="p-1 h-8 text-sm w-full"
                                      />
                                    </td>
                                    <td className="border border-gray-300 p-2">
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
                                        className="p-1 h-8 text-sm w-full"
                                      />
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
                                      <Input
                                        value={item.remarks}
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
                          <div className="flex justify-between items-center mt-2">
                            <Button 
                              onClick={handleAddGRNItem}
                              variant="outline"
                              size="sm"
                              className="mt-2"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add Item
                            </Button>
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
                          
                          <div>
                            <div className="font-bold mb-2">Received Location</div>
                            <div className="text-sm space-y-2">
                              <div>
                                <Input 
                                  value={grnData.receivedLocation || ""}
                                  onChange={(e) => setGrnData(prev => ({ ...prev, receivedLocation: e.target.value }))}
                                  className="w-full h-6 p-1 text-sm mt-1"
                                  placeholder="Enter location"
                                />
                              </div>
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
                            <h4 className="font-bold">TO:</h4>
                            <Input 
                              value={deliveryNoteData.customerName}
                              onChange={(e) => handleDeliveryNoteChange("customerName", e.target.value)}
                              className="w-full h-6 p-1 text-sm mb-1"
                            />
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
                            <div className="text-sm font-medium">Delivery Date:</div>
                            <Input
                              value={deliveryNoteData.deliveryDate || ""}
                              onChange={(e) => handleDeliveryNoteChange("deliveryDate", e.target.value)}
                              className="text-sm p-1 h-6"
                            />
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
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-gray-300 text-sm">
                              <thead>
                                <tr className="bg-gray-100">
                                  <th className="border border-gray-300 p-2 text-left">Item Description</th>
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
                                    <td className="border border-gray-300 p-2">
                                      <div className="relative">
                                        <Input
                                          value={item.description}
                                          onChange={(e) => {
                                            handleItemChange(item.id, 'description', e.target.value);
                                          }}
                                          onFocus={async (e) => {
                                            // Load GRN items map when the input is focused
                                            const itemsMap = await getAllGRNItems();
                                            setDeliveryNoteGRNItemsMap(itemsMap);
                                            setDeliveryNoteGRNDescriptions(Array.from(itemsMap.keys()));
                                            setShowDeliveryNoteDropdown(true);
                                          }}
                                          onBlur={() => {
                                            // Delay hiding the dropdown to allow click events to register
                                            setTimeout(() => setShowDeliveryNoteDropdown(false), 150);
                                          }}
                                          className="p-1 h-8 text-sm w-full"
                                          placeholder="Select or enter description..."
                                        />
                                        {deliveryNoteGRNDescriptions.length > 0 && showDeliveryNoteDropdown && (
                                          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                            {deliveryNoteGRNDescriptions
                                              .filter(desc => 
                                                item.description === "" || desc.toLowerCase().includes(item.description.toLowerCase())
                                              )
                                              .map((desc, idx) => (
                                                <div
                                                  key={idx}
                                                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                                                  onMouseDown={() => {
                                                    handleItemChange(item.id, 'description', desc);
                                                    // Set the rate and unit from the GRN if available
                                                    const itemDataFromGRN = deliveryNoteGRNItemsMap.get(desc);
                                                    if (itemDataFromGRN) {
                                                      handleItemChange(item.id, 'rate', itemDataFromGRN.rate);
                                                      handleItemChange(item.id, 'unit', itemDataFromGRN.unit);

                                                    }
                                                    setShowDeliveryNoteDropdown(false);
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
                                        onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                        className="p-1 h-8 text-sm w-full"
                                      />
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
                            <h4 className="font-bold mb-2">Prepared By</h4>
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
                                <Input 
                                  value={deliveryNoteData.preparedByDate}
                                  onChange={(e) => handleDeliveryNoteChange("preparedByDate", e.target.value)}
                                  className="w-full h-6 p-1 text-sm mt-1"
                                />
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
                                <Input 
                                  value={deliveryNoteData.driverDate}
                                  onChange={(e) => handleDeliveryNoteChange("driverDate", e.target.value)}
                                  className="w-full h-6 p-1 text-sm mt-1"
                                />
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
                                <Input 
                                  value={deliveryNoteData.receivedByDate}
                                  onChange={(e) => handleDeliveryNoteChange("receivedByDate", e.target.value)}
                                  className="w-full h-6 p-1 text-sm mt-1"
                                />
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
                  // Save to saved deliveries
                  alert('Delivery note saved to saved deliveries!');
                  closeDeliveryNoteOptionsDialog();
                  resetDeliveryNoteData();
                }}
                className="w-full flex items-center justify-start"
                variant="outline"
              >
                <Save className="h-4 w-4 mr-2" />
                Save to Saved Deliveries
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
                  // Print functionality for GRN
                  // Create a print-friendly version of the GRN
                  const grnContent = generateCleanGRNHTML();
                  
                  // Create a temporary window for printing
                  const printWindow = window.open('', '_blank', 'width=800,height=600');
                  if (printWindow) {
                    printWindow.document.write(`
                      <!DOCTYPE html>
                      <html>
                      <head>
                        <title>Goods Received Note</title>
                        <style>
                          body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
                          .grn-container { max-width: 800px; margin: 0 auto; padding: 20px; border: 1px solid #ccc; }
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
                        ${grnContent}
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
                    alert('Please enable popups for this site to print the GRN');
                  }
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
                  // Download functionality for GRN
                  downloadGRNAsPDF();
                  closeGRNOptionsDialog();
                  
                  // Reset form after action
                  resetGRNData();
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
    </div>
  );
};

export default Templates;