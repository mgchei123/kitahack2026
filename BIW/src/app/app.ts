import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
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
    <div class="font-sans text-gray-800 antialiased max-w-md mx-auto h-screen relative overflow-hidden bg-white shadow-2xl">
      
      @if (currentScreen === 'login') {
        <div class="bg-[#E8F5E9] min-h-screen p-6 flex flex-col justify-center relative">
          <div class="bg-white p-8 rounded-[2rem] shadow-sm border border-green-100 flex flex-col items-center">
            
            <h1 class="text-3xl font-bold text-center text-green-800 mb-2">BeforeItWastes</h1>
            <p class="text-center text-gray-500 mb-10 text-sm">Sync Your Fridge</p>

            <input type="email" placeholder="Email Address" class="w-full mb-5 p-4 text-base border border-gray-200 rounded-2xl bg-gray-50 outline-none focus:border-green-500 transition-colors" />
            <input type="password" placeholder="Password" class="w-full mb-10 p-4 text-base border border-gray-200 rounded-2xl bg-gray-50 outline-none focus:border-green-500 transition-colors" />

            <button 
              (click)="signInAnonymously()" 
              [disabled]="authLoading"
              class="w-full bg-[#1B8E2D] text-white py-4 rounded-2xl font-semibold text-lg shadow-sm active:scale-95 transition-transform disabled:opacity-50">
              {{ authLoading ? '⏳ Connecting...' : 'Sign In' }}
            </button>
            
            @if (authError) {
              <p class="text-red-500 text-sm mt-4">{{ authError }}</p>
            }
          </div>
        </div>
      }

      @if (currentScreen === 'inventory') {
        <div class="bg-[#F0F7FF] h-full overflow-y-auto p-5 pb-40">
          
          <div class="flex justify-between items-center mb-6 pt-2">
            <h1 class="text-2xl font-bold text-gray-800">Inventory</h1>
            <div class="flex gap-4 items-center text-gray-600">
              <span class="cursor-pointer p-2 bg-white rounded-full shadow-sm"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg></span>
              <span (click)="signOut()" class="cursor-pointer p-2 bg-white rounded-full shadow-sm text-red-500"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg></span>
            </div>
          </div>

          <div class="bg-[#D1F2D1] p-6 rounded-3xl mb-8 shadow-sm border border-green-200">
            <p class="text-green-800 font-medium text-sm mb-1">Value at Risk</p>
            <h2 class="text-5xl font-bold text-green-900 my-2">RM {{ calculateRiskValue() }}</h2>
            <p class="text-green-700 text-sm">at risk of waste this week</p>
          </div>

          <div class="flex justify-between items-center mb-4">
            <p class="text-lg font-semibold text-gray-800">Alerts</p>
            <button (click)="loadInventory()" class="text-sm text-[#2196F3] font-semibold">Refresh</button>
          </div>

          @if (loadingInventory) {
            <div class="text-center py-10 text-gray-500">Loading your fridge...</div>
          }

          @if (!loadingInventory && userInventory.length === 0) {
            <div class="text-center py-10 bg-white rounded-2xl border border-dashed border-gray-300">
              <p class="text-gray-500">Fridge is empty!</p>
              <p class="text-sm text-gray-400 mt-2">Tap the + button to add food.</p>
            </div>
          }

          <div class="space-y-3">
            @for (item of userInventory; track item.id) {
              <div class="bg-white p-4 rounded-2xl flex items-center justify-between shadow-sm border border-gray-100">
                <div class="flex items-center gap-4">
                  <div class="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-2xl border border-gray-100">
                    {{ getCategoryEmoji(item.category) }}
                  </div>
                  <div>
                    <p class="font-medium text-base text-gray-800 capitalize">{{ item.ingredient_name }}</p>
                    <p class="text-xs text-gray-500 mt-1">
                      Expire: {{ item.expiry_date ? (item.expiry_date | date:'dd/MM/yyyy') : 'Not set' }}
                    </p>
                  </div>
                </div>
                <div class="text-right flex flex-col items-end">
                  <div class="w-3 h-3 rounded-full mb-2" [ngClass]="getExpiryColorClass(item.expiry_date)"></div>
                  <p class="text-sm font-medium text-gray-600">RM {{ item.currency || '0.00' }}</p>
                  <button (click)="deleteInventoryItem(item.id)" class="text-red-400 mt-1 text-xs hover:underline">Remove</button>
                </div>
              </div>
            }
          </div>

          <button 
            (click)="currentScreen = 'recipe_list'" 
            class="fixed bottom-8 left-5 right-5 max-w-md mx-auto bg-[#1B8E2D] text-white py-4 rounded-2xl font-semibold text-lg shadow-md active:scale-95 transition-transform z-10">
            Suggest Recipe
          </button>

          <button 
            (click)="currentScreen = 'input'" 
            class="fixed bottom-28 right-6 bg-[#2196F3] text-white w-14 h-14 rounded-full shadow-md flex items-center justify-center border-2 border-white active:scale-95 transition-transform z-10">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
          </button>
        </div>
      }

      @if (currentScreen === 'input') {
        <div class="bg-[#E8F5E9] h-full p-6 flex flex-col relative">
          <button (click)="currentScreen = 'inventory'" class="text-gray-600 mb-8 w-fit p-2 active:scale-90 transition-transform bg-white rounded-full shadow-sm">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="m12 19-7-7 7-7M19 12H5" stroke-width="2"/></svg>
          </button>
          
          <input type="file" #fileInput (change)="onFileSelected($event)" accept="image/*" class="hidden">

          <div class="space-y-4">
            <button (click)="fileInput.click()" class="w-full bg-[#4CAF50] text-white p-5 rounded-2xl flex items-center gap-5 shadow-sm active:scale-95 transition-transform">
              <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><circle cx="12" cy="13" r="3" /></svg>
              <span class="text-xl font-medium">Scan Receipt</span>
            </button>
            <button class="w-full bg-[#4CAF50] text-white p-5 rounded-2xl flex items-center gap-5 shadow-sm active:scale-95 transition-transform">
              <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect width="10" height="20" x="7" y="2" rx="2" stroke-width="2"/><path stroke-linecap="round" stroke-width="2" d="M7 10h10M10 5v2M10 13v2"/></svg>
              <span class="text-xl font-medium">Snap Fridge</span>
            </button>

            @if (uploadLoading || selectedFile) {
              <div class="bg-white p-4 rounded-xl shadow-sm border border-green-200 mt-4">
                <p class="text-sm font-medium text-gray-700">{{ uploadStatus }}</p>
                @if (selectedFile && !uploadLoading) {
                  <button (click)="testReceiptUpload()" class="mt-3 w-full bg-[#ff9800] text-white py-2 rounded-lg font-bold shadow-sm">Confirm & Extract</button>
                }
                @if (uploadLoading) {
                  <div class="mt-3 h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div class="h-full bg-green-500 animate-pulse w-full"></div>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      }

      @if (currentScreen === 'recipe_list') {
        <div class="bg-[#F0F7FF] min-h-screen p-5 pb-32 overflow-y-auto">
          <button (click)="currentScreen = 'inventory'" class="text-gray-600 mb-4 w-fit p-2 active:scale-90 transition-transform bg-white rounded-full shadow-sm">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          
          <h1 class="text-2xl font-bold mb-6 text-gray-800">AI Recipe Matches</h1>

          <div class="bg-white rounded-3xl overflow-hidden shadow-sm mb-8 border border-gray-100 relative group">
            <img [src]="featuredRecipes[recipeIndex].img" alt="Meal" class="w-full h-56 object-cover transition-all duration-300" />
            
            <button (click)="prevRecipe()" class="absolute top-24 left-4 bg-white/90 w-10 h-10 flex items-center justify-center rounded-full text-green-800 shadow-sm active:scale-90 transition-transform">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 18l-6-6 6-6" /></svg>
            </button>
            <button (click)="nextRecipe()" class="absolute top-24 right-4 bg-white/90 w-10 h-10 flex items-center justify-center rounded-full text-green-800 shadow-sm active:scale-90 transition-transform">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 18l6-6-6-6" /></svg>
            </button>

            <div class="p-5">
              <div class="flex justify-between items-start">
                <h2 class="text-xl font-semibold text-gray-800">{{ featuredRecipes[recipeIndex].title }}</h2>
                <div class="flex gap-2 mt-2">
                  @for (recipe of featuredRecipes; track $index) {
                    <div class="w-2 h-2 rounded-full transition-colors" [ngClass]="$index === recipeIndex ? 'bg-green-600' : 'bg-gray-200'"></div>
                  }
                </div>
              </div>
              <p class="text-gray-600 text-sm mt-2">Needs: <span class="font-medium text-gray-800">{{ featuredRecipes[recipeIndex].use }}</span></p>
            </div>
          </div>

          <p class="text-lg font-semibold mb-4 text-gray-800">Other Matches</p>
          <div class="space-y-3">
            @for (dish of ['Salmon Sushi', 'Salmon Don', 'Salmon Sashimi']; track dish) {
              <div class="bg-white flex gap-4 items-center p-4 rounded-2xl border border-gray-100 shadow-sm">
                <div class="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-500 border border-gray-100">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" /></svg>
                </div>
                <div>
                  <p class="font-medium text-base text-gray-800">{{ dish }}</p>
                  <p class="text-xs text-gray-500 mt-1">Requires Rice</p>
                </div>
              </div>
            }
          </div>

          <button 
            (click)="currentScreen = 'cooking_steps'" 
            class="fixed bottom-8 left-5 right-5 max-w-md mx-auto bg-[#1B8E2D] text-white py-4 rounded-2xl font-semibold text-lg shadow-md active:scale-95 transition-transform z-10">
            Cook This Now
          </button>
        </div>
      }

      @if (currentScreen === 'cooking_steps') {
        <div class="bg-[#E8F5E9] min-h-screen p-5 pb-32 overflow-y-auto">
          <button (click)="currentScreen = 'recipe_list'" class="text-gray-600 mb-4 w-fit p-2 active:scale-90 transition-transform bg-white rounded-full shadow-sm">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>

          <h1 class="text-2xl font-bold mb-6 text-gray-800">Cook: {{ featuredRecipes[recipeIndex].cookTitle }}</h1>

          <img [src]="featuredRecipes[recipeIndex].img" alt="Recipe" class="w-full h-56 object-cover rounded-3xl shadow-sm mb-6" />

          <div class="space-y-4">
            <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex gap-4">
              <div class="w-14 h-14 bg-gray-50 rounded-xl flex items-center justify-center text-gray-600 shrink-0 border border-gray-100">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 2h2M12 16v-6M12 22a4 4 0 0 0 4-4V6a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v12a4 4 0 0 0 4 4ZM10 2h.01M14 2h.01" /></svg>
              </div>
              <div>
                <p class="font-semibold text-base text-gray-800">Step 1: Prep & Season</p>
                <p class="text-sm text-gray-600 mt-1">Pat the ingredients dry. Brush with olive oil and season generously.</p>
              </div>
            </div>
            
            <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex gap-4">
              <div class="w-14 h-14 bg-gray-50 rounded-xl flex items-center justify-center text-gray-600 shrink-0 border border-gray-100">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></svg>
              </div>
              <div>
                <p class="font-semibold text-base text-gray-800">Step 2: Cooking Process</p>
                <p class="text-sm text-gray-600 mt-1">Place on preheated heat source. Cook thoroughly according to standard food safety.</p>
              </div>
            </div>

            <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex gap-4">
              <div class="w-14 h-14 bg-gray-50 rounded-xl flex items-center justify-center text-gray-600 shrink-0 border border-gray-100">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9ZM12 3a9 9 0 0 1 9 9H3a9 9 0 0 1 9-9Z" /></svg>
              </div>
              <div>
                <p class="font-semibold text-base text-gray-800">Step 3: Rest & Serve</p>
                <p class="text-sm text-gray-600 mt-1">Remove from heat and let it rest for 5 minutes. This locks the juices inside.</p>
              </div>
            </div>
          </div>

          <div class="mt-8">
            <p class="text-lg font-semibold mb-4 text-gray-800">Ingredients Used</p>
            <div class="bg-white p-4 rounded-2xl flex items-center gap-4 border border-green-100 shadow-sm">
              <div class="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-700">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.46-3.44 6-7 6s-7.56-2.54-8.5-6ZM18 12v.01M11.52 17.11a12 12 0 1 0 0-10.22M2 9.06v5.88" /></svg>
              </div>
              <div>
                <p class="font-medium text-base text-gray-800">{{ featuredRecipes[recipeIndex].use }}</p>
                <p class="text-xs text-green-700 mt-1">From your fridge</p>
              </div>
            </div>
          </div>

          <button 
            (click)="currentScreen = 'inventory'" 
            class="fixed bottom-8 left-5 right-5 max-w-md mx-auto bg-[#1B8E2D] text-white py-4 rounded-2xl font-semibold text-lg shadow-md active:scale-95 transition-transform z-10">
            Done Cooking
          </button>
        </div>
      }
    </div>
  `
})
export class App implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef;

  // --- UI Routing State ---
  currentScreen = 'login'; 

  // --- Auth properties ---
  authStatus = 'Not authenticated';
  isAuthenticated = false;
  authLoading = false;
  authError = '';

  // --- Receipt upload properties ---
  selectedFile: File | null = null;
  uploadLoading = false;
  uploadStatus = 'No file selected';

  // --- REAL Inventory properties ---
  userInventory: any[] = [];
  loadingInventory = false;

  // --- MOCK Recipe properties (For flawless presentation) ---
  recipeIndex = 0;
  featuredRecipes = [
    { title: "Healthy Salmon Grill", use: "Salmon Fillet", img: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&q=80", cookTitle: "Grilled Salmon" },
    { title: "Classic Salmon Sushi", use: "Salmon Fillet, Rice, Nori", img: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&q=80", cookTitle: "Salmon Sushi" },
    { title: "Baked Salmon Platter", use: "Salmon Fillet, Asparagus", img: "https://images.unsplash.com/photo-1485921325833-c519f76c4927?w=800&q=80", cookTitle: "Baked Salmon" }
  ];

  constructor(
    public supabase: SupabaseService,
    private receiptProcessor: ReceiptProcessorService,
    private receiptService: ReceiptService,
    private inventoryService: InventoryService
  ) {}

  ngOnInit() {
    this.supabase.user$.subscribe(user => {
      this.isAuthenticated = !!user;
      if (user) {
        this.currentScreen = 'inventory'; 
        this.loadInventory();
      } else {
        this.currentScreen = 'login';
      }
    });
  }

  // ============================================
  // UI LOGIC & CALCULATIONS (Real Data connected to Database)
  // ============================================
  getCategoryEmoji(category: string): string {
    const cats: {[key: string]: string} = {
      'vegetable': '🥬', 'fruit': '🍎', 'protein': '🥩', 
      'dairy': '🥛', 'grain': '🍚', 'beverage': '🧃', 'other': '📦'
    };
    return cats[category?.toLowerCase()] || '🛒';
  }

  getExpiryColorClass(expiryDateString: string): string {
    if (!expiryDateString) return 'bg-gray-300'; 
    
    const expiry = new Date(expiryDateString);
    const today = new Date();
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 3600 * 24));

    if (diffDays <= 2) return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'; 
    if (diffDays <= 5) return 'bg-yellow-400'; 
    return 'bg-green-500'; 
  }

  calculateRiskValue(): string {
    let riskTotal = 0;
    const today = new Date();
    
    this.userInventory.forEach(item => {
      if (item.expiry_date) {
        const expiry = new Date(item.expiry_date);
        const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 3600 * 24));
        
        if (diffDays <= 5) {
          riskTotal += Number(item.currency || 0); 
        }
      }
    });
    
    return riskTotal.toFixed(2);
  }

  // Carousel Navigation Methods
  nextRecipe() {
    this.recipeIndex = (this.recipeIndex + 1) % this.featuredRecipes.length;
  }

  prevRecipe() {
    this.recipeIndex = (this.recipeIndex - 1 + this.featuredRecipes.length) % this.featuredRecipes.length;
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
        this.currentScreen = 'inventory';
        this.loadInventory();
      }
    } catch (error: any) {
      this.authError = error.message;
    } finally {
      this.authLoading = false;
    }
  }

  async signOut() {
    await this.supabase.signOut();
    this.currentScreen = 'login';
    this.userInventory = [];
  }

  // ============================================
  // OCR RECEIPT UPLOAD METHODS (REAL Supabase Edge Function)
  // ============================================
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.uploadStatus = `📁 Ready to extract: ${file.name}`;
    }
  }

  async testReceiptUpload() {
    if (!this.selectedFile) return;

    this.uploadLoading = true;
    this.uploadStatus = '⏳ Step 1/3: AI is analyzing image...';

    try {
      await this.receiptProcessor.processReceiptFull(this.selectedFile);
      this.uploadStatus = `✅ Success! Items extracted.`;
      
      await this.loadInventory();
      
      this.selectedFile = null;
      setTimeout(() => {
        this.currentScreen = 'inventory';
        this.uploadStatus = 'No file selected';
      }, 1500);
      
    } catch (error: any) {
      this.uploadStatus = `❌ AI Error: ${error.message}`;
    } finally {
      this.uploadLoading = false;
    }
  }

  // ============================================
  // INVENTORY METHODS (Real Data connected to Database)
  // ============================================
  async loadInventory() {
    this.loadingInventory = true;
    try {
      const session = await this.supabase.client.auth.getSession();
      if (!session.data.session) return; 

      this.userInventory = await this.inventoryService.getAvailableIngredients();
    } catch (error: any) {
      console.error('❌ Error loading inventory:', error);
    } finally {
      this.loadingInventory = false;
    }
  }

  async deleteInventoryItem(itemId: string) {
    if (!confirm('Remove this food from your fridge?')) return;
    try {
      await this.inventoryService.updateIngredientQuantity(itemId, 0);
      await this.loadInventory();
    } catch (error: any) {
      console.error('❌ Error deleting item:', error);
    }
  }
}