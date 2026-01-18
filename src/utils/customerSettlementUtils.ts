import { supabase } from '@/lib/supabaseClient';

const SAVED_SETTLEMENTS_KEY = 'savedSettlements';

export interface CustomerSettlementData {
  id: string;
  customerName: string;
  customerId: string;
  customerPhone: string;
  customerEmail: string;
  referenceNumber: string;
  settlementAmount: number;
  paymentMethod: string;
  cashierName: string;
  previousBalance: number;
  amountPaid: number;
  newBalance: number;
  notes?: string;
  date: string;
  time: string;
  status?: "completed" | "pending" | "cancelled";
}

export const saveCustomerSettlement = async (settlement: CustomerSettlementData): Promise<void> => {
  try {
    // Validate required fields
    if (!settlement.customerName || !settlement.referenceNumber) {
      throw new Error("Customer name and reference number are required");
    }
    
    // Ensure we have a proper ID
    if (!settlement.id) {
      settlement.id = Date.now().toString();
    }
    
    // First, save to localStorage for immediate availability
    const savedSettlements = await getSavedSettlements();
    const updatedSettlements = [...savedSettlements, settlement];
    localStorage.setItem(SAVED_SETTLEMENTS_KEY, JSON.stringify(updatedSettlements));
    
    // Then save to database with user context
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase
        .from('saved_customer_settlements')
        .insert({
          user_id: user.id,
          customer_name: settlement.customerName || '',
          customer_id: settlement.customerId || '',
          customer_phone: settlement.customerPhone || '',
          customer_email: settlement.customerEmail || '',
          reference_number: settlement.referenceNumber || '',
          settlement_amount: settlement.settlementAmount || 0,
          payment_method: settlement.paymentMethod || 'Cash',
          cashier_name: settlement.cashierName || 'System',
          previous_balance: settlement.previousBalance || 0,
          amount_paid: settlement.amountPaid || 0,
          new_balance: settlement.newBalance || 0,
          notes: settlement.notes || '',
          date: settlement.date || new Date().toISOString().split('T')[0],
          time: settlement.time || new Date().toLocaleTimeString(),
          status: settlement.status || 'completed'
        });
      
      if (error) {
        console.error('Error saving customer settlement to database:', error);
      }
    } else {
      // If not authenticated, still try to save to database with null user_id
      const { error } = await supabase
        .from('customer_settlements')
        .insert({
          user_id: null,
          customer_name: settlement.customerName || '',
          customer_id: settlement.customerId || '',
          customer_phone: settlement.customerPhone || '',
          customer_email: settlement.customerEmail || '',
          reference_number: settlement.referenceNumber || '',
          settlement_amount: settlement.settlementAmount || 0,
          payment_method: settlement.paymentMethod || 'Cash',
          cashier_name: settlement.cashierName || 'System',
          previous_balance: settlement.previousBalance || 0,
          amount_paid: settlement.amountPaid || 0,
          new_balance: settlement.newBalance || 0,
          notes: settlement.notes || '',
          date: settlement.date || new Date().toISOString().split('T')[0],
          time: settlement.time || new Date().toLocaleTimeString(),
          status: settlement.status || 'completed'
        });
      
      if (error) {
        console.error('Error saving customer settlement to database:', error);
      }
    }
  } catch (error) {
    console.error('Error saving customer settlement:', error);
    throw new Error('Failed to save customer settlement');
  }
};

