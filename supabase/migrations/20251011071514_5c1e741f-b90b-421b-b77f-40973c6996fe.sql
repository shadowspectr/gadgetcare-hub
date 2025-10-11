-- Add RLS policies for admin operations
-- Admin can insert, update, delete services
CREATE POLICY "Admin can insert services" ON public.services FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin can update services" ON public.services FOR UPDATE USING (true);
CREATE POLICY "Admin can delete services" ON public.services FOR DELETE USING (true);

-- Admin can insert, update, delete service prices
CREATE POLICY "Admin can insert prices" ON public.service_prices FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin can update prices" ON public.service_prices FOR UPDATE USING (true);
CREATE POLICY "Admin can delete prices" ON public.service_prices FOR DELETE USING (true);

-- Admin can insert, update settings
CREATE POLICY "Admin can insert settings" ON public.settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin can update settings" ON public.settings FOR UPDATE USING (true);