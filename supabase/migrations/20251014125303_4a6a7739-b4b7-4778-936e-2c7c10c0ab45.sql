-- Создаём новую структуру для услуг
-- Таблица категорий услуг
CREATE TABLE public.service_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Удаляем старую таблицу service_prices
DROP TABLE IF EXISTS public.service_prices;

-- Пересоздаём таблицу services с новой структурой
DROP TABLE IF EXISTS public.services;

CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES public.service_categories(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  price TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Включаем RLS
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Политики для категорий
CREATE POLICY "Public can view categories" ON public.service_categories FOR SELECT USING (true);
CREATE POLICY "Admin can insert categories" ON public.service_categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin can update categories" ON public.service_categories FOR UPDATE USING (true);
CREATE POLICY "Admin can delete categories" ON public.service_categories FOR DELETE USING (true);

-- Политики для услуг
CREATE POLICY "Public can view services" ON public.services FOR SELECT USING (true);
CREATE POLICY "Admin can insert services" ON public.services FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin can update services" ON public.services FOR UPDATE USING (true);
CREATE POLICY "Admin can delete services" ON public.services FOR DELETE USING (true);