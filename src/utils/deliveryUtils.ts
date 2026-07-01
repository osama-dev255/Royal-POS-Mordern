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
  sourceType?: 'investment' | 'outlet'; // 'investment' from main warehouse, 'outlet' from another outlet
  sourceOutletId?: string; // ID of the source outlet (if sourceType is 'outlet')
  sourceOutletName?: string; // Name of the source outlet (for display purposes)
  creditBroughtForward?: number; // Credit brought forward from previous deliveries
  // Godown integration fields
  sourceGodownId?: string; // ID of source godown (for outgoing deliveries from warehouse)
  sourceZoneId?: string; // ID of source zone within godown
  destinationGodownId?: string; // ID of destination godown (if delivering to another godown)
  destinationZoneId?: string; // ID of destination zone
  sourceGodownName?: string; // Name of source godown (for display)
  sourceZoneName?: string; // Name of source zone (for display)
}

export const saveDelivery = async (delivery: DeliveryData): Promise<void> => {
  try {
    console.log('💾 Saving delivery to database:', delivery.deliveryNoteNumber);
    
    // NOTE: Database trigger has been DISABLED due to double-update bug
    // We now handle inventory updates in JavaScript to ensure single update
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
          outlet_id: delivery.outletId,
          source_type: delivery.sourceType || 'investment',
          source_outlet_id: delivery.sourceOutletId || null,
          credit_brought_forward: delivery.creditBroughtForward || 0,
          // Godown integration fields
          source_godown_id: delivery.sourceGodownId || null,
          source_zone_id: delivery.sourceZoneId || null,
          destination_godown_id: delivery.destinationGodownId || null,
          destination_zone_id: delivery.destinationZoneId || null,
          // Additional fields from DeliveryDetails view (matching exact View Display)
          business_name: (delivery as any).businessName || null,
          business_address: (delivery as any).businessAddress || null,
          prepared_by_name: (delivery as any).preparedByName || null,
          prepared_by_date: (delivery as any).preparedByDate || null,
          driver_name: (delivery as any).driverName || null,
          driver_date: (delivery as any).driverDate || null,
          received_by_name: (delivery as any).receivedByName || null,
          received_by_date: (delivery as any).receivedByDate || null
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
    
    // CRITICAL: Update outlet inventory in JavaScript ONLY ONCE
    // (Database trigger has been disabled)
    if (dbSaveSuccessful && delivery.outletId && delivery.itemsList && delivery.itemsList.length > 0) {
      try {
        console.log('📦 Updating outlet inventory in JavaScript (trigger disabled)...');
        console.log('📍 Outlet ID:', delivery.outletId);
        console.log('📋 Items:', delivery.itemsList.length);
        
        // Get fresh inventory data
        const { data: outletInventory, error: inventoryError } = await supabase
          .from('inventory_products')
          .select('*')
          .eq('outlet_id', delivery.outletId);
        
        if (inventoryError) {
          console.error('❌ Error loading inventory:', inventoryError);
        } else {
          console.log('📊 Current inventory products:', outletInventory?.length || 0);
          
          // Process each item
          for (const item of delivery.itemsList) {
            const productName = item.name || item.description;
            const deliveredQty = item.quantity || item.delivered || 0;
            
            if (!productName || deliveredQty <= 0) {
              console.log('⏭️ Skip:', productName, deliveredQty);
              continue;
            }
            
            // Get FRESH quantity from database (not cached)
            const existingProduct = outletInventory?.find(p => p.name === productName);
            
            if (existingProduct) {
              // Re-query to get absolute latest value
              const { data: freshData } = await supabase
                .from('inventory_products')
                .select('quantity')
                .eq('id', existingProduct.id)
                .single();
              
              const currentQty = freshData?.quantity || existingProduct.quantity || 0;
              const newQty = currentQty + deliveredQty;
              
              // Get unit cost and selling price from delivery item
              const unitCost = item.rate ?? item.price ?? existingProduct.unit_cost ?? 0;
              const sellingPrice = item.sellingPrice ?? item.rate ?? item.price ?? existingProduct.selling_price ?? 0;
              
              console.log(`📝 ${productName}: ${currentQty} + ${deliveredQty} = ${newQty}`);
              console.log(`💰 ${productName}: unit_cost=${unitCost}, selling_price=${sellingPrice}`);
              
              // Update the product in inventory
              const { error: updateError } = await supabase
                .from('inventory_products')
                .update({
                  quantity: newQty,
                  unit_cost: unitCost,
                  selling_price: sellingPrice,
                  updated_at: new Date().toISOString()
                })
                .eq('id', existingProduct.id);
              
              if (updateError) {
                console.error(`❌ Error updating ${productName}:`, updateError);
              } else {
                console.log(`✅ Updated ${productName} inventory`);
              }
            } else {
              // Create new inventory product
              const { error: insertError } = await supabase
                .from('inventory_products')
                .insert({
                  outlet_id: delivery.outletId,
                  name: productName,
                  quantity: deliveredQty,
                  unit_cost: item.rate ?? item.price ?? 0,
                  selling_price: item.sellingPrice ?? item.rate ?? item.price ?? 0,
                  unit: item.unit ?? 'pcs',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                });
              
              if (insertError) {
                console.error(`❌ Error creating inventory for ${productName}:`, insertError);
              } else {
                console.log(`✅ Created inventory for ${productName}`);
              }
            }
          }
        }
      } catch (error) {
        console.error('❌ Error updating outlet inventory:', error);
      }
    }

    // Update godown stock if source godown is specified (warehouse deliveries)
    console.log('🔍 Checking if delivery godown stock should be updated...');
    console.log('📍 sourceGodownId:', delivery.sourceGodownId);
    console.log('📍 sourceType:', delivery.sourceType);
    console.log('📍 Number of items:', delivery.itemsList?.length);
    
    if (dbSaveSuccessful && delivery.sourceGodownId && delivery.sourceType === 'investment') {
      console.log('✅ Source godown is set, calling updateDeliveryGodownStock...');
      await updateDeliveryGodownStock(delivery);
    } else {
      console.log('⚠️ Skipping godown stock update - condition not met');
    }
    
    console.log('✅ Delivery saved successfully:', delivery.deliveryNoteNumber);
    
  } catch (error) {
    console.error('Error saving delivery:', error);
    throw new Error('Failed to save delivery');
  }
};

