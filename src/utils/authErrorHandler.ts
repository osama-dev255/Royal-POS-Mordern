/**
 * Authentication error handler utility
 * Handles various auth-related errors including refresh token issues
 */

import { supabase } from '@/lib/supabaseClient';

export class AuthErrorHandler {
  /**
   * Handle authentication errors gracefully
   * @param error - The error object from Supabase
   * @returns Formatted error message for display to user
   */
  static handleAuthError(error: any): string {
    console.error('Auth Error:', error);
    
    // Handle refresh token errors specifically
    if (error.message && error.message.includes('Refresh Token Not Found')) {
      this.clearInvalidSession();
      return 'Your session has expired. Please log in again.';
    }
    
    // Handle other common auth errors
    if (error.message && error.message.includes('Invalid login credentials')) {
      return 'Invalid email or password. Please try again.';
    }
    
    if (error.message && error.message.includes('Email not confirmed')) {
      return 'Email not confirmed. Please check your email and click the confirmation link.';
    }
    
    if (error.message && error.message.includes('User already registered')) {
      return 'An account with this email already exists.';
    }
    
    // Generic error message
    return error.message || 'Authentication failed. Please try again.';
  }

  /**
   * Clear invalid session data when refresh token fails
   */
  static clearInvalidSession(): void {
    try {
      // Clear Supabase session
      supabase.auth.signOut();
      
      // Clear any cached session data
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('supabase.auth.refresh-token');
      
      console.log('Cleared invalid session data');
    } catch (err) {
      console.error('Error clearing session:', err);
    }
  }

  /**
   * Check if user needs to re-authenticate
   * @returns boolean indicating if session is invalid
   */
  static isSessionInvalid(error: any): boolean {
    return error.message && (
      error.message.includes('Refresh Token Not Found') ||
      error.message.includes('Invalid Refresh Token') ||
      error.message.includes('expired')
    );
  }

  /**
   * Attempt to refresh the session manually
   * @returns Promise resolving to success status
   */
  static async refreshSession(): Promise<boolean> {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Manual session refresh failed:', error);
        this.clearInvalidSession();
        return false;
      }
      
      console.log('Session refreshed successfully');
      return true;
    } catch (err) {
      console.error('Error during manual refresh:', err);
      this.clearInvalidSession();
      return false;
    }
  }
}