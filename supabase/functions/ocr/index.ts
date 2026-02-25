import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { encode } from 'https://deno.land/std@0.224.0/encoding/base64.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('📥 OCR Request received')
    
    const { image_url } = await req.json()
    
    if (!image_url) {
      console.error('❌ Missing image_url')
      return new Response(
        JSON.stringify({ error: 'Missing image_url parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('📸 Processing image:', image_url)

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') || 'gemini-1.5-flash'

    if (!GEMINI_API_KEY) {
      console.error('❌ Missing GEMINI_API_KEY')
      return new Response(
        JSON.stringify({ error: 'OCR service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🤖 Fetching image...')

    // Fetch the image
    const imageResponse = await fetch(image_url)
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status}`)
    }
    
    const imageBuffer = await imageResponse.arrayBuffer()
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg'
    
    console.log('📊 Image size:', imageBuffer.byteLength, 'bytes')
    console.log('📄 Content type:', contentType)

    // ✅ FIX: Use Deno's standard base64 encoder
    const base64Image = encode(new Uint8Array(imageBuffer))
    
    console.log('📊 Base64 length:', base64Image.length)
    console.log('📊 Base64 first 50 chars:', base64Image.substring(0, 50))

    console.log('🤖 Calling Gemini Vision API with model:', GEMINI_MODEL)

    // Call Gemini Vision API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: "Extract ALL text from this receipt image. Return ONLY the raw text exactly as it appears on the receipt, line by line. Do not add explanations or formatting."
              },
              {
                inline_data: {
                  mime_type: contentType,
                  data: base64Image
                }
              }
            ]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048,
          }
        })
      }
    )

    console.log('📡 Gemini response status:', geminiResponse.status)

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      console.error('❌ Gemini API error:', errorText.substring(0, 500))
      return new Response(
        JSON.stringify({ 
          error: 'Gemini API failed',
          details: errorText.substring(0, 500),
          status: geminiResponse.status
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const geminiData = await geminiResponse.json()
    console.log('✅ Gemini response received')
    
    // Validate response structure
    if (!geminiData.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error('❌ Invalid response structure')
      
      // Check for safety blocks
      if (geminiData.candidates?.[0]?.finishReason) {
        const reason = geminiData.candidates[0].finishReason
        return new Response(
          JSON.stringify({ 
            error: `Gemini blocked response: ${reason}`,
            details: 'Content was blocked by safety filters'
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      throw new Error('Invalid Gemini response structure')
    }
    
    const rawText = geminiData.candidates[0].content.parts[0].text

    console.log('✅ OCR completed successfully')
    console.log('📝 Text length:', rawText.length)

    return new Response(
      JSON.stringify({
        raw_text: rawText,
        confidence: 0.95,
        model: GEMINI_MODEL
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error: any) {
    console.error('❌ OCR Error:', error.message)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error'
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