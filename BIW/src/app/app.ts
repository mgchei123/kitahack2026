import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from './services/supabase.service';
import { ReceiptProcessorService } from './services/receipt-processor.service';
import { ReceiptService } from './services/receipt.service';
import { InventoryService } from './services/inventory.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div style="padding: 20px; font-family: sans-serif; max-width: 1200px; margin: 0 auto;">
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

      <!-- Manual Food Addition Section -->
      <div style="margin: 20px 0;">
        <h3>🍎 Manual Food Addition</h3>
        @if (!isAuthenticated) {
          <p style="color: #ef4444;">⚠️ Please sign in first to add food manually</p>
        }
        @if (isAuthenticated) {
          <button 
            (click)="toggleManualFoodForm()" 
            style="padding: 10px 20px; background: #8b5cf6; color: white; border: none; border-radius: 4px; cursor: pointer; margin-bottom: 15px;">
            {{ showManualFoodForm ? '❌ Cancel' : '➕ Add Food Manually' }}
          </button>

          @if (showManualFoodForm) {
            <div style="padding: 20px; background: #f3f4f6; border-radius: 8px; border: 2px solid #8b5cf6;">
              <h4>Add Ingredient</h4>
              
              <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Ingredient Name *</label>
                <input 
                  [(ngModel)]="manualFoodForm.ingredient_name"
                  type="text" 
                  placeholder="e.g., Tomatoes, Chicken Breast, Rice"
                  style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 4px;">
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                <div>
                  <label style="display: block; margin-bottom: 5px; font-weight: bold;">Quantity *</label>
                  <input 
                    [(ngModel)]="manualFoodForm.quantity"
                    type="number" 
                    min="0.1"
                    step="0.1"
                    style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 4px;">
                </div>

                <div>
                  <label style="display: block; margin-bottom: 5px; font-weight: bold;">Unit *</label>
                  <select 
                    [(ngModel)]="manualFoodForm.unit"
                    style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 4px;">
                    <option value="pieces">Pieces</option>
                    <option value="kg">Kilograms (kg)</option>
                    <option value="g">Grams (g)</option>
                    <option value="l">Liters (l)</option>
                    <option value="ml">Milliliters (ml)</option>
                    <option value="cups">Cups</option>
                    <option value="tbsp">Tablespoons</option>
                    <option value="tsp">Teaspoons</option>
                    <option value="pack">Pack</option>
                    <option value="bottle">Bottle</option>
                  </select>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                <div>
                  <label style="display: block; margin-bottom: 5px; font-weight: bold;">Category</label>
                  <select 
                    [(ngModel)]="manualFoodForm.category"
                    style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 4px;">
                    <option value="">Select Category</option>
                    <option value="vegetable">Vegetable</option>
                    <option value="fruit">Fruit</option>
                    <option value="protein">Protein (Meat/Fish)</option>
                    <option value="dairy">Dairy</option>
                    <option value="grain">Grain/Rice/Pasta</option>
                    <option value="spice">Spice/Seasoning</option>
                    <option value="canned">Canned Goods</option>
                    <option value="frozen">Frozen</option>
                    <option value="beverage">Beverage</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label style="display: block; margin-bottom: 5px; font-weight: bold;">Expiry Date</label>
                  <input 
                    [(ngModel)]="manualFoodForm.expiry_date"
                    type="date" 
                    style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 4px;">
                </div>
              </div>

              <button 
                (click)="addManualFood()"
                [disabled]="addingManualFood || !manualFoodForm.ingredient_name"
                style="padding: 12px 24px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; width: 100%;">
                {{ addingManualFood ? '⏳ Adding...' : '✅ Add to Inventory' }}
              </button>

              @if (manualFoodStatus) {
                <div style="margin-top: 10px; padding: 10px; background: white; border-radius: 4px; text-align: center;">
                  {{ manualFoodStatus }}
                </div>
              }
            </div>
          }
        }
      </div>

      <hr style="margin: 30px 0;">

      <!-- View Inventory Section -->
      <div style="margin: 20px 0;">
        <h3>📦 Your Inventory</h3>
        @if (!isAuthenticated) {
          <p style="color: #ef4444;">⚠️ Please sign in to view inventory</p>
        }
        @if (isAuthenticated) {
          <button 
            (click)="loadInventory()" 
            [disabled]="loadingInventory"
            style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; margin-bottom: 15px;">
            {{ loadingInventory ? '⏳ Loading...' : '🔄 Refresh Inventory' }}
          </button>

          @if (loadingInventory) {
            <div style="padding: 20px; text-align: center;">Loading inventory...</div>
          } @else if (userInventory.length === 0) {
            <div style="padding: 20px; background: #f3f4f6; border-radius: 4px; text-align: center;">
              <p>No items in inventory yet. Add items manually or scan a receipt!</p>
            </div>
          } @else {
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px;">
              @for (item of userInventory; track item.id) {
                <div style="padding: 15px; background: white; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                  <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                    <strong style="color: #1f2937; font-size: 16px;">{{ item.ingredient_name }}</strong>
                    <button 
                      (click)="deleteInventoryItem(item.id)"
                      style="background: #ef4444; color: white; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 12px;">
                      🗑️
                    </button>
                  </div>
                  <div style="color: #6b7280; font-size: 14px;">
                    <p style="margin: 5px 0;">📊 {{ item.quantity }} {{ item.unit }}</p>
                    <p style="margin: 5px 0;">🏷️ {{ item.category || 'N/A' }}</p>
                    @if (item.expiry_date) {
                      <p style="margin: 5px 0; color: #f59e0b;">⏰ Expires: {{ item.expiry_date | date:'shortDate' }}</p>
                    }
                    <p style="margin: 5px 0; font-size: 12px;">
                      <span [style.color]="item.source === 'receipt' ? '#10b981' : '#8b5cf6'">
                        {{ item.source === 'receipt' ? '🧾 From Receipt' : '✍️ Manual Entry' }}
                      </span>
                    </p>
                  </div>
                </div>
              }
            </div>
          }
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

      <!-- View Receipts -->
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
  // Auth properties
  authStatus = 'Not authenticated';
  isAuthenticated = false;
  showEmailAuth = false;
  email = '';
  password = '';
  authLoading = false;
  authError = '';

  // Receipt upload properties
  selectedFile: File | null = null;
  uploadLoading = false;
  uploadStatus = 'No file selected';

  // Receipt list properties
  receipts: any[] = [];
  loadingReceipts = false;

  // Meal recommendation properties
  mealLoading = false;
  mealResults: any[] | null = null;

  // Expiry alert properties
  expiryLoading = false;
  expiryResults: any = null;

  // Manual food addition properties
  showManualFoodForm = false;
  manualFoodForm = {
    ingredient_name: '',
    quantity: 1,
    unit: 'pieces',
    category: '',
    expiry_date: ''
  };
  addingManualFood = false;
  manualFoodStatus = '';
  
  // Inventory display properties
  userInventory: any[] = [];
  loadingInventory = false;

  constructor(
    public supabase: SupabaseService,
    private receiptProcessor: ReceiptProcessorService,
    private receiptService: ReceiptService,
    private inventoryService: InventoryService
  ) {}

  ngOnInit() {
    this.supabase.user$.subscribe(user => {
      this.isAuthenticated = !!user;
      this.authStatus = user ? `✅ Signed in as ${user.email || 'Anonymous User'}` : '❌ Not authenticated';
    });
  }

  // ============================================
  // AUTH METHODS
  // ============================================

  async signInAnonymously() {
    this.authLoading = true;
    this.authError = '';
    try {
      const user = await this.supabase.signInAnonymously();
      if (user) {
        this.authStatus = '✅ Signed in anonymously';
        console.log('✅ Anonymous sign-in successful');
      }
    } catch (error: any) {
      this.authError = error.message;
      console.error('❌ Sign-in error:', error);
    } finally {
      this.authLoading = false;
    }
  }

  async signInWithEmail() {
    this.authLoading = true;
    this.authError = '';
    try {
      const { error } = await this.supabase.signIn(this.email, this.password);
      if (error) throw error;
      this.showEmailAuth = false;
    } catch (error: any) {
      this.authError = error.message;
    } finally {
      this.authLoading = false;
    }
  }

  async signUpWithEmail() {
    this.authLoading = true;
    this.authError = '';
    try {
      const { error } = await this.supabase.signUp(this.email, this.password);
      if (error) throw error;
      this.authError = '✅ Check your email for confirmation link!';
    } catch (error: any) {
      this.authError = error.message;
    } finally {
      this.authLoading = false;
    }
  }

  async signOut() {
    await this.supabase.signOut();
    this.authStatus = '❌ Signed out';
    this.receipts = [];
    this.userInventory = [];
  }

  // ============================================
  // RECEIPT UPLOAD METHODS
  // ============================================

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.uploadStatus = `📁 File selected: ${file.name}`;
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
      
      const receiptId = await this.receiptProcessor.processReceiptFull(this.selectedFile);
      
      this.uploadStatus = `✅ Receipt processed successfully! ID: ${receiptId}`;
      console.log('✅ Receipt processing complete:', receiptId);
      
      await this.loadReceipts();
      await this.loadInventory();
      
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
  // MANUAL FOOD ADDITION
  // ============================================

  toggleManualFoodForm() {
    this.showManualFoodForm = !this.showManualFoodForm;
    if (this.showManualFoodForm) {
      this.manualFoodForm = {
        ingredient_name: '',
        quantity: 1,
        unit: 'pieces',
        category: '',
        expiry_date: ''
      };
      this.manualFoodStatus = '';
    }
  }

  async addManualFood() {
    if (!this.manualFoodForm.ingredient_name.trim()) {
      this.manualFoodStatus = '❌ Please enter an ingredient name';
      return;
    }

    this.addingManualFood = true;
    this.manualFoodStatus = '⏳ Adding ingredient...';

    try {
      const session = await this.supabase.client.auth.getSession();
      if (!session.data.session) {
        await this.supabase.signInAnonymously();
      }

      await this.inventoryService.addManualIngredient({
        ingredient_name: this.manualFoodForm.ingredient_name.trim(),
        quantity: this.manualFoodForm.quantity,
        unit: this.manualFoodForm.unit,
        category: this.manualFoodForm.category || 'other',
        expiry_date: this.manualFoodForm.expiry_date || undefined,
        source: 'manual_entry',
        is_available: true
      });

      this.manualFoodStatus = '✅ Ingredient added successfully!';
      console.log('✅ Manual ingredient added:', this.manualFoodForm.ingredient_name);

      this.manualFoodForm = {
        ingredient_name: '',
        quantity: 1,
        unit: 'pieces',
        category: '',
        expiry_date: ''
      };

      await this.loadInventory();

      setTimeout(() => {
        this.showManualFoodForm = false;
      }, 2000);

    } catch (error: any) {
      this.manualFoodStatus = `❌ Error: ${error.message}`;
      console.error('❌ Failed to add manual ingredient:', error);
    } finally {
      this.addingManualFood = false;
    }
  }

  async loadInventory() {
    this.loadingInventory = true;
    try {
      this.userInventory = await this.inventoryService.getAvailableIngredients();
      console.log(`📦 Loaded ${this.userInventory.length} inventory items`);
    } catch (error: any) {
      console.error('❌ Error loading inventory:', error);
    } finally {
      this.loadingInventory = false;
    }
  }

  async deleteInventoryItem(itemId: string) {
    if (!confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      await this.inventoryService.updateIngredientQuantity(itemId, 0);
      await this.loadInventory();
      console.log('✅ Item deleted');
    } catch (error: any) {
      console.error('❌ Error deleting item:', error);
      alert(`Error: ${error.message}`);
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
      const { data, error } = await this.supabase.client.functions.invoke('meal-recommendation', {
        headers: {
          'x-hackathon-key': 'my-secret-demo-key'
        },
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