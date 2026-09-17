
-- 1. Remove public SELECT on pending_checkouts (exposes PII)
DROP POLICY IF EXISTS "Public can view pending checkouts" ON public.pending_checkouts;

-- 2. Replace permissive UPDATE policy with store-owner-only
DROP POLICY IF EXISTS "Service role can update pending checkouts" ON public.pending_checkouts;
CREATE POLICY "Store owners can update pending checkouts"
  ON public.pending_checkouts FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM stores WHERE stores.id = pending_checkouts.store_id AND stores.user_id = auth.uid()
  ));

-- 3. Remove public SELECT on ingredients (exposes costs/stock)
DROP POLICY IF EXISTS "Public can view ingredients" ON public.ingredients;

-- 4. Fix set_updated_at search_path
CREATE OR REPLACE FUNCTION public.set_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

-- 5. Create safe RPC for checkout status (no PII)
CREATE OR REPLACE FUNCTION public.get_checkout_status(p_checkout_id uuid)
  RETURNS jsonb
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'status', pc.status,
    'expires_at', pc.expires_at,
    'total', pc.total
  )
  FROM pending_checkouts pc
  WHERE pc.id = p_checkout_id;
$function$;
