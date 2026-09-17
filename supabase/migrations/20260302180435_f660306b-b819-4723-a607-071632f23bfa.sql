
-- Add google_maps_url to customer_addresses
ALTER TABLE public.customer_addresses ADD COLUMN IF NOT EXISTS google_maps_url TEXT;

-- Add customer_maps_url to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_maps_url TEXT;

-- Add customer_maps_url to pending_checkouts
ALTER TABLE public.pending_checkouts ADD COLUMN IF NOT EXISTS customer_maps_url TEXT;
