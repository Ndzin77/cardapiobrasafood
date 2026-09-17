
-- =====================================================
-- 1. Atomic function to update order status + stock
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_order_status(
  p_order_id uuid,
  p_new_status text,
  p_store_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_status text;
  v_items jsonb;
  v_item jsonb;
  v_product_id uuid;
  v_quantity int;
  v_stock_enabled boolean;
  v_stock_quantity int;
  v_new_quantity int;
  v_stock_changes jsonb[] := '{}';
  v_stock_was_deducted boolean;
BEGIN
  -- Lock the order row to prevent concurrent modifications
  SELECT status, items INTO v_current_status, v_items
  FROM orders
  WHERE id = p_order_id AND store_id = p_store_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado ou sem permissão.';
  END IF;

  -- No-op if status unchanged
  IF v_current_status = p_new_status THEN
    RETURN jsonb_build_object('status', v_current_status, 'stock_changes', '[]'::jsonb);
  END IF;

  v_stock_was_deducted := v_current_status IN ('confirmed', 'preparing', 'ready');

  -- Decrement stock: only when pending → confirmed
  IF p_new_status = 'confirmed' AND v_current_status = 'pending' THEN
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

  -- Restore stock: only when cancelling an already-confirmed order
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

  -- Update order status
  UPDATE orders SET status = p_new_status WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'status', p_new_status,
    'previous_status', v_current_status,
    'stock_changes', COALESCE(array_to_json(v_stock_changes)::jsonb, '[]'::jsonb)
  );
END;
$$;

-- =====================================================
-- 2. Fix orders RLS: remove overly permissive SELECT
-- =====================================================

-- Drop the two permissive SELECT policies
DROP POLICY IF EXISTS "Public can view orders by phone" ON public.orders;

-- Re-create: store owners can view (already exists but let's be safe)
DROP POLICY IF EXISTS "Store owners can view orders" ON public.orders;
CREATE POLICY "Store owners can view orders"
ON public.orders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM stores
    WHERE stores.id = orders.store_id AND stores.user_id = auth.uid()
  )
);

-- Customers can view their own orders by matching phone (anon-safe)
CREATE POLICY "Customers can view own orders by phone"
ON public.orders FOR SELECT
USING (
  customer_phone IS NOT NULL
  AND customer_phone = current_setting('request.headers', true)::json->>'x-customer-phone'
);
