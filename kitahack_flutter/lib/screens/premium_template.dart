import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../services/supabase_service.dart';

class PremiumTemplate extends StatefulWidget {
  const PremiumTemplate({super.key});

  @override
  State<PremiumTemplate> createState() => _PremiumTemplateState();
}

class _PremiumTemplateState extends State<PremiumTemplate> {
  // Convenience getter — avoids repeating Supabase.instance.client everywhere
  SupabaseClient get _supabase => Supabase.instance.client;

  // --- STATE MANAGEMENT ---
  String _currentScreen = 'login';
  int _recipeIndex = 0;
  bool _notificationsOn = true;
  bool _isLoading = false;
  bool _isProcessing = false;

  // Login form controllers
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();

  // Image picker
  final ImagePicker _picker = ImagePicker();
  XFile? _selectedImage;
  Uint8List? _selectedImageBytes; // web-safe bytes for display
  String _extractedText = '';

  // Data from Supabase
  List<Map<String, dynamic>> _inventory = [];
  List<Map<String, dynamic>> _recipes = [];
  List<Map<String, dynamic>> _alerts = [];
  List<Map<String, dynamic>> _usageHistory = [];

  // Rating state per meal
  final Map<String, double> _mealRatings = {};

  @override
  void initState() {
    super.initState();
    _checkAuthAndLoad();
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  // ─────────────────────────────────────────────
  // AUTH CHECKS & DATA LOADING
  // ─────────────────────────────────────────────

  Future<void> _checkAuthAndLoad() async {
    try {
      final user = _supabase.auth.currentUser;
      if (user != null) {
        await _loadData();
        setState(() => _currentScreen = 'inventory');
      } else {
        setState(() => _currentScreen = 'login');
      }
    } catch (e) {
      if (kDebugMode) print('Auth check error: $e');
      setState(() => _currentScreen = 'login');
    }
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final user = _supabase.auth.currentUser;
      if (user == null) throw Exception('User not authenticated. Please log in first.');

      if (kDebugMode) print('📥 Loading data for user: ${user.id}');

      final results = await Future.wait([
        SupabaseService.getUserInventory(),
        SupabaseService.getMealRecommendations(),
        SupabaseService.getExpiryAlerts(),
        SupabaseService.getUsageHistory().catchError((e) {
          if (kDebugMode) print('⚠️ History skipped: $e');
          return <Map<String, dynamic>>[];
        }),
      ]);

      setState(() {
        _inventory     = results[0];
        _recipes       = results[1];
        _alerts        = results[2];
        _usageHistory  = results[3];
      });

      if (kDebugMode) {
        print('✅ Loaded ${_inventory.length} inventory items');
        print('✅ Loaded ${_recipes.length} recipes');
        print('✅ Loaded ${_alerts.length} alerts');
        print('✅ Loaded ${_usageHistory.length} usage history entries');
      }
    } catch (e) {
      if (kDebugMode) print('❌ Error loading data: $e');
      _showError('Failed to load data: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _changeScreen(String screen) => setState(() => _currentScreen = screen);

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Colors.red),
    );
  }

