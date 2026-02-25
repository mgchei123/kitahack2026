import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../main.dart'; // Import the global supabase client

class ScannerScreen extends StatefulWidget {
  const ScannerScreen({super.key});

  @override
  State<ScannerScreen> createState() => _ScannerScreenState();
}

class _ScannerScreenState extends State<ScannerScreen> {
  bool _isProcessing = false;
  String _ocrResult = "No receipt scanned yet.";

  // Core function: Pick image -> Upload to Storage -> Trigger Edge Function
  Future<void> _processReceipt() async {
    setState(() => _isProcessing = true);
    
    try {
    final ImagePicker picker = ImagePicker();
    final XFile? image = await picker.pickImage(source: ImageSource.camera);
    if (image == null) return;

    // Naming Policy: ${userId}/${timestamp}.jpg
    final String userId = supabase.auth.currentUser!.id;
    final String path = 'receipts/$userId/${DateTime.now().millisecondsSinceEpoch}.jpg';

    // 1. Upload to Storage
    // Note: Ensure your teammate fixed RLS for this to work
    final Uint8List imageBytes = await image.readAsBytes();
    await supabase.storage.from('receipts').uploadBinary(
      path,
      imageBytes,
      fileOptions: const FileOptions(cacheControl: '3600', upsert: false), //
    );

    // 2. Create Receipt Record with 'pending' status
    await supabase.from('receipts').insert({
      'user_id': userId,
      'image_url': path,
      'processing_status': 'pending',
    });

    // 3. Trigger OCR Edge Function
    final res = await supabase.functions.invoke('ocr', body: {'imagePath': path});
    
    setState(() => _ocrResult = res.data['text']);
    
  } on AuthException catch (e) {
    _showError(e.message); //
  } catch (e) {
    _showError("Unexpected error occurred. Please try again."); //
  } finally {
    setState(() => _isProcessing = false);
  }
}

  void _showError(String message) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(message), backgroundColor: Colors.red)
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Receipt Scanner'),
        backgroundColor: const Color(0xFF2E7D32),
        foregroundColor: Colors.white,
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // OCR Result Display Area
            Expanded(
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey.shade300),
                ),
                child: SingleChildScrollView(
                  child: Text(
                    _isProcessing 
                        ? "🧠 Analyzing receipt via AI...\nThis might take a few seconds." 
                        : _ocrResult,
                    style: const TextStyle(fontSize: 16),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 24),
            
            // Scan Button
            SizedBox(
              height: 60,
              child: ElevatedButton.icon(
                onPressed: _isProcessing ? null : _processReceipt,
                icon: _isProcessing 
                    ? const SizedBox(
                        width: 24, 
                        height: 24, 
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)
                      )
                    : const Icon(Icons.camera_alt, size: 28),
                label: Text(
                  _isProcessing ? 'Processing...' : 'Capture / Upload Receipt', 
                  style: const TextStyle(fontSize: 18)
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF2E7D32),
                  foregroundColor: Colors.white,
                  disabledBackgroundColor: Colors.grey,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}