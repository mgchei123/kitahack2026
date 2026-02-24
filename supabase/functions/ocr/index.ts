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
    // ✅ FIX: Get Authorization header
    const authHeader = req.headers.get('Authorization')
    
    console.log('📥 Incoming request headers:', {
      hasAuth: !!authHeader,
      hasApiKey: !!req.headers.get('apikey'),
      contentType: req.headers.get('content-type')
    })

    if (!authHeader) {
      console.error('❌ Missing Authorization header')
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ✅ FIX: Create Supabase client with SERVICE ROLE for validation
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing Supabase credentials')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create admin client for auth validation
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // ✅ FIX: Validate JWT using admin client
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      console.error('❌ JWT validation failed:', authError?.message)
      return new Response(
        JSON.stringify({ 
          code: 401,
          message: 'Invalid JWT',
          error: authError?.message || 'Token validation failed'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Authenticated user:', {
      id: user.id,
      email: user.email || '(anonymous)',
      isAnonymous: user.is_anonymous
    })

    // ✅ Get and validate request body
    const { image_url } = await req.json()
    
    if (!image_url) {
      console.error('❌ Missing image_url in request')
      return new Response(
        JSON.stringify({ error: 'Missing image_url parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('📸 Processing image:', image_url)

    // ✅ Get Gemini API credentials
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') || 'gemini-2.0-flash-exp'

    if (!GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY not configured')
      return new Response(
        JSON.stringify({ error: 'OCR service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ✅ Fetch image and convert to base64
    console.log('📥 Fetching image...')
    const imageResponse = await fetch(image_url)
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status}`)
    }

    const imageBuffer = await imageResponse.arrayBuffer()
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)))

    console.log('🤖 Calling Gemini API...')

    // ✅ Call Gemini Vision API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`
    
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { 
              text: "Extract all text from this receipt image. Return only the raw text exactly as it appears, preserving line breaks and formatting." 
            },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: base64Image
              }
            }
          ]
        }]
      })
    })

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      console.error('❌ Gemini API error:', errorText)
      throw new Error(`Gemini API failed: ${geminiResponse.status}`)
    }

    const geminiData = await geminiResponse.json()
    const raw_text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''

    if (!raw_text) {
      console.warn('⚠️ Gemini returned empty text')
    }

    // ✅ Calculate confidence (basic heuristic)
    const confidence = raw_text.length > 10 ? 0.95 : 0.5

    const result = {
      raw_text,
      confidence
    }

    console.log('✅ OCR completed:', {
      textLength: raw_text.length,
      confidence
    })

    return new Response(
      JSON.stringify(result),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error: any) {
    console.error('❌ Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        stack: error.stack
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})