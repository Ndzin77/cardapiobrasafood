
-- Step 1: Add stock_reserved column
ALTER TABLE public.pending_checkouts ADD COLUMN stock_reserved boolean NOT NULL DEFAULT false;

-- Step 2: Recreate cancel_pending_checkout with stock_reserved guard
CREATE OR REPLACE FUNCTION public.cancel_pending_checkout(p_checkout_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_status text;
  v_items jsonb;
  v_stock_reserved boolean;
  v_item jsonb;
  v_product_id uuid;
  v_qty int;
BEGIN
  SELECT status, items, stock_reserved INTO v_status, v_items, v_stock_reserved
    FROM pending_checkouts
   WHERE id = p_checkout_id
   FOR UPDATE;

  IF NOT FOUND OR v_status != 'pending' THEN RETURN; END IF;

  UPDATE pending_checkouts
     SET status = 'expired',
         updated_at = now()
   WHERE id = p_checkout_id;

  -- Only restore stock if it was actually reserved
  IF v_stock_reserved THEN
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

    UPDATE pending_checkouts SET stock_reserved = false WHERE id = p_checkout_id;
  END IF;
END;
$function$;

-- Step 3: Recreate expire_pending_checkouts with stock_reserved guard
CREATE OR REPLACE FUNCTION public.expire_pending_checkouts()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count int := 0;
  v_checkout record;
  v_item jsonb;
  v_product_id uuid;
  v_qty int;
BEGIN
  FOR v_checkout IN
    SELECT id, items, stock_reserved FROM pending_checkouts
     WHERE status = 'pending'
       AND expires_at < (now() - interval '1 minute')
     FOR UPDATE
  LOOP
    UPDATE pending_checkouts
       SET status = 'expired'
     WHERE id = v_checkout.id;

    -- Only release stock if it was actually reserved
    IF v_checkout.stock_reserved THEN
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

      UPDATE pending_checkouts SET stock_reserved = false WHERE id = v_checkout.id;
    END IF;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$function$;

-- Step 4: Recreate release_checkout_stock with stock_reserved guard
CREATE OR REPLACE FUNCTION public.release_checkout_stock(p_checkout_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_checkout record;
  v_item jsonb;
  v_product_id uuid;
  v_qty int;
BEGIN
  SELECT items, status, stock_reserved INTO v_checkout
    FROM pending_checkouts
   WHERE id = p_checkout_id
   FOR UPDATE;

  IF NOT FOUND THEN RETURN; END IF;
  IF v_checkout.status != 'pending' THEN RETURN; END IF;
  IF NOT v_checkout.stock_reserved THEN RETURN; END IF;

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

  UPDATE pending_checkouts SET stock_reserved = false WHERE id = p_checkout_id;
END;
$function$;

-- Step 5: Update handle_checkout_status_change trigger to check stock_reserved
CREATE OR REPLACE FUNCTION public.handle_checkout_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status IN ('failed', 'expired') AND OLD.status = 'pending' AND OLD.stock_reserved THEN
    PERFORM public.release_checkout_stock(NEW.id);
  END IF;
  RETURN NEW;
END;
$function$;
