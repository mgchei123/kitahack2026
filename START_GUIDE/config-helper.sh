#!/bin/bash

# config-helper.sh - Interactive configuration helper

echo "🔧 Configuration Helper for KitaHack 2026"
echo "==========================================="
echo ""

# Get Supabase URL
read -p "Enter your Supabase URL: " SUPABASE_URL

# Get Supabase Anon Key
read -p "Enter your Supabase Anon Key: " SUPABASE_ANON_KEY

# Get Gemini API Key
read -p "Enter your Gemini API Key: " GEMINI_API_KEY

# Create environment.ts file
cat > BIW/src/environments/environment.ts <<EOF
export const environment = {
  production: false,
  supabase: {
    url: '${SUPABASE_URL}',
    anonKey: '${SUPABASE_ANON_KEY}',
  },
  geminiApiKey: "${GEMINI_API_KEY}",
   
  ai: {
    ocrEndpoint: '${SUPABASE_URL}/functions/v1/ocr',
    classificationEndpoint: '${SUPABASE_URL}/functions/v1/classify-items',
    mealRecommendationEndpoint: '${SUPABASE_URL}/functions/v1/meal-recommendation'
  }
};
EOF

echo ""
echo "✅ Configuration file created at: BIW/src/environments/environment.ts"
echo "🎉 You're ready to run the project!"
echo ""
echo "Next steps:"
echo "  cd BIW"
echo "  npm start"