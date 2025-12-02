-- Table for storing verification codes
CREATE TABLE IF NOT EXISTS public.telegram_auth_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL,
  phone TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table for verified telegram users
CREATE TABLE IF NOT EXISTS public.telegram_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id TEXT NOT NULL UNIQUE,
  phone TEXT,
  first_name TEXT,
  last_name TEXT,
  username TEXT,
  verified BOOLEAN DEFAULT false,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table for chat messages between users and managers
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id TEXT NOT NULL,
  order_id UUID REFERENCES public.orders(id),
  message TEXT NOT NULL,
  is_from_manager BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.telegram_auth_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Policies for telegram_auth_codes (only service role can access)
CREATE POLICY "Service role only for auth codes"
ON public.telegram_auth_codes
FOR ALL
USING (false);

-- Policies for telegram_users
CREATE POLICY "Anyone can view telegram users"
ON public.telegram_users
FOR SELECT
USING (true);

CREATE POLICY "Service role can manage telegram users"
ON public.telegram_users
FOR ALL
USING (false);

-- Policies for chat_messages
CREATE POLICY "Users can view their own messages"
ON public.chat_messages
FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert messages"
ON public.chat_messages
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can manage messages"
ON public.chat_messages
FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'employee'));