import { Injectable } from '@angular/core';
import { GeminiService } from './gemini';
import { ReceiptService } from './receipt.service';
import { InventoryService } from './inventory.service';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class ReceiptProcessorService {
  
  // ⚙️ CONFIGURATION - Set to FALSE to use real AI endpoints
  private USE_MOCK_DATA = false; // 🔥 Changed to FALSE - using real AI now!
  
  // Supabase Edge Function URLs - computed as getters instead of properties
  private get OCR_ENDPOINT(): string {
    return `${this.supabase.getSupabaseUrl()}/functions/v1/ocr`;
  }
  
  private get PARSE_ENDPOINT(): string {
    return `${this.supabase.getSupabaseUrl()}/functions/v1/parse-receipt`;
  }
  
  private get CLASSIFY_ENDPOINT(): string {
    return `${this.supabase.getSupabaseUrl()}/functions/v1/classify-items`;
  }
  
  constructor(
    private gemini: GeminiService,
    private receiptService: ReceiptService,
    private inventoryService: InventoryService,
    private supabase: SupabaseService
  ) {}

  /**
   * Full pipeline: Upload → OCR → Parse → Classify → Save
   */
  async processReceiptFull(file: File): Promise<string> {
    let receiptId: string = '';
    
    try {
      // Step 1: Upload image
      console.log('📤 Step 1: Uploading image...');
      const { receiptId: id, imageUrl } = await this.receiptService.uploadReceipt(file, {
        processing_status: 'processing'
      });
      receiptId = id;

      // Step 2: Extract text with OCR
      console.log('🔍 Step 2: Extracting text from receipt...');
      const ocrText = await this.callOCRService(imageUrl);
      
      // Step 3: Parse receipt data
      console.log('🤖 Step 3: Parsing receipt data...');
      const parsedData = await this.parseReceiptWithAI(ocrText);
      console.log('✅ Parsed data:', parsedData);

      // Step 4: Classify items
      console.log('🏷️ Step 4: Classifying items...');
      const { cookable, nonCookable } = await this.classifyItems(parsedData.items);
      console.log(`✅ Classified: ${cookable.length} cookable, ${nonCookable.length} non-cookable`);

      // Step 5: Save results to database
      console.log('💾 Step 5: Saving to database...');
      await this.receiptService.saveAIProcessingResults(
        receiptId,
        parsedData.items,
        cookable,
        nonCookable
      );
      
      // Update receipt metadata
      await this.supabase.client
        .from('receipts')
        .update({
          store_name: parsedData.store_name,
          purchase_date: parsedData.purchase_date,
          total_amount: parsedData.total_amount,
          currency: parsedData.currency,
          processing_status: 'completed'
        })
        .eq('id', receiptId);

      // Step 6: Add cookable items to inventory with expiry prediction
      console.log('📦 Step 6: Adding to inventory...');
      if (cookable && cookable.length > 0) {
        await this.addToInventoryWithExpiry(receiptId, cookable, parsedData.purchase_date);
      }

      console.log('✅ Receipt processing complete!');
      return receiptId;

    } catch (error: any) {
      console.error('❌ Receipt processing failed:', error);
      
      if (receiptId) {
        await this.receiptService.updateReceiptStatus(
          receiptId, 
          'failed', 
          error.message
        );
      }
      
      throw error;
    }
  }

  /**
   * Call OCR service (Supabase Edge Function)
   */
  private async callOCRService(imageUrl: string): Promise<string> {
    if (this.USE_MOCK_DATA) {
      console.log('🎭 Using MOCK OCR');
      await this.delay(500);
      return this.getMockReceiptText();
    }
    
    try {
      const session = await this.supabase.client.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        throw new Error('Not authenticated');
      }

      console.log('📞 Calling OCR endpoint:', this.OCR_ENDPOINT);

      const response = await fetch(this.OCR_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ image_url: imageUrl })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `OCR API failed: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ OCR confidence:', data.confidence);
      return data.raw_text;
      
    } catch (error: any) {
      console.error('❌ OCR API error:', error);
      throw new Error(`Failed to extract text from receipt: ${error.message}`);
    }
  }

  /**
   * Parse receipt text to structured data
   */
  private async parseReceiptWithAI(ocrText: string): Promise<any> {
    if (this.USE_MOCK_DATA) {
      console.log('🎭 Using MOCK Parsing');
      await this.delay(500);
      return this.getMockParsedData();
    }

    try {
      const session = await this.supabase.client.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        throw new Error('Not authenticated');
      }

      console.log('📞 Calling Parse endpoint:', this.PARSE_ENDPOINT);

      const response = await fetch(this.PARSE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ocr_text: ocrText })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Parse API failed: ${response.status}`);
      }
      
      const parsedData = await response.json();
      
      // Validate items array
      if (!parsedData.items || !Array.isArray(parsedData.items) || parsedData.items.length === 0) {
        throw new Error('Parsed data has no items');
      }
      
      return parsedData;
      
    } catch (error: any) {
      console.error('❌ Parse API error:', error);
      throw new Error(`Failed to parse receipt: ${error.message}`);
    }
  }

  /**
   * Classify items as cookable or non-cookable
   */
  private async classifyItems(items: any[]): Promise<{ cookable: any[]; nonCookable: any[] }> {
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.warn('⚠️ No items to classify');
      return { cookable: [], nonCookable: [] };
    }

    if (this.USE_MOCK_DATA) {
      console.log('🎭 Using MOCK Classification');
      await this.delay(500);
      return this.getMockClassification(items);
    }

    try {
      const session = await this.supabase.client.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        throw new Error('Not authenticated');
      }

      console.log('📞 Calling Classification endpoint:', this.CLASSIFY_ENDPOINT);

      const response = await fetch(this.CLASSIFY_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ items })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Classification API failed: ${response.status}`);
      }
      
      const classificationData = await response.json();
      
      // Map classification results back to original items with their data
      const cookable = classificationData.cookable.map((classified: any) => {
        const originalItem = items.find(item => 
          this.normalizeItemName(item.name) === this.normalizeItemName(classified.name)
        );
        return {
          ...originalItem,
          category: classified.category,
          confidence: classified.confidence
        };
      });

      const nonCookable = classificationData.non_cookable.map((classified: any) => {
        const originalItem = items.find(item => 
          this.normalizeItemName(item.name) === this.normalizeItemName(classified.name)
        );
        return {
          ...originalItem,
          category: classified.category,
          confidence: classified.confidence
        };
      });
      
      return { cookable, nonCookable };
      
    } catch (error: any) {
      console.error('❌ Classification API error:', error);
      throw new Error(`Failed to classify items: ${error.message}`);
    }
  }

  /**
   * Add items to inventory with predicted expiry dates
   */
  private async addToInventoryWithExpiry(receiptId: string, cookableItems: any[], purchaseDate: string): Promise<void> {
    const itemsWithExpiry = cookableItems.map(item => ({
      ...item,
      expiry_date: this.predictExpiryDate(item.name, item.category, purchaseDate)
    }));

    await this.inventoryService.addIngredientsFromReceipt(receiptId, itemsWithExpiry);
  }

  /**
   * Predict expiry date based on ingredient category
   */
  private predictExpiryDate(itemName: string, category: string, purchaseDate: string): string {
    const purchase = new Date(purchaseDate);
    let daysUntilExpiry = 7; // default

    // Category-based expiry predictions
    const expiryMap: { [key: string]: number } = {
      'protein': 3,           // Chicken, meat, fish - 3 days
      'dairy': 7,             // Milk, cheese - 7 days
      'vegetable': 5,         // Fresh vegetables - 5 days
      'fruit': 7,             // Fruits - 7 days
      'grain': 180,           // Rice, pasta - 6 months
      'condiment': 365,       // Soy sauce, salt - 1 year
      'cooking_oil': 365,     // Oils - 1 year
      'other_food': 30        // Default - 1 month
    };

    daysUntilExpiry = expiryMap[category] || 30;

    // Adjust for specific items
    const itemLower = itemName.toLowerCase();
    if (itemLower.includes('egg')) daysUntilExpiry = 21;
    if (itemLower.includes('milk')) daysUntilExpiry = 5;
    if (itemLower.includes('chicken') || itemLower.includes('meat')) daysUntilExpiry = 3;
    if (itemLower.includes('fish')) daysUntilExpiry = 2;

    const expiryDate = new Date(purchase);
    expiryDate.setDate(expiryDate.getDate() + daysUntilExpiry);
    
    return expiryDate.toISOString().split('T')[0];
  }

  /**
   * Normalize item name for comparison (handle singular/plural)
   */
  private normalizeItemName(name: string): string {
    return name.toLowerCase()
      .replace(/s$/, '')  // Remove trailing 's'
      .replace(/es$/, '') // Remove trailing 'es'
      .trim();
  }

  // ============================================
  // MOCK DATA METHODS - Keep for fallback
  // ============================================

  private getMockReceiptText(): string {
    return `
