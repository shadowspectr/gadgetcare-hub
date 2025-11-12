-- Add visibility field to products table
ALTER TABLE public.products
ADD COLUMN is_visible BOOLEAN DEFAULT true NOT NULL;

-- Add index for better filtering performance
CREATE INDEX idx_products_is_visible ON public.products(is_visible);