/**
 * Internal Consumption Note Utilities
 *
 * Manages the saved_internal_consumption_notes table.
 * Records when products are taken by internal personnel (employees, managers,
 * investors, owners) for free — as internal consumption, loss/damage,
 * employee benefit, or owner/investor draw.
 */

import { supabase } from '@/lib/supabaseClient';
import { recordStockMovement } from './stockMovementUtils';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface InternalConsumptionItem {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  costPrice: number;
  total: number;
  godownId?: string;
  godownName?: string;
  zoneId?: string;
  zoneName?: string;
}

export interface InternalConsumptionNoteData {
  id?: string;
  noteNumber: string;
  date: string;
  takenBy: string;
  personType: 'employee' | 'manager' | 'investor' | 'owner';
  department?: string;
  reason: 'consumption' | 'damage' | 'benefit' | 'owner_draw' | 'other';
  items: InternalConsumptionItem[];
  totalAmount: number;
  notes?: string;
  // Damage tracking fields
  damageDescription?: string;
  damageDate?: string;
  recoverable?: boolean;
  disposalMethod?: string;
  // Approval
  preparedBy?: string;
  preparedDate?: string;
  approvedBy?: string;
  approvedDate?: string;
  rejectionReason?: string;
  status: 'pending' | 'approved' | 'rejected';
  outletId?: string;
  createdAt?: string;
}

