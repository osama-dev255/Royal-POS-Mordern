/**
 * Supplier Ledger Utilities
 * 
 * Manages the supplier_ledger table which tracks all supplier transactions:
 * - GRN received = CR (credit) = we owe the supplier
 * - Inventory expense / settlement = DR (debit) = we pay the supplier
 * - Running balance = SUM(credit) - SUM(debit) = outstanding payable
 */

import { supabase } from '@/lib/supabaseClient';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SupplierLedgerEntry {
  id?: string;
  supplier_id: string;
  supplier_name: string;
  transaction_type: 'grn_received' | 'inventory_payment' | 'settlement' | 'adjustment' | 'refund';
  reference_id?: string;
  reference_number?: string;
  debit_amount: number;
  credit_amount: number;
  running_balance: number;
  transaction_date: string;
  description?: string;
  payment_method?: string;
  notes?: string;
  created_by?: string;
  created_at?: string;
}

export interface SupplierLedgerSummary {
  supplier_id: string;
  supplier_name: string;
  total_credit: number;   // Total we owe (from GRNs)
  total_debit: number;    // Total we paid (expenses / settlements)
  balance: number;        // credit - debit = outstanding
  entry_count: number;
}

// ── CRUD Operations ────────────────────────────────────────────────────────────

/**
 * Fetch all supplier ledger entries, optionally filtered by supplier name
 */
export const getSupplierLedger = async (supplierName?: string): Promise<SupplierLedgerEntry[]> => {
  try {
    let query = supabase
      .from('supplier_ledger')
      .select('*')
      .order('transaction_date', { ascending: true })
      .order('created_at', { ascending: true });

    if (supplierName) {
      query = query.eq('supplier_name', supplierName);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching supplier ledger:', error);
    return [];
  }
};

/**
 * Fetch ledger entries within a date range
 */
export const getSupplierLedgerByDateRange = async (
  startDate: string,
  endDate: string,
  supplierName?: string
): Promise<SupplierLedgerEntry[]> => {
  try {
    let query = supabase
      .from('supplier_ledger')
      .select('*')
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate + 'T23:59:59')
      .order('transaction_date', { ascending: true })
      .order('created_at', { ascending: true });

    if (supplierName) {
      query = query.eq('supplier_name', supplierName);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching supplier ledger by date range:', error);
    return [];
  }
};

/**
 * Get the current outstanding balance for a specific supplier
 */
export const getSupplierBalance = async (supplierName: string): Promise<number> => {
  try {
    // Try RPC first (if the DB function has been updated to use supplier_name)
    const { data, error } = await supabase
      .rpc('get_supplier_balance_by_name', { p_supplier_name: supplierName });

    if (error) {
      // Fallback: calculate manually by supplier_name
      const entries = await getSupplierLedger(supplierName);
      const totalCredit = entries.reduce((sum, e) => sum + (Number(e.credit_amount) || 0), 0);
      const totalDebit = entries.reduce((sum, e) => sum + (Number(e.debit_amount) || 0), 0);
      return totalCredit - totalDebit;
    }
    return data || 0;
  } catch (error) {
    console.error('Error getting supplier balance:', error);
    // Fallback: calculate manually
    const entries = await getSupplierLedger(supplierName);
    const totalCredit = entries.reduce((sum, e) => sum + (Number(e.credit_amount) || 0), 0);
    const totalDebit = entries.reduce((sum, e) => sum + (Number(e.debit_amount) || 0), 0);
    return totalCredit - totalDebit;
  }
};

/**
 * Record a new supplier ledger entry (for manual settlements / adjustments)
 */
export const recordSupplierLedgerEntry = async (
  entry: Omit<SupplierLedgerEntry, 'id' | 'running_balance' | 'created_at'>
): Promise<SupplierLedgerEntry | null> => {
  try {
    const { data, error } = await supabase
      .from('supplier_ledger')
      .insert(entry)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error recording supplier ledger entry:', error);
    return null;
  }
};

/**
 * Get aggregated summary per supplier: total CR, total DR, outstanding balance
 */
export const getSupplierLedgerSummary = async (): Promise<SupplierLedgerSummary[]> => {
  try {
    const entries = await getSupplierLedger();

    // Aggregate by supplier_name (canonical key — supplier_id is unreliable across triggers)
    const map = new Map<string, SupplierLedgerSummary>();

    for (const entry of entries) {
      const key = (entry.supplier_name || '').trim();
      if (!key) continue;
      if (!map.has(key)) {
        map.set(key, {
          supplier_id: key,
          supplier_name: key,
          total_credit: 0,
          total_debit: 0,
          balance: 0,
          entry_count: 0,
        });
      }
      const s = map.get(key)!;
      s.total_credit += Number(entry.credit_amount) || 0;
      s.total_debit += Number(entry.debit_amount) || 0;
      s.entry_count += 1;
    }

    // Calculate balance
    for (const s of map.values()) {
      s.balance = s.total_credit - s.total_debit;
    }

    return Array.from(map.values()).sort((a, b) => a.supplier_name.localeCompare(b.supplier_name));
  } catch (error) {
    console.error('Error getting supplier ledger summary:', error);
    return [];
  }
};

/**
 * Delete a supplier ledger entry
 */
export const deleteSupplierLedgerEntry = async (entryId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('supplier_ledger')
      .delete()
      .eq('id', entryId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting supplier ledger entry:', error);
    return false;
  }
};

/**
 * Get all unique supplier names from the ledger
 */
export const getUniqueSuppliers = async (): Promise<Array<{ id: string; name: string }>> => {
  try {
    const { data, error } = await supabase
      .from('supplier_ledger')
      .select('supplier_name');

    if (error) throw error;

    // Deduplicate by supplier_name (case-insensitive, trimmed)
    const seen = new Map<string, string>();
    for (const row of data || []) {
      const name = (row.supplier_name || '').trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, name);
      }
    }

    return Array.from(seen.entries())
      .map(([, name]) => ({ id: name, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error fetching unique suppliers:', error);
    return [];
  }
};
