import { supabase } from '@/lib/supabaseClient';

const SAVED_GRNS_KEY = 'savedGRNs';

export interface GRNItem {
  id: string;
  description: string;
  quantity: number;
  delivered: number;
  soldout: number;
  rejectedOut: number;
  rejectionIn: number;
  damaged: number;
  complimentary: number;
  physicalStock: number;
  available: number;
  unit: string;
  originalUnitCost?: number;  // Original cost per unit (without receiving costs)
  unitCost: number;
  total: number;
  batchNumber?: string;
  expiryDate?: string;
  remarks?: string;
  receivingCostPerUnit?: number;
  totalWithReceivingCost?: number;
  rate?: number;
}

export interface GRNData {
  grnNumber: string;
  date: string;
  time: string;
  supplierName: string;
  supplierId: string;
  supplierPhone: string;
  supplierEmail: string;
  supplierAddress: string;
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;
  businessStockType?: string;
  isVatable?: boolean;
  supplierTinNumber?: string;
  poNumber: string;
  deliveryNoteNumber: string;
  vehicleNumber: string;
  driverName: string;
  receivedBy: string;
  receivedLocation?: string;
  items: GRNItem[];
  qualityCheckNotes: string;
  discrepancies: string;
  preparedBy: string;
  preparedDate: string;
  checkedBy: string;
  checkedDate: string;
  approvedBy: string;
  approvedDate: string;
  receivedDate: string;
  status?: "draft" | "pending" | "received" | "checked" | "approved" | "completed" | "cancelled";
  receivingCosts: Array<{ description: string; amount: number }>;
}

export interface SavedGRN {
  id: string;
  name: string;
  data: GRNData;
  total: number;
  createdAt: string;
  updatedAt: string;
}

