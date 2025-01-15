import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  name: string;
  phone: string;
  message: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
    const TELEGRAM_CHANNEL_ID = Deno.env.get('TELEGRAM_CHANNEL_ID')

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHANNEL_ID) {
      throw new Error('Missing Telegram configuration')
    }

    const { name, phone, message } = await req.json() as RequestBody

    const telegramMessage = `
🔔 Новая заявка!

👤 Имя: ${name}
📱 Телефон: ${phone}
💬 Сообщение: ${message}
    `.trim()

    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHANNEL_ID,
        text: telegramMessage,
        parse_mode: 'HTML',
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error('Failed to send Telegram message')
    }

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})