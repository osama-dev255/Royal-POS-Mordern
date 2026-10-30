import { supabase } from '@/lib/supabaseClient';
import { User } from '@/services/databaseService';
import { AuthErrorHandler } from '@/utils/authErrorHandler';

// Sign up a new user
export const signUp = async (email: string, password: string, userData?: any) => {
  try {
    // Sign up the user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData
      }
    });

    if (error) throw error;
    return { user: data.user, session: data.session };
  } catch (error) {
    console.error('Sign up error:', error);
    return { error };
  }
};

// Sign in a user
export const signIn = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return { user: data.user, session: data.session };
  } catch (error) {
    console.error('Sign in error:', error);
    return { error };
  }
};

// Sign out the current user
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Sign out error:', error);
    return { error };
  }
};

// Get the current user
export const getCurrentUser = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

// Get the current user's role
export const getCurrentUserRole = async () => {
  try {
    const user = await getCurrentUser();
    if (user && user.user_metadata) {
      return user.user_metadata.role || 'user';
    }
    return 'user';
  } catch (error) {
    console.error('Error getting current user role:', error);
    return 'user';
  }
};

// Snapshot the signed-in session
// Creating another account through signUp() replaces the active session when
// email confirmation is disabled, so administrative screens capture the current
// session first and restore it once the operation finishes.
export const getSessionSnapshot = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) return null;
    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    };
  } catch (error) {
    console.error('Error reading session:', error);
    return null;
  }
};

// Restore a previously captured session
// Restoring the next tick keeps listeners from observing the transient session
// created by signUp() for longer than one microtask.
export const restoreSession = async (
  snapshot: { access_token: string; refresh_token: string } | null
) => {
  if (!snapshot) return;
  try {
    await supabase.auth.setSession(snapshot);
  } catch (error) {
    console.error('Error restoring session:', error);
  }
};

// Listen for auth state changes
export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
  return subscription;
};

// Reset password
export const resetPassword = async (email: string) => {
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw error;
    return { data };
  } catch (error) {
    console.error('Password reset error:', error);
    return { error };
  }
};

// Update user password
export const updatePassword = async (password: string) => {
  try {
    const { data, error } = await supabase.auth.updateUser({
      password,
    });

    if (error) throw error;
    return { user: data.user };
  } catch (error) {
    console.error('Password update error:', error);
    return { error };
  }
};

// Update user email
export const updateEmail = async (email: string) => {
  try {
    const { data, error } = await supabase.auth.updateUser({
      email,
    });

    if (error) throw error;
    return { user: data.user };
  } catch (error) {
    console.error('Email update error:', error);
    return { error };
  }
};