import { supabase } from '@/lib/supabaseClient';

export interface ExpenseVoucherItem {
  id: string;
  description: string;
  category: string;
  subCategory: string;
  amount: number;
  date: string;
  vendorName: string;
  paymentMethod: string;
  expenseType: string;
  costClassification: string;
  taxDeductible: boolean;
}

export interface ExpenseVoucherData {
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
  preparedByName?: string;
  supplierTin?: string;
  supplierEmail?: string;
}

export interface SavedExpenseVoucher {
  id: string;
  voucher_number: string;
  date: string;
  vendor_name: string;
  vendor_contact: string;
  vendor_address: string;
  vendor_tin: string;
  vendor_email: string;
  purpose: string;
  items: ExpenseVoucherItem[];
  total_amount: number;
  notes: string;
  prepared_by_name: string;
  submitted_by_name: string;
  approved_by_name: string;
  signature_date: string;
  approved_date: string;
  status: string;
  outlet_id: string | null;
  created_at: string;
  updated_at: string;
  data?: ExpenseVoucherData;
}

const generateVoucherNumber = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `EV-${year}${month}${day}-${random}`;
};

export const saveExpenseVoucher = async (
  voucherData: ExpenseVoucherData
): Promise<{ success: boolean; id?: string; error?: string }> => {
  try {
    const totalAmount = voucherData.totalAmount || voucherData.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    const insertData = {
      voucher_number: voucherData.voucherNumber || generateVoucherNumber(),
      date: voucherData.date || new Date().toISOString().split('T')[0],
      vendor_name: voucherData.submittedBy || '',
      vendor_contact: voucherData.employeeId || '',
      vendor_address: voucherData.department || '',
      vendor_tin: voucherData.supplierTin || '',
      vendor_email: voucherData.supplierEmail || '',
      purpose: voucherData.purpose || '',
      items: voucherData.items || [],
      total_amount: totalAmount,
      notes: voucherData.notes || '',
      prepared_by_name: voucherData.preparedByName || '',
      prepared_by_signature: voucherData.submittedBySignature || null,
      submitted_by_name: voucherData.submittedBy || '',
      submitted_by_signature: voucherData.submittedBySignature || null,
      approved_by_name: voucherData.approvedBy || '',
      approved_by_signature: voucherData.approvedBySignature || null,
      signature_date: voucherData.signatureDate || null,
      approved_date: voucherData.approvedDate || null,
      status: 'completed',
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('saved_expense_vouchers')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('Error saving expense voucher:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data.id };
  } catch (err) {
    console.error('Error saving expense voucher:', err);
    return { success: false, error: 'Failed to save expense voucher' };
  }
};

export const getSavedExpenseVouchers = async (
  outletId?: string
): Promise<SavedExpenseVoucher[]> => {
  try {
    let query = supabase
      .from('saved_expense_vouchers')
      .select('*')
      .order('created_at', { ascending: false });

    if (outletId) {
      query = query.eq('outlet_id', outletId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching expense vouchers:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      voucher_number: row.voucher_number,
      date: row.date,
      vendor_name: row.vendor_name,
      vendor_contact: row.vendor_contact,
      vendor_address: row.vendor_address,
      vendor_tin: row.vendor_tin,
      vendor_email: row.vendor_email,
      purpose: row.purpose,
      items: Array.isArray(row.items) ? row.items : [],
      total_amount: row.total_amount,
      notes: row.notes,
      prepared_by_name: row.prepared_by_name,
      submitted_by_name: row.submitted_by_name,
      approved_by_name: row.approved_by_name,
      signature_date: row.signature_date,
      approved_date: row.approved_date,
      status: row.status,
      outlet_id: row.outlet_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      data: {
        voucherNumber: row.voucher_number,
        date: row.date,
        submittedBy: row.vendor_name || '',
        employeeId: row.vendor_contact || '',
        department: row.vendor_address || '',
        supplierTin: row.vendor_tin || '',
        supplierEmail: row.vendor_email || '',
        purpose: row.purpose || '',
        items: Array.isArray(row.items) ? row.items : [],
        totalAmount: row.total_amount || 0,
        notes: row.notes || '',
        preparedByName: row.prepared_by_name || '',
        approvedBy: row.approved_by_name || '',
        approvedDate: row.approved_date || '',
        signatureDate: row.signature_date || '',
        submittedBySignature: row.submitted_by_signature || '',
        approvedBySignature: row.approved_by_signature || ''
      }
    }));
  } catch (err) {
    console.error('Error fetching expense vouchers:', err);
    return [];
  }
};

export const deleteExpenseVoucher = async (id: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('saved_expense_vouchers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting expense voucher:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Error deleting expense voucher:', err);
    return { success: false, error: 'Failed to delete expense voucher' };
  }
};
