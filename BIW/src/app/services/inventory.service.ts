import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface InventoryItem {
  id?: string;
  user_id?: string;
  ingredient_name: string;
  quantity: number;
  unit: string;
  category?: string;
  expiry_date?: string;
  source: 'receipt' | 'manual_entry';
  receipt_id?: string;
  is_available: boolean;
  last_updated?: string;
  created_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  constructor(private supabase: SupabaseService) {}

  /**
   * Add ingredients from receipt to inventory
   */
  async addIngredientsFromReceipt(receiptId: string, cookableItems: any[]): Promise<void> {
    try {
      const userId = this.supabase.userId;
      if (!userId) throw new Error('User not authenticated');

      const inventoryItems = cookableItems.map(item => ({
        user_id: userId,
        ingredient_name: item.name,
        quantity: item.quantity || 1,
        unit: item.unit || 'pieces',
        category: item.category,
        expiry_date: item.expiry_date,
        source: 'receipt' as const,
        receipt_id: receiptId,
        is_available: true
      }));

      const { error } = await this.supabase.client
        .from('user_inventory')
        .insert(inventoryItems);

      if (error) throw error;
      console.log('✅ Added ingredients to inventory:', inventoryItems.length);
    } catch (error) {
      console.error('❌ Error adding ingredients to inventory:', error);
      throw error;
    }
  }

  /**
   * Get user's available ingredients
   */
  async getAvailableIngredients(): Promise<InventoryItem[]> {
    try {
      const userId = this.supabase.userId;
      if (!userId) throw new Error('User not authenticated');

      const { data, error } = await this.supabase.client
        .from('user_inventory')
        .select('*')
        .eq('user_id', userId)
        .eq('is_available', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as InventoryItem[];
    } catch (error) {
      console.error('❌ Error fetching inventory:', error);
      return [];
    }
  }

  /**
   * Update ingredient quantity
   */
  async updateIngredientQuantity(ingredientId: string, newQuantity: number): Promise<void> {
    try {
      const { error } = await this.supabase.client
        .from('user_inventory')
        .update({ 
          quantity: newQuantity,
          is_available: newQuantity > 0,
          last_updated: new Date().toISOString()
        })
        .eq('id', ingredientId);

      if (error) throw error;
      console.log('✅ Updated ingredient quantity');
    } catch (error) {
      console.error('❌ Error updating ingredient:', error);
      throw error;
    }
  }

  /**
   * Mark ingredients as used when cooking
   */
  async markIngredientsAsUsed(mealId: string, ingredientsUsed: any[]): Promise<void> {
    try {
      const userId = this.supabase.userId;
      if (!userId) throw new Error('User not authenticated');

      const { error } = await this.supabase.client
        .rpc('mark_ingredients_used', {
          p_user_id: userId,
          p_meal_id: mealId,
          p_ingredients_used: ingredientsUsed
        });

      if (error) throw error;
      console.log('✅ Marked ingredients as used');
    } catch (error) {
      console.error('❌ Error marking ingredients as used:', error);
      throw error;
    }
  }

  /**
   * Manually add ingredient
   */
  async addManualIngredient(ingredient: Omit<InventoryItem, 'id' | 'user_id' | 'created_at' | 'last_updated'>): Promise<void> {
    try {
      const userId = this.supabase.userId;
      if (!userId) throw new Error('User not authenticated');

      const { error } = await this.supabase.client
        .from('user_inventory')
        .insert([{
          ...ingredient,
          user_id: userId,
          source: 'manual_entry'
        }]);

      if (error) throw error;
      console.log('✅ Manually added ingredient');
    } catch (error) {
      console.error('❌ Error adding manual ingredient:', error);
      throw error;
    }
  }
}