import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  ExternalLink
} from "lucide-react";
import { getTemplateConfig, saveTemplateConfig, ReceiptTemplateConfig } from "@/utils/templateUtils";
import { PrintUtils } from "@/utils/printUtils";

interface Template {
  id: string;
  name: string;
  type: "delivery-note" | "order-form" | "contract" | "invoice" | "receipt" | "notice" | "quotation" | "report" | "salary-slip" | "complimentary-goods" | "expense-voucher";
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
}

interface SavedDeliveryNote {
  id: string;
  name: string;
  data: DeliveryNoteData;
  createdAt: string;
  updatedAt: string;
}

// Purchase Order Item interface with unit field
interface PurchaseOrderItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
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

interface TemplatesProps {
  onBack?: () => void;
}

export const Templates = ({ onBack }: TemplatesProps) => {
  const [activeTab, setActiveTab] = useState<"manage" | "customize" | "preview">("manage");
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
    }
  ]);
  
  const [deliveryNoteData, setDeliveryNoteData] = useState<DeliveryNoteData>({
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
      { id: "1", description: "Sample Product 1", quantity: 10, unit: "pcs", delivered: 10, remarks: "Good condition" },
      { id: "2", description: "Sample Product 2", quantity: 5, unit: "boxes", delivered: 5, remarks: "Fragile" },
      { id: "3", description: "Sample Product 3", quantity: 2, unit: "units", delivered: 2, remarks: "" }
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
    receivedByDate: ""
  });
  
  const [savedDeliveryNotes, setSavedDeliveryNotes] = useState<SavedDeliveryNote[]>(() => {
    const saved = localStorage.getItem('savedDeliveryNotes');
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
    };

    // Add event listener for storage changes
    window.addEventListener('storage', handleStorageChange);
    
    // Cleanup
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const [deliveryNoteName, setDeliveryNoteName] = useState<string>("");
  
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
    authorizationDate: ""
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
    terms: "Net 30",
    notes: "Thank you for your business! Payment due within 30 days.",
    paymentOptions: "Bank Transfer, Check, or Credit Card",
    checkPayableMessage: "Please make checks payable to Your Business Name",
    timestamp: new Date().toLocaleString()
  };
  
  const [invoiceData, setInvoiceData] = useState<InvoiceData>(initialInvoiceData);
  
  const [showInvoiceOptions, setShowInvoiceOptions] = useState(false);
  
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
    notes: "All receipts attached."
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
    paymentMethod: "Direct Deposit"
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
    if (template && (template.type === "delivery-note" || template.type === "order-form" || template.type === "invoice" || template.type === "expense-voucher" || template.type === "salary-slip" || template.type === "complimentary-goods")) {
      setViewingTemplate(templateId);
      setActiveTab("preview");
    } else {
      handlePrintPreview(templateId);
    }
  };

  const handleSaveTemplate = () => {
    // Save template logic would go here
    console.log("Saving template:", selectedTemplate);
    // Reset after save
    setSelectedTemplate(null);
    setViewingTemplate(null);
    setActiveTab("manage");
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
      items: prev.items.map(item => 
        item.id === itemId ? { ...item, [field]: value } : item
      )
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
  const handleSaveDeliveryNote = () => {
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
  const handlePurchaseOrderChange = (field: keyof PurchaseOrderData, value: string | number) => {
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
            if (field === 'quantity') {
              updatedItem.amount = Number(value) * updatedItem.rate;
            } else if (field === 'rate') {
              updatedItem.amount = updatedItem.quantity * Number(value);
            }
          }
          
          return updatedItem;
        }
        return item;
      });
      
      // Calculate new totals
      const subtotal = updatedItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const total = subtotal + Number(prev.tax || 0) - Number(prev.discount || 0);
      const amountDue = total - Number(prev.amountPaid || 0);
      
      return {
        ...prev,
        items: updatedItems,
        subtotal,
        total,
        amountDue
      };
    });
  };
  
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
  
  // Handle print invoice - generate PDF and print
  const handlePrintInvoice = () => {
    // Import jsPDF and html2pdf dynamically
    Promise.all([
      import('jspdf'),
      import('html2pdf.js')
    ]).then(([jsPDFModule, html2pdfModule]) => {
      const doc = new jsPDFModule.jsPDF();
      
      // Add content to PDF
      const content = document.getElementById('template-preview-content');
      if (content) {
        const element = content;
        const opt = {
          margin: 5,
          filename: `Invoice_${invoiceData.invoiceNumber}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        
        html2pdfModule.default(element, opt).then(() => {
          // After PDF is generated, print it
          const pdfBlob = new Blob([doc.output('blob')], { type: 'application/pdf' });
          const pdfUrl = URL.createObjectURL(pdfBlob);
          
          const printWindow = window.open(pdfUrl);
          if (printWindow) {
            printWindow.onload = () => {
              printWindow.print();
            };
          }
        });
      }
    }).catch(err => {
      console.error('Error generating PDF:', err);
      alert('Error generating PDF. Please try again.');
    });
    
    closeInvoiceOptionsDialog();
  };
  
  // Handle download invoice as PDF
  const handleDownloadInvoice = () => {
    // Import jsPDF and html2pdf dynamically
    Promise.all([
      import('jspdf'),
      import('html2pdf.js')
    ]).then(([jsPDFModule, html2pdfModule]) => {
      const content = document.getElementById('template-preview-content');
      if (content) {
        const element = content;
        const opt = {
          margin: 5,
          filename: `Invoice_${invoiceData.invoiceNumber}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        
        html2pdfModule.default(element, opt);
      }
    }).catch(err => {
      console.error('Error generating PDF:', err);
      alert('Error generating PDF. Please try again.');
    });
    
    closeInvoiceOptionsDialog();
  };
  
  // Handle share invoice - copy invoice details to clipboard
  const handleShareInvoice = () => {
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
    
    closeInvoiceOptionsDialog();
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
          `TSH ${item.rate.toFixed(2)}`, 
          `TSH ${item.amount.toFixed(2)}`
        ]),
        [],
        ['SUBTOTAL', `TSH ${calculateInvoiceTotals().subtotal.toFixed(2)}`],
        ['DISCOUNT', `TSH ${invoiceData.discount.toFixed(2)}`],
        ['TAX', `TSH ${invoiceData.tax.toFixed(2)}`],
        ['TOTAL', `TSH ${calculateInvoiceTotals().total.toFixed(2)}`],
        ['AMOUNT DUE', `TSH ${calculateInvoiceTotals().amountDue.toFixed(2)}`]
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
    const amountDue = total - Number(invoiceData.amountPaid || 0);
    
    return { subtotal, total, amountDue };
  };
  
  // Update totals when invoice data changes
  useEffect(() => {
    // Recalculate totals when items, tax, or discount change
    const newSubtotal = invoiceData.items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const newTotal = newSubtotal + Number(invoiceData.tax || 0) - Number(invoiceData.discount || 0);
    const newAmountDue = newTotal - Number(invoiceData.amountPaid || 0);
    
    setInvoiceData(prev => ({
      ...prev,
      subtotal: newSubtotal,
      total: newTotal,
      amountDue: newAmountDue
    }));
  }, [invoiceData.items, invoiceData.tax, invoiceData.discount, invoiceData.amountPaid]);
  
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
            ) : activeTab === "preview" ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">
                    {currentTemplate?.type === "order-form" ? "Purchase Order Preview" : currentTemplate?.type === "invoice" ? "Invoice Preview" : currentTemplate?.type === "expense-voucher" ? "Expense Voucher Preview" : currentTemplate?.type === "salary-slip" ? "Salary Slip Preview" : currentTemplate?.type === "complimentary-goods" ? "Complimentary Goods Preview" : "Delivery Note Preview"}
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
                    ) : (
                      <Input
                        type="text"
                        placeholder="Delivery Note Name"
                        value={deliveryNoteName}
                        onChange={(e) => setDeliveryNoteName(e.target.value)}
                        className="w-48 h-10"
                      />
                    )}
                    <Button onClick={() => {
                      if (currentTemplate?.type === "order-form") {
                        alert(`Purchase Order ${purchaseOrderData.poNumber} saved successfully!`);
                      } else if (currentTemplate?.type === "invoice") {
                        // Show dialog with print, download, share, or export options
                        showInvoiceOptionsDialog();
                      } else if (currentTemplate?.type === "salary-slip") {
                        alert(`Salary Slip for ${salarySlipData.employeeName} saved successfully!`);
                      } else if (currentTemplate?.type === "complimentary-goods") {
                        alert(`Complimentary Goods Voucher ${complimentaryGoodsData.voucherNumber} saved successfully!`);
                      } else {
                        handleSaveDeliveryNote();
                      }
                    }}>
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                    <Button variant="outline" onClick={() => setActiveTab("manage")}>
                      Back to Templates
                    </Button>
                    {currentTemplate?.type !== "invoice" && (
                      <>
                        <Button onClick={() => {
                          if (currentTemplate?.type === "order-form") {
                            window.print();
                          } else if (currentTemplate?.type === "salary-slip") {
                            window.print();
                          } else if (currentTemplate?.type === "complimentary-goods") {
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
                            <div className="text-sm font-bold mb-4">{purchaseOrderData.poNumber}</div>
                            
                            <div className="font-bold mb-1">FROM:</div>
                            <div className="text-sm mb-1">{purchaseOrderData.businessName}</div>
                            <div className="text-sm mb-1">{purchaseOrderData.businessAddress}</div>
                            <div className="flex items-center gap-2 text-sm mt-1">
                              <span>Phone:</span>
                              <span>{purchaseOrderData.businessPhone}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm mt-1">
                              <span>Contact:</span>
                              <span>{purchaseOrderData.businessEmail}</span>
                            </div>
                          </div>
                          
                          <div>
                            <div className="h-8 mb-4"></div>
                            
                            <div className="font-bold mb-1">TO (Supplier):</div>
                            <div className="text-sm mb-1">{purchaseOrderData.supplierName}</div>
                            <div className="text-sm mb-1">{purchaseOrderData.supplierAddress}</div>
                            <div className="flex items-center gap-2 text-sm mt-1">
                              <span>Phone:</span>
                              <span>{purchaseOrderData.supplierPhone}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm mt-1">
                              <span>Contact:</span>
                              <span>{purchaseOrderData.supplierEmail}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Document Details */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <div className="text-sm font-medium">DATE</div>
                            <div className="text-sm">{purchaseOrderData.date}</div>
                          </div>
                          <div>
                            <div className="text-sm font-medium">REQUIRED BY</div>
                            <div className="text-sm">{purchaseOrderData.expectedDelivery || "_________"}</div>
                          </div>
                          <div>
                            <div className="text-sm font-medium">PAYMENT TERMS</div>
                            <div className="text-sm">{purchaseOrderData.paymentTerms}</div>
                          </div>
                          <div>
                            <div className="text-sm font-medium">SHIP VIA</div>
                            <div className="text-sm">{purchaseOrderData.deliveryInstructions}</div>
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
                                </tr>
                              </thead>
                              <tbody>
                                {purchaseOrderData.items.map((item, index) => (
                                  <tr key={item.id}>
                                    <td className="border border-gray-300 p-2">
                                      ITM-{String(index + 1).padStart(3, '0')}
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
                                    <td className="border border-gray-300 p-2">
                                      {item.unitPrice.toFixed(2)}
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                      {item.total.toFixed(2)}
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
                            <span>${calculatePurchaseOrderTotals().subtotal.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="font-bold">TAX (8.5%)</span>
                            <span>${calculatePurchaseOrderTotals().tax.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="font-bold">SHIPPING</span>
                            <span>${purchaseOrderData.shipping.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm pt-2 border-t border-gray-300">
                            <span className="font-bold">TOTAL</span>
                            <span className="font-bold">${calculatePurchaseOrderTotals().total.toFixed(2)}</span>
                          </div>
                        </div>
                        
                        {/* Instructions and Approval */}
                        <div className="space-y-4">
                          <div>
                            <div className="font-bold mb-2">SPECIAL INSTRUCTIONS:</div>
                            <div className="text-sm min-h-[40px]">
                              {purchaseOrderData.notes}
                            </div>
                          </div>
                          
                          <div>
                            <div className="font-bold mb-2">APPROVAL:</div>
                            <div className="text-sm min-h-[40px]">
                              {purchaseOrderData.authorizedBySignature}
                            </div>
                          </div>
                        </div>
                        
                        {/* Signatures */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                          <div>
                            <div className="font-bold mb-2">REQUESTED BY</div>
                            <div className="text-sm space-y-2">
                              <div className="border-t border-black pt-1 mt-8">
                                <div className="text-xs">Name & Title</div>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="font-bold mb-2">APPROVED BY</div>
                            <div className="text-sm space-y-2">
                              <div className="border-t border-black pt-1 mt-8">
                                <div className="text-xs">Name & Title</div>
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
                          <div className="text-2xl font-bold text-red-600 mt-1">TSH {invoiceData.amountDue.toFixed(2)}</div>
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
                                      <Input
                                        value={item.description}
                                        onChange={(e) => handleInvoiceItemChange(item.id, 'description', e.target.value)}
                                        className="p-1 h-8 text-sm"
                                      />
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                      <Input
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => {
                                          const newQuantity = parseFloat(e.target.value);
                                          handleInvoiceItemChange(item.id, 'quantity', newQuantity);
                                          // Update amount when quantity changes
                                          handleInvoiceItemChange(item.id, 'amount', newQuantity * item.rate);
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
                                          // Update amount when rate changes
                                          handleInvoiceItemChange(item.id, 'amount', item.quantity * newRate);
                                        }}
                                        className="p-1 h-8 text-sm"
                                      />
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                      TSH {item.amount.toFixed(2)}
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
                            <span>TSH {calculateInvoiceTotals().subtotal.toFixed(2)}</span>
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
                            <span className="font-bold">TSH {calculateInvoiceTotals().total.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="font-bold">Amount Paid:</span>
                            <span>TSH {invoiceData.amountPaid.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm pt-2 border-t border-gray-300">
                            <span className="font-bold">AMOUNT DUE:</span>
                            <span className="font-bold text-red-600">TSH {calculateInvoiceTotals().amountDue.toFixed(2)}</span>
                          </div>
                        </div>
                        
                        {/* Footer Note */}
                        <div className="text-center text-sm mt-4 pt-4 border-t border-gray-300">
                          <div>{invoiceData.notes}</div>
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
                          <div className="text-xl font-bold mt-2">{expenseVoucherData.voucherNumber}</div>
                          <div className="text-sm mt-1">Date: {expenseVoucherData.date}</div>
                        </div>
                        
                        {/* Employee Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div>
                            <div className="font-bold mb-1">SUBMITTED BY:</div>
                            <div className="text-sm mb-1">{expenseVoucherData.submittedBy}</div>
                            <div className="text-sm mb-1">Employee ID: {expenseVoucherData.employeeId}</div>
                            <div className="text-sm mb-1">Department: {expenseVoucherData.department}</div>
                          </div>
                          
                          <div>
                            <div className="font-bold mb-1">APPROVAL:</div>
                            <div className="text-sm mb-1">Approved by: {expenseVoucherData.approvedBy}</div>
                            <div className="text-sm mb-1">Date: {expenseVoucherData.approvedDate}</div>
                          </div>
                        </div>
                        
                        {/* Purpose */}
                        <div>
                          <div className="font-bold mb-2">PURPOSE:</div>
                          <div className="text-sm min-h-[40px]">
                            {expenseVoucherData.purpose}
                          </div>
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
                                </tr>
                              </thead>
                              <tbody>
                                {expenseVoucherData.items.map((item) => (
                                  <tr key={item.id}>
                                    <td className="border border-gray-300 p-2">
                                      {item.date}
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                      {item.description}
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                      {item.category}
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                      ${item.amount.toFixed(2)}
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
                            <span className="font-bold">${calculateExpenseVoucherTotals().totalAmount.toFixed(2)}</span>
                          </div>
                        </div>
                        
                        {/* Notes */}
                        <div>
                          <div className="font-bold mb-2">NOTES:</div>
                          <div className="text-sm min-h-[40px]">
                            {expenseVoucherData.notes}
                          </div>
                        </div>
                        
                        {/* Signatures */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                          <div>
                            <div className="font-bold mb-2">SUBMITTED BY</div>
                            <div className="text-sm space-y-2">
                              <div className="border-t border-black pt-1 mt-8">
                                <div className="text-xs">Name & Signature</div>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="font-bold mb-2">APPROVED BY</div>
                            <div className="text-sm space-y-2">
                              <div className="border-t border-black pt-1 mt-8">
                                <div className="text-xs">Name & Signature</div>
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
                    ) : currentTemplate?.type === "salary-slip" ? (
                      // Salary Slip Content
                      <div className="space-y-6">
                        {/* Header */}
                        <div className="text-center">
                          <h2 className="text-2xl font-bold">SALARY SLIP</h2>
                          <div className="text-sm mt-1">Pay Period: {salarySlipData.payPeriod}</div>
                        </div>
                        
                        {/* Employee Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div>
                            <div className="font-bold mb-1">EMPLOYEE INFORMATION:</div>
                            <div className="text-sm mb-1">Name: {salarySlipData.employeeName}</div>
                            <div className="text-sm mb-1">Employee ID: {salarySlipData.employeeId}</div>
                            <div className="text-sm mb-1">Department: {salarySlipData.department}</div>
                            <div className="text-sm mb-1">Position: {salarySlipData.position}</div>
                          </div>
                          
                          <div>
                            <div className="font-bold mb-1">PAYMENT DETAILS:</div>
                            <div className="text-sm mb-1">Payment Method: {salarySlipData.paymentMethod}</div>
                            <div className="text-sm mb-1">Bank: {salarySlipData.bankName}</div>
                            <div className="text-sm mb-1">Account #: {salarySlipData.accountNumber}</div>
                            <div className="text-sm mb-1">Paid Date: {salarySlipData.paidDate}</div>
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
                                  <td className="border border-gray-300 p-2 text-right">${salarySlipData.basicSalary.toFixed(2)}</td>
                                </tr>
                                <tr>
                                  <td className="border border-gray-300 p-2">Allowances</td>
                                  <td className="border border-gray-300 p-2 text-right">${salarySlipData.allowances.toFixed(2)}</td>
                                </tr>
                                <tr>
                                  <td className="border border-gray-300 p-2">Overtime</td>
                                  <td className="border border-gray-300 p-2 text-right">${salarySlipData.overtime.toFixed(2)}</td>
                                </tr>
                                <tr>
                                  <td className="border border-gray-300 p-2">Bonus</td>
                                  <td className="border border-gray-300 p-2 text-right">${salarySlipData.bonus.toFixed(2)}</td>
                                </tr>
                                <tr className="bg-gray-50 font-bold">
                                  <td className="border border-gray-300 p-2">Gross Pay</td>
                                  <td className="border border-gray-300 p-2 text-right">${calculateSalarySlipTotals().grossPay.toFixed(2)}</td>
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
                                  <td className="border border-gray-300 p-2 text-right">${salarySlipData.tax.toFixed(2)}</td>
                                </tr>
                                <tr>
                                  <td className="border border-gray-300 p-2">Insurance</td>
                                  <td className="border border-gray-300 p-2 text-right">${salarySlipData.insurance.toFixed(2)}</td>
                                </tr>
                                <tr>
                                  <td className="border border-gray-300 p-2">Other Deductions</td>
                                  <td className="border border-gray-300 p-2 text-right">${salarySlipData.otherDeductions.toFixed(2)}</td>
                                </tr>
                                <tr className="bg-gray-50 font-bold">
                                  <td className="border border-gray-300 p-2">Total Deductions</td>
                                  <td className="border border-gray-300 p-2 text-right">${calculateSalarySlipTotals().totalDeductions.toFixed(2)}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                        
                        {/* Net Pay */}
                        <div className="grid grid-cols-1 gap-2 max-w-xs ml-auto">
                          <div className="flex justify-between text-lg pt-2 border-t border-gray-300">
                            <span className="font-bold">NET PAY:</span>
                            <span className="font-bold text-green-600">${calculateSalarySlipTotals().netPay.toFixed(2)}</span>
                          </div>
                        </div>
                        
                        {/* Signatures */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                          <div>
                            <div className="font-bold mb-2">EMPLOYEE SIGNATURE</div>
                            <div className="text-sm space-y-2">
                              <div className="border-t border-black pt-1 mt-8">
                                <div className="text-xs">Name & Signature</div>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="font-bold mb-2">MANAGER APPROVAL</div>
                            <div className="text-sm space-y-2">
                              <div className="border-t border-black pt-1 mt-8">
                                <div className="text-xs">Name & Signature</div>
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
                    ) : currentTemplate?.type === "complimentary-goods" ? (
                      // Complimentary Goods Content
                      <div className="space-y-6">
                        {/* Header */}
                        <div className="text-center">
                          <h2 className="text-2xl font-bold">COMPLIMENTARY GOODS VOUCHER</h2>
                          <div className="text-sm mt-1">Voucher #{complimentaryGoodsData.voucherNumber}</div>
                          <div className="text-sm mt-1">Date: {complimentaryGoodsData.date}</div>
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
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                            <div className="text-sm">{deliveryNoteData.deliveryDate || "_________"}</div>
                          </div>
                          <div>
                            <div className="text-sm font-medium">Vehicle #:</div>
                            <div className="text-sm">{deliveryNoteData.vehicle || "_________"}</div>
                          </div>
                          <div>
                            <div className="text-sm font-medium">Driver:</div>
                            <div className="text-sm">{deliveryNoteData.driver || "_________"}</div>
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
                                  <th className="border border-gray-300 p-2 text-left">Delivered</th>
                                  <th className="border border-gray-300 p-2 text-left">Remarks</th>
                                </tr>
                              </thead>
                              <tbody>
                                {deliveryNoteData.items.map((item) => (
                                  <tr key={item.id}>
                                    <td className="border border-gray-300 p-2">{item.description}</td>
                                    <td className="border border-gray-300 p-2">{item.quantity}</td>
                                    <td className="border border-gray-300 p-2">{item.unit}</td>
                                    <td className="border border-gray-300 p-2">{item.delivered}</td>
                                    <td className="border border-gray-300 p-2">{item.remarks}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                        
                        {/* Document Notes */}
                        <div>
                          <h4 className="font-bold mb-2">DELIVERY NOTES:</h4>
                          <div className="text-sm min-h-[80px]">
                            {deliveryNoteData.deliveryNotes}
                          </div>
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
                Export as PDF
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
    </div>
  );
};