import 'package:flutter/material.dart';

class PremiumTemplate extends StatefulWidget {
  const PremiumTemplate({super.key});

  @override
  State<PremiumTemplate> createState() => _PremiumTemplateState();
}

class _PremiumTemplateState extends State<PremiumTemplate> {
  // --- STATE MANAGEMENT ---
  String _currentScreen = 'inventory'; // 'login', 'inventory', 'input', 'recipe_list', 'cooking_steps'
  int _recipeIndex = 0;
  bool _notificationsOn = true;

  // --- MOCK DATA ---
  final List<Map<String, dynamic>> _inventory = [
    {"id": 1, "name": "Whole Snapper", "expiry": "12/11/2026", "price": 15.0, "status": "red", "icon": Icons.set_meal},
    {"id": 2, "name": "Organic Spinach", "expiry": "14/11/2026", "price": 4.5, "status": "yellow", "icon": Icons.eco},
    {"id": 3, "name": "Fresh Milk", "expiry": "20/11/2026", "price": 8.0, "status": "green", "icon": Icons.water_drop},
  ];

  final List<Map<String, dynamic>> _recipes = [
    {
      "title": "Healthy Salmon Grill",
      "use": "Salmon Fillet",
      "img": "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&q=80",
      "cookTitle": "Grilled Salmon",
    },
    {
      "title": "Classic Salmon Sushi",
      "use": "Salmon Fillet, Rice, Nori",
      "img": "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&q=80",
      "cookTitle": "Salmon Sushi",
    },
    {
      "title": "Baked Salmon Platter",
      "use": "Salmon Fillet, Asparagus",
      "img": "https://images.unsplash.com/photo-1485921325833-c519f76c4927?w=800&q=80",
      "cookTitle": "Baked Salmon",
    },
  ];

  void _changeScreen(String screen) {
    setState(() {
      _currentScreen = screen;
    });
  }

