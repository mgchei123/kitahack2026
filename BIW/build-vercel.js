const fs = require('fs');
const path = require('path');

// Read environment variables from Vercel
const environmentContent = `
export const environment = {
  production: true,
  supabase: {
    url: '${process.env.SUPABASE_URL || ''}',
    anonKey: '${process.env.SUPABASE_ANON_KEY || ''}',
  },
  geminiApiKey: '${process.env.GEMINI_API_KEY || ''}',
  
  ai: {
    ocrEndpoint: '${process.env.SUPABASE_URL || ''}/functions/v1/ocr',
    classificationEndpoint: '${process.env.SUPABASE_URL || ''}/functions/v1/classify-items',
    mealRecommendationEndpoint: '${process.env.SUPABASE_URL || ''}/functions/v1/meal-recommendation'
  }
};
`;

// Write to production environment file
fs.writeFileSync(
  path.join(__dirname, 'src/environments/environment.prod.ts'),
  environmentContent
);

console.log('✅ Environment file generated successfully!');