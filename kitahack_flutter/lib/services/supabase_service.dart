import 'dart:typed_data';
import 'package:supabase_flutter/supabase_flutter.dart';

class SupabaseService {
  static final _client = Supabase.instance.client;

  // --- 1. DATA FETCHING ---
  static Future<List<Map<String, dynamic>>> getUserInventory() async {
    final res = await _client.from('user_inventory').select();
    return List<Map<String, dynamic>>.from(res);
  }

  static Future<List<Map<String, dynamic>>> getMealRecommendations() async {
    // This calls your Edge Function for AI suggestions
    final res = await _client.functions.invoke('get_recipes'); 
    return List<Map<String, dynamic>>.from(res.data ?? []);
  }

  static Future<List<Map<String, dynamic>>> getExpiryAlerts() async {
    final res = await _client.from('user_inventory').select()
        .lt('expiry_date', DateTime.now().add(const Duration(days: 3)).toIso8601String());
    return List<Map<String, dynamic>>.from(res);
  }

  static Future<List<Map<String, dynamic>>> getUsageHistory() async {
    final res = await _client.from('usage_history').select();
    return List<Map<String, dynamic>>.from(res);
  }

  // --- 2. AI & OCR (Used in Input View) ---
  static Future<String> extractReceiptText(String imageUrl) async {
    final res = await _client.functions.invoke('ocr_extract', body: {'image_url': imageUrl});
    return res.data['text'] ?? '';
  }

  static Future<String> extractReceiptFromBytes(Uint8List bytes) async {
    final res = await _client.functions.invoke('ocr_extract_bytes', body: bytes);
    return res.data['text'] ?? '';
  }

  static Future<List<Map<String, dynamic>>> parseReceipt(String text) async {
    final res = await _client.functions.invoke('parse_receipt', body: {'text': text});
    return List<Map<String, dynamic>>.from(res.data['items'] ?? []);
  }

  static Future<Map<String, dynamic>> classifyItems(List<String> itemNames) async {
    final res = await _client.functions.invoke('classify_items', body: {'items': itemNames});
    return Map<String, dynamic>.from(res.data ?? {'cookable': []});
  }

  // --- 3. DATABASE UPDATES ---
  static Future<void> saveInventoryItem({
    required String ingredientName,
    required String category,
    required DateTime expiryDate,
    required double price,
    required String source,
  }) async {
    await _client.from('user_inventory').insert({
      'ingredient_name': ingredientName,
      'category': category,
      'expiry_date': expiryDate.toIso8601String(),
      'currency': price, // UI expects 'currency' for price
      'source': source,
      'user_id': _client.auth.currentUser?.id,
    });
  }

  static Future<void> updateMealRating(String mealId, double rating) async {
    await _client.from('meal_ratings').upsert({
      'meal_id': mealId,
      'rating': rating,
      'user_id': _client.auth.currentUser?.id,
    });
  }
}