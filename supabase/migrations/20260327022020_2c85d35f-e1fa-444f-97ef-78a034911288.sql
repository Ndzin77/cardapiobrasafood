CREATE OR REPLACE FUNCTION public.get_driver_deliveries(p_driver_id uuid, p_store_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(to_jsonb(sub) ORDER BY
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
$function$;