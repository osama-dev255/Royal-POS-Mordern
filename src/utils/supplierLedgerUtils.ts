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

/** Derived status from a source document */
export interface DerivedLedgerStatus {
  status: string;
  source: string;  // e.g. 'GRN & Inventory Dashboard'
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
 * Derive statuses for ledger entries from their source documents.
 * - grn_received      → saved_grns.status
 * - inventory_payment → expenses.approval_status
 * - settlement        → supplier_payment_vouchers.status
 * - adjustment/refund → N/A (manual entries)
 *
 * Lookup strategy:
 *   1. Match by reference_id (UUID) against source table id
 *   2. Fallback: match by reference_number against source table business key
 *      (grn_number for GRNs, voucher_number for expenses/vouchers)
 */
export const getDerivedLedgerStatuses = async (
  entries: SupplierLedgerEntry[]
): Promise<Map<string, DerivedLedgerStatus>> => {
  const statusMap = new Map<string, DerivedLedgerStatus>();

  // ── Pass 1: lookup by reference_id (UUID) ──────────────────────────────────
  const grnRefs: string[] = [];
  const expenseRefs: string[] = [];
  const voucherRefs: string[] = [];

  for (const entry of entries) {
    if (!entry.reference_id) continue;
    switch (entry.transaction_type) {
      case 'grn_received':      grnRefs.push(entry.reference_id); break;
      case 'inventory_payment': expenseRefs.push(entry.reference_id); break;
      case 'settlement':        voucherRefs.push(entry.reference_id); break;
    }
  }

  try {
    if (grnRefs.length > 0) {
      const { data } = await supabase
        .from('saved_grns')
        .select('id, status')
        .in('id', grnRefs);
      if (data) {
        for (const grn of data) {
          statusMap.set(grn.id, { status: grn.status || 'pending', source: 'GRN & Inventory Dashboard' });
        }
      }
    }

    if (expenseRefs.length > 0) {
      const { data } = await supabase
        .from('expenses')
        .select('id, approval_status')
        .in('id', expenseRefs);
      if (data) {
        for (const exp of data) {
          statusMap.set(exp.id, { status: exp.approval_status || 'pending', source: 'Expense Management' });
        }
      }
    }

    if (voucherRefs.length > 0) {
      const { data } = await supabase
        .from('supplier_payment_vouchers')
        .select('id, status')
        .in('id', voucherRefs);
      if (data) {
        for (const v of data) {
          statusMap.set(v.id, { status: v.status || 'completed', source: 'Supplier Payment Vouchers' });
        }
      }
    }
  } catch (error) {
    console.error('Error deriving ledger statuses by reference_id:', error);
  }

  // ── Pass 2: fallback — lookup by reference_number (business key) ───────────
  const unmatchedEntries = entries.filter(e => e.id && !statusMap.has(e.id) && e.reference_number);

  if (unmatchedEntries.length > 0) {
    try {
      // GRN entries: match reference_number against saved_grns.grn_number
      const unmatchedGrns = unmatchedEntries.filter(e => e.transaction_type === 'grn_received');
      if (unmatchedGrns.length > 0) {
        const refNumbers = unmatchedGrns.map(e => e.reference_number!).filter(Boolean);
        if (refNumbers.length > 0) {
          const { data } = await supabase
            .from('saved_grns')
            .select('id, grn_number, status')
            .in('grn_number', refNumbers);
          if (data) {
            const grnByNumber = new Map(data.map(g => [g.grn_number, g]));
            for (const entry of unmatchedGrns) {
              const match = grnByNumber.get(entry.reference_number!);
              if (match && entry.id) {
                statusMap.set(entry.id, { status: match.status || 'pending', source: 'GRN & Inventory Dashboard' });
              }
            }
          }
        }
      }

      // Expense entries: match reference_number against expenses.voucher_number
      // Note: when voucher_number is NULL the trigger stores the expense UUID as
      // text, so we also try matching reference_number against expenses.id.
      const unmatchedExpenses = unmatchedEntries.filter(e => e.transaction_type === 'inventory_payment');
      if (unmatchedExpenses.length > 0) {
        const refNumbers = unmatchedExpenses.map(e => e.reference_number!).filter(Boolean);
        if (refNumbers.length > 0) {
          // Try voucher_number first
          const { data: byVoucher } = await supabase
            .from('expenses')
            .select('id, voucher_number, approval_status')
            .in('voucher_number', refNumbers);
          if (byVoucher) {
            const expByNumber = new Map(byVoucher.map(e => [e.voucher_number, e]));
            for (const entry of unmatchedExpenses) {
              if (entry.id && statusMap.has(entry.id)) continue; // already matched
              const match = expByNumber.get(entry.reference_number!);
              if (match) {
                statusMap.set(entry.id, { status: match.approval_status || 'pending', source: 'Expense Management' });
              }
            }
          }

          // Fallback: match reference_number against expenses.id (UUID-as-text)
          const stillUnmatched = unmatchedExpenses.filter(e => e.id && !statusMap.has(e.id));
          if (stillUnmatched.length > 0) {
            const idsToTry = stillUnmatched.map(e => e.reference_number!);
            const { data: byId } = await supabase
              .from('expenses')
              .select('id, approval_status')
              .in('id', idsToTry);
            if (byId) {
              const expById = new Map(byId.map(e => [e.id, e]));
              for (const entry of stillUnmatched) {
                const match = expById.get(entry.reference_number!);
                if (match && entry.id) {
                  statusMap.set(entry.id, { status: match.approval_status || 'pending', source: 'Expense Management' });
                }
              }
            }
          }
        }
      }

      // Settlement entries: match reference_number against supplier_payment_vouchers.voucher_number
      const unmatchedVouchers = unmatchedEntries.filter(e => e.transaction_type === 'settlement');
      if (unmatchedVouchers.length > 0) {
        const refNumbers = unmatchedVouchers.map(e => e.reference_number!).filter(Boolean);
        if (refNumbers.length > 0) {
          const { data } = await supabase
            .from('supplier_payment_vouchers')
            .select('id, voucher_number, status')
            .in('voucher_number', refNumbers);
          if (data) {
            const vByNumber = new Map(data.map(v => [v.voucher_number, v]));
            for (const entry of unmatchedVouchers) {
              const match = vByNumber.get(entry.reference_number!);
              if (match && entry.id) {
                statusMap.set(entry.id, { status: match.status || 'completed', source: 'Supplier Payment Vouchers' });
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error deriving ledger statuses by reference_number:', error);
    }
  }

  return statusMap;
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
