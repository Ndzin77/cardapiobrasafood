
-- Security definer function for customers to fetch their own orders by phone
-- This bypasses RLS safely since it filters by phone + store_id
CREATE OR REPLACE FUNCTION public.get_customer_orders_by_phone(
  p_store_id uuid,
  p_phone text
)
RETURNS SETOF orders
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM orders
  WHERE store_id = p_store_id
    AND customer_phone = p_phone
  ORDER BY created_at DESC
  LIMIT 50;
$$;

-- Also drop the header-based policy (unreliable for JS client)
DROP POLICY IF EXISTS "Customers can view own orders by phone" ON public.orders;
