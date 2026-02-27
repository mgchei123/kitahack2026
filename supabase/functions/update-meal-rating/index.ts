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
    console.log('⭐ Update Meal Rating Request received')
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Get request body
    const { user_id, usage_history_id, rating, notes } = await req.json()

    // Validate required fields
    if (!user_id || !usage_history_id || rating === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, usage_history_id, rating' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      return new Response(
        JSON.stringify({ error: 'Rating must be between 1 and 5' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update the usage history record
    const { data: updatedRecord, error: updateError } = await supabaseAdmin
      .from('ingredient_usage_history')
      .update({
        rating: rating,
        notes: notes || null
      })
      .eq('id', usage_history_id)
      .eq('user_id', user_id)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Failed to update rating:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update meal rating', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!updatedRecord) {
      return new Response(
        JSON.stringify({ error: 'Usage history record not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Rating updated:', usage_history_id)

    return new Response(
      JSON.stringify({
        success: true,
        data: updatedRecord,
        message: 'Meal rating updated successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.toString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})