-- Add checkout_link field to stores for custom payment links
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS checkout_link text;

-- Add custom_payments field to stores for admin-defined payment options
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS custom_payments jsonb DEFAULT '[]'::jsonb;