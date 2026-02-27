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

      const inventoryItems = cookableItems
        .filter(item => item && item.name) // Filter out items without names
        .map(item => ({
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

      if (inventoryItems.length === 0) {
        console.warn('⚠️ No valid items to add to inventory');
        return;
      }

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

  /**
   * Consolidate duplicate inventory items
   * Combines items with same name and unit into single entries
   */
  async consolidateInventory(): Promise<{ consolidated: number; deleted: number }> {
    try {
      const userId = this.supabase.userId;
      if (!userId) throw new Error('User not authenticated');

      // Get all available items
      const { data: items, error } = await this.supabase.client
        .from('user_inventory')
        .select('*')
        .eq('user_id', userId)
        .eq('is_available', true)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!items || items.length === 0) return { consolidated: 0, deleted: 0 };

      // Group items by normalized name and unit
      const groups = new Map<string, InventoryItem[]>();
      
      items.forEach(item => {
        const key = `${this.normalizeIngredientName(item.ingredient_name)}_${item.unit.toLowerCase()}`;
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(item);
      });

      let consolidated = 0;
      let deleted = 0;

      // Process each group
      for (const [key, groupItems] of groups.entries()) {
        if (groupItems.length > 1) {
          console.log(`🔄 Consolidating ${groupItems.length} items: ${groupItems[0].ingredient_name}`);
          
          // Keep the oldest item (first in list due to order by created_at)
          const keepItem = groupItems[0];
          const duplicates = groupItems.slice(1);

          // Sum up quantities
          const totalQuantity = groupItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

          // Find earliest expiry date (if any)
          const expiryDates = groupItems
            .filter(item => item.expiry_date)
            .map(item => new Date(item.expiry_date!).getTime());
          const earliestExpiry = expiryDates.length > 0 
            ? new Date(Math.min(...expiryDates)).toISOString().split('T')[0]
            : undefined;

          // Update the kept item with combined quantity
          const { error: updateError } = await this.supabase.client
            .from('user_inventory')
            .update({
              quantity: totalQuantity,
              expiry_date: earliestExpiry || keepItem.expiry_date,
              last_updated: new Date().toISOString()
            })
            .eq('id', keepItem.id);

          if (updateError) {
            console.error('❌ Error updating consolidated item:', updateError);
            continue;
          }

          // Delete duplicate items
          const duplicateIds = duplicates.map(item => item.id).filter(id => id);
          if (duplicateIds.length > 0) {
            const { error: deleteError } = await this.supabase.client
              .from('user_inventory')
              .delete()
              .in('id', duplicateIds);

            if (deleteError) {
              console.error('❌ Error deleting duplicates:', deleteError);
            } else {
              deleted += duplicateIds.length;
              consolidated++;
            }
          }
        }
      }

      console.log(`✅ Consolidated ${consolidated} ingredient types, deleted ${deleted} duplicates`);
      return { consolidated, deleted };

    } catch (error) {
      console.error('❌ Error consolidating inventory:', error);
      throw error;
    }
  }

  /**
   * Normalize ingredient names for comparison
   */
  private normalizeIngredientName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/s$/, '') // Remove trailing 's'
      .replace(/[^a-z0-9]/g, ''); // Remove special characters
  }
  
}