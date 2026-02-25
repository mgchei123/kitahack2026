export const environment = {
  production: false,
  supabase: {
    url: 'your url', // From Step 2
    anonKey: 'public anonkey', // From Step 2, fyi this is the public anon key, not the service role key
  },
  geminiApiKey: "yor api key",
   
  // AI Engineer's endpoints (to be provided)
  ai: {
    ocrEndpoint: 'https://your-ai-api.com/ocr',
    classificationEndpoint: 'https://your-ai-api.com/classify',
    mealRecommendationEndpoint: 'https://your-ai-api.com/recommend'
  }
};

