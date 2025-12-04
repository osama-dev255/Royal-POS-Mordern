import { supabase } from '@/lib/supabaseClient';
import { User } from '@/services/databaseService';

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