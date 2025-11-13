import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const TELEGRAM_CHAT_ID = "-1002215846590";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface OrderData {
  user?: {
    id: number;
    first_name?: string;
    last_name?: string;
    username?: string;
  };
  phoneNumber: string;
  items: OrderItem[];
  total: number;
  timestamp: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const orderData: OrderData = await req.json();
    
    console.log('Received order data:', orderData);

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Save order to database
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: null,
        telegram_user_id: orderData.user?.id?.toString(),
        telegram_username: orderData.user?.username,
        items: orderData.items,
        total_amount: orderData.total,
        phone_number: orderData.phoneNumber,
        status: 'pending'
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error saving order:', orderError);
      throw orderError;
    }

    console.log('Order saved:', order);

    // Decrement product quantities
    for (const item of orderData.items) {
      const { error: decrementError } = await supabase.rpc('decrement_product_quantity', {
        product_id: item.id,
        quantity_to_subtract: item.quantity
      });

      if (decrementError) {
        console.error('Error decrementing quantity for product', item.id, ':', decrementError);
      }
    }

    // Format message for Telegram
    let message = "🛒 *Новый заказ из магазина*\n\n";
    message += `📝 Заказ #${order.id.slice(0, 8)}\n\n`;

    if (orderData.user) {
      message += "*Клиент:*\n";
      message += `👤 ${orderData.user.first_name || ""} ${orderData.user.last_name || ""}\n`;
      if (orderData.user.username) {
        message += `🔗 @${orderData.user.username}\n`;
      }
      message += `🆔 Telegram ID: \`${orderData.user.id}\`\n`;
    }
    
    message += `📞 Телефон: ${orderData.phoneNumber}\n\n`;

    message += "*Товары:*\n";
    orderData.items.forEach((item, index) => {
      message += `${index + 1}. ${item.name}\n`;
      message += `   💰 ${item.price} ₽ × ${item.quantity} шт. = ${(item.price * item.quantity).toFixed(2)} ₽\n`;
    });

    message += `\n*Итого:* ${orderData.total.toFixed(2)} ₽`;

    const orderDate = new Date(orderData.timestamp);
    message += `\n\n📅 ${orderDate.toLocaleString("ru-RU")}`;

    // Send message to Telegram with inline buttons
    const keyboard = {
      inline_keyboard: [
        [
          {
            text: "✅ Принять заказ",
            callback_data: `accept_order_${order.id}`
          },
          {
            text: "📦 Готов к выдаче",
            callback_data: `ready_order_${order.id}`
          }
        ],
        [
          {
            text: "✔️ Выдан",
            callback_data: `complete_order_${order.id}`
          },
          {
            text: "❌ Отменить",
            callback_data: `cancel_order_${order.id}`
          }
        ]
      ]
    };

    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: "Markdown",
          reply_markup: keyboard
        }),
      }
    );

    if (!telegramResponse.ok) {
      const errorData = await telegramResponse.json();
      console.error("Telegram API error:", errorData);
      throw new Error(`Telegram API error: ${JSON.stringify(errorData)}`);
    }

    console.log('Telegram message sent successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Order saved and sent successfully",
        orderId: order.id 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error processing order:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
