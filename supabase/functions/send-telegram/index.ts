
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  name: string;
  phone: string;
  message: string;
  imageBase64?: string | null;
  imageName?: string | null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
    const TELEGRAM_CHANNEL_ID = Deno.env.get('TELEGRAM_CHANNEL_ID')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHANNEL_ID) {
      throw new Error('Missing Telegram configuration')
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase configuration')
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { name, phone, message, imageBase64, imageName } = await req.json() as RequestBody
    
    let imageUrl = null;
    
    // Handle image upload if provided
    if (imageBase64 && imageName) {
      // Ensure bucket exists
      const { data: buckets } = await supabase.storage.listBuckets()
      
      if (!buckets?.some(bucket => bucket.name === 'contact_uploads')) {
        await supabase.storage.createBucket('contact_uploads', {
          public: true,
          fileSizeLimit: 5 * 1024 * 1024,
        })
      }
      
      // Convert base64 to Uint8Array
      const base64Data = imageBase64.split('base64,')[1]
      const binaryString = atob(base64Data)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      
      // Upload file
      const fileName = `device_images/${Date.now()}_${imageName}`
      const { data: fileData, error: uploadError } = await supabase.storage
        .from('contact_uploads')
        .upload(fileName, bytes, {
          contentType: imageBase64.split(';')[0].split(':')[1],
          upsert: false
        })
        
      if (uploadError) {
        console.error('Upload error:', uploadError)
        throw uploadError
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('contact_uploads')
        .getPublicUrl(fileName)
        
      imageUrl = urlData.publicUrl
    }

    // Format text message
    const telegramMessage = `
🔔 Новая заявка!

👤 Имя: ${name}
📱 Телефон: ${phone}
💬 Сообщение: ${message}
${imageUrl ? '📷 Фото устройства: прикреплено' : ''}
    `.trim()

    // Send text message
    const textResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
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

    if (!textResponse.ok) {
      throw new Error('Failed to send Telegram message')
    }

    // If image URL is provided, send it as a photo
    if (imageUrl) {
      const photoResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHANNEL_ID,
          photo: imageUrl,
          caption: `Фото устройства от ${name}`,
        }),
      })

      if (!photoResponse.ok) {
        console.error('Failed to send photo', await photoResponse.text())
      }
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
