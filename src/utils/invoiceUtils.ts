import { supabase } from '@/lib/supabaseClient';

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
  businessName?: string;
  businessAddress?: string;
  businessPhone?: string;
  amountPaid?: number;
  creditBroughtForward?: number;
  amountDue?: number;
}

export const saveInvoice = async (invoice: InvoiceData): Promise<void> => {
  try {
    // First, save to localStorage for immediate availability
    const savedInvoices = await getSavedInvoices();
    const updatedInvoices = [...savedInvoices, invoice];
    localStorage.setItem(SAVED_INVOICES_KEY, JSON.stringify(updatedInvoices));
    
    // Then save to database with user context
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase
        .from('saved_invoices')
        .insert({
          user_id: user.id,
          invoice_number: invoice.invoiceNumber,
          date: invoice.date,
          customer: invoice.customer,
          items: invoice.items,
          total: invoice.total,
          payment_method: invoice.paymentMethod,
          status: invoice.status,
          items_list: invoice.itemsList,
          subtotal: invoice.subtotal,
          tax: invoice.tax,
          discount: invoice.discount,
          amount_received: invoice.amountReceived,
          change: invoice.change,
          amount_paid: invoice.amountPaid,
          credit_brought_forward: invoice.creditBroughtForward,
          amount_due: invoice.amountDue
        });
        
      if (error) {
        console.error('Error saving invoice to database:', error);
        // Don't throw error - still have local storage backup
      }
    }
  } catch (error) {
    console.error('Error saving invoice:', error);
    throw new Error('Failed to save invoice');
  }
};

export const getSavedInvoices = async (): Promise<InvoiceData[]> => {
  try {
    // First, try to get from database
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Check if user is admin to determine query scope
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      
      let query = supabase.from('saved_invoices').select('*');
      
      // Admins can see all invoices, others see only their own
      if (userData?.role !== 'admin') {
        query = query.eq('user_id', user.id);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error retrieving saved invoices from database:', error);
        // Fallback to localStorage
        const saved = localStorage.getItem(SAVED_INVOICES_KEY);
        return saved ? JSON.parse(saved) : [];
      }
      
      // Transform database records to InvoiceData format
      return data.map(dbInvoice => ({
        id: dbInvoice.id,
        invoiceNumber: dbInvoice.invoice_number,
        date: dbInvoice.date,
        customer: dbInvoice.customer,
        items: dbInvoice.items,
        total: dbInvoice.total,
        paymentMethod: dbInvoice.payment_method,
        status: dbInvoice.status,
        itemsList: dbInvoice.items_list,
        subtotal: dbInvoice.subtotal,
        tax: dbInvoice.tax,
        discount: dbInvoice.discount,
        amountReceived: dbInvoice.amount_received,
        change: dbInvoice.change,
        amountPaid: dbInvoice.amount_paid,
        creditBroughtForward: dbInvoice.credit_brought_forward,
        amountDue: dbInvoice.amount_due
      }));
    } else {
      // If not authenticated, use localStorage
      const saved = localStorage.getItem(SAVED_INVOICES_KEY);
      return saved ? JSON.parse(saved) : [];
    }
  } catch (error) {
    console.error('Error retrieving saved invoices:', error);
    return [];
  }
};

export const deleteInvoice = async (invoiceId: string): Promise<void> => {
  try {
    const savedInvoices = await getSavedInvoices();
    const updatedInvoices = savedInvoices.filter(invoice => invoice.id !== invoiceId);
    localStorage.setItem(SAVED_INVOICES_KEY, JSON.stringify(updatedInvoices));
    
    // Also delete from database
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Check if user is admin to determine delete scope
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      
      let query = supabase.from('saved_invoices').delete();
      
      // Admins can delete any invoice, others can only delete their own
      if (userData?.role !== 'admin') {
        query = query.eq('user_id', user.id);
      }
      
      const { error } = await query.eq('id', invoiceId);
        
      if (error) {
        console.error('Error deleting invoice from database:', error);
        // Don't throw error - still have local storage backup
      }
    }
  } catch (error) {
    console.error('Error deleting invoice:', error);
    throw new Error('Failed to delete invoice');
  }
};

export const updateInvoice = async (updatedInvoice: InvoiceData): Promise<void> => {
  try {
    const savedInvoices = await getSavedInvoices();
    const updatedInvoices = savedInvoices.map(invoice => 
      invoice.id === updatedInvoice.id ? updatedInvoice : invoice
    );
    localStorage.setItem(SAVED_INVOICES_KEY, JSON.stringify(updatedInvoices));
    
    // Also update in database
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Check if user is admin to determine update scope
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      
      let query = supabase.from('saved_invoices').update({
        invoice_number: updatedInvoice.invoiceNumber,
        date: updatedInvoice.date,
        customer: updatedInvoice.customer,
        items: updatedInvoice.items,
        total: updatedInvoice.total,
        payment_method: updatedInvoice.paymentMethod,
        status: updatedInvoice.status,
        items_list: updatedInvoice.itemsList,
        subtotal: updatedInvoice.subtotal,
        tax: updatedInvoice.tax,
        discount: updatedInvoice.discount,
        amount_received: updatedInvoice.amountReceived,
        change: updatedInvoice.change,
        amount_paid: updatedInvoice.amountPaid,
        credit_brought_forward: updatedInvoice.creditBroughtForward,
        amount_due: updatedInvoice.amountDue
      });
      
      // Admins can update any invoice, others can only update their own
      if (userData?.role !== 'admin') {
        query = query.eq('user_id', user.id);
      }
      
      const { error } = await query.eq('id', updatedInvoice.id);
        
      if (error) {
        console.error('Error updating invoice in database:', error);
        // Don't throw error - still have local storage backup
      }
    }
  } catch (error) {
    console.error('Error updating invoice:', error);
    throw new Error('Failed to update invoice');
  }
};

export const getInvoiceById = async (invoiceId: string): Promise<InvoiceData | undefined> => {
  try {
    const savedInvoices = await getSavedInvoices();
    return savedInvoices.find(invoice => invoice.id === invoiceId);
  } catch (error) {
    console.error('Error retrieving invoice by ID:', error);
    return undefined;
  }
};