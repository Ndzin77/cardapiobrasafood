
-- Fix release_checkout_stock: only release for 'pending' (prevents double-release)
CREATE OR REPLACE FUNCTION public.release_checkout_stock(p_checkout_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_checkout record;
  v_item jsonb;
  v_product_id uuid;
  v_qty int;
BEGIN
  SELECT items, status INTO v_checkout
    FROM pending_checkouts
   WHERE id = p_checkout_id
   FOR UPDATE;

  IF NOT FOUND THEN RETURN; END IF;

  -- ONLY release for 'pending' status — prevents double-release
  IF v_checkout.status != 'pending' THEN RETURN; END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_checkout.items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty := COALESCE((v_item->>'quantity')::int, 1);

    UPDATE products
       SET stock_quantity = stock_quantity + v_qty,
           available = true
     WHERE id = v_product_id
       AND stock_enabled = true
       AND stock_quantity IS NOT NULL;
  END LOOP;
END;
$$;

-- Fix cancel_pending_checkout: inline stock release with row lock to prevent races
CREATE OR REPLACE FUNCTION public.cancel_pending_checkout(p_checkout_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_status text;
  v_items jsonb;
  v_item jsonb;
  v_product_id uuid;
  v_qty int;
BEGIN
  -- Lock row and read status+items atomically
  SELECT status, items INTO v_status, v_items
    FROM pending_checkouts
   WHERE id = p_checkout_id
   FOR UPDATE;

  IF NOT FOUND OR v_status != 'pending' THEN RETURN; END IF;

  -- Mark expired FIRST (so release_checkout_stock can never double-fire)
  UPDATE pending_checkouts
     SET status = 'expired',
         updated_at = now()
   WHERE id = p_checkout_id;

  -- Restore stock inline
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty := COALESCE((v_item->>'quantity')::int, 1);

    UPDATE products
       SET stock_quantity = stock_quantity + v_qty,
           available = true
     WHERE id = v_product_id
       AND stock_enabled = true
       AND stock_quantity IS NOT NULL;
  END LOOP;
END;
$$;

-- Fix expire_pending_checkouts: ALSO release stock (was missing!)
CREATE OR REPLACE FUNCTION public.expire_pending_checkouts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count int := 0;
  v_checkout record;
  v_item jsonb;
  v_product_id uuid;
  v_qty int;
BEGIN
  FOR v_checkout IN
    SELECT id, items FROM pending_checkouts
     WHERE status = 'pending'
       AND expires_at < (now() - interval '1 minute')
     FOR UPDATE
  LOOP
    UPDATE pending_checkouts
       SET status = 'expired'
     WHERE id = v_checkout.id;

    -- Release reserved stock
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_checkout.items)
    LOOP
      v_product_id := (v_item->>'product_id')::uuid;
      v_qty := COALESCE((v_item->>'quantity')::int, 1);

      UPDATE products
         SET stock_quantity = stock_quantity + v_qty,
             available = true
       WHERE id = v_product_id
         AND stock_enabled = true
         AND stock_quantity IS NOT NULL;
    END LOOP;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;
