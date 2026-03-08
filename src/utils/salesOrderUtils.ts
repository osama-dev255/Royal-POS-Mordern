import { supabase } from '@/lib/supabaseClient';

const SAVED_SALES_ORDERS_KEY = 'savedSalesOrders';

export interface SalesOrderData {
  id: string;
  orderNumber: string;
  date: string;
  customer: string;
  customerId?: string;
  items: number;
  total: number;
  status: "pending" | "completed" | "cancelled";
  itemsList?: any[];
  subtotal?: number;
  tax?: number;
  discount?: number;
  amountPaid?: number;
  creditBroughtForward?: number;
  amountDue?: number;
  notes?: string;
}

export const saveSalesOrder = async (order: SalesOrderData): Promise<void> => {
  try {
    // First, save to localStorage for immediate availability
    const savedOrders = await getSavedSalesOrders();
    const updatedOrders = [...savedOrders, order];
    localStorage.setItem(SAVED_SALES_ORDERS_KEY, JSON.stringify(updatedOrders));
    
    // Then save to database with user context
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase
        .from('sales')
        .insert({
          user_id: user.id,
          invoice_number: order.orderNumber,
          sale_date: order.date,
          customer_id: order.customerId,
          items: order.items,
          total_amount: order.total,
          sale_status: order.status,
          subtotal: order.subtotal,
          tax_amount: order.tax,
          discount_amount: order.discount,
          amount_paid: order.amountPaid,
          notes: order.notes
        });
        
      if (error) {
        console.error('Error saving sales order to database:', error);
        // Don't throw error - still have local storage backup
      }
      
      // Save order items if available
      if (order.itemsList && order.itemsList.length > 0 && user.id) {
        const orderItems = order.itemsList.map(item => ({
          sale_id: order.id,
          product_id: item.productId,
          product_name: item.productName,
          quantity: item.quantity,
          unit_price: item.unitPrice || item.price,
          total_price: item.total || ((item.unitPrice || item.price || 0) * item.quantity),
          unit: item.unit
        }));
        
        const { error: itemsError } = await supabase
          .from('sale_items')
          .insert(orderItems);
          
        if (itemsError) {
          console.error('Error saving sales order items:', itemsError);
        }
      }
    }
  } catch (error) {
    console.error('Error saving sales order:', error);
    throw new Error('Failed to save sales order');
  }
};

export const getSavedSalesOrders = async (): Promise<SalesOrderData[]> => {
  try {
    // First, try to get from database
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Check if user is admin to determine query scope
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      
      let query = supabase.from('sales').select('*');
      
      // Admins can see all orders, others see only their own
      if (userData?.role !== 'admin') {
        query = query.eq('user_id', user.id);
      }
      
      const { data, error } = await query
        .eq('sale_status', 'pending')
        .order('sale_date', { ascending: false });
        
      if (error) {
        console.error('Error retrieving saved sales orders from database:', error);
        // Fallback to localStorage
        const saved = localStorage.getItem(SAVED_SALES_ORDERS_KEY);
        return saved ? JSON.parse(saved) : [];
      }
      
      // Map database format to component format
      const orders: SalesOrderData[] = data.map(dbOrder => ({
        id: dbOrder.id || '',
        orderNumber: dbOrder.invoice_number || `SO-${dbOrder.id?.substring(0, 8)}`,
        date: dbOrder.sale_date,
        customer: dbOrder.customer_id ? '' : 'Walk-in Customer', // Will be populated with customer name
        customerId: dbOrder.customer_id,
        items: dbOrder.items || 0,
        total: dbOrder.total_amount || 0,
        status: (dbOrder.sale_status as "pending" | "completed" | "cancelled") || "pending",
        subtotal: dbOrder.subtotal,
        tax: dbOrder.tax_amount,
        discount: dbOrder.discount_amount,
        amountPaid: dbOrder.amount_paid,
        itemsList: [] // Items will be loaded separately
      }));
      
      // Load customer names
      if (orders.length > 0) {
        const customerIds = orders.filter(o => o.customerId).map(o => o.customerId!);
        if (customerIds.length > 0) {
          const { data: customers } = await supabase
            .from('customers')
            .select('id, first_name, last_name')
            .in('id', customerIds);
            
          if (customers) {
            orders.forEach(order => {
              const customer = customers.find(c => c.id === order.customerId);
              if (customer) {
                order.customer = `${customer.first_name} ${customer.last_name}`;
              }
            });
          }
        }
      }
      
      // Load items for each order
      const orderIds = orders.map(o => o.id);
      if (orderIds.length > 0) {
        const { data: itemsData } = await supabase
          .from('sale_items')
          .select('*')
          .in('sale_id', orderIds);
          
        if (itemsData) {
          orders.forEach(order => {
            const items = itemsData.filter(item => item.sale_id === order.id);
            order.itemsList = items.map(item => ({
              id: item.id,
              productId: item.product_id,
              productName: item.product_name || 'Unknown Product',
              quantity: item.quantity,
              unitPrice: item.unit_price,
              price: item.unit_price,
              total: item.total_price,
              unit: item.unit
            }));
          });
        }
      }
      
      // Calculate amount due for each order
      orders.forEach(order => {
        const subtotal = order.subtotal || 0;
        const tax = order.tax || 0;
        const discount = order.discount || 0;
        const amountPaid = order.amountPaid || 0;
        const creditBroughtForward = order.creditBroughtForward || 0;
        
        order.total = subtotal + tax - discount;
        order.amountDue = order.total - amountPaid + creditBroughtForward;
      });
      
      return orders;
    }
    
    // Fallback to localStorage
    const saved = localStorage.getItem(SAVED_SALES_ORDERS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('Error getting saved sales orders:', error);
    const saved = localStorage.getItem(SAVED_SALES_ORDERS_KEY);
    return saved ? JSON.parse(saved) : [];
  }
};

