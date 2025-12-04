import { supabase } from '@/lib/supabaseClient';
import { User } from '@/services/databaseService';

/**
 * Check if the current user has permission to create sales
 * @returns Promise<boolean> - True if user can create sales, false otherwise
 */
export const canCreateSales = async (): Promise<boolean> => {
  // After removing RLS, all authenticated users can create sales
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    // If user is logged in, they can create sales
    return !!user;
  } catch (error) {
    console.error('Error checking sales permission:', error);
    return false;
  }
};

/**
 * Get the current user's role
 * @returns Promise<string | null> - User's role or null if not available
 */
export const getCurrentUserRole = async (): Promise<string | null> => {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return null;
    }
    
    // First, check if the user exists in the users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();
    
    // If user doesn't exist in the users table, create them
    if (userError || !userData) {
      // Create a new user record with default values
      const newUser = {
        id: user.id,
        username: user.email?.split('@')[0] || user.id,
        email: user.email || '',
        first_name: user.user_metadata?.first_name || '',
        last_name: user.user_metadata?.last_name || '',
        role: 'cashier', // Default role
        is_active: true
      };
      
      const { data: createdUser, error: createError } = await supabase
        .from('users')
        .insert([newUser])
        .select()
        .single();
      
      if (createError) {
        console.error('Error creating user:', createError);
        return null;
      }
      
      return createdUser?.role || 'cashier';
    }
    
    // Get user details from the database
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (error) {
      console.error('Error fetching user role:', error);
      return null;
    }
    
    return data?.role || null;
  } catch (error) {
    console.error('Error getting current user role:', error);
    return null;
  }
};

/**
 * Check if user has access to a specific module based on their role
 * @param role - User's role
 * @param module - Module name to check access for
 * @returns boolean - True if user has access, false otherwise
 */
export const hasModuleAccess = (role: string | null, module: string): boolean => {
  // If no role is provided, deny access
  if (!role) return false;
  
  // Define access permissions by role
  const rolePermissions: Record<string, string[]> = {
    'admin': [
      'sales', 'inventory', 'customers', 'suppliers', 'purchase', 'finance', 
      'employees', 'expenses', 'returns', 'debts', 'discounts', 'audit', 
      'reports', 'access-logs', 'settings', 'scanner', 'automated',
      'customer-settlements', 'supplier-settlements', 'payables-receivables', 'transactions',
      'sales-cart', 'sales-orders', 'products', 'test-data',
      'customer-stock', 'monetary-assets',
      'financial-statements', 'purchase-orders', 'purchase-terminal',
      'purchase-transactions', 'purchase-reports', 'spending-analytics',
      'statements-reports', 'financial-reports', 'income-statement',
      'assets', 'capital',
      'purchase-assets', 'sell-assets', 'dispose-assets', 'adjust-assets',
      'templates'
    ],
    'manager': [
      'sales', 'inventory', 'customers', 'suppliers', 'purchase', 'finance', 
      'expenses', 'returns', 'debts', 'discounts', 'audit', 
      'reports', 'access-logs', 'settings', 'scanner', 'automated',
      'customer-settlements', 'supplier-settlements', 'payables-receivables', 'transactions',
      'sales-cart', 'sales-orders', 'products', 'test-data',
      'customer-stock', 'monetary-assets',
      'financial-statements', 'purchase-orders', 'purchase-terminal',
      'purchase-transactions', 'purchase-reports', 'spending-analytics',
      'statements-reports', 'financial-reports', 'income-statement',
      'assets', 'capital',
      'purchase-assets', 'sell-assets', 'dispose-assets', 'adjust-assets',
      'templates'
    ],
    'cashier': [
      'sales', 'customers', 'products', 'transactions', 'discounts', 'scanner',
      'sales-cart', 'sales-orders', 'test-data', 'capital',
      'assets', 'templates'
    ],
    'staff': [
      'inventory', 'customers', 'products', 'capital',
      'assets', 'templates'
    ]
  };
  
  // Check if the role exists and has access to the module
  return rolePermissions[role]?.includes(module) || false;
};