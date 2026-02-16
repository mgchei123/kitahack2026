import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // ← ADD THIS for ngModel
import { GeminiService } from './services/gemini';
import { SupabaseService } from './services/supabase.service';
import { ReceiptService } from './services/receipt.service';
import { MealService } from './services/meal.service';
import { AuthService } from './services/auth.service'; // ← ADD THIS

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule], // ← ADD FormsModule
  template: `
    <div style="padding: 20px; font-family: sans-serif; max-width: 800px; margin: 0 auto;">
      <h1>🚀 Supabase + Gemini Dashboard</h1>

      <!-- Auth Status -->
      <div style="margin: 20px 0; padding: 15px; background: #e8f5e9; border-radius: 4px;">
        <strong>Auth Status:</strong> {{ authStatus }}
        
        @if (!isAuthenticated) {
          <div style="margin-top: 10px;">
            <!-- Quick Demo Button -->
            <button (click)="signInAnonymously()" 
                    style="padding: 8px 16px; cursor: pointer; background: #10b981; color: white; border: none; border-radius: 4px; margin-right: 10px;">
              🚀 Quick Demo (No Login)
            </button>
            
            <!-- Email Login Toggle -->
            <button (click)="showEmailAuth = !showEmailAuth" 
                    style="padding: 8px 16px; cursor: pointer; background: #4285f4; color: white; border: none; border-radius: 4px;">
              {{ showEmailAuth ? '❌ Hide Email Login' : '📧 Email Login' }}
            </button>
          </div>
          
          <!-- Email Auth Form -->
          @if (showEmailAuth) {
            <div style="margin-top: 15px; padding: 15px; background: white; border-radius: 4px; border: 1px solid #ddd;">
              <div style="margin-bottom: 10px;">
                <input 
                  type="email" 
                  [(ngModel)]="email" 
                  placeholder="Email"
                  style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
              </div>
              <div style="margin-bottom: 10px;">
                <input 
                  type="password" 
                  [(ngModel)]="password" 
                  placeholder="Password (min 6 characters)"
                  style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
              </div>
              <div>
                <button (click)="signInWithEmail()" 
                        [disabled]="authLoading"
                        style="padding: 8px 16px; background: #4285f4; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">
                  {{ authLoading ? '⏳ Signing In...' : '🔑 Sign In' }}
                </button>
                <button (click)="signUpWithEmail()" 
                        [disabled]="authLoading"
                        style="padding: 8px 16px; background: #8b5cf6; color: white; border: none; border-radius: 4px; cursor: pointer;">
                  {{ authLoading ? '⏳ Creating Account...' : '✨ Create Account' }}
                </button>
              </div>
              @if (authError) {
                <p style="color: #ef4444; margin-top: 10px; font-size: 14px;">{{ authError }}</p>
              }
            </div>
          }
        } @else {
          <button (click)="signOut()" 
                  style="margin-left: 10px; padding: 8px 16px; cursor: pointer; background: #ef4444; color: white; border: none; border-radius: 4px;">
            🚪 Sign Out
          </button>
        }
      </div>

      <hr style="margin: 30px 0;">

      <!-- Test AI -->
      <div style="margin: 20px 0;">
        <button 
          (click)="testAI()" 
          [disabled]="aiLoading"
          style="padding: 10px 20px; font-size: 16px; cursor: pointer; background: #4285f4; color: white; border: none; border-radius: 4px;">
          {{ aiLoading ? '⏳ Thinking...' : '🤖 Test Gemini AI' }}
        </button>
        
        <div style="margin-top: 10px; padding: 15px; background: #f8f9fa; border-radius: 4px; min-height: 60px;">
          <strong>AI Says:</strong>
          <p style="margin: 5px 0 0 0; white-space: pre-wrap;">{{ aiResponse }}</p>
        </div>
      </div>

      <hr style="margin: 30px 0;">

      <!-- Test Database -->
      <div style="margin: 20px 0;">
        <button 
          (click)="testDatabase()" 
          [disabled]="dbLoading || !isAuthenticated"
          style="padding: 10px 20px; font-size: 16px; cursor: pointer; background: #10b981; color: white; border: none; border-radius: 4px;"
          [style.opacity]="!isAuthenticated ? '0.5' : '1'">
          {{ dbLoading ? '⏳ Testing...' : '🗄️ Test Supabase Database' }}
        </button>
        
        <div style="margin-top: 10px; padding: 15px; background: #f8f9fa; border-radius: 4px;">
          <strong>DB Status:</strong> {{ dbStatus }}
        </div>
      </div>

      <hr style="margin: 30px 0;">

      <!-- Test Receipt Upload -->
      <div style="margin: 20px 0;">
        <h3>Test Receipt Upload</h3>
        @if (!isAuthenticated) {
          <p style="color: #ef4444;">⚠️ Please sign in first to upload receipts</p>
        }
        <input 
          type="file" 
          (change)="onFileSelected($event)" 
          accept="image/*"
          [disabled]="!isAuthenticated">
        <button 
          (click)="testReceiptUpload()" 
          [disabled]="!selectedFile || uploadLoading || !isAuthenticated"
          style="margin-left: 10px; padding: 10px 20px; background: #f59e0b; color: white; border: none; border-radius: 4px; cursor: pointer;"
          [style.opacity]="(!selectedFile || !isAuthenticated) ? '0.5' : '1'">
          {{ uploadLoading ? '⏳ Uploading...' : '📤 Upload Test Receipt' }}
        </button>
        
        <div style="margin-top: 10px; padding: 15px; background: #f8f9fa; border-radius: 4px;">
          {{ uploadStatus }}
        </div>
      </div>

      <hr style="margin: 30px 0;">

      <!-- My Receipts -->
      <div style="margin: 20px 0;">
        <button 
          (click)="loadReceipts()" 
          [disabled]="!isAuthenticated || loadingReceipts"
          style="padding: 10px 20px; background: #8b5cf6; color: white; border: none; border-radius: 4px; cursor: pointer;"
          [style.opacity]="!isAuthenticated ? '0.5' : '1'">
          {{ loadingReceipts ? '⏳ Loading...' : '📋 Load My Receipts' }}
        </button>
        
        <div style="margin-top: 10px;">
          <strong>Total Receipts:</strong> {{ receipts.length }}
          
          @if (receipts.length === 0 && isAuthenticated) {
            <p style="color: #666; font-style: italic;">No receipts yet. Upload one to get started!</p>
          }
          
          @if (receipts.length > 0) {
            <ul style="list-style: none; padding: 0;">
              @for (receipt of receipts; track receipt.id) {
                <li style="padding: 10px; margin: 5px 0; background: #f8f9fa; border-radius: 4px;">
                  <strong>{{ receipt.store_name }}</strong> - 
                  <span style="color: #10b981; font-weight: bold;">\${{ receipt.total_amount }}</span> - 
                  <span style="color: #666;">{{ receipt.created_at | date:'short' }}</span>
                  <br>
                  <small style="color: #666;">{{ receipt.items?.length || 0 }} items</small>
                </li>
              }
            </ul>
          }
        </div>
      </div>
    </div>
  `
})
export class App implements OnInit {
  authStatus = 'Not authenticated';
  isAuthenticated = false;
  
