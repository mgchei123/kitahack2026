import { Injectable } from '@angular/core';
import { GeminiService } from './gemini';
import { ReceiptService } from './receipt.service';
import { InventoryService } from './inventory.service';
import { SupabaseService } from './supabase.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReceiptProcessorService {
  
  private USE_MOCK_DATA = false;
  
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

  async processReceiptFull(file: File): Promise<string> {
    let receiptId: string = '';
    
    try {
      console.log('📤 Step 1: Uploading image...');
      const { receiptId: id, imageUrl } = await this.receiptService.uploadReceipt(file, {
        processing_status: 'processing'
      });
      receiptId = id;

      console.log('🔍 Step 2: Extracting text from receipt...');
      const ocrText = await this.callOCRService(imageUrl);
      
      console.log('🤖 Step 3: Parsing receipt data...');
      const parsedData = await this.parseReceiptWithAI(ocrText);
      console.log('✅ Parsed data:', parsedData);

      console.log('🏷️ Step 4: Classifying items...');
      const { cookable, nonCookable } = await this.classifyItems(parsedData.items);
      console.log(`✅ Classified: ${cookable.length} cookable, ${nonCookable.length} non-cookable`);

      console.log('💾 Step 5: Saving to database...');
      await this.receiptService.saveAIProcessingResults(
        receiptId,
        parsedData.items,
        cookable,
        nonCookable
      );
      
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
   * ✅ FIXED: Call OCR service with both Authorization AND apikey headers
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
        throw new Error('Not authenticated - please sign in');
      }

      // ✅ DEBUG: Log what we're sending
      console.log('📞 Calling OCR endpoint:', this.OCR_ENDPOINT);
      console.log('🔑 Token exists:', !!token);
      console.log('🔑 Anon key exists:', !!environment.supabase?.anonKey);
      console.log('🔑 First 20 chars of anon key:', environment.supabase?.anonKey?.substring(0, 20));

      const response = await fetch(this.OCR_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': environment.supabase.anonKey  // ⬅️ THIS IS THE KEY FIX!
        },
        body: JSON.stringify({ image_url: imageUrl })
      });
      
      console.log('📡 OCR Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ OCR Error Response:', errorData);
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
   * ✅ FIXED: Parse receipt with both Authorization AND apikey headers
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
        throw new Error('Not authenticated - please sign in');
      }

      console.log('📞 Calling Parse endpoint:', this.PARSE_ENDPOINT);

      const response = await fetch(this.PARSE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': environment.supabase.anonKey  // ⬹️ THIS IS THE KEY FIX!
        },
        body: JSON.stringify({ ocr_text: ocrText })
      });
      
      console.log('📡 Parse Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ Parse Error Response:', errorData);
        throw new Error(errorData.error || `Parse API failed: ${response.status}`);
      }
      
      const parsedData = await response.json();
      
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
   * ✅ FIXED: Classify items with both Authorization AND apikey headers
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
        throw new Error('Not authenticated - please sign in');
      }

      console.log('📞 Calling Classification endpoint:', this.CLASSIFY_ENDPOINT);

      const response = await fetch(this.CLASSIFY_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': environment.supabase.anonKey  // ⬅️ THIS IS THE KEY FIX!
        },
        body: JSON.stringify({ items })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Classification API failed: ${response.status}`);
      }
      
      const classificationData = await response.json();
      
      const cookable = classificationData.cookable.map((classified: any) => {
        const originalItem = items.find(item => 
          this.normalizeItemName(item.name) === this.normalizeItemName(classified.name)
        );

        // Skip if original item not found
        if (!originalItem) {
          console.warn('⚠️ Could not find original item for:', classified.name);
          return null;
        }

        return {
          ...originalItem,
          category: classified.category,
          confidence: classified.confidence
        };
      }).filter((item: any) => item !== null);

      const nonCookable = classificationData.non_cookable.map((classified: any) => {
        const originalItem = items.find(item => 
          this.normalizeItemName(item.name) === this.normalizeItemName(classified.name)
        );
        // Skip if original item not found
        if (!originalItem) {
          console.warn('⚠️ Could not find original item for:', classified.name);
          return null;
        }
        
        return {
          ...originalItem,
          category: classified.category,
          confidence: classified.confidence
        };
      }).filter((item: any) => item !== null);
      
      return { cookable, nonCookable };
      
    } catch (error: any) {
      console.error('❌ Classification API error:', error);
      throw new Error(`Failed to classify items: ${error.message}`);
    }
  }

  private async addToInventoryWithExpiry(receiptId: string, cookableItems: any[], purchaseDate: string): Promise<void> {
    const itemsWithExpiry = cookableItems.map(item => ({
      ...item,
      expiry_date: this.predictExpiryDate(item.name, item.category, purchaseDate)
    }));

    await this.inventoryService.addIngredientsFromReceipt(receiptId, itemsWithExpiry);
  }

  private predictExpiryDate(itemName: string, category: string, purchaseDate: string): string {
    const purchase = new Date(purchaseDate);
    let daysUntilExpiry = 7;

      // Add null/undefined check
  if (!itemName) {
    console.warn('⚠️ Missing item name, using default expiry');
    const expiryDate = new Date(purchase);
    expiryDate.setDate(expiryDate.getDate() + 30);
    return expiryDate.toISOString().split('T')[0];
  }

    const expiryMap: { [key: string]: number } = {
      'protein': 3,
      'dairy': 7,
      'vegetable': 5,
      'fruit': 7,
      'grain': 180,
      'condiment': 365,
      'cooking_oil': 365,
      'other_food': 30
    };

    daysUntilExpiry = expiryMap[category] || 30;

    const itemLower = itemName.toLowerCase();
    if (itemLower.includes('egg')) daysUntilExpiry = 21;
    if (itemLower.includes('milk')) daysUntilExpiry = 5;
    if (itemLower.includes('chicken') || itemLower.includes('meat')) daysUntilExpiry = 3;
    if (itemLower.includes('fish')) daysUntilExpiry = 2;

    const expiryDate = new Date(purchase);
    expiryDate.setDate(expiryDate.getDate() + daysUntilExpiry);
    
    return expiryDate.toISOString().split('T')[0];
  }

  private normalizeItemName(name: string): string {
    return name.trim().toLowerCase().replace(/s$/, '');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getMockReceiptText(): string {
    return `AEON SUPERMARKET
Receipt No: 12345
Date: 2024-01-15

Tomato 500g        RM 3.50
Onion 1kg          RM 2.80
Chicken Breast     RM 12.00
Milk 1L            RM 5.50

TOTAL:             RM 23.80`;
  }

  private getMockParsedData(): any {
    return {
      store_name: "AEON",
      purchase_date: "2024-01-15",
      total_amount: 23.80,
      currency: "MYR",
      items: [
        { name: "Tomato", quantity: 500, unit: "g", price: 3.50 },
        { name: "Onion", quantity: 1, unit: "kg", price: 2.80 },
        { name: "Chicken Breast", quantity: 1, unit: "pcs", price: 12.00 },
        { name: "Milk", quantity: 1, unit: "L", price: 5.50 }
      ]
    };
  }

  private getMockClassification(items: any[]): { cookable: any[]; nonCookable: any[] } {
    return {
      cookable: items.map(item => ({
        ...item,
        category: 'vegetable',
        confidence: 0.95
      })),
      nonCookable: []
    };
  }
}