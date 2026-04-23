import { supabase } from '@/lib/supabaseClient';

const SAVED_DELIVERIES_KEY = 'savedDeliveries';

export interface DeliveryData {
  id: string;
  deliveryNoteNumber: string;
  date: string;
  customer: string;
  items: number;
  total: number;
  paymentMethod: string;
  status: "completed" | "in-transit" | "pending" | "delivered" | "cancelled";
  itemsList?: any[];
  subtotal?: number;
  tax?: number;
  discount?: number;
  amountReceived?: number;
  change?: number;
  vehicle?: string;
  driver?: string;
  deliveryNotes?: string;
  outletId?: string;
  deliveryType?: 'in' | 'out'; // 'in' for incoming, 'out' for outgoing
}

export const saveDelivery = async (delivery: DeliveryData): Promise<void> => {
  try {
    // Save to database first (source of truth)
    let dbSaveSuccessful = false;
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { error } = await supabase
        .from('saved_delivery_notes')
        .insert({
          user_id: user.id,
          delivery_note_number: delivery.deliveryNoteNumber,
          date: delivery.date,
          customer: delivery.customer,
          items: delivery.items,
          total: delivery.total,
          payment_method: delivery.paymentMethod,
          status: delivery.status,
          items_list: delivery.itemsList,
          subtotal: delivery.subtotal,
          tax: delivery.tax,
          discount: delivery.discount,
          amount_received: delivery.amountReceived,
          change: delivery.change,
          vehicle: delivery.vehicle,
          driver: delivery.driver,
          delivery_notes: delivery.deliveryNotes,
          outlet_id: delivery.outletId
        });
        
      if (error) {
        console.error('Error saving delivery to database:', error);
      } else {
        dbSaveSuccessful = true;
      }
    }
    
    // Update localStorage ONLY with current user's deliveries to avoid duplicates
    // Get fresh list from database if DB save was successful, otherwise use existing localStorage
    let deliveriesToStore: DeliveryData[];
    
    if (dbSaveSuccessful && user) {
      // Fetch fresh data from database to ensure consistency
      const { data: dbDeliveries } = await supabase
        .from('saved_delivery_notes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (dbDeliveries) {
        deliveriesToStore = dbDeliveries.map(dbDelivery => ({
          id: dbDelivery.id,
          deliveryNoteNumber: dbDelivery.delivery_note_number,
          date: dbDelivery.date,
          customer: dbDelivery.customer,
          items: dbDelivery.items,
          total: dbDelivery.total,
          paymentMethod: dbDelivery.payment_method,
          status: dbDelivery.status,
          itemsList: dbDelivery.items_list,
          subtotal: dbDelivery.subtotal,
          tax: dbDelivery.tax,
          discount: dbDelivery.discount,
          amountReceived: dbDelivery.amount_received,
          change: dbDelivery.change,
          vehicle: dbDelivery.vehicle,
          driver: dbDelivery.driver,
          deliveryNotes: dbDelivery.delivery_notes,
          outletId: dbDelivery.outlet_id
        }));
      } else {
        deliveriesToStore = [];
      }
    } else {
      // Fallback: add to existing localStorage (offline mode)
      const existingStored = localStorage.getItem(SAVED_DELIVERIES_KEY);
      const existingDeliveries = existingStored ? JSON.parse(existingStored) : [];
      
      // Check for duplicates before adding
      const exists = existingDeliveries.some(
        d => d.deliveryNoteNumber === delivery.deliveryNoteNumber
      );
      
      if (!exists) {
        deliveriesToStore = [...existingDeliveries, delivery];
      } else {
        deliveriesToStore = existingDeliveries;
      }
    }
    
    // Store consolidated list in localStorage
    localStorage.setItem(SAVED_DELIVERIES_KEY, JSON.stringify(deliveriesToStore));
    
  } catch (error) {
    console.error('Error saving delivery:', error);
    throw new Error('Failed to save delivery');
  }
};

export const getSavedDeliveries = async (): Promise<DeliveryData[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Check if user is admin to determine query scope
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      
      let query = supabase.from('saved_delivery_notes').select('*');
      
      // Admins can see all deliveries, others see only their own
      if (userData?.role !== 'admin') {
        query = query.eq('user_id', user.id);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error retrieving saved deliveries from database:', error);
        // Fallback to localStorage
        const saved = localStorage.getItem(SAVED_DELIVERIES_KEY);
        return saved ? JSON.parse(saved) : [];
      }
      
      // Transform database records to DeliveryData format
      const deliveries = data.map(dbDelivery => ({
        id: dbDelivery.id,
        deliveryNoteNumber: dbDelivery.delivery_note_number,
        date: dbDelivery.date,
        customer: dbDelivery.customer,
        items: dbDelivery.items,
        total: dbDelivery.total,
        paymentMethod: dbDelivery.payment_method,
        status: dbDelivery.status,
        itemsList: dbDelivery.items_list,
        subtotal: dbDelivery.subtotal,
        tax: dbDelivery.tax,
        discount: dbDelivery.discount,
        amountReceived: dbDelivery.amount_received,
        change: dbDelivery.change,
        vehicle: dbDelivery.vehicle,
        driver: dbDelivery.driver,
        deliveryNotes: dbDelivery.delivery_notes,
        outletId: dbDelivery.outlet_id
      }));
      
      return deliveries;
    } else {
      // If not authenticated, use localStorage
      const saved = localStorage.getItem(SAVED_DELIVERIES_KEY);
      return saved ? JSON.parse(saved) : [];
    }
  } catch (error) {
    console.error('Error retrieving saved deliveries:', error);
    return [];
  }
};

