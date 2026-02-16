/**
 * API Contract between Backend and AI Engineer
 * AI Engineer should implement these endpoints
 */

export interface OCRRequest {
  image_url: string;
}

export interface OCRResponse {
  raw_text: string;
  confidence: number;
}

export interface ClassificationRequest {
  items: string[];
}

export interface ClassificationResponse {
  cookable: Array<{
    name: string;
    category: string; // 'vegetable', 'protein', 'dairy', etc.
    confidence: number;
  }>;
  non_cookable: Array<{
    name: string;
    category: string; // 'toiletry', 'household', etc.
    confidence: number;
  }>;
}

export interface MealRecommendationRequest {
  available_ingredients: string[];
  preferences?: {
    cuisine_type?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    max_prep_time?: number;
  };
}

export interface MealRecommendationResponse {
  meals: Array<{
    name: string;
    description: string;
    matched_ingredients: string[];
    missing_ingredients: string[];
    match_score: number;
    recipe_instructions: string;
    prep_time: number;
    cook_time: number;
    difficulty: string;
    cuisine_type: string;
  }>;
}