export interface SavedInternalConsumptionNote {
  id: string;
  noteNumber: string;
  date: string;
  takenBy: string;
  personType: 'employee' | 'manager' | 'investor' | 'owner';
  department: string;
  reason: 'consumption' | 'damage' | 'benefit' | 'owner_draw' | 'other';
  items: InternalConsumptionItem[];
  totalAmount: number;
  notes: string;
  damageDescription: string;
  damageDate: string;
  recoverable: boolean;
  disposalMethod: string;
  preparedBy: string;
  preparedDate: string;
  approvedBy: string;
  approvedDate: string;
  rejectionReason: string;
  status: 'pending' | 'approved' | 'rejected';
  outletId: string;
  createdAt: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

export const generateNoteNumber = (): string => {
  const timestamp = Date.now();
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `ICN-${String(timestamp).slice(-8)}-${random}`;
};

export const getReasonLabel = (reason: string): string => {
  const labels: Record<string, string> = {
    consumption: 'Internal Consumption',
    damage: 'Damage/Loss',
    benefit: 'Employee Benefit',
    owner_draw: 'Owner/Investor Draw',
    other: 'Other'
  };
  return labels[reason] || reason;
};

export const getPersonTypeLabel = (personType: string): string => {
  const labels: Record<string, string> = {
    employee: 'Employee',
    manager: 'Manager',
    investor: 'Investor',
    owner: 'Owner'
  };
  return labels[personType] || personType;
};

// ── CRUD ───────────────────────────────────────────────────────────────────────

/**
 * Save a new internal consumption note to the database.
 */
export const saveInternalConsumptionNote = async (
  data: InternalConsumptionNoteData
): Promise<{ success: boolean; id?: string; error?: string }> => {
  try {
    const insertData = {
      note_number: data.noteNumber || generateNoteNumber(),
      date: data.date || new Date().toISOString().split('T')[0],
      taken_by: data.takenBy,
      person_type: data.personType,
      department: data.department || null,
      reason: data.reason,
      items: data.items || [],
      total_amount: data.totalAmount || 0,
      notes: data.notes || null,
      damage_description: data.damageDescription || null,
      damage_date: data.damageDate || null,
      recoverable: data.recoverable || false,
      disposal_method: data.disposalMethod || null,
      prepared_by: data.preparedBy || null,
      prepared_date: data.preparedDate || null,
      approved_by: data.approvedBy || null,
      approved_date: data.approvedDate || null,
      rejection_reason: data.rejectionReason || null,
      status: data.status || 'pending',
      outlet_id: data.outletId || null,
      updated_at: new Date().toISOString()
    };

    const { data: result, error } = await supabase
      .from('saved_internal_consumption_notes')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('Error saving internal consumption note:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: result.id };
  } catch (err) {
    console.error('Error saving internal consumption note:', err);
    return { success: false, error: 'Failed to save internal consumption note' };
  }
};

/**
 * Fetch all saved internal consumption notes.
 */
export const getSavedInternalConsumptionNotes = async (
  outletId?: string
): Promise<SavedInternalConsumptionNote[]> => {
  try {
    let query = supabase
      .from('saved_internal_consumption_notes')
      .select('*')
      .order('created_at', { ascending: false });

    if (outletId) {
      query = query.eq('outlet_id', outletId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching internal consumption notes:', error);
      return [];
    }

    return (data || []).map((db: any) => ({
      id: db.id,
      noteNumber: db.note_number || '',
      date: db.date || '',
      takenBy: db.taken_by || '',
      personType: db.person_type || 'employee',
      department: db.department || '',
      reason: db.reason || 'consumption',
      items: db.items || [],
      totalAmount: db.total_amount || 0,
      notes: db.notes || '',
      damageDescription: db.damage_description || '',
      damageDate: db.damage_date || '',
      recoverable: db.recoverable || false,
      disposalMethod: db.disposal_method || '',
      preparedBy: db.prepared_by || '',
      preparedDate: db.prepared_date || '',
      approvedBy: db.approved_by || '',
      approvedDate: db.approved_date || '',
      rejectionReason: db.rejection_reason || '',
      status: db.status || 'pending',
      outletId: db.outlet_id || '',
      createdAt: db.created_at || new Date().toISOString()
    }));
  } catch (err) {
    console.error('Error fetching internal consumption notes:', err);
    return [];
  }
};

/**
 * Fetch a single internal consumption note by ID.
 */
export const getInternalConsumptionNoteById = async (
  id: string
): Promise<SavedInternalConsumptionNote | null> => {
  try {
    const { data, error } = await supabase
      .from('saved_internal_consumption_notes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching internal consumption note:', error);
      return null;
    }

    return {
      id: data.id,
      noteNumber: data.note_number || '',
      date: data.date || '',
      takenBy: data.taken_by || '',
      personType: data.person_type || 'employee',
      department: data.department || '',
      reason: data.reason || 'consumption',
      items: data.items || [],
      totalAmount: data.total_amount || 0,
      notes: data.notes || '',
      damageDescription: data.damage_description || '',
      damageDate: data.damage_date || '',
      recoverable: data.recoverable || false,
      disposalMethod: data.disposal_method || '',
      preparedBy: data.prepared_by || '',
      preparedDate: data.prepared_date || '',
      approvedBy: data.approved_by || '',
      approvedDate: data.approved_date || '',
      rejectionReason: data.rejection_reason || '',
      status: data.status || 'pending',
      outletId: data.outlet_id || '',
      createdAt: data.created_at || new Date().toISOString()
    };
  } catch (err) {
    console.error('Error fetching internal consumption note:', err);
    return null;
  }
};

/**
 * Update an internal consumption note.
 */
export const updateInternalConsumptionNote = async (
  id: string,
  data: Partial<InternalConsumptionNoteData>
): Promise<{ success: boolean; error?: string }> => {
  try {
    const updateData: any = { updated_at: new Date().toISOString() };

    if (data.noteNumber) updateData.note_number = data.noteNumber;
    if (data.date) updateData.date = data.date;
    if (data.takenBy) updateData.taken_by = data.takenBy;
    if (data.personType) updateData.person_type = data.personType;
    if (data.department !== undefined) updateData.department = data.department;
    if (data.reason) updateData.reason = data.reason;
    if (data.items !== undefined) updateData.items = data.items;
    if (data.totalAmount !== undefined) updateData.total_amount = data.totalAmount;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.damageDescription !== undefined) updateData.damage_description = data.damageDescription;
    if (data.damageDate !== undefined) updateData.damage_date = data.damageDate;
    if (data.recoverable !== undefined) updateData.recoverable = data.recoverable;
    if (data.disposalMethod !== undefined) updateData.disposal_method = data.disposalMethod;
    if (data.preparedBy !== undefined) updateData.prepared_by = data.preparedBy;
    if (data.preparedDate !== undefined) updateData.prepared_date = data.preparedDate;
    if (data.approvedBy !== undefined) updateData.approved_by = data.approvedBy;
    if (data.approvedDate !== undefined) updateData.approved_date = data.approvedDate;
    if (data.rejectionReason !== undefined) updateData.rejection_reason = data.rejectionReason;
    if (data.status) updateData.status = data.status;

    const { error } = await supabase
      .from('saved_internal_consumption_notes')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Error updating internal consumption note:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Error updating internal consumption note:', err);
    return { success: false, error: 'Failed to update internal consumption note' };
  }
};

/**
 * Delete an internal consumption note.
 */
export const deleteInternalConsumptionNote = async (
  id: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('saved_internal_consumption_notes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting internal consumption note:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Error deleting internal consumption note:', err);
    return { success: false, error: 'Failed to delete internal consumption note' };
  }
};

