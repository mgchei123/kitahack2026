import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../main.dart';

class SupabaseService {
  final _client = Supabase.instance.client;
  // OCR - Extract text from receipt images
  static Future<String> extractReceiptText(String imageUrl) async {
    try {
      debugPrint('📸 Calling OCR function...');
      final response = await supabase.functions.invoke(
        'ocr',
        body: {'image_url': imageUrl},
      );
      return response.data['extracted_text'] ?? '';
    } catch (e) {
      debugPrint('❌ OCR Error: $e');
      rethrow;
    }
  }

  // Parse Receipt - Extract items and prices from text
  static Future<List<Map<String, dynamic>>> parseReceipt(String rawText) async {
    try {
      debugPrint('📝 Parsing receipt text...');
      final response = await supabase.functions.invoke(
        'parse-receipt',
        body: {'raw_text': rawText},
      );
      return List<Map<String, dynamic>>.from(response.data['items'] ?? []);
    } catch (e) {
      debugPrint('❌ Parse Error: $e');
      rethrow;
    }
  }

  // Classify Items - AI classification of food items
  static Future<Map<String, dynamic>> classifyItems(List<String> items) async {
    try {
      debugPrint('🤖 Classifying items...');
      final response = await supabase.functions.invoke(
        'classify-items',
        body: {'items': items},
      );
      return response.data;
    } catch (e) {
      debugPrint('❌ Classification Error: $e');
      rethrow;
    }
  }

  // Get Meal Recommendations
  static Future<List<Map<String, dynamic>>> getMealRecommendations() async {
    try {
      final data = await supabase
          .from('meal_recommendations')
          .select()
          .order('match_score', ascending: false);
      return List<Map<String, dynamic>>.from(data);
    } catch (e) {
      debugPrint('❌ Meal Recommendation Error: $e');
      rethrow;
    }
  }

  // Get Expiry Alerts
  static Future<List<Map<String, dynamic>>> getExpiryAlerts() async {
    try {
      final userId = supabase.auth.currentUser?.id;
      if (userId == null) throw Exception('User not authenticated');

      final response = await supabase.functions.invoke(
        'expiry-alerts',
        body: {'user_id': userId},
      );
      return List<Map<String, dynamic>>.from(response.data['alerts'] ?? []);
    } catch (e) {
      debugPrint('❌ Expiry Alert Error: $e');
      rethrow;
    }
  }

  // Save inventory item
  static Future<void> saveInventoryItem({
    required String ingredientName,
    required String category,
    required DateTime expiryDate,
    required double price,
    required String source,
  }) async {
    try {
      final userId = supabase.auth.currentUser?.id;
      if (userId == null) throw Exception('User not authenticated');

      await supabase.from('user_inventory').insert({
        'user_id': userId,
        'ingredient_name': ingredientName,
        'category': category,
        'expiry_date': expiryDate.toIso8601String(),
        'currency': price,
        'source': source,
        'is_available': true,
      });
      debugPrint('✅ Item saved to inventory');
    } catch (e) {
      debugPrint('❌ Save Inventory Error: $e');
      rethrow;
    }
  }

  // Get user inventory
  static Future<List<Map<String, dynamic>>> getUserInventory() async {
    try {
      final userId = supabase.auth.currentUser?.id;
      if (userId == null) throw Exception('User not authenticated');

      final data = await supabase
          .from('user_inventory')
          .select()
          .eq('user_id', userId)
          .eq('is_available', true);
      return List<Map<String, dynamic>>.from(data);
    } catch (e) {
      debugPrint('❌ Get Inventory Error: $e');
      rethrow;
    }
  }

  // Update meal rating
  static Future<void> updateMealRating(String mealId, double rating) async {
    try {
      final response = await supabase.functions.invoke(
        'update-meal-rating',
        body: {'meal_id': mealId, 'rating': rating},
      );
      debugPrint('✅ Rating updated');
    } catch (e) {
      debugPrint('❌ Rating Update Error: $e');
      rethrow;
    }
  }

  // Get usage history
  static Future<List<Map<String, dynamic>>> getUsageHistory() async {
    try {
      final response = await supabase.functions.invoke(
        'get-usage-history',
      );
      return List<Map<String, dynamic>>.from(response.data['history'] ?? []);
    } catch (e) {
      debugPrint('❌ Usage History Error: $e');
      rethrow;
    }
  }
}