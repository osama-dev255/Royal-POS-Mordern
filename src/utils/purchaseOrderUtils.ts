import { supabase } from '@/lib/supabaseClient';

export interface PurchaseOrderItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export interface PurchaseOrderData {
  id?: string;
  poNumber: string;
  date: string;
  supplierName: string;
  supplierAddress: string;
  supplierPhone: string;
  supplierEmail: string;
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;
  expectedDelivery: string;
  items: PurchaseOrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  shipping: number;
  total: number;
  paymentTerms: string;
  deliveryInstructions: string;
  notes: string;
  requestedBy: string;
  approvedBy: string;
  authorizationDate: string;
  authorizedByName: string;
  authorizedBySignature: string;
  status: 'draft' | 'completed' | 'cancelled';
  outletId?: string;
  createdAt?: string;
}

export interface SavedPurchaseOrder {
  id: string;
  poNumber: string;
  date: string;
  supplierName: string;
  supplierAddress: string;
  supplierPhone: string;
  supplierEmail: string;
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;
  expectedDelivery: string;
  items: PurchaseOrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  shipping: number;
  total: number;
  paymentTerms: string;
  deliveryInstructions: string;
  notes: string;
  requestedBy: string;
  approvedBy: string;
  authorizationDate: string;
  authorizedByName: string;
  authorizedBySignature: string;
  status: 'draft' | 'completed' | 'cancelled';
  outletId?: string;
  createdAt: string;
  data: PurchaseOrderData;
}

// Generate purchase order number
const generatePoNumber = (): string => {
  const timestamp = Date.now();
  return `PO-${String(timestamp).slice(-6)}`;
};

// Save purchase order to database
export const savePurchaseOrder = async (
  orderData: PurchaseOrderData
): Promise<{ success: boolean; id?: string; error?: string }> => {
  try {
    console.log('[PO Save] Starting save...', { poNumber: orderData.poNumber, itemsCount: orderData.items?.length });

    const insertData = {
      po_number: orderData.poNumber || generatePoNumber(),
      date: orderData.date || new Date().toISOString().split('T')[0],
      supplier_name: orderData.supplierName || '',
      supplier_address: orderData.supplierAddress || '',
      supplier_phone: orderData.supplierPhone || '',
      supplier_email: orderData.supplierEmail || '',
      business_name: orderData.businessName || '',
      business_address: orderData.businessAddress || '',
      business_phone: orderData.businessPhone || '',
      business_email: orderData.businessEmail || '',
      expected_delivery: orderData.expectedDelivery || null,
      items: orderData.items || [],
      subtotal: orderData.subtotal || 0,
      tax: orderData.tax || 0,
      discount: orderData.discount || 0,
      shipping: orderData.shipping || 0,
      total: orderData.total || 0,
      payment_terms: orderData.paymentTerms || '',
      delivery_instructions: orderData.deliveryInstructions || '',
      notes: orderData.notes || '',
      requested_by: orderData.requestedBy || '',
      approved_by: orderData.approvedBy || '',
      authorization_date: orderData.authorizationDate || null,
      authorized_by_name: orderData.authorizedByName || '',
      authorized_by_signature: orderData.authorizedBySignature || '',
      status: orderData.status || 'draft',
      outlet_id: orderData.outletId || null,
      updated_at: new Date().toISOString()
    };

    console.log('[PO Save] Insert data:', insertData);

    const { data, error } = await supabase
      .from('purchase_orders')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('[PO Save] Supabase error:', error);
      return { success: false, error: error.message };
    }

    console.log('[PO Save] Success! ID:', data?.id);
    return { success: true, id: data?.id };
  } catch (err) {
    console.error('[PO Save] Exception:', err);
    return { success: false, error: 'Failed to save purchase order' };
  }
};

