import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'screens/premium_template.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart'; // Add this import
// Global Supabase client — imported by supabase_service.dart and premium_template.dart
final supabase = Supabase.instance.client;

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Supabase.initialize(
    url:dotenv.env['SUPABASE_URL'] ?? '',      // 🔑 Replace with your project URL
    anonKey: dotenv.env['SUPABASE_ANON_KEY'] ?? '', // 🔑 Replace with your anon key
  );

  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'BeforeItWastes',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF1B8E2D)),
        useMaterial3: true,
      ),
      home: const PremiumTemplate(),
    );
  }
}