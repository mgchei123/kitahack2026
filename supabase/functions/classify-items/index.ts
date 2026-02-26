import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Auth validation
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid JWT' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get request body
    const { items } = await req.json()
    
    if (!items || !Array.isArray(items)) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid items parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🏷️ Classifying items...', { count: items.length })

    // Get Gemini API credentials
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    const GEMINI_MODEL = 'gemini-2.5-flash-lite'

    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Classification service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build item list for classification
    const itemList = items.map((item: any) => {
      if (typeof item === 'string') return item
      return item.name || JSON.stringify(item)
    }).join('\n- ')

    const prompt = `You are a Malaysian food classification expert. Classify each item as either "cookable" (food ingredients) or "non-cookable" (toiletries, household items, etc.).

CLASSIFICATION RULES:

**COOKABLE ITEMS** - Main Categories & Sub-Categories:

1. **protein**:
   - poultry: chicken, duck, turkey
   - red_meat: beef, lamb, mutton
   - seafood: fish, prawn, squid, crab
   - eggs: chicken eggs, duck eggs, quail eggs
   - plant_protein: tofu, tempeh, beans

2. **vegetable**:
   - leafy_greens: spinach, cabbage, lettuce, sawi
   - allium: onion, garlic, shallot, leek
   - root_vegetable: carrot, potato, radish
   - nightshade: tomato, eggplant, bell pepper
   - other_vegetable: broccoli, cauliflower, cucumber

3. **fruit**:
   - tropical: mango, papaya, durian, rambutan
   - citrus: orange, lemon, lime
   - berries: strawberry, blueberry
   - other_fruit: apple, banana, grapes

4. **dairy**:
   - milk: fresh milk, UHT milk, condensed milk
   - cheese: cheddar, mozzarella, cream cheese
   - yogurt: plain yogurt, flavored yogurt
   - butter: salted butter, unsalted butter, margarine

5. **grain**:
   - rice: white rice, brown rice, basmati rice
   - noodles: instant noodles, pasta, rice noodles
   - bread: white bread, whole wheat bread
   - flour: wheat flour, rice flour, corn flour

6. **condiment**:
   - sauce: soy sauce, oyster sauce, chili sauce
   - paste: curry paste, sambal, belacan
   - seasoning: salt, pepper, MSG, stock cubes

7. **cooking_oil**:
   - vegetable_oil: cooking oil, palm oil
   - specialty_oil: olive oil, sesame oil, coconut oil

8. **beverage**:
   - juice: orange juice, apple juice
   - soft_drink: coke, sprite (if drinkable)
   - tea_coffee: tea leaves, coffee powder

9. **other_food**:
   - snacks: chips, biscuits
   - canned_food: canned tuna, canned corn
   - frozen_food: frozen vegetables, frozen fish

**NON-COOKABLE ITEMS** - Main Categories & Sub-Categories:

1. **toiletry**:
   - hair_care: shampoo, conditioner, hair gel
   - body_care: soap, body wash, lotion
   - oral_care: toothpaste, toothbrush, mouthwash
   - skincare: facial cleanser, moisturizer

2. **household**:
   - cleaning: detergent, floor cleaner, bleach
   - paper_products: tissue, toilet paper, paper towels
   - kitchen_supplies: dishwashing liquid, sponges

3. **pet_supplies**:
   - pet_food: dog food, cat food
   - pet_care: pet shampoo, litter

4. **medicine**:
   - medication: pain reliever, vitamins
   - first_aid: bandages, antiseptic

5. **other**:
   - anything that doesn't fit above

**SPECIAL MALAYSIAN ITEMS:**
- "Maggi" → category: "grain", sub_category: "noodles"
- "Milo" → category: "beverage", sub_category: "powder"
- "Belacan" → category: "condiment", sub_category: "paste"
- "Keropok" → category: "other_food", sub_category: "snacks"

**CONFIDENCE SCORING:**
- 0.95-1.0: Very clear (e.g., "Chicken Breast")
- 0.85-0.94: Clear (e.g., "Cooking Oil")
- 0.70-0.84: Somewhat clear (e.g., "Mixed Vegetables")
- 0.50-0.69: Ambiguous (e.g., "Powder" without context)

Items to classify:
- ${itemList}

Return ONLY valid JSON (no markdown, no code blocks):
{
  "cookable": [
    {
      "name": "item name (normalized to singular)",
      "category": "main category",
      "sub_category": "specific sub-category",
      "confidence": 0.95
    }
  ],
  "non_cookable": [
    {
      "name": "item name",
      "category": "toiletry or household or other",
      "sub_category": "specific sub-category",
      "confidence": 0.95
    }
  ]
}`

    console.log('🤖 Calling Gemini API for classification...')

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`
    
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.1,  // Very low temperature for consistent classification
          maxOutputTokens: 8192
        }
      })
    })

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      console.error('❌ Gemini API error:', errorText)
      throw new Error(`Gemini API failed: ${geminiResponse.status}`)
    }

    const geminiData = await geminiResponse.json()
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''

    if (!responseText) {
      throw new Error('Gemini returned empty response')
    }

    console.log('📄 Raw Gemini response:', responseText)

    // Extract JSON from response
    let classificationData
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    
    if (jsonMatch) {
      classificationData = JSON.parse(jsonMatch[0])
    } else {
      throw new Error('No valid JSON found in response')
    }

    // Validate structure
    if (!classificationData.cookable || !Array.isArray(classificationData.cookable)) {
      classificationData.cookable = []
    }
    if (!classificationData.non_cookable || !Array.isArray(classificationData.non_cookable)) {
      classificationData.non_cookable = []
    }

    // Ensure all items have required fields
    classificationData.cookable = classificationData.cookable.map((item: any) => ({
      name: item.name || 'Unknown',
      category: item.category || 'other_food',
      sub_category: item.sub_category || 'other',
      confidence: item.confidence || 0.5
    }))

    classificationData.non_cookable = classificationData.non_cookable.map((item: any) => ({
      name: item.name || 'Unknown',
      category: item.category || 'other',
      sub_category: item.sub_category || 'other',
      confidence: item.confidence || 0.5
    }))

    console.log('✅ Classification completed:', {
      cookable: classificationData.cookable.length,
      nonCookable: classificationData.non_cookable.length
    })

    return new Response(
      JSON.stringify(classificationData),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error: any) {
    console.error('❌ Classification error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.stack
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})