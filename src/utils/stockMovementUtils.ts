import { supabase } from '@/lib/supabaseClient';

export interface StockMovement {
  id?: string;
  product_id?: string;
  product_name: string;
  outlet_id?: string;
  godown_id?: string;
  zone_id?: string;
  movement_type: 'IN' | 'OUT' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'SOLD' | 'ADJUSTMENT' | 'RETURN' | 'DAMAGE';
  quantity: number;
  reference_type?: 'GRN' | 'DELIVERY_NOTE' | 'SALE' | 'STOCK_TAKE' | 'ADJUSTMENT' | 'TRANSFER' | 'RETURN';
  reference_id?: string;
  reference_number?: string;
  unit_cost?: number;
  total_cost?: number;
  notes?: string;
  batch_number?: string;
  created_by?: string;
  created_at?: string;
}

export interface StockMovementWithDetails extends StockMovement {
  outlet_name?: string;
  godown_name?: string;
  zone_name?: string;
}

export interface StockMovementSummary {
  product_name: string;
  total_in: number;
  total_out: number;
  total_sold: number;
  total_adjustment: number;
  total_transfer_in: number;
  total_transfer_out: number;
  net_movement: number;
}

/**
 * Record a single stock movement in the ledger
 */
export const recordStockMovement = async (movement: StockMovement): Promise<{ success: boolean; id?: string; error?: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    const insertData = {
      product_id: movement.product_id || null,
      product_name: movement.product_name,
      outlet_id: movement.outlet_id || null,
      godown_id: movement.godown_id || null,
      zone_id: movement.zone_id || null,
      movement_type: movement.movement_type,
      quantity: Math.abs(movement.quantity),
      reference_type: movement.reference_type || null,
      reference_id: movement.reference_id || null,
      reference_number: movement.reference_number || null,
      unit_cost: movement.unit_cost || 0,
      total_cost: movement.total_cost || (movement.unit_cost || 0) * Math.abs(movement.quantity),
      notes: movement.notes || '',
      batch_number: movement.batch_number || null,
      created_by: user?.id || null
    };

    const { data, error } = await supabase
      .from('stock_movements')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('Error recording stock movement:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data.id };
  } catch (err) {
    console.error('Error recording stock movement:', err);
    return { success: false, error: 'Failed to record stock movement' };
  }
};

/**
 * Record multiple stock movements in a single batch (e.g., all items in a GRN)
 */
export const recordStockMovements = async (movements: StockMovement[]): Promise<{ success: boolean; count?: number; error?: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    const insertData = movements.map(m => ({
      product_id: m.product_id || null,
      product_name: m.product_name,
      outlet_id: m.outlet_id || null,
      godown_id: m.godown_id || null,
      zone_id: m.zone_id || null,
      movement_type: m.movement_type,
      quantity: Math.abs(m.quantity),
      reference_type: m.reference_type || null,
      reference_id: m.reference_id || null,
      reference_number: m.reference_number || null,
      unit_cost: m.unit_cost || 0,
      total_cost: m.total_cost || (m.unit_cost || 0) * Math.abs(m.quantity),
      notes: m.notes || '',
      batch_number: m.batch_number || null,
      created_by: user?.id || null
    }));

    const { data, error } = await supabase
      .from('stock_movements')
      .insert(insertData)
      .select();

    if (error) {
      console.error('Error recording stock movements batch:', error);
      return { success: false, error: error.message };
    }

    return { success: true, count: data?.length || 0 };
  } catch (err) {
    console.error('Error recording stock movements batch:', err);
    return { success: false, error: 'Failed to record stock movements' };
  }
};

/**
 * Get stock movements with optional filters
 */
export const getStockMovements = async (filters?: {
  productId?: string;
  productName?: string;
  outletId?: string;
  movementType?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}): Promise<StockMovementWithDetails[]> => {
  try {
    let query = supabase
      .from('stock_movements')
      .select(`
        *,
        outlets!stock_movements_outlet_id_fkey(name),
        godowns!stock_movements_godown_id_fkey(name),
        godown_zones!stock_movements_zone_id_fkey(zone_name)
      `)
      .order('created_at', { ascending: false });

    if (filters?.productId) {
      query = query.eq('product_id', filters.productId);
    }
    if (filters?.productName) {
      query = query.ilike('product_name', `%${filters.productName}%`);
    }
    if (filters?.outletId) {
      query = query.eq('outlet_id', filters.outletId);
    }
    if (filters?.movementType) {
      query = query.eq('movement_type', filters.movementType);
    }
    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte('created_at', `${filters.dateTo}T23:59:59`);
    }

    const limit = filters?.limit || 200;
    query = query.limit(limit);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching stock movements:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      product_id: row.product_id,
      product_name: row.product_name,
      outlet_id: row.outlet_id,
      godown_id: row.godown_id,
      movement_type: row.movement_type,
      quantity: row.quantity,
      reference_type: row.reference_type,
      reference_id: row.reference_id,
      reference_number: row.reference_number,
      unit_cost: row.unit_cost,
      total_cost: row.total_cost,
      notes: row.notes,
      batch_number: row.batch_number,
      created_by: row.created_by,
      created_at: row.created_at,
      outlet_name: row.outlets?.name || '',
      godown_name: row.godowns?.name || '',
      zone_name: row.godown_zones?.zone_name || ''
    }));
  } catch (err) {
    console.error('Error fetching stock movements:', err);
    return [];
  }
};

