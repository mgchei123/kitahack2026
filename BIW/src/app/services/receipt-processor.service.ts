import { Injectable } from '@angular/core';
import { GeminiService } from './gemini';
import { ReceiptService } from './receipt.service';
import { InventoryService } from './inventory.service';

@Injectable({
  providedIn: 'root'
})
export class ReceiptProcessorService {
  
  // ⚙️ CONFIGURATION - Change this to switch between mock and real AI
  private USE_MOCK_DATA = true; // Set to FALSE when AI Engineer's endpoints are ready
  
  constructor(
    private gemini: GeminiService,
    private receiptService: ReceiptService,
    private inventoryService: InventoryService
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
      await this.receiptService.updateReceiptStatus(receiptId, 'completed');

      // Step 6: Add cookable items to inventory
      console.log('📦 Step 6: Adding to inventory...');
      if (cookable && cookable.length > 0) {
        await this.inventoryService.addIngredientsFromReceipt(receiptId, cookable);
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
   * Call OCR service
   * 🔄 CHANGE THIS: When AI Engineer provides OCR endpoint, update the real implementation
   */
  private async callOCRService(imageUrl: string): Promise<string> {
    if (this.USE_MOCK_DATA) {
      // MOCK DATA - Using hardcoded receipt text
      console.log('🎭 Using MOCK OCR');
      await this.delay(500);
      return this.getMockReceiptText();
    }
    
    // 🔄 REAL IMPLEMENTATION - Uncomment and update when AI Engineer provides endpoint
    /*
    try {
      const response = await fetch('YOUR_AI_ENGINEER_OCR_ENDPOINT', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: imageUrl })
      });
      
      if (!response.ok) throw new Error('OCR API failed');
      
      const data = await response.json();
      return data.raw_text;
    } catch (error) {
      console.error('OCR API error:', error);
      throw new Error('Failed to extract text from receipt');
    }
    */
    
    // Fallback to Gemini (temporary)
    const prompt = `Extract ALL text from this receipt image. Return the raw text exactly as it appears.`;
    return await this.gemini.generateText(prompt);
  }

  /**
   * Parse receipt text to structured data
   * 🔄 CHANGE THIS: When AI Engineer provides parsing endpoint, update the real implementation
   */
  private async parseReceiptWithAI(ocrText: string): Promise<any> {
    if (this.USE_MOCK_DATA) {
      // MOCK DATA - Using hardcoded parsed data
      console.log('🎭 Using MOCK Parsing');
      await this.delay(500);
      return this.getMockParsedData();
    }

    // 🔄 REAL IMPLEMENTATION - Using Gemini or AI Engineer's endpoint
    try {
      const prompt = `
Parse this receipt text and extract structured data. Return ONLY valid JSON, no markdown formatting.

Receipt text:
${ocrText}

Return this exact JSON structure:
{
  "store_name": "store name here",
  "purchase_date": "YYYY-MM-DD",
  "total_amount": 0.00,
  "currency": "MYR",
  "items": [
    {"name": "item name", "quantity": 1, "unit": "unit", "price": 0.00}
  ]
}
`;

      const response = await this.gemini.generateText(prompt);
      console.log('🤖 Gemini parsing response:', response);
      
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Validate that items array exists
        if (!parsed.items || !Array.isArray(parsed.items)) {
          console.warn('⚠️ Parsed data missing items array, using fallback');
          return this.getMockParsedData();
        }
        
        return parsed;
      }
      
      throw new Error('No JSON found in response');
      
    } catch (error) {
      console.error('❌ Parsing failed, using fallback data:', error);
      return this.getMockParsedData();
    }
  }

  /**
   * Classify items as cookable or non-cookable
   * 🔄 CHANGE THIS: When AI Engineer provides classification endpoint, update the real implementation
   */
  private async classifyItems(items: any[]): Promise<{ cookable: any[]; nonCookable: any[] }> {
    // Safety check
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.warn('⚠️ No items to classify');
      return { cookable: [], nonCookable: [] };
    }

    if (this.USE_MOCK_DATA) {
      // MOCK DATA - Using keyword-based classification
      console.log('🎭 Using MOCK Classification');
      await this.delay(500);
      return this.getMockClassification(items);
    }

    // 🔄 REAL IMPLEMENTATION - Uncomment when AI Engineer provides endpoint
    /*
    try {
      const response = await fetch('YOUR_AI_ENGINEER_CLASSIFICATION_ENDPOINT', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          items: items.map(item => item.name) 
        })
      });
      
      if (!response.ok) throw new Error('Classification API failed');
      
      const data = await response.json();
      
      return {
        cookable: items.filter(item => 
          data.cookable.some((c: any) => c.name === item.name)
        ).map(item => ({
          ...item,
          category: data.cookable.find((c: any) => c.name === item.name)?.category || 'other',
          confidence: data.cookable.find((c: any) => c.name === item.name)?.confidence || 0.5
        })),
        nonCookable: items.filter(item => 
          data.non_cookable.some((nc: any) => nc.name === item.name)
        ).map(item => ({
          ...item,
          category: data.non_cookable.find((nc: any) => nc.name === item.name)?.category || 'other',
          confidence: data.non_cookable.find((nc: any) => nc.name === item.name)?.confidence || 0.5
        }))
      };
    } catch (error) {
      console.error('Classification API error:', error);
      return this.getMockClassification(items);
    }
    */

    // Fallback to Gemini (temporary)
    try {
      const prompt = `
Classify each item as either "cookable" (food/ingredients) or "non-cookable" (toiletries, household items, etc.).

Items:
${items.map(item => `- ${item.name}`).join('\n')}

Return JSON:
{
  "cookable": ["item1", "item2"],
  "non_cookable": ["item3", "item4"]
}
`;

      const response = await this.gemini.generateText(prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const classified = JSON.parse(jsonMatch[0]);
        
        return {
          cookable: items.filter(item => classified.cookable.includes(item.name)),
          nonCookable: items.filter(item => classified.non_cookable.includes(item.name))
        };
      }
      
      return this.getMockClassification(items);
      
    } catch (error) {
      console.error('❌ Classification failed, using fallback:', error);
      return this.getMockClassification(items);
    }
  }