  void _showSuccess(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Colors.green),
    );
  }

  // ─────────────────────────────────────────────
  // AUTH ACTIONS
  // ─────────────────────────────────────────────

  /// Sign in with email + password (uses real credentials from the text fields).
  Future<void> _signInWithEmail() async {
    final email    = _emailController.text.trim();
    final password = _passwordController.text.trim();

    if (email.isEmpty || password.isEmpty) {
      _showError('Please enter your email and password.');
      return;
    }

    setState(() => _isLoading = true);
    try {
      await _supabase.auth.signInWithPassword(email: email, password: password);

      if (kDebugMode) print('✅ Signed in: $email');

      await _loadData();

      if (mounted) {
        setState(() => _currentScreen = 'inventory');
        _showSuccess('Welcome back!');
      }
    } on AuthException catch (e) {
      _showError('Auth Error: ${e.message}');
    } catch (e) {
      _showError('Error: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  /// Sign in anonymously as guest.
  Future<void> _signInAnonymously() async {
    setState(() => _isLoading = true);
    try {
      await _supabase.auth.signInAnonymously();

      if (kDebugMode) print('✅ Signed in anonymously');

      await _loadData();

      if (mounted) {
        setState(() => _currentScreen = 'inventory');
        _showSuccess('Logged in as Guest!');
      }
    } on AuthException catch (e) {
      _showError('Auth Error: ${e.message}');
    } catch (e) {
      _showError('Error: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  /// Sign out and return to login screen.
  Future<void> _signOut() async {
    setState(() => _isLoading = true);
    try {
      await _supabase.auth.signOut();
      setState(() {
        _inventory    = [];
        _recipes      = [];
        _alerts       = [];
        _usageHistory = [];
        _currentScreen = 'login';
      });
      if (kDebugMode) print('✅ Signed out');
    } catch (e) {
      _showError('Sign out error: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // ─────────────────────────────────────────────
  // IMAGE / RECEIPT ACTIONS
  // ─────────────────────────────────────────────

  Future<void> _pickImage(ImageSource source) async {
    try {
      final pickedFile = await _picker.pickImage(source: source);
      if (pickedFile != null) {
        final bytes = await pickedFile.readAsBytes();
        setState(() {
          _selectedImage      = pickedFile;
          _selectedImageBytes = bytes;
          _extractedText      = '';
        });
        if (kDebugMode) print('📸 Image picked: ${pickedFile.path}');
      }
    } catch (e) {
      _showError('Error picking image: $e');
    }
  }

  Future<void> _uploadAndExtractReceipt() async {
    if (_selectedImage == null) {
      _showError('Please select an image first');
      return;
    }

    setState(() => _isProcessing = true);

    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) throw Exception('User not authenticated');

      final imageBytes = await _selectedImage!.readAsBytes();
      String? imageUrl;

      // ── Attempt Storage upload (may fail for anonymous users due to RLS) ──
      try {
        if (kDebugMode) print('🔄 Uploading image to Supabase Storage...');

        // Path must be user-scoped for RLS: receipts/{user_id}/{filename}
        final fileName = '$userId/${DateTime.now().millisecondsSinceEpoch}.jpg';

        await _supabase.storage.from('receipts').uploadBinary(
          fileName,
          imageBytes,
          fileOptions: const FileOptions(
            contentType: 'image/jpeg',
            upsert: true,  // avoid duplicate-key errors on retry
          ),
        );

        imageUrl = _supabase.storage.from('receipts').getPublicUrl(fileName);
        if (kDebugMode) print('✅ Image uploaded: $imageUrl');
      } on StorageException catch (storageErr) {
        // RLS blocked the upload (common for anonymous users).
        // Fall back to sending the image bytes directly to the OCR function.
        if (kDebugMode) {
          print('⚠️ Storage upload blocked (${storageErr.statusCode}): ${storageErr.message}');
          print('↩️  Falling back to direct bytes upload...');
        }
        imageUrl = null; // signal the service to use bytes instead
      }

      // 1️⃣  OCR — pass public URL if available, otherwise bytes
      final extractedText = imageUrl != null
          ? await SupabaseService.extractReceiptText(imageUrl)
          : await SupabaseService.extractReceiptFromBytes(imageBytes);

      // ⚠️ Always proceed to the text screen — even if OCR returned something
      // unexpected. The raw response is logged above in supabase_service.dart
      // so you can see the exact key name in the debug console.
      // We only fall back to a placeholder if truly nothing came back.
      final displayText = extractedText.trim().isNotEmpty
          ? extractedText
          : '[OCR returned no text — check console for raw response key]';

      // Clear _selectedImage so _buildInputView routes to the extracted-text
      // branch instead of looping back to the image preview branch.
      setState(() {
        _extractedText      = displayText;
        _selectedImage      = null;
        _selectedImageBytes = null;
      });

      if (kDebugMode) print('📝 Extracted text:\n$_extractedText');
      _showSuccess('Receipt scanned! Review text then tap "Save to Inventory".');
    } catch (e) {
      if (kDebugMode) print('❌ Error extracting receipt: $e');
      _showError('Failed to extract receipt: $e');
    } finally {
      setState(() => _isProcessing = false);
    }
  }

  Future<void> _parseAndSaveReceipt() async {
    if (_extractedText.isEmpty) {
      _showError('Please extract receipt text first');
      return;
    }

    setState(() => _isProcessing = true);

    try {
      if (kDebugMode) print('🔄 Parsing receipt...');

      // 2️⃣  Parse receipt text into structured items
      final items = await SupabaseService.parseReceipt(_extractedText);

      if (kDebugMode) print('✅ Parsed ${items.length} items');

      // 3️⃣  Classify items — identify cookable ingredients
      final itemNames       = items.map((item) => item['name'] as String).toList();
      final classifiedResult = await SupabaseService.classifyItems(itemNames);
      final cookableItems    = classifiedResult['cookable'] as List<dynamic>? ?? [];

      if (kDebugMode) print('🍳 Found ${cookableItems.length} cookable items');

      // 4️⃣  Save each cookable item to user_inventory
      int savedCount = 0;
      for (var item in cookableItems) {
        try {
          await SupabaseService.saveInventoryItem(
            ingredientName: item['name'] ?? 'Unknown',
            category:       item['category'] ?? 'Other',
            expiryDate:     DateTime.now().add(const Duration(days: 7)),
            price:          (item['price'] as num?)?.toDouble() ?? 0.0,
            source:         'receipt',
          );
          savedCount++;
        } catch (e) {
          if (kDebugMode) print('⚠️ Failed to save item: $e');
        }
      }

      if (kDebugMode) print('✅ Saved $savedCount items to inventory');
      _showSuccess('Saved $savedCount items to inventory!');

      setState(() {
        _selectedImage      = null;
        _selectedImageBytes = null;
        _extractedText      = '';
        _currentScreen      = 'inventory';
      });
    } catch (e) {
      if (kDebugMode) print('❌ Error parsing receipt: $e');
      _showError('Failed to parse receipt: $e');
    } finally {
      setState(() => _isProcessing = false);
    }
  }

  // ─────────────────────────────────────────────
  // MEAL RATING ACTION
  // ─────────────────────────────────────────────

  /// Submit a star rating for a meal, then reload recommendations.
  Future<void> _submitMealRating(String mealId, double rating) async {
    try {
      // 5️⃣  Update meal rating via Supabase Edge Function
      await SupabaseService.updateMealRating(mealId, rating);

      setState(() => _mealRatings[mealId] = rating);
      _showSuccess('Rating submitted!');

      // Refresh meal recommendations so the ranked order updates
      final updated = await SupabaseService.getMealRecommendations();
      setState(() => _recipes = updated);
    } catch (e) {
      if (kDebugMode) print('❌ Rating error: $e');
      _showError('Failed to submit rating: $e');
    }
  }

  // ─────────────────────────────────────────────
  // VIEWS
  // ─────────────────────────────────────────────

  // ---------- LOGIN VIEW ----------
  Widget _buildLoginView() {
    return Scaffold(
      backgroundColor: const Color(0xFFE8F5E9),
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
                const Text(
                  "BeforeItWastes",
                  style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF1B5E20)),
                ),
                const SizedBox(height: 8),
                Text("Sync Your Fridge",
                    style: TextStyle(color: Colors.grey.shade500)),
                const SizedBox(height: 40),
                // Email field — now wired to controller
                _buildTextField("Email Address",
                    controller: _emailController, obscureText: false),
                const SizedBox(height: 20),
                // Password field — now wired to controller
                _buildTextField("Password",
                    controller: _passwordController, obscureText: true),
                const SizedBox(height: 40),
                _isLoading
                    ? const CircularProgressIndicator()
                    : Column(
                        children: [
                          // Primary: email/password sign-in
                          SizedBox(
                            width: double.infinity,
                            height: 56,
                            child: ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF1B8E2D),
                                shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(16)),
                                elevation: 0,
                              ),
                              onPressed: _signInWithEmail,
                              child: const Text(
                                "Sign In",
                                style: TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white),
                              ),
                            ),
                          ),
                          const SizedBox(height: 12),
                          // Secondary: anonymous guest access
                          SizedBox(
                            width: double.infinity,
                            height: 48,
                            child: OutlinedButton(
                              style: OutlinedButton.styleFrom(
                                foregroundColor: const Color(0xFF1B8E2D),
                                side: const BorderSide(
                                    color: Color(0xFF1B8E2D)),
                                shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(16)),
                              ),
                              onPressed: _signInAnonymously,
                              child: const Text("Continue as Guest"),
                            ),
                          ),
                        ],
                      ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTextField(
    String hint, {
    required bool obscureText,
    TextEditingController? controller,
  }) {
    return TextField(
      controller: controller,
      obscureText: obscureText,
      decoration: InputDecoration(
        hintText: hint,
        filled: true,
        fillColor: Colors.grey.shade50,
        contentPadding: const EdgeInsets.all(20),
        border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: BorderSide(color: Colors.grey.shade200)),
        enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: BorderSide(color: Colors.grey.shade200)),
        focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: const BorderSide(color: Colors.green)),
      ),
    );
  }

  // ---------- INVENTORY VIEW ----------
  Widget _buildInventoryView() {
    double totalRisk = _inventory.fold(0.0, (sum, item) {
      try {
        final expiryDateStr = item['expiry_date'] as String?;
        if (expiryDateStr == null) return sum;
        final expiryDate  = DateTime.parse(expiryDateStr);
        final warningDate = DateTime.now().add(const Duration(days: 3));
        if (expiryDate.isBefore(warningDate)) {
          return sum + (item['currency'] as num? ?? 0.0).toDouble();
        }
        return sum;
      } catch (e) {
        return sum;
      }
    });

    return Scaffold(
      backgroundColor: const Color(0xFFF0F7FF),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SafeArea(
              child: Stack(
                children: [
                  ListView(
                    padding: const EdgeInsets.fromLTRB(20, 20, 20, 120),
                    children: [
                      // ── Header row ──
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text("Inventory",
                              style: TextStyle(
                                  fontSize: 28,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.black87)),
                          Row(children: [
                            _buildIconButton(
                              _notificationsOn
                                  ? Icons.notifications_none
                                  : Icons.notifications_off_outlined,
                              () => setState(
                                  () => _notificationsOn = !_notificationsOn),
                            ),
                            const SizedBox(width: 12),
                            // History button
                            _buildIconButton(Icons.history,
                                () => _changeScreen('history')),
                            const SizedBox(width: 12),
                            // Logout
                            _buildIconButton(Icons.logout, _signOut),
                          ]),
                        ],
                      ),
                      const SizedBox(height: 24),

                      // ── Value-at-risk card ──
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
                            const Text("Value at Risk",
                                style: TextStyle(
                                    color: Color(0xFF1B5E20),
                                    fontWeight: FontWeight.w600)),
                            const SizedBox(height: 8),
                            Text("RM ${totalRisk.toStringAsFixed(2)}",
                                style: const TextStyle(
                                    fontSize: 40,
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFF1B5E20))),
                            const SizedBox(height: 4),
                            Text("at risk of waste this week",
                                style: TextStyle(color: Colors.green.shade800)),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),

                      // ── Expiry Alerts section (from getExpiryAlerts) ──
                      if (_alerts.isNotEmpty) ...[
                        const Text("⚠️  Expiry Alerts",
                            style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                color: Colors.redAccent)),
                        const SizedBox(height: 12),
                        ..._alerts.map((alert) => _buildAlertCard(alert)),
                        const SizedBox(height: 24),
                      ],

                      // ── Inventory items ──
                      const Text("Alerts",
                          style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: Colors.black87)),
                      const SizedBox(height: 16),
                      if (_inventory.isEmpty)
                        Center(
                          child: Padding(
                            padding: const EdgeInsets.all(32.0),
                            child: Text(
                              'No items in inventory.\nTap the + button to add items!',
                              style: TextStyle(
                                  color: Colors.grey.shade600, fontSize: 16),
                              textAlign: TextAlign.center,
                            ),
                          ),
                        )
                      else
                        ..._inventory.map((item) => _buildInventoryItem(item)),
                    ],
                  ),

                  // FAB — go to scan receipt
                  Positioned(
                    bottom: 90,
                    right: 20,
                    child: FloatingActionButton(
                      backgroundColor: const Color(0xFF2196F3),
                      elevation: 4,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(100),
                          side: const BorderSide(
                              color: Colors.white, width: 2)),
                      onPressed: () => _changeScreen('input'),
                      child: const Icon(Icons.add, color: Colors.white, size: 28),
                    ),
                  ),

                  // Suggest Recipe button
                  Positioned(
                    bottom: 20,
                    left: 20,
                    right: 20,
                    child: SizedBox(
                      height: 60,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF1B8E2D),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16)),
                          elevation: 4,
                        ),
                        onPressed: () => _changeScreen('recipe_list'),
                        child: const Text("Suggest Recipe",
                            style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: Colors.white)),
                      ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildAlertCard(Map<String, dynamic> alert) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.red.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.red.shade200),
      ),
      child: Row(
        children: [
          const Icon(Icons.warning_amber_rounded, color: Colors.red, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              alert['message'] as String? ??
                  '${alert['ingredient_name'] ?? 'Item'} expires soon',
              style: const TextStyle(fontSize: 14, color: Colors.red),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildIconButton(IconData icon, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
            color: Colors.white,
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05), blurRadius: 10)
            ]),
        child: Icon(icon, color: Colors.black87),
      ),
    );
  }

  Widget _buildInventoryItem(Map<String, dynamic> item) {
    String status = 'green';
    try {
      final expiryDate =
          DateTime.parse(item['expiry_date'] as String? ?? '');
      final daysUntilExpiry = expiryDate.difference(DateTime.now()).inDays;

      if (daysUntilExpiry <= 1) {
        status = 'red';
      } else if (daysUntilExpiry <= 3) {
        status = 'yellow';
      }
    } catch (e) {
      status = 'green';
    }

    Color statusColor = status == 'red'
        ? Colors.red
        : (status == 'yellow' ? Colors.amber : Colors.green);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade100),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withValues(alpha: 0.02), blurRadius: 8)
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
                color: Colors.grey.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey.shade100)),
            child: Icon(Icons.set_meal, color: Colors.grey.shade600),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item['ingredient_name'] ?? 'Unknown',
                    style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.black87)),
                const SizedBox(height: 4),
                Text(
                    "Expire: ${(item['expiry_date'] as String?)?.split('T')[0] ?? 'N/A'}",
                    style:
                        TextStyle(fontSize: 12, color: Colors.grey.shade500)),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Container(
                width: 12,
                height: 12,
                decoration: BoxDecoration(
                  color: statusColor,
                  shape: BoxShape.circle,
                  boxShadow: status == 'red'
                      ? [
                          BoxShadow(
                              color: Colors.red.withValues(alpha: 0.5),
                              blurRadius: 8)
                        ]
                      : [],
                ),
              ),
              const SizedBox(height: 8),
              Text(
                  "RM${(item['currency'] as num? ?? 0).toDouble().toStringAsFixed(2)}",
                  style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: Colors.grey.shade700)),
            ],
          )
        ],
      ),
    );
  }

  // ---------- RECIPE LIST VIEW ----------
  Widget _buildRecipeListView() {
    return Scaffold(
      backgroundColor: const Color(0xFFE8F5E9),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
            icon: const Icon(Icons.arrow_back, color: Colors.black87),
            onPressed: () => _changeScreen('inventory')),
        title: const Text('Suggested Recipes',
            style:
                TextStyle(color: Colors.black87, fontWeight: FontWeight.bold)),
      ),
      body: _recipes.isEmpty
          ? Center(
              child: Text('No recipes available.',
                  style: TextStyle(color: Colors.grey.shade600, fontSize: 16)),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _recipes.length,
              itemBuilder: (context, index) {
                final recipe = _recipes[index];
                return _buildRecipeCard(recipe, index);
              },
            ),
    );
  }

  Widget _buildRecipeCard(Map<String, dynamic> recipe, int index) {
    final mealId     = recipe['id']?.toString() ?? index.toString();
    final mealName   = recipe['meal_name'] ?? recipe['name'] ?? 'Recipe ${index + 1}';
    final matchScore = recipe['match_score'] as num? ?? 0;
    final currentRating = _mealRatings[mealId] ?? 0.0;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withValues(alpha: 0.04), blurRadius: 12)
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(mealName,
                    style: const TextStyle(
                        fontSize: 18, fontWeight: FontWeight.bold)),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFD1F2D1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text('${matchScore.toStringAsFixed(0)}% match',
                    style: const TextStyle(
                        color: Color(0xFF1B5E20),
                        fontWeight: FontWeight.w600,
                        fontSize: 12)),
              ),
            ],
          ),
          if (recipe['description'] != null) ...[
            const SizedBox(height: 8),
            Text(recipe['description'],
                style:
                    TextStyle(fontSize: 14, color: Colors.grey.shade600)),
          ],
          const SizedBox(height: 16),

          // ── Star rating row (calls updateMealRating) ──
          Row(
            children: [
              const Text('Rate: ',
                  style: TextStyle(
                      fontSize: 14, fontWeight: FontWeight.w500)),
              ...List.generate(5, (starIndex) {
                final starValue = (starIndex + 1).toDouble();
                return GestureDetector(
                  onTap: () => _submitMealRating(mealId, starValue),
                  child: Icon(
                    currentRating >= starValue
                        ? Icons.star
                        : Icons.star_border,
                    color: Colors.amber,
                    size: 28,
                  ),
                );
              }),
              if (currentRating > 0)
                Padding(
                  padding: const EdgeInsets.only(left: 8),
                  child: Text('$currentRating★',
                      style: const TextStyle(
                          color: Colors.amber,
                          fontWeight: FontWeight.bold)),
                ),
            ],
          ),

          const SizedBox(height: 12),
          // Detail button
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFF1B8E2D),
                side: const BorderSide(color: Color(0xFF1B8E2D)),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: () {
                setState(() {
                  _recipeIndex   = index;
                  _currentScreen = 'recipe_detail';
                });
              },
              child: const Text('View Recipe'),
            ),
          ),
        ],
      ),
    );
  }

  // ---------- RECIPE DETAIL VIEW ----------
  Widget _buildRecipeDetailView() {
    if (_recipes.isEmpty || _recipeIndex >= _recipes.length) {
      return Scaffold(
        appBar: AppBar(
            leading: IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () => _changeScreen('recipe_list'))),
        body: const Center(child: Text('Recipe not found.')),
      );
    }

    final recipe   = _recipes[_recipeIndex];
    final mealId   = recipe['id']?.toString() ?? _recipeIndex.toString();
    final mealName = recipe['meal_name'] ?? recipe['name'] ?? 'Recipe';
    final currentRating = _mealRatings[mealId] ?? 0.0;

    return Scaffold(
      backgroundColor: const Color(0xFFF0F7FF),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
            icon: const Icon(Icons.arrow_back, color: Colors.black87),
            onPressed: () => _changeScreen('recipe_list')),
        title: Text(mealName,
             style: const TextStyle(
                color: Colors.black87, fontWeight: FontWeight.bold)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Ingredients list
            if (recipe['ingredients'] != null) ...[
              const Text('Ingredients',
                  style: TextStyle(
                      fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              Text(recipe['ingredients'].toString(),
                   style:
                      TextStyle(fontSize: 14, color: Colors.grey.shade700)),
              const SizedBox(height: 24),
            ],

            // Instructions
            if (recipe['instructions'] != null) ...[
               const Text('Instructions',
                  style: TextStyle(
                      fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              Text(recipe['instructions'].toString(),
                  style: const TextStyle(fontSize: 14, height: 1.6)),
              const SizedBox(height: 24),
            ],

            // Star rating (also available on detail page)
            const Text('Your Rating',
                style:
                    TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Row(
              children: List.generate(5, (starIndex) {
                final starValue = (starIndex + 1).toDouble();
                return GestureDetector(
                  onTap: () => _submitMealRating(mealId, starValue),
                  child: Icon(
                    currentRating >= starValue
                        ? Icons.star
                        : Icons.star_border,
                    color: Colors.amber,
                    size: 40,
                  ),
                );
              }),
            ),
            if (currentRating > 0)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text('You rated this $currentRating / 5 ⭐',
                     style: const TextStyle(
                        color: Colors.amber,
                        fontWeight: FontWeight.bold)),
              ),
          ],
        ),
      ),
    );
  }

  // ---------- USAGE HISTORY VIEW ----------
  Widget _buildHistoryView() {
    return Scaffold(
      backgroundColor: const Color(0xFFF0F7FF),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
            icon: const Icon(Icons.arrow_back, color: Colors.black87),
            onPressed: () => _changeScreen('inventory')),
        title: const Text('Usage History',
            style: TextStyle(
                color: Colors.black87, fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.black87),
            onPressed: () async {
              setState(() => _isLoading = true);
              try {
                // 6️⃣  Refresh usage history from Supabase
                final history = await SupabaseService.getUsageHistory();
                setState(() => _usageHistory = history);
              } catch (e) {
                 _showError('Failed to refresh history: $e');
              } finally {
                setState(() => _isLoading = false);
              }
            },
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _usageHistory.isEmpty
              ? Center(
                  child: Text('No usage history yet.',
                      style: TextStyle(
                          color: Colors.grey.shade600, fontSize: 16)),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _usageHistory.length,
                  itemBuilder: (context, index) {
                    final entry = _usageHistory[index];
                    return _buildHistoryEntry(entry);
                  },
                ),
    );
  }

  Widget _buildHistoryEntry(Map<String, dynamic> entry) {
    final action = entry['action'] ?? entry['type'] ?? 'Activity';
    final detail = entry['detail'] ?? entry['description'] ?? '';
    final dateStr = (entry['created_at'] as String?)?.split('T')[0] ?? '';
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.grey.shade100),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
             decoration: BoxDecoration(
              color: Colors.blue.shade50,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(Icons.receipt_long,
                color: Colors.blue.shade400, size: 20),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(action,
                    style: const TextStyle(
                         fontWeight: FontWeight.bold, fontSize: 14)),
                if (detail.isNotEmpty)
                  Text(detail,
                      style: TextStyle(
                          fontSize: 12, color: Colors.grey.shade500)),
              ],
            ),
          ),
          Text(dateStr,
              style: TextStyle(fontSize: 11, color: Colors.grey.shade400)),
        ],
      ),
    );
  }

  // ---------- INPUT (SCAN RECEIPT) VIEW ----------
  Widget _buildInputView() {
    // State A: image selected, waiting to extract (or currently extracting)
    if (_selectedImage != null && _extractedText.isEmpty) {
      return Scaffold(
        backgroundColor: const Color(0xFFE8F5E9),
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          leading: IconButton(
               icon: const Icon(Icons.arrow_back, color: Colors.black87),
              onPressed: () {
                setState(() {
                  _selectedImage      = null;
                  _selectedImageBytes = null;
                  _extractedText      = '';
                });
                _changeScreen('inventory');
              }),
        ),
        body: Padding(
          padding: const EdgeInsets.all(24),
           child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const Text('Receipt Preview',
                  style: TextStyle(
                      fontSize: 20, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: kIsWeb
                    ? Image.memory(
                        _selectedImageBytes!,
                        height: 300,
                        width: double.infinity,
                        fit: BoxFit.cover,
                      )
                    : Image.file(
                        File(_selectedImage!.path),
                        height: 300,
                        width: double.infinity,
                        fit: BoxFit.cover,
                      ),
              ),
              const SizedBox(height: 24),
               _isProcessing
                  ? const Column(children: [
                      CircularProgressIndicator(),
                      SizedBox(height: 16),
                      Text('Extracting text from receipt...')
                    ])
                  : ElevatedButton.icon(
                      onPressed: _uploadAndExtractReceipt,
                      icon: const Icon(Icons.cloud_upload),
                      label: const Text('Extract Text',
                          style: TextStyle(fontSize: 16)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF2E7D32),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(
                            horizontal: 32, vertical: 16),
                      ),
                    ),
            ],
          ),
        ),
      );
    }

    if (_extractedText.isNotEmpty) {
      return Scaffold(
        backgroundColor: const Color(0xFFE8F5E9),
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          leading: IconButton(
              icon: const Icon(Icons.arrow_back, color: Colors.black87),
              onPressed: () {
                setState(() {
                  _selectedImage      = null;
                  _selectedImageBytes = null;
                  _extractedText      = '';
                });
                _changeScreen('inventory');
              }),
        ),
        body: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Extracted Text',
                  style: TextStyle(
                      fontSize: 20, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.grey.shade300),
                  ),
                  child: SingleChildScrollView(
                    child: Text(_extractedText,
                        style: const TextStyle(fontSize: 14)),
                   ),
                ),
              ),
              const SizedBox(height: 24),
              _isProcessing
                  ? const Center(child: CircularProgressIndicator())
                  : SizedBox(
                      width: double.infinity,
                      height: 56,
                      child: ElevatedButton.icon(
                        onPressed: _parseAndSaveReceipt,
                        icon: const Icon(Icons.save),
                        label: const Text('Save to Inventory',
                            style: TextStyle(fontSize: 16)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF1B8E2D),
                          foregroundColor: Colors.white,
                        ),
                      ),
                    ),
            ],
          ),
        ),
      );
    }

    // Initial scan options
    return Scaffold(
      backgroundColor: const Color(0xFFE8F5E9),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
            icon: const Icon(Icons.arrow_back, color: Colors.black87),
            onPressed: () => _changeScreen('inventory')),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            _buildInputButton("Scan Receipt - Camera", Icons.camera_alt,
                () => _pickImage(ImageSource.camera)),
            const SizedBox(height: 16),
            _buildInputButton("Scan Receipt - Gallery", Icons.image,
                () => _pickImage(ImageSource.gallery)),
            const SizedBox(height: 16),
            _buildInputButton("Snap Fridge", Icons.kitchen,
                () => _showError('Feature coming soon!')),
            const SizedBox(height: 16),
            _buildInputButton("Add Manually", Icons.edit,
                () => _showError('Feature coming soon!')),
          ],
        ),
      ),
    );
  }

  Widget _buildInputButton(String text, IconData icon, VoidCallback onPressed) {
    return SizedBox(
      width: double.infinity,
      height: 70,
      child: ElevatedButton.icon(
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF4CAF50),
          shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16)),
          alignment: Alignment.centerLeft,
           padding: const EdgeInsets.symmetric(horizontal: 24),
        ),
        icon: Icon(icon, color: Colors.white, size: 28),
        label: Text("   $text",
            style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: Colors.white)),
        onPressed: onPressed,
      ),
    );
  }

  // ─────────────────────────────────────────────
  // BUILD — route all screens
  // ─────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    switch (_currentScreen) {
      case 'login':
        return _buildLoginView();
      case 'input':
        return _buildInputView();
      case 'recipe_list':
        return _buildRecipeListView();
      case 'recipe_detail':
        return _buildRecipeDetailView();
      case 'history':
        return _buildHistoryView();
      case 'inventory':
      default:
        return _buildInventoryView();
    }
  }
}