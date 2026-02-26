import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { GeminiService } from './services/gemini';
import { SupabaseService } from './services/supabase.service';
import { ReceiptService } from './services/receipt.service';
import { MealService } from './services/meal.service';
import { AuthService } from './services/auth.service'; 
import { ReceiptProcessorService } from './services/receipt-processor.service';
import { InventoryService } from './services/inventory.service';
import { OcrService } from './services/ocr.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule], 
  template: `
    <div style="padding: 20px; font-family: sans-serif; max-width: 800px; margin: 0 auto;">
      <h1>🚀 Supabase + Gemini Dashboard</h1>

      <!-- Auth Status -->
      <div style="margin: 20px 0; padding: 15px; background: #e8f5e9; border-radius: 4px;">
        <strong>Auth Status:</strong> {{ authStatus }}
        <br><br>
        @if (!isAuthenticated) {
          <button 
            (click)="signInAnonymously()" 
            style="padding: 10px 20px; background: #4caf50; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">
            🚀 Sign In Anonymously
          </button>
          
          <button 
            (click)="showEmailAuth = !showEmailAuth" 
            style="padding: 10px 20px; background: #2196f3; color: white; border: none; border-radius: 4px; cursor: pointer;">
            📧 {{ showEmailAuth ? 'Hide' : 'Show' }} Email Auth
          </button>
        }
        @if (isAuthenticated) {
          <button 
            (click)="signOut()" 
            style="padding: 10px 20px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;">
            🚪 Sign Out
          </button>
        }
      </div>

      <!-- Email Auth Form -->
      @if (showEmailAuth && !isAuthenticated) {
        <div style="margin: 20px 0; padding: 15px; background: #fff3e0; border-radius: 4px;">
          <h3>Email Authentication</h3>
          <input 
            type="email" 
            [(ngModel)]="email" 
            placeholder="email@example.com"
            style="width: 100%; padding: 8px; margin: 5px 0; border: 1px solid #ddd; border-radius: 4px;">
          <input 
            type="password" 
            [(ngModel)]="password" 
            placeholder="password"
            style="width: 100%; padding: 8px; margin: 5px 0; border: 1px solid #ddd; border-radius: 4px;">
          
          <button 
            (click)="signInWithEmail()" 
            [disabled]="authLoading"
            style="padding: 10px 20px; background: #2196f3; color: white; border: none; border-radius: 4px; cursor: pointer; margin: 5px 5px 5px 0;">
            {{ authLoading ? '⏳ Signing in...' : '🔑 Sign In' }}
          </button>
          
          <button 
            (click)="signUpWithEmail()" 
            [disabled]="authLoading"
            style="padding: 10px 20px; background: #4caf50; color: white; border: none; border-radius: 4px; cursor: pointer; margin: 5px 0;">
            {{ authLoading ? '⏳ Creating...' : '✨ Sign Up' }}
          </button>
          
          @if (authError) {
            <div style="color: #f44336; margin-top: 10px;">{{ authError }}</div>
          }
        </div>
      }

      <hr style="margin: 30px 0;">

      <!-- Test Receipt Upload -->
      <div style="margin: 20px 0;">
        <h3>📸 Receipt Upload & Processing</h3>
        @if (!isAuthenticated) {
          <p style="color: #ef4444;">⚠️ Please sign in first to upload receipts</p>
        }
        @if (isAuthenticated) {
          <input 
            type="file" 
            (change)="onFileSelected($event)" 
            accept="image/*"
            style="margin-bottom: 10px;">
          <br>
          <button 
            (click)="testReceiptUpload()" 
            [disabled]="!selectedFile || uploadLoading"
            style="padding: 10px 20px; background: #ff9800; color: white; border: none; border-radius: 4px; cursor: pointer;">
            {{ uploadLoading ? '⏳ Processing...' : '📤 Upload & Process Receipt' }}
          </button>
          
          <div style="margin-top: 10px; padding: 15px; background: #f8f9fa; border-radius: 4px;">
            <strong>Status:</strong> {{ uploadStatus }}
          </div>
        }
      </div>

      <hr style="margin: 30px 0;">

      <!-- Meal Recommendations & Expiry Alerts -->
      <div style="margin: 20px 0;">
        <h3>🍽️ Meal Recommendations & Alerts</h3>
        <button 
          (click)="testMealRecommendations()" 
          [disabled]="mealLoading"
          style="padding: 10px 20px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">
          {{ mealLoading ? '⏳ Loading...' : '🍳 Get Meal Recommendations' }}
        </button>
        
        <button 
          (click)="testExpiryAlerts()" 
          [disabled]="expiryLoading"
          style="padding: 10px 20px; background: #f59e0b; color: white; border: none; border-radius: 4px; cursor: pointer;">
          {{ expiryLoading ? '⏳ Checking...' : '⏰ Check Expiry Alerts' }}
        </button>

        @if (mealResults) {
          <div style="margin-top: 15px; padding: 15px; background: #f0fdf4; border-radius: 4px; border-left: 4px solid #10b981;">
            <h4>🍳 Meal Recommendations ({{ mealResults.length }})</h4>
            @for (meal of mealResults; track meal.id) {
              <div style="padding: 10px; margin: 10px 0; background: white; border-radius: 4px;">
                <strong>{{ meal.meal.name }}</strong>
                <p style="margin: 5px 0;">{{ meal.meal.description }}</p>
                <small style="color: #666;">
                  Match: {{ meal.match_score }}% | 
                  {{ meal.cuisine_type }} | 
                  {{ meal.difficulty_level }} | 
                  {{ meal.prep_time + meal.cook_time }} mins |
                  Savings: RM {{ meal.potential_savings }}
                </small>
                <details style="margin-top: 5px;">
                  <summary style="cursor: pointer; color: #10b981;">View Recipe</summary>
                  <pre style="white-space: pre-wrap; font-size: 12px; margin: 5px 0;">{{ meal.recipe_instructions }}</pre>
                </details>
              </div>
            }
          </div>
        }

        @if (expiryResults) {
          <div style="margin-top: 15px; padding: 15px; background: #fef3c7; border-radius: 4px; border-left: 4px solid #f59e0b;">
            <h4>⏰ Expiry Alert Summary</h4>
            <p><strong>Total Expiring Items:</strong> {{ expiryResults.summary?.total_expiring_items || 0 }}</p>
            <p><strong>Users Affected:</strong> {{ expiryResults.summary?.users_affected || 0 }}</p>
            <p><strong>Alerts Sent:</strong> {{ expiryResults.summary?.alerts_sent || 0 }}</p>
            @if (expiryResults.alerts && expiryResults.alerts.length > 0) {
              <div style="margin-top: 10px;">
                @for (alert of expiryResults.alerts; track $index) {
                  <div style="padding: 10px; margin: 5px 0; background: white; border-radius: 4px;">
                    <p>{{ alert.message }}</p>
                    <small style="color: #666;">{{ alert.item_count }} items ({{ alert.urgent_count }} urgent)</small>
                  </div>
                }
              </div>
            }
          </div>
        }
      </div>

      <hr style="margin: 30px 0;">

      <!-- View Receipts (removed the loadReceipts section as you mentioned) -->
      <div style="margin: 20px 0;">
        <h3>📋 My Receipts</h3>
        @if (!isAuthenticated) {
          <p style="color: #ef4444;">⚠️ Please sign in to view receipts</p>
        }
        @if (isAuthenticated) {
          <button 
            (click)="loadReceipts()" 
            [disabled]="loadingReceipts"
            style="padding: 10px 20px; background: #9c27b0; color: white; border: none; border-radius: 4px; cursor: pointer;">
            {{ loadingReceipts ? '⏳ Loading...' : '🔄 Refresh Receipts' }}
          </button>
          
          @if (receipts.length === 0 && !loadingReceipts) {
            <p style="color: #666; margin-top: 10px;">No receipts yet. Upload one above!</p>
          }
          
          @if (receipts.length > 0) {
            <ul style="list-style: none; padding: 0; margin-top: 10px;">
              @for (receipt of receipts; track receipt.id) {
                <li style="padding: 15px; margin: 10px 0; background: #f8f9fa; border-radius: 4px; border-left: 4px solid #4caf50;">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                      <strong style="font-size: 16px;">{{ receipt.store_name }}</strong>
                      <br>
                      <span style="color: #10b981; font-weight: bold; font-size: 18px;">{{ receipt.currency }} {{ receipt.total_amount }}</span>
                      <br>
                      <small style="color: #666;">
                        📅 {{ receipt.purchase_date | date:'short' }} | 
                        📦 {{ receipt.cookable_items?.length || 0 }} cookable items |
                        🏷️ {{ receipt.non_cookable_items?.length || 0 }} non-cookable
                      </small>
                      <br>
                      <small style="color: #666;">
                        Status: 
                        @if (receipt.processing_status === 'completed') {
                          <span style="color: #4caf50; font-weight: bold;">✅ Completed</span>
                        } @else if (receipt.processing_status === 'ocr_completed') {
                          <span style="color: #2196f3; font-weight: bold;">🔍 OCR Done</span>
                        } @else if (receipt.processing_status === 'processing') {
                          <span style="color: #ff9800; font-weight: bold;">⏳ Processing</span>
                        } @else if (receipt.processing_status === 'failed') {
                          <span style="color: #f44336; font-weight: bold;">❌ Failed</span>
                        } @else {
                          <span style="color: #9e9e9e;">⏸️ {{ receipt.processing_status }}</span>
                        }
                      </small>
                    </div>
                    <button 
                      (click)="viewReceiptDetails(receipt.id)"
                      style="padding: 8px 16px; background: #2196f3; color: white; border: none; border-radius: 4px; cursor: pointer;">
                      👁️ View
                    </button>
                  </div>
                </li>
              }
            </ul>
          }
        }
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
  
  selectedFile: File | null = null;
  uploadLoading = false;
  uploadStatus = 'No file selected';
  
  receipts: any[] = [];
  loadingReceipts = false;

  // Meal recommendations & expiry alerts
  mealLoading = false;
  expiryLoading = false;
  mealResults: any[] | null = null;
  expiryResults: any = null;

  constructor(
    private gemini: GeminiService,
    private supabase: SupabaseService,
    private receiptService: ReceiptService,
    private mealService: MealService,
    private auth: AuthService,
    private receiptProcessor: ReceiptProcessorService,  
    private inventory: InventoryService,
    private ocr: OcrService
  ) {
    // Expose services to window for debugging
    (window as any).backend = {
      gemini: this.gemini,
      supabase: this.supabase,
      receipt: this.receiptService,
      meal: this.mealService,
      auth: this.auth,
      processor: this.receiptProcessor,
      inventory: this.inventory,
      ocr: this.ocr
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

  // ============================================
  // AUTH METHODS
  // ============================================

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
      this.authError = error.message;
      console.error('Sign in error:', error);
    } finally {
      this.authLoading = false;
    }
  }

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
        this.authStatus = `✅ Account created! Signed in as ${user.email}`;
        this.isAuthenticated = true;
        this.showEmailAuth = false;
        this.email = '';
        this.password = '';
      }
    } catch (error: any) {
      this.authError = error.message;
      console.error('Sign up error:', error);
    } finally {
      this.authLoading = false;
    }
  }

  async signOut() {
    try {
      await this.auth.signOut();
      this.authStatus = '✅ Signed out successfully';
      this.isAuthenticated = false;
      this.receipts = [];
    } catch (error: any) {
      this.authStatus = `❌ Sign out error: ${error.message}`;
      console.error('Sign out error:', error);
    }
  }

  // ============================================
  // RECEIPT METHODS
  // ============================================

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.uploadStatus = `Selected: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
      console.log('📁 File selected:', file.name);
    }
  }

  async testReceiptUpload() {
    if (!this.selectedFile) {
      this.uploadStatus = '❌ Please select a file first';
      return;
    }

    this.uploadLoading = true;
    this.uploadStatus = '⏳ Step 1/6: Uploading image...';

    try {
      console.log('🚀 Starting receipt processing...');
      
      // Process receipt through the full pipeline
      const receiptId = await this.receiptProcessor.processReceiptFull(this.selectedFile);
      
      this.uploadStatus = `✅ Receipt processed successfully! ID: ${receiptId}`;
      console.log('✅ Receipt processing complete:', receiptId);
      
      // Refresh receipts list
      await this.loadReceipts();
      
      // Reset file input
      this.selectedFile = null;
      
    } catch (error: any) {
      this.uploadStatus = `❌ Error: ${error.message}`;
      console.error('❌ Receipt upload failed:', error);
    } finally {
      this.uploadLoading = false;
    }
  }

  async loadReceipts() {
    this.loadingReceipts = true;
    try {
      this.receipts = await this.receiptService.getUserReceipts();
      console.log(`📋 Loaded ${this.receipts.length} receipts`);
    } catch (error: any) {
      console.error('❌ Error loading receipts:', error);
    } finally {
      this.loadingReceipts = false;
    }
  }

  viewReceiptDetails(receiptId: string) {
    const receipt = this.receipts.find(r => r.id === receiptId);
    if (receipt) {
      console.log('📄 Receipt Details:', receipt);
      alert(`Receipt Details:\n\nStore: ${receipt.store_name}\nTotal: ${receipt.currency} ${receipt.total_amount}\nStatus: ${receipt.processing_status}\n\nCheck console for full details.`);
    }
  }

  // ============================================
  // MEAL RECOMMENDATIONS & EXPIRY ALERTS
  // ============================================

async testMealRecommendations() {
  this.mealLoading = true;
  this.mealResults = null;
  
  try {
    console.log('🍳 Testing meal recommendations...');
    // Call edge function directly
    const { data, error } = await this.supabase.client.functions.invoke('meal-recommendation', {
      body: { max_meals: 3 }
    });
    
    if (error) throw error;
    
    this.mealResults = data.recommendations || [];
    console.log('✅ Meal recommendations:', this.mealResults);
  } catch (error: any) {
    console.error('❌ Meal recommendation error:', error);
    alert(`Error: ${error.message}`);
  } finally {
    this.mealLoading = false;
  }
}

async testExpiryAlerts() {
  this.expiryLoading = true;
  this.expiryResults = null;
  
  try {
    console.log('⏰ Testing expiry alerts...');
    // Call the edge function directly via Supabase client
    const { data, error } = await this.supabase.client.functions.invoke('expiry-alerts');
    
    if (error) throw error;
    
    this.expiryResults = data;
    console.log('✅ Expiry alerts:', this.expiryResults);
  } catch (error: any) {
    console.error('❌ Expiry alert error:', error);
    alert(`Error: ${error.message}`);
  } finally {
    this.expiryLoading = false;
  }
}
}