/**
 * Approve an internal consumption note and deduct stock.
 * Records stock movements for each item.
 */
export const approveInternalConsumptionNote = async (
  id: string,
  approvedBy: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // First, fetch the note to get items and details
    const note = await getInternalConsumptionNoteById(id);
    if (!note) {
      return { success: false, error: 'Note not found' };
    }

    if (note.status === 'approved') {
      return { success: false, error: 'Note is already approved' };
    }

    // Import services for inventory updates
    const { updateGodownStock } = await import('@/services/godownService');
    const { getProducts, updateProduct } = await import('@/services/databaseService');
    
    // Record stock movements for each item
    const movementType = note.reason === 'damage' ? 'DAMAGE' : 'OUT';
    
    for (const item of note.items) {
      // Skip items with no quantity
      if (!item.quantity || item.quantity <= 0) {
        console.warn(`Skipping item with invalid quantity: ${item.productName}`);
        continue;
      }

      // 1. Record stock movement in the ledger
      const movementResult = await recordStockMovement({
        product_id: item.productId,
        product_name: item.productName,
        outlet_id: note.outletId || undefined,
        godown_id: item.godownId || undefined,
        zone_id: item.zoneId || undefined,
        movement_type: movementType,
        quantity: item.quantity,
        reference_type: 'INTERNAL_CONSUMPTION',
        reference_id: id,
        reference_number: note.noteNumber,
        unit_cost: item.costPrice,
        total_cost: item.total,
        notes: `Internal consumption by ${note.takenBy} (${note.personType}) - ${getReasonLabel(note.reason)}${item.godownName ? ` from ${item.godownName}` : ''}${item.zoneName ? ` / ${item.zoneName}` : ''}`
      });

      if (!movementResult.success) {
        console.error('Failed to record stock movement for item:', item.productName);
        // Continue with other items even if one fails
      }

      // 2. Deduct from godown stock (if godown and zone are specified)
      if (item.godownId) {
        try {
          await updateGodownStock(
            item.productId,
            item.godownId,
            item.zoneId || null,
            -item.quantity // Negative to decrease
          );
          console.log(`✅ Deducted ${item.quantity} from godown stock: ${item.godownName} / ${item.zoneName}`);
        } catch (godownErr) {
          console.error(`Failed to deduct godown stock for ${item.productName}:`, godownErr);
        }
      }

      // 3. Deduct from general product stock_quantity
      try {
        const allProducts = await getProducts();
        const product = allProducts.find(p => p.id === item.productId);
        if (product) {
          const newStock = Math.max(0, (product.stock_quantity || 0) - item.quantity);
          await updateProduct(item.productId, { stock_quantity: newStock });
          console.log(`✅ Deducted ${item.quantity} from product stock_quantity: ${item.productName} (${product.stock_quantity} → ${newStock})`);
        }
      } catch (productErr) {
        console.error(`Failed to deduct product stock for ${item.productName}:`, productErr);
      }
    }

    // Update the note status to approved
    const updateResult = await updateInternalConsumptionNote(id, {
      status: 'approved',
      approvedBy,
      approvedDate: new Date().toISOString().split('T')[0]
    });

    if (!updateResult.success) {
      return { success: false, error: updateResult.error };
    }

    return { success: true };
  } catch (err) {
    console.error('Error approving internal consumption note:', err);
    return { success: false, error: 'Failed to approve internal consumption note' };
  }
};

/**
 * Reject an internal consumption note.
 */
export const rejectInternalConsumptionNote = async (
  id: string,
  rejectedBy: string,
  reason: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const updateResult = await updateInternalConsumptionNote(id, {
      status: 'rejected',
      approvedBy: rejectedBy,
      approvedDate: new Date().toISOString().split('T')[0],
      rejectionReason: reason
    });

    if (!updateResult.success) {
      return { success: false, error: updateResult.error };
    }

    return { success: true };
  } catch (err) {
    console.error('Error rejecting internal consumption note:', err);
    return { success: false, error: 'Failed to reject internal consumption note' };
  }
};

/**
 * Update an internal consumption note with inventory adjustments.
 * Reverses old inventory deductions, updates the note, then applies new deductions.
 * Only adjusts inventory if the note was already approved.
 */
