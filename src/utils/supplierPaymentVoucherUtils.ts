/**
 * Supplier Payment Voucher Utilities
 *
 * Manages the supplier_payment_vouchers table.
 * Records when a supplier collects payment for credited transactions.
 * On save, a trigger auto-creates a DR entry in supplier_ledger.
 */

import { supabase } from '@/lib/supabaseClient';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface LinkedReference {
  type: 'spn' | 'grn';
  id: string;
  number: string;
  amount: number;
}

export interface PaymentBreakdownEntry {
  method: string;
  amount: number;
  reference: string;
}

export interface SupplierPaymentVoucherData {
  id?: string;
  voucherNumber: string;
  date: string;
  supplierId: string;
  supplierName: string;
  supplierPhone: string;
  supplierEmail: string;
  supplierAddress: string;
  supplierTin: string;
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessTin: string;
  linkageMode: 'linked' | 'lump_sum';
  linkedReferences: LinkedReference[];
  paymentBreakdown: PaymentBreakdownEntry[];
  totalAmount: number;
  previousBalance: number;
  newBalance: number;
  notes: string;
  preparedBy: string;
  preparedDate: string;
  receivedBy: string;
  receivedDate: string;
  approvedBy: string;
  approvedDate: string;
  status: 'completed' | 'cancelled';
  outletId?: string;
  createdAt?: string;
}