export const getSavedSettlements = async (): Promise<CustomerSettlementData[]> => {
  try {
    // Check localStorage first as primary source
    const localStorageData = localStorage.getItem(SAVED_SETTLEMENTS_KEY);
    let localStorageSettlements: any[] = [];
    
    if (localStorageData) {
      try {
        localStorageSettlements = JSON.parse(localStorageData);
        
        // Validate localStorage data
        const validLocalSettlements = localStorageSettlements.filter(settlement => 
          settlement && 
          settlement.id &&
          settlement.customerName && 
          settlement.referenceNumber
        );
        
        if (validLocalSettlements.length > 0) {
          return validLocalSettlements;
        }
      } catch (parseError) {
        console.error('Error parsing localStorage data:', parseError);
      }
    }
    
    // Try database as secondary source
    const { data: { user } } = await supabase.auth.getUser();
    let data, error;
    
    if (user) {
      // Check if user is admin to determine query scope
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      
      let query = supabase.from('saved_customer_settlements').select('*');
      
      // Admins can see all settlements, others see only their own
      if (userData?.role !== 'admin') {
        query = query.eq('user_id', user.id);
      }
      
      ({ data, error } = await query.order('created_at', { ascending: false }));
    } else {
      ({ data, error } = await supabase
        .from('saved_customer_settlements')
        .select('*')
        .eq('user_id', null)
        .order('created_at', { ascending: false }));
    }
    
    if (error) {
      // Return localStorage data even if database fails
      return localStorageSettlements.filter(settlement => 
        settlement && 
        settlement.id &&
        settlement.customerName && 
        settlement.referenceNumber
      );
    }
    
    // Transform database records
    const transformedData = data.map(dbSettlement => ({
      id: dbSettlement.id,
      customerName: dbSettlement.customer_name,
      customerId: dbSettlement.customer_id,
      customerPhone: dbSettlement.customer_phone,
      customerEmail: dbSettlement.customer_email,
      referenceNumber: dbSettlement.reference_number,
      settlementAmount: dbSettlement.settlement_amount,
      paymentMethod: dbSettlement.payment_method,
      cashierName: dbSettlement.cashier_name,
      previousBalance: dbSettlement.previous_balance,
      amountPaid: dbSettlement.amount_paid,
      newBalance: dbSettlement.new_balance,
      notes: dbSettlement.notes,
      date: dbSettlement.date,
      time: dbSettlement.time,
      status: dbSettlement.status
    }));
    
    // Validate transformed data
    const validDbSettlements = transformedData.filter(settlement => 
      settlement && 
      settlement.id &&
      settlement.customerName && 
      settlement.referenceNumber
    );
    
    // Combine both sources and deduplicate
    const allSettlements = [...localStorageSettlements, ...validDbSettlements];
    const uniqueSettlements = allSettlements.filter((settlement, index, self) => 
      index === self.findIndex(s => s.id === settlement.id)
    );
    
    return uniqueSettlements;
    
  } catch (error) {
    console.error('Error retrieving saved settlements:', error);
    
    // Emergency fallback to localStorage
    try {
      const saved = localStorage.getItem(SAVED_SETTLEMENTS_KEY);
      if (saved) {
        const parsedData = JSON.parse(saved);
        return parsedData.filter((settlement: any) => 
          settlement && 
          settlement.id &&
          settlement.customerName && 
          settlement.referenceNumber
        );
      }
    } catch (parseError) {
      console.error('Emergency fallback failed:', parseError);
    }
    
    return [];
  }
};

export const deleteCustomerSettlement = async (settlementId: string): Promise<void> => {
  try {
    const savedSettlements = await getSavedSettlements();
    const updatedSettlements = savedSettlements.filter(settlement => settlement.id !== settlementId);
    localStorage.setItem(SAVED_SETTLEMENTS_KEY, JSON.stringify(updatedSettlements));
    
    // Also delete from database
    const { data: { user } } = await supabase.auth.getUser();
    
    let deleteQuery = supabase
      .from('saved_customer_settlements')
      .delete()
      .eq('id', settlementId);
    
    if (user) {
      // Check if user is admin to determine delete scope
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      
      // Admins can delete any settlement, others can only delete their own
      if (userData?.role !== 'admin') {
        deleteQuery = deleteQuery.eq('user_id', user.id);
      }
    } else {
      deleteQuery = deleteQuery.is('user_id', null);
    }
    
    const { error } = await deleteQuery;
    
    if (error) {
      console.error('Error deleting customer settlement from database:', error);
      // Don't throw error - still have local storage backup
    }
  } catch (error) {
    console.error('Error deleting customer settlement:', error);
    throw new Error('Failed to delete customer settlement');
  }
};

