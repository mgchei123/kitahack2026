import 'package:flutter/material.dart';
import 'scanner_screen.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Receipts'),
        backgroundColor: const Color(0xFF2E7D32),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => Navigator.pushReplacementNamed(context, '/'),
          )
        ],
      ),
      body: Column(
        children: [
          // Total Spending Summary Card
          Container(
            padding: const EdgeInsets.all(20),
            color: const Color(0xFF2E7D32).withOpacity(0.1),
            child: const Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Total Spending (Feb)', style: TextStyle(fontSize: 18)),
                Text('RM 150.00', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF2E7D32))),
              ],
            ),
          ),
          
          // Placeholder for the list of receipts
          const Expanded(
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.receipt_long, size: 80, color: Colors.grey),
                  SizedBox(height: 16),
                  Text('No receipts yet. Start scanning!', style: TextStyle(color: Colors.grey, fontSize: 16)),
                ],
              ),
            ),
          ),
        ],
      ),
      
      // Floating Action Button to quickly jump to the Scanner
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => const ScannerScreen()),
          );
        },
        label: const Text('Scan New Receipt'),
        icon: const Icon(Icons.add_a_photo),
        backgroundColor: const Color(0xFF2E7D32),
      ),
    );
  }
}