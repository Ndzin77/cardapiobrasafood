-- Add stock management to products
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS stock_quantity integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS stock_enabled boolean DEFAULT false;

-- Add help button settings to stores
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS help_button_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS help_button_message text DEFAULT 'Olá! Tenho uma dúvida sobre os produtos.';