import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hackathon-key',
}

// Function to get meal image from Unsplash
async function getMealImage(mealName: string): Promise<string> {
  try {
    const query = encodeURIComponent(mealName + ' food');
    const unsplashUrl = `https://source.unsplash.com/400x300/?${query}`;
    return unsplashUrl;
  } catch (error) {
    console.error('❌ Failed to get meal image:', error);
    return 'https://source.unsplash.com/400x300/?food,meal';
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🍽️ Meal Recommendation Request received')
    
    // Auth validation
    const authHeader = req.headers.get('Authorization')
    const masterKey = req.headers.get('x-hackathon-key');

    let user;

    // Try to get real user first
    if (authHeader) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      
      if (!supabaseUrl || !supabaseServiceKey) {
        console.error('❌ Missing Supabase credentials')
        return new Response(
          JSON.stringify({ error: 'Server configuration error' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
      const token = authHeader.replace('Bearer ', '')
      const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token)

      if (authUser && !authError) {
        user = authUser;
        console.log('✅ Using authenticated user:', user.id)
      } else {
        console.log('⚠️ Auth error:', authError)
      }
    }

    // Fallback to test user if master key provided
    if (!user && masterKey === "my-secret-demo-key") {
      user = { id: '00000000-0000-0000-0000-000000000000' };
      console.log('⚠️ Using test user ID')
    }

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('👤 User ID:', user.id)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Get request parameters
    const { receipt_id, max_meals = 3 } = await req.json()

    console.log('🔍 Fetching inventory for user:', user.id)

    // Fetch user's available inventory
    const { data: inventory, error: inventoryError } = await supabaseAdmin
      .from('user_inventory')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_available', true)
      .order('expiry_date', { ascending: true, nullsLast: true })

    if (inventoryError) {
      console.error('❌ Failed to fetch inventory:', inventoryError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch inventory', details: inventoryError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('📦 Inventory items found:', inventory?.length || 0)

    if (!inventory || inventory.length === 0) {
      console.log('⚠️ No inventory items found for user:', user.id)
      return new Response(
        JSON.stringify({ 
          error: 'No available ingredients in inventory',
          user_id: user.id,
          recommendations: []
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('📦 First 3 items:', inventory.slice(0, 3).map(i => ({ name: i.ingredient_name, user_id: i.user_id })))

    // Prioritize expiring items
    const now = new Date()
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    
    const expiringItems = inventory.filter(item => {
      if (!item.expiry_date) return false
      const expiryDate = new Date(item.expiry_date)
      return expiryDate <= threeDaysFromNow
    })

    console.log('⚠️ Expiring items (within 3 days):', expiringItems.length)

    // Format inventory for AI
    const inventoryList = inventory.map(item => ({
      name: item.ingredient_name,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category,
      expiring_soon: expiringItems.some(e => e.id === item.id)
    }))

    // Get Gemini API credentials
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    const GEMINI_MODEL = 'gemini-2.5-flash'

    if (!GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY not configured')
      return new Response(
        JSON.stringify({ error: 'Meal recommendation service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🔑 Gemini API Key present:', !!GEMINI_API_KEY)
    console.log('🤖 Using model:', GEMINI_MODEL)

    const prompt = `You are a Malaysian recipe expert. Generate ${max_meals} meal recommendations based on available ingredients.

 inside strings with backslash
- Do not use apostrophes (') in text, use proper quotes or avoid them
- Keep all text on single lines within JSON strings

**Requirements:**
- Return exactly ${max_meals} meal recommendations
- Each meal should use as many available ingredients as possible
- Prioritize recipes that use expiring ingredients
- Include match_score (0-100) based on ingredient availability
- List matched_ingredients (what user has) and missing_ingredients (what user needs to buy)
- Provide detailed recipe_instructions (step-by-step) - USE \\n FOR LINE BREAKS, NOT ACTUAL NEWLINES
- Include prep_time (minutes), cook_time (minutes), servings, difficulty_level (easy/medium/hard)
- Specify cuisine_type and meal_type
- **REQUIRED**: Add dietary_tags array with 2-3 tags
- **REQUIRED**: Estimate potential_savings in MYR

**Return ONLY valid JSON in this EXACT format:**
{
  "recommendations": [
    {
      "meal": {
        "name": "Nasi Goreng Kampung",
        "description": "Traditional Malaysian fried rice"
      },
      "matched_ingredients": [
        {"name": "rice", "quantity": 2, "unit": "cups"}
      ],
      "missing_ingredients": [
        {"name": "anchovies", "quantity": 50, "unit": "g", "estimated_price": 3.50}
      ],
      "match_score": 85,
      "recipe_instructions": "Step 1: Heat oil in wok.\\nStep 2: Scramble eggs.\\nStep 3: Add rice and stir-fry.\\nStep 4: Season and serve.",
      "prep_time": 15,
      "cook_time": 20,
      "servings": 4,
      "difficulty_level": "easy",
      "cuisine_type": "Malaysian",
      "meal_type": "Dinner",
      "dietary_tags": ["halal", "comfort-food"],
      "potential_savings": 25.00
    }
  ]
}

IMPORTANT: Return ONLY the JSON object above. No additional text, no markdown, no explanations.`

    console.log('🤖 Calling Gemini API for meal recommendations...')
    console.log('📝 Prompt length:', prompt.length)

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096,
            responseMimeType: "application/json",
          }
        })
      }
    )

    console.log('📡 Gemini response status:', geminiResponse.status)

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      console.error('❌ Gemini API error:', errorText)
      return new Response(
        JSON.stringify({ error: 'AI service error', status: geminiResponse.status, details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const geminiData = await geminiResponse.json()
    console.log('📦 Gemini response received')
    
    const aiText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text

    if (!aiText) {
      console.error('❌ No text in Gemini response:', JSON.stringify(geminiData, null, 2))
      return new Response(
        JSON.stringify({ error: 'No recommendations generated', gemini_response: geminiData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('📝 AI response length:', aiText.length)
    console.log('📝 AI response preview:', aiText.substring(0, 200))

    let parsedData
    try {
      parsedData = JSON.parse(aiText)
      console.log('✅ Successfully parsed JSON')
    } catch (parseError) {
      console.error('❌ Failed to parse AI response:', parseError)
      console.error('Raw response:', aiText)
      return new Response(
        JSON.stringify({ error: 'Invalid AI response format', details: aiText.substring(0, 500) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🔢 Number of recommendations:', parsedData.recommendations?.length || 0)

    // Validate and ensure all fields are present
    const recommendationsWithImages = await Promise.all(
      (parsedData.recommendations || []).map(async (rec: any, index: number) => {
        console.log(`🔍 Processing recommendation ${index + 1}:`, rec.meal?.name)
        
        // Ensure dietary_tags exists and is an array
        if (!rec.dietary_tags || !Array.isArray(rec.dietary_tags)) {
          console.warn(`⚠️ Missing dietary_tags for ${rec.meal?.name}, adding defaults`)
          rec.dietary_tags = ['halal', 'home-cooked'];
        }
        
        // Ensure potential_savings exists
        if (typeof rec.potential_savings !== 'number') {
          console.warn(`⚠️ Missing potential_savings for ${rec.meal?.name}, adding default`)
          rec.potential_savings = 20.00;
        }
        
        const imageUrl = await getMealImage(rec.meal?.name || 'food');
        
        return {
          ...rec,
          meal: {
            ...rec.meal,
            image_url: imageUrl
          }
        };
      })
    )

    console.log(`✅ Generated ${recommendationsWithImages.length} meal recommendations with images`)

    return new Response(
      JSON.stringify({ 
        success: true,
        recommendations: recommendationsWithImages
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    console.error('Error stack:', error.stack)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error.message,
        stack: error.stack 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})