  // Email auth form
  showEmailAuth = false;
  email = '';
  password = '';
  authLoading = false;
  authError = '';
  
  aiLoading = false;
  aiResponse = 'Click the button to test AI!';
  
  dbLoading = false;
  dbStatus = 'Not tested yet';
  
  selectedFile: File | null = null;
  uploadLoading = false;
  uploadStatus = 'No file selected';
  
  receipts: any[] = [];
  loadingReceipts = false;

  constructor(
    private gemini: GeminiService,
    private supabase: SupabaseService,
    private receiptService: ReceiptService,
    private mealService: MealService,
    private auth: AuthService // ← ADD THIS
  ) {
    (window as any).backend = {
      gemini: this.gemini,
      supabase: this.supabase,
      receipt: this.receiptService,
      meal: this.mealService,
      auth: this.auth // ← ADD THIS
    };
    console.log('✅ Access backend services via: window.backend');
  }

  ngOnInit() {
    this.supabase.user$.subscribe((user: any) => {
      if (user) {
        this.authStatus = `✅ Authenticated as ${user.email || user.id.substring(0, 8) + '...'}`;
        this.isAuthenticated = true;
      } else {
        this.authStatus = '❌ Not authenticated';
        this.isAuthenticated = false;
        this.receipts = [];
      }
    });
  }

  // 🚀 Anonymous Sign In
  async signInAnonymously() {
    try {
      this.authStatus = '⏳ Signing in anonymously...';
      const user = await this.auth.signInAnonymously();
      if (user) {
        this.authStatus = `✅ Signed in anonymously as ${user.id.substring(0, 8)}...`;
        this.isAuthenticated = true;
      } else {
        this.authStatus = '❌ Anonymous sign in failed';
      }
    } catch (error: any) {
      this.authStatus = `❌ Error: ${error.message}`;
      console.error('Anonymous sign in error:', error);
    }
  }

