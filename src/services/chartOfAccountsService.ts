// ============================================
// CHART OF ACCOUNTS SERVICE
// ============================================

import { supabase } from '@/lib/supabaseClient';

export interface ChartOfAccount {
  id?: string;
  outlet_id: string;
  account_code: string;
  account_name: string;
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  account_category: string;
  parent_account_id?: string;
  description?: string;
  is_active?: boolean;
  is_system_account?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface GeneralLedgerEntry {
  id?: string;
  outlet_id: string;
  account_id: string;
  transaction_date: string;
  reference_type: string;
  reference_id?: string;
  reference_number?: string;
  description?: string;
  debit_amount: number;
  credit_amount: number;
  running_balance?: number;
  posted_by?: string;
  posted_at?: string;
  is_posted?: boolean;
  created_at?: string;
}

// ============================================
// CHART OF ACCOUNTS CRUD
// ============================================

export const getChartOfAccounts = async (outletId: string): Promise<ChartOfAccount[]> => {
  try {
    const { data, error } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('outlet_id', outletId)
      .eq('is_active', true)
      .order('account_code');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching chart of accounts:', error);
    return [];
  }
};

export const createChartOfAccount = async (account: Omit<ChartOfAccount, 'id'>): Promise<ChartOfAccount | null> => {
  try {
    const { data, error } = await supabase
      .from('chart_of_accounts')
      .insert([account])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating chart of account:', error);
    return null;
  }
};

export const updateChartOfAccount = async (id: string, updates: Partial<ChartOfAccount>): Promise<ChartOfAccount | null> => {
  try {
    const { data, error } = await supabase
      .from('chart_of_accounts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating chart of account:', error);
    return null;
  }
};

export const deleteChartOfAccount = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('chart_of_accounts')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting chart of account:', error);
    return false;
  }
};

// ============================================
// GENERAL LEDGER CRUD
// ============================================

export const getGeneralLedgerEntries = async (
  outletId: string,
  accountId?: string,
  dateFrom?: string,
  dateTo?: string
): Promise<GeneralLedgerEntry[]> => {
  try {
    let query = supabase
      .from('general_ledger')
      .select('*, chart_of_accounts(account_code, account_name, account_type)')
      .eq('outlet_id', outletId)
      .eq('is_posted', true)
      .order('transaction_date', { ascending: false });

    if (accountId) {
      query = query.eq('account_id', accountId);
    }

    if (dateFrom) {
      query = query.gte('transaction_date', dateFrom);
    }

    if (dateTo) {
      query = query.lte('transaction_date', dateTo + 'T23:59:59');
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching general ledger entries:', error);
    return [];
  }
};

export const createGeneralLedgerEntry = async (entry: Omit<GeneralLedgerEntry, 'id'>): Promise<GeneralLedgerEntry | null> => {
  try {
    const { data, error } = await supabase
      .from('general_ledger')
      .insert([entry])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating general ledger entry:', error);
    return null;
  }
};

// Batch create for double-entry
export const createDoubleEntry = async (
  debitEntry: Omit<GeneralLedgerEntry, 'id' | 'running_balance'>,
  creditEntry: Omit<GeneralLedgerEntry, 'id' | 'running_balance'>
): Promise<boolean> => {
  try {
    // Validate double-entry principle
    if (debitEntry.debit_amount !== creditEntry.credit_amount) {
      throw new Error('Debit and credit amounts must be equal');
    }

    const { error } = await supabase
      .from('general_ledger')
      .insert([debitEntry, creditEntry]);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error creating double entry:', error);
    return false;
  }
};

// ============================================
// TRIAL BALANCE & REPORTS
// ============================================

export const getTrialBalance = async (outletId: string, asOfDate?: string): Promise<any[]> => {
  try {
    let query = supabase
      .from('trial_balance')
      .select('*')
      .eq('outlet_id', outletId);

    if (asOfDate) {
      query = query.lte('transaction_date', asOfDate + 'T23:59:59');
    }

    const { data, error } = await query.order('account_code');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching trial balance:', error);
    return [];
  }
};

export const getAccountBalanceSummary = async (outletId: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('account_balance_summary')
      .select('*')
      .eq('outlet_id', outletId)
      .order('account_code');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching account balance summary:', error);
    return [];
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

// Record a sale with double-entry
export const recordSaleDoubleEntry = async (params: {
  outletId: string;
  accountId: string;
  revenueAccountId: string;
  amount: number;
  referenceType: string;
  referenceId: string;
  referenceNumber: string;
  description: string;
  transactionDate: string;
}): Promise<boolean> => {
  try {
    const debitEntry: Omit<GeneralLedgerEntry, 'id' | 'running_balance'> = {
      outlet_id: params.outletId,
      account_id: params.accountId,
      transaction_date: params.transactionDate,
      reference_type: params.referenceType,
      reference_id: params.referenceId,
      reference_number: params.referenceNumber,
      description: params.description,
      debit_amount: params.amount,
      credit_amount: 0,
      is_posted: true
    };

    const creditEntry: Omit<GeneralLedgerEntry, 'id' | 'running_balance'> = {
      outlet_id: params.outletId,
      account_id: params.revenueAccountId,
      transaction_date: params.transactionDate,
      reference_type: params.referenceType,
      reference_id: params.referenceId,
      reference_number: params.referenceNumber,
      description: params.description,
      debit_amount: 0,
      credit_amount: params.amount,
      is_posted: true
    };

    return await createDoubleEntry(debitEntry, creditEntry);
  } catch (error) {
    console.error('Error recording sale double entry:', error);
    return false;
  }
};

// Initialize default accounts for a new outlet
export const initializeDefaultAccounts = async (outletId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .rpc('create_default_chart_of_accounts', { p_outlet_id: outletId });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error initializing default accounts:', error);
    return false;
  }
};
