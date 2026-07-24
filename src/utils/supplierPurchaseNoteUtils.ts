import { supabase } from '@/lib/supabaseClient';

export interface SupplierPurchaseNoteItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  sellingPrice: number;
  total: number;
}

export interface SupplierPurchaseNoteData {
  id?: string;
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
  outletId?: string;
  createdAt?: string;
}

export interface SavedSupplierPurchaseNote {
  id: string;
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
  outletId?: string;
  createdAt: string;
  data: SupplierPurchaseNoteData;
}

// Generate purchase note number
const generatePurchaseNoteNumber = (): string => {
  const timestamp = Date.now();
  return `SPN-${String(timestamp).slice(-6)}`;
};

// Save supplier purchase note to database
export const saveSupplierPurchaseNote = async (
  noteData: SupplierPurchaseNoteData
): Promise<{ success: boolean; id?: string; error?: string }> => {
  try {
    const insertData = {
      purchase_note_number: noteData.purchaseNoteNumber || generatePurchaseNoteNumber(),
      date: noteData.date || new Date().toISOString().split('T')[0],
      supplier_name: noteData.supplierName || '',
      supplier_phone: noteData.supplierPhone || '',
      supplier_email: noteData.supplierEmail || '',
      supplier_address: noteData.supplierAddress || '',
      business_name: noteData.businessName || '',
      business_address: noteData.businessAddress || '',
      business_phone: noteData.businessPhone || '',
      business_email: noteData.businessEmail || '',
      items: noteData.items || [],
      subtotal: noteData.subtotal || 0,
      tax: noteData.tax || 0,
      discount: noteData.discount || 0,
      total: noteData.total || 0,
      notes: noteData.notes || '',
      prepared_by: noteData.preparedBy || '',
      prepared_date: noteData.preparedDate || null,
      status: noteData.status || 'draft',
      outlet_id: noteData.outletId || null,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('supplier_purchase_notes')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('Error saving supplier purchase note:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data.id };
  } catch (err) {
    console.error('Error saving supplier purchase note:', err);
    return { success: false, error: 'Failed to save supplier purchase note' };
  }
};

// Get all saved supplier purchase notes
export const getSavedSupplierPurchaseNotes = async (
  outletId?: string
): Promise<SavedSupplierPurchaseNote[]> => {
  try {
    let query = supabase
      .from('supplier_purchase_notes')
      .select('*')
      .order('created_at', { ascending: false });

    if (outletId) {
      query = query.eq('outlet_id', outletId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching supplier purchase notes:', error);
      return [];
    }

    return (data || []).map((dbNote: any) => ({
      id: dbNote.id,
      purchaseNoteNumber: dbNote.purchase_note_number,
      date: dbNote.date,
      supplierName: dbNote.supplier_name || '',
      supplierPhone: dbNote.supplier_phone || '',
      supplierEmail: dbNote.supplier_email || '',
      supplierAddress: dbNote.supplier_address || '',
      businessName: dbNote.business_name || '',
      businessAddress: dbNote.business_address || '',
      businessPhone: dbNote.business_phone || '',
      businessEmail: dbNote.business_email || '',
      items: dbNote.items || [],
      subtotal: dbNote.subtotal || 0,
      tax: dbNote.tax || 0,
      discount: dbNote.discount || 0,
      total: dbNote.total || 0,
      notes: dbNote.notes || '',
      preparedBy: dbNote.prepared_by || '',
      preparedDate: dbNote.prepared_date || '',
      status: dbNote.status || 'draft',
      outletId: dbNote.outlet_id || '',
      createdAt: dbNote.created_at || new Date().toISOString(),
      data: {
        purchaseNoteNumber: dbNote.purchase_note_number,
        date: dbNote.date,
        supplierName: dbNote.supplier_name || '',
        supplierPhone: dbNote.supplier_phone || '',
        supplierEmail: dbNote.supplier_email || '',
        supplierAddress: dbNote.supplier_address || '',
        businessName: dbNote.business_name || '',
        businessAddress: dbNote.business_address || '',
        businessPhone: dbNote.business_phone || '',
        businessEmail: dbNote.business_email || '',
        items: dbNote.items || [],
        subtotal: dbNote.subtotal || 0,
        tax: dbNote.tax || 0,
        discount: dbNote.discount || 0,
        total: dbNote.total || 0,
        notes: dbNote.notes || '',
        preparedBy: dbNote.prepared_by || '',
        preparedDate: dbNote.prepared_date || '',
        status: dbNote.status || 'draft',
        outletId: dbNote.outlet_id || ''
      }
    }));
  } catch (err) {
    console.error('Error fetching supplier purchase notes:', err);
    return [];
  }
};

// Delete supplier purchase note
export const deleteSupplierPurchaseNote = async (
  id: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('supplier_purchase_notes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting supplier purchase note:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Error deleting supplier purchase note:', err);
    return { success: false, error: 'Failed to delete supplier purchase note' };
  }
};

// Update supplier purchase note
export const updateSupplierPurchaseNote = async (
  id: string,
  noteData: Partial<SupplierPurchaseNoteData>
): Promise<{ success: boolean; error?: string }> => {
  try {
    const updateData: any = {
      updated_at: new Date().toISOString()
    };
    if (noteData.purchaseNoteNumber) updateData.purchase_note_number = noteData.purchaseNoteNumber;
    if (noteData.date) updateData.date = noteData.date;
    if (noteData.supplierName !== undefined) updateData.supplier_name = noteData.supplierName;
    if (noteData.supplierPhone !== undefined) updateData.supplier_phone = noteData.supplierPhone;
    if (noteData.supplierEmail !== undefined) updateData.supplier_email = noteData.supplierEmail;
    if (noteData.supplierAddress !== undefined) updateData.supplier_address = noteData.supplierAddress;
    if (noteData.businessName !== undefined) updateData.business_name = noteData.businessName;
    if (noteData.businessAddress !== undefined) updateData.business_address = noteData.businessAddress;
    if (noteData.businessPhone !== undefined) updateData.business_phone = noteData.businessPhone;
    if (noteData.businessEmail !== undefined) updateData.business_email = noteData.businessEmail;
    if (noteData.items) updateData.items = noteData.items;
    if (noteData.subtotal !== undefined) updateData.subtotal = noteData.subtotal;
    if (noteData.tax !== undefined) updateData.tax = noteData.tax;
    if (noteData.discount !== undefined) updateData.discount = noteData.discount;
    if (noteData.total !== undefined) updateData.total = noteData.total;
    if (noteData.notes !== undefined) updateData.notes = noteData.notes;
    if (noteData.preparedBy !== undefined) updateData.prepared_by = noteData.preparedBy;
    if (noteData.status) updateData.status = noteData.status;

    const { error } = await supabase
      .from('supplier_purchase_notes')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Error updating supplier purchase note:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Error updating supplier purchase note:', err);
    return { success: false, error: 'Failed to update supplier purchase note' };
  }
};