export interface SavedSupplierPaymentVoucher {
  id: string;
  voucherNumber: string;
  date: string;
  supplierId: string;
  supplierName: string;
  supplierPhone: string;
  supplierEmail: string;
  supplierAddress: string;
  supplierTin: string;
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessTin: string;
  linkageMode: 'linked' | 'lump_sum';
  linkedReferences: LinkedReference[];
  paymentBreakdown: PaymentBreakdownEntry[];
  totalAmount: number;
  previousBalance: number;
  newBalance: number;
  notes: string;
  preparedBy: string;
  preparedDate: string;
  receivedBy: string;
  receivedDate: string;
  approvedBy: string;
  approvedDate: string;
  status: 'completed' | 'cancelled';
  outletId: string;
  createdAt: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

export const generateVoucherNumber = (): string => {
  const timestamp = Date.now();
  return `SPV-${String(timestamp).slice(-6)}`;
};

// ── CRUD ───────────────────────────────────────────────────────────────────────

/**
 * Save a new supplier payment voucher to the database.
 * The DB trigger will auto-create the DR entry in supplier_ledger.
 */
export const saveSupplierPaymentVoucher = async (
  data: SupplierPaymentVoucherData
): Promise<{ success: boolean; id?: string; error?: string }> => {
  try {
    const insertData = {
      voucher_number: data.voucherNumber || generateVoucherNumber(),
      date: data.date || new Date().toISOString().split('T')[0],
      supplier_id: data.supplierId || '',
      supplier_name: data.supplierName || '',
      supplier_phone: data.supplierPhone || '',
      supplier_email: data.supplierEmail || '',
      supplier_address: data.supplierAddress || '',
      supplier_tin: data.supplierTin || '',
      business_name: data.businessName || '',
      business_address: data.businessAddress || '',
      business_phone: data.businessPhone || '',
      business_tin: data.businessTin || '172 - 813 - 364',
      linkage_mode: data.linkageMode || 'lump_sum',
      linked_references: data.linkedReferences || [],
      payment_breakdown: data.paymentBreakdown || [],
      total_amount: data.totalAmount || 0,
      previous_balance: data.previousBalance || 0,
      new_balance: data.newBalance || 0,
      notes: data.notes || '',
      prepared_by: data.preparedBy || '',
      prepared_date: data.preparedDate || null,
      received_by: data.receivedBy || '',
      received_date: data.receivedDate || null,
      approved_by: data.approvedBy || '',
      approved_date: data.approvedDate || null,
      status: data.status || 'completed',
      outlet_id: data.outletId || null,
      updated_at: new Date().toISOString()
    };

    const { data: result, error } = await supabase
      .from('supplier_payment_vouchers')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('Error saving supplier payment voucher:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: result.id };
  } catch (err) {
    console.error('Error saving supplier payment voucher:', err);
    return { success: false, error: 'Failed to save supplier payment voucher' };
  }
};

/**
 * Fetch all saved supplier payment vouchers.
 */
export const getSavedSupplierPaymentVouchers = async (
  outletId?: string
): Promise<SavedSupplierPaymentVoucher[]> => {
  try {
    let query = supabase
      .from('supplier_payment_vouchers')
      .select('*')
      .order('created_at', { ascending: false });

    if (outletId) {
      query = query.eq('outlet_id', outletId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching supplier payment vouchers:', error);
      return [];
    }

    return (data || []).map((db: any) => ({
      id: db.id,
      voucherNumber: db.voucher_number,
      date: db.date,
      supplierId: db.supplier_id || '',
      supplierName: db.supplier_name || '',
      supplierPhone: db.supplier_phone || '',
      supplierEmail: db.supplier_email || '',
      supplierAddress: db.supplier_address || '',
      supplierTin: db.supplier_tin || '',
      businessName: db.business_name || '',
      businessAddress: db.business_address || '',
      businessPhone: db.business_phone || '',
      businessTin: db.business_tin || '172 - 813 - 364',
      linkageMode: db.linkage_mode || 'lump_sum',
      linkedReferences: db.linked_references || [],
      paymentBreakdown: db.payment_breakdown || [],
      totalAmount: db.total_amount || 0,
      previousBalance: db.previous_balance || 0,
      newBalance: db.new_balance || 0,
      notes: db.notes || '',
      preparedBy: db.prepared_by || '',
      preparedDate: db.prepared_date || '',
      receivedBy: db.received_by || '',
      receivedDate: db.received_date || '',
      approvedBy: db.approved_by || '',
      approvedDate: db.approved_date || '',
      status: db.status || 'completed',
      outletId: db.outlet_id || '',
      createdAt: db.created_at || new Date().toISOString()
    }));
  } catch (err) {
    console.error('Error fetching supplier payment vouchers:', err);
    return [];
  }
};

/**
 * Fetch a single supplier payment voucher by its database id (raw database row).
 */
export const getSupplierPaymentVoucherById = async (id: string): Promise<any | null> => {
  try {
    const { data, error } = await supabase
      .from('supplier_payment_vouchers')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching supplier payment voucher by id:', error);
    return null;
  }
};

/**
 * Delete a supplier payment voucher.
 * NOTE: Does NOT reverse the ledger entry — that would require additional logic.
 */
export const deleteSupplierPaymentVoucher = async (
  id: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('supplier_payment_vouchers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting supplier payment voucher:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Error deleting supplier payment voucher:', err);
    return { success: false, error: 'Failed to delete supplier payment voucher' };
  }
};

/**
 * Update a supplier payment voucher.
 */
export const updateSupplierPaymentVoucher = async (
  id: string,
  data: Partial<SupplierPaymentVoucherData>
): Promise<{ success: boolean; error?: string }> => {
  try {
    const updateData: any = { updated_at: new Date().toISOString() };

    if (data.voucherNumber) updateData.voucher_number = data.voucherNumber;
    if (data.date) updateData.date = data.date;
    if (data.supplierId !== undefined) updateData.supplier_id = data.supplierId;
    if (data.supplierName !== undefined) updateData.supplier_name = data.supplierName;
    if (data.supplierPhone !== undefined) updateData.supplier_phone = data.supplierPhone;
    if (data.supplierEmail !== undefined) updateData.supplier_email = data.supplierEmail;
    if (data.supplierAddress !== undefined) updateData.supplier_address = data.supplierAddress;
    if (data.supplierTin !== undefined) updateData.supplier_tin = data.supplierTin;
    if (data.businessName !== undefined) updateData.business_name = data.businessName;
    if (data.businessAddress !== undefined) updateData.business_address = data.businessAddress;
    if (data.businessPhone !== undefined) updateData.business_phone = data.businessPhone;
    if (data.businessTin !== undefined) updateData.business_tin = data.businessTin;
    if (data.linkageMode !== undefined) updateData.linkage_mode = data.linkageMode;
    if (data.linkedReferences !== undefined) updateData.linked_references = data.linkedReferences;
    if (data.paymentBreakdown !== undefined) updateData.payment_breakdown = data.paymentBreakdown;
    if (data.totalAmount !== undefined) updateData.total_amount = data.totalAmount;
    if (data.previousBalance !== undefined) updateData.previous_balance = data.previousBalance;
    if (data.newBalance !== undefined) updateData.new_balance = data.newBalance;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.preparedBy !== undefined) updateData.prepared_by = data.preparedBy;
    if (data.preparedDate !== undefined) updateData.prepared_date = data.preparedDate;
    if (data.receivedBy !== undefined) updateData.received_by = data.receivedBy;
    if (data.receivedDate !== undefined) updateData.received_date = data.receivedDate;
    if (data.approvedBy !== undefined) updateData.approved_by = data.approvedBy;
    if (data.approvedDate !== undefined) updateData.approved_date = data.approvedDate;
    if (data.status) updateData.status = data.status;

    const { error } = await supabase
      .from('supplier_payment_vouchers')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Error updating supplier payment voucher:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Error updating supplier payment voucher:', err);
    return { success: false, error: 'Failed to update supplier payment voucher' };
  }
};
