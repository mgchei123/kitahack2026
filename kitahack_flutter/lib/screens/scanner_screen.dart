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
      // 1. Pick an image (Opens file picker on Web, Camera on Mobile)
      final ImagePicker picker = ImagePicker();
      final XFile? image = await picker.pickImage(source: ImageSource.camera);
      
      if (image == null) {
        setState(() => _isProcessing = false);
        return; // User canceled the picker
      }

      // 2. Prepare for upload (Convert to bytes for Web compatibility)
      final Uint8List imageBytes = await image.readAsBytes();
      final String userId = supabase.auth.currentUser!.id;
      final String timestamp = DateTime.now().millisecondsSinceEpoch.toString();
      
      // Define the storage path based on the Guide
      final String storagePath = 'receipts/$userId/$timestamp.jpg';

      // 3. Upload to Supabase 'receipts' bucket
      await supabase.storage.from('receipts').uploadBinary(
        storagePath,
        imageBytes,
        fileOptions: const FileOptions(contentType: 'image/jpeg'),
      );

      // 4. Invoke the Edge Function for OCR
      final response = await supabase.functions.invoke(
        'ocr', 
        body: {'imagePath': storagePath}
      );

      // 5. Update UI with the AI extracted text
      setState(() {
        _ocrResult = response.data['text'] ?? "Processing completed, but no text returned.";
      });

    } on FunctionException catch (e) {
      _showError("OCR Processing Failed: ${e.reasonPhrase}");
    } on StorageException catch (e) {
      _showError("Image Upload Failed: ${e.message}");
    } catch (e) {
      _showError("An unexpected error occurred: $e");
    } finally {
      if (mounted) {
        setState(() => _isProcessing = false);
      }
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