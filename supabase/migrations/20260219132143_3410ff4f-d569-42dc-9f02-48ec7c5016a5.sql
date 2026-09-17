
-- ============================================================
-- Gestão inteligente de estoque para checkout online
-- Estratégia: Soft-lock (reserva) → Desconto definitivo → Restauração
-- ============================================================

-- 1. Reservar estoque ao criar pending_checkout
--    Retorna NULL em sucesso, ou o nome do produto com estoque insuficiente
CREATE OR REPLACE FUNCTION public.reserve_checkout_stock(
  p_checkout_id uuid,
  p_items jsonb
)
RETURNS text   -- NULL = sucesso; nome do produto = falha
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item        jsonb;
  v_product_id  uuid;
  v_qty         int;
  v_stock_qty   int;
  v_stock_en    boolean;
  v_name        text;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty        := COALESCE((v_item->>'quantity')::int, 1);

    SELECT stock_enabled, stock_quantity, name
      INTO v_stock_en, v_stock_qty, v_name
      FROM products
     WHERE id = v_product_id
     FOR UPDATE;   -- Serializa concorrência

    IF v_stock_en AND v_stock_qty IS NOT NULL THEN
      IF v_stock_qty < v_qty THEN
        -- Estoque insuficiente: aborta tudo
        RAISE EXCEPTION 'INSUFFICIENT_STOCK:%', v_name;
      END IF;

      -- Decrementa provisoriamente (reserva)
      UPDATE products
         SET stock_quantity = stock_quantity - v_qty,
             available      = ((stock_quantity - v_qty) > 0)
       WHERE id = v_product_id;
    END IF;
  END LOOP;

  RETURN NULL;  -- Tudo reservado com sucesso
EXCEPTION
  WHEN OTHERS THEN
    -- Re-raise para o caller
    RAISE;
END;
$$;

-- 2. Liberar reserva (restaurar estoque) ao cancelar/falhar checkout
CREATE OR REPLACE FUNCTION public.release_checkout_stock(
  p_checkout_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_checkout    record;
  v_item        jsonb;
  v_product_id  uuid;
  v_qty         int;
BEGIN
  SELECT items, status INTO v_checkout
    FROM pending_checkouts
   WHERE id = p_checkout_id;

  IF NOT FOUND THEN RETURN; END IF;

  -- Só restaura se ainda estava em reserva (não já confirmado/released)
  IF v_checkout.status NOT IN ('pending', 'failed', 'expired') THEN RETURN; END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_checkout.items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty        := COALESCE((v_item->>'quantity')::int, 1);

    UPDATE products
       SET stock_quantity = stock_quantity + v_qty,
           available      = true
     WHERE id = v_product_id
       AND stock_enabled  = true
       AND stock_quantity IS NOT NULL;
  END LOOP;
END;
$$;

-- 3. Trigger: quando pending_checkout vira "failed" ou "expired",
--    restaura o estoque automaticamente
CREATE OR REPLACE FUNCTION public.handle_checkout_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Pagamento falhou/expirou → devolve reserva
  IF NEW.status IN ('failed', 'expired') AND OLD.status = 'pending' THEN
    PERFORM public.release_checkout_stock(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_checkout_status_change ON public.pending_checkouts;
CREATE TRIGGER trg_checkout_status_change
  AFTER UPDATE OF status ON public.pending_checkouts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_checkout_status_change();

-- 4. Job de expiração: marcar como "expired" os checkouts pending há mais de 30 min
--    (chamado pela edge function ou cron — o trigger acima restaura o estoque)
CREATE OR REPLACE FUNCTION public.expire_pending_checkouts()
RETURNS int   -- número de checkouts expirados
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  UPDATE pending_checkouts
     SET status = 'expired'
   WHERE status = 'pending'
     AND expires_at < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
