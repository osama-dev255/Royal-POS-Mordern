// Godown Management Service
// Handles all database operations for godowns, zones, and stock transfers

import { supabase } from '@/lib/supabaseClient';

export interface Godown {
  id?: string;
  name: string;
  code: string;
  description?: string;
  location?: string;
  address?: string;
  manager_name?: string;
  manager_phone?: string;
  capacity?: string;
  godown_type?: 'warehouse' | 'cold-storage' | 'retail' | 'distribution' | 'factory';
  status?: 'active' | 'inactive' | 'maintenance';
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface GodownZone {
  id?: string;
  godown_id: string;
  zone_name: string;
  zone_code?: string;
  description?: string;
  zone_type?: 'general' | 'rack' | 'shelf' | 'cold-room' | 'hazardous' | 'returns' | 'quarantine';
  rack_number?: string;
  shelf_number?: string;
  floor_number?: string;
  capacity?: string;
  status?: 'active' | 'inactive' | 'full';
  created_at?: string;
  updated_at?: string;
}

export interface GodownStock {
  id?: string;
  product_id: string;
  godown_id: string;
  zone_id?: string;
  quantity: number;
  reserved_quantity?: number;
  available_quantity?: number;
  min_stock_level?: number;
  max_stock_level?: number;
  last_updated?: string;
}

export interface StockTransfer {
  id?: string;
  transfer_number: string;
  from_godown_id: string;
  to_godown_id: string;
  from_zone_id?: string;
  to_zone_id?: string;
  transfer_date: string;
  status?: 'pending' | 'approved' | 'in-transit' | 'completed' | 'cancelled';
  requested_by?: string;
  approved_by?: string;
  completed_by?: string;
  approval_date?: string;
  completion_date?: string;
  reason?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface StockTransferItem {
  id?: string;
  transfer_id: string;
  product_id: string;
  quantity: number;
  transferred_quantity?: number;
  unit?: string;
  remarks?: string;
  created_at?: string;
}

// ==================== GODOWN OPERATIONS ====================

export const getGodowns = async (): Promise<Godown[]> => {
  try {
    const { data, error } = await supabase
      .from('godowns')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching godowns:', error);
    throw error;
  }
};

export const getGodownById = async (id: string): Promise<Godown | null> => {
  try {
    const { data, error } = await supabase
      .from('godowns')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching godown:', error);
    throw error;
  }
};

export const createGodown = async (godown: Omit<Godown, 'id' | 'created_at' | 'updated_at'>): Promise<Godown | null> => {
  try {
    const { data, error } = await supabase
      .from('godowns')
      .insert([godown])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating godown:', error);
    throw error;
  }
};

export const updateGodown = async (id: string, updates: Partial<Godown>): Promise<Godown | null> => {
  try {
    const { data, error } = await supabase
      .from('godowns')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating godown:', error);
    throw error;
  }
};

export const deleteGodown = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('godowns')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting godown:', error);
    throw error;
  }
};

// ==================== ZONE OPERATIONS ====================

export const getZones = async (godownId?: string): Promise<GodownZone[]> => {
  try {
    let query = supabase
      .from('godown_zones')
      .select('*')
      .order('zone_name', { ascending: true });
    
    if (godownId) {
      query = query.eq('godown_id', godownId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching zones:', error);
    throw error;
  }
};

export const createZone = async (zone: Omit<GodownZone, 'id' | 'created_at' | 'updated_at'>): Promise<GodownZone | null> => {
  try {
    const { data, error } = await supabase
      .from('godown_zones')
      .insert([zone])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating zone:', error);
    throw error;
  }
};

export const updateZone = async (id: string, updates: Partial<GodownZone>): Promise<GodownZone | null> => {
  try {
    const { data, error } = await supabase
      .from('godown_zones')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating zone:', error);
    throw error;
  }
};

export const deleteZone = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('godown_zones')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting zone:', error);
    throw error;
  }
};

// ==================== GODOWN STOCK OPERATIONS ====================