// Update godown stock when delivery is saved (for warehouse deliveries)
const updateDeliveryGodownStock = async (delivery: DeliveryData): Promise<void> => {
  // Only update if source godown is specified and there are items
  if (!delivery.sourceGodownId || !delivery.itemsList || delivery.itemsList.length === 0) {
    return;
  }

  try {
    console.log('📦 Updating godown stock for delivery:', delivery.deliveryNoteNumber);
    console.log('📍 Source Godown:', delivery.sourceGodownId);
    console.log('📍 Source Zone:', delivery.sourceZoneId || 'All Zones');

    // Import updateGodownStock dynamically to avoid circular dependencies
    const { updateGodownStock } = await import('@/services/godownService');

    for (const item of delivery.itemsList) {
      const productId = item.product_id || item.id;
      const quantity = item.quantity || item.delivered || 0;

      if (!productId || quantity <= 0) {
        continue;
      }

      // Decrease stock from source godown
      await updateGodownStock(
        productId,
        delivery.sourceGodownId,
        delivery.sourceZoneId || null,
        -quantity // Negative to decrease
      );

      console.log(`✅ Decreased ${quantity} units of product ${productId} from godown`);
    }

    console.log('✅ Godown stock update completed for delivery');
  } catch (error) {
    console.error('❌ Error updating godown stock for delivery:', error);
    // Don't throw error - delivery was already saved successfully
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
        outletId: dbDelivery.outlet_id,
        // If source_outlet_id exists, it's from another outlet; otherwise it's from investment
        sourceType: dbDelivery.source_type || (dbDelivery.source_outlet_id ? 'outlet' : 'investment'),
        sourceOutletId: dbDelivery.source_outlet_id,
        creditBroughtForward: dbDelivery.credit_brought_forward || 0,
        // Additional fields from DeliveryDetails view (matching exact View Display)
        businessName: dbDelivery.business_name,
        businessAddress: dbDelivery.business_address,
        preparedByName: dbDelivery.prepared_by_name,
        preparedByDate: dbDelivery.prepared_by_date,
        driverName: dbDelivery.driver_name,
        driverDate: dbDelivery.driver_date,
        receivedByName: dbDelivery.received_by_name,
        receivedByDate: dbDelivery.received_by_date
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
      
      // First, check the original status from database
      const { data: originalDelivery } = await supabase
        .from('saved_delivery_notes')
        .select('status, source_type, outlet_id')
        .eq('id', updatedDelivery.id)
        .single();
      
      // Validate numeric fields to prevent NaN serialization errors
      const updateData = {
        delivery_note_number: updatedDelivery.deliveryNoteNumber,
        // Convert empty string dates to null to avoid database errors
        date: updatedDelivery.date || null,
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
        outlet_id: updatedDelivery.outletId,
        source_type: updatedDelivery.sourceType || 'investment',
        source_outlet_id: updatedDelivery.sourceOutletId || null,
        credit_brought_forward: updatedDelivery.creditBroughtForward || 0,
        // Additional fields from DeliveryDetails view (matching exact View Display)
        business_name: (updatedDelivery as any).businessName || null,
        business_address: (updatedDelivery as any).businessAddress || null,
        prepared_by_name: (updatedDelivery as any).preparedByName || null,
        prepared_by_date: (updatedDelivery as any).preparedByDate || null,
        driver_name: (updatedDelivery as any).driverName || null,
        driver_date: (updatedDelivery as any).driverDate || null,
        received_by_name: (updatedDelivery as any).receivedByName || null,
        received_by_date: (updatedDelivery as any).receivedByDate || null
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
        
        // NOTE: Inventory update for NEW deliveries is handled by saveDelivery()
        // This updateDelivery() function should NOT update inventory to prevent double-counting
        // When editing a delivery, the user should manually adjust inventory if needed
        console.log('ℹ️ Skipping inventory update in updateDelivery() - handled by saveDelivery() for new deliveries');
        console.log('ℹ️ If editing delivery quantities, manually adjust outlet inventory');
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
        outletId: dbDelivery.outlet_id,
        // If source_outlet_id exists, it's from another outlet; otherwise it's from investment
        sourceType: dbDelivery.source_type || (dbDelivery.source_outlet_id ? 'outlet' : 'investment'),
        sourceOutletId: dbDelivery.source_outlet_id,
        creditBroughtForward: dbDelivery.credit_brought_forward || 0,
        // Additional fields from DeliveryDetails view (matching exact View Display)
        businessName: dbDelivery.business_name,
        businessAddress: dbDelivery.business_address,
        preparedByName: dbDelivery.prepared_by_name,
        preparedByDate: dbDelivery.prepared_by_date,
        driverName: dbDelivery.driver_name,
        driverDate: dbDelivery.driver_date,
        receivedByName: dbDelivery.received_by_name,
        receivedByDate: dbDelivery.received_by_date
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