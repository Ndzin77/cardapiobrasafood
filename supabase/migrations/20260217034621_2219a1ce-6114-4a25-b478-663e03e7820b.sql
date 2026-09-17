
-- Add checkout_mode column: 'whatsapp' (default), 'online', or 'both'
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS checkout_mode text NOT NULL DEFAULT 'whatsapp';