export const updateCustomerSettlement = async (updatedSettlement: CustomerSettlementData): Promise<void> => {
  try {
    const savedSettlements = await getSavedSettlements();
    const updatedSettlements = savedSettlements.map(settlement => 
      settlement.id === updatedSettlement.id ? updatedSettlement : settlement
    );
    localStorage.setItem(SAVED_SETTLEMENTS_KEY, JSON.stringify(updatedSettlements));
    
    // Also update in database
    const { data: { user } } = await supabase.auth.getUser();
    
    let updateQuery = supabase
      .from('saved_customer_settlements')
      .update({
        customer_name: updatedSettlement.customerName || '',
        customer_id: updatedSettlement.customerId || '',
        customer_phone: updatedSettlement.customerPhone || '',
        customer_email: updatedSettlement.customerEmail || '',
        reference_number: updatedSettlement.referenceNumber || '',
        settlement_amount: updatedSettlement.settlementAmount || 0,
        payment_method: updatedSettlement.paymentMethod || 'Cash',
        cashier_name: updatedSettlement.cashierName || 'System',
        previous_balance: updatedSettlement.previousBalance || 0,
        amount_paid: updatedSettlement.amountPaid || 0,
        new_balance: updatedSettlement.newBalance || 0,
        notes: updatedSettlement.notes || '',
        date: updatedSettlement.date || new Date().toISOString().split('T')[0],
        time: updatedSettlement.time || new Date().toLocaleTimeString(),
        status: updatedSettlement.status || 'completed'
      })
      .eq('id', updatedSettlement.id);
    
    if (user) {
      // Check if user is admin to determine update scope
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      
      // Admins can update any settlement, others can only update their own
      if (userData?.role !== 'admin') {
        updateQuery = updateQuery.eq('user_id', user.id);
      }
    } else {
      updateQuery = updateQuery.is('user_id', null);
    }
    
    const { error } = await updateQuery;
    
    if (error) {
      console.error('Error updating customer settlement in database:', error);
      // Don't throw error - still have local storage backup
    }
  } catch (error) {
    console.error('Error updating customer settlement:', error);
    throw new Error('Failed to update customer settlement');
  }
};

export const getCustomerSettlementById = async (settlementId: string): Promise<CustomerSettlementData | undefined> => {
  try {
    const savedSettlements = await getSavedSettlements();
    return savedSettlements.find(settlement => settlement.id === settlementId);
  } catch (error) {
    console.error('Error retrieving customer settlement by ID:', error);
    return undefined;
  }
};

// New function to get a specific saved settlement by ID directly from the database
export const getSavedCustomerSettlementById = async (settlementId: string): Promise<CustomerSettlementData | undefined> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Check if user is admin to determine query scope
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      
      let query = supabase
        .from('saved_customer_settlements')
        .select('*')
        .eq('id', settlementId);
      
      // Admins can access any settlement, others can only access their own
      if (userData?.role !== 'admin') {
        query = query.eq('user_id', user.id);
      }
      
      const { data, error } = await query.single();
      
      if (error) {
        console.error('Error retrieving saved customer settlement by ID:', error);
        return undefined;
      }
      
      // Transform database record to CustomerSettlementData format
      return {
        id: data.id,
        customerName: data.customer_name,
        customerId: data.customer_id,
        customerPhone: data.customer_phone,
        customerEmail: data.customer_email,
        referenceNumber: data.reference_number,
        settlementAmount: data.settlement_amount,
        paymentMethod: data.payment_method,
        cashierName: data.cashier_name,
        previousBalance: data.previous_balance,
        amountPaid: data.amount_paid,
        newBalance: data.new_balance,
        notes: data.notes,
        date: data.date,
        time: data.time,
        status: data.status
      };
    }
    
    return undefined;
  } catch (error) {
    console.error('Error retrieving saved customer settlement by ID:', error);
    return undefined;
  }
};