  // --- SCREEN 0: LOGIN VIEW ---
  Widget _buildLoginView() {
    return Scaffold(
      backgroundColor: const Color(0xFFE8F5E9),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.black87),
          onPressed: () => _changeScreen('inventory'),
        ),
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Container(
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(32),
              border: Border.all(color: Colors.green.shade100),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text("BeforeItWastes", style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Color(0xFF1B5E20))),
                const SizedBox(height: 8),
                Text("Sync Your Fridge", style: TextStyle(color: Colors.grey.shade500)),
                const SizedBox(height: 40),
                _buildTextField("Email Address", obscureText: false),
                const SizedBox(height: 20),
                _buildTextField("Password", obscureText: true),
                const SizedBox(height: 40),
                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF1B8E2D),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      elevation: 0,
                    ),
                    onPressed: () => _changeScreen('inventory'),
                    child: const Text("Sign In", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTextField(String hint, {required bool obscureText}) {
    return TextField(
      obscureText: obscureText,
      decoration: InputDecoration(
        hintText: hint,
        filled: true,
        fillColor: Colors.grey.shade50,
        contentPadding: const EdgeInsets.all(20),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: Colors.grey.shade200)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: Colors.grey.shade200)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: Colors.green)),
      ),
    );
  }

  // --- SCREEN 1: INVENTORY DASHBOARD ---
  Widget _buildInventoryView() {
    double totalRisk = _inventory
        .where((item) => item['status'] == 'red' || item['status'] == 'yellow')
        .fold(0, (sum, item) => sum + item['price']);

    return Scaffold(
      backgroundColor: const Color(0xFFF0F7FF),
      body: SafeArea(
        child: Stack(
          children: [
            ListView(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 120),
              children: [
                // App Bar
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text("Inventory", style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.black87)),
                    Row(
                      children: [
                        _buildIconButton(_notificationsOn ? Icons.notifications_none : Icons.notifications_off_outlined, () {
                          setState(() => _notificationsOn = !_notificationsOn);
                        }),
                        const SizedBox(width: 12),
                        _buildIconButton(Icons.menu, () => _changeScreen('login')),
                      ],
                    )
                  ],
                ),
                const SizedBox(height: 24),

                // Value at Risk Card
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: const Color(0xFFD1F2D1),
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: Colors.green.shade200),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text("Value at Risk", style: TextStyle(color: Color(0xFF1B5E20), fontWeight: FontWeight.w600)),
                      const SizedBox(height: 8),
                      Text("RM ${totalRisk.toStringAsFixed(2)}", style: const TextStyle(fontSize: 40, fontWeight: FontWeight.bold, color: Color(0xFF1B5E20))),
                      const SizedBox(height: 4),
                      Text("at risk of waste this week", style: TextStyle(color: Colors.green.shade800)),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Alerts Title
                const Text("Alerts", style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.black87)),
                const SizedBox(height: 16),

                // Inventory List
                ..._inventory.map((item) => _buildInventoryItem(item)),
              ],
            ),

            // Floating Add Button
            Positioned(
              bottom: 90,
              right: 20,
              child: FloatingActionButton(
                backgroundColor: const Color(0xFF2196F3),
                elevation: 4,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(100), side: const BorderSide(color: Colors.white, width: 2)),
                onPressed: () => _changeScreen('input'),
                child: const Icon(Icons.add, color: Colors.white, size: 28),
              ),
            ),

            // Bottom Suggest Recipe Button
            Positioned(
              bottom: 20,
              left: 20,
              right: 20,
              child: SizedBox(
                height: 60,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF1B8E2D),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    elevation: 4,
                  ),
                  onPressed: () => _changeScreen('recipe_list'),
                  child: const Text("Suggest Recipe", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildIconButton(IconData icon, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(color: Colors.white, shape: BoxShape.circle, boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10)]),
        child: Icon(icon, color: Colors.black87),
      ),
    );
  }

  Widget _buildInventoryItem(Map<String, dynamic> item) {
    Color statusColor = item['status'] == 'red' ? Colors.red : (item['status'] == 'yellow' ? Colors.amber : Colors.green);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade100),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 8)],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: Colors.grey.shade50, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey.shade100)),
            child: Icon(item['icon'], color: Colors.grey.shade600),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item['name'], style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.black87)),
                const SizedBox(height: 4),
                Text("Expire: ${item['expiry']}", style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Container(
                width: 12, height: 12,
                decoration: BoxDecoration(color: statusColor, shape: BoxShape.circle, boxShadow: item['status'] == 'red' ? [BoxShadow(color: Colors.red.withValues(alpha: 0.5), blurRadius: 8)] : []),
              ),
              const SizedBox(height: 8),
              Text("RM${item['price'].toStringAsFixed(2)}", style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey.shade700)),
            ],
          )
        ],
      ),
    );
  }

  // --- SCREEN 2: INPUT VIEW ---
  Widget _buildInputView() {
    return Scaffold(
      backgroundColor: const Color(0xFFE8F5E9),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.black87), onPressed: () => _changeScreen('inventory')),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            _buildInputButton("Scan Receipt", Icons.camera_alt),
            const SizedBox(height: 16),
            _buildInputButton("Snap Fridge", Icons.kitchen),
            const SizedBox(height: 16),
            _buildInputButton("Add Manually", Icons.add),
          ],
        ),
      ),
    );
  }

  Widget _buildInputButton(String text, IconData icon) {
    return SizedBox(
      width: double.infinity, height: 70,
      child: ElevatedButton.icon(
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF4CAF50),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          alignment: Alignment.centerLeft,
          padding: const EdgeInsets.symmetric(horizontal: 24),
        ),
        icon: Icon(icon, color: Colors.white, size: 28),
        label: Text("   $text", style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w600, color: Colors.white)),
        onPressed: () {},
      ),
    );
  }

  // --- CONTROLLER FOR ALL VIEWS ---
  @override
  Widget build(BuildContext context) {
    switch (_currentScreen) {
      case 'login': return _buildLoginView();
      case 'input': return _buildInputView();
      // You can add the Recipe Views here later!
      case 'inventory':
      default:
        return _buildInventoryView();
    }
  }
}