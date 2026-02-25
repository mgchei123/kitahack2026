import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'screens/login_screen.dart';

// Global variable to access Supabase client from anywhere
final supabase = Supabase.instance.client;

void main() async {
  // Ensure Flutter engine bindings are fully initialized
  WidgetsFlutterBinding.ensureInitialized();

  // 1. Load the secure environment variables from .env file
  await dotenv.load(fileName: ".env");

  // 2. Initialize the Supabase backend connection using the keys
  await Supabase.initialize(
    url: dotenv.env['SUPABASE_URL']!,
    anonKey: dotenv.env['SUPABASE_ANON_KEY']!,
  );

  // 3. Launch the App
  runApp(const SmartReceiptApp());
}

class SmartReceiptApp extends StatelessWidget {
  const SmartReceiptApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'KitaHack Receipt Planner',
      theme: ThemeData(
        // Using the Kitchen Green primary color #2E7D32 specified in the Guide
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF2E7D32)), 
        useMaterial3: true,
      ),
      home: const LoginScreen(),
    );
  }
}