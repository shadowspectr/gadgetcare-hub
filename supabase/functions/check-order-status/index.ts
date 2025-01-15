import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

interface LiveSkladAuthResponse {
  token: string;
}

interface LiveSkladOrder {
  id: string;
  number: string;
  status: string;
  name: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { orderNumber } = await req.json()

    // Authenticate with LiveSklad
    const authResponse = await fetch('https://api.livesklad.com/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        login: Deno.env.get('LIVESKLAD_LOGIN'),
        password: Deno.env.get('LIVESKLAD_PASSWORD'),
      }),
    })

    if (!authResponse.ok) {
      throw new Error('Failed to authenticate with LiveSklad')
    }

    const { token } = await authResponse.json() as LiveSkladAuthResponse

    // Search for the order
    const ordersResponse = await fetch(`https://api.livesklad.com/company/orders?number=${orderNumber}`, {
      headers: {
        'Authorization': token,
      },
    })

    if (!ordersResponse.ok) {
      throw new Error('Failed to fetch orders from LiveSklad')
    }

    const orders = await ordersResponse.json() as LiveSkladOrder[]
    const order = orders.find(o => o.number === orderNumber)

    return new Response(
      JSON.stringify({
        status: order ? order.name : 'Заказ не найден',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})