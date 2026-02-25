import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../main.dart';
import 'scanner_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  // Following Database Operations: Fetch Inventory with Filter
  Future<List<Map<String, dynamic>>> _fetchInventory() async {
    final data = await supabase
        .from('user_inventory')
        .select()
        .eq('is_available', true)
        .order('expiry_date', ascending: true);
    return List<Map<String, dynamic>>.from(data);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Inventory Dashboard'),
        backgroundColor: const Color(0xFF2E7D32), // Kitchen Green
        foregroundColor: Colors.white,
      ),
      body: FutureBuilder<List<Map<String, dynamic>>>(
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
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => Navigator.push(
          context, 
          MaterialPageRoute(builder: (context) => const ScannerScreen())
        ),
        label: const Text('Scan Receipt'),
        icon: const Icon(Icons.camera_alt),
        backgroundColor: const Color(0xFF2E7D32),
      ),
    );
  }

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
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: () => Navigator.push(
              context, 
              MaterialPageRoute(builder: (context) => const ScannerScreen())
            ),
            child: const Text('Get Started'),
          )
        ],
      ),
    );
  }
}