import { SavedInvoice } from "@/components/SavedInvoicesCard";

const SAVED_INVOICES_KEY = 'savedInvoices';

export interface InvoiceData {
  id: string;
  invoiceNumber: string;
  date: string;
  customer: string;
  items: number;
  total: number;
  paymentMethod: string;
  status: "completed" | "pending" | "cancelled" | "refunded";
  itemsList?: any[];
  subtotal?: number;
  tax?: number;
  discount?: number;
  amountReceived?: number;
  change?: number;
}

export const saveInvoice = (invoice: InvoiceData): void => {
  try {
    const savedInvoices = getSavedInvoices();
    // Add the new invoice to the list
    const updatedInvoices = [...savedInvoices, invoice];
    localStorage.setItem(SAVED_INVOICES_KEY, JSON.stringify(updatedInvoices));
  } catch (error) {
    console.error('Error saving invoice:', error);
    throw new Error('Failed to save invoice');
  }
};

export const getSavedInvoices = (): InvoiceData[] => {
  try {
    const saved = localStorage.getItem(SAVED_INVOICES_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('Error retrieving saved invoices:', error);
    return [];
  }
};

export const deleteInvoice = (invoiceId: string): void => {
  try {
    const savedInvoices = getSavedInvoices();
    const updatedInvoices = savedInvoices.filter(invoice => invoice.id !== invoiceId);
    localStorage.setItem(SAVED_INVOICES_KEY, JSON.stringify(updatedInvoices));
  } catch (error) {
    console.error('Error deleting invoice:', error);
    throw new Error('Failed to delete invoice');
  }
};

export const updateInvoice = (updatedInvoice: InvoiceData): void => {
  try {
    const savedInvoices = getSavedInvoices();
    const updatedInvoices = savedInvoices.map(invoice => 
      invoice.id === updatedInvoice.id ? updatedInvoice : invoice
    );
    localStorage.setItem(SAVED_INVOICES_KEY, JSON.stringify(updatedInvoices));
  } catch (error) {
    console.error('Error updating invoice:', error);
    throw new Error('Failed to update invoice');
  }
};

export const getInvoiceById = (invoiceId: string): InvoiceData | undefined => {
  try {
    const savedInvoices = getSavedInvoices();
    return savedInvoices.find(invoice => invoice.id === invoiceId);
  } catch (error) {
    console.error('Error retrieving invoice by ID:', error);
    return undefined;
  }
};