import { supabase } from '@/lib/supabaseClient';
import { createUser } from '@/services/databaseService';

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
 * Read the role stored for a login, or null when the staff row is missing.
 * maybeSingle() reports "no rows" as data=null instead of a 406, so a missing
 * record is not logged as a transport error.
 */
const fetchUserRole = async (id: string): Promise<string | null> => {
  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching user role:', error);
    return null;
  }

  return data?.role || null;
};

const resolveCurrentUserRole = async (): Promise<string | null> => {
  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const role = await fetchUserRole(user.id);
  if (role) {
    return role;
  }

  // The login exists in auth but has no staff row yet (for example an account
  // whose profile write failed). Provision the row so the session is usable;
  // createUser resolves the unique username and heals a half-written row.
  try {
    const created = await createUser({
      id: user.id,
      username: user.email?.split('@')[0] || user.id,
      email: user.email || undefined,
      first_name: user.user_metadata?.first_name || '',
      last_name: user.user_metadata?.last_name || '',
      role: 'cashier', // Default role
      is_active: true,
    });

    if (created?.role) {
      return created.role;
    }

    console.error('Error creating user: the staff record could not be saved for', user.email);
  } catch (error) {
    console.error('Error creating user:', error);
  }

  // Another staff row may already own this email (a login recreated after its
  // record was deleted). Reuse its role instead of locking the account out.
  if (user.email) {
    const { data: legacy } = await supabase
      .from('users')
      .select('role')
      .eq('email', user.email)
      .maybeSingle();
    if (legacy?.role) return legacy.role;
  }

  return null;
};

// Several screens ask for the role at mount; one shared lookup keeps a missing
// staff row from being provisioned (and failing) three times in a row.
let roleLookup: Promise<string | null> | null = null;

/**
 * Get the current user's role
 * @returns Promise<string | null> - User's role or null if not available
 */
export const getCurrentUserRole = async (): Promise<string | null> => {
  if (!roleLookup) {
    roleLookup = resolveCurrentUserRole().finally(() => {
      roleLookup = null;
    });
  }

  return roleLookup;
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
      'templates',
      'saved-invoices',
      'saved-deliveries',
      'saved-orders',
      'saved-customer-settlements',
      'saved-grns',
      'saved-supplier-settlements',
      'saved-supplier-purchase-notes',
      'saved-purchase-orders',
      'supplier-products',
      'cogs',
      'grn-inventory-dashboard',
      'sales-management-report'
    ],
    'manager': [
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
      'templates',
      'saved-invoices',
      'saved-deliveries',
      'saved-orders',
      'saved-customer-settlements',
      'saved-grns',
      'saved-supplier-settlements',
      'saved-supplier-purchase-notes',
      'saved-purchase-orders',
      'supplier-products',
      'cogs',
      'grn-inventory-dashboard',
      'sales-management-report'
    ],
    'cashier': [
      'sales', 'customers', 'products', 'transactions', 'discounts', 'scanner',
      'sales-cart', 'sales-orders', 'test-data', 'capital',
      'assets', 'templates',
      'saved-invoices',
      'saved-deliveries',
      'saved-orders',
      'saved-customer-settlements',
      'saved-grns',
      'saved-supplier-settlements',
      'saved-supplier-purchase-notes',
      'saved-purchase-orders',
      'supplier-products',
      'cogs',
      'grn-inventory-dashboard',
      'sales-management-report'
    ],
    'staff': [
      'inventory', 'customers', 'products', 'capital', 'suppliers',
      'assets', 'templates',
      'saved-deliveries',
      'saved-customer-settlements',
      'saved-grns',
      'saved-supplier-settlements',
      'saved-supplier-purchase-notes',
      'saved-purchase-orders',
      'supplier-products',
      'cogs',
      'grn-inventory-dashboard',
      'sales-management-report'
    ],
    // Outlet managers work inside one assigned outlet only. They own no
    // head-office module, so every main dashboard card is denied; Index.tsx
    // pins them to their own outlet views.
    'outlet_manager': [],
  };
  
  // Check if the role exists and has access to the module
  return rolePermissions[role]?.includes(module) || false;
};

/**
 * Roles that may only work inside their single assigned outlet
 * @param role - User's role
 * @returns true when the role is restricted to one outlet
 */
export const isOutletScopedRole = (role: string | null): boolean => role === 'outlet_manager';