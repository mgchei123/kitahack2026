import { Injectable } from '@angular/core';
import { GeminiService } from './gemini';
import { ReceiptService } from './receipt.service';
import { InventoryService } from './inventory.service';

@Injectable({
  providedIn: 'root'
})
export class ReceiptProcessorService {
  constructor(
    private gemini: GeminiService,
    private receiptService: ReceiptService,
    private inventoryService: InventoryService
  ) {}

  /**
   * Full pipeline: Upload → OCR → Classify → Save
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

      // Step 2: Extract text with OCR (AI Engineer's job - you just call their API)
      console.log('🔍 Step 2: Extracting text from receipt...');
      const ocrText = await this.callOCRService(imageUrl);
      
      // Step 3: Parse receipt data with AI
      console.log('🤖 Step 3: Parsing receipt data...');
      const parsedData = await this.parseReceiptWithAI(ocrText);

      // Step 4: Classify items (AI Engineer provides this)
      console.log('🏷️ Step 4: Classifying items...');
      const { cookable, nonCookable } = await this.classifyItems(parsedData.items);

      // Step 5: Save results to database
      console.log('💾 Step 5: Saving to database...');
      await this.receiptService.saveAIProcessingResults(
        receiptId,
        parsedData.items,
        cookable,
        nonCookable
      );

      // Step 6: Add cookable items to inventory
      console.log('📦 Step 6: Adding to inventory...');
      await this.inventoryService.addIngredientsFromReceipt(receiptId, cookable);

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
   * Call OCR service (AI Engineer implements this endpoint)
   * TODO: Replace with actual AI Engineer's API
   */
  private async callOCRService(imageUrl: string): Promise<string> {
    // This is where AI Engineer's OCR API gets called
    // For now, using Gemini Vision as placeholder
    const prompt = `Extract ALL text from this receipt image. Return the raw text exactly as it appears.`;
    
    // TODO: Replace with actual OCR endpoint
    // const response = await fetch('YOUR_AI_ENGINEER_OCR_ENDPOINT', {
    //   method: 'POST',
    //   body: JSON.stringify({ image_url: imageUrl })
    // });
    
    return await this.gemini.generateText(prompt);
  }

  /**
   * Parse receipt text to structured data
   */
  private async parseReceiptWithAI(ocrText: string): Promise<any> {
    const prompt = `
Parse this receipt text and extract:
- Store name
- Purchase date
- Total amount
- List of all items with prices

Receipt text:
${ocrText}

Return JSON format:
{
  "store_name": "...",
  "purchase_date": "YYYY-MM-DD",
  "total_amount": 0.00,
  "currency": "MYR",
  "items": [
    {"name": "...", "price": 0.00, "quantity": 1}
  ]
}
`;

    const response = await this.gemini.generateText(prompt);
    
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    throw new Error('Failed to parse receipt data');
  }

  /**
   * Classify items as cookable or non-cookable
   * AI Engineer should provide a trained model for this
   */
  private async classifyItems(items: any[]): Promise<{ cookable: any[]; nonCookable: any[] }> {
    // TODO: Replace with AI Engineer's classification endpoint
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
    
    throw new Error('Failed to classify items');
  }
}