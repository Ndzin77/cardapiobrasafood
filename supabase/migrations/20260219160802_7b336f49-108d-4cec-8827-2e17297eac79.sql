-- Atualiza expire_pending_checkouts() com buffer de 1 minuto
-- Isso dá margem para pagamentos em processamento não serem cortados abruptamente
CREATE OR REPLACE FUNCTION public.expire_pending_checkouts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count int;
BEGIN
  UPDATE pending_checkouts
     SET status = 'expired'
   WHERE status = 'pending'
     AND expires_at < (now() - interval '1 minute');

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Recria o trigger de mudança de status (garante que está ativo)
DROP TRIGGER IF EXISTS trg_checkout_status_change ON public.pending_checkouts;
CREATE TRIGGER trg_checkout_status_change
  AFTER UPDATE OF status ON public.pending_checkouts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_checkout_status_change();
