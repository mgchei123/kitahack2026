import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ExpiringItem {
  id: string
  user_id: string
  ingredient_name: string
  quantity: number
  unit: string
  expiry_date: string
  days_until_expiry: number
}

interface UserExpiringItems {
  user_id: string
  items: ExpiringItem[]
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('⏰ Expiry Alert Check started at:', new Date().toISOString())

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Calculate date ranges
    const now = new Date()
    const oneDayFromNow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000)
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

    console.log('📅 Checking items expiring between now and 3 days from now')

    // Fetch all items expiring in 1-3 days
    const { data: expiringItems, error: fetchError } = await supabaseAdmin
      .from('user_inventory')
      .select('*')
      .eq('is_available', true)
      .not('expiry_date', 'is', null)
      .gte('expiry_date', now.toISOString())
      .lte('expiry_date', threeDaysFromNow.toISOString())
      .order('expiry_date', { ascending: true })

    if (fetchError) {
      console.error('❌ Failed to fetch expiring items:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch expiring items' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!expiringItems || expiringItems.length === 0) {
      console.log('✅ No items expiring in the next 3 days')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No items expiring soon',
          alerts_sent: 0
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📦 Found ${expiringItems.length} items expiring soon`)

    // Group items by user
    const userItemsMap = new Map<string, ExpiringItem[]>()
    
    for (const item of expiringItems) {
      const expiryDate = new Date(item.expiry_date)
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      
      const expiringItem: ExpiringItem = {
        id: item.id,
        user_id: item.user_id,
        ingredient_name: item.ingredient_name,
        quantity: item.quantity,
        unit: item.unit,
        expiry_date: item.expiry_date,
        days_until_expiry: daysUntilExpiry
      }

      if (!userItemsMap.has(item.user_id)) {
        userItemsMap.set(item.user_id, [])
      }
      userItemsMap.get(item.user_id)!.push(expiringItem)
    }

    console.log(`👥 Processing alerts for ${userItemsMap.size} users`)

    // Get Gemini API credentials for generating notification messages
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    const GEMINI_MODEL = 'gemini-2.5-flash-lite' // Batch processing, as per your table

    if (!GEMINI_API_KEY) {
      console.warn('⚠️ GEMINI_API_KEY not set, using default messages')
    }

    const alertsSent = []
    const alertsFailed = []

    // Process each user
    for (const [userId, items] of userItemsMap.entries()) {
      try {
        console.log(`📬 Processing user ${userId} with ${items.length} expiring items`)

        // Categorize by urgency
        const urgentItems = items.filter(i => i.days_until_expiry <= 1)
        const soonItems = items.filter(i => i.days_until_expiry > 1 && i.days_until_expiry <= 3)

        // Generate notification message
        let notificationMessage = ''
        
        if (GEMINI_API_KEY) {
          // Use AI to generate personalized message
          const prompt = `Generate a friendly, concise notification message for a user about expiring food items.

**Expiring Items:**
${items.map(item => `- ${item.ingredient_name} (${item.quantity} ${item.unit}) - expires in ${item.days_until_expiry} day(s)`).join('\n')}

**Requirements:**
- Keep it short and actionable (max 200 characters)
- Be friendly and helpful
- Suggest cooking or using items
- Use emojis appropriately
- Return ONLY the message text, no JSON or formatting

Example: "⚠️ 3 items expiring soon! Use your tomatoes & chicken today to avoid waste. Check your meal recommendations 🍳"`

          try {
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
                    temperature: 0.4,
                    maxOutputTokens: 200,
                  }
                })
              }
            )

            if (geminiResponse.ok) {
              const geminiData = await geminiResponse.json()
              const aiMessage = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
              if (aiMessage) {
                notificationMessage = aiMessage.trim()
              }
            }
          } catch (aiError) {
            console.warn('⚠️ AI message generation failed, using default')
          }
        }

        // Fallback to default message
        if (!notificationMessage) {
          const urgentCount = urgentItems.length
          const soonCount = soonItems.length
          
          if (urgentCount > 0) {
            notificationMessage = `⚠️ ${urgentCount} item(s) expiring ${urgentCount === 1 ? 'today' : 'soon'}! Check your inventory and cook something delicious 🍳`
          } else {
            notificationMessage = `📅 ${soonCount} item(s) expiring in 2-3 days. Plan your meals to avoid waste! 🥗`
          }
        }

        // Here you would integrate with your notification system
        // For now, we'll log the notification and store it in a notifications table (if you have one)
        
        console.log(`📨 Notification for user ${userId}:`, notificationMessage)
        
        // Example: Store notification in database (you can create a notifications table)
        // Or integrate with push notifications, email, SMS, etc.
        
        alertsSent.push({
          user_id: userId,
          message: notificationMessage,
          item_count: items.length,
          urgent_count: urgentItems.length,
          items: items.map(i => ({
            name: i.ingredient_name,
            days_until_expiry: i.days_until_expiry
          }))
        })

      } catch (userError) {
        console.error(`❌ Failed to process user ${userId}:`, userError)
        alertsFailed.push({
          user_id: userId,
          error: userError.message
        })
      }
    }

    console.log(`✅ Expiry alert check completed`)
    console.log(`   - Alerts sent: ${alertsSent.length}`)
    console.log(`   - Alerts failed: ${alertsFailed.length}`)

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        summary: {
          total_expiring_items: expiringItems.length,
          users_affected: userItemsMap.size,
          alerts_sent: alertsSent.length,
          alerts_failed: alertsFailed.length
        },
        alerts: alertsSent,
        failures: alertsFailed.length > 0 ? alertsFailed : undefined
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