AEON Supermarket
123 Jalan Main, KL
Date: 15/02/2026

Chicken Breast 500g   RM 15.50
Rice 2kg              RM 12.00
Onions 1kg            RM  3.50
Soy Sauce             RM  4.20
Garlic 200g           RM  2.50
Cooking Oil 1L        RM  8.00
Detergent             RM  8.90
Shampoo               RM  9.50
Eggs (10pcs)          RM  6.40

TOTAL:                RM 75.00
    `;
  }

  private getMockParsedData(): any {
    return {
      store_name: 'AEON Supermarket',
      purchase_date: new Date().toISOString().split('T')[0],
      total_amount: 75.00,
      currency: 'MYR',
      items: [
        { name: 'Chicken Breast', quantity: 500, unit: 'grams', price: 15.50 },
        { name: 'Rice', quantity: 2, unit: 'kg', price: 12.00 },
        { name: 'Onion', quantity: 1, unit: 'kg', price: 3.50 },
        { name: 'Soy Sauce', quantity: 1, unit: 'bottle', price: 4.20 },
        { name: 'Garlic', quantity: 200, unit: 'grams', price: 2.50 },
        { name: 'Cooking Oil', quantity: 1, unit: 'liter', price: 8.00 },
        { name: 'Detergent', quantity: 1, unit: 'bottle', price: 8.90 },
        { name: 'Shampoo', quantity: 1, unit: 'bottle', price: 9.50 },
        { name: 'Egg', quantity: 10, unit: 'pieces', price: 6.40 }
      ]
    };
  }

  private getMockClassification(items: any[]): { cookable: any[]; nonCookable: any[] } {
    const cookableKeywords = ['chicken', 'rice', 'onion', 'egg', 'sauce', 'oil', 'vegetable', 'meat', 'fish', 'garlic', 'ginger', 'cooking'];
    const nonCookableKeywords = ['detergent', 'shampoo', 'soap', 'tissue', 'cleaner', 'toothpaste'];
    
    const cookable: any[] = [];
    const nonCookable: any[] = [];
    
    items.forEach(item => {
      if (!item || !item.name) return;
      
      const name = item.name.toLowerCase();
      const isNonCookable = nonCookableKeywords.some(keyword => name.includes(keyword));
      
      if (isNonCookable) {
        nonCookable.push({ ...item, category: 'household', confidence: 0.95 });
      } else {
        cookable.push({ ...item, category: this.guessCategory(name), confidence: 0.90 });
      }
    });
    
    return { cookable, nonCookable };
  }

  private guessCategory(name: string): string {
    if (name.includes('chicken') || name.includes('meat') || name.includes('fish') || name.includes('egg')) return 'protein';
    if (name.includes('rice') || name.includes('pasta') || name.includes('bread')) return 'grain';
    if (name.includes('onion') || name.includes('carrot') || name.includes('vegetable') || name.includes('garlic')) return 'vegetable';
    if (name.includes('sauce') || name.includes('soy')) return 'condiment';
    if (name.includes('oil')) return 'cooking_oil';
    return 'other_food';
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}