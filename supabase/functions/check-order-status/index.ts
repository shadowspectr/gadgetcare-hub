import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

interface LiveSkladAuthResponse {
  token: string;
}

interface LiveSkladOrder {
  id: string;
  number: string;
  status: {
    name: string;
    color: string;
  };
  shop: {
    name: string;
    id: string;
  };
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
    const { orderNumber, shopId } = await req.json()
    console.log('Searching for order:', orderNumber, 'in shop:', shopId)

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
      console.error('Auth response not OK:', await authResponse.text())
      throw new Error('Failed to authenticate with LiveSklad')
    }

    const { token } = await authResponse.json() as LiveSkladAuthResponse
    console.log('Successfully authenticated with LiveSklad')

    // Search for the order
    const ordersResponse = await fetch(`https://api.livesklad.com/company/orders?number=${orderNumber}`, {
      headers: {
        'Authorization': token,
      },
    })

    if (!ordersResponse.ok) {
      console.error('Orders response not OK:', await ordersResponse.text())
      throw new Error('Failed to fetch orders from LiveSklad')
    }

    const ordersData = await ordersResponse.json()
    console.log('LiveSklad API response:', ordersData)

    // Handle the nested data structure and filter by shop if specified
    const orders = ordersData.data || [];
    
    if (orders.length === 0) {
      return new Response(
        JSON.stringify({
          status: 'Заказ не найден',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (!shopId) {
      // If no shop is selected, return the list of shops where the order exists
      const uniqueShops = Array.from(new Set(orders.map((o: LiveSkladOrder) => o.shop.id)))
        .map(shopId => {
          const order = orders.find((o: LiveSkladOrder) => o.shop.id === shopId)
          return {
            id: order.shop.id,
            name: order.shop.name,
          }
        });

      return new Response(
        JSON.stringify({
          status: 'Выберите сервисный центр, где был оставлен заказ',
          shops: uniqueShops,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Find the specific order for the selected shop
    const order = orders.find((o: LiveSkladOrder) => o.shop.id === shopId)

    if (!order) {
      return new Response(
        JSON.stringify({
          status: 'Заказ не найден в выбранном сервисном центре',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    return new Response(
      JSON.stringify({
        status: `Статус заказа: ${order.status.name}`,
        statusColor: order.status.color,
        shop: order.shop.name,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error in check-order-status:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})