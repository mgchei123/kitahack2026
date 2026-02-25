import 'package:flutter/material.dart';
import '../main.dart'; // Import the global supabase client
import 'scanner_screen.dart'; // Import the scanner screen
import 'meal_planner_screen.dart'; // Import the new meal planner screen

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

// 👇 THIS IS THE "DashboardScreen state" 👇
class _DashboardScreenState extends State<DashboardScreen> {
  // --- STATE VARIABLES ---
  // This variable tracks which tab is currently selected in the bottom navigation
  int _selectedIndex = 0;

  // --- DATABASE FUNCTIONS ---
  // Fetching from user_inventory table
  Future<List<Map<String, dynamic>>> _fetchInventory() async {
    final data = await supabase
        .from('user_inventory')
        .select()
        .eq('is_available', true)
        .order('expiry_date', ascending: true);
    return List<Map<String, dynamic>>.from(data);
  }

  // --- UI COMPONENTS ---
  // We moved the original inventory list into its own method here
  Widget _buildInventoryView() {
    return FutureBuilder<List<Map<String, dynamic>>>(
      future: _fetchInventory(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        // UI/UX Requirement: Always include an EmptyState widget
        if (!snapshot.hasData || snapshot.data!.isEmpty) {
          return _buildEmptyState();
        }

        final items = snapshot.data!;
        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: items.length, // Performance Optimization: Lazy Loading
          itemBuilder: (context, index) {
            final item = items[index];
            return Card(
              child: ListTile(
                leading: const Icon(Icons.restaurant_menu, color: Color(0xFF2E7D32)),
                title: Text(item['ingredient_name']),
                subtitle: Text('Expires: ${item['expiry_date']}'),
                trailing: Text('${item['quantity']} ${item['unit']}'),
              ),
            );
          },
        );
      },
    );
  }

  // Empty state UI when there is no inventory
  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.inventory_2_outlined, size: 80, color: Colors.grey),
          const SizedBox(height: 16),
          const Text(
            'Your pantry is empty!',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const Text('Scan a receipt to add items automatically.'),
        ],
      ),
    );
  }

  // --- MAIN BUILD METHOD ---
  @override
  Widget build(BuildContext context) {
    // Define the screens for the Bottom Navigation Bar
    final List<Widget> screens = [
      _buildInventoryView(),      // Index 0: Inventory View (Pantry)
      const MealPlannerScreen(),  // Index 1: AI Meal Planner View
    ];

    return Scaffold(
      appBar: AppBar(
        // The title changes dynamically based on the selected tab
        title: Text(_selectedIndex == 0 ? 'Inventory Dashboard' : 'AI Meal Planner'),
        backgroundColor: const Color(0xFF2E7D32), // Kitchen Green
        foregroundColor: Colors.white,
      ),
      
      // The body displays the screen corresponding to the selected index
      body: screens[_selectedIndex],

      // NavigationBar implements the Material 3 bottom navigation
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (int index) {
          setState(() {
            _selectedIndex = index; // Update state to switch tabs
          });
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.inventory_2_outlined), 
            selectedIcon: Icon(Icons.inventory_2), 
            label: 'Pantry'
          ),
          NavigationDestination(
            icon: Icon(Icons.restaurant_outlined), 
            selectedIcon: Icon(Icons.restaurant), 
            label: 'Meals'
          ),
        ],
      ),

      // Global Floating Action Button to scan receipts from anywhere
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => Navigator.push(
          context, 
          MaterialPageRoute(builder: (context) => const ScannerScreen())
        ),
        label: const Text('Scan Receipt'),
        icon: const Icon(Icons.camera_alt),
        backgroundColor: const Color(0xFF2E7D32),
        foregroundColor: Colors.white,
      ),
    );
  }
}