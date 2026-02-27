import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('📥 Parse Receipt Request received')
    
    const { ocr_text } = await req.json()
    
    if (!ocr_text) {
      console.error('❌ Missing ocr_text')
      return new Response(
        JSON.stringify({ error: 'Missing ocr_text parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('📝 Parsing receipt text...')

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    const GEMINI_MODEL = 'gemini-2.5-flash-lite'

    if (!GEMINI_API_KEY) {
      console.error('❌ Missing GEMINI_API_KEY')
      return new Response(
        JSON.stringify({ error: 'Parsing service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const prompt = `You are a Malaysian receipt parser. Parse this receipt text and extract structured data.

CRITICAL RULES:
1. **Normalize ingredient names**: Convert to singular, standardized form
   - "Tomatoes" → "Tomato"
   - "Onions 1kg" → "Onion"
   - "Chicken Breast 500g" → "Chicken Breast"
   - "Cooking Oil 1L" → "Cooking Oil"
   
2. **Handle Malaysian receipts**: Recognize common Malaysian supermarkets (AEON, Tesco, Giant, 99 Speedmart, etc.)

3. **Extract quantity and unit separately**:
   - "Tomato 500g" → quantity: 500, unit: "g"
   - "Chicken 1kg" → quantity: 1, unit: "kg"
   - "Milk 2L" → quantity: 2, unit: "L"
   - "Eggs 12pcs" → quantity: 12, unit: "pcs"

4. **Parse dates in Malaysian format**: Accept DD/MM/YYYY or DD-MM-YYYY

5. **Return ONLY valid JSON** - no markdown, no explanations

Receipt text:
${ocr_text}

Return JSON in this EXACT format:
{
  "store_name": "string",
  "purchase_date": "YYYY-MM-DD",
  "total_amount": number,
  "currency": "MYR",
  "items": [
    {
      "name": "string (normalized, singular)",
      "quantity": number,
      "unit": "string",
      "price": number
    }
  ]
}`

    console.log('🤖 Calling Gemini API...')

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
            temperature: 0.1,
            maxOutputTokens: 8192,// Increase max tokens for longer receipts
          }
        })
      }
    )

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      console.error('❌ Gemini API error:', geminiResponse.status, errorText)
      return new Response(
        JSON.stringify({ 
          error: 'Gemini API failed',
          details: errorText,
          status: geminiResponse.status
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const geminiData = await geminiResponse.json()
    console.log('✅ Gemini response received')

    const generatedText = geminiData.candidates[0].content.parts[0].text
    
    let jsonText = generatedText.trim()

    // Remove markdown code blocks more aggressively
    jsonText = jsonText.replace(/^```json\s*/g, '') // Remove opening ```json
    jsonText = jsonText.replace(/^```\s*/g, '')      // Remove opening ```
    jsonText = jsonText.replace(/\s*```$/g, '')      // Remove closing ```
    jsonText = jsonText.trim()

    // Try to find JSON object if there's extra text
    if (!jsonText.startsWith('{')) {
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        jsonText = jsonMatch[0]
      }
    }

    console.log('🔍 Cleaned JSON text (first 200 chars):', jsonText.substring(0, 200))

    try {
      const parsedData = JSON.parse(jsonText)
      
      // Validate structure
      if (!parsedData.items || !Array.isArray(parsedData.items)) {
        throw new Error('Invalid JSON structure: missing or invalid items array')
      }
      
      console.log('✅ Successfully parsed receipt data')
      
      return new Response(
        JSON.stringify(parsedData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
      
    } catch (parseError: any) {
      console.error('❌ JSON Parse Error:', parseError.message)
      console.error('📄 Raw Gemini response:', generatedText)
      console.error('🧹 Cleaned JSON text:', jsonText)
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to parse Gemini response as JSON',
          details: parseError.message,
          raw_response: generatedText.substring(0, 500) // First 500 chars for debugging
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error: any) {
    console.error('❌ Parse Receipt Error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        stack: error.stack 
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})