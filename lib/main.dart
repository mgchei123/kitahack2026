import 'package:flutter/material.dart';

void main() {
  runApp(const FoodButlerApp());
}

class FoodButlerApp extends StatelessWidget {
  const FoodButlerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Food Butler',
      theme: ThemeData(
        useMaterial3: true,
        colorSchemeSeed: Colors.green, // Eco-friendly & Food theme color
        brightness: Brightness.light,
      ),
      home: const DashboardPage(),
    );
  }
}

class DashboardPage extends StatefulWidget {
  const DashboardPage({super.key});

  @override
  State<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends State<DashboardPage> {
  // Mock Data: To be replaced by Firestore data later
  final List<Map<String, dynamic>> foodItems = [
    {'name': 'Milk', 'expiry': 1, 'category': 'Dairy', 'status': 'Urgent'},
    {'name': 'Salmon', 'expiry': 2, 'category': 'Meat', 'status': 'Warning'},
    {'name': 'Broccoli', 'expiry': 5, 'category': 'Vegetable', 'status': 'Fresh'},
    {'name': 'Eggs', 'expiry': 7, 'category': 'Eggs', 'status': 'Fresh'},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Food Butler', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(onPressed: () {}, icon: const Icon(Icons.notifications_none)),
          IconButton(onPressed: () {}, icon: const Icon(Icons.person_outline)),
        ],
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Waste Analytics Card
              _buildWasteCard(),
              const SizedBox(height: 25),
              const Text('Inventory Alerts', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 10),
              // Food Item List
              ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: foodItems.length,
                itemBuilder: (context, index) {
                  return _buildFoodItem(foodItems[index]);
                },
              ),
            ],
          ),
        ),
      ),
      // Core Feature: AI Scan Button
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          // TODO: Trigger Gemini Vision API scanner logic
          debugPrint('Opening Camera for Receipt Scan...');
        },
        icon: const Icon(Icons.camera_alt),
        label: const Text('AI Scan Receipt'),
        backgroundColor: Theme.of(context).colorScheme.primaryContainer,
      ),
    );
  }

  Widget _buildWasteCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(colors: [Colors.green.shade400, Colors.green.shade700]),
        borderRadius: BorderRadius.circular(20),
      ),
      child: const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Waste Saved This Month', style: TextStyle(color: Colors.white, fontSize: 16)),
          SizedBox(height: 10),
          Text('RM 45.20', style: TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold)),
          SizedBox(height: 5),
          Text('Reduced 3.2kg of CO2 emission', style: TextStyle(color: Colors.white70, fontSize: 12)),
        ],
      ),
    );
  }

  Widget _buildFoodItem(Map<String, dynamic> item) {
    // Dynamic color coding based on expiry days
    Color statusColor = item['expiry'] <= 1 ? Colors.red : (item['expiry'] <= 3 ? Colors.orange : Colors.green);
    
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(15),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(color: statusColor.withOpacity(0.1), shape: BoxShape.circle),
          child: Icon(Icons.fastfood, color: statusColor),
        ),
        title: Text(item['name'], style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text('Category: ${item['category']}'),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text('Expires in ${item['expiry']}d', style: TextStyle(color: statusColor, fontWeight: FontWeight.bold)),
            Text(item['status'], style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
          ],
        ),
      ),
    );
  }
}