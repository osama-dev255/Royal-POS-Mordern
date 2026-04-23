import { supabase } from '@/lib/supabaseClient';

export interface OutletUser {
  id: string;
  outlet_id: string;
  user_id: string;
  role: 'manager' | 'cashier' | 'staff' | 'admin';
  is_active: boolean;
  outlet: {
    id: string;
    name: string;
    location: string;
    status: string;
  };
}

/**
 * Get the outlet assigned to a user
 * @param userId - The user's UUID
 * @returns The outlet user assignment with outlet details, or null if not found
 */
export const getUserOutlet = async (userId: string): Promise<OutletUser | null> => {
  try {
    const { data, error } = await supabase
      .from('outlet_users')
      .select(`
        id,
        outlet_id,
        user_id,
        role,
        is_active,
        outlets!inner (
          id,
          name,
          location,
          status
        )
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error) {
      // PGRST116 means no rows found, which is expected if user has no outlet
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching user outlet:', error);
      return null;
    }

    // Transform the data to match OutletUser interface
    return {
      id: data.id,
      outlet_id: data.outlet_id,
      user_id: data.user_id,
      role: data.role,
      is_active: data.is_active,
      outlet: {
        id: data.outlets.id,
        name: data.outlets.name,
        location: data.outlets.location,
        status: data.outlets.status
      }
    };
  } catch (error) {
    console.error('Error in getUserOutlet:', error);
    return null;
  }
};

/**
 * Check if user has access to a specific outlet
 * @param userId - The user's UUID
 * @param outletId - The outlet UUID to check
 * @returns true if user has access to the outlet
 */
export const hasOutletAccess = async (userId: string, outletId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('outlet_users')
      .select('id')
      .eq('user_id', userId)
      .eq('outlet_id', outletId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error checking outlet access:', error);
    return false;
  }
};