export const deleteSalesOrder = async (orderId: string): Promise<void> => {
  try {
    // Remove from localStorage
    const savedOrders = await getSavedSalesOrders();
    const updatedOrders = savedOrders.filter(order => order.id !== orderId);
    localStorage.setItem(SAVED_SALES_ORDERS_KEY, JSON.stringify(updatedOrders));
    
    // Remove from database
    const { error } = await supabase
      .from('sales')
      .delete()
      .eq('id', orderId);
      
    if (error) {
      console.error('Error deleting sales order from database:', error);
    }
    
    // Also delete associated items (cascade should handle this, but being explicit)
    await supabase
      .from('sale_items')
      .delete()
      .eq('sale_id', orderId);
      
  } catch (error) {
    console.error('Error deleting sales order:', error);
    throw new Error('Failed to delete sales order');
  }
};

export const updateSalesOrder = async (order: SalesOrderData): Promise<void> => {
  try {
    // Update in localStorage
    const savedOrders = await getSavedSalesOrders();
    const updatedOrders = savedOrders.map(o => o.id === order.id ? order : o);
    localStorage.setItem(SAVED_SALES_ORDERS_KEY, JSON.stringify(updatedOrders));
    
    // Update in database
    const { error } = await supabase
      .from('sales')
      .update({
        invoice_number: order.orderNumber,
        sale_date: order.date,
        customer_id: order.customerId,
        items: order.items,
        total_amount: order.total,
        sale_status: order.status,
        subtotal: order.subtotal,
        tax_amount: order.tax,
        discount_amount: order.discount,
        amount_paid: order.amountPaid,
        notes: order.notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id);
      
    if (error) {
      console.error('Error updating sales order in database:', error);
    }
    
    // Update items if provided
    if (order.itemsList && order.itemsList.length > 0) {
      // Delete existing items
      await supabase
        .from('sale_items')
        .delete()
        .eq('sale_id', order.id);
      
      // Insert new items
      const orderItems = order.itemsList.map(item => ({
        sale_id: order.id,
        product_id: item.productId,
        product_name: item.productName,
        quantity: item.quantity,
        unit_price: item.unitPrice || item.price,
        total_price: item.total || ((item.unitPrice || item.price || 0) * item.quantity),
        unit: item.unit
      }));
      
      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(orderItems);
        
      if (itemsError) {
        console.error('Error updating sales order items:', itemsError);
      }
    }
  } catch (error) {
    console.error('Error updating sales order:', error);
    throw new Error('Failed to update sales order');
  }
};