export const deleteDelivery = async (deliveryId: string): Promise<void> => {
  try {
    // Delete from database first (source of truth)
    const { data: { user } } = await supabase.auth.getUser();
    let dbDeleteSuccessful = false;
    
    if (user) {
      // Check if user is admin to determine delete scope
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      
      let query = supabase.from('saved_delivery_notes').delete();
      
      // Admins can delete any delivery, others can only delete their own
      if (userData?.role !== 'admin') {
        query = query.eq('user_id', user.id);
      }
      
      const { error } = await query.eq('id', deliveryId);
        
      if (error) {
        console.error('Error deleting delivery from database:', error);
      } else {
        dbDeleteSuccessful = true;
      }
    }
    
    // Update localStorage after successful DB deletion or as fallback
    if (dbDeleteSuccessful) {
      // Refresh localStorage from database to ensure consistency
      const { data: dbDeliveries } = await supabase
        .from('saved_delivery_notes')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      
      if (dbDeliveries) {
        const deliveriesToStore = dbDeliveries.map(dbDelivery => ({
          id: dbDelivery.id,
          deliveryNoteNumber: dbDelivery.delivery_note_number,
          date: dbDelivery.date,
          customer: dbDelivery.customer,
          items: dbDelivery.items,
          total: dbDelivery.total,
          paymentMethod: dbDelivery.payment_method,
          status: dbDelivery.status,
          itemsList: dbDelivery.items_list,
          subtotal: dbDelivery.subtotal,
          tax: dbDelivery.tax,
          discount: dbDelivery.discount,
          amountReceived: dbDelivery.amount_received,
          change: dbDelivery.change,
          vehicle: dbDelivery.vehicle,
          driver: dbDelivery.driver,
          deliveryNotes: dbDelivery.delivery_notes,
          outletId: dbDelivery.outlet_id
        }));
        localStorage.setItem(SAVED_DELIVERIES_KEY, JSON.stringify(deliveriesToStore));
      }
    } else {
      // Fallback: remove from localStorage only
      const existingStored = localStorage.getItem(SAVED_DELIVERIES_KEY);
      if (existingStored) {
        const existingDeliveries = JSON.parse(existingStored);
        const updatedDeliveries = existingDeliveries.filter(
          delivery => delivery.id !== deliveryId
        );
        localStorage.setItem(SAVED_DELIVERIES_KEY, JSON.stringify(updatedDeliveries));
      }
    }
  } catch (error) {
    console.error('Error deleting delivery:', error);
    throw new Error('Failed to delete delivery');
  }
};

