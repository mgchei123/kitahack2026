import 'package:flutter/material.dart';
import '../main.dart';

class MealPlannerScreen extends StatefulWidget {
  const MealPlannerScreen({super.key});

  @override
  State<MealPlannerScreen> createState() => _MealPlannerScreenState();
}

class _MealPlannerScreenState extends State<MealPlannerScreen> {
  // Fetching from meal_recommendations table
  Future<List<Map<String, dynamic>>> _fetchMeals() async {
    final data = await supabase
        .from('meal_recommendations')
        .select()
        .order('match_score', ascending: false);
    return List<Map<String, dynamic>>.from(data);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('AI Meal Planner'),
        backgroundColor: const Color(0xFF2E7D32), // Kitchen Green
        foregroundColor: Colors.white,
      ),
      body: FutureBuilder<List<Map<String, dynamic>>>(
        future: _fetchMeals(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          // UI/UX Requirement: EmptyState widget
          if (!snapshot.hasData || snapshot.data!.isEmpty) {
            return const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.restaurant, size: 80, color: Colors.grey),
                  SizedBox(height: 16),
                  Text('No recommendations yet.', style: TextStyle(fontSize: 18)),
                  Text('Scan more receipts to improve AI suggestions.'),
                ],
              ),
            );
          }

          final meals = snapshot.data!;
          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: meals.length, // Performance Optimization: Lazy Loading
            itemBuilder: (context, index) {
              final meal = meals[index];
              return Card( // Card-based list requirement
                margin: const EdgeInsets.only(bottom: 16),
                elevation: 2,
                child: ExpansionTile(
                  leading: CircleAvatar(
                    backgroundColor: const Color(0xFF2E7D32),
                    child: Text(
                      '${(meal['match_score'] * 100).toInt()}%',
                      style: const TextStyle(color: Colors.white, fontSize: 12),
                    ),
                  ),
                  title: Text(
                    meal['meal'],
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  subtitle: const Text('Tap to see recipe instructions'),
                  children: [
                    Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Text(meal['recipe_instructions'] ?? 'No instructions available.'),
                    ),
                  ],
                ),
              );
            },
          );
        },
      ),
    );
  }
}