export const saveGRN = async (grn: SavedGRN): Promise<void> => {
  try {
    console.log('=== STARTING GRN SAVE ===');
    console.log('GRN ID:', grn.id);
    console.log('GRN Number:', grn.data.grnNumber);
    console.log('Supplier:', grn.data.supplierName);
    
    // Validate GRN data
    if (!grn.data.grnNumber) {
      throw new Error('GRN number is required');
    }
    if (!grn.data.supplierName) {
      throw new Error('Supplier name is required');
    }
    
    // First, save to localStorage for immediate availability
    console.log('1. Saving to localStorage...');
    const savedGRNs = await getSavedGRNs();
    const updatedGRNs = [...savedGRNs, grn];
    localStorage.setItem(SAVED_GRNS_KEY, JSON.stringify(updatedGRNs));
    console.log('✓ Saved to localStorage successfully');
    
    // Then save to database with user context
    console.log('2. Checking authentication...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.warn('Auth error:', authError.message);
      console.log('Proceeding with localStorage only');
      return;
    }
    
    if (!user) {
      console.log('No authenticated user, saving to localStorage only');
      return;
    }
    
    console.log('User authenticated:', user.id);
    
    // Calculate total from items
    const totalAmount = Array.isArray(grn.data.items) 
      ? grn.data.items.reduce((sum, item) => {
          return sum + Number(item.totalWithReceivingCost || item.total || 0);
        }, 0)
      : 0;
    
    // Prepare data for database insert
    const insertData = {
      user_id: user.id,
      grn_number: grn.data.grnNumber,
      supplier_name: grn.data.supplierName,
      supplier_id: grn.data.supplierId || '',
      supplier_phone: grn.data.supplierPhone || '',
      supplier_email: grn.data.supplierEmail || '',
      supplier_address: grn.data.supplierAddress || '',
      business_name: grn.data.businessName || '',
      business_address: grn.data.businessAddress || '',
      business_phone: grn.data.businessPhone || '',
      business_email: grn.data.businessEmail || '',
      business_stock_type: grn.data.businessStockType || null,
      is_vatable: grn.data.isVatable || false,
      supplier_tin_number: grn.data.supplierTinNumber || '',
      po_number: grn.data.poNumber || '',
      delivery_note_number: grn.data.deliveryNoteNumber || '',
      vehicle_number: grn.data.vehicleNumber || '',
      driver_name: grn.data.driverName || '',
      received_by: grn.data.receivedBy || '',
      received_location: grn.data.receivedLocation || '',
      items: Array.isArray(grn.data.items) ? grn.data.items : [],
      receiving_costs: Array.isArray(grn.data.receivingCosts) ? grn.data.receivingCosts : [],
      quality_check_notes: grn.data.qualityCheckNotes || '',
      discrepancies: grn.data.discrepancies || '',
      prepared_by: grn.data.preparedBy || '',
      prepared_date: grn.data.preparedDate ? new Date(grn.data.preparedDate).toISOString().split('T')[0] : null,
      checked_by: grn.data.checkedBy || '',
      checked_date: grn.data.checkedDate ? new Date(grn.data.checkedDate).toISOString().split('T')[0] : null,
      approved_by: grn.data.approvedBy || '',
      approved_date: grn.data.approvedDate ? new Date(grn.data.approvedDate).toISOString().split('T')[0] : null,
      received_date: grn.data.receivedDate ? new Date(grn.data.receivedDate).toISOString().split('T')[0] : null,
      status: grn.data.status || 'pending',
      total_amount: totalAmount,
      created_at: grn.createdAt || new Date().toISOString(),
      updated_at: grn.updatedAt || new Date().toISOString()
    };
    
    console.log('3. Attempting database insert...');
    const { data, error } = await supabase
      .from('saved_grns')
      .insert(insertData)
      .select();
    
    if (error) {
      console.error('❌ Database insert failed:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      // Data will still be available in localStorage
      console.log('✓ Data saved to localStorage as fallback');
      return;
    }
    
    console.log('✓ Database insert successful');
    console.log('Inserted record ID:', data?.[0]?.id);
    
  } catch (error: any) {
    console.error('❌ Error in saveGRN function:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    // Still save to localStorage as fallback
    try {
      const savedGRNs = await getSavedGRNs();
      const updatedGRNs = [...savedGRNs, grn];
      localStorage.setItem(SAVED_GRNS_KEY, JSON.stringify(updatedGRNs));
      console.log('✓ Emergency save to localStorage successful');
    } catch (localStorageError) {
      console.error('❌ Failed to save to localStorage:', localStorageError);
    }
    
    throw new Error(`Failed to save GRN: ${error.message}`);
  }
};

export const getSavedGRNs = async (): Promise<SavedGRN[]> => {
  try {
    console.log('Getting saved GRNs...');
    
    // First, try to get from database
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('Auth user for retrieval:', user);
    console.log('Auth error for retrieval:', authError);
    
    if (user) {
      console.log('Attempting to retrieve from database...');
      const { data, error } = await supabase
        .from('saved_grns')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100); // Limit to prevent performance issues
      
      console.log('Database retrieval result:', data);
      console.log('Database retrieval error:', error);
      
      if (error) {
        console.error('Error retrieving saved GRNs from database:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        // Fallback to localStorage with proper error handling
        console.log('Falling back to localStorage');
        return getLocalStorageGRNs();
      }
      
      if (!data || data.length === 0) {
        console.log('No GRNs found in database, checking localStorage');
        return getLocalStorageGRNs();
      }
      
      // Transform database records to SavedGRN format
      const result = data.map(dbGRN => {
        // Parse items if they're stored as string
        let items = [];
        if (typeof dbGRN.items === 'string') {
          try {
            items = JSON.parse(dbGRN.items);
          } catch (e) {
            console.error('Error parsing items JSON:', e);
            items = [];
          }
        } else {
          items = Array.isArray(dbGRN.items) ? dbGRN.items : [];
        }
        
        // Parse receiving_costs if they exist
        let receivingCosts = [];
        if (typeof dbGRN.receiving_costs === 'string') {
          try {
            receivingCosts = JSON.parse(dbGRN.receiving_costs);
          } catch (e) {
            console.error('Error parsing receiving_costs JSON:', e);
            receivingCosts = [];
          }
        } else {
          receivingCosts = Array.isArray(dbGRN.receiving_costs) ? dbGRN.receiving_costs : [];
        }
        
        // Calculate total if not present
        const calculatedTotal = items.reduce((sum: number, item: any) => {
          return sum + Number(item.totalWithReceivingCost || item.total || 0);
        }, 0);
        
        return {
          id: dbGRN.id,
          name: `GRN-${dbGRN.grn_number}`,
          total: dbGRN.total_amount || calculatedTotal || 0,
          data: {
            grnNumber: dbGRN.grn_number,
            date: dbGRN.received_date || dbGRN.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
            time: '',
            supplierName: dbGRN.supplier_name || '',
            supplierId: dbGRN.supplier_id || '',
            supplierPhone: dbGRN.supplier_phone || '',
            supplierEmail: dbGRN.supplier_email || '',
            supplierAddress: dbGRN.supplier_address || '',
            businessName: dbGRN.business_name || '',
            businessAddress: dbGRN.business_address || '',
            businessPhone: dbGRN.business_phone || '',
            businessEmail: dbGRN.business_email || '',
            businessStockType: dbGRN.business_stock_type || '',
            isVatable: dbGRN.is_vatable || false,
            supplierTinNumber: dbGRN.supplier_tin_number || '',
            poNumber: dbGRN.po_number || '',
            deliveryNoteNumber: dbGRN.delivery_note_number || '',
            vehicleNumber: dbGRN.vehicle_number || '',
            driverName: dbGRN.driver_name || '',
            receivedBy: dbGRN.received_by || '',
            receivedLocation: dbGRN.received_location || '',
            items: items,
            qualityCheckNotes: dbGRN.quality_check_notes || '',
            discrepancies: dbGRN.discrepancies || '',
            preparedBy: dbGRN.prepared_by || '',
            preparedDate: dbGRN.prepared_date ? dbGRN.prepared_date.toString() : '',
            checkedBy: dbGRN.checked_by || '',
            checkedDate: dbGRN.checked_date ? dbGRN.checked_date.toString() : '',
            approvedBy: dbGRN.approved_by || '',
            approvedDate: dbGRN.approved_date ? dbGRN.approved_date.toString() : '',
            receivedDate: dbGRN.received_date ? dbGRN.received_date.toString() : '',
            status: dbGRN.status || 'pending',
            receivingCosts: receivingCosts,
            timestamp: ''
          },
          createdAt: dbGRN.created_at || new Date().toISOString(),
          updatedAt: dbGRN.updated_at || new Date().toISOString()
        };
      });
      
      console.log('Transformed database result:', result);
      return result;
    } else {
      // If not authenticated, use localStorage
      console.log('Not authenticated, using localStorage');
      return getLocalStorageGRNs();
    }
  } catch (error: any) {
    console.error('Error retrieving saved GRNs:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    // Fallback to localStorage on any error
    return getLocalStorageGRNs();
  }
};

// Helper function to get GRNs from localStorage
const getLocalStorageGRNs = (): SavedGRN[] => {
  try {
    const saved = localStorage.getItem(SAVED_GRNS_KEY);
    let result = saved ? JSON.parse(saved) : [];
    
    // Ensure each GRN has proper structure
    result = result.map((grn: any) => {
      // Ensure data object exists
      if (!grn.data) {
        grn.data = {};
      }
      
      // Ensure items array exists
      if (!Array.isArray(grn.data.items)) {
        grn.data.items = [];
      }
      
      // Calculate total if not present
      if (typeof grn.total === 'undefined' || grn.total === null) {
        const total = grn.data.items.reduce((sum: number, item: any) => {
          return sum + Number(item.totalWithReceivingCost || item.total || 0);
        }, 0);
        grn.total = total;
      }
      
      // Ensure required fields exist
      if (!grn.id) grn.id = `local-${Date.now()}-${Math.random()}`;
      if (!grn.createdAt) grn.createdAt = new Date().toISOString();
      if (!grn.updatedAt) grn.updatedAt = new Date().toISOString();
      if (!grn.name) grn.name = `Local GRN ${grn.id.substring(0, 8)}`;
      
      return grn;
    });
    
    console.log('LocalStorage result:', result);
    return result;
  } catch (error) {
    console.error('Error parsing localStorage GRNs:', error);
    return [];
  }
};

export const deleteGRN = async (grnId: string): Promise<void> => {
  try {
    // First, remove from localStorage
    const savedGRNs = await getSavedGRNs();
    const updatedGRNs = savedGRNs.filter(grn => grn.id !== grnId);
    localStorage.setItem(SAVED_GRNS_KEY, JSON.stringify(updatedGRNs));
    
    // Then remove from database
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase
        .from('saved_grns')
        .delete()
        .eq('user_id', user.id)
        .eq('id', grnId);
      
      if (error) {
        console.error('Error deleting GRN from database:', error);
        // Don't throw error - still have local storage sync
      }
    }
  } catch (error) {
    console.error('Error deleting GRN:', error);
    throw new Error('Failed to delete GRN');
  }
};

export const updateGRN = async (updatedGRN: SavedGRN): Promise<void> => {
  try {
    const savedGRNs = await getSavedGRNs();
    const updatedGRNs = savedGRNs.map(grn => 
      grn.id === updatedGRN.id ? updatedGRN : grn
    );
    localStorage.setItem(SAVED_GRNS_KEY, JSON.stringify(updatedGRNs));
    
    // Calculate total from items
    const totalAmount = updatedGRN.data.items?.reduce((sum, item) => {
      return sum + Number(item.totalWithReceivingCost || item.total || 0);
    }, 0) || 0;
    
    // Also update in database
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase
        .from('saved_grns')
        .update({
          grn_number: updatedGRN.data.grnNumber,
          supplier_name: updatedGRN.data.supplierName,
          po_number: updatedGRN.data.poNumber,
          items: updatedGRN.data.items,
          total_amount: totalAmount,
          status: updatedGRN.data.status,
          updated_at: updatedGRN.updatedAt
        })
        .eq('user_id', user.id)
        .eq('id', updatedGRN.id);
      
      if (error) {
        console.error('Error updating GRN in database:', error);
        // Don't throw error - still have local storage backup
      }
    }
  } catch (error) {
    console.error('Error updating GRN:', error);
    throw new Error('Failed to update GRN');
  }
};