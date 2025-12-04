import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { getCurrentUser } from '@/services/authService';

interface AuthContextType {
  user: SupabaseUser | null;
  login: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  signUp: (email: string, password: string, userData?: any) => Promise<any>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check active session
    const checkUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Error checking user session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      setUser(data.user);
      return { user: data.user };
    } catch (error: any) {
      console.error('Login error:', error);
      // Provide more specific error message for email confirmation
      if (error.message && error.message.includes('Email not confirmed')) {
        return { 
          error: new Error('Email not confirmed. Please check your email and click the confirmation link before logging in.') 
        };
      }
      return { error };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const signUp = async (email: string, password: string, userData?: any) => {
    try {
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

  return (
    <AuthContext.Provider value={{ user, login, logout, signUp, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};