export const updateDelivery = async (updatedDelivery: DeliveryData): Promise<void> => {
  try {
    console.log('🔄 Starting delivery update...', updatedDelivery.id);
    
    // Update database first (source of truth)
    const { data: { user } } = await supabase.auth.getUser();
    let dbUpdateSuccessful = false;
    
    if (user) {
      console.log('👤 User authenticated:', user.id);
      
      // Check if user is admin to determine update scope
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      
      console.log('📝 User role:', userData?.role);
      
      // Validate numeric fields to prevent NaN serialization errors
      const updateData = {
        delivery_note_number: updatedDelivery.deliveryNoteNumber,
        date: updatedDelivery.date,
        customer: updatedDelivery.customer,
        items: updatedDelivery.items || 0,
        total: updatedDelivery.total || 0,
        payment_method: updatedDelivery.paymentMethod,
        status: updatedDelivery.status,
        items_list: updatedDelivery.itemsList,
        subtotal: updatedDelivery.subtotal || 0,
        tax: updatedDelivery.tax || 0,
        discount: updatedDelivery.discount || 0,
        amount_received: updatedDelivery.amountReceived || 0,
        change: updatedDelivery.change || 0,
        vehicle: updatedDelivery.vehicle,
        driver: updatedDelivery.driver,
        delivery_notes: updatedDelivery.deliveryNotes,
        outlet_id: updatedDelivery.outletId
      };
      
      console.log('📦 Update data:', JSON.stringify(updateData, null, 2));
      
      let query = supabase.from('saved_delivery_notes').update(updateData);
      
      // Admins can update any delivery, others can only update their own
      if (userData?.role !== 'admin') {
        query = query.eq('user_id', user.id);
        console.log('🔒 Non-admin user: filtering by user_id');
      } else {
        console.log('🔓 Admin user: can update any delivery');
      }
      
      const { error } = await query.eq('id', updatedDelivery.id);
        
      if (error) {
        console.error('❌ Error updating delivery in database:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw new Error(`Database update failed: ${error.message}`);
      } else {
        console.log('✅ Database update successful');
        dbUpdateSuccessful = true;
      }
    } else {
      console.warn('⚠️ No authenticated user found');
    }
    
    // Update localStorage after successful DB update or as fallback
    if (dbUpdateSuccessful && user) {
      // Refresh localStorage from database to ensure consistency
      const { data: dbDeliveries } = await supabase
        .from('saved_delivery_notes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (dbDeliveries) {
        const deliveriesToStore = dbDeliveries.map(dbDelivery => ({
          id: dbDelivery.id,
          deliveryNoteNumber: dbDelivery.delivery_note_number,
          date: dbDelivery.date,
          customer: dbDelivery.customer,
          items: dbDelivery.items,
          total: dbDelivery.total,
          paymentMethod: dbDelivery.payment_method,
          status: dbDelivery.status,
          itemsList: dbDelivery.items_list,
          subtotal: dbDelivery.subtotal,
          tax: dbDelivery.tax,
          discount: dbDelivery.discount,
          amountReceived: dbDelivery.amount_received,
          change: dbDelivery.change,
          vehicle: dbDelivery.vehicle,
          driver: dbDelivery.driver,
          deliveryNotes: dbDelivery.delivery_notes,
          outletId: dbDelivery.outlet_id
        }));
        localStorage.setItem(SAVED_DELIVERIES_KEY, JSON.stringify(deliveriesToStore));
      }
    } else {
      // Fallback: update localStorage only
      const existingStored = localStorage.getItem(SAVED_DELIVERIES_KEY);
      if (existingStored) {
        const existingDeliveries = JSON.parse(existingStored);
        const updatedDeliveries = existingDeliveries.map(delivery => 
          delivery.id === updatedDelivery.id ? updatedDelivery : delivery
        );
        localStorage.setItem(SAVED_DELIVERIES_KEY, JSON.stringify(updatedDeliveries));
      }
    }
  } catch (error) {
    console.error('Error updating delivery:', error);
    throw new Error('Failed to update delivery');
  }
};

export const getDeliveryById = async (deliveryId: string): Promise<DeliveryData | undefined> => {
  try {
    const savedDeliveries = await getSavedDeliveries();
    return savedDeliveries.find(delivery => delivery.id === deliveryId);
  } catch (error) {
    console.error('Error retrieving delivery by ID:', error);
    return undefined;
  }
};

export const getDeliveriesByOutletId = async (outletId: string): Promise<DeliveryData[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Query deliveries by outlet_id
      const { data, error } = await supabase
        .from('saved_delivery_notes')
        .select('*')
        .eq('outlet_id', outletId)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error retrieving deliveries by outlet ID from database:', error);
        // Fallback to localStorage
        const saved = localStorage.getItem(SAVED_DELIVERIES_KEY);
        if (saved) {
          const deliveries = JSON.parse(saved);
          return deliveries.filter((d: DeliveryData) => d.outletId === outletId);
        }
        return [];
      }
      
      // Transform database records to DeliveryData format
      const deliveries = data.map(dbDelivery => ({
        id: dbDelivery.id,
        deliveryNoteNumber: dbDelivery.delivery_note_number,
        date: dbDelivery.date,
        customer: dbDelivery.customer,
        items: dbDelivery.items,
        total: dbDelivery.total,
        paymentMethod: dbDelivery.payment_method,
        status: dbDelivery.status,
        itemsList: dbDelivery.items_list,
        subtotal: dbDelivery.subtotal,
        tax: dbDelivery.tax,
        discount: dbDelivery.discount,
        amountReceived: dbDelivery.amount_received,
        change: dbDelivery.change,
        vehicle: dbDelivery.vehicle,
        driver: dbDelivery.driver,
        deliveryNotes: dbDelivery.delivery_notes,
        outletId: dbDelivery.outlet_id
      }));
      
      return deliveries;
    } else {
      // If not authenticated, use localStorage
      const saved = localStorage.getItem(SAVED_DELIVERIES_KEY);
      if (saved) {
        const deliveries = JSON.parse(saved);
        return deliveries.filter((d: DeliveryData) => d.outletId === outletId);
      }
      return [];
    }
  } catch (error) {
    console.error('Error retrieving deliveries by outlet ID:', error);
    return [];
  }
};