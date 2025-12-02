import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const TELEGRAM_CHAT_ID = '-1002215846590';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('Chat request:', JSON.stringify(body, null, 2));

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Handle incoming webhook from Telegram (manager reply)
    if (body.message?.reply_to_message) {
      const replyToMessage = body.message.reply_to_message;
      const managerReply = body.message.text;
      
      // Extract user telegram ID from the original message
      const match = replyToMessage.text?.match(/🆔.*?ID:\s*`?(\d+)`?/);
      if (match) {
        const userTelegramId = match[1];
        
        // Send reply to user
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: userTelegramId,
            text: `💬 *Ответ от менеджера:*\n\n${managerReply}`,
            parse_mode: 'Markdown'
          })
        });

        // Save message to database
        await supabase.from('chat_messages').insert({
          telegram_user_id: userTelegramId,
          message: managerReply,
          is_from_manager: true
        });

        console.log('Reply sent to user:', userTelegramId);
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Handle user sending message to manager
    if (body.action === 'send_message') {
      const { telegramUserId, telegramUsername, message, orderId, firstName, lastName } = body;

      // Save message to database
      await supabase.from('chat_messages').insert({
        telegram_user_id: telegramUserId.toString(),
        order_id: orderId || null,
        message,
        is_from_manager: false
      });

      // Format message for managers
      let chatMessage = `💬 *Сообщение от клиента*\n\n`;
      chatMessage += `👤 ${firstName || ''} ${lastName || ''}\n`;
      if (telegramUsername) {
        chatMessage += `🔗 @${telegramUsername}\n`;
      }
      chatMessage += `🆔 Telegram ID: \`${telegramUserId}\`\n`;
      if (orderId) {
        chatMessage += `📦 Заказ: #${orderId.slice(0, 8)}\n`;
      }
      chatMessage += `\n📝 *Сообщение:*\n${message}`;
      chatMessage += `\n\n_Ответьте на это сообщение, чтобы связаться с клиентом_`;

      // Send to managers group
      const telegramResponse = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: chatMessage,
            parse_mode: 'Markdown'
          })
        }
      );

      const result = await telegramResponse.json();
      console.log('Message sent to managers:', result);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get chat history for user
    if (body.action === 'get_messages') {
      const { telegramUserId, orderId } = body;

      let query = supabase
        .from('chat_messages')
        .select('*')
        .eq('telegram_user_id', telegramUserId.toString())
        .order('created_at', { ascending: true });

      if (orderId) {
        query = query.eq('order_id', orderId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return new Response(
        JSON.stringify({ messages: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
