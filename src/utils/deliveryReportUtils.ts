import { supabase } from '@/lib/supabaseClient';

export interface DeliveryReportItem {
  id: string;
  name: string;
  quantity: number;
  rate: number;
  excluded?: boolean;
}

export interface DeliveryReportEntry {
  id: string;
  deliveryNoteNumber: string;
  date: string;
  customer: string;
  sourceType: string;
  status: string;
  items: DeliveryReportItem[];
  excluded?: boolean;
  isManual?: boolean;
  driver?: string;
  preparedByName?: string;
}

export interface DeliveryReportData {
  outletId: string;
  reportDate: string;
  totalValue: number;
  amountPaid: number;
  totalSalesAmount: number;
  totalExpenses: number;
  paymentDate: string;
  paymentMethod: string;
  referenceNumber: string;
  notes: string;
  preparedByName: string;
  checkedByName?: string;
  verifiedByName?: string;
  approvedByName?: string;
  deliveries: DeliveryReportEntry[];
}

export interface SavedDeliveryReport {
  id: string;
  outlet_id: string;
  report_number: string;
  report_date: string;
  total_value: number;
  amount_paid: number;
  total_sales_amount: number;
  total_expenses: number;
  balance_due: number;
  payment_date: string | null;
  payment_method: string | null;
  reference_number: string | null;
  deliveries: DeliveryReportEntry[];
  prepared_by_name: string | null;
  checked_by_name: string | null;
  verified_by_name: string | null;
  approved_by_name: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

const generateReportNumber = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `DIR-${year}${month}${day}-${random}`;
};

export const saveDeliveryInReport = async (
  data: DeliveryReportData
): Promise<{ success: boolean; id?: string; reportNumber?: string; error?: string }> => {
  try {
    const reportNumber = generateReportNumber();
    const balanceDue = data.totalValue - data.amountPaid;

    const insertData = {
      outlet_id: data.outletId,
      report_number: reportNumber,
      report_date: data.reportDate || new Date().toISOString().split('T')[0],
      total_value: data.totalValue || 0,
      amount_paid: data.amountPaid || 0,
      total_sales_amount: data.totalSalesAmount || 0,
      total_expenses: data.totalExpenses || 0,
      balance_due: balanceDue,
      payment_date: data.paymentDate || null,
      payment_method: data.paymentMethod || null,
      reference_number: data.referenceNumber || null,
      deliveries: data.deliveries || [],
      prepared_by_name: data.preparedByName || '',
      checked_by_name: data.checkedByName || '',
      verified_by_name: data.verifiedByName || '',
      approved_by_name: data.approvedByName || '',
      notes: data.notes || '',
      status: 'completed',
      updated_at: new Date().toISOString(),
    };

    const { data: result, error } = await supabase
      .from('saved_delivery_in_reports')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('Error saving delivery report:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: result.id, reportNumber };
  } catch (err) {
    console.error('Error saving delivery report:', err);
    return { success: false, error: 'Failed to save delivery report' };
  }
};

export const getSavedDeliveryReports = async (
  outletId: string
): Promise<SavedDeliveryReport[]> => {
  try {
    const { data, error } = await supabase
      .from('saved_delivery_in_reports')
      .select('*')
      .eq('outlet_id', outletId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching delivery reports:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      outlet_id: row.outlet_id,
      report_number: row.report_number,
      report_date: row.report_date,
      total_value: row.total_value,
      amount_paid: row.amount_paid,
      total_sales_amount: row.total_sales_amount || 0,
      total_expenses: row.total_expenses || 0,
      balance_due: row.balance_due,
      payment_date: row.payment_date,
      payment_method: row.payment_method,
      reference_number: row.reference_number,
      deliveries: Array.isArray(row.deliveries) ? row.deliveries : [],
      prepared_by_name: row.prepared_by_name,
      checked_by_name: row.checked_by_name,
      verified_by_name: row.verified_by_name,
      approved_by_name: row.approved_by_name,
      notes: row.notes,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  } catch (err) {
    console.error('Error fetching delivery reports:', err);
    return [];
  }
};

export const deleteDeliveryReport = async (
  id: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('saved_delivery_in_reports')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting delivery report:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Error deleting delivery report:', err);
    return { success: false, error: 'Failed to delete delivery report' };
  }
};
