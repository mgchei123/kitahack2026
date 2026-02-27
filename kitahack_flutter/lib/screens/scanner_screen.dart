import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class ScannerScreen extends StatefulWidget {
  const ScannerScreen({super.key});

  @override
  State<ScannerScreen> createState() => _ScannerScreenState();
}

class _ScannerScreenState extends State<ScannerScreen> {
  final supabase = Supabase.instance.client;
  bool _isLoading = false;
  
  // Variables for the image picker
  XFile? _imageFile;
  final ImagePicker _picker = ImagePicker();

  // Function to open Camera or Gallery
  Future<void> _pickImage(ImageSource source) async {
    try {
      final pickedFile = await _picker.pickImage(source: source);
      if (pickedFile != null) {
        setState(() {
          _imageFile = pickedFile;
        });
      }
    } catch (e) {
      debugPrint("❌ Error picking image: $e");
    }
  }

  // The magic function to process the receipt and save to database
  Future<void> _processAndSaveReceipt(List<String> rawItemsFromScanner) async {
    setState(() {
      _isLoading = true;
    });

    try {
      final userId = supabase.auth.currentUser?.id;
      if (userId == null) {
        debugPrint("🚨 User ID not found, please login as Guest again.");
        return;
      }

      debugPrint("🚀 Sending data to Supabase Edge Function: classify-items...");
      
      final response = await supabase.functions.invoke(
        'classify-items', 
        body: {'items': rawItemsFromScanner},
      );

      final cookableItems = response.data['cookable'] as List<dynamic>;

      for (var item in cookableItems) {
        await supabase.from('user_inventory').insert({
          'user_id': userId,
          'ingredient_name': item['name'],       
          'category': item['category'],          
          'source': 'receipt',                   
          'is_available': true,                  
          'currency': 5.50 + (item['name'].toString().length % 10), 
          'expiry_date': DateTime.now().add(const Duration(days: 3)).toIso8601String(), 
        });
      }

      debugPrint("✅ Success! Items saved to database!");
      
      if (mounted) {
        Navigator.pop(context); 
      }

    } catch (e) {
      debugPrint("❌ Failed to process receipt: $e");
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false; 
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Scan Receipt"),
        backgroundColor: const Color(0xFF1B4332),
        foregroundColor: Colors.white,
      ),
      body: Center(
        child: _isLoading 
          ? const Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                CircularProgressIndicator(color: Color(0xFF1B4332)),
                SizedBox(height: 16),
                Text("AI is sorting your food... Please wait!")
              ],
            )
          : SingleChildScrollView(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // 1. Show Image Preview OR Placeholder Icon
                  if (_imageFile != null)
                    Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: kIsWeb 
                          ? Image.network(_imageFile!.path, height: 300, fit: BoxFit.cover)
                          : Image.file(File(_imageFile!.path), height: 300, fit: BoxFit.cover),
                      ),
                    )
                  else
                    const Column(
                      children: [
                        Icon(Icons.receipt_long, size: 100, color: Colors.grey),
                        SizedBox(height: 20),
                        Text("Please upload a receipt", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  
                  const SizedBox(height: 30),

                  // 2. Buttons to Pick Image
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      ElevatedButton.icon(
                        icon: const Icon(Icons.camera_alt),
                        label: const Text("Camera"),
                        onPressed: () => _pickImage(ImageSource.camera),
                      ),
                      const SizedBox(width: 16),
                      ElevatedButton.icon(
                        icon: const Icon(Icons.photo_library),
                        label: const Text("Gallery"),
                        onPressed: () => _pickImage(ImageSource.gallery),
                      ),
                    ],
                  ),

                  const SizedBox(height: 40),
                  
                  // 3. The Confirm Button (Only shows up AFTER you pick an image)
                  if (_imageFile != null)
                    ElevatedButton.icon(
                      icon: const Icon(Icons.check),
                      label: const Text("Confirm & Add to Fridge"),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF2D6A4F),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                      ),
                      onPressed: () async {
  setState(() {
    _isLoading = true; // Show loading spinner
  });

  try {
    debugPrint("⬆️ 1. Uploading image to Supabase Storage...");
    
    // Convert image to bytes
    final bytes = await _imageFile!.readAsBytes();
    final fileExt = _imageFile!.name.split('.').last;
    final fileName = '${DateTime.now().millisecondsSinceEpoch}.$fileExt';

    // 🚨 CRITICAL: We upload the image to a Supabase storage bucket named 'receipts'
    await supabase.storage.from('receipts').uploadBinary(fileName, bytes);
    
    // Get the public URL of the uploaded image
    final imageUrl = supabase.storage.from('receipts').getPublicUrl(fileName);
    debugPrint("✅ Image uploaded! URL: $imageUrl");

    debugPrint("🔍 2. Calling OCR Edge Function...");
    
    // Call the OCR function using the exact parameter your teammate set: 'image_url'
    final ocrResponse = await supabase.functions.invoke(
      'ocr', 
      body: {'image_url': imageUrl}, 
    );

    // Get the giant block of text from the OCR response
    final String rawText = ocrResponse.data['raw_text'] ?? "";

    if (rawText.trim().isEmpty) {
      debugPrint("⚠️ OCR could not read any text!");
      setState(() { _isLoading = false; });
      return;
    }

    debugPrint("✂️ 3. Formatting OCR text for Classification...");
    
    // Split the giant text block into an array of individual lines
    List<String> realScannedWords = rawText
        .split('\n')
        .map((line) => line.trim())
        .where((line) => line.isNotEmpty) // Remove empty lines
        .toList();

    debugPrint("🚀 4. Sending ${realScannedWords.length} lines to Classification AI...");
    
    // Pass the real array of words to the database function!
    await _processAndSaveReceipt(realScannedWords);

  } catch (e) {
    debugPrint("❌ Full Pipeline Failed: $e");
    setState(() {
      _isLoading = false;
    });
  }
},
                    )
                ],
              ),
            ),
      ),
    );
  }
}