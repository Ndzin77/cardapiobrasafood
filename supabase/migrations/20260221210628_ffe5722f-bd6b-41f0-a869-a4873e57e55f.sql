
-- Update reserve_checkout_stock to include available quantity in error message
-- Format: INSUFFICIENT_STOCK:<product_name>:<available_qty>:<requested_qty>
CREATE OR REPLACE FUNCTION public.reserve_checkout_stock(p_checkout_id uuid, p_items jsonb)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
     FOR UPDATE;

    IF v_stock_en AND v_stock_qty IS NOT NULL THEN
      IF v_stock_qty < v_qty THEN
        RAISE EXCEPTION 'INSUFFICIENT_STOCK:%:%:%', v_name, v_stock_qty, v_qty;
      END IF;

      UPDATE products
         SET stock_quantity = stock_quantity - v_qty,
             available      = ((stock_quantity - v_qty) > 0)
       WHERE id = v_product_id;
    END IF;
  END LOOP;

  RETURN NULL;
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$function$;
