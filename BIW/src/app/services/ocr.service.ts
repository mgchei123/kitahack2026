import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { environment } from '../../environments/environment';

export interface OCRResult {
  raw_text: string;
  confidence: number;
}

export interface OCRError {
  error: string;
  details?: string;
  status?: number;
}

@Injectable({
  providedIn: 'root'
})
export class OcrService {
  private readonly OCR_FUNCTION_URL = 'https://kfqxzxuzzhuqcykgwfeu.functions.supabase.co/ocr';
  
  constructor(private supabase: SupabaseService) {}

  /**
   * Call Supabase Edge Function for OCR
   */
  async extractTextFromImage(imageUrl: string): Promise<OCRResult> {
    try {
      // Get current session with proper await
      const { data: { session }, error: sessionError } = await this.supabase.client.auth.getSession();
      
      if (sessionError) {
        console.error('❌ Session error:', sessionError);
        throw new Error('Failed to get authentication session');
      }

      if (!session) {
        throw new Error('No active session - user not authenticated');
      }

      const token = session.access_token;
      
      if (!token) {
        throw new Error('No access token available - please sign in again');
      }

      // Get anon key from environment
      const anonKey = environment.supabase.anonKey;

      console.log('🔍 Calling OCR Edge Function:', this.OCR_FUNCTION_URL);
      console.log('🔑 Auth token exists:', !!token);
      console.log('🔑 Anon key exists:', !!anonKey);
      console.log('📸 Image URL:', imageUrl);
      
      const response = await fetch(this.OCR_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ image_url: imageUrl })
      });

      console.log('📡 Response status:', response.status);

      // Handle HTTP errors
      if (!response.ok) {
        let errorText = await response.text();
        console.error('❌ OCR API Error Response:', errorText);
        
        let errorDetails: OCRError;
        
        try {
          errorDetails = JSON.parse(errorText);
        } catch {
          errorDetails = { error: errorText, status: response.status };
        }

        // Specific error handling
        if (response.status === 401 || response.status === 403) {
          throw new Error('Authentication failed. The OCR function rejected your credentials. Please sign out and sign in again.');
        } else if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again in a few moments.');
        } else if (response.status >= 500) {
          throw new Error(`OCR service error: ${errorDetails.error || 'Server error'}`);
        } else {
          throw new Error(`OCR failed (${response.status}): ${errorDetails.error || 'Unknown error'}`);
        }
      }

      const result: OCRResult = await response.json();
      console.log('✅ OCR Response:', result);
      
      // Validate response
      if (!result.raw_text) {
        throw new Error('OCR response missing raw_text field');
      }

      console.log('✅ OCR Success - Confidence:', result.confidence);
      return result;
      
    } catch (error: any) {
      console.error('❌ OCR Error:', error);
      
      // Re-throw with user-friendly message
      if (error.message.includes('fetch') || error.name === 'TypeError') {
        throw new Error('Network error: Unable to reach OCR service. Check your internet connection.');
      }
      throw error;
    }
  }

  /**
   * Validate image URL is accessible
   */
  async validateImageUrl(imageUrl: string): Promise<boolean> {
    try {
      const response = await fetch(imageUrl, { method: 'HEAD' });
      console.log('🔍 Image URL validation:', response.ok ? '✅' : '❌', imageUrl);
      return response.ok;
    } catch (error) {
      console.error('❌ Image URL validation failed:', error);
      return false;
    }
  }
}