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
    const { ocr_text } = await req.json()
    
    if (!ocr_text) {
      return new Response(
        JSON.stringify({ error: 'Missing ocr_text parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('📝 Parsing receipt text...')

    // Get Gemini API credentials
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') || 'gemini-2.5-flash'

    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Parsing service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Enhanced prompt for Malaysian receipts with ingredient normalization
    const prompt = `You are a Malaysian receipt parser. Parse this receipt text and extract structured data.

CRITICAL RULES:
1. **Normalize ingredient names**: Convert to singular, standardized form
   - "Tomatoes" → "Tomato"
   - "Onions 1kg" → "Onion"
   - "Chicken Breast 500g" → "Chicken Breast"
   - "Cooking Oil 1L" → "Cooking Oil"
   
2. **Handle Malaysian receipts**: Recognize common Malaysian supermarkets (AEON, Tesco, Giant, 99 Speedmart, etc.)

3. **Extract quantity and unit separately**:
   - "Rice 2kg" → quantity: 2, unit: "kg"
   - "Eggs (10pcs)" → quantity: 10, unit: "pieces"
   - "Soy Sauce" → quantity: 1, unit: "bottle"

4. **Currency**: Always use "MYR" for Malaysian receipts

5. **Date format**: Convert to YYYY-MM-DD

Receipt text:
${ocr_text}

Return ONLY valid JSON (no markdown, no code blocks):
{
  "store_name": "store name here",
  "purchase_date": "YYYY-MM-DD",
  "total_amount": 0.00,
  "currency": "MYR",
  "items": [
    {
      "name": "normalized ingredient name (singular)",
      "quantity": 1,
      "unit": "unit",
      "price": 0.00
    }
  ]
}

If you cannot extract a field, use null for strings or 0 for numbers.`

    console.log('🤖 Calling Gemini API for parsing...')

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
          temperature: 0.1,  // Low temperature for consistent parsing
          maxOutputTokens: 2048
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

    // Extract JSON from response (handle markdown code blocks)
    let parsedData
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    
    if (jsonMatch) {
      parsedData = JSON.parse(jsonMatch[0])
    } else {
      throw new Error('No valid JSON found in response')
    }

    // Validate required fields
    if (!parsedData.items || !Array.isArray(parsedData.items)) {
      throw new Error('Invalid parsed data: missing items array')
    }

    // Set defaults
    parsedData.currency = parsedData.currency || 'MYR'
    parsedData.store_name = parsedData.store_name || 'Unknown Store'
    parsedData.purchase_date = parsedData.purchase_date || new Date().toISOString().split('T')[0]
    parsedData.total_amount = parsedData.total_amount || 0

    console.log('✅ Parsing completed:', {
      store: parsedData.store_name,
      itemCount: parsedData.items.length,
      total: parsedData.total_amount
    })

    return new Response(
      JSON.stringify(parsedData),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error: any) {
    console.error('❌ Parsing error:', error)
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