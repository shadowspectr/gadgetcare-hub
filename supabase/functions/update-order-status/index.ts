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

    const [action, _, orderId] = callbackQuery.data.split('_');
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
    const newText = `${callbackQuery.message.text}\n\n⚡ Статус: ${statusText}`;
    
    await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: callbackQuery.message.chat.id,
        message_id: callbackQuery.message.message_id,
        text: newText,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Принять', callback_data: `accept_order_${orderId}` },
              { text: '📦 Готов к выдаче', callback_data: `ready_order_${orderId}` }
            ],
            [
              { text: '✔️ Выдан', callback_data: `complete_order_${orderId}` },
              { text: '❌ Отменить', callback_data: `cancel_order_${orderId}` }
            ]
          ]
        }
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
