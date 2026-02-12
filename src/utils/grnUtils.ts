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
  status?: "completed" | "pending" | "cancelled";
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
    console.log('=== STARTING GRN SAVE DEBUG ===');
    console.log('GRN Object:', JSON.stringify(grn, null, 2));
    
    // First, save to localStorage for immediate availability
    console.log('1. Saving to localStorage...');
    const savedGRNs = await getSavedGRNs();
    const updatedGRNs = [...savedGRNs, grn];
    localStorage.setItem(SAVED_GRNS_KEY, JSON.stringify(updatedGRNs));
    console.log('✓ Saved to localStorage successfully');
    
    // Then save to database with user context
    console.log('2. Checking authentication...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('Auth user:', user);
    console.log('Auth error:', authError);
    
    if (user) {
      console.log('3. Preparing database insert...');
      
      // Validate required fields
      const requiredFields = {
        user_id: user.id,
        grn_number: grn.data.grnNumber,
        supplier_name: grn.data.supplierName,
        po_number: grn.data.poNumber,
        status: grn.data.status || 'completed'
      };
      
      console.log('Required fields:', requiredFields);
      
      // Calculate total from items
      const totalAmount = grn.data.items?.reduce((sum, item) => {
        return sum + Number(item.totalWithReceivingCost || item.total || 0);
      }, 0) || 0;
      
      // Prepare full data object
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
        po_number: grn.data.poNumber,
        delivery_note_number: grn.data.deliveryNoteNumber || '',
        vehicle_number: grn.data.vehicleNumber || '',
        driver_name: grn.data.driverName || '',
        received_by: grn.data.receivedBy || '',
        received_location: grn.data.receivedLocation || '',
        items: grn.data.items,
        receiving_costs: grn.data.receivingCosts,
        quality_check_notes: grn.data.qualityCheckNotes || '',
        discrepancies: grn.data.discrepancies || '',
        prepared_by: grn.data.preparedBy || '',
        prepared_date: grn.data.preparedDate ? new Date(grn.data.preparedDate).toISOString().split('T')[0] : null,
        checked_by: grn.data.checkedBy || '',
        checked_date: grn.data.checkedDate ? new Date(grn.data.checkedDate).toISOString().split('T')[0] : null,
        approved_by: grn.data.approvedBy || '',
        approved_date: grn.data.approvedDate ? new Date(grn.data.approvedDate).toISOString().split('T')[0] : null,
        received_date: grn.data.receivedDate ? new Date(grn.data.receivedDate).toISOString().split('T')[0] : null,
        status: grn.data.status || 'completed',
        total_amount: totalAmount,
        created_at: grn.createdAt,
        updated_at: grn.updatedAt
      };
      
      console.log('Full insert data:', JSON.stringify(insertData, null, 2));
      
      console.log('4. Attempting database insert...');
      const { data, error } = await supabase
        .from('saved_grns')
        .insert(insertData)
        .select();
      
      console.log('Database response data:', data);
      console.log('Database response error:', error);
      
      if (error) {
        console.error('❌ DATABASE INSERT FAILED');
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        console.error('Error hint:', error.hint);
        
        // Try a minimal insert to isolate the issue
        console.log('5. Trying minimal insert...');
        const minimalInsert = {
          user_id: user.id,
          grn_number: grn.data.grnNumber,
          supplier_name: grn.data.supplierName,
          po_number: grn.data.poNumber,
          status: grn.data.status || 'completed'
        };
        
        console.log('Minimal insert data:', minimalInsert);
        const { data: minimalData, error: minimalError } = await supabase
          .from('saved_grns')
          .insert(minimalInsert)
          .select();
          
        console.log('Minimal insert result:', minimalData);
        console.log('Minimal insert error:', minimalError);
        
        if (minimalError) {
          console.error('❌ Even minimal insert failed');
          console.error('Minimal error code:', minimalError.code);
          console.error('Minimal error message:', minimalError.message);
        } else {
          console.log('✓ Minimal insert succeeded');
        }
      } else {
        console.log('✓ Database insert successful');
        console.log('Inserted record:', data);
      }
    } else {
      console.log('⚠ User not authenticated, skipping database save');
    }
    
    console.log('=== END GRN SAVE DEBUG ===');
  } catch (error) {
    console.error('❌ Error in saveGRN function:', error);
    throw new Error('Failed to save GRN: ' + error.message);
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
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      console.log('Database retrieval result:', data);
      console.log('Database retrieval error:', error);
      
      if (error) {
        console.error('Error retrieving saved GRNs from database:', error);
        // Fallback to localStorage
        console.log('Falling back to localStorage');
        const saved = localStorage.getItem(SAVED_GRNS_KEY);
        let result = saved ? JSON.parse(saved) : [];
        
        // Ensure each GRN has a total property calculated from items if not present
        result = result.map(grn => {
          if (typeof grn.total === 'undefined' && grn.data && grn.data.items) {
            const total = grn.data.items.reduce((sum, item) => {
              return sum + Number(item.totalWithReceivingCost || item.total || 0);
            }, 0);
            return { ...grn, total };
          }
          return grn;
        });
        
        console.log('LocalStorage result:', result);
        return result;
      }
      
      // Transform database records to SavedGRN format
      const result = data.map(dbGRN => ({
        id: dbGRN.id,
        name: dbGRN.name,
        total: dbGRN.total_amount || 0, // Include the total from database
        data: {
          grnNumber: dbGRN.grn_number,
          date: dbGRN.received_date || dbGRN.created_at.split('T')[0],
          time: '', // This might not be stored in DB
          supplierName: dbGRN.supplier_name,
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
          items: dbGRN.items || [],
          qualityCheckNotes: dbGRN.quality_check_notes || '',
          discrepancies: dbGRN.discrepancies || '',
          preparedBy: dbGRN.prepared_by || '',
          preparedDate: dbGRN.prepared_date || '',
          checkedBy: dbGRN.checked_by || '',
          checkedDate: dbGRN.checked_date || '',
          approvedBy: dbGRN.approved_by || '',
          approvedDate: dbGRN.approved_date || '',
          receivedDate: dbGRN.received_date || '',
          status: dbGRN.status || 'completed',
          receivingCosts: dbGRN.receiving_costs || [],
          timestamp: '' // This might not be stored in DB
        },
        createdAt: dbGRN.created_at,
        updatedAt: dbGRN.updated_at
      }));
      console.log('Transformed database result:', result);
      return result;
    } else {
      // If not authenticated, use localStorage
      console.log('Not authenticated, using localStorage');
      const saved = localStorage.getItem(SAVED_GRNS_KEY);
      let result = saved ? JSON.parse(saved) : [];
      
      // Ensure each GRN has a total property calculated from items if not present
      result = result.map(grn => {
        if (typeof grn.total === 'undefined' && grn.data && grn.data.items) {
          const total = grn.data.items.reduce((sum, item) => {
            return sum + Number(item.totalWithReceivingCost || item.total || 0);
          }, 0);
          return { ...grn, total };
        }
        return grn;
      });
      
      console.log('LocalStorage result (unauthenticated):', result);
      return result;
    }
  } catch (error) {
    console.error('Error retrieving saved GRNs:', error);
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