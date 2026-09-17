
CREATE OR REPLACE FUNCTION public.cancel_pending_checkout(p_checkout_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Libera estoque reservado
  PERFORM public.release_checkout_stock(p_checkout_id);

  -- Marca como expirado
  UPDATE pending_checkouts
     SET status = 'expired',
         updated_at = now()
   WHERE id = p_checkout_id
     AND status = 'pending';
END;
$$;