export const getGodownStock = async (productId?: string, godownId?: string): Promise<GodownStock[]> => {
  try {
    let query = supabase
      .from('godown_stock')
      .select(`
        *,
        products (name, sku, barcode),
        godowns (name, code),
        godown_zones (zone_name, zone_code)
      `);
    
    if (productId) {
      query = query.eq('product_id', productId);
    }
    
    if (godownId) {
      query = query.eq('godown_id', godownId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching godown stock:', error);
    throw error;
  }
};

export const updateGodownStock = async (
  productId: string, 
  godownId: string, 
  zoneId: string | null,
  quantityChange: number
): Promise<void> => {
  try {
    // Check if stock record exists
    let query = supabase
      .from('godown_stock')
      .select('*')
      .eq('product_id', productId)
      .eq('godown_id', godownId);
    
    // Use .is() for NULL zone_id, .eq() for non-NULL UUID comparison
    if (zoneId) {
      query = query.eq('zone_id', zoneId);
    } else {
      query = query.is('zone_id', null);
    }
    
    const { data: existingStock, error: fetchError } = await query.maybeSingle();
    
    if (fetchError) {
      console.error('Error fetching godown stock:', fetchError);
      throw fetchError;
    }
    
    if (existingStock) {
      // Update existing stock
      const newQuantity = existingStock.quantity + quantityChange;
      
      if (newQuantity <= 0) {
        // Delete the record when quantity reaches 0 or below (no ghost entries)
        const { error: deleteError } = await supabase
          .from('godown_stock')
          .delete()
          .eq('id', existingStock.id);
        
        if (deleteError) throw deleteError;
      } else {
        const { error: updateError } = await supabase
          .from('godown_stock')
          .update({ 
            quantity: newQuantity,
            last_updated: new Date().toISOString()
          })
          .eq('id', existingStock.id);
        
        if (updateError) throw updateError;
      }
    } else {
      // Create new stock record
      const { error: insertError } = await supabase
        .from('godown_stock')
        .insert([{
          product_id: productId,
          godown_id: godownId,
          zone_id: zoneId,
          quantity: Math.max(0, quantityChange),
          reserved_quantity: 0,
          min_stock_level: 0,
          max_stock_level: 10000
        }]);
      
      if (insertError) throw insertError;
    }
  } catch (error) {
    console.error('Error updating godown stock:', error);
    throw error;
  }
};

// ==================== STOCK TRANSFER OPERATIONS ====================

export const getStockTransfers = async (status?: string): Promise<StockTransfer[]> => {
  try {
    let query = supabase
      .from('stock_transfers')
      .select(`
        *,
        from_godown:godowns!from_godown_id (name, code),
        to_godown:godowns!to_godown_id (name, code),
        stock_transfer_items (
          *,
          products (name, sku)
        )
      `)
      .order('created_at', { ascending: false });
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching stock transfers:', error);
    throw error;
  }
};

export const createStockTransfer = async (
  transfer: Omit<StockTransfer, 'id' | 'created_at' | 'updated_at'>,
  items: Omit<StockTransferItem, 'id' | 'created_at'>[]
): Promise<StockTransfer | null> => {
  try {
    // Start a transaction
    const { data: transferData, error: transferError } = await supabase
      .from('stock_transfers')
      .insert([transfer])
      .select()
      .single();
    
    if (transferError) throw transferError;
    
    // Add items
    const itemsWithTransferId = items.map(item => ({
      ...item,
      transfer_id: transferData.id
    }));
    
    const { error: itemsError } = await supabase
      .from('stock_transfer_items')
      .insert(itemsWithTransferId);
    
    if (itemsError) throw itemsError;
    
    return transferData;
  } catch (error) {
    console.error('Error creating stock transfer:', error);
    throw error;
  }
};

export const updateTransferStatus = async (
  transferId: string, 
  status: StockTransfer['status'],
  userId?: string
): Promise<StockTransfer | null> => {
  try {
    const updates: any = { status };
    
    if (status === 'approved') {
      updates.approved_by = userId;
      updates.approval_date = new Date().toISOString();
    } else if (status === 'completed') {
      updates.completed_by = userId;
      updates.completion_date = new Date().toISOString();
    }
    
    const { data, error } = await supabase
      .from('stock_transfers')
      .update(updates)
      .eq('id', transferId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating transfer status:', error);
    throw error;
  }
};

export const generateTransferNumber = async (): Promise<string> => {
  const prefix = 'TRF';
  const date = new Date();
  const yearMonth = date.getFullYear().toString() + (date.getMonth() + 1).toString().padStart(2, '0');
  
  try {
    const { data, error } = await supabase
      .from('stock_transfers')
      .select('transfer_number')
      .ilike('transfer_number', `${prefix}-${yearMonth}%`)
      .order('transfer_number', { ascending: false })
      .limit(1);
    
    if (error) throw error;
    
    let sequence = 1;
    if (data && data.length > 0) {
      const lastNumber = data[0].transfer_number;
      const match = lastNumber.match(/-(\d+)$/);
      if (match) {
        sequence = parseInt(match[1]) + 1;
      }
    }
    
    return `${prefix}-${yearMonth}-${sequence.toString().padStart(4, '0')}`;
  } catch (error) {
    console.error('Error generating transfer number:', error);
    return `${prefix}-${yearMonth}-0001`;
  }
};
