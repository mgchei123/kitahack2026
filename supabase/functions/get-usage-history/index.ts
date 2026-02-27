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
    console.log('📊 Get Usage History Request received')
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Get query parameters
    const url = new URL(req.url)
    const user_id = url.searchParams.get('user_id')
    const meal_id = url.searchParams.get('meal_id')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build query
    let query = supabaseAdmin
      .from('ingredient_usage_history')
      .select('*', { count: 'exact' })
      .eq('user_id', user_id)
      .order('cooked_date', { ascending: false })

    if (meal_id) {
      query = query.eq('meal_id', meal_id)
    }

    const { data: usageHistory, error: queryError, count } = await query
      .range(offset, offset + limit - 1)

    if (queryError) {
      console.error('❌ Failed to fetch usage history:', queryError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch usage history', details: queryError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate statistics
    const ratedMeals = usageHistory.filter(h => h.rating !== null)
    const averageRating = ratedMeals.length > 0 
      ? (ratedMeals.reduce((sum, h) => sum + h.rating, 0) / ratedMeals.length).toFixed(2)
      : null

    const totalMealsCooked = usageHistory.length
    const topRatedMeals = ratedMeals.sort((a, b) => b.rating - a.rating).slice(0, 5)

    console.log('✅ Retrieved usage history:', usageHistory.length)

    return new Response(
      JSON.stringify({
        success: true,
        data: usageHistory,
        statistics: {
          total_meals_cooked: totalMealsCooked,
          average_rating: averageRating,
          top_rated_meals: topRatedMeals,
          total_count: count
        },
        pagination: {
          limit,
          offset,
          total: count
        }
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