/**
 * Get stock movement summary for a product or outlet
 */
export const getStockMovementSummary = async (filters?: {
  productId?: string;
  outletId?: string;
}): Promise<StockMovementSummary[]> => {
  try {
    let query = supabase
      .from('stock_movements')
      .select('product_name, movement_type, quantity');

    if (filters?.productId) {
      query = query.eq('product_id', filters.productId);
    }
    if (filters?.outletId) {
      query = query.eq('outlet_id', filters.outletId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching stock movement summary:', error);
      return [];
    }

    // Aggregate in JS since Supabase doesn't support complex GROUP BY
    const summaryMap = new Map<string, StockMovementSummary>();

    (data || []).forEach((row: any) => {
      const name = row.product_name;
      if (!summaryMap.has(name)) {
        summaryMap.set(name, {
          product_name: name,
          total_in: 0,
          total_out: 0,
          total_sold: 0,
          total_adjustment: 0,
          total_transfer_in: 0,
          total_transfer_out: 0,
          net_movement: 0
        });
      }

      const summary = summaryMap.get(name)!;
      const qty = Number(row.quantity) || 0;

      switch (row.movement_type) {
        case 'IN':
          summary.total_in += qty;
          summary.net_movement += qty;
          break;
        case 'OUT':
          summary.total_out += qty;
          summary.net_movement -= qty;
          break;
        case 'SOLD':
          summary.total_sold += qty;
          summary.net_movement -= qty;
          break;
        case 'ADJUSTMENT':
          summary.total_adjustment += qty;
          summary.net_movement += qty;
          break;
        case 'TRANSFER_IN':
          summary.total_transfer_in += qty;
          summary.net_movement += qty;
          break;
        case 'TRANSFER_OUT':
          summary.total_transfer_out += qty;
          summary.net_movement -= qty;
          break;
        case 'RETURN':
          summary.net_movement += qty;
          break;
        case 'DAMAGE':
          summary.net_movement -= qty;
          break;
      }
    });

    return Array.from(summaryMap.values()).sort((a, b) => a.product_name.localeCompare(b.product_name));
  } catch (err) {
    console.error('Error fetching stock movement summary:', err);
    return [];
  }
};

/**
 * Get movements for a specific product by name (useful for product detail views)
 */
export const getProductMovementHistory = async (
  productName: string,
  outletId?: string,
  limit = 50
): Promise<StockMovementWithDetails[]> => {
  return getStockMovements({ productName, outletId, limit });
};

/**
 * Get all unique product names that have movement records
 */
export const getMovedProductNames = async (): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('stock_movements')
      .select('product_name')
      .order('product_name');

    if (error) {
      console.error('Error fetching moved product names:', error);
      return [];
    }

    const uniqueNames = [...new Set((data || []).map((r: any) => r.product_name))];
    return uniqueNames.sort();
  } catch (err) {
    console.error('Error fetching moved product names:', err);
    return [];
  }
};

/**
 * Delete stock movements by reference type and reference number
 * Used when editing a transaction to remove old movements before creating new ones
 */
export const deleteStockMovementsByReference = async (
  referenceType: 'GRN' | 'DELIVERY_NOTE' | 'SALE' | 'STOCK_TAKE' | 'ADJUSTMENT' | 'TRANSFER' | 'RETURN',
  referenceNumber: string
): Promise<{ success: boolean; count?: number; error?: string }> => {
  try {
    const { data, error, count } = await supabase
      .from('stock_movements')
      .delete()
      .eq('reference_type', referenceType)
      .eq('reference_number', referenceNumber)
      .select();

    if (error) {
      console.error('Error deleting stock movements:', error);
      return { success: false, error: error.message };
    }

    console.log(`🗑️ Deleted ${count || data?.length || 0} stock movements for ${referenceType} ${referenceNumber}`);
    return { success: true, count: count || data?.length || 0 };
  } catch (err) {
    console.error('Error deleting stock movements:', err);
    return { success: false, error: 'Failed to delete stock movements' };
  }
};

/**
 * Update stock movements for a transaction (delete old + create new)
 * Used when editing a transaction to reflect changes in the Movement Ledger
 */
export const updateStockMovementsForTransaction = async (
  referenceType: 'GRN' | 'DELIVERY_NOTE' | 'SALE' | 'STOCK_TAKE' | 'ADJUSTMENT' | 'TRANSFER' | 'RETURN',
  referenceNumber: string,
  newMovements: StockMovement[]
): Promise<{ success: boolean; count?: number; error?: string }> => {
  try {
    // Step 1: Delete existing movements for this reference
    const deleteResult = await deleteStockMovementsByReference(referenceType, referenceNumber);
    if (!deleteResult.success) {
      return deleteResult;
    }

    // Step 2: Create new movements
    if (newMovements.length > 0) {
      const createResult = await recordStockMovements(newMovements);
      if (!createResult.success) {
        return createResult;
      }
      return { success: true, count: createResult.count };
    }

    return { success: true, count: 0 };
  } catch (err) {
    console.error('Error updating stock movements:', err);
    return { success: false, error: 'Failed to update stock movements' };
  }
};
