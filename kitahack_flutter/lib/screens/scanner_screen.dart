import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../main.dart';

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
      
      if (image == null) {
        setState(() => _isProcessing = false);
        return; 
      }

      final Uint8List imageBytes = await image.readAsBytes();
      final String userId = supabase.auth.currentUser!.id;
      
      // ✅ FIXED PATH: No double "receipts/" prefix here!
      final String path = '$userId/${DateTime.now().millisecondsSinceEpoch}.jpg';

      // 1. Upload to Storage
      await supabase.storage.from('receipts').uploadBinary(
        path,
        imageBytes,
        fileOptions: const FileOptions(cacheControl: '3600', upsert: false),
      );

      // 2. Create Receipt Record with 'pending' status
      await supabase.from('receipts').insert({
        'user_id': userId,
        'image_url': path,
        'processing_status': 'pending',
      });

      // 3. Trigger OCR Edge Function
      final response = await supabase.functions.invoke(
        'ocr', 
        body: {'imagePath': path}
      );

      setState(() {
        _ocrResult = response.data['text'] ?? "Processing completed, but no text returned.";
      });

    // ✅ FIXED CATCH BLOCKS: Proper Dart syntax
    } on AuthException catch (e) {
      _showError("Auth Error: ${e.message}");
    } on StorageException catch (e) {
      _showError("Storage Error: ${e.message}");
    } on FunctionException catch (e) {
      _showError("Edge Function Error: ${e.reasonPhrase}");
    } catch (e) {
      _showError("Unexpected error: $e");
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

  // --- UI/UX Requirement: Processing Animation ---
  Widget _buildProcessingOverlay() {
    if (!_isProcessing) return const SizedBox.shrink();

    return Container(
      color: Colors.black.withValues(alpha: 0.6), // Darken the background
      child: Center(
        child: Card(
          elevation: 8,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: Padding(
            padding: const EdgeInsets.all(32.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const SizedBox(
                  width: 60,
                  height: 60,
                  child: CircularProgressIndicator(
                    color: Color(0xFF2E7D32), // Kitchen Green
                    strokeWidth: 6,
                  ),
                ),
                const SizedBox(height: 24),
                const Text(
                  'AI is analyzing your receipt...',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  'Extracting items and quantities 🧠',
                  style: TextStyle(fontSize: 14, color: Colors.grey.shade600),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: 200,
                  child: LinearProgressIndicator(
                    backgroundColor: Colors.grey.shade200,
                    color: const Color(0xFF2E7D32),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Scan Receipt'),
        backgroundColor: const Color(0xFF2E7D32), // Kitchen Green
        foregroundColor: Colors.white,
      ),
      body: Stack(
        children: [
          Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
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
                        _ocrResult,
                        style: const TextStyle(fontSize: 16),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                SizedBox(
                  height: 60,
                  child: ElevatedButton.icon(
                    onPressed: _isProcessing ? null : _processReceipt,
                    icon: const Icon(Icons.camera_alt, size: 28),
                    label: const Text('Capture / Upload Receipt', style: TextStyle(fontSize: 18)),
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
          _buildProcessingOverlay(),
        ],
      ),
    );
  }
}