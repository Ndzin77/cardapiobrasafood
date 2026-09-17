
-- Atualiza update_order_status para não decrementar estoque em pedidos online
-- (payment_method = 'online') pois o estoque já foi reservado no create-checkout.
-- Também ignora a transição pending → confirmed para pagamentos online.
CREATE OR REPLACE FUNCTION public.update_order_status(p_order_id uuid, p_new_status text, p_store_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current_status text;
  v_payment_method text;
  v_items jsonb;
  v_item jsonb;
  v_product_id uuid;
  v_quantity int;
  v_stock_enabled boolean;
  v_stock_quantity int;
  v_new_quantity int;
  v_stock_changes jsonb[] := '{}';
  v_stock_was_deducted boolean;
  v_is_online_payment boolean;
BEGIN
  SELECT status, items, payment_method INTO v_current_status, v_items, v_payment_method
  FROM orders
  WHERE id = p_order_id AND store_id = p_store_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado ou sem permissão.';
  END IF;

  IF v_current_status = p_new_status THEN
    RETURN jsonb_build_object('status', v_current_status, 'stock_changes', '[]'::jsonb);
  END IF;

  -- Pedidos online já tiveram estoque decrementado na reserva (create-checkout)
  -- Então não decrementamos novamente ao confirmar
  v_is_online_payment := (v_payment_method = 'online');

  v_stock_was_deducted := v_current_status IN ('confirmed', 'preparing', 'ready');

  -- Decrementa estoque: APENAS pedidos WhatsApp na transição pending → confirmed
  IF p_new_status = 'confirmed' AND v_current_status = 'pending' AND NOT v_is_online_payment THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
    LOOP
      v_product_id := (v_item->>'product_id')::uuid;
      v_quantity := COALESCE((v_item->>'quantity')::int, 1);

      SELECT stock_enabled, stock_quantity INTO v_stock_enabled, v_stock_quantity
      FROM products WHERE id = v_product_id FOR UPDATE;

      IF v_stock_enabled AND v_stock_quantity IS NOT NULL THEN
        v_new_quantity := GREATEST(0, v_stock_quantity - v_quantity);
        UPDATE products
        SET stock_quantity = v_new_quantity,
            available = (v_new_quantity > 0)
        WHERE id = v_product_id;

        v_stock_changes := array_append(v_stock_changes,
          jsonb_build_object(
            'product_id', v_product_id,
            'action', 'decremented',
            'from', v_stock_quantity,
            'to', v_new_quantity
          )
        );
      END IF;
    END LOOP;
  END IF;

  -- Restaura estoque ao cancelar pedido que estava confirmado
  -- Para pedidos online: restaura (a reserva tinha sido descontada)
  -- Para pedidos WhatsApp: restaura (o desconto foi manual ao confirmar)
  IF p_new_status = 'cancelled' AND v_stock_was_deducted THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
    LOOP
      v_product_id := (v_item->>'product_id')::uuid;
      v_quantity := COALESCE((v_item->>'quantity')::int, 1);

      SELECT stock_enabled, stock_quantity INTO v_stock_enabled, v_stock_quantity
      FROM products WHERE id = v_product_id FOR UPDATE;

      IF v_stock_enabled AND v_stock_quantity IS NOT NULL THEN
        v_new_quantity := v_stock_quantity + v_quantity;
        UPDATE products
        SET stock_quantity = v_new_quantity,
            available = true
        WHERE id = v_product_id;

        v_stock_changes := array_append(v_stock_changes,
          jsonb_build_object(
            'product_id', v_product_id,
            'action', 'restored',
            'from', v_stock_quantity,
            'to', v_new_quantity
          )
        );
      END IF;
    END LOOP;
  END IF;

  UPDATE orders SET status = p_new_status WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'status', p_new_status,
    'previous_status', v_current_status,
    'stock_changes', COALESCE(array_to_json(v_stock_changes)::jsonb, '[]'::jsonb)
  );
END;
$function$;
