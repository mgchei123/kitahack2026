import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface ReceiptItem {
  name: string;
  price: number;
  quantity: number;
  category?: string;
  expiryDays?: number;
}

export interface Receipt {
  id?: string;
  user_id?: string;
  image_url: string;
  store_name?: string;
  purchase_date: string;
  total_amount: number;
  currency: string;
  items: ReceiptItem[];
  processed: boolean;
  created_at?: string;
  // New fields from updated schema
  items_raw?: any;
  cookable_items?: any[];
  non_cookable_items?: any[];
  processing_status?: 'pending' | 'processing' | 'ocr_completed' | 'completed' | 'failed';
  error_message?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReceiptService {
  constructor(private supabase: SupabaseService) {}

  /**
   * Upload receipt image to Supabase Storage
   */
  async uploadReceiptImage(file: File): Promise<string> {
    try {
      const userId = this.supabase.userId;
      if (!userId) throw new Error('User not authenticated');

      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const filePath = `${userId}/${fileName}`;

      const { data, error } = await this.supabase.client.storage
        .from('receipts')
        .upload(filePath, file);

      if (error) throw error;

      // Get public URL
      const { data: urlData } = this.supabase.client.storage
        .from('receipts')
        .getPublicUrl(filePath);

      console.log('✅ Receipt image uploaded:', urlData.publicUrl);
      return urlData.publicUrl;
    } catch (error) {
      console.error('❌ Error uploading receipt image:', error);
      throw new Error('Failed to upload receipt image');
    }
  }

  /**
   * Save receipt data to Supabase
   */
  async saveReceipt(receipt: Omit<Receipt, 'id' | 'user_id' | 'created_at'>): Promise<string> {
    try {
      const userId = this.supabase.userId;
      if (!userId) throw new Error('User not authenticated');

      const { data, error } = await this.supabase.client
        .from('receipts')
        .insert([{
          ...receipt,
          user_id: userId
        }])
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Receipt saved with ID:', data.id);
      return data.id;
    } catch (error) {
      console.error('❌ Error saving receipt:', error);
      throw new Error('Failed to save receipt');
    }
  }

  /**
   * Complete upload: Image + Data
   */
  async uploadReceipt(file: File, receiptData: Partial<Receipt>): Promise<{ receiptId: string; imageUrl: string }> {
    try {
      // Step 1: Upload image
      const imageUrl = await this.uploadReceiptImage(file);

      // Step 2: Save receipt data
      const receipt: Omit<Receipt, 'id' | 'user_id' | 'created_at'> = {
        image_url: imageUrl,
        store_name: receiptData.store_name || 'Unknown Store',
        purchase_date: receiptData.purchase_date || new Date().toISOString(),
        total_amount: receiptData.total_amount || 0,
        items: receiptData.items || [],
        currency: receiptData.currency || 'MYR',
        processed: false,
        processing_status: 'pending'  // Set initial status
      };

      const receiptId = await this.saveReceipt(receipt);

      return { receiptId, imageUrl };
    } catch (error) {
      console.error('❌ Error in uploadReceipt:', error);
      throw error;
    }
  }

  /**
   * Get all receipts for current user
   */
  async getUserReceipts(): Promise<Receipt[]> {
    try {
      const userId = this.supabase.userId;
      if (!userId) throw new Error('User not authenticated');

      const { data, error } = await this.supabase.client
        .from('receipts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log(`✅ Found ${data.length} receipts`);
      return data as Receipt[];
    } catch (error) {
      console.error('❌ Error fetching receipts:', error);
      return [];
    }
  }

  /**
   * Get single receipt by ID
   */
  async getReceiptById(receiptId: string): Promise<Receipt | null> {
    try {
      const { data, error } = await this.supabase.client
        .from('receipts')
        .select('*')
        .eq('id', receiptId)
        .single();

      if (error) throw error;
      return data as Receipt;
    } catch (error) {
      console.error('❌ Error fetching receipt:', error);
      return null;
    }
  }

  /**
   * Get unprocessed receipts (for AI processing queue)
   */
  async getUnprocessedReceipts(limit: number = 10): Promise<Receipt[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('receipts')
        .select('*')
        .eq('processed', false)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      
      console.log(`✅ Found ${data.length} unprocessed receipts`);
      return data as Receipt[];
    } catch (error) {
      console.error('❌ Error fetching unprocessed receipts:', error);
      return [];
    }
  }

  /**
   * Update receipt (e.g., after AI processing)
   */
  async updateReceipt(receiptId: string, updates: Partial<Receipt>): Promise<void> {
    try {
      const { error } = await this.supabase.client
        .from('receipts')
        .update(updates)
        .eq('id', receiptId);

      if (error) throw error;
      console.log('✅ Receipt updated:', receiptId);
    } catch (error) {
      console.error('❌ Error updating receipt:', error);
      throw new Error('Failed to update receipt');
    }
  }

  /**
   * Update receipt processing status
   */
  async updateReceiptStatus(
    receiptId: string, 
    status: 'pending' | 'processing' | 'ocr_completed' | 'completed' | 'failed',
    errorMessage?: string
  ): Promise<void> {
    try {
      const updateData: any = { 
        processing_status: status,
        updated_at: new Date().toISOString()
      };
      
      if (errorMessage) {
        updateData.error_message = errorMessage;
      }

      const { error } = await this.supabase.client
        .from('receipts')
        .update(updateData)
        .eq('id', receiptId);

      if (error) throw error;
      console.log(`✅ Receipt ${receiptId} status: ${status}`);
    } catch (error) {
      console.error('❌ Error updating receipt status:', error);
      throw error;
    }
  }

  /**
   * Save OCR result to receipts table
   */
  async saveOCRResult(
    receiptId: string,
    rawText: string,
    confidence: number,
    model: string = 'gemini-2.5-flash'
  ): Promise<void> {
    try {
      const { error } = await this.supabase.client
        .from('receipts')
        .update({
          items_raw: {
            raw_text: rawText,
            confidence: confidence,
            model: model
          },
          processing_status: 'ocr_completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', receiptId);

      if (error) throw error;
      console.log('✅ OCR result saved to database');
    } catch (error) {
      console.error('❌ Error saving OCR result:', error);
      throw error;
    }
  }

  /**
   * Save AI processing results
   */
  async saveAIProcessingResults(
    receiptId: string,
    itemsRaw: any[],
    cookableItems: any[],
    nonCookableItems: any[]
  ): Promise<void> {
    try {
      const { error } = await this.supabase.client
        .from('receipts')
        .update({
          items_raw: itemsRaw,
          cookable_items: cookableItems,
          non_cookable_items: nonCookableItems,
          processing_status: 'completed',
          processed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', receiptId);

      if (error) throw error;
      console.log('✅ AI processing results saved');
    } catch (error) {
      console.error('❌ Error saving AI results:', error);
      throw error;
    }
  }

  /**
   * Delete receipt (and its image)
   */
  async deleteReceipt(receiptId: string): Promise<void> {
    try {
      const receipt = await this.getReceiptById(receiptId);
      if (!receipt) return;

      // Delete from storage
      const urlParts = receipt.image_url.split('/receipts/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await this.supabase.client.storage
          .from('receipts')
          .remove([filePath]);
      }

      // Delete from database
      const { error } = await this.supabase.client
        .from('receipts')
        .delete()
        .eq('id', receiptId);

      if (error) throw error;
      console.log('✅ Receipt deleted:', receiptId);
    } catch (error) {
      console.error('❌ Error deleting receipt:', error);
      throw new Error('Failed to delete receipt');
    }
  }
}