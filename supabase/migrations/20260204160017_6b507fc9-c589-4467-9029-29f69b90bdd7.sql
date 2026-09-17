-- Add google_maps_url field to stores
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS google_maps_url TEXT;

-- Add whatsapp_message field for custom WhatsApp greeting
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS whatsapp_message TEXT DEFAULT 'Olá! Gostaria de fazer um pedido.';

-- Add custom_payments field for more detailed payment config (with icons)
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS payment_icons JSONB DEFAULT '{}';

-- Update products options to include image_url on choices and enabled flag on groups
COMMENT ON COLUMN public.products.options IS 'JSON array of option groups with enabled flag and choices with optional image_url';