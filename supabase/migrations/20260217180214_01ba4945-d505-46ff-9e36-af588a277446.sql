
-- Table to store sensitive checkout credentials (access_token, etc.)
-- Only store owners can read/write. Edge functions use service_role to bypass RLS.
CREATE TABLE public.store_checkout_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL UNIQUE REFERENCES public.stores(id) ON DELETE CASCADE,
  checkout_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.store_checkout_secrets ENABLE ROW LEVEL SECURITY;

-- Only store owners can see their own secrets
CREATE POLICY "Store owners can view their checkout secrets"
ON public.store_checkout_secrets FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = store_checkout_secrets.store_id
    AND stores.user_id = auth.uid()
  )
);

-- Only store owners can insert
CREATE POLICY "Store owners can insert their checkout secrets"
ON public.store_checkout_secrets FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = store_checkout_secrets.store_id
    AND stores.user_id = auth.uid()
  )
);

-- Only store owners can update
CREATE POLICY "Store owners can update their checkout secrets"
ON public.store_checkout_secrets FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = store_checkout_secrets.store_id
    AND stores.user_id = auth.uid()
  )
);

-- Only store owners can delete
CREATE POLICY "Store owners can delete their checkout secrets"
ON public.store_checkout_secrets FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = store_checkout_secrets.store_id
    AND stores.user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_store_checkout_secrets_updated_at
BEFORE UPDATE ON public.store_checkout_secrets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing data: copy checkout_config from stores to the new table
INSERT INTO public.store_checkout_secrets (store_id, checkout_config)
SELECT id, COALESCE(checkout_config, '{}'::jsonb)
FROM public.stores
WHERE checkout_config IS NOT NULL AND checkout_config != '{}'::jsonb
ON CONFLICT (store_id) DO NOTHING;

-- Clear sensitive data from the public stores table
UPDATE public.stores SET checkout_config = '{}'::jsonb WHERE checkout_config IS NOT NULL AND checkout_config != '{}'::jsonb;