  // ============================================
  // MOCK DATA METHODS - Delete these when ready
  // ============================================

  /**
   * 🗑️ DELETE THIS: Mock OCR text
   */
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

  /**
   * 🗑️ DELETE THIS: Mock parsed data
   */
  private getMockParsedData(): any {
    return {
      store_name: 'AEON Supermarket',
      purchase_date: new Date().toISOString().split('T')[0],
      total_amount: 75.00,
      currency: 'MYR',
      items: [
        { name: 'Chicken Breast', quantity: 500, unit: 'grams', price: 15.50 },
        { name: 'Rice', quantity: 2, unit: 'kg', price: 12.00 },
        { name: 'Onions', quantity: 1, unit: 'kg', price: 3.50 },
        { name: 'Soy Sauce', quantity: 1, unit: 'bottle', price: 4.20 },
        { name: 'Garlic', quantity: 200, unit: 'grams', price: 2.50 },
        { name: 'Cooking Oil', quantity: 1, unit: 'liter', price: 8.00 },
        { name: 'Detergent', quantity: 1, unit: 'bottle', price: 8.90 },
        { name: 'Shampoo', quantity: 1, unit: 'bottle', price: 9.50 },
        { name: 'Eggs', quantity: 10, unit: 'pieces', price: 6.40 }
      ]
    };
  }

  /**
   * 🗑️ DELETE THIS: Mock classification
   */
  private getMockClassification(items: any[]): { cookable: any[]; nonCookable: any[] } {
    const cookableKeywords = ['chicken', 'rice', 'onion', 'egg', 'sauce', 'oil', 'vegetable', 'meat', 'fish', 'garlic', 'ginger', 'cooking'];
    const nonCookableKeywords = ['detergent', 'shampoo', 'soap', 'tissue', 'cleaner', 'toothpaste', 'shampoo'];
    
    const cookable: any[] = [];
    const nonCookable: any[] = [];
    
    items.forEach(item => {
      if (!item || !item.name) {
        console.warn('⚠️ Skipping invalid item:', item);
        return;
      }
      
      const name = item.name.toLowerCase();
      const isNonCookable = nonCookableKeywords.some(keyword => name.includes(keyword));
      
      if (isNonCookable) {
        nonCookable.push({
          ...item,
          category: 'household',
          confidence: 0.95
        });
      } else {
        cookable.push({
          ...item,
          category: this.guessCategory(name),
          confidence: cookableKeywords.some(k => name.includes(k)) ? 0.90 : 0.70
        });
      }
    });
    
    return { cookable, nonCookable };
  }

  /**
   * 🗑️ DELETE THIS: Guess ingredient category
   */
  private guessCategory(name: string): string {
    if (name.includes('chicken') || name.includes('meat') || name.includes('fish')) return 'protein';
    if (name.includes('rice') || name.includes('pasta') || name.includes('bread')) return 'grain';
    if (name.includes('onion') || name.includes('carrot') || name.includes('vegetable') || name.includes('garlic')) return 'vegetable';
    if (name.includes('sauce') || name.includes('soy')) return 'condiment';
    if (name.includes('egg')) return 'protein';
    if (name.includes('oil')) return 'cooking_oil';
    return 'other';
  }

  /**
   * 🗑️ DELETE THIS: Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}