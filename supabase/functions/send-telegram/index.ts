
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHANNEL_ID) {
      throw new Error('Missing Telegram configuration')
    }

    const { name, phone, message, imageBase64 } = await req.json() as RequestBody
    
    // Format text message
    const telegramMessage = `
🔔 Новая заявка!

👤 Имя: ${name}
📱 Телефон: ${phone}
💬 Сообщение: ${message}
${imageBase64 ? '📷 Фото устройства: прикреплено' : ''}
    `.trim()

    // First attempt to send the image if it exists
    if (imageBase64 && imageBase64.includes('base64')) {
      console.log('Processing image attachment')
      try {
        // Create form data for file upload
        const formData = new FormData();
        formData.append('chat_id', TELEGRAM_CHANNEL_ID);
        formData.append('caption', `🔔 Новая заявка от ${name}

👤 Имя: ${name}
📱 Телефон: ${phone}
💬 Сообщение: ${message}`);
        
        // Convert base64 to blob
        const base64Data = imageBase64.split('base64,')[1];
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Get content type from base64 string
        const contentType = imageBase64.split(';')[0].split(':')[1] || 'image/jpeg';
        
        // Create blob and append to form
        const blob = new Blob([bytes], { type: contentType });
        formData.append('photo', blob, `photo_${Date.now()}.jpg`);
        
        // Send photo with caption to Telegram
        const photoResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
          method: 'POST',
          body: formData,
        });

        const photoResult = await photoResponse.json();
        
        if (!photoResponse.ok) {
          console.error('Failed to send photo to Telegram:', photoResult);
          // If photo failed, fallback to sending just the text message
          throw new Error('Failed to send photo: ' + JSON.stringify(photoResult));
        }
        
        console.log('Photo sent successfully');
        // If photo with caption was sent successfully, we don't need to send text message
        return new Response(
          JSON.stringify({ success: true, photoSent: true }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          },
        );
      } catch (photoError) {
        console.error('Error sending photo, falling back to text message:', photoError);
        // Continue to send text message as fallback
      }
    }

    // If we're here, either there was no image or sending the image failed
    // Send text message
    console.log('Sending text message to Telegram');
    const textResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHANNEL_ID,
        text: telegramMessage,
      }),
    });

    const textResult = await textResponse.json();

    if (!textResponse.ok) {
      console.error('Failed to send text message to Telegram:', textResult);
      throw new Error('Failed to send message: ' + JSON.stringify(textResult));
    }

    console.log('Text message sent successfully');

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error in send-telegram function:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
