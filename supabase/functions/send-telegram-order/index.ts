import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const TELEGRAM_CHAT_ID = "-1002215846590"; // Добавляем -100 к ID беседы

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
  phoneNumber?: string;
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

    // Формируем сообщение о заказе
    let message = "🛒 *Новый заказ из Telegram магазина*\n\n";

    // Добавляем информацию о пользователе
    if (orderData.user) {
      message += "*Клиент:*\n";
      message += `👤 ${orderData.user.first_name || ""} ${orderData.user.last_name || ""}\n`;
      if (orderData.user.username) {
        message += `🔗 @${orderData.user.username}\n`;
      }
      message += `🆔 Telegram ID: \`${orderData.user.id}\`\n`;
    }
    
    // Добавляем номер телефона
    if (orderData.phoneNumber) {
      message += `📞 Телефон: ${orderData.phoneNumber}\n`;
    }
    
    message += "\n";

    // Добавляем товары
    message += "*Товары:*\n";
    orderData.items.forEach((item, index) => {
      message += `${index + 1}. ${item.name}\n`;
      message += `   💰 ${item.price} ₽ × ${item.quantity} шт. = ${(item.price * item.quantity).toFixed(2)} ₽\n`;
    });

    // Добавляем итоговую сумму
    message += `\n*Итого:* ${orderData.total.toFixed(2)} ₽`;

    // Добавляем время заказа
    const orderDate = new Date(orderData.timestamp);
    message += `\n\n📅 ${orderDate.toLocaleString("ru-RU")}`;

    // Отправляем сообщение в Telegram
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
        }),
      }
    );

    if (!telegramResponse.ok) {
      const errorData = await telegramResponse.json();
      console.error("Telegram API error:", errorData);
      throw new Error(`Telegram API error: ${JSON.stringify(errorData)}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Order sent successfully" }),
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
