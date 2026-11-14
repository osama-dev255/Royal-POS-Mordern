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
 * PostgREST types a to-one embed as an array; normalise it so callers always
 * receive a single outlet object.
 */
const firstOutlet = (outlets: any) => (Array.isArray(outlets) ? outlets[0] : outlets);

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
    const outlet = firstOutlet(data.outlets);

    return {
      id: data.id,
      outlet_id: data.outlet_id,
      user_id: data.user_id,
      role: data.role,
      is_active: data.is_active,
      outlet: {
        id: outlet?.id,
        name: outlet?.name,
        location: outlet?.location,
        status: outlet?.status
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

/**
 * Resolve the outlet a login is scoped to.
 * Unlike getUserOutlet this tolerates legacy rows with more than one
 * assignment and simply returns the earliest active one.
 * @param userId - The user's UUID
 */
export const getUserOutletAssignment = async (userId: string): Promise<OutletUser | null> => {
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
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      if (error) console.error('Error fetching outlet assignment:', error);
      return null;
    }

    const outlet = firstOutlet(data.outlets);

    return {
      id: data.id,
      outlet_id: data.outlet_id,
      user_id: data.user_id,
      role: data.role,
      is_active: data.is_active,
      outlet: {
        id: outlet?.id,
        name: outlet?.name,
        location: outlet?.location,
        status: outlet?.status
      }
    };
  } catch (error) {
    console.error('Error in getUserOutletAssignment:', error);
    return null;
  }
};

export interface OutletAssignment {
  id: string;
  outlet_id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  outlet_name: string;
}

/**
 * Every outlet assignment, used by the staff register to show which outlet a
 * login is scoped to.
 */
export const getOutletAssignments = async (): Promise<OutletAssignment[]> => {
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
          name
        )
      `);

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      outlet_id: row.outlet_id,
      user_id: row.user_id,
      role: row.role,
      is_active: row.is_active,
      outlet_name: row.outlets?.name || ''
    }));
  } catch (error) {
    console.error('Error fetching outlet assignments:', error);
    return [];
  }
};

/**
 * Bind a login to a single outlet. Any other assignment is removed so an
 * outlet-scoped account can never reach a second outlet.
 */
export const assignUserToOutlet = async (
  userId: string,
  outletId: string,
  role: string = 'manager'
): Promise<boolean> => {
  try {
    const { error: clearError } = await supabase
      .from('outlet_users')
      .delete()
      .eq('user_id', userId)
      .neq('outlet_id', outletId);

    if (clearError) {
      console.error('Error clearing previous outlet assignments:', clearError);
    }

    const { error } = await supabase
      .from('outlet_users')
      .upsert(
        {
          outlet_id: outletId,
          user_id: userId,
          role,
          is_active: true,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'outlet_id,user_id' }
      );

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error assigning user to outlet:', error);
    return false;
  }
};

/** Remove every outlet assignment for a login. */
export const clearUserOutlet = async (userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase.from('outlet_users').delete().eq('user_id', userId);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error clearing outlet assignment:', error);
    return false;
  }
};

/** Enable or disable outlet access without losing which outlet it points at. */
export const setUserOutletActive = async (userId: string, isActive: boolean): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('outlet_users')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating outlet assignment:', error);
    return false;
  }
};
