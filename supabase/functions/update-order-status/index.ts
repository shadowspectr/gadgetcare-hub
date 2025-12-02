import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  console.log('=== Update Order Status Webhook Called ===');
  console.log('Method:', req.method);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('Received webhook body:', JSON.stringify(body, null, 2));

    // Handle callback_query from inline buttons
    const callbackQuery = body.callback_query;
    if (!callbackQuery) {
      console.log('No callback_query in body, returning ok');
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Callback data:', callbackQuery.data);
    
    // Parse callback data: format is "action_order_uuid"
    // e.g., "accept_order_fc9edf94-e4a2-4b44-ae71-39e580d5dc27"
    const callbackData = String(callbackQuery.data || '');
    const match = callbackData.match(/^(accept|ready|complete|cancel)_order_(.+)$/);
    
    if (!match) {
      console.error('Invalid callback data format:', callbackData);
      // Answer callback to remove loading state
      const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
      if (botToken) {
        await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callback_query_id: callbackQuery.id,
            text: 'Ошибка: неверный формат данных',
            show_alert: true
          })
        });
      }
      return new Response(JSON.stringify({ ok: false, error: 'Invalid callback data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const [, action, orderId] = match;
    console.log('Parsed action:', action, 'orderId:', orderId);

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      throw new Error('Missing TELEGRAM_BOT_TOKEN');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Map action to status
    const statusMap: Record<string, { status: string; text: string; emoji: string }> = {
      'accept': { status: 'accepted', text: 'Принят', emoji: '✅' },
      'ready': { status: 'ready', text: 'Готов к выдаче', emoji: '📦' },
      'complete': { status: 'completed', text: 'Выдан', emoji: '✔️' },
      'cancel': { status: 'cancelled', text: 'Отменён', emoji: '❌' }
    };

    const statusInfo = statusMap[action];
    if (!statusInfo) {
      throw new Error(`Unknown action: ${action}`);
    }

    console.log('Updating order status to:', statusInfo.status);

    // Get order details first
    const { data: orderData, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (fetchError) {
      console.error('Error fetching order:', fetchError);
      await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: callbackQuery.id,
          text: 'Ошибка: заказ не найден',
          show_alert: true
        })
      });
      throw fetchError;
    }

    console.log('Found order:', orderData.id, 'current status:', orderData.status);

    // Update order status
    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: statusInfo.status, updated_at: new Date().toISOString() })
      .eq('id', orderId);

    if (updateError) {
      console.error('Error updating order:', updateError);
      await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: callbackQuery.id,
          text: 'Ошибка при обновлении статуса',
          show_alert: true
        })
      });
      throw updateError;
    }

    console.log(`Order ${orderId} status updated to ${statusInfo.status}`);

    // Answer callback query immediately to remove loading state
    await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQuery.id,
        text: `${statusInfo.emoji} Статус: ${statusInfo.text}`
      })
    });

    // Send notification to user if they have telegram_user_id
    if (orderData.telegram_user_id) {
      const userMessage = `${statusInfo.emoji} *Статус заказа обновлён*\n\n` +
        `Заказ #${orderId.slice(0, 8)}\n` +
        `Новый статус: *${statusInfo.text}*`;
      
      try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: orderData.telegram_user_id,
            text: userMessage,
            parse_mode: 'Markdown'
          })
        });
        console.log('User notification sent to:', orderData.telegram_user_id);
      } catch (notifyError) {
        console.error('Failed to notify user:', notifyError);
      }
    }

    // Update the message with new status
    const originalText = callbackQuery.message?.text || '';
    
    // Remove old status line if exists and add new one
    const statusRegex = /\n\n⚡ Статус:.*$/;
    const cleanText = originalText.replace(statusRegex, '');
    const newText = `${cleanText}\n\n⚡ Статус: ${statusInfo.emoji} ${statusInfo.text}`;
    
    // Create updated keyboard based on current status
    let updatedKeyboard;
    if (statusInfo.status === 'completed' || statusInfo.status === 'cancelled') {
      // No buttons for final states
      updatedKeyboard = { inline_keyboard: [] };
    } else {
      // Show relevant next actions
      const buttons = [];
      if (statusInfo.status === 'accepted') {
        buttons.push([
          { text: '📦 Готов к выдаче', callback_data: `ready_order_${orderId}` },
          { text: '❌ Отменить', callback_data: `cancel_order_${orderId}` }
        ]);
        buttons.push([
          { text: '✔️ Выдан', callback_data: `complete_order_${orderId}` }
        ]);
      } else if (statusInfo.status === 'ready') {
        buttons.push([
          { text: '✔️ Выдан', callback_data: `complete_order_${orderId}` },
          { text: '❌ Отменить', callback_data: `cancel_order_${orderId}` }
        ]);
      } else {
        // pending - show all options
        buttons.push([
          { text: '✅ Принять', callback_data: `accept_order_${orderId}` },
          { text: '📦 Готов к выдаче', callback_data: `ready_order_${orderId}` }
        ]);
        buttons.push([
          { text: '✔️ Выдан', callback_data: `complete_order_${orderId}` },
          { text: '❌ Отменить', callback_data: `cancel_order_${orderId}` }
        ]);
      }
      updatedKeyboard = { inline_keyboard: buttons };
    }
    
    try {
      await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: callbackQuery.message.chat.id,
          message_id: callbackQuery.message.message_id,
          text: newText,
          parse_mode: 'Markdown',
          reply_markup: updatedKeyboard
        })
      });
      console.log('Message updated successfully');
    } catch (editError) {
      console.error('Failed to edit message:', editError);
    }

    return new Response(JSON.stringify({ ok: true, status: statusInfo.status }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in webhook handler:', error);
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