// Update existing purchase order in database
export const updatePurchaseOrder = async (
  id: string,
  orderData: PurchaseOrderData
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('[PO Update] Starting update...', { id, poNumber: orderData.poNumber });

    const updateData = {
      po_number: orderData.poNumber || generatePoNumber(),
      date: orderData.date || new Date().toISOString().split('T')[0],
      supplier_name: orderData.supplierName || '',
      supplier_address: orderData.supplierAddress || '',
      supplier_phone: orderData.supplierPhone || '',
      supplier_email: orderData.supplierEmail || '',
      business_name: orderData.businessName || '',
      business_address: orderData.businessAddress || '',
      business_phone: orderData.businessPhone || '',
      business_email: orderData.businessEmail || '',
      expected_delivery: orderData.expectedDelivery || null,
      items: orderData.items || [],
      subtotal: orderData.subtotal || 0,
      tax: orderData.tax || 0,
      discount: orderData.discount || 0,
      shipping: orderData.shipping || 0,
      total: orderData.total || 0,
      payment_terms: orderData.paymentTerms || '',
      delivery_instructions: orderData.deliveryInstructions || '',
      notes: orderData.notes || '',
      requested_by: orderData.requestedBy || '',
      approved_by: orderData.approvedBy || '',
      authorization_date: orderData.authorizationDate || null,
      authorized_by_name: orderData.authorizedByName || '',
      authorized_by_signature: orderData.authorizedBySignature || '',
      status: orderData.status || 'draft',
      outlet_id: orderData.outletId || null,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('purchase_orders')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('[PO Update] Supabase error:', error);
      return { success: false, error: error.message };
    }

    console.log('[PO Update] Success! ID:', id);
    return { success: true };
  } catch (err) {
    console.error('[PO Update] Exception:', err);
    return { success: false, error: 'Failed to update purchase order' };
  }
};

// Get all saved purchase orders
export const getSavedPurchaseOrders = async (
  outletId?: string
): Promise<SavedPurchaseOrder[]> => {
  try {
    let query = supabase
      .from('purchase_orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (outletId) {
      query = query.eq('outlet_id', outletId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching purchase orders:', error);
      return [];
    }

    return (data || []).map((dbOrder: any) => ({
      id: dbOrder.id,
      poNumber: dbOrder.po_number,
      date: dbOrder.date,
      supplierName: dbOrder.supplier_name || '',
      supplierAddress: dbOrder.supplier_address || '',
      supplierPhone: dbOrder.supplier_phone || '',
      supplierEmail: dbOrder.supplier_email || '',
      businessName: dbOrder.business_name || '',
      businessAddress: dbOrder.business_address || '',
      businessPhone: dbOrder.business_phone || '',
      businessEmail: dbOrder.business_email || '',
      expectedDelivery: dbOrder.expected_delivery || '',
      items: dbOrder.items || [],
      subtotal: dbOrder.subtotal || 0,
      tax: dbOrder.tax || 0,
      discount: dbOrder.discount || 0,
      shipping: dbOrder.shipping || 0,
      total: dbOrder.total || 0,
      paymentTerms: dbOrder.payment_terms || '',
      deliveryInstructions: dbOrder.delivery_instructions || '',
      notes: dbOrder.notes || '',
      requestedBy: dbOrder.requested_by || '',
      approvedBy: dbOrder.approved_by || '',
      authorizationDate: dbOrder.authorization_date || '',
      authorizedByName: dbOrder.authorized_by_name || '',
      authorizedBySignature: dbOrder.authorized_by_signature || '',
      status: dbOrder.status || 'draft',
      outletId: dbOrder.outlet_id || '',
      createdAt: dbOrder.created_at || new Date().toISOString(),
      data: {
        poNumber: dbOrder.po_number,
        date: dbOrder.date,
        supplierName: dbOrder.supplier_name || '',
        supplierAddress: dbOrder.supplier_address || '',
        supplierPhone: dbOrder.supplier_phone || '',
        supplierEmail: dbOrder.supplier_email || '',
        businessName: dbOrder.business_name || '',
        businessAddress: dbOrder.business_address || '',
        businessPhone: dbOrder.business_phone || '',
        businessEmail: dbOrder.business_email || '',
        expectedDelivery: dbOrder.expected_delivery || '',
        items: dbOrder.items || [],
        subtotal: dbOrder.subtotal || 0,
        tax: dbOrder.tax || 0,
        discount: dbOrder.discount || 0,
        shipping: dbOrder.shipping || 0,
        total: dbOrder.total || 0,
        paymentTerms: dbOrder.payment_terms || '',
        deliveryInstructions: dbOrder.delivery_instructions || '',
        notes: dbOrder.notes || '',
        requestedBy: dbOrder.requested_by || '',
        approvedBy: dbOrder.approved_by || '',
        authorizationDate: dbOrder.authorization_date || '',
        authorizedByName: dbOrder.authorized_by_name || '',
        authorizedBySignature: dbOrder.authorized_by_signature || '',
        status: dbOrder.status || 'draft',
        outletId: dbOrder.outlet_id || ''
      }
    }));
  } catch (err) {
    console.error('Error fetching purchase orders:', err);
    return [];
  }
};

// Delete purchase order
export const deletePurchaseOrder = async (
  id: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('purchase_orders')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting purchase order:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Error deleting purchase order:', err);
    return { success: false, error: 'Failed to delete purchase order' };
  }
};
