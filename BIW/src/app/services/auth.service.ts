import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { User } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(private supabase: SupabaseService) {}

  // 🚀 Anonymous sign-in (Quick Demo)
  async signInAnonymously(): Promise<User | null> {
    try {
      const { data, error } = await this.supabase.client.auth.signInAnonymously();
      if (error) throw error;
      return data.user;
    } catch (error) {
      console.error('Anonymous sign-in error:', error);
      return null;
    }
  }

  // 📧 Email/Password Sign Up
  async signUp(email: string, password: string): Promise<User | null> {
    try {
      const { data, error } = await this.supabase.client.auth.signUp({
        email,
        password
      });
      
      if (error) throw error;
      return data.user;
    } catch (error: any) {
      console.error('Sign up error:', error);
      throw new Error(error.message || 'Failed to sign up');
    }
  }

  // 📧 Email/Password Sign In
  async signInWithEmail(email: string, password: string): Promise<User | null> {
    try {
      const { data, error } = await this.supabase.client.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      return data.user;
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw new Error(error.message || 'Failed to sign in');
    }
  }

  // 🌐 Google OAuth (Optional - impressive for demos!)
  async signInWithGoogle() {
    try {
      const { data, error } = await this.supabase.client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      
      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      throw new Error(error.message || 'Failed to sign in with Google');
    }
  }

  // 🚪 Sign Out
  async signOut(): Promise<void> {
    try {
      const { error } = await this.supabase.client.auth.signOut();
      if (error) throw error;
    } catch (error: any) {
      console.error('Sign out error:', error);
      throw new Error(error.message || 'Failed to sign out');
    }
  }

  // 👤 Get current user
  get currentUser(): User | null {
    return this.supabase.client.auth.getUser() as any;
  }

  // 🔍 Check if user is authenticated
  get isAuthenticated(): boolean {
    return !!this.supabase.userId;
  }
}