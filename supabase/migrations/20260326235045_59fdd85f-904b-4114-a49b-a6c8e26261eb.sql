
-- Enable pgcrypto for PIN hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drivers table
CREATE TABLE public.drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text NOT NULL,
  pin_hash text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(store_id, phone)
);

ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view drivers" ON public.drivers FOR SELECT TO public USING (true);
CREATE POLICY "Store owners can manage drivers" ON public.drivers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM stores WHERE stores.id = drivers.store_id AND stores.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM stores WHERE stores.id = drivers.store_id AND stores.user_id = auth.uid()));

-- Deliveries table
CREATE TABLE public.deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'assigned',
  assigned_at timestamptz NOT NULL DEFAULT now(),
  collected_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view deliveries" ON public.deliveries FOR SELECT TO public USING (true);
CREATE POLICY "Store owners can manage deliveries" ON public.deliveries FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM stores WHERE stores.id = deliveries.store_id AND stores.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM stores WHERE stores.id = deliveries.store_id AND stores.user_id = auth.uid()));

CREATE INDEX idx_deliveries_driver_status ON public.deliveries(driver_id, status);
CREATE INDEX idx_deliveries_store_status ON public.deliveries(store_id, status);
CREATE INDEX idx_deliveries_order ON public.deliveries(order_id);

-- Trigger for updated_at on drivers
CREATE TRIGGER set_drivers_updated_at BEFORE UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RPC: driver_login
CREATE OR REPLACE FUNCTION public.driver_login(p_store_id uuid, p_phone text, p_pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_driver record;
BEGIN
  SELECT id, store_id, name, phone, is_active, pin_hash
  INTO v_driver
  FROM drivers
  WHERE store_id = p_store_id AND phone = p_phone AND is_active = true;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_driver.pin_hash != crypt(p_pin, v_driver.pin_hash) THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'id', v_driver.id,
    'name', v_driver.name,
    'phone', v_driver.phone,
    'store_id', v_driver.store_id
  );
END;
$$;

-- RPC: get_driver_deliveries
CREATE OR REPLACE FUNCTION public.get_driver_deliveries(p_driver_id uuid, p_store_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(row_to_jsonb(sub) ORDER BY
    CASE sub.status WHEN 'assigned' THEN 1 WHEN 'collected' THEN 2 WHEN 'delivered' THEN 3 ELSE 4 END,
    sub.assigned_at ASC
  ), '[]'::jsonb) INTO v_result
  FROM (
    SELECT d.id, d.order_id, d.status, d.assigned_at, d.collected_at, d.delivered_at,
           o.customer_name, o.customer_address, o.customer_phone, o.customer_maps_url,
           o.total, o.items, o.delivery_type, o.created_at as order_created_at
    FROM deliveries d
    JOIN orders o ON o.id = d.order_id
    WHERE d.driver_id = p_driver_id AND d.store_id = p_store_id AND d.status != 'cancelled'
      AND d.assigned_at >= (CURRENT_DATE AT TIME ZONE 'America/Sao_Paulo')
  ) sub;

  RETURN v_result;
END;
$$;

-- RPC: update_delivery_status
CREATE OR REPLACE FUNCTION public.update_delivery_status(p_delivery_id uuid, p_driver_id uuid, p_new_status text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_delivery record;
BEGIN
  SELECT * INTO v_delivery FROM deliveries
  WHERE id = p_delivery_id AND driver_id = p_driver_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Entrega não encontrada';
  END IF;

  IF p_new_status = 'collected' THEN
    UPDATE deliveries SET status = 'collected', collected_at = now() WHERE id = p_delivery_id;
  ELSIF p_new_status = 'delivered' THEN
    UPDATE deliveries SET status = 'delivered', delivered_at = now() WHERE id = p_delivery_id;
    UPDATE orders SET status = 'delivered' WHERE id = v_delivery.order_id;
  ELSIF p_new_status = 'cancelled' THEN
    UPDATE deliveries SET status = 'cancelled' WHERE id = p_delivery_id;
  END IF;

  RETURN jsonb_build_object('status', p_new_status, 'delivery_id', p_delivery_id);
END;
$$;

-- RPC: assign_delivery
CREATE OR REPLACE FUNCTION public.assign_delivery(p_order_id uuid, p_driver_id uuid, p_store_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_delivery_id uuid;
BEGIN
  -- Validate order belongs to store
  IF NOT EXISTS (SELECT 1 FROM orders WHERE id = p_order_id AND store_id = p_store_id) THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;

  -- Validate driver belongs to store
  IF NOT EXISTS (SELECT 1 FROM drivers WHERE id = p_driver_id AND store_id = p_store_id AND is_active = true) THEN
    RAISE EXCEPTION 'Entregador não encontrado';
  END IF;

  -- Check if delivery already exists for this order
  SELECT id INTO v_delivery_id FROM deliveries WHERE order_id = p_order_id AND status != 'cancelled';
  IF FOUND THEN
    -- Reassign
    UPDATE deliveries SET driver_id = p_driver_id, status = 'assigned', assigned_at = now(), collected_at = null, delivered_at = null
    WHERE id = v_delivery_id;
    RETURN jsonb_build_object('delivery_id', v_delivery_id, 'reassigned', true);
  END IF;

  INSERT INTO deliveries (store_id, order_id, driver_id)
  VALUES (p_store_id, p_order_id, p_driver_id)
  RETURNING id INTO v_delivery_id;

  RETURN jsonb_build_object('delivery_id', v_delivery_id, 'reassigned', false);
END;
$$;
