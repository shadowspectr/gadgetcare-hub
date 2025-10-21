import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

interface LiveSkladAuthResponse {
  token: string;
}

interface LiveSkladProduct {
  id: string;
  name: string;
  price: number;
  quantity: number;
  description?: string;
  image?: string;
  category?: string;
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
    console.log('Fetching products from LiveSklad')

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

    // Fetch products from LiveSklad
    const productsResponse = await fetch('https://api.livesklad.com/company/goods', {
      headers: {
        'Authorization': token,
      },
    })

    if (!productsResponse.ok) {
      console.error('Products response not OK:', await productsResponse.text())
      throw new Error('Failed to fetch products from LiveSklad')
    }

    const productsData = await productsResponse.json()
    console.log('LiveSklad products API response:', productsData)

    // Handle the nested data structure
    const products = productsData.data || [];

    return new Response(
      JSON.stringify({
        success: true,
        products: products,
        count: products.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error in get-livesklad-products:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
