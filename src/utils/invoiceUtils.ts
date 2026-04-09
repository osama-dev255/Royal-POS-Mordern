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
  adjustments?: number;
  adjustmentReason?: string;
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
          amount_due: invoice.amountDue,
          adjustments: invoice.adjustments,
          adjustment_reason: invoice.adjustmentReason
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
        amountDue: dbInvoice.amount_due,
        adjustments: dbInvoice.adjustments,
        adjustmentReason: dbInvoice.adjustment_reason
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
    console.log('🔄 Starting invoice update...', updatedInvoice.id);
    
    const savedInvoices = await getSavedInvoices();
    const updatedInvoices = savedInvoices.map(invoice => 
      invoice.id === updatedInvoice.id ? updatedInvoice : invoice
    );
    localStorage.setItem(SAVED_INVOICES_KEY, JSON.stringify(updatedInvoices));
    
    // Also update in database
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      console.log('👤 User authenticated:', user.id);
      
      // Check if user is admin to determine update scope
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      
      console.log('📝 User role:', userData?.role);
      
      // Validate numeric fields to prevent NaN serialization errors
      const updateData = {
        invoice_number: updatedInvoice.invoiceNumber,
        date: updatedInvoice.date,
        customer: updatedInvoice.customer,
        items: updatedInvoice.items || 0,
        total: updatedInvoice.total || 0,
        payment_method: updatedInvoice.paymentMethod,
        status: updatedInvoice.status,
        items_list: updatedInvoice.itemsList,
        subtotal: updatedInvoice.subtotal || 0,
        tax: updatedInvoice.tax || 0,
        discount: updatedInvoice.discount || 0,
        amount_received: updatedInvoice.amountReceived || 0,
        change: updatedInvoice.change || 0,
        amount_paid: updatedInvoice.amountPaid || 0,
        credit_brought_forward: updatedInvoice.creditBroughtForward || 0,
        amount_due: updatedInvoice.amountDue || 0,
        adjustments: updatedInvoice.adjustments || 0,
        adjustment_reason: updatedInvoice.adjustmentReason
      };
      
      console.log('📦 Update data:', JSON.stringify(updateData, null, 2));
      
      let query = supabase.from('saved_invoices').update(updateData);
      
      // Admins can update any invoice, others can only update their own
      if (userData?.role !== 'admin') {
        query = query.eq('user_id', user.id);
        console.log('🔒 Non-admin user: filtering by user_id');
      } else {
        console.log('🔓 Admin user: can update any invoice');
      }
      
      const { error } = await query.eq('id', updatedInvoice.id);
        
      if (error) {
        console.error('❌ Error updating invoice in database:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw new Error(`Database update failed: ${error.message}`);
      } else {
        console.log('✅ Database update successful');
      }
    } else {
      console.warn('⚠️ No authenticated user found');
    }
  } catch (error) {
    console.error('❌ Error updating invoice:', error);
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