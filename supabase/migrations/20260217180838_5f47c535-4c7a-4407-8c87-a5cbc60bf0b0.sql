
-- Public-safe function to get today's order count for social proof (no sensitive data exposed)
CREATE OR REPLACE FUNCTION public.get_store_today_order_count(p_store_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM orders
  WHERE store_id = p_store_id
    AND status != 'cancelled'
    AND created_at >= (CURRENT_DATE AT TIME ZONE 'America/Sao_Paulo');
$$;

-- Public-safe function to get best seller product IDs (last 7 days)
CREATE OR REPLACE FUNCTION public.get_store_bestseller_ids(p_store_id uuid)
RETURNS text[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result text[];
BEGIN
  SELECT array_agg(product_id ORDER BY total_qty DESC)
  INTO v_result
  FROM (
    SELECT
      item->>'product_id' AS product_id,
      SUM(COALESCE((item->>'quantity')::int, 1)) AS total_qty
    FROM orders,
         jsonb_array_elements(items) AS item
    WHERE store_id = p_store_id
      AND status != 'cancelled'
      AND created_at >= (NOW() - INTERVAL '7 days')
    GROUP BY item->>'product_id'
    ORDER BY total_qty DESC
    LIMIT 3
  ) sub;

  RETURN COALESCE(v_result, '{}');
END;
$$;
