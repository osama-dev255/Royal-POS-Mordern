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
    
    // Handle refresh token errors specifically (all Supabase v2 variants)
    if (this.isSessionInvalid(error)) {
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
   * Uses 'local' scope so no server call is attempted (the stored
   * refresh token is unusable anyway) and storage is cleaned properly
   */
  static async clearInvalidSession(): Promise<void> {
    try {
      await supabase.auth.signOut({ scope: 'local' });
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
    const message: string = (
      error?.message ||
      error?.error_description ||
      error?.code ||
      ''
    ).toLowerCase();
    if (!message) return false;
    return (
      message.includes('refresh token not found') ||
      message.includes('refresh_token_not_found') ||
      message.includes('invalid refresh token') ||
      message.includes('invalid_refresh_token') ||
      message.includes('already used') ||
      message.includes('session not found') ||
      message.includes('refresh token') ||
      message.includes('expired')
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