export const updateInternalConsumptionNoteWithInventory = async (
  id: string,
  data: InternalConsumptionNoteData
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Get the old note to check status and old items
    const oldNote = await getInternalConsumptionNoteById(id);
    if (!oldNote) {
      return { success: false, error: 'Note not found' };
    }

    if (oldNote.status === 'approved') {
      // Import services for inventory updates
      const { updateGodownStock } = await import('@/services/godownService');
      const { getProducts, updateProduct } = await import('@/services/databaseService');
      const { deleteStockMovementsByReference, recordStockMovement } = await import('@/utils/stockMovementUtils');

      // Step 1: Reverse old inventory deductions (add back old items)
      for (const item of oldNote.items) {
        if (!item.quantity || item.quantity <= 0) continue;

        // Add back to godown stock
        if (item.godownId) {
          try {
            await updateGodownStock(
              item.productId,
              item.godownId,
              item.zoneId || null,
              item.quantity // Positive to add back
            );
            console.log(`✅ Reversed: Added back ${item.quantity} to godown stock: ${item.godownName} / ${item.zoneName}`);
          } catch (godownErr) {
            console.error(`Failed to reverse godown stock for ${item.productName}:`, godownErr);
          }
        }

        // Add back to product stock_quantity
        try {
          const allProducts = await getProducts();
          const product = allProducts.find(p => p.id === item.productId);
          if (product) {
            const newStock = (product.stock_quantity || 0) + item.quantity;
            await updateProduct(item.productId, { stock_quantity: newStock });
            console.log(`✅ Reversed: Added back ${item.quantity} to product stock: ${item.productName}`);
          }
        } catch (productErr) {
          console.error(`Failed to reverse product stock for ${item.productName}:`, productErr);
        }
      }

      // Step 2: Delete old stock movements
      await deleteStockMovementsByReference('INTERNAL_CONSUMPTION', oldNote.noteNumber);

      // Step 3: Update the note in database
      const updateResult = await updateInternalConsumptionNote(id, data);
      if (!updateResult.success) {
        return { success: false, error: updateResult.error };
      }

      // Step 4: Apply new inventory deductions with updated items
      const newMovementType = data.reason === 'damage' ? 'DAMAGE' : 'OUT';
      for (const item of data.items) {
        if (!item.quantity || item.quantity <= 0) continue;

        // Deduct from godown stock
        if (item.godownId) {
          try {
            await updateGodownStock(
              item.productId,
              item.godownId,
              item.zoneId || null,
              -item.quantity // Negative to deduct
            );
            console.log(`✅ Deducted ${item.quantity} from godown stock: ${item.godownName} / ${item.zoneName}`);
          } catch (godownErr) {
            console.error(`Failed to deduct godown stock for ${item.productName}:`, godownErr);
          }
        }

        // Deduct from product stock_quantity
        try {
          const allProducts = await getProducts();
          const product = allProducts.find(p => p.id === item.productId);
          if (product) {
            const newStock = Math.max(0, (product.stock_quantity || 0) - item.quantity);
            await updateProduct(item.productId, { stock_quantity: newStock });
            console.log(`✅ Deducted ${item.quantity} from product stock: ${item.productName}`);
          }
        } catch (productErr) {
          console.error(`Failed to deduct product stock for ${item.productName}:`, productErr);
        }

        // Record new stock movement
        await recordStockMovement({
          product_id: item.productId,
          product_name: item.productName,
          outlet_id: oldNote.outletId || undefined,
          godown_id: item.godownId || undefined,
          zone_id: item.zoneId || undefined,
          movement_type: newMovementType,
          quantity: item.quantity,
          reference_type: 'INTERNAL_CONSUMPTION',
          reference_id: id,
          reference_number: data.noteNumber,
          unit_cost: item.costPrice,
          total_cost: item.total,
          notes: `Internal consumption (edited) by ${data.takenBy} (${data.personType}) - ${getReasonLabel(data.reason)}${item.godownName ? ` from ${item.godownName}` : ''}${item.zoneName ? ` / ${item.zoneName}` : ''}`
        });
      }
    } else {
      // Note is not approved, just update the database record
      const updateResult = await updateInternalConsumptionNote(id, data);
      if (!updateResult.success) {
        return { success: false, error: updateResult.error };
      }
    }

    return { success: true };
  } catch (err) {
    console.error('Error updating internal consumption note with inventory:', err);
    return { success: false, error: 'Failed to update internal consumption note' };
  }
};
