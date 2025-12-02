import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  console.log('=== Telegram Webhook Called ===');
  console.log('Method:', req.method);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    console.log('Received webhook body:', JSON.stringify(body, null, 2));

    // Handle callback_query (inline button clicks for order status)
    if (body.callback_query) {
      return await handleOrderStatusUpdate(body.callback_query, botToken!, supabase);
    }

    // Handle message replies (manager responding to customer)
    if (body.message?.reply_to_message) {
      return await handleManagerReply(body.message, botToken!, supabase);
    }

    // Just acknowledge other messages
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in webhook handler:', error);
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Handle order status updates from inline buttons
async function handleOrderStatusUpdate(callbackQuery: any, botToken: string, supabase: any) {
  console.log('Processing order status update');
  console.log('Callback data:', callbackQuery.data);
  
  const callbackData = String(callbackQuery.data || '');
  const match = callbackData.match(/^(accept|ready|complete|cancel)_order_(.+)$/);
  
  if (!match) {
    console.error('Invalid callback data format:', callbackData);
    await answerCallback(botToken, callbackQuery.id, 'Ошибка: неверный формат', true);
    return new Response(JSON.stringify({ ok: false }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const [, action, orderId] = match;
  console.log('Action:', action, 'Order ID:', orderId);

  const statusMap: Record<string, { status: string; text: string; emoji: string }> = {
    'accept': { status: 'accepted', text: 'Принят', emoji: '✅' },
    'ready': { status: 'ready', text: 'Готов к выдаче', emoji: '📦' },
    'complete': { status: 'completed', text: 'Выдан', emoji: '✔️' },
    'cancel': { status: 'cancelled', text: 'Отменён', emoji: '❌' }
  };

  const statusInfo = statusMap[action];
  if (!statusInfo) {
    await answerCallback(botToken, callbackQuery.id, 'Неизвестное действие', true);
    return new Response(JSON.stringify({ ok: false }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Get order
  const { data: orderData, error: fetchError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (fetchError) {
    console.error('Error fetching order:', fetchError);
    await answerCallback(botToken, callbackQuery.id, 'Заказ не найден', true);
    return new Response(JSON.stringify({ ok: false }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Update order status
  const { error: updateError } = await supabase
    .from('orders')
    .update({ status: statusInfo.status, updated_at: new Date().toISOString() })
    .eq('id', orderId);

  if (updateError) {
    console.error('Error updating order:', updateError);
    await answerCallback(botToken, callbackQuery.id, 'Ошибка обновления', true);
    return new Response(JSON.stringify({ ok: false }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  console.log(`Order ${orderId} status updated to ${statusInfo.status}`);

  // Answer callback
  await answerCallback(botToken, callbackQuery.id, `${statusInfo.emoji} ${statusInfo.text}`);

  // Notify user
  if (orderData.telegram_user_id) {
    const userMessage = `${statusInfo.emoji} *Статус заказа обновлён*\n\nЗаказ #${orderId.slice(0, 8)}\nСтатус: *${statusInfo.text}*`;
    await sendMessage(botToken, orderData.telegram_user_id, userMessage);
  }

  // Update message
  const originalText = callbackQuery.message?.text || '';
  const statusRegex = /\n\n⚡ Статус:.*$/;
  const cleanText = originalText.replace(statusRegex, '');
  const newText = `${cleanText}\n\n⚡ Статус: ${statusInfo.emoji} ${statusInfo.text}`;
  
  const keyboard = getStatusKeyboard(statusInfo.status, orderId);
  
  await editMessage(botToken, callbackQuery.message.chat.id, callbackQuery.message.message_id, newText, keyboard);

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Handle manager reply to customer message
async function handleManagerReply(message: any, botToken: string, supabase: any) {
  console.log('Processing manager reply');
  
  const replyToMessage = message.reply_to_message;
  const managerReply = message.text;
  
  if (!managerReply) {
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Extract user telegram ID from original message
  const idMatch = replyToMessage.text?.match(/🆔.*?ID:\s*`?(\d+)`?/);
  const usernameMatch = replyToMessage.text?.match(/🔗\s*@(\w+)/);
  
  if (idMatch) {
    const userTelegramId = idMatch[1];
    console.log('Sending reply to user:', userTelegramId);
    
    // Send reply to user
    const userMessage = `💬 *Ответ от менеджера:*\n\n${managerReply}`;
    await sendMessage(botToken, userTelegramId, userMessage);

    // Save to database
    await supabase.from('chat_messages').insert({
      telegram_user_id: userTelegramId,
      message: managerReply,
      is_from_manager: true
    });

    console.log('Reply sent successfully');
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Helper functions
async function answerCallback(botToken: string, callbackId: string, text: string, showAlert = false) {
  await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackId,
      text,
      show_alert: showAlert
    })
  });
}

async function sendMessage(botToken: string, chatId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown'
    })
  });
}

async function editMessage(botToken: string, chatId: number, messageId: number, text: string, keyboard: any) {
  await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: 'Markdown',
      reply_markup: keyboard
    })
  });
}

function getStatusKeyboard(status: string, orderId: string) {
  if (status === 'completed' || status === 'cancelled') {
    return { inline_keyboard: [] };
  }
  
  const buttons = [];
  if (status === 'accepted') {
    buttons.push([
      { text: '📦 Готов к выдаче', callback_data: `ready_order_${orderId}` },
      { text: '❌ Отменить', callback_data: `cancel_order_${orderId}` }
    ]);
    buttons.push([
      { text: '✔️ Выдан', callback_data: `complete_order_${orderId}` }
    ]);
  } else if (status === 'ready') {
    buttons.push([
      { text: '✔️ Выдан', callback_data: `complete_order_${orderId}` },
      { text: '❌ Отменить', callback_data: `cancel_order_${orderId}` }
    ]);
  } else {
    buttons.push([
      { text: '✅ Принять', callback_data: `accept_order_${orderId}` },
      { text: '📦 Готов', callback_data: `ready_order_${orderId}` }
    ]);
    buttons.push([
      { text: '✔️ Выдан', callback_data: `complete_order_${orderId}` },
      { text: '❌ Отмена', callback_data: `cancel_order_${orderId}` }
    ]);
  }
  
  return { inline_keyboard: buttons };
}
