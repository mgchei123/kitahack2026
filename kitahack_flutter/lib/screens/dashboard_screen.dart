import 'package:flutter/material.dart';
import 'scanner_screen.dart'; 

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  
  // --- 点击加号弹出的精美底部菜单 ---
  void _showAddOptions(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent, 
      builder: (context) => Container(
        margin: const EdgeInsets.all(16),
        padding: const EdgeInsets.symmetric(vertical: 24),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              "Add to Inventory",
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            _buildOptionTile(
              icon: Icons.receipt_long,
              title: "Scan Receipt",
              subtitle: "Auto-extract items & prices via AI",
              color: const Color(0xFFF5A623), // 亮黄色
              onTap: () {
                Navigator.pop(context);
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const ScannerScreen()),
                );
              },
            ),
            _buildOptionTile(
              icon: Icons.kitchen,
              title: "Snap Fridge",
              subtitle: "AI detects visible ingredients",
              color: Colors.blue.shade700,
              onTap: () {
                Navigator.pop(context);
              },
            ),
            _buildOptionTile(
              icon: Icons.edit_note,
              title: "Add Manually",
              subtitle: "Type it yourself",
              color: Colors.orange.shade700,
              onTap: () {
                Navigator.pop(context);
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOptionTile({required IconData icon, required String title, required String subtitle, required Color color, required VoidCallback onTap}) {
    return ListTile(
      leading: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(color: color.withValues(alpha: 0.15), shape: BoxShape.circle),
        child: Icon(icon, color: color),
      ),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
      subtitle: Text(subtitle, style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
      trailing: const Icon(Icons.chevron_right, color: Colors.grey),
      onTap: onTap,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA), 
      
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text("Good Morning,", style: TextStyle(color: Colors.grey, fontSize: 14)),
            Text("Fridge Inventory", style: TextStyle(color: Colors.black87, fontWeight: FontWeight.w800, fontSize: 22)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined, color: Colors.black87),
            onPressed: () {},
          ),
          const SizedBox(width: 8),
        ],
      ),

      // 🌟 修改：黄黑配色的悬浮按钮
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showAddOptions(context),
        backgroundColor: const Color(0xFFFFB703), // 活力亮黄
        foregroundColor: Colors.black87, // 黑色文字/图标形成高级反差
        icon: const Icon(Icons.add, size: 24),
        label: const Text("Add Item", style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
      ),

      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        child: Padding(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 💳 1. 核心亮点：黄/金 渐变高级卡片
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFFFFD166), Color(0xFFFFB703)], // 浅金黄过渡到亮黄
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFFFFB703).withValues(alpha: 0.35), // 黄色发光阴影
                      blurRadius: 15,
                      offset: const Offset(0, 8),
                    )
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          "Value at Risk",
                          style: TextStyle(color: Colors.black87, fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                        // 🌟 修改：黑底黄字的高级警告标签
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(color: Colors.black87, borderRadius: BorderRadius.circular(12)),
                          child: const Text("High Alert", style: TextStyle(color: Color(0xFFFFD166), fontSize: 12, fontWeight: FontWeight.bold)),
                        )
                      ],
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      "RM 32.75",
                      style: TextStyle(color: Colors.black87, fontSize: 40, fontWeight: FontWeight.w900, letterSpacing: -1),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      "at risk of being wasted this week.",
                      style: TextStyle(color: Colors.black87.withValues(alpha: 0.7), fontSize: 14, fontWeight: FontWeight.w500),
                    ),
                  ],
                ),
              ),
              
              const SizedBox(height: 32),

              // ⚠️ 2. 紧急待办区
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text("Action Required", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black87)),
                  TextButton(
                    onPressed: () {}, 
                    child: const Text("View All", style: TextStyle(color: Color(0xFFE85D04), fontWeight: FontWeight.bold)) // 深橙色，更搭黄色
                  )
                ],
              ),
              const SizedBox(height: 12),

              _buildUrgentItemCard("Salmon Fillets", "Expiring in 2 days", "RM 15.00", "🍣"),
              _buildUrgentItemCard("Fresh Milk 1.5L", "Expiring tomorrow", "RM 7.50", "🥛"),
              
              const SizedBox(height: 24),
              const Text("Fresh Inventory", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black87)),
              const SizedBox(height: 12),
              
              _buildFreshItemCard("Broccoli", "Good for 5 days", "RM 4.20", "🥦"),
              _buildFreshItemCard("Eggs (10 pcs)", "Good for 12 days", "RM 6.00", "🥚"),
              
              const SizedBox(height: 80), 
            ],
          ),
        ),
      ),
    );
  }

  // --- 内部卡片组件：紧急状态 ---
  Widget _buildUrgentItemCard(String name, String status, String price, String emoji) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.red.shade100, width: 1.5), 
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 10, offset: const Offset(0, 4))],
      ),
      child: Row(
        children: [
          Text(emoji, style: const TextStyle(fontSize: 36)),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: const TextStyle(fontFamily: 'Courier', fontWeight: FontWeight.bold, fontSize: 16)),
                const SizedBox(height: 4),
                Text(status, style: TextStyle(color: Colors.red.shade400, fontSize: 13, fontWeight: FontWeight.bold)),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(price, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              const SizedBox(height: 4),
              // 🌟 修改：黄色背景，黑色文字的 AI 按钮
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(color: const Color(0xFFFFB703), borderRadius: BorderRadius.circular(8)),
                child: const Text("Cook AI", style: TextStyle(color: Colors.black87, fontSize: 10, fontWeight: FontWeight.w900)),
              )
            ],
          )
        ],
      ),
    );
  }

  // --- 内部卡片组件：新鲜状态 ---
  Widget _buildFreshItemCard(String name, String status, String price, String emoji) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 8, offset: const Offset(0, 2))],
      ),
      child: Row(
        children: [
          Text(emoji, style: const TextStyle(fontSize: 36)),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: const TextStyle(fontFamily: 'Courier', fontWeight: FontWeight.bold, fontSize: 16)),
                const SizedBox(height: 4),
                Text(status, style: TextStyle(color: Colors.grey.shade500, fontSize: 13)),
              ],
            ),
          ),
          Text(price, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.black54)),
        ],
      ),
    );
  }
}