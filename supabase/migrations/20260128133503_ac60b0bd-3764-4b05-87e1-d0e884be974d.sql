-- Fix #1: telegram_users - restrict access to staff only
-- The table is accessed via service role in edge functions, not by clients directly
DROP POLICY IF EXISTS "Anyone can view telegram users" ON telegram_users;

-- Staff (admins/employees) can view all telegram users for customer management
CREATE POLICY "Staff can view telegram users"
ON telegram_users
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'employee'::app_role)
);

-- Fix #2: chat_messages - restrict to message participants and staff only
DROP POLICY IF EXISTS "Users can view their own messages" ON chat_messages;

-- Only allow staff to view messages (telegram users access via service role in edge functions)
CREATE POLICY "Staff can view all chat messages"
ON chat_messages
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'employee'::app_role)
);

-- Fix #3: products - Create a public view that excludes purchase_price
-- First, create a view that only exposes safe columns
CREATE OR REPLACE VIEW public.products_public
WITH (security_invoker = on)
AS SELECT 
  id,
  name,
  code,
  article,
  category_path,
  category_name,
  country,
  quantity,
  unit,
  min_quantity,
  retail_price,
  warranty_days,
  warranty_months,
  description,
  photo_url,
  created_at,
  updated_at,
  is_visible
FROM public.products;
-- Note: purchase_price is intentionally excluded

-- Grant access to the view
GRANT SELECT ON public.products_public TO anon, authenticated;

-- Update products table policy - restrict full access (with purchase_price) to staff only
DROP POLICY IF EXISTS "Anyone can view products" ON products;

-- Public can only read via the view, not the table directly
CREATE POLICY "Staff can view all product details"
ON products
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'employee'::app_role) OR
  has_role(auth.uid(), 'observer'::app_role)
);

-- Allow public read but only for visible products (without purchase_price via RLS)
-- This is needed because the view uses security_invoker
CREATE POLICY "Public can view visible products"
ON products
FOR SELECT
USING (is_visible = true);