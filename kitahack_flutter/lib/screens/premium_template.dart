import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../main.dart';
import '../services/supabase_service.dart';

class PremiumTemplate extends StatefulWidget {
  const PremiumTemplate({super.key});

  @override
  State<PremiumTemplate> createState() => _PremiumTemplateState();
}

class _PremiumTemplateState extends State<PremiumTemplate> {
  // --- STATE MANAGEMENT ---
  String _currentScreen = 'login';
  int _recipeIndex = 0;
  bool _notificationsOn = true;
  bool _isLoading = false;
  bool _isProcessing = false;

  // Image picker
  final ImagePicker _picker = ImagePicker();
  XFile? _selectedImage;
  String _extractedText = '';

  // Data from Supabase
  List<Map<String, dynamic>> _inventory = [];
  List<Map<String, dynamic>> _recipes = [];
  List<Map<String, dynamic>> _alerts = [];

  @override
  void initState() {
    super.initState();
    _checkAuthAndLoad();
  }

  Future<void> _checkAuthAndLoad() async {
    try {
      final user = supabase.auth.currentUser;
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
      final user = supabase.auth.currentUser;
      if (user == null) {
        throw Exception('User not authenticated. Please log in first.');
      }

      if (kDebugMode) print('📥 Loading data for user: ${user.id}');

      final inventory = await SupabaseService.getUserInventory();
      final recipes = await SupabaseService.getMealRecommendations();
      final alerts = await SupabaseService.getExpiryAlerts();

      setState(() {
        _inventory = inventory;
        _recipes = recipes;
        _alerts = alerts;
      });

      if (kDebugMode) {
        print('✅ Loaded ${inventory.length} inventory items');
        print('✅ Loaded ${recipes.length} recipes');
      }
    } catch (e) {
      if (kDebugMode) print('❌ Error loading data: $e');
      _showError('Failed to load data: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _changeScreen(String screen) {
    setState(() => _currentScreen = screen);
  }

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

  // --- PICK IMAGE FROM CAMERA OR GALLERY ---
  Future<void> _pickImage(ImageSource source) async {
    try {
      final pickedFile = await _picker.pickImage(source: source);
      if (pickedFile != null) {
        setState(() {
          _selectedImage = pickedFile;
          _extractedText = '';
        });
        if (kDebugMode) print('📸 Image picked: ${pickedFile.path}');
      }
    } catch (e) {
      _showError('Error picking image: $e');
    }
  }

  // --- UPLOAD IMAGE AND EXTRACT TEXT ---
  Future<void> _uploadAndExtractReceipt() async {
    if (_selectedImage == null) {
      _showError('Please select an image first');
      return;
    }

    setState(() => _isProcessing = true);

    try {
      final userId = supabase.auth.currentUser?.id;
      if (userId == null) {
        throw Exception('User not authenticated');
      }

      if (kDebugMode) print('🔄 Uploading image to Supabase Storage...');

      // Upload image to Supabase Storage
      final fileName =
          'receipts/$userId/${DateTime.now().millisecondsSinceEpoch}.jpg';
      final imageBytes = await _selectedImage!.readAsBytes();

      await supabase.storage.from('receipts').uploadBinary(fileName, imageBytes);

      // Get public URL
      final imageUrl =
          supabase.storage.from('receipts').getPublicUrl(fileName);

      if (kDebugMode) print('✅ Image uploaded: $imageUrl');
      if (kDebugMode) print('🤖 Calling OCR function...');

      // Call OCR function to extract text
      final extractedText =
          await SupabaseService.extractReceiptText(imageUrl);

      setState(() {
        _extractedText = extractedText;
      });

      if (kDebugMode) print('📝 Extracted text:\n$_extractedText');

      _showSuccess('Receipt text extracted successfully!');
    } catch (e) {
      if (kDebugMode) print('❌ Error extracting receipt: $e');
      _showError('Failed to extract receipt: $e');
    } finally {
      setState(() => _isProcessing = false);
    }
  }

  // --- PARSE EXTRACTED TEXT AND SAVE TO INVENTORY ---
  Future<void> _parseAndSaveReceipt() async {
    if (_extractedText.isEmpty) {
      _showError('Please extract receipt text first');
      return;
    }

    setState(() => _isProcessing = true);

    try {
      if (kDebugMode) print('🔄 Parsing receipt...');

      // Parse the extracted text
      final items = await SupabaseService.parseReceipt(_extractedText);

      if (kDebugMode) print('✅ Parsed ${items.length} items');

      // Classify items
      final itemNames =
          items.map((item) => item['name'] as String).toList();
      final classifiedResult =
          await SupabaseService.classifyItems(itemNames);

      final cookableItems = classifiedResult['cookable'] as List<dynamic>? ?? [];

      if (kDebugMode) print('🍳 Found ${cookableItems.length} cookable items');

      // Save items to inventory
      int savedCount = 0;
      for (var item in cookableItems) {
        try {
          await SupabaseService.saveInventoryItem(
            ingredientName: item['name'] ?? 'Unknown',
            category: item['category'] ?? 'Other',
            expiryDate: DateTime.now().add(const Duration(days: 7)),
            price: (item['price'] as num?)?.toDouble() ?? 0.0,
            source: 'receipt',
          );
          savedCount++;
        } catch (e) {
          if (kDebugMode) print('⚠️ Failed to save item: $e');
        }
      }

      if (kDebugMode) print('✅ Saved $savedCount items to inventory');

      _showSuccess('Saved $savedCount items to inventory!');

      // Reload inventory
      await _loadData();

      // Clear and go back
      setState(() {
        _selectedImage = null;
        _extractedText = '';
        _currentScreen = 'inventory';
      });
    } catch (e) {
      if (kDebugMode) print('❌ Error parsing receipt: $e');
      _showError('Failed to parse receipt: $e');
    } finally {
      setState(() => _isProcessing = false);
    }
  }

  // --- SIGN IN ANONYMOUSLY ---
  Future<void> _signInAnonymously() async {
    setState(() => _isLoading = true);

    try {
      await supabase.auth.signInAnonymously();

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
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  // --- LOGIN VIEW ---
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
                const Text("BeforeItWastes",
                    style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF1B5E20))),
                const SizedBox(height: 8),
                Text("Sync Your Fridge",
                    style: TextStyle(color: Colors.grey.shade500)),
                const SizedBox(height: 40),
                _buildTextField("Email Address", obscureText: false),
                const SizedBox(height: 20),
                _buildTextField("Password", obscureText: true),
                const SizedBox(height: 40),
                _isLoading
                    ? const CircularProgressIndicator()
                    : SizedBox(
                        width: double.infinity,
                        height: 56,
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF1B8E2D),
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16)),
                            elevation: 0,
                          ),
                          onPressed: _signInAnonymously,
                          child: const Text("Sign In",
                              style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white)),
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

  // --- INVENTORY VIEW ---
  Widget _buildInventoryView() {
    double totalRisk = _inventory.fold(0, (sum, item) {
      try {
        final expiryDateStr = item['expiry_date'] as String?;
        if (expiryDateStr == null) return sum as double;

        final expiryDate = DateTime.parse(expiryDateStr);
        final warningDate = DateTime.now().add(const Duration(days: 3));

        if (expiryDate.isBefore(warningDate)) {
          return sum + (item['currency'] as double? ?? 0);
        }
        return sum as double;
      } catch (e) {
        return sum as double;
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
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text("Inventory",
                              style: TextStyle(
                                  fontSize: 28,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.black87)),
                          Row(
                            children: [
                              _buildIconButton(
                                  _notificationsOn
                                      ? Icons.notifications_none
                                      : Icons.notifications_off_outlined,
                                  () {
                                setState(() =>
                                    _notificationsOn = !_notificationsOn);
                              }),
                              const SizedBox(width: 12),
                              _buildIconButton(Icons.menu, () {
                                setState(() => _currentScreen = 'login');
                              }),
                            ],
                          )
                        ],
                      ),
                      const SizedBox(height: 24),
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
                                style:
                                    TextStyle(color: Colors.green.shade800)),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),
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
                              'No items in inventory. Tap the + button to add items!',
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
                      child: const Icon(Icons.add,
                          color: Colors.white, size: 28),
                    ),
                  ),
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
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 10)
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
              color: Colors.black.withValues(alpha: 0.02),
              blurRadius: 8)
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
                    style: TextStyle(
                        fontSize: 12, color: Colors.grey.shade500)),
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
              Text("RM${(item['currency'] as double? ?? 0).toStringAsFixed(2)}",
                  style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: Colors.grey.shade700)),
            ],
          )
        ],
      ),
    );
  }

  // --- INPUT VIEW (SCAN RECEIPT) ---
  Widget _buildInputView() {
    if (_selectedImage != null && _extractedText.isEmpty && !_isProcessing) {
      // Show image preview and extraction options
      return Scaffold(
        backgroundColor: const Color(0xFFE8F5E9),
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          leading: IconButton(
              icon: const Icon(Icons.arrow_back, color: Colors.black87),
              onPressed: () {
                setState(() {
                  _selectedImage = null;
                  _extractedText = '';
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
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: Image.file(
                  File(_selectedImage!.path),
                  height: 300,
                  width: double.infinity,
                  fit: BoxFit.cover,
                ),
              ),
              const SizedBox(height: 24),
              _isProcessing
                  ? const Column(
                      children: [
                        CircularProgressIndicator(),
                        SizedBox(height: 16),
                        Text('Extracting text from receipt...')
                      ],
                    )
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
      // Show extracted text and save options
      return Scaffold(
        backgroundColor: const Color(0xFFE8F5E9),
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          leading: IconButton(
              icon: const Icon(Icons.arrow_back, color: Colors.black87),
              onPressed: () {
                setState(() {
                  _selectedImage = null;
                  _extractedText = '';
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
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
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

    // Initial input view - choose how to add items
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
            _buildInputButton("Scan Receipt - Camera", Icons.camera_alt, () {
              _pickImage(ImageSource.camera);
            }),
            const SizedBox(height: 16),
            _buildInputButton("Scan Receipt - Gallery", Icons.image, () {
              _pickImage(ImageSource.gallery);
            }),
            const SizedBox(height: 16),
            _buildInputButton("Snap Fridge", Icons.kitchen, () {
              _showError('Feature coming soon!');
            }),
            const SizedBox(height: 16),
            _buildInputButton("Add Manually", Icons.edit, () {
              _showError('Feature coming soon!');
            }),
          ],
        ),
      ),
    );
  }

  Widget _buildInputButton(
      String text, IconData icon, VoidCallback onPressed) {
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
                fontSize: 16, fontWeight: FontWeight.w600, color: Colors.white)),
        onPressed: onPressed,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    switch (_currentScreen) {
      case 'login':
        return _buildLoginView();
      case 'input':
        return _buildInputView();
      case 'inventory':
      default:
        return _buildInventoryView();
    }
  }
}