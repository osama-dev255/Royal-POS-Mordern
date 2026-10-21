import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { AuthErrorHandler } from '@/utils/authErrorHandler';

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
        // Note: getUser() does not throw in supabase-js v2 — the error
        // is returned and must be checked here (e.g. invalid refresh token)
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error) {
          if (AuthErrorHandler.isSessionInvalid(error)) {
            // Stale/rotated refresh token: drop the local session to stop
            // the endless 400 refresh-token loop and force a fresh login
            console.log('Invalid refresh token, clearing local session:', error.message);
            await AuthErrorHandler.clearInvalidSession();
            setUser(null);
          } else {
            console.error('Error checking user session:', error);
            setUser(null);
          }
        } else {
          setUser(user);
        }
      } catch (error: any) {
        console.error('Error checking user session:', error);
        // If refresh token is invalid, clear local session
        if (AuthErrorHandler.isSessionInvalid(error)) {
          console.log('Invalid refresh token, clearing local session');
          await AuthErrorHandler.clearInvalidSession();
        }
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event);
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