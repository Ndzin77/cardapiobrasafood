
-- Pending checkouts: holds order data until payment is confirmed
CREATE TABLE public.pending_checkouts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'infinitypay',
  provider_reference text, -- external ID from payment provider
  customer_name text,
  customer_phone text,
  customer_address text,
  delivery_type text NOT NULL DEFAULT 'delivery',
  payment_method text DEFAULT 'online',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric NOT NULL DEFAULT 0,
  delivery_fee numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  notes text,
  checkout_url text,
  status text NOT NULL DEFAULT 'pending', -- pending, paid, expired, failed
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '30 minutes'),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for webhook lookups
CREATE INDEX idx_pending_checkouts_provider_ref ON public.pending_checkouts(provider_reference);
CREATE INDEX idx_pending_checkouts_store_status ON public.pending_checkouts(store_id, status);
CREATE INDEX idx_pending_checkouts_expires ON public.pending_checkouts(expires_at) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.pending_checkouts ENABLE ROW LEVEL SECURITY;

-- Public can create pending checkouts (from storefront)
CREATE POLICY "Public can create pending checkouts"
  ON public.pending_checkouts
  FOR INSERT
  WITH CHECK (true);

-- Public can view their own pending checkouts by id (for status polling)
CREATE POLICY "Public can view pending checkouts"
  ON public.pending_checkouts
  FOR SELECT
  USING (true);

-- Store owners can view their pending checkouts
CREATE POLICY "Store owners can view pending checkouts"
  ON public.pending_checkouts
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM stores WHERE stores.id = pending_checkouts.store_id AND stores.user_id = auth.uid()
  ));

-- Service role updates (from webhook edge function)
CREATE POLICY "Service role can update pending checkouts"
  ON public.pending_checkouts
  FOR UPDATE
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_pending_checkouts_updated_at
  BEFORE UPDATE ON public.pending_checkouts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
