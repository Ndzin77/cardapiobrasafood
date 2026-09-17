
-- Add checkout provider columns to stores
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS checkout_provider text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS checkout_config jsonb DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.stores.checkout_provider IS 'Payment provider: none, mercadopago, infinitypay, kiwify, custom_link';
COMMENT ON COLUMN public.stores.checkout_config IS 'Provider-specific config (tokens, URLs). Protected by RLS - only store owner can read/write.';
