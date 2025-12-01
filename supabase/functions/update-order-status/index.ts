import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('Received webhook:', JSON.stringify(body));

    const callbackQuery = body.callback_query;
    if (!callbackQuery) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const parts = String(callbackQuery.data || '').split('_');
    if (parts.length < 3) {
      console.error('Invalid callback data:', callbackQuery.data);
      return new Response(JSON.stringify({ ok: false, error: 'Invalid callback data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const [action, , ...idParts] = parts;
    const orderId = idParts.join('_');
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');

    if (!botToken) {
      throw new Error('Missing Telegram bot token');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let status = 'pending';
    let statusText = '';

    switch (action) {
      case 'accept':
        status = 'accepted';
        statusText = '✅ Принят';
        break;
      case 'ready':
        status = 'ready';
        statusText = '📦 Готов к выдаче';
        break;
      case 'complete':
        status = 'completed';
        statusText = '✔️ Выдан';
        break;
      case 'cancel':
        status = 'cancelled';
        statusText = '❌ Отменен';
        break;
    }

    // Get order details first
    const { data: orderData, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (fetchError) {
      console.error('Error fetching order:', fetchError);
      throw fetchError;
    }

    // Update order status
    const { error: updateError } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId);

    if (updateError) {
      console.error('Error updating order:', updateError);
      throw updateError;
    }

    console.log(`Order ${orderId} status updated to ${status}`);

    // Send notification to user if they have telegram_user_id
    if (orderData.telegram_user_id) {
      const userMessage = `📦 Статус вашего заказа #${orderId.slice(0, 8)} изменен:\n\n${statusText}`;
      
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: orderData.telegram_user_id,
          text: userMessage,
          parse_mode: 'HTML'
        })
      });
    }

    // Answer callback query
    await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQuery.id,
        text: `Статус изменен: ${statusText}`
      })
    });

    // Edit message to show new status
    const originalText = callbackQuery.message?.text || '';
    const newText = `${originalText}\n\n⚡ Статус: ${statusText}`;
    
    await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: callbackQuery.message.chat.id,
        message_id: callbackQuery.message.message_id,
        text: newText,
        parse_mode: 'HTML',
        reply_markup: callbackQuery.message.reply_markup
      })
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
