-- Create products table for managing shop inventory
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT,
  article TEXT,
  category_path TEXT,
  category_name TEXT,
  country TEXT,
  quantity INTEGER DEFAULT 0,
  unit TEXT DEFAULT 'шт.',
  min_quantity INTEGER DEFAULT 0,
  purchase_price DECIMAL(10, 2),
  retail_price DECIMAL(10, 2),
  warranty_days INTEGER,
  warranty_months INTEGER,
  description TEXT,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Create policies for products
CREATE POLICY "Public can view products" 
ON public.products 
FOR SELECT 
USING (true);

CREATE POLICY "Admin can insert products" 
ON public.products 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admin can update products" 
ON public.products 
FOR UPDATE 
USING (true);

CREATE POLICY "Admin can delete products" 
ON public.products 
FOR DELETE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_products_category ON public.products(category_name);
CREATE INDEX idx_products_quantity ON public.products(quantity) WHERE quantity > 0;