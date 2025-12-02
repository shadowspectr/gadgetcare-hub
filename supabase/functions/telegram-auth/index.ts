import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Generate 6-digit code
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, telegramUserId, code, phone } = await req.json();
    console.log('Auth request:', { action, telegramUserId, phone });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (action === 'send_code') {
      // Generate and store verification code
      const verificationCode = generateCode();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Store code in database
      const { error: upsertError } = await supabase
        .from('telegram_auth_codes')
        .upsert({
          telegram_user_id: telegramUserId.toString(),
          code: verificationCode,
          expires_at: expiresAt.toISOString(),
          phone: phone || null
        }, {
          onConflict: 'telegram_user_id'
        });

      if (upsertError) {
        console.error('Error storing code:', upsertError);
        throw upsertError;
      }

      // Send code via Telegram
      const message = `🔐 Ваш код подтверждения: *${verificationCode}*\n\nКод действителен 5 минут.`;
      
      const telegramResponse = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: telegramUserId,
            text: message,
            parse_mode: 'Markdown'
          })
        }
      );

      const telegramResult = await telegramResponse.json();
      console.log('Telegram response:', telegramResult);

      if (!telegramResult.ok) {
        throw new Error(`Telegram error: ${telegramResult.description}`);
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Code sent' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'verify_code') {
      // Verify the code
      const { data: authData, error: fetchError } = await supabase
        .from('telegram_auth_codes')
        .select('*')
        .eq('telegram_user_id', telegramUserId.toString())
        .single();

      if (fetchError || !authData) {
        return new Response(
          JSON.stringify({ success: false, error: 'Code not found' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check expiration
      if (new Date(authData.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ success: false, error: 'Code expired' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check code
      if (authData.code !== code) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid code' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Mark as verified
      await supabase
        .from('telegram_auth_codes')
        .update({ verified: true })
        .eq('telegram_user_id', telegramUserId.toString());

      // Create or update telegram user profile
      const { data: profile, error: profileError } = await supabase
        .from('telegram_users')
        .upsert({
          telegram_user_id: telegramUserId.toString(),
          phone: authData.phone,
          verified: true,
          last_login: new Date().toISOString()
        }, {
          onConflict: 'telegram_user_id'
        })
        .select()
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
      }

      return new Response(
        JSON.stringify({ success: true, profile }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
