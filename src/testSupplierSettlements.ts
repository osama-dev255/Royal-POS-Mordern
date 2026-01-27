// Test script to add sample supplier settlements to localStorage for testing
const sampleSettlements = [
  {
    id: "1",
    supplierName: "ABC Suppliers Ltd",
    supplierId: "sup-001",
    supplierPhone: "+255 700 000 001",
    supplierEmail: "info@abcsuppliers.co.tz",
    referenceNumber: "SUP-SET-1706400001",
    settlementAmount: 500000,
    paymentMethod: "Cash",
    processedBy: "admin@example.com",
    poNumber: "PO-20260127-001",
    previousBalance: 750000,
    amountPaid: 500000,
    newBalance: 250000,
    notes: "Monthly settlement for January 2026",
    date: "2026-01-27",
    time: "10:30:00",
    status: "completed"
  },
  {
    id: "2",
    supplierName: "XYZ Trading Company",
    supplierId: "sup-002",
    supplierPhone: "+255 700 000 002",
    supplierEmail: "accounts@xyztrading.co.tz",
    referenceNumber: "SUP-SET-1706400002",
    settlementAmount: 1200000,
    paymentMethod: "Bank Transfer",
    processedBy: "manager@example.com",
    poNumber: "PO-20260127-002",
    previousBalance: 1500000,
    amountPaid: 1200000,
    newBalance: 300000,
    notes: "Settlement for outstanding invoices",
    date: "2026-01-27",
    time: "14:15:00",
    status: "completed"
  }
];

// Save to localStorage
localStorage.setItem('savedSupplierSettlements', JSON.stringify(sampleSettlements));
console.log("Sample supplier settlements added to localStorage");