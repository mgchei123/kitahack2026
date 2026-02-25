import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;
  private currentUser$ = new BehaviorSubject<User | null>(null);

  constructor() {
    this.supabase = createClient(
      environment.supabase.url,
      environment.supabase.anonKey
    );

    // Check for existing session
    this.supabase.auth.getSession().then(({ data: { session } }) => {
      this.currentUser$.next(session?.user ?? null);
    });

    // Listen for auth changes
    this.supabase.auth.onAuthStateChange((_event, session) => {
      this.currentUser$.next(session?.user ?? null);
    });
  }

  get client() {
    return this.supabase;
  }

  get user$(): Observable<User | null> {
    return this.currentUser$.asObservable();
  }

  get userId(): string | undefined {
    return this.currentUser$.value?.id;
  }

  // Simple anonymous auth for testing (no login required!)
  async signInAnonymously(): Promise<User | null> {
    try {
      const { data, error } = await this.supabase.auth.signInAnonymously();
      if (error) throw error;
      return data.user;
    } catch (error) {
      console.error('Error signing in anonymously:', error);
      return null;
    }
  }

  getSupabaseUrl(): string {
  // Extract URL from the client
  return this.client['supabaseUrl'] || 'https://your-project.supabase.co';
}

  // Email/password auth (optional - for later)
  async signUp(email: string, password: string) {
    return await this.supabase.auth.signUp({ email, password });
  }

  async signIn(email: string, password: string) {
    return await this.supabase.auth.signInWithPassword({ email, password });
  }

  async signOut() {
    return await this.supabase.auth.signOut();
  }
}