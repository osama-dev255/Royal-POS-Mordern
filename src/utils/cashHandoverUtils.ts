/**
 * Cash Handover Note Utilities
 *
 * Manages the cash_handover_notes table.
 * Records when cash collected from business is handed over to a money agent for banking.
 */

import { supabase } from '@/lib/supabaseClient';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface CashHandoverNoteData {
  id?: string;
  referenceNumber: string;
  date: string;
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  totalAmount: number;
  notes: string;
  preparedBy: string;
  preparedDate: string;
  handedOverBy: string;
  handedOverDate: string;
  receivedBy: string;
  receivedDate: string;
  status: 'pending' | 'completed' | 'cancelled';
  outletId?: string;
  createdAt?: string;
}

export interface SavedCashHandoverNote {
  id: string;
  referenceNumber: string;
  date: string;
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  totalAmount: number;
  notes: string;
  preparedBy: string;
  preparedDate: string;
  handedOverBy: string;
  handedOverDate: string;
  receivedBy: string;
  receivedDate: string;
  status: 'pending' | 'completed' | 'cancelled';
  outletId: string;
  createdAt: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

export const generateReferenceNumber = (): string => {
  const timestamp = Date.now();
  return `CHN-${String(timestamp).slice(-6)}`;
};

// ── CRUD ───────────────────────────────────────────────────────────────────────

/**
 * Save a new cash handover note to the database.
 */
export const saveCashHandoverNote = async (
  data: CashHandoverNoteData
): Promise<{ success: boolean; id?: string; error?: string }> => {
  try {
    const insertData = {
      reference_number: data.referenceNumber || generateReferenceNumber(),
      date: data.date || new Date().toISOString().split('T')[0],
      business_name: data.businessName || '',
      business_address: data.businessAddress || '',
      business_phone: data.businessPhone || '',
      total_amount: data.totalAmount || 0,
      notes: data.notes || '',
      prepared_by: data.preparedBy || '',
      prepared_date: data.preparedDate || null,
      handed_over_by: data.handedOverBy || '',
      handed_over_date: data.handedOverDate || null,
      received_by: data.receivedBy || '',
      received_date: data.receivedDate || null,
      status: data.status || 'pending',
      outlet_id: data.outletId || null,
      updated_at: new Date().toISOString()
    };

    const { data: result, error } = await supabase
      .from('cash_handover_notes')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('Error saving cash handover note:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: result.id };
  } catch (err) {
    console.error('Error saving cash handover note:', err);
    return { success: false, error: 'Failed to save cash handover note' };
  }
};

/**
 * Fetch all saved cash handover notes.
 */
export const getSavedCashHandoverNotes = async (
  outletId?: string
): Promise<SavedCashHandoverNote[]> => {
  try {
    let query = supabase
      .from('cash_handover_notes')
      .select('*')
      .order('created_at', { ascending: false });

    if (outletId) {
      query = query.eq('outlet_id', outletId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching cash handover notes:', error);
      return [];
    }

    return (data || []).map((db: any) => ({
      id: db.id,
      referenceNumber: db.reference_number || '',
      date: db.date || '',
      businessName: db.business_name || '',
      businessAddress: db.business_address || '',
      businessPhone: db.business_phone || '',
      totalAmount: db.total_amount || 0,
      notes: db.notes || '',
      preparedBy: db.prepared_by || '',
      preparedDate: db.prepared_date || '',
      handedOverBy: db.handed_over_by || '',
      handedOverDate: db.handed_over_date || '',
      receivedBy: db.received_by || '',
      receivedDate: db.received_date || '',
      status: db.status || 'pending',
      outletId: db.outlet_id || '',
      createdAt: db.created_at || new Date().toISOString()
    }));
  } catch (err) {
    console.error('Error fetching cash handover notes:', err);
    return [];
  }
};

/**
 * Delete a cash handover note.
 */
export const deleteCashHandoverNote = async (
  id: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('cash_handover_notes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting cash handover note:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Error deleting cash handover note:', err);
    return { success: false, error: 'Failed to delete cash handover note' };
  }
};

/**
 * Update a cash handover note.
 */
export const updateCashHandoverNote = async (
  id: string,
  data: Partial<CashHandoverNoteData>
): Promise<{ success: boolean; error?: string }> => {
  try {
    const updateData: any = { updated_at: new Date().toISOString() };

    if (data.referenceNumber) updateData.reference_number = data.referenceNumber;
    if (data.date) updateData.date = data.date;
    if (data.businessName !== undefined) updateData.business_name = data.businessName;
    if (data.businessAddress !== undefined) updateData.business_address = data.businessAddress;
    if (data.businessPhone !== undefined) updateData.business_phone = data.businessPhone;
    if (data.totalAmount !== undefined) updateData.total_amount = data.totalAmount;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.preparedBy !== undefined) updateData.prepared_by = data.preparedBy;
    if (data.preparedDate !== undefined) updateData.prepared_date = data.preparedDate;
    if (data.handedOverBy !== undefined) updateData.handed_over_by = data.handedOverBy;
    if (data.handedOverDate !== undefined) updateData.handed_over_date = data.handedOverDate;
    if (data.receivedBy !== undefined) updateData.received_by = data.receivedBy;
    if (data.receivedDate !== undefined) updateData.received_date = data.receivedDate;
    if (data.status) updateData.status = data.status;

    const { error } = await supabase
      .from('cash_handover_notes')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Error updating cash handover note:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Error updating cash handover note:', err);
    return { success: false, error: 'Failed to update cash handover note' };
  }
};