  // 📧 Email Sign In
  async signInWithEmail() {
    if (!this.email || !this.password) {
      this.authError = 'Please enter email and password';
      return;
    }

    this.authLoading = true;
    this.authError = '';
    
    try {
      const user = await this.auth.signInWithEmail(this.email, this.password);
      if (user) {
        this.authStatus = `✅ Signed in as ${user.email}`;
        this.isAuthenticated = true;
        this.showEmailAuth = false;
        this.email = '';
        this.password = '';
      }
    } catch (error: any) {
      this.authError = error.message || 'Failed to sign in';
    } finally {
      this.authLoading = false;
    }
  }

  // ✨ Email Sign Up
  async signUpWithEmail() {
    if (!this.email || !this.password) {
      this.authError = 'Please enter email and password';
      return;
    }

    if (this.password.length < 6) {
      this.authError = 'Password must be at least 6 characters';
      return;
    }

    this.authLoading = true;
    this.authError = '';
    
    try {
      const user = await this.auth.signUp(this.email, this.password);
      if (user) {
        this.authStatus = `✅ Account created! Check your email to verify.`;
        this.authError = '📧 Please check your email to verify your account';
      }
    } catch (error: any) {
      this.authError = error.message || 'Failed to create account';
    } finally {
      this.authLoading = false;
    }
  }

  // 🚪 Sign Out
  async signOut() {
    try {
      await this.auth.signOut();
      this.authStatus = '✅ Signed out successfully';
      this.isAuthenticated = false;
      this.receipts = [];
      this.selectedFile = null;
      this.uploadStatus = 'No file selected';
      this.showEmailAuth = false;
      this.email = '';
      this.password = '';
    } catch (error: any) {
      console.error('Sign out error:', error);
    }
  }

  async testAI() {
    this.aiLoading = true;
    this.aiResponse = 'Thinking...';
    
    try {
      const response = await this.gemini.generateText(
        'Tell me a fun fact about food waste and sustainability in one sentence.'
      );
      this.aiResponse = response || 'No response from AI';
    } catch (error: any) {
      this.aiResponse = `❌ Error: ${error.message || 'Failed to connect to Gemini AI'}`;
      console.error('AI error:', error);
    } finally {
      this.aiLoading = false;
    }
  }

  async testDatabase() {
    this.dbLoading = true;
    this.dbStatus = '⏳ Testing connection...';
    
    try {
      const { data, error } = await this.supabase.client
        .from('receipts')
        .select('count');
      
      if (error) throw error;
      this.dbStatus = `✅ Connected! Database is working. (Count query successful)`;
    } catch (error: any) {
      this.dbStatus = `❌ Error: ${error.message}`;
      console.error('Database error:', error);
    } finally {
      this.dbLoading = false;
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        this.uploadStatus = '❌ Please select an image file';
        this.selectedFile = null;
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        this.uploadStatus = '❌ File too large (max 5MB)';
        this.selectedFile = null;
        return;
      }
      
      this.selectedFile = file;
      this.uploadStatus = `✅ Selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    }
  }

  async testReceiptUpload() {
    if (!this.selectedFile) {
      this.uploadStatus = '❌ No file selected';
      return;
    }
    
    this.uploadLoading = true;
    this.uploadStatus = '⏳ Uploading image and saving data...';
    
    try {
      const result = await this.receiptService.uploadReceipt(
        this.selectedFile,
        {
          store_name: 'Test Store',
          total_amount: 99.99,
          currency: 'USD',
          items: [
            { name: 'Test Item 1', price: 50.00, quantity: 1 },
            { name: 'Test Item 2', price: 49.99, quantity: 1 }
          ]
        }
      );
      
      this.uploadStatus = `✅ Success! Receipt ID: ${result.receiptId}`;
      setTimeout(() => this.loadReceipts(), 500);
      this.selectedFile = null;
    } catch (error: any) {
      this.uploadStatus = `❌ Error: ${error.message}`;
      console.error('Upload error:', error);
    } finally {
      this.uploadLoading = false;
    }
  }

  async loadReceipts() {
    this.loadingReceipts = true;
    
    try {
      this.receipts = await this.receiptService.getUserReceipts();
      console.log('Loaded receipts:', this.receipts);
    } catch (error: any) {
      console.error('Error loading receipts:', error);
      alert(`Failed to load receipts: ${error.message}`);
    } finally {
      this.loadingReceipts = false;
    }
  }
}